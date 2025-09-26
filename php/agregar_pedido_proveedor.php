<?php
date_default_timezone_set('America/Mexico_City');
header('Content-Type: application/json');
require_once 'conexion.php';

$in = json_decode(file_get_contents('php://input'), true);

$proveedor_id        = isset($in['proveedor_id']) ? (int)$in['proveedor_id'] : null;
$producto_id         = isset($in['producto_id'])  ? (int)$in['producto_id']  : 0;
$cantidad            = isset($in['cantidad'])     ? (int)$in['cantidad']     : 0;
$precio_prov_ped     = isset($in['precio_proveedor_ped']) ? (float)$in['precio_proveedor_ped'] : null;
$precio_venta_ped    = isset($in['precio_venta_ped'])     ? (float)$in['precio_venta_ped']     : null;
$nota                = $in['nota'] ?? null;
$creado_por          = isset($in['creado_por']) ? (int)$in['creado_por'] : null;

if ($producto_id <= 0 || $cantidad <= 0) {
  echo json_encode(['success' => false, 'error' => 'producto_id y cantidad son obligatorios']);
  exit;
}

$conexion->begin_transaction();
try {
  // 1) Tomar snapshots
  $prov_nombre = null;
  if ($proveedor_id) {
    $res = $conexion->query("SELECT nombre FROM proveedores WHERE id = {$proveedor_id} LIMIT 1");
    if ($res && $res->num_rows) {
      $prov_nombre = $res->fetch_assoc()['nombre'];
    }
  }

  $prod_codigo = $prod_nombre = null;
  $res = $conexion->query("SELECT codigo,nombre,precio,precio_proveedor,stock FROM productos WHERE id = {$producto_id} LIMIT 1");
  if (!$res || !$res->num_rows) throw new Exception('Producto no encontrado');
  $p = $res->fetch_assoc();
  $prod_codigo = $p['codigo'];
  $prod_nombre = $p['nombre'];
  $precio_actual_venta = (float)$p['precio'];
  $precio_actual_prov  = (float)$p['precio_proveedor'];
  $stock_actual        = (int)$p['stock'];

  // 2) Insertar pedido (con snapshots)
  $stmt = $conexion->prepare("
    INSERT INTO proveedor_pedidos
      (proveedor_id, producto_id, proveedor_nombre, producto_codigo, producto_nombre,
       cantidad, precio_proveedor_ped, precio_venta_ped, nota, creado_por)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  ");
  $stmt->bind_param(
    'iissssddsi',
    $proveedor_id, $producto_id, $prov_nombre, $prod_codigo, $prod_nombre,
    $cantidad, $precio_prov_ped, $precio_venta_ped, $nota, $creado_por
  );
  if (!$stmt->execute()) throw new Exception('No se pudo guardar el pedido');
  $pedido_id = $conexion->insert_id;
  $stmt->close();

  // 3) (Opcional) Insertar movimiento de ENTRADA si ya tienes esa tabla
  // Descomenta si la usas: productos_movimientos(id, producto_id, tipo, cantidad, motivo, ref_id, creado_en)
  /*
  $tipo   = 'entrada';
  $motivo = 'pedido_proveedor';
  $stmt = $conexion->prepare("
    INSERT INTO productos_movimientos (producto_id, tipo, cantidad, motivo, ref_id, creado_en)
    VALUES (?, ?, ?, ?, ?, NOW())
  ");
  $stmt->bind_param('isisi', $producto_id, $tipo, $cantidad, $motivo, $pedido_id);
  if (!$stmt->execute()) throw new Exception('No se pudo registrar el movimiento');
  $stmt->close();
  */

  // 4) Actualizar STOCK (sumar)
  $stmt = $conexion->prepare("UPDATE productos SET stock = stock + ? WHERE id = ?");
  $stmt->bind_param('ii', $cantidad, $producto_id);
  if (!$stmt->execute() || $stmt->affected_rows < 1) throw new Exception('No se pudo actualizar el stock');
  $stmt->close();

  // Si EN LUGAR DE SUMAR quisieras REEMPLAZAR el stock:
  // $stmt = $conexion->prepare("UPDATE productos SET stock = ? WHERE id = ?");
  // $stmt->bind_param('ii', $cantidad, $producto_id);

  // 5) Actualizar precios si vienen y son distintos
  $sets = [];
  if ($precio_prov_ped !== null && (float)$precio_prov_ped !== (float)$precio_actual_prov) {
    $sets[] = "precio_proveedor = ".number_format($precio_prov_ped, 2, '.', '');
  }
  if ($precio_venta_ped !== null && (float)$precio_venta_ped !== (float)$precio_actual_venta) {
    $sets[] = "precio = ".number_format($precio_venta_ped, 2, '.', '');
  }
  if (!empty($sets)) {
    $sqlUpdate = "UPDATE productos SET ".implode(', ', $sets)." WHERE id = {$producto_id} LIMIT 1";
    if (!$conexion->query($sqlUpdate)) throw new Exception('No se pudieron actualizar los precios');
  }

  $conexion->commit();
  echo json_encode(['success' => true, 'pedido_id' => $pedido_id]);

} catch (Throwable $e) {
  $conexion->rollback();
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
