<?php
session_start();
define('BASE_PATH', '/openapi');

include_once __DIR__.'/conexion.php'; // <— LOCAL, no la remota

// 1) Validar sesión del usuario
if (
  !isset($_SESSION['usuario'])
  || !isset($_SESSION['usuario']['id'])
  || !isset($_SESSION['usuario']['rol'])
) {
  header("Location: " . BASE_PATH . "/vistas/login.php");
  exit();
}

// 2) Verificar licencia SOLO en tabla local
$fechaHoy = date('Y-m-d');
$licenciaValida = false;

$res = $conexion->query("SELECT suscripcion_id, codigo, fecha_fin FROM suscripcion_local WHERE id=1 LIMIT 1");
if ($res && $res->num_rows > 0) {
  $row = $res->fetch_assoc();
  if (!empty($row['suscripcion_id']) && !empty($row['codigo']) && $row['fecha_fin'] >= $fechaHoy) {
    $licenciaValida = true;
  }
}

// 3) Si no hay licencia válida, redirigir (excepto si ya estás en index.php con ?bloqueado=1)
if (!$licenciaValida) {
  $uri = $_SERVER['REQUEST_URI'];
  if (strpos($uri, 'index.php?bloqueado=1') === false) {
    header("Location: " . BASE_PATH . "/index.php?bloqueado=1");
    exit();
  }
}
