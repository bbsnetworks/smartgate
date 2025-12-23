<?php include_once '../php/verificar_sesion.php'; ?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cafetería — Administrar Productos</title>
    <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../src/output.css">
    <link rel="stylesheet" href="../fonts/bootstrap-icons.css">
    <link rel="stylesheet" href="../css/scroll.css">
    <style>
        .icon-20 {
            font-size: 20px;
            line-height: 1;
        }

        .scrollbar-custom::-webkit-scrollbar {
            width: 8px
        }

        .scrollbar-custom::-webkit-scrollbar-track {
            background: #1e293b
        }

        .scrollbar-custom::-webkit-scrollbar-thumb {
            background-color: #FFB900;
            border-radius: 9999px
        }

        .thumb {
            width: 40px;
            height: 40px;
            border-radius: .5rem;
            object-fit: cover;
        }
    </style>
</head>

<body class="bg-slate-900 text-slate-200 min-h-screen bg-[url('../img/black-paper.png')] bg-fixed bg-auto">
    <nav class="bg-slate-900/70 border-b border-slate-800/60 px-4 md:px-8 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <img src="../img/logo.webp" class="h-8" alt="logo">
            <a href="../index.php" class="text-slate-300 hover:text-white flex items-center gap-2">
                <i class="bi bi-grid-3x3-gap"></i> Dashboard
            </a>
        </div>
        <a href="../php/logout.php" class="flex items-center gap-2 text-rose-300 hover:text-rose-200">
            <i class="bi bi-box-arrow-right"></i> Cerrar Sesión
        </a>
    </nav>

    <main class="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <header class="flex items-center justify-between mb-5">
            <h1 class="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <i class="bi bi-shop text-rose-400"></i>
                Administrar Productos (Cafetería)
            </h1>
            <a href="caf_pedido.php"
                class="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-700 hover:bg-slate-700/70">
                <i class="bi bi-cup-hot"></i> Ventana de pedidos
            </a>
        </header>

        <!-- Toolbar -->
        <section class="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="flex items-center gap-2">
                <div class="relative flex-1">
                    <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input id="q" type="text" placeholder="Buscar (nombre, descripción)…"
                        class="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 placeholder:text-slate-400 outline-none">
                </div>

                <label class="hidden md:flex items-center gap-2 text-sm ml-2">
                    <input id="filtroActivo" type="checkbox" class="accent-emerald-500" checked>
                    <span>Solo activos</span>
                </label>
            </div>

            <div class="flex items-center justify-end gap-2">
                <select id="filtroCategoria"
                    class="bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-sm min-w-[200px]">
                    <option value="">Todas las categorías</option>
                </select>

                <button id="btnNuevo"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow">
                    <i class="bi bi-plus-lg"></i> Agregar Producto
                </button>

                <button id="btnReporte"
                    class="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/70 hover:bg-slate-700/60">
                    <i class="bi bi-file-earmark-text"></i> Reporte
                </button>
            </div>
        </section>

        <!-- Tabla -->
        <section class="rounded-2xl border border-slate-700 bg-slate-800/70 shadow">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="text-left text-slate-300 bg-slate-900/50">
                        <tr>
                            <th class="px-4 py-3">ID</th>
                            <th class="px-4 py-3">Imagen</th>
                            <th class="px-4 py-3">Nombre</th>
                            <th class="px-4 py-3">Tamaños / Precios</th>
                            <th class="px-4 py-3">Categoría</th>
                            <th class="px-4 py-3">Orden</th>
                            <th class="px-4 py-3">Activo</th>
                            <th class="px-4 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tbodyProd" class="divide-y divide-slate-700/60">
                        <!-- rows -->
                    </tbody>
                </table>
            </div>

            <!-- Footer tabla -->
            <div class="flex items-center justify-between px-4 py-3 bg-slate-900/40 border-t border-slate-700/60">
                <div id="lblResumen" class="text-sm text-slate-400">—</div>
                <div class="flex items-center gap-2">
                    <button id="btnPrev"
                        class="px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 disabled:opacity-40" disabled>
                        <i class="bi bi-chevron-left"></i>
                    </button>
                    <span id="lblPagina" class="min-w-24 text-center text-sm">—</span>
                    <button id="btnNext"
                        class="px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 disabled:opacity-40" disabled>
                        <i class="bi bi-chevron-right"></i>
                    </button>
                </div>
            </div>
        </section>
    </main>

    <!-- Modal -->
    <div id="modal" class="fixed inset-0 z-50 hidden">
        <div class="absolute inset-0 bg-black/60"></div>
        <div class="relative mx-auto mt-10 w-[95%] max-w-2xl">
            <div class="rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
                <div class="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                    <h3 id="modalTitle" class="font-semibold text-slate-200">Nuevo producto</h3>
                    <button id="btnClose" class="p-2 rounded-lg hover:bg-slate-700/60">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>

                <form id="formProd" class="px-5 py-4 space-y-4">
                    <input type="hidden" id="prod_id">

                    <!-- Nombre / Categoría -->
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm text-slate-300">Nombre</label>
                            <input id="nombre" type="text" required
                                class="mt-1 w-full bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2 outline-none">
                        </div>

                        <div>
                            <label class="text-sm text-slate-300">Categoría</label>
                            <select id="categoria_id"
                                class="mt-1 w-full bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2 outline-none">
                                <!-- options JS -->
                            </select>
                        </div>
                    </div>

                    <!-- Orden -->
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm text-slate-300">Orden</label>
                            <input id="orden" type="number" min="0" value="0"
                                class="mt-1 w-full bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2 outline-none">
                        </div>
                    </div>

                    <!-- Descripción -->
                    <div>
                        <label class="text-sm text-slate-300">Descripción (ingredientes)</label>
                        <textarea id="descripcion" rows="3"
                            class="mt-1 w-full bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2 outline-none"
                            placeholder="Leche, café, azúcar, crema batida…"></textarea>
                    </div>

                    <!-- Tamaños y precios -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <label class="text-sm text-slate-300">Tamaños y precios (opcional)</label>
                            <button type="button" id="btnAddSize"
                                class="px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-sm">
                                <i class="bi bi-plus-lg"></i> Agregar tamaño
                            </button>
                        </div>

                        <div id="sizesWrap" class="space-y-2"></div>

                        <small class="text-slate-400 text-xs block mt-1">
                            Si defines tamaños, se usará el precio por tamaño en la venta.
                        </small>
                    </div>

                    <!-- Imagen + Activo -->
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm text-slate-300">URL de imagen (opcional)</label>
                            <input id="imagen_url" type="text"
                                class="mt-1 w-full bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2 outline-none"
                                placeholder="uploads/cafeteria/latte.jpg">

                            <div class="mt-2 flex items-center gap-3">
                                <label
                                    class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/30 hover:bg-slate-800/50 cursor-pointer">
                                    <i class="bi bi-upload"></i> <span>Subir imagen…</span>
                                    <input id="imagen_file" type="file" accept="image/*" class="hidden">
                                </label>
                                <img id="imgPreview" src="" alt=""
                                    class="thumb border border-slate-700 bg-slate-900/20 hidden">
                            </div>
                            <small class="text-slate-400 text-xs block mt-1">Formatos: JPG/PNG/WEBP (máx. 5 MB).</small>
                        </div>

                        <label class="flex items-center gap-2 mt-6">
                            <input id="activo" type="checkbox" class="accent-emerald-500" checked>
                            <span>Activo</span>
                        </label>
                    </div>

                    <!-- Botones -->
                    <div class="pt-3 flex items-center justify-end gap-2 border-t border-slate-700">
                        <button type="button" id="btnCancelar"
                            class="px-4 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700">Cancelar</button>
                        <button type="submit"
                            class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">Guardar</button>
                    </div>
                </form>


            </div>
        </div>
    </div>

    <script src="../js/sweetalert2@11.js"></script>
    <script src="../js/swalConfig.js"></script>
    <script src="../js/caf_productos.js"></script>
</body>

</html>