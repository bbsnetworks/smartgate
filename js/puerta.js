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
   Sincronizar puertas (acsDoorList -> BD)  [ANTES: "Verificar puertas"]
   ====================================================================== */
let busyVerify = false;

async function handleVerifyClick(e) {
  if (e) e.preventDefault();
  if (busyVerify) return;

  // Usa swalCard si existe; si no, cae a swalInfo/Swal
  const Card = window.swalCard || window.swalInfo || Swal;

  const r = await Card.fire({
    title: "Sincronizar puertas",
    html: `
      <div class="text-slate-300 text-sm leading-relaxed">
        Esto consultará <b>acsDoorList</b> y guardará automáticamente las puertas como:
        <b>Puerta 1</b> y <b>Puerta 2</b>.
        <div class="mt-2 text-slate-400">
          (Se actualizarán los doorIndexCode en tu base de datos)
        </div>
      </div>
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, sincronizar",
    cancelButtonText: "Cancelar",
    reverseButtons: true,
    focusCancel: true,
  });

  if (!r.isConfirmed) return;

  try {
    busyVerify = true;

    // Spinner / loading
    Card.fire({
      title: "Sincronizando…",
      html: `<span class="text-slate-300 text-sm">Consultando puertas y guardando en base de datos</span>`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    // ✅ Ya no pedimos alias; el backend asigna "Puerta 1" y "Puerta 2"
    // ✅ replace lo mandamos en 1 (desactiva las que ya no existan)
    const { ok, data } = await postForm("php/sync_puertas.php", {
      replace: "1",
    });

    if (!ok || !data || !data.success) {
      throw new Error((data && (data.error || data.message)) || "No fue posible sincronizar");
    }

    // Puedes mostrar los doorIndexCode que regreses del backend (si los mandas)
    const codes = Array.isArray(data.codes) ? data.codes : [];
    const detalle = codes.length
      ? `<div class="mt-2 text-slate-300 text-sm">DoorIndexCodes: ${codes.map(c => `<code>${c}</code>`).join(", ")}</div>`
      : "";

    (window.swalSuccess || Swal).fire({
      title: "Listo ✅",
      html: `
        <div class="text-slate-200">
          Se guardaron correctamente <b>Puerta 1</b> y <b>Puerta 2</b>.
          ${detalle}
        </div>
      `,
      icon: "success",
    });

  } catch (err) {
    (window.swalError || Swal).fire("Error", err.message || "Fallo al conectar con el servidor", "error");
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
/* =========================================================================
   Abrir puerta (Puerta 1 / Puerta 2)
   ====================================================================== */
/* =========================================================================
   Abrir puerta (Puerta 1 / Puerta 2)
   ====================================================================== */
(function abrirPuertaModule() {
  const btn1 = $("#btn-abrir-puerta-1");
  const btn2 = $("#btn-abrir-puerta-2");

  if (!btn1 && !btn2) return;

  let busy = false;

  async function abrir(slot) {
    if (busy) return;
    busy = true;

    // Bloquea ambos mientras se procesa
    [btn1, btn2].forEach(b => { if (b) b.disabled = true; });

    try {
      S.info.fire({
        title: `Abriendo Puerta ${slot}...`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });

      const { ok, data } = await postForm("php/abrir_puerta.php", {
        puerta: DEFAULT_PUERTA,
        slot: String(slot) // <<<<<< CLAVE
      });

      if (!ok || !data || !data.success) {
        throw new Error((data && (data.error || data.message)) || "No se pudo abrir la puerta");
      }

      S.success.fire("Listo", `Puerta ${slot} abierta correctamente`);
    } catch (err) {
      S.error.fire("Error", err.message || "Fallo al conectar con el servidor");
    } finally {
      busy = false;
      // Re-habilita (si btn2 estaba deshabilitado por no existir puerta 2, tu lógica debe volver a setearlo)
      [btn1, btn2].forEach(b => { if (b) b.disabled = false; });
    }
  }

  on(btn1, "click", (e) => { e.preventDefault(); e.stopPropagation(); abrir(1); });
  on(btn2, "click", (e) => { e.preventDefault(); e.stopPropagation(); abrir(2); });
})();
