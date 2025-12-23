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
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Administrar Proveedores</title>
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css" />
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/lucide.min.js"></script>
  <script>
    window.tipoUsuario = "<?= $_SESSION['usuario']['rol'] ?? '' ?>";
    window.SESSION_UID = <?= (int) ($_SESSION['usuario']['id'] ?? 0) ?>; // <-- NUEVO
  </script>

</head>

<body
  class="bg-slate-900 text-slate-200 min-h-screen font-sans p-6 bg-[url('../img/black-paper.png')] bg-fixed bg-auto">
  <?php include '../includes/navbar.php'; ?>

  <h1 class="text-3xl font-bold mb-6 mt-6 text-center text-slate-100 flex items-center justify-center gap-2">
    📦 Administrar Proveedores
  </h1>

  <!-- Barra de acciones -->
  <div class="max-w-6xl mx-auto flex flex-col gap-3">
    <div class="flex justify-end">
      <button id="btnNuevo"
        class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition">
        ➕ Agregar Proveedor
      </button>
      <button id="btnHistorialGlobal"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow ml-2">
        <i data-lucide="file-text" class="w-4 h-4"></i>
        Historial de pedidos
      </button>


    </div>

    <!-- Filtros (opcionales) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <input id="q" type="text" placeholder="Buscar (nombre, contacto, teléfono, email)"
        class="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600">
      <select id="filtroActivo"
        class="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600">
        <option value="all">Todos</option>
        <option value="1" selected>Activos</option>
        <option value="0">Desactivados</option>
      </select>
      <div class="flex gap-2">
        <button id="btnBuscar" class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600">Buscar</button>
        <button id="btnLimpiar"
          class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700">Limpiar</button>
      </div>
    </div>
  </div>

  <!-- Tabla -->
  <div class="overflow-x-auto max-w-6xl mx-auto mt-4">
    <table class="min-w-full bg-slate-800 text-slate-100 rounded-xl overflow-hidden shadow-xl">
      <thead class="bg-slate-700 text-slate-200 text-left">
        <tr>
          <th class="px-4 py-3">Nombre</th>
          <th class="px-4 py-3">Contacto</th>
          <th class="px-4 py-3">Teléfono</th>
          <th class="px-4 py-3">Email</th>
          <th class="px-4 py-3">RFC</th>
          <th class="px-4 py-3">Estado</th>
          <th class="px-4 py-3 text-center">Acciones</th>
        </tr>
      </thead>
      <tbody id="tbodyProv" class="text-slate-100 divide-y divide-slate-700">
        <!-- JS llenará esta parte -->
      </tbody>
    </table>
  </div>

  <!-- Paginación / resumen -->
  <div class="max-w-6xl mx-auto flex items-center justify-between mt-3">
    <div id="lblResumen" class="text-xs opacity-70">—</div>
    <div class="flex items-center gap-2">
      <button id="btnPrev"
        class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40">«</button>
      <span id="lblPagina" class="px-2 text-xs opacity-80"></span>
      <button id="btnNext"
        class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40">»</button>
    </div>
  </div>

  <!-- Modal nativo (mismo esquema cromático) -->
  <div id="modal" class="fixed inset-0 hidden items-center justify-center">
    <div class="absolute inset-0 bg-black/60"></div>
    <div class="relative w-full max-w-xl mx-4 rounded-2xl bg-slate-900 border border-slate-700 p-4 shadow-xl">
      <div class="flex items-center justify-between mb-3">
        <h2 id="modalTitle" class="text-lg font-semibold">Nuevo proveedor</h2>
        <button id="btnClose" class="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700">✕</button>
      </div>
      <form id="formProv" class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input type="hidden" id="prov_id">
        <div class="md:col-span-2">
          <label class="block text-xs opacity-70 mb-1">Nombre *</label>
          <input id="nombre" class="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2" required>
        </div>
        <div>
          <label class="block text-xs opacity-70 mb-1">Contacto</label>
          <input id="contacto" class="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2">
        </div>
        <div>
          <label class="block text-xs opacity-70 mb-1">Teléfono</label>
          <input id="telefono" class="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2">
        </div>
        <div>
          <label class="block text-xs opacity-70 mb-1">Email</label>
          <input id="email" type="email" class="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2">
        </div>
        <div>
          <label class="block text-xs opacity-70 mb-1">RFC</label>
          <input id="rfc" class="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2">
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs opacity-70 mb-1">Dirección</label>
          <input id="direccion" class="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2">
        </div>
        <div class="md:col-span-2 flex justify-end gap-2 mt-2">
          <button type="button" id="btnCancelar"
            class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700">Cancelar</button>
          <button type="submit" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">Guardar</button>
        </div>
      </form>
    </div>
  </div>

  <script src="../js/swalConfig.js"></script>
  <script src="../js/proveedores.js"></script>
  <script src="../js/jspdf.umd.min.js"></script>
</body>

</html>