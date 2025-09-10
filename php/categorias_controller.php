<?php
require_once 'conexion.php';

header("Content-Type: application/json");
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
  case 'GET':
    if (isset($_GET['id'])) {
      $id = intval($_GET['id']);
      $stmt = $conexion->prepare("SELECT * FROM categorias WHERE id = ?");
      $stmt->bind_param("i", $id);
      $stmt->execute();
      $res = $stmt->get_result();
      echo json_encode($res->fetch_assoc());
    } else {
      $res = $conexion->query("SELECT * FROM categorias ORDER BY nombre ASC");
      $categorias = [];
      while ($row = $res->fetch_assoc()) {
        $categorias[] = $row;
      }
      echo json_encode(["success" => true, "categorias" => $categorias]);
    }
    break;

  case 'POST':
    $data = json_decode(file_get_contents("php://input"), true);
    
    $nombre = $data['nombre'] ?? '';
    $descripcion = $data['descripcion'] ?? '';
    if (!$nombre) {
    echo json_encode(["success" => false, "error" => "Nombre requerido"]);
    exit;
    }
    $stmt = $conexion->prepare("INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)");
    $stmt->bind_param("ss", $nombre, $descripcion);
    $stmt->execute();
    echo json_encode(["success" => true, "message" => "Categoría agregada"]);

    break;

  case 'PUT':
    $data = json_decode(file_get_contents("php://input"), true);
    $id = intval($data['id'] ?? 0);
    $nombre = $data['nombre'] ?? '';
    $descripcion = $data['descripcion'] ?? '';
    if (!$id || !$nombre) {
    echo json_encode(["success" => false, "error" => "Datos incompletos"]);
    exit;
    }
    $stmt = $conexion->prepare("UPDATE categorias SET nombre = ?, descripcion = ? WHERE id = ?");
    $stmt->bind_param("ssi", $nombre, $descripcion, $id);
    $stmt->execute();
    echo json_encode(["success" => true, "message" => "Categoría actualizada"]);
    break;

  case 'DELETE':
    $id = intval($_GET['id'] ?? 0);
    if (!$id) {
      echo json_encode(["success" => false, "error" => "ID requerido"]);
      exit;
    }
    $stmt = $conexion->prepare("DELETE FROM categorias WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    echo json_encode(["success" => true, "message" => "Categoría eliminada"]);
    break;

  default:
    echo json_encode(["success" => false, "error" => "Método no soportado"]);
    break;
}
