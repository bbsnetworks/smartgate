<?php
require_once 'Visitor.php';
require_once 'conexion.php';
session_start();
header('Content-Type: application/json');

if (!in_array($_SESSION['usuario']['rol'] ?? '', ['admin','root'])) {
  http_response_code(403);
  echo json_encode(["success"=>false,"error"=>"No autorizado"]);
  exit;
}

$config = (object)[
  "userKey" => "21660945",
  "userSecret" => "93iLwvnQkXAvlHw8wbQz",
  "urlHikCentralAPI" => "http://127.0.0.1:9016"
];

$puerta = $_POST['puerta'] ?? 'principal';
$start  = isset($_POST['start']) ? (int)$_POST['start'] : 1;
$end    = isset($_POST['end'])   ? (int)$_POST['end']   : 40;

// endpoint
$urlService = "/artemis/api/acs/v1/door/doControl";
$fullUrl = $config->urlHikCentralAPI . $urlService;
$contentToSign = "POST\n*/*\napplication/json\nx-ca-key:{$config->userKey}\n{$urlService}";
$signature = Encrypter::HikvisionSignature($config->userSecret, $contentToSign);

$headers = [
  "x-ca-key: {$config->userKey}",
  "x-ca-signature-headers: x-ca-key",
  "x-ca-signature: {$signature}",
  "Content-Type: application/json",
  "Accept: */*"
];

$encontrados = [];
for ($i = $start; $i <= $end; $i++) {
  $door = (string)$i;

  $payload = json_encode([
    "doorIndexCodes" => [$door],
    "controlType"    => 0
  ]);

  $ch = curl_init();
  curl_setopt_array($ch, [
    CURLOPT_URL => $fullUrl,
    CURLOPT_RETURNTRANSFER => 1,
    CURLOPT_TIMEOUT => 6,
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

  if ($err || $httpCode !== 200) {
    continue; // seguimos con el siguiente
  }

  $decoded = json_decode($response, true);
  $code = $decoded['code'] ?? null;
  $cr   = $decoded['data']['controlResultCode'] ?? null;
  $dIdx = $decoded['data']['doorIndexCode'] ?? null;

  // éxito real: code="0" y controlResultCode=0
  if ($code === "0" && $cr === 0 && $dIdx !== null) {
    $encontrados[] = (string)$dIdx;

    // inserta (o reactiva) en BD
    $stmt = $conexion->prepare("
      INSERT INTO puertas_codigos_validos (puerta, doorIndexCode, fuente, activo)
      VALUES (?, ?, 'descubierto', 1)
      ON DUPLICATE KEY UPDATE activo=VALUES(activo), fuente=VALUES(fuente)
    ");
    $stmt->bind_param("ss", $puerta, $dIdx);
    $stmt->execute();
    $stmt->close();
  }
}

// Si quieres, opcional: limitar a los 2 consecutivos más bajos
// Ordena y deja solo dos (esto es opcional; comenta si no quieres limitar)
sort($encontrados, SORT_NATURAL);
if (count($encontrados) > 2) {
  // Desactiva todos y activa solo los dos primeros
  $upd = $conexion->prepare("UPDATE puertas_codigos_validos SET activo=0 WHERE puerta=?");
  $upd->bind_param("s", $puerta);
  $upd->execute();
  $upd->close();

  $toKeep = array_slice($encontrados, 0, 2);
  foreach ($toKeep as $keep) {
    $stmt = $conexion->prepare("
      INSERT INTO puertas_codigos_validos (puerta, doorIndexCode, fuente, activo)
      VALUES (?, ?, 'descubierto', 1)
      ON DUPLICATE KEY UPDATE activo=1
    ");
    $stmt->bind_param("ss", $puerta, $keep);
    $stmt->execute();
    $stmt->close();
  }
  $encontrados = $toKeep;
}

echo json_encode([
  "success" => true,
  "puerta"  => $puerta,
  "codes"   => $encontrados
]);
