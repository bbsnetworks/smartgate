<?php
// php/api_config_controller.php
require_once __DIR__ . '/verificar_sesion.php';
require_once __DIR__ . '/conexion.php';
header('Content-Type: application/json; charset=utf-8');

$rol = $_SESSION['usuario']['rol'] ?? 'worker';
if (!in_array($rol, ['admin','root'])) {
  echo json_encode(['ok' => false, 'msg' => 'Permisos insuficientes.']);
  exit;
}

$action = $_GET['action'] ?? '';
$idFixed = 1;

if ($action === 'obtener') {
  $sql = "SELECT id, userKey, userSecret, urlHikCentralAPI, updated_at FROM api_config WHERE id=?";
  $stmt = $conexion->prepare($sql);
  $stmt->bind_param('i', $idFixed);
  if (!$stmt->execute()) { echo json_encode(['ok'=>false,'msg'=>'Error al consultar']); exit; }
  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  echo json_encode(['ok'=>true,'data'=>$row ?: null]); exit;
}

if ($action === 'guardar') {
  $json = json_decode(file_get_contents('php://input'), true) ?: [];
  $userKey = trim($json['userKey'] ?? '');
  $userSecret = trim($json['userSecret'] ?? '');
  $url = trim($json['urlHikCentralAPI'] ?? '');

  if ($userKey === '' || $userSecret === '' || $url === '') {
    echo json_encode(['ok'=>false,'msg'=>'Campos requeridos vacíos']); exit;
  }
  if (!preg_match('#^https?://#i', $url)) {
    echo json_encode(['ok'=>false,'msg'=>'URL inválida']); exit;
  }

  $sql = "INSERT INTO api_config (id, userKey, userSecret, urlHikCentralAPI)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE userKey=VALUES(userKey),
                                  userSecret=VALUES(userSecret),
                                  urlHikCentralAPI=VALUES(urlHikCentralAPI),
                                  updated_at=CURRENT_TIMESTAMP";
  $stmt = $conexion->prepare($sql);
  $stmt->bind_param('isss', $idFixed, $userKey, $userSecret, $url);
  if (!$stmt->execute()) { echo json_encode(['ok'=>false,'msg'=>'No se pudo guardar']); exit; }

  echo json_encode(['ok'=>true]); exit;
}

if ($action === 'eliminar') {
  $sql = "DELETE FROM api_config WHERE id=?";
  $stmt = $conexion->prepare($sql);
  $stmt->bind_param('i', $idFixed);
  if (!$stmt->execute()) { echo json_encode(['ok'=>false,'msg'=>'No se pudo eliminar']); exit; }
  echo json_encode(['ok'=>true]); exit;
}

echo json_encode(['ok'=>false,'msg'=>'Acción no válida']);
