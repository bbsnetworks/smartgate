document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
});

let todosLosProductos = [];
let offset = 0;
const limit = 10;
let paginaActual = 1;
let totalRegistros = 0;
let modoBusqueda = false;
const CODIGO_VISITA = "1";
const NOMBRE_PRODUCTO_VISITA = "visita";

function cargarProductos(pagina = 1) {
  const busqueda = document
    .getElementById("busquedaProducto")
    .value.trim()
    .toLowerCase();
  paginaActual = pagina;
  offset = (pagina - 1) * limit;

  const params = new URLSearchParams({
    limit,
    offset,
    ...(busqueda && { busqueda }),
  });

  fetch(`../php/productos_controller.php?${params}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        todosLosProductos = data.productos;
        totalRegistros = data.total || 0;
        mostrarProductosFiltrados(todosLosProductos);
        renderPaginacion(); // ⬅️ esta parte es nueva
      } else {
        document.getElementById("tabla-productos").innerHTML =
          '<tr><td colspan="9" class="text-center py-4">No se pudieron cargar productos</td></tr>';
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
    btn.className = `px-3 py-1 rounded ${i === paginaActual ? "bg-blue-600 text-white" : "bg-gray-700 text-slate-300 hover:bg-blue-700"}`;
    btn.onclick = () => cargarProductos(i);
    contenedor.appendChild(btn);
  }
}

document
  .getElementById("busquedaProducto")
  .addEventListener("input", () => cargarProductos(1));

function mostrarProductosFiltrados(productos) {
  const tabla = document.getElementById("tabla-productos");
  tabla.innerHTML = "";

  if (!productos.length) {
    tabla.innerHTML =
      '<tr><td colspan="9" class="text-center py-6 opacity-70">Sin resultados</td></tr>';
    return;
  }

  const fmt = (n) => `$${Number(n ?? 0).toFixed(2)}`;
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m],
    );

  productos.forEach((p) => {
    const descFull = p.descripcion || "";
    const descCorta =
      descFull.length > 64 ? `${descFull.slice(0, 64)}…` : descFull;
    const prov = p.proveedor_nombre || "—";
    const cat = p.categoria || "—";

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-700/40";
    tr.innerHTML = `
      <td class="px-4 py-3 whitespace-nowrap">${esc(p.codigo)}</td>
      <td class="px-4 py-3 whitespace-nowrap">${esc(p.nombre)}</td>
      <td class="px-4 py-3 text-right tabular-nums whitespace-nowrap">${fmt(p.precio)}</td>
      <td class="px-4 py-3 text-right tabular-nums whitespace-nowrap">${fmt(p.precio_proveedor)}</td>
      <td class="px-4 py-3 whitespace-nowrap">${esc(prov)}</td>
      <td class="px-4 py-3 text-right tabular-nums">${p.stock}</td>
      <td class="px-4 py-3 whitespace-nowrap">${esc(cat)}</td>
      <td class="px-4 py-3">
        <div class="flex justify-center gap-2">
          <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-300 border border-yellow-600 hover:bg-yellow-500 hover:text-slate-900 transition"
                  onclick="editarProducto(${p.id})">
            <i data-lucide="pencil" class="w-4 h-4"></i> Editar
          </button>
          <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-400 border border-red-600 hover:bg-red-600 hover:text-white transition"
                  onclick="eliminarProducto(${p.id})">
            <i data-lucide="trash-2" class="w-4 h-4"></i> Eliminar
          </button>
        </div>
      </td>
    `;
    tabla.appendChild(tr);
  });

  if (window.lucide?.createIcons) lucide.createIcons();
}

function abrirModalAgregar() {
  // Trae categorías y proveedores activos en paralelo
  Promise.all([
    fetch("../php/categorias_controller.php").then((r) => r.json()),
    fetch(
      "../php/proveedores_controller.php?action=listar&activo=1&limit=200",
    ).then((r) => r.json()),
  ]).then(([catData, provData]) => {
    const categorias = catData.categorias || [];
    const proveedores = provData.proveedores || [];

    const catOpts = [
      `<option value="" disabled selected>Selecciona categoría</option>`,
      ...categorias.map((c) => `<option value="${c.id}">${c.nombre}</option>`),
    ].join("");

    const provOpts = [
      `<option value="" selected>— Sin proveedor —</option>`,
      ...proveedores.map((p) => `<option value="${p.id}">${p.nombre}</option>`),
    ].join("");

    swalcard
      .fire({
        title: "Agregar Producto",
        width: 680,
        html: `
        <div class="grid text-left text-sm text-white">
          <label class="font-semibold mx-auto">Código de Barras:</label>
          <input id="codigo" inputmode="numeric" pattern="\\d*" class="swal2-input mx-auto w-3/4" placeholder="Código de Barras">

          <label class="font-semibold mx-auto mt-2">Nombre del Producto:</label>
          <input id="nombre" class="swal2-input mx-auto w-3/4" placeholder="Nombre del Producto">

          <label class="font-semibold mx-auto mt-2">Descripción:</label>
          <textarea id="descripcion" rows="3" class="swal2-textarea mx-auto w-3/4" placeholder="Descripción"></textarea>

          <div class="mx-auto w-3/4 grid grid-cols-2 gap-3 mt-2">
            <div>
              <label class="font-semibold">Precio (venta):</label>
              <input id="precio" type="number" step="0.01" min="0" class="swal2-input w-full" placeholder="0.00">
            </div>
          </div>

          <label class="font-semibold mx-auto mt-2 mb-2">Proveedor:</label>
          <select id="proveedor_id" class="mx-auto mt-1 w-3/4 p-2 rounded border border-slate-600 bg-slate-800 text-slate-100">
            ${provOpts}
          </select>

          <label class="font-semibold mx-auto mt-2 mb-2">Categoría:</label>
          <select id="categoria_id" class="mx-auto mt-1 w-3/4 p-2 rounded border border-slate-600 bg-slate-800 text-slate-100">
            ${catOpts}
          </select>

          <label class="font-semibold mx-auto mt-2">Stock inicial:</label>
          <input id="stock" type="number" min="0" step="1" class="swal2-input mx-auto w-3/4" placeholder="0">
        </div>
      `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "Agregar",
        cancelButtonText: "Cancelar",
        didOpen: () => {
          const $popup = Swal.getPopup();
          $popup.classList.add("bg-slate-800", "text-slate-100");
        },
        preConfirm: () => {
          const val = (id) => document.getElementById(id).value.trim();
          const codigo = val("codigo");
          const nombre = val("nombre");
          const descripcion = val("descripcion");
          const precio = parseFloat(val("precio"));
          const stock = parseInt(val("stock") || "0", 10);
          const categoria_id = parseInt(val("categoria_id") || "0", 10);
          const proveedor_id_str = val("proveedor_id");
          const proveedor_id = proveedor_id_str
            ? parseInt(proveedor_id_str, 10)
            : null;

          if (!codigo || !/^\d+$/.test(codigo))
            return Swal.showValidationMessage("El código debe ser numérico.");
          if (codigo === CODIGO_VISITA) {
            return Swal.showValidationMessage(
              "El código 1 está reservado exclusivamente para Visita.",
            );
          }
          if (!nombre)
            return Swal.showValidationMessage("El nombre es obligatorio.");
          if (!descripcion)
            return Swal.showValidationMessage("La descripción es obligatoria.");
          if (isNaN(precio) || precio < 0)
            return Swal.showValidationMessage("Precio de venta inválido.");
          if (!Number.isInteger(stock) || stock < 0)
            return Swal.showValidationMessage("Stock inválido.");
          if (isNaN(categoria_id) || categoria_id <= 0)
            return Swal.showValidationMessage("Selecciona una categoría.");

          return {
            codigo,
            nombre,
            descripcion,
            precio,
            stock,
            categoria_id,
            proveedor_id,
          };
        },
      })
      .then((res) => {
        if (!res.isConfirmed) return;
        fetch("../php/productos_controller.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(res.value),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success)
              swalSuccess
                .fire("Agregado", data.msg, "success")
                .then(() => cargarProductos(1));
            else
              swalError.fire(
                "Error",
                data.error || "No se pudo agregar el producto",
              );
          });
      });
  });
}

function eliminarProducto(id) {
  if (tipoUsuario === "admin" || tipoUsuario === "root") {
    return confirmarEliminacion(id);
  }
  swalInfo
    .fire({
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
          body: JSON.stringify({ codigo }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (!data.success) {
              throw new Error("Código inválido o no autorizado");
            }
            return true;
          })
          .catch((err) => {
            Swal.showValidationMessage(err.message);
            return false;
          });
      },
    })
    .then((result) => {
      if (result.isConfirmed) {
        // Mostrar confirmación final de eliminación
        swalInfo
          .fire({
            title: "¿Eliminar producto?",
            text: "Esta acción no se puede deshacer y se mostrara como categoria eliminada en el apartado de reportes.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#e3342f",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Sí, eliminar",
          })
          .then((confirm) => {
            if (confirm.isConfirmed) {
              fetch(`../php/productos_controller.php?id=${id}`, {
                method: "DELETE",
              })
                .then((res) => res.json())
                .then((data) => {
                  if (data.success) {
                    swalSuccess
                      .fire("Eliminado", data.message, "success")
                      .then(cargarProductos);
                  } else {
                    swalError.fire(
                      "Error",
                      data.error || "No se pudo eliminar",
                      "error",
                    );
                  }
                })
                .catch(() => {
                  swalError.fire(
                    "Error",
                    "No se pudo conectar con el servidor",
                    "error",
                  );
                });
            }
          });
      }
    });
}
function confirmarEliminacion(id) {
  swalInfo
    .fire({
      title: "¿Eliminar producto?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e3342f",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, eliminar",
    })
    .then((confirm) => {
      if (confirm.isConfirmed) {
        fetch(`../php/productos_controller.php?id=${id}`, { method: "DELETE" })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              swalSuccess
                .fire("Eliminado", data.message, "success")
                .then(cargarProductos);
            } else {
              swalError.fire(
                "Error",
                data.error || "No se pudo eliminar",
                "error",
              );
            }
          })
          .catch(() => {
            swalError.fire(
              "Error",
              "No se pudo conectar con el servidor",
              "error",
            );
          });
      }
    });
}
function editarProducto(id) {
  if (tipoUsuario === "admin" || tipoUsuario === "root") {
    ejecutarEdicionProducto(id); // acceso directo
    return;
  }
  swalInfo
    .fire({
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
          body: JSON.stringify({ codigo }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (!data.success) {
              throw new Error("Código inválido o no autorizado");
            }
            return true;
          })
          .catch((err) => {
            Swal.showValidationMessage(err.message);
            return false;
          });
      },
    })
    .then((result) => {
      if (result.isConfirmed) {
        ejecutarEdicionProducto(id); // 🔁 aquí va tu función original, que renombraremos
      }
    });
}

function ejecutarEdicionProducto(id) {
  // Traer producto, categorías y proveedores activos
  Promise.all([
    fetch(`../php/productos_controller.php?id=${id}`).then((r) => r.json()),
    fetch("../php/categorias_controller.php").then((r) => r.json()),
    fetch(
      "../php/proveedores_controller.php?action=listar&activo=1&limit=200",
    ).then((r) => r.json()),
  ]).then(([producto, catData, provData]) => {
    const categoriasOptions = (catData.categorias || [])
      .map(
        (cat) =>
          `<option value="${cat.id}" ${cat.id == producto.categoria_id ? "selected" : ""}>${cat.nombre}</option>`,
      )
      .join("");

    const provOptions = [
      `<option value="">— Sin proveedor —</option>`,
      ...(provData.proveedores || []).map(
        (pr) =>
          `<option value="${pr.id}" ${pr.id == (producto.proveedor_id ?? "") ? "selected" : ""}>${pr.nombre}</option>`,
      ),
    ].join("");

    swalcard
      .fire({
        title: "Editar Producto",
        width: 680,
        html: `
        <div class="grid text-left text-sm text-white">
          <label class="font-semibold mx-auto">Código de Barras:</label>
            <input 
              id="codigo" 
              class="swal2-input mx-auto w-3/4" 
              value="${producto.codigo || ""}"
              ${String(producto.codigo) === CODIGO_VISITA ? "readonly" : ""}
              >
              ${
                String(producto.codigo) === CODIGO_VISITA
                  ? `
                <div class="mx-auto w-3/4 mt-1 text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
                  Este producto es especial: el código 1 está reservado para Visita y no puede modificarse.
                </div>
              `
                  : ""
              }

          <label class="font-semibold mx-auto mt-2">Nombre del Producto:</label>
          <input id="nombre" class="swal2-input mx-auto w-3/4" value="${producto.nombre || ""}">

          <label class="font-semibold mx-auto mt-2">Descripción:</label>
          <textarea id="descripcion" class="swal2-textarea mx-auto w-3/4" rows="2">${producto.descripcion || ""}</textarea>

          <div class="mx-auto w-3/4 grid grid-cols-2 gap-3 mt-2">
            <div>
              <label class="font-semibold">Precio (venta):</label>
              <input id="precio" type="number" step="0.01" class="swal2-input w-full" value="${producto.precio || 0}">
            </div>
            <div>
              <label class="font-semibold">Costo proveedor:</label>
              <input id="precio_proveedor" type="number" step="0.01" class="swal2-input w-full" value="${producto.precio_proveedor || 0}">
            </div>
          </div>

          <label class="font-semibold mx-auto mt-2 mb-2">Proveedor:</label>
          <select id="proveedor_id" class="mx-auto mt-1 w-3/4 p-2 rounded border border-slate-600 bg-slate-800 text-slate-100">
            ${provOptions}
          </select>

          <label class="font-semibold mx-auto mt-2 mb-2">Categoría:</label>
          <select id="categoria_id" class="mx-auto mt-1 w-3/4 p-2 rounded border border-slate-600 bg-slate-800 text-slate-100">
            <option disabled value="">Selecciona categoría</option>
            ${categoriasOptions}
          </select>

          <label class="font-semibold mx-auto mt-2">Stock (solo lectura):</label>
          <input id="stock" type="number" min="0" class="swal2-input mx-auto w-3/4" value="${producto.stock || 0}" readonly>
        </div>
      `,
        confirmButtonText: "Guardar Cambios",
        showCancelButton: true,
        didOpen: () =>
          Swal.getPopup().classList.add("bg-slate-800", "text-slate-100"),
        preConfirm: () => {
          const codigo = document.getElementById("codigo").value.trim();
          const nombre = document.getElementById("nombre").value.trim();
          const descripcion = document
            .getElementById("descripcion")
            .value.trim();
          const precio = parseFloat(document.getElementById("precio").value);
          const precio_proveedor = parseFloat(
            document.getElementById("precio_proveedor").value || "0",
          );
          const stock = parseInt(document.getElementById("stock").value);
          const categoria_id = parseInt(
            document.getElementById("categoria_id").value,
          );
          const provSel = document.getElementById("proveedor_id").value;
          const proveedor_id = provSel ? parseInt(provSel, 10) : null;

          if (!codigo || !/^\d+$/.test(codigo))
            return Swal.showValidationMessage("Código inválido.");
          const codigoOriginal = String(producto.codigo || "").trim();
          if (codigoOriginal === CODIGO_VISITA && codigo !== CODIGO_VISITA) {
            return Swal.showValidationMessage(
              "El código 1 está reservado para Visita y no puede modificarse.",
            );
          }

          if (codigoOriginal !== CODIGO_VISITA && codigo === CODIGO_VISITA) {
            return Swal.showValidationMessage(
              "El código 1 está reservado exclusivamente para Visita.",
            );
          }
          if (!nombre)
            return Swal.showValidationMessage("El nombre es obligatorio.");
          if (!descripcion)
            return Swal.showValidationMessage("La descripción es obligatoria.");
          if (isNaN(precio) || precio < 0)
            return Swal.showValidationMessage("Precio inválido.");
          if (isNaN(precio_proveedor) || precio_proveedor < 0)
            return Swal.showValidationMessage("Costo proveedor inválido.");
          if (!Number.isInteger(stock) || stock < 0)
            return Swal.showValidationMessage("Stock inválido.");
          if (isNaN(categoria_id))
            return Swal.showValidationMessage("Selecciona una categoría.");

          return {
            id,
            codigo,
            nombre,
            descripcion,
            precio,
            precio_proveedor,
            stock,
            categoria_id,
            proveedor_id,
          };
        },
      })
      .then((result) => {
        if (!result.isConfirmed) return;
        fetch("../php/productos_controller.php", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.value),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success)
              swalSuccess
                .fire("Actualizado", data.msg, "success")
                .then(() => cargarProductos(paginaActual));
            else
              swalError.fire(
                "Error",
                data.error || "No se pudo actualizar",
                "error",
              );
          });
      });
  });
}
async function solicitarAutorizacionMovimiento() {
  // Admin y root siempre tienen acceso directo.
  if (tipoUsuario === "admin" || tipoUsuario === "root") {
    return {
      permitido: true,
      codigoAdmin: null,
    };
  }

  try {
    const response = await fetch("../php/obtener_branding.php", {
      cache: "no-store",
    });

    const branding = await response.json();

    if (!response.ok || branding.ok === false) {
      throw new Error(
        branding.msg || "No se pudo consultar la configuración.",
      );
    }

    const movimientosRestringidos =
      Number(branding.restringir_movimientos) === 1;

    // Si la restricción está desactivada, conserva el comportamiento actual.
    if (!movimientosRestringidos) {
      return {
        permitido: true,
        codigoAdmin: null,
      };
    }

    // Si está restringido, el worker necesita un código administrativo.
    const resultado = await swalInfo.fire({
      title: "Autorización requerida",
      text: "Ingresa un código de administrador para realizar el movimiento.",
      input: "password",
      inputPlaceholder: "Código de administrador",
      inputAttributes: {
        autocomplete: "off",
      },
      showCancelButton: true,
      confirmButtonText: "Validar",
      cancelButtonText: "Cancelar",
      allowOutsideClick: false,

      preConfirm: async (codigo) => {
        const codigoLimpio = String(codigo || "").trim();

        if (!codigoLimpio) {
          Swal.showValidationMessage(
            "Debes ingresar un código de administrador.",
          );

          return false;
        }

        try {
          const validarResponse = await fetch(
            "../php/validar_codigo_admin.php",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                codigo: codigoLimpio,
              }),
            },
          );

          const data = await validarResponse.json();

          if (!validarResponse.ok || !data.success) {
            Swal.showValidationMessage(
              data.error || "Código inválido o no autorizado.",
            );

            return false;
          }

          // Conservamos el código para volver a validarlo en el controller.
          return codigoLimpio;
        } catch (error) {
          console.error(error);

          Swal.showValidationMessage(
            "No se pudo validar el código de administrador.",
          );

          return false;
        }
      },
    });

    if (!resultado.isConfirmed || !resultado.value) {
      return {
        permitido: false,
        codigoAdmin: null,
      };
    }

    return {
      permitido: true,
      codigoAdmin: resultado.value,
    };
  } catch (error) {
    console.error("Error al validar permisos de movimientos:", error);

    await swalError.fire(
      "Error",
      error.message || "No se pudo verificar el permiso de inventario.",
      "error",
    );

    return {
      permitido: false,
      codigoAdmin: null,
    };
  }
}
async function abrirModalMovimiento() {
  const autorizacion = await solicitarAutorizacionMovimiento();

  if (!autorizacion.permitido) {
    return;
  }

  const codigoAdminMovimiento = autorizacion.codigoAdmin;

  const html = `
    <div class="space-y-3 text-left text-sm">
      <label class="block text-slate-300 font-semibold">Buscar producto</label>
      <input id="mv-buscar" class="w-full p-2 rounded bg-slate-700 text-slate-100" placeholder="Código, nombre o descripción">

      <div id="mv-resultados" style="display:none" class="max-h-56 overflow-auto mt-2 bg-slate-800 rounded border border-slate-700"></div>

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
      Swal.getPopup().classList.add("bg-slate-800", "text-slate-100");

      const $buscar = document.getElementById("mv-buscar");
      const $res = document.getElementById("mv-resultados");
      const $info = document.getElementById("mv-info");

      const $id = document.getElementById("mv-producto-id");
      const $stock = document.getElementById("mv-stock-actual");
      const $nombre = document.getElementById("mv-nombre");
      const $codigo = document.getElementById("mv-codigo");
      const $cat = document.getElementById("mv-categoria");
      const $stockLbl = document.getElementById("mv-stock");
      const $op = document.getElementById("mv-op");
      const $cant = document.getElementById("mv-cant");
      const $preview = document.getElementById("mv-preview");

      // helpers fuertes (ganan a Tailwind)
      const showResults = () => {
        $res.style.display = "block";
      };
      const hideResults = () => {
        $res.style.display = "none";
      };

      hideResults(); // arrancar oculto

      let timer;
      const pintarPreview = () => {
        const actual = parseFloat($stock.value || "0");
        const cant = parseFloat($cant.value || "0");
        if (!cant || cant <= 0) {
          $preview.textContent = "—";
          return;
        }
        const signo = $op.value === "ingreso" ? +1 : -1;
        const nuevo = actual + signo * cant;
        $preview.textContent = nuevo < 0 ? "ERROR (negativo)" : String(nuevo);
      };

      $op.addEventListener("change", pintarPreview);
      $cant.addEventListener("input", pintarPreview);

      // buscar
      $buscar.addEventListener("input", () => {
        clearTimeout(timer);
        const q = $buscar.value.trim();

        if (!q) {
          $res.innerHTML = "";
          hideResults();
          return;
        }

        showResults();

        timer = setTimeout(async () => {
          const params = new URLSearchParams({
            limit: 10,
            offset: 0,
            busqueda: q,
          });
          const data = await fetch(
            `../php/productos_controller.php?${params}`,
          ).then((r) => r.json());

          if (!data.success || !data.productos.length) {
            $res.innerHTML = `<div class="p-3 text-slate-400">Sin resultados</div>`;
            return;
          }

          $res.innerHTML = data.productos
            .map(
              (p) => `
        <button type="button" data-id="${p.id}" data-codigo="${p.codigo}"
          data-nombre="${p.nombre}" data-stock="${p.stock}" data-cat="${p.categoria ?? ""}"
          class="w-full text-left px-3 py-2 hover:bg-slate-700">
          <div class="font-semibold">${p.codigo} — ${p.nombre}</div>
          <div class="text-xs text-slate-400">Stock: ${p.stock} · ${p.categoria ?? ""}</div>
        </button>
      `,
            )
            .join("");

          // seleccionar producto
          Array.from($res.querySelectorAll("button")).forEach((btn) => {
            btn.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();

              $id.value = btn.dataset.id;
              $stock.value = btn.dataset.stock;
              $nombre.textContent = btn.dataset.nombre;
              $codigo.textContent = `Código: ${btn.dataset.codigo}`;
              $cat.textContent = btn.dataset.cat
                ? `Categoría: ${btn.dataset.cat}`
                : "";
              $stockLbl.textContent = btn.dataset.stock;

              $info.classList.remove("hidden"); // muestra tarjeta

              $cant.value = "";
              $preview.textContent = "—";

              // cerrar lista hasta nueva escritura
              $buscar.value = `${btn.dataset.codigo} — ${btn.dataset.nombre}`; // opcional
              $res.innerHTML = "";
              hideResults();
              $buscar.blur(); // opcional
            });
          });
        }, 250);
      });

      // cerrar con ESC
      $buscar.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") {
          $res.innerHTML = "";
          hideResults();
        }
      });
    },

    preConfirm: () => {
      const producto_id = parseInt(
        document.getElementById("mv-producto-id").value || "0",
        10,
      );
      const tipo = document.getElementById("mv-op").value;
      const cantidad = parseFloat(
        document.getElementById("mv-cant").value || "0",
      );
      const nota = document.getElementById("mv-nota")
        ? document.getElementById("mv-nota").value.trim()
        : "";
      const stockActual = parseFloat(
        document.getElementById("mv-stock-actual").value || "0",
      );

      if (!producto_id) {
        Swal.showValidationMessage("Selecciona un producto de la lista.");
        return false;
      }
      if (!cantidad || cantidad <= 0) {
        Swal.showValidationMessage("La cantidad debe ser mayor a 0");
        return false;
      }
      if (tipo === "ajuste-" && stockActual - cantidad < 0) {
        Swal.showValidationMessage(
          "El movimiento dejaría el stock en negativo.",
        );
        return false;
      }
      return { producto_id, tipo, cantidad, nota, codigo_admin: String(codigoAdminMovimiento || "").trim(),};
    },
  });

  if (!value) return;

  const res = await fetch(
    "../php/productos_controller.php?accion=ajustar_stock",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    },
  ).then((r) => r.json());

  if (res.ok) {
    swalSuccess
      .fire(
        "Movimiento registrado",
        `Stock después: <b>${res.stock_despues}</b>`,
        "success",
      )
      .then(() => cargarProductos(paginaActual));
  } else {
    swalError.fire(
      "Error",
      res.error || "No se pudo registrar el movimiento",
      "error",
    );
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
      Swal.getPopup().classList.add("bg-slate-800", "text-slate-100");

      const tipoSel = document.getElementById("rep-tipo");
      const bloques = Array.from(
        document.querySelectorAll("#rep-campos [data-for]"),
      );
      const switcher = () => {
        const t = tipoSel.value;
        bloques.forEach((b) =>
          b.classList.toggle("hidden", b.getAttribute("data-for") !== t),
        );
      };
      tipoSel.addEventListener("change", switcher);
      switcher();
    },
    preConfirm: () => {
      const tipo = document.getElementById("rep-tipo").value;
      let qs = new URLSearchParams({ accion: "reporte_movimientos", tipo });

      if (tipo === "dia") {
        const f = document.getElementById("rep-dia").value;
        if (!f) {
          Swal.showValidationMessage("Selecciona una fecha");
          return false;
        }
        qs.set("fecha", f);
      } else if (tipo === "mes") {
        const m = document.getElementById("rep-mes").value;
        if (!m) {
          Swal.showValidationMessage("Selecciona un mes");
          return false;
        }
        qs.set("fecha", m); // YYYY-MM
      } else if (tipo === "anio") {
        const a = document.getElementById("rep-anio").value;
        if (!a) {
          Swal.showValidationMessage("Escribe un año");
          return false;
        }
        qs.set("fecha", a); // YYYY
      } else {
        const i = document.getElementById("rep-inicio").value;
        const f = document.getElementById("rep-fin").value;
        if (!i || !f) {
          Swal.showValidationMessage("Completa el rango");
          return false;
        }
        qs.set("inicio", i);
        qs.set("fin", f);
      }
      return qs.toString();
    },
  });

  if (!filtros) return;

  const data = await fetch(`../php/productos_controller.php?${filtros}`)
    .then((r) => r.json())
    .catch(() => ({ ok: false, error: "No se pudo obtener el reporte" }));

  if (!data.ok) {
    swalError.fire(
      "Error",
      data.error || "No se pudo obtener el reporte",
      "error",
    );
    return;
  }

  // Calcula etiqueta del filtro a partir de los parámetros usados
  const paramsSel = new URLSearchParams(filtros);
  const tipoSel = paramsSel.get("tipo");
  let etiquetaFiltro = "";
  if (tipoSel === "dia") etiquetaFiltro = `Día: ${paramsSel.get("fecha")}`;
  else if (tipoSel === "mes") etiquetaFiltro = `Mes: ${paramsSel.get("fecha")}`;
  else if (tipoSel === "anio")
    etiquetaFiltro = `Año: ${paramsSel.get("fecha")}`;
  else
    etiquetaFiltro = `Rango: ${paramsSel.get("inicio")} → ${paramsSel.get("fin")}`;

  const htmlReporte = renderReporteMovimientos(data);

  await swalcard.fire({
    title: `Movimientos (${data.desde} → ${data.hasta})`,
    width: 900,
    html: htmlReporte,
    focusConfirm: false,
    showCloseButton: true,
    showConfirmButton: false,
    didOpen: () => {
      Swal.getPopup().classList.add("bg-slate-800", "text-slate-100");
      const $btn = document.getElementById("btnPdfRep");
      if ($btn) {
        $btn.addEventListener("click", () => {
          generarPDFInventarioMovs(data, {
            etiquetaFiltro, // texto humano del filtro elegido
            tipo: tipoSel, // 'dia' | 'mes' | 'anio' | 'rango'
            desde: data.desde,
            hasta: data.hasta,
          });
        });
      }
    },
  });
}

function renderReporteMovimientos(data) {
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const cont = document.createElement("div");
  cont.className = "max-h-[70vh] overflow-auto text-sm";

  // Toolbar con botón PDF
  const toolbar = document.createElement("div");
  toolbar.className = "flex justify-end mb-3";
  toolbar.innerHTML = `
    <button id="btnPdfRep" class="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded">
      Generar PDF
    </button>
  `;
  cont.appendChild(toolbar);

  if (!data.resumen.length) {
    cont.appendChild(
      Object.assign(document.createElement("div"), {
        className: "p-4 rounded bg-slate-700 text-center",
        textContent: "Sin movimientos en el periodo seleccionado",
      }),
    );
    return cont.outerHTML;
  }

  data.resumen.forEach((p) => {
    const card = document.createElement("div");
    card.className = "mb-4 p-3 rounded-lg bg-slate-700 border border-slate-600";

    const stockAct =
      p.stock_actual === null || p.stock_actual === undefined
        ? "—"
        : p.stock_actual;

    card.innerHTML = `
  <div class="flex items-center justify-between mb-2">
    <div>
      <div class="text-xs text-slate-300">Producto</div>
      <div class="font-semibold">${esc(p.codigo)} — ${esc(p.nombre)}</div>
    </div>
    <div class="text-right">
      <div class="text-xs text-slate-300">Stock actual</div>
      <div class="font-bold">${stockAct}</div>
    </div>
  </div>
  <div class="overflow-x-auto">
    <table class="min-w-full text-left table-fixed">
    <thead class="bg-slate-700">
      <tr class="text-slate-300 text-sm uppercase">
      <th class="p-3 text-center">Fecha</th>
      <th class="p-3 text-center">Tipo</th>
      <th class="p-3 text-center">Cantidad</th>
      <th class="p-3 text-center">Stock después</th>
      <th class="p-3 text-center">Usuario</th>
      <th class="p-3 text-center">Nota</th>
  </tr>
</thead>
      <tbody class="text-slate-100">
        ${p.movimientos
          .map(
            (m) => `
        <tr class="border-t border-slate-600 align-top">
        <td class="py-1 px-2 text-center whitespace-nowrap">${esc(m.fecha)}</td>
        <td class="py-1 px-2 text-center whitespace-nowrap">${esc(m.tipo)}</td>
        <td class="py-1 px-2 text-center whitespace-nowrap">${parseFloat(m.cantidad).toFixed(2)}</td>
        <td class="py-1 px-2 text-center whitespace-nowrap">${esc(m.stock_despues)}</td>
        <td class="py-1 px-2 text-center whitespace-nowrap">${esc(m.usuario || "—")}</td>
        <td class="py-1 px-2 text-center whitespace-pre-wrap break-words text-center">${esc(m.nota || "")}</td>
    </tr>
  `,
          )
          .join("")}
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
  const doc = new jsPDF({ unit: "pt", format: "letter" }); // 612 x 792
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 40; // margen
  const FS = { title: 13, meta: 9, th: 9, td: 9 };
  const LH = { th: 16, td: 14 }; // line-heights
  let y = M;

  // Utils
  const now = new Date();
  const fechaCreacion = now.toLocaleString();

  // Lee tamaño de dataURI
  const getImageSize = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = src;
    });

  // Convierte a PNG si el mime no es PNG/JPEG
  const toPNG = (dataURL) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      };
      img.src = dataURL;
    });

  const getLogoReady = async () => {
    try {
      const r = await fetch("../php/obtener_logo.php", { cache: "no-store" });
      const j = await r.json();
      if (!j.success || !j.base64) return null;
      let dataURI = j.base64;
      let mime = (j.mime || "").toLowerCase();
      if (!/png|jpe?g/.test(mime)) {
        dataURI = await toPNG(dataURI);
        mime = "image/png";
      }
      const { w, h } = await getImageSize(dataURI);
      return { dataURI, mime, w, h };
    } catch {
      return null;
    }
  };
  // helper: 'YYYY-MM-DD' (o 'YYYY-MM-DD HH:mm:ss') -> 'dd/mm/yyyy'
  function formatDMY(iso) {
    if (!iso) return "";
    const s = String(iso).trim();
    const datePart = s.includes(" ") ? s.split(" ")[0] : s; // quita hora si viene
    const [Y, M, D] = datePart.split("-");
    return `${D}/${M}/${Y}`;
  }

  // Header de página
  // --- HEADER con logo a la DERECHA ---
  const addHeader = (firstPage = false) => {
    // barra superior suave
    const headerH = 56;
    doc.setFillColor(246, 248, 251); // gris muy claro
    doc.setDrawColor(220);
    doc.rect(M, y, pageW - 2 * M, headerH, "F");

    // medidas y posiciones base
    const paddingX = 12;
    const textX = M + paddingX;
    const textY = y + 16;

    // dibuja logo a la DERECHA
    let rightEdgeForText = pageW - M; // límite derecho del bloque de texto
    if (window.__logoReporteInv) {
      const { dataURI, mime, w, h } = window.__logoReporteInv;
      const fmt =
        mime.includes("jpeg") || mime.includes("jpg") ? "JPEG" : "PNG";
      const maxH = 48,
        maxW = 160;
      const ratio = w / h;
      const drawW = Math.min(maxW, maxH * ratio);
      const drawH = drawW / ratio;

      const xLogo = pageW - M - drawW; // 👉 alineado a la derecha
      const yLogo = y + (headerH - drawH) / 2; // centrado vertical en la barra
      doc.addImage(dataURI, fmt, xLogo, yLogo, drawW, drawH);

      rightEdgeForText = xLogo - paddingX; // deja aire antes del logo
    }

    // título + metadatos (acotados para no chocar con el logo)
    const maxTextW = Math.max(100, rightEdgeForText - textX);

    doc.setTextColor(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(
      doc.splitTextToSize("Reporte de movimientos de inventario", maxTextW),
      textX,
      textY,
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Creado: ${fechaCreacion}`, textX, textY + 16);

    // si ya formateas dd/mm/yyyy en otro lado, reusa tus helpers/variables
    const etiquetaLinea = `${meta.etiquetaFiltro}    |    Ventana: ${meta.desde}  |  ${meta.hasta}`;

    doc.text(doc.splitTextToSize(etiquetaLinea, maxTextW), textX, textY + 30);

    // línea separadora y avance
    y += headerH + 6;
    doc.setDrawColor(210);
    doc.setLineWidth(0.6);
    doc.line(M, y, pageW - M, y);
    y += 8;
  };

  // Auto salto si no cabe N px más
  const ensureSpace = (needPx) => {
    if (y + needPx > pageH - M) {
      doc.addPage();
      y = M;
      addHeader();
    }
  };

  // Dibuja encabezados de la tabla
  const drawTableHeader = (cols) => {
    ensureSpace(LH.th + 8);
    // banda oscura
    doc.setFillColor(30, 41, 59); // slate-800
    doc.setTextColor(255);
    doc.rect(M, y, pageW - 2 * M, LH.th, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS.th);
    let x = M;
    cols.forEach((c) => {
      const tw = doc.getTextWidth(c.title);
      doc.text(c.title, x + c.w / 2 - tw / 2, y + 11); // <- centrado
      x += c.w;
    });
    y += LH.th;
    doc.setTextColor(0);
  };

  // Dibuja una fila (alto dinámico por el wrap)
  const drawRow = (cols, row, zebra) => {
    const paddX = 6,
      paddY = 6;

    // pre-wrap (centramos todo; “nota” sí puede ir en varias líneas)
    const texts = cols.map((c) => {
      const val = (row[c.key] ?? "").toString();
      if (c.key === "nota") return doc.splitTextToSize(val, c.w - paddX * 2);
      return [val || ""];
    });

    const maxLines = Math.max(1, ...texts.map((t) => t.length));
    const h = paddY * 2 + maxLines * (FS.td + 3);
    ensureSpace(h);

    if (zebra) {
      doc.setFillColor(250);
      doc.rect(M, y, pageW - 2 * M, h, "F");
    }

    let x = M;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS.td);

    // colores para el chip del tipo
    const TYPE_COLORS = {
      ingreso: [34, 197, 94], // verde
      "ajuste-": [239, 68, 68], // rojo
      "ajuste+": [34, 197, 94],
      "devolucion+": [34, 197, 94],
      "devolucion-": [239, 68, 68],
    };

    cols.forEach((c, i) => {
      const lines = texts[i];

      if (c.key === "tipo") {
        // dibuja "chip" centrado
        const label = (row.tipo || "").toString();
        const color = TYPE_COLORS[label] || [100, 116, 139]; // slate-500 fallback
        const tw = doc.getTextWidth(label);
        const chipW = tw + 14,
          chipH = FS.td + 6;
        const cx = x + (c.w - chipW) / 2;
        const cy = y + (h - chipH) / 2;

        doc.setFillColor(color[0], color[1], color[2]);
        if (doc.roundedRect) doc.roundedRect(cx, cy, chipW, chipH, 4, 4, "F");
        else doc.rect(cx, cy, chipW, chipH, "F");

        doc.setTextColor(255);
        doc.setFont("helvetica", "bold");
        doc.text(label, x + c.w / 2 - tw / 2, cy + chipH / 2 + 3); // centrado en el chip
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
      } else {
        // centrar horizontal y verticalmente
        const blockH = lines.length * (FS.td + 3) - 3;
        let yy = y + h / 2 - blockH / 2 + 9;
        lines.forEach((l) => {
          const lw = doc.getTextWidth(l);
          doc.text(l, x + c.w / 2 - lw / 2, yy); // <- centrado
          yy += FS.td + 3;
        });
      }

      x += c.w;
    });

    y += h;
    doc.setDrawColor(230);
    doc.setLineWidth(0.3);
    doc.line(M, y, pageW - M, y);
    doc.setDrawColor(0);
  };

  // Precarga logo una vez
  if (!window.__logoReporteInv) window.__logoReporteInv = await getLogoReady();

  addHeader();

  // === Columnas (ancho pensado para que Nota tenga espacio) ===
  // Suma fija: 120 + 70 + 60 + 95 + 120 = 465; resto para Nota
  const fixedSum =
    100 /*Fecha  << antes 120*/ +
    80 /*Tipo*/ +
    55 /*Cant. << antes 70*/ +
    80 /*Stock << antes 100*/ +
    120; /*Usuario (ajústalo a 110 si necesitas más aire)*/

  const fudge = 6; // pequeño margen para evitar desbordes
  const notaW = pageW - M * 2 - fixedSum - fudge;

  const COLS = [
    { key: "fecha", title: "Fecha", w: 100 },
    { key: "tipo", title: "Tipo", w: 80 },
    { key: "cantidad", title: "Cant.", w: 55 },
    { key: "stock_despues", title: "Stock después", w: 80 },
    { key: "usuario", title: "Usuario", w: 120 },
    { key: "nota", title: "Nota", w: notaW }, // ahora más ancha
  ];

  // === Por cada producto ===
  data.resumen.forEach((p, idx) => {
    // Título de producto
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${p.codigo} — ${p.nombre}`, M, y + 10);

    // "Stock actual" completamente a la derecha
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const stockAct = p.stock_actual ?? "—";
    const label = `Stock actual: ${stockAct}`;
    const labelW = doc.getTextWidth(label);
    doc.text(label, pageW - M - labelW, y + 10);

    y += 16;

    // Encabezado de tabla
    drawTableHeader(COLS);

    // Filas
    p.movimientos.forEach((m, i) => {
      drawRow(
        COLS,
        {
          fecha: m.fecha || "",
          tipo: m.tipo || "",
          cantidad: parseFloat(m.cantidad || 0).toFixed(2),
          stock_despues: String(m.stock_despues ?? ""),
          usuario: m.usuario || "—",
          // Nota tal cual, con wrap interno (no se verá vertical)
          nota: m.nota || "",
        },
        i % 2 === 1,
      ); // zebra
    });

    y += 8;
    if (idx < data.resumen.length - 1) {
      ensureSpace(14);
      doc.setDrawColor(180);
      doc.setLineWidth(0.6);
      doc.line(M, y, pageW - M, y);
      doc.setDrawColor(0);
      y += 10;
    }
  });

  // Pie con paginación
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    const t = `Página ${i} de ${totalPages}`;
    doc.text(t, pageW - M - doc.getTextWidth(t), pageH - M / 2);
    doc.setTextColor(0);
  }

  const fileName = `reporte_inventario_${meta.desde}_a_${meta.hasta}.pdf`;

  try {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) doc.output("dataurlnewwindow", { filename: fileName });
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    doc.save(fileName);
  }
}

/*
|--------------------------------------------------------------------------
| Ticket de inventario 58 mm
|-------------------------------------------------------------------------- 
*/

async function obtenerBrandingInventarioTicket() {
  const brandingDefault = {
    app_name: "Gym Admin",
    logo: "../php/logo_branding.php",
    tipo_impresora: "48 mm",
  };

  const branding = { ...brandingDefault };

  try {
    const response = await fetch("../php/obtener_branding.php", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    branding.app_name =
      data.app_name || brandingDefault.app_name;

    branding.logo = data.logo_etag
      ? `../php/logo_branding.php?v=${encodeURIComponent(data.logo_etag)}`
      : "../php/logo_branding.php";
  } catch (error) {
    console.warn(
      "No se pudo cargar el branding para el ticket de inventario:",
      error,
    );
  }

  try {
    const response = await fetch(
      "../php/obtener_tipo_impresora.php",
      {
        cache: "no-store",
      },
    );

    const impresora = await response.json();

    if (response.ok && impresora.ok !== false) {
      branding.tipo_impresora =
        impresora.tipo_impresora || "48 mm";
    }
  } catch (error) {
    console.warn(
      "No se pudo obtener el tamaño de impresora:",
      error,
    );
  }

  return branding;
}
const configuracionesTicketInventario = {
  "48 mm": {
    ancho: 48,
    margen: 3,
    anchoLogo: 36,

    fuenteNombreGym: 11,
    fuenteTitulo: 9,
    fuenteCategoria: 9.5,
    fuenteProducto: 9,
    fuenteTexto: 8,
    fuenteTotales: 8.5,
    fuenteFinal: 7.5,
    fuenteMarca: 6.5,
  },

  "58 mm": {
    ancho: 58,
    margen: 4,
    anchoLogo: 42,

    fuenteNombreGym: 12,
    fuenteTitulo: 10,
    fuenteCategoria: 10,
    fuenteProducto: 9.5,
    fuenteTexto: 9,
    fuenteTotales: 9.5,
    fuenteFinal: 8.5,
    fuenteMarca: 7.5,
  },
};


function cargarImagenInventarioTicket(ruta) {
  return new Promise((resolve) => {
    if (!ruta) {
      resolve(null);
      return;
    }

    const imagen = new Image();

    imagen.onload = function () {
      try {
        const canvas = document.createElement("canvas");

        canvas.width = this.naturalWidth || this.width;
        canvas.height = this.naturalHeight || this.height;

        const contexto = canvas.getContext("2d");

        contexto.drawImage(this, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        console.warn("No se pudo convertir el logo del inventario:", error);

        resolve(null);
      }
    };

    imagen.onerror = function () {
      console.warn("No se pudo cargar el logo del inventario:", ruta);

      resolve(null);
    };

    imagen.src = ruta;
  });
}

function dineroInventarioTicket(valor) {
  return `$${Number(valor || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function centrarInventarioTicket(
  doc,
  texto,
  y,
  medidas
) {
  const centro = medidas.ancho / 2;

  doc.text(
    String(texto ?? ""),
    centro,
    y,
    {
      align: "center",
    },
  );
}

function lineaInventarioTicket(
  doc,
  y,
  tipo = "-",
  medidas
) {
  const izquierda = medidas.margen;
  const derecha = medidas.ancho - medidas.margen;

  doc.setDrawColor(0);

  if (tipo === "=") {
    // Línea más marcada para encabezados y totales
    doc.setLineWidth(0.4);
  } else {
    // Línea normal
    doc.setLineWidth(0.2);
  }

  doc.line(
    izquierda,
    y,
    derecha,
    y
  );

  // Avanzamos después de la línea
  return y + 4;
}
function separadorProductoInventario(
  doc,
  y,
  medidas
) {
  const izquierda = medidas.margen;
  const derecha = medidas.ancho - medidas.margen;

  // Línea punteada entre productos
  doc.setDrawColor(120);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([0.8, 0.8], 0);

  doc.line(
    izquierda,
    y,
    derecha,
    y
  );

  // Restaurar línea normal
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(0);

  // Continuar debajo del separador
  return y + 3;
}
function tituloInventarioTicket(
  doc,
  texto,
  y,
  medidas
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(medidas.fuenteCategoria);

  centrarInventarioTicket(
    doc,
    String(texto ?? "").toUpperCase(),
    y,
    medidas
  );

  // Espacio después del título de la categoría
  return y + 5;
}
function textoInventarioIzquierdaDerecha(
  doc,
  izquierda,
  derecha,
  y,
  opciones = {},
  medidas
) {
  const {
    negrita = false,
    tamano = medidas.fuenteTexto,
  } = opciones;

  const xIzquierda = medidas.margen;
  const xDerecha = medidas.ancho - medidas.margen;

  doc.setFont(
    "helvetica",
    negrita ? "bold" : "normal"
  );

  doc.setFontSize(tamano);

  doc.text(
    String(izquierda ?? ""),
    xIzquierda,
    y
  );

  doc.text(
    String(derecha ?? ""),
    xDerecha,
    y,
    {
      align: "right",
    }
  );

  // Avanzar a la siguiente línea
  return y + 4;
}

function textoInventarioMultilinea(
  doc,
  texto,
  y,
  opciones = {},
  medidas
) {
  const {
    negrita = false,
    tamano = medidas.fuenteProducto,
  } = opciones;

  const anchoContenido =
    medidas.ancho - (medidas.margen * 2);

  doc.setFont(
    "helvetica",
    negrita ? "bold" : "normal"
  );

  doc.setFontSize(tamano);

  const lineas = doc.splitTextToSize(
    String(texto ?? ""),
    anchoContenido
  );

  lineas.forEach((linea) => {
    doc.text(
      linea,
      medidas.margen,
      y
    );

    y += 4;
  });

  return y;
}

function calcularAlturaTicketInventario(
  doc,
  productos,
  categorias,
  altoLogo,
  nombreGym,
  medidas
) {
  const anchoContenido =
    medidas.ancho - (medidas.margen * 2);

  /*
   * Comenzamos en la misma posición que
   * construirTicketInventario58mm()
   */
  let altura = 4;

  /*
   * ==============================
   * LOGO
   * ==============================
   */
  if (altoLogo > 0) {
    // Alto del logo + los 10 mm de separación
    altura += altoLogo + 10;
  }

  /*
   * ==============================
   * NOMBRE DEL GIMNASIO
   * ==============================
   */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(medidas.fuenteNombreGym);

  const lineasNombreGym = doc.splitTextToSize(
    String(nombreGym || "Gym Admin"),
    anchoContenido
  );

  altura += lineasNombreGym.length * 4;

  // Separación después del nombre
  altura += 1;

  /*
   * Título INVENTARIO DE PRODUCTOS
   */
  altura += 5;

  /*
   * Fecha de generación
   */
  altura += 4;

  /*
   * Línea divisoria
   */
  altura += 4;

  /*
   * ==============================
   * CATEGORÍAS Y PRODUCTOS
   * ==============================
   */
  categorias.forEach((categoria) => {
    /*
     * El título recibe y + 1 y después
     * tituloInventarioTicket() avanza 5 mm.
     */
    altura += 6;

    const productosCategoria = productos.filter(
      (producto) =>
        (producto.categoria || "Sin categoría") === categoria
    );

    productosCategoria.forEach((producto) => {
      /*
       * Primera línea:
       * código + precio
       */
      altura += 4;

      /*
       * Nombre del producto.
       * Debemos medirlo con la misma fuente
       * utilizada al imprimirlo.
       */
      doc.setFont("helvetica", "bold");
      doc.setFontSize(medidas.fuenteProducto);

      const nombreProducto = String(
        producto.nombre || "Producto sin nombre"
      ).toUpperCase();

      const lineasNombre = doc.splitTextToSize(
        nombreProducto,
        anchoContenido
      );

      altura += lineasNombre.length * 4;

      /*
       * Línea STOCK
       */
      altura += 4;

      /*
       * Separador del producto.
       * En la función principal se llama con y + 1
       * y el separador devuelve y + 3.
       */
      altura += 4;
    });

    /*
     * Línea final de categoría
     */
    altura += 4;

    /*
     * TOTAL CATEGORÍA
     */
    altura += 4;
  });

  /*
   * ==============================
   * TOTALES FINALES
   * ==============================
   */

  // lineaInventarioTicket(doc, y + 2, "=")
  altura += 6;

  // TOTAL PRODUCTOS
  altura += 4;

  // UNIDADES TOTALES
  altura += 4;

  // Línea final
  altura += 4;

  // FIN DEL INVENTARIO
  altura += 7;

  // SMARTGATE + margen inferior de seguridad
  altura += 6;

  /*
   * Altura mínima para inventarios pequeños.
   */
  return Math.max(altura, 120);
}

async function construirTicketInventario58mm() {
  const { jsPDF } = window.jspdf;

  /*
   * ==============================
   * CONSULTAR INVENTARIO COMPLETO
   * ==============================
   */
  const response = await fetch(
    "../php/productos_controller.php?accion=inventario_ticket",
    {
      cache: "no-store",
    },
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(
      data.error || "No se pudo obtener el inventario.",
    );
  }

  /*
   * El producto con código 1 representa visitas
   * y no forma parte del inventario físico.
   */
  const productos = (
    Array.isArray(data.productos)
      ? data.productos
      : []
  ).filter(
    (producto) =>
      String(producto.codigo || "").trim() !== "1",
  );

  if (!productos.length) {
    throw new Error(
      "No hay productos para imprimir en el inventario.",
    );
  }

  /*
   * ==============================
   * ORDENAR POR CATEGORÍA Y NOMBRE
   * ==============================
   */
  productos.sort((a, b) => {
    const categoriaA = String(
      a.categoria || "Sin categoría",
    ).toLocaleLowerCase("es");

    const categoriaB = String(
      b.categoria || "Sin categoría",
    ).toLocaleLowerCase("es");

    const comparacionCategoria =
      categoriaA.localeCompare(
        categoriaB,
        "es",
      );

    if (comparacionCategoria !== 0) {
      return comparacionCategoria;
    }

    return String(
      a.nombre || "",
    ).localeCompare(
      String(b.nombre || ""),
      "es",
    );
  });

  const categorias = [
    ...new Set(
      productos.map(
        (producto) =>
          producto.categoria ||
          "Sin categoría",
      ),
    ),
  ];

  /*
   * ==============================
   * BRANDING Y TIPO DE IMPRESORA
   * ==============================
   */
  const branding =
    await obtenerBrandingInventarioTicket();

  const nombreGym =
    branding.app_name || "Gym Admin";

  /*
   * Seleccionamos automáticamente
   * configuración de 48 o 58 mm.
   */
  const tipoImpresora =
    branding.tipo_impresora || "48 mm";

  const medidas =
    configuracionesTicketInventario[
      tipoImpresora
    ] ||
    configuracionesTicketInventario[
      "48 mm"
    ];

  const anchoContenido =
    medidas.ancho -
    (medidas.margen * 2);

  const centro =
    medidas.ancho / 2;

  const logo =
    await cargarImagenInventarioTicket(
      branding.logo,
    );

  /*
   * ==============================
   * DOCUMENTO TEMPORAL DE MEDICIÓN
   * ==============================
   */
  const docMedicion = new jsPDF({
    unit: "mm",
    format: [medidas.ancho, 150],
    orientation: "portrait",
  });

  let altoLogo = 0;

  if (logo) {
    try {
      const propiedadesLogo =
        docMedicion.getImageProperties(
          logo,
        );

      altoLogo =
        (
          propiedadesLogo.height *
          medidas.anchoLogo
        ) /
        propiedadesLogo.width;
    } catch (error) {
      console.warn(
        "No se pudo medir el logo del inventario:",
        error,
      );
    }
  }

  /*
   * ==============================
   * ALTURA DINÁMICA DEL TICKET
   * ==============================
   */
  const alturaTicket =
    calcularAlturaTicketInventario(
      docMedicion,
      productos,
      categorias,
      altoLogo,
      nombreGym,
      medidas,
    );

  /*
   * ==============================
   * DOCUMENTO DEFINITIVO
   * ==============================
   */
  const doc = new jsPDF({
    unit: "mm",
    format: [
      medidas.ancho,
      alturaTicket,
    ],
    orientation: "portrait",
  });

  let y = 4;

  /*
   * ==============================
   * LOGO
   * ==============================
   */
  if (logo) {
    try {
      const propiedadesLogo =
        doc.getImageProperties(logo);

      const anchoLogo =
        medidas.anchoLogo;

      const altoLogo =
        (
          propiedadesLogo.height *
          anchoLogo
        ) /
        propiedadesLogo.width;

      const posicionX =
        centro -
        (anchoLogo / 2);

      doc.addImage(
        logo,
        undefined,
        posicionX,
        y,
        anchoLogo,
        altoLogo,
      );

      // Conservamos los 10 mm
      // entre logo y nombre.
      y += altoLogo + 10;
    } catch (error) {
      console.warn(
        "No se pudo agregar el logo al ticket de inventario:",
        error,
      );
    }
  }

  /*
   * ==============================
   * NOMBRE DEL GIMNASIO
   * ==============================
   */
  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(
    medidas.fuenteNombreGym,
  );

  const lineasNombreGym =
    doc.splitTextToSize(
      nombreGym,
      anchoContenido,
    );

  lineasNombreGym.forEach(
    (linea) => {
      centrarInventarioTicket(
        doc,
        linea,
        y,
        medidas,
      );

      y += 4;
    },
  );

  y += 1;

  /*
   * ==============================
   * TÍTULO
   * ==============================
   */
  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(
    medidas.fuenteTitulo,
  );

  centrarInventarioTicket(
    doc,
    "INVENTARIO DE PRODUCTOS",
    y,
    medidas,
  );

  y += 5;

  /*
   * ==============================
   * FECHA DE GENERACIÓN
   * ==============================
   */
  const ahora = new Date();

  const fecha =
    ahora.toLocaleDateString(
      "es-MX",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    );

  const hora =
    ahora.toLocaleTimeString(
      "es-MX",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(
    medidas.fuenteTexto,
  );

  centrarInventarioTicket(
    doc,
    `GENERADO: ${fecha} ${hora}`,
    y,
    medidas,
  );

  y += 4;

  y = lineaInventarioTicket(
    doc,
    y,
    "=",
    medidas,
  );

  /*
   * ==============================
   * TOTALES GENERALES
   * ==============================
   */
  const cantidadProductos =
    productos.length;

  const cantidadTotalStock =
    productos.reduce(
      (total, producto) =>
        total +
        Number(producto.stock || 0),
      0,
    );

  /*
   * ==============================
   * PRODUCTOS POR CATEGORÍA
   * ==============================
   */
  categorias.forEach(
    (categoria) => {
      const productosCategoria =
        productos.filter(
          (producto) =>
            (
              producto.categoria ||
              "Sin categoría"
            ) === categoria,
        );

      y = tituloInventarioTicket(
        doc,
        categoria,
        y + 1,
        medidas,
      );

      productosCategoria.forEach(
        (producto) => {
          const codigo =
            producto.codigo ||
            "SIN CÓDIGO";

          const precio =
            Number(
              producto.precio || 0,
            );

          const stock =
            Number(
              producto.stock || 0,
            );

          /*
           * Código y precio
           */
          y =
            textoInventarioIzquierdaDerecha(
              doc,
              codigo,
              dineroInventarioTicket(
                precio,
              ),
              y,
              {
                tamano:
                  medidas.fuenteTexto,
              },
              medidas,
            );

          /*
           * Nombre del producto
           */
          y =
            textoInventarioMultilinea(
              doc,
              String(
                producto.nombre ||
                "Producto sin nombre",
              ).toUpperCase(),
              y,
              {
                negrita: true,
                tamano:
                  medidas.fuenteProducto,
              },
              medidas,
            );

          /*
           * Stock
           */
          y =
            textoInventarioIzquierdaDerecha(
              doc,
              "STOCK",
              stock,
              y,
              {
                tamano:
                  medidas.fuenteTexto,
              },
              medidas,
            );

          /*
           * Separador punteado
           */
          y =
            separadorProductoInventario(
              doc,
              y + 1,
              medidas,
            );
        },
      );

      /*
       * Total de categoría
       */
      y = lineaInventarioTicket(
        doc,
        y,
        "-",
        medidas,
      );

      const totalCategoria =
        productosCategoria.reduce(
          (total, producto) =>
            total +
            Number(
              producto.stock || 0,
            ),
          0,
        );

      y =
        textoInventarioIzquierdaDerecha(
          doc,
          "TOTAL CATEGORÍA",
          totalCategoria,
          y,
          {
            negrita: true,
            tamano:
              medidas.fuenteTexto,
          },
          medidas,
        );
    },
  );

  /*
   * ==============================
   * TOTAL FINAL
   * ==============================
   */
  y = lineaInventarioTicket(
    doc,
    y + 2,
    "=",
    medidas,
  );

  y =
    textoInventarioIzquierdaDerecha(
      doc,
      "TOTAL PRODUCTOS",
      cantidadProductos,
      y,
      {
        negrita: true,
        tamano:
          medidas.fuenteTotales,
      },
      medidas,
    );

  y =
    textoInventarioIzquierdaDerecha(
      doc,
      "UNIDADES TOTALES",
      cantidadTotalStock,
      y,
      {
        negrita: true,
        tamano:
          medidas.fuenteTotales,
      },
      medidas,
    );

  y = lineaInventarioTicket(
    doc,
    y,
    "=",
    medidas,
  );

  /*
   * ==============================
   * FINAL DEL TICKET
   * ==============================
   */
  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(
    medidas.fuenteFinal,
  );

  centrarInventarioTicket(
    doc,
    "FIN DEL INVENTARIO",
    y + 2,
    medidas,
  );

  y += 7;

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(
    medidas.fuenteMarca,
  );

  centrarInventarioTicket(
    doc,
    "SMARTGATE",
    y,
    medidas,
  );

  return doc;
}

async function generarTicketInventario58mm() {
  try {
    swalInfo.fire({
      title: "Generando ticket...",
      text: "Preparando inventario en formato Ticket",
      allowOutsideClick: false,
      allowEscapeKey: false,

      didOpen: () => {
        Swal.showLoading();
      },
    });

    const doc = await construirTicketInventario58mm();

    Swal.close();

    const url = doc.output("bloburl");

    const ventana = window.open(url, "_blank");

    if (!ventana) {
      throw new Error(
        "El navegador bloqueó la ventana del ticket. Permite las ventanas emergentes e intenta nuevamente.",
      );
    }
  } catch (error) {
    console.error("Error generando ticket de inventario:", error);

    Swal.close();

    swalError.fire(
      "Error",
      error.message || "No se pudo generar el ticket de inventario.",
      "error",
    );
  }
}
