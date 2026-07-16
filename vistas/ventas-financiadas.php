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
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Ventas Financiadas - Smartgate</title>

  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">

  <script src="../js/lucide.min.js"></script>
  <script src="../js/sweetalert2@11.js"></script>

  <link rel="stylesheet" href="../fonts/bootstrap-icons.css">
  <style>
    /* Inputs generales de la vista ventas financiadas */
    #filtroBusqueda,
    #filtroEstado {
      padding: 12px 16px !important;
      min-height: 44px !important;
      border-radius: 14px !important;
      background-color: #334155 !important;
      color: #ffffff !important;
      border: 1px solid #475569 !important;
      outline: none !important;
      line-height: 1.4 !important;
    }

    #filtroBusqueda::placeholder {
      color: #94a3b8 !important;
    }

    #filtroBusqueda:focus,
    #filtroEstado:focus {
      border-color: #60a5fa !important;
      box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.25) !important;
    }

    /* Inputs específicos para ventas financiadas */
    #modalNuevaVenta input,
    #modalNuevaVenta select,
    #modalNuevaVenta textarea,
    #modalDetalleVenta input,
    #modalDetalleVenta select,
    #modalDetalleVenta textarea,
    #modalAbono input,
    #modalAbono select,
    #modalAbono textarea {
      padding: 12px 16px !important;
      min-height: 44px !important;
      border-radius: 14px !important;
      background-color: #334155 !important;
      color: #ffffff !important;
      border: 1px solid #475569 !important;
      outline: none !important;
      line-height: 1.4 !important;
    }

    #modalNuevaVenta textarea,
    #modalDetalleVenta textarea,
    #modalAbono textarea {
      min-height: 82px !important;
      resize: vertical;
    }

    #modalNuevaVenta input::placeholder,
    #modalNuevaVenta textarea::placeholder,
    #modalDetalleVenta input::placeholder,
    #modalDetalleVenta textarea::placeholder,
    #modalAbono input::placeholder,
    #modalAbono textarea::placeholder {
      color: #94a3b8 !important;
    }

    #modalNuevaVenta input:focus,
    #modalNuevaVenta select:focus,
    #modalNuevaVenta textarea:focus,
    #modalDetalleVenta input:focus,
    #modalDetalleVenta select:focus,
    #modalDetalleVenta textarea:focus,
    #modalAbono input:focus,
    #modalAbono select:focus,
    #modalAbono textarea:focus {
      border-color: #60a5fa !important;
      box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.25) !important;
    }

    /* Corrige inputs date y number */
    #modalNuevaVenta input[type="date"],
    #modalNuevaVenta input[type="number"],
    #modalAbono input[type="number"] {
      appearance: none;
      -webkit-appearance: none;
    }

    /* Modal scroll */
    .vf-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.72);
      z-index: 50;
      padding: 24px 16px;
      align-items: flex-start;
      justify-content: center;
      overflow-y: auto;
    }

    .vf-modal-panel {
      width: 100%;
      max-width: 1150px;
      max-height: calc(100vh - 48px);
      overflow-y: auto;
      border-radius: 24px;
    }

    .vf-modal-panel-sm {
      width: 100%;
      max-width: 560px;
      max-height: calc(100vh - 48px);
      overflow-y: auto;
      border-radius: 24px;
    }

    .vf-modal-header {
      position: sticky;
      top: 0;
      z-index: 20;
      background: #1e293b;
      border-bottom: 1px solid #334155;
    }

    @media (max-width: 768px) {
      .vf-modal-overlay {
        padding: 12px;
      }

      .vf-modal-panel,
      .vf-modal-panel-sm {
        max-height: calc(100vh - 24px);
        border-radius: 20px;
      }
    }
  </style>
</head>

<body class="bg-slate-900 text-slate-200 font-sans min-h-screen bg-[url('../img/black-paper.png')] bg-fixed bg-auto">

  <?php include "../includes/navbar.php" ?>

  <div class="vf-page relative w-full max-w-7xl mx-auto mt-32 mb-16 px-4">

    <!-- LOGO flotante -->
    <div class="absolute -top-16 left-1/2 transform -translate-x-1/2 z-10">
      <img src="../php/logo_branding.php" alt="Logo Gym"
        class="w-24 h-24 rounded-full border-4 border-slate-800 shadow-lg bg-white object-cover">
    </div>

    <!-- Contenedor principal -->
    <div class="bg-slate-800 rounded-3xl shadow-xl p-5 md:p-8 pt-16">

      <!-- Encabezado -->
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white text-center lg:text-left">
            💳 Ventas Financiadas
          </h1>
          <p class="text-slate-400 text-sm mt-2 text-center lg:text-left">
            Registra productos vendidos a mensualidades, controla cuotas, saldos y abonos.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <button id="btnAbrirNuevaVenta"
            class="bg-blue-600 hover:bg-blue-700 transition text-white font-semibold py-2.5 px-5 rounded-xl shadow flex items-center justify-center gap-2">
            <i data-lucide="plus-circle" class="w-5 h-5"></i>
            Nueva venta
          </button>

          <button id="btnRecargarVentas"
            class="bg-slate-700 hover:bg-slate-600 transition text-white font-semibold py-2.5 px-5 rounded-xl shadow flex items-center justify-center gap-2">
            <i data-lucide="refresh-cw" class="w-5 h-5"></i>
            Actualizar
          </button>
        </div>
      </div>

      <!-- Cards resumen -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

        <div class="rounded-2xl bg-slate-900/70 border border-slate-700 p-5 shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-400">Financiamientos activos</p>
              <h3 id="cardActivas" class="text-2xl font-bold text-white mt-1">0</h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-blue-600/20 text-blue-300 flex items-center justify-center">
              <i data-lucide="file-text" class="w-6 h-6"></i>
            </div>
          </div>
        </div>

        <div class="rounded-2xl bg-slate-900/70 border border-slate-700 p-5 shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-400">Saldo pendiente</p>
              <h3 id="cardSaldoPendiente" class="text-2xl font-bold text-white mt-1">$0.00</h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <i data-lucide="wallet" class="w-6 h-6"></i>
            </div>
          </div>
        </div>

        <div class="rounded-2xl bg-slate-900/70 border border-slate-700 p-5 shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-400">Vencidas</p>
              <h3 id="cardVencidas" class="text-2xl font-bold text-white mt-1">0</h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-red-500/20 text-red-300 flex items-center justify-center">
              <i data-lucide="alert-triangle" class="w-6 h-6"></i>
            </div>
          </div>
        </div>

        <div class="rounded-2xl bg-slate-900/70 border border-slate-700 p-5 shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-400">Liquidadas</p>
              <h3 id="cardLiquidadas" class="text-2xl font-bold text-white mt-1">0</h3>
            </div>
            <div class="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <i data-lucide="check-circle" class="w-6 h-6"></i>
            </div>
          </div>
        </div>

      </div>

      <!-- Filtros -->
      <div class="rounded-2xl bg-slate-900/50 border border-slate-700 p-5 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">

          <div class="md:col-span-2">
            <label for="filtroBusqueda" class="block text-sm font-medium text-slate-300 mb-1">
              Buscar
            </label>
            <input type="text" id="filtroBusqueda" placeholder="Folio, cliente, teléfono o correo..."
              class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400 placeholder:text-slate-400">
          </div>

          <div>
            <label for="filtroEstado" class="block text-sm font-medium text-slate-300 mb-1">
              Estado
            </label>
            <select id="filtroEstado"
              class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
              <option value="">Todos</option>
              <option value="activa">Activas</option>
              <option value="vencida">Vencidas</option>
              <option value="liquidada">Liquidadas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>

          <div class="flex items-end">
            <button id="btnBuscarVentas"
              class="w-full bg-blue-600 hover:bg-blue-700 transition text-white font-semibold py-2.5 px-4 rounded-xl shadow flex items-center justify-center gap-2">
              <i data-lucide="search" class="w-5 h-5"></i>
              Buscar
            </button>
          </div>

        </div>
      </div>

      <!-- Tabla ventas -->
      <div class="rounded-2xl bg-slate-900/60 border border-slate-700 overflow-hidden shadow">
        <div
          class="px-5 py-4 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 class="text-lg font-bold text-white">Financiamientos registrados</h2>
            <p class="text-sm text-slate-400">Consulta saldos, cuotas y registra abonos.</p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-950/70 text-slate-300">
              <tr>
                <th class="px-4 py-3 text-left font-semibold">Folio</th>
                <th class="px-4 py-3 text-left font-semibold">Cliente</th>
                <th class="px-4 py-3 text-right font-semibold">Total</th>
                <th class="px-4 py-3 text-right font-semibold">Saldo</th>
                <th class="px-4 py-3 text-center font-semibold">Meses</th>
                <th class="px-4 py-3 text-center font-semibold">Estado</th>
                <th class="px-4 py-3 text-center font-semibold">Fecha</th>
                <th class="px-4 py-3 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody id="tbodyVentasFinanciadas" class="divide-y divide-slate-700">
              <tr>
                <td colspan="8" class="px-4 py-8 text-center text-slate-400">
                  No hay datos cargados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          class="px-5 py-4 border-t border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p id="textoPaginacion" class="text-sm text-slate-400">Página 1</p>

          <div class="flex gap-2">
            <button id="btnPaginaAnterior"
              class="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition text-white font-semibold py-2 px-4 rounded-xl">
              Anterior
            </button>

            <button id="btnPaginaSiguiente"
              class="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition text-white font-semibold py-2 px-4 rounded-xl">
              Siguiente
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- MODAL NUEVA VENTA FINANCIADA -->
  <div id="modalNuevaVenta" class="fixed inset-0 bg-black/70 hidden items-center justify-center z-50 px-4 py-8">

    <div
      class="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto">

      <div class="sticky top-0 bg-slate-800 border-b border-slate-700 px-5 md:px-7 py-4 rounded-t-3xl z-10">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold text-white">Nueva venta financiada</h2>
            <p class="text-sm text-slate-400">Selecciona cliente/persona, productos y condiciones de pago.</p>
          </div>

          <button id="btnCerrarNuevaVenta"
            class="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
      </div>

      <div class="p-5 md:p-7 space-y-6">

        <!-- Cliente -->
        <section class="rounded-2xl bg-slate-900/50 border border-slate-700 p-5">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-300 flex items-center justify-center">
              <i data-lucide="user" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="font-bold text-white">Cliente / Persona</h3>
              <p class="text-xs text-slate-400">
                En Smartgate puedes buscar cliente, pero se guardará como texto.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div class="lg:col-span-2 relative">
              <label for="buscarClienteFinanciado" class="block text-sm font-medium text-slate-300 mb-1">
                Buscar o escribir cliente
              </label>
              <input type="text" id="buscarClienteFinanciado" placeholder="Nombre, teléfono, correo..."
                autocomplete="off"
                class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400 placeholder:text-slate-400">

              <div id="resultadosClientes"
                class="hidden absolute left-0 right-0 mt-2 bg-slate-950 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden max-h-64 overflow-y-auto">
              </div>
            </div>

            <div>
              <label for="clienteOrigen" class="block text-sm font-medium text-slate-300 mb-1">
                Origen
              </label>
              <select id="clienteOrigen"
                class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
                <option value="manual">Manual</option>
                <option value="smartgate_clientes">Smartgate clientes</option>
              </select>
            </div>
          </div>

          <input type="hidden" id="clienteReferencia" value="">

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="lg:col-span-2">
              <label for="clienteNombre" class="block text-sm font-medium text-slate-300 mb-1">
                Nombre completo <span class="text-red-400">*</span>
              </label>
              <input type="text" id="clienteNombre"
                class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
            </div>

            <div>
              <label for="clienteTelefono" class="block text-sm font-medium text-slate-300 mb-1">
                Teléfono
              </label>
              <input type="text" id="clienteTelefono"
                class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
            </div>

            <div>
              <label for="clienteEmail" class="block text-sm font-medium text-slate-300 mb-1">
                Correo
              </label>
              <input type="email" id="clienteEmail"
                class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
            </div>

            <div class="md:col-span-2 lg:col-span-4">
              <label for="clienteDireccion" class="block text-sm font-medium text-slate-300 mb-1">
                Dirección / referencia
              </label>
              <input type="text" id="clienteDireccion" placeholder="Opcional"
                class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400 placeholder:text-slate-400">
            </div>
          </div>
        </section>

        <!-- Productos -->
        <section class="rounded-2xl bg-slate-900/50 border border-slate-700 p-5">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-300 flex items-center justify-center">
              <i data-lucide="package-search" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="font-bold text-white">Productos</h3>
              <p class="text-xs text-slate-400">
                Agrega uno o varios productos al financiamiento.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end mb-4">
            <div class="lg:col-span-5 relative">
              <label for="buscarProductoFinanciado" class="block text-sm font-medium text-slate-300 mb-1">
                Buscar producto
              </label>
              <input type="text" id="buscarProductoFinanciado" placeholder="Código, nombre o descripción..."
                autocomplete="off"
                class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400 placeholder:text-slate-400">

              <div id="resultadosProductos"
                class="hidden absolute left-0 right-0 mt-2 bg-slate-950 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden max-h-64 overflow-y-auto">
              </div>
            </div>

            <div class="lg:col-span-2">
              <label for="productoCantidad" class="block text-sm font-medium text-slate-300 mb-1">
                Cantidad
              </label>
              <input type="number" id="productoCantidad" min="1" value="1"
                class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
            </div>

            <div class="lg:col-span-2">
              <label for="productoPrecio" class="block text-sm font-medium text-slate-300 mb-1">
                Precio
              </label>
              <input type="number" id="productoPrecio" step="0.01" min="0"
                class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
            </div>

            <div class="lg:col-span-3">
              <button id="btnAgregarProductoFinanciado"
                class="w-full bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 px-4 rounded-xl shadow flex items-center justify-center gap-2">
                <i data-lucide="plus" class="w-5 h-5"></i>
                Agregar producto
              </button>
            </div>
          </div>

          <input type="hidden" id="productoSeleccionadoId" value="">
          <input type="hidden" id="productoSeleccionadoCodigo" value="">
          <input type="hidden" id="productoSeleccionadoNombre" value="">
          <input type="hidden" id="productoSeleccionadoStock" value="0">

          <div id="productoSeleccionadoInfo"
            class="hidden mb-4 rounded-xl bg-slate-950/70 border border-slate-700 px-4 py-3 text-sm text-slate-300">
          </div>

          <div class="overflow-x-auto rounded-xl border border-slate-700">
            <table class="min-w-full text-sm">
              <thead class="bg-slate-950/70 text-slate-300">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold">Producto</th>
                  <th class="px-4 py-3 text-center font-semibold">Stock</th>
                  <th class="px-4 py-3 text-center font-semibold">Cant.</th>
                  <th class="px-4 py-3 text-right font-semibold">Precio</th>
                  <th class="px-4 py-3 text-right font-semibold">Subtotal</th>
                  <th class="px-4 py-3 text-center font-semibold">Quitar</th>
                </tr>
              </thead>
              <tbody id="tbodyProductosFinanciados" class="divide-y divide-slate-700">
                <tr>
                  <td colspan="6" class="px-4 py-6 text-center text-slate-400">
                    No has agregado productos.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Financiamiento -->
        <section class="rounded-2xl bg-slate-900/50 border border-slate-700 p-5">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <i data-lucide="calculator" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="font-bold text-white">Condiciones del financiamiento</h3>
              <p class="text-xs text-slate-400">
                Define meses, comisión, enganche y fecha de primer pago.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label for="mesesFinanciamiento" class="block text-sm font-medium text-slate-300 mb-1">
                Meses <span class="text-red-400">*</span>
              </label>
              <input type="number" id="mesesFinanciamiento" min="1" value="1"
                class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
            </div>

            <div>
              <label for="comisionPorcentaje" class="block text-sm font-medium text-slate-300 mb-1">
                Comisión %
              </label>
              <input type="number" id="comisionPorcentaje" step="0.01" min="0" value="0"
                class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
            </div>

            <div>
              <label for="engancheFinanciamiento" class="block text-sm font-medium text-slate-300 mb-1">
                Enganche
              </label>
              <input type="number" id="engancheFinanciamiento" step="0.01" min="0" value="0"
                class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
            </div>

            <div>
              <label for="metodoEnganche" class="block text-sm font-medium text-slate-300 mb-1">
                Método enganche
              </label>
              <select id="metodoEnganche"
                class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label for="fechaPrimerPago" class="block text-sm font-medium text-slate-300 mb-1">
                Primer pago <span class="text-red-400">*</span>
              </label>
              <input type="date" id="fechaPrimerPago"
                class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
            </div>
          </div>

          <div class="mt-4">
            <label for="observacionesFinanciamiento" class="block text-sm font-medium text-slate-300 mb-1">
              Observaciones
            </label>
            <textarea id="observacionesFinanciamiento" rows="2" placeholder="Notas internas del financiamiento..."
              class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400 placeholder:text-slate-400"></textarea>
          </div>
        </section>

        <!-- Resumen -->
        <section class="rounded-2xl bg-slate-950/70 border border-slate-700 p-5">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <i data-lucide="receipt" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="font-bold text-white">Resumen</h3>
              <p class="text-xs text-slate-400">
                Cálculo automático antes de generar la venta.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div class="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <p class="text-xs text-slate-400">Subtotal</p>
              <h4 id="resumenSubtotal" class="text-xl font-bold text-white mt-1">$0.00</h4>
            </div>

            <div class="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <p class="text-xs text-slate-400">Comisión</p>
              <h4 id="resumenComision" class="text-xl font-bold text-white mt-1">$0.00</h4>
            </div>

            <div class="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <p class="text-xs text-slate-400">Total</p>
              <h4 id="resumenTotal" class="text-xl font-bold text-white mt-1">$0.00</h4>
            </div>

            <div class="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <p class="text-xs text-slate-400">Enganche</p>
              <h4 id="resumenEnganche" class="text-xl font-bold text-white mt-1">$0.00</h4>
            </div>

            <div class="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <p class="text-xs text-slate-400">Saldo</p>
              <h4 id="resumenSaldo" class="text-xl font-bold text-white mt-1">$0.00</h4>
            </div>

            <div class="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <p class="text-xs text-slate-400">Mensualidad</p>
              <h4 id="resumenMensualidad" class="text-xl font-bold text-white mt-1">$0.00</h4>
            </div>
          </div>
        </section>

        <!-- Botones modal -->
        <div class="flex flex-col sm:flex-row gap-3 justify-end">
          <button id="btnCancelarNuevaVenta"
            class="bg-slate-700 hover:bg-slate-600 transition text-white font-semibold py-2.5 px-5 rounded-xl shadow">
            Cancelar
          </button>

          <button id="btnGuardarVentaFinanciada"
            class="bg-blue-600 hover:bg-blue-700 transition text-white font-semibold py-2.5 px-5 rounded-xl shadow flex items-center justify-center gap-2">
            <i data-lucide="save" class="w-5 h-5"></i>
            Generar venta financiada
          </button>
        </div>

      </div>
    </div>
  </div>

  <!-- MODAL DETALLE -->
  <div id="modalDetalleVenta" class="fixed inset-0 bg-black/70 hidden items-center justify-center z-50 px-4 py-8">

    <div
      class="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto">

      <div class="sticky top-0 bg-slate-800 border-b border-slate-700 px-5 md:px-7 py-4 rounded-t-3xl z-10">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 id="detalleTitulo" class="text-2xl font-bold text-white">Detalle de financiamiento</h2>
            <p id="detalleSubtitulo" class="text-sm text-slate-400">Información de la venta, cuotas y pagos.</p>
          </div>

          <button id="btnCerrarDetalle"
            class="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
      </div>

      <div class="p-5 md:p-7 space-y-6">

        <input type="hidden" id="detalleVentaId" value="">

        <!-- Info principal detalle -->
        <div id="detalleInfoGeneral" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        </div>

        <!-- Productos detalle -->
        <section class="rounded-2xl bg-slate-900/50 border border-slate-700 p-5">
          <h3 class="font-bold text-white mb-4 flex items-center gap-2">
            <i data-lucide="package" class="w-5 h-5"></i>
            Productos
          </h3>

          <div class="overflow-x-auto rounded-xl border border-slate-700">
            <table class="min-w-full text-sm">
              <thead class="bg-slate-950/70 text-slate-300">
                <tr>
                  <th class="px-4 py-3 text-left">Producto</th>
                  <th class="px-4 py-3 text-center">Cantidad</th>
                  <th class="px-4 py-3 text-right">Precio</th>
                  <th class="px-4 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody id="tbodyDetalleProductos" class="divide-y divide-slate-700"></tbody>
            </table>
          </div>
        </section>

        <!-- Cuotas detalle -->
        <section class="rounded-2xl bg-slate-900/50 border border-slate-700 p-5">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 class="font-bold text-white flex items-center gap-2">
              <i data-lucide="calendar-days" class="w-5 h-5"></i>
              Cuotas
            </h3>

            <button id="btnAbrirAbonoDesdeDetalle"
              class="bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2 px-4 rounded-xl shadow flex items-center justify-center gap-2">
              <i data-lucide="badge-dollar-sign" class="w-5 h-5"></i>
              Registrar abono
            </button>
          </div>

          <div class="overflow-x-auto rounded-xl border border-slate-700">
            <table class="min-w-full text-sm">
              <thead class="bg-slate-950/70 text-slate-300">
                <tr>
                  <th class="px-4 py-3 text-center">#</th>
                  <th class="px-4 py-3 text-center">Vencimiento</th>
                  <th class="px-4 py-3 text-right">Programado</th>
                  <th class="px-4 py-3 text-right">Pagado</th>
                  <th class="px-4 py-3 text-right">Saldo</th>
                  <th class="px-4 py-3 text-center">Estado</th>
                  <th class="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody id="tbodyDetalleCuotas" class="divide-y divide-slate-700"></tbody>
            </table>
          </div>
        </section>

        <!-- Pagos detalle -->
        <section class="rounded-2xl bg-slate-900/50 border border-slate-700 p-5">
          <h3 class="font-bold text-white mb-4 flex items-center gap-2">
            <i data-lucide="history" class="w-5 h-5"></i>
            Historial de pagos
          </h3>

          <div class="overflow-x-auto rounded-xl border border-slate-700">
            <table class="min-w-full text-sm">
              <thead class="bg-slate-950/70 text-slate-300">
                <tr>
                  <th class="px-4 py-3 text-center">Fecha</th>
                  <th class="px-4 py-3 text-right">Monto</th>
                  <th class="px-4 py-3 text-center">Método</th>
                  <th class="px-4 py-3 text-left">Referencia</th>
                  <th class="px-4 py-3 text-left">Observaciones</th>
                  <th class="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody id="tbodyDetallePagos" class="divide-y divide-slate-700"></tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  </div>

  <!-- MODAL ABONO -->
  <div id="modalAbono" class="fixed inset-0 bg-black/70 hidden items-center justify-center z-[60] px-4 py-8">

    <div class="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-xl">

      <div class="border-b border-slate-700 px-5 md:px-7 py-4">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold text-white">Registrar abono</h2>
            <p id="abonoSubtitulo" class="text-sm text-slate-400">Aplica un pago al financiamiento.</p>
          </div>

          <button id="btnCerrarAbono"
            class="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
      </div>

      <div class="p-5 md:p-7 space-y-4">

        <input type="hidden" id="abonoVentaId" value="">
        <input type="hidden" id="abonoCuotaId" value="">
        <input type="hidden" id="abonoSaldoMax" value="">
        <div>
          <label for="abonoMonto" class="block text-sm font-medium text-slate-300 mb-1">
            Monto <span class="text-red-400">*</span>
          </label>
          <input type="number" id="abonoMonto" step="0.01" min="0"
            class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
        </div>

        <div>
          <label for="abonoMetodoPago" class="block text-sm font-medium text-slate-300 mb-1">
            Método de pago
          </label>
          <select id="abonoMetodoPago"
            class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <div>
          <label for="abonoReferencia" class="block text-sm font-medium text-slate-300 mb-1">
            Referencia
          </label>
          <input type="text" id="abonoReferencia" placeholder="Opcional"
            class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400 placeholder:text-slate-400">
        </div>

        <div>
          <label for="abonoObservaciones" class="block text-sm font-medium text-slate-300 mb-1">
            Observaciones
          </label>
          <textarea id="abonoObservaciones" rows="3"
            class="block w-full rounded-xl bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400"></textarea>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 justify-end pt-2">
          <button id="btnCancelarAbono"
            class="bg-slate-700 hover:bg-slate-600 transition text-white font-semibold py-2.5 px-5 rounded-xl shadow">
            Cancelar
          </button>

          <button id="btnGuardarAbono"
            class="bg-emerald-600 hover:bg-emerald-700 transition text-white font-semibold py-2.5 px-5 rounded-xl shadow flex items-center justify-center gap-2">
            <i data-lucide="save" class="w-5 h-5"></i>
            Guardar abono
          </button>
        </div>

      </div>
    </div>
  </div>

  <script src="../js/swalConfig.js"></script>
  <script src="../js/jspdf.umd.min.js"></script>
  <script src="../js/ventas-financiadas.js"></script>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      if (window.lucide) {
        lucide.createIcons();
      }
    });
  </script>

</body>

</html>