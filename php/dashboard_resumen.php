<?php
require_once './verificar_sesion.php';
require_once './conexion.php';
header('Content-Type: application/json; charset=utf-8');

// SESIÓN correcta
$uidSes = (int)($_SESSION['usuario']['id'] ?? 0);    // <-- id
$rolSes = $_SESSION['usuario']['rol'] ?? 'worker';

$period = $_GET['period'] ?? 'hoy';
$grafica = $_GET['grafica'] ?? null;
$tipoGraf = $_GET['tipo'] ?? 'todos';

// Filtro global de usuario (desde el select)
$userParam = $_GET['user'] ?? 'me'; // "me" | "all" | <id>
$selectedAll = ($userParam === 'all');
$selectedUid = ($userParam === 'me') ? $uidSes : (int)$userParam;

// Seguridad: worker solo ve lo suyo
if ($rolSes === 'worker') {
  $selectedAll = false;
  $selectedUid = $uidSes;
}

// ---------- helpers ----------
function columnaExiste(mysqli $cx, string $tabla, string $col): bool
{
  $dbRes = $cx->query("SELECT DATABASE() AS db");
  $db = $dbRes ? ($dbRes->fetch_assoc()['db'] ?? '') : '';
  $stmt = $cx->prepare("SELECT COUNT(*) c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?");
  $stmt->bind_param('sss', $db, $tabla, $col);
  $stmt->execute();
  $c = (int) ($stmt->get_result()->fetch_assoc()['c'] ?? 0);
  $stmt->close();
  return $c > 0;
}
function tablaExiste(mysqli $cx, string $tabla): bool {
  $dbRes = $cx->query("SELECT DATABASE() AS db");
  $db = $dbRes ? ($dbRes->fetch_assoc()['db'] ?? '') : '';
  $stmt = $cx->prepare("SELECT COUNT(*) c
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA=? AND TABLE_NAME=?");
  $stmt->bind_param('ss', $db, $tabla);
  $stmt->execute();
  $c = (int)($stmt->get_result()->fetch_assoc()['c'] ?? 0);
  $stmt->close();
  return $c > 0;
}


if (isset($_GET['serie'])) {
  $serie = $_GET['serie'] === 'prod' ? 'prod' : 'insc';
  $res   = $_GET['res']   ?? 'mes';

  if ($serie === 'insc') { $tabla = 'pagos';           $agregado = 'COUNT(*)'; }
  else                   { $tabla = 'pagos_productos'; $agregado = 'IFNULL(SUM(total),0)'; }

  if (columnaExiste($conexion, $tabla, 'fecha_pago'))    $colFecha = 'fecha_pago';
  elseif (columnaExiste($conexion, $tabla, 'fechapago')) $colFecha = 'fechapago';
  else                                                   $colFecha = 'fecha';

  if (columnaExiste($conexion, $tabla, 'usuario_id'))    $colUser = 'usuario_id';
  elseif (columnaExiste($conexion, $tabla, 'user'))      $colUser = 'user';
  else                                                   $colUser = 'usuario';

  $execRango = function($ini, $finExcl) use ($conexion,$tabla,$agregado,$colFecha,$colUser,$selectedAll,$selectedUid) {
    if ($selectedAll) {
      $sql = "SELECT $agregado AS total FROM $tabla WHERE $colFecha >= ? AND $colFecha < ?";
      $stmt = $conexion->prepare($sql);
      $stmt->bind_param('ss', $ini, $finExcl);
    } else {
      $sql = "SELECT $agregado AS total FROM $tabla WHERE $colFecha >= ? AND $colFecha < ? AND $colUser = ?";
      $stmt = $conexion->prepare($sql);
      $stmt->bind_param('ssi', $ini, $finExcl, $selectedUid);
    }
    $stmt->execute(); $r = $stmt->get_result()->fetch_assoc(); $stmt->close();
    return (float)($r['total'] ?? 0);
  };

  $labels = []; $data = [];
  if ($res === 'dia') {
    for ($i=29; $i>=0; $i--) {
      $ini = date('Y-m-d', strtotime("-$i days"));
      $finExcl = date('Y-m-d', strtotime("$ini +1 day"));
      $labels[] = date('d M', strtotime($ini));
      $data[] = $execRango($ini, $finExcl);
    }
  } elseif ($res === 'semana') {
    for ($i=11; $i>=0; $i--) {
      $ini = date('Y-m-d', strtotime("monday -$i week"));
      $finExcl = date('Y-m-d', strtotime("$ini +7 days"));
      $finShow = date('Y-m-d', strtotime("$ini +6 days"));
      $labels[] = date('d M', strtotime($ini)) . '–' . date('d M', strtotime($finShow));
      $data[] = $execRango($ini, $finExcl);
    }
  } else { // mes
    for ($i=11; $i>=0; $i--) {
      $iniMes = date('Y-m-01', strtotime("-$i months"));
      $finExcl = date('Y-m-01', strtotime("$iniMes +1 month"));
      $labels[] = date('M Y', strtotime($iniMes));
      $data[] = $execRango($iniMes, $finExcl);
    }
  }

  echo json_encode(['labels'=>$labels,'data'=>$data], JSON_UNESCAPED_UNICODE);
  exit;
}




$hoy = date('Y-m-d');
$ini = $hoy;
$fin = $hoy;
switch ($period) {
  case 'semana':
    $ini = date('Y-m-d', strtotime('monday this week'));
    $fin = date('Y-m-d', strtotime('sunday this week'));
    break;
  case 'mes':
    $ini = date('Y-m-01');
    $fin = date('Y-m-t');
    break;
}
$iniDt = $ini . ' 00:00:00';
$finDt = $fin . ' 23:59:59';

// (Conservamos tu antiguo grafica=12m por compatibilidad, pero ya no se usa)
if ($grafica === '12m') {
  $labels = [];
  $data = [];
  for ($i = 11; $i >= 0; $i--) {
    $ym = date('Y-m', strtotime("-$i months"));
    $labels[] = date('M Y', strtotime("$ym-01"));
    $desde = "$ym-01";
    $hasta = date('Y-m-t', strtotime($desde));
    if ($tipoGraf === 'usuario' && $rol === 'worker') {
      $sql = "SELECT IFNULL(SUM(monto),0) AS total FROM pagos WHERE DATE(fecha_pago) BETWEEN ? AND ? AND usuario_id=?";
      $stmt = $conexion->prepare($sql);
      $stmt->bind_param('ssi', $desde, $hasta, $uid);
    } else {
      $sql = "SELECT IFNULL(SUM(monto),0) AS total FROM pagos WHERE DATE(fecha_pago) BETWEEN ? AND ?";
      $stmt = $conexion->prepare($sql);
      $stmt->bind_param('ss', $desde, $hasta);
    }
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    $data[] = (float) ($r['total'] ?? 0);
    $stmt->close();
  }
  echo json_encode(['labels' => $labels, 'data' => $data], JSON_UNESCAPED_UNICODE);
  exit;
}

// ---------- KPIs ----------
$out = [
  'activos' => 0,
  'inactivos' => 0,
  'aniversarios_hoy' => 0,
  'aniversarios_lista' => [],
  'ventas_monto' => 0,
  'ventas_monto_fmt' => '$0.00',
  'ventas_detalle' => '',
  'inscripciones' => 0,
  'inscripciones_detalle' => '',
  'inscripciones_monto' => 0,
  'inscripciones_monto_fmt' => '$0.00',
  'inscripciones_monto_detalle' => '',
  'stock_bajo' => [],
  'stock_bajo_total' => 0,
  

];

// 1) Activos / NO activos (igual que antes)
$q1 = $conexion->query("
  SELECT 
    SUM(CASE WHEN Fin IS NOT NULL AND DATE(Fin) >= CURDATE() THEN 1 ELSE 0 END) AS activos,
    SUM(CASE WHEN Fin IS NULL OR DATE(Fin) < CURDATE() THEN 1 ELSE 0 END) AS inactivos
  FROM clientes
  WHERE tipo='clientes'
");
if ($q1) {
  $row = $q1->fetch_assoc();
  $out['activos']   = (int)($row['activos'] ?? 0);
  $out['inactivos'] = (int)($row['inactivos'] ?? 0);
}

// 2) Aniversarios HOY + lista (igual que antes)
$q2 = $conexion->query("
  SELECT COUNT(*) AS n
  FROM clientes
  WHERE tipo='clientes'
    AND FechaIngreso IS NOT NULL
    AND DATE_FORMAT(FechaIngreso, '%m-%d') = DATE_FORMAT(CURDATE(), '%m-%d')
");
if ($q2) $out['aniversarios_hoy'] = (int)($q2->fetch_assoc()['n'] ?? 0);

$q2d = $conexion->query("
  SELECT
    TRIM(CONCAT(COALESCE(nombre,''), ' ', COALESCE(apellido,''))) AS nombre,
    TIMESTAMPDIFF(YEAR, FechaIngreso, CURDATE()) AS anios
  FROM clientes
  WHERE tipo='clientes'
    AND FechaIngreso IS NOT NULL
    AND DATE_FORMAT(FechaIngreso, '%m-%d') = DATE_FORMAT(CURDATE(), '%m-%d')
  ORDER BY nombre ASC
");
$lista = [];
if ($q2d) { while ($r = $q2d->fetch_assoc()) $lista[] = ['nombre'=>$r['nombre'], 'anios'=>(int)$r['anios']]; }
$out['aniversarios_lista'] = $lista;

// --- Stock bajo (lista) ---
// Soporta 'productos' con columnas posibles:
//   nombre | descripcion
//   stock/existencias/cantidad
//   stock_min/min_stock/minimo
// Si no hay columna de mínimo, usamos umbral fijo (?umbral=5)
$umbralParam = isset($_GET['umbral']) ? (int)$_GET['umbral'] : 5;

if (tablaExiste($conexion, 'productos')) {
  // nombre
  $colNombre = columnaExiste($conexion, 'productos', 'nombre') ? 'nombre'
            : (columnaExiste($conexion, 'productos', 'descripcion') ? 'descripcion' : null);

  // stock actual
  $colStock  = columnaExiste($conexion, 'productos', 'stock') ? 'stock'
            : (columnaExiste($conexion, 'productos', 'existencias') ? 'existencias'
            : (columnaExiste($conexion, 'productos', 'cantidad') ? 'cantidad' : null));

  // mínimo por producto (opcional)
  $colMin    = columnaExiste($conexion, 'productos', 'stock_min') ? 'stock_min'
            : (columnaExiste($conexion, 'productos', 'min_stock') ? 'min_stock'
            : (columnaExiste($conexion, 'productos', 'minimo') ? 'minimo' : null));

  if ($colNombre && $colStock) {
    if ($colMin) {
      // Con mínimo por producto
      $sql = "SELECT $colNombre AS nombre, $colStock AS stock, $colMin AS min
              FROM productos
              WHERE COALESCE($colStock,0) <= COALESCE($colMin,0)
              ORDER BY $colStock ASC, $colNombre ASC
              LIMIT 30";
      $q = $conexion->query($sql);
    } else {
      // Sin columna de mínimo: umbral fijo
      $sql = "SELECT $colNombre AS nombre, $colStock AS stock
              FROM productos
              WHERE COALESCE($colStock,0) <= ?
              ORDER BY $colStock ASC, $colNombre ASC
              LIMIT 30";
      $stmt = $conexion->prepare($sql);
      $stmt->bind_param('i', $umbralParam);
      $stmt->execute();
      $q = $stmt->get_result();
    }

    $stockBajo = [];
    if ($q) {
      while ($r = $q->fetch_assoc()) {
        $stockBajo[] = [
          'nombre' => $r['nombre'],
          'stock'  => (int)($r['stock'] ?? 0),
          'min'    => isset($r['min']) ? (int)$r['min'] : null
        ];
      }
    }
    $out['stock_bajo'] = $stockBajo;
    $out['stock_bajo_total'] = count($stockBajo);
  }
}

// 3) Ventas de productos (SUM)  **NO tocar si no quieres descuento aquí**

if (columnaExiste($conexion, 'pagos_productos', 'fecha_pago'))       $colFechaPP = 'fecha_pago';
elseif (columnaExiste($conexion, 'pagos_productos', 'fechapago'))    $colFechaPP = 'fechapago';
else                                                                 $colFechaPP = 'fecha';

$colUserPP = columnaExiste($conexion, 'pagos_productos', 'usuario_id') ? 'usuario_id'
          : (columnaExiste($conexion, 'pagos_productos', 'user') ? 'user' : 'usuario');

if ($selectedAll) {
  $stmtVentas = $conexion->prepare("
    SELECT IFNULL(SUM(total),0) AS monto
    FROM pagos_productos
    WHERE $colFechaPP BETWEEN ? AND ?
  ");
  $stmtVentas->bind_param('ss', $iniDt, $finDt);
  $rolDetalle = 'todos';
} else {
  $stmtVentas = $conexion->prepare("
    SELECT IFNULL(SUM(total),0) AS monto
    FROM pagos_productos
    WHERE $colFechaPP BETWEEN ? AND ? AND $colUserPP = ?
  ");
  $stmtVentas->bind_param('ssi', $iniDt, $finDt, $selectedUid);
  $rolDetalle = 'usuario seleccionado';
}
$stmtVentas->execute();
$ventas = (float)($stmtVentas->get_result()->fetch_assoc()['monto'] ?? 0);
$stmtVentas->close();

$out['ventas_monto']     = $ventas;
$out['ventas_monto_fmt'] = '$' . number_format($ventas, 2);
$out['ventas_detalle']   = "Periodo: $period ($rolDetalle)";


// 4) Inscripciones (COUNT)  **(igual)**
if (columnaExiste($conexion, 'pagos', 'fecha_pago'))       $colFechaP = 'fecha_pago';
elseif (columnaExiste($conexion, 'pagos', 'fechapago'))    $colFechaP = 'fechapago';
else                                                       $colFechaP = 'fecha';

$colUserP = columnaExiste($conexion, 'pagos', 'usuario_id') ? 'usuario_id'
          : (columnaExiste($conexion, 'pagos', 'user') ? 'user' : 'usuario');

if ($selectedAll) {
  $stmtCnt = $conexion->prepare("
    SELECT COUNT(*) AS n
    FROM pagos
    WHERE $colFechaP BETWEEN ? AND ?
  ");
  $stmtCnt->bind_param('ss', $iniDt, $finDt);
  $rolDetalle2 = 'todos';
} else {
  $stmtCnt = $conexion->prepare("
    SELECT COUNT(*) AS n
    FROM pagos
    WHERE $colFechaP BETWEEN ? AND ? AND $colUserP = ?
  ");
  $stmtCnt->bind_param('ssi', $iniDt, $finDt, $selectedUid);
  $rolDetalle2 = 'usuario seleccionado';
}
$stmtCnt->execute();
$insc = (int)($stmtCnt->get_result()->fetch_assoc()['n'] ?? 0);
$stmtCnt->close();

$out['inscripciones']         = $insc;
$out['inscripciones_detalle'] = "Periodo: $period ($rolDetalle2)";

// 5) Monto total de inscripciones (SUM **con descuento**)
if ($selectedAll) {
  $stmtSum = $conexion->prepare("
    SELECT IFNULL(SUM(monto - IFNULL(descuento,0)), 0) AS monto
    FROM pagos
    WHERE $colFechaP BETWEEN ? AND ?
  ");
  $stmtSum->bind_param('ss', $iniDt, $finDt);
  $rolDetalle3 = 'todos';
} else {
  $stmtSum = $conexion->prepare("
    SELECT IFNULL(SUM(monto - IFNULL(descuento,0)), 0) AS monto
    FROM pagos
    WHERE $colFechaP BETWEEN ? AND ? AND $colUserP = ?
  ");
  $stmtSum->bind_param('ssi', $iniDt, $finDt, $selectedUid);
  $rolDetalle3 = 'usuario seleccionado';
}
$stmtSum->execute();
$montoIns = (float)($stmtSum->get_result()->fetch_assoc()['monto'] ?? 0);
$stmtSum->close();

$out['inscripciones_monto']         = $montoIns;
$out['inscripciones_monto_fmt']     = '$' . number_format($montoIns, 2);
$out['inscripciones_monto_detalle'] = "Periodo: $period ($rolDetalle3)";


echo json_encode($out, JSON_UNESCAPED_UNICODE);

