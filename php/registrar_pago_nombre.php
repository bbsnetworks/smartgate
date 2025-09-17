<?php
require_once 'conexion.php';
require_once 'Visitor.php';
session_start();

date_default_timezone_set("America/Mexico_City");
header("Content-Type: application/json");

// ====== Entrada ======
$in = json_decode(file_get_contents("php://input"), true) ?: [];
$cliente_id       = (int)($in["cliente_id"]   ?? 0);
$nombre           = trim($in["nombre"]        ?? '');       // opcional (solo ticket)
$apellido         = trim($in["apellido"]      ?? '');       // opcional (solo ticket)
$telefono         = trim($in["telefono"]      ?? '');       // opcional (solo ticket)
$fecha_inicio_str = trim($in["fecha_inicio"]  ?? '');
$fecha_fin_str    = trim($in["fecha_fin"]     ?? '');
$monto            = (float)($in["monto"]      ?? 0);
$descuento        = (float)($in["descuento"]  ?? 0);
$metodo           = trim($in["metodo"]        ?? "efectivo");

// ====== Validaciones ======
if ($cliente_id <= 0) {
  echo json_encode(["success" => false, "error" => "Cliente inválido."]); exit;
}
if ($fecha_inicio_str === '' || $fecha_fin_str === '') {
  echo json_encode(["success" => false, "error" => "Faltan fechas."]); exit;
}
$fecha_inicio = DateTime::createFromFormat("Y-m-d", $fecha_inicio_str);
$fecha_fin    = DateTime::createFromFormat("Y-m-d", $fecha_fin_str);
if (!$fecha_inicio || !$fecha_fin || $fecha_fin <= $fecha_inicio) {
  echo json_encode(["success" => false, "error" => "Fechas inválidas o mal ordenadas."]); exit;
}
if ($monto <= 0) {
  echo json_encode(["success" => false, "error" => "El monto debe ser mayor a 0."]); exit;
}
if ($descuento < 0 || $descuento > $monto) {
  echo json_encode(["success" => false, "error" => "El descuento no puede ser negativo ni mayor al monto."]); exit;
}

// Normaliza horas para registrar el pago (no moveremos beginTime en API)
$fecha_inicio->setTime(0, 0, 0);
$fecha_fin->setTime(23, 59, 59);
$beginSQL = $fecha_inicio->format("Y-m-d H:i:s");
$finSQL   = $fecha_fin->format("Y-m-d H:i:s");

// ====== Obtener cliente por ID (única fuente de verdad) ======
$stmt = $conexion->prepare("
  SELECT id, data, personCode, apellido, nombre, genero,
         orgIndexCode, telefono, email, Inicio, Fin, FechaIngreso
  FROM clientes
  WHERE id = ?
  LIMIT 1
");
$stmt->bind_param("i", $cliente_id);
$stmt->execute();
$cliente = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$cliente) {
  echo json_encode(["success" => false, "error" => "Cliente no encontrado."]); exit;
}

// ====== No duplicar meses pagados ======
$stmt = $conexion->prepare("SELECT fecha_aplicada FROM pagos WHERE cliente_id = ?");
$stmt->bind_param("i", $cliente_id);
$stmt->execute();
$res = $stmt->get_result();
$mesesPagados = [];
while ($row = $res->fetch_assoc()) {
  $mesesPagados[substr($row['fecha_aplicada'], 0, 7)] = true; // YYYY-MM
}
$stmt->close();

$periodo = new DatePeriod(
  DateTime::createFromFormat('Y-m-d H:i:s', $beginSQL),
  new DateInterval('P1M'),
  (clone $fecha_fin)->modify('+1 day')
);
foreach ($periodo as $f) {
  $ym = $f->format('Y-m');
  if (isset($mesesPagados[$ym])) {
    echo json_encode(["success" => false, "error" => "Ya existe un pago registrado para el mes de $ym."]); exit;
  }
}

// ====== Calcular nuevo endTime global (no reducir vigencia) ======
$maxFinActual = null;

$stmt = $conexion->prepare("SELECT MAX(fecha_fin) AS max_fin FROM pagos WHERE cliente_id = ?");
$stmt->bind_param("i", $cliente_id);
$stmt->execute();
$maxFinRow = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!empty($maxFinRow['max_fin'])) $maxFinActual = $maxFinRow['max_fin'];
if (!empty($cliente['Fin']) && (strtotime($cliente['Fin']) > strtotime((string)$maxFinActual ?: '1970-01-01'))) {
  $maxFinActual = $cliente['Fin'];
}

$nuevaFinGlobal = $maxFinActual
  ? ((strtotime($finSQL) > strtotime($maxFinActual)) ? $finSQL : $maxFinActual)
  : $finSQL;

// ====== BEGIN FIJO para la API ======
$beginFijo = null;
if (!empty($cliente['Inicio'])) {
  $beginFijo = $cliente['Inicio'];
} elseif (!empty($cliente['FechaIngreso'])) {
  $fi = $cliente['FechaIngreso'];
  if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $fi)) $fi .= ' 00:00:00';
  $beginFijo = $fi;
} else {
  $beginFijo = $beginSQL; // fallback
}

$config = api_cfg();
if (!$config) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "error"   => "Falta configuración de API. Ve a Dashboard → Configurar API HikCentral."
  ]);
  exit;
}

// Guardar valores previos por si hay rollback
$prevInicio = $cliente['Inicio'] ?: $beginFijo;
$prevFin    = $cliente['Fin']    ?: $beginFijo;

// ====== 1) API primero (beginTime fijo, endTime actualizado) ======
try {
  $resp = Visitor::updateUser($config, [
    "personId"         => (string)$cliente["data"],
    "personCode"       => $cliente["personCode"],
    "personFamilyName" => $cliente["apellido"],
    "personGivenName"  => $cliente["nombre"],
    "gender"           => (int)$cliente["genero"],
    "orgIndexCode"     => $cliente["orgIndexCode"],
    "phoneNo"          => $cliente["telefono"],
    "email"            => $cliente["email"],
    "beginTime"        => (new DateTime($beginFijo))->format("Y-m-d\TH:i:sP"),
    "endTime"          => (new DateTime($nuevaFinGlobal))->format("Y-m-d\TH:i:sP")
  ]);
  if (!isset($resp["code"]) || (string)$resp["code"] !== "0") {
  echo json_encode([
    "success" => false,
    "error"   => "Error actualizando en HikCentral",
    "hikcentral_response" => $resp
  ]);
  exit;
}
if (empty($cliente['data'])) {
  echo json_encode(["success" => false, "error" => "El cliente no tiene personId (data) en HikCentral."]);
  exit;
}

} catch (Exception $e) {
  echo json_encode(["success" => false, "error" => "Excepción en HikCentral: " . $e->getMessage()]); exit;
}

// ====== 2) BD (transacción) ======
$conexion->begin_transaction();

try {
  // Insertar pago
  $fecha_pago_now = date("Y-m-d H:i:s");
  $usuario_id = (int)($_SESSION['usuario']['id'] ?? 0);

  $stmt = $conexion->prepare("INSERT INTO pagos
    (cliente_id, usuario_id, fecha_pago, fecha_aplicada, fecha_fin, monto, metodo_pago, descuento)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  $stmt->bind_param(
    "iisssdsd",
    $cliente_id,
    $usuario_id,
    $fecha_pago_now,
    $beginSQL,
    $finSQL,
    $monto,
    $metodo,
    $descuento
  );
  if (!$stmt->execute()) {
    throw new Exception("No se pudo insertar el pago.");
  }
  $stmt->close();

  // Actualizar SOLO Fin (si ya es igual, affected_rows puede ser 0 y NO es error)
  $stmt = $conexion->prepare("UPDATE clientes SET Fin = ? WHERE id = ?");
  $stmt->bind_param("si", $nuevaFinGlobal, $cliente_id);
  if (!$stmt->execute()) {
    throw new Exception("No se pudo actualizar el cliente.");
  }
  $stmt->close();

  $conexion->commit();

  // Opcional: enviar a dispositivos
  try { Visitor::sendUserToDevice($config); } catch (\Throwable $t) {}

  echo json_encode([
    "success" => true,
    "msg" => "Pago registrado.",
    "cliente" => [
      "id"     => $cliente_id,
      "inicio" => $beginFijo,       // beginTime no cambiado
      "fin"    => $nuevaFinGlobal   // endTime actualizado
    ]
  ]);

} catch (Throwable $th) {
  $conexion->rollback();

  // Revertir API a valores previos si la BD falló
  try {
    Visitor::updateUser($config, [
      "personId"         => (string)$cliente["data"],
      "personCode"       => $cliente["personCode"],
      "personFamilyName" => $cliente["apellido"],
      "personGivenName"  => $cliente["nombre"],
      "gender"           => (int)$cliente["genero"],
      "orgIndexCode"     => $cliente["orgIndexCode"],
      "phoneNo"          => $cliente["telefono"],
      "email"            => $cliente["email"],
      "beginTime"        => (new DateTime($prevInicio))->format("Y-m-d\TH:i:sP"),
      "endTime"          => (new DateTime($prevFin))->format("Y-m-d\TH:i:sP")
    ]);
  } catch (\Throwable $e2) {}

  echo json_encode(["success" => false, "error" => "Error en BD: " . $th->getMessage()]);
}
