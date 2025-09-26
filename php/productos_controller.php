<?php
require_once '../php/conexion.php';
require_once '../php/verificar_sesion.php'; // para tomar usuario_id si está
header("Content-Type: application/json");

// Utilidad: id de usuario
function current_user_id() {
  return isset($_SESSION['usuario']['id']) ? (int)$_SESSION['usuario']['id'] : null;
}

// === Utilidad: aplicar movimiento atómico (MySQLi) ===
function aplicarMovimientoInventario($conexion, $producto_id, $tipo, $cantidad, $nota = '', $usuario_id = null) {
  // signo
  $signo = in_array($tipo, ['ingreso','ajuste+','devolucion+']) ? +1 : -1;

  $conexion->begin_transaction();
  try {
    // 1) lock fila del producto
    $stmt = $conexion->prepare("SELECT codigo, nombre, stock FROM productos WHERE id = ? FOR UPDATE");
    $stmt->bind_param("i", $producto_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $p = $res->fetch_assoc();
    if (!$p) { throw new Exception("Producto no encontrado"); }
    $codigo = $p['codigo'];
    $nombre = $p['nombre'];
    $stockActual = (float)$p['stock'];

    // 2) nuevo stock
    $nuevoStock = $stockActual + ($signo * (float)$cantidad);
    if ($nuevoStock < 0) { throw new Exception("Stock insuficiente"); }

    // 3) inserta movimiento (snapshot de código/nombre)
    $sqlMov = "INSERT INTO inventario_movimientos
      (producto_id, producto_codigo, producto_nombre, tipo, cantidad, costo_unitario, stock_despues, ref_tabla, ref_id, usuario_id, almacen_id, nota)
      VALUES (?, ?, ?, ?, ?, NULL, ?, 'admin_productos', NULL, ?, NULL, ?)";
    $stmtI = $conexion->prepare($sqlMov);
    $stmtI->bind_param("isssddis",
      $producto_id, $codigo, $nombre, $tipo, $cantidad, $nuevoStock, $usuario_id, $nota
    );
    $stmtI->execute();

    // 4) actualiza stock del producto
    $stmtU = $conexion->prepare("UPDATE productos SET stock = ? WHERE id = ?");
    $stmtU->bind_param("di", $nuevoStock, $producto_id);
    $stmtU->execute();

    $conexion->commit();
    return ['ok' => true, 'stock_despues' => $nuevoStock];
  } catch (Exception $e) {
    $conexion->rollback();
    return ['ok' => false, 'error' => $e->getMessage()];
  }
}

// ==== Router ====
$method = $_SERVER['REQUEST_METHOD'];
$accion = $_GET['accion'] ?? '';

switch ($method) {
  case 'GET':
  if (isset($_GET['accion']) && $_GET['accion'] === 'validar_codigo') { include 'validar_codigo_admin.php'; exit; }
  if (isset($_GET['accion']) && $_GET['accion'] === 'reporte_movimientos') { reporteMovimientos($conexion); exit; }
  obtenerProductos($conexion);
  break;

  case 'POST':
    if ($accion === 'ajustar_stock') { ajustarStock($conexion); }
    else { agregarProducto($conexion); }
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


// === EXISTENTES (ajustados donde corresponde) ===

function obtenerProductos($conexion) {
  // Detalle por ID (para Editar)
  if (isset($_GET['id'])) {
    $id = intval($_GET['id']);
    $sql = "SELECT
              p.id, p.codigo, p.nombre, p.descripcion,
              p.precio, p.precio_proveedor, p.stock,
              p.categoria_id, p.proveedor_id,
              c.nombre  AS categoria,
              pr.nombre AS proveedor_nombre
            FROM productos p
            LEFT JOIN categorias  c  ON c.id  = p.categoria_id
            LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
            WHERE p.id = ?";
    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();
    echo json_encode($row ?: ["error" => "Producto no encontrado"]);
    return;
  }

  $limit    = isset($_GET['limit'])    ? max(1, intval($_GET['limit']))   : 10;
  $offset   = isset($_GET['offset'])   ? max(0, intval($_GET['offset']))  : 0;
  $busqueda = isset($_GET['busqueda']) ? trim($_GET['busqueda'])          : '';

  $productos = [];
  $base = "FROM productos p
           LEFT JOIN categorias  c  ON c.id  = p.categoria_id
           LEFT JOIN proveedores pr ON pr.id = p.proveedor_id";

  $where = "";
  $params = [];
  $types  = "";

  if ($busqueda !== '') {
    $where = " WHERE p.nombre LIKE ? OR p.descripcion LIKE ? OR p.codigo LIKE ? OR c.nombre LIKE ? OR pr.nombre LIKE ?";
    $like = "%$busqueda%";
    $params = [$like,$like,$like,$like,$like];
    $types  = "sssss";
  }

  // datos
  $sql = "SELECT
            p.id, p.codigo, p.nombre, p.descripcion,
            p.precio, p.precio_proveedor, p.stock,
            c.nombre  AS categoria,
            pr.nombre AS proveedor_nombre
          $base
          $where
          LIMIT ? OFFSET ?";

  $params[] = $limit;  $params[] = $offset;
  $types   .= "ii";

  $stmt = $conexion->prepare($sql);
  $stmt->bind_param($types, ...$params);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($row = $res->fetch_assoc()) { $productos[] = $row; }

  // total
  $sqlTot = "SELECT COUNT(*) AS total $base $where";
  $stmtT = $conexion->prepare($sqlTot);
  if ($busqueda !== '') { $stmtT->bind_param("sssss", $like,$like,$like,$like,$like); }
  $stmtT->execute();
  $total = (int)$stmtT->get_result()->fetch_assoc()['total'];

  echo json_encode(["success"=>true, "productos"=>$productos, "total"=>$total]);
}

function agregarProducto($conexion) {
  $data = json_decode(file_get_contents("php://input"), true);

  $codigo            = trim($data['codigo'] ?? '');
  $nombre            = trim($data['nombre'] ?? '');
  $descripcion       = trim($data['descripcion'] ?? '');
  $precio            = (float)($data['precio'] ?? -1);            // venta
  $stock_inicial     = (float)($data['stock'] ?? -1);
  $categoria_id      = (int)($data['categoria_id'] ?? 0);
  $proveedor_id      = (isset($data['proveedor_id']) && $data['proveedor_id'] !== '')
                        ? (int)$data['proveedor_id'] : null;

  if (!$codigo || !$nombre || !$descripcion || $precio < 0 || $stock_inicial < 0 || $categoria_id <= 0) {
    echo json_encode(["success"=>false,"error"=>"Todos los campos son obligatorios y deben ser válidos"]); return;
  }

  // Código único
  $stmt = $conexion->prepare("SELECT id FROM productos WHERE codigo = ?");
  $stmt->bind_param("s", $codigo);
  $stmt->execute();
  if ($stmt->get_result()->num_rows > 0) {
    echo json_encode(["success"=>false,"error"=>"Ya existe un producto con ese código de barras"]); return;
  }
  $stmt->close();

  // Categoría válida
  $stmt = $conexion->prepare("SELECT id FROM categorias WHERE id = ?");
  $stmt->bind_param("i", $categoria_id);
  $stmt->execute();
  if ($stmt->get_result()->num_rows === 0) { echo json_encode(["success"=>false,"error"=>"Categoría inválida"]); return; }
  $stmt->close();

  // Si viene proveedor, validar
  if (!is_null($proveedor_id)) {
    $stmt = $conexion->prepare("SELECT id FROM proveedores WHERE id = ?");
    $stmt->bind_param("i", $proveedor_id);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) { echo json_encode(["success"=>false,"error"=>"Proveedor no válido"]); return; }
    $stmt->close();
  }

    $conexion->begin_transaction();
  try {
    // INSERT con / sin proveedor
    if (is_null($proveedor_id)) {
      // proveedor NULL, costo proveedor forzado a 0, stock 0
      $sql = "INSERT INTO productos
              (nombre, codigo, descripcion, precio, precio_proveedor, proveedor_id, stock, categoria_id)
              VALUES (?, ?, ?, ?, 0, NULL, 0, ?)";
      $stmt = $conexion->prepare($sql);
      $stmt->bind_param("sssdi", $nombre, $codigo, $descripcion, $precio, $categoria_id);

    } else {
      // con proveedor, costo proveedor forzado a 0, stock 0
      $sql = "INSERT INTO productos
              (nombre, codigo, descripcion, precio, precio_proveedor, proveedor_id, stock, categoria_id)
              VALUES (?, ?, ?, ?, 0, ?, 0, ?)";
      $stmt = $conexion->prepare($sql);
      // s s s d i i
      $stmt->bind_param("sssdii", $nombre, $codigo, $descripcion, $precio, $proveedor_id, $categoria_id);
    }

    $stmt->execute();
    $producto_id = $conexion->insert_id;

    // movimiento inicial (si trae stock_inicial)
    if ($stock_inicial > 0) {
      $nuevoStock = $stock_inicial;
      $sqlMov = "INSERT INTO inventario_movimientos
        (producto_id, producto_codigo, producto_nombre, tipo, cantidad, costo_unitario, stock_despues, ref_tabla, ref_id, usuario_id, almacen_id, nota)
        VALUES (?, ?, ?, 'ingreso', ?, NULL, ?, 'admin_productos', NULL, ?, NULL, 'Alta de producto')";
      $stmtI = $conexion->prepare($sqlMov);
      $uid = current_user_id();
      $stmtI->bind_param("issddi", $producto_id, $codigo, $nombre, $stock_inicial, $nuevoStock, $uid);
      $stmtI->execute();

      $stmtU = $conexion->prepare("UPDATE productos SET stock = ? WHERE id = ?");
      $stmtU->bind_param("di", $nuevoStock, $producto_id);
      $stmtU->execute();
    }

    $conexion->commit();
    echo json_encode(["success"=>true,"msg"=>"Producto agregado correctamente"]);
  } catch (Exception $e) {
    $conexion->rollback();
    echo json_encode(["success"=>false,"error"=>"Error al guardar el producto: ".$e->getMessage()]);
  }

}




function ajustarStock($conexion) {
  $in = json_decode(file_get_contents("php://input"), true);
  $producto_id = (int)($in['producto_id'] ?? 0);
  $tipo = $in['tipo'] ?? '';           // 'ingreso' | 'ajuste-'
  $cantidad = (float)($in['cantidad'] ?? 0);
  $nota = trim($in['nota'] ?? '');

  if ($producto_id <= 0 || $cantidad <= 0 || !in_array($tipo, ['ingreso','ajuste-'])) {
    echo json_encode(['ok'=>false, 'error'=>'Parámetros inválidos']);
    return;
  }

  $res = aplicarMovimientoInventario($conexion, $producto_id, $tipo, $cantidad, $nota, current_user_id());
  echo json_encode($res);
}


function editarProducto($conexion) {
  $data = json_decode(file_get_contents("php://input"), true);

  $id            = intval($data['id'] ?? 0);
  $codigo        = trim($data['codigo'] ?? '');
  $nombre        = trim($data['nombre'] ?? '');
  $descripcion   = trim($data['descripcion'] ?? '');
  $precio        = (float)($data['precio'] ?? -1);
  $precio_proveedor = (float)($data['precio_proveedor'] ?? 0);
  $stock         = (int)($data['stock'] ?? -1);   // editar stock directo no genera movimiento
  $categoria_id  = intval($data['categoria_id'] ?? 0);

  // Puede venir vacío para "sin proveedor"
  $proveedor_id = array_key_exists('proveedor_id', $data) && $data['proveedor_id'] !== '' 
                  ? (int)$data['proveedor_id'] 
                  : null;

  if ($id <= 0) { echo json_encode(["success"=>false,"error"=>"ID inválido"]); return; }
  if ($codigo === '') { echo json_encode(["success"=>false,"error"=>"Código requerido"]); return; }
  if ($nombre === '' || strlen($nombre) > 100) { echo json_encode(["success"=>false,"error"=>"Nombre inválido"]); return; }
  if ($descripcion === '' || strlen($descripcion) > 1000) { echo json_encode(["success"=>false,"error"=>"Descripción inválida"]); return; }
  if ($precio < 0) { echo json_encode(["success"=>false,"error"=>"Precio debe ser mayor o igual a 0"]); return; }
  if ($precio_proveedor < 0) { echo json_encode(["success"=>false,"error"=>"Costo proveedor inválido"]); return; }
  if ($stock < 0) { echo json_encode(["success"=>false,"error"=>"Stock inválido"]); return; }
  if ($categoria_id <= 0) { echo json_encode(["success"=>false,"error"=>"Categoría no válida"]); return; }

  // Código único en otro id
  $stmtCodigo = $conexion->prepare("SELECT id FROM productos WHERE codigo = ? AND id != ?");
  $stmtCodigo->bind_param("si", $codigo, $id);
  $stmtCodigo->execute();
  if ($stmtCodigo->get_result()->num_rows > 0) {
    echo json_encode(["success"=>false,"error"=>"Este código ya está en uso por otro producto"]); 
    return;
  }
  $stmtCodigo->close();

  // Categoría válida
  $stmtCheck = $conexion->prepare("SELECT id FROM categorias WHERE id = ?");
  $stmtCheck->bind_param("i", $categoria_id);
  $stmtCheck->execute();
  if ($stmtCheck->get_result()->num_rows === 0) {
    echo json_encode(["success"=>false,"error"=>"Categoría no válida"]); 
    return;
  }
  $stmtCheck->close();

  // Si se envía proveedor_id, validar que exista
  if (!is_null($proveedor_id)) {
    $stmtP = $conexion->prepare("SELECT id FROM proveedores WHERE id = ?");
    $stmtP->bind_param("i", $proveedor_id);
    $stmtP->execute();
    if ($stmtP->get_result()->num_rows === 0) {
      echo json_encode(["success"=>false,"error"=>"Proveedor no válido"]);
      return;
    }
    $stmtP->close();
  }

  // UPDATE (si no hay proveedor -> poner NULL)
  if (is_null($proveedor_id)) {
    $sql = "UPDATE productos
            SET codigo = ?, nombre = ?, descripcion = ?, precio = ?, precio_proveedor = ?, stock = ?, categoria_id = ?, proveedor_id = NULL
            WHERE id = ?";
    $stmt = $conexion->prepare($sql);
    // s s s d d i i i
    $stmt->bind_param("sssddiii", $codigo, $nombre, $descripcion, $precio, $precio_proveedor, $stock, $categoria_id, $id);
  } else {
    $sql = "UPDATE productos
            SET codigo = ?, nombre = ?, descripcion = ?, precio = ?, precio_proveedor = ?, stock = ?, categoria_id = ?, proveedor_id = ?
            WHERE id = ?";
    $stmt = $conexion->prepare($sql);
    // s s s d d i i i i
    $stmt->bind_param("sssddiiii", $codigo, $nombre, $descripcion, $precio, $precio_proveedor, $stock, $categoria_id, $proveedor_id, $id);
  }

  if (!$stmt->execute()) {
    echo json_encode(["success"=>false,"error"=>"No se pudo actualizar: ".$stmt->error]);
    return;
  }

  echo json_encode(["success" => true, "msg" => "Producto actualizado"]);
}



function eliminarProducto($conexion) {
  $id = intval($_GET['id'] ?? 0);
  if ($id <= 0) { echo json_encode(["success"=>false,"error"=>"ID no válido"]); return; }

  // Registrar eliminación como ajuste- por el stock vigente y luego borrar
  $conexion->begin_transaction();
  try {
    // bloquea y lee el producto
    $stmt = $conexion->prepare("SELECT codigo, nombre, stock FROM productos WHERE id = ? FOR UPDATE");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $p = $stmt->get_result()->fetch_assoc();
    if (!$p) throw new Exception("Producto no encontrado");

    $stock = (float)$p['stock'];
    if ($stock > 0) {
      $nuevo = 0.0;
      $sqlMov = "INSERT INTO inventario_movimientos
        (producto_id, producto_codigo, producto_nombre, tipo, cantidad, costo_unitario, stock_despues, ref_tabla, ref_id, usuario_id, almacen_id, nota)
        VALUES (?, ?, ?, 'ajuste-', ?, NULL, ?, 'admin_productos', NULL, ?, NULL, 'Eliminación de producto')";
      $stmtI = $conexion->prepare($sqlMov);
      $uid = current_user_id();
      $stmtI->bind_param("issddi", $id, $p['codigo'], $p['nombre'], $stock, $nuevo, $uid);
      $stmtI->execute();
    }

    // borra el producto
    $stmtD = $conexion->prepare("DELETE FROM productos WHERE id = ?");
    $stmtD->bind_param("i", $id);
    $stmtD->execute();

    $conexion->commit();
    echo json_encode(["success"=>true, "message"=>"Producto eliminado"]);
  } catch (Exception $e) {
    $conexion->rollback();
    echo json_encode(["success"=>false, "error"=>"No se pudo eliminar: ".$e->getMessage()]);
  }
}
// Helper: Y-m-d[ H:i:s] -> d/m/Y
function toDMY($str) {
  $ts = strtotime($str);
  return $ts ? date('d/m/Y', $ts) : $str;
}

function reporteMovimientos(mysqli $conexion) {
  $tipo = $_GET['tipo'] ?? 'dia';

  // Calcula ventana de fechas (desde/hasta)
  try {
    if ($tipo === 'dia') {
      $f = $_GET['fecha'] ?? '';
      if (!$f) throw new Exception('Fecha requerida');
      $desde = $f . ' 00:00:00';
      $hasta = $f . ' 23:59:59';
    } elseif ($tipo === 'mes') {
      $m = $_GET['fecha'] ?? ''; // YYYY-MM
      if (!$m) throw new Exception('Mes requerido');
      $dt = DateTime::createFromFormat('Y-m-d', $m.'-01');
      if (!$dt) throw new Exception('Mes inválido');
      $desde = $dt->format('Y-m-01') . ' 00:00:00';
      $hasta = $dt->format('Y-m-t')  . ' 23:59:59';
    } elseif ($tipo === 'anio') {
      $a = (int)($_GET['fecha'] ?? 0);
      if ($a < 2000 || $a > 2100) throw new Exception('Año inválido');
      $desde = $a . '-01-01 00:00:00';
      $hasta = $a . '-12-31 23:59:59';
    } else { // rango
      $i = $_GET['inicio'] ?? '';
      $f = $_GET['fin'] ?? '';
      if (!$i || !$f) throw new Exception('Rango incompleto');
      $desde = $i . ' 00:00:00';
      $hasta = $f . ' 23:59:59';
    }
  } catch (Exception $e) {
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()]); return;
  }

  // Trae movimientos del periodo + stock actual (si el producto existe)
  $sql = "SELECT
          im.producto_id, im.producto_codigo, im.producto_nombre,
          im.tipo, im.cantidad, im.stock_despues, im.creado_en, im.nota,
          p.stock AS stock_actual,
          u.nombre AS usuario                    -- 👈 nombre del usuario
        FROM inventario_movimientos im
        LEFT JOIN productos p ON p.id = im.producto_id
        LEFT JOIN usuarios  u ON u.id = im.usuario_id   -- 👈 join a tu tabla
        WHERE im.creado_en >= ? AND im.creado_en <= ?
        ORDER BY im.producto_nombre, im.producto_id, im.creado_en, im.id";

  $stmt = $conexion->prepare($sql);
  $stmt->bind_param("ss", $desde, $hasta);
  $stmt->execute();
  $res = $stmt->get_result();

  $grupos = [];
  $tot_entradas = 0.0; $tot_salidas = 0.0;

  while ($row = $res->fetch_assoc()) {
    // clave de grupo: usa id si existe; si no, código
    $key = $row['producto_id'] ? 'id'.$row['producto_id'] : 'c'.$row['producto_codigo'];

    if (!isset($grupos[$key])) {
      $grupos[$key] = [
        'producto_id'  => $row['producto_id'],
        'codigo'       => $row['producto_codigo'],
        'nombre'       => $row['producto_nombre'],
        'stock_actual' => isset($row['stock_actual']) ? (float)$row['stock_actual'] : null,
        'entradas'     => 0.0,
        'salidas'      => 0.0,
        'movimientos'  => []
      ];
    }

    $tipoMov = $row['tipo'];
    $cant    = (float)$row['cantidad'];

    if (in_array($tipoMov, ['ingreso','ajuste+','devolucion+'])) {
      $grupos[$key]['entradas'] += $cant;
      $tot_entradas += $cant;
    } else { // venta, instalacion, ajuste-, devolucion-
      $grupos[$key]['salidas'] += $cant;
      $tot_salidas += $cant;
    }

    $grupos[$key]['movimientos'][] = [
  'fecha'         => toDMY($row['creado_en']),  // <-- dd/mm/yyyy
  'fecha_hora'    => $row['creado_en'],         // <-- la completa por si la necesitas en el modal
  'tipo'          => $tipoMov,
  'cantidad'      => $cant,
  'stock_despues' => (float)$row['stock_despues'],
  'nota'          => $row['nota'],
  'usuario'       => $row['usuario'] ?: '—'
];

  }

  // Ordena grupos por nombre/código
  $resumen = array_values($grupos);
  usort($resumen, function($a,$b){
    return strcmp($a['nombre'].$a['codigo'], $b['nombre'].$b['codigo']);
  });

  echo json_encode([
  'ok'      => true,
  'desde'   => toDMY($desde),  // <-- dd/mm/yyyy
  'hasta'   => toDMY($hasta),  // <-- dd/mm/yyyy
  'resumen' => $resumen,
  'totales' => ['entradas'=>$tot_entradas, 'salidas'=>$tot_salidas]
]);

}

