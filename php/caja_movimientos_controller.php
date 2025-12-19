<?php
require_once __DIR__ . '/verificar_sesion.php'; // aquí ya tienes $conexion y sesión validada

header('Content-Type: application/json; charset=utf-8');

function out($ok, $extra = [])
{
    echo json_encode(array_merge(['ok' => $ok], $extra));
    exit;
}

$uid = (int) ($_SESSION['usuario']['id'] ?? 0);
$rol = (string) ($_SESSION['usuario']['rol'] ?? '');

if (!$uid)
    out(false, ['error' => 'Sesión inválida']);

function resolveSelectedUser($userParam, $uid, $rol)
{
    // 'me' | id | 'all'
    if ($rol === 'worker')
        return $uid; // worker siempre solo ve lo suyo
    if ($userParam === 'me')
        return $uid;
    if ($userParam === 'all')
        return null;
    $tmp = (int) $userParam;
    return $tmp > 0 ? $tmp : $uid;
}

/* =========================
   GET: resumen/listado
========================= */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    $userParam = $_GET['user'] ?? 'me';

    $selectedUid = resolveSelectedUser($userParam, $uid, $rol);
    $isAll = ($userParam === 'all' && $rol !== 'worker');

    if ($action === 'resumen_hoy') {

        if ($isAll) {
            $sql = "SELECT 
                COALESCE(SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE 0 END),0) ingreso,
                COALESCE(SUM(CASE WHEN tipo='EGRESO' THEN monto ELSE 0 END),0) egreso,
                COUNT(*) cantidad
              FROM caja_movimientos
              WHERE DATE(fecha)=CURDATE()";
            $st = $conexion->prepare($sql);
        } else {
            $sql = "SELECT 
                COALESCE(SUM(CASE WHEN tipo='INGRESO' THEN monto ELSE 0 END),0) ingreso,
                COALESCE(SUM(CASE WHEN tipo='EGRESO' THEN monto ELSE 0 END),0) egreso,
                COUNT(*) cantidad
              FROM caja_movimientos
              WHERE usuario_id=? AND DATE(fecha)=CURDATE()";
            $st = $conexion->prepare($sql);
            $st->bind_param('i', $selectedUid);
        }

        $st->execute();
        $res = $st->get_result();
        $row = $res ? $res->fetch_assoc() : null;
        $st->close();

        out(true, [
            'ingreso' => (float) ($row['ingreso'] ?? 0),
            'egreso' => (float) ($row['egreso'] ?? 0),
            'cantidad' => (int) ($row['cantidad'] ?? 0),
        ]);
    }

    if ($action === 'listar_hoy') {

        if ($isAll) {
            $sql = "SELECT id, tipo, monto, DATE_FORMAT(fecha,'%Y-%m-%d %H:%i:%s') fecha, concepto, observaciones, usuario_id
              FROM caja_movimientos
              WHERE DATE(fecha)=CURDATE()
              ORDER BY fecha DESC
              LIMIT 50";
            $st = $conexion->prepare($sql);
        } else {
            $sql = "SELECT id, tipo, monto, DATE_FORMAT(fecha,'%Y-%m-%d %H:%i:%s') fecha, concepto, observaciones, usuario_id
              FROM caja_movimientos
              WHERE usuario_id=? AND DATE(fecha)=CURDATE()
              ORDER BY fecha DESC
              LIMIT 50";
            $st = $conexion->prepare($sql);
            $st->bind_param('i', $selectedUid);
        }

        $st->execute();
        $res = $st->get_result();
        $items = [];
        while ($res && ($r = $res->fetch_assoc()))
            $items[] = $r;
        $st->close();

        out(true, ['items' => $items]);
    }

    out(false, ['error' => 'Acción GET inválida']);
}

/* =========================
   POST: crear movimiento
   IMPORTANTE:
   - Se requiere que NO esté en "all" (igual que Caja)
   - Pero se guarda SIEMPRE al usuario LOGUEADO
========================= */

function cajaActualizadaHoy($conexion, $uid)
{
    $st = $conexion->prepare("SELECT fecha_actualizacion FROM caja WHERE usuario_id=? LIMIT 1");
    $st->bind_param('i', $uid);
    $st->execute();
    $res = $st->get_result();
    $row = $res ? $res->fetch_assoc() : null;
    $st->close();

    if (!$row || empty($row['fecha_actualizacion']))
        return false;

    // compara solo la fecha YYYY-MM-DD
    return substr((string) $row['fecha_actualizacion'], 0, 10) === date('Y-m-d');
}

function totalIngresosHoyUsuario($conexion, $uid)
{
    // Ventas de productos (pagos_productos.total)
    $st = $conexion->prepare("
    SELECT COALESCE(SUM(total),0) AS total_prod
    FROM pagos_productos
    WHERE usuario_id=?
      AND fecha_pago >= CURDATE()
      AND fecha_pago < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
  ");
    $st->bind_param('i', $uid);
    $st->execute();
    $row1 = $st->get_result()->fetch_assoc() ?: ['total_prod' => 0];
    $st->close();

    // Suscripciones (pagos.monto - descuento)
    $st = $conexion->prepare("
    SELECT COALESCE(SUM(GREATEST(monto - COALESCE(descuento,0), 0)),0) AS total_subs
    FROM pagos
    WHERE usuario_id=?
      AND fecha_pago >= CURDATE()
      AND fecha_pago < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
  ");
    $st->bind_param('i', $uid);
    $st->execute();
    $row2 = $st->get_result()->fetch_assoc() ?: ['total_subs' => 0];
    $st->close();

    return (float) $row1['total_prod'] + (float) $row2['total_subs'];
}


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action !== 'crear')
        out(false, ['error' => 'Acción inválida']);

    $userParam = $_POST['user'] ?? 'me';
    if ($userParam === 'all')
        out(false, ['error' => 'Selecciona un usuario para registrar movimientos']);

    $tipo = strtoupper(trim($_POST['tipo'] ?? ''));
    $monto = (float) ($_POST['monto'] ?? 0);
    $concepto = trim($_POST['concepto'] ?? '');
    $observaciones = trim($_POST['observaciones'] ?? '');

    if (!in_array($tipo, ['INGRESO', 'EGRESO'], true))
        out(false, ['error' => 'Tipo inválido']);
    if ($monto <= 0)
        out(false, ['error' => 'Monto inválido']);
    if ($concepto === '')
        out(false, ['error' => 'Concepto requerido']);

    /* =====================================================
       🔐 VALIDACIÓN SOLO PARA EGRESO
       ===================================================== */
    if ($tipo === 'EGRESO') {

        /* =============================
           1) Monto actual en caja
           ============================= */
        $st = $conexion->prepare("
    SELECT monto, fecha_actualizacion
    FROM caja
    WHERE usuario_id=?
    LIMIT 1
  ");
        $st->bind_param('i', $uid);
        $st->execute();
        $rowCaja = $st->get_result()->fetch_assoc();
        $st->close();

        $montoCaja = (float) ($rowCaja['monto'] ?? 0);
        $cajaHoy = false;

        if (!empty($rowCaja['fecha_actualizacion'])) {
            $cajaHoy = substr($rowCaja['fecha_actualizacion'], 0, 10) === date('Y-m-d');
        }

        /* =============================
           2) Ingresos del día
           ============================= */
        $st = $conexion->prepare("
    SELECT COALESCE(SUM(total),0) AS total
    FROM pagos_productos
    WHERE usuario_id=?
      AND fecha_pago >= CURDATE()
      AND fecha_pago < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
  ");
        $st->bind_param('i', $uid);
        $st->execute();
        $ventas = (float) ($st->get_result()->fetch_assoc()['total'] ?? 0);
        $st->close();

        // INGRESOS registrados manualmente en caja_movimientos (hoy)
        $st = $conexion->prepare("
  SELECT COALESCE(SUM(monto),0) AS total
  FROM caja_movimientos
  WHERE usuario_id=?
    AND tipo='INGRESO'
    AND fecha >= CURDATE()
    AND fecha < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
");
        $st->bind_param('i', $uid);
        $st->execute();
        $ingresosMovHoy = (float) ($st->get_result()->fetch_assoc()['total'] ?? 0);
        $st->close();


        $st = $conexion->prepare("
    SELECT COALESCE(SUM(GREATEST(monto - COALESCE(descuento,0),0)),0) AS total
    FROM pagos
    WHERE usuario_id=?
      AND fecha_pago >= CURDATE()
      AND fecha_pago < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
  ");
        $st->bind_param('i', $uid);
        $st->execute();
        $subs = (float) ($st->get_result()->fetch_assoc()['total'] ?? 0);
        $st->close();

        $ingresosHoy = $ventas + $subs;

        /* =============================
           3) Egresos ya realizados hoy
           ============================= */
        $st = $conexion->prepare("
    SELECT COALESCE(SUM(monto),0) AS total
    FROM caja_movimientos
    WHERE usuario_id=?
      AND tipo='EGRESO'
      AND fecha >= CURDATE()
      AND fecha < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
  ");
        $st->bind_param('i', $uid);
        $st->execute();
        $egresosHoy = (float) ($st->get_result()->fetch_assoc()['total'] ?? 0);
        $st->close();

        /* =============================
           4) Saldo disponible REAL
           ============================= */
        $saldoDisponible = $montoCaja + $ingresosHoy + $ingresosMovHoy - $egresosHoy;


        if ($saldoDisponible < $monto) {
            out(false, [
                'error' => 'No puedes retirar más dinero del disponible en caja.',
                'detalle' => [
                    'caja' => $montoCaja,
                    'ingresos_hoy' => $ingresosHoy,
                    'ingresos_mov_hoy' => $ingresosMovHoy,
                    'egresos_hoy' => $egresosHoy,
                    'saldo_disponible' => $saldoDisponible,
                    'retiro_intentado' => $monto
                ]

            ]);
        }
    }

    /* ===================================================== */

    // ✅ Guardar movimiento (INGRESO o EGRESO permitido)
    $st = $conexion->prepare("
    INSERT INTO caja_movimientos (tipo, monto, fecha, usuario_id, concepto, observaciones)
    VALUES (?, ?, NOW(), ?, ?, ?)
  ");
    $st->bind_param('sdiss', $tipo, $monto, $uid, $concepto, $observaciones);

    $ok = $st->execute();
    $st->close();

    if (!$ok)
        out(false, ['error' => 'No se pudo guardar el movimiento']);

    out(true);
}


out(false, ['error' => 'Método no permitido']);
