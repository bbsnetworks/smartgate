<?php
require_once 'conexion.php';
header('Content-Type: application/json');

$id = $_GET['id'] ?? 0;
if (!$id) {
    echo json_encode(["success" => false, "error" => "ID inválido"]);
    exit;
}

$stmt = $conexion->prepare("SELECT * FROM clientes WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$res = $stmt->get_result();
$cliente = $res->fetch_assoc();

if (!$cliente) {
    echo json_encode(["success" => false, "error" => "Cliente no encontrado"]);
    exit;
}

echo json_encode([
    "success" => true,
    "data" => [
        "id" => $cliente["id"],
        "nombre" => $cliente["nombre"],
        "apellido" => $cliente["apellido"],
        "telefono" => $cliente["telefono"],
        "foto" => "" . $cliente["face"],
        "comentarios" => $cliente["comentarios"] ? "" . $cliente["comentarios"] : null,
        "foto_icono" => $cliente["face_icon"] ? "" . $cliente["face_icon"] : null
    ]
]);
