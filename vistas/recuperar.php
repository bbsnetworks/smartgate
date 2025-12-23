<?php include_once '../php/verificar_sesion.php'; ?>

<?php
$dashboardPath = strpos($_SERVER['SCRIPT_NAME'], 'vistas/admin/') !== false
    ? '../../dashboard.php'
    : '../dashboard.php';

if (isset($_GET['bloqueado'])):
?>
  <script src="../js/sweetalert2@11.js"></script>
  <script>
    Swal.fire({
      icon: 'error',
      title: 'Acceso restringido',
      text: 'Tu suscripción ha expirado o no es válida.',
      background: '#1e293b',
      color: '#f8fafc'
    }).then(() => {
      window.location.href = "<?php echo $dashboardPath; ?>";
    });
  </script>
<?php
  exit;
endif;
?>

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recuperar Contraseña</title>
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/sweetalert2@11.js"></script>
  <style>
    body {
      background-image: url('https://www.toptal.com/designers/subtlepatterns/uploads/brickwall.png');
      background-repeat: repeat;
      background-attachment: fixed;
    }
  </style>
</head>
<body class="bg-gray-100 min-h-screen font-sans">
  <?php include_once '../includes/navbar.php'; ?>

  <div class="flex justify-center items-center h-[90vh]">
    <div class="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
      <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">🔐 Recuperar Contraseña</h2>
      <form id="form-recuperar" class="space-y-4">
        <div>
          <label for="correo" class="block font-semibold text-gray-700 mb-1">Correo electrónico:</label>
          <input type="email" id="correo" name="correo" required placeholder="tucorreo@ejemplo.com" class="w-full border p-2 rounded shadow-sm">
        </div>
        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-semibold shadow">
          📧 Enviar enlace de recuperación
        </button>
      </form>
    </div>
  </div>

  <script>
    document.getElementById("form-recuperar").addEventListener("submit", function (e) {
      e.preventDefault();
      const correo = document.getElementById("correo").value;

      fetch("../php/enviar_recovery.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          Swal.fire("✅ Listo", "Revisa tu correo para restablecer tu contraseña.", "success");
        } else {
          Swal.fire("Error", data.error || "No se pudo enviar el enlace", "error");
        }
      });
    });
  </script>
</body>
</html>


