<?php
require_once 'Visitor.php';
require_once 'conexion.php';
session_start();
header('Content-Type: application/json');

$config = (object)[
  "userKey" => "21660945",
  "userSecret" => "93iLwvnQkXAvlHw8wbQz",
  "urlHikCentralAPI" => "http://127.0.0.1:9016"
];

$puerta = $_POST['puerta'] ?? 'principal';

/** Lee códigos válidos activos de BD */
$stmt = $conexion->prepare("
  SELECT doorIndexCode
  FROM puertas_codigos_validos
  WHERE puerta = ? AND activo = 1
  ORDER BY doorIndexCode+0 ASC
");
$stmt->bind_param("s", $puerta);
$stmt->execute();
$res = $stmt->get_result();
$codes = [];
while ($r = $res->fetch_assoc()) {
  $codes[] = (string)$r['doorIndexCode'];
}
$stmt->close();

if (empty($codes)) {
  echo json_encode([
    "success" => false,
    "error"   => "No hay códigos válidos en BD. Ejecuta 'Verificar puertas' primero."
  ]);
  exit;
}

/** Firma y headers */
$urlService = "/artemis/api/acs/v1/door/doControl";
$fullUrl    = $config->urlHikCentralAPI . $urlService;
$contentToSign = "POST\n*/*\napplication/json\nx-ca-key:{$config->userKey}\n{$urlService}";
$signature  = Encrypter::HikvisionSignature($config->userSecret, $contentToSign);

$headers = [
  "x-ca-key: {$config->userKey}",
  "x-ca-signature-headers: x-ca-key",
  "x-ca-signature: {$signature}",
  "Content-Type: application/json",
  "Accept: */*"
];

$payload = json_encode([
  "doorIndexCodes" => $codes,
  "controlType"    => 0
]);

/** Llamada */
$ch = curl_init();
curl_setopt_array($ch, [
  CURLOPT_URL => $fullUrl,
  CURLOPT_RETURNTRANSFER => 1,
  CURLOPT_TIMEOUT => 10,
  CURLOPT_SSL_VERIFYPEER => false,
  CURLOPT_SSL_VERIFYHOST => false,
  CURLOPT_POST => 1,
  CURLOPT_HTTPHEADER => $headers,
  CURLOPT_POSTFIELDS => $payload,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err      = curl_error($ch);
curl_close($ch);

if ($err) {
  echo json_encode(["success"=>false, "error"=>"Error de cURL: $err"]);
  exit;
}
if ($httpCode !== 200) {
  echo json_encode(["success"=>false, "error"=>"HTTP $httpCode: $response"]);
  exit;
}

$decoded = json_decode($response, true);

/** --- Normalización de resultados --- */
function extractControlResults($decoded) {
  $out = [];

  if (!is_array($decoded)) return $out;

  // Caso típico: data es objeto { doorIndexCode, controlResultCode, ... }
  if (isset($decoded['data']) && is_array($decoded['data']) && isset($decoded['data']['controlResultCode'])) {
    $out[] = $decoded['data'];
    return $out;
  }

  // Caso: data es array de objetos [{...}, {...}]
  if (isset($decoded['data']) && is_array($decoded['data']) && array_is_list($decoded['data'])) {
    foreach ($decoded['data'] as $item) {
      if (is_array($item)) $out[] = $item;
    }
    return $out;
  }

  // Caso: data.list es array
  if (isset($decoded['data']['list']) && is_array($decoded['data']['list'])) {
    foreach ($decoded['data']['list'] as $item) {
      if (is_array($item)) $out[] = $item;
    }
    return $out;
  }

  return $out;
}

$apiCode = isset($decoded['code']) ? (string)$decoded['code'] : null;
$results = extractControlResults($decoded);

// Éxito si code === "0" y al menos un controlResultCode === 0
$ok = ($apiCode === "0") && array_reduce($results, function($carry, $item){
  return $carry || (isset($item['controlResultCode']) && intval($item['controlResultCode']) === 0);
}, false);

if ($ok) {
  echo json_encode([
    "success" => true,
    "msg"     => "Puerta abierta",
    "puerta"  => $puerta,
    "usando"  => $codes
  ]);
  exit;
}

// Si no pudimos confirmar éxito, devolvemos info de depuración
$compactResults = array_map(function($i){
  return [
    'doorIndexCode'      => $i['doorIndexCode']      ?? null,
    'controlResultCode'  => $i['controlResultCode']  ?? null,
    'controlResultDesc'  => $i['controlResultDesc']  ?? null,
  ];
}, $results);

$firstDesc = $results[0]['controlResultDesc'] ?? '';
echo json_encode([
  "success" => false,
  "error"   => "No se pudo abrir.",
  "code"    => $apiCode,
  "results" => $compactResults,
  "desc"    => $firstDesc
]);

