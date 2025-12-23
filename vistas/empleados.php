<?php include_once '../php/verificar_sesion.php';

// ✅ Permitir acceso a admin y root (no solo admin)
$rol = $_SESSION['usuario']['rol'] ?? '';
if (!in_array($rol, ['admin','root'])) {
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
  <meta charset="UTF-8">
  <title>Empleados / Gerencia - Gimnasio</title>
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/lucide.min.js"></script>
  <script src="../js/swalConfig.js"></script>
  <script src="../js/empleados.js" defer></script>
  
  <script>
  window.USER_ROLE = <?php echo json_encode($rol); ?>;  // <-- NO usar const
</script>

</head>
<body class="bg-slate-900 text-slate-200 min-h-screen font-sans bg-[url('../img/black-paper.png')] bg-fixed bg-auto">
  <?php include_once '../includes/navbar.php'; ?>

  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-slate-100">👨‍💼 Empleados / Gerencia</h1>
    </div>

    <div class="flex justify-end mb-6">
      <input
        type="text"
        id="buscador-empleados"
        placeholder="🔍 Buscar empleado por nombre, apellido o tipo"
        class="w-full md:w-1/2 px-4 py-3 rounded-lg bg-slate-700 text-slate-100 placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow"
      >
    </div>

    <div class="overflow-x-auto rounded-xl shadow-lg bg-slate-800">
      <table class="min-w-full divide-y divide-slate-700 text-slate-100">
        <thead class="bg-slate-700 text-slate-200">
          <tr>
            <th class="px-6 py-4 text-left text-sm font-semibold">Foto</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">Nombre</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">Teléfono</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">Email</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">Tipo</th>
            <th class="px-6 py-4 text-center text-sm font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody id="tabla-empleados" class="divide-y divide-slate-600">
          <!-- Contenido dinámico desde empleados.js -->
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>


