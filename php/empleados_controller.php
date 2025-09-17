<?php
require_once 'conexion.php';
require_once 'Visitor.php';
header("Content-Type: application/json");

$data   = json_decode(file_get_contents("php://input"), true);
$action = $data["action"] ?? ($_SERVER["REQUEST_METHOD"] === "GET" ? "listar" : null);

/* LISTAR */
if ($action === "listar") {
    // Evita warnings si $data es null con GET sin body
    $filtro = strtolower(trim(is_array($data) ? ($data["filtro"] ?? "") : ""));
    $sql = "SELECT id, nombre, apellido, telefono, email, tipo, face, data, emergencia, sangre, comentarios
            FROM clientes
            WHERE (tipo = 'empleados' OR tipo = 'gerencia')";

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
    while ($row = $res->fetch_assoc()) $empleados[] = $row;

    echo json_encode(["success" => true, "empleados" => $empleados]);
    exit;
}

/* ACTUALIZAR */
if (($data['action'] ?? null) === 'actualizar') {
    // Acceso (opcional, pero recomendado)
    session_start();
    if (!in_array($_SESSION['usuario']['rol'] ?? '', ['admin','root'])) {
        http_response_code(403);
        echo json_encode(["success"=>false,"error"=>"No autorizado"]);
        exit;
    }

    if (!isset($data['data'], $data['nombre'], $data['apellido'], $data['telefono'], $data['email'],
               $data['inicio'], $data['fin'], $data['orgIndexCode'], $data['orgName'])) {
        echo json_encode(["success" => false, "error" => "Faltan datos"]);
        exit;
    }

    $stmt = $conexion->prepare("SELECT * FROM clientes WHERE data = ?");
    $stmt->bind_param("i", $data['data']);
    $stmt->execute();
    $res  = $stmt->get_result();
    $user = $res->fetch_assoc();
    $stmt->close();

    if (!$user) {
        echo json_encode(["success" => false, "error" => "Empleado no encontrado"]);
        exit;
    }
    if (empty($user['data'])) {
        echo json_encode(["success"=>false,"error"=>"El empleado no tiene personId (data) en HikCentral."]);
        exit;
    }

    // Conversión de fechas a ISO para Hik
    $convertirFechaHik = function ($fechaLocal) {
        $dt = new DateTime($fechaLocal, new DateTimeZone('America/Mexico_City'));
        return $dt->format("Y-m-d\TH:i:sP");
    };

    // Tipo/department desde el select
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

    // Regla transición: empleados/gerencia -> clientes (ventana corta)
    $tipoOriginal = strtolower($user['tipo'] ?? '');
    if (($tipoOriginal === 'empleados' || $tipoOriginal === 'gerencia') && $tipo === 'clientes') {
        $tz = new DateTimeZone('America/Mexico_City');
        $inicioDT = !empty($data['inicio']) ? new DateTime($data['inicio'], $tz) : new DateTime('now', $tz);
        $finDT = (clone $inicioDT)->modify('+3 hours');
        $data['inicio'] = $inicioDT->format('Y-m-d\TH:i');
        $data['fin']    = $finDT->format('Y-m-d\TH:i');
    }

    // Config desde DB
    $config = api_cfg();
    if (!$config) {
        http_response_code(500);
        echo json_encode(["success"=>false,"error"=>"Falta configuración de API. Ve a Dashboard → Configurar API HikCentral."]);
        exit;
    }

    // API primero
    $payload = [
        "personId"         => (string)$user["data"],
        "personCode"       => $user["personCode"],
        "personFamilyName" => $data["apellido"],
        "personGivenName"  => $data["nombre"],
        "orgIndexCode"     => $data["orgIndexCode"],
        "gender"           => (int)$user["genero"],
        "phoneNo"          => $data["telefono"],
        "email"            => $data["email"],
        "beginTime"        => $convertirFechaHik($data["inicio"]),
        "endTime"          => $convertirFechaHik($data["fin"])
    ];
    $response = Visitor::updateUser($config, $payload);
    if (!isset($response["code"]) || (string)$response["code"] !== "0") {
        echo json_encode(["success"=>false,"error"=>"Error en API HikCentral: ".($response["msg"] ?? "Desconocido")]);
        exit;
    }

    // Luego BD
    $emergencia  = $data['emergencia']  ?? null;
    $sangre      = $data['sangre']      ?? null;
    $comentarios = $data['comentarios'] ?? null;

    $stmt = $conexion->prepare("UPDATE clientes
        SET nombre = ?, apellido = ?, telefono = ?, email = ?, emergencia = ?, sangre = ?, comentarios = ?,
            Inicio = ?, Fin = ?, orgIndexCode = ?, tipo = ?, department = ?
        WHERE data = ?");
    // orgIndexCode es string
    $stmt->bind_param(
        "ssssssssssssi",
        $data['nombre'],
        $data['apellido'],
        $data['telefono'],
        $data['email'],
        $emergencia,
        $sangre,
        $comentarios,
        $data['inicio'],
        $data['fin'],
        $data['orgIndexCode'],
        $tipo,
        $department,
        $data['data']
    );
    $stmt->execute();
    $stmt->close();

    echo json_encode(["success" => true, "msg" => "Empleado actualizado correctamente."]);
    exit;
}

/* OBTENER */
if (($data['action'] ?? null) === 'obtener' && isset($data['id'])) {
    $stmt = $conexion->prepare("SELECT nombre, apellido, telefono, email, face, tipo, Inicio, Fin, data, orgIndexCode, emergencia, sangre, comentarios
                                FROM clientes WHERE data = ?");
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

/* ELIMINAR */
if ($action === "eliminar") {
    if (!isset($data["id"])) {
        echo json_encode(["success" => false, "error" => "ID no recibido"]);
        exit;
    }

    $stmt = $conexion->prepare("DELETE FROM clientes WHERE id = ? AND tipo IN ('empleados','gerencia')");
    $stmt->bind_param("i", $data["id"]);
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "msg" => "Empleado eliminado correctamente."]);
    } else {
        echo json_encode(["success" => false, "error" => $stmt->error]);
    }
    exit;
}

echo json_encode(["success" => false, "error" => "Acción no válida"]);

