<?php
// php/actualizar_branding.php

require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/verificar_sesion.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

/**
 * Devuelve un error en formato JSON y termina la ejecución.
 */
function responderError(int $codigo, string $mensaje): void
{
    http_response_code($codigo);

    echo json_encode([
        'ok'  => false,
        'msg' => $mensaje,
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

// Solo los administradores y usuarios root pueden modificar el branding.
$rol = $_SESSION['usuario']['rol'] ?? null;

if (!in_array($rol, ['admin', 'root'], true)) {
    responderError(403, 'No autorizado');
}

// Información general.
$app_name = trim($_POST['app_name'] ?? '');
$dashboard_title = trim($_POST['dashboard_title'] ?? '');
$dashboard_sub = trim($_POST['dashboard_sub'] ?? '');

// Información para los tickets.
$horario = trim($_POST['horario'] ?? '');
$redes_sociales = trim($_POST['redes_sociales'] ?? '');
$mensaje_ticket = trim($_POST['mensaje_ticket'] ?? '');

// Validación de campos obligatorios.
if ($app_name === '') {
    responderError(
        400,
        'El nombre de la aplicación es obligatorio'
    );
}

if ($dashboard_title === '') {
    responderError(
        400,
        'El título del dashboard es obligatorio'
    );
}

// Validaciones acordes al tamaño de las columnas.
if (mb_strlen($app_name) > 120) {
    responderError(
        400,
        'El nombre de la aplicación no puede superar 120 caracteres'
    );
}

if (mb_strlen($dashboard_title) > 160) {
    responderError(
        400,
        'El título del dashboard no puede superar 160 caracteres'
    );
}

if (mb_strlen($dashboard_sub) > 200) {
    responderError(
        400,
        'El subtítulo no puede superar 200 caracteres'
    );
}

if (mb_strlen($redes_sociales) > 255) {
    responderError(
        400,
        'El texto de redes sociales no puede superar 255 caracteres'
    );
}

if (mb_strlen($mensaje_ticket) > 255) {
    responderError(
        400,
        'El mensaje para tickets no puede superar 255 caracteres'
    );
}

// Los campos opcionales vacíos se almacenan como NULL.
$dashboard_sub = $dashboard_sub !== ''
    ? $dashboard_sub
    : null;

$horario = $horario !== ''
    ? $horario
    : null;

$redes_sociales = $redes_sociales !== ''
    ? $redes_sociales
    : null;

$mensaje_ticket = $mensaje_ticket !== ''
    ? $mensaje_ticket
    : null;

// Validación del logotipo.
$hasFile = isset($_FILES['logo'])
    && is_uploaded_file($_FILES['logo']['tmp_name']);

$maxBytes = 2 * 1024 * 1024; // 2 MB

$allowedMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
];

$blob = null;
$mime = null;
$etag = null;

if ($hasFile) {
    if ($_FILES['logo']['error'] !== UPLOAD_ERR_OK) {
        responderError(
            400,
            'Ocurrió un error al subir el logotipo'
        );
    }

    $tmp = $_FILES['logo']['tmp_name'];
    $size = (int) filesize($tmp);

    if ($size <= 0) {
        responderError(
            400,
            'El archivo de imagen es inválido'
        );
    }

    if ($size > $maxBytes) {
        responderError(
            400,
            'La imagen supera el límite de 2 MB'
        );
    }

    // Detecta el tipo real del archivo, no solo su extensión.
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmp);

    if ($mime === false) {
        $mime = mime_content_type($tmp);
    }

    if (!in_array($mime, $allowedMimeTypes, true)) {
        responderError(
            400,
            'Tipo de imagen no permitido. Usa PNG, JPG, WEBP o GIF.'
        );
    }

    $blob = file_get_contents($tmp);

    if ($blob === false) {
        responderError(
            500,
            'No se pudo leer el archivo del logotipo'
        );
    }

    // Cambia cuando se carga un logo distinto y evita problemas de caché.
    $etag = sha1($blob);
}

// Usuario que realiza la actualización.
$updated_by = isset($_SESSION['usuario']['id'])
    ? (int) $_SESSION['usuario']['id']
    : null;

/*
 * Los campos de texto se actualizan siempre, incluso si son NULL.
 * Esto permite borrar desde el modal valores guardados anteriormente.
 */
$sql = "UPDATE config_branding
        SET app_name = ?,
            dashboard_title = ?,
            dashboard_sub = ?,
            horario = ?,
            redes_sociales = ?,
            mensaje_ticket = ?,
            updated_by = ?,
            updated_at = NOW()";

$types = 'ssssssi';

$params = [
    $app_name,
    $dashboard_title,
    $dashboard_sub,
    $horario,
    $redes_sociales,
    $mensaje_ticket,
    $updated_by,
];

// El logo solo se reemplaza si el usuario seleccionó uno nuevo.
if ($hasFile) {
    $sql .= ",
            logo_blob = ?,
            logo_mime = ?,
            logo_etag = ?";

    $types .= 'bss';

    $params[] = $blob;
    $params[] = $mime;
    $params[] = $etag;

    // Posición 0-based del parámetro correspondiente al BLOB.
    $blobIndex = count($params) - 3;
}

$sql .= " WHERE id = 1";

$stmt = $conexion->prepare($sql);

if (!$stmt) {
    responderError(
        500,
        'Error de preparación SQL: ' . $conexion->error
    );
}

// mysqli necesita recibir los valores de bind_param por referencia.
$bindParams = [];
$bindParams[] = &$types;

foreach ($params as $index => $value) {
    $bindParams[] = &$params[$index];
}

if (!call_user_func_array([$stmt, 'bind_param'], $bindParams)) {
    responderError(
        500,
        'No se pudieron vincular los datos: ' . $stmt->error
    );
}

if ($hasFile) {
    $stmt->send_long_data($blobIndex, $blob);
}

if (!$stmt->execute()) {
    responderError(
        500,
        'Error al actualizar la configuración: ' . $stmt->error
    );
}

/*
 * affected_rows puede ser 0 cuando se envían los mismos valores.
 * Solo será un error si el registro con id 1 realmente no existe.
 */
if ($stmt->affected_rows === 0) {
    $existe = $conexion->query(
        "SELECT id
         FROM config_branding
         WHERE id = 1
         LIMIT 1"
    );

    if (!$existe || $existe->num_rows === 0) {
        $stmt->close();

        responderError(
            404,
            'No existe el registro de configuración con ID 1'
        );
    }
}

$stmt->close();

echo json_encode([
    'ok'   => true,
    'msg'  => 'Configuración actualizada correctamente',
    'etag' => $etag,
], JSON_UNESCAPED_UNICODE);