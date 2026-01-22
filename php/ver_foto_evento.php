<?php
require_once __DIR__ . '/Visitor.php';
require_once __DIR__ . '/conexion.php';

// Evita que warnings/notices rompan el output
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$uri = trim($_GET['uri'] ?? '');
if ($uri === '') {
  http_response_code(400);
  echo "Falta parametro uri";
  exit;
}

$config = api_cfg();
if (!$config) {
  http_response_code(500);
  echo "Falta configuración API";
  exit;
}

try {
  $dataUri = Visitor::getEventPictureDataUri($config, $uri);

  if (!$dataUri) {
    http_response_code(404);
    echo "Sin imagen";
    exit;
  }

  $dataUri = trim($dataUri);

  // ✅ Asegura que sea realmente data-uri
  if (strpos($dataUri, 'data:image') !== 0) {
    // por si viniera basura antes
    $pos = strpos($dataUri, 'data:image');
    if ($pos !== false) $dataUri = substr($dataUri, $pos);
  }

  if (strpos($dataUri, 'data:image') !== 0) {
    http_response_code(500);
    echo "Respuesta inválida";
    exit;
  }

  echo $dataUri;

} catch (Throwable $e) {
  http_response_code(500);
  echo "Error: " . $e->getMessage();
}
