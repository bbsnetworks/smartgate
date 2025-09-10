
document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
});

let todosLosProductos = [];
let offset = 0;
const limit = 10;
let paginaActual = 1;
let totalRegistros = 0;
let modoBusqueda = false;

function cargarProductos(pagina = 1) {
  const busqueda = document.getElementById("busquedaProducto").value.trim().toLowerCase();
  paginaActual = pagina;
  offset = (pagina - 1) * limit;

  const params = new URLSearchParams({
    limit,
    offset,
    ...(busqueda && { busqueda })
  });

  fetch(`../php/productos_controller.php?${params}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        todosLosProductos = data.productos;
        totalRegistros = data.total || 0;
        mostrarProductosFiltrados(todosLosProductos);
        renderPaginacion(); // ⬅️ esta parte es nueva
      } else {
        document.getElementById("tabla-productos").innerHTML =
          '<tr><td colspan="8" class="text-center py-4">No se pudieron cargar productos</td></tr>';
      }
    });
}
function renderPaginacion() {
  const contenedor = document.getElementById("paginacion-productos");
  contenedor.innerHTML = "";

  const totalPaginas = Math.ceil(totalRegistros / limit);

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = `px-3 py-1 rounded ${i === paginaActual ? 'bg-blue-600 text-white' : 'bg-gray-700 text-slate-300 hover:bg-blue-700'}`;
    btn.onclick = () => cargarProductos(i);
    contenedor.appendChild(btn);
  }
}

document.getElementById("busquedaProducto").addEventListener("input", () => cargarProductos(1));

function mostrarProductosFiltrados(productos) {
  const tabla = document.getElementById("tabla-productos");
  tabla.innerHTML = "";

  if (productos.length === 0) {
    tabla.innerHTML = '<tr><td colspan="8" class="text-center py-4">No se encontraron productos</td></tr>';
    return;
  }

  productos.forEach((producto, index) => {
    const fila = document.createElement("tr");
    const descripcionCorta = producto.descripcion.length > 40 
  ? producto.descripcion.slice(0, 30) + "..." 
  : producto.descripcion;
    fila.innerHTML = `
      <td class="px-4 py-2">${producto.codigo}</td>
      <td class="px-4 py-2">${producto.nombre}</td>
      <td class="px-4 py-2">${descripcionCorta}</td>
      <td class="px-4 py-2">$${parseFloat(producto.precio).toFixed(2)}</td>
      <td class="px-4 py-2">${producto.stock}</td>
      <td class="px-4 py-2">${producto.categoria}</td>
      <td class="px-4 py-2 text-center space-x-2">
        <button onclick="editarProducto(${producto.id})" 
          class="text-yellow-400 hover:text-white border border-yellow-400 hover:bg-yellow-500 focus:ring-4 focus:outline-none focus:ring-yellow-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-yellow-300 dark:text-yellow-300 dark:hover:text-white dark:hover:bg-yellow-400 dark:focus:ring-yellow-900">
          ✏️ Editar
        </button>
        <button onclick="eliminarProducto(${producto.id})" 
          class="text-red-700 hover:text-white border border-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:hover:bg-red-600 dark:focus:ring-red-900">
          🗑️ Eliminar
        </button>
      </td>
    `;
    tabla.appendChild(fila);
  });
}




function abrirModalAgregar() {
  fetch("../php/categorias_controller.php")
    .then(r => r.json())
    .then(({ categorias }) => {
      const options = [
        `<option value="" disabled selected>Selecciona categoría</option>`,
        ...categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`)
      ].join("");

      swalcard.fire({
        title: "Agregar Producto",
        width: 650,
        // NO usar customClass aquí para no pisar el mixin
        html: `
          <div class="grid text-left text-sm text-white">
            <label for="codigo" class="font-semibold mx-auto">Código de Barras:</label>
            <input id="codigo" inputmode="numeric" pattern="\\d*"
                   class="swal2-input mx-auto w-3/4" placeholder="Código de Barras">

            <label for="nombre" class="font-semibold mx-auto mt-2">Nombre del Producto:</label>
            <input id="nombre" class="swal2-input mx-auto w-3/4" placeholder="Nombre del Producto">

            <label for="descripcion" class="font-semibold mx-auto mt-2">Descripción:</label>
            <textarea id="descripcion" rows="3"
                      class="swal2-textarea mx-auto w-3/4" placeholder="Descripción"></textarea>

            <label for="precio" class="font-semibold mx-auto mt-2">Precio:</label>
            <input id="precio" type="number" step="0.01" min="0"
                   class="swal2-input mx-auto w-3/4" placeholder="0.00">

            <label for="stock" class="font-semibold mx-auto mt-2">Stock:</label>
            <input id="stock" type="number" min="0" step="1"
                   class="swal2-input mx-auto w-3/4" placeholder="0">

            <label for="categoria_id" class="font-semibold mx-auto mt-2 mb-2">Categoría:</label>
            <select id="categoria_id"
                    class="mx-auto mt-1 w-3/4 p-2 rounded border border-slate-600 bg-slate-800 text-slate-100">
              ${options}
            </select>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "Agregar",
        cancelButtonText: "Cancelar",
        didOpen: () => {
          // Añade clases al popup SIN sobrescribir el customClass del mixin
          const $popup = Swal.getPopup();
          $popup.classList.add('bg-slate-800','text-slate-100'); // lo que tenías en customClass.popup
        },
        preConfirm: () => {
          const val = id => document.getElementById(id).value.trim();
          const codigo = val("codigo");
          const nombre = val("nombre");
          const descripcion = val("descripcion");
          const precio = parseFloat(val("precio"));
          const stock = parseInt(val("stock"), 10);
          const categoria_id = parseInt(val("categoria_id"), 10);

          if (!codigo || !/^\d+$/.test(codigo)) return Swal.showValidationMessage("El código debe ser numérico.");
          if (!nombre) return Swal.showValidationMessage("El nombre es obligatorio.");
          if (!descripcion) return Swal.showValidationMessage("La descripción es obligatoria.");
          if (isNaN(precio) || precio < 0) return Swal.showValidationMessage("Precio inválido.");
          if (!Number.isInteger(stock) || stock < 0) return Swal.showValidationMessage("Stock inválido.");
          if (isNaN(categoria_id)) return Swal.showValidationMessage("Selecciona una categoría.");

          return { codigo, nombre, descripcion, precio, stock, categoria_id };
        }
      }).then(res => {
        if (!res.isConfirmed) return;
        fetch("../php/productos_controller.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(res.value)
        })
        .then(r => r.json())
        .then(data => {
          if (data.success) swalSuccess.fire("Agregado", data.msg, "success").then(cargarProductos);
          else swalError.fire("Error", data.error || "No se pudo agregar el producto");
        });
      });
    });
}





function eliminarProducto(id) {
  if (tipoUsuario === "admin" || tipoUsuario === "root") {
    return confirmarEliminacion(id);
  }
  swalInfo.fire({
    title: "Ingrese código de administrador",
    input: "password",
    inputPlaceholder: "Código...",
    showCancelButton: true,
    confirmButtonText: "Validar",
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
      // Mostrar confirmación final de eliminación
      swalInfo.fire({
        title: "¿Eliminar producto?",
        text: "Esta acción no se puede deshacer y se mostrara como categoria eliminada en el apartado de reportes.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#e3342f",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Sí, eliminar"
      }).then(confirm => {
        if (confirm.isConfirmed) {
          fetch(`../php/productos_controller.php?id=${id}`, { method: "DELETE" })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                swalSuccess.fire("Eliminado", data.message, "success").then(cargarProductos);
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
  });
}
function confirmarEliminacion(id) {
  swalInfo.fire({
    title: "¿Eliminar producto?",
    text: "Esta acción no se puede deshacer",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#e3342f",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sí, eliminar"
  }).then(confirm => {
    if (confirm.isConfirmed) {
      fetch(`../php/productos_controller.php?id=${id}`, { method: "DELETE" })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            swalSuccess.fire("Eliminado", data.message, "success").then(cargarProductos);
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
function editarProducto(id) {
  if (tipoUsuario === "admin" || tipoUsuario === "root") {
    ejecutarEdicionProducto(id); // acceso directo
    return;
  }
  swalInfo.fire({
    title: "Ingrese código de administrador",
    input: "password",
    inputPlaceholder: "Código...",
    showCancelButton: true,
    confirmButtonText: "Validar",
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
      ejecutarEdicionProducto(id); // 🔁 aquí va tu función original, que renombraremos
    }
  });
}

function ejecutarEdicionProducto(id) {
  fetch(`../php/productos_controller.php?id=${id}`)
    .then((res) => res.json())
    .then((producto) => {
      fetch("../php/categorias_controller.php")
        .then((res) => res.json())
        .then((data) => {
          const categoriasOptions = data.categorias
            .map((cat) => {
              return `<option value="${cat.id}" ${
                cat.id == producto.categoria_id ? "selected" : ""
              }>${cat.nombre}</option>`;
            })
            .join("");

          swalcard.fire({
            title: "Editar Producto",
            width: 650,
            html: `
            <div class="grid text-left text-sm text-white">
              <label for="codigo" class="font-semibold mx-auto">Código de Barras:</label>
              <input id="codigo" class="swal2-input mx-auto w-3/4" placeholder="Código de Barras" value="${producto.codigo}">

              <label for="nombre" class="font-semibold mx-auto mt-2">Nombre del Producto:</label>
              <input id="nombre" class="swal2-input mx-auto w-3/4" placeholder="Nombre del Producto" value="${producto.nombre}">

              <label for="descripcion" class="font-semibold mx-auto mt-2">Descripción:</label>
              <textarea id="descripcion" class="swal2-textarea mx-auto w-3/4" placeholder="Descripción" rows="2">${producto.descripcion}</textarea>

              <label for="precio" class="font-semibold mx-auto mt-2">Precio:</label>
              <input id="precio" type="number" step="0.01" class="swal2-input mx-auto w-3/4" placeholder="Precio" value="${producto.precio}">

              <label for="stock" class="font-semibold mx-auto mt-2">Stock:</label>
              <input id="stock" type="number" min="0" class="swal2-input mx-auto w-3/4" placeholder="Stock" value="${producto.stock}">

              <label for="categoria_id" class="font-semibold mx-auto mt-2 mb-2">Categoría:</label>
              <select id="categoria_id" class="mx-auto mt-1 w-3/4 p-2 rounded border border-slate-600 bg-slate-800 text-slate-100">
                <option disabled value="">Selecciona categoría</option>
                ${categoriasOptions}
              </select>
            </div>
          `,

            confirmButtonText: "Guardar Cambios",
            showCancelButton: true,
            preConfirm: () => {
  const codigo = document.getElementById("codigo").value.trim();
  const nombre = document.getElementById("nombre").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const precio = parseFloat(document.getElementById("precio").value);
  const stock = parseInt(document.getElementById("stock").value);
  const categoria_id = parseInt(document.getElementById("categoria_id").value);

  if (!codigo || !nombre || !descripcion || isNaN(precio) || isNaN(stock) || isNaN(categoria_id)) {
    Swal.showValidationMessage("Todos los campos son obligatorios.");
    return false;
  }

  if (!/^\d+$/.test(codigo)) {
    Swal.showValidationMessage("El código debe contener solo números.");
    return false;
  }

  if (precio < 0) {
    Swal.showValidationMessage("El precio no puede ser negativo.");
    return false;
  }

  if (!Number.isInteger(stock) || stock < 0) {
    Swal.showValidationMessage("El stock debe ser un número entero positivo.");
    return false;
  }

  return {
    id,
    codigo,
    nombre,
    descripcion,
    precio,
    stock,
    categoria_id
  };
}

,
          }).then((result) => {
            if (result.isConfirmed) {
              fetch("../php/productos_controller.php", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result.value),
              })
                .then((res) => res.json())
                .then((data) => {
                  if (data.success) {
                    swalSuccess.fire("Actualizado", data.msg, "success").then(
                      cargarProductos
                    );
                  } else {
                    swalError.fire(
                      "Error",
                      data.error || "No se pudo actualizar",
                      "error"
                    );
                  }
                });
            }
          });
        });
    });
}
