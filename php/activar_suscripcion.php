<?php
header('Content-Type: application/json');

// BD LOCAL (XAMPP)
require_once __DIR__ . '/conexion.php';        // <-- LOCAL SIEMPRE
require_once __DIR__ . '/conexion2.php';  // <-- REMOTA OPCIONAL/SEGURA

$input  = json_decode(file_get_contents("php://input"), true);
$id     = isset($input['id']) ? (int)$input['id'] : 0;
$codigo = isset($input['codigo']) ? trim($input['codigo']) : '';

if (!$id || $codigo === '') {
  echo json_encode(["success" => false, "error" => "Faltan campos obligatorios (id y código)."]);
  exit;
}

// Debemos validar contra la remota SOLO al activar
if (!$conexionRemota) {
  echo json_encode(["success" => false, "error" => "No hay conexión con el servidor de licencias. Intenta más tarde."]);
  exit;
}

// 1) Validar que exista y NO esté usada
$stmt = $conexionRemota->prepare("
  SELECT id, codigo, fecha_fin, usada
  FROM pagos_suscripciones
  WHERE id = ? AND codigo = ?
  LIMIT 1
");
$stmt->bind_param("is", $id, $codigo);
$stmt->execute();
$res = $stmt->get_result();

if (!$res || $res->num_rows === 0) {
  $stmt->close();
  echo json_encode(["success" => false, "error" => "Código o ID inválidos."]);
  exit;
}

$row = $res->fetch_assoc();
$stmt->close();

if ((int)$row['usada'] === 1) {
  echo json_encode(["success" => false, "error" => "Esta suscripción ya fue utilizada."]);
  exit;
}

$fechaFin = $row['fecha_fin'];

// 2) Marcar usada=1 en remoto
$up = $conexionRemota->prepare("UPDATE pagos_suscripciones SET usada = 1 WHERE id = ? LIMIT 1");
$up->bind_param("i", $id);
$okRemote = $up->execute();
$up->close();

if (!$okRemote) {
  echo json_encode(["success" => false, "error" => "No se pudo marcar como usada en el servidor de licencias."]);
  exit;
}

// 3) Guardar/actualizar en LOCAL
$ins = $conexion->prepare("
  INSERT INTO suscripcion_local (id, suscripcion_id, codigo, fecha_fin, last_sync, fuente)
  VALUES (1, ?, ?, ?, NOW(), 'remota')
  ON DUPLICATE KEY UPDATE
    suscripcion_id = VALUES(suscripcion_id),
    codigo         = VALUES(codigo),
    fecha_fin      = VALUES(fecha_fin),
    last_sync      = NOW(),
    fuente         = 'remota'
");
$ins->bind_param("iss", $id, $codigo, $fechaFin);
$okLocal = $ins->execute();
$ins->close();

if (!$okLocal) {
  echo json_encode(["success" => false, "error" => "No se pudo guardar la licencia en la base local."]);
  exit;
}

echo json_encode([
  "success"   => true,
  "mensaje"   => "Suscripción activada correctamente.",
  "fecha_fin" => $fechaFin
]);
