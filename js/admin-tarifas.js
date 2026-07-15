const TARIFAS_API = "../php/tarifas_controller.php";

let paginaTarifas = 1;
const limiteTarifas = 10;
let busquedaTarifaActual = "";
let filtroEstadoTarifaActual = "";

document.addEventListener("DOMContentLoaded", () => {
  const inputBusqueda = document.getElementById("busquedaTarifa");
  const filtroEstado = document.getElementById("filtroEstadoTarifa");

  if (inputBusqueda) {
    inputBusqueda.addEventListener("input", debounce(() => {
      busquedaTarifaActual = inputBusqueda.value.trim();
      paginaTarifas = 1;
      cargarTarifas();
    }, 350));
  }

  if (filtroEstado) {
    filtroEstado.addEventListener("change", () => {
      filtroEstadoTarifaActual = filtroEstado.value;
      paginaTarifas = 1;
      cargarTarifas();
    });
  }

  cargarTarifas();
});

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function cargarTarifas() {
  const tbody = document.getElementById("tabla-tarifas");
  const paginacion = document.getElementById("paginacion-tarifas");

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="p-4 text-center text-slate-400">
        Cargando tarifas...
      </td>
    </tr>
  `;

  try {
    const params = new URLSearchParams({
      accion: "listar",
      pagina: paginaTarifas,
      limite: limiteTarifas,
      busqueda: busquedaTarifaActual,
      activo: filtroEstadoTarifaActual
    });

    const res = await fetch(`${TARIFAS_API}?${params.toString()}`);
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "No se pudieron cargar las tarifas");
    }

    const tarifas = data.tarifas || [];
    const total = Number(data.total || 0);
    const totalPaginas = Math.ceil(total / limiteTarifas);

    if (tarifas.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-4 text-center text-slate-400">
            No se encontraron tarifas.
          </td>
        </tr>
      `;

      if (paginacion) paginacion.innerHTML = "";
      return;
    }

    tbody.innerHTML = tarifas.map(tarifa => {
      const id = Number(tarifa.id);
      const nombre = escaparHTML(tarifa.nombre || "");
      const descripcion = escaparHTML(tarifa.descripcion || "");
      const monto = Number(tarifa.monto || 0);
      const activo = Number(tarifa.activo) === 1;
      const creado = formatearFecha(tarifa.creado_en);

      return `
        <tr class="hover:bg-slate-700/50 transition">
          <td class="p-3 font-semibold text-slate-100">
            ${nombre}
          </td>

          <td class="p-3 text-right font-bold text-emerald-300">
            ${formatearDinero(monto)}
          </td>

          <td class="p-3 text-slate-300">
            ${descripcion || '<span class="text-slate-500">Sin descripción</span>'}
          </td>

          <td class="p-3 text-center">
            ${
              activo
                ? '<span class="badge-activo">Activa</span>'
                : '<span class="badge-inactivo">Inactiva</span>'
            }
          </td>

          <td class="p-3 text-slate-400">
            ${creado}
          </td>

          <td class="p-3">
            <div class="flex items-center justify-center gap-2">
  <button
    onclick='abrirModalEditarTarifa(${JSON.stringify(tarifa)})'
    class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold">
    Editar
  </button>

  <button
    onclick="cambiarEstadoTarifa(${id}, ${activo ? 0 : 1})"
    class="px-3 py-1.5 rounded-lg ${
      activo
        ? "bg-orange-600 hover:bg-orange-700"
        : "bg-emerald-600 hover:bg-emerald-700"
    } text-white text-sm font-semibold">
    ${activo ? "Desactivar" : "Activar"}
  </button>

  <button
    onclick="eliminarTarifa(${id})"
    class="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">
    Eliminar
  </button>
</div>
          </td>
        </tr>
      `;
    }).join("");

    renderPaginacionTarifas(totalPaginas);

  } catch (error) {
    console.error("Error cargando tarifas:", error);

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-4 text-center text-red-300">
          ${escaparHTML(error.message)}
        </td>
      </tr>
    `;

    if (paginacion) paginacion.innerHTML = "";
  }
}

function renderPaginacionTarifas(totalPaginas) {
  const contenedor = document.getElementById("paginacion-tarifas");
  if (!contenedor) return;

  if (totalPaginas <= 1) {
    contenedor.innerHTML = "";
    return;
  }

  let html = "";

  html += `
    <button
      ${paginaTarifas <= 1 ? "disabled" : ""}
      onclick="cambiarPaginaTarifas(${paginaTarifas - 1})"
      class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed">
      Anterior
    </button>
  `;

  const inicio = Math.max(1, paginaTarifas - 2);
  const fin = Math.min(totalPaginas, paginaTarifas + 2);

  for (let i = inicio; i <= fin; i++) {
    html += `
      <button
        onclick="cambiarPaginaTarifas(${i})"
        class="px-3 py-1.5 rounded-lg ${
          i === paginaTarifas
            ? "bg-blue-600 text-white"
            : "bg-slate-700 hover:bg-slate-600 text-slate-200"
        }">
        ${i}
      </button>
    `;
  }

  html += `
    <button
      ${paginaTarifas >= totalPaginas ? "disabled" : ""}
      onclick="cambiarPaginaTarifas(${paginaTarifas + 1})"
      class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed">
      Siguiente
    </button>
  `;

  contenedor.innerHTML = html;
}

function cambiarPaginaTarifas(nuevaPagina) {
  paginaTarifas = nuevaPagina;
  cargarTarifas();
}

function abrirModalAgregarTarifa() {
  Swal.fire({
    title: "Agregar tarifa",
    background: "#1e293b",
    color: "#f8fafc",
    width: 520,
    confirmButtonText: "Guardar",
    cancelButtonText: "Cancelar",
    showCancelButton: true,
    confirmButtonColor: "#2563eb",
    cancelButtonColor: "#475569",
    html: `
      <div class="swal-form text-left">
        <div class="field">
          <label for="tarifaNombre">Nombre de la tarifa</label>
          <input
            id="tarifaNombre"
            class="swal2-input"
            placeholder="Ej. Estudiante, Varsity, Semanal"
          >
        </div>

        <div class="field">
          <label for="tarifaMonto">Monto</label>
          <input
            id="tarifaMonto"
            type="number"
            step="0.01"
            min="0"
            class="swal2-input"
            placeholder="Ej. 250.00"
          >
        </div>

        <div class="field">
          <label for="tarifaDescripcion">Descripción</label>
          <textarea
            id="tarifaDescripcion"
            class="swal2-textarea"
            placeholder="Descripción opcional"
            rows="3"
          ></textarea>
        </div>

        <div class="field">
          <label for="tarifaActivo">Estado</label>
          <select id="tarifaActivo" class="swal2-select">
            <option value="1">Activa</option>
            <option value="0">Inactiva</option>
          </select>
        </div>
      </div>
    `,
    focusConfirm: false,
    preConfirm: () => {
      const nombre = document.getElementById("tarifaNombre").value.trim();
      const monto = document.getElementById("tarifaMonto").value;
      const descripcion = document.getElementById("tarifaDescripcion").value.trim();
      const activo = document.getElementById("tarifaActivo").value;

      if (!nombre) {
        Swal.showValidationMessage("El nombre de la tarifa es obligatorio");
        return false;
      }

      if (monto === "" || Number(monto) < 0) {
        Swal.showValidationMessage("El monto debe ser válido");
        return false;
      }

      return {
        nombre,
        monto,
        descripcion,
        activo
      };
    }
  }).then(async result => {
    if (!result.isConfirmed) return;

    await guardarTarifa({
      accion: "agregar",
      ...result.value
    });
  });
}

function abrirModalEditarTarifa(tarifa) {
  const id = Number(tarifa.id);
  const nombre = escaparHTML(tarifa.nombre || "");
  const monto = tarifa.monto ?? "";
  const descripcion = escaparHTML(tarifa.descripcion || "");
  const activo = Number(tarifa.activo) === 1 ? "1" : "0";

  Swal.fire({
    title: "Editar tarifa",
    background: "#1e293b",
    color: "#f8fafc",
    width: 520,
    confirmButtonText: "Actualizar",
    cancelButtonText: "Cancelar",
    showCancelButton: true,
    confirmButtonColor: "#2563eb",
    cancelButtonColor: "#475569",
    html: `
      <div class="swal-form text-left">
        <div class="field">
          <label for="tarifaNombre">Nombre de la tarifa</label>
          <input
            id="tarifaNombre"
            class="swal2-input"
            value="${nombre}"
            placeholder="Ej. Estudiante, Varsity, Semanal"
          >
        </div>

        <div class="field">
          <label for="tarifaMonto">Monto</label>
          <input
            id="tarifaMonto"
            type="number"
            step="0.01"
            min="0"
            class="swal2-input"
            value="${monto}"
            placeholder="Ej. 250.00"
          >
        </div>

        <div class="field">
          <label for="tarifaDescripcion">Descripción</label>
          <textarea
            id="tarifaDescripcion"
            class="swal2-textarea"
            placeholder="Descripción opcional"
            rows="3"
          >${descripcion}</textarea>
        </div>

        <div class="field">
          <label for="tarifaActivo">Estado</label>
          <select id="tarifaActivo" class="swal2-select">
            <option value="1" ${activo === "1" ? "selected" : ""}>Activa</option>
            <option value="0" ${activo === "0" ? "selected" : ""}>Inactiva</option>
          </select>
        </div>
      </div>
    `,
    focusConfirm: false,
    preConfirm: () => {
      const nombreNuevo = document.getElementById("tarifaNombre").value.trim();
      const montoNuevo = document.getElementById("tarifaMonto").value;
      const descripcionNueva = document.getElementById("tarifaDescripcion").value.trim();
      const activoNuevo = document.getElementById("tarifaActivo").value;

      if (!nombreNuevo) {
        Swal.showValidationMessage("El nombre de la tarifa es obligatorio");
        return false;
      }

      if (montoNuevo === "" || Number(montoNuevo) < 0) {
        Swal.showValidationMessage("El monto debe ser válido");
        return false;
      }

      return {
        id,
        nombre: nombreNuevo,
        monto: montoNuevo,
        descripcion: descripcionNueva,
        activo: activoNuevo
      };
    }
  }).then(async result => {
    if (!result.isConfirmed) return;

    await guardarTarifa({
      accion: "editar",
      ...result.value
    });
  });
}

async function guardarTarifa(payload) {
  try {
    Swal.fire({
      title: "Guardando...",
      text: "Por favor espera",
      allowOutsideClick: false,
      allowEscapeKey: false,
      background: "#1e293b",
      color: "#f8fafc",
      didOpen: () => Swal.showLoading()
    });

    const res = await fetch(TARIFAS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "No se pudo guardar la tarifa");
    }

    Swal.fire({
      icon: "success",
      title: "Listo",
      text: data.message || "Tarifa guardada correctamente",
      background: "#1e293b",
      color: "#f8fafc",
      confirmButtonColor: "#2563eb"
    });

    cargarTarifas();

  } catch (error) {
    console.error("Error guardando tarifa:", error);

    Swal.fire({
      icon: "error",
      title: "Error",
      text: error.message,
      background: "#1e293b",
      color: "#f8fafc",
      confirmButtonColor: "#2563eb"
    });
  }
}

async function cambiarEstadoTarifa(id, nuevoEstado) {
  const textoAccion = nuevoEstado === 1 ? "activar" : "desactivar";

  const confirmacion = await Swal.fire({
    icon: "question",
    title: `¿Deseas ${textoAccion} esta tarifa?`,
    text: nuevoEstado === 1
      ? "La tarifa volverá a estar disponible para nuevos pagos."
      : "La tarifa ya no estará disponible para nuevos pagos, pero seguirá existiendo para reportes.",
    showCancelButton: true,
    confirmButtonText: `Sí, ${textoAccion}`,
    cancelButtonText: "Cancelar",
    background: "#1e293b",
    color: "#f8fafc",
    confirmButtonColor: nuevoEstado === 1 ? "#059669" : "#dc2626",
    cancelButtonColor: "#475569"
  });

  if (!confirmacion.isConfirmed) return;

  await guardarTarifa({
    accion: "cambiar_estado",
    id,
    activo: nuevoEstado
  });
}

function formatearDinero(valor) {
  const numero = Number(valor || 0);

  return numero.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN"
  });
}

function formatearFecha(fecha) {
  if (!fecha) return "—";

  const d = new Date(fecha.replace(" ", "T"));

  if (Number.isNaN(d.getTime())) {
    return fecha;
  }

  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function escaparHTML(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function eliminarTarifa(id) {
  const confirmacion = await Swal.fire({
    icon: "warning",
    title: "¿Eliminar tarifa?",
    html: `
      <div class="text-slate-300">
        Esta acción solo se permitirá si la tarifa no tiene pagos registrados.
        <br><br>
        Si ya fue usada en pagos, deberás desactivarla en lugar de eliminarla.
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    background: "#1e293b",
    color: "#f8fafc",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#475569"
  });

  if (!confirmacion.isConfirmed) return;

  try {
    Swal.fire({
      title: "Eliminando...",
      text: "Validando si la tarifa tiene pagos relacionados",
      allowOutsideClick: false,
      allowEscapeKey: false,
      background: "#1e293b",
      color: "#f8fafc",
      didOpen: () => Swal.showLoading()
    });

    const res = await fetch(TARIFAS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        accion: "eliminar",
        id
      })
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "No se pudo eliminar la tarifa");
    }

    Swal.fire({
      icon: "success",
      title: "Tarifa eliminada",
      text: data.message || "La tarifa fue eliminada correctamente.",
      background: "#1e293b",
      color: "#f8fafc",
      confirmButtonColor: "#2563eb"
    });

    cargarTarifas();

  } catch (error) {
    console.error("Error eliminando tarifa:", error);

    Swal.fire({
      icon: "error",
      title: "No se pudo eliminar",
      text: error.message,
      background: "#1e293b",
      color: "#f8fafc",
      confirmButtonColor: "#2563eb"
    });
  }
}