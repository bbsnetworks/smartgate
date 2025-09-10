<?php
require_once 'conexion.php';

$q = $_GET['q'] ?? '';
$page = intval($_GET['page'] ?? 1);
$limit = 10;
$offset = ($page - 1) * $limit;

$q = $conexion->real_escape_string($q);
$where = "";

if ($q !== '') {
  $where = "AND (CONCAT_WS(' ', nombre, apellido) LIKE '%$q%' OR telefono LIKE '%$q%')";
}

// Obtener total
$totalQuery = $conexion->query("SELECT COUNT(*) as total FROM clientes WHERE tipo = 'clientes' $where");
$total = $totalQuery->fetch_assoc()['total'] ?? 0;

// Obtener resultados paginados
$sql = "SELECT * FROM clientes WHERE tipo = 'clientes' $where ORDER BY nombre ASC LIMIT $limit OFFSET $offset";
$res = $conexion->query($sql);

$clientes = [];
while ($row = $res->fetch_assoc()) {
  $clientes[] = $row;
}

echo json_encode([
  'clientes' => $clientes,
  'total' => $total,
  'limit' => $limit
]);
