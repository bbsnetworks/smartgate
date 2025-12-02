<?php
require_once './conexion.php';

echo "<pre>";
echo "PHP date(): " . date('Y-m-d H:i:s') . "\n";

$r = $conexion->query("SELECT NOW() AS mysql_now, CURDATE() AS mysql_date");
$row = $r->fetch_assoc();
echo "MySQL NOW():   " . $row['mysql_now'] . "\n";
echo "MySQL CURDATE(): " . $row['mysql_date'] . "\n";
echo "</pre>";
