<?php
require 'conexion.php';

header('Content-Type: application/json');

$usuario = $_GET['usuario'] ?? null;
$tipo = $_GET['tipo'] ?? null;
$fecha = $_GET['fecha'] ?? null;
$inicio = $_GET['inicio'] ?? null;
$fin = $_GET['fin'] ?? null;

if (!$usuario || !$tipo) {
  echo json_encode(["success" => false, "error" => "Faltan parámetros"]);
  exit;
}

switch ($tipo) {
  case 'dia':
    $inicio = $fecha;
    $fin = $fecha;
    break;
  case 'mes':
    $inicio = date("Y-m-01", strtotime($fecha));
    $fin = date("Y-m-t", strtotime($fecha));
    break;
  case 'anio':
    $inicio = "$fecha-01-01";
    $fin = "$fecha-12-31";
    break;
  case 'rango':
    if (!$inicio || !$fin) {
      echo json_encode(["success" => false, "error" => "Faltan fechas para el rango"]);
      exit;
    }
    break;
  default:
    echo json_encode(["success" => false, "error" => "Tipo de búsqueda no válido"]);
    exit;
}

try {
  // Pagos de suscripciones
  if ($usuario !== "todos") {
  $stmt = $conexion->prepare("SELECT SUM(monto - IFNULL(descuento, 0)) as total, COUNT(*) as cantidad FROM pagos WHERE usuario_id = ? AND DATE(fecha_pago) BETWEEN ? AND ?");
  $stmt->bind_param("iss", $usuario, $inicio, $fin);
} else {
  $stmt = $conexion->prepare("SELECT SUM(monto - IFNULL(descuento, 0)) as total, COUNT(*) as cantidad FROM pagos WHERE DATE(fecha_pago) BETWEEN ? AND ?");
  $stmt->bind_param("ss", $inicio, $fin);
}
  $stmt->execute();
  $stmt->bind_result($total_pagos, $cantidad_pagos);
  $stmt->fetch();
  $stmt->close();

  // Pagos de productos
  if ($usuario !== "todos") {
  $stmt2 = $conexion->prepare("SELECT SUM(total) as total, COUNT(DISTINCT venta_id) as cantidad FROM pagos_productos WHERE usuario_id = ? AND DATE(fecha_pago) BETWEEN ? AND ?");
  $stmt2->bind_param("iss", $usuario, $inicio, $fin);
} else {
  $stmt2 = $conexion->prepare("SELECT SUM(total) as total, COUNT(DISTINCT venta_id) as cantidad FROM pagos_productos WHERE DATE(fecha_pago) BETWEEN ? AND ?");
  $stmt2->bind_param("ss", $inicio, $fin);
}

  $stmt2->execute();
  $stmt2->bind_result($total_productos, $cantidad_productos);
  $stmt2->fetch();
  $stmt2->close();


    // Movimientos de caja (ingresos/egresos)
  if ($usuario !== "todos") {
    $stmt3 = $conexion->prepare("
      SELECT 
        COALESCE(SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE 0 END),0) AS ingresos,
        COALESCE(SUM(CASE WHEN tipo='EGRESO' THEN monto ELSE 0 END),0) AS egresos,
        COUNT(*) AS cantidad
      FROM caja_movimientos
      WHERE usuario_id = ?
        AND DATE(fecha) BETWEEN ? AND ?
    ");
    $stmt3->bind_param("iss", $usuario, $inicio, $fin);
  } else {
    $stmt3 = $conexion->prepare("
      SELECT 
        COALESCE(SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE 0 END),0) AS ingresos,
        COALESCE(SUM(CASE WHEN tipo='EGRESO' THEN monto ELSE 0 END),0) AS egresos,
        COUNT(*) AS cantidad
      FROM caja_movimientos
      WHERE DATE(fecha) BETWEEN ? AND ?
    ");
    $stmt3->bind_param("ss", $inicio, $fin);
  }

  $stmt3->execute();
  $stmt3->bind_result($caja_ingresos, $caja_egresos, $caja_cantidad);
  $stmt3->fetch();
  $stmt3->close();

  echo json_encode([
    "success" => true,
    "total_pagos" => $total_pagos ?? 0,
    "cantidad_pagos" => $cantidad_pagos ?? 0,
    "total_productos" => $total_productos ?? 0,
    "cantidad_productos" => $cantidad_productos ?? 0,
    "total_general" => ($total_pagos ?? 0) + ($total_productos ?? 0),
    "caja_ingresos" => $caja_ingresos ?? 0,
    "caja_egresos" => $caja_egresos ?? 0,
    "caja_cantidad" => $caja_cantidad ?? 0,

  ]);
} catch (Exception $e) {
  echo json_encode(["success" => false, "error" => "Error al consultar: " . $e->getMessage()]);
}

