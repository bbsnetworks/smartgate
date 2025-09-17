<?php
// php/get_api_config.php
require_once __DIR__ . '/conexion.php';

function obtenerApiConfig(mysqli $conexion) {
  $id = 1;
  $stmt = $conexion->prepare("SELECT userKey, userSecret, urlHikCentralAPI FROM api_config WHERE id=?");
  $stmt->bind_param('i', $id);
  if (!$stmt->execute()) return null;
  $res = $stmt->get_result();
  $row = $res->fetch_assoc();
  if (!$row) return null;

  return (object)[
    "userKey" => $row['userKey'],
    "userSecret" => $row['userSecret'],
    "urlHikCentralAPI" => rtrim($row['urlHikCentralAPI'], '/')
  ];
}
