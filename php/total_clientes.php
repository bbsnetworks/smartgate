<?php
require '../php/conexion.php';

$filtro = isset($_GET['q']) ? '%' . $conexion->real_escape_string($_GET['q']) . '%' : null;

if ($filtro) {
  $stmt = $conexion->prepare("
    SELECT COUNT(*) as total 
    FROM clientes 
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
  ");
  $stmt->bind_param("sssssss", $filtro, $filtro, $filtro, $filtro, $filtro, $filtro, $filtro);
} else {
  $stmt = $conexion->prepare("SELECT COUNT(*) as total FROM clientes WHERE tipo = 'clientes'");
}

$stmt->execute();
$result = $stmt->get_result();

$total = 0;
if ($result && $row = $result->fetch_assoc()) {
  $total = (int)$row['total'];
}

echo json_encode(['total' => $total]);


