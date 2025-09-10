<?php
require_once 'conexion.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$codigo = $data['codigo'] ?? '';

if (strlen($codigo) !== 10) {
    echo json_encode(['success' => false, 'error' => 'Código inválido']);
    exit;
}

$stmt = $conexion->prepare("SELECT id FROM usuarios WHERE rol = 'admin' AND codigo = ? LIMIT 1");
$stmt->bind_param("s", $codigo);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows > 0) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Código incorrecto o no autorizado']);
}
$stmt->close();
