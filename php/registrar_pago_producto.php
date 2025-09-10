<?php
require_once 'conexion.php';
date_default_timezone_set('America/Mexico_City');
session_start();

header("Content-Type: application/json");

// Validar sesión
if (!isset($_SESSION['usuario']['id'])) {
    echo json_encode(["success" => false, "error" => "Sesión no válida."]);
    exit;
}

$usuario_id = intval($_SESSION['usuario']['id']);
$nombre_usuario = $_SESSION['usuario']['nombre'] ?? 'Usuario';
$fecha_pago = date("Y-m-d H:i:s");
$venta_id = uniqid();

// ✅ Obtener datos del cuerpo del request
$data = json_decode(file_get_contents(filename: "php://input"), true);
$productos = $data['productos'] ?? [];
$metodo_pago = $data['metodo_pago'] ?? 'Efectivo';

if (!$productos || !is_array($productos)) {
    echo json_encode(["success" => false, "error" => "Datos de productos inválidos."]);
    exit;
}

$errores = [];

foreach ($productos as $producto) {
    $producto_id = intval($producto['id'] ?? 0);
    $cantidad = intval($producto['cantidad'] ?? 0);
    $precio = floatval($producto['precio'] ?? 0);
    $total = $precio * $cantidad;

    if ($producto_id === 0 || $cantidad <= 0 || $precio <= 0) {
        $errores[] = "Datos incompletos para producto";
        continue;
    }

    // 1️⃣ Verificar stock
    $stmt_check = $conexion->prepare("SELECT nombre, stock FROM productos WHERE id = ?");
    $stmt_check->bind_param("i", $producto_id);
    $stmt_check->execute();
    $stmt_check->bind_result($nombre_producto, $stock_actual);
    $stmt_check->fetch();
    $stmt_check->close();

    if ($stock_actual === null) {
        $errores[] = "El producto ID $producto_id no existe.";
        continue;
    }

    if ($stock_actual < $cantidad) {
        $errores[] = "Stock insuficiente para '$nombre_producto' (disponible: $stock_actual, solicitado: $cantidad)";
        continue;
    }

    // 2️⃣ Insertar en pagos_productos
    $stmt = $conexion->prepare("INSERT INTO pagos_productos (venta_id, producto_id, cantidad, total, metodo_pago, fecha_pago, usuario_id, observaciones)
                                VALUES (?, ?, ?, ?, ?, ?, ?, NULL)");
    $stmt->bind_param("siidssi", $venta_id, $producto_id, $cantidad, $total, $metodo_pago, $fecha_pago, $usuario_id);
    if (!$stmt->execute()) {
        $errores[] = "Error al guardar '$nombre_producto' en la venta.";
        continue;
    }

    // 3️⃣ Restar stock SOLO si el insert fue exitoso
    $update = $conexion->prepare("UPDATE productos SET stock = stock - ? WHERE id = ?");
    $update->bind_param("ii", $cantidad, $producto_id);
    if (!$update->execute()) {
        $errores[] = "Error al actualizar el stock de '$nombre_producto'.";
    }
}

if (count($errores) === 0) {
    echo json_encode([
        "success" => true,
        "venta_id" => $venta_id,
        "usuario" => $nombre_usuario,
        "fecha_pago" => $fecha_pago  // ✅ Agregamos esta línea
    ]);
} else {
    echo json_encode([
        "success" => false,
        "error" => implode("<br>", $errores)
    ]);
}




