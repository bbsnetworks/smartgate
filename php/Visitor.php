<?php
require_once 'Encrypter.php';

class Visitor {
    const TIMEOUT = 10; // Tiempo de espera en segundos

    public static function getOrganizations($config) {
        $urlService = "/artemis/api/resource/v1/org/orgList"; // 🔹 Cambié la URL según el debug
        $fullUrl = $config->urlHikCentralAPI . $urlService; // URL completa con el host correcto

        // Generación del contenido a firmar
        $contentToSign = "POST\n*/*\napplication/json\nx-ca-key:" . $config->userKey . "\n" . $urlService;
        $signature = Encrypter::HikvisionSignature($config->userSecret, $contentToSign);

        // Headers de autenticación
        $headers = [
            "x-ca-key: " . $config->userKey,
            "x-ca-signature-headers: x-ca-key",
            "x-ca-signature: " . $signature,
            "Content-Type: application/json",
            "Accept: */*"
        ];

        $data = json_encode([
            "pageNo" => 1,
            "pageSize" => 100
        ]);

        // cURL para enviar la petición
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $fullUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, self::TIMEOUT);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // 🔹 Desactiva SSL si hay problemas con certificados
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        curl_setopt($ch, CURLOPT_VERBOSE, true); // 🔹 Habilita debug de cURL

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch); // 🔹 Captura errores de cURL
        curl_close($ch);

        if (!empty($curlError)) {
            throw new Exception("Error de cURL: " . $curlError);
        }

        if ($httpCode != 200) {
            throw new Exception("Error en la API: Código HTTP " . $httpCode . " - Respuesta: " . $response);
        }

        return json_decode($response, true);
    }
    public static function assignUserToGroup($config, $privilegeGroupId, $userId) {
        $urlService = "/artemis/api/acs/v1/privilege/group/single/addPersons";
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
            "privilegeGroupId" => $privilegeGroupId,
            "type" => 1,
            "list" => [
                ["id" => strval($userId)]
            ]
        ];
    
        $data = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $fullUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    
        return json_decode($response, true);
    }
    public static function getGroups($config, $payload) {
        $urlService = "/artemis/api/acs/v1/privilege/group";
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

        $data = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $fullUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
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
    public static function sendUserToDevice($config) {
        $urlService = "/artemis/api/visitor/v1/auth/reapplication";
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
    
        $payload = json_encode([]); // 🔹 Enviar un JSON vacío como indica la documentación
    
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $fullUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    
        return json_decode($response, true);
    }
    public static function deleteUser($config, $personId) {
        $urlService = "/artemis/api/resource/v1/person/single/delete"; // <- corregido
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
    
        $payload = json_encode(["personId" => (string)$personId]); // <- este es el body correcto
    
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $fullUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    
        $response = curl_exec($ch);
        curl_close($ch);
    
        return json_decode($response, true);
    }
    public static function updateUser($config, $userData) {
        $urlService = "/artemis/api/resource/v1/person/single/update";
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
    
        $payload = json_encode($userData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $fullUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    
        $response = curl_exec($ch);
        curl_close($ch);
    
        return json_decode($response, true);
    }
    public static function getPersonList($config) {
    $urlService = "/artemis/api/resource/v1/person/personList";
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

    $pageNo = 1;
    $pageSize = 100;
    $allResults = [];

    while (true) {
        $data = json_encode([
            "pageNo" => $pageNo,
            "pageSize" => $pageSize
        ]);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $fullUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode != 200) {
            throw new Exception("Error al obtener la lista de personas: Código HTTP $httpCode. Respuesta: $response");
        }

        $json = json_decode($response, true);

        $lista = $json['data']['list'] ?? [];
        if (empty($lista)) {
            break; // No hay más registros
        }

        $allResults = array_merge($allResults, $lista);
        $pageNo++;
    }

    return ["data" => ["list" => $allResults]];
}

public static function getPersonPhoto($config, $personId, $picUri) {
    $urlService = "/artemis/api/resource/v1/person/picture_data";
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

    $payload = json_encode([
        "personId" => strval($personId),
        "picUri" => $picUri
    ]);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $fullUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode == 200) {
        $json = json_decode($response, true);
        if (isset($json['data']) && strpos($json['data'], 'base64') !== false) {
            $base64 = explode(',', $json['data'])[1] ?? '';
            return base64_decode($base64);
        }
    }
    return null;
}
public static function getPersonImage($config, $personId, $picUri) {
    $response = self::getPictureData($config, $personId, $picUri);

    if (isset($response['data'])) {
        $data = $response['data'];

        if (strpos($data, 'base64,') !== false) {
            $partes = explode('base64,', $data);
            if (isset($partes[1])) {
                return $partes[1];
            }
        }

        return $data; // fallback: por si no tiene el prefijo
    }

    return '';
}



public static function getPictureData($config, $personId, $picUri) {
    $urlService = "/artemis/api/resource/v1/person/picture_data";
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

    $payload = json_encode([
        "personId" => (string)$personId,
        "picUri" => $picUri
    ]);

    error_log("🟡 getPictureData() - Enviando: " . $payload);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $fullUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    error_log("🔵 getPictureData() - Código HTTP: $httpCode");
    error_log("🔵 getPictureData() - Respuesta RAW: " . substr($response, 0, 200));

    // 📌 La API devuelve directamente un string base64, no JSON
    if (strpos($response, 'data:image') === 0) {
        return ['data' => $response]; // <- Envolvemos manualmente para que funcione como un array
    }

    return [];
}
}

// 🔹 Actualiza la URL con el host correcto (IP real si HikCentral está en otro servidor)
$config = (object) [
    "userKey" => "21660945",  // 🔹 Asegúrate de que sea el API Key correcto
    "userSecret" => "93iLwvnQkXAvlHw8wbQz",  
    "urlHikCentralAPI" => "http://127.0.0.1:9016" // 🔹 Usando la URL corregida
];

// Ejecutar la consulta de la lista de organizaciones
try {
    $response = Visitor::getOrganizations($config);
    // echo "Lista de Organizaciones:\n";
// print_r($response);
} catch (Exception $e) {
    echo "Error al obtener organizaciones: " . $e->getMessage();
}
?>



