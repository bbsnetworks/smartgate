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
  <title>Reportes - Gym Admin</title>
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/lucide.min.js"></script>
  <script src="../js/sweetalert2@11.js"></script>
  <link rel="stylesheet" href="../fonts/bootstrap-icons.css">
</head>
<body class="bg-slate-900 text-slate-200 font-sans min-h-screen bg-[url('../img/black-paper.png')] bg-fixed bg-auto">
<?php include "../includes/navbar.php" ?>

<div class="relative w-full max-w-5xl mx-auto mt-32 mb-16 px-4">
<!-- LOGO flotante -->
<div class="absolute -top-16 left-1/2 transform -translate-x-1/2">
  <img src="../php/logo_branding.php"
       alt="Logo Gym"
       class="w-24 h-24 rounded-full border-4 border-slate-800 shadow-lg bg-white object-cover">
</div>



  <!-- Contenedor principal -->
  <div class="bg-slate-800 rounded-3xl shadow-xl p-8 pt-16">
    <h1 class="text-3xl font-bold text-center mb-8 text-white">📊 Reportes</h1>

    <!-- Filtros -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div>
        <label for="usuario" class="block text-sm font-medium text-slate-300">Usuario</label>
        <select id="usuario" class="mt-1 block w-full rounded-md bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400" <?= $_SESSION['usuario']['rol'] === 'worker' ? 'disabled' : '' ?>>
          <?php
          include_once '../php/conexion.php';
          if ($_SESSION['usuario']['rol'] === 'admin' || $_SESSION['usuario']['rol'] === 'root') {
          echo "<option value='todos'>Todos</option>";
  
          $rolActual = $_SESSION['usuario']['rol'];
  
          if ($rolActual === 'admin') {
            $query = "SELECT id, nombre FROM usuarios WHERE activo = 1 AND rol IN ('admin', 'worker')";
          } else if ($rolActual === 'root') {
            $query = "SELECT id, nombre FROM usuarios WHERE activo = 1";
          }

          $result = mysqli_query($conexion, $query);
          while ($row = mysqli_fetch_assoc($result)) {
            echo "<option value='{$row['id']}'>{$row['nombre']}</option>";
          }
        }
         else {
          $id = $_SESSION['usuario']['id'];
          $nombre = $_SESSION['usuario']['nombre'];
            echo "<option value='{$id}' selected>{$nombre}</option>";
          }
          ?>
        </select>
      </div>

      <div>
        <label for="tipoPeriodo" class="block text-sm font-medium text-slate-300">Tipo de búsqueda</label>
        <select id="tipoPeriodo" onchange="mostrarFiltros()" class="mt-1 block w-full rounded-md bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
          <option value="dia">Por día</option>
          <option value="mes">Por mes</option>
          <option value="anio">Por año</option>
          <option value="rango">Por rango</option>
        </select>
      </div>

      <div class="flex items-end">
        <button id="btnBuscarReporte" onclick="buscarReportes()" class="w-full bg-blue-600 hover:bg-blue-700 transition text-white font-semibold py-2 px-4 rounded-md shadow">
          🔍 Buscar Reporte
        </button>
      </div>
    </div>

    <!-- Filtros adicionales -->
    <div id="filtrosDinamicos" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <input type="date" id="fecha_dia" class="rounded-md bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400" />
      <input type="month" id="fecha_mes" class="hidden rounded-md bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400" />
      <select id="fecha_anio" class="hidden rounded-md bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400">
        <?php for ($y = date("Y"); $y >= 2020; $y--) echo "<option value='$y'>$y</option>"; ?>
      </select>
      <div class="hidden" id="rango_fechas">
        <label class="block text-sm font-medium text-slate-300">Fecha Inicio</label>
        <input type="date" id="rango_inicio" class="block w-full rounded-md bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400" />
        <label class="block text-sm font-medium text-slate-300 mt-2">Fecha Fin</label>
        <input type="date" id="rango_fin" class="block w-full rounded-md bg-slate-700 text-white border border-slate-600 shadow-sm focus:ring-blue-400 focus:border-blue-400" />
      </div>
    </div>

    <!-- Contenedor de reportes -->
    <div id="reporteContainer" class="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
      <!-- Cards dinámicos se insertarán aquí -->
    </div>
  </div>
</div>

<script src="../js/swalConfig.js"></script>
<script src="../js/jspdf.umd.min.js"></script>
<script src="../js/reportes.js"></script>

</body>
</html>

