<?php
require_once 'conexion.php';
header('Content-Type: application/json');

$q = strtolower(trim($_GET['q'] ?? ''));

if ($q === '') {
    // Si no hay término de búsqueda, mostrar todos los clientes
    $stmt = $conexion->prepare("SELECT id, nombre, apellido, telefono, Fin FROM clientes WHERE tipo = 'clientes' ORDER BY nombre ASC");
} else {
    // Si hay búsqueda, filtrar por nombre, apellido o teléfono combinados
    $q = "%{$q}%";
    $stmt = $conexion->prepare("
        SELECT id, nombre, apellido, telefono, Fin
        FROM clientes
        WHERE tipo = 'clientes'
          AND (
            CONCAT(LOWER(nombre), ' ', LOWER(apellido)) LIKE ? OR
            LOWER(nombre) LIKE ? OR
            LOWER(apellido) LIKE ? OR
            telefono LIKE ?
          )
        ORDER BY nombre ASC
    ");
    $stmt->bind_param("ssss", $q, $q, $q, $q);
}

$stmt->execute();
$result = $stmt->get_result();

$clientes = [];
while ($row = $result->fetch_assoc()) {
    $clientes[] = $row;
}

echo json_encode($clientes);
