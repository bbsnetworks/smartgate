function confirmarEliminacion(id) {
    swalInfo.fire({
        title: '¿Eliminar usuario?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('../php/delete_user.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personId: id })
            })
            .then(res => res.json())
            .then(data => {
                if (data.code === 0) {
                    swalSuccess.fire('Eliminado (Aparecera en reportes como cliente eliminado)', data.msg, 'success').then(() => location.reload());
                } else {
                    swalError.fire('Error', data.error || 'No se pudo eliminar', 'error');
                }
            });
        }
    });
}

function formateaFecha(fechaSQL) {
    const fecha = new Date(fechaSQL);
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const hours = String(fecha.getHours()).padStart(2, '0');
    const minutes = String(fecha.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function editarCliente(cliente) {
  
  const deshabilitarInicio = (usuarioRol !== "root") ? "disabled" : "";
  const deshabilitarFin = (usuarioRol !== "root") ? "disabled" : "";



  Promise.all([
  fetch("../php/get_organizations.php").then(r => r.json()),
  fetch("../php/get_groups.php").then(r => r.json())
]).then(([orgData, grpData]) => {
  const organizaciones = orgData.list || [];
  const grupos = grpData.list || [];
  const orgOptions = organizaciones
  .filter(o => o.parentOrgIndexCode !== "1")
  .map(org => `
    <option 
      value="${org.orgIndexCode}" 
      ${org.orgIndexCode == cliente.orgIndexCode ? "selected" : ""}
      style="background-color: #1e293b; color: #f8fafc;"
    >
      ${org.orgName}
    </option>
  `).join("");
  const groupOptions = grupos.map(g => `
  <option 
    value="${g.privilegeGroupId}" 
    ${String(g.privilegeGroupId) === String(cliente.grupo) ? "selected" : ""}
    style="background-color: #1e293b; color: #f8fafc;"
  >
    ${g.privilegeGroupName || g.name || "Grupo"}
  </option>
`).join("");


      swalInfo.fire({
        title: 'Editar Cliente',
        html: `
<div class="text-sm space-y-4 text-slate-100">
  <div class="flex flex-col text-center">
    <label for="swal-nombre" class="mb-1 font-semibold text-slate-300">Nombre:</label>
    <input id="swal-nombre" class="swal2-input bg-slate-800 text-slate-100 placeholder-slate-400 border border-slate-600" placeholder="Nombre" value="${cliente.nombre}">
  </div>

  <div class="flex flex-col text-center">
    <label for="swal-apellido" class="mb-1 font-semibold text-slate-300">Apellido:</label>
    <input id="swal-apellido" class="swal2-input bg-slate-800 text-slate-100 placeholder-slate-400 border border-slate-600" placeholder="Apellido" value="${cliente.apellido}">
  </div>

  <div class="flex flex-col text-center">
    <label for="swal-telefono" class="mb-1 font-semibold text-slate-300">Teléfono:</label>
    <input id="swal-telefono" class="swal2-input bg-slate-800 text-slate-100 placeholder-slate-400 border border-slate-600" placeholder="Teléfono" value="${cliente.telefono}">
  </div>

  <div class="flex flex-col text-center">
    <label for="swal-email" class="mb-1 font-semibold text-slate-300">Email:</label>
    <input id="swal-email" class="swal2-input bg-slate-800 text-slate-100 placeholder-slate-400 border border-slate-600" placeholder="Email" value="${cliente.email}">
  </div>

  <div class="flex flex-col text-center">
    <label for="swal-orgIndexCode" class="mb-1 font-semibold text-slate-300">Organización:</label>
    <select id="swal-orgIndexCode" class="swal2-select bg-slate-800 text-slate-100 border border-slate-600 rounded px-3 py-2 appearance-none">
      ${orgOptions}
    </select>
  </div>
  <div class="flex flex-col text-center">
  <label for="swal-grupo" class="mb-1 font-semibold text-slate-300">Grupo (Horario):</label>
  <select id="swal-grupo" class="swal2-select bg-slate-800 text-slate-100 border border-slate-600 rounded px-3 py-2 appearance-none">
    <option value="">Seleccione un grupo</option>
    ${groupOptions}
  </select>
</div>
      
  <div class="flex flex-col text-center">
    <label for="swal-emergencia" class="mb-1 font-semibold text-slate-300">Contacto de Emergencia:</label>
    <input id="swal-emergencia" class="swal2-input bg-slate-800 text-slate-100 placeholder-slate-400 border border-slate-600" placeholder="Contacto de Emergencia" value="${cliente.emergencia ?? ''}">
  </div>

  <div class="flex flex-col text-center">
    <label for="swal-sangre" class="mb-1 font-semibold text-slate-300">Tipo de Sangre:</label>
    <input id="swal-sangre" class="swal2-input bg-slate-800 text-slate-100 placeholder-slate-400 border border-slate-600" placeholder="Tipo de Sangre" value="${cliente.sangre ?? ''}">
  </div>

  <div class="flex flex-col text-center">
    <label for="swal-comentarios" class="mb-1 font-semibold text-slate-300">Comentarios:</label>
    <input id="swal-comentarios" class="swal2-input bg-slate-800 text-slate-100 placeholder-slate-400 border border-slate-600" placeholder="Comentarios" value="${cliente.comentarios ?? ''}">
  </div>

  <div class="flex flex-col text-center">
  <label for="swal-inicio" class="mb-1 font-semibold text-slate-300">Inicio:</label>
  <input type="datetime-local" id="swal-inicio"
    class="swal2-input bg-slate-800 text-slate-100 border border-slate-600"
    value="${formateaFecha(cliente.Inicio)}" ${deshabilitarInicio}>
</div>

<div class="flex flex-col text-center">
  <label for="swal-fin" class="mb-1 font-semibold text-slate-300">Fin:</label>
  <input
    type="datetime-local"
    id="swal-fin"
    class="swal2-input bg-slate-800 text-slate-100 border border-slate-600"
    value="${formateaFecha(cliente.Fin)}"
    ${deshabilitarFin}
    ${usuarioRol !== "root" ? 'readOnly title="Solo un usuario ROOT puede modificar la fecha de fin"' : ''}
  >
</div>


</div>
`,


        confirmButtonText: 'Actualizar',
        focusConfirm: false,
        preConfirm: () => {
          const nombre = document.getElementById('swal-nombre').value.trim();
          const apellido = document.getElementById('swal-apellido').value.trim();
          const telefono = document.getElementById('swal-telefono').value.trim();
          const email = document.getElementById('swal-email').value.trim();
          const orgIndexCode = document.getElementById('swal-orgIndexCode').value;
          const grupo = document.getElementById('swal-grupo').value;
          const inicio = document.getElementById('swal-inicio').value;
          const fin = document.getElementById('swal-fin').value;
          const emergencia = document.getElementById('swal-emergencia').value.trim();
          const sangre = document.getElementById('swal-sangre').value.trim();
          const comentarios = document.getElementById('swal-comentarios').value.trim();


          const nombreRegex = /^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/;
          const telefonoRegex = /^\d{10}$/;
          const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

          if (!nombre || !apellido || !telefono || !email || !inicio || !fin || !orgIndexCode) {
            Swal.showValidationMessage("Todos los campos son obligatorios.");
            return false;
          }

          if (!nombreRegex.test(nombre)) {
            Swal.showValidationMessage("El nombre no debe contener números ni símbolos.");
            return false;
          }

          if (!nombreRegex.test(apellido)) {
            Swal.showValidationMessage("El apellido no debe contener números ni símbolos.");
            return false;
          }

          if (!telefonoRegex.test(telefono)) {
            Swal.showValidationMessage("El teléfono debe contener exactamente 10 dígitos.");
            return false;
          }

          if (!emailRegex.test(email)) {
            Swal.showValidationMessage("El correo electrónico no es válido.");
            return false;
          }
          if (!nombre || !apellido || !telefono || !email || !inicio || !fin || !orgIndexCode || !grupo) {
            Swal.showValidationMessage("Todos los campos son obligatorios.");
          return false;
          }


          const fechaInicio = new Date(inicio);
          const fechaFin = new Date(fin);
          if (fechaFin <= fechaInicio) {
            Swal.showValidationMessage("La fecha de fin debe ser mayor que la de inicio.");
            return false;
          }

          const orgName = document.getElementById('swal-orgIndexCode').selectedOptions[0].textContent;

          return {
          id: cliente.data,
          nombre,
          apellido,
          telefono,
          email,
          Inicio: inicio,
          Fin: fin,
          orgIndexCode,
          grupo,
          orgName,
          emergencia,
          sangre,
          comentarios
        };
        }
      }).then((result) => {
        if (result.isConfirmed) {
          fetch('../php/update_user.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result.value)
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              swalSuccess.fire('Actualizado', data.msg, 'success').then(() => location.reload());
            } else {
              swalError.fire('Error', data.error || 'No se pudo actualizar', 'error');
            }
          });
        }
      });
    });
}
async function mostrarInfoCliente(cliente) {
  const nombreGrupo = await nombreGrupoPorId(cliente.grupo);

  swalcard.fire({
    title: `${cliente.nombre} ${cliente.apellido}`,
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
        <img src="data:image/jpeg;base64,${cliente.face}" class="w-48 h-32 rounded-full shadow-md basis-full" alt="Foto">

        <div style="margin-top: 10px; text-align: left;">
          <p class="mt-2"><strong>📅 Inicio:</strong> ${formateaFechaModal(cliente.Inicio)}</p>
          <p class="mt-2"><strong>📅 Fin:</strong> ${formateaFechaModal(cliente.Fin)}</p>
          <p class="mt-2"><strong>🕒 Grupo (Horario):</strong> ${nombreGrupo}</p>

          <p class="mt-2"><strong>📞 Teléfono:</strong> ${cliente.telefono}</p>
          <p class="mt-2"><strong>📧 Email:</strong> ${cliente.email}</p>
          <p class="mt-2"><strong>📞 Emergencia:</strong> ${cliente.emergencia ?? '<span style="color:gray">No especificado</span>'}</p>
          <p class="mt-2"><strong>🩸 Tipo de Sangre:</strong> ${cliente.sangre ?? '<span style="color:gray">No especificado</span>'}</p>
          <p class="mt-2"><strong>👥 Tipo:</strong> ${cliente.tipo}</p>
          <p class="mt-2"><strong>📝 Comentarios:</strong><br><span style="color:#333;">${cliente.comentarios?.trim() || '<span style="color:gray">Sin comentarios</span>'}</span></p>
        </div>
      </div>
    `,
    showCloseButton: true,
    showConfirmButton: false,
    width: 420,
    customClass: { popup: 'rounded-xl shadow-lg' }
  });
}


let paginaActual = 1;
const limite = 20;
let totalPaginas = 1;
let filtro = "";

// 🔄 Cargar clientes paginados
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

// 🔢 Obtener total de páginas (con o sin filtro)
async function obtenerTotalPaginas() {
  const params = new URLSearchParams({ ...(filtro && { q: filtro }) });
  const res = await fetch(`../php/total_clientes.php?${params}`);
  const data = await res.json();
  totalPaginas = Math.ceil(data.total / limite);
}

// 🧭 Renderizar paginación numerada
function renderPaginacion() {
  const paginacion = document.getElementById("paginacion-clientes");
  if (!paginacion) return;
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

// 🔁 Refrescar clientes
async function actualizarClientes() {
  await obtenerTotalPaginas();
  cargarClientes(1);
}

// 🧠 Al cargar DOM
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

// 🧩 Renderizar filas en tabla
function renderizarFilas(clientes) {
  const tbody = document.querySelector("tbody");
  tbody.innerHTML = clientes.map(cliente => `
    <tr class="border-b">
      <td class="p-3">
        <img src="data:image/jpeg;base64,${cliente.face}" alt="Foto" class="w-16 h-16 rounded-full object-cover">
      </td>
      <td class="p-3 font-mono text-blue-600">
        <a href="#" onclick='mostrarInfoCliente(${JSON.stringify(cliente)})' class="text-blue-600 hover:underline">${cliente.personCode}</a>
      </td>
      <td class="p-3">${cliente.nombre}</td>
      <td class="p-3">${cliente.apellido}</td>
      <td class="p-3 space-x-2">
        <button 
          class="editar-btn text-yellow-400 hover:text-white border border-yellow-400 hover:bg-yellow-500 font-medium rounded-lg text-sm px-5 py-2.5"
          data-cliente='${JSON.stringify(cliente).replace(/'/g, "&#39;")}'
        >
          ✏️ Editar
        </button>
        <button 
          onclick="confirmarEliminacion(${cliente.data})"
          class="text-red-700 hover:text-white border border-red-700 hover:bg-red-800 font-medium rounded-lg text-sm px-5 py-2.5"
        >
          🗑️ Eliminar
        </button>
      </td>
    </tr>
  `).join("");

  // Reasignar botones de editar
  document.querySelectorAll(".editar-btn").forEach(boton => {
    boton.addEventListener("click", () => {
      const cliente = JSON.parse(boton.dataset.cliente.replace(/&#39;/g, "'"));
      editarCliente(cliente);
    });
  });
}

// 🔥 Eliminar cliente
function confirmarEliminacion(id) {
  swalInfo.fire({
    title: '¿Eliminar usuario?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      fetch('../php/delete_user.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: id })
      })
      .then(res => res.json())
      .then(data => {
        if (data.code === 0) {
          swalSuccess.fire('Eliminado', data.msg, 'success').then(() => actualizarClientes());
        } else {
          swalError.fire('Error', data.error || 'No se pudo eliminar', 'error');
        }
      });
    }
  });
}

// 🕓 Formato fecha para campos datetime-local
function formateaFecha(fechaSQL) {
  const fecha = new Date(fechaSQL);
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  const hours = String(fecha.getHours()).padStart(2, '0');
  const minutes = String(fecha.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
// 📅 SOLO para mostrar fechas en el modal de información (DD/MM/AAAA)
function formateaFechaModal(fechaSQL) {
  if (!fechaSQL) return '<span style="color:gray">No especificado</span>';

  // Asegura compatibilidad con "YYYY-MM-DD HH:mm:ss"
  const fecha = new Date(String(fechaSQL).replace(" ", "T"));
  if (isNaN(fecha.getTime())) {
    return '<span style="color:gray">Fecha inválida</span>';
  }

  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();

  return `${dia}/${mes}/${anio}`;
}
let cacheGrupos = null;

async function cargarGrupos() {
  if (cacheGrupos) return cacheGrupos;

  const res = await fetch("../php/get_groups.php");
  const data = await res.json();
  cacheGrupos = data.list || [];
  return cacheGrupos;
}

async function nombreGrupoPorId(groupId) {
  if (!groupId) return '<span style="color:gray">No especificado</span>';

  const grupos = await cargarGrupos();
  const g = grupos.find(x => String(x.privilegeGroupId) === String(groupId));

  return g
    ? (g.privilegeGroupName || g.name || `Grupo ${groupId}`)
    : `<span style="color:gray">No encontrado</span>`;
}


