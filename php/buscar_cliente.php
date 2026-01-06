<?php
require_once 'conexion.php';
header('Content-Type: application/json');

$q = $_GET['q'] ?? '';

if (empty($q)) {
    echo json_encode([]);
    exit();
}

$stmt = $conexion->prepare("
  SELECT id, nombre, apellido, telefono, face, face_icon,comentarios
  FROM clientes
  WHERE tipo = 'clientes'
    AND (
      nombre LIKE CONCAT('%', ?, '%')
      OR apellido LIKE CONCAT('%', ?, '%')
      OR CONCAT(nombre, ' ', apellido) LIKE CONCAT('%', ?, '%')
    )
  ORDER BY nombre ASC, apellido ASC, id ASC
");
$stmt->bind_param("sss", $q, $q, $q);
$stmt->execute();
$resultado = $stmt->get_result();

$clientes = [];
while ($c = $resultado->fetch_assoc()) {
    $clientes[] = [
  "id" => (int)$c["id"],
  "nombre" => $c["nombre"],
  "apellido" => $c["apellido"],
  "telefono" => $c["telefono"],
  "comentarios" => $c["comentarios"],
  "foto" => !empty($c["face"]) ? "data:image/jpeg;base64,".$c["face"] : null,
  "foto_icono" => !empty($c["face_icon"]) ? "data:image/jpeg;base64,".$c["face_icon"] : null,
];

}

echo json_encode($clientes);



