<?php
require_once '../php/conexion.php';
header("Content-Type: application/json");

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['accion']) && $_GET['accion'] === 'validar_codigo') {
            include 'validar_codigo_admin.php';
            exit;
        }
        obtenerProductos($conexion);
        break;
    case 'POST':
        agregarProducto($conexion);
        break;
    case 'PUT':
        parse_str(file_get_contents("php://input"), $_PUT);
        $_POST = $_PUT;
        editarProducto($conexion);
        break;
    case 'DELETE':
        parse_str(file_get_contents("php://input"), $_DELETE);
        $_POST = $_DELETE;
        eliminarProducto($conexion);
        break;
    default:
        echo json_encode(["success" => false, "error" => "Método no soportado"]);
}

function obtenerProductos($conexion) {
    if (isset($_GET['id'])) {
        $id = intval($_GET['id']);
        $stmt = $conexion->prepare("SELECT id, codigo, nombre, descripcion, precio, stock, categoria_id FROM productos WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $res = $stmt->get_result();
        $producto = $res->fetch_assoc();

        if ($producto) {
            echo json_encode($producto);
        } else {
            echo json_encode(["error" => "Producto no encontrado"]);
        }
        return;
    }

     $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    $busqueda = isset($_GET['busqueda']) ? trim($_GET['busqueda']) : '';

    $productos = [];

    // Consulta de productos
    $sql = "SELECT p.id, p.codigo, p.nombre, p.descripcion, p.stock, p.precio, c.nombre AS categoria
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria_id = c.id";

    $params = [];
    $types = "";

    if ($busqueda !== '') {
        $sql .= " WHERE p.nombre LIKE ? OR p.descripcion LIKE ? OR p.codigo LIKE ? OR c.nombre LIKE ?";
        $busquedaParam = "%$busqueda%";
        $params = [$busquedaParam, $busquedaParam, $busquedaParam, $busquedaParam];
        $types = "ssss";
    }

    $sqlConLimite = $sql . " LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";

    $stmt = $conexion->prepare($sqlConLimite);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $productos[] = $row;
    }

    // Obtener total sin paginación
    $total = 0;
    $sqlTotal = "SELECT COUNT(*) as total FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id";
    if ($busqueda !== '') {
        $sqlTotal .= " WHERE p.nombre LIKE ? OR p.descripcion LIKE ? OR p.codigo LIKE ? OR c.nombre LIKE ?";
        $stmtTotal = $conexion->prepare($sqlTotal);
        $stmtTotal->bind_param("ssss", $busquedaParam, $busquedaParam, $busquedaParam, $busquedaParam);
    } else {
        $stmtTotal = $conexion->prepare($sqlTotal);
    }

    $stmtTotal->execute();
    $resTotal = $stmtTotal->get_result();
    $total = $resTotal->fetch_assoc()['total'];

    echo json_encode(["success" => true, "productos" => $productos, "total" => $total]);
}

function agregarProducto($conexion) {
    $data = json_decode(file_get_contents("php://input"), true);

    $codigo = trim($data['codigo'] ?? '');
    $nombre = trim($data['nombre'] ?? '');
    $descripcion = trim($data['descripcion'] ?? '');
    $precio = floatval($data['precio'] ?? -1);
    $stock = intval($data['stock'] ?? -1);
    $categoria_id = intval($data['categoria_id'] ?? 0);

    if (!$codigo || !$nombre || !$descripcion || $precio <= 0 || $stock < 0 || $categoria_id <= 0) {
        echo json_encode(["success" => false, "error" => "Todos los campos son obligatorios y deben ser válidos"]);
        return;
    }

    $stmt = $conexion->prepare("SELECT id FROM productos WHERE codigo = ?");
    $stmt->bind_param("s", $codigo);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows > 0) {
        echo json_encode(["success" => false, "error" => "Ya existe un producto con ese código de barras"]);
        return;
    }
    $stmt->close();

    $stmt = $conexion->prepare("SELECT id FROM categorias WHERE id = ?");
    $stmt->bind_param("i", $categoria_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) {
        echo json_encode(["success" => false, "error" => "Categoría inválida"]);
        return;
    }
    $stmt->close();

    $stmt = $conexion->prepare("INSERT INTO productos (nombre, codigo, descripcion, precio, stock, categoria_id) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssdis", $nombre, $codigo, $descripcion, $precio, $stock, $categoria_id);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode(["success" => true, "message" => "Producto agregado correctamente"]);
    } else {
        echo json_encode(["success" => false, "error" => "Error al guardar el producto"]);
    }

    $stmt->close();
}

function editarProducto($conexion) {
    $data = json_decode(file_get_contents("php://input"), true);

    $id = intval($data['id'] ?? 0);
    $codigo = trim($data['codigo'] ?? '');
    $nombre = trim($data['nombre'] ?? '');
    $descripcion = trim($data['descripcion'] ?? '');
    $precio = floatval($data['precio'] ?? -1);
    $stock = intval($data['stock'] ?? -1);
    $categoria_id = intval($data['categoria_id'] ?? 0);

    if ($id <= 0) {
        echo json_encode(["success" => false, "error" => "ID inválido"]);
        return;
    }

    $stmtCodigo = $conexion->prepare("SELECT id FROM productos WHERE codigo = ? AND id != ?");
    $stmtCodigo->bind_param("si", $codigo, $id);
    $stmtCodigo->execute();
    $resCodigo = $stmtCodigo->get_result();
    if ($resCodigo->num_rows > 0) {
        echo json_encode(["success" => false, "error" => "Este código ya está en uso por otro producto"]);
        return;
    }
    $stmtCodigo->close();

    if ($nombre === '' || strlen($nombre) > 100) {
        echo json_encode(["success" => false, "error" => "Nombre inválido"]);
        return;
    }

    if ($descripcion === '' || strlen($descripcion) > 1000) {
        echo json_encode(["success" => false, "error" => "Descripción inválida"]);
        return;
    }

    if ($precio <= 0) {
        echo json_encode(["success" => false, "error" => "Precio debe ser mayor a 0"]);
        return;
    }

    if ($stock < 0) {
        echo json_encode(["success" => false, "error" => "Stock no puede ser negativo"]);
        return;
    }

    $stmtCheck = $conexion->prepare("SELECT id FROM categorias WHERE id = ?");
    $stmtCheck->bind_param("i", $categoria_id);
    $stmtCheck->execute();
    $res = $stmtCheck->get_result();
    if ($res->num_rows === 0) {
        echo json_encode(["success" => false, "error" => "Categoría no válida"]);
        return;
    }
    $stmtCheck->close();

    $stmt = $conexion->prepare("UPDATE productos SET codigo = ?, nombre = ?, descripcion = ?, precio = ?, stock = ?, categoria_id = ? WHERE id = ?");
    $stmt->bind_param("sssdisi", $codigo, $nombre, $descripcion, $precio, $stock, $categoria_id, $id);
    $stmt->execute();

    if ($stmt->affected_rows >= 0) {
        echo json_encode(["success" => true, "msg" => "Producto actualizado"]);
    } else {
        echo json_encode(["success" => false, "error" => "No se pudo actualizar"]);
    }

    $stmt->close();
}

function eliminarProducto($conexion) {
    $id = intval($_GET['id'] ?? 0); 
    if (!$id) {
        echo json_encode(["success" => false, "error" => "ID no válido"]);
        return;
    }

    $stmt = $conexion->prepare("DELETE FROM productos WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo json_encode(["success" => true, "message" => "Producto eliminado"]);
    } else {
        echo json_encode(["success" => false, "error" => "No se pudo eliminar"]);
    }
    $stmt->close();
}
