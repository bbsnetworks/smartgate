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
    $payload = [
        "pageNo" => 1,
        "pageSize" => 10,
        "type" => 1
    ];
    
    $response = Visitor::getGroups($config, $payload);

    // 🔹 Asegurar que no haya salida antes del JSON
    ob_clean(); // Limpia cualquier salida previa

    // 🔹 Verificar si la respuesta de la API es válida
    if (!isset($response["code"]) || $response["code"] !== "0") {
        echo json_encode(["error" => "Error en la API: " . ($response["msg"] ?? "Respuesta no válida.")]);
        exit();
    }

    // 🔹 Extraer solo la lista de grupos
    $groupList = $response["data"]["list"] ?? [];

    // 🔹 Enviar solo el JSON limpio
    echo json_encode(["list" => $groupList], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>

