<?php
// php/obtener_tipo_impresora.php

require_once __DIR__ . '/conexion.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$sql = "SELECT tipo_impresora
        FROM config_branding
        WHERE id = 1
        LIMIT 1";

$res = $conexion->query($sql);

if (!$res) {
    http_response_code(500);

    echo json_encode([
        'ok' => false,
        'msg' => 'Error al obtener el tipo de impresora'
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

$row = $res->fetch_assoc();

// 48 mm será nuestro valor seguro por defecto.
$tipoImpresora = $row['tipo_impresora'] ?? '48 mm';

// Protección por si en BD hubiera un valor incorrecto.
if (!in_array($tipoImpresora, ['48 mm', '58 mm'], true)) {
    $tipoImpresora = '48 mm';
}

echo json_encode([
    'ok' => true,
    'tipo_impresora' => $tipoImpresora
], JSON_UNESCAPED_UNICODE);