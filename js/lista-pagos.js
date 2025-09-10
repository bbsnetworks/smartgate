let offset = 0;
const limit = 20;

document.addEventListener("DOMContentLoaded", () => {
  cargarPagos(true);

  document.getElementById("selectMes").addEventListener("change", () => cargarPagos(true));
  document.getElementById("selectYear").addEventListener("change", () => cargarPagos(true));
  document.getElementById("filtroPagos").addEventListener("input", () => cargarPagos(true));
});

async function cargarPagos(reset = false) {
  if (reset) {
    offset = 0;
    document.getElementById("tablaPagos").innerHTML = "";
  }

  const mes = document.getElementById("selectMes").value;
  const year = document.getElementById("selectYear").value;
  const busqueda = document.getElementById("filtroPagos").value;

  const res = await fetch("../php/pagos_productos_controller.php?accion=obtener", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mes, year, busqueda, offset, limit }),
  });

  const data = await res.json();
  if (!data.success) {
    swalError.fire("Error", data.error || "No se pudo cargar la lista", "error");
    return;
  }

  const tbody = document.getElementById("tablaPagos");

  if (reset) window.listaPagos = [];

  data.pagos.forEach((venta, index) => {
    window.listaPagos.push(venta);

    const fila = document.createElement("tr");
    const productosHTML = venta.productos.map(p =>
      `<div><strong>${p.nombre}</strong> x${p.cantidad} - $${p.total}</div>`
    ).join("");

    fila.innerHTML = `
      <td class="px-4 py-2">${offset + index + 1}</td>
      <td class="px-4 py-2">${venta.venta_id}</td>
      <td class="px-4 py-2">${venta.fecha_pago}</td>
      <td class="px-4 py-2">${venta.usuario}</td>
      <td class="px-4 py-2">$${Number(venta.total).toFixed(2)}</td>
      <td class="px-4 py-2">${productosHTML}</td>
      <td class="px-4 py-2 text-center">
        <button onclick="eliminarPago('${venta.venta_id}')" class="text-red-700 hover:text-white border border-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600 dark:focus:ring-red-900">
          🗑️ Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(fila);
  });

  if (data.pagos.length === limit) {
    const btnVerMas = document.createElement("tr");
    btnVerMas.innerHTML = `<td colspan="7" class="text-center py-4"><button onclick="verMasPagos()" class="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded">Ver más</button></td>`;
    tbody.appendChild(btnVerMas);
  }
  if (reset) renderPaginacion(data.total);

  offset += limit;
}

function verMasPagos() {
  cargarPagos(false);
}
function renderPaginacion(totalRegistros) {
  const contenedor = document.getElementById("paginacionPagos");
  contenedor.innerHTML = "";

  const totalPaginas = Math.ceil(totalRegistros / limit);
  const paginaActual = Math.floor(offset / limit);

  if (totalPaginas <= 1) return;

  for (let i = 0; i < totalPaginas; i++) {
    const btn = document.createElement("button");
    btn.className = `px-3 py-1 rounded-lg text-sm font-medium ${
      i === paginaActual
        ? 'bg-blue-600 text-white'
        : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
    }`;
    btn.innerText = i + 1;
    btn.onclick = () => {
      offset = i * limit;
      cargarPagos(true);
    };
    contenedor.appendChild(btn);
  }
}

document.getElementById("filtroPagos").addEventListener("input", (e) => {
  filtrarPagos(e.target.value);
});
function filtrarPagos(texto) {
  const tbody = document.getElementById("tablaPagos");
  const filtro = texto.toLowerCase();
  tbody.innerHTML = "";

  let index = 1;

  window.listaPagos.forEach((venta) => {
    const contiene = 
      venta.venta_id.toLowerCase().includes(filtro) ||
      venta.fecha_pago.toLowerCase().includes(filtro) ||
      venta.usuario.toLowerCase().includes(filtro) ||
      venta.productos.some(p => p.nombre.toLowerCase().includes(filtro));

    if (contiene) {
      const productosHTML = venta.productos
        .map(p => {
          const nombreCorto = p.nombre.length > 30 ? p.nombre.slice(0, 30) + "..." : p.nombre;
          return `<div title="${p.nombre}"><strong>${nombreCorto}</strong> x${p.cantidad} - $${p.total}</div>`;
        })
        .join("");

      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td class="px-4 py-2">${index++}</td>
        <td class="px-4 py-2">${venta.venta_id}</td>
        <td class="px-4 py-2">${venta.fecha_pago}</td>
        <td class="px-4 py-2">${venta.usuario}</td>
        <td class="px-4 py-2">$${Number(venta.total).toFixed(2)}</td>
        <td class="px-4 py-2">${productosHTML}</td>
        <td class="px-4 py-2 text-center">
          <button onclick="eliminarPago('${venta.venta_id}')" class="text-red-700 hover:text-white border border-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600 dark:focus:ring-red-900">
            🗑️ Eliminar
          </button>
        </td>`;
      tbody.appendChild(fila);
    }
  });

  if (tbody.children.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500">No se encontraron resultados</td></tr>`;
  }
}

function eliminarPago(venta_id) {
  // Si es admin o root, no pedir código
  if (window.tipoUsuario === 'admin' || window.tipoUsuario === 'root') {
    confirmarEliminacion(venta_id);
    return;
  }

  // Si es otro tipo, pedir código
  swalInfo.fire({
    title: 'Código de administrador',
    text: 'Ingrese el código de 10 caracteres para autorizar esta acción',
    input: 'text',
    inputAttributes: {
      maxlength: 10,
      autocapitalize: 'off',
      autocorrect: 'off'
    },
    showCancelButton: true,
    confirmButtonText: 'Validar',
    cancelButtonText: 'Cancelar',
    preConfirm: (codigo) => {
      if (!codigo || codigo.length !== 10) {
        Swal.showValidationMessage('El código debe tener 10 caracteres');
        return false;
      }

      return fetch('../php/pagos_productos_controller.php?accion=validar_codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigo })
      })
        .then(res => res.json())
        .then(data => {
          if (!data.success) {
            throw new Error(data.error || 'Código no válido');
          }
        })
        .catch(error => {
          Swal.showValidationMessage(error.message);
        });
    }
  }).then((result) => {
    if (result.isConfirmed) {
      confirmarEliminacion(venta_id);
    }
  });
}

function confirmarEliminacion(venta_id) {
  swalInfo.fire({
    title: "¿Eliminar pago?",
    text: "Esta acción no se puede deshacer",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  }).then((confirmResult) => {
    if (confirmResult.isConfirmed) {
      fetch(`../php/pagos_productos_controller.php?accion=eliminar&venta_id=${venta_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            swalSuccess.fire("Eliminado", data.msg, "success").then(cargarPagos);
          } else {
            swalError.fire("Error", data.error || "No se pudo eliminar", "error");
          }
        })
        .catch(() => {
          swalError.fire("Error", "No se pudo conectar con el servidor", "error");
        });
    }
  });
}


