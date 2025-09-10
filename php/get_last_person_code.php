<?php
require_once 'conexion.php';

// Obtener el valor actual de la secuencia sin modificarla
$query = "SELECT ultimo_codigo FROM secuencias WHERE nombre = 'clientes'";
$result = $conexion->query($query);

if ($result && $row = $result->fetch_assoc()) {
    $nextCode = str_pad($row['ultimo_codigo'] + 1, 8, "0", STR_PAD_LEFT);
    echo json_encode(["nextCode" => $nextCode]);
} else {
    // Si no existe el registro, asumimos que comenzamos desde 1
    echo json_encode(["nextCode" => "00000001"]);
}
?>
