<?php
// php/obtener_branding.php
require_once __DIR__ . '/conexion.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$defaults = [
  'app_name'        => 'Gym Admin',
  'dashboard_title' => 'Panel de Control',
  'dashboard_sub'   => null,
  'logo_etag'       => null,
  'logo_mime'       => null,
];

$sql = "SELECT app_name, dashboard_title, dashboard_sub, logo_etag, logo_mime
          FROM config_branding
         WHERE id = 1";
$res = $conexion->query($sql);

if (!$res) {
  http_response_code(500);
  echo json_encode(['ok'=>false, 'msg'=>'Error SQL: '.$conexion->error], JSON_UNESCAPED_UNICODE);
  exit;
}

$row = $res->fetch_assoc();

if (!$row) {
  // Crear registro por defecto si no existe
  $ins = $conexion->query("INSERT INTO config_branding (id, app_name, dashboard_title, dashboard_sub)
                           VALUES (1, 'Gym Admin', 'Panel de Control', NULL)");
  if ($ins) {
    $row = $defaults;
  } else {
    http_response_code(500);
    echo json_encode(['ok'=>false, 'msg'=>'No se pudo inicializar config_branding'], JSON_UNESCAPED_UNICODE);
    exit;
  }
}

echo json_encode($row, JSON_UNESCAPED_UNICODE);
