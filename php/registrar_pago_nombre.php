<?php
require_once 'conexion.php';
require_once 'Visitor.php';

session_start();

date_default_timezone_set("America/Mexico_City");
header("Content-Type: application/json; charset=utf-8");

function responder(array $respuesta, int $codigoHttp = 200): void
{
  http_response_code($codigoHttp);

  echo json_encode(
    $respuesta,
    JSON_UNESCAPED_UNICODE
  );

  exit;
}

// ====== Validar sesión ======
$usuario_id = (int)($_SESSION['usuario']['id'] ?? 0);

if ($usuario_id <= 0) {
  responder([
    "success" => false,
    "error" => "Sesión inválida o expirada."
  ], 401);
}

// ====== Entrada ======
$in = json_decode(file_get_contents("php://input"), true);

if (!is_array($in)) {
  responder([
    "success" => false,
    "error" => "Los datos enviados no son válidos."
  ], 400);
}

$cliente_id       = (int)($in["cliente_id"] ?? 0);
$tarifa_id        = (int)($in["tarifa_id"] ?? 0);

$nombre           = trim((string)($in["nombre"] ?? ''));
$apellido         = trim((string)($in["apellido"] ?? ''));
$telefono         = trim((string)($in["telefono"] ?? ''));

$fecha_inicio_str = trim((string)($in["fecha_inicio"] ?? ''));
$fecha_fin_str    = trim((string)($in["fecha_fin"] ?? ''));

$descuento        = (float)($in["descuento"] ?? 0);
$metodo           = strtolower(trim((string)($in["metodo"] ?? "efectivo")));

// El monto enviado por JS no será tomado como fuente de verdad.
// Se obtendrá directamente desde la tabla tarifas.

// ====== Validaciones básicas ======
if ($cliente_id <= 0) {
  responder([
    "success" => false,
    "error" => "Cliente inválido."
  ], 400);
}

if ($tarifa_id <= 0) {
  responder([
    "success" => false,
    "error" => "Debes seleccionar una tarifa válida."
  ], 400);
}

if ($fecha_inicio_str === '' || $fecha_fin_str === '') {
  responder([
    "success" => false,
    "error" => "Faltan las fechas de inicio o fin."
  ], 400);
}

$metodosPermitidos = [
  "efectivo",
  "transferencia",
  "tarjeta"
];

if (!in_array($metodo, $metodosPermitidos, true)) {
  responder([
    "success" => false,
    "error" => "Método de pago inválido."
  ], 400);
}

// ====== Validar fechas ======
$fecha_inicio = DateTime::createFromFormat("!Y-m-d", $fecha_inicio_str);
$fecha_fin    = DateTime::createFromFormat("!Y-m-d", $fecha_fin_str);

$erroresInicio = DateTime::getLastErrors();
$inicioConError = is_array($erroresInicio)
  && ($erroresInicio['warning_count'] > 0 || $erroresInicio['error_count'] > 0);

if (!$fecha_inicio || $inicioConError) {
  responder([
    "success" => false,
    "error" => "La fecha de inicio no es válida."
  ], 400);
}

$fecha_fin = DateTime::createFromFormat("!Y-m-d", $fecha_fin_str);

$erroresFin = DateTime::getLastErrors();
$finConError = is_array($erroresFin)
  && ($erroresFin['warning_count'] > 0 || $erroresFin['error_count'] > 0);

if (!$fecha_fin || $finConError) {
  responder([
    "success" => false,
    "error" => "La fecha de fin no es válida."
  ], 400);
}

if ($fecha_fin <= $fecha_inicio) {
  responder([
    "success" => false,
    "error" => "La fecha de fin debe ser mayor que la fecha de inicio."
  ], 400);
}

// ====== Obtener tarifa activa ======
$stmt = $conexion->prepare("
  SELECT
    id,
    nombre,
    monto,
    activo
  FROM tarifas
  WHERE id = ?
  LIMIT 1
");

if (!$stmt) {
  responder([
    "success" => false,
    "error" => "No se pudo preparar la consulta de la tarifa."
  ], 500);
}

$stmt->bind_param("i", $tarifa_id);
$stmt->execute();

$tarifa = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$tarifa) {
  responder([
    "success" => false,
    "error" => "La tarifa seleccionada no existe."
  ], 400);
}

if ((int)$tarifa["activo"] !== 1) {
  responder([
    "success" => false,
    "error" => "La tarifa seleccionada está desactivada."
  ], 400);
}

// El monto real siempre viene de la tabla tarifas.
$monto = (float)$tarifa["monto"];
$tarifa_nombre = trim((string)$tarifa["nombre"]);

if ($monto <= 0) {
  responder([
    "success" => false,
    "error" => "La tarifa seleccionada no tiene un monto válido."
  ], 400);
}

if ($descuento < 0 || $descuento > $monto) {
  responder([
    "success" => false,
    "error" => "El descuento no puede ser negativo ni mayor al monto de la tarifa."
  ], 400);
}

$total_cobrado = $monto - $descuento;

// Normalizar horas.
$fecha_inicio->setTime(0, 0, 0);
$fecha_fin->setTime(23, 59, 59);

$beginSQL = $fecha_inicio->format("Y-m-d H:i:s");
$finSQL   = $fecha_fin->format("Y-m-d H:i:s");

// ====== Obtener cliente por ID ======
$stmt = $conexion->prepare("
  SELECT
    id,
    data,
    personCode,
    apellido,
    nombre,
    genero,
    orgIndexCode,
    telefono,
    email,
    Inicio,
    Fin,
    FechaIngreso
  FROM clientes
  WHERE id = ?
  LIMIT 1
");

if (!$stmt) {
  responder([
    "success" => false,
    "error" => "No se pudo preparar la consulta del cliente."
  ], 500);
}

$stmt->bind_param("i", $cliente_id);
$stmt->execute();

$cliente = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$cliente) {
  responder([
    "success" => false,
    "error" => "Cliente no encontrado."
  ], 404);
}

if (empty($cliente['data'])) {
  responder([
    "success" => false,
    "error" => "El cliente no tiene personId registrado en HikCentral."
  ], 400);
}

// ====== Validar que no existan días previamente pagados ======
//
// Un periodo se cruza cuando:
// - El inicio existente es menor o igual al nuevo final.
// - El final existente es mayor o igual al nuevo inicio.
//
// Las comparaciones son inclusivas porque fecha_fin representa
// un día completo y se almacena con hora 23:59:59.

$stmt = $conexion->prepare("
  SELECT
    id,
    fecha_aplicada,
    fecha_fin
  FROM pagos
  WHERE cliente_id = ?
    AND DATE(fecha_aplicada) < ?
    AND DATE(fecha_fin) > ?
  ORDER BY fecha_aplicada ASC
  LIMIT 1
");

if (!$stmt) {
  responder([
    "success" => false,
    "error" => "No se pudo validar el periodo del pago."
  ], 500);
}

$stmt->bind_param(
  "iss",
  $cliente_id,
  $finSQL,
  $beginSQL
);

$stmt->execute();

$pagoSuperpuesto = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($pagoSuperpuesto) {
  $inicioExistente = date(
    "d/m/Y",
    strtotime($pagoSuperpuesto["fecha_aplicada"])
  );

  $finExistente = date(
    "d/m/Y",
    strtotime($pagoSuperpuesto["fecha_fin"])
  );

  responder([
    "success" => false,
    "error" =>
      "No se puede registrar el pago porque incluye días que ya están pagados. " .
      "El periodo existente comprende del {$inicioExistente} al {$finExistente}."
  ], 409);
}
// ====== Calcular nuevo endTime global ======
$maxFinActual = null;

$stmt = $conexion->prepare("
  SELECT MAX(fecha_fin) AS max_fin
  FROM pagos
  WHERE cliente_id = ?
");

if (!$stmt) {
  responder([
    "success" => false,
    "error" => "No se pudo validar la vigencia actual."
  ], 500);
}

$stmt->bind_param("i", $cliente_id);
$stmt->execute();

$maxFinRow = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!empty($maxFinRow['max_fin'])) {
  $maxFinActual = $maxFinRow['max_fin'];
}

if (
  !empty($cliente['Fin'])
  && strtotime($cliente['Fin']) > strtotime($maxFinActual ?: '1970-01-01')
) {
  $maxFinActual = $cliente['Fin'];
}

$nuevaFinGlobal = $maxFinActual
  ? (
    strtotime($finSQL) > strtotime($maxFinActual)
      ? $finSQL
      : $maxFinActual
  )
  : $finSQL;

// ====== BEGIN fijo para HikCentral ======
if (!empty($cliente['Inicio'])) {
  $beginFijo = $cliente['Inicio'];
} elseif (!empty($cliente['FechaIngreso'])) {
  $beginFijo = $cliente['FechaIngreso'];

  if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $beginFijo)) {
    $beginFijo .= ' 00:00:00';
  }
} else {
  $beginFijo = $beginSQL;
}

// ====== Configuración de HikCentral ======
$config = api_cfg();

if (!$config) {
  responder([
    "success" => false,
    "error" => "Falta configuración de API. Ve a Dashboard → Configurar API HikCentral."
  ], 500);
}

// Guardar valores previos para posible rollback.
$prevInicio = $cliente['Inicio'] ?: $beginFijo;
$prevFin    = $cliente['Fin'] ?: $beginFijo;

// ====== 1. Actualizar HikCentral ======
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
    responder([
      "success" => false,
      "error" => "Error actualizando al cliente en HikCentral.",
      "hikcentral_response" => $resp
    ], 502);
  }
} catch (Throwable $e) {
  responder([
    "success" => false,
    "error" => "Excepción en HikCentral: " . $e->getMessage()
  ], 502);
}

// ====== 2. Base de datos ======
$conexion->begin_transaction();

try {
  $fecha_pago_now = date("Y-m-d H:i:s");

  $stmt = $conexion->prepare("
    INSERT INTO pagos (
      cliente_id,
      usuario_id,
      fecha_pago,
      fecha_aplicada,
      fecha_fin,
      monto,
      metodo_pago,
      descuento,
      tarifa_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ");

  if (!$stmt) {
    throw new Exception(
      "No se pudo preparar el registro del pago: " . $conexion->error
    );
  }

  $stmt->bind_param(
    "iisssdsdi",
    $cliente_id,
    $usuario_id,
    $fecha_pago_now,
    $beginSQL,
    $finSQL,
    $monto,
    $metodo,
    $descuento,
    $tarifa_id
  );

  if (!$stmt->execute()) {
    throw new Exception(
      "No se pudo insertar el pago: " . $stmt->error
    );
  }

  $pago_id = $stmt->insert_id;
  $stmt->close();

  // Actualizar únicamente la fecha Fin del cliente.
  $stmt = $conexion->prepare("
    UPDATE clientes
    SET Fin = ?
    WHERE id = ?
  ");

  if (!$stmt) {
    throw new Exception(
      "No se pudo preparar la actualización del cliente: "
      . $conexion->error
    );
  }

  $stmt->bind_param(
    "si",
    $nuevaFinGlobal,
    $cliente_id
  );

  if (!$stmt->execute()) {
    throw new Exception(
      "No se pudo actualizar el cliente: " . $stmt->error
    );
  }

  $stmt->close();

  $conexion->commit();

  // Enviar cambios a dispositivos.
  try {
    Visitor::sendUserToDevice($config);
  } catch (Throwable $t) {
    // El pago ya fue registrado. No se revierte por esta operación opcional.
  }

  responder([
    "success" => true,
    "msg" => "Pago registrado correctamente.",
    "pago" => [
      "id" => $pago_id,
      "tarifa_id" => $tarifa_id,
      "tarifa_nombre" => $tarifa_nombre,
      "monto" => $monto,
      "descuento" => $descuento,
      "total_cobrado" => $total_cobrado,
      "metodo" => $metodo,
      "fecha_pago" => $fecha_pago_now
    ],
    "cliente" => [
      "id" => $cliente_id,
      "inicio" => $beginFijo,
      "fin" => $nuevaFinGlobal
    ]
  ]);

} catch (Throwable $th) {
  $conexion->rollback();

  // Revertir HikCentral si falló la operación en BD.
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
  } catch (Throwable $e2) {
    // No sustituimos el error original de base de datos.
  }

  responder([
    "success" => false,
    "error" => "Error en BD: " . $th->getMessage()
  ], 500);
}