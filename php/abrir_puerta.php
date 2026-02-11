<?php
require_once 'Visitor.php';
require_once 'conexion.php';
require_once 'Encrypter.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

$config = api_cfg();
if (!$config) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "error" => "Falta configuración de API. Ve a Dashboard → Configurar API HikCentral."
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

$puerta = $_POST['puerta'] ?? 'principal';
$slot   = isset($_POST['slot']) ? (int)$_POST['slot'] : 0; // 1 o 2 (0 = todas)

/**
 * Lee códigos válidos activos (solo "descubierto") y máximo 2
 * Puerta 1 = primer registro (ORDER BY id ASC)
 * Puerta 2 = segundo registro
 */
$stmt = $conexion->prepare("
  SELECT doorIndexCode
  FROM puertas_codigos_validos
  WHERE puerta = ?
    AND activo = 1
    AND fuente = 'descubierto'
  ORDER BY id ASC
  LIMIT 2
");
$stmt->bind_param("s", $puerta);
$stmt->execute();
$res = $stmt->get_result();

$allCodes = [];
while ($r = $res->fetch_assoc()) {
  $allCodes[] = (string)$r['doorIndexCode'];
}
$stmt->close();

if (empty($allCodes)) {
  echo json_encode([
    "success" => false,
    "error" => "No hay puertas activas en BD. Ejecuta 'Sincronizar puertas' primero."
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

// slot=0 abre todas (compatibilidad)
// slot=1 abre Puerta 1
// slot=2 abre Puerta 2 (si existe)
$codes = $allCodes;

if ($slot === 1) {
  $codes = [ $allCodes[0] ];
} elseif ($slot === 2) {
  if (count($allCodes) < 2) {
    echo json_encode([
      "success" => false,
      "error" => "Puerta 2 no está disponible. Sincroniza puertas."
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }
  $codes = [ $allCodes[1] ];
} else {
  $slot = 0;
  $codes = $allCodes;
}

/**
 * Encapsula la llamada a /door/doControl
 * controlType:
 * 0=remain open, 1=close, 2=open, 3=remain open (según tu doc)
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

  // ✅ Incluye controlDirection=0 (como tu prueba manual)
  $payload = json_encode([
    "doorIndexCodes"   => $codes,
    "controlType"      => $controlType,
    "controlDirection" => 0
  ], JSON_UNESCAPED_UNICODE);

  $ch = curl_init();
  curl_setopt_array($ch, [
    CURLOPT_URL            => $fullUrl,
    CURLOPT_RETURNTRANSFER => 1,
    CURLOPT_TIMEOUT        => Visitor::TIMEOUT,
    CURLOPT_POST           => 1,
    CURLOPT_HTTPHEADER     => $headers,
    CURLOPT_POSTFIELDS     => $payload,
  ]);

  // Mantengo tu lógica para no romper tu entorno
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

/** Normaliza "data" a lista de resultados */
function extractControlResults($decoded) {
  $out = [];
  if (!is_array($decoded)) return $out;

  if (isset($decoded['data']) && is_array($decoded['data']) && isset($decoded['data']['controlResultCode'])) {
    $out[] = $decoded['data'];
    return $out;
  }

  if (isset($decoded['data']) && is_array($decoded['data']) && array_is_list($decoded['data'])) {
    foreach ($decoded['data'] as $item) {
      if (is_array($item)) $out[] = $item;
    }
    return $out;
  }

  if (isset($decoded['data']['list']) && is_array($decoded['data']['list'])) {
    foreach ($decoded['data']['list'] as $item) {
      if (is_array($item)) $out[] = $item;
    }
    return $out;
  }

  return $out;
}

/* ===== ABRIR (controlType = 2) ===== */
$openResp = doDoorControl($config, $codes, 2);

if ($openResp['err']) {
  echo json_encode(["success"=>false, "error"=>"Error de cURL (abrir): {$openResp['err']}"], JSON_UNESCAPED_UNICODE);
  exit;
}
if ((int)$openResp['httpCode'] !== 200) {
  echo json_encode(["success"=>false, "error"=>"HTTP {$openResp['httpCode']} (abrir): {$openResp['body']}"], JSON_UNESCAPED_UNICODE);
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
  echo json_encode([
    "success" => true,
    "msg"     => "Puerta abierta",
    "puerta"  => $puerta,
    "slot"    => $slot,     // 0 = todas, 1 = puerta 1, 2 = puerta 2
    "usando"  => $codes     // códigos realmente usados
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

// Si no abrió, devolvemos info útil
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
  "slot"    => $slot,
  "usando"  => $codes,
  "results" => $compactResults,
  "desc"    => $firstDesc
], JSON_UNESCAPED_UNICODE);