muy bien, ahora necesito lo mismo para guardar_clientes

<?php
require 'conexion.php';
set_time_limit(300);
require 'Visitor.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
if (!$data || !is_array($data)) {
    echo json_encode(["error" => "Datos inválidos."]);
    exit;
}

$config = api_cfg();
if (!$config) {
  http_response_code(500);
  echo json_encode(["error"=>"Falta configuración de API. Ve a Dashboard → Configurar API HikCentral."]);
  exit;
}

$insertados = 0;

foreach ($data as $cliente) {
    $personCode = $cliente['personCode'];

    $stmt_check = $conexion->prepare("SELECT id FROM clientes WHERE personCode = ?");
    $stmt_check->bind_param("s", $personCode);
    $stmt_check->execute();
    $stmt_check->store_result();
    if ($stmt_check->num_rows > 0) continue;
    $stmt_check->close();

    $faceData = '';
    if (!empty($cliente['data']) && !empty($cliente['picUri'])) {
        try {
            $faceResult = Visitor::getPictureData($config, $cliente['data'], $cliente['picUri']);
            if (!empty($faceResult['data'])) {
                $faceData = preg_replace('/^data:image\/jpeg;base64,/', '', $faceResult['data']);
            }
        } catch (Exception $e) {
            // Si falla la imagen, continua sin ella
            $faceData = '';
        }
    }

    $stmt = $conexion->prepare("INSERT INTO clientes (
        personCode, nombre, apellido, genero, orgIndexCode, telefono, email, FechaIngreso,
        face, data, grupo, Inicio, Fin, face_icon, tipo, department
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $stmt->bind_param(
        "sssisssssissssss",
        $cliente['personCode'],
        $cliente['nombre'],
        $cliente['apellido'],
        $cliente['genero'],
        $cliente['orgIndexCode'],
        $cliente['telefono'],
        $cliente['email'],
        $cliente['FechaIngreso'],
        $faceData,
        $cliente['data'],
        $cliente['grupo'],
        $cliente['Inicio'],
        $cliente['Fin'],
        $cliente['face_icon'],
        $cliente['tipo'],
        $cliente['department']
    );

    if ($stmt->execute()) {
        $insertados++;
    }

    $stmt->close();
}

echo json_encode(["msg" => "$insertados clientes guardados correctamente."]);




