<?php
  define('BASE_URL', '/smartgate');
?>

<nav class="bg-slate-900 shadow-lg border-b border-slate-700">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-20">

      <!-- Logo -->
      <div class="flex-shrink-0">
        <a href="<?= BASE_URL ?>/index.php">
          <img class="h-[60px] w-auto" src="<?= BASE_URL ?>/img/logo.webp" alt="Logo">
        </a>
      </div>

      <!-- Menú Desktop -->
      <div class="hidden md:flex items-center space-x-8">
        <a href="<?= BASE_URL ?>/index.php" class="flex items-center gap-2 text-gray-100 hover:text-blue-400 font-medium transition duration-200 text-lg">
          <i data-lucide="layout-dashboard" class="w-5 h-5"></i> Dashboard
        </a>
        <a href="<?= BASE_URL ?>/php/logout.php" class="flex items-center gap-2 text-gray-100 hover:text-red-400 font-medium transition duration-200 text-lg">
          <i data-lucide="log-out" class="w-5 h-5"></i> Cerrar Sesión
        </a>
      </div>

      <!-- Botón Hamburguesa -->
      <div class="md:hidden">
        <button id="menu-toggle" class="text-gray-100 hover:text-blue-400 focus:outline-none">
          <i data-lucide="menu" class="h-7 w-7"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- Menú Móvil -->
  <div id="mobile-menu" class="md:hidden hidden px-4 pb-4 space-y-2 bg-slate-800 text-gray-100 border-t border-slate-700">
    <a href="<?= BASE_URL ?>/index.php" class="flex items-center gap-2 py-2 hover:text-blue-400 transition duration-200">
      <i data-lucide="layout-dashboard" class="w-5 h-5"></i> Dashboard
    </a>
    <a href="<?= BASE_URL ?>/php/logout.php" class="flex items-center gap-2 py-2 hover:text-red-400 transition duration-200">
      <i data-lucide="log-out" class="w-5 h-5"></i> Cerrar Sesión
    </a>
  </div>
</nav>

<script>
  document.getElementById('menu-toggle').addEventListener('click', function () {
    document.getElementById('mobile-menu').classList.toggle('hidden');
  });
  lucide.createIcons(); // Renderiza íconos Lucide
</script>
