<?php
include_once '../php/verificar_sesion.php';
$rolActual = $_SESSION['usuario']['rol'] ?? 'worker';
if (!in_array($rolActual, ['admin','root'])) {
  header("Location: ../index.php");
  exit();
}
?>

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
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Administrar Usuarios</title>
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/lucide.min.js"></script>
  <link rel="stylesheet" href="../fonts/bootstrap-icons.css">
  <script>
  window.CURRENT_ROLE = <?= json_encode($_SESSION['usuario']['rol'] ?? 'worker') ?>;
  window.CURRENT_USER_ID = <?= json_encode((int)($_SESSION['usuario']['id'] ?? 0)) ?>;
</script>
</head>
<body class="bg-slate-900 text-slate-200 font-sans min-h-screen p-6 bg-[url('../img/black-paper.png')] bg-fixed bg-auto">
  <?php include_once '../includes/navbar.php'; ?>
  


  <div class="max-w-5xl mx-auto mt-10 bg-slate-800 p-6 rounded-xl shadow-lg">
    <h1 class="text-3xl font-bold text-center mb-6">👥 Administrar Usuarios</h1>

    <div class="flex justify-end mb-4">
      <button onclick="mostrarFormulario()" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow">
        ➕ Agregar Usuario
      </button>
    </div>

    <div class="overflow-x-auto rounded-xl">
      <table class="min-w-full text-sm bg-slate-700 text-slate-200 rounded-xl overflow-hidden shadow-lg">
        <thead class="bg-slate-600 text-slate-100 text-center uppercase text-xs">
          <tr>
            <th class="p-3">Nombre</th>
            <th class="p-3">Correo</th>
            <th class="p-3">Rol</th>
            <th class="p-3">Código</th>
            <th class="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody id="tabla-usuarios" class="text-center divide-y divide-slate-600">
          <!-- Se llenará dinámicamente con JS -->
        </tbody>
      </table>
    </div>
  </div>

  <script src="../js/swalConfig.js"></script>
  <script src="../js/usuarios.js"></script>
  <script src="../js/qrcode.min.js"></script>
</body>
</html>
