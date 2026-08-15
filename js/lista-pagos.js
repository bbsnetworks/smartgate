let offset = 0;
const limit = 20;

let controladorPeticion = null;
let temporizadorBusqueda = null;

document.addEventListener("DOMContentLoaded", () => {
  cargarPagos(0);

  document.getElementById("selectMes").addEventListener("change", () => {
    cargarPagos(0);
  });

  document.getElementById("selectYear").addEventListener("change", () => {
    cargarPagos(0);
  });

  document.getElementById("filtroPagos").addEventListener("input", () => {
    clearTimeout(temporizadorBusqueda);

    temporizadorBusqueda = setTimeout(() => {
      cargarPagos(0);
    }, 350);
  });
});

async function cargarPagos(nuevoOffset = 0) {
  offset = nuevoOffset;

  const mes = document.getElementById("selectMes").value;
  const year = document.getElementById("selectYear").value;
  const busqueda = document.getElementById("filtroPagos").value.trim();

  const tbody = document.getElementById("tablaPagos");
  const paginacion = document.getElementById("paginacionPagos");

  // Cancela la petición anterior si todavía no termina.
  if (controladorPeticion) {
    controladorPeticion.abort();
  }

  controladorPeticion = new AbortController();

  // No vaciamos la tabla para evitar el flash.
  tbody.classList.add("opacity-50", "pointer-events-none");
  paginacion.classList.add("pointer-events-none");

  try {
    const res = await fetch(
      "../php/pagos_productos_controller.php?accion=obtener",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mes,
          year,
          busqueda,
          offset,
          limit,
        }),
        signal: controladorPeticion.signal,
      }
    );

    if (!res.ok) {
      throw new Error("Error en la respuesta del servidor");
    }

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "No se pudo cargar la lista");
    }

    tbody.innerHTML = "";

    if (!data.pagos || data.pagos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-6 text-slate-400">
            No se encontraron pagos
          </td>
        </tr>
      `;
    } else {
      data.pagos.forEach((venta, index) => {
        const fila = document.createElement("tr");

        const productosHTML = venta.productos
          .map((producto) => {
            const nombre = producto.nombre || "";
            const nombreCorto =
              nombre.length > 30
                ? nombre.slice(0, 30) + "..."
                : nombre;

            return `
              <div title="${nombre}">
                <strong>${nombreCorto}</strong>
                x${producto.cantidad} - $${Number(producto.total).toFixed(2)}
              </div>
            `;
          })
          .join("");

        fila.innerHTML = `
          <td class="px-4 py-2">${offset + index + 1}</td>

          <td class="px-4 py-2">
            ${venta.venta_id}
          </td>

          <td class="px-4 py-2">
            ${venta.fecha_pago}
          </td>

          <td class="px-4 py-2">
            ${venta.usuario}
          </td>

          <td class="px-4 py-2">
            $${Number(venta.total).toFixed(2)}
          </td>

          <td class="px-4 py-2">
            ${productosHTML}
          </td>

          <td class="px-4 py-2 text-center">
            <button
              type="button"
              onclick="eliminarPago('${venta.venta_id}')"
              class="text-red-700 hover:text-white border border-red-700
                     hover:bg-red-800 focus:ring-4 focus:outline-none
                     focus:ring-red-300 font-medium rounded-lg text-sm
                     px-5 py-2.5 text-center me-2 mb-2
                     dark:border-red-500 dark:text-red-500
                     dark:hover:text-white dark:hover:bg-red-600
                     dark:focus:ring-red-900"
            >
              🗑️ Eliminar
            </button>
          </td>
        `;

        tbody.appendChild(fila);
      });
    }

    renderPaginacion(data.total);
  } catch (error) {
    if (error.name !== "AbortError") {
      swalError.fire(
        "Error",
        error.message || "No se pudo cargar la lista",
        "error"
      );
    }
  } finally {
    tbody.classList.remove("opacity-50", "pointer-events-none");
    paginacion.classList.remove("pointer-events-none");
  }
}

function renderPaginacion(totalRegistros) {
  const contenedor = document.getElementById("paginacionPagos");
  contenedor.innerHTML = "";

  const totalPaginas = Math.ceil(Number(totalRegistros) / limit);
  const paginaActual = Math.floor(offset / limit);

  if (totalPaginas <= 1) {
    return;
  }

  for (let i = 0; i < totalPaginas; i++) {
    const btn = document.createElement("button");

    btn.type = "button";
    btn.textContent = i + 1;

    btn.className = `
      px-3 py-1 rounded-lg text-sm font-medium transition-colors
      ${
        i === paginaActual
          ? "bg-blue-600 text-white"
          : "bg-slate-700 text-slate-200 hover:bg-slate-600"
      }
    `;

    btn.addEventListener("click", () => {
      cargarPagos(i * limit);
    });

    contenedor.appendChild(btn);
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


