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

// Nuevos campos
$emergencia   = $data["emergencia"] ?? null;
$sangre       = $data["sangre"] ?? null;
$comentarios  = $data["comentarios"] ?? null;

if (!$id || !$orgIndexCode) {
    echo json_encode(["success" => false, "error" => "Faltan datos requeridos."]);
    exit();
}

// Obtener el usuario actual
$stmt = $conexion->prepare("SELECT * FROM clientes WHERE data = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();
$stmt->close();

if (!$user) {
    echo json_encode(["success" => false, "error" => "Usuario no encontrado."]);
    exit();
}

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

// 🔁 Actualizar en base de datos local (se agregan los campos nuevos)
$stmt = $conexion->prepare("UPDATE clientes 
    SET nombre = ?, apellido = ?, telefono = ?, email = ?, Inicio = ?, Fin = ?, tipo = ?, department = ?, orgIndexCode = ?, emergencia = ?, sangre = ?, comentarios = ?
    WHERE data = ?");

$stmt->bind_param("ssssssssisssi", 
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
    $id
);

$stmt->execute();
$stmt->close();

// 🔁 Actualizar en HikCentral
$config = (object) [
    "userKey" => "21660945",
    "userSecret" => "93iLwvnQkXAvlHw8wbQz",
    "urlHikCentralAPI" => "http://127.0.0.1:9016"
];

try {
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

    if (isset($response["code"]) && $response["code"] === "0") {
        Visitor::sendUserToDevice($config);

        echo json_encode([
            "success" => true,
            "msg" => "Usuario actualizado correctamente."
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "error" => "Error en API HikCentral: " . ($response["msg"] ?? "Respuesta inválida"),
            "debug" => $response
        ]);
    }
} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
