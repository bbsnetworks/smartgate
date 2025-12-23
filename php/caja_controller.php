<?php
// php/caja_controller.php
require_once __DIR__ . '/verificar_sesion.php';
require_once __DIR__ . '/conexion.php';
header('Content-Type: application/json; charset=utf-8');

$uidSes = (int)($_SESSION['usuario']['id'] ?? 0);
$rolSes = $_SESSION['usuario']['rol'] ?? 'worker';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

function sanitizeInt($v){ return max(0, (int)$v); }
function isAdminLike($rol){ return in_array($rol, ['admin','root'], true); }

// Resolver el usuario objetivo (me / all / id)
function resolveTargetUid($rolSes, $uidSes, $raw) {
  if ($raw === 'me' || $raw === '' || $raw === null) return $uidSes;
  if ($raw === 'all') return null; // no aplica a caja (agregado), devolvemos null para anular
  $id = (int)$raw;
  if ($id <= 0) return $uidSes;
  // Si es worker, forzar su propio id
  if (!isAdminLike($rolSes)) return $uidSes;
  return $id;
}

if ($method === 'GET' && $action === 'get') {
  $userParam = $_GET['user'] ?? 'me';
  $targetUid = resolveTargetUid($rolSes, $uidSes, $userParam);

  // Fecha objetivo: si viene ?date=YYYY-MM-DD úsala, si no usa HOY
  date_default_timezone_set('America/Mexico_City');
  $targetDate = $_GET['date'] ?? date('Y-m-d'); // YYYY-MM-DD

  if ($targetUid === null) {
    echo json_encode(['ok'=>true, 'allowEdit'=>false, 'reason'=>'Modo "all"', 'data'=>null]);
    exit;
  }

  $stmt = $conexion->prepare("SELECT monto, fecha_actualizacion FROM caja WHERE usuario_id = ? LIMIT 1");
  $stmt->bind_param("i", $targetUid);
  $stmt->execute();
  $res = $stmt->get_result();
  $row = $res->fetch_assoc();

  $allowEdit = isAdminLike($rolSes) || ($targetUid === $uidSes);

  // Si no hay registro → 0
  if (!$row) {
    echo json_encode([
      'ok'=>true,
      'allowEdit'=>$allowEdit,
      'data'=>[
        'usuario_id'=>$targetUid,
        'monto'=>0.00,
        'fecha_actualizacion'=>null,
        'stale'=>true,
        'targetDate'=>$targetDate
      ]
    ]);
    exit;
  }

  // 🔥 Si existe pero NO es del día objetivo → 0
  $fechaRow = $row['fecha_actualizacion'];           // DATETIME
  $fechaRowDia = $fechaRow ? substr($fechaRow, 0, 10) : null; // YYYY-MM-DD

  if (!$fechaRowDia || $fechaRowDia !== $targetDate) {
    echo json_encode([
      'ok'=>true,
      'allowEdit'=>$allowEdit,
      'data'=>[
        'usuario_id'=>$targetUid,
        'monto'=>0.00,
        'fecha_actualizacion'=>$fechaRow,
        'stale'=>true,            // indica que había monto pero era de otro día
        'targetDate'=>$targetDate
      ]
    ]);
    exit;
  }

  // ✅ Es del día objetivo → regresa el monto real
  echo json_encode([
    'ok'=>true,
    'allowEdit'=>$allowEdit,
    'data'=>[
      'usuario_id'=>$targetUid,
      'monto'=>(float)$row['monto'],
      'fecha_actualizacion'=>$fechaRow,
      'stale'=>false,
      'targetDate'=>$targetDate
    ]
  ]);
  exit;
}


if ($method === 'POST' && $action === 'save') {
  // JSON o x-www-form-urlencoded
  $payload = $_POST;
  if (empty($payload)) {
    $raw = file_get_contents('php://input');
    if ($raw) $payload = json_decode($raw, true) ?: [];
  }

  $userParam = $payload['user'] ?? 'me';
  $targetUid = resolveTargetUid($rolSes, $uidSes, $userParam);

  if ($targetUid === null) {
    echo json_encode(['ok'=>false,'error'=>'No puedes guardar en modo "all"']);
    exit;
  }
  // Permisos
  if (!isAdminLike($rolSes) && $targetUid !== $uidSes) {
    echo json_encode(['ok'=>false,'error'=>'Permiso denegado']);
    exit;
  }

  $monto = isset($payload['monto']) ? (float)$payload['monto'] : null;
  if ($monto === null || $monto < 0) {
    echo json_encode(['ok'=>false,'error'=>'Monto inválido']);
    exit;
  }

  // UPSERT
  $stmt = $conexion->prepare("
    INSERT INTO caja (usuario_id, monto, fecha_actualizacion)
    VALUES (?, ?, NOW())
    ON DUPLICATE KEY UPDATE monto = VALUES(monto), fecha_actualizacion = NOW()
  ");
  $stmt->bind_param("id", $targetUid, $monto);
  $ok = $stmt->execute();

  if ($ok) {
    echo json_encode(['ok'=>true, 'msg'=>'Caja actualizada', 'data'=>['usuario_id'=>$targetUid, 'monto'=>$monto]]);
  } else {
    echo json_encode(['ok'=>false, 'error'=>'No se pudo guardar']);
  }
  exit;
}

http_response_code(400);
echo json_encode(['ok'=>false,'error'=>'Petición inválida']);
