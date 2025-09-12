<?php
require 'conexion.php';
require 'vendor/autoload.php'; // PHPMailer

$data = json_decode(file_get_contents("php://input"), true);
$correo = $data['correo'] ?? '';

if (!$correo) {
    echo json_encode(["success" => false, "error" => "Correo requerido"]);
    exit;
}

$stmt = $conexion->prepare("SELECT id FROM usuarios WHERE correo = ?");
$stmt->bind_param("s", $correo);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "error" => "Correo no encontrado"]);
    exit;
}

$usuario = $result->fetch_assoc();
$token = bin2hex(random_bytes(32));
$expira = date("Y-m-d H:i:s", strtotime("+1 hour"));

$conexion->query("DELETE FROM recuperaciones WHERE usuario_id = {$usuario['id']}");
$conexion->query("INSERT INTO recuperaciones (usuario_id, token, expira) VALUES ({$usuario['id']}, '$token', '$expira')");

// Configura tu cuenta SMTP de HostGator
$mail = new PHPMailer\PHPMailer\PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host = 'mail.tudominio.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'tucorreo@tudominio.com';
    $mail->Password = 'tu_contraseña';
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;

    $mail->setFrom('tucorreo@tudominio.com', 'Gimnasio');
    $mail->addAddress($correo);

    $mail->isHTML(true);
    $mail->Subject = 'Recupera tu contraseña';
    $mail->Body = "Haz clic aquí para recuperar tu contraseña:<br><a href='http://localhost/smartgate/vistas/reset.php?token=$token'>Recuperar contraseña</a>";

    $mail->send();
    echo json_encode(["success" => true]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => "Error al enviar correo: {$mail->ErrorInfo}"]);
}
