<?php
require_once 'conexion.php';
require_once 'Visitor.php';
header('Content-Type: application/json');

date_default_timezone_set('America/Mexico_City');

function convertirFechaHik(string $fechaLocal): string {
  $dt = new DateTime($fechaLocal, new DateTimeZone('America/Mexico_City'));
  return $dt->format("Y-m-d\TH:i:sP");
}

$idPago    = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$clienteId = isset($_GET['cliente']) ? (int)$_GET['cliente'] : 0;

if ($idPago <= 0 || $clienteId <= 0) {
  echo json_encode(["success" => false, "error" => "Faltan parámetros."]);
  exit;
}

// === CONFIG desde DB ===
$config = api_cfg();
if (!$config) {
  http_response_code(500);
  echo json_encode(["success"=>false,"error"=>"Falta configuración de API. Ve a Dashboard → Configurar API HikCentral."]);
  exit;
}

// ---- Datos del pago a eliminar
$stmt = $conexion->prepare("SELECT id, cliente_id, fecha_fin FROM pagos WHERE id = ? AND cliente_id = ? LIMIT 1");
$stmt->bind_param("ii", $idPago, $clienteId);
$stmt->execute();
$pago = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$pago) { echo json_encode(["success"=>false,"error"=>"Pago no encontrado."]); exit; }

// ---- Datos del cliente (incluye FechaIngreso)
$stmt = $conexion->prepare("SELECT id, nombre, apellido, data, personCode, genero, orgIndexCode, telefono, email, Inicio, Fin, FechaIngreso
                            FROM clientes WHERE id = ? LIMIT 1");
$stmt->bind_param("i", $clienteId);
$stmt->execute();
$cliente = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$cliente) { echo json_encode(["success"=>false,"error"=>"Cliente no encontrado."]); exit; }
// Debe existir el personId (campo 'data') para poder actualizar en HikCentral
if (empty($cliente['data'])) {
  echo json_encode(["success"=>false,"error"=>"El cliente no tiene personId (data) en HikCentral."]); exit;
}
// ---- ¿Este pago es el más reciente por fecha_fin?
$stmt = $conexion->prepare("SELECT MAX(fecha_fin) AS max_fin FROM pagos WHERE cliente_id = ?");
$stmt->bind_param("i", $clienteId);
$stmt->execute();
$maxAll = $stmt->get_result()->fetch_assoc()['max_fin'] ?? null;
$stmt->close();

$esUltimo = ($maxAll !== null && $pago['fecha_fin'] === $maxAll);

// ---- Si es el último, calcular nueva vigencia (API primero)
$nuevaFinSQL    = null;
$nuevoInicioSQL = null;

if ($esUltimo) {
  // 2ª mayor fecha_fin (excluyendo el pago actual)
  $stmt = $conexion->prepare("SELECT MAX(fecha_fin) AS nueva_fin FROM pagos WHERE cliente_id = ? AND id <> ?");
  $stmt->bind_param("ii", $clienteId, $idPago);
  $stmt->execute();
  $nuevaFinOther = $stmt->get_result()->fetch_assoc()['nueva_fin'] ?? null;
  $stmt->close();

  if ($nuevaFinOther) {
    // Quedan pagos → solo mover Fin
    $nuevaFinSQL = (new DateTime($nuevaFinOther))->format("Y-m-d 23:59:59");

    // beginTime fijo (Inicio si existe; si no, FechaIngreso 00:00:00; si no, hoy 00:00)
    $beginFijoRaw = $cliente["Inicio"] ?: ($cliente["FechaIngreso"] ?: date('Y-m-d 00:00:00'));
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $beginFijoRaw)) { $beginFijoRaw .= ' 00:00:00'; }

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
        "beginTime"        => (new DateTime($beginFijoRaw))->format("Y-m-d\TH:i:sP"),
        "endTime"          => (new DateTime($nuevaFinSQL))->format("Y-m-d\TH:i:sP")
      ]);
      if (!isset($resp["code"]) || (string)$resp["code"] !== "0") {
        echo json_encode(["success"=>false,"error"=>"Error en HikCentral (mover Fin).","hik"=>$resp]);
        exit;
      }
    } catch (Exception $e) {
      echo json_encode(["success"=>false,"error"=>"Excepción HikCentral (mover Fin): ".$e->getMessage()]);
      exit;
    }

  } else {// === YA NO QUEDAN PAGOS -> usar FechaIngreso ===
$fiRaw = $cliente['FechaIngreso'] ?: ($cliente['Inicio'] ?: null);

// fallbacks por si está vacía o 0000-00-00
if (!$fiRaw || $fiRaw === '0000-00-00') {
  $fiRaw = date('Y-m-d'); // hoy
}

// si viene en formato DATE, convertir a DATETIME 00:00:00
if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $fiRaw)) {
  $fiRaw .= ' 00:00:00';
}

// Construir inicio/fin locales (para BD)
try {
  $fiDT           = new DateTime($fiRaw, new DateTimeZone('America/Mexico_City'));
} catch (Throwable $e) {
  echo json_encode(["success"=>false,"error"=>"FechaIngreso inválida: ".$fiRaw]);
  exit;
}

$nuevoInicioSQL = $fiDT->format("Y-m-d 00:00:00");
$nuevaFinSQL    = (clone $fiDT)->modify("+1 day")->format("Y-m-d 23:59:59");

// Convertir a ISO para la API (igual que en update_user.php)
$inicioISO = convertirFechaHik($nuevoInicioSQL);
$finISO    = convertirFechaHik($nuevaFinSQL);

// API primero
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
    "beginTime"        => $inicioISO,
    "endTime"          => $finISO
  ]);

  if (!isset($resp["code"]) || (string)$resp["code"] !== "0") {
    echo json_encode([
      "success"=>false,
      "error"=>"Error en HikCentral (FechaIngreso).",
      "hik"=>$resp,
      "debug"=>["beginTime"=>$inicioISO, "endTime"=>$finISO]
    ]);
    exit;
  }
} catch (Exception $e) {
  echo json_encode([
    "success"=>false,
    "error"=>"Excepción HikCentral (FechaIngreso): ".$e->getMessage(),
    "debug"=>["beginTime"=>$inicioISO, "endTime"=>$finISO]
  ]);
  exit;
}
}
}

// ==== BD: transacción (modificar solo después de API OK si hacía falta)
$conexion->begin_transaction();

try {
  // Eliminar el pago
  $stmt = $conexion->prepare("DELETE FROM pagos WHERE id = ? AND cliente_id = ?");
  $stmt->bind_param("ii", $idPago, $clienteId);
  $stmt->execute();
  if ($stmt->affected_rows < 1) {
    $stmt->close();
    throw new Exception("No se pudo eliminar el pago.");
  }
  $stmt->close();

  // Actualizar cliente si era el último
  if ($esUltimo) {
    if ($nuevoInicioSQL !== null) {
      $stmt = $conexion->prepare("UPDATE clientes SET Inicio = ?, Fin = ? WHERE id = ?");
      $stmt->bind_param("ssi", $nuevoInicioSQL, $nuevaFinSQL, $clienteId);
    } else {
      $stmt = $conexion->prepare("UPDATE clientes SET Fin = ? WHERE id = ?");
      $stmt->bind_param("si", $nuevaFinSQL, $clienteId);
    }
    $stmt->execute();
    if ($stmt->affected_rows < 1) {
      $stmt->close();
      throw new Exception("No se pudo actualizar datos del cliente.");
    }
    $stmt->close();
  }

  $conexion->commit();

} catch (Throwable $th) {
  $conexion->rollback();
  echo json_encode(["success"=>false,"error"=>"Error en BD: ".$th->getMessage()]);
  exit;
}

// Reaplicar al dispositivo (tu método actual, sin cambios)
$sent = null;
try { $sent = Visitor::sendUserToDevice($config); } catch (\Throwable $t) {}

$nombreCompleto = trim(($cliente['nombre'] ?? '').' '.($cliente['apellido'] ?? ''));

$msg = "Pago eliminado.";
if ($esUltimo) {
  $msg .= ($nuevoInicioSQL !== null)
    ? ""
    : "";
} else {
  $msg .= "";
}

echo json_encode([
  "success"        => true,
  "msg"            => $msg,
  "nombreCompleto" => $nombreCompleto,
  "esUltimo"       => $esUltimo,
  "sinMasPagos"    => ($nuevoInicioSQL !== null),
  "nuevoInicio"    => $nuevoInicioSQL,
  "nuevaFin"       => $nuevaFinSQL,
  "reapply"        => $sent
]);
