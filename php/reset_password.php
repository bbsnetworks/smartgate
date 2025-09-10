<?php
require_once 'conexion.php';
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$token = $data['token'] ?? '';
$password = $data['password'] ?? '';

if (!$token || !$password) {
    echo json_encode(["success" => false, "error" => "Datos incompletos."]);
    exit;
}

$stmt = $conexion->prepare("
    SELECT usuario_id, expira 
    FROM recuperaciones 
    WHERE token = ? LIMIT 1
");
$stmt->bind_param("s", $token);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows === 0) {
    echo json_encode(["success" => false, "error" => "Token inválido."]);
    exit;
}

$row = $res->fetch_assoc();
if (new DateTime() > new DateTime($row['expira'])) {
    echo json_encode(["success" => false, "error" => "El token ha expirado."]);
    exit;
}

$hashed = password_hash($password, PASSWORD_DEFAULT);
$conexion->query("UPDATE usuarios SET password = '$hashed' WHERE id = {$row['usuario_id']}");
$conexion->query("DELETE FROM recuperaciones WHERE usuario_id = {$row['usuario_id']}");

echo json_encode(["success" => true, "msg" => "Contraseña actualizada correctamente."]);
