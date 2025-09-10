<?php
require_once 'conexion.php';
header('Content-Type: application/json');

$accion = $_GET['accion'] ?? '';

if ($accion === 'obtener') {
    obtenerPagos($conexion);
} elseif ($accion === 'eliminar') {
    eliminarPago($conexion);
}elseif ($accion === 'validar_codigo') {
    include 'validar_codigo_admin.php';
    exit;
}else {
    echo json_encode(["success" => false, "error" => "Acción no válida"]);
}

function obtenerPagos($conexion) {
    $input   = json_decode(file_get_contents("php://input"), true);

    $mes     = $conexion->real_escape_string($input['mes'] ?? date('m'));
    $year    = $conexion->real_escape_string($input['year'] ?? date('Y'));
    $search  = $conexion->real_escape_string($input['busqueda'] ?? '');
    $offset  = intval($input['offset'] ?? 0);
    $limit   = intval($input['limit'] ?? 20);

    // SELECT principal
    $sql = "
        SELECT 
            p.venta_id,
            p.fecha_pago,
            p.metodo_pago,
            p.total,
            p.cantidad,
            IFNULL(u.nombre, 'Usuario Eliminado') AS usuario,
            /* ← si no existe el producto, etiqueta */
            IFNULL(prod.nombre, 'Producto eliminado') AS producto_nombre
        FROM pagos_productos p
        /* ← LEFT JOIN para no perder ventas con producto eliminado */
        LEFT JOIN productos prod ON p.producto_id = prod.id
        LEFT JOIN usuarios  u    ON p.usuario_id   = u.id
        WHERE MONTH(p.fecha_pago) = '$mes'
          AND YEAR(p.fecha_pago)  = '$year'
    ";

    if ($search !== '') {
        // Usamos IFNULL/COALESCE también en el filtro para que “Producto eliminado” pueda coincidir
        $sql .= " AND (
            p.venta_id LIKE '%$search%' OR 
            IFNULL(u.nombre, 'Usuario Eliminado') LIKE '%$search%' OR 
            IFNULL(prod.nombre, 'Producto eliminado') LIKE '%$search%'
        )";
    }

    // Conteo total por venta_id (para paginación)
    $countSql = "
        SELECT COUNT(DISTINCT p.venta_id) AS total
        FROM pagos_productos p
        LEFT JOIN productos prod ON p.producto_id = prod.id
        LEFT JOIN usuarios  u    ON p.usuario_id   = u.id
        WHERE MONTH(p.fecha_pago) = '$mes'
          AND YEAR(p.fecha_pago)  = '$year'
    ";

    if ($search !== '') {
        $countSql .= " AND (
            p.venta_id LIKE '%$search%' OR 
            IFNULL(u.nombre, 'Usuario Eliminado') LIKE '%$search%' OR 
            IFNULL(prod.nombre, 'Producto eliminado') LIKE '%$search%'
        )";
    }

    $countResult = $conexion->query($countSql);
    $totalRegistros = $countResult ? ($countResult->fetch_assoc()['total'] ?? 0) : 0;

    $sql .= " ORDER BY p.fecha_pago DESC, p.venta_id DESC LIMIT $offset, $limit";

    $res = $conexion->query($sql);
    if (!$res) {
        echo json_encode(["success" => false, "error" => "Error en la consulta"]);
        return;
    }

    $ventas = [];
    while ($row = $res->fetch_assoc()) {
        $venta_id = $row['venta_id'];
        if (!isset($ventas[$venta_id])) {
            $ventas[$venta_id] = [
                "venta_id"   => $venta_id,
                "fecha_pago" => $row['fecha_pago'],
                "metodo_pago"=> $row['metodo_pago'],
                "usuario"    => $row['usuario'],
                "total"      => 0,
                "productos"  => []
            ];
        }

        $ventas[$venta_id]['productos'][] = [
            "nombre"   => $row['producto_nombre'], // ya viene con 'Producto eliminado' si aplica
            "cantidad" => $row['cantidad'],
            "total"    => number_format($row['total'], 2)
        ];

        $ventas[$venta_id]['total'] += (float)$row['total'];
    }

    echo json_encode([
        "success" => true,
        "pagos"   => array_values($ventas),
        "total"   => $totalRegistros
    ]);
}




function eliminarPago($conexion) {
    $venta_id = $_GET['venta_id'] ?? '';

    if (!$venta_id) {
        echo json_encode(["success" => false, "error" => "Folio inválido"]);
        return;
    }

    // 1️⃣ Recuperar productos y cantidades de la venta
    $stmt = $conexion->prepare("SELECT producto_id, cantidad FROM pagos_productos WHERE venta_id = ?");
    $stmt->bind_param("s", $venta_id);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if ($resultado->num_rows === 0) {
        echo json_encode(["success" => false, "error" => "Venta no encontrada"]);
        return;
    }

    $productos = [];
    while ($row = $resultado->fetch_assoc()) {
        $productos[] = $row; // contiene 'producto_id' y 'cantidad'
    }
    $stmt->close();

    // 2️⃣ Sumar stock a cada producto
    foreach ($productos as $p) {
        $stmt_update = $conexion->prepare("UPDATE productos SET stock = stock + ? WHERE id = ?");
        $stmt_update->bind_param("ii", $p['cantidad'], $p['producto_id']);
        $stmt_update->execute();
        $stmt_update->close();
    }

    // 3️⃣ Eliminar los registros de la venta
    $stmt_delete = $conexion->prepare("DELETE FROM pagos_productos WHERE venta_id = ?");
    $stmt_delete->bind_param("s", $venta_id);
    $stmt_delete->execute();

    if ($stmt_delete->affected_rows > 0) {
        echo json_encode(["success" => true, "msg" => "Venta eliminada y stock restaurado"]);
    } else {
        echo json_encode(["success" => false, "error" => "No se pudo eliminar el pago"]);
    }

    $stmt_delete->close();
}
function validarCodigoAdmin($conexion) {
    $input = json_decode(file_get_contents("php://input"), true);
    $codigo = $input["codigo"] ?? '';

    if (!$codigo || strlen($codigo) !== 10) {
        echo json_encode(["success" => false, "error" => "Código inválido"]);
        return;
    }

    $stmt = $conexion->prepare("SELECT id FROM usuarios WHERE codigo = ? AND rol = 'admin' LIMIT 1");
    $stmt->bind_param("s", $codigo);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($res->num_rows > 0) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "error" => "Código no autorizado"]);
    }

    $stmt->close();
}

