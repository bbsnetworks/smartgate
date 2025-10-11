<?php
// php/caf_pedidos_controller.php
require_once __DIR__ . '/conexion.php';
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? 'listar';

function out($arr){ echo json_encode($arr, JSON_UNESCAPED_UNICODE); exit; }

if ($action === 'listar') {
  $modo       = $_GET['modo'] ?? 'dia';            // 'dia' | 'mes'
  $fechaDia   = $_GET['fecha'] ?? '';              // YYYY-MM-DD
  $fechaMes   = $_GET['mes'] ?? '';
  $estado     = trim($_GET['estado'] ?? '');                // YYYY-MM
  $codigo     = trim($_GET['codigo'] ?? '');
  $page       = max(1, (int)($_GET['page'] ?? 1));
  $pageSize   = min(100, max(5, (int)($_GET['pageSize'] ?? 20)));
  $offset     = ($page - 1) * $pageSize;

  $colFecha = 'creado_en';
  $tabla    = 'caf_pedidos';

  $where = [];
  $params = [];
  $types = '';

  if ($modo === 'mes' && preg_match('/^\d{4}-\d{2}$/', $fechaMes)) {
    $inicio = $fechaMes . '-01 00:00:00';
    $where[] = "$colFecha >= ? AND $colFecha < DATE_ADD(?, INTERVAL 1 MONTH)";
    $params[] = $inicio; $types .= 's';
    $params[] = $inicio; $types .= 's';
  } elseif ($modo === 'dia' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaDia)) {
    $where[] = "$colFecha BETWEEN ? AND ?";
    $params[] = $fechaDia . ' 00:00:00'; $types .= 's';
    $params[] = $fechaDia . ' 23:59:59'; $types .= 's';
  } else {
    out(['success' => false, 'message' => 'Parámetros de fecha inválidos.']);
  }

  if ($codigo !== '') {
    $where[] = "codigo LIKE ?";
    $params[] = "%$codigo%"; $types .= 's';
  }
  if ($estado !== '') {
    // Lista blanca de estados válidos
    $valid = ['pendiente','en_preparacion','listo','entregado','cancelado','pagado'];
    if (!in_array($estado, $valid, true)) {
      out(['success'=>false,'message'=>'Estado inválido.']);
    }
    $where[] = "estado = ?";
    $params[] = $estado; $types .= 's';
  }

  $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

  // COUNT
  $sqlCount = "SELECT COUNT(*) AS total FROM $tabla p $whereSql";
  $stmt = $conexion->prepare($sqlCount);
  if ($types) $stmt->bind_param($types, ...$params);
  $stmt->execute();
  $total = (int)($stmt->get_result()->fetch_assoc()['total'] ?? 0);
  $stmt->close();

  // SELECT (solo columnas reales)
  $sql = "
    SELECT
      p.id,
      COALESCE(p.codigo,'')        AS codigo,
      COALESCE(p.person_code,'')   AS person_code,
      COALESCE(p.origen,'')        AS origen,
      COALESCE(p.estado,'')        AS estado,
      COALESCE(p.subtotal,0)       AS subtotal,
      COALESCE(p.descuento,0)      AS descuento,
      COALESCE(p.impuestos,0)      AS impuestos,
      COALESCE(p.propina,0)        AS propina,
      COALESCE(p.total,0)          AS total,
      p.creado_en                  AS creado_en,
      p.pagado_en                  AS pagado_en
    FROM $tabla p
    $whereSql
    ORDER BY p.$colFecha DESC, p.id DESC
    LIMIT ? OFFSET ?
  ";

  $stmt = $conexion->prepare($sql);
  $types2 = $types . 'ii';
  $params2 = $params;
  $params2[] = $pageSize;
  $params2[] = $offset;
  $stmt->bind_param($types2, ...$params2);
  $stmt->execute();
  $rs = $stmt->get_result();

  $rows = [];
  while($row = $rs->fetch_assoc()){ $rows[] = $row; }
  $stmt->close();

  out([
    'success' => true,
    'page' => $page,
    'pageSize' => $pageSize,
    'total' => $total,
    'rows' => $rows
  ]);
}

out(['success' => false, 'message' => 'Acción no soportada.']);
