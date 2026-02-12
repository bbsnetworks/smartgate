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

// Abre el modal para editar branding
function modalBranding() {
  swalcard
    .fire({
      title: "Configuración de Marca",
      html: `
      <div class="space-y-4 text-left">
        <label class="block text-sm">Nombre de la app</label>
        <input id="brandAppName" type="text" class="swal2-input !w-full" placeholder="Gym Admin">

        <label class="block text-sm">Título del dashboard</label>
        <input id="brandTitle" type="text" class="swal2-input !w-full" placeholder="Panel de Control">

        <label class="block text-sm">Subtítulo</label>
        <input id="brandSub" type="text" class="swal2-input !w-full" placeholder="SmartGate by BBSNetworks">

        <label class="block text-sm">Logo (máx ${(BRANDING.MAX_BYTES / 1024 / 1024).toFixed(0)}MB)</label>
        <input id="brandLogo" type="file" accept="image/*" class="swal2-file !w-full">

        <div id="brandPreview" class="mt-2 hidden">
          <img id="brandPreviewImg" class="h-12 rounded" alt="preview">
        </div>
      </div>
    `,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      focusConfirm: false,
      didOpen: async () => {
        // Precargar valores actuales
        try {
          const r = await fetch(BRANDING.GET_URL, { cache: "no-store" });
          const b = await r.json();
          document.getElementById("brandAppName").value = b.app_name || "";
          document.getElementById("brandTitle").value = b.dashboard_title || "";
          document.getElementById("brandSub").value = b.dashboard_sub || "";

          if (b.logo_etag) {
            const prev = document.getElementById("brandPreview");
            const img = document.getElementById("brandPreviewImg");
            img.src = `${BRANDING.LOGO_URL}?v=${encodeURIComponent(b.logo_etag)}`;
            prev.classList.remove("hidden");
          }
        } catch (e) {
          /* no-op */
        }

        // Validar tamaño y previsualizar
        const input = document.getElementById("brandLogo");
        input.addEventListener("change", (ev) => {
          const f = ev.target.files[0];
          if (!f) return;
          if (f.size > BRANDING.MAX_BYTES) {
            ev.target.value = "";
            Swal.showValidationMessage(
              `La imagen no debe superar ${(BRANDING.MAX_BYTES / 1024 / 1024).toFixed(0)} MB`,
            );
            return;
          }
          const url = URL.createObjectURL(f);
          const prev = document.getElementById("brandPreview");
          const img = document.getElementById("brandPreviewImg");
          img.src = url;
          prev.classList.remove("hidden");
        });
      },
      preConfirm: () => {
        const appName = document.getElementById("brandAppName").value.trim();
        const title = document.getElementById("brandTitle").value.trim();
        const sub = document.getElementById("brandSub").value.trim();
        const file = document.getElementById("brandLogo").files[0];

        if (file && file.size > BRANDING.MAX_BYTES) {
          Swal.showValidationMessage(
            `La imagen no debe superar ${(BRANDING.MAX_BYTES / 1024 / 1024).toFixed(0)} MB`,
          );
          return false;
        }
        return { appName, title, sub, file };
      },
    })
    .then(async (res) => {
      if (!res.isConfirmed) return;

      const { appName, title, sub, file } = res.value;
      const formData = new FormData();
      formData.append("app_name", appName);
      formData.append("dashboard_title", title);
      formData.append("dashboard_sub", sub);
      if (file) formData.append("logo", file);

      try {
        const rq = await fetch(BRANDING.SAVE_URL, {
          method: "POST",
          body: formData,
        });
        const data = await rq.json();
        if (data.ok) {
          await swalSuccess.fire(
            "✔️ Guardado",
            "Configuración actualizada",
            "success",
          );
          // refrescar vista sin recargar toda la página
          await cargarBranding();
        } else {
          swalError.fire("Error", data.msg || "No se pudo actualizar", "error");
        }
      } catch (e) {
        swalError.fire("Error", "Fallo la petición: " + e, "error");
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
