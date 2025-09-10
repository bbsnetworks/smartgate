<?php
session_start();
require_once 'conexion.php';
header('Content-Type: application/json');

// Verifica sesión y rol actual (prevención básica)
$rolActual = $_SESSION['usuario']['rol'] ?? null;
if (!$rolActual) {
    echo json_encode(['success' => false, 'error' => 'No autenticado.']);
    exit;
}

// Lee el payload
$data = json_decode(file_get_contents("php://input"), true);
$id = isset($data['id']) ? (int)$data['id'] : 0;

if ($id <= 0) {
    echo json_encode(['success' => false, 'error' => 'ID no proporcionado o inválido.']);
    exit;
}

// 1) Obtén el rol del usuario objetivo
$stmt = $conexion->prepare("SELECT rol FROM usuarios WHERE id = ?");
if (!$stmt) {
    echo json_encode(['success' => false, 'error' => 'Error de preparación (SELECT).']);
    exit;
}
$stmt->bind_param("i", $id);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows === 0) {
    $stmt->close();
    echo json_encode(['success' => false, 'error' => 'Usuario no encontrado.']);
    exit;
}

$row = $res->fetch_assoc();
$rolObjetivo = $row['rol'] ?? '';
$stmt->close();

// 2) Regla: admin/worker NO pueden eliminar usuarios root
if ($rolObjetivo === 'root' && $rolActual !== 'root') {
    echo json_encode([
        'success' => false,
        'error' => 'Solo un usuario root puede eliminar usuarios root.'
    ]);
    exit;
}

// (Opcional recomendado) Evitar que un usuario se elimine a sí mismo
// if ($id === (int)($_SESSION['usuario']['id'] ?? 0)) {
//     echo json_encode(['success' => false, 'error' => 'No puedes eliminar tu propio usuario.']);
//     exit;
// }

// 3) Ejecuta la eliminación (o cambia por borrado lógico si así lo manejas)
$stmt = $conexion->prepare("DELETE FROM usuarios WHERE id = ?");
if (!$stmt) {
    echo json_encode(['success' => false, 'error' => 'Error de preparación (DELETE).']);
    exit;
}
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => $stmt->error]);
}
$stmt->close();
