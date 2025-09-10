<?php
// SOLO base local
require_once __DIR__ . '/conexion.php';
header('Content-Type: application/json');

$hoy = date('Y-m-d');

// 1) Leer la licencia local
$sql = "SELECT suscripcion_id, codigo, fecha_fin 
        FROM suscripcion_local 
        WHERE id = 1 
        LIMIT 1";
$r = $conexion->query($sql);

if (!$r || $r->num_rows === 0) {
  echo json_encode([
    "valida" => false,
    "error"  => "No hay licencia local. Da clic en 'Agregar licencia'."
  ]);
  exit;
}

$row = $r->fetch_assoc();

// 2) Validar fecha
if (!empty($row['codigo']) && !empty($row['suscripcion_id']) && $row['fecha_fin'] >= $hoy) {
  echo json_encode([
    "valida"     => true,
    "codigo"     => $row['codigo'],
    "fecha_fin"  => $row['fecha_fin'],
    "fuente"     => "local"
  ]);
} else {
  echo json_encode([
    "valida" => false,
    "error"  => "Licencia expirada o incompleta. Agrega o renueva la licencia."
  ]);
}
