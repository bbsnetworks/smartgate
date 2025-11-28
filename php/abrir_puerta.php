<?php
require_once 'Visitor.php';
require_once 'conexion.php';
session_start();
header('Content-Type: application/json');

$config = api_cfg();
if (!$config) {
  http_response_code(500);
  echo json_encode(["success"=>false, "error"=>"Falta configuración de API. Ve a Dashboard → Configurar API HikCentral."]);
  exit;
}

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

/**
 * Encapsula la llamada a /door/doControl
 */
function doDoorControl($config, array $codes, int $controlType) {
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
    "controlType"    => $controlType
  ]);

  $ch = curl_init();
  curl_setopt_array($ch, [
    CURLOPT_URL            => $fullUrl,
    CURLOPT_RETURNTRANSFER => 1,
    CURLOPT_TIMEOUT        => Visitor::TIMEOUT,
    CURLOPT_POST           => 1,
    CURLOPT_HTTPHEADER     => $headers,
    CURLOPT_POSTFIELDS     => $payload,
  ]);
  if (stripos($fullUrl, 'https://') !== 0) {
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
  }

  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err      = curl_error($ch);
  curl_close($ch);

  return [
    'err'      => $err,
    'httpCode' => $httpCode,
    'body'     => $response,
    'decoded'  => json_decode($response, true)
  ];
}

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

/* ===== 1) PRIMERA LLAMADA: ABRIR (controlType = 0) ===== */
$openResp = doDoorControl($config, $codes, 0);

if ($openResp['err']) {
  echo json_encode(["success"=>false, "error"=>"Error de cURL (abrir): {$openResp['err']}"]);
  exit;
}
if ($openResp['httpCode'] !== 200) {
  echo json_encode(["success"=>false, "error"=>"HTTP {$openResp['httpCode']} (abrir): {$openResp['body']}"]);
  exit;
}

$decoded = $openResp['decoded'];
$apiCode = isset($decoded['code']) ? (string)$decoded['code'] : null;
$results = extractControlResults($decoded);

// Éxito si code === "0" y al menos un controlResultCode === 0
$ok = ($apiCode === "0") && array_reduce($results, function($carry, $item){
  return $carry || (isset($item['controlResultCode']) && intval($item['controlResultCode']) === 0);
}, false);

if ($ok) {

  /* ===== 2) SEGUNDA LLAMADA: CERRAR / STOP (controlType = 1) ===== */
  // Pequeña pausa opcional, por si el torniquete necesita un instante
  usleep(150 * 1000); // 150ms

  $closeResp = doDoorControl($config, $codes, 1);
  $closeInfo = [
    'sent'     => false,
    'httpCode' => $closeResp['httpCode'],
    'err'      => $closeResp['err'] ?: null,
  ];

  if (!$closeResp['err'] && $closeResp['httpCode'] === 200) {
    $closeInfo['sent'] = true;
  }

  echo json_encode([
    "success"       => true,
    "msg"           => "Puerta abierta",
    "puerta"        => $puerta,
    "usando"        => $codes,
    "autoClose"     => $closeInfo  // info de la segunda llamada
  ]);
  exit;
}

// Si no pudimos confirmar éxito al abrir, devolvemos info de depuración
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
