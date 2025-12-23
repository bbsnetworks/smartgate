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
    <title>Lista de Clientes</title>
    <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../src/output.css">
    <script src="../js/sweetalert2@11.js"></script>
    <script src="../js/lucide.min.js"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen p-6 bg-[url('../img/black-paper.png')]">
    <?php include_once '../includes/navbar.php'; ?>

    <h1 class="text-3xl mt-4 font-bold mb-6 text-center">Administrar Clientes</h1>

    <div class="overflow-x-auto">
        <table class="min-w-full text-center bg-slate-800 shadow-md rounded-xl overflow-hidden">
            <thead class="bg-slate-700 text-slate-300">
                <tr>
                    <th class="p-3">Foto</th>
                    <th class="p-3">Código</th>
                    <th class="p-3">Nombre</th>
                    <th class="p-3">Apellido</th>
                    <th class="p-3">Acciones</th>
                </tr>
            </thead>
            <tbody id="clientes-body">
                <!-- Registros se cargan con JS -->
            </tbody>
        </table>

        <div id="paginacion-clientes" class="flex flex-wrap justify-center mt-6 gap-2"></div>

    </div>

    <script>
    const usuarioRol = "<?= $_SESSION['usuario']['rol'] ?>";
    </script>
    <script src="../js/swalConfig.js"></script>
    <script src="../js/lista.js"></script>
    <!-- <script>
        let paginaActual = 1;
const limite = 20;
let totalPaginas = 1;
let filtro = "";

async function cargarClientes(pagina = 1) {
  paginaActual = pagina;

  const params = new URLSearchParams({
    page: pagina,
    ...(filtro && { q: filtro })
  });

  const res = await fetch(`../php/obtener_clientes.php?${params}`);
  const clientes = await res.json();
  renderizarFilas(clientes);
  renderPaginacion();
}

async function obtenerTotalPaginas() {
  const params = new URLSearchParams({ ...(filtro && { q: filtro }) });
  const res = await fetch(`../php/total_clientes.php?${params}`);
  const data = await res.json();
  totalPaginas = Math.ceil(data.total / limite);
}

function renderPaginacion() {
  const paginacion = document.getElementById("paginacion-clientes");
  paginacion.innerHTML = "";

  const crearBoton = (text, disabled, onClick) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.disabled = disabled;
    btn.className = `px-3 py-1 rounded ${
      disabled
        ? "bg-slate-600 text-slate-400 cursor-not-allowed"
        : "bg-slate-700 text-slate-200 hover:bg-slate-600"
    }`;
    btn.addEventListener("click", onClick);
    return btn;
  };

  paginacion.appendChild(crearBoton("⟨ Anterior", paginaActual === 1, () => cargarClientes(paginaActual - 1)));

  const inicio = Math.max(1, paginaActual - 2);
  const fin = Math.min(totalPaginas, paginaActual + 2);

  for (let i = inicio; i <= fin; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = `px-3 py-1 rounded ${
      i === paginaActual ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
    }`;
    btn.addEventListener("click", () => cargarClientes(i));
    paginacion.appendChild(btn);
  }

  paginacion.appendChild(crearBoton("Siguiente ⟩", paginaActual === totalPaginas, () => cargarClientes(paginaActual + 1)));
}

async function actualizarClientes() {
  await obtenerTotalPaginas();
  cargarClientes(1);
}

document.addEventListener("DOMContentLoaded", async () => {
  const input = document.createElement("input");
  input.placeholder = "🔍 Buscar cliente por código, nombre, apellido o grupo...";
  input.className = "w-full max-w-xl mb-4 px-4 py-2 text-stone-50 bg-transparent border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 mx-auto block";
  input.id = "busqueda-clientes";

  const tabla = document.querySelector("table");
  tabla.parentElement.insertBefore(input, tabla);

  input.addEventListener("input", async () => {
    filtro = input.value.trim();
    await actualizarClientes();
  });

  await actualizarClientes();
});

    </script> -->
</body>
</html>

