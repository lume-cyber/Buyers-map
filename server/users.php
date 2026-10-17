<?php
require __DIR__.'/auth-core.php';
require __DIR__.'/activity-core.php';
$lock = fopen(__DIR__.'/private/users.lock.php', 'c');
if (!$lock || !flock($lock, LOCK_EX)) authReply(503, ['error'=>'Accounts are busy.']);
$data = authRead(); $actor = authUser($data);
if (!in_array($actor['role'], ['super','admin'], true)) authReply(403, ['error'=>'Account management is restricted.']);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = authPost(); $action = $input['action'] ?? '';
    $id = strtolower(trim(authText($input, 'id', 64)));
    if (!preg_match('/^[a-z0-9][a-z0-9._-]{2,63}$/', $id)) authReply(422, ['error'=>'Use 3–64 letters, numbers, dots, underscores or hyphens for the user ID.']);
    $existing = $data['users'][$id] ?? null;
    if ($actor['role'] === 'admin' && $existing && $existing['role'] !== 'general') authReply(403, ['error'=>'Admins can manage general users only.']);
    if ($id === $actor['id']) authReply(403, ['error'=>'You cannot change or delete your own account here.']);
    if ($action === 'delete') {
        if (!$existing) authReply(404, ['error'=>'Account not found.']);
        unset($data['users'][$id]);
    } elseif ($action === 'save') {
        $role = authText($input, 'role', 16);
        if (!in_array($role, ['super','admin','general'], true) || ($actor['role'] === 'admin' && $role !== 'general')) authReply(403, ['error'=>'This role is not permitted.']);
        $name = trim(authText($input, 'name', 120));
        if (!$name) authReply(422, ['error'=>'Enter a display name.']);
        $password = authText($input, 'password', 256);
        if ((!$existing || $password !== '') && strlen($password) < 12) authReply(422, ['error'=>'Use a password of at least 12 characters.']);
        if (!$existing && count($data['users']) >= 500) authReply(409, ['error'=>'Account limit reached.']);
        $credentials = $password !== '' ? authPassword($password) : array_intersect_key($existing, array_flip(['salt','hash']));
        $data['users'][$id] = $credentials + ['id'=>$id,'name'=>$name,'role'=>$role,'version'=>($existing['version'] ?? 0)+1];
    } else authReply(422, ['error'=>'Unknown action.']);
    if (!array_filter($data['users'], fn($user)=>$user['role']==='super')) authReply(409, ['error'=>'At least one super user is required.']);
    $changes = ['before'=>$existing ? publicUser($existing) : null, 'after'=>isset($data['users'][$id]) ? publicUser($data['users'][$id]) : null];
    if ($action === 'save') $changes['passwordReset'] = $existing && $password !== '';
    $data['activity'][] = activityEntry($actor, $action === 'delete' ? 'Account deleted' : ($existing ? 'Account updated' : 'Account added'), $id, $existing['name'] ?? $name, $changes);
    authWrite($data);
} elseif ($_SERVER['REQUEST_METHOD'] !== 'GET') authReply(405, ['error'=>'Method not allowed.']);
$visible = array_filter($data['users'], fn($user)=>$actor['role']==='super' || $user['role']==='general');
authReply(200, ['users'=>array_values(array_map('publicUser', $visible))]);
