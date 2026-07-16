<?php
require_once 'conexion.php';

date_default_timezone_set("America/Mexico_City");
header("Content-Type: application/json; charset=utf-8");

$id = (int)($_GET['id'] ?? 0);

if ($id <= 0) {
    echo json_encode([
        "success" => false,
        "error" => "ID de cliente requerido."
    ]);
    exit;
}

$stmt = $conexion->prepare("
    SELECT Fin
    FROM clientes
    WHERE id = ?
    LIMIT 1
");

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "error" => "No se pudo preparar la consulta."
    ]);
    exit;
}

$stmt->bind_param("i", $id);
$stmt->execute();

$resultado = $stmt->get_result();
$fila = $resultado->fetch_assoc();

$stmt->close();

if (!$fila) {
    echo json_encode([
        "success" => false,
        "error" => "Cliente no encontrado."
    ]);
    exit;
}

$ultimaFecha = null;

if (!empty($fila["Fin"])) {
    $timestamp = strtotime($fila["Fin"]);

    if ($timestamp === false) {
        echo json_encode([
            "success" => false,
            "error" => "La fecha de vigencia del cliente no es válida."
        ]);
        exit;
    }

    // La fecha final también es la fecha de renovación.
    $ultimaFecha = date("Y-m-d", $timestamp);
}

echo json_encode([
    "success" => true,
    "ultima_fecha" => $ultimaFecha
]);