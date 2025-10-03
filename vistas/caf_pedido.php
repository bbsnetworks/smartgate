<?php include_once '../php/verificar_sesion.php'; ?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Cafetería - Nuevo Pedido</title>

  <!-- Tailwind compilado -->
  <link rel="stylesheet" href="../src/output.css">
  <!-- Bootstrap Icons local -->
  <link rel="stylesheet" href="../fonts/bootstrap-icons.css">
  <link rel="stylesheet" href="../css/scroll.css">

  <style>
    .icon-20 { font-size: 20px; line-height: 1; }
    .scrollbar-custom::-webkit-scrollbar{width:8px;}
    .scrollbar-custom::-webkit-scrollbar-track{background:#1e293b;}
    .scrollbar-custom::-webkit-scrollbar-thumb{background-color:#FFB900;border-radius:9999px;}
    /* Panel deslizante centro/detalle */
    .slide-wrap { position: relative; overflow: hidden; }
    .slide-inner { display: flex; width: 200%; transition: transform .35s ease; }
    .slide-page { width: 50%; }
    .show-detail .slide-inner { transform: translateX(-50%); }
  </style>
</head>

<body class="bg-slate-900 min-h-screen text-slate-200 bg-[url('../img/black-paper.png')] bg-fixed bg-auto">
  <div class="max-w-[1400px] mx-auto px-3 md:px-6 py-4">

    <!-- Header -->
    <header class="flex items-center justify-between gap-4 mb-4">
      <div class="flex items-center gap-3">
        <img src="../img/logo.webp" class="h-10 w-10 rounded-full" alt="logo">
        <h1 class="text-xl font-semibold">Cafetería — Nuevo Pedido</h1>
      </div>

      <div class="flex items-center gap-2">
        <!-- person_code -->
        <div class="flex items-center bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2">
          <i class="bi bi-qr-code-scan mr-2 text-emerald-400"></i>
          <input id="personCode" type="text" placeholder="personCode"
                 class="bg-transparent outline-none text-slate-100 placeholder:text-slate-400 w-48">
        </div>

        <!-- botón carrito con badge -->
        <button id="btnOpenCart"
          class="relative flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white">
          <i class="bi bi-bag icon-20"></i>
          <span>Carrito</span>
          <span id="cartBadge"
                class="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">0</span>
        </button>

        <a href="../index.php"
           class="px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-700 hover:bg-slate-700/70">
          <i class="bi bi-arrow-left"></i> <span class="ml-1">Volver</span>
        </a>
      </div>
    </header>

    <!-- Layout: Izquierda (acordeón) | Centro (lista/detalle deslizante) | Derecha (carrito) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">

      <!-- IZQUIERDA: Categorías (acordeón) -->
      <aside class="lg:col-span-3 rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
        <h2 class="font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <i class="bi bi-list-ul text-indigo-400"></i> Categorías
        </h2>

        <div id="accordionCats" class="space-y-3 max-h-[70vh] overflow-auto pr-1 scrollbar-custom">
          <!-- Se llena por JS -->
        </div>
      </aside>

      <!-- CENTRO: Productos (lista) / Detalle (slide) -->
      <section id="centerPanel" class="lg:col-span-6 rounded-2xl border border-slate-700 bg-slate-800/50 p-4 slide-wrap">
        <div id="slideContainer" class="slide-inner">
          <!-- Página 1: grilla de productos de la categoría seleccionada -->
          <div id="pageProductos" class="slide-page">
            <div class="flex items-center justify-between mb-3">
              <h2 id="catTitle" class="font-semibold text-slate-300">Selecciona una categoría</h2>
              <div id="catCount" class="text-slate-400 text-sm">—</div>
            </div>

            <div id="gridProductos"
                 class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 max-h-[70vh] overflow-auto pr-1 scrollbar-custom">
              <!-- Cards producto (JS) -->
            </div>
          </div>

          <!-- Página 2: detalle de producto -->
          <div id="pageDetalle" class="slide-page">
            <button id="btnBack"
              class="mb-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700">
              <i class="bi bi-arrow-left"></i><span>Volver</span>
            </button>

            <div class="rounded-xl border border-slate-700 bg-slate-900/30 p-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h3 id="detNombre" class="text-lg font-semibold text-slate-100">—</h3>
                  <p id="detDesc" class="text-slate-400 text-sm mt-1">—</p>
                </div>
                <div id="detPrecio"
                     class="text-2xl font-extrabold text-emerald-400 whitespace-nowrap">$0.00</div>
              </div>

              <!-- Tamaños (opcional) -->
              <div id="wrapTamanos" class="mt-4 hidden">
                <p class="text-slate-300 font-medium mb-2">Tamaño</p>
                <div id="optsTamanos" class="flex flex-wrap gap-2">
                  <!-- Radios tamaño (JS) -->
                </div>
              </div>

              <!-- Ingredientes (lista informativa) -->
              <div id="wrapIngr" class="mt-4">
                <p class="text-slate-300 font-medium mb-2">Ingredientes</p>
                <ul id="listIngr" class="list-disc pl-6 text-slate-300 text-sm space-y-1">
                  <!-- JS -->
                </ul>
              </div>

              <!-- Cantidad -->
              <div class="mt-4 flex items-center gap-3">
                <p class="text-slate-300 font-medium">Cantidad</p>
                <div class="flex items-center bg-slate-800/70 border border-slate-700 rounded-lg">
                  <button id="qtyMinus" class="px-3 py-2 hover:bg-slate-700/70"><i class="bi bi-dash-lg"></i></button>
                  <input id="qty" type="number" min="1" value="1"
                         class="w-16 text-center bg-transparent outline-none py-2">
                  <button id="qtyPlus" class="px-3 py-2 hover:bg-slate-700/70"><i class="bi bi-plus-lg"></i></button>
                </div>
              </div>

              <!-- Nota -->
              <div class="mt-4">
                <label class="text-slate-300 font-medium">Nota</label>
                <textarea id="nota" rows="3"
                          placeholder="Sin azúcar, sin crema, etc."
                          class="mt-2 w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 outline-none"></textarea>
              </div>

              <!-- Acciones -->
              <div class="mt-5 flex items-center justify-between">
                <div class="text-sm text-slate-400">
                  <span>Precio unitario: </span><b id="detPU" class="text-slate-200">$0.00</b>
                </div>
                <button id="btnAddToCart"
                        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white">
                  <i class="bi bi-bag-plus"></i> <span>Agregar al carrito</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- DERECHA: Carrito -->
      <aside class="lg:col-span-3 rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-slate-300 flex items-center gap-2">
            <i class="bi bi-bag text-rose-400"></i> Carrito
          </h2>
          <button id="btnClearCart"
                  class="text-sm px-3 py-1.5 rounded-md bg-slate-700/60 hover:bg-slate-700">Vaciar</button>
        </div>

        <ul id="cartList" class="space-y-3 max-h-[50vh] overflow-auto pr-1 scrollbar-custom">
          <!-- items -->
        </ul>

        <div class="mt-4 border-t border-slate-700 pt-3">
          <div class="flex items-center justify-between mb-1 text-sm"><span>Subtotal</span><b id="sumSubtotal">$0.00</b></div>
          <div class="flex items-center justify-between mb-1 text-sm"><span>Descuento</span><b id="sumDescuento">$0.00</b></div>
          <div class="flex items-center justify-between mb-1 text-sm"><span>Impuestos</span><b id="sumImpuestos">$0.00</b></div>
          <div class="flex items-center justify-between text-lg font-bold text-emerald-400">
            <span>Total</span><span id="sumTotal">$0.00</span>
          </div>
          <button id="btnCrearPedido"
                  class="w-full mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
            Generar pedido
          </button>
        </div>
      </aside>
    </div>
  </div>

  <!-- Scripts -->
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/swalConfig.js"></script>
  <script src="../js/caf_pedido.js"></script>
</body>
</html>
