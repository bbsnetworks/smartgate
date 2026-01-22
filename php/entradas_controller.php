<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/Visitor.php';
require_once __DIR__ . '/Encrypter.php';

$fecha = $_GET['fecha'] ?? date('Y-m-d'); // YYYY-MM-DD
$user  = $_GET['user']  ?? 'all';         // 'me' | 'all' | <id>

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

// ✅ los que ya confirmaste
$EVENT_TYPE     = 196893;
$DOOR_INDEXCODE = "3";       // <- tu doorIndexCode correcto
$TZ             = "-06:00";  // <- rango horario correcto

// rango del día (con timezone -06:00)
$startTime = $fecha . "T00:00:00" . $TZ;
$endTime   = $fecha . "T23:59:59" . $TZ;

// (Opcional) filtrar por personId según tu usuario global
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
      // ⚠️ AJUSTA si tu tabla/campo se llaman distinto
      // Aquí asumo que "usuarios.data" guarda el personId de HikCentral
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

  $TZ = "-06:00";

$startTime = date('Y-m-d', strtotime($fecha . ' -1 day')) . "T00:00:00" . $TZ;
$endTime   = $fecha . "T23:59:59" . $TZ;

$payload = [
  "startTime" => $startTime,
  "endTime"   => $endTime,
  "eventType" => $EVENT_TYPE,
  "doorIndexCodes" => [(string)$DOOR_INDEXCODE],
  "pageNo"    => 1,
  "pageSize"  => 10,
  "temperatureStatus" => -1,
  "maskStatus" => -1,
];



  // filtro opcional por persona
  if ($personIdFilter) {
    $payload["personId"] = $personIdFilter;
  }

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

  if ($curlErr) throw new Exception("cURL: " . $curlErr);
  if ($httpCode != 200) throw new Exception("HTTP $httpCode - $response");

  $json = json_decode($response, true);
  if (!$json) throw new Exception("Respuesta no JSON: " . substr($response, 0, 200));

  $list = $json['data']['list'] ?? [];
  if (!is_array($list)) $list = [];

  // Normalizamos para tu UI
  $out = array_map(function($x) {
    return [
      "personId"   => $x["personId"]   ?? "",
      "personName" => $x["personName"] ?? "",
      "eventTime"  => $x["eventTime"]  ?? ($x["deviceTime"] ?? ""),
      "picUri"     => $x["picUri"]     ?? ""
    ];
  }, $list);

  // ordenar por eventTime desc
  usort($out, function($a, $b) {
    return strcmp($b['eventTime'] ?? '', $a['eventTime'] ?? '');
  });

  echo json_encode([
    "ok" => true,
    "fecha" => $fecha,
    "count" => count($out),
    "list" => $out
  ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
