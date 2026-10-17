<?php
declare(strict_types=1);
require __DIR__.'/auth-core.php';
require __DIR__.'/activity-core.php';
$account = authUser();
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $authorizedInput = authPost();
    if (in_array($authorizedInput['action'] ?? '', ['delete','restore','research','contact-save','contact-remove'], true) && $account['role'] !== 'super') authReply(403, ['error'=>'Only super users can archive, restore or edit buyers.']);
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

function saveState(string $path, array $state): void {
    // PHP guard also protects stored data when Apache access rules are unavailable.
    $bytes = "<?php exit; ?>\n" . json_encode($state, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    $temporary = $path . '.tmp.php';
    if (file_put_contents($temporary, $bytes) !== strlen($bytes) || !rename($temporary, $path)) {
        throw new RuntimeException('Could not save directory');
    }
    chmod($path, 0600);
}

function field(array $input, string $name, int $max, bool $required = false): string {
    if (isset($input[$name]) && !is_string($input[$name])) respond(422, ['error' => 'Invalid ' . $name . '.']);
    $value = trim($input[$name] ?? '');
    if (($required && $value === '') || strlen($value) > $max || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $value)) {
        respond(422, ['error' => 'Please provide a valid ' . $name . '.']);
    }
    return $value;
}

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['GET', 'POST'], true)) respond(405, ['error' => 'Method not allowed.']);
    $input = [];
    if ($method === 'POST') {
        // A custom header and JSON body prevent cross-site form submissions. No CORS is enabled.
        if (($_SERVER['HTTP_X_BUYER_REQUEST'] ?? '') !== '1' || stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
            respond(403, ['error' => 'Please submit changes from the buyer form.']);
        }
        if (isset($_SERVER['HTTP_ORIGIN'])) {
            $origin = parse_url($_SERVER['HTTP_ORIGIN']);
            $authority = ($origin['host'] ?? '') . (isset($origin['port']) ? ':' . $origin['port'] : '');
            if (strtolower($authority) !== strtolower($_SERVER['HTTP_HOST'] ?? '')) respond(403, ['error' => 'Origin not allowed.']);
        }
        $raw = file_get_contents('php://input', false, null, 0, 16385);
        if (strlen($raw) > 16384) respond(413, ['error' => 'Submission is too large.']);
        try { $input = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); }
        catch (JsonException $error) { respond(400, ['error' => 'Invalid submission.']); }
        if (!is_array($input)) respond(400, ['error' => 'Invalid submission.']);
    }

    $private = __DIR__ . '/private';
    if (!is_dir($private)) throw new RuntimeException('Missing private directory');
    $lock = fopen($private . '/directory.lock.php', 'c+');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Directory is busy');
    // The lock is held until the response exits; concurrent writes cannot overwrite each other.
    $path = $private . '/directory.php';
    if (is_file($path)) {
        $stored = file_get_contents($path);
        if (strpos($stored, "<?php exit; ?>\n") !== 0) throw new RuntimeException('Invalid storage');
        $state = json_decode(substr($stored, strlen("<?php exit; ?>\n")), true, 64, JSON_THROW_ON_ERROR);
        if (!isset($state['buyers'], $state['rates']) || !is_array($state['buyers']) || !is_array($state['rates'])) throw new RuntimeException('Invalid storage');
    } else {
        $seed = json_decode(substr(file_get_contents(__DIR__ . '/private/seed.php'), 14), true, 64, JSON_THROW_ON_ERROR);
        $state = ['buyers' => $seed, 'rates' => [], 'revision' => 1];
        saveState($path, $state);
    }
    // Apply newly researched batches once, retaining custom records and previous deletions.
    $seed = json_decode(substr(file_get_contents(__DIR__ . '/private/seed.php'), 14), true, 64, JSON_THROW_ON_ERROR);
    $applied = $state['appliedBatches'] ?? [];
    $pending = [];
    foreach ($seed as $candidate) {
        $batch = $candidate['directoryBatch'] ?? null;
        if (!$batch || in_array($batch, $applied, true)) continue;
        $pending[$batch] = true;
        $exists = false;
        foreach (array_merge($state['buyers'], array_column($state['archived'] ?? [], 'buyer')) as $existing) {
            if ($existing['id'] === $candidate['id'] || ($existing['country'] === $candidate['country'] && strcasecmp(trim($existing['buyer']), trim($candidate['buyer'])) === 0)) {
                $exists = true;
                break;
            }
        }
        if (!$exists) $state['buyers'][] = $candidate;
    }
    if ($pending) {
        $state['appliedBatches'] = array_merge($applied, array_keys($pending));
        $state['revision']++;
        saveState($path, $state);
    }
    if ($method === 'GET') respond(200, ['buyers' => $state['buyers'], 'revision' => $state['revision']]);

    $action = field($input, 'action', 20, true);
    if (!in_array($action, ['add', 'delete', 'restore', 'research', 'contact-save', 'contact-remove'], true)) respond(422, ['error' => 'Unknown action.']);
    $state['archived'] ??= [];
    $state['activity'] ??= [];
    if (in_array($action, ['contact-save','contact-remove'], true)) {
        $id = field($input, 'id', 120, true);
        $index = array_search($id, array_column($state['buyers'], 'id'), true);
        if ($index === false) respond(404, ['error'=>'Buyer not found or archived.']);
        $record = $state['buyers'][$index];
        $version = $record['contactsVersion'] ?? 0;
        if (($input['expectedVersion'] ?? null) !== $version) respond(409, ['error'=>'Contacts changed in another session. Refresh contacts before saving.']);
        $contacts = $record['contacts'] ?? [];
        $contactId = field($input, 'contactId', 120);
        $position = array_search($contactId, array_column($contacts, 'id'), true);
        if ($contactId !== '' && $position === false) respond(404, ['error'=>'Contact not found.']);
        $before = $position === false ? null : $contacts[$position];
        if ($action === 'contact-remove') {
            if (!$before) respond(404, ['error'=>'Contact not found.']);
            array_splice($contacts, $position, 1);
            $after = null;
        } else {
            if (!isset($input['contact']) || !is_array($input['contact'])) respond(422, ['error'=>'Invalid contact.']);
            $entry = $input['contact'];
            $after = ['id'=>$contactId ?: 'contact-'.bin2hex(random_bytes(12)), 'name'=>field($entry,'name',160,true)];
            foreach (['title'=>160,'email'=>254,'phone'=>80,'responsibility'=>500,'officeType'=>30,'officeName'=>160,'city'=>160,'country'=>100,'address'=>500,'source'=>500,'notes'=>1000] as $key=>$max) $after[$key] = field($entry,$key,$max);
            if ($after['email'] !== '' && !filter_var($after['email'], FILTER_VALIDATE_EMAIL)) respond(422, ['error'=>'Enter a valid business email.']);
            if (!in_array($after['officeType'], ['Unknown','Headquarters','Buying office','Other office'], true)) respond(422, ['error'=>'Select a valid office type.']);
            if ($after['source'] !== '' && (!filter_var($after['source'], FILTER_VALIDATE_URL) || !in_array(strtolower(parse_url($after['source'], PHP_URL_SCHEME) ?: ''), ['http','https'], true))) respond(422, ['error'=>'Source must be an http or https URL.']);
            foreach ($contacts as $contact) if ($contact['id'] !== $after['id'] && $after['email'] !== '' && strcasecmp($contact['email'], $after['email']) === 0) respond(409, ['error'=>'This business email already belongs to a contact for this buyer.']);
            $after['updatedAt'] = gmdate('c'); $after['updatedBy'] = $account['id'];
            if ($position === false) {
                if (count($contacts) >= 100) respond(409, ['error'=>'This buyer already has 100 contacts.']);
                $contacts[] = $after;
            } else $contacts[$position] = $after;
        }
        $state['buyers'][$index]['contacts'] = array_values($contacts);
        $state['buyers'][$index]['contactsVersion'] = $version + 1;
        $buyer = $state['buyers'][$index];
        $state['activity'][] = activityEntry($account, $action === 'contact-remove' ? 'Buyer contact removed' : ($before ? 'Buyer contact updated' : 'Buyer contact added'), $id, $buyer['buyer'], ['before'=>$before,'after'=>$after]);
        $state['revision']++; saveState($path, $state);
        respond(200, ['buyers'=>$state['buyers'],'revision'=>$state['revision'],'buyer'=>$buyer]);
    }
    if ($action === 'restore') {
        $id = field($input, 'id', 120, true);
        $archived = $state['archived'][$id] ?? null;
        if (!$archived) respond(404, ['error'=>'Archived buyer not found.']);
        foreach ($state['buyers'] as $existing) {
            if ($existing['id'] === $id || ($existing['country'] === $archived['buyer']['country'] && strcasecmp(trim($existing['buyer']), trim($archived['buyer']['buyer'])) === 0)) respond(409, ['error'=>'An active buyer with this name and country already exists.']);
        }
        if (count($state['buyers']) >= 5000) respond(409, ['error'=>'Directory capacity reached.']);
        $buyer = $archived['buyer']; $state['buyers'][] = $buyer;
        unset($state['archived'][$id]);
        $state['activity'][] = activityEntry($account, 'Buyer restored', $id, $buyer['buyer']);
        $state['revision']++; saveState($path, $state);
        respond(200, ['buyers'=>$state['buyers'], 'revision'=>$state['revision'], 'buyer'=>$buyer]);
    }
    if ($action === 'research') {
        $id = field($input, 'id', 120, true);
        $details = $input['details'] ?? null;
        if (!is_array($details)) respond(422, ['error'=>'Invalid research details.']);
        foreach (['products'=>100, 'notes'=>100] as $key=>$limit) {
            if (!isset($details[$key]) || !is_array($details[$key]) || !array_is_list($details[$key]) || count($details[$key]) > $limit) respond(422, ['error'=>'Invalid research details.']);
            foreach ($details[$key] as $value) if (!is_string($value) || strlen($value) > ($key === 'notes' ? 5000 : 200)) respond(422, ['error'=>'Research entry too long.']);
        }
        $index = array_search($id, array_column($state['buyers'], 'id'), true);
        if ($index === false) respond(404, ['error'=>'Buyer not found.']);
        $before = $state['buyers'][$index]['research'] ?? ['products'=>[], 'notes'=>[]];
        $next = ['products'=>array_values(array_unique($details['products'])), 'notes'=>$details['notes']];
        if (($input['expectedResearch'] ?? ['products'=>[], 'notes'=>[]]) !== $before) respond(409, ['error'=>'Research changed in another session. Reopen this buyer before saving.']);
        $state['buyers'][$index]['research'] = $next;
        $buyer = $state['buyers'][$index];
        $state['activity'][] = activityEntry($account, 'Buyer research updated', $id, $buyer['buyer'], ['before'=>$before, 'after'=>$next]);
        $state['revision']++; saveState($path, $state);
        respond(200, ['buyers'=>$state['buyers'], 'revision'=>$state['revision'], 'buyer'=>$buyer]);
    }
    $now = time();
    $state['rates'] = array_filter($state['rates'], fn($rate) => $rate['until'] > $now);
    $rateKey = hash('sha256', $action . '|' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    $rate = $state['rates'][$rateKey] ?? ['count' => 0, 'until' => $now + ($action === 'add' ? 3600 : 900)];
    if ($rate['count'] >= ($action === 'add' ? 20 : 5)) {
        header('Retry-After: ' . max(1, $rate['until'] - $now));
        respond(429, ['error' => $action === 'delete' ? 'Too many incorrect passwords. Try again in 15 minutes.' : 'Submission limit reached. Please try again later.']);
    }

    if ($action === 'delete') {
        $id = field($input, 'id', 120, true);
        $password = field($input, 'password', 256, true);
        if (!authVerify($password, $account)) {
            $rate['count']++;
            $state['rates'][$rateKey] = $rate;
            saveState($path, $state);
            respond(403, ['error' => 'Incorrect password. The buyer was not deleted.']);
        }
        $remaining = array_values(array_filter($state['buyers'], fn($buyer) => $buyer['id'] !== $id));
        if (count($remaining) === count($state['buyers'])) respond(404, ['error' => 'This buyer has already been removed.']);
        $archivedBuyer = array_values(array_filter($state['buyers'], fn($buyer) => $buyer['id'] === $id))[0];
        $state['archived'][$id] = ['buyer'=>$archivedBuyer, 'at'=>gmdate('c'), 'by'=>$account['id']];
        $state['activity'][] = activityEntry($account, 'Buyer archived', $id, $archivedBuyer['buyer']);
        $state['buyers'] = $remaining;
        unset($state['rates'][$rateKey]);
    } else {
        $name = field($input, 'buyer', 160, true);
        $country = field($input, 'country', 100, true);
        $locations = json_decode(file_get_contents(__DIR__ . '/countries.json'), true, 32, JSON_THROW_ON_ERROR);
        if (!isset($locations[$country])) respond(422, ['error' => 'Choose a country from the list.']);
        foreach ($state['buyers'] as $existing) {
            if ($existing['country'] === $country && preg_match('/^' . preg_quote($name, '/') . '$/iu', trim($existing['buyer']))) {
                respond(409, ['error' => 'A buyer with this name already exists in this country.']);
            }
        }
        if (count($state['buyers']) >= 5000) respond(409, ['error' => 'The directory has reached its capacity.']);
        $website = field($input, 'website', 500);
        if ($website !== '') {
            $url = parse_url($website);
            if (!filter_var($website, FILTER_VALIDATE_URL) || !in_array(strtolower($url['scheme'] ?? ''), ['http', 'https'], true) || isset($url['user']) || isset($url['pass'])) {
                respond(422, ['error' => 'Website must be a valid http:// or https:// address.']);
            }
        }
        $buyer = [
            'id' => 'custom-' . bin2hex(random_bytes(16)), 'buyer' => $name, 'country' => $country,
            'city' => field($input, 'city', 160), 'website' => $website,
            'categories' => field($input, 'categories', 200), 'group' => field($input, 'group', 160),
            'notes' => field($input, 'notes', 2000), 'lat' => $locations[$country]['lat'], 'lng' => $locations[$country]['lng'],
            'color' => '#a78bfa', 'locationBasis' => 'Country anchor — not an office location',
            'reviewStatus' => 'User added — not verified', 'sources' => [], 'aliases' => [],
            'recordType' => 'User-added buyer', 'createdAt' => gmdate('c')
        ];
        $state['buyers'][] = $buyer;
        $state['activity'][] = activityEntry($account, 'Buyer added', $buyer['id'], $buyer['buyer']);
        $rate['count']++;
        $state['rates'][$rateKey] = $rate;
    }
    $state['revision']++;
    saveState($path, $state);
    respond(200, ['buyers' => $state['buyers'], 'revision' => $state['revision'], 'buyer' => $buyer ?? null]);
} catch (Throwable $error) {
    error_log('Buyer directory: ' . $error->getMessage());
    respond(503, ['error' => 'The shared directory is unavailable. Please try again or contact the site owner.']);
}
