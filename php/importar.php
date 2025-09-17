<?php
require 'conexion.php';
require '../vendor/autoload.php';
set_time_limit(300);
require 'Visitor.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

if (!isset($_FILES['archivoExcel']) || $_FILES['archivoExcel']['error'] !== 0) {
    http_response_code(400);
    echo json_encode(["error" => "No se pudo subir el archivo."]);
    exit;
}

$tmpFilePath = $_FILES['archivoExcel']['tmp_name'];

try {
    $spreadsheet = IOFactory::load($tmpFilePath);
    $sheet = $spreadsheet->getActiveSheet();

    // Config desde BD
    $config = api_cfg();
    if (!$config) {
        http_response_code(500);
        echo json_encode(["error" => "Falta configuración de API. Ve a Dashboard → Configurar API HikCentral."]);
        exit;
    }

    $listaAPI = Visitor::getPersonList($config);
    $personasAPI = $listaAPI['data']['list'] ?? [];

    $clientes = [];

    // 🔧 Función para normalizar textos (sin acentos, espacios extras, todo en minúsculas)
    function normalizarTexto($texto) {
        $texto = mb_strtolower(trim($texto), 'UTF-8');
        $texto = preg_replace('/\s+/', ' ', $texto); // quita espacios dobles o triples
        $texto = iconv('UTF-8', 'ASCII//TRANSLIT', $texto); // elimina acentos y tildes
        return $texto;
    }

    for ($fila = 15; $fila <= $sheet->getHighestRow(); $fila++) {
        $personCode = trim($sheet->getCell("A$fila")->getValue());
        $nombre = trim($sheet->getCell("B$fila")->getValue());
        $apellido = trim($sheet->getCell("C$fila")->getValue());
        $department = trim($sheet->getCell("D$fila")->getValue());
        $inicio = trim($sheet->getCell("E$fila")->getValue());
        $fin = trim($sheet->getCell("F$fila")->getValue());
        $fechaIngreso = trim($sheet->getCell("G$fila")->getValue());
        $tipoTexto = trim($sheet->getCell("H$fila")->getValue());
        $genderExcel = trim($sheet->getCell("J$fila")->getValue());

        if (!$personCode || !$nombre) continue;

        $genero = strtolower($genderExcel) === 'female' ? 'mujer' : 'hombre';
        $tipo = strtolower($tipoTexto) === 'basic person' ? 'clientes' : 'clientes';

        $inicio_dt = date('Y-m-d H:i:s', strtotime($inicio));
        $fin_dt = date('Y-m-d H:i:s', strtotime($fin));
        $fechaIngreso_dt = date('Y-m-d', strtotime($fechaIngreso));

        // Valores por defecto
        $data = 0;
        $picUri = '';
        $fotoBase64 = '';
        $orgIndexCode = 1;
        $telefono = '';
        $email = '';

        $nombreExcel = normalizarTexto($nombre);
        $codigoExcel = trim($personCode);

        foreach ($personasAPI as $apiPerson) {
            $nombreAPI = normalizarTexto($apiPerson['personGivenName'] ?? '');
            $codigoAPI = trim($apiPerson['personCode'] ?? '');

            if (
                $codigoExcel === $codigoAPI &&
                $nombreExcel === $nombreAPI
            ) {

                $data = intval($apiPerson['personId']);
                $picUri = $apiPerson['personPhoto']['picUri'] ?? '';
                $orgIndexCode = $apiPerson['orgIndexCode'] ?? 1;
                $telefono = $apiPerson['mobile'] ?? '';
                $email = $apiPerson['email'] ?? '';

                error_log("Buscando imagen para personId=$data, picUri=$picUri");

                if ($picUri) {
                    $pictureData = Visitor::getPictureData($config, $data, $picUri);
                    error_log("🧪 Resultado completo de pictureData: " . print_r($pictureData, true));

                    if (isset($pictureData['data']) && strpos($pictureData['data'], 'base64,') !== false) {
                        $fotoBase64 = explode('base64,', $pictureData['data'])[1];
                    }

                    if ($fotoBase64) {
                        error_log("Imagen obtenida correctamente (base64, primeros 50 caracteres): " . substr($fotoBase64, 0, 50));
                    } else {
                        error_log("⚠️ No se obtuvo imagen desde getPersonImage()");
                    }
                }

                break; // importante: no seguir buscando si ya hicimos match
            }
        }

        $clientes[] = [
            "personCode" => $personCode,
            "nombre" => $nombre,
            "apellido" => $apellido,
            "genero" => $genero,
            "orgIndexCode" => $orgIndexCode,
            "telefono" => $telefono,
            "email" => $email,
            "FechaIngreso" => $fechaIngreso_dt,
            "face" => $fotoBase64,
            "data" => $data,
            "grupo" => 'Grupo Default',
            "Inicio" => $inicio_dt,
            "Fin" => $fin_dt,
            "face_icon" => $fotoBase64 ? "data:image/jpeg;base64," . $fotoBase64 : '',
            "tipo" => $tipo,
            "department" => $department,
            "picUri" => $picUri
        ];
    }

    header('Content-Type: application/json');
    echo json_encode(["clientes" => $clientes]);
} catch (Exception $e) {
    http_response_code(500);
    error_log("❌ Error en importar.php: " . $e->getMessage());
    echo json_encode(["error" => "Error al procesar el archivo: " . $e->getMessage()]);
}
