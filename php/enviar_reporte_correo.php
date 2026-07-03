<?php
header('Content-Type: application/json; charset=utf-8');

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/conexion.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['ok' => false, 'msg' => 'Método no permitido']);
        exit;
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    $pdfBase64     = $data['pdf_base64'] ?? '';
    $nombreArchivo = trim($data['nombre_archivo'] ?? 'reporte.pdf');
    $asunto        = trim($data['asunto'] ?? 'Reporte PDF');
    $mensaje       = trim($data['mensaje'] ?? 'Adjuntamos el reporte solicitado.');
    $periodoTexto  = trim($data['periodo_texto'] ?? '');
    $usuarioTexto  = trim($data['usuario_texto'] ?? '');

    if ($pdfBase64 === '') {
        echo json_encode(['ok' => false, 'msg' => 'No se recibió el PDF']);
        exit;
    }

    // ========= Configuración branding =========
    $sql = "SELECT mail, app_name, dashboard_title, dashboard_sub 
            FROM config_branding 
            WHERE id = 1 
            LIMIT 1";
    $res = mysqli_query($conexion, $sql);
    $branding = $res ? mysqli_fetch_assoc($res) : null;

    $correoDestino   = trim($branding['mail'] ?? '');
    $appName         = trim($branding['app_name'] ?? 'Sistema');
    $dashboardTitle  = trim($branding['dashboard_title'] ?? 'Centro deportivo');
    $dashboardSub    = trim($branding['dashboard_sub'] ?? 'Reporte administrativo');

    if (!filter_var($correoDestino, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['ok' => false, 'msg' => 'El correo configurado en branding no es válido']);
        exit;
    }

    // ========= Config SMTP =========
    $mailConfig = require __DIR__ . '/config_mail.php';

    $correoEnvio = 'noreply@smartgate.com.mx'; // fijo, como tú lo necesitas

    $pdfBinario = base64_decode($pdfBase64, true);

    if ($pdfBinario === false) {
        echo json_encode(['ok' => false, 'msg' => 'El PDF recibido no es válido']);
        exit;
    }

    $fechaEnvio = date('d/m/Y');
    $horaEnvio  = date('H:i');

    $periodoHtml = $periodoTexto !== ''
        ? '<tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color:#475569; font-size:14px; font-weight:600;">Período del reporte</span><br>
                <span style="color:#0f172a; font-size:15px;">' . htmlspecialchars($periodoTexto, ENT_QUOTES, 'UTF-8') . '</span>
              </td>
           </tr>'
        : '';

    $usuarioHtml = $usuarioTexto !== ''
        ? '<tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color:#475569; font-size:14px; font-weight:600;">Usuario</span><br>
                <span style="color:#0f172a; font-size:15px;">' . htmlspecialchars($usuarioTexto, ENT_QUOTES, 'UTF-8') . '</span>
              </td>
           </tr>'
        : '';

    $html = '
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>' . htmlspecialchars($asunto, ENT_QUOTES, 'UTF-8') . '</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial, Helvetica, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9; padding:30px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
              
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#0f172a 0%, #1e3a8a 100%); padding:32px 28px; text-align:center;">
                  <div style="color:#ffffff; font-size:28px; font-weight:700; letter-spacing:0.3px;">
                    ' . htmlspecialchars($dashboardTitle, ENT_QUOTES, 'UTF-8') . '
                  </div>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px 28px 20px 28px;">
                  <div style="color:#0f172a; font-size:24px; font-weight:700; margin-bottom:10px;">
                    Reporte generado correctamente
                  </div>

                  <div style="color:#475569; font-size:15px; line-height:1.7; margin-bottom:22px;">
                    ' . htmlspecialchars($mensaje, ENT_QUOTES, 'UTF-8') . '
                  </div>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:18px;">
                    <tr>
                      <td style="padding: 0 0 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="color:#475569; font-size:14px; font-weight:600;">Centro deportivo / sistema</span><br>
                        <span style="color:#0f172a; font-size:15px;">' . htmlspecialchars($appName, ENT_QUOTES, 'UTF-8') . '</span>
                      </td>
                    </tr>

                    ' . $usuarioHtml . '

                    ' . $periodoHtml . '

                    <tr>
                      <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="color:#475569; font-size:14px; font-weight:600;">Fecha de envío</span><br>
                        <span style="color:#0f172a; font-size:15px;">' . $fechaEnvio . ' a las ' . $horaEnvio . '</span>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 10px 0;">
                        <span style="color:#475569; font-size:14px; font-weight:600;">Archivo adjunto</span><br>
                        <span style="color:#0f172a; font-size:15px;">' . htmlspecialchars($nombreArchivo, ENT_QUOTES, 'UTF-8') . '</span>
                      </td>
                    </tr>
                  </table>

                  <div style="margin-top:24px; color:#64748b; font-size:14px; line-height:1.7;">
                    Este correo fue generado automáticamente por el sistema de reportes. 
                    Se adjunta el archivo PDF correspondiente para su consulta y respaldo.
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:22px 28px; background:#f8fafc; border-top:1px solid #e5e7eb; text-align:center;">
                  <div style="color:#0f172a; font-size:15px; font-weight:700;">
                    ' . htmlspecialchars($dashboardTitle, ENT_QUOTES, 'UTF-8') . '
                  </div>
                  <div style="color:#64748b; font-size:13px; margin-top:6px;">
                    ' . htmlspecialchars($dashboardSub, ENT_QUOTES, 'UTF-8') . '
                  </div>
                  <div style="color:#64748b; font-size:13px; margin-top:6px;">
                    Correo de contacto: ' . htmlspecialchars($correoDestino, ENT_QUOTES, 'UTF-8') . '
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>';

    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = $mailConfig['host'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $correoEnvio;
    $mail->Password   = $mailConfig['password'];

    if (($mailConfig['secure'] ?? 'ssl') === 'tls') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    } else {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    }

    $mail->Port    = (int)$mailConfig['port'];
    $mail->CharSet = 'UTF-8';

    $mail->setFrom($correoEnvio, $appName);
    $mail->addAddress($correoDestino);

    $mail->isHTML(true);
    $mail->Subject = $asunto;
    $mail->Body    = $html;
    $mail->AltBody = $appName . "\n\n" .
        $mensaje . "\n\n" .
        ($usuarioTexto ? "Usuario: " . $usuarioTexto . "\n" : "") .
        ($periodoTexto ? "Período: " . $periodoTexto . "\n" : "") .
        "Fecha de envío: " . $fechaEnvio . " " . $horaEnvio . "\n" .
        "Archivo adjunto: " . $nombreArchivo;

    $mail->addStringAttachment(
        $pdfBinario,
        $nombreArchivo,
        'base64',
        'application/pdf'
    );

    $mail->send();

    echo json_encode([
        'ok' => true,
        'msg' => 'Reporte enviado a ' . $correoDestino
    ]);
} catch (Exception $e) {
    echo json_encode([
        'ok' => false,
        'msg' => 'Error al enviar correo: ' . $e->getMessage()
    ]);
}