<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

require_once 'conexion.php';
require_once 'Encrypter.php';
require_once 'Visitor.php'; // aquí está api_cfg()

// -----------------------------
// Helpers Hik (misma firma que add_user.php)
// -----------------------------
function hik_post($config, string $urlService, array $payload): array
{
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

  $data = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $fullUrl);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
  curl_setopt($ch, CURLOPT_TIMEOUT, 10);

  // Igual que tu add_user.php (solo desactiva SSL si NO es https)
  if (stripos($fullUrl, 'https://') !== 0) {
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
  }

  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlErr = curl_error($ch);
  curl_close($ch);

  if ($response === false) {
    throw new Exception("Error cURL: " . $curlErr);
  }

  if ($httpCode != 200) {
    throw new Exception("Error API HTTP $httpCode - Respuesta: " . $response);
  }

  $json = json_decode($response, true);
  if (!is_array($json)) {
    throw new Exception("Respuesta no JSON: " . substr($response, 0, 200));
  }
  return $json;
}

// -----------------------------
// OPTIONS preflight
// -----------------------------
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

// -----------------------------
// Config desde DB
// -----------------------------
$config = api_cfg();
if (!$config) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Falta configuración de API. Ve a Dashboard → Configurar API HikCentral."]);
  exit;
}

// -----------------------------
// Input
// -----------------------------
$in = json_decode(file_get_contents("php://input"), true) ?: [];
$personCode = trim($in["personCode"] ?? "");
$faceData   = trim($in["faceData"] ?? "");

if ($personCode === "" || $faceData === "") {
  echo json_encode(["ok" => false, "error" => "Faltan parámetros (personCode/faceData)."]);
  exit;
}

try {
  // 1) Resolver personId
  $info = hik_post($config, "/artemis/api/resource/v1/person/personCode/personInfo", [
    "personCode" => $personCode
  ]);

  if ((string)($info["code"] ?? "") !== "0") {
    echo json_encode([
      "ok" => false,
      "error" => "No se pudo obtener personId.",
      "msg" => $info["msg"] ?? "",
      "resp" => $info
    ]);
    exit;
  }

  $personId = $info["data"]["personId"] ?? null;
  if ($personId === null || $personId === "") {
    echo json_encode(["ok" => false, "error" => "personId vacío en la respuesta de personInfo."]);
    exit;
  }

  // 2) Actualizar foto en HikCentral
  $upd = hik_post($config, "/artemis/api/resource/v1/person/face/update", [
    "personId" => (string)$personId,
    "faceData" => $faceData
  ]);

  if ((string)($upd["code"] ?? "") !== "0") {
    echo json_encode([
      "ok" => false,
      "error" => "No se pudo actualizar la foto en HikCentral.",
      "msg" => $upd["msg"] ?? "",
      "resp" => $upd
    ]);
    exit;
  }

  // 3) Actualizar BD (clientes.face) y opcionalmente data = personId
  // Nota: en tu BD face es LONGBLOB, pero tú guardas base64; funciona si tu flujo actual ya consume base64 desde DB.
  $personIdInt = (int)$personId;

  $stmt = $conexion->prepare("UPDATE clientes SET face = ?, data = ? WHERE personCode = ? LIMIT 1");
  if (!$stmt) {
    throw new Exception("Error SQL prepare: " . $conexion->error);
  }

  $stmt->bind_param("sis", $faceData, $personIdInt, $personCode);
  $stmt->execute();

  if ($stmt->affected_rows <= 0) {
    // No encontró personCode en BD (o ya era igual)
    // Si quieres permitir "0 rows" como ok, quita este bloque.
    echo json_encode([
      "ok" => false,
      "error" => "No se encontró el cliente en BD por personCode (o no hubo cambios)."
    ]);
    $stmt->close();
    exit;
  }

  $stmt->close();

  echo json_encode([
    "ok" => true,
    "msg" => "Foto actualizada en HikCentral y BD.",
    "personId" => $personIdInt
  ]);
} catch (Exception $e) {
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}
