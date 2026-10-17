<?php
declare(strict_types=1);
require __DIR__.'/auth-core.php';
authUser();
session_write_close();
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
function reply(int $code, array $body): void { http_response_code($code); echo json_encode($body); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') reply(405, ['error'=>'Method not allowed.']);
$country = $_GET['country'] ?? '';
$countries = json_decode(file_get_contents(__DIR__.'/countries.json'), true);
if (!is_string($country) || !isset($countries[$country])) reply(422, ['error'=>'Select a supported country.']);
$file = __DIR__.'/private/discovery-'.hash('sha256', $country).'.php';
$guard = "<?php exit; ?>\n";
function cached(string $file, string $guard): ?array {
    if (!is_file($file)) return null;
    $raw = file_get_contents($file);
    return str_starts_with($raw, $guard) ? json_decode(substr($raw, strlen($guard)), true) : null;
}
$stored = cached($file, $guard);
if ($stored && ($stored['expires'] ?? 0) > time()) reply(isset($stored['error']) ? 503 : 200, $stored);
// One upstream request at a time, independent of the buyer-directory write lock.
$lock = fopen(__DIR__.'/private/discovery.lock.php', 'c');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) reply(503, ['error'=>'Discovery is busy. Please try again shortly.']);
$stored = cached($file, $guard);
if ($stored && ($stored['expires'] ?? 0) > time()) reply(isset($stored['error']) ? 503 : 200, $stored);
try {
    if (!function_exists('curl_init')) throw new RuntimeException('Unavailable');
    $name = ['USA'=>'United States', 'UK'=>'United Kingdom', 'Turkey'=>'Turkey'][$country] ?? $country;
    $literal = json_encode($name, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $query = 'SELECT DISTINCT ?item ?name ?description ?website WHERE {
      ?nation rdfs:label '.$literal.'@en .
      { ?item wdt:P17 ?nation } UNION { ?item wdt:P159/wdt:P17 ?nation }
      ?item rdfs:label ?name; schema:description ?description; wdt:P856 ?website .
      FILTER(LANG(?name)="en" && LANG(?description)="en")
      FILTER(REGEX(?description,"apparel|textile|clothing|fashion|garment","i"))
      FILTER(REGEX(?description,"company|brand|retailer|manufacturer|chain|business","i"))
    } LIMIT 40';
    $curl = curl_init('https://query.wikidata.org/sparql?format=json&query='.rawurlencode($query));
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>5, CURLOPT_TIMEOUT=>20, CURLOPT_HTTPHEADER=>['Accept: application/sparql-results+json', 'User-Agent: ImpressFashionBuyerDiscovery/1.0 (https://impress-fashion.com.bd/)']]);
    $raw = curl_exec($curl); $status = curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
    if ($status !== 200 || !is_string($raw)) throw new RuntimeException('Upstream unavailable');
    $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    if (!isset($data['results']['bindings'])) throw new RuntimeException('Invalid response');
    $results = [];
    foreach ($data['results']['bindings'] as $row) {
      $id = basename($row['item']['value'] ?? '');
      $website = $row['website']['value'] ?? '';
      if (!preg_match('/^Q[0-9]+$/', $id) || !preg_match('#^https?://#i', $website)) continue;
      $results[$id] = ['id'=>$id, 'buyer'=>$row['name']['value'], 'country'=>$country, 'website'=>$website, 'description'=>$row['description']['value'], 'source'=>'https://www.wikidata.org/wiki/'.$id];
    }
    $body = ['results'=>array_values($results), 'checkedAt'=>gmdate('c'), 'expires'=>time()+86400];
} catch (Throwable $error) {
    $body = ['error'=>'Free discovery is temporarily unavailable. Please try again later.', 'expires'=>time()+60];
}
file_put_contents($file, $guard.json_encode($body), LOCK_EX);
chmod($file, 0600);
reply(isset($body['error']) ? 503 : 200, $body);
