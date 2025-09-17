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

// Credenciales desde DB
$config = api_cfg();
if (!$config) {
  http_response_code(500);
  echo json_encode(["error" => "Falta configuración de API. Ve a Dashboard → Configurar API HikCentral."]);
  exit;
}

try {
    $response = Visitor::deleteUser($config, $personId); // usa personId ahora

        if (isset($response["code"]) && (string)$response["code"] === "0") {
        // En tu BD, 'data' es un entero (id de HikCentral) según add_user.php
        $pid = (int)$personId;
        $stmt = $conexion->prepare("DELETE FROM clientes WHERE data = ?");
        $stmt->bind_param("i", $pid);
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
            "code" => $response["code"] ?? null,
            "msg" => $response["msg"] ?? "Sin mensaje"
        ]);
    }
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}


