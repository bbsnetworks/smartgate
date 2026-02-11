<?php
// php/sync_puertas.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/Visitor.php';
require_once __DIR__ . '/Encrypter.php';
require_once __DIR__ . '/conexion.php';

session_start();

if (!in_array($_SESSION['usuario']['rol'] ?? '', ['admin','root'], true)) {
  http_response_code(403);
  echo json_encode(["success"=>false,"error"=>"No autorizado"], JSON_UNESCAPED_UNICODE);
  exit;
}

// Config API desde DB
$config = api_cfg();
if (!$config) {
  http_response_code(500);
  echo json_encode([
    "success"=>false,
    "error"=>"Falta configuración de API. Ve a Dashboard → Configurar API HikCentral."
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

// Inputs
$puerta  = trim($_POST['puerta'] ?? 'principal');
if ($puerta === '') $puerta = 'principal';

// replace=1 => borrar descubiertos anteriores y dejar SOLO los actuales
$replace = (string)($_POST['replace'] ?? '1') === '1';

// Endpoint nuevo
$urlService = "/artemis/api/resource/v1/acsDoor/acsDoorList";
$fullUrl = $config->urlHikCentralAPI . $urlService;

// Firma
$contentToSign = "POST\n*/*\napplication/json\nx-ca-key:{$config->userKey}\n{$urlService}";
$signature = Encrypter::HikvisionSignature($config->userSecret, $contentToSign);

$headers = [
  "x-ca-key: {$config->userKey}",
  "x-ca-signature-headers: x-ca-key",
  "x-ca-signature: {$signature}",
  "Content-Type: application/json",
  "Accept: */*",
];

// Helper: POST a HikCentral
function hikPostRaw(string $fullUrl, array $headers, array $payload, int $timeout = 12): array {
  $data = json_encode($payload, JSON_UNESCAPED_UNICODE);

  $ch = curl_init();
  curl_setopt_array($ch, [
    CURLOPT_URL => $fullUrl,
    CURLOPT_RETURNTRANSFER => 1,
    CURLOPT_TIMEOUT => $timeout,
    CURLOPT_POST => 1,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_POSTFIELDS => $data,
    // Muchos HikCentral usan cert self-signed
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
  ]);

  $response = curl_exec($ch);
  $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err      = curl_error($ch);
  curl_close($ch);

  return [$response, $httpCode, $err];
}

try {
  // 1) Pedir lista de puertas (trae todo lo que quepa en una página grande)
  $payload = [
    "pageNo"   => 1,
    "pageSize" => 200, // suficiente para la mayoría; si tuvieras más, paginamos
  ];

  [$raw, $http, $err] = hikPostRaw($fullUrl, $headers, $payload, 12);

  if ($err) {
    throw new Exception("cURL: {$err}");
  }
  if ($http !== 200) {
    throw new Exception("HTTP {$http} - {$raw}");
  }

  $json = json_decode($raw, true);
  if (!is_array($json)) {
    throw new Exception("Respuesta no JSON: " . substr((string)$raw, 0, 200));
  }

  $code = (string)($json['code'] ?? '');
  if ($code !== "0") {
    $msg = (string)($json['msg'] ?? 'Error');
    throw new Exception("HikCentral: {$msg} (code={$code})");
  }

  $list = $json['data']['list'] ?? [];
  if (!is_array($list)) $list = [];

  // 2) Extraer doorIndexCode únicos
  $codes = [];
  foreach ($list as $row) {
    if (!is_array($row)) continue;
    if (!isset($row['doorIndexCode'])) continue;
    $d = trim((string)$row['doorIndexCode']);
    if ($d !== '') $codes[] = $d;
  }
  $codes = array_values(array_unique($codes));

  // Orden natural y quedarnos con 2 (si vienen más por otras regiones)
  sort($codes, SORT_NATURAL);
  if (count($codes) > 2) {
    $codes = array_slice($codes, 0, 2);
  }

  // 3) Guardar en BD: SOLO los recién descubiertos
  $conexion->begin_transaction();

  if ($replace) {
    // Borra SOLO los descubiertos anteriores de ese alias; NO toca manual
    $del = $conexion->prepare("DELETE FROM puertas_codigos_validos WHERE puerta=? AND fuente='descubierto'");
    if (!$del) throw new Exception("DB prepare delete failed");
    $del->bind_param("s", $puerta);
    $del->execute();
    $del->close();
  }

  // Inserta los encontrados (descubierto)
  if (count($codes) > 0) {
    $ins = $conexion->prepare("
      INSERT INTO puertas_codigos_validos (puerta, doorIndexCode, fuente, activo)
      VALUES (?, ?, 'descubierto', 1)
      ON DUPLICATE KEY UPDATE fuente='descubierto', activo=1
    ");
    if (!$ins) throw new Exception("DB prepare insert failed");

    foreach ($codes as $dIdx) {
      $dIdx = (string)$dIdx;
      $ins->bind_param("ss", $puerta, $dIdx);
      $ins->execute();
    }
    $ins->close();
  }

  $conexion->commit();

  // 4) Respuesta para el front (Puerta 1 / Puerta 2)
  echo json_encode([
    "success" => true,
    "puerta"  => $puerta,
    "count"   => count($codes),
    "puertas" => [
      "puerta1" => $codes[0] ?? null,
      "puerta2" => $codes[1] ?? null,
    ],
    "codes"   => $codes,
  ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  if (isset($conexion) && $conexion instanceof mysqli) {
    // rollback seguro si se abrió transacción
    @$conexion->rollback();
  }
  http_response_code(500);
  echo json_encode(["success"=>false,"error"=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
}