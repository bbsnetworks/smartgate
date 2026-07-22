let USER_FILTER = "me"; // "me" | "all" | <iduser>

// ===============================
// Entradas (HikCentral) - Card
// ===============================
const API_BASE = `${location.origin}/smartgate/php/`;
const ENTRADAS_ENDPOINT = API_BASE + "entradas_controller.php";
const FOTO_ENDPOINT = "/smartgate/php/ver_foto_evento.php";

// ✅ Tabs (agregamos "Todos")
const EVENT_TABS = [
  {
    key: "todos",
    label: "Todos",
    pill: "bg-sky-600/20 text-sky-200 border-sky-500/30",
    icon: "bi bi-collection",
  },
  {
    key: "entrada",
    label: "Entradas",
    pill: "...",
    icon: "bi bi-check-circle",
  },
  {
    key: "vencida",
    label: "Membresía vencida",
    pill: "...",
    icon: "bi bi-exclamation-triangle",
  },
  {
    key: "no_registrado",
    label: "No registrado",
    pill: "...",
    icon: "bi bi-x-circle",
  },
];

let ENTRADAS_EVENT_KEY = "todos"; // ✅ default ahora "Todos"

// ===============================
// Helpers filtros (hora)
// ===============================
function pad2(n) {
  return String(n).padStart(2, "0");
}

function horaRedondeadaActual() {
  const d = new Date();
  return `${pad2(d.getHours())}:00`;
}

function horaMasUna(hhmm) {
  const [hh, mm] = String(hhmm || "00:00")
    .split(":")
    .map(Number);
  const h = (Number.isFinite(hh) ? hh : 0) + 1;
  return `${pad2(h % 24)}:${pad2(Number.isFinite(mm) ? mm : 0)}`;
}

function getIsTodos() {
  return ENTRADAS_EVENT_KEY === "todos";
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Helpers seguros (para no chocar con otros archivos)
const escHtml = (s) =>
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

const escAttr = (s) => escHtml(s).replace(/`/g, "&#96;");

function setEntradasUI({
  count = "—",
  estado = "—",
  sub = null,
  itemsHtml = "",
}) {
  const elCount = document.getElementById("entradas-count");
  const elEstado = document.getElementById("entradas-estado");
  const elSub = document.getElementById("entradas-sub");
  const elLista = document.getElementById("entradas-lista");

  if (elCount) elCount.textContent = count;
  if (elEstado) elEstado.textContent = estado;
  if (sub !== null && elSub) elSub.textContent = sub;
  if (elLista) elLista.innerHTML = itemsHtml;
}

function formatHora(raw) {
  if (!raw) return "—";

  // ✅ Preferimos extraer HH:MM del string para evitar conversiones de zona horaria
  // Ej: 2026-01-22T14:52:36+08:00  -> 14:52
  const s = String(raw);

  const mISO = s.match(/T(\d{2}):(\d{2})/);
  if (mISO) return `${mISO[1]}:${mISO[2]}`;

  const mSpace = s.match(/(\d{2}):(\d{2})(?::\d{2})?/);
  if (mSpace) return `${mSpace[1]}:${mSpace[2]}`;

  return s;
}

function renderEntradaItem({
  personCode,
  nombre,
  hora,
  picUri,
  tipoLabel,
  tipoIcon,
  tipoPill,
}) {
  const safeCode = escHtml(personCode ?? "—");
  const safeNombre = escHtml(nombre ?? "—");
  const safeHora = escHtml(hora ?? "—");

  // En "Todos" mostramos la etiqueta real del evento de cada registro.
  // En tabs específicas, usamos la del tab seleccionado.
  const tab = getIsTodos()
    ? {
        label: tipoLabel || "Evento",
        icon: tipoIcon || "bi bi-dot",
        pill: tipoPill || "bg-slate-700/40 text-slate-200 border-slate-500/30",
      }
    : getSelectedTabMeta();

  const img = picUri
    ? `<img data-picuri="${escAttr(picUri)}"
            class="h-10 w-10 rounded-full object-cover border border-slate-600/70 cursor-zoom-in"
            alt="foto">`
    : `<div class="h-10 w-10 rounded-full bg-slate-700/60 border border-slate-600/70 flex items-center justify-center text-slate-200">
         <i class="bi bi-person-fill"></i>
       </div>`;

  return `
    <li class="p-3 rounded-xl border border-slate-700/70 bg-slate-900/30 hover:bg-slate-800/40 transition">
      <div class="flex items-center gap-3">
        ${img}
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-slate-100 truncate">${safeNombre}</p>
              <p class="text-xs text-slate-400 mt-1">Código: <span class="text-slate-300">${safeCode}</span></p>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <span class="text-[11px] px-2 py-1 rounded-full border ${tab.pill}">
                <i class="${tab.icon} mr-1"></i>${escHtml(tab.label)}
              </span>
              <span class="text-xs text-slate-300 bg-slate-700/50 border border-slate-600/60 px-2 py-1 rounded-full">
                ${safeHora}
              </span>
            </div>
          </div>
        </div>
      </div>
    </li>
  `;
}
// ===============================
// ✅ Filtros UI
// ===============================
function initEntradasFiltros() {
  const wrap = document.getElementById("entradas-filtros");
  if (!wrap) return;

  // Valores por defecto
  const hDesde = horaRedondeadaActual();
  const hHasta = horaMasUna(hDesde);

  wrap.innerHTML = `
    <div class="flex flex-wrap gap-2 items-center w-full">
      <div class="flex items-center gap-2">
        <label class="text-xs text-slate-400">Desde</label>
        <input id="entradas-hora-desde" type="time" value="${escAttr(hDesde)}"
               class="h-9 px-2 rounded-lg border border-slate-700/70 bg-slate-900/40 text-slate-200 text-sm"/>
      </div>

      <div class="flex items-center gap-2">
        <label class="text-xs text-slate-400">Hasta</label>
        <input id="entradas-hora-hasta" type="time" value="${escAttr(hHasta)}"
               class="h-9 px-2 rounded-lg border border-slate-700/70 bg-slate-900/40 text-slate-200 text-sm"/>
      </div>

      <div class="flex-1 min-w-[180px]">
        <input id="entradas-buscar" type="text" placeholder="Buscar por personCode…"
               class="w-full h-9 px-3 rounded-lg border border-slate-700/70 bg-slate-900/40 text-slate-200 text-sm outline-none focus:ring-2 focus:ring-sky-500/30"/>
      </div>

      <button id="entradas-aplicar-filtros" type="button"
              class="h-9 px-3 rounded-lg border border-slate-700/70 bg-slate-800/40 text-slate-200 text-sm hover:bg-slate-800/70">
        <i class="bi bi-funnel mr-1"></i>Aplicar
      </button>
    </div>
  `;

  // listeners
  const btn = document.getElementById("entradas-aplicar-filtros");
  const q = document.getElementById("entradas-buscar");

  btn?.addEventListener("click", () => cargarEntradasCard());

  // Enter en búsqueda
  q?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") cargarEntradasCard();
  });
}
function toggleEntradasFiltros() {
  const wrap = document.getElementById("entradas-filtros");
  if (!wrap) return;
  // En "Todos" ocultamos filtros para mantenerlo rápido
  wrap.classList.toggle("hidden", getIsTodos());
}
function toggleEntradasFecha() {
  const wrap = document.getElementById("entradas-fecha-wrap");
  const inputFecha = document.getElementById("entradas-fecha");
  if (!wrap || !inputFecha) return;

  if (getIsTodos()) {
    inputFecha.classList.add("hidden"); // ❌ fecha
  } else {
    inputFecha.classList.remove("hidden"); // ✅ fecha
  }
}

// Inicializa listeners (solo 1 vez)
function initEntradasCard() {
  const inputFecha = document.getElementById("entradas-fecha");
  const btnRefresh = document.getElementById("entradas-refresh");

  if (!inputFecha) return;

  if (!inputFecha.value) inputFecha.value = todayISO();

  inputFecha.addEventListener("change", () => cargarEntradasCard());
  btnRefresh?.addEventListener("click", () => cargarEntradasCard());
}
function initEntradasTabs() {
  const wrap = document.getElementById("entradas-tabs");
  if (!wrap) return;

  wrap.innerHTML = EVENT_TABS.map((t) => {
    const active = t.key === ENTRADAS_EVENT_KEY;
    return `
      <button type="button"
        data-eventkey="${escAttr(t.key)}"
        class="px-3 py-2 rounded-lg border text-sm font-medium transition
               ${active ? "bg-slate-700/70 border-slate-500/60 text-white" : "bg-slate-900/30 border-slate-700/70 text-slate-300 hover:bg-slate-800/50"}">
        <i class="${t.icon} mr-1"></i>${escHtml(t.label)}
      </button>
    `;
  }).join("");

  wrap.querySelectorAll("button[data-eventkey]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      ENTRADAS_EVENT_KEY = btn.getAttribute("data-eventkey") || "todos";
      initEntradasTabs();
      toggleEntradasFecha();
      toggleEntradasFiltros();
      await cargarEntradasCard();
    });
  });
}

function getSelectedEventType() {
  const t = EVENT_TABS.find((x) => x.key === ENTRADAS_EVENT_KEY);
  return t ? t.eventType : 196893;
}

function getSelectedTabMeta() {
  return EVENT_TABS.find((x) => x.key === ENTRADAS_EVENT_KEY) || EVENT_TABS[0];
}
function getFiltrosEntradas() {
  const hDesde = document.getElementById("entradas-hora-desde")?.value || "";
  const hHasta = document.getElementById("entradas-hora-hasta")?.value || "";
  const q = (document.getElementById("entradas-buscar")?.value || "").trim();
  return { hDesde, hHasta, q };
}
function setEntradasLoading(isLoading, text = "Cargando…") {
  const overlay = document.getElementById("entradas-loading");
  const label = document.getElementById("entradas-loading-text");
  if (!overlay) return;

  if (label) label.textContent = text;

  if (isLoading) overlay.classList.remove("hidden");
  else overlay.classList.add("hidden");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Llamada principal (respeta fecha seleccionada + USER_FILTER)
async function cargarEntradas(fechaISO) {
  setEntradasUI({
    count: "—",
    estado: "Cargando…",
    sub: `Mostrando accesos del ${fechaISO}`,
    itemsHtml: `
      <li class="p-3 rounded-xl border border-slate-700/70 bg-slate-900/30">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-full bg-slate-700/60 animate-pulse"></div>
          <div class="flex-1">
            <div class="h-4 w-1/2 bg-slate-700/60 rounded animate-pulse"></div>
            <div class="h-3 w-1/3 bg-slate-700/40 rounded mt-2 animate-pulse"></div>
          </div>
        </div>
      </li>
    `,
  });

  setEntradasLoading(true, "Cargando accesos…");

  try {
    const url = new URL(ENTRADAS_ENDPOINT, location.origin);
    url.searchParams.set("fecha", fechaISO);
    url.searchParams.set("user", USER_FILTER);

    // tipo
    url.searchParams.set("tipo", ENTRADAS_EVENT_KEY); // "todos" | "entrada" | ...

    // filtros extra (solo si NO es "todos")
    if (!getIsTodos()) {
      const { hDesde, hHasta, q } = getFiltrosEntradas();
      if (hDesde) url.searchParams.set("hora_desde", hDesde);
      if (hHasta) url.searchParams.set("hora_hasta", hHasta);
      if (q) url.searchParams.set("q", q);
    } else {
      // ✅ Para "Todos": limitar 10 (backend ideal), pero también lo recortamos aquí por seguridad
      url.searchParams.set("limit", "5");
    }

    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json();

    const list = data?.list ?? data?.data?.list ?? data?.data ?? [];

    if (!Array.isArray(list) || list.length === 0) {
      setEntradasUI({
        count: "0",
        estado: "Sin registros",
        itemsHtml: `
          <li class="p-4 rounded-xl border border-slate-700/70 bg-slate-900/30 text-slate-300">
            <i class="bi bi-info-circle text-sky-300 mr-2"></i>
            No hay registros para estos filtros.
          </li>
        `,
      });
      setEntradasLoading(false);
      return;
    }

    // ✅ Mapeo: personCode + tipo real opcional (para Todos)
    let mapped = list.map((x) => ({
      personCode: x.personCode ?? x.personId ?? "", // fallback temporal si aún no viene
      nombre: x.personName ?? "—",
      hora: formatHora(x.eventTime ?? ""),
      picUri: x.picUri ?? "",

      // En "Todos" es ideal que el backend mande "tipo" o "eventKey"
      tipo: x.tipo ?? x.eventKey ?? x.eventType ?? null,
    }));

    // ✅ recorte extra por si el backend no aplicó limit
    if (getIsTodos()) mapped = mapped.slice(0, 10);

    // Etiquetado en "Todos" (si backend manda tipo/eventKey)
    const tipoMeta = (tipo) => {
      // Ajusta si tu backend manda strings "entrada|vencida|no_registrado"
      if (tipo === "entrada" || tipo === 196893) {
        return {
          tipoLabel: "Entradas",
          tipoIcon: "bi bi-check-circle",
          tipoPill: EVENT_TABS.find((t) => t.key === "entrada")?.pill || "",
        };
      }
      if (tipo === "vencida" || tipo === 197384) {
        return {
          tipoLabel: "Membresía vencida",
          tipoIcon: "bi bi-exclamation-triangle",
          tipoPill: EVENT_TABS.find((t) => t.key === "vencida")?.pill || "",
        };
      }
      if (tipo === "no_registrado" || tipo === 197151) {
        return {
          tipoLabel: "No registrado",
          tipoIcon: "bi bi-x-circle",
          tipoPill:
            EVENT_TABS.find((t) => t.key === "no_registrado")?.pill || "",
        };
      }
      return {
        tipoLabel: "Evento",
        tipoIcon: "bi bi-dot",
        tipoPill: "bg-slate-700/40 text-slate-200 border-slate-500/30",
      };
    };

    const html = mapped
      .map((it) => {
        const extra = getIsTodos() ? tipoMeta(it.tipo) : {};
        return renderEntradaItem({ ...it, ...extra });
      })
      .join("");

    setEntradasUI({
      count: String(mapped.length),
      estado: `Mostrando ${mapped.length}`,
      itemsHtml: html,
    });

    // ✅ Fotos SOLO una vez
    setEntradasLoading(true, "Cargando fotos…");
    await cargarFotosEntradas();
    setEntradasLoading(false);
  } catch (e) {
    console.error(e);
    setEntradasUI({
      count: "—",
      estado: "Error al cargar",
      itemsHtml: `
        <li class="p-4 rounded-xl border border-rose-700/50 bg-rose-900/20 text-rose-200">
          <i class="bi bi-exclamation-triangle mr-2"></i>
          No se pudieron cargar los accesos. Revisa el endpoint o la respuesta JSON.
        </li>
      `,
    });
    setEntradasLoading(false);
  }
}

// Para integrarlo con tu flujo actual (cargarTodo)
async function cargarEntradasCard() {
  const inputFecha = document.getElementById("entradas-fecha");
  if (!inputFecha) return;

  const fecha = inputFecha.value || todayISO();
  inputFecha.value = fecha;

  await cargarEntradas(fecha);
}
async function cargarFotosEntradas() {
  const imgs = Array.from(
    document.querySelectorAll("#entradas-lista img[data-picuri]"),
  );

  const tasks = imgs.map(async (img) => {
    const uri = img.getAttribute("data-picuri");
    if (!uri) return;

    try {
      const url = `${FOTO_ENDPOINT}?uri=${encodeURIComponent(uri)}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return;

      const dataUri = (await r.text()).trim();
      if (dataUri.startsWith("data:image")) img.src = dataUri;
    } catch (e) {
      /* no-op */
    }
  });

  await Promise.all(tasks);
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1) Cargar select global y fijar USER_FILTER
  await cargarUsuariosGlobal();

  // 2) KPIs + gráficas con el filtro actual
  await cargarTodo();

  initPagosFinanciadosDashboard();

  // ✅ Botón: ver clientes inactivos (modal)
  const btnInactivos = document.getElementById("btn-ver-inactivos");
  btnInactivos?.addEventListener("click", () => abrirModalClientesInactivos());
  // Entradas: init listeners + primera carga
  initEntradasCard();
  initEntradasTabs();
  initEntradasFiltros();
  toggleEntradasFiltros();
  toggleEntradasFecha();
  initEntradasFotoModal();
  await cargarEntradasCard();

  // 3) Listeners: solo la resolución de cada gráfica
  document
    .getElementById("res-insc")
    ?.addEventListener("change", () =>
      cargarSerie(
        "insc",
        document.getElementById("res-insc").value,
        "chart-insc",
      ),
    );
  document
    .getElementById("res-prod")
    ?.addEventListener("change", () =>
      cargarSerie(
        "prod",
        document.getElementById("res-prod").value,
        "chart-prod",
      ),
    );

  // 4) Abrir puerta desde card (igual que lo tenías)
  const cardPuerta = document.getElementById("card-abrir-puerta");
  if (cardPuerta) {
    cardPuerta.addEventListener("click", async () => {
      try {
        swalSuccess.fire({
          title: "Abriendo puerta...",
          didOpen: () => Swal.showLoading(),
        });
        const r = await fetch("php/abrir_puerta.php", { method: "POST" });
        const data = await r.json();
        if (data.success || data.code === "0") {
          swalSuccess.fire("Listo", "La puerta ha sido abierta", "success");
        } else {
          swalError.fire("Error", data.error || "No se pudo abrir la puerta");
        }
      } catch (e) {
        swalError.fire("Error", "Fallo al conectar con el servidor");
      }
    });
  }
});

async function cargarKPIs() {
  try {
    const url = new URL("smartgate/php/dashboard_resumen.php", location.origin);
    url.searchParams.set("period", "hoy");
    url.searchParams.set("user", USER_FILTER); // NUEVO

    const res = await fetch(url, { cache: "no-store" });
    const d = await res.json();

    setText("#kpi-activos", d.activos ?? "0");
    setText("#kpi-inactivos", d.inactivos ?? "0");
    setText("#kpi-aniversarios", d.aniversarios_hoy ?? "0");

    setText("#kpi-ventas", d.ventas_monto_fmt ?? "$0");
    setText("#kpi-ventas-det", d.ventas_detalle ?? "");
    setText("#kpi-inscripciones", d.inscripciones ?? "0");
    setText("#kpi-insc-det", d.inscripciones_detalle ?? "");

    // Lista de aniversarios
    const ul = document.getElementById("lista-aniversarios");
    if (ul) {
      ul.innerHTML = "";
      const arr = Array.isArray(d.aniversarios_lista)
        ? d.aniversarios_lista
        : [];
      if (arr.length === 0) {
        ul.innerHTML = '<li class="text-slate-400">Sin aniversarios hoy</li>';
      } else {
        arr.forEach((item) => {
          const n = Number(item.anios) || 0;
          const li = document.createElement("li");
          li.className =
            "flex items-center justify-between bg-slate-700/40 border border-slate-600/30 rounded-md px-2 py-1";
          li.innerHTML = `<span>${item.nombre}</span><span class="text-amber-300 font-semibold">${n} ${n === 1 ? "año" : "años"}</span>`;
          ul.appendChild(li);
        });
      }
      // --- Stock bajo ---
      const ulStock = document.getElementById("lista-stock-bajo");
      if (ulStock) {
        ulStock.innerHTML = "";
        const items = Array.isArray(d.stock_bajo) ? d.stock_bajo : [];
        if (items.length === 0) {
          ulStock.innerHTML =
            '<li class="text-slate-400">Sin alertas de stock</li>';
        } else {
          items.forEach((it) => {
            const li = document.createElement("li");
            li.className =
              "flex items-center justify-between bg-red-900/30 border border-red-500/30 rounded-md px-2 py-1";
            li.innerHTML = `
    <span class="truncate mr-2 text-slate-200">${it.nombre}</span>
    <span class="text-red-300 font-semibold">${it.stock}</span>
    ${typeof it.min === "number" ? `<span class="text-xs text-slate-400 ml-2">/ min ${it.min}</span>` : ""}
  `;
            ulStock.appendChild(li);
          });
        }
        const foot = document.getElementById("stock-bajo-footer");
        if (foot)
          foot.textContent = items.length
            ? `${items.length} producto(s) bajo umbral`
            : "";
      }
    }

    // Nuevo: monto de inscripciones
    setText("#kpi-inscripciones-monto", d.inscripciones_monto_fmt ?? "$0");
    setText("#kpi-insc-monto-det", d.inscripciones_monto_detalle ?? "");
  } catch (e) {
    console.error(e);
  }
}

function setText(sel, val) {
  const el = document.querySelector(sel);
  if (el) el.textContent = val;
}

// --------- Gráficas ---------
const charts = {}; // canvasId -> Chart

async function cargarSerie(serie, resol, canvasId) {
  try {
    const url = new URL("smartgate/php/dashboard_resumen.php", location.origin);
    url.searchParams.set("serie", serie);
    url.searchParams.set("res", resol);
    url.searchParams.set("user", USER_FILTER); // NUEVO

    const res = await fetch(url, { cache: "no-store" });
    const d = await res.json();
    // ... lo demás igual

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (charts[canvasId]) charts[canvasId].destroy();

    charts[canvasId] = new Chart(ctx, {
      type: "line",
      data: {
        labels: d.labels || [],
        datasets: [
          {
            label: serie === "insc" ? "Inscripciones" : "Ventas de productos",
            data: d.data || [],
            tension: 0.25,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: "rgba(148,163,184,0.1)" },
            ticks: { color: "#cbd5e1" },
          },
          y: {
            grid: { color: "rgba(148,163,184,0.1)" },
            ticks: { color: "#cbd5e1" },
          },
        },
      },
    });
  } catch (e) {
    console.error(e);
  }
}

// js/branding.js
const BRANDING = {
  MAX_BYTES: 2 * 1024 * 1024, // 2MB
  GET_URL: "php/obtener_branding.php",
  LOGO_URL: "php/logo_branding.php",
  SAVE_URL: "php/actualizar_branding.php",
};

// Cargar branding al iniciar
document.addEventListener("DOMContentLoaded", cargarBranding);

async function cargarBranding() {
  try {
    const r = await fetch(BRANDING.GET_URL, { cache: "no-store" });
    const b = await r.json();

    // Título de la pestaña y texto en sidebar
    if (b.app_name) document.title = `Dashboard - ${b.app_name}`;
    const elAppName = document.getElementById("sidebarAppName");
    if (elAppName && b.app_name) elAppName.textContent = b.app_name;

    // Título del dashboard
    const elTitle = document.getElementById("tituloDashboard");
    if (elTitle && b.dashboard_title) elTitle.textContent = b.dashboard_title;

    // Logo: usa etag para romper caché
    if (b.logo_etag) {
      const v = `?v=${encodeURIComponent(b.logo_etag)}`;
      const side = document.getElementById("sidebarLogoImg");
      const main = document.getElementById("mainLogoImg");
      if (side) side.src = `${BRANDING.LOGO_URL}${v}`;
      if (main) main.src = `${BRANDING.LOGO_URL}${v}`;
    }
  } catch (e) {
    console.warn("No se pudo cargar branding:", e);
  }
}
function convertirHora12(hora24) {
  if (!hora24) {
    return "";
  }

  const [horaTexto, minutos] = hora24.split(":");
  let hora = Number(horaTexto);

  const periodo = hora >= 12 ? "P.M." : "A.M.";

  hora %= 12;

  if (hora === 0) {
    hora = 12;
  }

  return `${hora}:${minutos} ${periodo}`;
}

function configurarDiaCerrado(checkboxId, aperturaId, cierreId) {
  const checkbox = document.getElementById(checkboxId);
  const apertura = document.getElementById(aperturaId);
  const cierre = document.getElementById(cierreId);

  // Evita errores si algún elemento no existe en el modal.
  if (!checkbox || !apertura || !cierre) {
    console.error("No se encontraron los campos del horario:", {
      checkboxId,
      aperturaId,
      cierreId,
    });

    return;
  }

  function actualizarEstado() {
    const cerrado = checkbox.checked;

    apertura.disabled = cerrado;
    cierre.disabled = cerrado;
  }

  checkbox.addEventListener("change", actualizarEstado);

  actualizarEstado();
}

function generarTextoHorario() {
  const semanaApertura = document.getElementById("horarioSemanaApertura").value;

  const semanaCierre = document.getElementById("horarioSemanaCierre").value;

  const sabadoCerrado = document.getElementById("sabadoCerrado").checked;

  const sabadoApertura = document.getElementById("horarioSabadoApertura").value;

  const sabadoCierre = document.getElementById("horarioSabadoCierre").value;

  const domingoCerrado = document.getElementById("domingoCerrado").checked;

  const domingoApertura = document.getElementById(
    "horarioDomingoApertura",
  ).value;

  const domingoCierre = document.getElementById("horarioDomingoCierre").value;

  const lineas = [
    "LUNES A VIERNES",
    `${convertirHora12(semanaApertura)} - ${convertirHora12(semanaCierre)}`,
    "SÁBADOS",
    sabadoCerrado
      ? "CERRADO"
      : `${convertirHora12(sabadoApertura)} - ${convertirHora12(sabadoCierre)}`,
    "DOMINGOS",
    domingoCerrado
      ? "CERRADO"
      : `${convertirHora12(domingoApertura)} - ${convertirHora12(
          domingoCierre,
        )}`,
  ];

  return lineas.join("\n");
}
function convertirHora24(hora, minutos, periodo) {
  let horaNumero = Number(hora);

  if (periodo === "P.M." && horaNumero !== 12) {
    horaNumero += 12;
  }

  if (periodo === "A.M." && horaNumero === 12) {
    horaNumero = 0;
  }

  return `${String(horaNumero).padStart(2, "0")}:${minutos}`;
}

function extraerRangoHorario(texto) {
  if (!texto || texto.trim().toUpperCase() === "CERRADO") {
    return null;
  }

  const patron =
    /(\d{1,2}):(\d{2})\s*(A\.M\.|P\.M\.)\s*-\s*(\d{1,2}):(\d{2})\s*(A\.M\.|P\.M\.)/i;

  const coincidencia = texto.match(patron);

  if (!coincidencia) {
    return null;
  }

  return {
    apertura: convertirHora24(
      coincidencia[1],
      coincidencia[2],
      coincidencia[3].toUpperCase(),
    ),
    cierre: convertirHora24(
      coincidencia[4],
      coincidencia[5],
      coincidencia[6].toUpperCase(),
    ),
  };
}

function precargarHorario(textoHorario) {
  if (!textoHorario) {
    return;
  }

  const lineas = textoHorario
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  function contenidoDespuesDe(titulo) {
    const indice = lineas.findIndex((linea) => linea.toUpperCase() === titulo);

    return indice >= 0 ? lineas[indice + 1] || "" : "";
  }

  const semanaTexto = contenidoDespuesDe("LUNES A VIERNES");
  const sabadoTexto = contenidoDespuesDe("SÁBADOS");
  const domingoTexto = contenidoDespuesDe("DOMINGOS");

  const semana = extraerRangoHorario(semanaTexto);
  const sabado = extraerRangoHorario(sabadoTexto);
  const domingo = extraerRangoHorario(domingoTexto);

  if (semana) {
    document.getElementById("horarioSemanaApertura").value = semana.apertura;

    document.getElementById("horarioSemanaCierre").value = semana.cierre;
  }

  const sabadoCerrado = !sabadoTexto || sabadoTexto.toUpperCase() === "CERRADO";

  document.getElementById("sabadoCerrado").checked = sabadoCerrado;

  if (sabado) {
    document.getElementById("horarioSabadoApertura").value = sabado.apertura;

    document.getElementById("horarioSabadoCierre").value = sabado.cierre;
  }

  const domingoCerrado =
    !domingoTexto || domingoTexto.toUpperCase() === "CERRADO";

  document.getElementById("domingoCerrado").checked = domingoCerrado;

  if (domingo) {
    document.getElementById("horarioDomingoApertura").value = domingo.apertura;

    document.getElementById("horarioDomingoCierre").value = domingo.cierre;
  }

  document.getElementById("sabadoCerrado").dispatchEvent(new Event("change"));

  document.getElementById("domingoCerrado").dispatchEvent(new Event("change"));
}
// Abre el modal para editar branding
function modalBranding() {
  const inputClass = `
    w-full rounded-xl border border-slate-600
    bg-slate-900/60 px-4 py-3 text-sm text-slate-100
    placeholder:text-slate-500 outline-none
    transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
  `;

  const labelClass = "mb-2 block text-sm font-medium text-slate-200";

  swalcard
    .fire({
      title: `
        <div class="flex items-center justify-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl
                       bg-violet-500/15 text-violet-400">
            <i class="bi bi-palette-fill"></i>
          </span>

          <span>Configuración de marca</span>
        </div>
      `,

      width: "760px",

      html: `
        <div class="max-h-[65vh] overflow-y-auto overflow-x-hidden
                    px-1 pr-3 text-left">

          <!-- Información general -->
          <section class="mb-5 rounded-2xl border border-slate-700
                          bg-slate-900/30 p-5">

            <div class="mb-4 flex items-center gap-2 text-violet-400">
              <i class="bi bi-window"></i>
              <h3 class="font-semibold">Información general</h3>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label for="brandAppName" class="${labelClass}">
                  Nombre de la aplicación
                </label>

                <input
                  id="brandAppName"
                  type="text"
                  maxlength="120"
                  class="${inputClass}"
                  placeholder="Gym Admin"
                >
              </div>

              <div>
                <label for="brandTitle" class="${labelClass}">
                  Título del dashboard
                </label>

                <input
                  id="brandTitle"
                  type="text"
                  maxlength="160"
                  class="${inputClass}"
                  placeholder="Panel de Control"
                >
              </div>

              <div class="md:col-span-2">
                <label for="brandSub" class="${labelClass}">
                  Subtítulo
                </label>

                <input
                  id="brandSub"
                  type="text"
                  maxlength="200"
                  class="${inputClass}"
                  placeholder="SmartGate by BBSNetworks"
                >
              </div>
            </div>
          </section>

          <!-- Información para tickets -->
          <section class="mb-5 rounded-2xl border border-slate-700
                          bg-slate-900/30 p-5">

            <div class="mb-1 flex items-center gap-2 text-emerald-400">
              <i class="bi bi-receipt"></i>
              <h3 class="font-semibold">
                Información para tickets
              </h3>
            </div>

            <p class="mb-4 text-xs text-slate-400">
              Estos textos se mostrarán en los comprobantes impresos.
            </p>

            <div class="space-y-4">
              <div>
  <label class="${labelClass}">
    Horario de atención
  </label>

  <div class="space-y-3 rounded-xl border border-slate-700 bg-slate-950/30 p-4">

    <!-- Lunes a viernes -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <div>
        <p class="text-sm font-medium text-slate-200">
          Lunes a viernes
        </p>
      </div>

      <div>
        <label for="horarioSemanaApertura"
               class="mb-1 block text-xs text-slate-400">
          Apertura
        </label>

        <input
          id="horarioSemanaApertura"
          type="time"
          value="06:00"
          class="${inputClass}"
        >
      </div>

      <div>
        <label for="horarioSemanaCierre"
               class="mb-1 block text-xs text-slate-400">
          Cierre
        </label>

        <input
          id="horarioSemanaCierre"
          type="time"
          value="22:00"
          class="${inputClass}"
        >
      </div>
    </div>

    <div class="border-t border-slate-700"></div>

    <!-- Sábado -->
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-medium text-slate-200">
          Sábado
        </p>

        <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            id="sabadoCerrado"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-600 bg-slate-800 text-violet-600"
          >
          Cerrado
        </label>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label for="horarioSabadoApertura"
                 class="mb-1 block text-xs text-slate-400">
            Apertura
          </label>

          <input
            id="horarioSabadoApertura"
            type="time"
            value="07:00"
            class="${inputClass}"
          >
        </div>

        <div>
          <label for="horarioSabadoCierre"
                 class="mb-1 block text-xs text-slate-400">
            Cierre
          </label>

          <input
            id="horarioSabadoCierre"
            type="time"
            value="14:00"
            class="${inputClass}"
          >
        </div>
      </div>
    </div>

    <div class="border-t border-slate-700"></div>

    <!-- Domingo -->
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-medium text-slate-200">
          Domingo
        </p>

        <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            id="domingoCerrado"
            type="checkbox"
            checked
            class="h-4 w-4 rounded border-slate-600 bg-slate-800 text-violet-600"
          >
          Cerrado
        </label>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label for="horarioDomingoApertura"
                 class="mb-1 block text-xs text-slate-400">
            Apertura
          </label>

          <input
            id="horarioDomingoApertura"
            type="time"
            value="08:00"
            disabled
            class="${inputClass} disabled:cursor-not-allowed disabled:opacity-40"
          >
        </div>

        <div>
          <label for="horarioDomingoCierre"
                 class="mb-1 block text-xs text-slate-400">
            Cierre
          </label>

          <input
            id="horarioDomingoCierre"
            type="time"
            value="13:00"
            disabled
            class="${inputClass} disabled:cursor-not-allowed disabled:opacity-40"
          >
        </div>
      </div>
    </div>
  </div>

  <p class="mt-2 text-xs text-slate-500">
    El texto del horario se generará automáticamente para los tickets.
  </p>
</div>

              <div>
                <label for="brandRedes" class="${labelClass}">
                  Redes sociales
                </label>

                <input
                  id="brandRedes"
                  type="text"
                  maxlength="255"
                  class="${inputClass}"
                  placeholder="@BBSNetworks"
                >
              </div>

              <div>
                <label for="brandMensaje" class="${labelClass}">
                  Mensaje para tickets
                </label>

                <textarea
                  id="brandMensaje"
                  rows="3"
                  maxlength="255"
                  class="${inputClass} resize-y"
                  placeholder="¡GRACIAS POR TU PREFERENCIA!"
                ></textarea>

                <p class="mt-1 text-xs text-slate-500">
                  Este mismo mensaje se utilizará en todos los tickets.
                </p>
              </div>
            </div>
          </section>

          <!-- Logotipo -->
          <section class="rounded-2xl border border-slate-700
                          bg-slate-900/30 p-5">

            <div class="mb-4 flex items-center gap-2 text-amber-400">
              <i class="bi bi-image"></i>
              <h3 class="font-semibold">Logotipo</h3>
            </div>

            <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div
                id="brandPreview"
                class="flex h-24 w-32 shrink-0 items-center justify-center
                       overflow-hidden rounded-xl border border-dashed
                       border-slate-600 bg-slate-950/50"
              >
                <div
                  id="brandPreviewPlaceholder"
                  class="text-center text-slate-500"
                >
                  <i class="bi bi-image block text-2xl"></i>
                  <span class="text-xs">Sin imagen</span>
                </div>

                <img
                  id="brandPreviewImg"
                  class="hidden h-full w-full object-contain p-2"
                  alt="Vista previa del logotipo"
                >
              </div>

              <div class="min-w-0 flex-1">
                <label for="brandLogo" class="${labelClass}">
                  Seleccionar imagen
                </label>

                <input
                  id="brandLogo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  class="block w-full cursor-pointer rounded-xl border
                         border-slate-600 bg-slate-900/60 text-sm
                         text-slate-300 file:mr-4 file:border-0
                         file:bg-violet-600 file:px-4 file:py-3
                         file:text-sm file:font-medium file:text-white
                         hover:file:bg-violet-500"
                >

                <p class="mt-2 text-xs text-slate-500">
                  PNG, JPG, WEBP o GIF. Tamaño máximo:
                  ${(BRANDING.MAX_BYTES / 1024 / 1024).toFixed(0)} MB.
                </p>
              </div>
            </div>
          </section>
        </div>
      `,

      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-floppy mr-2"></i>Guardar cambios',
      cancelButtonText: "Cancelar",
      focusConfirm: false,
      buttonsStyling: true,

      didOpen: async () => {
        const popup = Swal.getPopup();

        popup.style.maxWidth = "calc(100vw - 24px)";
        configurarDiaCerrado(
          "sabadoCerrado",
          "horarioSabadoApertura",
          "horarioSabadoCierre",
        );

        configurarDiaCerrado(
          "domingoCerrado",
          "horarioDomingoApertura",
          "horarioDomingoCierre",
        );
        try {
          const response = await fetch(BRANDING.GET_URL, {
            cache: "no-store",
          });

          /*
           * Primero se obtiene como texto para poder detectar respuestas
           * PHP inválidas antes de intentar convertirlas a JSON.
           */
          const responseText = await response.text();

          let branding;

          try {
            branding = JSON.parse(responseText);
          } catch (error) {
            console.error("Respuesta recibida:", responseText);

            throw new Error("El servidor devolvió una respuesta inválida.");
          }

          if (!response.ok || branding.ok === false) {
            throw new Error(
              branding.msg || "No se pudo cargar la configuración actual.",
            );
          }

          document.getElementById("brandAppName").value =
            branding.app_name || "";

          document.getElementById("brandTitle").value =
            branding.dashboard_title || "";

          document.getElementById("brandSub").value =
            branding.dashboard_sub || "";

          precargarHorario(branding.horario);

          document.getElementById("brandRedes").value =
            branding.redes_sociales || "";

          document.getElementById("brandMensaje").value =
            branding.mensaje_ticket || "";

          if (branding.logo_etag) {
            const img = document.getElementById("brandPreviewImg");

            const placeholder = document.getElementById(
              "brandPreviewPlaceholder",
            );

            img.src = `${BRANDING.LOGO_URL}?v=${encodeURIComponent(
              branding.logo_etag,
            )}`;

            img.classList.remove("hidden");
            placeholder.classList.add("hidden");

            img.onerror = () => {
              img.classList.add("hidden");
              placeholder.classList.remove("hidden");
            };
          }
        } catch (error) {
          console.error("No se pudo cargar la configuración:", error);

          Swal.showValidationMessage(
            error.message || "No se pudo cargar la configuración actual.",
          );
        }

        const inputLogo = document.getElementById("brandLogo");

        inputLogo.addEventListener("change", (event) => {
          const file = event.target.files[0];

          if (!file) {
            return;
          }

          const allowedTypes = [
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/gif",
          ];

          if (!allowedTypes.includes(file.type)) {
            event.target.value = "";

            Swal.showValidationMessage(
              "Selecciona una imagen PNG, JPG, WEBP o GIF.",
            );

            return;
          }

          if (file.size > BRANDING.MAX_BYTES) {
            event.target.value = "";

            Swal.showValidationMessage(
              `La imagen no debe superar ${
                BRANDING.MAX_BYTES / 1024 / 1024
              } MB.`,
            );

            return;
          }

          Swal.resetValidationMessage();

          const img = document.getElementById("brandPreviewImg");

          const placeholder = document.getElementById(
            "brandPreviewPlaceholder",
          );

          img.src = URL.createObjectURL(file);
          img.classList.remove("hidden");
          placeholder.classList.add("hidden");
        });
      },

      preConfirm: () => {
        const appName = document.getElementById("brandAppName").value.trim();

        const title = document.getElementById("brandTitle").value.trim();

        const sub = document.getElementById("brandSub").value.trim();

        const semanaApertura = document.getElementById(
          "horarioSemanaApertura",
        ).value;

        const semanaCierre = document.getElementById(
          "horarioSemanaCierre",
        ).value;

        const sabadoCerrado = document.getElementById("sabadoCerrado").checked;

        const domingoCerrado =
          document.getElementById("domingoCerrado").checked;

        const redesSociales = document
          .getElementById("brandRedes")
          .value.trim();

        const mensajeTicket = document
          .getElementById("brandMensaje")
          .value.trim();

        const file = document.getElementById("brandLogo").files[0];

        if (!appName) {
          Swal.showValidationMessage("Escribe el nombre de la aplicación.");

          return false;
        }

        if (!title) {
          Swal.showValidationMessage("Escribe el título del dashboard.");

          return false;
        }

        if (!semanaApertura || !semanaCierre) {
          Swal.showValidationMessage(
            "Selecciona el horario de lunes a viernes.",
          );

          return false;
        }

        if (semanaApertura >= semanaCierre) {
          Swal.showValidationMessage(
            "La hora de cierre de lunes a viernes debe ser posterior a la apertura.",
          );

          return false;
        }

        if (!sabadoCerrado) {
          const sabadoApertura = document.getElementById(
            "horarioSabadoApertura",
          ).value;

          const sabadoCierre = document.getElementById(
            "horarioSabadoCierre",
          ).value;

          if (!sabadoApertura || !sabadoCierre) {
            Swal.showValidationMessage(
              "Selecciona el horario del sábado o marca Cerrado.",
            );

            return false;
          }

          if (sabadoApertura >= sabadoCierre) {
            Swal.showValidationMessage(
              "La hora de cierre del sábado debe ser posterior a la apertura.",
            );

            return false;
          }
        }

        if (!domingoCerrado) {
          const domingoApertura = document.getElementById(
            "horarioDomingoApertura",
          ).value;

          const domingoCierre = document.getElementById(
            "horarioDomingoCierre",
          ).value;

          if (!domingoApertura || !domingoCierre) {
            Swal.showValidationMessage(
              "Selecciona el horario del domingo o marca Cerrado.",
            );

            return false;
          }

          if (domingoApertura >= domingoCierre) {
            Swal.showValidationMessage(
              "La hora de cierre del domingo debe ser posterior a la apertura.",
            );

            return false;
          }
        }

        if (redesSociales.length > 255) {
          Swal.showValidationMessage(
            "El texto de redes sociales no puede superar 255 caracteres.",
          );

          return false;
        }

        if (mensajeTicket.length > 255) {
          Swal.showValidationMessage(
            "El mensaje para tickets no puede superar 255 caracteres.",
          );

          return false;
        }

        if (file && file.size > BRANDING.MAX_BYTES) {
          Swal.showValidationMessage(
            `La imagen no debe superar ${BRANDING.MAX_BYTES / 1024 / 1024} MB.`,
          );

          return false;
        }
        const horario = generarTextoHorario();
        return {
          appName,
          title,
          sub,
          horario,
          redesSociales,
          mensajeTicket,
          file,
        };
      },
    })
    .then(async (result) => {
      if (!result.isConfirmed) {
        return;
      }

      const {
        appName,
        title,
        sub,
        horario,
        redesSociales,
        mensajeTicket,
        file,
      } = result.value;

      const formData = new FormData();

      formData.append("app_name", appName);
      formData.append("dashboard_title", title);
      formData.append("dashboard_sub", sub);
      formData.append("horario", horario);
      formData.append("redes_sociales", redesSociales);
      formData.append("mensaje_ticket", mensajeTicket);

      if (file) {
        formData.append("logo", file);
      }

      Swal.fire({
        title: "Guardando configuración",
        text: "Espera un momento...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const response = await fetch(BRANDING.SAVE_URL, {
          method: "POST",
          body: formData,
        });

        const responseText = await response.text();

        let data;

        try {
          data = JSON.parse(responseText);
        } catch (error) {
          console.error("Respuesta recibida:", responseText);

          throw new Error("El servidor devolvió una respuesta inválida.");
        }

        if (!response.ok || !data.ok) {
          throw new Error(
            data.msg || "No se pudo actualizar la configuración.",
          );
        }

        await swalSuccess.fire(
          "Configuración guardada",
          "La información de marca se actualizó correctamente.",
          "success",
        );

        await cargarBranding();
      } catch (error) {
        console.error(error);

        await swalError.fire(
          "Error",
          error.message || "No se pudo guardar la configuración.",
          "error",
        );
      }
    });
}
async function cargarUsuariosGlobal() {
  try {
    const r = await fetch("php/usuarios_dashboard.php", { cache: "no-store" });
    const data = await r.json(); // {rol, uid, opciones:[...]}
    CURRENT_UID = Number(data.uid || 0) || 0; // ⬅️ guarda el uid actual
    const sel = document.getElementById("sel-usuario-global");

    if (!sel) return;

    sel.innerHTML = "";
    data.opciones.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.text;
      if (o.disabled) opt.disabled = true;
      sel.appendChild(opt);
    });

    USER_FILTER = data.rol === "worker" ? "me" : "all";
    sel.value = USER_FILTER;
    if (data.rol === "worker") sel.disabled = true;

    sel.addEventListener("change", async () => {
      USER_FILTER = sel.value;
      await cargarTodo();
    });
  } catch (e) {
    console.error("No se pudo cargar usuarios:", e);
  }
}

async function cargarTodo() {
  await cargarKPIs();
  await cargarSerie(
    "insc",
    document.getElementById("res-insc")?.value || "mes",
    "chart-insc",
  );
  await cargarSerie(
    "prod",
    document.getElementById("res-prod")?.value || "mes",
    "chart-prod",
  );
  await cargarCajaCard();
  await cargarMovimientosCard();
  await cargarEntradasCard();

  // Ventas financiadas / próximos pagos
  await cargarPagosFinanciadosCard();
}

// === Caja ===
let CURRENT_UID = 0; // lo llenamos al cargar usuarios

function formatoMonedaMX(n) {
  const num = Number(n || 0);
  return num.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}

function formatFechaCorta(fechaStr) {
  if (!fechaStr) return "Sin actualizar";
  // fechaStr viene en 'YYYY-MM-DD HH:MM:SS'
  const d = new Date(fechaStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return fechaStr;
  return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

// Resuelve el usuario objetivo a partir del filtro global
function getTargetUserId() {
  if (USER_FILTER === "me") return CURRENT_UID;
  if (USER_FILTER === "all") return null; // no aplica caja
  const id = parseInt(USER_FILTER, 10);
  return Number.isFinite(id) && id > 0 ? id : CURRENT_UID;
}

async function cargarCajaCard() {
  const montoEl = document.getElementById("kpi-caja-monto");
  const updEl = document.getElementById("kpi-caja-actualizado");
  const btn = document.getElementById("btn-caja-editar");

  if (!montoEl || !updEl || !btn) return;

  // Si filtro es "all", no aplica caja
  if (USER_FILTER === "all") {
    montoEl.textContent = "—";
    updEl.textContent = "Selecciona un usuario";
    btn.disabled = true;
    return;
  }

  const url = new URL("smartgate/php/caja_controller.php", location.origin);
  url.searchParams.set("action", "get");
  url.searchParams.set("user", USER_FILTER); // 'me' o id

  try {
    const r = await fetch(url.toString(), { cache: "no-store" });
    const data = await r.json();

    if (!data.ok) throw new Error(data.error || "Error al cargar caja");

    const info = data.data || { monto: 0, fecha_actualizacion: null };
    montoEl.textContent = formatoMonedaMX(info.monto);
    const fecha = info.fecha_actualizacion;
    if (fecha) {
      const d = new Date(fecha.replace(" ", "T"));
      const hoy = new Date();
      const mismoDia =
        d.getFullYear() === hoy.getFullYear() &&
        d.getMonth() === hoy.getMonth() &&
        d.getDate() === hoy.getDate();

      updEl.innerHTML = mismoDia
        ? `Última actualización: ${formatFechaCorta(info.fecha_actualizacion)}`
        : `Última actualización: ${formatFechaCorta(info.fecha_actualizacion)} 
       <i class="bi bi-exclamation-triangle-fill text-amber-400 ml-1" 
          title="No has actualizado tu caja hoy"></i>`;
    } else {
      updEl.textContent = "Sin actualizar";
    }

    btn.disabled = !data.allowEdit;
    btn.onclick = () => abrirModalEditarCaja(info.monto);
  } catch (e) {
    console.error(e);
    montoEl.textContent = "—";
    updEl.textContent = "Error al cargar";
    btn.disabled = true;
  }
}

function validarMontoStr(s) {
  // aceptar "123", "123.4", "123.45" y recortar a 2 decimales
  if (typeof s !== "string") return null;
  s = s.replace(",", ".").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return parseFloat(parseFloat(s).toFixed(2));
}

function abrirModalEditarCaja(montoActual) {
  swalcard
    .fire({
      title: "Editar monto de caja",
      html: `
      <div class="text-left">
        <label class="block text-sm mb-1 text-slate-300">Monto (MXN)</label>
        <input id="cajaMonto" type="text" class="swal2-input !w-full" placeholder="0.00" value="${(Number(montoActual) || 0).toFixed(2)}">
        <p class="text-xs text-slate-400 mt-2">Este monto representa lo que dejas en caja. Se guarda por usuario.</p>
      </div>
    `,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      focusConfirm: false,
      preConfirm: () => {
        const val = document.getElementById("cajaMonto").value;
        const n = validarMontoStr(val);
        if (n === null) {
          Swal.showValidationMessage(
            "Ingresa un monto válido con hasta 2 decimales (ej. 1234.56)",
          );
          return false;
        }
        return { monto: n };
      },
    })
    .then(async (res) => {
      if (!res.isConfirmed) return;
      const { monto } = res.value;

      try {
        const body = new FormData();
        body.append("action", "save");
        body.append("user", USER_FILTER); // 'me' o id
        body.append("monto", String(monto));

        const rq = await fetch("php/caja_controller.php", {
          method: "POST",
          body,
        });
        const data = await rq.json();

        if (data.ok) {
          await swalSuccess.fire(
            "✔️ Guardado",
            "Monto de caja actualizado",
            "success",
          );
          await cargarCajaCard();
        } else {
          swalError.fire("Error", data.error || "No se pudo guardar", "error");
        }
      } catch (e) {
        swalError.fire("Error", "Fallo la petición", "error");
      }
    });
}
async function cargarMovimientosCard() {
  const netoEl = document.getElementById("kpi-mov-neto");
  const detEl = document.getElementById("kpi-mov-det");
  const btnNew = document.getElementById("btn-mov-nuevo");
  const btnVer = document.getElementById("btn-mov-ver");

  if (!netoEl || !detEl || !btnNew || !btnVer) return;

  // Igual que Caja: si es ALL, no aplica
  if (USER_FILTER === "all") {
    netoEl.textContent = "—";
    detEl.textContent = "Selecciona un usuario";
    btnNew.disabled = true;
    btnVer.disabled = true;
    return;
  }

  const url = new URL(
    "smartgate/php/caja_movimientos_controller.php",
    location.origin,
  );
  url.searchParams.set("action", "resumen_hoy"); // resumen de HOY del usuario seleccionado
  url.searchParams.set("user", USER_FILTER); // 'me' o id

  try {
    const r = await fetch(url, { cache: "no-store" });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || "Error");

    const ingreso = Number(d.ingreso || 0);
    const egreso = Number(d.egreso || 0);
    const neto = ingreso - egreso;

    netoEl.textContent = formatoMonedaMX(neto);
    detEl.textContent = `Ingresos: ${formatoMonedaMX(ingreso)} · Egresos: ${formatoMonedaMX(egreso)} · Movs: ${d.cantidad || 0}`;

    btnNew.disabled = false;
    btnNew.onclick = () => abrirModalMovimientoCajaSimple();

    btnVer.disabled = false;
    btnVer.onclick = () => abrirModalListadoMovHoy();
  } catch (e) {
    console.error(e);
    netoEl.textContent = "—";
    detEl.textContent = "Error al cargar";
    btnNew.disabled = true;
    btnVer.disabled = true;
  }
}

function abrirModalMovimientoCajaSimple() {
  swalcard
    .fire({
      title: "Nuevo movimiento",
      html: `
      <div class="text-left space-y-2">
        <label class="block text-sm text-slate-300">Tipo</label>
        <select id="movTipo" class="swal2-input !w-full">
          <option value="EGRESO">Egreso (sale dinero)</option>
          <option value="INGRESO">Ingreso (entra dinero)</option>
        </select>

        <label class="block text-sm text-slate-300">Monto (MXN)</label>
        <input id="movMonto" type="text" class="swal2-input !w-full" placeholder="0.00">

        <label class="block text-sm text-slate-300">Concepto</label>
        <input id="movConcepto" type="text" class="swal2-input !w-full" placeholder="Pago a proveedor, insumos, etc">

        <label class="block text-sm text-slate-300">Observaciones (opcional)</label>
        <textarea id="movObs" class="swal2-textarea !w-full" placeholder="Detalle / folio / nota"></textarea>

        <p class="text-xs text-slate-400 mt-2">
          Se guardará como movimiento para reportes. No modifica la card “Caja”.
        </p>
      </div>
    `,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      focusConfirm: false,
      preConfirm: () => {
        const tipo = document.getElementById("movTipo").value;
        const monto = validarMontoStr(
          document.getElementById("movMonto").value,
        );
        const concepto = (
          document.getElementById("movConcepto").value || ""
        ).trim();
        const observaciones = (
          document.getElementById("movObs").value || ""
        ).trim();

        if (!concepto) {
          Swal.showValidationMessage("Ingresa un concepto");
          return false;
        }
        if (monto === null || monto <= 0) {
          Swal.showValidationMessage(
            "Ingresa un monto válido mayor a 0 (ej. 250.00)",
          );
          return false;
        }
        return { tipo, monto, concepto, observaciones };
      },
    })
    .then(async (res) => {
      if (!res.isConfirmed) return;

      try {
        const body = new FormData();
        body.append("action", "crear");
        body.append("user", USER_FILTER); // 'me' o id
        body.append("tipo", res.value.tipo);
        body.append("monto", String(res.value.monto));
        body.append("concepto", res.value.concepto);
        body.append("observaciones", res.value.observaciones);

        const rq = await fetch("php/caja_movimientos_controller.php", {
          method: "POST",
          body,
        });
        const d = await rq.json();

        if (d.ok) {
          await swalSuccess.fire(
            "✔️ Guardado",
            "Movimiento registrado",
            "success",
          );
          await cargarMovimientosCard();
        } else {
          swalError.fire("Error", d.error || "No se pudo guardar", "error");
        }
      } catch (e) {
        swalError.fire("Error", "Fallo la petición", "error");
      }
    });
}

async function abrirModalListadoMovHoy() {
  try {
    const url = new URL(
      "smartgate/php/caja_movimientos_controller.php",
      location.origin,
    );
    url.searchParams.set("action", "listar_hoy");
    url.searchParams.set("user", USER_FILTER);

    const r = await fetch(url, { cache: "no-store" });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || "Error");

    const rows = Array.isArray(d.items) ? d.items : [];
    const html = rows.length
      ? `
      <div class="text-left max-h-80 overflow-auto pr-1 scrollbar-custom">
        ${rows
          .map(
            (x) => `
          <div class="mb-2 p-2 rounded-lg border border-slate-600/40 bg-slate-700/30">
            <div class="flex justify-between">
              <span class="${x.tipo === "INGRESO" ? "text-green-300" : "text-rose-300"} font-semibold">${x.tipo}</span>
              <span class="font-semibold">${formatoMonedaMX(x.monto)}</span>
            </div>
            <div class="text-xs text-slate-300 mt-1">${escapeHtml(x.concepto || "")}</div>
            <div class="text-xs text-slate-400">${escapeHtml(x.fecha || "")}</div>
          </div>
        `,
          )
          .join("")}
      </div>
    `
      : `<p class="text-slate-300">Sin movimientos hoy.</p>`;

    swalcard.fire({
      title: "Movimientos de hoy",
      html,
      confirmButtonText: "Cerrar",
    });
  } catch (e) {
    swalError.fire("Error", "No se pudo cargar el listado");
  }
}
function initEntradasFotoModal() {
  const lista = document.getElementById("entradas-lista");
  if (!lista) return;

  lista.addEventListener("click", (e) => {
    const img = e.target.closest("img");
    if (!img) return;

    const src = img.getAttribute("src");
    if (!src || !src.startsWith("data:image")) return;

    Swal.fire({
      title: "Foto de evento",
      imageUrl: src,
      imageAlt: "foto",
      background: "#0b1220",
      color: "#e2e8f0",
      showConfirmButton: false,
      showCloseButton: true,
      width: 520,
      padding: "1rem",
    });
  });
}
// ===============================
// Clientes inactivos - Modal
// ===============================
function rangoInactivosLabel(val) {
  switch (val) {
    case "2m":
      return "2 meses";
    case "5m":
      return "5 meses";
    case "1y":
      return "1 año";
    case "1y+":
      return "Más de 1 año";
    default:
      return "2 meses";
  }
}

function getRangoInactivosDef() {
  return "2m"; // ✅ default solicitado
}

function renderInactivosSkeleton() {
  return `
    <div class="space-y-2">
      ${Array.from({ length: 6 })
        .map(
          () => `
        <div class="p-3 rounded-xl border border-slate-700/70 bg-slate-900/30">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="h-4 w-2/3 bg-slate-700/60 rounded animate-pulse"></div>
              <div class="h-3 w-1/2 bg-slate-700/40 rounded mt-2 animate-pulse"></div>
            </div>
            <div class="h-8 w-20 bg-slate-700/50 rounded-full animate-pulse"></div>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}

function renderInactivosVacio(rangoVal) {
  const label = rangoInactivosLabel(rangoVal);
  return `
    <div class="p-3 rounded-xl border border-slate-700/70 bg-slate-900/30 text-slate-300">
      <i class="bi bi-info-circle text-sky-300 mr-2"></i>
      Sin resultados para <span class="text-slate-100 font-semibold">${label}</span>.
    </div>
  `;
}

async function fetchInactivosMock({ rango, user }) {
  const url = new URL("smartgate/php/clientes_inactivos.php", location.origin);
  url.searchParams.set("rango", rango);

  // ✅ manda tal cual el filtro global
  // RECOMENDADO: cuando USER_FILTER === "me" envía el ID numérico (CURRENT_UID)
  if (user === "me") url.searchParams.set("user", String(CURRENT_UID));
  else url.searchParams.set("user", String(user || "all"));

  url.searchParams.set("limit", "150");

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Error al cargar inactivos");
  return Array.isArray(data.items) ? data.items : [];
}

function renderInactivosList(items) {
  // items esperado (propuesta para backend):
  // [{ idcliente, nombre, telefono, ultimo_pago, dias_sin_pagar, motivo, fin, sin_pagos }]
  if (!Array.isArray(items) || items.length === 0) return "";

  return `
    <div class="space-y-2">
      ${items
        .map((x) => {
          const nombre = escHtml(x.nombre || "—");
          const tel = escHtml(x.telefono || "");
          const fin = x.ultimo_fin ? escHtml(x.ultimo_fin) : null;
          const alta = x.fecha_ingreso
            ? escHtml(x.fecha_ingreso)
            : x.inicio
              ? escHtml(x.inicio)
              : "—";
          const dias = Number(x.dias_sin_pagar || 0);
          const badge = x.sin_pagos
            ? `<span class="text-[11px] px-2 py-1 rounded-full border bg-amber-500/10 text-amber-200 border-amber-500/30">
               <i class="bi bi-exclamation-circle mr-1"></i>Sin pagos
             </span>`
            : `<span class="text-[11px] px-2 py-1 rounded-full border bg-rose-500/10 text-rose-200 border-rose-500/30">
               <i class="bi bi-clock-history mr-1"></i>${Number.isFinite(dias) ? `${dias} días` : "—"}
             </span>`;

          return `
          <div class="p-3 rounded-xl border border-slate-700/70 bg-slate-900/30">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="font-semibold text-slate-100 truncate">${nombre}</div>
                <div class="text-xs text-slate-400 mt-1">
                  ${tel ? `Tel: <span class="text-slate-200">${tel}</span> · ` : ""}
                  ${
                    fin
                      ? `Venció: <span class="text-slate-200">${fin}</span>`
                      : `Alta: <span class="text-slate-200">${alta}</span>`
                  }
                </div>
              </div>
              <div class="shrink-0">${badge}</div>
              <button
  type="button"
  class="btn-del-inactivo px-3 py-2 rounded-lg border border-rose-700/50 bg-rose-900/20 text-rose-200 hover:bg-rose-900/35"
  data-personid="${Number(x.personId || 0)}"
  data-nombre="${escAttr(x.nombre || "")}"
  title="Eliminar cliente">
  <i class="bi bi-trash"></i>
</button>
            </div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

async function cargarInactivosEnModal({ rango }) {
  const wrap = document.getElementById("inactivos-lista-wrap");
  const estado = document.getElementById("inactivos-estado");
  if (!wrap) return;

  // UI loading
  wrap.innerHTML = renderInactivosSkeleton();
  if (estado) estado.textContent = "Cargando…";

  try {
    // ✅ MOCK por ahora (front)
    const items = await fetchInactivosMock({ rango, user: USER_FILTER });

    if (!items || items.length === 0) {
      wrap.innerHTML = renderInactivosVacio(rango);
      if (estado) estado.textContent = "Sin resultados";
      return;
    }

    wrap.innerHTML = renderInactivosList(items);
    if (estado) estado.textContent = `Mostrando ${items.length}`;
  } catch (e) {
    console.error(e);
    wrap.innerHTML = `
      <div class="p-3 rounded-xl border border-rose-700/50 bg-rose-900/20 text-rose-200">
        <i class="bi bi-exclamation-triangle mr-2"></i>
        No se pudo cargar la lista. Revisa consola / endpoint.
      </div>
    `;
    if (estado) estado.textContent = "Error";
  }
}

function abrirModalClientesInactivos() {
  const rangoDefault = getRangoInactivosDef();

  swalcard.fire({
    title: "Clientes inactivos",
    html: `
      <div class="text-left space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm text-slate-300">
              Basado en último pago o clientes sin pagos con alta antigua.
            </div>
            <div class="text-xs text-slate-500 mt-1">
              Filtro usuario: <span class="text-slate-200 font-semibold">${escHtml(String(USER_FILTER))}</span>
            </div>
          </div>

          <div class="shrink-0">
            <label class="text-xs text-slate-400 block mb-1">Rango</label>
            <select id="inactivos-rango" class="bg-slate-900/40 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-200">
              <option value="2m" selected>2 meses</option>
              <option value="5m">5 meses</option>
              <option value="1y">1 año</option>
              <option value="1y+">Más de 1 año</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-400">
          <span id="inactivos-estado">—</span>
          <button type="button" id="inactivos-refresh"
            class="px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/70 text-slate-200">
            <i class="bi bi-arrow-clockwise mr-1"></i>Actualizar
          </button>
        </div>

        <div id="inactivos-lista-wrap" class="max-h-96 overflow-auto pr-1 scrollbar-custom">
          ${renderInactivosSkeleton()}
        </div>
      </div>
    `,
    confirmButtonText: "Cerrar",
    showCancelButton: false,
    didOpen: async () => {
      const sel = document.getElementById("inactivos-rango");
      const btn = document.getElementById("inactivos-refresh");
      const wrap = document.getElementById("inactivos-lista-wrap");
      // Carga inicial
      await cargarInactivosEnModal({ rango: rangoDefault });

      // Cambio de rango
      sel?.addEventListener("change", async () => {
        await cargarInactivosEnModal({ rango: sel.value });
      });

      // Refresh manual
      btn?.addEventListener("click", async () => {
        await cargarInactivosEnModal({ rango: sel?.value || rangoDefault });
      });
      wrap?.addEventListener("click", async (ev) => {
        const btn = ev.target.closest(".btn-del-inactivo");
        if (!btn) return;

        const personId = Number(btn.dataset.personid || 0);
        const nombre = btn.dataset.nombre || "";

        if (!personId) {
          swalError.fire(
            "Error",
            "No se encontró personId del cliente",
            "error",
          );
          return;
        }

        await eliminarClienteSmartgate({ personId, nombre });
      });
    },
  });
}
async function eliminarClienteSmartgate({ personId, nombre }) {
  // Confirmación
  const conf = await swalInfo.fire({
    title: "¿Eliminar cliente?",
    html: `
      <p class="text-slate-300">
        Se eliminará del <b>Sistema</b> a.<br>
        <span class="text-rose-200 font-semibold">${escHtml(nombre || "")}</span>
      </p>
      <p class="text-xs text-slate-400 mt-2">Esta acción no se puede deshacer pero los pagos hechos por el usuario se mantendran.</p>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  });

  if (!conf.isConfirmed) return;

  try {
    swalInfo.fire({
      title: "Eliminando…",
      didOpen: () => Swal.showLoading(),
      showConfirmButton: false,
      allowOutsideClick: false,
    });

    const r = await fetch("php/delete_user.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId }),
    });

    const d = await r.json();

    if (d.code === 0 || d.code === "0") {
      await swalSuccess.fire(
        "Eliminado",
        d.msg || "Cliente eliminado correctamente.",
        "success",
      );

      // 1) refrescar lista del modal (opcional pero recomendado)
      const sel = document.getElementById("inactivos-rango");
      await cargarInactivosEnModal({ rango: sel?.value || "2m" });

      // 2) ✅ recargar dashboard completo
      await cargarTodo();
    } else {
      await swalError.fire(
        "Error",
        d.error || d.msg || "No se pudo eliminar",
        "error",
      );
    }
  } catch (e) {
    await swalError.fire("Error", "Fallo al conectar con el servidor", "error");
  }
}
/* =========================================================
   Ventas financiadas - Card dashboard
========================================================= */

const FINANCIADAS_DASH_ENDPOINT = "php/ventas_financiadas_controller.php";

function vfMoneyDash(value) {
  const n = Number(value || 0);

  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

function vfFechaDash(value) {
  if (!value) return "—";

  const d = new Date(String(value) + "T00:00:00");

  if (Number.isNaN(d.getTime())) {
    return value;
  }

  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function vfDiasParaVencer(fecha) {
  if (!fecha) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const venc = new Date(String(fecha) + "T00:00:00");
  venc.setHours(0, 0, 0, 0);

  if (Number.isNaN(venc.getTime())) return null;

  const diffMs = venc.getTime() - hoy.getTime();
  return Math.round(diffMs / 86400000);
}

function vfEtiquetaTiempo(fecha) {
  const dias = vfDiasParaVencer(fecha);

  if (dias === null) return "Sin fecha";

  if (dias < 0) {
    return `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`;
  }

  if (dias === 0) {
    return "Vence hoy";
  }

  if (dias === 1) {
    return "Vence mañana";
  }

  return `Vence en ${dias} días`;
}

function vfClaseTiempo(fecha) {
  const dias = vfDiasParaVencer(fecha);

  if (dias === null) {
    return "text-slate-400";
  }

  if (dias < 0) {
    return "text-red-300";
  }

  if (dias <= 3) {
    return "text-amber-300";
  }

  return "text-sky-300";
}

async function cargarPagosFinanciadosCard() {
  const lista = document.getElementById("lista-pagos-financiados");
  const count = document.getElementById("pagos-financiados-count");
  const disponible = document.getElementById("pagos-financiados-disponible");
  const vencidos = document.getElementById("pagos-financiados-vencidos");
  const footer = document.getElementById("pagos-financiados-footer");

  // Si la card no existe en esta vista, no hacemos nada.
  if (!lista) return;

  lista.innerHTML = `
    <li class="rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-sm text-slate-400 text-center">
      Cargando pagos próximos...
    </li>
  `;

  try {
    const body = new FormData();
    body.append("accion", "listar_pagos_proximos_dashboard");

    const r = await fetch(FINANCIADAS_DASH_ENDPOINT, {
      method: "POST",
      body,
      cache: "no-store",
    });

    const data = await r.json();

    if (!data.success) {
      throw new Error(
        data.detalle || data.error || "No se pudo cargar la card.",
      );
    }

    const pagos = Array.isArray(data.pagos) ? data.pagos : [];
    const resumen = data.resumen || {};

    if (count) count.textContent = resumen.total_items ?? pagos.length;
    if (disponible)
      disponible.textContent = vfMoneyDash(resumen.total_disponible || 0);
    if (vencidos) vencidos.textContent = resumen.vencidos || 0;

    if (footer) {
      footer.textContent = pagos.length
        ? `Pagos dentro de ±5 días`
        : "Sin pagos próximos en ±5 días";
    }

    renderPagosFinanciadosCard(pagos);
  } catch (e) {
    console.error("Pagos financiados dashboard:", e);

    if (count) count.textContent = "—";
    if (disponible) disponible.textContent = "—";
    if (vencidos) vencidos.textContent = "—";

    lista.innerHTML = `
      <li class="rounded-xl border border-red-700/50 bg-red-900/20 p-3 text-sm text-red-200">
        <i class="bi bi-exclamation-triangle mr-1"></i>
        No se pudieron cargar los pagos próximos.
      </li>
    `;

    if (footer) footer.textContent = "Error al cargar";
  }
}

function renderPagosFinanciadosCard(pagos) {
  const lista = document.getElementById("lista-pagos-financiados");

  if (!lista) return;

  if (!pagos.length) {
    lista.innerHTML = `
      <li class="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-400 text-center">
        <i class="bi bi-check2-circle text-emerald-300 mr-1"></i>
        No hay pagos disponibles por ahora.
      </li>
    `;
    return;
  }

  lista.innerHTML = pagos
    .map((pago) => {
      const dias = vfDiasParaVencer(pago.fecha_vencimiento);
      const esVencido = dias !== null && dias < 0;

      const payload = {
        venta_id: Number(pago.venta_id || 0),
        cuota_id: Number(pago.cuota_id || 0),
        folio: pago.folio || "",
        cliente_nombre: pago.cliente_nombre || "",
        numero_cuota: Number(pago.numero_cuota || 0),
        fecha_vencimiento: pago.fecha_vencimiento || "",
        saldo_cuota: Number(pago.saldo_cuota || 0),
      };

      return `
      <li class="rounded-xl border ${esVencido ? "border-red-500/40 bg-red-950/20" : "border-slate-700 bg-slate-900/50"} p-3 hover:bg-slate-800/50 transition">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold text-white truncate">
              ${escHtml(pago.cliente_nombre || "Sin cliente")}
            </p>

            <p class="text-xs text-slate-400 mt-1">
              ${escHtml(pago.folio || "—")} · Cuota ${escHtml(pago.numero_cuota || "—")}
            </p>

            <p class="text-xs mt-1 ${vfClaseTiempo(pago.fecha_vencimiento)}">
              <i class="bi bi-calendar2-week mr-1"></i>
              ${vfEtiquetaTiempo(pago.fecha_vencimiento)} · ${vfFechaDash(pago.fecha_vencimiento)}
            </p>
          </div>

          <div class="text-right shrink-0">
            <p class="font-extrabold text-white">
              ${vfMoneyDash(pago.saldo_cuota)}
            </p>

            <button type="button"
            class="btn-abono-financiado-dash mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
            data-venta-id="${Number(pago.venta_id || 0)}"
            data-cuota-id="${Number(pago.cuota_id || 0)}"
            data-folio="${escAttrDash(pago.folio || "")}"
            data-cliente="${escAttrDash(pago.cliente_nombre || "")}"
            data-numero-cuota="${Number(pago.numero_cuota || 0)}"
            data-fecha="${escAttrDash(pago.fecha_vencimiento || "")}"
            data-saldo="${Number(pago.saldo_cuota || 0)}">
            Abonar
          </button>
          </div>
        </div>
      </li>
    `;
    })
    .join("");
}

function initPagosFinanciadosDashboard() {
  const lista = document.getElementById("lista-pagos-financiados");

  lista?.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".btn-abono-financiado-dash");
    if (!btn) return;

    const pago = {
      venta_id: Number(btn.dataset.ventaId || 0),
      cuota_id: Number(btn.dataset.cuotaId || 0),
      folio: btn.dataset.folio || "",
      cliente_nombre: btn.dataset.cliente || "",
      numero_cuota: Number(btn.dataset.numeroCuota || 0),
      fecha_vencimiento: btn.dataset.fecha || "",
      saldo_cuota: Number(btn.dataset.saldo || 0),
    };

    abrirModalAbonoFinanciadoDashboard(pago);
  });

  document
    .getElementById("btn-cerrar-abono-financiado-dashboard")
    ?.addEventListener("click", cerrarModalAbonoFinanciadoDashboard);

  document
    .getElementById("btn-cancelar-abono-financiado-dashboard")
    ?.addEventListener("click", cerrarModalAbonoFinanciadoDashboard);

  document
    .getElementById("btn-guardar-abono-financiado-dashboard")
    ?.addEventListener("click", guardarAbonoFinanciadoDashboard);
}

function abrirModalAbonoFinanciadoDashboard(pago) {
  const ventaId = Number(pago.venta_id || 0);
  const cuotaId = Number(pago.cuota_id || 0);
  const saldoMax = Number(pago.saldo_cuota || 0);

  if (!ventaId || !cuotaId || saldoMax <= 0) {
    swalError.fire("Error", "El pago seleccionado no es válido.", "error");
    return;
  }

  const modal = document.getElementById("modal-abono-financiado-dashboard");
  const inputVenta = document.getElementById("dash-abono-venta-id");
  const inputCuota = document.getElementById("dash-abono-cuota-id");
  const inputSaldo = document.getElementById("dash-abono-saldo-max");
  const inputMonto = document.getElementById("dash-abono-monto");
  const inputMetodo = document.getElementById("dash-abono-metodo");
  const inputReferencia = document.getElementById("dash-abono-referencia");
  const inputObservaciones = document.getElementById(
    "dash-abono-observaciones",
  );
  const sub = document.getElementById("dash-abono-subtitulo");
  const saldoTexto = document.getElementById("dash-abono-saldo-texto");

  if (
    !modal ||
    !inputVenta ||
    !inputCuota ||
    !inputSaldo ||
    !inputMonto ||
    !inputMetodo ||
    !inputReferencia ||
    !inputObservaciones
  ) {
    swalError.fire(
      "Modal incompleto",
      "Falta agregar el modal de abono financiado en dashboard.php o algún ID no coincide.",
      "error",
    );
    return;
  }

  inputVenta.value = ventaId;
  inputCuota.value = cuotaId;
  inputSaldo.value = saldoMax.toFixed(2);

  inputMonto.value = saldoMax.toFixed(2);
  inputMonto.max = saldoMax.toFixed(2);

  inputMetodo.value = "efectivo";
  inputReferencia.value = "";
  inputObservaciones.value = "";

  if (sub) {
    sub.textContent = `${pago.folio || ""} · ${pago.cliente_nombre || ""} · Cuota ${pago.numero_cuota || ""}`;
  }

  if (saldoTexto) {
    saldoTexto.textContent = vfMoneyDash(saldoMax);
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function escAttrDash(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function cerrarModalAbonoFinanciadoDashboard() {
  const modal = document.getElementById("modal-abono-financiado-dashboard");

  modal?.classList.add("hidden");
  modal?.classList.remove("flex");
}

async function guardarAbonoFinanciadoDashboard() {
  const ventaId = Number(
    document.getElementById("dash-abono-venta-id")?.value || 0,
  );
  const cuotaId = Number(
    document.getElementById("dash-abono-cuota-id")?.value || 0,
  );
  const saldoMax = Number(
    document.getElementById("dash-abono-saldo-max")?.value || 0,
  );
  const monto = Number(document.getElementById("dash-abono-monto")?.value || 0);

  const metodo =
    document.getElementById("dash-abono-metodo")?.value || "efectivo";
  const referencia =
    document.getElementById("dash-abono-referencia")?.value || "";
  const observaciones =
    document.getElementById("dash-abono-observaciones")?.value || "";

  if (!ventaId || !cuotaId) {
    swalError.fire("Error", "No se encontró la venta o cuota.", "error");
    return;
  }

  if (monto <= 0) {
    swalError.fire("Monto inválido", "El abono debe ser mayor a 0.", "warning");
    return;
  }

  if (monto > saldoMax) {
    swalError.fire(
      "Abono mayor al saldo",
      `No puedes registrar más de ${vfMoneyDash(saldoMax)} en esta cuota.`,
      "warning",
    );
    return;
  }

  const btn = document.getElementById("btn-guardar-abono-financiado-dashboard");
  const oldHtml = btn ? btn.innerHTML : "";

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "Guardando...";
    }

    const body = new FormData();
    body.append("accion", "registrar_abono");
    body.append("venta_id", String(ventaId));
    body.append("cuota_id", String(cuotaId));
    body.append("monto", String(monto));
    body.append("metodo_pago", metodo);
    body.append("referencia", referencia);
    body.append("observaciones", observaciones);

    const r = await fetch(FINANCIADAS_DASH_ENDPOINT, {
      method: "POST",
      body,
    });

    const data = await r.json();

    if (!data.success) {
      throw new Error(
        data.detalle || data.error || "No se pudo registrar el abono.",
      );
    }

    await swalSuccess.fire(
      "Abono registrado",
      "El pago se guardó correctamente.",
      "success",
    );

    cerrarModalAbonoFinanciadoDashboard();

    await cargarPagosFinanciadosCard();

    // Refrescamos KPIs por si después agregamos totales relacionados.
    if (typeof cargarKPIs === "function") {
      await cargarKPIs();
    }
  } catch (e) {
    swalError.fire(
      "Error",
      e.message || "No se pudo registrar el abono.",
      "error",
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = oldHtml;
    }
  }
}
