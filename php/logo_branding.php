<?php
// php/logo_branding.php
require_once __DIR__ . '/conexion.php';

// Lee BLOB/mime/etag
$r = $conexion->query("SELECT logo_blob, logo_mime, logo_etag FROM config_branding WHERE id=1");
if (!$r) {
  http_response_code(500);
  exit;
}
$row = $r->fetch_assoc();

// Fallback: 1x1 PNG transparente si no hay logo
if (!$row || empty($row['logo_blob'])) {
  $mime = 'image/png';
  $etag = 'fallback-transparent-1x1';
  $blob = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/xcAAnsB9h8JH+YAAAAASUVORK5CYII=');
} else {
  $mime = $row['logo_mime'] ?: 'application/octet-stream';
  $etag = $row['logo_etag'] ?: sha1($row['logo_blob']);
  $blob = $row['logo_blob'];
}

// ETag + Cache
header('ETag: "'.$etag.'"');
header('Cache-Control: public, max-age=31536000, immutable');

// If-None-Match → 304
if (isset($_SERVER['HTTP_IF_NONE_MATCH'])) {
  $inm = trim($_SERVER['HTTP_IF_NONE_MATCH'], '"');
  if ($inm === $etag) {
    http_response_code(304);
    exit;
  }
}

header('Content-Type: '.$mime);
echo $blob;
