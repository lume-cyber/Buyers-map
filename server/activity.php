<?php
require __DIR__.'/auth-core.php';
$actor = authUser();
if ($actor['role'] !== 'super') authReply(403, ['error'=>'Activity and recovery are restricted to super users.']);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') authReply(405, ['error'=>'Method not allowed.']);
$directory = [];
$path = __DIR__.'/private/directory.php';
if (is_file($path)) {
    $raw = file_get_contents($path);
    if (!str_starts_with($raw, "<?php exit; ?>\n")) authReply(503, ['error'=>'Directory unavailable.']);
    $directory = json_decode(substr($raw, 14), true);
    if (!is_array($directory)) authReply(503, ['error'=>'Directory unavailable.']);
}
$events = array_merge($directory['activity'] ?? [], authRead()['activity'] ?? []);
usort($events, fn($a,$b)=>strcmp($b['at'], $a['at']) ?: strcmp($b['id'], $a['id']));
$offset = max(0, (int)($_GET['offset'] ?? 0));
authReply(200, ['events'=>array_slice($events, $offset, 50), 'total'=>count($events), 'archived'=>array_values($directory['archived'] ?? [])]);
