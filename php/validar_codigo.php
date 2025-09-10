<?php
require_once 'conexion.php';
header("Content-Type: application/json");

$codigo = $_GET['code'] ?? '';
$codigo = trim($codigo);

if (!$codigo) {
    echo json_encode(["error" => "Código vacío."]);
    exit;
}

$stmt = $conexion->prepare("SELECT COUNT(*) FROM clientes WHERE personCode = ?");
$stmt->bind_param("s", $codigo);
$stmt->execute();
$stmt->bind_result($cantidad);
$stmt->fetch();
$stmt->close();

echo json_encode(["enUso" => $cantidad > 0]);
