<?php
require_once 'conexion.php';
require_once 'Visitor.php';

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$personId = $data["personId"] ?? null;

if (!$personId) {
    echo json_encode(["error" => "Falta el ID del usuario."]);
    exit();
}

$config = (object) [
    "userKey" => "21660945",
    "userSecret" => "93iLwvnQkXAvlHw8wbQz",
    "urlHikCentralAPI" => "http://127.0.0.1:9016"
];

try {
    $response = Visitor::deleteUser($config, $personId); // usa personId ahora

    if ($response["code"] === "0") {
        $stmt = $conexion->prepare("DELETE FROM clientes WHERE data = ?");
        $stmt->bind_param("i", $personId);
        $stmt->execute();
        $stmt->close();

        $deviceResponse = Visitor::sendUserToDevice($config);

        echo json_encode([
            "msg" => "Usuario eliminado correctamente.",
            "code" => 0,
            "device_response" => $deviceResponse
        ]);
    } else {
        echo json_encode([
            "error" => "Error al eliminar en HikCentral",
            "code" => $response["code"],
            "msg" => $response["msg"]
        ]);
    }
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}


