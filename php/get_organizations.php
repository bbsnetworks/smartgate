<?php
header("Access-Control-Allow-Origin: *"); // Permitir CORS
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Deshabilitar salida de errores para evitar contenido adicional
error_reporting(0);
ini_set('display_errors', 0);

require_once 'Visitor.php';

try {
    $response = Visitor::getOrganizations($config);

    // Asegurarse de que no haya salida antes del JSON
    ob_clean(); // Limpia cualquier salida previa
    echo json_encode($response["data"], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>



