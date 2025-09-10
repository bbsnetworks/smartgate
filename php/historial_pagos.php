<?php
require_once 'conexion.php';
header("Content-Type: application/json");

$clienteId = $_GET['id'] ?? null;
if (!$clienteId) {
    echo json_encode(["success" => false, "error" => "Falta el ID del cliente"]);
    exit;
}

$stmt = $conexion->prepare("
    SELECT 
        p.id AS id,                 -- <- ID del pago
        p.cliente_id,               -- <- útil para depurar
        p.fecha_pago,
        p.fecha_aplicada,
        p.fecha_fin,
        p.metodo_pago,
        p.monto,
        p.descuento,
        u.nombre AS usuario_nombre,
        c.telefono
    FROM pagos p
    LEFT JOIN usuarios u ON p.usuario_id = u.id
    LEFT JOIN clientes c ON p.cliente_id = c.id
    WHERE p.cliente_id = ?
    ORDER BY p.fecha_pago DESC
");
$stmt->bind_param("i", $clienteId);
$stmt->execute();
$result = $stmt->get_result();

$pagos = [];
while ($f = $result->fetch_assoc()) {
    $pagos[] = [
        "id"             => (int)$f["id"],          // <- DEVUELVE EL ID
        "cliente_id"     => (int)$f["cliente_id"],
        "fecha_pago"     => $f["fecha_pago"],
        "fecha_aplicada" => $f["fecha_aplicada"],
        "valido_hasta"   => $f["fecha_fin"],
        "metodo"         => $f["metodo_pago"],
        "monto"          => (float)$f["monto"],
        "descuento"      => (float)$f["descuento"],
        "telefono"       => $f["telefono"] ?? '',
        "usuario_nombre" => $f["usuario_nombre"] ?? "Desconocido"
    ];
}

echo json_encode(["success" => true, "pagos" => $pagos]);
