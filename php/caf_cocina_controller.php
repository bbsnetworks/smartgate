<?php
require_once 'conexion.php';
require_once 'verificar_sesion.php';
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

function ok($a = []) { echo json_encode(['ok'=>true] + $a); exit; }
function err($m='Error', $c=400){ http_response_code($c); echo json_encode(['ok'=>false,'message'=>$m]); exit; }

/** LISTA: SOLO pendientes, más atrasados primero **/
if ($action === 'pendientes') {
  $sql = "SELECT p.id, p.codigo, p.person_code, p.origen, p.estado,
                 p.notas, p.total, p.creado_en, p.actualizado_en,
                 (SELECT SUM(ci.cantidad) FROM caf_pedidos_items ci WHERE ci.pedido_id=p.id) AS items,
                 (SELECT GROUP_CONCAT(DISTINCT ci.nombre_snapshot ORDER BY ci.id SEPARATOR ', ')
                    FROM caf_pedidos_items ci WHERE ci.pedido_id=p.id) AS resumen
          FROM caf_pedidos p
          WHERE p.estado = 'pendiente'
          ORDER BY p.creado_en ASC";
  $res = $conexion->query($sql);
  $rows = [];
  while ($r = $res->fetch_assoc()) $rows[] = $r;
  ok(['pedidos'=>$rows]);
}

/** DETALLE del pedido **/
if ($action === 'detalle') {
  $id = (int)($_GET['id'] ?? 0);
  if (!$id) err('ID inválido');

  $qP = $conexion->query("SELECT id, codigo, person_code, origen, estado, notas, total, creado_en, actualizado_en
                          FROM caf_pedidos WHERE id=$id");
  if (!$qP || $qP->num_rows === 0) err('Pedido no encontrado', 404);
  $pedido = $qP->fetch_assoc();

  $qI = $conexion->query("SELECT id, producto_id, nombre_snapshot, descripcion_snapshot,
                                 cantidad, precio_unit, total_linea, tamano_key, tamano_label, nota, creado_en
                          FROM caf_pedidos_items
                          WHERE pedido_id=$id
                          ORDER BY id ASC");
  $items = [];
  while ($it = $qI->fetch_assoc()) $items[] = $it;

  ok(['pedido'=>$pedido, 'items'=>$items]);
}

/** TOMAR pedido: pasa a en_preparacion si sigue pendiente **/
if ($action === 'tomar') {
  $id = (int)($_POST['id'] ?? 0);
  if (!$id) err('ID inválido');

  $sql = "UPDATE caf_pedidos
          SET estado='en_preparacion', actualizado_en=NOW()
          WHERE id=$id AND estado='pendiente'";
  $conexion->query($sql);

  if ($conexion->affected_rows === 0) {
    $q = $conexion->query("SELECT estado FROM caf_pedidos WHERE id=$id");
    $st = $q && $q->num_rows ? $q->fetch_assoc()['estado'] : '';
    if ($st==='en_preparacion') err('El pedido ya está en preparación', 409);
    if ($st==='listo')          err('El pedido ya está listo', 409);
    if ($st==='entregado')      err('El pedido ya fue entregado', 409);
    if ($st==='cancelado')      err('El pedido fue cancelado', 409);
    err('No fue posible tomar el pedido', 409);
  }
  ok(['message'=>'Pedido en preparación']);
}

/** LISTO: pasa a listo si está en_preparacion **/
if ($action === 'listo') {
  $id = (int)($_POST['id'] ?? 0);
  if (!$id) err('ID inválido');

  $sql = "UPDATE caf_pedidos
          SET estado='listo', actualizado_en=NOW()
          WHERE id=$id AND estado='en_preparacion'";
  $conexion->query($sql);

  if ($conexion->affected_rows === 0) {
    $q = $conexion->query("SELECT estado FROM caf_pedidos WHERE id=$id");
    $st = $q && $q->num_rows ? $q->fetch_assoc()['estado'] : '';
    if ($st==='pendiente')      err('Primero debes tomar el pedido', 409);
    if ($st==='listo')          err('El pedido ya estaba listo', 409);
    if ($st==='entregado')      err('El pedido ya fue entregado', 409);
    if ($st==='cancelado')      err('El pedido fue cancelado', 409);
    err('No fue posible marcar como listo', 409);
  }
  ok(['message'=>'Pedido listo']);
}
if ($action === 'cancelar') { // pendiente|en_preparacion -> cancelado
  // Soporta JSON o FormData
  $raw = file_get_contents('php://input');
  if ($raw && empty($_POST)) {
    $json = json_decode($raw, true);
    if (isset($json['id'])) $_POST['id'] = $json['id'];
  }

  $id = (int)($_POST['id'] ?? 0);
  if (!$id) err('ID inválido');

  // Sólo permite cancelar si está pendiente o en preparación
  $sql = "UPDATE caf_pedidos
          SET estado='cancelado', actualizado_en=NOW()
          WHERE id=$id AND estado IN ('pendiente','en_preparacion')";
  $conexion->query($sql);

  if ($conexion->affected_rows === 0) {
    $q  = $conexion->query("SELECT estado FROM caf_pedidos WHERE id=$id");
    $st = $q && $q->num_rows ? $q->fetch_assoc()['estado'] : '';
    if ($st==='listo')      err('No puedes cancelar: el pedido ya está listo', 409);
    if ($st==='entregado')  err('No puedes cancelar: el pedido ya fue entregado', 409);
    if ($st==='cancelado')  err('El pedido ya estaba cancelado', 409);
    if ($st==='pagado')     err('No puedes cancelar: el pedido ya está pagado', 409);
    err('No fue posible cancelar el pedido', 409);
  }
  ok(['message'=>'Pedido cancelado']);
}


err('Acción no soportada', 404);
