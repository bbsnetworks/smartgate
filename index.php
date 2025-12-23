<?php include_once './php/verificar_sesion.php'; ?>
<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - Gym Admin</title>
  <link rel="icon" type="image/x-icon" href="img/favicon.ico">
  <link rel="stylesheet" href="src/output.css">
  <!-- Bootstrap Icons (local) -->
  <link rel="stylesheet" href="fonts/bootstrap-icons.css">
  <link rel="stylesheet" href="css/scroll.css">
  <style>
    /* ≈ 20px como tu w-5 */
    .icon-20 {
      font-size: 20px;
      line-height: 1;
    }

    .scrollbar-custom::-webkit-scrollbar {
      width: 8px;
    }

    .scrollbar-custom::-webkit-scrollbar-track {
      background: #1e293b;
      /* gris oscuro */
    }

    .scrollbar-custom::-webkit-scrollbar-thumb {
      background-color: #FFB900;
      border-radius: 9999px;
    }
  </style>
</head>

<body class="bg-slate-900 font-sans min-h-screen bg-[url('../img/black-paper.png')] bg-fixed bg-auto text-slate-200">

  <!-- LAYOUT -->
  <div class="w-full min-h-screen flex">

    <!-- SIDEBAR -->
    <aside class="aside-scroll aside-scroll--fade w-72 shrink-0 h-[100dvh] sticky top-0
         bg-slate-900/70 backdrop-blur border-r border-slate-700/50 px-4 pr-2 py-6
         hidden md:block flex flex-col">
      <div class="flex items-center gap-3 mb-6">
        <img src="img/logo.webp" class="h-8" alt="logo">
        <span class="font-semibold text-slate-100">Gym Admin</span>
      </div>

      <?php $rol = $_SESSION['usuario']['rol']; ?>

      <!-- Sección Clientes -->
      <button onclick="toggleAccordion('clientesPanel')"
        class="w-full text-left text-sm font-semibold text-green-300 bg-green-900/40 px-4 py-3 rounded-lg hover:bg-green-800/50 transition">
        👤 Gestión de Clientes
      </button>
      <div id="clientesPanel" class="mt-3 space-y-2">
        <a href="vistas/pagos.php"
          class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
          <i class="bi bi-currency-dollar icon-20 text-green-400"></i><span>Registrar/Ver Pagos</span>
        </a>
        <a href="vistas/agregar.php"
          class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
          <i class="bi bi-person-plus icon-20 text-green-400"></i><span>Agregar Personas</span>
        </a>
        <a href="vistas/lista.php"
          class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
          <i class="bi bi-card-list icon-20 text-green-400"></i><span>Administrar Clientes</span>
        </a>
      </div>

      <!-- Sección Productos -->
      <div class="mt-6">
        <button onclick="toggleAccordion('productosPanel')"
          class="w-full text-left text-sm font-semibold text-indigo-300 bg-indigo-800/40 px-4 py-3 rounded-lg hover:bg-indigo-700/50 transition">
          🛒 Gestión de Productos
        </button>
        <div id="productosPanel" class="mt-3 space-y-2">
          <a href="vistas/pagos-productos.php"
            class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
            <i class="bi bi-cart icon-20 text-indigo-400"></i><span>Venta de Productos</span>
          </a>
          <a href="vistas/admin-productos.php"
            class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
            <i class="bi bi-shop icon-20 text-indigo-400"></i><span>Administrar Productos</span>
          </a>
          <a href="vistas/admin-categorias.php"
            class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
            <i class="bi bi-tags icon-20 text-indigo-400"></i><span>Administrar Categorías</span>
          </a>
          <a href="vistas/lista-pagos.php"
            class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
            <i class="bi bi-receipt icon-20 text-indigo-400"></i><span>Lista de Pagos</span>
          </a>
          <a href="vistas/proveedores.php"
            class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
            <i class="bi bi-people-fill text-indigo-400"></i><span>Proveedores</span>
          </a>
        </div>
      </div>
      <!-- Sección Cafetería -->
      <!-- 
      <div class="mt-6">
        <button onclick="toggleAccordion('cafeteriaPanel')"
          class="w-full text-left text-sm font-semibold text-rose-300 bg-rose-900/40 px-4 py-3 rounded-lg hover:bg-rose-800/50 transition">
          ☕ Cafetería
        </button>

        <div id="cafeteriaPanel" class="mt-3 space-y-2">
          <a href="vistas/caf_pedido.php"
            class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
            <i class="bi bi-cup-hot icon-20 text-rose-400"></i>
            <span>Nuevo pedido (táctil)</span>
          </a>

          <a href="vistas/caf_admin_productos.php"
            class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
            <i class="bi bi-shop icon-20 text-rose-400"></i><span>Administrar Productos</span>
          </a>

          <a href="vistas/caf_admin_categorias.php"
            class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
            <i class="bi bi-receipt icon-20 text-rose-400"></i>
            <span>Administrar Categorías (Cafeteria)</span>
          </a>

          <a href="vistas/ver_pedidos.php"
            class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
            <i class="bi bi-receipt icon-20 text-rose-400"></i>
            <span>Ver pedidos</span>
          </a>
          <a href="vistas/cocina.php"
            class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
            <i class="bi bi-receipt icon-20 text-rose-400"></i>
            <span>Pedidos (Cocina)</span>
          </a>
        </div>
      </div>
      -->
      <!-- Sección Admin y Reportes -->
      <div class="mt-6">
        <button onclick="toggleAccordion('adminPanel')"
          class="w-full text-left text-sm font-semibold text-amber-300 bg-amber-900/40 px-4 py-3 rounded-lg hover:bg-amber-800/50 transition">
          🧑‍💼 Administración y Reportes
        </button>
        <div id="adminPanel" class="mt-3 space-y-2">
          <?php if ($rol === 'admin' || $rol === 'root'): ?>
            <a href="vistas/empleados.php"
              class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
              <i class="bi bi-person-vcard icon-20 text-amber-400"></i><span>Administrar Empleados / Gerencia</span>
            </a>
            <a href="vistas/usuarios.php"
              class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
              <i class="bi bi-people-fill icon-20 text-amber-400"></i><span>Administrar Usuarios</span>
            </a>
            <?php if ($rol === 'root'): ?>
              <a href="vistas/importar.php"
                class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
                <i class="bi bi-database icon-20 text-amber-400"></i><span>Importar</span>
              </a>
            <?php endif; ?>
            <a onclick="modalSuscripcion()"
              class="block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3 cursor-pointer">
              <i class="bi bi-key icon-20 text-amber-400"></i><span>Administrar Suscripción</span>
            </a>
            <a onclick="modalApiConfig()"
              class="block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3 cursor-pointer">
              <i class="bi bi-gear-wide-connected icon-20 text-amber-400"></i>
              <span>Configurar API</span>
            </a>
          <?php endif; ?>
          <a onclick="modalBranding()"
            class="block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3 cursor-pointer">
            <i class="bi bi-brush icon-20 text-amber-400"></i>
            <span>Configuración de Marca</span>
          </a>
          <a href="vistas/reportes.php"
            class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
            <i class="bi bi-file-text icon-20 text-amber-400"></i><span>Ver Reportes</span>
          </a>
        </div>
      </div>

      <!-- Botones inferiores -->
      <div class="mt-auto pt-6 space-y-2">
        <a id="menu-verificar-puertas" href="#" class="block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70
                  hover:bg-slate-700/60 flex items-center gap-3">
          <i class="bi bi-door-open icon-20 text-emerald-400"></i>
          <span>Verificar puertas</span>
        </a>

        <a href="php/logout.php"
          class="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-3 rounded-xl shadow">
          <i class="bi bi-box-arrow-right text-lg"></i>
          <span class="font-semibold">Salir</span>
        </a>
        <a href="https://wa.me/5214451533504?text=Hola,%20necesito%20soporte%20del%20Gym%20Sport%20Fitness"
          target="_blank"
          class="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl shadow">
          <i class="bi bi-whatsapp text-lg"></i>
          <span class="font-semibold">Soporte</span>
        </a>
      </div>
    </aside>

    <!-- CONTENIDO PRINCIPAL -->
    <main class="flex-1 min-w-0 px-4 md:px-8 py-20 md:py-10">
      <div class="max-w-6xl mx-auto">

        <!-- Encabezado -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            <img id="sidebarLogoImg" src="img/logo.webp" class="h-32 w-32 rounded-full" alt="logo">
            <span id="sidebarAppName" class="font-semibold text-slate-100 text-lg">Gym Admin</span>
          </div>
          <!-- Pill de usuario (derecha) -->
          <div
            class="bg-slate-800/80 text-white px-4 py-2 rounded-full shadow-xl border border-white/10 backdrop-blur flex items-center gap-2">
            <i class="bi bi-person-circle text-xl text-green-400"></i>
            <span class="font-semibold"><?php echo $_SESSION['usuario']['nombre']; ?></span>
          </div>
        </div>
        <!-- Filtro global de usuario -->
        <div class="mb-4 flex items-center gap-3">
          <label for="sel-usuario-global" class="text-slate-300">Usuario:</label>
          <select id="sel-usuario-global" class="bg-slate-800 text-slate-100 border border-slate-600 rounded px-3 py-2">
            <!-- Se llena por JS -->
          </select>
        </div>

        <!-- GRID de KPIs -->
        <section id="kpis" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-card">
          <!-- Activos -->
          <!-- Caja -->
          <article id="card-caja" class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-slate-300">Caja</h3>
              <i class="bi bi-safe2 icon-20 text-emerald-400"></i>
            </div>

            <p id="kpi-caja-monto" class="mt-3 text-4xl font-extrabold">—</p>
            <small id="kpi-caja-actualizado" class="block text-slate-400">—</small>

            <div class="mt-4">
              <button id="btn-caja-editar"
                class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow disabled:opacity-50 disabled:cursor-not-allowed">
                Editar monto
              </button>
            </div>
          </article>

          <article class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow"
            style="grid-auto-rows:minmax(180px,auto)">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-slate-300">Clientes activos</h3>
              <i class="bi bi-person-check icon-20 text-green-400"></i>
            </div>
            <p id="kpi-activos" class="mt-3 text-4xl font-extrabold">—</p>
            <small class="text-slate-400">fin ≥ hoy</small>
          </article>

          <!-- No activos -->
          <article class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-slate-300">Clientes NO activos</h3>
              <i class="bi bi-person-x icon-20 text-rose-400"></i>
            </div>
            <p id="kpi-inactivos" class="mt-3 text-4xl font-extrabold">—</p>
            <small class="text-slate-400">fin &lt; hoy o sin fecha</small>
          </article>

          <!-- Aniversarios -->
          <article id="card-aniversarios" class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow
                   h-full flex flex-col
                   xl:col-start-3 xl:row-span-2">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-slate-300">Aniversarios (hoy)</h3>
              <i class="bi bi-cake2 icon-20 text-amber-400"></i>
            </div>

            <p id="kpi-aniversarios" class="mt-3 text-4xl font-extrabold">—</p>

            <!-- Lista -->
            <ul id="lista-aniversarios"
              class="mt-3 text-sm text-slate-300 space-y-1 flex-1 min-h-0 overflow-auto pr-1 max-h-24 scrollbar-custom">
              <!-- Se llena por JS -->
            </ul>

            <small class="block mt-2 text-slate-400">
              Coinciden mes/día con su fecha de alta
            </small>
          </article>
          <!-- Card: Stock bajo -->
          <div class="bg-slate-800/40 border border-slate-600/30 rounded-xl p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs text-slate-400">Umbral: ≤ 5</span>
              <h3 class="text-red-400 font-semibold flex items-center gap-2">
                Stock bajo
                <!-- icono opcional -->
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 17v-2h6v2m-7-4h8l1-9H5l1 9z" />
                </svg>
              </h3>
            </div>

            <!-- Contenedor scrollable -->
            <ul id="lista-stock-bajo" class="space-y-2 overflow-y-auto pr-1 flex-1 min-h-[100px] max-h-[250px]">
              <!-- Items los llena JS -->
            </ul>

            <!-- Footer -->
            <div id="stock-bajo-footer" class="mt-2 text-xs text-slate-400"></div>
          </div>


          <!-- Ventas -->
          <article class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-slate-300">Ventas (hoy)</h3>
              <i class="bi bi-currency-dollar icon-20 text-indigo-400"></i>
            </div>
            <p id="kpi-ventas" class="mt-3 text-4xl font-extrabold">—</p>
            <small id="kpi-ventas-det" class="text-slate-400"></small>
          </article>
          <!-- Abrir puerta -->
          <article id="card-abrir-puerta"
            class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow cursor-pointer hover:bg-slate-700/70 transition">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-slate-300">Abrir puerta</h3>
              <i class="bi bi-door-open icon-20 text-green-400"></i>
            </div>
            <p class="mt-3 text-sm text-slate-400">Click para enviar la orden.</p>
          </article>
          <!-- Cafetería: nuevo pedido (táctil) -->
          <!-- 
          <article id="card-cafeteria"
            class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow cursor-pointer hover:bg-slate-700/70 transition"
            onclick="location.href='vistas/caf_pedido.php'">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-slate-300">Cafetería — Nuevo pedido</h3>
              <i class="bi bi-cup-hot icon-20 text-rose-400"></i>
            </div>
            <p class="mt-3 text-sm text-slate-400">
              Toca para abrir la ventana táctil y tomar pedidos por personCode.
            </p>
          </article>
          -->
          <!-- Inscripciones -->
          <article class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-slate-300">Mensualidades (hoy)</h3>
              <i class="bi bi-person-badge icon-20 text-teal-400"></i>
            </div>
            <p id="kpi-inscripciones" class="mt-3 text-4xl font-extrabold">—</p>
            <small id="kpi-insc-det" class="text-slate-400"></small>
          </article>



          <!-- NUEVA: Monto inscripciones (hoy) -->
          <article class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-slate-300">Monto mensualidades (hoy)</h3>
              <i class="bi bi-cash-coin icon-20 text-emerald-400"></i>
            </div>
            <p id="kpi-inscripciones-monto" class="mt-3 text-4xl font-extrabold">—</p>
            <small id="kpi-insc-monto-det" class="text-slate-400"></small>
          </article>
          <!-- Movimientos de caja -->
           <?php if ($rol !== 'root'): ?>
          <article id="card-caja-mov" class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-slate-300">Movimientos de caja (hoy)</h3>
              <i class="bi bi-arrow-left-right icon-20 text-sky-400"></i>
            </div>

            <p id="kpi-mov-neto" class="mt-3 text-4xl font-extrabold">—</p>
            <small id="kpi-mov-det" class="block text-slate-400">—</small>

            <div class="mt-4 flex items-center gap-2">
              <button id="btn-mov-nuevo"
                class="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow disabled:opacity-50 disabled:cursor-not-allowed">
                <i class="bi bi-plus-circle mr-1"></i> Nuevo
              </button>

              <button id="btn-mov-ver"
                class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white shadow disabled:opacity-50 disabled:cursor-not-allowed">
                <i class="bi bi-list-ul mr-1"></i> Ver
              </button>
            </div>
          </article>
          <?php endif; ?>
        </section>

        <!-- GRÁFICAS -->
        <section class="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <!-- Inscripciones -->
          <article class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow">
            <div class="flex items-center justify-between gap-3 mb-4">
              <h3 class="font-semibold text-slate-300">Inscripciones</h3>
              <div class="flex items-center gap-2">
                <select id="res-insc" class="bg-slate-700/70 border border-slate-600 rounded-lg px-3 py-1 text-sm">
                  <option value="dia">Día</option>
                  <option value="semana">Semana</option>
                  <option value="mes" selected>Mes</option>
                </select>
              </div>
            </div>
            <canvas id="chart-insc" height="160"></canvas>
          </article>

          <!-- Ventas de productos -->
          <article class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow">
            <div class="flex items-center justify-between gap-3 mb-4">
              <h3 class="font-semibold text-slate-300">Ventas de productos</h3>
              <div class="flex items-center gap-2">
                <select id="res-prod" class="bg-slate-700/70 border border-slate-600 rounded-lg px-3 py-1 text-sm">
                  <option value="dia">Día</option>
                  <option value="semana">Semana</option>
                  <option value="mes" selected>Mes</option>
                </select>
              </div>
            </div>
            <canvas id="chart-prod" height="160"></canvas>
          </article>
        </section>

      </div>
    </main>
  </div>

  <!-- Logo flotante (opcional) -->
  <!--<div class="fixed bottom-6 left-6 z-30 hidden md:flex items-center justify-center px-4 py-2 rounded-full shadow-lg">
    <img src="img/logo.webp" alt="Logo App" class="h-8 object-contain">
  </div>-->

  <!-- SCRIPTS -->
  <script src="js/sweetalert2@11.js"></script>
  <script src="js/chart.js@4.4.1"></script>
  <script src="js/swalConfig.js"></script>
  <script src="js/dashboard.js"></script> <!-- tu script de suscripción/accordeones -->
  <script src="js/puerta.js"></script> <!-- sigue igual -->
  <script src="js/dashboard-home.js"></script> <!-- KPIs y gráfica -->
</body>

</html>