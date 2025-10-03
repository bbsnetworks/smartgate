<?php
require_once 'conexion.php';
require_once 'verificar_sesion.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

// Si viene JSON en POST, leerlo
if ($method === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true);
  if (isset($input['action'])) $action = $input['action'];
}

try {
  if ($action === 'listar') {
    listar($conexion);
  } elseif ($action === 'obtener') {
    obtener($conexion);
  } elseif ($action === 'crear' && $method === 'POST') {
    crear($conexion, $input);
  } elseif ($action === 'actualizar' && $method === 'POST') {
    actualizar($conexion, $input);
  } elseif ($action === 'eliminar' && $method === 'POST') {
    eliminar($conexion, $input);
  } else {
    echo json_encode(['success'=>false, 'error'=>'Acción no válida']);
  }
} catch (Throwable $e) {
  echo json_encode(['success'=>false, 'error'=>$e->getMessage()]);
}

/* ============ funciones ============ */

function listar(mysqli $db) {
  $q = trim($_GET['q'] ?? '');
  $limit  = max(1, (int)($_GET['limit'] ?? 10));
  $offset = max(0, (int)($_GET['offset'] ?? 0));
  $solo_activos = isset($_GET['solo_activos']) ? (int)$_GET['solo_activos'] : null;

  $where = 'WHERE 1';
  $params = [];
  $types  = '';

  if ($q !== '') {
    $where .= ' AND nombre LIKE ?';
    $params[] = "%{$q}%"; $types .= 's';
  }
  if ($solo_activos === 1) {
    $where .= ' AND activo = 1';
  }

  // total
  $sqlCount = "SELECT COUNT(*) AS t FROM caf_categorias $where";
  $stmt = $db->prepare($sqlCount);
  if ($types) $stmt->bind_param($types, ...$params);
  $stmt->execute();
  $res = $stmt->get_result()->fetch_assoc();
  $total = (int)($res['t'] ?? 0);
  $stmt->close();

  // datos
  $sql = "SELECT id, nombre, activo, orden, creado_en, actualizado_en
          FROM caf_categorias
          $where
          ORDER BY orden ASC, nombre ASC
          LIMIT ? OFFSET ?";
  $stmt = $db->prepare($sql);

  if ($types) {
    $types2 = $types . 'ii';
    $params2 = array_merge($params, [$limit, $offset]);
    $stmt->bind_param($types2, ...$params2);
  } else {
    $stmt->bind_param('ii', $limit, $offset);
  }

  $stmt->execute();
  $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
  $stmt->close();

  echo json_encode(['success'=>true, 'total'=>$total, 'categorias'=>$rows]);
}

function obtener(mysqli $db) {
  $id = (int)($_GET['id'] ?? 0);
  if ($id<=0) { echo json_encode(['success'=>false, 'error'=>'ID inválido']); return; }

  $stmt = $db->prepare("SELECT id, nombre, activo, orden, creado_en, actualizado_en FROM caf_categorias WHERE id=?");
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  $stmt->close();

  if (!$row) { echo json_encode(['success'=>false, 'error'=>'No encontrado']); return; }
  echo json_encode(['success'=>true, 'categoria'=>$row]);
}

function crear(mysqli $db, array $in) {
  $nombre = trim($in['nombre'] ?? '');
  $activo = isset($in['activo']) ? (int)$in['activo'] : 1;
  $orden  = isset($in['orden']) ? (int)$in['orden'] : 0;

  if ($nombre === '') { echo json_encode(['success'=>false, 'error'=>'Nombre requerido']); return; }

  $stmt = $db->prepare("INSERT INTO caf_categorias (nombre, activo, orden) VALUES (?,?,?)");
  $stmt->bind_param('sii', $nombre, $activo, $orden);
  $ok = $stmt->execute();
  $id = $stmt->insert_id;
  $stmt->close();

  if (!$ok) { echo json_encode(['success'=>false, 'error'=>'No se pudo crear']); return; }
  echo json_encode(['success'=>true, 'id'=>$id]);
}

function actualizar(mysqli $db, array $in) {
  $id = (int)($in['id'] ?? 0);
  if ($id<=0) { echo json_encode(['success'=>false, 'error'=>'ID inválido']); return; }

  // Campos opcionales
  $nombre = isset($in['nombre']) ? trim($in['nombre']) : null;
  $activo = isset($in['activo']) ? (int)$in['activo'] : null;
  $orden  = isset($in['orden'])  ? (int)$in['orden']  : null;

  $sets = [];
  $params = [];
  $types  = '';

  if ($nombre !== null) { $sets[]='nombre=?'; $params[]=$nombre; $types.='s'; }
  if ($activo !== null) { $sets[]='activo=?'; $params[]=$activo; $types.='i'; }
  if ($orden  !== null) { $sets[]='orden=?';  $params[]=$orden;  $types.='i'; }

  if (empty($sets)) { echo json_encode(['success'=>false, 'error'=>'Sin cambios']); return; }

  $sql = "UPDATE caf_categorias SET ".implode(',', $sets)." WHERE id=?";
  $params[] = $id; $types .= 'i';

  $stmt = $db->prepare($sql);
  $stmt->bind_param($types, ...$params);
  $ok = $stmt->execute();
  $stmt->close();

  echo json_encode(['success'=>$ok]);
}

function eliminar(mysqli $db, array $in) {
  $id = (int)($in['id'] ?? 0);
  if ($id<=0) { echo json_encode(['success'=>false, 'error'=>'ID inválido']); return; }

  try {
    $stmt = $db->prepare("DELETE FROM caf_categorias WHERE id=?");
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $errno = $stmt->errno;
    $stmt->close();

    if (!$ok) {
      // 1451 = Cannot delete or update a parent row: a foreign key constraint fails
      if ($errno == 1451) {
        echo json_encode(['success'=>false, 'code'=>'FOREIGN_KEY', 'error'=>'Tiene productos asociados']);
        return;
      }
      echo json_encode(['success'=>false, 'error'=>'No se pudo eliminar']);
      return;
    }

    echo json_encode(['success'=>true]);
  } catch (Throwable $e) {
    echo json_encode(['success'=>false, 'error'=>$e->getMessage()]);
  }
}
