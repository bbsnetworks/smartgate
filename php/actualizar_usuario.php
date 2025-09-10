<?php
require_once 'conexion.php';
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

$id       = $data["id"] ?? null;
$nombre   = $data["nombre"] ?? null;
$correo   = $data["correo"] ?? null;
$rol      = $data["rol"] ?? null;
$password = $data["password"] ?? null;

if (!$id || !$nombre || !$correo || !$rol) {
    echo json_encode(["success" => false, "error" => "Faltan datos obligatorios."]);
    exit();
}

try {
    if ($password) {
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conexion->prepare("UPDATE usuarios SET nombre = ?, correo = ?, password = ?, rol = ? WHERE id = ?");
        $stmt->bind_param("ssssi", $nombre, $correo, $passwordHash, $rol, $id);
    } else {
        $stmt = $conexion->prepare("UPDATE usuarios SET nombre = ?, correo = ?, rol = ? WHERE id = ?");
        $stmt->bind_param("sssi", $nombre, $correo, $rol, $id);
    }

    if (!$stmt->execute()) {
        throw new Exception("Error al ejecutar la consulta: " . $stmt->error);
    }

    echo json_encode(["success" => true, "msg" => "Usuario actualizado correctamente."]);
    $stmt->close();
} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>