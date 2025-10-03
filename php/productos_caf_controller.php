<?php
require_once 'conexion.php';
require_once 'verificar_sesion.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

if ($method === 'POST' && empty($action)) {
  // Si viene multipart, toma action de POST común
  $action = $_POST['action'] ?? null;
}
if ($method === 'POST' && $action !== 'upload_imagen') {
  $input = json_decode(file_get_contents('php://input'), true);
  if (isset($input['action'])) $action = $input['action'];
}

try {
  switch ($action) {
    case 'listar':     listar($conexion); break;
    case 'obtener':    obtener($conexion); break;
    case 'crear':      if($method==='POST') crear($conexion, $input); else err405(); break;
    case 'actualizar': if($method==='POST') actualizar($conexion, $input); else err405(); break;
    case 'eliminar':   if($method==='POST') eliminar($conexion, $input); else err405(); break;
    case 'categorias': categorias($conexion); break;
    case 'upload_imagen': upload_imagen(); break;               // << NUEVO
    default: echo json_encode(['success'=>false, 'error'=>'Acción no válida']);
  }
} catch (Throwable $e) {
  echo json_encode(['success'=>false, 'error'=>$e->getMessage()]);
}

/* ====== funciones ====== */

function categorias(mysqli $db){
  $res = $db->query("SELECT id, nombre, activo FROM caf_categorias ORDER BY orden ASC, nombre ASC");
  $rows = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
  echo json_encode(['success'=>true, 'categorias'=>$rows]);
}

function listar(mysqli $db){
  $q      = trim($_GET['q'] ?? '');
  $cat_id = isset($_GET['categoria_id']) && $_GET['categoria_id'] !== '' ? (int)$_GET['categoria_id'] : null;
  $solo   = isset($_GET['solo_activos']) ? (int)$_GET['solo_activos'] : null;
  $limit  = max(1, (int)($_GET['limit'] ?? 10));
  $offset = max(0, (int)($_GET['offset'] ?? 0));

  $where = 'WHERE 1';
  $params = []; $types = '';
  if ($q !== '') { $where .= ' AND (p.nombre LIKE ? OR p.descripcion LIKE ?)'; $params[]="%$q%"; $params[]="%$q%"; $types.='ss'; }
  if ($cat_id !== null) { $where .= ' AND p.categoria_id = ?'; $params[]=$cat_id; $types.='i'; }
  if ($solo === 1) { $where .= ' AND p.activo = 1'; }

  $sqlCount = "SELECT COUNT(*) t FROM caf_productos p $where";
  $stmt = $db->prepare($sqlCount);
  if ($types) $stmt->bind_param($types, ...$params);
  $stmt->execute(); $total = (int)$stmt->get_result()->fetch_assoc()['t']; $stmt->close();

  $sql = "SELECT
            p.id, p.categoria_id, p.nombre, p.descripcion, p.imagen_url,
            p.activo, p.orden, p.creado_en, p.actualizado_en,
            c.nombre AS categoria_nombre,
            agg.n_sizes, agg.min_precio, agg.sizes_str
          FROM caf_productos p
          LEFT JOIN caf_categorias c ON c.id = p.categoria_id
          LEFT JOIN (
            SELECT producto_id,
                   COUNT(*) AS n_sizes,
                   MIN(CASE WHEN activo=1 THEN precio END) AS min_precio,
                   GROUP_CONCAT(CONCAT(etiqueta,'|',precio)
                                ORDER BY orden, etiqueta SEPARATOR ';;') AS sizes_str
            FROM caf_productos_tamanos
            WHERE activo=1
            GROUP BY producto_id
          ) agg ON agg.producto_id = p.id
          $where
          ORDER BY p.orden ASC, p.nombre ASC
          LIMIT ? OFFSET ?";
  $stmt = $db->prepare($sql);
  if ($types) { $types.='ii'; $params[]=$limit; $params[]=$offset; $stmt->bind_param($types, ...$params); }
  else { $stmt->bind_param('ii', $limit, $offset); }
  $stmt->execute(); $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC); $stmt->close();

  echo json_encode(['success'=>true, 'total'=>$total, 'productos'=>$rows]);
}



function obtener(mysqli $db){
  $id = (int)($_GET['id'] ?? 0);
  if ($id<=0) { echo json_encode(['success'=>false,'error'=>'ID inválido']); return; }

  $sql = "SELECT p.id, p.categoria_id, p.nombre, p.descripcion, p.imagen_url,
                 p.activo, p.orden, p.creado_en, p.actualizado_en,
                 c.nombre AS categoria_nombre
          FROM caf_productos p
          LEFT JOIN caf_categorias c ON c.id=p.categoria_id
          WHERE p.id=?";
  $stmt=$db->prepare($sql); $stmt->bind_param('i',$id); $stmt->execute();
  $row=$stmt->get_result()->fetch_assoc(); $stmt->close();
  if(!$row){ echo json_encode(['success'=>false,'error'=>'No encontrado']); return; }

  // tamaños
  $res=$db->prepare("SELECT etiqueta, precio, orden, activo
                     FROM caf_productos_tamanos
                     WHERE producto_id=? ORDER BY orden ASC, etiqueta ASC");
  $res->bind_param('i',$id); $res->execute();
  $row['tamanos']=$res->get_result()->fetch_all(MYSQLI_ASSOC); $res->close();

  echo json_encode(['success'=>true,'producto'=>$row]);
}



function crear(mysqli $db, array $in){
  $nombre       = trim($in['nombre'] ?? '');
  $categoria_id = isset($in['categoria_id']) && $in['categoria_id'] !== '' ? (int)$in['categoria_id'] : null;
  $descripcion  = isset($in['descripcion']) ? trim($in['descripcion']) : null;
  $imagen_url   = isset($in['imagen_url']) ? trim($in['imagen_url']) : null;
  $activo       = isset($in['activo']) ? (int)$in['activo'] : 1;
  $orden        = isset($in['orden']) ? (int)$in['orden'] : 0;
  $tamanos      = (!empty($in['tamanos']) && is_array($in['tamanos'])) ? $in['tamanos'] : [];

  if ($nombre === '') { echo json_encode(['success'=>false,'error'=>'Nombre requerido']); return; }
  if (empty($tamanos)) { echo json_encode(['success'=>false,'error'=>'Agrega al menos un tamaño con precio']); return; }

  $db->begin_transaction();

  $sql  = "INSERT INTO caf_productos (categoria_id, nombre, descripcion, imagen_url, activo, orden)
           VALUES (?,?,?,?,?,?)";
  $stmt = $db->prepare($sql);
  $stmt->bind_param('isssii', $categoria_id, $nombre, $descripcion, $imagen_url, $activo, $orden);
  $ok = $stmt->execute();
  $id = $stmt->insert_id;
  $stmt->close();

  if (!$ok) { $db->rollback(); echo json_encode(['success'=>false,'error'=>'No se pudo crear el producto']); return; }

  if (!save_tamanos($db, (int)$id, $tamanos)) {
    $db->rollback();
    echo json_encode(['success'=>false,'error'=>'No se pudieron guardar los tamaños (verifica duplicados)']);
    return;
  }

  $db->commit();
  echo json_encode(['success'=>true, 'id'=>$id]);
}



function actualizar(mysqli $db, array $in){
  $id = (int)($in['id'] ?? 0);
  if ($id <= 0) { echo json_encode(['success'=>false,'error'=>'ID inválido']); return; }

  $sets=[]; $params=[]; $types='';

  if (array_key_exists('categoria_id', $in)) {
    $sets[] = 'categoria_id=?';
    $params[] = ($in['categoria_id'] !== null && $in['categoria_id'] !== '') ? (int)$in['categoria_id'] : NULL;
    $types  .= 'i';
  }
  if (isset($in['nombre']))               { $sets[]='nombre=?';       $params[] = trim($in['nombre']);             $types.='s'; }
  if (array_key_exists('descripcion',$in)){ $sets[]='descripcion=?';  $params[] = ($in['descripcion']!==null ? trim($in['descripcion']) : NULL); $types.='s'; }
  if (array_key_exists('imagen_url',$in)) { $sets[]='imagen_url=?';   $params[] = ($in['imagen_url']!==null ? trim($in['imagen_url']) : NULL);   $types.='s'; }
  if (isset($in['activo']))               { $sets[]='activo=?';       $params[] = (int)$in['activo'];              $types.='i'; }
  if (isset($in['orden']))                { $sets[]='orden=?';        $params[] = (int)$in['orden'];               $types.='i'; }

  $db->begin_transaction();

  if (!empty($sets)) {
    $sql = "UPDATE caf_productos SET ".implode(',', $sets)." WHERE id=?";
    $params[] = $id; $types .= 'i';
    $stmt = $db->prepare($sql);
    $stmt->bind_param($types, ...$params);
    if (!$stmt->execute()) { $stmt->close(); $db->rollback(); echo json_encode(['success'=>false,'error'=>'No se pudo actualizar el producto']); return; }
    $stmt->close();
  }

  if (!empty($in['replace_tamanos'])) {
    $tamanos = (!empty($in['tamanos']) && is_array($in['tamanos'])) ? $in['tamanos'] : [];
    if (!save_tamanos($db, $id, $tamanos)) {
      $db->rollback();
      echo json_encode(['success'=>false,'error'=>'No se pudieron guardar los tamaños (verifica duplicados)']);
      return;
    }
  }

  $db->commit();
  echo json_encode(['success'=>true]);
}



function eliminar(mysqli $db, array $in){
  $id = (int)($in['id'] ?? 0);
  if ($id<=0) { echo json_encode(['success'=>false,'error'=>'ID inválido']); return; }

  try{
    $stmt = $db->prepare("DELETE FROM caf_productos WHERE id=?");
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute(); $errno = $stmt->errno;
    $stmt->close();

    if (!$ok) {
      if ($errno == 1451) { echo json_encode(['success'=>false,'code'=>'FOREIGN_KEY','error'=>'Producto referenciado']); return; }
      echo json_encode(['success'=>false,'error'=>'No se pudo eliminar']); return;
    }
    echo json_encode(['success'=>true]);
  }catch(Throwable $e){
    echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
  }
}

/* Subida de imagen */
function upload_imagen(){
  $dir = __DIR__ . '/../uploads/cafeteria/';  // FS real: htdocs/smartgate/uploads/cafeteria
  if (!is_dir($dir)) { @mkdir($dir, 0775, true); }

  if (empty($_FILES['file']['name'])) { echo json_encode(['success'=>false,'error'=>'Archivo vacío']); return; }
  $f = $_FILES['file'];
  if ($f['error'] !== UPLOAD_ERR_OK) { echo json_encode(['success'=>false,'error'=>'Error al subir ('.$f['error'].')']); return; }

  $allowed = ['jpg','jpeg','png','webp','gif'];
  $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
  if (!in_array($ext, $allowed)) { echo json_encode(['success'=>false,'error'=>'Formato no permitido']); return; }
  if ($f['size'] > 5*1024*1024) { echo json_encode(['success'=>false,'error'=>'Archivo muy grande (máx 5MB)']); return; }

  $safe  = preg_replace('/[^a-zA-Z0-9_\-]/','-', pathinfo($f['name'], PATHINFO_FILENAME));
  $fname = $safe . '-' . date('YmdHis') . '.' . $ext;
  $dest  = $dir . $fname;

  if (!move_uploaded_file($f['tmp_name'], $dest)) {
    echo json_encode(['success'=>false,'error'=>'No se pudo guardar el archivo']); return;
  }

  // Lo que se guarda en BD (portátil):
  $pathRel = 'uploads/cafeteria/' . $fname;

  // URL pública absoluta (incluye host:puerto)
  $scheme  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $host    = $_SERVER['HTTP_HOST']; // incluye :8080 si aplica
  $baseWeb = preg_replace('#/php$#','', rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\')); // /smartgate
  $urlAbs  = $scheme.'://'.$host.$baseWeb.'/'.$pathRel;

  echo json_encode(['success'=>true, 'url'=>$urlAbs, 'path'=>$pathRel]);
}

function save_tamanos(mysqli $db, int $producto_id, array $tamanos): bool {
  // Borra los tamaños actuales
  $del = $db->prepare("DELETE FROM caf_productos_tamanos WHERE producto_id=?");
  $del->bind_param('i', $producto_id);
  if (!$del->execute()) { $del->close(); return false; }
  $del->close();

  if (empty($tamanos)) return true;

  // Inserta los nuevos
  $ins = $db->prepare(
    "INSERT INTO caf_productos_tamanos (producto_id, etiqueta, precio, orden, activo)
     VALUES (?,?,?,?,?)"
  );
  foreach ($tamanos as $t) {
    $etiqueta = trim($t['etiqueta'] ?? '');
    if ($etiqueta === '') continue;
    $precio = (float)($t['precio'] ?? 0);
    $orden  = (int)  ($t['orden']  ?? 0);
    $activo = (int)  ($t['activo'] ?? 1);
    $ins->bind_param('issdi', $producto_id, $etiqueta, $precio, $orden, $activo);
    if (!$ins->execute()) { $ins->close(); return false; }
  }
  $ins->close();
  return true;
}


