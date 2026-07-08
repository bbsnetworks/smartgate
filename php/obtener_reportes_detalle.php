<?php
require 'conexion.php';
header('Content-Type: application/json');

$usuario = $_GET['usuario'] ?? null;
$tipo    = $_GET['tipo'] ?? null;
$fecha   = $_GET['fecha'] ?? null;
$inicio  = $_GET['inicio'] ?? null;
$fin     = $_GET['fin'] ?? null;

if (!$usuario || !$tipo) {
  echo json_encode(["success" => false, "error" => "Faltan parámetros"]);
  exit;
}

switch ($tipo) {
  case 'dia':
    $inicio = $fecha;
    $fin    = $fecha;
    break;

  case 'mes':
    $inicio = date("Y-m-01", strtotime($fecha));
    $fin    = date("Y-m-t", strtotime($fecha));
    break;

  case 'anio':
    $inicio = "$fecha-01-01";
    $fin    = "$fecha-12-31";
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

$isTodos = ($usuario === "todos");

/* =========================
   PAGOS DE SUSCRIPCIÓN
========================= */
$pagos = [];

$total_efectivo = 0;
$total_tarjeta = 0;
$total_transferencia = 0;

/* =========================
   VARIABLES PAGOS FINANCIADOS
========================= */
$pagos_financiados = [];
$total_financiados = 0;

$financiados_por_metodo = [
  "efectivo" => 0,
  "tarjeta" => 0,
  "transferencia" => 0,
  "otro" => 0
];

if (!$isTodos) {
  $stmt = $conexion->prepare("
    SELECT 
      c.nombre, 
      c.apellido, 
      p.monto, 
      p.descuento, 
      p.metodo_pago, 
      p.fecha_pago, 
      p.cliente_id
    FROM pagos p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    WHERE p.usuario_id = ? 
      AND DATE(p.fecha_pago) BETWEEN ? AND ?
  ");
  $stmt->bind_param("iss", $usuario, $inicio, $fin);
} else {
  $stmt = $conexion->prepare("
    SELECT 
      c.nombre, 
      c.apellido, 
      p.monto, 
      p.descuento, 
      p.metodo_pago, 
      p.fecha_pago, 
      p.cliente_id
    FROM pagos p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    WHERE DATE(p.fecha_pago) BETWEEN ? AND ?
  ");
  $stmt->bind_param("ss", $inicio, $fin);
}

$stmt->execute();
$res = $stmt->get_result();

while ($row = $res->fetch_assoc()) {
  $nombreCliente = ($row['nombre'] ?? null)
    ? $row['nombre'] . ' ' . ($row['apellido'] ?? '')
    : "Cliente eliminado (ID: {$row['cliente_id']})";

  $monto = (float)($row['monto'] ?? 0);
  $descuento = (float)($row['descuento'] ?? 0);
  $montoFinal = $monto - $descuento;

  $pagos[] = [
    "nombre" => trim($nombreCliente),
    "monto" => $monto,
    "descuento" => $descuento,
    "metodo" => $row['metodo_pago'],
    "fecha" => date("Y-m-d", strtotime($row['fecha_pago']))
  ];

  switch (strtolower((string)$row['metodo_pago'])) {
    case 'efectivo':
      $total_efectivo += $montoFinal;
      break;

    case 'tarjeta':
      $total_tarjeta += $montoFinal;
      break;

    case 'transferencia':
      $total_transferencia += $montoFinal;
      break;
  }
}

$stmt->close();

/* =========================
   PAGOS FINANCIADOS
========================= */
if (!$isTodos) {
  $stmtF = $conexion->prepare("
    SELECT 
      vfp.id,
      vfp.venta_financiada_id,
      vfp.cuota_id,
      vfp.monto,
      vfp.metodo_pago,
      vfp.fecha_pago,
      vfp.referencia,
      vfp.observaciones,
      vfp.recibido_por,
      u.nombre AS usuario
    FROM ventas_financiadas_pagos vfp
    LEFT JOIN usuarios u ON vfp.recibido_por = u.id
    WHERE vfp.recibido_por = ?
      AND DATE(vfp.fecha_pago) BETWEEN ? AND ?
    ORDER BY vfp.fecha_pago ASC
  ");
  $stmtF->bind_param("iss", $usuario, $inicio, $fin);
} else {
  $stmtF = $conexion->prepare("
    SELECT 
      vfp.id,
      vfp.venta_financiada_id,
      vfp.cuota_id,
      vfp.monto,
      vfp.metodo_pago,
      vfp.fecha_pago,
      vfp.referencia,
      vfp.observaciones,
      vfp.recibido_por,
      u.nombre AS usuario
    FROM ventas_financiadas_pagos vfp
    LEFT JOIN usuarios u ON vfp.recibido_por = u.id
    WHERE DATE(vfp.fecha_pago) BETWEEN ? AND ?
    ORDER BY vfp.fecha_pago ASC
  ");
  $stmtF->bind_param("ss", $inicio, $fin);
}

$stmtF->execute();
$resF = $stmtF->get_result();

while ($row = $resF->fetch_assoc()) {
  $montoFinanciado = (float)($row["monto"] ?? 0);
  $metodoFinanciado = strtolower((string)($row["metodo_pago"] ?? "otro"));

  if ($metodoFinanciado === "") {
    $metodoFinanciado = "otro";
  }

  if (!isset($financiados_por_metodo[$metodoFinanciado])) {
    $financiados_por_metodo[$metodoFinanciado] = 0;
  }

  $total_financiados += $montoFinanciado;
  $financiados_por_metodo[$metodoFinanciado] += $montoFinanciado;

  $pagos_financiados[] = [
    "id" => (int)$row["id"],
    "venta_financiada_id" => (int)$row["venta_financiada_id"],
    "cuota_id" => (int)$row["cuota_id"],
    "monto" => $montoFinanciado,
    "metodo_pago" => $row["metodo_pago"] ?? "otro",
    "metodo" => $row["metodo_pago"] ?? "otro",
    "fecha" => date("Y-m-d", strtotime($row["fecha_pago"])),
    "fecha_pago" => $row["fecha_pago"],
    "referencia" => $row["referencia"] ?? "",
    "observaciones" => $row["observaciones"] ?? "",
    "recibido_por" => (int)$row["recibido_por"],
    "usuario" => $row["usuario"] ?? "Usuario eliminado"
  ];
}

$stmtF->close();

/*
  Se suman los pagos financiados a los totales por método.
  Esto sirve para que el PDF y el corte los contemplen en efectivo, tarjeta y transferencia.
*/
$total_efectivo += $financiados_por_metodo["efectivo"] ?? 0;
$total_tarjeta += $financiados_por_metodo["tarjeta"] ?? 0;
$total_transferencia += $financiados_por_metodo["transferencia"] ?? 0;

/* =========================
   VISITAS producto codigo=1
========================= */
$visitas_cantidad = 0;
$visitas_total = 0;

$visitas_por_metodo = [
  "efectivo" => 0,
  "tarjeta" => 0,
  "transferencia" => 0
];

$visitas_detalle = [];

/* =========================
   PAGOS DE PRODUCTOS
========================= */
$ventasAgrupadas = [];

if (!$isTodos) {
  $stmt2 = $conexion->prepare("
    SELECT 
      pp.venta_id, 
      pp.fecha_pago, 
      u.nombre AS usuario, 
      prod.nombre AS producto,
      prod.codigo AS codigo,
      pp.cantidad, 
      pp.metodo_pago, 
      pp.total
    FROM pagos_productos pp
    LEFT JOIN productos prod ON pp.producto_id = prod.id
    LEFT JOIN usuarios u ON pp.usuario_id = u.id
    WHERE pp.usuario_id = ? 
      AND DATE(pp.fecha_pago) BETWEEN ? AND ?
    ORDER BY pp.venta_id, pp.fecha_pago
  ");
  $stmt2->bind_param("iss", $usuario, $inicio, $fin);
} else {
  $stmt2 = $conexion->prepare("
    SELECT 
      pp.venta_id, 
      pp.fecha_pago, 
      u.nombre AS usuario, 
      prod.nombre AS producto,
      prod.codigo AS codigo,
      pp.cantidad, 
      pp.metodo_pago, 
      pp.total
    FROM pagos_productos pp
    LEFT JOIN productos prod ON pp.producto_id = prod.id
    LEFT JOIN usuarios u ON pp.usuario_id = u.id
    WHERE DATE(pp.fecha_pago) BETWEEN ? AND ?
    ORDER BY pp.venta_id, pp.fecha_pago
  ");
  $stmt2->bind_param("ss", $inicio, $fin);
}

$stmt2->execute();
$res2 = $stmt2->get_result();

while ($row = $res2->fetch_assoc()) {
  $codigo = (string)($row["codigo"] ?? "");
  $metodo = strtolower((string)($row["metodo_pago"] ?? ""));
  $cantidad = intval($row["cantidad"] ?? 0);
  $total = floatval($row["total"] ?? 0);

  /*
    Si es visita codigo=1, se separa y no entra a ventas normales.
  */
  if ($codigo === "1") {
    $visitas_cantidad += $cantidad;
    $visitas_total += $total;

    if (!isset($visitas_por_metodo[$metodo])) {
      $visitas_por_metodo[$metodo] = 0;
    }

    $visitas_por_metodo[$metodo] += $total;

    $visitas_detalle[] = [
      "venta_id" => $row["venta_id"],
      "usuario" => $row["usuario"] ?? "Usuario eliminado",
      "fecha" => date("Y-m-d", strtotime($row["fecha_pago"])),
      "metodo_pago" => $row["metodo_pago"] ?? "Sin especificar",
      "cantidad" => $cantidad,
      "total" => $total
    ];

    continue;
  }

  /*
    Producto normal.
  */
  $venta_id = $row['venta_id'];

  if (!isset($ventasAgrupadas[$venta_id])) {
    $ventasAgrupadas[$venta_id] = [
      "venta_id" => $venta_id,
      "usuario" => $row['usuario'] ?? "Usuario eliminado",
      "fecha" => date("Y-m-d", strtotime($row['fecha_pago'])),
      "metodo_pago" => $row['metodo_pago'] ?? "Sin especificar",
      "productos" => []
    ];
  }

  $ventasAgrupadas[$venta_id]["productos"][] = [
    "nombre" => $row["producto"] ?? "Producto eliminado",
    "cantidad" => $cantidad,
    "total" => $total
  ];
}

$stmt2->close();

/* =========================
   MOVIMIENTOS DE CAJA
========================= */
$movimientos_caja = [];
$caja_ingresos = 0;
$caja_egresos = 0;

if (!$isTodos) {
  $st3 = $conexion->prepare("
    SELECT 
      cm.id, 
      cm.tipo, 
      cm.monto,
      DATE_FORMAT(cm.fecha,'%Y-%m-%d %H:%i:%s') AS fecha,
      cm.concepto, 
      cm.observaciones, 
      cm.usuario_id,
      u.nombre AS usuario
    FROM caja_movimientos cm
    LEFT JOIN usuarios u ON cm.usuario_id = u.id
    WHERE cm.usuario_id = ? 
      AND DATE(cm.fecha) BETWEEN ? AND ?
    ORDER BY cm.fecha ASC
  ");
  $st3->bind_param("iss", $usuario, $inicio, $fin);
} else {
  $st3 = $conexion->prepare("
    SELECT 
      cm.id, 
      cm.tipo, 
      cm.monto,
      DATE_FORMAT(cm.fecha,'%Y-%m-%d %H:%i:%s') AS fecha,
      cm.concepto, 
      cm.observaciones, 
      cm.usuario_id,
      u.nombre AS usuario
    FROM caja_movimientos cm
    LEFT JOIN usuarios u ON cm.usuario_id = u.id
    WHERE DATE(cm.fecha) BETWEEN ? AND ?
    ORDER BY cm.fecha ASC
  ");
  $st3->bind_param("ss", $inicio, $fin);
}

$st3->execute();
$r3 = $st3->get_result();

while ($r3 && ($m = $r3->fetch_assoc())) {
  $tipoMov = strtoupper((string)$m['tipo']);
  $montoMov = (float)($m['monto'] ?? 0);

  if ($tipoMov === 'INGRESO') {
    $caja_ingresos += $montoMov;
  }

  if ($tipoMov === 'EGRESO') {
    $caja_egresos += $montoMov;
  }

  $movimientos_caja[] = [
    "id" => (int)$m["id"],
    "tipo" => $tipoMov,
    "monto" => $montoMov,
    "fecha" => $m["fecha"],
    "concepto" => $m["concepto"],
    "observaciones" => $m["observaciones"],
    "usuario_id" => (int)$m["usuario_id"],
    "usuario" => $m["usuario"] ?? "Usuario eliminado"
  ];
}

$st3->close();

$caja_neto = $caja_ingresos - $caja_egresos;

echo json_encode([
  "success" => true,

  "pagos" => $pagos,
  "ventas" => array_values($ventasAgrupadas),

  "pagos_financiados" => $pagos_financiados,
  "total_financiados" => $total_financiados,
  "cantidad_financiados" => count($pagos_financiados),
  "financiados_por_metodo" => $financiados_por_metodo,

  "visitas_cantidad" => $visitas_cantidad,
  "visitas_total" => $visitas_total,
  "visitas_por_metodo" => $visitas_por_metodo,
  "visitas_detalle" => $visitas_detalle,

  "total_efectivo" => $total_efectivo,
  "total_tarjeta" => $total_tarjeta,
  "total_transferencia" => $total_transferencia,

  "movimientos_caja" => $movimientos_caja,
  "caja_ingresos" => $caja_ingresos,
  "caja_egresos" => $caja_egresos,
  "caja_neto" => $caja_neto
]);

exit;