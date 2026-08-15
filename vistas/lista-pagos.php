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
  <title>Pagos Realizados</title>
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/lucide.min.js"></script>
  <script src="../js/moment.min.js"></script>
  <script>
    window.tipoUsuario = "<?php echo $_SESSION['usuario']['rol'] ?? ''; ?>";
  </script>



</head>

<body class="bg-slate-900 text-slate-200 min-h-screen font-sans bg-[url('../img/black-paper.png')] bg-fixed bg-auto">
  <?php include '../includes/navbar.php'; ?>

  <div class="max-w-6xl mx-auto mt-10 p-6 bg-slate-800 shadow-lg rounded-2xl">
    <h1 class="text-3xl font-bold mb-6 text-center flex items-center justify-center gap-2">💳 Lista de Pagos</h1>

    <div class="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
      <div class="flex gap-2">
        <select id="selectMes" class="bg-slate-700 text-white p-2 rounded">
          <?php
          $mesActual = date('m');

          $meses = [
            '01' => 'enero',
            '02' => 'febrero',
            '03' => 'marzo',
            '04' => 'abril',
            '05' => 'mayo',
            '06' => 'junio',
            '07' => 'julio',
            '08' => 'agosto',
            '09' => 'septiembre',
            '10' => 'octubre',
            '11' => 'noviembre',
            '12' => 'diciembre'
          ];

          foreach ($meses as $numero => $nombre) {
            $selected = $numero === $mesActual ? 'selected' : '';

            echo "<option value=\"$numero\" $selected>
              $numero - $nombre
            </option>";
          }
          ?>
        </select>

        <select id="selectYear" class="bg-slate-700 text-white p-2 rounded">
          <?php
          $yearActual = date("Y");
          for ($y = $yearActual; $y >= $yearActual - 5; $y--) {
            echo "<option value='$y'>$y</option>";
          }
          ?>
        </select>
      </div>

      <input type="text" id="filtroPagos" placeholder="🔍 Buscar por folio, usuario o producto..."
        class="w-full sm:w-full px-4 py-3 rounded-lg bg-slate-700 text-slate-100 placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow">
    </div>


    <div class="overflow-x-auto">
      <table class="min-w-full bg-slate-800 text-slate-100 rounded-xl overflow-hidden shadow-xl">
        <thead class="bg-slate-700 text-slate-200">
          <tr class="text-center">
            <th class="p-3">#</th>
            <th class="p-3">Folio</th>
            <th class="p-3">Fecha</th>
            <th class="p-3">Usuario</th>
            <th class="p-3">Total</th>
            <th class="p-3">Lista de venta</th>
            <th class="p-3">Acciones</th>
          </tr>
        </thead>

        <tbody id="tablaPagos" class="divide-y divide-slate-700">
          <!-- Filas generadas mediante JavaScript -->
        </tbody>
      </table>
    </div>

    <!-- La paginación debe estar fuera y debajo de la tabla -->
    <div id="paginacionPagos" class="mt-6 flex flex-wrap items-center justify-center gap-2"></div>
  </div>

  <script src="../js/swalConfig.js"></script>
  <script src="../js/lista-pagos.js"></script>
</body>

</html>