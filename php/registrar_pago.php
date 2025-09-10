<?php
require_once 'conexion.php';
date_default_timezone_set("America/Mexico_City");
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$cliente_id = $data["cliente_id"] ?? null;
$metodo = $data["metodo"] ?? "efectivo";
$descuento = $data["descuento"] ?? 0;
$fecha_inicio = $data["fecha_inicio"] ?? null;
$fecha_fin = $data["fecha_fin"] ?? null;

if (!$cliente_id || !$fecha_inicio || !$fecha_fin) {
    echo json_encode(["success" => false, "error" => "Faltan fechas o datos obligatorios."]);
    exit();
}

// Registrar pago
$stmt = $conexion->prepare("INSERT INTO pagos (cliente_id, usuario_id, fecha_pago, fecha_aplicada, fecha_fin, monto, metodo_pago, observaciones)
VALUES (?, ?, NOW(), ?, ?, ?, ?, '')");

$usuario_id = $_SESSION['usuario']['id']; // o ajústalo si lo recibes por POST

$monto = 0; // puedes ajustar si se calcula en backend
$stmt->bind_param("iisssd", $cliente_id, $usuario_id, $fecha_inicio, $fecha_fin, $monto, $metodo);
$stmt->execute();
$stmt->close();

// Actualizar campo Fin en clientes
$stmt = $conexion->prepare("UPDATE clientes SET Fin = ? WHERE id = ?");
$stmt->bind_param("si", $fecha_fin, $cliente_id);
$stmt->execute();
$stmt->close();

echo json_encode(["success" => true, "msg" => "Pago registrado. Acceso extendido hasta: " . $fecha_fin]);
