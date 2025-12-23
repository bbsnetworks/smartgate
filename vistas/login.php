<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login - Halo Gym</title>
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/sweetalert2@11.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #0f172a;
      background-image: url('https://www.transparenttextures.com/patterns/black-paper.png');
    }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center bg-gray-900 bg-fixed">
  <div class="backdrop-blur-md bg-white/5 border border-white/10 p-8 rounded-2xl shadow-xl w-full max-w-md text-white">
    <div class="flex flex-col items-center mb-6">
      <img src="../img/logo.webp" alt="Gym Logo" class="w-20 h-20 mb-4" />
      <h1 class="text-2xl font-semibold">Iniciar Sesión</h1>
    </div>

    <form id="loginForm" class="space-y-5">
      <div>
        <label for="correo" class="block text-sm font-medium text-gray-300 mb-1">Correo electrónico</label>
        <input type="email" id="correo" name="correo" required
               class="w-full px-4 py-2 bg-gray-800 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-600" />
      </div>
      <div class="relative">
  <label for="password" class="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
  <input type="password" id="password" name="password" required
         class="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-600 pr-10" />
  
  <!-- Botón mostrar/ocultar -->
  <button type="button" id="togglePassword" 
          class="absolute top-[25px] inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-200">
    <svg id="iconEye" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  </button>
</div>

      <button type="submit"
              class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 rounded-md transition duration-200">
        Iniciar sesión
      </button>
    </form>

    <p class="text-sm text-center mt-4 text-gray-400">
      <!--<a href="recuperar.php" class="text-blue-400 hover:underline">¿Olvidaste tu contraseña?</a> -->
    </p>
  </div>
  <script src="../js/swalConfig.js"></script>  
  <script src="../js/login.js"></script>
</body>
</html>
