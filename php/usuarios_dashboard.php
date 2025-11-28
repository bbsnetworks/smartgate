<?php
require_once './verificar_sesion.php';
require_once './conexion.php';
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);

$uid = (int)($_SESSION['usuario']['id'] ?? 0);     // <-- id (no iduser)
$rol = $_SESSION['usuario']['rol'] ?? 'worker';

$out = ['rol'=>$rol, 'uid'=>$uid, 'opciones'=>[]];

if ($rol === 'worker') {
  $nombre = $_SESSION['usuario']['nombre'] ?? 'Mi usuario';
  $out['opciones'][] = ['value'=>'me', 'text'=>$nombre];
  echo json_encode($out, JSON_UNESCAPED_UNICODE);
  exit;
}

// Admin/Root
$out['opciones'][] = ['value'=>'all', 'text'=>'Todos los usuarios'];

// Tu tabla 'usuarios' tiene PK 'id'
$sql = "SELECT id AS iduser, nombre 
        FROM usuarios 
        WHERE rol IN ('admin', 'worker')
        ORDER BY nombre ASC";

$q = $conexion->query($sql);
if (!$q) {
  http_response_code(500);
  echo json_encode(['error'=>'DB_QUERY_FAILED','msg'=>$conexion->error,'sql'=>$sql]);
  exit;
}
while ($r = $q->fetch_assoc()) {
  $out['opciones'][] = ['value'=>(string)$r['iduser'], 'text'=>$r['nombre']];
}
echo json_encode($out, JSON_UNESCAPED_UNICODE);
