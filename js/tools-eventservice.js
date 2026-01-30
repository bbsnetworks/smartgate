const API_VIEW  = "php/tools/event_service_view.php";        // botón 1
const API_SUB   = "php/tools/event_service_subscribe.php";   // botón 2
const VISOR_URL = "http://127.0.0.1:8080/smartgate_eventos/"; // botón 3

async function apiGET(url) {
  const r = await fetch(url, { credentials: "same-origin" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw new Error(j.error || "Error de servidor");
  return j;
}

function showLoading(title = "Procesando…", text = "Un momento por favor") {
  Swal.fire({
    title,
    text,
    background: "#1e293b",
    color: "#f8fafc",
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading(),
    customClass: { popup: "rounded-xl shadow-lg" },
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const btnStatus = document.getElementById("btn-server-status");
  const btnStart  = document.getElementById("btn-server-start");
  const btnOpen   = document.getElementById("btn-server-open");

  // ==========================
  // Botón 1: Revisar servidor
  // ==========================
  btnStatus?.addEventListener("click", async (e) => {
    e.preventDefault();

    showLoading("Revisando servicio…", "Verificando suscripción de eventos");

    try {
      const res = await apiGET(API_VIEW);

      // Si quieres validar que venga eventDest y eventTypes
      const ok = !!res.eventDest && Array.isArray(res.eventTypes) && res.eventTypes.length > 0;

      if (ok) {
        // ✅ Modal limpio (cliente normal)
        swalSuccess.fire({
          title: "Servicio activo",
          html: `<div class="text-slate-200 text-sm text-center">
                  El servicio de eventos está funcionando correctamente.
                </div>`,
          confirmButtonText: "OK",
        });
      } else {
        // ⚠️ Respuesta rara pero sin “error técnico”
        swalInfo.fire({
          title: "Servicio sin configuración",
          html: `<div class="text-slate-200 text-sm text-center">
                  El servicio respondió, pero no hay una suscripción completa configurada.
                </div>`,
          confirmButtonText: "OK",
        });
      }

    } catch (err) {
      swalError.fire({
        title: "Servicio no disponible",
        text: err.message || "No se pudo verificar el servicio",
        confirmButtonText: "OK",
      });
    }
  });

  // ==========================
  // Botón 2: Levantar servidor
  // ==========================
  btnStart?.addEventListener("click", async (e) => {
    e.preventDefault();

    const ask = await swalInfo.fire({
      title: "Iniciar servicio",
      html: `<div class="text-slate-200 text-sm text-center">
              Se enviará la suscripción de eventos al sistema.
            </div>`,
      showCancelButton: true,
      confirmButtonText: "Iniciar",
      cancelButtonText: "Cancelar",
    });

    if (!ask.isConfirmed) return;

    showLoading("Iniciando…", "Registrando suscripción de eventos");

    try {
      const res = await apiGET(API_SUB);

      // Tu API devuelve code "0" / msg "Success"
      const raw = res.raw || {};
      const success = (raw.code === 0 || raw.code === "0");

      if (success) {
        swalSuccess.fire({
          title: "Servicio iniciado",
          html: `<div class="text-slate-200 text-sm text-center">
                  La suscripción de eventos se registró correctamente.
                </div>`,
          confirmButtonText: "OK",
        });
      } else {
        swalInfo.fire({
          title: "Respuesta recibida",
          html: `<div class="text-slate-200 text-sm text-center">
                  Se recibió respuesta, pero no se confirmó como éxito.
                </div>`,
          confirmButtonText: "OK",
        });
      }

    } catch (err) {
      swalError.fire({
        title: "No se pudo iniciar",
        text: err.message || "Error al iniciar el servicio",
        confirmButtonText: "OK",
      });
    }
  });

  // ==========================
  // Botón 3: Abrir visor
  // ==========================
  btnOpen?.addEventListener("click", (e) => {
    e.preventDefault();
    window.open(VISOR_URL, "_blank", "noopener,noreferrer");
  });
});
