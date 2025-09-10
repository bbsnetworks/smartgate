<?php
header('Content-Type: application/json');

require_once __DIR__ . '/conexion.php';        // LOCAL
require_once __DIR__ . '/conexion2.php';  // REMOTA opcional

// 1) Leer la licencia local actual
$r = $conexion->query("SELECT suscripcion_id FROM suscripcion_local WHERE id=1 LIMIT 1");
if (!$r || $r->num_rows === 0) {
  echo json_encode(["success" => false, "error" => "No hay licencia local registrada."]);
  exit;
}
$local = $r->fetch_assoc();
$localId = (int)$local['suscripcion_id'];

// 2) Borrar local (operación offline)
$del = $conexion->query("DELETE FROM suscripcion_local WHERE id=1");
if (!$del) {
  echo json_encode(["success" => false, "error" => "No se pudo eliminar la licencia local."]);
  exit;
}

// 3) Intentar revertir en remoto (no crítico si falla)
$revertedRemote = false;
if ($conexionRemota) {
  $up = $conexionRemota->prepare("UPDATE pagos_suscripciones SET usada = 0 WHERE id = ? LIMIT 1");
  $up->bind_param("i", $localId);
  $revertedRemote = $up->execute();
  $up->close();
}

echo json_encode([
  "success" => true,
  "mensaje" => $revertedRemote
    ? "Suscripción eliminada localmente y revertida en el servidor."
    : "Suscripción eliminada localmente. (No se pudo contactar al servidor para revertir)"
]);
