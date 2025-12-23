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
  <title>Importar Clientes - Gym Admin</title>
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/lucide.min.js"></script>
  <link rel="stylesheet" href="../fonts/bootstrap-icons.css">
  <script>
  window.rolUsuario  = "<?php echo $_SESSION['usuario']['rol']  ?? ''; ?>";
  window.tipoUsuario = "<?php echo $_SESSION['usuario']['tipo'] ?? ($_SESSION['usuario']['rol'] ?? ''); ?>";
</script>



</head>
<body class="bg-slate-900 text-slate-200 min-h-screen font-sans bg-[url('../img/black-paper.png')] bg-fixed bg-auto">
<?php include "../includes/navbar.php" ?>

<div class="max-w-4xl mx-auto mt-20 bg-slate-800 p-8 rounded-2xl shadow-lg">
  <h2 class="text-3xl font-bold mb-4 text-center text-white">📥 Importar Clientes</h2>
  <p class="text-slate-300 mb-6 text-center">Carga una lista en Excel para revisar o importar los clientes registrados en HikCentral.</p>
  
  <form id="formImportarClientes" class="flex flex-col items-center gap-4">
    <input 
      type="file" 
      id="archivoExcel" 
      name="archivoExcel" 
      accept=".xlsx, .xls" 
      required 
      class="block w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4
        file:rounded-full file:border-0
        file:text-sm file:font-semibold
        file:bg-blue-600 file:text-white
        hover:file:bg-blue-700 transition duration-150"
    />
    <button 
      type="submit" 
      class="bg-green-600 hover:bg-green-700 transition px-6 py-2 rounded-lg text-white font-medium shadow">
      📤 Importar Excel
    </button>
  </form>

  <div id="tablaPreview" class="mt-10 text-sm text-white"></div>
</div>

<script src="../js/swalConfig.js"></script>
<script src="../js/importar.js"></script>
</body>
</html>

