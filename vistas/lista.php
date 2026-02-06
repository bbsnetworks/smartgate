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
  <title>Lista de Clientes</title>
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/lucide.min.js"></script>
</head>

<body class="bg-slate-900 text-slate-100 min-h-screen p-6 bg-[url('../img/black-paper.png')]">
  <?php include_once '../includes/navbar.php'; ?>

  <h1 class="text-3xl mt-4 font-bold mb-6 text-center">Administrar Clientes</h1>

  <div class="overflow-x-auto">
    <table class="min-w-full text-center bg-slate-800 shadow-md rounded-xl overflow-hidden">
      <thead class="bg-slate-700 text-slate-300">
        <tr>
          <th class="p-3">Foto</th>
          <th class="p-3">Código</th>
          <th class="p-3">Nombre</th>
          <th class="p-3">Apellido</th>
          <th class="p-3">Acciones</th>
        </tr>
      </thead>
      <tbody id="clientes-body">
        <!-- Registros se cargan con JS -->
      </tbody>
    </table>

    <div id="paginacion-clientes" class="flex flex-wrap justify-center mt-6 gap-2"></div>

  </div>
  <!-- MODAL: Editar Foto Cliente -->
  <div id="modalFoto" class="fixed inset-0 hidden z-50">
    <div class="absolute inset-0 bg-black/60"></div>

    <div class="relative mx-auto mt-16 w-[95%] max-w-xl bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-gray-100">🖼️ Editar foto del cliente</h3>
        <button type="button" onclick="cerrarModalFoto()"
          class="text-gray-300 hover:text-white px-3 py-2 rounded-lg bg-gray-700/60 hover:bg-gray-700">
          ✕
        </button>
      </div>

      <input type="hidden" id="fotoPersonCode">
      <input type="hidden" id="fotoFaceData">

      <div class="space-y-4">
        <div>
          <label class="block font-semibold text-gray-300 mb-2">Seleccionar Cámara:</label>
          <select id="fotoCameraSelect"
            class="w-full bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-white"></select>
        </div>

        <label class="block font-semibold text-red-300 text-base">Solo tomar la cara de la persona 📸</label>

        <div
          class="flex flex-col items-center bg-gray-700 border border-gray-600 p-4 rounded-xl shadow-inner w-fit mx-auto">
          <video id="fotoVideo" class="w-72 h-52 border border-gray-600 rounded-lg shadow mb-2" autoplay></video>
          <img id="fotoCapturedImage" class="w-72 h-52 border border-gray-600 rounded-lg shadow mb-2 hidden" />

          <button type="button" onclick="fotoCaptureImage()"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md w-full">
            📸 Capturar Foto
          </button>

          <div class="mt-4 text-center w-full">
            <label for="fotoFileInput" class="block font-semibold text-yellow-400 text-sm mb-2">
              📁 O subir imagen desde archivo:
            </label>
            <input type="file" id="fotoFileInput" accept="image/*"
              class="text-white file:bg-gray-600 file:border-none file:rounded-md file:px-4 file:py-2 file:text-white file:cursor-pointer w-full" />
          </div>

          <button type="button" id="fotoRetakeButton" onclick="fotoRetakePhoto()"
            class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 shadow-md hidden mt-4 w-full">
            🧹 Limpiar
          </button>
        </div>

        <canvas id="fotoCanvas" style="display:none;"></canvas>

        <div class="flex gap-3 pt-4">
          <button type="button" onclick="cerrarModalFoto()"
            class="w-1/2 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 font-semibold shadow-md">
            Cancelar
          </button>
          <button type="button" id="btnGuardarFoto" onclick="guardarFotoCliente()"
            class="w-1/2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold shadow-md">
            ✅ Actualizar Foto
          </button>
        </div>
      </div>
    </div>
  </div>

  <script>
    const usuarioRol = "<?= $_SESSION['usuario']['rol'] ?>";
  </script>
  <script src="../js/swalConfig.js"></script>
  <script src="../js/lista.js"></script>
  <script src="../js/foto_cliente.js"></script>
</body>

</html>