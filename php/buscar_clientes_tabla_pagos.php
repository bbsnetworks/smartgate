<?php
require_once 'conexion.php';

$q     = $_GET['q'] ?? '';
$page  = max(1, intval($_GET['page'] ?? 1));
$limit = 10;
$offset = ($page - 1) * $limit;

$clientes = [];
$total    = 0;

if ($q !== '') {
    // -------- Con búsqueda --------
    $like = "%" . $q . "%";

    // Total
    $stmt = $conexion->prepare("
        SELECT COUNT(*) as total
        FROM clientes
        WHERE tipo = 'clientes'
          AND (
            nombre LIKE ? 
            OR apellido LIKE ? 
            OR CONCAT(nombre,' ',apellido) LIKE ? 
            OR telefono LIKE ?
          )
    ");
    $stmt->bind_param("ssss", $like, $like, $like, $like);
    $stmt->execute();
    $total = (int)($stmt->get_result()->fetch_assoc()['total'] ?? 0);
    $stmt->close();

    // Resultados paginados
    $stmt = $conexion->prepare("
        SELECT id, nombre, apellido, telefono, Inicio, Fin
        FROM clientes
        WHERE tipo = 'clientes'
          AND (
            nombre LIKE ? 
            OR apellido LIKE ? 
            OR CONCAT(nombre,' ',apellido) LIKE ? 
            OR telefono LIKE ?
          )
        ORDER BY nombre ASC, apellido ASC, id ASC
        LIMIT ? OFFSET ?
    ");
    $stmt->bind_param("ssssii", $like, $like, $like, $like, $limit, $offset);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $clientes[] = $row;
    }
    $stmt->close();

} else {
    // -------- Sin búsqueda --------
    $stmt = $conexion->prepare("
        SELECT COUNT(*) as total
        FROM clientes
        WHERE tipo = 'clientes'
    ");
    $stmt->execute();
    $total = (int)($stmt->get_result()->fetch_assoc()['total'] ?? 0);
    $stmt->close();

    $stmt = $conexion->prepare("
        SELECT id, nombre, apellido, telefono, Inicio, Fin
        FROM clientes
        WHERE tipo = 'clientes'
        ORDER BY nombre ASC, apellido ASC, id ASC
        LIMIT ? OFFSET ?
    ");
    $stmt->bind_param("ii", $limit, $offset);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $clientes[] = $row;
    }
    $stmt->close();
}

echo json_encode([
    'clientes' => $clientes,
    'total'    => $total,
    'limit'    => $limit
]);
