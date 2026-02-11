<?php
require_once 'conexion.php';
header('Content-Type: application/json; charset=utf-8');

$puerta = $_GET['puerta'] ?? 'principal';

$stmt = $conexion->prepare("
  SELECT doorIndexCode
  FROM puertas_codigos_validos
  WHERE puerta = ?
    AND activo = 1
    AND fuente = 'descubierto'
  ORDER BY id ASC
  LIMIT 2
");
$stmt->bind_param("s", $puerta);
$stmt->execute();
$res = $stmt->get_result();

$codes = [];
while ($r = $res->fetch_assoc()) {
  $codes[] = (string)$r['doorIndexCode'];
}
$stmt->close();

echo json_encode([
  "success" => true,
  "puerta" => $puerta,
  "count" => count($codes),
  "codes" => $codes
], JSON_UNESCAPED_UNICODE);