<?php
require '../php/conexion.php';

$page = isset($_GET['page']) ? intval($_GET['page']) : 1;
$pageSize = 20;
$offset = ($page - 1) * $pageSize;

$filtro = isset($_GET['q']) ? '%' . $conexion->real_escape_string($_GET['q']) . '%' : null;

if ($filtro) {
    $stmt = $conexion->prepare("
    SELECT * FROM clientes 
    WHERE tipo = 'clientes' 
    AND (
        personCode LIKE ? 
        OR nombre LIKE ? 
        OR apellido LIKE ? 
        OR grupo LIKE ? 
        OR telefono LIKE ? 
        OR email LIKE ? 
        OR CONCAT(nombre, ' ', apellido) LIKE ?
    )
    ORDER BY personCode ASC 
    LIMIT ? OFFSET ?
");
$stmt->bind_param("ssssssssi", $filtro, $filtro, $filtro, $filtro, $filtro, $filtro, $filtro, $pageSize, $offset);
}
 else {
    $stmt = $conexion->prepare("SELECT * FROM clientes WHERE tipo = 'clientes' ORDER BY personCode ASC LIMIT ? OFFSET ?");
    $stmt->bind_param("ii", $pageSize, $offset);
}

$stmt->execute();
$result = $stmt->get_result();
$clientes = $result->fetch_all(MYSQLI_ASSOC);

echo json_encode($clientes);

