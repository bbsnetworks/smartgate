<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/../vendor/autoload.php';

$mail = new PHPMailer(true);

try {
    $mail->SMTPDebug = 2;

    $mail->isSMTP();
    $mail->Host       = 'smtp.titan.email';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'noreply@bbsnetworks.net';
    $mail->Password   = 'Admin1_Pinck';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port       = 465;

    $mail->CharSet = 'UTF-8';

    $mail->setFrom('noreply@bbsnetworks.net', 'Sistema de Reportes');
    $mail->addAddress('bbsnetworks0@gmail.com');

    $mail->isHTML(true);
    $mail->Subject = 'Prueba de correo PHPMailer';
    $mail->Body = '
        <h2>Correo de prueba</h2>
        <p>Si estás leyendo esto significa que PHPMailer funciona correctamente.</p>
        <p><b>Sistema:</b> Reportes</p>
        <p><b>Servidor:</b> XAMPP</p>
    ';

    $mail->send();

    echo 'Correo enviado correctamente';

} catch (Exception $e) {
    echo 'Error al enviar correo: ' . $mail->ErrorInfo;
}