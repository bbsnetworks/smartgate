<?php
session_start();
require_once 'conexion.php';

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$correo = $data['correo'] ?? '';
$password = $data['password'] ?? '';

if (!$correo || !$password) {
    echo json_encode(["success" => false, "error" => "Correo y contraseña son obligatorios."]);
    exit();
}

$stmt = $conexion->prepare("SELECT id, nombre, password, rol FROM usuarios WHERE correo = ? LIMIT 1");
$stmt->bind_param("s", $correo);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "error" => "Usuario no encontrado."]);
    exit();
}

$usuario = $result->fetch_assoc();

if (!password_verify($password, $usuario['password'])) {
    echo json_encode(["success" => false, "error" => "Contraseña incorrecta."]);
    exit();
}

// Guardar en sesión
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
$_SESSION['usuario'] = [
    "id"     => $usuario['id'],
    "nombre" => $usuario['nombre'],
    "rol"    => $usuario['rol'],
    "tipo"   => $usuario['rol'], // alias para compatibilidad
];


echo json_encode(["success" => true, "msg" => "Inicio de sesión exitoso.","rol" => $usuario['rol']]);

