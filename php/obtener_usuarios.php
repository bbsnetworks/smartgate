<?php
header('Content-Type: application/json');

// 1) Garantiza sesión primero
require_once 'verificar_sesion.php';

// 2) Abre SIEMPRE una conexión fresca en este endpoint
//    (usar require en lugar de require_once re-ejecuta conexion.php)
require 'conexion.php';

// 2.1) Si por cualquier razón llegara cerrada, reintenta
if (!isset($conexion) || !($conexion instanceof mysqli) || !@mysqli_ping($conexion)) {
    require 'conexion.php';
}

$rol = $_SESSION['usuario']['rol'] ?? '';

if ($rol === 'root') {
    $sql = "SELECT id, nombre, correo, rol, codigo FROM usuarios ORDER BY id DESC";
} elseif ($rol === 'admin') {
    $sql = "SELECT id, nombre, correo, rol, codigo FROM usuarios WHERE rol IN ('admin','worker') ORDER BY id DESC";
} else {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'No autorizado']);
    exit;
}

$res = $conexion->query($sql);
if (!$res) {
    echo json_encode(['success' => false, 'error' => $conexion->error]);
    exit;
}

$usuarios = [];
while ($row = $res->fetch_assoc()) {
    $usuarios[] = $row;
}

echo json_encode(['success' => true, 'usuarios' => $usuarios]);

