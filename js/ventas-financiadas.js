/* =========================================================
   ventas-financiadas.js
   Vista: vistas/admin/ventas-financiadas.php
   Controller: ../php/ventas_financiadas_controller.php
========================================================= */

const API_VENTAS_FINANCIADAS = "../php/ventas_financiadas_controller.php";

let productosFinanciados = [];
let productoSeleccionado = null;

let paginaActual = 1;
let limitePorPagina = 20;
let ultimaVentaDetalle = null;

/* =========================================================
   HELPERS
========================================================= */

function $(id) {
  return document.getElementById(id);
}

function money(value) {
  const number = Number(value || 0);

  return number.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

function numberValue(id) {
  const el = $(id);
  if (!el) return 0;

  const value = parseFloat(el.value);
  return Number.isFinite(value) ? value : 0;
}

function intValue(id) {
  const el = $(id);
  if (!el) return 0;

  const value = parseInt(el.value, 10);
  return Number.isFinite(value) ? value : 0;
}

function textValue(id) {
  const el = $(id);
  return el ? el.value.trim() : "";
}

function setValue(id, value) {
  const el = $(id);
  if (el) el.value = value;
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function show(el) {
  if (!el) return;
  el.classList.remove("hidden");
}

function hide(el) {
  if (!el) return;
  el.classList.add("hidden");
}

function openModal(id) {
  const modal = $(id);
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  if (window.lucide) {
    lucide.createIcons();
  }
}

function closeModal(id) {
  const modal = $(id);
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function estadoBadge(estado) {
  const estadoNormalizado = String(estado || "").toLowerCase();

  const clases = {
    activa: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    liquidada: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    vencida: "bg-red-500/20 text-red-300 border-red-500/30",
    cancelada: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    pendiente: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    parcial: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    pagada: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  };

  const clase =
    clases[estadoNormalizado] ||
    "bg-slate-500/20 text-slate-300 border-slate-500/30";

  return `
    <span class="inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${clase}">
      ${estadoNormalizado || "sin estado"}
    </span>
  `;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function apiRequest(params, method = "POST") {
  const formData = new FormData();

  Object.keys(params).forEach((key) => {
    formData.append(key, params[key]);
  });

  const response = await fetch(API_VENTAS_FINANCIADAS, {
    method,
    body: formData,
  });

  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error("El servidor no regresó una respuesta JSON válida.");
  }

  if (!data.success) {
    throw new Error(data.detalle || data.error || "Ocurrió un error.");
  }

  return data;
}

/* =========================================================
   INICIALIZACIÓN
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  inicializarEventos();
  inicializarFechaPrimerPago();
  calcularResumenFinanciamiento();
  listarVentasFinanciadas();

  if (window.lucide) {
    lucide.createIcons();
  }
});

function inicializarEventos() {
  $("btnAbrirNuevaVenta")?.addEventListener("click", () => {
    limpiarFormularioNuevaVenta();
    openModal("modalNuevaVenta");
  });

  $("btnCerrarNuevaVenta")?.addEventListener("click", () =>
    closeModal("modalNuevaVenta"),
  );
  $("btnCancelarNuevaVenta")?.addEventListener("click", () =>
    closeModal("modalNuevaVenta"),
  );

  $("btnRecargarVentas")?.addEventListener("click", () => {
    paginaActual = 1;
    listarVentasFinanciadas();
  });

  $("btnBuscarVentas")?.addEventListener("click", () => {
    paginaActual = 1;
    listarVentasFinanciadas();
  });

  $("filtroBusqueda")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      paginaActual = 1;
      listarVentasFinanciadas();
    }
  });

  $("filtroEstado")?.addEventListener("change", () => {
    paginaActual = 1;
    listarVentasFinanciadas();
  });

  $("btnPaginaAnterior")?.addEventListener("click", () => {
    if (paginaActual > 1) {
      paginaActual--;
      listarVentasFinanciadas();
    }
  });

  $("btnPaginaSiguiente")?.addEventListener("click", () => {
    paginaActual++;
    listarVentasFinanciadas();
  });

  $("buscarClienteFinanciado")?.addEventListener(
    "input",
    debounce(buscarClientes, 350),
  );
  $("buscarProductoFinanciado")?.addEventListener(
    "input",
    debounce(buscarProductos, 350),
  );

  $("btnAgregarProductoFinanciado")?.addEventListener(
    "click",
    agregarProductoFinanciado,
  );

  $("mesesFinanciamiento")?.addEventListener(
    "input",
    calcularResumenFinanciamiento,
  );
  $("comisionPorcentaje")?.addEventListener(
    "input",
    calcularResumenFinanciamiento,
  );
  $("engancheFinanciamiento")?.addEventListener(
    "input",
    calcularResumenFinanciamiento,
  );

  $("btnGuardarVentaFinanciada")?.addEventListener(
    "click",
    guardarVentaFinanciada,
  );

  $("btnCerrarDetalle")?.addEventListener("click", () =>
    closeModal("modalDetalleVenta"),
  );

  $("btnAbrirAbonoDesdeDetalle")?.addEventListener("click", () => {
    const ventaId = intValue("detalleVentaId");
    const saldoActual = Number(ultimaVentaDetalle?.venta?.saldo_actual || 0);

    abrirModalAbono(ventaId, 0, saldoActual);
  });

  $("btnCerrarAbono")?.addEventListener("click", () =>
    closeModal("modalAbono"),
  );
  $("btnCancelarAbono")?.addEventListener("click", () =>
    closeModal("modalAbono"),
  );
  $("btnGuardarAbono")?.addEventListener("click", guardarAbono);

  document.addEventListener("click", (event) => {
    const clientesBox = $("resultadosClientes");
    const productosBox = $("resultadosProductos");

    if (
      clientesBox &&
      !$("buscarClienteFinanciado")?.contains(event.target) &&
      !clientesBox.contains(event.target)
    ) {
      hide(clientesBox);
    }

    if (
      productosBox &&
      !$("buscarProductoFinanciado")?.contains(event.target) &&
      !productosBox.contains(event.target)
    ) {
      hide(productosBox);
    }
  });
}

function debounce(fn, delay = 300) {
  let timer = null;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function inicializarFechaPrimerPago() {
  const input = $("fechaPrimerPago");

  if (!input) return;

  const hoy = new Date();
  hoy.setMonth(hoy.getMonth() + 1);

  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");

  input.value = `${yyyy}-${mm}-${dd}`;
}

/* =========================================================
   CLIENTES
========================================================= */

async function buscarClientes() {
  const q = textValue("buscarClienteFinanciado");
  const box = $("resultadosClientes");

  if (!box) return;

  if (q.length < 2) {
    hide(box);
    box.innerHTML = "";
    return;
  }

  try {
    const data = await apiRequest({
      accion: "buscar_clientes",
      q,
    });

    renderResultadosClientes(data.clientes || []);
  } catch (error) {
    box.innerHTML = `
      <div class="px-4 py-3 text-sm text-red-300">
        ${escapeHTML(error.message)}
      </div>
    `;
    show(box);
  }
}

function renderResultadosClientes(clientes) {
  const box = $("resultadosClientes");

  if (!box) return;

  if (!clientes.length) {
    box.innerHTML = `
      <div class="px-4 py-3 text-sm text-slate-400">
        No se encontraron clientes. Puedes capturarlo manualmente.
      </div>
    `;
    show(box);
    return;
  }

  box.innerHTML = clientes
    .map((cliente) => {
      const nombre =
        cliente.nombre_completo ||
        `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim();

      return `
      <button type="button"
        class="w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800 last:border-b-0"
        onclick='seleccionarClienteFinanciado(${JSON.stringify({
          id: cliente.id,
          nombre,
          telefono: cliente.telefono || "",
          email: cliente.email || "",
          direccion: cliente.direccion || "",
        })})'>
        <div class="font-semibold text-white">${escapeHTML(nombre)}</div>
        <div class="text-xs text-slate-400">
          ${escapeHTML(cliente.telefono || "Sin teléfono")} 
          ${cliente.email ? " · " + escapeHTML(cliente.email) : ""}
        </div>
      </button>
    `;
    })
    .join("");

  show(box);
}

function seleccionarClienteFinanciado(cliente) {
  setValue("buscarClienteFinanciado", cliente.nombre || "");
  setValue("clienteNombre", cliente.nombre || "");
  setValue("clienteTelefono", cliente.telefono || "");
  setValue("clienteEmail", cliente.email || "");
  setValue("clienteDireccion", cliente.direccion || "");
  setValue("clienteOrigen", "smartgate_clientes");
  setValue("clienteReferencia", cliente.id || "");

  hide($("resultadosClientes"));
}

/* =========================================================
   PRODUCTOS
========================================================= */

async function buscarProductos() {
  const q = textValue("buscarProductoFinanciado");
  const box = $("resultadosProductos");

  if (!box) return;

  if (q.length < 2) {
    hide(box);
    box.innerHTML = "";
    return;
  }

  try {
    const data = await apiRequest({
      accion: "buscar_productos",
      q,
    });

    renderResultadosProductos(data.productos || []);
  } catch (error) {
    box.innerHTML = `
      <div class="px-4 py-3 text-sm text-red-300">
        ${escapeHTML(error.message)}
      </div>
    `;
    show(box);
  }
}

function renderResultadosProductos(productos) {
  const box = $("resultadosProductos");

  if (!box) return;

  if (!productos.length) {
    box.innerHTML = `
      <div class="px-4 py-3 text-sm text-slate-400">
        No se encontraron productos.
      </div>
    `;
    show(box);
    return;
  }

  box.innerHTML = productos
    .map((producto) => {
      const sinStock = Number(producto.stock || 0) <= 0;

      return `
      <button type="button"
        class="w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800 last:border-b-0 ${sinStock ? "opacity-60" : ""}"
        onclick='seleccionarProductoFinanciado(${JSON.stringify(producto)})'>
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="font-semibold text-white">
              ${escapeHTML(producto.nombre)}
            </div>
            <div class="text-xs text-slate-400">
              Código: ${escapeHTML(producto.codigo || "-")} · Stock: ${producto.stock ?? 0}
            </div>
          </div>
          <div class="text-right">
            <div class="font-bold text-emerald-300">${money(producto.precio)}</div>
            ${sinStock ? '<div class="text-xs text-red-300">Sin stock</div>' : ""}
          </div>
        </div>
      </button>
    `;
    })
    .join("");

  show(box);
}

function seleccionarProductoFinanciado(producto) {
  productoSeleccionado = {
    id: Number(producto.id),
    codigo: producto.codigo || "",
    nombre: producto.nombre || "",
    descripcion: producto.descripcion || "",
    precio: Number(producto.precio || 0),
    stock: Number(producto.stock || 0),
  };

  setValue("productoSeleccionadoId", productoSeleccionado.id);
  setValue("productoSeleccionadoCodigo", productoSeleccionado.codigo);
  setValue("productoSeleccionadoNombre", productoSeleccionado.nombre);
  setValue("productoSeleccionadoStock", productoSeleccionado.stock);

  setValue("buscarProductoFinanciado", productoSeleccionado.nombre);
  setValue("productoPrecio", productoSeleccionado.precio);
  setValue("productoCantidad", 1);

  const info = $("productoSeleccionadoInfo");

  if (info) {
    info.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <span class="font-semibold text-white">${escapeHTML(productoSeleccionado.nombre)}</span>
          <span class="text-slate-400"> · Código: ${escapeHTML(productoSeleccionado.codigo || "-")}</span>
        </div>
        <div>
          <span class="text-slate-400">Stock:</span>
          <span class="font-bold ${productoSeleccionado.stock > 0 ? "text-emerald-300" : "text-red-300"}">
            ${productoSeleccionado.stock}
          </span>
        </div>
      </div>
    `;
    show(info);
  }

  hide($("resultadosProductos"));
}

function agregarProductoFinanciado() {
  if (!productoSeleccionado || !productoSeleccionado.id) {
    Swal.fire({
      icon: "warning",
      title: "Selecciona un producto",
      text: "Primero busca y selecciona un producto.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }

  const cantidad = intValue("productoCantidad");
  const precioUnitario = numberValue("productoPrecio");

  if (cantidad <= 0) {
    Swal.fire({
      icon: "warning",
      title: "Cantidad inválida",
      text: "La cantidad debe ser mayor a 0.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }

  if (precioUnitario <= 0) {
    Swal.fire({
      icon: "warning",
      title: "Precio inválido",
      text: "El precio debe ser mayor a 0.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }
  if (productoSeleccionado.stock <= 0) {
    Swal.fire({
      icon: "error",
      title: "Producto sin stock",
      text: "No puedes agregar un producto que no tiene stock disponible.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }

  if (productoSeleccionado.stock < cantidad) {
    Swal.fire({
      icon: "error",
      title: "Stock insuficiente",
      text: `Stock disponible: ${productoSeleccionado.stock}`,
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }

  const existente = productosFinanciados.find(
    (p) => p.producto_id === productoSeleccionado.id,
  );

  if (existente) {
    const nuevaCantidad = existente.cantidad + cantidad;

    if (nuevaCantidad > productoSeleccionado.stock) {
      Swal.fire({
        icon: "error",
        title: "Stock insuficiente",
        text: `Ya agregaste ${existente.cantidad}. Stock disponible: ${productoSeleccionado.stock}`,
        background: "#1e293b",
        color: "#f8fafc",
      });
      return;
    }

    existente.cantidad = nuevaCantidad;
    existente.precio_unitario = precioUnitario;
    existente.subtotal = Number(
      (existente.cantidad * existente.precio_unitario).toFixed(2),
    );
  } else {
    productosFinanciados.push({
      producto_id: productoSeleccionado.id,
      codigo: productoSeleccionado.codigo,
      nombre: productoSeleccionado.nombre,
      descripcion: productoSeleccionado.descripcion,
      stock: productoSeleccionado.stock,
      cantidad,
      precio_unitario: precioUnitario,
      subtotal: Number((cantidad * precioUnitario).toFixed(2)),
    });
  }

  limpiarSeleccionProducto();
  renderProductosFinanciados();
  calcularResumenFinanciamiento();
}

function limpiarSeleccionProducto() {
  productoSeleccionado = null;

  setValue("productoSeleccionadoId", "");
  setValue("productoSeleccionadoCodigo", "");
  setValue("productoSeleccionadoNombre", "");
  setValue("productoSeleccionadoStock", "0");

  setValue("buscarProductoFinanciado", "");
  setValue("productoCantidad", "1");
  setValue("productoPrecio", "");

  const info = $("productoSeleccionadoInfo");
  if (info) {
    info.innerHTML = "";
    hide(info);
  }
}

function renderProductosFinanciados() {
  const tbody = $("tbodyProductosFinanciados");

  if (!tbody) return;

  if (!productosFinanciados.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-6 text-center text-slate-400">
          No has agregado productos.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = productosFinanciados
    .map(
      (producto, index) => `
    <tr class="hover:bg-slate-800/50">
      <td class="px-4 py-3">
        <div class="font-semibold text-white">${escapeHTML(producto.nombre)}</div>
        <div class="text-xs text-slate-400">Código: ${escapeHTML(producto.codigo || "-")}</div>
      </td>
      <td class="px-4 py-3 text-center text-slate-300">${producto.stock}</td>
      <td class="px-4 py-3 text-center text-slate-300">${producto.cantidad}</td>
      <td class="px-4 py-3 text-right text-slate-300">${money(producto.precio_unitario)}</td>
      <td class="px-4 py-3 text-right font-bold text-white">${money(producto.subtotal)}</td>
      <td class="px-4 py-3 text-center">
        <button type="button"
          onclick="quitarProductoFinanciado(${index})"
          class="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    </tr>
  `,
    )
    .join("");

  if (window.lucide) {
    lucide.createIcons();
  }
}

function quitarProductoFinanciado(index) {
  productosFinanciados.splice(index, 1);
  renderProductosFinanciados();
  calcularResumenFinanciamiento();
}

/* =========================================================
   CÁLCULO RESUMEN
========================================================= */

function calcularResumenFinanciamiento() {
  const subtotal = productosFinanciados.reduce(
    (acc, item) => acc + Number(item.subtotal || 0),
    0,
  );

  const comisionPorcentaje = numberValue("comisionPorcentaje");
  const enganche = numberValue("engancheFinanciamiento");
  const meses = intValue("mesesFinanciamiento") || 1;

  const comisionMonto = subtotal * (comisionPorcentaje / 100);
  const total = subtotal + comisionMonto;
  const saldo = Math.max(total - enganche, 0);
  const mensualidad = meses > 0 ? saldo / meses : 0;

  setText("resumenSubtotal", money(subtotal));
  setText("resumenComision", money(comisionMonto));
  setText("resumenTotal", money(total));
  setText("resumenEnganche", money(enganche));
  setText("resumenSaldo", money(saldo));
  setText("resumenMensualidad", money(mensualidad));
}

/* =========================================================
   GUARDAR VENTA FINANCIADA
========================================================= */

async function guardarVentaFinanciada() {
  const clienteNombre = textValue("clienteNombre");
  const fechaPrimerPago = textValue("fechaPrimerPago");
  const meses = intValue("mesesFinanciamiento");
  const enganche = numberValue("engancheFinanciamiento");

  if (!clienteNombre) {
    Swal.fire({
      icon: "warning",
      title: "Falta el cliente",
      text: "Escribe o selecciona el nombre del cliente/persona.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }

  if (!productosFinanciados.length) {
    Swal.fire({
      icon: "warning",
      title: "Faltan productos",
      text: "Agrega al menos un producto al financiamiento.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }

  if (meses <= 0) {
    Swal.fire({
      icon: "warning",
      title: "Meses inválidos",
      text: "Los meses deben ser mayores a 0.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }

  if (!fechaPrimerPago) {
    Swal.fire({
      icon: "warning",
      title: "Falta fecha",
      text: "Selecciona la fecha del primer pago.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }
  const productoInvalido = productosFinanciados.find((item) => {
    return (
      !item.producto_id ||
      Number(item.cantidad) <= 0 ||
      Number(item.precio_unitario) <= 0 ||
      Number(item.stock) <= 0 ||
      Number(item.cantidad) > Number(item.stock)
    );
  });

  if (productoInvalido) {
    Swal.fire({
      icon: "warning",
      title: "Producto inválido",
      text: `Revisa el producto "${productoInvalido.nombre || "sin nombre"}". Puede no tener stock, precio o cantidad válida.`,
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }
  const subtotal = productosFinanciados.reduce(
    (acc, item) => acc + Number(item.subtotal || 0),
    0,
  );
  const comisionPorcentaje = numberValue("comisionPorcentaje");
  const total = subtotal + subtotal * (comisionPorcentaje / 100);

  if (enganche > total) {
    Swal.fire({
      icon: "warning",
      title: "Enganche inválido",
      text: "El enganche no puede ser mayor al total financiado.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }

  const confirmacion = await Swal.fire({
    icon: "question",
    title: "Generar venta financiada",
    text: "Se descontará el stock de los productos agregados.",
    showCancelButton: true,
    confirmButtonText: "Sí, generar",
    cancelButtonText: "Cancelar",
    background: "#1e293b",
    color: "#f8fafc",
    confirmButtonColor: "#2563eb",
    cancelButtonColor: "#475569",
  });

  if (!confirmacion.isConfirmed) return;

  const btn = $("btnGuardarVentaFinanciada");
  const oldText = btn ? btn.innerHTML : "";

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "Guardando...";
    }

    const productosPayload = productosFinanciados.map((item) => ({
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
    }));

    const data = await apiRequest({
      accion: "crear_venta_financiada",
      cliente_nombre: clienteNombre,
      cliente_telefono: textValue("clienteTelefono"),
      cliente_email: textValue("clienteEmail"),
      cliente_direccion: textValue("clienteDireccion"),
      cliente_origen: textValue("clienteOrigen") || "manual",
      cliente_referencia: textValue("clienteReferencia"),
      comision_porcentaje: numberValue("comisionPorcentaje"),
      enganche: numberValue("engancheFinanciamiento"),
      meses,
      fecha_primer_pago: fechaPrimerPago,
      metodo_enganche: textValue("metodoEnganche") || "efectivo",
      observaciones: textValue("observacionesFinanciamiento"),
      productos: JSON.stringify(productosPayload),
    });

    await Swal.fire({
      icon: "success",
      title: "Venta generada",
      html: `
        <div class="text-left">
          <p><b>Folio:</b> ${escapeHTML(data.folio)}</p>
          <p><b>Total:</b> ${money(data.total_financiado)}</p>
          <p><b>Saldo:</b> ${money(data.saldo_actual)}</p>
          <p><b>Mensualidad:</b> ${money(data.monto_mensual)}</p>
        </div>
      `,
      background: "#1e293b",
      color: "#f8fafc",
    });

    closeModal("modalNuevaVenta");
    limpiarFormularioNuevaVenta();
    paginaActual = 1;
    listarVentasFinanciadas();
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "No se pudo guardar",
      text: error.message,
      background: "#1e293b",
      color: "#f8fafc",
    });
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = oldText;
      if (window.lucide) lucide.createIcons();
    }
  }
}

function limpiarFormularioNuevaVenta() {
  productosFinanciados = [];
  productoSeleccionado = null;

  setValue("buscarClienteFinanciado", "");
  setValue("clienteNombre", "");
  setValue("clienteTelefono", "");
  setValue("clienteEmail", "");
  setValue("clienteDireccion", "");
  setValue("clienteOrigen", "manual");
  setValue("clienteReferencia", "");

  setValue("buscarProductoFinanciado", "");
  setValue("productoCantidad", "1");
  setValue("productoPrecio", "");

  setValue("mesesFinanciamiento", "1");
  setValue("comisionPorcentaje", "0");
  setValue("engancheFinanciamiento", "0");
  setValue("metodoEnganche", "efectivo");
  setValue("observacionesFinanciamiento", "");

  inicializarFechaPrimerPago();
  limpiarSeleccionProducto();
  renderProductosFinanciados();
  calcularResumenFinanciamiento();

  hide($("resultadosClientes"));
  hide($("resultadosProductos"));
}

/* =========================================================
   LISTADO
========================================================= */

async function listarVentasFinanciadas() {
  const tbody = $("tbodyVentasFinanciadas");

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="px-4 py-8 text-center text-slate-400">
          Cargando financiamientos...
        </td>
      </tr>
    `;
  }

  try {
    const data = await apiRequest({
      accion: "listar_ventas_financiadas",
      q: textValue("filtroBusqueda"),
      estado: textValue("filtroEstado"),
      pagina: paginaActual,
      limite: limitePorPagina,
    });

    renderVentasFinanciadas(data.ventas || []);
    actualizarPaginacion(data.ventas || []);
    actualizarCardsResumen(data.ventas || []);
  } catch (error) {
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="px-4 py-8 text-center text-red-300">
            ${escapeHTML(error.message)}
          </td>
        </tr>
      `;
    }

    actualizarCardsResumen([]);
  }
}

function renderVentasFinanciadas(ventas) {
  const tbody = $("tbodyVentasFinanciadas");

  if (!tbody) return;

  if (!ventas.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="px-4 py-8 text-center text-slate-400">
          No se encontraron financiamientos.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = ventas
    .map(
      (venta) => `
    <tr class="hover:bg-slate-800/50">
      <td class="px-4 py-3">
        <div class="font-bold text-white">${escapeHTML(venta.folio)}</div>
        <div class="text-xs text-slate-400">ID: ${venta.id}</div>
      </td>

      <td class="px-4 py-3">
        <div class="font-semibold text-white">${escapeHTML(venta.cliente_nombre)}</div>
        <div class="text-xs text-slate-400">${escapeHTML(venta.cliente_telefono || "Sin teléfono")}</div>
      </td>

      <td class="px-4 py-3 text-right font-semibold text-slate-200">
        ${money(venta.total_financiado)}
      </td>

      <td class="px-4 py-3 text-right font-bold ${Number(venta.saldo_actual) > 0 ? "text-amber-300" : "text-emerald-300"}">
        ${money(venta.saldo_actual)}
      </td>

      <td class="px-4 py-3 text-center text-slate-300">
        ${venta.meses}
      </td>

      <td class="px-4 py-3 text-center">
        ${estadoBadge(venta.estado)}
      </td>

      <td class="px-4 py-3 text-center text-slate-300">
        ${formatDate(venta.fecha_venta)}
      </td>

      <td class="px-4 py-3">
        <div class="flex items-center justify-center gap-2">
          <button type="button"
            onclick="verDetalleVentaFinanciada(${venta.id})"
            class="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
            title="Ver detalle">
            <i data-lucide="eye" class="w-4 h-4"></i>
          </button>

          ${
            venta.estado !== "liquidada" && venta.estado !== "cancelada"
              ? `
                <button type="button"
                  onclick="abrirModalAbono(${venta.id}, 0, ${Number(venta.saldo_actual || 0)})"
                  class="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  title="Registrar abono">
                  <i data-lucide="badge-dollar-sign" class="w-4 h-4"></i>
                </button>
              `
              : ""
          }

          ${
            venta.estado !== "cancelada" && venta.estado !== "liquidada"
              ? `
                <button type="button"
                  onclick="cancelarVentaFinanciada(${venta.id})"
                  class="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30"
                  title="Cancelar">
                  <i data-lucide="ban" class="w-4 h-4"></i>
                </button>
              `
              : ""
          }
        </div>
      </td>
    </tr>
  `,
    )
    .join("");

  if (window.lucide) {
    lucide.createIcons();
  }
}

function actualizarPaginacion(ventas) {
  setText("textoPaginacion", `Página ${paginaActual}`);

  const btnAnterior = $("btnPaginaAnterior");
  const btnSiguiente = $("btnPaginaSiguiente");

  if (btnAnterior) {
    btnAnterior.disabled = paginaActual <= 1;
  }

  if (btnSiguiente) {
    btnSiguiente.disabled = ventas.length < limitePorPagina;
  }
}

function actualizarCardsResumen(ventas) {
  const activas = ventas.filter((v) => v.estado === "activa").length;
  const vencidas = ventas.filter((v) => v.estado === "vencida").length;
  const liquidadas = ventas.filter((v) => v.estado === "liquidada").length;
  const saldoPendiente = ventas.reduce(
    (acc, v) => acc + Number(v.saldo_actual || 0),
    0,
  );

  setText("cardActivas", activas);
  setText("cardSaldoPendiente", money(saldoPendiente));
  setText("cardVencidas", vencidas);
  setText("cardLiquidadas", liquidadas);
}

/* =========================================================
   DETALLE
========================================================= */

async function verDetalleVentaFinanciada(ventaId) {
  try {
    const data = await apiRequest({
      accion: "obtener_detalle_financiamiento",
      id: ventaId,
    });

    ultimaVentaDetalle = data;
    renderDetalleVenta(data);
    openModal("modalDetalleVenta");
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "No se pudo cargar el detalle",
      text: error.message,
      background: "#1e293b",
      color: "#f8fafc",
    });
  }
}

function renderDetalleVenta(data) {
  const venta = data.venta || {};
  const detalle = data.detalle || [];
  const cuotas = data.cuotas || [];
  const pagos = data.pagos || [];

  setValue("detalleVentaId", venta.id || "");

  setText("detalleTitulo", `Detalle ${venta.folio || ""}`);
  setText(
    "detalleSubtitulo",
    `${venta.cliente_nombre || ""} · ${estadoTexto(venta.estado)}`,
  );

  renderDetalleInfoGeneral(venta);
  renderDetalleProductos(detalle);
  renderDetalleCuotas(cuotas, venta);
  renderDetallePagos(pagos, venta);

  if (window.lucide) {
    lucide.createIcons();
  }
}

function estadoTexto(estado) {
  return (
    String(estado || "")
      .charAt(0)
      .toUpperCase() + String(estado || "").slice(1)
  );
}

function renderDetalleInfoGeneral(venta) {
  const cont = $("detalleInfoGeneral");

  if (!cont) return;

  const ventaCancelada = String(venta.estado || "") === "cancelada";

  cont.innerHTML = `
    ${detalleCard("Cliente", venta.cliente_nombre || "-")}
    ${detalleCard("Total financiado", money(venta.total_financiado))}
    ${detalleCard("Saldo actual", money(venta.saldo_actual))}
    ${detalleCard("Mensualidad", money(venta.monto_mensual))}
    ${detalleCard("Teléfono", venta.cliente_telefono || "-")}
    ${detalleCard("Correo", venta.cliente_email || "-")}
    ${detalleCard("Primer pago", formatDate(venta.fecha_primer_pago))}
    ${detalleCard("Estado", estadoBadge(venta.estado))}

    ${
      ventaCancelada
        ? `
          <div class="md:col-span-2 xl:col-span-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p class="text-sm font-bold text-red-300">Venta cancelada</p>
                <p class="text-xs text-slate-300">
                  Esta venta ya no permite registrar abonos ni eliminar pagos.
                </p>
              </div>

              <button type="button"
                onclick="imprimirTicketCancelacion()"
                class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 font-semibold">
                <i data-lucide="printer" class="w-4 h-4"></i>
                Imprimir ticket de cancelación
              </button>
            </div>
          </div>
        `
        : ""
    }
  `;

  if (window.lucide) {
    lucide.createIcons();
  }
}

function detalleCard(label, value) {
  return `
    <div class="rounded-2xl bg-slate-900/60 border border-slate-700 p-4">
      <p class="text-xs text-slate-400">${escapeHTML(label)}</p>
      <div class="text-base font-bold text-white mt-1 break-words">${value}</div>
    </div>
  `;
}

function renderDetalleProductos(productos) {
  const tbody = $("tbodyDetalleProductos");

  if (!tbody) return;

  if (!productos.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="px-4 py-6 text-center text-slate-400">
          Sin productos.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = productos
    .map(
      (producto) => `
    <tr class="hover:bg-slate-800/50">
      <td class="px-4 py-3">
        <div class="font-semibold text-white">${escapeHTML(producto.producto_nombre || "-")}</div>
        <div class="text-xs text-slate-400">Código: ${escapeHTML(producto.producto_codigo || "-")}</div>
      </td>
      <td class="px-4 py-3 text-center text-slate-300">${producto.cantidad}</td>
      <td class="px-4 py-3 text-right text-slate-300">${money(producto.precio_unitario)}</td>
      <td class="px-4 py-3 text-right font-bold text-white">${money(producto.subtotal)}</td>
    </tr>
  `,
    )
    .join("");
}

function renderDetalleCuotas(cuotas, venta) {
  const tbody = $("tbodyDetalleCuotas");

  if (!tbody) return;

  if (!cuotas.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-4 py-6 text-center text-slate-400">
          Sin cuotas. Posiblemente se liquidó con enganche.
        </td>
      </tr>
    `;
    return;
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const cuotasPendientes = cuotas
    .filter((c) => Number(c.saldo_cuota || 0) > 0)
    .sort((a, b) => Number(a.numero_cuota) - Number(b.numero_cuota));

  const primeraPendiente = cuotasPendientes.length
    ? Number(cuotasPendientes[0].numero_cuota)
    : null;

  const cuotasLiberadasIds = cuotasPendientes
    .filter((c) => {
      const fecha = new Date(String(c.fecha_vencimiento) + "T00:00:00");
      const vencidaOActual = fecha <= hoy;
      const esPrimeraPendiente = Number(c.numero_cuota) === primeraPendiente;

      return vencidaOActual || esPrimeraPendiente;
    })
    .map((c) => Number(c.id));

  const saldoLiberado = cuotas
    .filter((c) => cuotasLiberadasIds.includes(Number(c.id)))
    .reduce((acc, c) => acc + Number(c.saldo_cuota || 0), 0);
  const btnAbonoGeneral = $("btnAbrirAbonoDesdeDetalle");

  if (btnAbonoGeneral) {
    btnAbonoGeneral.dataset.saldoLiberado = saldoLiberado.toFixed(2);

    if (
      saldoLiberado <= 0 ||
      venta.estado === "cancelada" ||
      venta.estado === "liquidada"
    ) {
      btnAbonoGeneral.disabled = true;
      btnAbonoGeneral.classList.add("opacity-50", "cursor-not-allowed");
    } else {
      btnAbonoGeneral.disabled = false;
      btnAbonoGeneral.classList.remove("opacity-50", "cursor-not-allowed");
    }
  }

  tbody.innerHTML = cuotas
    .map((cuota) => {
      const saldo = Number(cuota.saldo_cuota || 0);
      const cuotaLiberada = cuotasLiberadasIds.includes(Number(cuota.id));

      const puedeAbonar =
        saldo > 0 &&
        cuotaLiberada &&
        venta.estado !== "cancelada" &&
        venta.estado !== "liquidada";

      return `
      <tr class="hover:bg-slate-800/50">
        <td class="px-4 py-3 text-center font-bold text-white">${cuota.numero_cuota}</td>
        <td class="px-4 py-3 text-center text-slate-300">${formatDate(cuota.fecha_vencimiento)}</td>
        <td class="px-4 py-3 text-right text-slate-300">${money(cuota.monto_programado)}</td>
        <td class="px-4 py-3 text-right text-emerald-300">${money(cuota.monto_pagado)}</td>
        <td class="px-4 py-3 text-right font-bold ${saldo > 0 ? "text-amber-300" : "text-emerald-300"}">
          ${money(cuota.saldo_cuota)}
        </td>
        <td class="px-4 py-3 text-center">${estadoBadge(cuota.estado)}</td>
        <td class="px-4 py-3 text-center">
          ${
            puedeAbonar
              ? `
                <button type="button"
                  onclick="abrirModalAbono(${venta.id}, ${cuota.id}, ${saldo})"
                  class="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  title="Abonar a esta cuota">
                  <i data-lucide="badge-dollar-sign" class="w-4 h-4"></i>
                </button>
              `
              : saldo > 0
                ? `
    <span 
      class="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-700/70 text-slate-500"
      title="Cuota bloqueada">
      <i data-lucide="lock" class="w-4 h-4"></i>
    </span>
  `
                : "-"
          }
        </td>
      </tr>
    `;
    })
    .join("");

  if (window.lucide) {
    lucide.createIcons();
  }
}

function renderDetallePagos(pagos, venta = {}) {
  const tbody = $("tbodyDetallePagos");

  if (!tbody) return;

  const ventaCancelada = String(venta.estado || "") === "cancelada";

  if (!pagos.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-6 text-center text-slate-400">
          Sin pagos registrados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = pagos
    .map((pago, index) => {
      const referencia = String(pago.referencia || "").toUpperCase();
      const esEnganche = referencia === "ENGANCHE";
      const esUltimoPago = index === 0;

      const puedeEliminar = !ventaCancelada && !esEnganche && esUltimoPago;

      let tituloBloqueo = "Solo se puede eliminar el último pago";

      if (ventaCancelada) {
        tituloBloqueo = "No se pueden eliminar pagos de una venta cancelada";
      } else if (esEnganche) {
        tituloBloqueo = "El enganche no se elimina desde aquí";
      }

      return `
      <tr class="hover:bg-slate-800/50">
        <td class="px-4 py-3 text-center text-slate-300">${formatDateTime(pago.fecha_pago)}</td>
        <td class="px-4 py-3 text-right font-bold text-emerald-300">${money(pago.monto)}</td>
        <td class="px-4 py-3 text-center text-slate-300">${escapeHTML(pago.metodo_pago || "-")}</td>
        <td class="px-4 py-3 text-slate-300">${escapeHTML(pago.referencia || "-")}</td>
        <td class="px-4 py-3 text-slate-300">${escapeHTML(pago.observaciones || "-")}</td>
        <td class="px-4 py-3 text-center">
  <div class="flex items-center justify-center gap-2">

    <button type="button"
      onclick="imprimirTicketPagoFinanciado(${Number(pago.id)})"
      class="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
      title="Reimprimir ticket">
      <i data-lucide="printer" class="w-4 h-4"></i>
    </button>

    ${
      puedeEliminar
        ? `
          <button type="button"
            onclick="eliminarPagoFinanciado(${Number(pago.id)})"
            class="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30"
            title="Eliminar pago y restaurar saldo">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        `
        : `
          <span
            class="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-700/60 text-slate-500"
            title="${tituloBloqueo}">
            <i data-lucide="lock" class="w-4 h-4"></i>
          </span>
        `
    }
  </div>
</td>
      </tr>
    `;
    })
    .join("");

  if (window.lucide) {
    lucide.createIcons();
  }
}

/* =========================================================
   ABONOS
========================================================= */

function abrirModalAbono(ventaId, cuotaId = 0, saldoMax = 0) {
  if (!ventaId) {
    Swal.fire({
      icon: "warning",
      title: "Venta inválida",
      text: "No se encontró la venta para registrar el abono.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }

  saldoMax = Number(saldoMax || 0);

  if (saldoMax <= 0) {
    Swal.fire({
      icon: "info",
      title: "Sin saldo pendiente",
      text: "Esta venta o cuota ya no tiene saldo por pagar.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }

  setValue("abonoVentaId", ventaId);
  setValue("abonoCuotaId", cuotaId || "");
  setValue("abonoSaldoMax", saldoMax.toFixed(2));
  setValue("abonoMonto", saldoMax.toFixed(2));
  setValue("abonoMetodoPago", "efectivo");
  setValue("abonoReferencia", "");
  setValue("abonoObservaciones", "");

  const inputMonto = $("abonoMonto");

  if (inputMonto) {
    inputMonto.setAttribute("max", saldoMax.toFixed(2));
  }

  setText(
    "abonoSubtitulo",
    cuotaId > 0
      ? `Máximo permitido para esta cuota: ${money(saldoMax)}`
      : `Abono general. Máximo permitido: ${money(saldoMax)}`,
  );

  openModal("modalAbono");
}

async function guardarAbono() {
  const ventaId = intValue("abonoVentaId");
  const cuotaId = intValue("abonoCuotaId");
  const monto = numberValue("abonoMonto");

  if (!ventaId) {
    Swal.fire({
      icon: "warning",
      title: "Venta inválida",
      text: "No se encontró la venta.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }

  if (monto <= 0) {
    Swal.fire({
      icon: "warning",
      title: "Monto inválido",
      text: "El monto debe ser mayor a 0.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }
  const saldoMax = numberValue("abonoSaldoMax");

  if (saldoMax > 0 && monto > saldoMax) {
    Swal.fire({
      icon: "warning",
      title: "Abono mayor al saldo",
      text: `No puedes registrar más de ${money(saldoMax)}.`,
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }

  const btn = $("btnGuardarAbono");
  const oldText = btn ? btn.innerHTML : "";

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "Guardando...";
    }

    const dataAbono = await apiRequest({
  accion: "registrar_abono",
  venta_id: ventaId,
  cuota_id: cuotaId,
  monto,
  metodo_pago: textValue("abonoMetodoPago") || "efectivo",
  referencia: textValue("abonoReferencia"),
  observaciones: textValue("abonoObservaciones"),
});

    closeModal("modalAbono");

if (!$("modalDetalleVenta")?.classList.contains("hidden")) {
  await verDetalleVentaFinanciada(ventaId);
}

await listarVentasFinanciadas();

const resultado = await Swal.fire({
  icon: "success",
  title: "Abono registrado",
  text: "El pago se guardó correctamente.",
  showCancelButton: true,
  confirmButtonText: "Imprimir ticket",
  cancelButtonText: "Cerrar",
  background: "#1e293b",
  color: "#f8fafc",
  confirmButtonColor: "#2563eb",
  cancelButtonColor: "#475569",
});

if (resultado.isConfirmed && dataAbono.pago_id) {
  try {
    if (typeof imprimirTicketPagoFinanciado !== "function") {
      throw new Error(
        "La función para generar el ticket todavía no está disponible.",
      );
    }

    await imprimirTicketPagoFinanciado(dataAbono.pago_id);
  } catch (ticketError) {
    await Swal.fire({
      icon: "warning",
      title: "Pago guardado, pero no se imprimió",
      text: ticketError.message,
      background: "#1e293b",
      color: "#f8fafc",
    });
  }
}
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "No se pudo registrar",
      text: error.message,
      background: "#1e293b",
      color: "#f8fafc",
    });
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = oldText;
      if (window.lucide) lucide.createIcons();
    }
  }
}
/* =========================================================
   TICKET DE PAGO FINANCIADO 58 MM
========================================================= */

async function imprimirTicketPagoFinanciado(pagoId) {
  pagoId = Number(pagoId || 0);

  if (pagoId <= 0) {
    await Swal.fire({
      icon: "warning",
      title: "Pago inválido",
      text: "No se encontró el pago que deseas imprimir.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }

  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("No se encontró la librería jsPDF.");
    }

    Swal.fire({
      title: "Generando ticket",
      text: "Espera un momento...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      background: "#1e293b",
      color: "#f8fafc",
      didOpen: () => {
        Swal.showLoading();
      },
    });

    const data = await apiRequest({
      accion: "obtener_ticket_pago_financiado",
      id: pagoId,
    });

    generarTicketPagoFinanciado(data);

    Swal.close();
  } catch (error) {
    Swal.close();

    await Swal.fire({
      icon: "error",
      title: "No se pudo generar el ticket",
      text: error.message,
      background: "#1e293b",
      color: "#f8fafc",
    });
  }
}

function generarTicketPagoFinanciado(data) {
  const { jsPDF } = window.jspdf;

  const venta = data.venta || {};
  const pago = data.pago || {};
  const branding = data.branding || {};
  const aplicaciones = data.aplicaciones || [];

  const nombreEmpresa =
    branding.app_name ||
    branding.nombre ||
    "SMARTGATE";

  const logoDataUrl =
  branding.logo_base64 ||
  branding.logo_data_url ||
  branding.logo ||
  "";

  /*
   * Se calcula una altura aproximada para evitar que el
   * contenido se corte cuando existan varias cuotas aplicadas.
   */
  const altoBase = 160;
  const altoAplicaciones = aplicaciones.length * 9;
  const altoTicket = Math.max(170, altoBase + altoAplicaciones);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [58, altoTicket],
  });

  const anchoPagina = 58;
  const margen = 4;
  const anchoContenido = anchoPagina - margen * 2;

  let y = 5;

  function textoCentro(
  texto,
  size = 8.5,
  negrita = true,
) {
  /*
   * No permite textos menores de 8 puntos.
   */
  const tamanoFinal = Math.max(Number(size), 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(tamanoFinal);

  const lineas = doc.splitTextToSize(
    String(texto ?? ""),
    anchoContenido,
  );

  lineas.forEach((linea) => {
    doc.text(
      linea,
      anchoPagina / 2,
      y,
      {
        align: "center",
      },
    );

    y += tamanoFinal * 0.42;
  });

  y += 1;
}

function textoIzquierda(
  texto,
  size = 8,
  negrita = true,
) {
  /*
   * Todo el texto se imprime en negritas para evitar
   * que se pierda en la impresora térmica.
   */
  const tamanoFinal = Math.max(Number(size), 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(tamanoFinal);

  const lineas = doc.splitTextToSize(
    String(texto ?? ""),
    anchoContenido,
  );

  lineas.forEach((linea) => {
    doc.text(linea, margen, y);
    y += tamanoFinal * 0.42;
  });

  y += 1;
}

function fila(
  etiqueta,
  valor,
  negrita = true,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  const etiquetaTxt = String(etiqueta ?? "");
  const valorTxt = String(valor ?? "");

  /*
   * Calcula el espacio disponible para la etiqueta.
   */
  const anchoValor = doc.getTextWidth(valorTxt);

  const anchoEtiqueta =
    anchoContenido - anchoValor - 2;

  let etiquetaAjustada = etiquetaTxt;

  while (
    etiquetaAjustada.length > 1 &&
    doc.getTextWidth(etiquetaAjustada) >
      anchoEtiqueta
  ) {
    etiquetaAjustada =
      etiquetaAjustada.slice(0, -1);
  }

  doc.text(
    etiquetaAjustada,
    margen,
    y,
  );

  doc.text(
    valorTxt,
    anchoPagina - margen,
    y,
    {
      align: "right",
    },
  );

  y += 4.5;
}

  function linea() {
  doc.setDrawColor(20);
  doc.setLineWidth(0.35);
  doc.setLineDashPattern([0.8, 0.8], 0);

  doc.line(
    margen,
    y,
    anchoPagina - margen,
    y,
  );

  doc.setLineDashPattern([], 0);

  y += 3.5;
}

  if (logoDataUrl) {
    try {
      const formatoLogo = obtenerFormatoImagenBase64(logoDataUrl);

      const anchoLogo = 24;
      const altoLogo = 14;

      doc.addImage(
        logoDataUrl,
        formatoLogo,
        (anchoPagina - anchoLogo) / 2,
        y,
        anchoLogo,
        altoLogo,
      );

      y += altoLogo + 2;
    } catch (error) {
      console.warn("No se pudo colocar el logo en el ticket:", error);
    }
  }

  textoCentro(nombreEmpresa, 11, true);
  textoCentro("COMPROBANTE DE PAGO", 9, true);
  textoCentro("VENTA FINANCIADA", 8, true);

  linea();

  fila("Folio venta:", venta.folio || "-");
  fila("Folio pago:", pago.folio || `PAGO-${pago.id || "-"}`);
  fila("Fecha:", formatDateTime(pago.fecha_pago));
  fila("Atendió:",  pago.recibido_por_nombre || pago.usuario_nombre || pago.usuario || "-",);

  linea();

  textoIzquierda("CLIENTE", 8, true);
  textoIzquierda(
  venta.cliente_nombre || "-",
  9,
  true,
);

  if (venta.cliente_telefono) {
    textoIzquierda(`Teléfono: ${venta.cliente_telefono}`, 7);
  }

  linea();

  textoIzquierda("INFORMACIÓN DEL PAGO", 8, true);

  fila("Método:", capitalizarTexto(pago.metodo_pago || "-"));
  fila("Referencia:", pago.referencia || "-");
  fila("Monto pagado:", money(pago.monto), true);

  if (aplicaciones.length) {
    linea();

    textoIzquierda("APLICACIÓN DEL PAGO", 8, true);

    aplicaciones.forEach((aplicacion) => {
      const numeroCuota =
        aplicacion.numero_cuota ||
        aplicacion.cuota_numero ||
        "-";

      fila(
        `Cuota ${numeroCuota}:`,
        money(aplicacion.monto_aplicado),
      );
    });
  }

  linea();

  fila(
    "Total financiado:",
    money(venta.total_financiado),
  );

  fila(
    "Saldo anterior:",
    money(
      pago.saldo_anterior ??
      Number(venta.saldo_actual || 0) + Number(pago.monto || 0),
    ),
  );

  fila(
    "Pago recibido:",
    money(pago.monto),
    true,
  );

  fila(
    "Saldo restante:",
    money(
      pago.saldo_posterior ??
      venta.saldo_actual,
    ),
    true,
  );

  if (pago.observaciones) {
    linea();
    textoIzquierda("OBSERVACIONES", 8, true);
    textoIzquierda(pago.observaciones, 7);
  }

  linea();

  textoCentro("Gracias por su pago", 9, true);
  textoCentro(
    "Conserve este comprobante para cualquier aclaración.",
    7,
  );

  y += 2;

  textoCentro(
    `Impreso: ${new Date().toLocaleString("es-MX")}`,
    6,
  );

  /*
   * Abre el diálogo de impresión del visor PDF.
   */
  doc.autoPrint();

  const pdfUrl = doc.output("bloburl");
  const ventana = window.open(pdfUrl, "_blank");

  if (!ventana) {
    doc.save(
      `ticket-pago-${pago.id || Date.now()}.pdf`,
    );
  }
}

function obtenerFormatoImagenBase64(dataUrl) {
  const valor = String(dataUrl || "").toLowerCase();

  if (valor.includes("image/jpeg") || valor.includes("image/jpg")) {
    return "JPEG";
  }

  if (valor.includes("image/webp")) {
    return "WEBP";
  }

  return "PNG";
}

function capitalizarTexto(value) {
  const texto = String(value || "").trim();

  if (!texto) return "-";

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
/* =========================================================
   CANCELAR VENTA
========================================================= */

async function cancelarVentaFinanciada(ventaId) {
  const confirmacion = await Swal.fire({
    icon: "warning",
    title: "Cancelar financiamiento",
    text: "Esto marcará la venta como cancelada. Por ahora no regresará stock automáticamente.",
    showCancelButton: true,
    confirmButtonText: "Sí, cancelar",
    cancelButtonText: "No",
    background: "#1e293b",
    color: "#f8fafc",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#475569",
  });

  if (!confirmacion.isConfirmed) return;

  try {
    const data = await apiRequest({
      accion: "cancelar_venta_financiada",
      id: ventaId,
    });

    await Swal.fire({
      icon: "success",
      title: "Cancelada",
      text: data.mensaje || "La venta financiada fue cancelada correctamente.",
      background: "#1e293b",
      color: "#f8fafc",
    });

    listarVentasFinanciadas();

    await verDetalleVentaFinanciada(ventaId);
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "No se pudo cancelar",
      text: error.message,
      background: "#1e293b",
      color: "#f8fafc",
    });
  }
}
function imprimirTicketCancelacion() {
  if (
    !ultimaVentaDetalle ||
    !ultimaVentaDetalle.venta
  ) {
    Swal.fire({
      icon: "warning",
      title: "Sin información",
      text: "No se encontró la información de la venta para imprimir.",
      background: "#1e293b",
      color: "#f8fafc",
    });

    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    Swal.fire({
      icon: "error",
      title: "No se puede imprimir",
      text: "No se encontró la librería jsPDF.",
      background: "#1e293b",
      color: "#f8fafc",
    });

    return;
  }

  const { jsPDF } = window.jspdf;

  const venta = ultimaVentaDetalle.venta || {};
  const detalle = ultimaVentaDetalle.detalle || [];
  const pagos = ultimaVentaDetalle.pagos || [];

  /*
   * Altura dinámica según productos y pagos.
   */
  const altoBase = 145;
  const altoProductos = detalle.length * 13;
  const altoPagos = pagos.length * 9;

  const altoTicket = Math.max(
    170,
    altoBase + altoProductos + altoPagos,
  );

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [58, altoTicket],
  });

  const anchoPagina = 58;
  const margen = 4;
  const margenDerecho = 54;
  const anchoContenido = 50;

  let y = 6;

  /*
   * Funciones auxiliares
   */
  function textoCentro(texto, tamano = 8.5) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.max(tamano, 8));

    const lineas = doc.splitTextToSize(
      String(texto ?? ""),
      anchoContenido,
    );

    lineas.forEach((linea) => {
      doc.text(
        linea,
        anchoPagina / 2,
        y,
        {
          align: "center",
        },
      );

      y += 4.3;
    });

    y += 1;
  }

  function textoIzquierda(texto, tamano = 8) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.max(tamano, 8));

    const lineas = doc.splitTextToSize(
      String(texto ?? ""),
      anchoContenido,
    );

    lineas.forEach((linea) => {
      doc.text(linea, margen, y);
      y += 4.3;
    });

    y += 1;
  }

  function fila(etiqueta, valor, tamano = 8) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.max(tamano, 8));

    const etiquetaTexto = String(etiqueta ?? "");
    const valorTexto = String(valor ?? "-");

    const anchoValor = doc.getTextWidth(valorTexto);

    /*
     * Si ambos textos caben, se imprimen en una línea.
     */
    if (
      doc.getTextWidth(etiquetaTexto) +
        anchoValor +
        3 <=
      anchoContenido
    ) {
      doc.text(etiquetaTexto, margen, y);

      doc.text(
        valorTexto,
        margenDerecho,
        y,
        {
          align: "right",
        },
      );

      y += 4.5;

      return;
    }

    /*
     * Si no caben, el valor baja a otra línea.
     */
    doc.text(etiquetaTexto, margen, y);
    y += 4.3;

    const lineasValor = doc.splitTextToSize(
      valorTexto,
      anchoContenido,
    );

    lineasValor.forEach((linea) => {
      doc.text(linea, margen, y);
      y += 4.3;
    });

    y += 1;
  }

  function linea(tipo = "punteada") {
    doc.setDrawColor(20);

    if (tipo === "continua") {
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([], 0);
    } else {
      doc.setLineWidth(0.35);
      doc.setLineDashPattern([0.8, 0.8], 0);
    }

    doc.line(
      margen,
      y,
      margenDerecho,
      y,
    );

    doc.setLineDashPattern([], 0);

    y += 4;
  }

  /*
   * Fechas
   */
  const fechaVenta = venta.fecha_venta
    ? formatDate(venta.fecha_venta)
    : "-";

  const fechaCancelacion = venta.fecha_cancelacion
    ? formatDateTime(venta.fecha_cancelacion)
    : formatDateTime(new Date().toISOString());

  /*
   * Encabezado
   */
  textoCentro(
    "TICKET DE CANCELACIÓN",
    11,
  );

  textoCentro(
    "VENTA FINANCIADA",
    9,
  );

  /*
   * Recuadro de cancelación
   */
  y += 1;

  doc.setDrawColor(0);
  doc.setLineWidth(0.7);

  doc.rect(
    margen,
    y,
    anchoContenido,
    11,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);

  doc.text(
    "CANCELADA",
    anchoPagina / 2,
    y + 7,
    {
      align: "center",
    },
  );

  y += 15;

  linea("continua");

  /*
   * Información de la venta
   */
  fila(
    "FOLIO:",
    venta.folio || "-",
  );

  fila(
    "FECHA VENTA:",
    fechaVenta,
  );

  fila(
    "FECHA CANCELACIÓN:",
    fechaCancelacion,
  );

  if (venta.cliente_nombre) {
    fila(
      "CLIENTE:",
      venta.cliente_nombre,
    );
  }

  if (venta.cliente_telefono) {
    fila(
      "TELÉFONO:",
      venta.cliente_telefono,
    );
  }

  if (venta.cancelada_por_nombre) {
    fila(
      "CANCELÓ:",
      venta.cancelada_por_nombre,
    );
  }

  linea();

  /*
   * Productos
   */
  textoCentro(
    "PRODUCTOS CANCELADOS",
    9,
  );

  if (!detalle.length) {
    textoCentro(
      "SIN PRODUCTOS REGISTRADOS",
      8,
    );
  } else {
    detalle.forEach((producto, index) => {
      const nombreProducto =
        producto.producto_nombre ||
        "PRODUCTO SIN NOMBRE";

      textoIzquierda(
        String(nombreProducto).toUpperCase(),
        8.5,
      );

      fila(
        `${Number(producto.cantidad || 0)} x ${money(
          producto.precio_unitario,
        )}`,
        money(producto.subtotal),
      );

      if (index < detalle.length - 1) {
        linea();
      }
    });
  }

  linea("continua");

  /*
   * Totales de la venta
   */
  fila(
    "TOTAL VENTA:",
    money(
      venta.total_venta ??
      venta.monto_total ??
      venta.total,
    ),
    9,
  );

  /*
   * Pagos registrados
   */
  y += 2;

  textoCentro(
    "PAGOS REGISTRADOS",
    9,
  );

  if (!pagos.length) {
    textoCentro(
      "SIN PAGOS REGISTRADOS",
      8,
    );
  } else {
    pagos.forEach((pago) => {
      fila(
        formatDateTime(pago.fecha_pago),
        money(pago.monto),
      );
    });
  }

  /*
   * Total abonado
   */
  const totalPagado = pagos.reduce(
    (total, pago) =>
      total + Number(pago.monto || 0),
    0,
  );

  linea();

  fila(
    "TOTAL ABONADO:",
    money(totalPagado),
    9,
  );

  /*
   * Motivo de cancelación
   */
  const motivoCancelacion =
    venta.motivo_cancelacion ||
    venta.observaciones_cancelacion ||
    venta.nota_cancelacion ||
    "";

  if (motivoCancelacion) {
    linea();

    textoIzquierda(
      "MOTIVO DE CANCELACIÓN:",
      8.5,
    );

    textoIzquierda(
      motivoCancelacion,
      8,
    );
  }

  /*
   * Mensaje final
   */
  linea("continua");

  textoCentro(
    "ESTE DOCUMENTO CONFIRMA",
    8,
  );

  textoCentro(
    "LA CANCELACIÓN DE LA VENTA",
    8,
  );

  y += 2;

  textoCentro(
    `IMPRESO: ${new Date().toLocaleString("es-MX")}`,
    8,
  );

  /*
   * Imprimir
   */
  doc.autoPrint();

  const pdfUrl = doc.output("bloburl");
  const ventana = window.open(pdfUrl, "_blank");

  if (!ventana) {
    doc.save(
      `ticket-cancelacion-${venta.folio || Date.now()}.pdf`,
    );
  }
}
async function eliminarPagoFinanciado(pagoId) {
  if (!pagoId) {
    Swal.fire({
      icon: "warning",
      title: "Pago inválido",
      text: "No se encontró el pago a eliminar.",
      background: "#1e293b",
      color: "#f8fafc",
    });
    return;
  }

  const confirmacion = await Swal.fire({
    icon: "warning",
    title: "Eliminar pago",
    html: `
      <div class="text-left">
        <p>Se eliminará este pago y se restaurará el saldo en las cuotas correspondientes.</p>
        <p class="mt-2 text-amber-300"><b>Nota:</b> solo se permite eliminar el último pago registrado.</p>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    background: "#1e293b",
    color: "#f8fafc",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#475569",
  });

  if (!confirmacion.isConfirmed) return;

  try {
    const data = await apiRequest({
      accion: "eliminar_pago_financiado",
      id: pagoId,
    });

    await Swal.fire({
      icon: "success",
      title: "Pago eliminado",
      text: data.mensaje || "El pago fue eliminado correctamente.",
      background: "#1e293b",
      color: "#f8fafc",
    });

    const ventaId = Number(data.venta_id || intValue("detalleVentaId"));

    if (ventaId > 0) {
      await verDetalleVentaFinanciada(ventaId);
    }

    listarVentasFinanciadas();
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "No se pudo eliminar",
      text: error.message,
      background: "#1e293b",
      color: "#f8fafc",
    });
  }
}
