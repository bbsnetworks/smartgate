<?php
require_once 'conexion.php';
header("Content-Type: application/json");

$termino = $_GET['termino'] ?? '';

if (!$termino) {
    echo json_encode([]);
    exit;
}

$termino = "%{$termino}%";
$stmt = $conexion->prepare("SELECT codigo, nombre FROM productos WHERE codigo LIKE ? OR nombre LIKE ? LIMIT 10");
$stmt->bind_param("ss", $termino, $termino);
$stmt->execute();
$res = $stmt->get_result();

$sugerencias = [];
while ($row = $res->fetch_assoc()) {
    $sugerencias[] = $row;
}

echo json_encode($sugerencias);
