<?php
// php/actualizar_branding.php
// Actualiza app_name, dashboard_title, dashboard_sub y opcionalmente el logo (BLOB)

require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/verificar_sesion.php'; // si aquí se inicializa la sesión, no hace falta session_start()
if (session_status() === PHP_SESSION_NONE) session_start();

header('Content-Type: application/json; charset=utf-8');

// (Opcional) Autorización básica: solo admin/root
$rol = $_SESSION['usuario']['rol'] ?? null;
if (!in_array($rol, ['admin', 'root'], true)) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'No autorizado']);
  exit;
}

// Sanitiza entradas de texto
$app_name        = trim($_POST['app_name']        ?? '');
$dashboard_title = trim($_POST['dashboard_title'] ?? '');
$dashboard_sub   = trim($_POST['dashboard_sub']   ?? '');

// Control de archivo
$hasFile   = isset($_FILES['logo']) && is_uploaded_file($_FILES['logo']['tmp_name']);
$maxBytes  = 2 * 1024 * 1024; // 2 MB (ajusta si quieres)
$allowed   = ['image/png','image/jpeg','image/webp','image/gif']; // por seguridad, deja fuera SVG
$blob      = null;
$mime      = null;
$etag      = null;

if ($hasFile) {
  $tmp  = $_FILES['logo']['tmp_name'];
  $size = (int) filesize($tmp);
  if ($size <= 0) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'msg'=>'Archivo de imagen inválido']);
    exit;
  }
  if ($size > $maxBytes) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'msg'=>'La imagen supera el límite de 2 MB']);
    exit;
  }

  // Detecta MIME de forma segura
  $finfo = new finfo(FILEINFO_MIME_TYPE);
  $mime  = $finfo->file($tmp);
  if ($mime === false) $mime = mime_content_type($tmp);

  if (!in_array($mime, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'msg'=>'Tipo de imagen no permitido. Usa PNG/JPG/WEBP/GIF.']);
    exit;
  }

  $blob = file_get_contents($tmp);
  if ($blob === false) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'msg'=>'No se pudo leer el archivo']);
    exit;
  }
  $etag = sha1($blob);
}

// Construye SQL dinámico
$updated_by = $_SESSION['usuario']['id'] ?? null; // ajusta al campo real de tu sesión
$params = [];
$types  = '';
$sql = "UPDATE config_branding
           SET updated_by = ?, updated_at = NOW()";

$types .= 'i';
$params[] = $updated_by;

// Solo actualiza campos si vienen con valor (app_name y dashboard_title vacíos se ignoran)
if ($app_name !== '') {
  $sql .= ", app_name = ?";
  $types .= 's';
  $params[] = $app_name;
}
if ($dashboard_title !== '') {
  $sql .= ", dashboard_title = ?";
  $types .= 's';
  $params[] = $dashboard_title;
}
// dashboard_sub sí se permite null / vacío explícito
$sql .= ", dashboard_sub = ?";
$types .= 's';
$params[] = ($dashboard_sub === '') ? null : $dashboard_sub;

// Si hay archivo, actualiza BLOB y metadatos
if ($hasFile) {
  $sql .= ", logo_blob = ?, logo_mime = ?, logo_etag = ?";
  $types .= 'bss';
  $params[] = $blob; // b (blob), se manda aparte abajo
  $params[] = $mime;
  $params[] = $etag;
}

$sql .= " WHERE id = 1";

$stmt = $conexion->prepare($sql);
if (!$stmt) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'msg'=>'Error de preparación SQL: '.$conexion->error]);
  exit;
}

// bind_param con BLOB: hay que usar call_user_func_array
$bindParams = [];
$bindParams[] = &$types;

// Convierte a referencias
for ($i = 0; $i < count($params); $i++) {
  $bindParams[] = &$params[$i];
}

call_user_func_array([$stmt, 'bind_param'], $bindParams);

// Si hay BLOB grande, usa send_long_data
if ($hasFile) {
  // Ubica el índice del blob en $params: es el antepenúltimo cuando hay archivo
  $blobIndex = count($params) - 3; // logo_blob, logo_mime, logo_etag
  // send_long_data requiere índice de parámetro (0-based)
  $stmt->send_long_data($blobIndex, $blob);
}

$ok = $stmt->execute();

if (!$ok) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'msg'=>'Error al actualizar: '.$stmt->error]);
  exit;
}

echo json_encode([
  'ok'   => true,
  'msg'  => 'Configuración actualizada',
  'etag' => $etag,
]);
