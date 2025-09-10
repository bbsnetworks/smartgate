document.addEventListener("DOMContentLoaded", () => {
  cargarCategorias();

  document.getElementById("btn-agregar-categoria").addEventListener("click", () => {
  swalInfo.fire({
    title: 'Agregar Categoría',
    html: `
      <input id="nombre-cat" class="swal2-input" placeholder="Nombre de la categoría">
      <textarea id="descripcion-cat" class="swal2-textarea" placeholder="Descripción (opcional)"></textarea>
    `,
    showCancelButton: true,
    confirmButtonText: 'Agregar',
    preConfirm: () => {
      const nombre = document.getElementById("nombre-cat").value.trim();
      const descripcion = document.getElementById("descripcion-cat").value.trim();
      if (!nombre) {
        Swal.showValidationMessage("El nombre es obligatorio");
        return false;
      }
      return { nombre, descripcion };
    }
  }).then(result => {
    if (result.isConfirmed) {
      fetch('../php/categorias_controller.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.value)
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          swalSuccess.fire('¡Agregada!', data.message, 'success').then(cargarCategorias);
        } else {
          swalError.fire('Error', data.error || 'No se pudo agregar', 'error');
        }
      });
    }
  });
});

});

function cargarCategorias() {
  fetch('../php/categorias_controller.php')
    .then(res => res.json())
    .then(data => {
      const tabla = document.getElementById("tabla-categorias");
      tabla.innerHTML = '';

      if (!data.success || data.categorias.length === 0) {
        tabla.innerHTML = '<tr><td colspan="3" class="text-center py-4">No hay categorías registradas</td></tr>';
        return;
      }

      data.categorias.forEach((cat, index) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td class="px-4 py-2">${index + 1}</td>
          <td class="px-4 py-2">${cat.nombre}</td>
            <td class="px-4 py-2">${cat.descripcion || "Sin descripción"}</td>
          <td class="px-4 py-2 text-center space-x-2">
          <button onclick="editarCategoria(${cat.id}, '${cat.nombre}', \`${cat.descripcion || ''}\`)" 
            class="text-yellow-400 hover:text-white border border-yellow-400 hover:bg-yellow-500 focus:ring-4 focus:outline-none focus:ring-yellow-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-yellow-300 dark:text-yellow-300 dark:hover:text-white dark:hover:bg-yellow-400 dark:focus:ring-yellow-900">
            ✏️ Editar
        </button>
        <button onclick="eliminarCategoria(${cat.id})" 
            class="text-red-700 hover:text-white border border-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600 dark:focus:ring-red-900">
            🗑️ Eliminar
        </button>
        </td>
        `;
        tabla.appendChild(fila);
      });
    });
}

function editarCategoria(id, nombreActual, descripcionActual = "") {
  if (tipoUsuario === 'worker') {
    swalInfo.fire({
      title: 'Ingrese código de administrador',
      input: 'text',
      inputPlaceholder: 'Código...',
      showCancelButton: true,
      confirmButtonText: 'Validar',
      preConfirm: (codigo) => {
        if (!codigo) {
          Swal.showValidationMessage("Debes ingresar un código");
          return false;
        }

        return fetch("../php/validar_codigo_admin.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigo })
        })
          .then(res => res.json())
          .then(data => {
            if (!data.success) {
              throw new Error("Código inválido o no autorizado");
            }
            return true;
          })
          .catch(err => {
            Swal.showValidationMessage(err.message);
            return false;
          });
      }
    }).then(result => {
      if (result.isConfirmed) {
        abrirModalEdicion(id, nombreActual, descripcionActual); // Abre el modal real
      }
    });
  } else {
    abrirModalEdicion(id, nombreActual, descripcionActual);
  }
}
function abrirModalEdicion(id, nombreActual, descripcionActual = "") {
  swalInfo.fire({
    title: 'Editar Categoría',
    html: `
      <input id="nombre-cat" class="swal2-input" placeholder="Nombre" value="${nombreActual}">
      <textarea id="desc-cat" class="swal2-textarea" placeholder="Descripción">${descripcionActual || ""}</textarea>
    `,
    showCancelButton: true,
    confirmButtonText: 'Guardar cambios',
    preConfirm: () => {
      const nombre = document.getElementById("nombre-cat").value.trim();
      const descripcion = document.getElementById("desc-cat").value.trim();

      if (!nombre) {
        Swal.showValidationMessage("El nombre no puede estar vacío");
        return false;
      }

      return { id, nombre, descripcion };
    }
  }).then(result => {
    if (result.isConfirmed) {
      fetch('../php/categorias_controller.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.value)
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          swalSuccess.fire('Actualizado', data.message, 'success').then(cargarCategorias);
        } else {
          swalError.fire('Error', data.error || 'No se pudo actualizar', 'error');
        }
      });
    }
  });
}



function eliminarCategoria(id) {
  if (tipoUsuario === 'worker') {
    pedirCodigoAdmin().then(validado => {
      if (validado) {
        confirmarEliminacion(id);
      }
    });
  } else {
    confirmarEliminacion(id);
  }
}
function pedirCodigoAdmin() {
  return swalInfo.fire({
    title: 'Ingrese código de administrador',
    input: 'text',
    inputPlaceholder: 'Código...',
    showCancelButton: true,
    confirmButtonText: 'Validar',
    preConfirm: (codigo) => {
      if (!codigo) {
        Swal.showValidationMessage("Debes ingresar un código");
        return false;
      }

      return fetch("../php/validar_codigo_admin.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo })
      })
        .then(res => res.json())
        .then(data => {
          if (!data.success) {
            throw new Error("Código inválido o no autorizado");
          }
          return true;
        })
        .catch(err => {
          Swal.showValidationMessage(err.message);
          return false;
        });
    }
  }).then(result => result.isConfirmed);
}

function confirmarEliminacion(id) {
  swalInfo.fire({
    title: '¿Eliminar categoría?',
    text: 'Esta acción no se puede deshacer y se mostrara como categoria eliminada en el apartado de reportes.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#e3342f'
  }).then(confirm => {
    if (confirm.isConfirmed) {
      fetch(`../php/categorias_controller.php?id=${id}`, {
        method: 'DELETE'
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          swalSuccess.fire('Eliminada', data.message, 'success').then(cargarCategorias);
        } else {
          swalError.fire('Error', data.error || 'No se pudo eliminar', 'error');
        }
      });
    }
  });
}


