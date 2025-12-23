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
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/lucide.min.js"></script>
  <script src="../js/jspdf.umd.min.js"></script>
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

    .swal-form label {
      display: block;
      margin-bottom: .25rem;
      color: #cbd5e1;
      /* slate-300 */
      font-weight: 600;
    }

    .swal-form .field {
      margin-bottom: .875rem;
    }

    /* gap uniforme */
  </style>

</head>

<body class="bg-slate-900 text-slate-200 min-h-screen font-sans bg-[url('../img/black-paper.png')]">
  <?php include "../includes/navbar.php" ?>

  <!-- Toolbar como Proveedores -->
<div class="max-w-6xl mx-auto">
  <h1 class="text-3xl font-bold mb-6 mt-2 text-center text-slate-100 flex items-center justify-center gap-2">
    📦 Administrar Productos
  </h1>

  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
    <!-- Izquierda: búsqueda -->
    <div class="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
      <input
        id="busquedaProducto"
        type="text"
        placeholder="Buscar (nombre, código, descripción)"
        class="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
      />
    </div>

    <!-- Derecha: acciones -->
    <div class="flex items-center gap-2">
      <button onclick="abrirModalAgregar()"
        class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow">
        ➕ Agregar Producto
      </button>
      <button onclick="abrirModalMovimiento()" class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white">
        ＋／－ Movimiento
      </button>
      <button onclick="abrirModalReporte()" class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white">
        📑 Reporte
      </button>
    </div>
  </div>
</div>

<!-- Tabla -->
<!-- Tabla de productos -->
<div class="overflow-x-auto max-w-6xl mx-auto mt-4">
  <table class="min-w-full table-fixed bg-slate-800 text-slate-100 rounded-xl overflow-hidden shadow-xl">
    <thead class="bg-slate-700 text-slate-200 text-left">
      <tr class="text-slate-300 text-sm uppercase">
        <th class="p-3 w-40">Código</th>
        <th class="p-3 w-56">Nombre</th>
        <th class="p-3 w-28 text-right">Venta</th>
        <th class="p-3 w-28 text-right">Costo Prov.</th>
        <th class="p-3 w-44">Proveedor</th>
        <th class="p-3 w-20 text-right">Stock</th>
        <th class="p-3 w-40">Categoría</th>
        <th class="p-3 w-40 text-center">Acciones</th>
      </tr>
    </thead>
    <tbody id="tabla-productos" class="text-slate-100 divide-y divide-slate-700">
      <!-- JS llenará esta parte -->
    </tbody>
  </table>
  <div id="paginacion-productos" class="mt-4 flex items-center justify-center gap-2"></div>
</div>


  <script src="../js/swalConfig.js"></script>
  <script src="../js/admin-productos.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", () => lucide.createIcons());
  </script>
</body>

</html>