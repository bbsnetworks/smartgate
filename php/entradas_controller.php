<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/Visitor.php';
require_once __DIR__ . '/Encrypter.php';
require_once __DIR__ . '/conexion.php'; // usa $conexion para mapear user->personId

$fecha = $_GET['fecha'] ?? date('Y-m-d'); // YYYY-MM-DD
$user  = $_GET['user']  ?? 'all';         // 'me' | 'all' | <id>
$tipo  = $_GET['tipo']  ?? 'entrada';     // entrada | vencida | no_registrado

$debug = isset($_GET['debug']) && $_GET['debug'] == '1';

// (Opcional) override directo: ?eventType=196893
$eventTypeParam = $_GET['eventType'] ?? null;

// valida fecha
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Fecha inválida (usa YYYY-MM-DD)']);
  exit;
}

$config = api_cfg();
if (!$config) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Falta configuración API HikCentral']);
  exit;
}

// ✅ Tipos permitidos (incluye 197633)
$ALLOWED_EVENT_TYPES = [196893, 197384, 197633, 197151];

// ✅ Tabs -> eventTypes (vencida incluye 2 códigos)
$TIPOS = [
  "entrada"       => [196893],
  "vencida"       => [197384, 197633],
  "no_registrado" => [197151],
];

// eventTypes por tipo
$eventTypes = $TIPOS[$tipo] ?? $TIPOS["entrada"];

// override si viene eventType explícito
if ($eventTypeParam !== null && $eventTypeParam !== '') {
  $tmp = (int)$eventTypeParam;
  if (!in_array($tmp, $ALLOWED_EVENT_TYPES, true)) {
    http_response_code(400);
    echo json_encode([
      'ok' => false,
      'error' => 'eventType inválido',
      'allowed' => $ALLOWED_EVENT_TYPES
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }
  $eventTypes = [$tmp]; // sigue siendo array (1 solo)
}

// ✅ doorIndexCode y TZ confirmados
$DOOR_INDEXCODE = "3";
$TZ             = "-06:00";

// rango del día (incluye también el día anterior como lo tenías)
$startTime = $fecha . "T00:00:00" . $TZ;
$endTime   = $fecha . "T23:59:59" . $TZ;


// (Opcional) filtrar por personId según tu filtro global
$personIdFilter = null;

try {
  if ($user !== 'all') {
    session_start();
    $uid = 0;

    if ($user === 'me') {
      $uid = (int)($_SESSION['usuario']['id'] ?? 0);
    } else {
      $uid = (int)$user;
    }

    if ($uid > 0) {
      // Asumo que "usuarios.data" guarda el personId de HikCentral
      $stmt = $conexion->prepare("SELECT data AS personId FROM usuarios WHERE id = ? LIMIT 1");
      if ($stmt) {
        $stmt->bind_param("i", $uid);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        if (!empty($row['personId'])) {
          $personIdFilter = (string)$row['personId'];
        }
      }
    }
  }
} catch (Throwable $e) {
  $personIdFilter = null;
}

try {
  // ✅ endpoint correcto
  $urlService = "/artemis/api/acs/v1/door/events";
  $fullUrl = $config->urlHikCentralAPI . $urlService;

  $contentToSign = "POST\n*/*\napplication/json\nx-ca-key:" . $config->userKey . "\n" . $urlService;
  $signature = Encrypter::HikvisionSignature($config->userSecret, $contentToSign);

  $headers = [
    "x-ca-key: " . $config->userKey,
    "x-ca-signature-headers: x-ca-key",
    "x-ca-signature: " . $signature,
    "Content-Type: application/json",
    "Accept: */*"
  ];

  // payload base
  $payload = [
    "startTime" => $startTime,
    "endTime"   => $endTime,
    "doorIndexCodes" => [(string)$DOOR_INDEXCODE],
    "pageNo"    => 1,
    "pageSize"  => 50,
    "temperatureStatus" => -1,
    "maskStatus" => -1,
  ];

  if ($personIdFilter) {
    $payload["personId"] = $personIdFilter;
  }

  // 🔥 juntar resultados de múltiples eventTypes
  $all = [];

  $debugCalls = [];

foreach ($eventTypes as $et) {
  $payload["eventType"] = (int)$et;
  $data = json_encode($payload, JSON_UNESCAPED_UNICODE);

  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $fullUrl);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
  curl_setopt($ch, CURLOPT_TIMEOUT, 10);
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlErr  = curl_error($ch);
  curl_close($ch);

  // ✅ guarda debug por cada eventType
  if ($debug) {
    $debugCalls[] = [
      "eventType" => (int)$et,
      "requestUrl" => $fullUrl,
      "requestBody" => json_decode($data, true),
      "httpCode" => $httpCode,
      "rawResponse" => $response
    ];
  }

  if ($curlErr) throw new Exception("cURL: " . $curlErr);
  if ($httpCode != 200) throw new Exception("HTTP $httpCode - $response");

  $json = json_decode($response, true);
  if (!$json) throw new Exception("Respuesta no JSON: " . substr($response, 0, 200));

  $list = $json['data']['list'] ?? [];
  if (!is_array($list)) $list = [];

  foreach ($list as $x) {
    $all[] = [
      "personId"   => $x["personId"]   ?? "",
      "personName" => $x["personName"] ?? "",
      "eventTime"  => $x["eventTime"]  ?? ($x["deviceTime"] ?? ""),
      "picUri"     => $x["picUri"]     ?? "",
      "eventType"  => (int)$et,
    ];
  }
}


  // ordenar por eventTime desc
  usort($all, function($a, $b) {
    return strcmp($b['eventTime'] ?? '', $a['eventTime'] ?? '');
  });

  $out = [
  "ok" => true,
  "fecha" => $fecha,
  "tipo" => $tipo,
  "eventTypes" => array_map('intval', $eventTypes),
  "count" => count($all),
  "list" => $all
];

if ($debug) {
  $out["debug"] = [
    "startTime" => $startTime,
    "endTime" => $endTime,
    "personIdFilter" => $personIdFilter,
    "calls" => $debugCalls
  ];
}

echo json_encode($out, JSON_UNESCAPED_UNICODE);


} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
