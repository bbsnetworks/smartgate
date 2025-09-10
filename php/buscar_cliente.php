<?php
require_once 'conexion.php';
header('Content-Type: application/json');

$q = $_GET['q'] ?? '';

if (empty($q)) {
    echo json_encode([]);
    exit();
}

$stmt = $conexion->prepare("SELECT id, nombre, apellido, telefono, face, face_icon FROM clientes WHERE tipo = 'clientes' AND nombre LIKE CONCAT('%', ?, '%') OR apellido LIKE CONCAT('%', ?, '%') ORDER BY nombre ASC");
$stmt->bind_param("ss", $q, $q);
$stmt->execute();
$resultado = $stmt->get_result();

$clientes = [];
while ($c = $resultado->fetch_assoc()) {
    $clientes[] = [
        "id" => $c["id"],
        "nombre" => $c["nombre"],
        "apellido" => $c["apellido"],
        "telefono" => $c["telefono"],
        "foto" => "data:image/jpeg;base64," . $c["face"],
        "foto_icono" => $c["face_icon"] ? "data:image/jpeg;base64," . $c["face_icon"] : null
    ];
}

echo json_encode($clientes);



