let USER_FILTER = "me"; // "me" | "all" | <iduser>


document.addEventListener('DOMContentLoaded', async () => {
  // 1) Cargar select global y fijar USER_FILTER
  await cargarUsuariosGlobal();

  // 2) KPIs + gráficas con el filtro actual
  await cargarTodo();

  // 3) Listeners: solo la resolución de cada gráfica
  document.getElementById('res-insc')?.addEventListener('change', () =>
    cargarSerie('insc', document.getElementById('res-insc').value, 'chart-insc')
  );
  document.getElementById('res-prod')?.addEventListener('change', () =>
    cargarSerie('prod', document.getElementById('res-prod').value, 'chart-prod')
  );

  // 4) Abrir puerta desde card (igual que lo tenías)
  const cardPuerta = document.getElementById('card-abrir-puerta');
  if (cardPuerta) {
    cardPuerta.addEventListener('click', async () => {
      try {
        swalSuccess.fire({ title: "Abriendo puerta...", didOpen: () => Swal.showLoading() });
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
    const url = new URL('openapi/php/dashboard_resumen.php', location.origin);
    url.searchParams.set('period', 'hoy');
    url.searchParams.set('user', USER_FILTER); // NUEVO

    const res = await fetch(url, { cache: 'no-store' });
    const d = await res.json();

    setText('#kpi-activos', d.activos ?? '0');
    setText('#kpi-inactivos', d.inactivos ?? '0');
    setText('#kpi-aniversarios', d.aniversarios_hoy ?? '0');

    setText('#kpi-ventas', d.ventas_monto_fmt ?? '$0');
    setText('#kpi-ventas-det', d.ventas_detalle ?? '');
    setText('#kpi-inscripciones', d.inscripciones ?? '0');
    setText('#kpi-insc-det', d.inscripciones_detalle ?? '');

    // Lista de aniversarios
    const ul = document.getElementById('lista-aniversarios');
    if (ul) {
      ul.innerHTML = '';
      const arr = Array.isArray(d.aniversarios_lista) ? d.aniversarios_lista : [];
      if (arr.length === 0) {
        ul.innerHTML = '<li class="text-slate-400">Sin aniversarios hoy</li>';
      } else {
        arr.forEach(item => {
          const n = Number(item.anios) || 0;
          const li = document.createElement('li');
          li.className = 'flex items-center justify-between bg-slate-700/40 border border-slate-600/30 rounded-md px-2 py-1';
          li.innerHTML = `<span>${item.nombre}</span><span class="text-amber-300 font-semibold">${n} ${n===1?'año':'años'}</span>`;
          ul.appendChild(li);
        });
      }
      // --- Stock bajo ---
const ulStock = document.getElementById('lista-stock-bajo');
if (ulStock) {
  ulStock.innerHTML = '';
  const items = Array.isArray(d.stock_bajo) ? d.stock_bajo : [];
  if (items.length === 0) {
    ulStock.innerHTML = '<li class="text-slate-400">Sin alertas de stock</li>';
  } else {
    items.forEach(it => {
  const li = document.createElement('li');
  li.className = 'flex items-center justify-between bg-red-900/30 border border-red-500/30 rounded-md px-2 py-1';
  li.innerHTML = `
    <span class="truncate mr-2 text-slate-200">${it.nombre}</span>
    <span class="text-red-300 font-semibold">${it.stock}</span>
    ${typeof it.min === 'number' ? `<span class="text-xs text-slate-400 ml-2">/ min ${it.min}</span>` : ''}
  `;
  ulStock.appendChild(li);
});

  }
  const foot = document.getElementById('stock-bajo-footer');
  if (foot) foot.textContent = items.length ? `${items.length} producto(s) bajo umbral` : '';
}

    }

    // Nuevo: monto de inscripciones
    setText('#kpi-inscripciones-monto', d.inscripciones_monto_fmt ?? '$0');
    setText('#kpi-insc-monto-det', d.inscripciones_monto_detalle ?? '');

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
    const url = new URL('openapi/php/dashboard_resumen.php', location.origin);
    url.searchParams.set('serie', serie);
    url.searchParams.set('res', resol);
    url.searchParams.set('user', USER_FILTER); // NUEVO

    const res = await fetch(url, { cache: 'no-store' });
    const d = await res.json();
    // ... lo demás igual


    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (charts[canvasId]) charts[canvasId].destroy();

    charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: d.labels || [],
        datasets: [{
          label: serie === 'insc' ? 'Inscripciones' : 'Ventas de productos',
          data: d.data || [],
          tension: 0.25,
          fill: false
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#cbd5e1' } },
          y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#cbd5e1' } }
        }
      }
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
  swalcard.fire({
    title: "Configuración de Marca",
    html: `
      <div class="space-y-4 text-left">
        <label class="block text-sm">Nombre de la app</label>
        <input id="brandAppName" type="text" class="swal2-input !w-full" placeholder="Gym Admin">

        <label class="block text-sm">Título del dashboard</label>
        <input id="brandTitle" type="text" class="swal2-input !w-full" placeholder="Panel de Control">

        <label class="block text-sm">Subtítulo</label>
        <input id="brandSub" type="text" class="swal2-input !w-full" placeholder="SmartGate by BBSNetworks">

        <label class="block text-sm">Logo (máx ${(BRANDING.MAX_BYTES/1024/1024).toFixed(0)}MB)</label>
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
        document.getElementById("brandTitle").value  = b.dashboard_title || "";
        document.getElementById("brandSub").value    = b.dashboard_sub || "";

        if (b.logo_etag) {
          const prev = document.getElementById("brandPreview");
          const img  = document.getElementById("brandPreviewImg");
          img.src = `${BRANDING.LOGO_URL}?v=${encodeURIComponent(b.logo_etag)}`;
          prev.classList.remove("hidden");
        }
      } catch(e) { /* no-op */ }

      // Validar tamaño y previsualizar
      const input = document.getElementById("brandLogo");
      input.addEventListener("change", (ev) => {
        const f = ev.target.files[0];
        if (!f) return;
        if (f.size > BRANDING.MAX_BYTES) {
          ev.target.value = "";
          Swal.showValidationMessage(`La imagen no debe superar ${(BRANDING.MAX_BYTES/1024/1024).toFixed(0)} MB`);
          return;
        }
        const url = URL.createObjectURL(f);
        const prev = document.getElementById("brandPreview");
        const img  = document.getElementById("brandPreviewImg");
        img.src = url;
        prev.classList.remove("hidden");
      });
    },
    preConfirm: () => {
      const appName = document.getElementById("brandAppName").value.trim();
      const title   = document.getElementById("brandTitle").value.trim();
      const sub     = document.getElementById("brandSub").value.trim();
      const file    = document.getElementById("brandLogo").files[0];

      if (file && file.size > BRANDING.MAX_BYTES) {
        Swal.showValidationMessage(`La imagen no debe superar ${(BRANDING.MAX_BYTES/1024/1024).toFixed(0)} MB`);
        return false;
      }
      return { appName, title, sub, file };
    }
  }).then(async (res) => {
    if (!res.isConfirmed) return;

    const { appName, title, sub, file } = res.value;
    const formData = new FormData();
    formData.append("app_name", appName);
    formData.append("dashboard_title", title);
    formData.append("dashboard_sub", sub);
    if (file) formData.append("logo", file);

    try {
      const rq = await fetch(BRANDING.SAVE_URL, { method: "POST", body: formData });
      const data = await rq.json();
      if (data.ok) {
        await Swal.fire("✔️ Guardado", "Configuración actualizada", "success");
        // refrescar vista sin recargar toda la página
        await cargarBranding();
      } else {
        Swal.fire("Error", data.msg || "No se pudo actualizar", "error");
      }
    } catch (e) {
      Swal.fire("Error", "Fallo la petición: " + e, "error");
    }
  });
}
async function cargarUsuariosGlobal() {
  try {
    const r = await fetch('php/usuarios_dashboard.php', { cache: 'no-store' });
    const data = await r.json(); // {rol, uid, opciones:[{value,text,disabled}]}
    const sel = document.getElementById('sel-usuario-global');
    if (!sel) return;

    sel.innerHTML = '';
    data.opciones.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.text;
      if (o.disabled) opt.disabled = true;
      sel.appendChild(opt);
    });

    USER_FILTER = data.rol === 'worker' ? 'me' : 'all';
    sel.value = USER_FILTER;
    if (data.rol === 'worker') sel.disabled = true;

    sel.addEventListener('change', async () => {
      USER_FILTER = sel.value;
      await cargarTodo();
    });
  } catch (e) {
    console.error('No se pudo cargar usuarios:', e);
  }
}

async function cargarTodo() {
  await cargarKPIs();
  await cargarSerie('insc', document.getElementById('res-insc')?.value || 'mes', 'chart-insc');
  await cargarSerie('prod', document.getElementById('res-prod')?.value || 'mes', 'chart-prod');
}

