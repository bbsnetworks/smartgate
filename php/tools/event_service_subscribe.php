<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../verificar_sesion.php';
require_once __DIR__ . '/../Visitor.php';

try {
    $config = api_cfg();
    if (!$config) throw new Exception('Falta configuración de API (Dashboard → Configurar API).');

    $eventTypes = [196893,197151,197384,197633];
    $eventDest  = "http://127.0.0.1:8080/smartgate_eventos/eventRcv.php";
    $passBack   = 1;

    $resp = Visitor::eventServiceSubscribe($config, $eventTypes, $eventDest, $passBack);

    echo json_encode([
        "ok" => true,
        "raw" => $resp
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
