<?php
require '../php/conexion.php';

$q = $_GET['q'] ?? '';
$q = trim($q);

$stmt = $conexion->prepare("
    SELECT *, 
      CASE 
        WHEN tipo = 'gerencia' THEN 'Gerencia'
        WHEN tipo = 'empleados' THEN 'Empleado'
        ELSE 'Cliente'
      END AS rol_legible
    FROM clientes 
    WHERE tipo = 'clientes' 
      AND (
        CONCAT(nombre, ' ', apellido) LIKE CONCAT('%', ?, '%') 
        OR nombre LIKE CONCAT('%', ?, '%') 
        OR apellido LIKE CONCAT('%', ?, '%') 
        OR personCode LIKE CONCAT('%', ?, '%')
      )
    ORDER BY personCode ASC 
    LIMIT 50
");

$stmt->bind_param("ssss", $q, $q, $q, $q);

$stmt->execute();
$resultado = $stmt->get_result();
$clientes = $resultado->fetch_all(MYSQLI_ASSOC);
$stmt->close();

header('Content-Type: application/json');
echo json_encode($clientes);

