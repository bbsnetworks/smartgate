document.addEventListener('DOMContentLoaded', () => {
  cargarEmpleados();

  const inputBusqueda = document.getElementById("buscador-empleados");
  inputBusqueda.addEventListener("input", () => {
    cargarEmpleados(inputBusqueda.value);
  });
});

// ✅ Rol proveniente del servidor (inyectado en el HTML)
const role = (window.USER_ROLE || '').toLowerCase();

// ✅ Política de edición de fechas: SOLO root puede editar
const CAN_EDIT_INICIO = USER_ROLE === 'root';
const CAN_EDIT_FIN    = USER_ROLE === 'root';

function cargarEmpleados(filtro = "") {
  fetch("../php/empleados_controller.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "listar", filtro })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) throw new Error("No se pudo cargar la lista de empleados");

      const lista = document.getElementById("tabla-empleados");
      lista.innerHTML = "";

      data.empleados.forEach(emp => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="p-3">
            <img src="data:image/jpeg;base64,${emp.face}" alt="Foto" class="w-16 h-16 rounded-full object-cover">
          </td>
          <td class="p-3">
            <button class="text-blue-700 hover:underline font-semibold" onclick="mostrarCardEmpleado(${emp.data})">
              ${emp.nombre} ${emp.apellido}
            </button>
          </td>
          <td class="p-3">${emp.telefono}</td>
          <td class="p-3">${emp.email}</td>
          <td class="p-3 capitalize">${emp.tipo}</td>
          <td class="p-3">
            <button class="ext-yellow-400 hover:text-white border border-yellow-400 hover:bg-yellow-500 rounded-lg text-sm px-5 py-2.5 transition" onclick='editarEmpleado(${JSON.stringify(emp).replace(/'/g, "&apos;")})'>✏️ Editar</button>
            <button class="text-red-500 hover:text-white border border-red-500 hover:bg-red-600 rounded-lg text-sm px-5 py-2.5 transition" onclick="eliminarEmpleado(${emp.data})">🗑️ Eliminar</button>
          </td>
        `;
        lista.appendChild(tr);
      });
    })
    .catch(err => {
      console.error(err);
      swalError.fire("Error", err.message, "error");
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

function mostrarCardEmpleado(id) {
  fetch("../php/empleados_controller.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "obtener", id })
  })
    .then(res => res.json())
    .then(resp => {
      if (!resp.success) throw new Error(resp.error || "Empleado no encontrado");

      const emp = resp.datos;

      swalInfo.fire({
        title: `${emp.nombre} ${emp.apellido}`,
        html: `
          <div class="flex flex-col items-center gap-4">
            ${emp.face 
              ? `<img src="data:image/jpeg;base64,${emp.face}" alt="Foto" class="w-32 h-32 rounded-full shadow-md basis-full">` 
              : `<div class="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border">Sin Foto</div>`}
            <div class="text-left w-full">
              <p><strong>📞 Emergencia:</strong> ${emp.emergencia || "No registrado"}</p>
              <p><strong>🩸 Tipo de Sangre:</strong> ${emp.sangre || "No registrado"}</p>
              <p><strong>👤 Tipo:</strong> ${emp.tipo || "No registrado"}</p>
              <p><strong>📝 Comentarios:</strong><br> ${emp.comentarios || "Sin comentarios"}</p>
            </div>
          </div>
        `,
        confirmButtonText: "Cerrar"
      });
    })
    .catch(err => {
      console.error(err);
      swalError.fire("Error", err.message, "error");
    });
}

function editarEmpleado(empleado) {
  fetch("../php/empleados_controller.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "obtener", id: empleado.data })
  })
    .then(res => res.json())
    .then(emp => {
      if (!emp.success) throw new Error(emp.error || "No se encontró el empleado.");

      const tipoOriginal = (emp.datos.tipo || '').toLowerCase();

      fetch("../php/get_organizations.php")
        .then(res => res.json())
        .then(data => {
          const organizaciones = data.list || [];
          const orgOptions = organizaciones
            .filter(o => o.parentOrgIndexCode !== "1")
            .map(org => `<option value="${org.orgIndexCode}" ${org.orgIndexCode == emp.datos.orgIndexCode ? "selected" : ""}>${org.orgName}</option>`)
            .join("");

          const inicioVal = formateaFecha(emp.datos.Inicio);
          const finVal    = formateaFecha(emp.datos.Fin);

          // Helper: YYYY-MM-DDTHH:MM desde Date
          const toDatetimeLocal = (d) => {
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          };

          // Mapea orgName → tipo
          const orgNameToTipo = (name) => {
            const n = (name || '').trim().toLowerCase();
            if (n === 'empleados') return 'empleados';
            if (n === 'gerencia')  return 'gerencia';
            return 'clientes';
          };

          swalInfo.fire({
            title: "Editar Empleado",
            html: `
              <div style="display: flex; flex-direction: column; gap: 10px">
                <input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${emp.datos.nombre}">
                <input id="swal-apellido" class="swal2-input" placeholder="Apellido" value="${emp.datos.apellido}">
                <input id="swal-telefono" class="swal2-input" placeholder="Teléfono" value="${emp.datos.telefono}">
                <input id="swal-email" class="swal2-input" placeholder="Correo" value="${emp.datos.email}">

                <div style="display: flex; flex-direction: column;">
                  <label style="margin-top:10px">Contacto de Emergencia:</label>
                  <input id="swal-emergencia" class="swal2-input" placeholder="Contacto de Emergencia" value="${emp.datos.emergencia ?? ''}">
                </div>
                <div style="display: flex; flex-direction: column;">
                  <label style="margin-top:10px">Tipo de Sangre:</label>
                  <input id="swal-sangre" class="swal2-input" placeholder="Tipo de Sangre" value="${emp.datos.sangre ?? ''}">
                </div>
                <div style="display: flex; flex-direction: column;">
                  <label style="margin-top:10px">Comentarios:</label>
                  <input id="swal-comentarios" class="swal2-input" placeholder="Comentarios" value="${emp.datos.comentarios ?? ''}">
                </div>

                <div style="display: flex; flex-direction: column; padding: 0px 40px 0px 40px;">
                  <label style="margin-bottom: 5px;">Organización:</label>
                  <select id="swal-orgIndexCode" class="w-full px-4 py-2 rounded border border-slate-600 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                    ${orgOptions}
                  </select>
                </div>

                <div style="display: flex; flex-direction: column;">
                  <label style="margin-top:10px">Inicio:</label>
                  <input type="datetime-local" id="swal-inicio" class="swal2-input" value="${inicioVal}" ${CAN_EDIT_INICIO ? '' : 'disabled'}>
                </div>

                <div style="display: flex; flex-direction: column;">
                  <label>Fin:</label>
                  <input type="datetime-local" id="swal-fin" class="swal2-input" value="${finVal}" ${CAN_EDIT_FIN ? '' : 'disabled'}>
                  ${role !== 'root' ? '<small style="opacity:.8">Solo usuarios <b>root</b> pueden modificar fechas.</small>' : ''}
                </div>
              </div>
            `,
            confirmButtonText: "Actualizar",
            showCancelButton: true,
            preConfirm: () => {
              const nombre = document.getElementById("swal-nombre").value.trim();
              const apellido = document.getElementById("swal-apellido").value.trim();
              const telefono = document.getElementById("swal-telefono").value.trim();
              const email = document.getElementById("swal-email").value.trim();
              const emergencia = document.getElementById("swal-emergencia").value.trim();
              const sangre = document.getElementById("swal-sangre").value.trim();
              const comentarios = document.getElementById("swal-comentarios").value.trim();

              const orgSelect = document.getElementById("swal-orgIndexCode");
              const orgIndexCode = orgSelect.value;
              const orgName = orgSelect.options[orgSelect.selectedIndex].text.trim();

              // Fechas desde los inputs
              let inicio = document.getElementById("swal-inicio").value;
              let fin    = document.getElementById("swal-fin").value;

              // Blindaje por rol
              if (!CAN_EDIT_INICIO) inicio = inicioVal;
              if (!CAN_EDIT_FIN)    fin    = finVal;

              // REGLA: si cambia de empleado/gerencia → clientes, fin = inicio + 3h (e inicio se mantiene tal cual “fecha ingreso”)
              const nuevoTipo = orgNameToTipo(orgName);
              const cambiaACliente = (nuevoTipo === 'clientes') && (tipoOriginal === 'empleados' || tipoOriginal === 'gerencia');

              if (cambiaACliente) {
                // Usa la fecha de inicio elegida como “fecha de ingreso”
                const dInicio = new Date(inicio || new Date());
                const dFin = new Date(dInicio.getTime() + 3 * 60 * 60 * 1000);
                inicio = toDatetimeLocal(dInicio);
                fin    = toDatetimeLocal(dFin);
              }

              // Validaciones
              const nombreRegex = /^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/;
              const telefonoRegex = /^\d{10}$/;
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
                Swal.showValidationMessage("El teléfono debe contener solo 10 dígitos.");
                return false;
              }
              if (!emailRegex.test(email)) {
                Swal.showValidationMessage("El correo electrónico no tiene un formato válido.");
                return false;
              }

              const fechaInicio = new Date(inicio);
              const fechaFin = new Date(fin);
              if (fechaFin <= fechaInicio) {
                Swal.showValidationMessage("La fecha de fin debe ser mayor que la de inicio.");
                return false;
              }

              return {
                action: "actualizar",
                data: emp.datos.data,
                nombre,
                apellido,
                telefono,
                email,
                emergencia,
                sangre,
                comentarios,
                inicio,
                fin,
                orgIndexCode,
                orgName
              };
            }
          }).then(result => {
            if (result.isConfirmed) {
              Swal.showLoading();

              fetch("../php/empleados_controller.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result.value)
              })
                .then(res => res.json())
                .then(data => {
                  Swal.hideLoading();
                  if (data.success) {
                    swalSuccess.fire("Actualizado", data.msg, "success").then(() => cargarEmpleados());
                  } else {
                    swalError.fire("Error", data.error, "error");
                  }
                })
                .catch(err => {
                  Swal.hideLoading();
                  swalError.fire("Error", "No se pudo actualizar", "error");
                  console.error(err);
                });
            }
          });
        });
    })
    .catch(err => Swal.fire("Error", err.message, "error"));
}


function eliminarEmpleado(id) {
  swalInfo.fire({
    title: '¿Eliminar empleado?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    allowOutsideClick: false,
    didOpen: () => {
      const confirmBtn = Swal.getConfirmButton();
      confirmBtn.disabled = false;
    },
    preConfirm: () => {
      Swal.showLoading();
      return fetch('../php/delete_user.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: id })
      })
      .then(res => res.json())
      .then(data => {
        if (data.code === 0) {
          return data.msg;
        } else {
          throw new Error(data.error || 'Error al eliminar en HikCentral');
        }
      })
      .catch(error => {
        Swal.hideLoading();
        Swal.showValidationMessage(error.message);
      });
    }
  }).then(result => {
    if (result.isConfirmed) {
      swalSuccess.fire('Eliminado', result.value, 'success');
      cargarEmpleados();
    }
  });
}

