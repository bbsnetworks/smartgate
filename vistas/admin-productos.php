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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Administrar Productos</title>
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/lucide.min.js"></script>
  <script>
  window.tipoUsuario = "<?php echo $_SESSION['usuario']['rol'] ?? ''; ?>";
</script>
<style>
/* Ajustes para formularios dentro de SweetAlert2 */
.swal-form .swal2-input,
.swal-form .swal2-textarea,
.swal-form .swal2-select {
  width: 100% !important;
  margin: 0 !important;
}
.swal-form label{
  display:block;
  margin-bottom:.25rem;
  color: #cbd5e1; /* slate-300 */
  font-weight:600;
}
.swal-form .field{ margin-bottom: .875rem; } /* gap uniforme */
</style>

</head>
<body class="bg-slate-900 text-slate-200 min-h-screen font-sans bg-[url('../img/black-paper.png')]">
  <?php include "../includes/navbar.php" ?>

  <div class="mx-auto py-10 px-4 mt-8 max-w-7xl">
    <h1 class="text-3xl font-bold text-center text-white mb-8">📦 Administrar Productos</h1>

    <!-- Botones de acción -->
    <div class="flex flex-wrap justify-left gap-4 mb-6">
      <button onclick="abrirModalAgregar()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow">
        ➕ Agregar Producto
      </button>
    </div>

    <!-- Input de búsqueda -->
    <div class="mb-6">
      <input type="text" id="busquedaProducto" placeholder="🔍 Buscar por nombre, código o descripción..."
             class="w-full p-3 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
    </div>

    <!-- Tabla de productos -->
    <div class="overflow-x-auto mx-auto">
      <table class="min-w-full bg-slate-800 text-slate-100 shadow-md rounded-xl overflow-hidden">
        <thead class="bg-slate-700">
          <tr class="text-slate-300 text-sm uppercase">
            <th class="p-3 text-left">Código</th>
            <th class="p-3 text-left">Nombre</th>
            <th class="p-3 text-left">Descripción</th>
            <th class="p-3 text-left">Precio</th>
            <th class="p-3 text-left">Stock</th>
            <th class="p-3 text-left">Categoría</th>
            <th class="p-3 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody id="tabla-productos" class="text-slate-300">
          <!-- JS llenará esta parte -->
        </tbody>
      </table>
      <div id="paginacion-productos" class="mt-6 flex justify-center gap-2"></div>
    </div>
  </div>
  <script src="../js/swalConfig.js"></script>
  <script src="../js/admin-productos.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", () => lucide.createIcons());
  </script>
</body>
</html>