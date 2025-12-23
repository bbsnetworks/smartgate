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
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Venta de Productos</title>
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/jspdf.umd.min.js"></script>
  <script src="../js/lucide.min.js"></script>
</head>
<body class="bg-slate-900 min-h-screen font-sans p-6 text-slate-200 bg-[url('../img/black-paper.png')]">
  <?php include "../includes/navbar.php" ?>

  <div class="max-w-4xl mx-auto bg-slate-800 rounded-3xl shadow-xl p-8 mt-8 border border-slate-700">
    <h2 class="text-3xl font-bold text-center text-slate-100 mb-6">🛒 Venta de Productos</h2>

    <div class="mb-4 relative">
      <label for="codigo" class="block text-slate-300 font-semibold mb-1">📷 Escanea o ingresa el código:</label>
      <input
        id="codigo"
        type="text"
        class="w-full bg-slate-700 text-slate-100 border border-slate-600 placeholder-slate-400 px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Escanea código o escribe nombre de producto"
        autocomplete="off"
      />
      <!-- Contenedor para sugerencias -->
      <div
        id="sugerencias"
        class="absolute top-full left-0 w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-lg shadow-lg mt-1 z-50 hidden max-h-60 overflow-y-auto"
      ></div>
    </div>

    <div class="overflow-x-auto rounded-lg border border-slate-700">
      <table class="w-full table-auto text-left">
        <thead>
          <tr class="bg-slate-700 text-slate-200">
            <th class="px-4 py-2 border-b border-slate-600">Producto</th>
            <th class="px-4 py-2 border-b border-slate-600">Cantidad</th>
            <th class="px-4 py-2 border-b border-slate-600">Precio</th>
            <th class="px-4 py-2 border-b border-slate-600">Total</th>
            <th class="px-4 py-2 border-b border-slate-600">Eliminar</th>
          </tr>
        </thead>
        <tbody id="tablaProductos" class="text-slate-100"></tbody>
      </table>
    </div>

    <div class="mt-6 text-right text-xl font-bold text-slate-100">
      Total a pagar: $<span id="totalPagar">0.00</span>
    </div>
<!-- Método de pago + Cantidad entregada -->
<div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
  <div>
    <label for="metodoPago" class="block text-slate-300 font-semibold mb-2">💰 Método de pago:</label>
    <select
      id="metodoPago"
      class="w-full bg-slate-700 text-slate-100 border border-slate-600 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="Efectivo">Efectivo</option>
      <option value="Tarjeta">Tarjeta</option>
      <option value="Transferencia">Transferencia</option>
    </select>
  </div>

  <div>
    <label for="montoEntregado" class="block text-slate-300 font-semibold mb-2">💵 Cantidad entregada:</label>
    <input
      id="montoEntregado"
      type="number"
      step="0.01"
      min="0"
      class="w-full bg-slate-700 text-slate-100 border border-slate-600 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      placeholder="Ej. 500.00"
    />
  </div>
</div>


    <div class="mt-6">
      <button
        onclick="procesarVenta()"
        class="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold shadow"
      >
        💳 Realizar Pago
      </button>
    </div>
  </div>
  <script src="../js/swalConfig.js"></script>
  <script src="../js/pagos-productos.js"></script>
</body>
</html>
