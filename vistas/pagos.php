<?php
require_once '../php/conexion.php';
$clientes = $conexion->query("SELECT * FROM clientes WHERE tipo = 'clientes' ORDER BY nombre")->fetch_all(MYSQLI_ASSOC);
?>
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
  <title>Pagos - Gimnasio</title>
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/jspdf.umd.min.js"></script>
  <script src="../js/lucide.min.js"></script>
  <script>
    window.usuarioActual = <?= json_encode($_SESSION['usuario'] ?? []); ?>;
  </script>
  <script src="../js/swalConfig.js"></script>  
  <script src="../js/pagos.js"></script>
  <script>
  window.usuarioActual = <?= json_encode([
    'id' => $_SESSION['usuario']['id'] ?? '',
    'nombre' => $_SESSION['usuario']['nombre'] ?? '',
    'tipo' => $_SESSION['usuario']['rol'] ?? '' // ← asegúrate que sea 'rol' o 'tipo' según tu sistema
  ]); ?>;
</script>

  <style>
    body {
     background-image: url('../img/black-paper.png'); 
    }
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1) sepia(1) saturate(5) hue-rotate(200deg);
}
  </style>
</head>
<body class="bg-slate-900 bg-fixed text-gray-100 min-h-screen font-sans">
  <?php include_once '../includes/navbar.php'; ?>

  <div class="max-w-6xl mx-auto mt-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-4xl font-bold">💳 Registrar / Ver Pagos</h1>
    </div>

    <input type="text" id="filtro" placeholder="🔍 Buscar cliente por nombre, apellido o teléfono" class="mb-6 px-4 py-3 w-full rounded-xl border border-gray-600 bg-gray-800 text-white shadow-sm focus:outline-none focus:ring focus:border-blue-400">

    <div class="overflow-x-auto rounded-xl shadow-lg bg-gray-800">
      <table class="min-w-full divide-y divide-gray-600">
        <thead class="bg-slate-800">
          <tr>
            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Nombre</th>
            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Apellido</th>
            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Teléfono</th>
            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider">Estado</th>
            <th class="px-6 py-4 text-center text-sm font-semibold text-gray-300 uppercase tracking-wider">Historial</th>
          </tr>
        </thead>
        <tbody id="tabla-clientes" class="divide-y divide-slate-700">
          <tr id="sin-resultados" class="hidden">
            <td colspan="5" class="p-4 text-center text-gray-400">🔍 No se encontraron resultados</td>
          </tr>
        </tbody>


      </table>
      <div id="paginacion-clientes" class="flex justify-center mt-4 gap-2 flex-wrap text-sm text-white"></div>
    </div>
  </div>
</body>
</html>

