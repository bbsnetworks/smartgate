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

if (!$isTodos) {
  $stmt = $conexion->prepare("
    SELECT c.nombre, c.apellido, p.monto, p.descuento, p.metodo_pago, p.fecha_pago, p.cliente_id
    FROM pagos p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    WHERE p.usuario_id = ? AND DATE(p.fecha_pago) BETWEEN ? AND ?
  ");
  $stmt->bind_param("iss", $usuario, $inicio, $fin);
} else {
  $stmt = $conexion->prepare("
    SELECT c.nombre, c.apellido, p.monto, p.descuento, p.metodo_pago, p.fecha_pago, p.cliente_id
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

  // IMPORTANTÍSIMO: suma por método usando monto - descuento (como tu reporte general)
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
   PAGOS DE PRODUCTOS
========================= */
$ventasAgrupadas = [];

if (!$isTodos) {
  $stmt2 = $conexion->prepare("
    SELECT pp.venta_id, pp.fecha_pago, u.nombre AS usuario, prod.nombre AS producto,
           pp.cantidad, pp.metodo_pago, pp.total
    FROM pagos_productos pp
    LEFT JOIN productos prod ON pp.producto_id = prod.id
    LEFT JOIN usuarios u ON pp.usuario_id = u.id
    WHERE pp.usuario_id = ? AND DATE(pp.fecha_pago) BETWEEN ? AND ?
    ORDER BY pp.venta_id, pp.fecha_pago
  ");
  $stmt2->bind_param("iss", $usuario, $inicio, $fin);
} else {
  $stmt2 = $conexion->prepare("
    SELECT pp.venta_id, pp.fecha_pago, u.nombre AS usuario, prod.nombre AS producto,
           pp.cantidad, pp.metodo_pago, pp.total
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
    "cantidad" => intval($row["cantidad"]),
    "total" => floatval($row["total"])
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
    SELECT cm.id, cm.tipo, cm.monto,
           DATE_FORMAT(cm.fecha,'%Y-%m-%d %H:%i:%s') AS fecha,
           cm.concepto, cm.observaciones, cm.usuario_id,
           u.nombre AS usuario
    FROM caja_movimientos cm
    LEFT JOIN usuarios u ON cm.usuario_id = u.id
    WHERE cm.usuario_id = ? AND DATE(cm.fecha) BETWEEN ? AND ?
    ORDER BY cm.fecha ASC
  ");
  $st3->bind_param("iss", $usuario, $inicio, $fin);
} else {
  $st3 = $conexion->prepare("
    SELECT cm.id, cm.tipo, cm.monto,
           DATE_FORMAT(cm.fecha,'%Y-%m-%d %H:%i:%s') AS fecha,
           cm.concepto, cm.observaciones, cm.usuario_id,
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

  if ($tipoMov === 'INGRESO') $caja_ingresos += $montoMov;
  if ($tipoMov === 'EGRESO')  $caja_egresos  += $montoMov;

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

  "total_efectivo" => $total_efectivo,
  "total_tarjeta" => $total_tarjeta,
  "total_transferencia" => $total_transferencia,

  "movimientos_caja" => $movimientos_caja,
  "caja_ingresos" => $caja_ingresos,
  "caja_egresos" => $caja_egresos,
  "caja_neto" => $caja_neto
]);

exit;