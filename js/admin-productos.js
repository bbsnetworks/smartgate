
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
async function abrirModalMovimiento() {
  const html = `
    <div class="space-y-3 text-left text-sm">
      <label class="block text-slate-300 font-semibold">Buscar producto</label>
      <input id="mv-buscar" class="w-full p-2 rounded bg-slate-700 text-slate-100" placeholder="Código, nombre o descripción">

      <div id="mv-resultados" class="max-h-56 overflow-auto mt-2 bg-slate-800 rounded border border-slate-700"></div>

      <div id="mv-info" class="hidden mt-3 p-3 rounded-lg bg-slate-700 border border-slate-600">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs uppercase text-slate-300">Producto</div>
            <div id="mv-nombre" class="font-semibold text-slate-100"></div>
            <div id="mv-codigo" class="text-xs text-slate-300"></div>
            <div id="mv-categoria" class="text-xs text-slate-400"></div>
          </div>
          <div class="text-right">
            <div class="text-xs uppercase text-slate-300">Stock actual</div>
            <div id="mv-stock" class="text-lg font-bold"></div>
          </div>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label class="block text-slate-300 font-semibold">Operación</label>
            <select id="mv-op" class="w-full p-2 rounded bg-slate-800 text-slate-100">
              <option value="ingreso">Sumar (ingreso)</option>
              <option value="ajuste-">Restar (ajuste-)</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-300 font-semibold">Cantidad</label>
            <input id="mv-cant" type="number" min="0.01" step="0.01"
                   class="w-full p-2 rounded bg-slate-800 text-slate-100" placeholder="0.00">
          </div>
        </div>
        <div class="mt-2">
          <label class="block text-slate-300 font-semibold">Nota (opcional)</label>
          <input id="mv-nota" class="w-full p-2 rounded bg-slate-800 text-slate-100" placeholder="Motivo del movimiento">
        </div>
        <div class="mt-2 text-right text-sm">
          <span class="text-slate-300">Nuevo stock:</span>
          <span id="mv-preview" class="font-bold"></span>
        </div>
      </div>

      <input type="hidden" id="mv-producto-id">
      <input type="hidden" id="mv-stock-actual">
    </div>
  `;

  const { value } = await swalcard.fire({
    title: "Movimiento de inventario",
    width: 700,
    html,
    showCancelButton: true,
    confirmButtonText: "Registrar movimiento",
    focusConfirm: false,
    allowOutsideClick: false, // 👈 evita cierres al hacer click fuera
    didOpen: () => {
      Swal.getPopup().classList.add('bg-slate-800','text-slate-100');

      const $buscar = document.getElementById('mv-buscar');
      const $res = document.getElementById('mv-resultados');
      const $info = document.getElementById('mv-info');

      const $id    = document.getElementById('mv-producto-id');
      const $stock = document.getElementById('mv-stock-actual');
      const $nombre= document.getElementById('mv-nombre');
      const $codigo= document.getElementById('mv-codigo');
      const $cat   = document.getElementById('mv-categoria');
      const $stockLbl = document.getElementById('mv-stock');
      const $op    = document.getElementById('mv-op');
      const $cant  = document.getElementById('mv-cant');
      const $preview = document.getElementById('mv-preview');

      let timer;
      const pintarPreview = () => {
        const actual = parseFloat($stock.value || '0');
        const cant = parseFloat($cant.value || '0');
        if (!cant || cant <= 0) { $preview.textContent = '—'; return; }
        const signo = ($op.value === 'ingreso') ? +1 : -1;
        const nuevo = actual + signo * cant;
        $preview.textContent = (nuevo < 0) ? 'ERROR (negativo)' : nuevo.toString();
      };

      $op.addEventListener('change', pintarPreview);
      $cant.addEventListener('input', pintarPreview);

      $buscar.addEventListener('input', () => {
        clearTimeout(timer);
        const q = $buscar.value.trim();
        timer = setTimeout(async () => {
          if (!q) { $res.innerHTML = ''; return; }
          const params = new URLSearchParams({ limit: 10, offset: 0, busqueda: q });
          const data = await fetch(`../php/productos_controller.php?${params}`).then(r=>r.json());
          if (!data.success || !data.productos.length) {
            $res.innerHTML = `<div class="p-3 text-slate-400">Sin resultados</div>`; return;
          }
          $res.innerHTML = data.productos.map(p => `
            <button type="button" data-id="${p.id}" data-codigo="${p.codigo}"
              data-nombre="${p.nombre}" data-stock="${p.stock}" data-cat="${p.categoria ?? ''}"
              class="w-full text-left px-3 py-2 hover:bg-slate-700">
              <div class="font-semibold">${p.codigo} — ${p.nombre}</div>
              <div class="text-xs text-slate-400">Stock: ${p.stock} · ${p.categoria ?? ''}</div>
            </button>
          `).join('');

          Array.from($res.querySelectorAll('button')).forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault(); e.stopPropagation(); // 👈 evita efectos colaterales
              // set selección
              $id.value      = btn.dataset.id;
              $stock.value   = btn.dataset.stock;
              $nombre.textContent = btn.dataset.nombre;
              $codigo.textContent = `Código: ${btn.dataset.codigo}`;
              $cat.textContent    = btn.dataset.cat ? `Categoría: ${btn.dataset.cat}` : '';
              $stockLbl.textContent = btn.dataset.stock;

              // mostrar tarjeta de info
              $info.classList.remove('hidden');

              // limpiar preview y cantidad
              $cant.value = '';
              $preview.textContent = '—';
            });
          });
        }, 250);
      });
    },
    preConfirm: () => {
      const producto_id = parseInt(document.getElementById('mv-producto-id').value || '0', 10);
      const tipo = document.getElementById('mv-op').value;
      const cantidad = parseFloat(document.getElementById('mv-cant').value || '0');
      const nota = document.getElementById('mv-nota') ? document.getElementById('mv-nota').value.trim() : '';
      const stockActual = parseFloat(document.getElementById('mv-stock-actual').value || '0');

      if (!producto_id) { Swal.showValidationMessage('Selecciona un producto de la lista.'); return false; }
      if (!cantidad || cantidad <= 0) { Swal.showValidationMessage('La cantidad debe ser mayor a 0'); return false; }
      if (tipo === 'ajuste-' && stockActual - cantidad < 0) {
        Swal.showValidationMessage('El movimiento dejaría el stock en negativo.');
        return false;
      }
      return { producto_id, tipo, cantidad, nota };
    }
  });

  if (!value) return;

  const res = await fetch('../php/productos_controller.php?accion=ajustar_stock', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(value)
  }).then(r=>r.json());

  if (res.ok) {
    swalSuccess.fire('Movimiento registrado', `Stock después: <b>${res.stock_despues}</b>`, 'success')
      .then(() => cargarProductos(paginaActual));
  } else {
    swalError.fire('Error', res.error || 'No se pudo registrar el movimiento', 'error');
  }
}
async function abrirModalReporte() {
  const html = `
    <div class="space-y-3 text-left text-sm">
      <label class="block text-slate-300 font-semibold">Periodo</label>
      <select id="rep-tipo" class="w-full p-2 rounded bg-slate-700 text-slate-100">
        <option value="dia">Día</option>
        <option value="mes">Mes</option>
        <option value="anio">Año</option>
        <option value="rango">Rango</option>
      </select>

      <div id="rep-campos" class="space-y-2">
        <div data-for="dia">
          <label class="block text-slate-300 font-semibold">Fecha</label>
          <input id="rep-dia" type="date" class="w-full p-2 rounded bg-slate-800 text-slate-100"/>
        </div>
        <div data-for="mes" class="hidden">
          <label class="block text-slate-300 font-semibold">Mes</label>
          <input id="rep-mes" type="month" class="w-full p-2 rounded bg-slate-800 text-slate-100"/>
        </div>
        <div data-for="anio" class="hidden">
          <label class="block text-slate-300 font-semibold">Año</label>
          <input id="rep-anio" type="number" min="2000" max="2100" step="1"
                 class="w-full p-2 rounded bg-slate-800 text-slate-100" placeholder="2025"/>
        </div>
        <div data-for="rango" class="hidden grid grid-cols-2 gap-2">
          <div>
            <label class="block text-slate-300 font-semibold">Inicio</label>
            <input id="rep-inicio" type="date" class="w-full p-2 rounded bg-slate-800 text-slate-100"/>
          </div>
          <div>
            <label class="block text-slate-300 font-semibold">Fin</label>
            <input id="rep-fin" type="date" class="w-full p-2 rounded bg-slate-800 text-slate-100"/>
          </div>
        </div>
      </div>
    </div>
  `;

  const { value: filtros } = await swalcard.fire({
    title: "Reporte de movimientos",
    width: 560,
    html,
    showCancelButton: true,
    confirmButtonText: "Generar",
    focusConfirm: false,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.getPopup().classList.add('bg-slate-800','text-slate-100');

      const tipoSel = document.getElementById('rep-tipo');
      const bloques = Array.from(document.querySelectorAll('#rep-campos [data-for]'));
      const switcher = () => {
        const t = tipoSel.value;
        bloques.forEach(b => b.classList.toggle('hidden', b.getAttribute('data-for') !== t));
      };
      tipoSel.addEventListener('change', switcher);
      switcher();
    },
    preConfirm: () => {
      const tipo = document.getElementById('rep-tipo').value;
      let qs = new URLSearchParams({ accion: 'reporte_movimientos', tipo });

      if (tipo === 'dia') {
        const f = document.getElementById('rep-dia').value;
        if (!f) { Swal.showValidationMessage('Selecciona una fecha'); return false; }
        qs.set('fecha', f);
      } else if (tipo === 'mes') {
        const m = document.getElementById('rep-mes').value;
        if (!m) { Swal.showValidationMessage('Selecciona un mes'); return false; }
        qs.set('fecha', m); // YYYY-MM
      } else if (tipo === 'anio') {
        const a = document.getElementById('rep-anio').value;
        if (!a) { Swal.showValidationMessage('Escribe un año'); return false; }
        qs.set('fecha', a); // YYYY
      } else {
        const i = document.getElementById('rep-inicio').value;
        const f = document.getElementById('rep-fin').value;
        if (!i || !f) { Swal.showValidationMessage('Completa el rango'); return false; }
        qs.set('inicio', i); qs.set('fin', f);
      }
      return qs.toString();
    }
  });

  if (!filtros) return;

  const data = await fetch(`../php/productos_controller.php?${filtros}`)
    .then(r => r.json())
    .catch(() => ({ ok:false, error:'No se pudo obtener el reporte' }));

if (!data.ok) {
  swalError.fire('Error', data.error || 'No se pudo obtener el reporte', 'error');
  return;
}

// Calcula etiqueta del filtro a partir de los parámetros usados
const paramsSel = new URLSearchParams(filtros);
const tipoSel = paramsSel.get('tipo');
let etiquetaFiltro = '';
if (tipoSel === 'dia')   etiquetaFiltro = `Día: ${paramsSel.get('fecha')}`;
else if (tipoSel === 'mes')  etiquetaFiltro = `Mes: ${paramsSel.get('fecha')}`;
else if (tipoSel === 'anio') etiquetaFiltro = `Año: ${paramsSel.get('fecha')}`;
else etiquetaFiltro = `Rango: ${paramsSel.get('inicio')} → ${paramsSel.get('fin')}`;

const htmlReporte = renderReporteMovimientos(data);

await swalcard.fire({
  title: `Movimientos (${data.desde} → ${data.hasta})`,
  width: 900,
  html: htmlReporte,
  focusConfirm: false,
  showCloseButton: true,
  showConfirmButton: false,
  didOpen: () => {
    Swal.getPopup().classList.add('bg-slate-800','text-slate-100');
    const $btn = document.getElementById('btnPdfRep');
    if ($btn) {
      $btn.addEventListener('click', () => {
        generarPDFInventarioMovs(data, {
          etiquetaFiltro, // texto humano del filtro elegido
          tipo: tipoSel,  // 'dia' | 'mes' | 'anio' | 'rango'
          desde: data.desde,
          hasta: data.hasta
        });
      });
    }
  },
});
}

function renderReporteMovimientos(data) {
  const cont = document.createElement('div');
  cont.className = 'max-h-[70vh] overflow-auto text-sm';

  // Toolbar con botón PDF
  const toolbar = document.createElement('div');
  toolbar.className = 'flex justify-end mb-3';
  toolbar.innerHTML = `
    <button id="btnPdfRep" class="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded">
      Generar PDF
    </button>
  `;
  cont.appendChild(toolbar);

  if (!data.resumen.length) {
    cont.appendChild(Object.assign(document.createElement('div'), {
      className: 'p-4 rounded bg-slate-700 text-center',
      textContent: 'Sin movimientos en el periodo seleccionado'
    }));
    return cont.outerHTML;
  }

  data.resumen.forEach(p => {
    const card = document.createElement('div');
    card.className = 'mb-4 p-3 rounded-lg bg-slate-700 border border-slate-600';

    const stockAct = (p.stock_actual === null || p.stock_actual === undefined) ? '—' : p.stock_actual;

    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div>
          <div class="text-xs text-slate-300">Producto</div>
          <div class="font-semibold">${p.codigo} — ${p.nombre}</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-300">Stock actual</div>
          <div class="font-bold">${stockAct}</div>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-left">
          <thead class="text-xs uppercase text-slate-300">
            <tr><th class="py-1 pr-3">Fecha</th><th class="py-1 pr-3">Tipo</th><th class="py-1 pr-3">Cant.</th><th class="py-1 pr-3">Stock después</th><th class="py-1">Nota</th></tr>
          </thead>
          <tbody class="text-slate-100">
            ${p.movimientos.map(m => `
              <tr class="border-t border-slate-600">
                <td class="py-1 pr-3 whitespace-nowrap">${m.fecha}</td>
                <td class="py-1 pr-3">${m.tipo}</td>
                <td class="py-1 pr-3">${parseFloat(m.cantidad).toFixed(2)}</td>
                <td class="py-1 pr-3">${m.stock_despues}</td>
                <td class="py-1">${m.nota || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    cont.appendChild(card);
  });

  return cont.outerHTML;
}
async function generarPDFInventarioMovs(data, meta) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' }); // 612 x 792 pt aprox.
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 40; // margen
  let y = M;

  // === Utilidades ===
  const now = new Date();
  const fechaCreacion = now.toLocaleString(); // local

  const getLogo = async () => {
    try {
      const r = await fetch('../php/obtener_logo.php', { cache: 'no-store' });
      const j = await r.json();
      if (j.success && j.base64) return { dataURI: j.base64, mime: j.mime || 'image/png' };
    } catch(e) {}
    return null;
  };

  const addHeader = (firstPage=false) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);

    // Logo
    if (window.__logoReporteInv) {
      const fmt = (window.__logoReporteInv.mime || '').toLowerCase().includes('jpeg') ? 'JPEG' : 'PNG';
      const w = 120, h = 40;
      doc.addImage(window.__logoReporteInv.dataURI, fmt, M, y, w, h);
    }
    // Título
    doc.text('Reporte de movimientos de inventario', M + 130, y + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Creado: ${fechaCreacion}`, M + 130, y + 34);
    doc.text(`${meta.etiquetaFiltro}  |  Ventana: ${meta.desde} → ${meta.hasta}`, M + 130, y + 50);

    y += 60;
    // Línea
    doc.setLineWidth(0.5);
    doc.line(M, y, pageW - M, y);
    y += 14;

    if (!firstPage) return;
  };

  const ensureSpace = (lines = 0) => {
    const need = y + lines * 14 + 40;
    if (need > pageH - M) {
      doc.addPage();
      y = M;
      addHeader(false);
    }
  };

  const printCellRow = (cols) => {
    // cols: [{w, text, bold}]
    const h = 16;
    ensureSpace(2);
    let x = M;
    cols.forEach(c => {
      if (c.bold) { doc.setFont('helvetica', 'bold'); } else { doc.setFont('helvetica', 'normal'); }
      doc.setFontSize(10);
      const txt = Array.isArray(c.text) ? c.text : [String(c.text ?? '')];
      txt.forEach((line, i) => {
        doc.text(line, x + 2, y + 12 + i*12);
      });
      x += c.w;
    });
    y += h;
  };

  // Precarga logo 1 sola vez
  if (!window.__logoReporteInv) {
    window.__logoReporteInv = await getLogo();
  }

  addHeader(true);

  // Recorre productos
  data.resumen.forEach((p, idx) => {
    // Cabecera del producto
    ensureSpace(4);
    doc.setFont('helvetica','bold'); doc.setFontSize(11);
    doc.text(`${p.codigo} — ${p.nombre}`, M, y);
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    const stockAct = (p.stock_actual === null || p.stock_actual === undefined) ? '—' : p.stock_actual;
    doc.text(`Stock actual: ${stockAct}`, pageW - M - 140, y);
    y += 8;

    // Encabezado tabla
    printCellRow([
      { w: 140, text: 'Fecha', bold: true },
      { w: 100, text: 'Tipo', bold: true },
      { w: 70,  text: 'Cant.', bold: true },
      { w: 110, text: 'Stock después', bold: true },
      { w: pageW - (M*2) - (140+100+70+110), text: 'Nota', bold: true }
    ]);

    // Filas
    p.movimientos.forEach(m => {
      // nota envuelta
      const notaWrapped = doc.splitTextToSize(m.nota || '', pageW - (M*2) - (140+100+70+110) - 6);
      const lines = Math.max(1, notaWrapped.length);
      ensureSpace(lines + 1);

      printCellRow([
        { w: 140, text: m.fecha },
        { w: 100, text: m.tipo },
        { w: 70,  text: parseFloat(m.cantidad).toFixed(2) },
        { w: 110, text: String(m.stock_despues) },
        { w: pageW - (M*2) - (140+100+70+110), text: notaWrapped }
      ]);
    });

    y += 8; // separación entre productos
    if (idx < data.resumen.length - 1) {
      ensureSpace(2);
      doc.setDrawColor(180); doc.setLineWidth(0.3);
      doc.line(M, y, pageW - M, y);
      doc.setDrawColor(0);
      y += 10;
    }
  });

  // Pie de página simple
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text(`Página ${i} de ${totalPages}`, pageW - M - 80, pageH - M/2);
  }

  const fileName = `reporte_inventario_${meta.desde}_a_${meta.hasta}.pdf`;

try {
  // Opción principal: abrir con URL de blob
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank'); // abre el visor PDF del navegador

  // Si el navegador bloquea el popup, usa el fallback de jsPDF
  if (!win) {
    doc.output('dataurlnewwindow', { filename: fileName });
  }

  // Limpia el objeto URL después de un rato
  setTimeout(() => URL.revokeObjectURL(url), 60000);
} catch (e) {
  // Último recurso: descarga
  doc.save(fileName);
}
}



