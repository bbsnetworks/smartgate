<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/Visitor.php';
require_once __DIR__ . '/Encrypter.php';
require_once __DIR__ . '/conexion.php'; // usa $conexion para mapear user->personId

// ===============================
// Inputs
// ===============================
$fecha = $_GET['fecha'] ?? date('Y-m-d'); // YYYY-MM-DD
$user  = $_GET['user']  ?? 'all';         // 'me' | 'all' | <id>
$tipo  = $_GET['tipo']  ?? 'entrada';     // entrada | vencida | no_registrado | todos

$horaDesde = $_GET['hora_desde'] ?? null; // HH:MM
$horaHasta = $_GET['hora_hasta'] ?? null; // HH:MM
$q         = trim($_GET['q'] ?? '');      // buscar por personCode

$limit     = (int)($_GET['limit'] ?? 0);  // para "todos" default 10
$debug     = isset($_GET['debug']) && $_GET['debug'] == '1';

// (Opcional) override directo: ?eventType=196893
$eventTypeParam = $_GET['eventType'] ?? null;

// valida fecha
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Fecha inválida (usa YYYY-MM-DD)']);
  exit;
}

// valida horas (si vienen)
$validTime = function($t) {
  if ($t === null || $t === '') return true;
  return preg_match('/^\d{2}:\d{2}$/', $t) === 1;
};
if (!$validTime($horaDesde) || !$validTime($horaHasta)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Hora inválida (usa HH:MM)']);
  exit;
}

$config = api_cfg();
if (!$config) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Falta configuración API HikCentral']);
  exit;
}

// ===============================
// Config HikCentral
// ===============================
$DOOR_INDEXCODE = "3";
$TZ             = "-06:00";

// ✅ Tipos permitidos (incluye 197633)
$ALLOWED_EVENT_TYPES = [196893, 197384, 197633, 197151];

// ✅ Tabs -> eventTypes (vencida incluye 2 códigos)
$TIPOS = [
  "entrada"       => [196893],
  "vencida"       => [197384, 197633],
  "no_registrado" => [197151],
  "todos"         => [196893, 197384, 197633, 197151],
];

// helper: eventType -> eventKey
$eventTypeToKey = function($et) {
  $et = (int)$et;
  if ($et === 196893) return "entrada";
  if ($et === 197151) return "no_registrado";
  if ($et === 197384 || $et === 197633) return "vencida";
  return "entrada";
};

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

// ===============================
// Rango de tiempo
// ===============================
function makeIso($ymd, $hhmm, $sec, $tz) {
  return $ymd . "T" . $hhmm . ":" . $sec . $tz;
}

$startTime = $fecha . "T00:00:00" . $TZ;
$endTime   = $fecha . "T23:59:59" . $TZ;

// Si vienen horas, aplicarlas
if ($horaDesde && $horaHasta) {
  $startTime = makeIso($fecha, $horaDesde, "00", $TZ);
  $endTime   = makeIso($fecha, $horaHasta, "59", $TZ);

  // Si horaHasta < horaDesde, asumimos cruza medianoche (+1 día)
  if (strcmp($horaHasta, $horaDesde) < 0) {
    $d = DateTime::createFromFormat('Y-m-d', $fecha);
    if ($d) {
      $d->modify('+1 day');
      $fechaFin = $d->format('Y-m-d');
      $endTime = makeIso($fechaFin, $horaHasta, "59", $TZ);
    }
  }
}

// ===============================
// Filtrar por personId (user global)
// ===============================
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

// ===============================
// Cliente HikCentral (POST firmado)
// ===============================
function hikPost($config, $urlService, $payload, &$httpCodeOut = null, &$rawOut = null) {
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

  $data = json_encode($payload, JSON_UNESCAPED_UNICODE);

  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $fullUrl);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
  curl_setopt($ch, CURLOPT_TIMEOUT, 12);
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlErr  = curl_error($ch);
  curl_close($ch);

  $httpCodeOut = $httpCode;
  $rawOut = $response;

  if ($curlErr) throw new Exception("cURL: " . $curlErr);
  if ($httpCode != 200) throw new Exception("HTTP $httpCode - $response");

  $json = json_decode($response, true);
  if (!$json) throw new Exception("Respuesta no JSON: " . substr($response, 0, 200));

  return $json;
}

// ===============================
// Resolver personId por personCode (q)
// ===============================
function findPersonIdsByPersonCode($config, $personCode, &$dbg = null) {
  if ($personCode === '') return [];

  $urlService = "/artemis/api/resource/v1/person/personList";
  $payload = [
    "pageNo" => 1,
    "pageSize" => 50,
    "personCode" => $personCode,
  ];

  $hc = null; $raw = null;
  $json = hikPost($config, $urlService, $payload, $hc, $raw);

  if ($dbg !== null) {
    $dbg[] = [
      "service" => "personList(personCode)",
      "requestBody" => $payload,
      "httpCode" => $hc,
      "rawResponse" => $raw
    ];
  }

  $list = $json['data']['list'] ?? [];
  if (!is_array($list)) return [];

  $ids = [];
  foreach ($list as $p) {
    if (!empty($p['personId'])) $ids[] = (string)$p['personId'];
  }
  return array_values(array_unique($ids));
}

// ===============================
// Resolver personCode por personId (cache)
// ===============================
function resolvePersonCodeByPersonId($config, $personId, &$cache, $dbg = null) {
  $personId = (string)$personId;
  if ($personId === '') return '';

  if (isset($cache[$personId])) return $cache[$personId];

  $urlService = "/artemis/api/resource/v1/person/personList";
  $payload = [
    "pageNo" => 1,
    "pageSize" => 1,
    "personId" => $personId,
  ];

  $hc = null; $raw = null;
  $json = hikPost($config, $urlService, $payload, $hc, $raw);

  if ($dbg !== null) {
    $dbg[] = [
      "service" => "personList(personId)",
      "requestBody" => $payload,
      "httpCode" => $hc,
      "rawResponse" => $raw
    ];
  }

  $list = $json['data']['list'] ?? [];
  $code = '';
  if (is_array($list) && count($list) > 0) {
    $code = (string)($list[0]['personCode'] ?? '');
  }

  $cache[$personId] = $code;
  return $code;
}

// ===============================
// Main
// ===============================
try {
  $urlServiceEvents = "/artemis/api/acs/v1/door/events";

  // payload base
  $payloadBase = [
    "startTime" => $startTime,
    "endTime"   => $endTime,
    "doorIndexCodes" => [(string)$DOOR_INDEXCODE],
    "pageNo"    => 1,
    "pageSize"  => 50,
    "temperatureStatus" => -1,
    "maskStatus" => -1,
  ];

  // filtro por usuario (personId)
  if ($personIdFilter) {
    $payloadBase["personId"] = $personIdFilter;
  }

  // filtro por personCode (q) → resolver personId(s) primero
  $debugCalls = [];
  $qPersonIds = [];

  if ($q !== '' && !$personIdFilter) {
    // Si el filtro global ya fija personId, no tiene sentido buscar por q externo.
    // (si quieres que q también aplique cuando user=me, dímelo y lo ajusto)
    $qPersonIds = findPersonIdsByPersonCode($config, $q, $debug ? $debugCalls : null);

    // si no encontró nadie, regresamos vacío rápido
    if (count($qPersonIds) === 0) {
      echo json_encode([
        "ok" => true,
        "fecha" => $fecha,
        "tipo" => $tipo,
        "eventTypes" => array_map('intval', $eventTypes),
        "count" => 0,
        "list" => [],
        "note" => "Sin coincidencias por personCode"
      ], JSON_UNESCAPED_UNICODE);
      exit;
    }
  }

  // limit default
  if ($limit <= 0) {
    $limit = ($tipo === 'todos') ? 5 : 50;
  }
  // cap razonable
  if ($limit > 200) $limit = 200;

  // juntar resultados de múltiples eventTypes
  $all = [];

  // cache de personCode por personId
  $personCodeCache = [];

  foreach ($eventTypes as $et) {
    $payload = $payloadBase;
    $payload["eventType"] = (int)$et;

    // si viene q (personCode) y tenemos personIds: pedimos por cada personId (reduce resultados)
    if (count($qPersonIds) > 0) {
      // Para no hacer 50 llamadas, limitamos a 10 personIds por búsqueda
      $maxIds = 5;
      $ids = array_slice($qPersonIds, 0, $maxIds);

      foreach ($ids as $pid) {
        $payload["personId"] = (string)$pid;

        $hc = null; $raw = null;
        $json = hikPost($config, $urlServiceEvents, $payload, $hc, $raw);

        if ($debug) {
          $debugCalls[] = [
            "service" => "door/events",
            "eventType" => (int)$et,
            "requestBody" => $payload,
            "httpCode" => $hc,
            "rawResponse" => $raw
          ];
        }

        $list = $json['data']['list'] ?? [];
        if (!is_array($list)) $list = [];

        foreach ($list as $x) {
          $pid2 = (string)($x["personId"] ?? "");
          $pcode = (string)($x["personCode"] ?? ""); // si existiera directo
          if ($pcode === '' && $pid2 !== '') {
            $pcode = resolvePersonCodeByPersonId($config, $pid2, $personCodeCache, $debug ? $debugCalls : null);
          }

          $all[] = [
            "personId"   => $pid2,
            "personCode" => $pcode,
            "personName" => $x["personName"] ?? "",
            "eventTime"  => $x["eventTime"]  ?? ($x["deviceTime"] ?? ""),
            "picUri"     => $x["picUri"]     ?? "",
            "eventType"  => (int)$et,
            "eventKey"   => $eventTypeToKey((int)$et),
          ];
        }
      }
    } else {
      // normal (sin q)
      $hc = null; $raw = null;
      $json = hikPost($config, $urlServiceEvents, $payload, $hc, $raw);

      if ($debug) {
        $debugCalls[] = [
          "service" => "door/events",
          "eventType" => (int)$et,
          "requestBody" => $payload,
          "httpCode" => $hc,
          "rawResponse" => $raw
        ];
      }

      $list = $json['data']['list'] ?? [];
      if (!is_array($list)) $list = [];

      foreach ($list as $x) {
        $pid2 = (string)($x["personId"] ?? "");
        $pcode = (string)($x["personCode"] ?? ""); // si existiera directo
        if ($pcode === '' && $pid2 !== '') {
          $pcode = resolvePersonCodeByPersonId($config, $pid2, $personCodeCache, $debug ? $debugCalls : null);
        }

        $all[] = [
          "personId"   => $pid2,
          "personCode" => $pcode,
          "personName" => $x["personName"] ?? "",
          "eventTime"  => $x["eventTime"]  ?? ($x["deviceTime"] ?? ""),
          "picUri"     => $x["picUri"]     ?? "",
          "eventType"  => (int)$et,
          "eventKey"   => $eventTypeToKey((int)$et),
        ];
      }
    }
  }

  // ordenar por eventTime desc
  usort($all, function($a, $b) {
    return strcmp($b['eventTime'] ?? '', $a['eventTime'] ?? '');
  });

  // aplicar limit final
  if ($limit > 0 && count($all) > $limit) {
    $all = array_slice($all, 0, $limit);
  }

  $out = [
    "ok" => true,
    "fecha" => $fecha,
    "tipo" => $tipo,
    "eventTypes" => array_map('intval', $eventTypes),
    "startTime" => $startTime,
    "endTime" => $endTime,
    "q" => $q,
    "count" => count($all),
    "list" => $all
  ];

  if ($debug) {
    $out["debug"] = [
      "personIdFilter" => $personIdFilter,
      "qPersonIds" => $qPersonIds,
      "calls" => $debugCalls
    ];
  }

  echo json_encode($out, JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
