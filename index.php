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
          <a href="vistas/ventas-financiadas.php"
            class="card-bloqueable block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
            <i class="bi bi-box-arrow-in-down text-indigo-400"></i><span>Ventas Financiadas</span>
          </a>
        </div>
      </div>
      <!-- Sección Cafetería -->

      <!-- <div class="mt-6">
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
      </div> -->

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

        <!-- Sección Herramientas -->
        <div class="mt-6">
          <button onclick="toggleAccordion('toolsPanel')"
            class="w-full text-left text-sm font-semibold text-sky-300 bg-sky-900/40 px-4 py-3 rounded-lg hover:bg-sky-800/50 transition">
            🧰 Herramientas
          </button>

          <div id="toolsPanel" class="mt-3 space-y-2">
            <a id="btn-server-status" href="#"
              class="block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
              <i class="bi bi-activity icon-20 text-sky-400"></i>
              <span>Revisar servidor</span>
            </a>

            <a id="btn-server-start" href="#"
              class="block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
              <i class="bi bi-play-circle icon-20 text-emerald-400"></i>
              <span>Levantar servidor</span>
            </a>

            <a id="btn-server-open" href="#"
              class="block px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 hover:bg-slate-700/60 flex items-center gap-3">
              <i class="bi bi-window-fullscreen icon-20 text-pink-400"></i>
              <span>Abrir Visor</span>
            </a>

          </div>
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
            <small class="text-slate-400 block">fin &lt; hoy o sin fecha</small>

            <div class="mt-4">
              <button id="btn-ver-inactivos" class="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow
             disabled:opacity-50 disabled:cursor-not-allowed">
                <i class="bi bi-eye mr-1"></i> Ver clientes
              </button>
            </div>
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

          <!-- Card: Próximos pagos financiados -->
          <article id="card-pagos-financiados"
            class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow h-full flex flex-col xl:row-span-2">

            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 class="font-semibold text-slate-300 flex items-center gap-2">
                  Próximos pagos
                  <span id="pagos-financiados-count"
                    class="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                    0
                  </span>
                </h3>
                <p class="text-xs text-slate-400 mt-1">
                  Ventas financiadas por pagar
                </p>
              </div>

              <i class="bi bi-calendar2-week icon-20 text-amber-400"></i>
            </div>

            <!-- Resumen superior -->
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div class="rounded-xl bg-slate-900/60 border border-slate-700 p-3">
                <p class="text-xs text-slate-400">Disponible</p>
                <p id="pagos-financiados-disponible" class="text-lg font-extrabold text-white mt-1">
                  $0.00
                </p>
              </div>

              <div class="rounded-xl bg-slate-900/60 border border-slate-700 p-3">
                <p class="text-xs text-slate-400">Vencidos</p>
                <p id="pagos-financiados-vencidos" class="text-lg font-extrabold text-red-300 mt-1">
                  0
                </p>
              </div>
            </div>

            <!-- Lista -->
            <div class="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-custom">
              <ul id="lista-pagos-financiados" class="space-y-2">
                <li class="rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-sm text-slate-400 text-center">
                  Cargando pagos próximos...
                </li>
              </ul>
            </div>

            <!-- Footer -->
            <div class="mt-4 flex items-center justify-between gap-3">
              <small id="pagos-financiados-footer" class="text-xs text-slate-400">
                —
              </small>

              <a href="vistas/ventas-financiadas.php"
                class="text-xs px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition whitespace-nowrap">
                Ver todos
              </a>
            </div>
          </article>
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
          <article id="card-abrir-puerta" class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-slate-300">Abrir puerta</h3>
              <i class="bi bi-door-open icon-20 text-green-400"></i>
            </div>

            <p class="mt-3 text-sm text-slate-400">
              Selecciona qué puerta deseas abrir.
            </p>

            <div class="mt-4 flex items-center gap-2">
              <button id="btn-abrir-puerta-1" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow
             disabled:opacity-50 disabled:cursor-not-allowed">
                <i class="bi bi-door-open mr-1"></i> Puerta 1
              </button>

              <button id="btn-abrir-puerta-2" class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white shadow
             disabled:opacity-50 disabled:cursor-not-allowed">
                <i class="bi bi-door-open mr-1"></i> Puerta 2
              </button>
            </div>

            <small id="puertas-hint" class="mt-3 block text-xs text-slate-400">
              —
            </small>
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
        <section>
          <!-- Entradas (HikCentral) -->
          <article id="card-entradas" class="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 shadow
         xl:col-span-2 h-full flex flex-col mt-8">

            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold">Entradas</h3>
                  <span id="entradas-count" class="...">0</span>
                </div>
                <p id="entradas-sub" class="text-slate-400 text-sm"></p>
              </div>

              <div id="entradas-fecha-wrap" class="flex items-center gap-2">
                <input id="entradas-fecha" type="date" class="..." />
                <button id="entradas-refresh"
                  class="px-3 py-2 rounded-lg bg-slate-700/70 hover:bg-slate-600/70 border border-slate-600/60 text-slate-100">
                  <i class="bi bi-arrow-clockwise mr-1"></i> Actualizar
                </button>
              </div>

            </div>


            <!-- Lista -->
            <div class="mt-4 flex-1 min-h-0 pr-1 scrollbar-custom relative">

              <!-- Overlay Loader -->
              <div id="entradas-loading"
                class="hidden absolute inset-0 z-10 rounded-xl bg-slate-950/40 backdrop-blur-sm flex items-center justify-center">
                <div class="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-700/60 bg-slate-900/70">
                  <span
                    class="inline-block w-5 h-5 border-2 border-slate-200 border-t-transparent rounded-full animate-spin"></span>
                  <span id="entradas-loading-text" class="text-slate-200 text-sm">Cargando…</span>
                </div>
              </div>
              <!-- Tabs de eventos -->
              <div id="entradas-tabs" class="mt-4 flex flex-wrap gap-2">
                <!-- JS -->
              </div>
              <!-- Filtros -->
              <div id="entradas-filtros" class="mt-3 flex flex-wrap gap-2 items-center">
                <!-- JS -->
              </div>

              <!-- Scroll interno (tu lista) -->
              <div class="h-full overflow-auto">
                <ul id="entradas-lista" class="space-y-2 pr-2 scrollbar-custom">
                  <!-- JS -->
                </ul>
              </div>

            </div>


            <!-- Footer -->
            <div class="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span id="entradas-estado">—</span>


            </div>
          </article>

        </section>
      </div>
    </main>
  </div>


  <!-- Modal: Abono rápido financiado -->
<div id="modal-abono-financiado-dashboard"
  class="hidden fixed inset-0 z-50 bg-black/70 items-center justify-center px-4 py-8">

  <div class="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-800 shadow-2xl overflow-hidden">

    <div class="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-white">Registrar abono</h2>
        <p id="dash-abono-subtitulo" class="text-sm text-slate-400">
          Pago de venta financiada
        </p>
      </div>

      <button id="btn-cerrar-abono-financiado-dashboard"
        class="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <div class="p-5 space-y-4">

      <input type="hidden" id="dash-abono-venta-id">
      <input type="hidden" id="dash-abono-cuota-id">
      <input type="hidden" id="dash-abono-saldo-max">

      <div class="rounded-xl bg-slate-900/60 border border-slate-700 p-4">
        <p class="text-xs text-slate-400">Saldo disponible para pagar</p>
        <p id="dash-abono-saldo-texto" class="text-2xl font-extrabold text-amber-300 mt-1">
          $0.00
        </p>
      </div>

      <div>
        <label for="dash-abono-monto" class="block text-sm font-medium text-slate-300 mb-1">
          Monto
        </label>
        <input type="number" id="dash-abono-monto" step="0.01" min="0"
          class="w-full bg-slate-700 text-white border border-slate-600 rounded-xl px-4 py-3 focus:ring-blue-400 focus:border-blue-400">
      </div>

      <div>
        <label for="dash-abono-metodo" class="block text-sm font-medium text-slate-300 mb-1">
          Método de pago
        </label>
        <select id="dash-abono-metodo"
          class="w-full bg-slate-700 text-white border border-slate-600 rounded-xl px-4 py-3 focus:ring-blue-400 focus:border-blue-400">
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <div>
        <label for="dash-abono-referencia" class="block text-sm font-medium text-slate-300 mb-1">
          Referencia
        </label>
        <input type="text" id="dash-abono-referencia"
          placeholder="Opcional"
          class="w-full bg-slate-700 text-white border border-slate-600 rounded-xl px-4 py-3 focus:ring-blue-400 focus:border-blue-400">
      </div>

      <div>
        <label for="dash-abono-observaciones" class="block text-sm font-medium text-slate-300 mb-1">
          Observaciones
        </label>
        <textarea id="dash-abono-observaciones" rows="2"
          class="w-full bg-slate-700 text-white border border-slate-600 rounded-xl px-4 py-3 focus:ring-blue-400 focus:border-blue-400"></textarea>
      </div>

      <div class="flex gap-3 justify-end pt-2">
        <button id="btn-cancelar-abono-financiado-dashboard"
          class="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white">
          Cancelar
        </button>

        <button id="btn-guardar-abono-financiado-dashboard"
          class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
          Guardar abono
        </button>
      </div>

    </div>
  </div>
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
  <script src="js/tools-eventservice.js"></script>

</body>

</html>