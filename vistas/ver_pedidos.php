<?php include_once '../php/verificar_sesion.php'; ?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ver pedidos — Cafetería</title>
    <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../src/output.css">
    <link rel="stylesheet" href="../fonts/bootstrap-icons.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <style>
        .scrollbar-custom::-webkit-scrollbar {
            width: 8px
        }

        .scrollbar-custom::-webkit-scrollbar-track {
            background: #0f172a
        }

        .scrollbar-custom::-webkit-scrollbar-thumb {
            background: #334155;
            border-radius: 9999px
        }
    </style>
</head>

<body class="bg-slate-950 text-slate-100 min-h-screen">

    <header class="px-4 lg:px-8 py-5 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <i class="bi bi-receipt-cutoff text-2xl text-amber-400"></i>
            <h1 class="text-xl font-semibold">Ver pedidos</h1>
        </div>
        <div class="text-sm text-slate-400">Kiosko · Cafetería</div>
    </header>

    <main class="p-4 lg:p-8">
        <!-- Filtros -->
        <section class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 lg:p-6 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
                <!-- Modo -->
                <div class="col-span-1">
                    <label class="block text-xs uppercase tracking-wider text-slate-400 mb-1">Modo</label>
                    <select id="modo"
                        class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none">
                        <option value="dia">Por día</option>
                        <option value="mes">Por mes</option>
                    </select>
                </div>

                <!-- Día -->
                <div class="col-span-1" id="wrapDia">
                    <label class="block text-xs uppercase tracking-wider text-slate-400 mb-1">Día</label>
                    <input id="fechaDia" type="date"
                        class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none">
                </div>

                <!-- Mes -->
                <div class="col-span-1 hidden" id="wrapMes">
                    <label class="block text-xs uppercase tracking-wider text-slate-400 mb-1">Mes</label>
                    <input id="fechaMes" type="month"
                        class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none">
                </div>

                <!-- Código -->
                <div class="col-span-1">
                    <label class="block text-xs uppercase tracking-wider text-slate-400 mb-1">Código</label>
                    <input id="codigo" type="text" placeholder="Buscar por código..."
                        class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none" />
                </div>
                <div class="col-span-1">
                    <label class="block text-xs uppercase tracking-wider text-slate-400 mb-1">Estado</label>
                    <select id="estado"
                        class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none">
                        <option value="pendiente" selected>Pendiente</option>
                        <option value="en_preparacion">En preparación</option>
                        <option value="listo">Listo</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="pagado">Pagado</option>
                    </select>
                </div>
                <!-- Botones -->
                <div class="col-span-1 flex items-end gap-2">
                    <button id="btnBuscar"
                        class="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium rounded-xl px-4 py-2 transition">
                        <i class="bi bi-search mr-2"></i>Buscar
                    </button>
                    <button id="btnLimpiar"
                        class="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-4 py-2 transition">
                        <i class="bi bi-eraser"></i>
                    </button>
                </div>
            </div>
        </section>

        <!-- Resumen + Paginación -->
        <section class="mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div id="lblResumen" class="text-sm text-slate-400">0 pedidos</div>
            <div class="flex items-center gap-2">
                <button id="btnPrev"
                    class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40">
                    <i class="bi bi-chevron-left"></i>
                </button>
                <span id="lblPagina" class="text-sm text-slate-300">Página 1</span>
                <button id="btnNext"
                    class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40">
                    <i class="bi bi-chevron-right"></i>
                </button>
                <select id="pageSize" class="ml-2 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm">
                    <option>10</option>
                    <option selected>20</option>
                    <option>50</option>
                </select>
            </div>
        </section>

        <!-- Tabla -->
        <section class="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div class="overflow-auto scrollbar-custom max-h-[65vh]">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-900 sticky top-0 z-10">
                        <tr>
                            <th class="text-left px-4 py-3 border-b border-slate-800">#</th>
                            <th class="text-left px-4 py-3 border-b border-slate-800">Código</th>
                            <th class="text-left px-4 py-3 border-b border-slate-800">Origen</th>
                            <th class="text-left px-4 py-3 border-b border-slate-800">Estado</th>
                            <th class="text-right px-4 py-3 border-b border-slate-800">Subtotal</th>
                            <th class="text-right px-4 py-3 border-b border-slate-800">Desc.</th>
                            <th class="text-right px-4 py-3 border-b border-slate-800">Imp.</th>
                            <th class="text-right px-4 py-3 border-b border-slate-800">Propina</th>
                            <th class="text-right px-4 py-3 border-b border-slate-800">Total</th>
                            <th class="text-left px-4 py-3 border-b border-slate-800">Creado</th>
                            <th class="text-left px-4 py-3 border-b border-slate-800">Pagado</th>
                        </tr>
                    </thead>

                    <tbody id="tbody" class="divide-y divide-slate-800">
                        <!-- rows -->
                    </tbody>
                </table>
            </div>
            <div id="vacio" class="p-6 text-center text-slate-400 hidden">Sin resultados</div>
        </section>
    </main>

    <script src="../js/caf_lista.js"></script>
</body>

</html>