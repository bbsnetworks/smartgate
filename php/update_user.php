<?php
date_default_timezone_set('America/Mexico_City');

require_once 'conexion.php';
require_once 'Visitor.php';

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

// Campos recibidos
$id           = $data["id"] ?? null;
$nombre       = $data["nombre"] ?? "";
$apellido     = $data["apellido"] ?? "";
$telefono     = $data["telefono"] ?? "";
$email        = $data["email"] ?? "";
$inicio       = $data["Inicio"] ?? null;
$fin          = $data["Fin"] ?? null;
$orgIndexCode = $data["orgIndexCode"] ?? null;
$orgName      = strtolower(trim($data["orgName"] ?? ""));

// ✅ Nuevo: grupo (horario)
$grupoNuevo   = $data["grupo"] ?? null;
$grupoNuevo   = ($grupoNuevo === "" ? null : $grupoNuevo);

// Nuevos campos
$emergencia   = $data["emergencia"] ?? null;
$sangre       = $data["sangre"] ?? null;
$comentarios  = $data["comentarios"] ?? null;

if (!$id || !$orgIndexCode) {
  echo json_encode(["success" => false, "error" => "Faltan datos requeridos."]);
  exit();
}

// 1) Obtener usuario actual (para personCode, genero, grupo anterior, etc.)
$stmt = $conexion->prepare("SELECT * FROM clientes WHERE data = ? LIMIT 1");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();
$stmt->close();

if (!$user) {
  echo json_encode(["success" => false, "error" => "Usuario no encontrado."]);
  exit();
}

$grupoAnterior = $user["grupo"] ?? null;
$grupoAnterior = ($grupoAnterior === "" ? null : $grupoAnterior);

// Convertir fechas a formato ISO para HikCentral
function convertirFechaHik($fechaLocal) {
  $dt = new DateTime($fechaLocal, new DateTimeZone('America/Mexico_City'));
  return $dt->format("Y-m-d\TH:i:sP");
}

// Determinar tipo y department
if ($orgName === 'empleados') {
  $tipo = 'empleados';
  $department = "All Departments/Gym Zero/Empleados";
} elseif ($orgName === 'gerencia') {
  $tipo = 'gerencia';
  $department = "All Departments/Gym Zero/Gerencia";
} else {
  $tipo = 'clientes';
  $department = "All Departments/Gym Zero/Clientes";
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

try {
  // 2) API: actualizar persona
  $response = Visitor::updateUser($config, [
    "personId"         => (string)$id,
    "personCode"       => $user["personCode"],
    "personFamilyName" => $apellido,
    "personGivenName"  => $nombre,
    "orgIndexCode"     => $orgIndexCode,
    "gender"           => (int)$user["genero"],
    "phoneNo"          => $telefono,
    "email"            => $email,
    "beginTime"        => convertirFechaHik($inicio),
    "endTime"          => convertirFechaHik($fin)
  ]);

  if (!isset($response["code"]) || $response["code"] !== "0") {
    echo json_encode([
      "success" => false,
      "error" => "Error en updateUser (HikCentral): " . ($response["msg"] ?? "Respuesta inválida"),
      "debug" => $response
    ]);
    exit();
  }

  // 3) API: actualizar grupo (si aplica)
  //    Primero eliminar del anterior (si cambió), luego agregar al nuevo.
  if ($grupoNuevo) {
    if ($grupoAnterior && (string)$grupoAnterior !== (string)$grupoNuevo) {
      $rem = Visitor::removeUserFromGroup($config, (string)$grupoAnterior, (string)$id);
      if (!isset($rem["code"]) || $rem["code"] !== "0") {
        echo json_encode([
          "success" => false,
          "error" => "No se pudo eliminar del grupo anterior en HikCentral: " . ($rem["msg"] ?? "Respuesta inválida"),
          "debug" => ["remove" => $rem]
        ]);
        exit();
      }
    }

    $add = Visitor::assignUserToGroup($config, (string)$grupoNuevo, (string)$id);
    if (!isset($add["code"]) || $add["code"] !== "0") {
      echo json_encode([
        "success" => false,
        "error" => "No se pudo agregar al nuevo grupo en HikCentral: " . ($add["msg"] ?? "Respuesta inválida"),
        "debug" => ["add" => $add]
      ]);
      exit();
    }
  }

  // 4) ✅ BD: solo si todo lo anterior fue OK
  $stmt = $conexion->prepare("UPDATE clientes 
      SET nombre = ?, apellido = ?, telefono = ?, email = ?, Inicio = ?, Fin = ?, tipo = ?, department = ?, orgIndexCode = ?, emergencia = ?, sangre = ?, comentarios = ?, grupo = ?
      WHERE data = ?");

  $stmt->bind_param(
    "ssssssssissssi",
    $nombre,
    $apellido,
    $telefono,
    $email,
    $inicio,
    $fin,
    $tipo,
    $department,
    $orgIndexCode,
    $emergencia,
    $sangre,
    $comentarios,
    $grupoNuevo,
    $id
  );

  $stmt->execute();
  $stmt->close();

  // 5) Reaplicar a dispositivo
  Visitor::sendUserToDevice($config);

  echo json_encode([
    "success" => true,
    "msg" => "Usuario actualizado correctamente."
  ]);

} catch (Exception $e) {
  echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
