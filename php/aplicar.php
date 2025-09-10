<?php
session_start();
require_once '../php/Visitor.php';

try {
    $response = Visitor::sendUserToDevice($config);
    $_SESSION['cambios_pendientes'] = false;

    echo json_encode([
        "success" => true,
        "msg" => "Cambios aplicados correctamente al dispositivo."
    ]);
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "error" => "Error al aplicar cambios: " . $e->getMessage()
    ]);
}
?>
