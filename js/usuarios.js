
function mostrarFormulario() {
  swalInfo.fire({
    title: 'Agregar Usuario',
    html: `
      <input id="nombre" class="swal2-input" placeholder="Nombre completo">
      <input id="correo" class="swal2-input" placeholder="Correo electrónico">
      <input id="password" type="password" class="swal2-input" placeholder="Contraseña">
      <select id="rol" style="
        width:44%;padding:0.625em 1em;font-size:1.125em;border:1px solid #334155;
        border-radius:0.375rem;background-color:#1e293b;color:#f8fafc;margin-top:0.5rem;">
        <option value="admin">Admin</option>
        <option value="worker">Worker</option>
        ${CURRENT_ROLE === 'root' ? '<option value="root">Root</option>' : ''}
      </select>
    `,
    confirmButtonText: 'Guardar',
    preConfirm: () => {
      const nombre = document.getElementById('nombre').value.trim();
      const correo = document.getElementById('correo').value.trim();
      const password = document.getElementById('password').value;
      const rol = document.getElementById('rol').value;
      const correoRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

      if (!nombre || !correo || !password || !rol) {
        Swal.showValidationMessage('Todos los campos son obligatorios');
        return false;
      }
      if (!correoRegex.test(correo)) {
        Swal.showValidationMessage('El correo electrónico no es válido');
        return false;
      }
      if (password.length < 6) {
        Swal.showValidationMessage('La contraseña debe tener al menos 6 caracteres');
        return false;
      }
      // Blindaje extra en frontend (el backend también valida):
      if (rol === 'root' && CURRENT_ROLE !== 'root') {
        Swal.showValidationMessage('Solo un usuario root puede crear usuarios root');
        return false;
      }
      return { nombre, correo, password, rol };
    }
  }).then(result => {
    if (result.isConfirmed) {
      fetch('../php/registrar_usuario.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.value)
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          swalSuccess.fire('¡Éxito!', data.msg, 'success').then(() => location.reload());
        } else {
          swalError.fire('Error', data.error || 'No se pudo guardar', 'error');
        }
      });
    }
  });
}





  // Ejemplo de llenado (cuando integres backend, esta función se reemplaza)
  document.addEventListener('DOMContentLoaded', () => {
    fetch("../php/obtener_usuarios.php")
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            throw new Error("No se pudo cargar la lista de usuarios");
        }

        const lista = document.getElementById("tabla-usuarios");
        lista.innerHTML = "";

        data.usuarios.forEach(usuario => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="p-2">${usuario.nombre}</td>
                <td class="p-2">${usuario.correo}</td>
                <td class="p-2 capitalize">${usuario.rol}</td>
                <td class="p-2"><button class="bg-green-500 text-white px-2 py-1 rounded mt-1" onclick="mostrarQR('${usuario.codigo}')"><i class="bi bi-qr-code"></i></button></td>
                <td class="p-2">
                    <button class="text-yellow-400 hover:text-white border border-yellow-400 hover:bg-yellow-500 focus:ring-4 focus:outline-none focus:ring-yellow-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-yellow-300 dark:text-yellow-300 dark:hover:text-white dark:hover:bg-yellow-400 dark:focus:ring-yellow-900" onclick="editarUsuario(${usuario.id})">✏️ Editar</button>
                    <button class="text-red-700 hover:text-white border border-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600 dark:focus:ring-red-900" onclick="eliminarUsuario(${usuario.id})">🗑️ Eliminar</button>
                </td>
            `;
            lista.appendChild(tr);
        });
    })
    .catch(error => {
        console.error("Error al cargar usuarios:", error);
        swalError.fire("Error", error.message, "error");
    });

  });

  function eliminarUsuario(id) {
  // 1) Consulta el usuario objetivo para conocer su rol
  fetch(`../php/obtener_usuario.php?id=${id}`)
    .then(r => r.json())
    .then(info => {
      if (!info.success) throw new Error(info.error || 'No se pudo cargar el usuario');

      const rolObjetivo = info.usuario.rol;

      // 2) Si el objetivo es root y el actor no es root -> prohíbe
      if (rolObjetivo === 'root' && (typeof CURRENT_ROLE === 'undefined' || CURRENT_ROLE !== 'root')) {
        swalError.fire('Acción no permitida', 'Solo un usuario root puede eliminar usuarios root.', 'error');
        return;
      }

      // 3) Confirmación y eliminación normal
      swalInfo.fire({
        title: '¿Eliminar usuario? En reportes futuros aparecerá como eliminado.',
        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar'
      }).then(result => {
        if (result.isConfirmed) {
          fetch('../php/eliminar_usuario.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              swalSuccess.fire('Eliminado', data.msg, 'success').then(() => location.reload());
            } else {
              swalError.fire('Error', data.error || 'No se pudo eliminar', 'error');
            }
          });
        }
      });
    })
    .catch(err => swalError.fire('Error', err.message, 'error'));
}

  function editarUsuario(id) {
  fetch(`../php/obtener_usuario.php?id=${id}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) throw new Error(data.error || "No se pudo cargar el usuario.");
      const usuario = data.usuario;

      // Construye el <select> según QUIÉN edita y QUIÉN es el objetivo
      const selectRol = `
        <select id="rol" style="
          width:44%;padding:0.625em 1em;font-size:1.125em;border:1px solid #334155;
          border-radius:0.375rem;background-color:#1e293b;color:#f8fafc;margin-top:0.5rem;"
          ${ (usuario.rol === 'root' && CURRENT_ROLE !== 'root') ? 'disabled' : '' }
        >
          <option value="admin" ${usuario.rol === "admin" ? "selected" : ""}>Admin</option>
          <option value="worker" ${usuario.rol === "worker" ? "selected" : ""}>Worker</option>
          ${ CURRENT_ROLE === 'root' ? `<option value="root" ${usuario.rol === "root" ? "selected" : ""}>Root</option>` : '' }
        </select>
        ${
          (usuario.rol === 'root' && CURRENT_ROLE !== 'root')
            ? '<p class="mt-2 text-sm text-slate-400">No puedes cambiar el rol de un usuario root.</p>'
            : ''
        }
      `;

      swalcard.fire({
        title: 'Editar Usuario',
        html: `
          <input id="nombre" class="swal2-input" placeholder="Nombre completo" value="${usuario.nombre}">
          <input id="correo" class="swal2-input" placeholder="Correo electrónico" value="${usuario.correo}">
          <input id="password" type="password" class="swal2-input" placeholder="Nueva contraseña (opcional)">
          ${selectRol}
        `,
        confirmButtonText: 'Guardar cambios',
        showCancelButton: true,
        preConfirm: () => {
          const nextRol = (document.getElementById('rol') || { value: usuario.rol }).value;

          // Blindaje UI: si no eres root, no puedes asignar rol root
          if (nextRol === 'root' && CURRENT_ROLE !== 'root') {
            Swal.showValidationMessage('Solo un usuario root puede asignar rol root');
            return false;
          }

          return {
            id,
            nombre: document.getElementById('nombre').value.trim(),
            correo: document.getElementById('correo').value.trim(),
            password: document.getElementById('password').value,
            rol: nextRol
          };
        }
      }).then(result => {
        if (result.isConfirmed) {
          fetch('../php/actualizar_usuario.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result.value)
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              swalSuccess.fire('¡Actualizado!', data.msg, 'success').then(() => location.reload());
            } else {
              swalError.fire('Error', data.error || 'No se pudo actualizar', 'error');
            }
          });
        }
      });
    })
    .catch(error => swalError.fire("Error", error.message, "error"));
}


function mostrarQR(codigo) {
  swalcard.fire({
    title: `QR de código:`,
    html: `
      <div class="flex flex-col items-center justify-center">
        <div id="qr-container" class="mb-4 p-2 bg-white rounded"></div>
        <button id="descargarQR" class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition">
          Descargar imagen
        </button>
      </div>
    `,
    showConfirmButton: false,
    didOpen: () => {
      // Generar QR localmente (sin internet)
      const cont = document.getElementById('qr-container');
      cont.innerHTML = ''; // limpia por si acaso

      // Ajusta tamaño y corrección de error a tu gusto
      const qr = new QRCode(cont, {
        text: String(codigo),
        width: 180,
        height: 180,
        correctLevel: QRCode.CorrectLevel.M // L, M, Q, H
      });

      // Descargar como PNG
      document.getElementById('descargarQR').addEventListener('click', () => {
        try {
          // qrcodejs puede renderizar <img> o <canvas>, contemplamos ambos
          const img = cont.querySelector('img');
          const canvas = cont.querySelector('canvas');

          let dataURL = null;
          if (img && img.src) {
            dataURL = img.src;
          } else if (canvas) {
            dataURL = canvas.toDataURL('image/png');
          } else {
            throw new Error('No se pudo obtener la imagen del QR');
          }

          const a = document.createElement('a');
          a.href = dataURL;
          a.download = `codigo_${codigo}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch (err) {
          swalError.fire("Error", "No se pudo descargar el QR", "error");
        }
      });
    }
  });
}


