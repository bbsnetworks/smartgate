<?php
require 'conexion.php'; // Asegúrate de tener la conexión aquí

header('Content-Type: application/json');

// Obtiene el logo más reciente
$sql = "SELECT logo_blob, logo_mime FROM config_branding ORDER BY updated_at DESC LIMIT 1";
$result = $conexion->query($sql);

if ($result && $row = $result->fetch_assoc()) {
    $mime = $row['logo_mime'];
    $blob = $row['logo_blob'];
    $base64 = base64_encode($blob);
    echo json_encode([
        'success' => true,
        'mime' => $mime,
        'base64' => "data:$mime;base64,$base64"
    ]);
} else {
    echo json_encode([
        'success' => false,
        'error' => 'No se encontró el logo.'
    ]);
}
