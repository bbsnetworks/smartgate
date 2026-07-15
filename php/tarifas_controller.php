<?php
require_once 'conexion.php';
require_once 'verificar_sesion.php';

header('Content-Type: application/json; charset=utf-8');

$usuarioId = (int) ($_SESSION['usuario']['id'] ?? 0);
$rolUsuario = $_SESSION['usuario']['rol'] ?? '';

if ($usuarioId <= 0) {
  echo json_encode([
    'success' => false,
    'error' => 'Sesión inválida o expirada.'
  ]);
  exit;
}

function esAdministrador(): bool
{
  global $rolUsuario;

  return in_array($rolUsuario, ['admin', 'root'], true);
}

function responder($data)
{
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function obtenerJson()
{
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);

  if (!is_array($data)) {
    responder([
      'success' => false,
      'error' => 'JSON inválido.'
    ]);
  }

  return $data;
}

function limpiarTexto($valor)
{
  return trim((string) ($valor ?? ''));
}

function validarMonto($valor)
{
  if ($valor === '' || $valor === null) {
    return false;
  }

  if (!is_numeric($valor)) {
    return false;
  }

  return floatval($valor) >= 0;
}

$metodo = $_SERVER['REQUEST_METHOD'];

try {
  if ($metodo === 'GET') {
    $accion = $_GET['accion'] ?? 'listar';

    if ($accion !== 'listar') {
      responder([
        'success' => false,
        'error' => 'Acción GET no válida.'
      ]);
    }

    $pagina = isset($_GET['pagina']) ? max(1, intval($_GET['pagina'])) : 1;
    $limite = isset($_GET['limite']) ? max(1, intval($_GET['limite'])) : 10;
    $offset = ($pagina - 1) * $limite;

    $busqueda = limpiarTexto($_GET['busqueda'] ?? '');
    $activo = $_GET['activo'] ?? '';

    $where = [];
    $params = [];
    $types = '';

    if ($busqueda !== '') {
      $where[] = "(nombre LIKE ? OR descripcion LIKE ?)";
      $like = "%{$busqueda}%";
      $params[] = $like;
      $params[] = $like;
      $types .= 'ss';
    }

    if ($activo !== '' && ($activo === '0' || $activo === '1')) {
      $where[] = "activo = ?";
      $params[] = intval($activo);
      $types .= 'i';
    }

    $whereSql = count($where) > 0 ? 'WHERE ' . implode(' AND ', $where) : '';

    /*
      Total de registros para paginación
    */
    $sqlTotal = "SELECT COUNT(*) AS total FROM tarifas {$whereSql}";
    $stmtTotal = $conexion->prepare($sqlTotal);

    if (!$stmtTotal) {
      throw new Exception('Error preparando total: ' . $conexion->error);
    }

    if (!empty($params)) {
      $stmtTotal->bind_param($types, ...$params);
    }

    $stmtTotal->execute();
    $resTotal = $stmtTotal->get_result();
    $total = intval($resTotal->fetch_assoc()['total'] ?? 0);
    $stmtTotal->close();

    /*
      Listado paginado
    */
    $sql = "
      SELECT 
        id,
        nombre,
        monto,
        descripcion,
        activo,
        creado_en,
        actualizado_en
      FROM tarifas
      {$whereSql}
      ORDER BY activo DESC, nombre ASC
      LIMIT ? OFFSET ?
    ";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
      throw new Exception('Error preparando listado: ' . $conexion->error);
    }

    $paramsListado = $params;
    $typesListado = $types . 'ii';
    $paramsListado[] = $limite;
    $paramsListado[] = $offset;

    $stmt->bind_param($typesListado, ...$paramsListado);

    $stmt->execute();
    $result = $stmt->get_result();

    $tarifas = [];

    while ($row = $result->fetch_assoc()) {
      $tarifas[] = [
        'id' => intval($row['id']),
        'nombre' => $row['nombre'],
        'monto' => $row['monto'] !== null ? floatval($row['monto']) : 0,
        'descripcion' => $row['descripcion'],
        'activo' => intval($row['activo']),
        'creado_en' => $row['creado_en'],
        'actualizado_en' => $row['actualizado_en']
      ];
    }

    $stmt->close();

    responder([
      'success' => true,
      'tarifas' => $tarifas,
      'total' => $total,
      'pagina' => $pagina,
      'limite' => $limite
    ]);
  }

  if ($metodo !== 'POST') {
    responder([
      'success' => false,
      'error' => 'Método no permitido.'
    ]);
  }

  $data = obtenerJson();
  $accion = $data['accion'] ?? '';
  $accionesAdministrativas = [
    'agregar',
    'editar',
    'cambiar_estado',
    'eliminar'
  ];

  if (
    in_array($accion, $accionesAdministrativas, true)
    && !esAdministrador()
  ) {
    responder([
      'success' => false,
      'error' => 'Acceso restringido. Solo administradores pueden modificar tarifas.'
    ]);
  }

  /*
    AGREGAR TARIFA
  */
  if ($accion === 'agregar') {
    $nombre = limpiarTexto($data['nombre'] ?? '');
    $monto = $data['monto'] ?? null;
    $descripcion = limpiarTexto($data['descripcion'] ?? '');
    $activo = isset($data['activo']) ? intval($data['activo']) : 1;

    if ($nombre === '') {
      responder([
        'success' => false,
        'error' => 'El nombre de la tarifa es obligatorio.'
      ]);
    }

    if (!validarMonto($monto)) {
      responder([
        'success' => false,
        'error' => 'El monto de la tarifa no es válido.'
      ]);
    }

    $activo = $activo === 1 ? 1 : 0;
    $monto = floatval($monto);

    /*
      Evitar duplicados por nombre
    */
    $stmtDup = $conexion->prepare("SELECT id FROM tarifas WHERE nombre = ? LIMIT 1");

    if (!$stmtDup) {
      throw new Exception('Error preparando validación de duplicado: ' . $conexion->error);
    }

    $stmtDup->bind_param('s', $nombre);
    $stmtDup->execute();
    $resDup = $stmtDup->get_result();

    if ($resDup->num_rows > 0) {
      $stmtDup->close();

      responder([
        'success' => false,
        'error' => 'Ya existe una tarifa con ese nombre.'
      ]);
    }

    $stmtDup->close();

    $stmt = $conexion->prepare("
      INSERT INTO tarifas 
        (nombre, monto, descripcion, activo)
      VALUES 
        (?, ?, ?, ?)
    ");

    if (!$stmt) {
      throw new Exception('Error preparando inserción: ' . $conexion->error);
    }

    $stmt->bind_param('sdsi', $nombre, $monto, $descripcion, $activo);

    if (!$stmt->execute()) {
      throw new Exception('Error al guardar la tarifa: ' . $stmt->error);
    }

    $idNuevo = $stmt->insert_id;
    $stmt->close();

    responder([
      'success' => true,
      'message' => 'Tarifa agregada correctamente.',
      'id' => $idNuevo
    ]);
  }

  /*
    EDITAR TARIFA
  */
  if ($accion === 'editar') {
    $id = intval($data['id'] ?? 0);
    $nombre = limpiarTexto($data['nombre'] ?? '');
    $monto = $data['monto'] ?? null;
    $descripcion = limpiarTexto($data['descripcion'] ?? '');
    $activo = isset($data['activo']) ? intval($data['activo']) : 1;

    if ($id <= 0) {
      responder([
        'success' => false,
        'error' => 'ID de tarifa inválido.'
      ]);
    }

    if ($nombre === '') {
      responder([
        'success' => false,
        'error' => 'El nombre de la tarifa es obligatorio.'
      ]);
    }

    if (!validarMonto($monto)) {
      responder([
        'success' => false,
        'error' => 'El monto de la tarifa no es válido.'
      ]);
    }

    $activo = $activo === 1 ? 1 : 0;
    $monto = floatval($monto);

    /*
      Verificar que exista
    */
    $stmtExiste = $conexion->prepare("SELECT id FROM tarifas WHERE id = ? LIMIT 1");

    if (!$stmtExiste) {
      throw new Exception('Error preparando validación de existencia: ' . $conexion->error);
    }

    $stmtExiste->bind_param('i', $id);
    $stmtExiste->execute();
    $resExiste = $stmtExiste->get_result();

    if ($resExiste->num_rows === 0) {
      $stmtExiste->close();

      responder([
        'success' => false,
        'error' => 'La tarifa no existe.'
      ]);
    }

    $stmtExiste->close();

    /*
      Evitar duplicado de nombre con otro ID
    */
    $stmtDup = $conexion->prepare("SELECT id FROM tarifas WHERE nombre = ? AND id <> ? LIMIT 1");

    if (!$stmtDup) {
      throw new Exception('Error preparando validación de duplicado: ' . $conexion->error);
    }

    $stmtDup->bind_param('si', $nombre, $id);
    $stmtDup->execute();
    $resDup = $stmtDup->get_result();

    if ($resDup->num_rows > 0) {
      $stmtDup->close();

      responder([
        'success' => false,
        'error' => 'Ya existe otra tarifa con ese nombre.'
      ]);
    }

    $stmtDup->close();

    $stmt = $conexion->prepare("
      UPDATE tarifas
      SET 
        nombre = ?,
        monto = ?,
        descripcion = ?,
        activo = ?
      WHERE id = ?
    ");

    if (!$stmt) {
      throw new Exception('Error preparando actualización: ' . $conexion->error);
    }

    $stmt->bind_param('sdsii', $nombre, $monto, $descripcion, $activo, $id);

    if (!$stmt->execute()) {
      throw new Exception('Error al actualizar la tarifa: ' . $stmt->error);
    }

    $stmt->close();

    responder([
      'success' => true,
      'message' => 'Tarifa actualizada correctamente.'
    ]);
  }

  /*
    CAMBIAR ESTADO
  */
  if ($accion === 'cambiar_estado') {
    $id = intval($data['id'] ?? 0);
    $activo = isset($data['activo']) ? intval($data['activo']) : null;

    if ($id <= 0) {
      responder([
        'success' => false,
        'error' => 'ID de tarifa inválido.'
      ]);
    }

    if ($activo !== 0 && $activo !== 1) {
      responder([
        'success' => false,
        'error' => 'Estado inválido.'
      ]);
    }

    $stmt = $conexion->prepare("
      UPDATE tarifas
      SET activo = ?
      WHERE id = ?
    ");

    if (!$stmt) {
      throw new Exception('Error preparando cambio de estado: ' . $conexion->error);
    }

    $stmt->bind_param('ii', $activo, $id);

    if (!$stmt->execute()) {
      throw new Exception('Error al cambiar estado de la tarifa: ' . $stmt->error);
    }

    if ($stmt->affected_rows === 0) {
      $stmt->close();

      responder([
        'success' => false,
        'error' => 'No se encontró la tarifa o no hubo cambios.'
      ]);
    }

    $stmt->close();

    responder([
      'success' => true,
      'message' => $activo === 1
        ? 'Tarifa activada correctamente.'
        : 'Tarifa desactivada correctamente.'
    ]);
  }
  /*
  ELIMINAR TARIFA
  Solo se puede eliminar si no tiene pagos relacionados.
*/
  if ($accion === 'eliminar') {
    $id = intval($data['id'] ?? 0);

    if ($id <= 0) {
      responder([
        'success' => false,
        'error' => 'ID de tarifa inválido.'
      ]);
    }

    /*
      Verificar que exista la tarifa
    */
    $stmtExiste = $conexion->prepare("SELECT id FROM tarifas WHERE id = ? LIMIT 1");

    if (!$stmtExiste) {
      throw new Exception('Error preparando validación de existencia: ' . $conexion->error);
    }

    $stmtExiste->bind_param('i', $id);
    $stmtExiste->execute();
    $resExiste = $stmtExiste->get_result();

    if ($resExiste->num_rows === 0) {
      $stmtExiste->close();

      responder([
        'success' => false,
        'error' => 'La tarifa no existe.'
      ]);
    }

    $stmtExiste->close();

    /*
      Verificar si tiene pagos relacionados
    */
    $stmtPagos = $conexion->prepare("
    SELECT COUNT(*) AS total
    FROM pagos
    WHERE tarifa_id = ?
  ");

    if (!$stmtPagos) {
      throw new Exception('Error preparando validación de pagos: ' . $conexion->error);
    }

    $stmtPagos->bind_param('i', $id);
    $stmtPagos->execute();
    $resPagos = $stmtPagos->get_result();
    $totalPagos = intval($resPagos->fetch_assoc()['total'] ?? 0);
    $stmtPagos->close();

    if ($totalPagos > 0) {
      responder([
        'success' => false,
        'error' => 'Esta tarifa no se puede eliminar porque ya tiene pagos registrados. Puedes desactivarla para que ya no aparezca en nuevos pagos.'
      ]);
    }

    /*
      Eliminar tarifa
    */
    $stmt = $conexion->prepare("DELETE FROM tarifas WHERE id = ?");

    if (!$stmt) {
      throw new Exception('Error preparando eliminación: ' . $conexion->error);
    }

    $stmt->bind_param('i', $id);

    if (!$stmt->execute()) {
      throw new Exception('Error al eliminar la tarifa: ' . $stmt->error);
    }

    $stmt->close();

    responder([
      'success' => true,
      'message' => 'Tarifa eliminada correctamente.'
    ]);
  }
  responder([
    'success' => false,
    'error' => 'Acción no válida.'
  ]);

} catch (Throwable $e) {
  responder([
    'success' => false,
    'error' => $e->getMessage()
  ]);
}