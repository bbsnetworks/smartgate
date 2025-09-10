<?php
require_once 'conexion.php';
header("Content-Type: application/json");

$id = $_GET['id'] ?? null;
if (!$id) {
    echo json_encode(["success" => false, "error" => "ID requerido"]);
    exit;
}

$stmt = $conexion->prepare("SELECT Fin FROM clientes WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$resultado = $stmt->get_result();

if ($fila = $resultado->fetch_assoc()) {
    $fechaFin = $fila["Fin"];
    echo json_encode([
        "success" => true,
        "ultima_fecha" => $fechaFin ? date("Y-m-d", strtotime($fechaFin)) : null
    ]);
} else {
    echo json_encode(["success" => false, "error" => "Cliente no encontrado"]);
}

