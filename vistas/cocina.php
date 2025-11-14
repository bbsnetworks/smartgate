<?php include_once '../php/verificar_sesion.php'; ?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cocina — Pedidos</title>
  <link rel="stylesheet" href="../src/output.css">
  <!-- Lucide (iconos) -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <style>
    html, body { height:100%; }
    .custom-scroll::-webkit-scrollbar{ width:8px }
    .custom-scroll::-webkit-scrollbar-thumb{ background:#334155; border-radius:9999px }
    .skeleton{ position:relative; overflow:hidden }
    .skeleton::after{
      content:'';
      position:absolute; inset:0;
      background:linear-gradient(90deg, transparent, rgba(255,255,255,.06), transparent);
      transform:translateX(-100%);
      animation:shimmer 1.2s infinite;
    }
    .note-strong{
  color:#fb7185; /* rose-400 */
  font-weight:700;
}
.note-pill{
  display:inline-flex; align-items:center; gap:6px;
  padding:6px 10px; border-radius:12px;
  background:rgba(251,113,133,.12); /* rose-400/12 */
  border:1px solid rgba(251,113,133,.35);
}

    @keyframes shimmer{ 100%{ transform:translateX(100%);} }
  </style>
</head>
<body class="bg-slate-900 text-slate-100">

<!-- Header -->
<header class="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur">
  <div class="flex items-center gap-2">
    <i data-lucide="chef-hat" class="w-6 h-6 text-yellow-400"></i>
    <h1 class="text-xl font-semibold">Cocina · Pedidos</h1>
  </div>
  <div class="flex items-center gap-4 text-sm">
    <div id="clock" class="opacity-70"></div>
  </div>
</header>

<!-- Layout 1/4 : 3/4 -->
<main class="p-4 grid grid-cols-12 gap-4 h-[calc(100vh-64px)]">
  <!-- Col izquierda (1/4) -->
  <section class="col-span-12 md:col-span-3 bg-slate-800/50 border border-slate-700 rounded-2xl p-3 flex flex-col">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <i data-lucide="list" class="w-4 h-4"></i>
        <h2 class="font-semibold">Pendientes</h2>
      </div>
      <span class="text-xs opacity-70">Auto: 5s</span>
    </div>

    <div class="mt-2 flex items-center justify-between text-xs text-slate-400">
      <div id="badgeCount" class="px-2 py-0.5 rounded-full bg-slate-700">0 en cola</div>
      <div class="hidden md:block">Más atrasados primero</div>
    </div>

    <div id="listPendientes" class="mt-3 space-y-2 overflow-auto custom-scroll grow"></div>
  </section>

  <!-- Col derecha (3/4) -->
  <section class="col-span-12 md:col-span-9 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex flex-col">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <i data-lucide="receipt" class="w-4 h-4"></i>
        <h2 class="font-semibold">Detalle del pedido</h2>
      </div>
      <div id="estadoBadge" class="text-xs px-2 py-1 rounded-full bg-slate-700 flex items-center gap-1">
        <i data-lucide="minus" class="w-3.5 h-3.5"></i> Ninguno
      </div>
    </div>

    <div id="detalleWrap" class="grow overflow-auto custom-scroll mt-3">
      <div class="text-slate-400 text-sm">Selecciona un pedido pendiente en la izquierda…</div>
    </div>

    <div class="mt-4 flex items-center justify-end gap-2">
      <button id="btnCancelar" class="hidden px-4 py-2 rounded-xl border border-red-500/60 text-red-200 hover:bg-red-500/10 flex items-center gap-2">
        <i data-lucide="octagon-x" class="w-4 h-4"></i> Cancelar
      </button>
      <button id="btnIniciar" class="hidden px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2">
        <i data-lucide="play-circle" class="w-4 h-4"></i> Iniciar
      </button>
      <button id="btnListo" class="hidden px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2">
        <i data-lucide="check-circle-2" class="w-4 h-4"></i> Terminar
      </button>
    </div>
  </section>
</main>

<script>
</script>
<script src="../js/cocina.js"></script>
<script src="../js/lucide.min.js"></script>
</body>
</html>
