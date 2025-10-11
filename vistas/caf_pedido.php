<?php include_once '../php/verificar_sesion.php'; ?>
<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kiosko — Cafetería</title>

  <!-- Tailwind compilado -->
  <link rel="stylesheet" href="../src/output.css">
  <link rel="stylesheet" href="../fonts/bootstrap-icons.css">
  <link rel="stylesheet" href="../css/scroll.css">

  <style>
    /* ===== Layout general ===== */
    html, body { height:100%; overflow:hidden; }

    /* Contenedor principal en columnas: header arriba, wizard ocupa el resto */
    .page { display:flex; flex-direction:column; min-height:100dvh; }

    /* ===== Slider nativo ===== */
    #wizard { position:relative; flex:1 1 auto; min-height:0; overflow:hidden; }
    #wizardTrack{
      display:flex; height:100%;
      overflow-x:auto; overflow-y:hidden;
      scroll-snap-type:x mandatory;
      scroll-behavior:smooth;
      -webkit-overflow-scrolling:touch;
    }
    /* ocultar la barra horizontal (opcional) */
    #wizardTrack::-webkit-scrollbar{ display:none; }

    .step{
      flex:0 0 100%;
      height:100%;
      scroll-snap-align:start;
      display:flex; flex-direction:column; min-height:0;
    }

    /* Área que SÍ scrollea vertical dentro de cada paso */
    .slide-body{
      flex:1; min-height:0;
      overflow-y:auto; min-width:0;
      -webkit-overflow-scrolling:touch;
      overscroll-behavior:contain;
    }

    /* ===== Scrollbars dark ===== */
    .scrollbar-custom{ scrollbar-width:thin; scrollbar-color:#64748b rgba(2,6,23,.6); }
    .scrollbar-custom::-webkit-scrollbar{ width:10px; height:10px; }
    .scrollbar-custom::-webkit-scrollbar-track{ background:rgba(2,6,23,.6); border-radius:9999px; }
    .scrollbar-custom::-webkit-scrollbar-thumb{
      background:linear-gradient(180deg,#94a3b8,#475569);
      border-radius:9999px; border:2px solid rgba(15,23,42,.7);
    }
    .scrollbar-custom::-webkit-scrollbar-thumb:hover{ background:#64748b; }

    /* Límites internos */
    #gridProductos { min-height:220px; overflow:auto; }
    #listIngr      { max-height:30vh; overflow:auto; }
    #nota          { resize:none; }
    #cartList      { max-height:45vh; overflow:auto; }

    /* Avatar fallback */
    #pcAvatar { background-color: rgba(15,23,42,.6); }
    /* Layout base */
.page{ min-height:100dvh; display:flex; flex-direction:column; }

#wizard{ flex:1 1 auto; min-height:0; overflow:hidden; }

/* Pista horizontal */
#wizardTrack{
  height:100%;
  display:flex;
  overflow-x:auto; overflow-y:hidden;
  scroll-snap-type:x mandatory;
  scroll-behavior:smooth;
  -webkit-overflow-scrolling:touch;
}

/* Cada paso */
.step{
  flex:0 0 100%;
  height:100%;
  scroll-snap-align:start;
  display:flex; flex-direction:column;
  min-height:0;          /* << CLAVE */
}

/* Asegura que los hijos del paso puedan encoger */
.step > *{ min-height:0; }

/* El área que sí scrollea */
.slide-body{
  flex:1 1 auto;
  min-height:0;          /* << CLAVE */
  overflow-y:auto;
  -webkit-overflow-scrolling:touch;
  overscroll-behavior:contain;
  touch-action: pan-y;   /* evita que el swipe horizontal robe el gesto vertical */
}

  </style>
</head>

<body class="bg-slate-900 text-slate-200 bg-[url('../img/black-paper.png')] bg-auto">
  <div class="page max-w-[1600px] mx-auto px-4 py-6">

    <!-- Header -->
    <header class="mb-6">
      <div class="flex items-center justify-center">
        <img src="../img/logo.webp" class="h-14 w-14 rounded-full shadow" alt="logo">
      </div>

      <!-- Encabezado de persona -->
      <div id="pcHeader" class="mt-4 flex items-center justify-center gap-4">
        <img id="pcAvatar" class="h-16 w-16 rounded-full object-cover ring-2 ring-slate-700/60 hidden" alt="avatar">
        <div class="text-center">
          <div id="pcName" class="text-xl font-semibold text-slate-100 hidden">—</div>
          <div id="pcCode" class="text-slate-300 text-sm hidden">—</div>
        </div>
        <button id="btnChangePC" type="button"
          class="ml-2 px-3 py-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-sm">
          Cambiar
        </button>
        <input id="personCode" type="hidden">
      </div>
    </header>

    <!-- ===== Wizard (4 pasos) ===== -->
    <div id="wizard">
      <div id="wizardTrack">
        <!-- PASO 1 -->
        <section id="step-person" class="step">
          <div class="w-full max-w-4xl mx-auto">
            <header class="text-center mb-6">
              <h2 class="text-3xl font-semibold">Bienvenido</h2>
              <p class="text-slate-400 mt-1">Ingresa tu <b>personCode</b> para continuar</p>
            </header>

            <div class="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 slide-body scrollbar-custom">
              <div class="flex flex-col md:flex-row gap-6 h-full">
                <!-- Input grande -->
                <div class="flex-1">
                  <label class="text-slate-300 mb-2 block">personCode</label>
                  <input id="pcInput" type="text" inputmode="text" autocomplete="off"
                    class="w-full text-3xl tracking-widest font-mono bg-slate-900 border border-slate-700 rounded-xl px-4 py-5 outline-none"
                    placeholder="Ej. P000123">
                  <div class="text-sm text-slate-400 mt-2">Puedes escribir con el teclado o usar el panel táctil.</div>

                  <!-- Teclado táctil simple -->
                  <div class="mt-5 grid grid-cols-3 gap-3">
                    <button type="button" class="kkey bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-2xl py-4 rounded-xl">1</button>
                    <button type="button" class="kkey bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-2xl py-4 rounded-xl">2</button>
                    <button type="button" class="kkey bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-2xl py-4 rounded-xl">3</button>
                    <button type="button" class="kkey bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-2xl py-4 rounded-xl">4</button>
                    <button type="button" class="kkey bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-2xl py-4 rounded-xl">5</button>
                    <button type="button" class="kkey bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-2xl py-4 rounded-xl">6</button>
                    <button type="button" class="kkey bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-2xl py-4 rounded-xl">7</button>
                    <button type="button" class="kkey bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-2xl py-4 rounded-xl">8</button>
                    <button type="button" class="kkey bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-2xl py-4 rounded-xl">9</button>
                    <button type="button" class="kkey bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-2xl py-4 rounded-xl col-span-2">0</button>
                    <button id="kBack" type="button" class="bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-2xl py-4 rounded-xl">←</button>
                  </div>
                </div>

                <!-- Acciones -->
                <div class="w-full md:w-60 flex flex-col">
                  <button id="btnValidarPC" type="button"
                    class="w-full py-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-semibold">
                    Validar y continuar
                  </button>
                  <button id="btnLimpiarPC" type="button"
                    class="w-full mt-3 py-5 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-lg">
                    Limpiar
                  </button>
                </div>
              </div>
            </div>

            <p class="text-center text-slate-500 mt-4 text-sm">Kiosko táctil — Smartgate Cafetería</p>
          </div>
        </section>

        <!-- PASO 2: Categorías + Productos -->
        <section id="step-cats" class="step">
          <div class="w-full max-w-6xl mx-auto flex flex-col min-h-0">
            <div class="rounded-2xl border border-slate-700 bg-slate-800/60 p-5 slide-body scrollbar-custom max-h-[650px]">
              <h2 class="font-semibold text-slate-200 text-lg flex items-center gap-2 mb-4">
                <i class="bi bi-list-ul text-indigo-400"></i> Categorías
              </h2>

              <div id="accordionCats" class="space-y-3 mb-5"></div>

              <div class="flex items-center justify-between mb-3">
                <h3 id="catTitle" class="font-semibold text-slate-200 text-lg">Selecciona una categoría</h3>
                <div id="catCount" class="text-slate-400 text-sm">—</div>
              </div>

              <div id="gridProductos" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pr-1 scrollbar-custom">
              </div>
            </div>
          </div>
        </section>

        <!-- PASO 3: Detalle -->
        <section id="step-detail" class="step">
          <div class="w-full max-w-5xl mx-auto flex flex-col min-h-0">
            <button id="btnBack" type="button"
              class="mb-4 inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-base">
              <i class="bi bi-arrow-left"></i><span>Volver</span>
            </button>

            <div class="rounded-2xl border border-slate-700 bg-slate-900/40 p-5 slide-body scrollbar-custom h-[550px]">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h3 id="detNombre" class="text-2xl font-semibold text-slate-100">—</h3>
                  <p id="detDesc" class="text-slate-400 mt-1">—</p>
                </div>
                <div id="detPrecio" class="text-3xl font-extrabold text-emerald-400 whitespace-nowrap">$0.00</div>
              </div>

              <div id="wrapTamanos" class="mt-5 hidden">
                <p class="text-slate-300 font-medium mb-2">Tamaño</p>
                <div id="optsTamanos" class="flex flex-wrap gap-3"></div>
              </div>

              <div id="wrapIngr" class="mt-5">
                <p class="text-slate-300 font-medium mb-2">Ingredientes</p>
                <ul id="listIngr" class="list-disc pl-6 text-slate-300 space-y-3 pr-1 scrollbar-custom"></ul>
              </div>

              <div class="mt-5 flex items-center gap-3">
                <p class="text-slate-300 font-medium text-lg">Cantidad</p>
                <div class="flex items-center bg-slate-800/70 border border-slate-700 rounded-xl">
                  <button id="qtyMinus" type="button" class="px-5 py-3 text-xl hover:bg-slate-700/70"><i class="bi bi-dash-lg"></i></button>
                  <input id="qty" type="number" min="1" value="1" class="w-20 text-center bg-transparent outline-none py-3 text-2xl">
                  <button id="qtyPlus" type="button" class="px-5 py-3 text-xl hover:bg-slate-700/70"><i class="bi bi-plus-lg"></i></button>
                </div>
              </div>

              <div class="mt-5">
                <label class="text-slate-300 font-medium">Nota</label>
                <textarea id="nota" rows="3" placeholder="Sin azúcar, sin crema, etc."
                  class="mt-2 w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 outline-none"></textarea>
              </div>

              <div class="mt-6 flex items-center justify-between">
                <div class="text-base text-slate-400">
                  <span>Precio unitario: </span><b id="detPU" class="text-slate-200">$0.00</b>
                </div>
                <button id="btnAddToCart" type="button"
                  class="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-lg">
                  <i class="bi bi-bag-plus"></i> <span>Agregar al carrito</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- PASO 4: Carrito -->
        <section id="step-cart" class="step">
          <div class="w-full max-w-5xl mx-auto flex-1 flex flex-col min-h-0">
            <div class="rounded-2xl border border-slate-700 bg-slate-800/60 p-5 slide-body scrollbar-custom">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold text-slate-200 text-lg flex items-center gap-2">
                  <i class="bi bi-bag"></i> Tu carrito
                </h3>
                <button id="btnClearCart" type="button"
                  class="px-3 py-2 rounded-lg bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-sm">
                  Vaciar
                </button>
              </div>

              <ul id="cartList" class="space-y-3 max-h-72 overflow-auto pr-1 scrollbar-custom"></ul>

              <div class="mt-4 border-t border-slate-700 pt-4 space-y-1 text-sm">
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Subtotal</span>
                  <b id="sumSubtotal" class="text-slate-100">$0.00</b>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Descuento</span>
                  <b id="sumDescuento" class="text-slate-100">$0.00</b>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Impuestos</span>
                  <b id="sumImpuestos" class="text-slate-100">$0.00</b>
                </div>
                <div class="flex items-center justify-between text-lg">
                  <span class="text-slate-300">Total</span>
                  <b id="sumTotal" class="text-emerald-400">$0.00</b>
                </div>
              </div>

              <div class="mt-5 flex items-center justify-between gap-3">
                <button id="btnSeguirPedido" type="button"
                  class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-lg">
                  <i class="bi bi-arrow-left"></i> <span>Seguir comprando</span>
                </button>

                <button id="btnCrearPedido" type="button"
                  class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg">
                  <i class="bi bi-check2-circle"></i> <span>Crear pedido</span>
                </button>
              </div>
            </div>
          </div>
        </section>

      </div> <!-- /wizardTrack -->
    </div> <!-- /wizard -->

    <!-- FAB Carrito -->
    <button id="fabCart" type="button"
      class="fixed bottom-5 right-5 z-[80] px-5 py-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg flex items-center gap-2">
      <i class="bi bi-bag"></i>
      <span class="hidden sm:inline">Carrito</span>
      <span id="cartBadge" class="ml-1 bg-amber-400 text-black text-xs font-extrabold px-2 py-0.5 rounded-full">0</span>
    </button>
  </div>

  <!-- Scripts -->
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/swalConfig.js"></script>
  <script src="../js/caf_pedido.js"></script>
</body>
</html>
