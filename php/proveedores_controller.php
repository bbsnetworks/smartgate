<?php
// php/proveedores_controller.php
date_default_timezone_set('America/Mexico_City');
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';
$SESSION_UID = (int) ($_SESSION['usuario']['id'] ?? 0);
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

function jexit($arr, $code = 200)
{
  http_response_code($code);
  echo json_encode($arr);
  exit;
}

function bodyJSON()
{
  $raw = file_get_contents('php://input');
  $json = json_decode($raw, true);
  return is_array($json) ? $json : [];
}

function table_exists(mysqli $cn, string $name): bool
{
  $nameEsc = $cn->real_escape_string($name);
  $rs = $cn->query("SHOW TABLES LIKE '$nameEsc'");
  return ($rs && $rs->num_rows > 0);
}
function first_existing_table(mysqli $cn, array $names)
{
  foreach ($names as $n) {
    if (table_exists($cn, $n))
      return $n;
  }
  return null;
}
function table_columns(mysqli $cn, string $table): array
{
  $cols = [];
  if ($rs = $cn->query("SHOW COLUMNS FROM `$table`")) {
    while ($r = $rs->fetch_assoc())
      $cols[] = $r['Field'];
  }
  return $cols;
}
function new_group_id(): string {
  // yyyymmddHHMMSS + 4 dígitos aleatorios -> 18 caracteres
  return date('YmdHis') . sprintf('%04d', random_int(0, 9999));
}

function registrar_pedido_simple(mysqli $cn, ?int $proveedor_id, int $producto_id, int $cantidad,
                                 ?float $precio_prov_ped, ?float $precio_venta_ped,
                                 ?string $nota, ?int $creado_por,
                                 ?string $pedido_grupo = null) {
  try {
    if ($producto_id <= 0 || $cantidad <= 0) {
      return ['success' => false, 'error' => 'producto_id y cantidad son obligatorios'];
    }
    global $SESSION_UID;
    if (!$creado_por) {
      $creado_por = $SESSION_UID ?: null;
    }
    // === SNAPSHOTS de proveedor y producto ===
    $prov_nombre = null;
    if ($proveedor_id) {
      $rs = $cn->query("SELECT nombre FROM proveedores WHERE id={$proveedor_id} LIMIT 1");
      if ($rs && $rs->num_rows) {
        $prov_nombre = $rs->fetch_assoc()['nombre'];
      }
    }
    if (!$pedido_grupo) { $pedido_grupo = new_group_id(); }
    $rs = $cn->query("SELECT codigo,nombre,precio,precio_proveedor,stock FROM productos WHERE id={$producto_id} LIMIT 1");
    if (!$rs || !$rs->num_rows)
      return ['success' => false, 'error' => 'Producto no encontrado'];
    $p = $rs->fetch_assoc();
    $prod_codigo = $p['codigo'];
    $prod_nombre = $p['nombre'];
    $precio_actual_venta = (float) $p['precio'];
    $precio_actual_prov = (float) $p['precio_proveedor'];
    $stock_actual = (float) $p['stock'];

    // Costeo a usar en el movimiento (si no mandas costo, usa el actual del producto)
    $costo_unitario = ($precio_prov_ped !== null) ? (float) $precio_prov_ped : (float) $precio_actual_prov;
    $total_mov = (float) $cantidad * (float) $costo_unitario;
    $stock_despues = $stock_actual + (float) $cantidad;

    $cn->begin_transaction();

    // INSERT pedido (agrega pedido_grupo)
  $sql = "INSERT INTO proveedor_pedidos
    (pedido_grupo, proveedor_id, producto_id, proveedor_nombre, producto_codigo, producto_nombre,
     cantidad, precio_proveedor_ped, precio_venta_ped, nota, creado_por)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)";
  $stmt = $cn->prepare($sql);
  $stmt->bind_param(
    'siisssiddsi',
    $pedido_grupo, $proveedor_id, $producto_id, $prov_nombre, $prod_codigo, $prod_nombre,
    $cantidad, $precio_prov_ped, $precio_venta_ped, $nota, $creado_por
  );
  if (!$stmt->execute()) { throw new Exception('No se pudo guardar el pedido'); }
  $pedido_id = $cn->insert_id;
  $stmt->close();

    // === INSERT movimiento en inventario_movimientos ===
    // Campos según tu tabla:
    // (producto_id, producto_codigo, producto_nombre, tipo, cantidad, costo_unitario, total, stock_despues,
    //  ref_tabla, ref_id, usuario_id, almacen_id, nota, creado_en)
    $ref_tabla = 'proveedor_pedidos';
    $tipo = 'ingreso';
    $almacen_id = 0; // usa 0 si no manejas almacenes; si quieres NULL, dime y lo armamos dinámico

    $cantF = (float) $cantidad;
    $costo_unitario = ($precio_prov_ped !== null) ? (float) $precio_prov_ped : (float) $precio_actual_prov;
    $stock_despues = (float) $stock_actual + $cantF;

    // OJO: ya NO incluimos 'total' en las columnas (MySQL lo genera solo)
    $sqlMov = "INSERT INTO inventario_movimientos
  (producto_id, producto_codigo, producto_nombre, tipo, cantidad, costo_unitario, stock_despues,
   ref_tabla, ref_id, usuario_id, almacen_id, nota, creado_en)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW())";

    $stmt = $cn->prepare($sqlMov);
    $stmt->bind_param(
      'isssdddsiiis', // 12 params
      $producto_id,        // i
      $prod_codigo,        // s
      $prod_nombre,        // s
      $tipo,               // s
      $cantF,              // d
      $costo_unitario,     // d
      $stock_despues,      // d
      $ref_tabla,          // s
      $pedido_id,          // i
      $creado_por,         // i
      $almacen_id,         // i (0 si no usas almacén)
      $nota                // s
    );
    if (!$stmt->execute()) {
      throw new Exception('No se pudo registrar el movimiento');
    }
    $stmt->close();

    // === Actualizar STOCK (sumar) ===
    $stmt = $cn->prepare("UPDATE productos SET stock = stock + ? WHERE id = ?");
    $stmt->bind_param('di', $cantF, $producto_id);
    if (!$stmt->execute() || $stmt->affected_rows < 1) {
      throw new Exception('No se pudo actualizar el stock');
    }
    $stmt->close();

    // === Actualizar precios si vienen y cambian ===
    if ($precio_prov_ped !== null && round($precio_prov_ped, 2) !== round($precio_actual_prov, 2)) {
      $stmt = $cn->prepare("UPDATE productos SET precio_proveedor = ? WHERE id = ?");
      $stmt->bind_param('di', $precio_prov_ped, $producto_id);
      if (!$stmt->execute()) {
        throw new Exception('No se pudo actualizar precio_proveedor');
      }
      $stmt->close();
    }
    if ($precio_prov_ped !== null && round($precio_prov_ped, 2) !== round($precio_actual_prov, 2)) {
    $stmt = $cn->prepare("UPDATE productos SET precio_proveedor = ? WHERE id = ?");
    $stmt->bind_param('di', $precio_prov_ped, $producto_id);
    if (!$stmt->execute()) { throw new Exception('No se pudo actualizar precio_proveedor'); }
    $stmt->close();
  }

    $cn->commit();
    return ['success'=>true, 'pedido_id'=>$pedido_id, 'pedido_grupo'=>$pedido_grupo];

  } catch (Throwable $e) {
    $cn->rollback();
    return ['success' => false, 'error' => $e->getMessage()];
  }
}


switch ($action) {

  // LISTAR con búsqueda/paginación/filtro activo
  case 'listar': {
    $q = trim($_GET['q'] ?? '');
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = max(1, min(50, intval($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;
    $activo = $_GET['activo'] ?? 'all'; // all|1|0

    $where = "WHERE 1=1";
    if ($q !== '') {
      $qEsc = $conexion->real_escape_string($q);
      $where .= " AND (nombre LIKE '%$qEsc%' OR contacto LIKE '%$qEsc%' OR telefono LIKE '%$qEsc%' OR email LIKE '%$qEsc%')";
    }
    if ($activo === '1' || $activo === '0') {
      $where .= " AND activo = " . intval($activo);
    }

    // total
    $total = 0;
    $rsTot = $conexion->query("SELECT COUNT(*) t FROM proveedores $where");
    if ($rsTot) {
      $total = intval($rsTot->fetch_assoc()['t'] ?? 0);
    }

    // datos
    $sql = "SELECT id,nombre,contacto,telefono,email,direccion,rfc,activo,creado_en,actualizado_en
            FROM proveedores
            $where
            ORDER BY nombre ASC
            LIMIT $limit OFFSET $offset";
    $rs = $conexion->query($sql);
    $rows = [];
    while ($rs && $row = $rs->fetch_assoc()) {
      $rows[] = $row;
    }

    jexit(['success' => true, 'proveedores' => $rows, 'total' => $total, 'limit' => $limit, 'page' => $page]);
  }

  // OBTENER uno
  case 'obtener': {
    $id = intval($_GET['id'] ?? 0);
    if (!$id)
      jexit(['success' => false, 'error' => 'ID inválido'], 400);
    $id = $conexion->real_escape_string($id);
    $rs = $conexion->query("SELECT * FROM proveedores WHERE id=$id LIMIT 1");
    $row = $rs ? $rs->fetch_assoc() : null;
    if (!$row)
      jexit(['success' => false, 'error' => 'No encontrado'], 404);
    jexit(['success' => true, 'proveedor' => $row]);
  }

  // CREAR
  case 'crear': {
    $b = bodyJSON();
    $nombre = trim($b['nombre'] ?? '');
    if ($nombre === '')
      jexit(['success' => false, 'error' => 'El nombre es requerido'], 400);

    $contacto = $conexion->real_escape_string(trim($b['contacto'] ?? ''));
    $telefono = $conexion->real_escape_string(trim($b['telefono'] ?? ''));
    $email = $conexion->real_escape_string(trim($b['email'] ?? ''));
    $direccion = $conexion->real_escape_string(trim($b['direccion'] ?? ''));
    $rfc = $conexion->real_escape_string(trim($b['rfc'] ?? ''));
    $nombreEsc = $conexion->real_escape_string($nombre);

    $sql = "INSERT INTO proveedores (nombre,contacto,telefono,email,direccion,rfc,activo,creado_en)
            VALUES ('$nombreEsc','$contacto','$telefono','$email','$direccion','$rfc',1,NOW())";
    if (!$conexion->query($sql)) {
      jexit(['success' => false, 'error' => 'No se pudo crear: ' . $conexion->error], 500);
    }
    jexit(['success' => true, 'id' => $conexion->insert_id]);
  }

  // ACTUALIZAR
  case 'actualizar': {
    $b = bodyJSON();
    $id = intval($b['id'] ?? 0);
    if (!$id)
      jexit(['success' => false, 'error' => 'ID inválido'], 400);

    $nombre = trim($b['nombre'] ?? '');
    if ($nombre === '')
      jexit(['success' => false, 'error' => 'El nombre es requerido'], 400);

    $contacto = $conexion->real_escape_string(trim($b['contacto'] ?? ''));
    $telefono = $conexion->real_escape_string(trim($b['telefono'] ?? ''));
    $email = $conexion->real_escape_string(trim($b['email'] ?? ''));
    $direccion = $conexion->real_escape_string(trim($b['direccion'] ?? ''));
    $rfc = $conexion->real_escape_string(trim($b['rfc'] ?? ''));
    $nombreEsc = $conexion->real_escape_string($nombre);

    $sql = "UPDATE proveedores SET
              nombre='$nombreEsc',
              contacto='$contacto',
              telefono='$telefono',
              email='$email',
              direccion='$direccion',
              rfc='$rfc',
              actualizado_en=NOW()
            WHERE id=$id LIMIT 1";
    if (!$conexion->query($sql)) {
      jexit(['success' => false, 'error' => 'No se pudo actualizar: ' . $conexion->error], 500);
    }
    jexit(['success' => true]);
  }

  // ACTIVAR/DESACTIVAR (soft delete)
  case 'toggle_activo': {
    $b = bodyJSON();
    $id = intval($b['id'] ?? 0);
    $activo = ($b['activo'] ?? null);
    if ($id <= 0 || ($activo !== '0' && $activo !== '1' && $activo !== 0 && $activo !== 1)) {
      jexit(['success' => false, 'error' => 'Parámetros inválidos'], 400);
    }
    $activo = intval($activo);
    $sql = "UPDATE proveedores SET activo=$activo, actualizado_en=NOW() WHERE id=$id LIMIT 1";
    if (!$conexion->query($sql)) {
      jexit(['success' => false, 'error' => 'No se pudo cambiar el estado: ' . $conexion->error], 500);
    }
    jexit(['success' => true]);
  }

  // ELIMINAR (físico, no recomendado). Si hay productos referidos, el FK pondrá NULL.
  case 'eliminar': {
    $b = bodyJSON();
    $id = intval($b['id'] ?? 0);
    if (!$id)
      jexit(['success' => false, 'error' => 'ID inválido'], 400);
    $sql = "DELETE FROM proveedores WHERE id=$id LIMIT 1";
    if (!$conexion->query($sql)) {
      jexit(['success' => false, 'error' => 'No se pudo eliminar: ' . $conexion->error], 500);
    }
    jexit(['success' => true]);
  }

  /* ========================= NUEVAS ACCIONES ========================= */

  // Productos asignados a un proveedor (para el modal)
  case 'productos_por_proveedor': {
    $proveedor_id = intval($_GET['proveedor_id'] ?? 0);
    if ($proveedor_id <= 0)
      jexit(['success' => false, 'error' => 'proveedor_id requerido'], 400);

    $sql = "SELECT id, codigo, nombre, precio AS precio_venta, precio_proveedor, stock
            FROM productos
            WHERE proveedor_id = {$proveedor_id}
            ORDER BY nombre ASC";
    $rs = $conexion->query($sql);
    $productos = [];
    while ($rs && $row = $rs->fetch_assoc()) {
      $row['precio_venta'] = (float) $row['precio_venta'];
      $row['precio_proveedor'] = (float) $row['precio_proveedor'];
      $row['stock'] = (int) $row['stock'];
      $productos[] = $row;
    }
    jexit(['success' => true, 'productos' => $productos]);
  }

  // Agregar UN pedido (renglón)
  case 'agregar_pedido': {
    $b = bodyJSON();
    $proveedor_id = isset($b['proveedor_id']) ? (int) $b['proveedor_id'] : null;
    $producto_id = (int) ($b['producto_id'] ?? 0);
    $cantidad = (int) ($b['cantidad'] ?? 0);
    $precio_prov_ped = isset($b['precio_proveedor_ped']) ? (float) $b['precio_proveedor_ped'] : null;
    $precio_venta_ped = isset($b['precio_venta_ped']) ? (float) $b['precio_venta_ped'] : null;
    $nota = $b['nota'] ?? null;
    $creado_por = isset($b['creado_por']) ? (int) $b['creado_por'] : null;

    $res = registrar_pedido_simple(
      $conexion,
      $proveedor_id,
      $producto_id,
      $cantidad,
      $precio_prov_ped,
      $precio_venta_ped,
      $nota,
      $creado_por
    );
    if ($res['success'] ?? false) {
      jexit(['success' => true, 'pedido_id' => $res['pedido_id']]);
    } else {
      jexit(['success' => false, 'error' => $res['error'] ?? 'Error desconocido'], 500);
    }
  }

  // Agregar VARIOS pedidos (batch) desde el modal
  case 'agregar_pedido_batch': {
  $b = bodyJSON();
  $items = [];
  if (isset($b['items']) && is_array($b['items'])) $items = $b['items'];
  elseif (array_keys($b) === range(0, count($b)-1)) $items = $b;

  if (empty($items)) jexit(['success'=>false,'error'=>'items vacío'],400);

  $pedido_grupo = new_group_id();            // <<--- NUEVO
  $ok=0; $fail=0; $errores=[];
  foreach ($items as $idx => $it) {
    $proveedor_id     = isset($it['proveedor_id']) ? (int)$it['proveedor_id'] : (isset($b['proveedor_id']) ? (int)$b['proveedor_id'] : null);
    $producto_id      = (int)($it['producto_id'] ?? 0);
    $cantidad         = (int)($it['cantidad'] ?? 0);
    $precio_prov_ped  = isset($it['precio_proveedor_ped']) ? (float)$it['precio_proveedor_ped'] : null;
    $precio_venta_ped = isset($it['precio_venta_ped']) ? (float)$it['precio_venta_ped'] : null;
    $nota             = $it['nota'] ?? null;
    $creado_por       = isset($it['creado_por']) ? (int)$it['creado_por'] : (isset($b['creado_por']) ? (int)$b['creado_por'] : null);

    $res = registrar_pedido_simple($conexion, $proveedor_id, $producto_id, $cantidad,
                                   $precio_prov_ped, $precio_venta_ped, $nota, $creado_por,
                                   $pedido_grupo);  // <<--- pasa el grupo
    if ($res['success'] ?? false) $ok++;
    else { $fail++; $errores[] = "Fila ".($idx+1).": ".($res['error'] ?? 'Error'); }
  }
  jexit(['success'=> ($fail===0), 'ok'=>$ok, 'fail'=>$fail, 'errores'=>$errores, 'pedido_grupo'=>$pedido_grupo]);
}
case 'listar_pedidos_grupo': {
  $proveedor_id = (int)($_GET['proveedor_id'] ?? 0);
  $mes = trim($_GET['mes'] ?? '');  // formato YYYY-MM
  if ($proveedor_id <= 0 || !preg_match('/^\d{4}-\d{2}$/',$mes)) {
    jexit(['success'=>false,'error'=>'proveedor_id y mes (YYYY-MM) requeridos'],400);
  }
  $inicio = $mes.'-01 00:00:00';
  $fin = date('Y-m-d H:i:s', strtotime($mes.'-01 +1 month')); // exclusivo

  $q = "SELECT pedido_grupo,
               MIN(creado_en) AS fecha,
               proveedor_id,
               MAX(proveedor_nombre) AS proveedor_nombre,
               COUNT(*) AS renglones,
               SUM(cantidad) AS piezas,
               SUM(cantidad * IFNULL(precio_proveedor_ped,0)) AS total_compra
        FROM proveedor_pedidos
        WHERE proveedor_id = {$proveedor_id}
          AND creado_en >= '{$inicio}' AND creado_en < '{$fin}'
        GROUP BY pedido_grupo
        ORDER BY fecha DESC";
  $rs = $conexion->query($q);
  $rows = [];
  while ($rs && $row = $rs->fetch_assoc()) {
    $row['total_compra'] = (float)$row['total_compra'];
    $row['piezas'] = (float)$row['piezas'];
    $rows[] = $row;
  }
  jexit(['success'=>true,'pedidos'=>$rows]);
}
case 'detalle_pedido_grupo': {
  $grupo = $conexion->real_escape_string($_GET['grupo'] ?? '');
  if ($grupo==='') jexit(['success'=>false,'error'=>'grupo requerido'],400);

  $q = "SELECT id, pedido_grupo, proveedor_id, proveedor_nombre,
               producto_id, producto_codigo, producto_nombre,
               cantidad, precio_proveedor_ped, precio_venta_ped,
               nota, creado_por, creado_en
        FROM proveedor_pedidos
        WHERE pedido_grupo = '{$grupo}'
        ORDER BY id ASC";
  $rs = $conexion->query($q);
  $items = [];
  while ($rs && $row = $rs->fetch_assoc()) {
    $row['precio_proveedor_ped'] = (float)$row['precio_proveedor_ped'];
    $row['precio_venta_ped']     = (float)$row['precio_venta_ped'];
    $row['cantidad']             = (float)$row['cantidad'];
    $items[] = $row;
  }
  jexit(['success'=>true,'items'=>$items]);
}
case 'listar_pedidos_grupo_rango': {
  // Parámetros
  $proveedor_id = isset($_GET['proveedor_id']) ? (int)$_GET['proveedor_id'] : 0; // 0 = todos
  $q            = trim($_GET['q'] ?? '');
  $desde        = trim($_GET['desde'] ?? '');
  $hasta        = trim($_GET['hasta'] ?? '');
  $page         = max(1, intval($_GET['page'] ?? 1));
  $limit        = max(1, min(100, intval($_GET['limit'] ?? 50)));
  $offset       = ($page - 1) * $limit;

  // Defaults: últimos 30 días si no mandan rango
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $desde)) $desde = date('Y-m-d', strtotime('-30 days'));
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $hasta)) $hasta = date('Y-m-d');

  // Rango exclusivo por el extremo derecho
  $inicio = $desde . ' 00:00:00';
  $fin    = date('Y-m-d', strtotime($hasta . ' +1 day')) . ' 00:00:00';

  $where = "WHERE creado_en >= '{$inicio}' AND creado_en < '{$fin}'";
  if ($proveedor_id > 0) { $where .= " AND proveedor_id = {$proveedor_id}"; }
  if ($q !== '') {
    $qEsc = $conexion->real_escape_string($q);
    $where .= " AND (pedido_grupo LIKE '%{$qEsc}%' OR producto_codigo LIKE '%{$qEsc}%' OR producto_nombre LIKE '%{$qEsc}%')";
  }

  // Total de grupos (para paginar)
  $sqlCount = "SELECT COUNT(*) AS t FROM (
                 SELECT 1 FROM proveedor_pedidos {$where} GROUP BY pedido_grupo
               ) x";
  $rsC = $conexion->query($sqlCount);
  $total = $rsC ? intval($rsC->fetch_assoc()['t'] ?? 0) : 0;

  // Datos agregados por grupo
  $sql = "SELECT
            pedido_grupo,
            MIN(creado_en)                              AS fecha,
            MAX(proveedor_id)                           AS proveedor_id,
            MAX(proveedor_nombre)                       AS proveedor_nombre,
            COUNT(*)                                    AS renglones,
            SUM(cantidad)                               AS piezas,
            SUM(cantidad * IFNULL(precio_proveedor_ped,0)) AS total_compra
          FROM proveedor_pedidos
          {$where}
          GROUP BY pedido_grupo
          ORDER BY fecha DESC
          LIMIT {$limit} OFFSET {$offset}";
  $rs = $conexion->query($sql);
  $rows = [];
  $suma_total = 0.0;
  while ($rs && $row = $rs->fetch_assoc()) {
    $row['renglones']    = (int)$row['renglones'];
    $row['piezas']       = (float)$row['piezas'];
    $row['total_compra'] = (float)$row['total_compra'];
    $suma_total         += $row['total_compra'];
    $rows[] = $row;
  }

  jexit([
    'success'     => true,
    'pedidos'     => $rows,
    'total'       => $total,   // total de grupos
    'page'        => $page,
    'limit'       => $limit,
    'desde'       => $desde,
    'hasta'       => $hasta,
    'suma_total'  => round($suma_total, 2)
  ]);
}



  default:
    jexit(['success' => false, 'error' => 'Acción no soportada'], 400);
}
