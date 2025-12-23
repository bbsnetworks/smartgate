<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

require_once 'conexion.php';
require_once 'Encrypter.php';
require_once 'Visitor.php';

class User {
    const TIMEOUT = 10;

    public static function addUser($config, $userData) {
        $urlService = "/artemis/api/resource/v1/person/single/add";
        $fullUrl = $config->urlHikCentralAPI . $urlService;

        $contentToSign = "POST\n*/*\napplication/json\nx-ca-key:" . $config->userKey . "\n" . $urlService;
        $signature = Encrypter::HikvisionSignature($config->userSecret, $contentToSign);

        $headers = [
            "x-ca-key: " . $config->userKey,
            "x-ca-signature-headers: x-ca-key",
            "x-ca-signature: " . $signature,
            "Content-Type: application/json",
            "Accept: */*"
        ];

        $payload = [
            "personCode"         => $userData["personCode"],
            "personFamilyName"   => $userData["personFamilyName"],
            "personGivenName"    => $userData["personGivenName"],
            "gender"             => (int)$userData["gender"],
            "orgIndexCode"       => $userData["orgIndexCode"],
            "phoneNo"            => $userData["phoneNo"] ?? "",
            "email"              => $userData["email"] ?? "",
            "faces"              => [["faceData" => $userData["faces"][0]["faceData"]]],
            "beginTime"          => $userData["beginTime"],
            "endTime"            => $userData["endTime"]
        ];

        $data = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $fullUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, self::TIMEOUT);
       // Desactiva verificación SSL solo si NO es https
       if (stripos($fullUrl, 'https://') !== 0) {
           curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
           curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
       }
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode != 200) {
            throw new Exception("Error en la API: Código HTTP " . $httpCode . " - Respuesta: " . $response);
        }

        return json_decode($response, true);
    }
}

// Config desde DB
$config = api_cfg();
if (!$config) {
 http_response_code(500);
 echo json_encode(["error" => "Falta configuración de API. Ve a Dashboard → Configurar API HikCentral."]);
 exit;
}

$userData = json_decode(file_get_contents("php://input"), true);

$zona = new DateTimeZone("America/Mexico_City");
$inicio = new DateTime("now", $zona);

$orgName = isset($userData['orgName']) ? strtolower(trim($userData['orgName'])) : "";

// Duración estándar para CLIENTES (horas)
$HORAS_BUFFER = 2;

if (in_array($orgName, ['gerencia', 'empleados'])) {
    // Personal interno: largo plazo
    $fin = new DateTime('2029-12-31 23:59:59', $zona);
} else {
    // Clientes: Inicio + 2 horas, mismo día
    $fin = (clone $inicio)->modify("+{$HORAS_BUFFER} hours");

    // Si las 2h se pasan al día siguiente, clamp a 23:59:59 del mismo día
    if ($fin->format('Y-m-d') !== $inicio->format('Y-m-d')) {
        $fin = (clone $inicio);
        $fin->setTime(23, 59, 59);
    }
}

$inicioISO = $inicio->format("Y-m-d\TH:i:sP");
$finISO    = $fin->format("Y-m-d\TH:i:sP");
$inicioSQL = $inicio->format("Y-m-d H:i:s");
$finSQL    = $fin->format("Y-m-d H:i:s");

try {
    $response = User::addUser($config, array_merge($userData, [
        "beginTime" => $inicioISO,
        "endTime"   => $finISO
    ]));

    if (isset($response["code"]) && (string)$response["code"] === "0") {
        $dataField = isset($response["data"]) && is_numeric($response["data"]) ? intval($response["data"]) : null;

        if ($dataField === null) {
            echo json_encode(["error" => "El campo 'data' no es válido o está vacío en la respuesta de la API."]);
            exit();
        }

        // Actualizar secuencia primero
        $codigoEntero = intval($userData["personCode"]);
        $updateSecuencia = $conexion->prepare("UPDATE secuencias SET ultimo_codigo = ? WHERE nombre = 'clientes'");
        $updateSecuencia->bind_param("i", $codigoEntero);
        $updateSecuencia->execute();
        $updateSecuencia->close();

        // Determinar tipo
        $tipo = 'clientes';
        if ($orgName === 'gerencia') {
            $tipo = 'gerencia';
        } elseif ($orgName === 'empleados') {
            $tipo = 'empleados';
        }
        $orgPadre = "Smartgate"; // Puedes cambiar esto si usas otra organización raíz
        $department = "All Departments/{$orgPadre}/" . ucfirst($tipo);
        $fechaIngreso = date("Y-m-d");
        $face_icon = $userData["faces"][0]["faceIconData"] ?? '';
        $emergencia = $userData["emergencia"] ?? null;
        $sangre = $userData["sangre"] ?? null;
        $comentarios = $userData["comentarios"] ?? null; 
        $stmt = $conexion->prepare("INSERT INTO clientes (
        personCode, nombre, apellido, genero, orgIndexCode, telefono, email, FechaIngreso,
        face, face_icon, data, grupo, Inicio, Fin, tipo, department,
        emergencia, sangre, comentarios
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");



        if (!$stmt) {
            echo json_encode(["error" => "Error en la preparación de la consulta SQL: " . $conexion->error]);
            exit();
        }

        $stmt->bind_param("ssssissssisssssssss",
    $userData["personCode"],
    $userData["personGivenName"],
    $userData["personFamilyName"],
    $userData["gender"],
    $userData["orgIndexCode"],
    $userData["phoneNo"],
    $userData["email"],
    $fechaIngreso,
    $userData["faces"][0]["faceData"],
    $face_icon,
    $dataField,
    $userData["groupIndexCode"],
    $inicioSQL,
    $finSQL,
    $tipo,
    $department,
    $emergencia,
    $sangre,
    $comentarios
);


        if (!$stmt->execute()) {
            echo json_encode(["error" => "Error al insertar en la BD: " . $stmt->error]);
            exit();
        }

        $stmt->close();

        // Asignar a grupo y enviar a dispositivo
        $assignResponse = Visitor::assignUserToGroup($config, $userData["groupIndexCode"], $dataField);

        if (isset($assignResponse["code"]) && $assignResponse["code"] === "0") {
            $deviceResponse = Visitor::sendUserToDevice($config);

            echo json_encode([
                "msg" => "Usuario agregado y asignado al grupo. Pendiente enviar al dispositivo.",
                "code" => 0,
                "data" => $dataField,
                "group_assignment" => $assignResponse
            ]);
        } else {
            echo json_encode([
                "error" => "Error al asignar usuario al grupo",
                "code" => $assignResponse["code"],
                "msg" => $assignResponse["msg"]
            ]);
        }
    } else {
        $errorMessage = $response["msg"] ?? "Error desconocido en la API.";
        echo json_encode(["error" => "Error en la API: " . $errorMessage, "code" => $response["code"]]);
    }
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
