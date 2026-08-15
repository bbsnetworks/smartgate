<?php
// php/obtener_branding.php

require_once __DIR__ . '/conexion.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$defaults = [
    'app_name'        => 'Gym Admin',
    'dashboard_title' => 'Panel de Control',
    'dashboard_sub'   => null,
    'logo_etag'       => null,
    'logo_mime'       => null,
    'mail'            => null,
    'horario'         => null,
    'redes_sociales'  => null,
    'mensaje_ticket'  => null,
    'tipo_impresora' => '48 mm',
    'restringir_movimientos' => 0,
];

$sql = "SELECT
            app_name,
            dashboard_title,
            dashboard_sub,
            logo_etag,
            logo_mime,
            mail,
            horario,
            redes_sociales,
            mensaje_ticket,
            tipo_impresora,
            restringir_movimientos
        FROM config_branding
        WHERE id = 1
        LIMIT 1";

$res = $conexion->query($sql);

if (!$res) {
    http_response_code(500);

    echo json_encode([
        'ok'  => false,
        'msg' => 'Error al obtener la configuración: ' . $conexion->error,
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

$row = $res->fetch_assoc();

if (!$row) {
    // Crea el registro predeterminado si aún no existe.
    $sqlInsert = "INSERT INTO config_branding (
                      id,
                      app_name,
                      dashboard_title,
                      dashboard_sub,
                      mail,
                      horario,
                      redes_sociales,
                      mensaje_ticket,
                      tipo_impresora,
                      restringir_movimientos
                  ) VALUES (
                      1,
                      'Gym Admin',
                      'Panel de Control',
                      NULL,
                      NULL,
                      NULL,
                      NULL,
                      NULL,
                      '48 mm',
                        0
                  )";

    if (!$conexion->query($sqlInsert)) {
        http_response_code(500);

        echo json_encode([
            'ok'  => false,
            'msg' => 'No se pudo inicializar config_branding: '
                . $conexion->error,
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }

    $row = $defaults;
}

echo json_encode([
    'ok'              => true,
    'app_name'        => $row['app_name'],
    'dashboard_title' => $row['dashboard_title'],
    'dashboard_sub'   => $row['dashboard_sub'],
    'logo_etag'       => $row['logo_etag'],
    'logo_mime'       => $row['logo_mime'],
    'mail'            => $row['mail'],
    'horario'         => $row['horario'],
    'redes_sociales'  => $row['redes_sociales'],
    'mensaje_ticket'  => $row['mensaje_ticket'],
    'tipo_impresora'  => $row['tipo_impresora'] ?? '48 mm',
    'restringir_movimientos' => $row['restringir_movimientos'] ?? 0,
], JSON_UNESCAPED_UNICODE);