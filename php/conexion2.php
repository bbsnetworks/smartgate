<?php
// conexion2_safe.php — Conexión REMOTA segura (no hace die)
$__REMOTE_HOSTPORT = 'b88e0bd2df17.sn.mynetname.net:3306'; // o 192.168.99.253:3306
$__REMOTE_DB   = 'suscripciones';
$__REMOTE_USER = 'adminbbs';
$__REMOTE_PASS = 'Admin_Pinck';

// Timeout corto para que no bloquee
$__TIMEOUT = 2;

$conexionRemota = mysqli_init();
if ($conexionRemota) {
  mysqli_options($conexionRemota, MYSQLI_OPT_CONNECT_TIMEOUT, $__TIMEOUT);

  // separar host:puerto si viene junto
  $host = $__REMOTE_HOSTPORT;
  $port = 3306;
  if (strpos($__REMOTE_HOSTPORT, ':') !== false) {
    [$h, $p] = explode(':', $__REMOTE_HOSTPORT, 2);
    $host = $h;
    $port = is_numeric($p) ? (int)$p : 3306;
  }

  @mysqli_real_connect($conexionRemota, $host, $__REMOTE_USER, $__REMOTE_PASS, $__REMOTE_DB, $port);

  if (mysqli_connect_errno()) {
    // Si falla, dejamos $conexionRemota = null (no rompemos nada)
    $conexionRemota = null;
  } else {
    mysqli_set_charset($conexionRemota, 'utf8');
  }
} else {
  $conexionRemota = null;
}
