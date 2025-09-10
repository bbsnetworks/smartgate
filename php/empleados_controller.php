<?php
require_once 'conexion.php';
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$action = $data["action"] ?? ($_SERVER["REQUEST_METHOD"] === "GET" ? "listar" : null);

if ($action === "listar") {
    $filtro = strtolower(trim($data["filtro"] ?? ""));
    $sql = "SELECT id, nombre, apellido, telefono, email, tipo, face, data, emergencia, sangre, comentarios 
        FROM clientes 
        WHERE tipo = 'empleados' OR tipo = 'gerencia'";


    if (!empty($filtro)) {
        $sql .= " AND (LOWER(nombre) LIKE ? OR LOWER(apellido) LIKE ? OR telefono LIKE ?)";
        $stmt = $conexion->prepare($sql);
        $like = "%$filtro%";
        $stmt->bind_param("sss", $like, $like, $like);
    } else {
        $stmt = $conexion->prepare($sql);
    }

    $stmt->execute();
    $res = $stmt->get_result();
    $empleados = [];

    while ($row = $res->fetch_assoc()) {
        $empleados[] = $row;
    }

    echo json_encode(["success" => true, "empleados" => $empleados]);
    exit;
}

if ($data['action'] === 'actualizar') {
    if (!isset($data['data'], $data['nombre'], $data['apellido'], $data['telefono'], $data['email'], $data['inicio'], $data['fin'], $data['orgIndexCode'], $data['orgName'])) {
        echo json_encode(["success" => false, "error" => "Faltan datos"]);
        exit;
    }

    $stmt = $conexion->prepare("SELECT * FROM clientes WHERE data = ?");
    $stmt->bind_param("i", $data['data']);
    $stmt->execute();
    $res = $stmt->get_result();
    $user = $res->fetch_assoc();
    $stmt->close();

    if (!$user) {
        echo json_encode(["success" => false, "error" => "Empleado no encontrado"]);
        exit;
    }

    // Convertir fechas a formato ISO para HikCentral
    function convertirFechaHik($fechaLocal) {
        $dt = new DateTime($fechaLocal, new DateTimeZone('America/Mexico_City'));
        return $dt->format("Y-m-d\TH:i:sP");
    }

    // Determinar tipo y departamento desde el texto del <select>
    $orgName = strtolower(trim($data["orgName"]));
    if ($orgName === 'empleados') {
        $tipo = 'empleados';
        $department = "All Departments/Gym Zero/Empleados";
    } elseif ($orgName === 'gerencia') {
        $tipo = 'gerencia';
        $department = "All Departments/Gym Zero/Gerencia";
    } else {
        $tipo = 'clientes';
        $department = "All Departments/Gym Zero/Clientes";
    }

    // === Regla de transición: empleado/gerencia -> clientes ===
    // Si el registro original NO era clientes y AHORA será clientes,
    // forzamos ventana corta: inicio = fecha de ingreso elegida, fin = inicio + 3 horas.
    $tipoOriginal = strtolower($user['tipo'] ?? '');
    if (($tipoOriginal === 'empleados' || $tipoOriginal === 'gerencia') && $tipo === 'clientes') {
        $tz = new DateTimeZone('America/Mexico_City');
        $inicioDT = !empty($data['inicio'])
            ? new DateTime($data['inicio'], $tz)
            : new DateTime('now', $tz);
        $finDT = clone $inicioDT;
        $finDT->modify('+3 hours');

        // Reescribimos para BD y para convertir a ISO posteriormente
        $data['inicio'] = $inicioDT->format('Y-m-d\TH:i'); // formato de <input type="datetime-local">
        $data['fin']    = $finDT->format('Y-m-d\TH:i');
    }
    // === Fin regla de transición ===

    // Actualizar en base local
    $emergencia  = $data['emergencia']  ?? null;
    $sangre      = $data['sangre']      ?? null;
    $comentarios = $data['comentarios'] ?? null;

    $stmt = $conexion->prepare("UPDATE clientes 
        SET nombre = ?, apellido = ?, telefono = ?, email = ?, emergencia = ?, sangre = ?, comentarios = ?, Inicio = ?, Fin = ?, orgIndexCode = ?, tipo = ?, department = ? 
        WHERE data = ?");

    $stmt->bind_param("sssssssssissi", 
        $data['nombre'],          // s
        $data['apellido'],        // s
        $data['telefono'],        // s
        $data['email'],           // s
        $emergencia,              // s
        $sangre,                  // s
        $comentarios,             // s
        $data['inicio'],          // s
        $data['fin'],             // s
        $data['orgIndexCode'],    // i
        $tipo,                    // s
        $department,              // s
        $data['data']             // i
    );

    $stmt->execute();
    $stmt->close();

    // Configuración y actualización en HikCentral
    require_once 'Encrypter.php';
    require_once 'Visitor.php';

    $config = (object)[
        "userKey" => "21660945",
        "userSecret" => "93iLwvnQkXAvlHw8wbQz",
        "urlHikCentralAPI" => "http://127.0.0.1:9016"
    ];

    $payload = [
        "personId"         => (string)$data["data"],
        "personCode"       => $user["personCode"],
        "personFamilyName" => $data["apellido"],
        "personGivenName"  => $data["nombre"],
        "orgIndexCode"     => $data["orgIndexCode"],
        "gender"           => (int)$user["genero"],
        "phoneNo"          => $data["telefono"],
        "email"            => $data["email"],
        "beginTime"        => convertirFechaHik($data["inicio"]),
        "endTime"          => convertirFechaHik($data["fin"])
    ];

    $response = Visitor::updateUser($config, $payload);

    if (isset($response["code"]) && $response["code"] === "0") {
        echo json_encode(["success" => true, "msg" => "Empleado actualizado correctamente."]);
    } else {
        echo json_encode(["success" => false, "error" => "Error en API HikCentral: " . ($response["msg"] ?? "Desconocido")]);
    }

    exit;
}





if ($data['action'] === 'obtener' && isset($data['id'])) {
    $stmt = $conexion->prepare("SELECT nombre, apellido, telefono, email,face, tipo, Inicio, Fin, data, orgIndexCode, emergencia, sangre, comentarios FROM clientes WHERE data = ?");
    $stmt->bind_param("i", $data['id']);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        echo json_encode(["success" => true, "datos" => $row]);
    } else {
        echo json_encode(["success" => false, "error" => "Empleado no encontrado"]);
    }
    exit;
}


if ($action === "eliminar") {
    if (!isset($data["id"])) {
        echo json_encode(["success" => false, "error" => "ID no recibido"]);
        exit;
    }

    $stmt = $conexion->prepare("DELETE FROM clientes WHERE id = ? AND tipo = 'empleado'");
    $stmt->bind_param("i", $data["id"]);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "msg" => "Empleado eliminado correctamente."]);
    } else {
        echo json_encode(["success" => false, "error" => $stmt->error]);
    }
    exit;
}

echo json_encode(["success" => false, "error" => "Acción no válida"]);
