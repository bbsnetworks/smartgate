<?php
// php/proveedores_controller.php
date_default_timezone_set('America/Mexico_City');
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

function jexit($arr, $code=200){
  http_response_code($code);
  echo json_encode($arr);
  exit;
}

function bodyJSON(){
  $raw = file_get_contents('php://input');
  $json = json_decode($raw, true);
  return is_array($json) ? $json : [];
}

switch ($action) {

  // LISTAR con búsqueda/paginación/filtro activo
  case 'listar': {
    $q       = trim($_GET['q'] ?? '');
    $page    = max(1, intval($_GET['page'] ?? 1));
    $limit   = max(1, min(50, intval($_GET['limit'] ?? 10)));
    $offset  = ($page - 1) * $limit;
    $activo  = $_GET['activo'] ?? 'all'; // all|1|0

    $where = "WHERE 1=1";
    if ($q !== '') {
      $qEsc = $conexion->real_escape_string($q);
      $where .= " AND (nombre LIKE '%$qEsc%' OR contacto LIKE '%$qEsc%' OR telefono LIKE '%$qEsc%' OR email LIKE '%$qEsc%')";
    }
    if ($activo === '1' || $activo === '0') {
      $where .= " AND activo = ".intval($activo);
    }

    // total
    $total = 0;
    $rsTot = $conexion->query("SELECT COUNT(*) t FROM proveedores $where");
    if ($rsTot) { $total = intval($rsTot->fetch_assoc()['t'] ?? 0); }

    // datos
    $sql = "SELECT id,nombre,contacto,telefono,email,direccion,rfc,activo,creado_en,actualizado_en
            FROM proveedores
            $where
            ORDER BY nombre ASC
            LIMIT $limit OFFSET $offset";
    $rs = $conexion->query($sql);
    $rows = [];
    while ($rs && $row = $rs->fetch_assoc()) { $rows[] = $row; }

    jexit(['success'=>true,'proveedores'=>$rows,'total'=>$total,'limit'=>$limit,'page'=>$page]);
  }

  // OBTENER uno
  case 'obtener': {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) jexit(['success'=>false,'error'=>'ID inválido'],400);
    $id = $conexion->real_escape_string($id);
    $rs = $conexion->query("SELECT * FROM proveedores WHERE id=$id LIMIT 1");
    $row = $rs? $rs->fetch_assoc() : null;
    if (!$row) jexit(['success'=>false,'error'=>'No encontrado'],404);
    jexit(['success'=>true,'proveedor'=>$row]);
  }

  // CREAR
  case 'crear': {
    $b = bodyJSON();
    $nombre    = trim($b['nombre'] ?? '');
    if ($nombre==='') jexit(['success'=>false,'error'=>'El nombre es requerido'],400);

    $contacto  = $conexion->real_escape_string(trim($b['contacto'] ?? ''));
    $telefono  = $conexion->real_escape_string(trim($b['telefono'] ?? ''));
    $email     = $conexion->real_escape_string(trim($b['email'] ?? ''));
    $direccion = $conexion->real_escape_string(trim($b['direccion'] ?? ''));
    $rfc       = $conexion->real_escape_string(trim($b['rfc'] ?? ''));
    $nombreEsc = $conexion->real_escape_string($nombre);

    $sql = "INSERT INTO proveedores (nombre,contacto,telefono,email,direccion,rfc,activo,creado_en)
            VALUES ('$nombreEsc','$contacto','$telefono','$email','$direccion','$rfc',1,NOW())";
    if (!$conexion->query($sql)) {
      jexit(['success'=>false,'error'=>'No se pudo crear: '.$conexion->error],500);
    }
    jexit(['success'=>true,'id'=>$conexion->insert_id]);
  }

  // ACTUALIZAR
  case 'actualizar': {
    $b = bodyJSON();
    $id = intval($b['id'] ?? 0);
    if (!$id) jexit(['success'=>false,'error'=>'ID inválido'],400);

    $nombre    = trim($b['nombre'] ?? '');
    if ($nombre==='') jexit(['success'=>false,'error'=>'El nombre es requerido'],400);

    $contacto  = $conexion->real_escape_string(trim($b['contacto'] ?? ''));
    $telefono  = $conexion->real_escape_string(trim($b['telefono'] ?? ''));
    $email     = $conexion->real_escape_string(trim($b['email'] ?? ''));
    $direccion = $conexion->real_escape_string(trim($b['direccion'] ?? ''));
    $rfc       = $conexion->real_escape_string(trim($b['rfc'] ?? ''));
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
      jexit(['success'=>false,'error'=>'No se pudo actualizar: '.$conexion->error],500);
    }
    jexit(['success'=>true]);
  }

  // ACTIVAR/DESACTIVAR (soft delete)
  case 'toggle_activo': {
    $b = bodyJSON();
    $id = intval($b['id'] ?? 0);
    $activo = ($b['activo'] ?? null);
    if ($id<=0 || ($activo!=='0' && $activo!=='1' && $activo!==0 && $activo!==1)) {
      jexit(['success'=>false,'error'=>'Parámetros inválidos'],400);
    }
    $activo = intval($activo);
    $sql = "UPDATE proveedores SET activo=$activo, actualizado_en=NOW() WHERE id=$id LIMIT 1";
    if (!$conexion->query($sql)) {
      jexit(['success'=>false,'error'=>'No se pudo cambiar el estado: '.$conexion->error],500);
    }
    jexit(['success'=>true]);
  }

  // ELIMINAR (físico, no recomendado). Si hay productos referidos, el FK pondrá NULL.
  case 'eliminar': {
    $b = bodyJSON();
    $id = intval($b['id'] ?? 0);
    if (!$id) jexit(['success'=>false,'error'=>'ID inválido'],400);
    $sql = "DELETE FROM proveedores WHERE id=$id LIMIT 1";
    if (!$conexion->query($sql)) {
      jexit(['success'=>false,'error'=>'No se pudo eliminar: '.$conexion->error],500);
    }
    jexit(['success'=>true]);
  }

  default:
    jexit(['success'=>false,'error'=>'Acción no soportada'],400);
}
