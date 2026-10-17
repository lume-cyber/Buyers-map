<?php
declare(strict_types=1);
// Every protected endpoint validates the current account, not just the cookie.
header('Cache-Control: no-store');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
ini_set('session.use_strict_mode', '1');
session_name('buyer_session');
session_set_cookie_params(['httponly'=>true, 'secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'samesite'=>'Strict', 'path'=>'/']);
if (!session_start()) { http_response_code(503); echo json_encode(['error'=>'Session storage unavailable.']); exit; }
function authReply(int $status, array $data): never { http_response_code($status); echo json_encode($data); exit; }
function authRead(): array {
    $path = __DIR__.'/private/users.php';
    if (!is_file($path)) authReply(503, ['error'=>'Accounts have not been initialized. Run the local account setup.']);
    $raw = file_get_contents($path);
    if (!str_starts_with($raw, "<?php exit; ?>\n")) authReply(503, ['error'=>'Account storage unavailable.']);
    $data = json_decode(substr($raw, 14), true);
    if (!is_array($data) || !isset($data['users'])) authReply(503, ['error'=>'Account storage unavailable.']);
    return $data;
}
function authWrite(array $data): void {
    $path = __DIR__.'/private/users.php';
    $temp = $path.'.tmp.php';
    $bytes = "<?php exit; ?>\n".json_encode($data, JSON_THROW_ON_ERROR);
    if (file_put_contents($temp, $bytes) !== strlen($bytes)) authReply(503, ['error'=>'Could not save accounts.']);
    chmod($temp, 0600);
    if (!rename($temp, $path)) authReply(503, ['error'=>'Could not save accounts.']);
}
function authPassword(string $password): array {
    $salt = bin2hex(random_bytes(24));
    return ['salt'=>$salt, 'hash'=>hash_pbkdf2('sha256', $password, $salt, 600000, 64)];
}
function authVerify(string $password, array $user): bool {
    return hash_equals($user['hash'], hash_pbkdf2('sha256', $password, $user['salt'], 600000, 64));
}
function publicUser(array $user): array { return array_intersect_key($user, array_flip(['id','name','role'])); }
function authUser(?array $data = null): array {
    $data ??= authRead();
    $id = $_SESSION['user'] ?? '';
    $user = $data['users'][$id] ?? null;
    if (!$user || ($_SESSION['version'] ?? 0) !== $user['version'] || time() - ($_SESSION['active'] ?? 0) > 1800 || time() - ($_SESSION['created'] ?? 0) > 28800) {
        $_SESSION = []; authReply(401, ['error'=>'Please sign in.']);
    }
    $_SESSION['active'] = time();
    return $user;
}
function authPost(): array {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') authReply(405, ['error'=>'Method not allowed.']);
    if (($_SERVER['HTTP_X_BUYER_REQUEST'] ?? '') !== '1' || stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) authReply(403, ['error'=>'Invalid request.']);
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        $origin = parse_url($_SERVER['HTTP_ORIGIN']);
        $host = ($origin['host'] ?? '').(isset($origin['port']) ? ':'.$origin['port'] : '');
        if (strtolower($host) !== strtolower($_SERVER['HTTP_HOST'] ?? '')) authReply(403, ['error'=>'Origin not allowed.']);
    }
    if (!hash_equals($_SESSION['csrf'] ?? '', $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '') || empty($_SESSION['csrf'])) authReply(403, ['error'=>'Session changed. Refresh and try again.']);
    $raw = file_get_contents('php://input', false, null, 0, 16385);
    if (strlen($raw) > 16384) authReply(413, ['error'=>'Request too large.']);
    $data = json_decode($raw, true);
    if (!is_array($data)) authReply(422, ['error'=>'Invalid request.']);
    return $data;
}
function authText(array $data, string $key, int $max): string {
    $value = $data[$key] ?? '';
    if (!is_string($value) || strlen($value) > $max) authReply(422, ['error'=>'Invalid '.$key.'.']);
    return $value;
}
