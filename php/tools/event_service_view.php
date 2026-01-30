<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../verificar_sesion.php';
require_once __DIR__ . '/../Visitor.php';

try {
    $config = api_cfg();
    if (!$config) throw new Exception('Falta configuración de API (Dashboard → Configurar API).');

    $resp = Visitor::eventServiceView($config);

    // Normaliza salida para el frontend
    $detail = $resp['data']['detail'] ?? [];
    $first  = $detail[0] ?? null;

    echo json_encode([
        "ok" => true,
        "raw" => $resp,
        "eventDest" => $first['eventDest'] ?? null,
        "eventTypes" => $first['eventTypes'] ?? [],
        "passBack" => $first['passBack'] ?? null
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
