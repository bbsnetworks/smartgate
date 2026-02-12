<?php
// smartgate/php/clientes_inactivos.php
header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('America/Mexico_City');

require_once __DIR__ . '/conexion.php';

function out($arr, $code = 200) {
  http_response_code($code);
  echo json_encode($arr, JSON_UNESCAPED_UNICODE);
  exit;
}

if (!isset($conexion) || !($conexion instanceof mysqli)) {
  out(["ok"=>false, "error"=>"No hay conexión mysqli (\$conexion) en conexion.php"], 500);
}

$rango = isset($_GET["rango"]) ? trim($_GET["rango"]) : "2m";
$user  = isset($_GET["user"])  ? trim($_GET["user"])  : "all";
$limit = isset($_GET["limit"]) ? (int)$_GET["limit"]  : 150;
if ($limit <= 0 || $limit > 500) $limit = 150;

// Rangos solicitados
// 2m (default), 5m, 1y, 1y+
$tipo = "months";
$months = 2;
$years = 1;

if ($rango === "5m") { $tipo="months"; $months=5; }
else if ($rango === "1y") { $tipo="years"; $years=1; }
else if ($rango === "1y+") { $tipo="years_plus"; $years=1; }
else { $tipo="months"; $months=2; }

$thresholdExpr = ($tipo === "months")
  ? "DATE_SUB(CURDATE(), INTERVAL $months MONTH)"
  : "DATE_SUB(CURDATE(), INTERVAL $years YEAR)";

// Resolver userId si viene "me" (opcional) o número
$userIsAll = ($user === "all" || $user === "");
$userId = null;

if (!$userIsAll) {
  if ($user === "me") {
    session_start();
    $uid = $_SESSION["usuario"]["id"] ?? $_SESSION["usuario"]["uid"] ?? $_SESSION["usuario"]["iduser"] ?? null;
    $userId = $uid ? (int)$uid : null;
    if (!$userId) out(["ok"=>false, "error"=>"user=me pero no se pudo resolver uid de sesión. Envía user=<id>."], 400);
  } else {
    if (!ctype_digit($user)) out(["ok"=>false, "error"=>"Parámetro user inválido."], 400);
    $userId = (int)$user;
    if ($userId <= 0) out(["ok"=>false, "error"=>"Parámetro user inválido."], 400);
  }
}

$cn = $conexion;

// ✅ Subquery: último FIN por cliente (esto es lo que define “inactivo”)
$subWhere = "1=1";
$subTypes = "";
$subParams = [];

if (!$userIsAll && $userId !== null) {
  // tu tabla pagos tiene usuario_id
  $subWhere .= " AND p.usuario_id = ?";
  $subTypes .= "i";
  $subParams[] = $userId;
}

$subSql = "
  SELECT
    p.cliente_id AS cid,
    MAX(p.fecha_fin) AS ultimo_fin,
    MAX(p.fecha_pago) AS ultimo_pago
  FROM pagos p
  WHERE $subWhere
  GROUP BY p.cliente_id
";

// ✅ Condiciones
// A) Con pagos: ultimo_fin < threshold (ya lleva X meses/años vencido)
// B) Sin pagos: FechaIngreso < threshold (alta antigua)
$condConPago = "lp.ultimo_fin IS NOT NULL AND DATE(lp.ultimo_fin) < $thresholdExpr";
$condSinPago = "lp.ultimo_fin IS NULL AND c.FechaIngreso IS NOT NULL AND DATE(c.FechaIngreso) < $thresholdExpr";

// Si no hay FechaIngreso, aún puedes usar Inicio como fallback
$condSinPagoFallback = "lp.ultimo_fin IS NULL AND c.Inicio IS NOT NULL AND DATE(c.Inicio) < $thresholdExpr";

$whereClientUser = "";
$clientTypes = "";
$clientParams = [];

// Si también quieres filtrar clientes por usuario (si existiera columna), aquí NO aplica porque tu clientes no tiene usuario_id.
// Así que solo filtramos por usuario_id en pagos, y los “sin pagos” se muestran para all (o podrías ocultarlos si user != all).
if (!$userIsAll && $userId !== null) {
  // Para user específico: los sin pagos NO tienen usuario_id (no hay pagos), así que:
  // - o los ocultas (lo más lógico),
  // - o los muestras igual (pero no pertenecen a “ese usuario”).
  // ✅ Yo los oculto para evitar confusión:
  $condFinal = "($condConPago)";
} else {
  $condFinal = "($condConPago OR $condSinPago OR $condSinPagoFallback)";
}

$sql = "
  SELECT
    c.id AS idcliente,
    TRIM(CONCAT(IFNULL(c.nombre,''),' ',IFNULL(c.apellido,''))) AS nombre,
    c.telefono,
    c.FechaIngreso,
    c.data as personId,
    c.Inicio,
    lp.ultimo_fin,
    lp.ultimo_pago,
    CASE
      WHEN lp.ultimo_fin IS NOT NULL THEN DATEDIFF(CURDATE(), DATE(lp.ultimo_fin))
      WHEN c.FechaIngreso IS NOT NULL THEN DATEDIFF(CURDATE(), DATE(c.FechaIngreso))
      WHEN c.Inicio IS NOT NULL THEN DATEDIFF(CURDATE(), DATE(c.Inicio))
      ELSE NULL
    END AS dias_ref,
    CASE WHEN lp.ultimo_fin IS NULL THEN 1 ELSE 0 END AS sin_pagos
  FROM clientes c
  LEFT JOIN ($subSql) lp ON lp.cid = c.id
  WHERE $condFinal
  ORDER BY (lp.ultimo_fin IS NULL) DESC, lp.ultimo_fin ASC, c.FechaIngreso ASC
  LIMIT $limit
";

try {
  $st = $cn->prepare($sql);
  if (!$st) out(["ok"=>false, "error"=>"Prepare error: ".$cn->error], 500);

  if ($subParams) {
    $st->bind_param($subTypes, ...$subParams);
  }

  if (!$st->execute()) out(["ok"=>false, "error"=>"Execute error: ".$st->error], 500);
  $res = $st->get_result();

  $items = [];
  while ($row = $res->fetch_assoc()) {
    $items[] = [
      "idcliente" => (int)$row["idcliente"],
      "nombre" => $row["nombre"] ?? "",
      "telefono" => $row["telefono"] ?? "",
      "ultimo_fin" => $row["ultimo_fin"] ? (string)$row["ultimo_fin"] : null,
      "ultimo_pago" => $row["ultimo_pago"] ? (string)$row["ultimo_pago"] : null,
      "fecha_ingreso" => $row["FechaIngreso"] ? (string)$row["FechaIngreso"] : null,
      "inicio" => $row["Inicio"] ? (string)$row["Inicio"] : null,
      "dias_sin_pagar" => isset($row["dias_ref"]) ? (int)$row["dias_ref"] : null,
      "sin_pagos" => ((int)($row["sin_pagos"] ?? 0)) === 1,
      "personId" => (int)($row["personId"] ?? 0),
    ];
  }
  $st->close();

  out([
    "ok" => true,
    "rango" => $rango,
    "user" => $userIsAll ? "all" : $userId,
    "limit" => $limit,
    "items" => $items,
  ]);

} catch (Throwable $e) {
  out(["ok"=>false, "error"=>"Excepción: ".$e->getMessage()], 500);
}