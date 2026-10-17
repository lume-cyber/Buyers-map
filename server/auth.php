<?php
require __DIR__.'/auth-core.php';
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($_SESSION['user'])) authReply(200, ['user'=>null, 'csrf'=>$_SESSION['csrf']]);
    authReply(200, ['user'=>publicUser(authUser()), 'csrf'=>$_SESSION['csrf']]);
}
$input = authPost();
if (($input['action'] ?? '') === 'logout') {
    $_SESSION = []; session_destroy();
    setcookie(session_name(), '', ['expires'=>time()-3600, 'path'=>'/', 'httponly'=>true, 'samesite'=>'Strict']);
    authReply(200, ['ok'=>true]);
}
if (($input['action'] ?? '') !== 'login') authReply(422, ['error'=>'Unknown action.']);
$id = strtolower(trim(authText($input, 'id', 64)));
$password = authText($input, 'password', 256);
$lock = fopen(__DIR__.'/private/users.lock.php', 'c');
if (!$lock || !flock($lock, LOCK_EX)) authReply(503, ['error'=>'Accounts are busy.']);
$data = authRead();
$now = time();
$data['rates'] = array_filter($data['rates'] ?? [], fn($rate)=>$rate['until']>$now);
$keys = [hash('sha256', 'ip|'.($_SERVER['REMOTE_ADDR'] ?? 'unknown')), hash('sha256', 'id|'.$id)];
foreach ($keys as $key) if (($data['rates'][$key]['count'] ?? 0) >= 10) authReply(429, ['error'=>'Too many login attempts. Try again in 15 minutes.']);
$user = $data['users'][$id] ?? null;
$valid = authVerify($password, $user ?? ['salt'=>str_repeat('0',48), 'hash'=>str_repeat('0',64)]);
if (!$user || !$valid) {
    foreach ($keys as $key) { $rate = $data['rates'][$key] ?? ['count'=>0,'until'=>$now+900]; $rate['count']++; $data['rates'][$key]=$rate; }
    authWrite($data); authReply(401, ['error'=>'Incorrect user ID or password.']);
}
foreach ($keys as $key) unset($data['rates'][$key]);
authWrite($data);
session_regenerate_id(true);
$_SESSION = ['user'=>$id, 'version'=>$user['version'], 'created'=>$now, 'active'=>$now, 'csrf'=>bin2hex(random_bytes(32))];
authReply(200, ['user'=>publicUser($user), 'csrf'=>$_SESSION['csrf']]);
