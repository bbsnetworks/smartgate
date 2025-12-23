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
  <title>Agregar Usuario - Smart Gate</title>
  <link rel="stylesheet" href="../src/output.css">
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/lucide.min.js"></script>
  <script src="../js/jspdf.umd.min.js"></script>


  <script>
    const usuarioRol = "<?= $_SESSION['usuario']['rol'] ?>";
  </script>
  <script defer src="../js/script.js"></script>
  <style>
    
  </style>
</head>
<body class="bg-slate-900 bg-[url('../img/black-paper.png')] bg-fixed bg-auto min-h-screen font-sans text-gray-100 ">
  <?php include_once '../includes/navbar.php'; ?>

  <div class="flex justify-center items-center pt-10 pb-16">
    <div class="bg-gray-800 shadow-2xl rounded-3xl p-8 w-full max-w-3xl">
      <h2 class="text-3xl font-bold text-center text-gray-100 mb-8">👤 Agregar Persona</h2>

      <form id="addUserForm" class="space-y-6">
        <!-- Organización -->
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block font-semibold text-gray-300 mb-1">Organización Principal:</label>
            <select id="orgParent" class="w-full bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-white"></select>
          </div>
          <div>
            <label class="block font-semibold text-gray-300 mb-1">Suborganización:</label>
            <select id="orgIndexCode" name="orgIndexCode" class="w-full bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-white"></select>
          </div>
        </div>

        <!-- Grupo -->
        <div>
          <label class="block font-semibold text-gray-300 mb-1">Grupo:</label>
          <select id="groupIndexCode" name="groupIndexCode" required class="w-full bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-white">
            <option value="">Cargando...</option>
          </select>
        </div>

        <!-- Datos básicos -->
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block font-semibold text-gray-300 mb-1">Código de Persona:</label>
            <input type="text" id="personCode" name="personCode" readonly required class="w-full bg-gray-700 border border-gray-600 p-3 rounded-lg shadow-md cursor-not-allowed text-white">
            <div id="personCodeError" class="text-red-400 text-sm mt-1 hidden"></div> 
          </div>
          <div>
            <label class="block font-semibold text-gray-300 mb-1">Género:</label>
            <select id="gender" name="gender" class="w-full bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-white">
              <option value="1">Masculino</option>
              <option value="2">Femenino</option>
            </select>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block font-semibold text-gray-300 mb-1">Nombre:</label>
            <input type="text" id="personGivenName" name="personGivenName" required class="w-full bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-white">
          </div>
          <div>
            <label class="block font-semibold text-gray-300 mb-1">Apellido:</label>
            <input type="text" id="personFamilyName" name="personFamilyName" required class="w-full bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-white">
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block font-semibold text-gray-300 mb-1">Teléfono:</label>
            <input type="text" id="phoneNo" name="phoneNo" maxlength="10" class="w-full bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-white">
          </div>
          <div>
            <label class="block font-semibold text-gray-300 mb-1">Email:</label>
            <input type="email" id="email" name="email" class="w-full bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-white">
          </div>
        </div>
        <!-- Más información del cliente -->
<div class="grid md:grid-cols-2 gap-4">
  <div>
    <label class="block font-semibold text-gray-300 mb-1">Contacto de Emergencia:</label>
    <input type="text" id="emergencia" name="emergencia" class="w-full bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-md text-white" placeholder="Nombre y/o teléfono">
  </div>
  <div>
    <label class="block font-semibold text-gray-300 mb-1">Tipo de Sangre:</label>
    <input type="text" id="sangre" name="sangre" class="w-full bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-md text-white" placeholder="Ej. O+, A-, etc.">
  </div>
</div>

<div>
  <label class="block font-semibold text-gray-300 mb-1">Comentarios:</label>
  <textarea id="comentarios" name="comentarios" rows="3" class="w-full bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-md text-white" placeholder="Información adicional o relevante del cliente..."></textarea>
</div>

<div class="flex flex-col items-center mt-6 gap-4">
  <div class="w-full text-left">
    <label class="block font-semibold text-gray-300 mb-2">Seleccionar Cámara:</label>
    <select id="cameraSelect" class="w-full bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-white"></select>
  </div>
  <label class="block font-semibold text-red-300 text-xl mb-2">Solo tomar la cara de la persona 📸</label>
  <div class="flex flex-col items-center bg-gray-700 border border-gray-600 p-4 rounded-xl shadow-inner w-fit">
    <video id="video" class="w-64 h-48 border border-gray-600 rounded-lg shadow mb-2" autoplay></video>
    <img id="capturedImage" class="w-64 h-48 border border-gray-600 rounded-lg shadow mb-2 hidden" />
    
    <button type="button" onclick="captureImage()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md w-full">
      📸 Capturar Foto
    </button>

    <div class="mt-4 text-center">
      <label for="fileInput" class="block font-semibold text-yellow-400 text-sm mb-2">
        📁 O subir imagen desde archivo:
      </label>
      <input type="file" id="fileInput" accept="image/*" class="text-white file:bg-gray-600 file:border-none file:rounded-md file:px-4 file:py-2 file:text-white file:cursor-pointer" />
    </div>

    <button type="button" id="retakeButton" onclick="retakePhoto()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 shadow-md hidden mt-4 w-full">
      🧹 Limpiar
    </button>
  </div>
</div>


        <!-- Ocultos -->
        <canvas id="canvas" style="display:none;"></canvas>
        <input type="hidden" id="faceData" name="faceData">
        <input type="hidden" id="faceIconData" name="faceIconData">

        <!-- Botón enviar -->
        <button type="submit" class="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold text-lg shadow-md">
          ✅ Agregar Usuario
        </button>
      </form>
    </div>
  </div>
</body>
</html>


