<?php 
include_once '../php/verificar_sesion.php';

$dashboardPath = strpos($_SERVER['SCRIPT_NAME'], 'vistas/admin/') !== false
    ? '../../dashboard.php'
    : '../dashboard.php';

if (isset($_GET['bloqueado'])) {
  echo <<<HTML
  <script src="../js/sweetalert2@11.js"></script>
  <script>
    Swal.fire({
      icon: 'error',
      title: 'Acceso restringido',
      text: 'Tu suscripción ha expirado o no es válida.',
      background: '#1e293b',
      color: '#f8fafc'
    }).then(() => {
      window.location.href = "{$dashboardPath}";
    });
  </script>
  HTML;
  exit;
}

?>


<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Administrar Categorías</title>
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/lucide.min.js"></script>
    <script>
  window.tipoUsuario = "<?php echo $_SESSION['usuario']['rol'] ?? ''; ?>";
</script>
</head>
<body class="bg-slate-900 text-slate-200 min-h-screen font-sans p-6 bg-[url('../img/black-paper.png')] bg-fixed bg-auto">
  <?php include '../includes/navbar.php'; ?>

  <h1 class="text-3xl font-bold mb-6 mt-6 text-center text-slate-100 flex items-center justify-center gap-2">
    🗂️ Administrar Categorías
  </h1>

  <div class="flex justify-end mb-4 max-w-6xl mx-auto">
    <button id="btn-agregar-categoria"
      class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition duration-150 ease-in-out">
      ➕ Agregar Categoría
    </button>
  </div>

  <div class="overflow-x-auto max-w-6xl mx-auto">
    <table class="min-w-full bg-slate-800 text-slate-100 rounded-xl overflow-hidden shadow-xl">
      <thead class="bg-slate-700 text-slate-200 text-left">
        <tr>
          <th class="px-4 py-3">#</th>
          <th class="px-4 py-3">Nombre</th>
          <th class="px-4 py-3">Descripción</th>
          <th class="px-4 py-3 text-center">Acciones</th>
        </tr>
      </thead>
      <tbody id="tabla-categorias" class="text-slate-100 divide-y divide-slate-700">
        <!-- JS llenará esta parte -->
      </tbody>
    </table>
  </div>
  <script src="../js/swalConfig.js"></script>
  <script src="../js/admin-categorias.js"></script>
</body>
</html>



