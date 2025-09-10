<?php
require_once 'conexion.php';

header("Content-Type: application/json");

$id = $_GET['id'] ?? null;

if (!$id) {
    echo json_encode(["success" => false, "error" => "ID de usuario no proporcionado"]);
    exit();
}

$stmt = $conexion->prepare("SELECT id, nombre, correo, rol FROM usuarios WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();

if ($usuario = $result->fetch_assoc()) {
    echo json_encode(["success" => true, "usuario" => $usuario]);
} else {
    echo json_encode(["success" => false, "error" => "Usuario no encontrado"]);
}

$stmt->close();
