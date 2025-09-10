<?php
require_once 'conexion.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$nombre   = $data['nombre'] ?? null;
$email    = $data['correo'] ?? null;
$password = $data['password'] ?? null;
$rol      = $data['rol'] ?? null;

if (!$nombre || !$email || !$password || !$rol) {
    echo json_encode(['success' => false, 'error' => 'Faltan datos obligatorios.']);
    exit;
}

// Validar si ya existe un usuario con el mismo correo
$check = $conexion->prepare("SELECT id FROM usuarios WHERE correo = ?");
$check->bind_param("s", $email);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    echo json_encode(['success' => false, 'error' => 'El correo ya está registrado.']);
    $check->close();
    exit;
}
$check->close();

// Generar código aleatorio de 10 caracteres
function generarCodigo($longitud = 10) {
    $caracteres = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return substr(str_shuffle(str_repeat($caracteres, $longitud)), 0, $longitud);
}

$codigo = generarCodigo();
$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conexion->prepare("INSERT INTO usuarios (nombre, correo, password, rol, codigo) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("sssss", $nombre, $email, $hash, $rol, $codigo);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'msg' => 'Usuario registrado con éxito.']);
} else {
    echo json_encode(['success' => false, 'error' => $stmt->error]);
}

$stmt->close();
?>



