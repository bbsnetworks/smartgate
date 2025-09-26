// js/proveedores.js
const API = "../php/proveedores_controller.php";

const tbody = document.getElementById("tbodyProv");
const lblResumen = document.getElementById("lblResumen");
const lblPagina = document.getElementById("lblPagina");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");

const q = document.getElementById("q");
const filtroActivo = document.getElementById("filtroActivo");
const btnBuscar = document.getElementById("btnBuscar");
const btnLimpiar = document.getElementById("btnLimpiar");

const modal = document.getElementById("modal");
const btnNuevo = document.getElementById("btnNuevo");
const btnClose = document.getElementById("btnClose");
const btnCancelar = document.getElementById("btnCancelar");
const formProv = document.getElementById("formProv");

const modalTitle = document.getElementById("modalTitle");
const prov_id = document.getElementById("prov_id");
const nombre = document.getElementById("nombre");
const contacto = document.getElementById("contacto");
const telefono = document.getElementById("telefono");
const email = document.getElementById("email");
const rfc = document.getElementById("rfc");
const direccion = document.getElementById("direccion");

let state = {
  page: 1,
  limit: 10,
  total: 0,
};

function openModal(edit = false) {
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  if (!edit) {
    modalTitle.textContent = "Nuevo proveedor";
    prov_id.value = "";
    formProv.reset();
  } else {
    modalTitle.textContent = "Editar proveedor";
  }
}
function closeModal() {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function listar() {
  const params = new URLSearchParams({
    action: "listar",
    q: q.value.trim(),
    page: state.page,
    limit: state.limit,
    activo: filtroActivo.value,
  });
  const r = await fetch(`${API}?${params.toString()}`);
  const j = await r.json();
  if (!j.success) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-3 py-4 text-center text-red-400">${
      j.error || "Error"
    }</td></tr>`;
    return;
  }
  state.total = j.total;
  renderRows(j.proveedores);
  renderPager();
}

// js/proveedores.js  (mantén el resto igual que ya tienes)
function renderRows(rows) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-6 text-center opacity-70">Sin resultados</td></tr>`;
    lblPagina.textContent = `Página 1 / 1`;
    lblResumen.textContent = `0 proveedor(es) — mostrando ${state.limit} por página`;
    return;
  }

  tbody.innerHTML = rows
    .map((r) => {
      const badge =
        r.activo == 1
          ? `<span class="px-2 py-0.5 text-xs rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-700/50">Activo</span>`
          : `<span class="px-2 py-0.5 text-xs rounded-lg bg-red-500/15 text-red-300 border border-red-700/50">Desactivado</span>`;

      const btnEditar = `<button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-300 border border-yellow-600 hover:bg-yellow-500 hover:text-slate-900 transition"
               onclick='editar(${r.id})'>
         <i data-lucide="pencil" class="w-4 h-4"></i> Editar
       </button>`;

      const isOn = r.activo == 1;
      const btnToggle = `<button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ${
        isOn
          ? "bg-transparent text-red-400 border border-red-600 hover:bg-red-600 hover:text-white"
          : "bg-transparent text-emerald-400 border border-emerald-600 hover:bg-emerald-600 hover:text-white"
      } transition"
        onclick='toggleActivo(${r.id}, ${isOn ? 0 : 1})'>
         <i data-lucide="power" class="w-4 h-4"></i> ${
           isOn ? "Desactivar" : "Activar"
         }
       </button>`;

      // NUEVO: botón Pedido (abre modal con proveedor preseleccionado)
      const btnPedido = `<button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-600 hover:bg-emerald-500 hover:text-slate-900 transition"
               onclick='abrirPedido(${r.id})'>
         <i data-lucide="truck" class="w-4 h-4"></i> Pedido
       </button>`;

      return `
      <tr class="hover:bg-slate-700/40">
        <td class="px-4 py-3">${escapeHTML(r.nombre || "")}</td>
        <td class="px-4 py-3">${escapeHTML(r.contacto || "")}</td>
        <td class="px-4 py-3">${escapeHTML(r.telefono || "")}</td>
        <td class="px-4 py-3">${escapeHTML(r.email || "")}</td>
        <td class="px-4 py-3">${escapeHTML(r.rfc || "")}</td>
        <td class="px-4 py-3">${badge}</td>
        <td class="px-4 py-3">
          <div class="flex justify-center gap-2">${btnPedido}${btnEditar}${btnToggle}</div>
        </td>
      </tr>
    `;
    })
    .join("");

  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

// Arreglo al escape de HTML (quitar el &nbsp; accidental)
function escapeHTML(s) {
  return (s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m])
  );
}

function renderPager() {
  const tot = state.total;
  const pages = Math.max(1, Math.ceil(tot / state.limit));
  const page = Math.min(state.page, pages);
  state.page = page;
  lblPagina.textContent = `Página ${page} / ${pages}`;
  lblResumen.textContent = `${tot} proveedor(es) — mostrando ${state.limit} por página`;
  btnPrev.disabled = page <= 1;
  btnNext.disabled = page >= pages;
}

async function editar(id) {
  const r = await fetch(`${API}?action=obtener&id=${id}`);
  const j = await r.json();
  if (!j.success) {
    Swal.fire("Error", "No se pudo obtener el proveedor", "error");
    return;
  }
  const p = j.proveedor;
  prov_id.value = p.id;
  nombre.value = p.nombre || "";
  contacto.value = p.contacto || "";
  telefono.value = p.telefono || "";
  email.value = p.email || "";
  rfc.value = p.rfc || "";
  direccion.value = p.direccion || "";
  openModal(true);
}

async function toggleActivo(id, activo) {
  const { isConfirmed } = await Swal.fire({
    title: activo == 1 ? "¿Activar proveedor?" : "¿Desactivar proveedor?",
    text:
      activo == 1
        ? "Podrás asignarlo a productos."
        : "Los productos existentes conservarán proveedor_id pero puedes filtrar por Activos.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí",
  });
  if (!isConfirmed) return;
  const r = await fetch(`${API}?action=toggle_activo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, activo }),
  });
  const j = await r.json();
  if (!j.success) {
    Swal.fire("Error", j.error || "No se pudo cambiar el estado", "error");
    return;
  }
  await listar();
}

formProv.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    nombre: nombre.value.trim(),
    contacto: contacto.value.trim(),
    telefono: telefono.value.trim(),
    email: email.value.trim(),
    rfc: rfc.value.trim(),
    direccion: direccion.value.trim(),
  };
  if (!payload.nombre) {
    swalInfo.fire("Falta nombre", "El nombre es obligatorio", "warning");
    return;
  }
  let url = `${API}?action=crear`;
  let msgOk = "Proveedor creado";
  if (prov_id.value) {
    url = `${API}?action=actualizar`;
    payload.id = parseInt(prov_id.value, 10);
    msgOk = "Proveedor actualizado";
  }
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!j.success) {
    Swal.fire("Error", j.error || "No se pudo guardar", "error");
    return;
  }
  swalSuccess.fire("Listo", msgOk, "success");
  closeModal();
  await listar();
});

btnBuscar.addEventListener("click", () => {
  state.page = 1;
  listar();
});
btnLimpiar.addEventListener("click", () => {
  q.value = "";
  filtroActivo.value = "1";
  state.page = 1;
  listar();
});
btnPrev.addEventListener("click", () => {
  if (state.page > 1) {
    state.page--;
    listar();
  }
});
btnNext.addEventListener("click", () => {
  state.page++;
  listar();
});

btnNuevo.addEventListener("click", () => openModal(false));
btnClose.addEventListener("click", closeModal);
btnCancelar.addEventListener("click", closeModal);

document.addEventListener("DOMContentLoaded", listar);

// ===================== PEDIDOS DE PROVEEDOR (MODAL) =====================

// Si quieres un botón global en tu toolbar, pon un <button id="btnAgregarPedidoProveedor"> y descomenta:
// document.getElementById('btnAgregarPedidoProveedor')?.addEventListener('click', ()=> abrirPedido(null));

function abrirPedido(preProveedorId = null) {
  openPedidoModal(preProveedorId);
}

async function openPedidoModal(preProveedorId = null) {
  // 1) Cargar proveedores activos para el <select> (si no viene preseleccionado)
  const params = new URLSearchParams({
    action: "listar",
    activo: 1,
    page: 1,
    limit: 999,
  });
  const rProv = await fetch(`${API}?${params.toString()}`);
  const jProv = await rProv.json();
  if (!jProv?.success) {
    return Swal.fire(
      "Error",
      jProv?.error || "No fue posible cargar proveedores",
      "error"
    );
  }
  const provs = jProv.proveedores || [];

  const options = [`<option value="">-- Selecciona proveedor --</option>`]
    .concat(
      provs.map((p) => `<option value="${p.id}">${escHtml(p.nombre)}</option>`)
    )
    .join("");

  // 2) Modal
  swalcard
    .fire({
      title: "Agregar pedido de proveedor",
      width: Math.min(window.innerWidth - 32, 920),
      // dentro de swalcard.fire({ ... })
      html: `
  <div class="text-left space-y-3">
    <label class="block text-sm font-medium">Proveedor</label>
    <select id="selProveedor" class="w-full border rounded-lg p-2 bg-white/80 dark:bg-slate-800">
      ${options}
    </select>

    <div class="mt-2">
      <div class="flex items-center justify-between">
        <div class="text-sm font-medium">Productos asignados</div>
        <div class="text-[11px] opacity-70">Tip: usa Enter para saltar al siguiente campo</div>
      </div>

      <div id="wrapProductos"
           class="mt-2 max-h-[60vh] overflow-auto rounded-lg border dark:border-slate-700">
        <div class="p-4 text-sm opacity-70">
          Selecciona un proveedor para cargar sus productos…
        </div>
      </div>
    </div>
  </div>
`,
      width: Math.min(window.innerWidth - 32, 1024), // un poco más ancho para 3 col
      didOpen: () => {
        const sel = document.getElementById("selProveedor");
        sel?.addEventListener("change", () =>
          pedido_cargarProductosProveedor(sel.value)
        );
        if (preProveedorId) {
          sel.value = String(preProveedorId);
          sel.disabled = true;
          pedido_cargarProductosProveedor(preProveedorId);
        }
      },

      showCancelButton: true,
      cancelButtonText: "Cancelar",
      confirmButtonText: "Guardar pedido",
      confirmButtonColor: "#059669", // emerald-600
      focusConfirm: false,
      didOpen: () => {
        const sel = document.getElementById("selProveedor");
        sel?.addEventListener("change", () =>
          pedido_cargarProductosProveedor(sel.value)
        );

        // botones para 2 ó 3 columnas
        document.getElementById("btnCols2")?.addEventListener("click", () => {
          document
            .getElementById("gridProductos")
            ?.classList.remove("xl:grid-cols-3");
          document
            .getElementById("gridProductos")
            ?.classList.add("xl:grid-cols-2");
        });
        document.getElementById("btnCols3")?.addEventListener("click", () => {
          document
            .getElementById("gridProductos")
            ?.classList.remove("xl:grid-cols-2");
          document
            .getElementById("gridProductos")
            ?.classList.add("xl:grid-cols-3");
        });

        if (preProveedorId) {
          sel.value = String(preProveedorId);
          sel.disabled = true;
          pedido_cargarProductosProveedor(preProveedorId);
        }
      },

      preConfirm: async () => {
        const sel = document.getElementById("selProveedor");
        const proveedor_id = parseInt(sel?.value || "0", 10);
        if (!proveedor_id) {
          Swal.showValidationMessage("Selecciona un proveedor.");
          return false;
        }

        const rows = Array.from(document.querySelectorAll(".row-producto"));
        const items = rows
          .map((row) => {
            // lee del data-id o del hidden .prod-id
            const rawId =
              row.dataset.id || row.querySelector(".prod-id")?.value;
            const producto_id = parseInt(rawId ?? "0", 10) || 0;

            const cantStr = row.querySelector(".inp-cantidad")?.value ?? "";
            const cantidad = cantStr === "" ? 0 : parseInt(cantStr, 10);

            const pp = parseFloat(
              row.querySelector(".inp-precio-prov")?.value ?? "NaN"
            );
            const pv = parseFloat(
              row.querySelector(".inp-precio-venta")?.value ?? "NaN"
            );

            return {
              proveedor_id,
              producto_id,
              cantidad,
              precio_proveedor_ped: Number.isFinite(pp) ? +pp : null,
              precio_venta_ped: Number.isFinite(pv) ? +pv : null,
              nota: null,
            };
          })
          .filter((x) => x.producto_id > 0 && x.cantidad > 0);

        if (items.length === 0) {
          Swal.showValidationMessage(
            "Captura al menos una cantidad mayor a 0."
          );
          return false;
        }

        try {
          const resp = await fetch(`${API}?action=agregar_pedido_batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              proveedor_id,
              creado_por: window.SESSION_UID || null,
              items,
            }),
          });
          const data = await resp.json();
          if (!data?.success) return data; // devolver para manejar abajo
          return data;
        } catch (err) {
          return { success: false, error: err?.message || "Error de red" };
        }
      },
    })
    .then(async (res) => {
      if (!res.isConfirmed) return;
      const data = res.value || {};

      if (data.success) {
        Swal.fire(
          "¡Pedido registrado!",
          `Se agregaron ${data.ok ?? "los"} productos al inventario.`,
          "success"
        );
        // refresca listados si necesitas
        await listar();
      } else {
        const errores = (data.errores || [])
          .map((e) => `<li>${escHtml(e)}</li>`)
          .join("");
        Swal.fire({
          icon: "warning",
          title: "Pedido parcialmente registrado",
          html: `
          <div class="space-y-2">
            <div>Éxitos: <b>${
              data.ok || 0
            }</b> &nbsp;•&nbsp; Fallos: <b class="text-red-600">${
            data.fail || 0
          }</b></div>
            ${
              errores
                ? `<ul class="list-disc pl-5 mt-2 text-sm">${errores}</ul>`
                : escHtml(data.error || "Error")
            }
          </div>
        `,
        });
        await listar(); // intenta refrescar de todos modos
      }
    });
}

async function pedido_cargarProductosProveedor(proveedor_id) {
  const wrap = document.getElementById("wrapProductos");
  wrap.innerHTML = `<div class="p-4 text-sm opacity-70">Cargando productos…</div>`;
  if (!proveedor_id) {
    wrap.innerHTML = `<div class="p-4 text-sm opacity-70">Selecciona un proveedor para cargar sus productos…</div>`;
    return;
  }

  try {
    const r = await fetch(
      `${API}?action=productos_por_proveedor&proveedor_id=${encodeURIComponent(
        proveedor_id
      )}`
    );
    const j = await r.json();
    if (!j?.success)
      throw new Error(j?.error || "No fue posible cargar productos");
    const productos = j.productos || [];

    if (productos.length === 0) {
      wrap.innerHTML = `<div class="p-4 text-sm opacity-70">Este proveedor no tiene productos asignados.</div>`;
      return;
    }

    // grid fijo 3 columnas en pantallas anchas
    wrap.innerHTML = `
      <div id="gridProductos" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 p-2"></div>
    `;
    const grid = document.getElementById("gridProductos");
    grid.innerHTML = productos.map((p) => cardProducto(p)).join("");

    // UX: resalta tarjeta cuando Cant. > 0 y permite Enter/Shift+Enter
    grid.querySelectorAll(".inp-cantidad").forEach((inp, idx, list) => {
      inp.addEventListener("input", () => {
        const card = inp.closest(".card-product");
        if ((parseFloat(inp.value) || 0) > 0)
          card.classList.add("ring-1", "ring-emerald-500/60");
        else card.classList.remove("ring-1", "ring-emerald-500/60");
      });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const dir = e.shiftKey ? -1 : 1;
          const next = list[idx + dir];
          if (next) next.focus();
        }
      });
    });
  } catch (e) {
    wrap.innerHTML = `<div class="p-4 text-red-500">${escHtml(
      e.message || e
    )}</div>`;
  }

  function cardProducto(p) {
    // toma el id sin importar cómo venga del API
    const pid = Number(p.id ?? p.producto_id ?? p.prod_id ?? p.productoId ?? 0);
    const nombre = escHtml(p.nombre || "");
    const codigo = escHtml(p.codigo || "");
    const stock = Number(p.stock || 0);
    const pv = Number.isFinite(+p.precio_venta ?? +p.precio)
      ? Number(p.precio_venta ?? p.precio).toFixed(2)
      : "";
    const pp = Number.isFinite(+p.precio_proveedor)
      ? Number(p.precio_proveedor).toFixed(2)
      : "";

    return `
    <div class="card-product row-producto rounded-lg border border-slate-600/40 bg-white/5 p-2"
         data-id="${pid}">
      <input type="hidden" class="prod-id" value="${pid}">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="text-[12px] font-semibold leading-tight truncate">${nombre}</div>
          <div class="text-[10px] opacity-60 leading-tight truncate">${codigo}</div>
        </div>
        <div class="text-[10px] opacity-70 whitespace-nowrap">
          Stock <b class="tabular-nums">${stock}</b>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-1 mt-2">
        <label class="col-span-1 flex flex-col gap-0.5 text-[10px] leading-tight">
          <span class="opacity-60">Cant.</span>
          <input type="number" min="0" step="1"
            class="inp-cantidad h-8 w-full text-right border rounded-md px-2 bg-white/80 dark:bg-slate-900"
            placeholder="0">
        </label>
        <label class="col-span-1 flex flex-col gap-0.5 text-[10px] leading-tight">
          <span class="opacity-60">Precio prov.</span>
          <input type="number" min="0" step="0.01"
            class="inp-precio-prov h-8 w-full text-right border rounded-md px-2 bg-white/80 dark:bg-slate-900"
            value="${pp}">
        </label>
        <label class="col-span-1 flex flex-col gap-0.5 text-[10px] leading-tight">
          <span class="opacity-60">Precio venta</span>
          <input type="number" min="0" step="0.01"
            class="inp-precio-venta h-8 w-full text-right border rounded-md px-2 bg-white/80 dark:bg-slate-900"
            value="${pv}">
        </label>
      </div>
    </div>
  `;
  }
}
// Helpers locales (evita colisión con tu escapeHTML)
function escHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        m
      ])
  );
}
function fmt2(n) {
  const x = Number(n);
  return isNaN(x) ? "" : x.toFixed(2);
}
async function abrirHistorialPedidos(proveedorId) {
  swalcard.fire({
    title: "Historial de pedidos",
    width: Math.min(window.innerWidth - 32, 900),
    html: `
      <div class="space-y-3 text-left">
        <div class="flex items-center gap-3">
          <label class="text-sm font-medium">Mes</label>
          <input id="mesPedidos" type="month" class="border rounded-lg p-2 bg-white/80 dark:bg-slate-800">
        </div>
        <div id="wrapHistPedidos" class="border rounded-lg divide-y dark:divide-slate-700 max-h-[60vh] overflow-auto">
          <div class="p-4 text-sm opacity-70">Selecciona un mes…</div>
        </div>
      </div>
    `,
    showCancelButton: true,
    showConfirmButton: false,
    didOpen: () => {
      const $mes = document.getElementById("mesPedidos");
      // preselecciona el mes actual
      const d = new Date();
      $mes.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      cargarHistorialPedidos(proveedorId, $mes.value);
      $mes.addEventListener("change", () =>
        cargarHistorialPedidos(proveedorId, $mes.value)
      );
    },
  });
}

async function cargarHistorialPedidos(proveedorId, mes) {
  const wrap = document.getElementById("wrapHistPedidos");
  wrap.innerHTML = `<div class="p-4 text-sm opacity-70">Cargando…</div>`;
  try {
    const url = `${API}?action=listar_pedidos_grupo&proveedor_id=${encodeURIComponent(
      proveedorId
    )}&mes=${encodeURIComponent(mes)}`;
    const r = await fetch(url);
    const j = await r.json();
    if (!j?.success) throw new Error(j?.error || "No fue posible cargar");

    const pedidos = j.pedidos || [];
    if (pedidos.length === 0) {
      wrap.innerHTML = `<div class="p-4 text-sm opacity-70">Sin pedidos en este mes.</div>`;
      return;
    }

    const head = `
      <div class="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 sticky top-0">
        <div class="col-span-3">Fecha</div>
        <div class="col-span-5">Grupo</div>
        <div class="col-span-2 text-right">Renglones</div>
        <div class="col-span-1 text-right">Pzs</div>
        <div class="col-span-1 text-right">PDF</div>
      </div>`;

    const rows = pedidos
      .map(
        (p) => `
      <div class="grid grid-cols-12 gap-2 items-center px-4 py-2">
        <div class="col-span-3 text-sm">${escHtml(p.fecha)}</div>
        <div class="col-span-5">
          <div class="text-sm font-medium">${escHtml(p.pedido_grupo)}</div>
          <div class="text-xs opacity-70">${escHtml(
            p.proveedor_nombre || ""
          )}</div>
        </div>
        <div class="col-span-2 text-right text-sm">${p.renglones}</div>
        <div class="col-span-1 text-right text-sm">${p.piezas}</div>
        <div class="col-span-1 text-right">
          <button class="px-3 py-1.5 rounded-lg border hover:bg-slate-700 transition"
                  onclick="generarPDFPedido('${p.pedido_grupo}')">PDF</button>
        </div>
      </div>
    `
      )
      .join("");

    wrap.innerHTML = head + rows;
  } catch (e) {
    wrap.innerHTML = `<div class="p-4 text-red-500">${escHtml(
      e.message || e
    )}</div>`;
  }
}
async function generarPDFPedido(grupo) {
  // 1) Abre la pestaña de inmediato (evita bloqueos de popups)
  const win = window.open("", "_blank");

  // 2) Trae el detalle del pedido
  const r = await fetch(
    `${API}?action=detalle_pedido_grupo&grupo=${encodeURIComponent(grupo)}`
  );
  const j = await r.json();
  if (!j?.success) {
    if (win) win.close();
    return Swal.fire(
      "Error",
      j?.error || "No se pudo obtener el detalle",
      "error"
    );
  }
  const items = j.items || [];
  if (!items.length) {
    if (win) win.close();
    return Swal.fire("Aviso", "Este pedido no tiene renglones", "info");
  }

  // 3) jsPDF UMD: toma el constructor correctamente
  const JP =
    window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : window.jsPDF;
  if (!JP) {
    if (win) win.close();
    return Swal.fire(
      "Falta jsPDF",
      "Incluye jspdf.umd.min.js en tu HTML",
      "warning"
    );
  }

  // 4) Crea el doc y dibuja (mm, carta)
  const doc = new JP({ unit: "mm", format: "letter" }); // 216x279mm
  doc.setTextColor(0, 0, 0); // asegúrate de no dibujar “blanco”
  doc.setFontSize(14);

  let y = 18;
  const left = 12,
    right = 200; // márgenes aprox (carta en mm ~ 216mm ancho)
  doc.text(`Pedido: ${grupo}`, left, y);
  y += 7;
  doc.setFontSize(11);
  doc.text(`Proveedor: ${items[0].proveedor_nombre || ""}`, left, y);
  y += 6;
  doc.text(`Fecha: ${items[0].creado_en || ""}`, left, y);
  y += 6;

  // Cabecera tabla
  y += 4;
  doc.setFontSize(10);
  doc.text("Código", left, y);
  doc.text("Producto", left + 35, y);
  doc.text("Cant.", right - 55, y, { align: "right" });
  doc.text("Costo", right - 30, y, { align: "right" });
  doc.text("Importe", right, y, { align: "right" });
  y += 2;
  doc.line(left, y, right, y);
  y += 6;

  // Filas
  let total = 0;
  const lineHeight = 6;
  const maxY = 270; // evita escribir fuera de página (letter ~279mm)
  items.forEach((it) => {
    const codigo = String(it.producto_codigo || "");
    const nombre = String(it.producto_nombre || "");
    const cant = Number(it.cantidad || 0);
    const costo = Number(it.precio_proveedor_ped || 0);
    const imp = cant * costo;
    total += imp;

    // salto de página si se acaba el espacio
    if (y > maxY) {
      doc.addPage();
      y = 18;
    }

    doc.text(codigo, left, y);
    doc.text(nombre, left + 35, y);
    doc.text(String(cant), right - 55, y, { align: "right" });
    doc.text(costo.toFixed(2), right - 30, y, { align: "right" });
    doc.text(imp.toFixed(2), right, y, { align: "right" });
    y += lineHeight;
  });

  // Total
  y += 2;
  doc.line(right - 55, y, right, y);
  y += 7;
  doc.setFontSize(12);
  doc.text("TOTAL", right - 30, y, { align: "right" });
  doc.text(total.toFixed(2), right, y, { align: "right" });

  // 5) Mostrar en nueva pestaña (NO descargar)
  try {
    const blob = doc.output("blob"); // genera el PDF
    const url = URL.createObjectURL(blob);
    if (win) {
      win.location.href = url; // navega a la URL del PDF
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
      // fallback si el navegador bloqueó la ventana
      doc.output("dataurlnewwindow");
    }
  } catch (e) {
    if (win) win.close();
    doc.output("dataurlnewwindow"); // último recurso
  }
}

document
  .getElementById("btnHistorialGlobal")
  ?.addEventListener("click", abrirHistorialGlobal);

async function abrirHistorialGlobal() {
  // Cargar proveedores activos para el select
  const rProv = await fetch(`${API}?action=listar&activo=1&page=1&limit=999`);
  const jProv = await rProv.json();
  const provs = jProv?.success ? jProv.proveedores || [] : [];

  const opts = ['<option value="0">Todos los proveedores</option>']
    .concat(
      provs.map(
        (p) => `<option value="${p.id}">${escapeHTML(p.nombre)}</option>`
      )
    )
    .join("");

  swalcard.fire({
    title: "Historial de pedidos",
    width: Math.min(window.innerWidth - 32, 980),
    html: `
      <div class="space-y-3 text-left">
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12 md:col-span-4">
            <label class="text-xs opacity-70">Proveedor</label>
            <select id="fProv" class="w-full border rounded-lg p-2 bg-white/80 dark:bg-slate-800">
              ${opts}
            </select>
          </div>
          <div class="col-span-6 md:col-span-3">
            <label class="text-xs opacity-70">Desde</label>
            <input id="fDesde" type="date" class="w-full border rounded-lg p-2 bg-white/80 dark:bg-slate-800">
          </div>
          <div class="col-span-6 md:col-span-3">
            <label class="text-xs opacity-70">Hasta</label>
            <input id="fHasta" type="date" class="w-full border rounded-lg p-2 bg-white/80 dark:bg-slate-800">
          </div>
          <div class="col-span-12 md:col-span-2">
            <label class="text-xs opacity-70">Buscar</label>
            <input id="fQ" type="text" placeholder="Grupo / código / nombre"
                   class="w-full border rounded-lg p-2 bg-white/80 dark:bg-slate-800">
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button id="btnBuscarPedidos" class="px-3 py-1.5 rounded-lg border hover:bg-slate-700 transition">Buscar</button>
          <div id="lblResumenPedidos" class="text-xs opacity-70"></div>
        </div>

        <div id="wrapPedidosRango"
             class="border rounded-lg divide-y dark:divide-slate-700 max-h-[60vh] overflow-auto">
          <div class="p-4 text-sm opacity-70">Ajusta el rango y presiona “Buscar”.</div>
        </div>
      </div>
    `,
    showCancelButton: true,
    showConfirmButton: false,
    didOpen: () => {
      // defaults: últimos 30 días
      const d2 = new Date();
      const d1 = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
      document.getElementById("fDesde").value = `${d1.getFullYear()}-${String(
        d1.getMonth() + 1
      ).padStart(2, "0")}-${String(d1.getDate()).padStart(2, "0")}`;
      document.getElementById("fHasta").value = `${d2.getFullYear()}-${String(
        d2.getMonth() + 1
      ).padStart(2, "0")}-${String(d2.getDate()).padStart(2, "0")}`;

      document
        .getElementById("btnBuscarPedidos")
        .addEventListener("click", () => cargarPedidosRango(1));
      // búsqueda en Enter
      document.getElementById("fQ").addEventListener("keydown", (e) => {
        if (e.key === "Enter") cargarPedidosRango(1);
      });

      // primera carga
      cargarPedidosRango(1);
    },
  });
}

async function cargarPedidosRango(page = 1) {
  const prov = parseInt(document.getElementById("fProv").value || "0", 10) || 0;
  const desde = document.getElementById("fDesde").value;
  const hasta = document.getElementById("fHasta").value;
  const q = document.getElementById("fQ").value.trim();

  const params = new URLSearchParams({
    action: "listar_pedidos_grupo_rango",
    proveedor_id: prov,
    desde,
    hasta,
    q,
    page: page,
    limit: 50,
  });

  const wrap = document.getElementById("wrapPedidosRango");
  const lbl = document.getElementById("lblResumenPedidos");
  wrap.innerHTML = `<div class="p-4 text-sm opacity-70">Cargando…</div>`;
  lbl.textContent = "";

  try {
    const r = await fetch(`${API}?${params.toString()}`);
    const j = await r.json();
    if (!j?.success) throw new Error(j?.error || "No se pudo cargar");

    const rows = j.pedidos || [];
    if (rows.length === 0) {
      wrap.innerHTML = `<div class="p-4 text-sm opacity-70">Sin resultados para el rango indicado.</div>`;
      lbl.textContent = `0 pedidos — del ${desde} al ${hasta}`;
      return;
    }

    const pages = Math.max(1, Math.ceil((j.total || rows.length) / j.limit));
    lbl.textContent = `${j.total} pedido(s) — del ${j.desde} al ${
      j.hasta
    } — Total compra: $${Number(j.suma_total || 0).toFixed(2)} — Página ${
      j.page
    }/${pages}`;

    const head = `
      <div class="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 sticky top-0">
        <div class="col-span-2">Fecha</div>
        <div class="col-span-3">Grupo</div>
        <div class="col-span-3">Proveedor</div>
        <div class="col-span-1 text-right">Rengl.</div>
        <div class="col-span-1 text-right">Pzs</div>
        <div class="col-span-1 text-right">Total</div>
        <div class="col-span-1 text-right">PDF</div>
      </div>`;

    const body = rows
      .map(
        (p) => `
      <div class="grid grid-cols-12 gap-2 items-center px-4 py-2">
        <div class="col-span-2 text-sm">${escHtml(p.fecha)}</div>
        <div class="col-span-3 text-sm tabular-nums">${escHtml(
          p.pedido_grupo
        )}</div>
        <div class="col-span-3">
          <div class="text-sm font-medium">${escHtml(
            p.proveedor_nombre || ""
          )}</div>
        </div>
        <div class="col-span-1 text-right text-sm">${p.renglones}</div>
        <div class="col-span-1 text-right text-sm">${Number(
          p.piezas || 0
        )}</div>
        <div class="col-span-1 text-right text-sm">$${Number(
          p.total_compra || 0
        ).toFixed(2)}</div>
        <div class="col-span-1 text-right">
          <button class="px-3 py-1.5 rounded-lg border hover:bg-slate-700 transition"
                  onclick="generarPDFPedido('${p.pedido_grupo}')">PDF</button>
        </div>
      </div>
    `
      )
      .join("");

    // Paginación simple (si la quieres)
    const pager =
      pages > 1
        ? `
      <div class="flex items-center justify-between px-4 py-2 border-t dark:border-slate-700">
        <button class="px-3 py-1.5 rounded-lg border disabled:opacity-40" ${
          j.page <= 1 ? "disabled" : ""
        }
                onclick="cargarPedidosRango(${j.page - 1})">Anterior</button>
        <div class="text-xs opacity-70">Página ${j.page} de ${pages}</div>
        <button class="px-3 py-1.5 rounded-lg border disabled:opacity-40" ${
          j.page >= pages ? "disabled" : ""
        }
                onclick="cargarPedidosRango(${j.page + 1})">Siguiente</button>
      </div>
    `
        : "";

    wrap.innerHTML = head + body + pager;
  } catch (e) {
    wrap.innerHTML = `<div class="p-4 text-red-500">${escHtml(
      e.message || e
    )}</div>`;
  }
}

// helper local
function escHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        m
      ])
  );
}
