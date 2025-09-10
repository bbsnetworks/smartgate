<?php
require_once 'conexion.php';
header("Content-Type: application/json");

$codigo = $_GET['codigo'] ?? '';

if (!$codigo) {
    echo json_encode(["error" => "Código no proporcionado"]);
    exit;
}

// Buscar producto por código de barras
$stmt = $conexion->prepare("SELECT id, codigo, nombre, descripcion, precio, stock FROM productos WHERE codigo = ? LIMIT 1");
$stmt->bind_param("s", $codigo);
$stmt->execute();
$resultado = $stmt->get_result();
$producto = $resultado->fetch_assoc();

if ($producto) {
    echo json_encode($producto);
} else {
    echo json_encode(null);
}
