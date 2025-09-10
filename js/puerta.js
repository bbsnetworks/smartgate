// js/puerta.js
"use strict";

/* =========================================================================
   Utilidades
   ====================================================================== */
const $ = (sel) => document.querySelector(sel);
const on = (el, ev, cb) => el && el.addEventListener(ev, cb);

const S = {
  success: window.swalSuccess || Swal,
  error: window.swalError || Swal,
  info: window.swalInfo || Swal,
};

// Puedes definir data-puerta="principal" en <body>; si no, usa 'principal'
const DEFAULT_PUERTA =
  (document.body && (document.body.dataset.puerta || document.body.getAttribute("data-puerta"))) ||
  "principal";

async function postForm(url, obj) {
  const fd = new FormData();
  Object.entries(obj || {}).forEach(([k, v]) => fd.append(k, v));
  const res = await fetch(url, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data, status: res.status };
}

/* =========================================================================
   Verificar puertas (independiente del FAB)
   ====================================================================== */
let busyVerify = false;

async function handleVerifyClick(e) {
  if (e) e.preventDefault();
  if (busyVerify) return;

  const { value: params } = await Swal.fire({
    title: "Verificar puertas",
    html: `
      <div class="text-left">
        <label class="block mb-1 text-sm">Puerta (alias):</label>
        <input id="v_puerta" value="${DEFAULT_PUERTA}" class="swal2-input" placeholder="principal">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block mb-1 text-sm">Inicio</label>
            <input id="v_start" type="number" value="1" class="swal2-input">
          </div>
          <div>
            <label class="block mb-1 text-sm">Fin</label>
            <input id="v_end" type="number" value="40" class="swal2-input">
          </div>
        </div>
        <label class="mt-2 flex items-center gap-2 text-sm">
          <input id="v_replace" type="checkbox">
          <span>Reemplazar existentes (desactivar anteriores)</span>
        </label>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Verificar",
    preConfirm: () => {
      const puerta  = (document.getElementById("v_puerta").value || "").trim() || DEFAULT_PUERTA;
      const start   = parseInt(document.getElementById("v_start").value || "1", 10);
      const end     = parseInt(document.getElementById("v_end").value   || "40", 10);
      const replace = document.getElementById("v_replace").checked ? "1" : "0";
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
        Swal.showValidationMessage("El rango es inválido.");
        return false;
      }
      return { puerta, start, end, replace };
    },
  });

  if (!params) return;

  try {
    busyVerify = true;
    S.info.fire({ title: "Verificando...", didOpen: () => Swal.showLoading() });

    const { data } = await postForm("php/verificar_puertas.php", {
      puerta: params.puerta,
      start: String(params.start),
      end: String(params.end),
      replace: params.replace
    });

    if (data && data.success) {
      const list = (data.codes || []).map((c) => `<code>${c}</code>`).join(", ") || "(ninguno)";
      S.success.fire("Listo", `Códigos válidos guardados para <b>${data.puerta}</b>: ${list}`);
    } else {
      S.error.fire("Error", (data && (data.error || data.message)) || "No fue posible verificar");
    }
  } catch {
    S.error.fire("Error", "Fallo al conectar con el servidor");
  } finally {
    busyVerify = false;
  }
}

// Enlaza SIEMPRE el botón del sidebar (exista o no el FAB)
on($("#menu-verificar-puertas"), "click", handleVerifyClick);

// Expone función global por si quieres llamarla desde otro lado
window.verificarPuertas = handleVerifyClick;

/* =========================================================================
   FAB flotante (si existe) — solo maneja abrir/cerrar el menú
   ====================================================================== */
(function fabUI() {
  const fabWrap   = $("#fab-admin");
  const fabToggle = $("#fab-toggle");
  const fabMenu   = $("#fab-menu");
  if (!fabWrap || !fabToggle || !fabMenu) return; // si no existe, no pasa nada

  let open = false;

  function openMenu() {
    open = true;
    fabMenu.classList.remove("opacity-0","translate-y-2","scale-95","pointer-events-none");
    fabMenu.classList.add("opacity-100","translate-y-0","scale-100","pointer-events-auto");
    fabToggle.classList.add("rotate-45");
  }
  function closeMenu() {
    open = false;
    fabMenu.classList.add("opacity-0","translate-y-2","scale-95","pointer-events-none");
    fabMenu.classList.remove("opacity-100","translate-y-0","scale-100","pointer-events-auto");
    fabToggle.classList.remove("rotate-45");
  }

  on(fabToggle, "click", (e) => { e.stopPropagation(); open ? closeMenu() : openMenu(); });
  on(document, "click", (e) => { if (open && !fabWrap.contains(e.target)) closeMenu(); });
  on(document, "keydown", (e) => { if (e.key === "Escape" && open) closeMenu(); });

  // Si dentro del FAB también hay el botón, reutiliza el mismo handler:
  on($("#menu-verificar-puertas"), "click", () => { closeMenu(); });
})();

/* =========================================================================
   Abrir puerta (usa códigos guardados en BD) — soporta dos IDs
   ====================================================================== */
(function abrirPuertaModule() {
  const btnAbrir = $("#btn-abrir-puerta") || $("#card-abrir-puerta");
  if (!btnAbrir) return;

  let busy = false;

  on(btnAbrir, "click", async (e) => {
    e.preventDefault();
    if (busy) return;
    busy = true;

    try {
      S.success.fire({ title: "Abriendo puerta...", didOpen: () => Swal.showLoading() });

      const { data } = await postForm("php/abrir_puerta.php", { puerta: DEFAULT_PUERTA });

      if (data && data.success) {
        S.success.fire("Listo", "La puerta ha sido abierta");
      } else {
        S.error.fire("Error", (data && (data.error || data.message)) || "No se pudo abrir la puerta");
      }
    } catch {
      S.error.fire("Error", "Fallo al conectar con el servidor");
    } finally {
      busy = false;
    }
  });
})();
