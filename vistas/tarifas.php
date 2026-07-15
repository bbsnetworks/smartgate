<?php include_once '../php/verificar_sesion.php'; ?>

<?php
$dashboardPath = strpos($_SERVER['SCRIPT_NAME'], 'vistas/admin/') !== false
  ? '../../dashboard.php'
  : '../dashboard.php';

$rolUsuario = $_SESSION['usuario']['rol'] ?? '';

if (!in_array($rolUsuario, ['admin', 'root'])):
?>
  <script src="../js/sweetalert2@11.js"></script>
  <script>
    Swal.fire({
      icon: 'error',
      title: 'Acceso restringido',
      text: 'Esta sección solo está disponible para administradores.',
      background: '#1e293b',
      color: '#f8fafc',
      confirmButtonColor: '#2563eb'
    }).then(() => {
      window.location.href = "<?php echo $dashboardPath; ?>";
    });
  </script>
<?php
  exit;
endif;

if (isset($_GET['bloqueado'])):
?>
  <script src="../js/sweetalert2@11.js"></script>
  <script>
    Swal.fire({
      icon: 'error',
      title: 'Acceso restringido',
      text: 'Tu suscripción ha expirado o no es válida.',
      background: '#1e293b',
      color: '#f8fafc',
      confirmButtonColor: '#2563eb'
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
  <title>Administrar Tarifas</title>

  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">

  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/lucide.min.js"></script>

  <script>
    window.tipoUsuario = "<?php echo $_SESSION['usuario']['rol'] ?? ''; ?>";
    window.usuarioId = "<?php echo $_SESSION['usuario']['id'] ?? ''; ?>";
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
      font-weight: 600;
    }

    .swal-form .field {
      margin-bottom: .875rem;
    }

    .badge-activo {
      display: inline-flex;
      align-items: center;
      gap: .35rem;
      padding: .25rem .6rem;
      border-radius: 9999px;
      font-size: .75rem;
      font-weight: 700;
      background: rgba(22, 163, 74, .18);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, .35);
    }

    .badge-inactivo {
      display: inline-flex;
      align-items: center;
      gap: .35rem;
      padding: .25rem .6rem;
      border-radius: 9999px;
      font-size: .75rem;
      font-weight: 700;
      background: rgba(220, 38, 38, .18);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, .35);
    }
  </style>
</head>

<body class="bg-slate-900 text-slate-200 min-h-screen font-sans bg-[url('../img/black-paper.png')]">
  <?php include "../includes/navbar.php" ?>

  <div class="max-w-6xl mx-auto px-4">
    <h1 class="text-3xl font-bold mb-6 mt-2 text-center text-slate-100 flex items-center justify-center gap-2">
      💳 Administrar Tarifas
    </h1>

    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <!-- Izquierda: búsqueda -->
      <div class="flex-1 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
        <input
          id="busquedaTarifa"
          type="text"
          placeholder="Buscar tarifa por nombre o descripción"
          class="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600" />

        <select
          id="filtroEstadoTarifa"
          class="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600">
          <option value="">Todas</option>
          <option value="1">Activas</option>
          <option value="0">Inactivas</option>
        </select>
      </div>

      <!-- Derecha: acciones -->
      <div class="flex items-center gap-2">
        <button
          onclick="abrirModalAgregarTarifa()"
          class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow">
          ➕ Agregar Tarifa
        </button>

        <button
          onclick="cargarTarifas()"
          class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white">
          🔄 Actualizar
        </button>
      </div>
    </div>
  </div>

  <!-- Tabla -->
  <div class="overflow-x-auto max-w-6xl mx-auto mt-4 px-4">
    <table class="min-w-full table-fixed bg-slate-800 text-slate-100 rounded-xl overflow-hidden shadow-xl">
      <thead class="bg-slate-700 text-slate-200 text-left">
        <tr class="text-slate-300 text-sm uppercase">
          <th class="p-3 w-56">Nombre</th>
          <th class="p-3 w-32 text-right">Monto</th>
          <th class="p-3">Descripción</th>
          <th class="p-3 w-32 text-center">Estado</th>
          <th class="p-3 w-40">Creada</th>
          <th class="p-3 w-44 text-center">Acciones</th>
        </tr>
      </thead>

      <tbody id="tabla-tarifas" class="text-slate-100 divide-y divide-slate-700">
        <tr>
          <td colspan="6" class="p-4 text-center text-slate-400">
            Cargando tarifas...
          </td>
        </tr>
      </tbody>
    </table>

    <div id="paginacion-tarifas" class="mt-4 flex items-center justify-center gap-2"></div>
  </div>

  <script src="../js/swalConfig.js"></script>
  <script src="../js/admin-tarifas.js"></script>

  <script>
    document.addEventListener("DOMContentLoaded", () => {
      lucide.createIcons();

      if (typeof cargarTarifas === "function") {
        cargarTarifas();
      }
    });
  </script>
</body>

</html>