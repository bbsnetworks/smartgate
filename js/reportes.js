document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const hoy = `${yyyy}-${mm}-${dd}`;
  document.getElementById("fecha_dia").value = hoy;
});
async function obtenerBrandingTicket() {
  const brandingPorDefecto = {
    app_name: "Gym Admin",
    logo: "../php/logo_branding.php",
    impresora_tipo: "48 mm",
  };

  try {
    const res = await fetch("../php/obtener_branding.php", {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    /*
     * Acepta ambos nombres para mantener
     * compatibilidad con el backend.
     */
    const valorImpresora = String(
      data.tipo_impresora ??
      data.impresora_tipo ??
      "48 mm",
    )
      .trim()
      .toLowerCase();

    const tipoImpresora =
      valorImpresora.startsWith("58")
        ? "58 mm"
        : "48 mm";

    return {
      app_name:
        data.app_name ||
        "Gym Admin",

      logo: data.logo_etag
        ? `../php/logo_branding.php?v=${encodeURIComponent(
            data.logo_etag,
          )}`
        : "../php/logo_branding.php",

      impresora_tipo: tipoImpresora,
    };
  } catch (error) {
    console.warn(
      "No se pudo cargar el branding:",
      error,
    );

    return brandingPorDefecto;
  }
}
async function buscarReportes() {
  const btn = document.getElementById("btnBuscarReporte");
  if (btn?.disabled) return; // evita doble click

  lockBuscarReporte();

  const usuario = document.getElementById("usuario").value;
  const tipo = document.getElementById("tipoPeriodo").value;
  const container = document.getElementById("reporteContainer");
  container.innerHTML = "";

  let fecha = "",
    inicio = "",
    fin = "";

  if (tipo === "dia") {
    fecha = document.getElementById("fecha_dia").value;

    if (!fecha) {
      unlockBuscarReporte();
      return swalError.fire(
        "Falta fecha",
        "Selecciona una fecha para el reporte por día.",
        "warning",
      );
    }
  } else if (tipo === "mes") {
    fecha = document.getElementById("fecha_mes").value;

    if (!fecha) {
      unlockBuscarReporte();
      return swalError.fire("Falta mes", "Selecciona un mes.", "warning");
    }
  } else if (tipo === "anio") {
    fecha = document.getElementById("fecha_anio").value;

    if (!fecha) {
      unlockBuscarReporte();
      return swalError.fire("Falta año", "Selecciona un año.", "warning");
    }
  } else if (tipo === "rango") {
    inicio = document.getElementById("rango_inicio").value;
    fin = document.getElementById("rango_fin").value;

    if (!inicio || !fin) {
      unlockBuscarReporte();
      return swalError.fire(
        "Falta rango",
        "Selecciona ambas fechas del rango.",
        "warning",
      );
    }
  }

  swalInfo.fire({
    title: "Cargando...",
    text: "Obteniendo reportes",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const params = new URLSearchParams({ usuario, tipo, fecha, inicio, fin });
    const response = await fetch(
      `../php/obtener_reportes.php?${params.toString()}`,
    );
    const data = await response.json();

    Swal.close();

    if (!data.success) {
      return swalError.fire(
        "Error",
        data.error || "No se pudo obtener la información.",
        "error",
      );
    }

    const {
      total_pagos,
      total_productos,
      cantidad_pagos,
      cantidad_productos,
      visitas_cantidad,
      visitas_total,
      clase_funcional_cantidad,
      clase_funcional_total,
      total_financiados,
      cantidad_financiados,

      total_general,

      // Nuevo desglose de pagos por tarifa
      resumen_tarifas = [],
    } = data;

    container.innerHTML += crearCard(
      "Total en Suscripciones",
      `$${parseFloat(total_pagos).toFixed(2)}`,
      "bi-currency-dollar",
      "text-blue-600",
      "bg-sky-100",
    );
    container.innerHTML += crearCard(
      "Suscripciones Registradas",
      cantidad_pagos,
      "bi-people-fill",
      "text-blue-500",
      "bg-sky-100",
    );

    container.innerHTML += crearCardDesgloseTarifas(resumen_tarifas);

    container.innerHTML += crearCard(
      "Total en Pagos Financiados",
      `$${parseFloat(total_financiados || 0).toFixed(2)}`,
      "bi-calendar-check",
      "text-cyan-600",
      "bg-cyan-100",
    );

    container.innerHTML += crearCard(
      "Pagos Financiados Registrados",
      parseInt(cantidad_financiados || 0, 10),
      "bi-receipt-cutoff",
      "text-cyan-500",
      "bg-cyan-100",
    );
    container.innerHTML += crearCard(
      "Total en Productos Vendidos",
      `$${parseFloat(total_productos).toFixed(2)}`,
      "bi-cart-check",
      "text-green-600",
      "bg-stone-200",
    );
    container.innerHTML += crearCard(
      "Ventas Registradas",
      cantidad_productos,
      "bi-boxes",
      "text-green-500",
      "bg-stone-200",
    );
    // ✅ VISITAS (separadas, no mezcladas con productos)
    container.innerHTML += crearCard(
      "Visitas Registradas",
      parseInt(visitas_cantidad || 0, 10),
      "bi-person-walking",
      "text-purple-600",
      "bg-purple-100",
    );

    container.innerHTML += crearCard(
      "Total en Visitas",
      `$${parseFloat(visitas_total || 0).toFixed(2)}`,
      "bi-ticket-perforated",
      "text-purple-500",
      "bg-purple-100",
    );
    // ✅ CLASE FUNCIONAL DE ADULTOS (código 2)
    // Solo se muestran las cards cuando existen registros.
    const cantidadClaseFuncional = parseInt(clase_funcional_cantidad || 0, 10);

    const totalClaseFuncional = parseFloat(clase_funcional_total || 0);

    if (cantidadClaseFuncional > 0) {
      container.innerHTML += crearCard(
        "Clase Funcional de Adultos",
        cantidadClaseFuncional,
        "bi-people-fill",
        "text-orange-600",
        "bg-orange-100",
      );

      container.innerHTML += crearCard(
        "Total Clase Funcional",
        `$${totalClaseFuncional.toFixed(2)}`,
        "bi-activity",
        "text-orange-500",
        "bg-orange-100",
      );
    }
    container.innerHTML += crearCard(
      "Total General",
      `$${parseFloat(total_general).toFixed(2)}`,
      "bi-coin",
      "text-indigo-600",
      "bg-green-200",
    );

    // ===== Movimientos de caja (desde DETALLE) =====
    if (tipo === "dia" && String(usuario) !== "todos") {
      // ===== Movimientos de caja (desde DETALLE) =====
      let cajaIngresos = 0,
        cajaEgresos = 0,
        cajaCantidad = 0;

      try {
        const detRes = await fetch(
          `../php/obtener_reportes_detalle.php?${params.toString()}`,
        );
        const det = await detRes.json();

        if (det.success) {
          cajaIngresos = parseFloat(det.caja_ingresos || 0);
          cajaEgresos = parseFloat(det.caja_egresos || 0);
          cajaCantidad = (det.movimientos_caja || []).length;
        }
      } catch (e) {
        console.warn("No se pudo cargar movimientos de caja", e);
      }

      const netoCaja = (cajaIngresos || 0) - (cajaEgresos || 0);

      container.innerHTML += crearCard(
        "Movimientos de caja",
        `<div class="text-xl font-bold text-gray-800">$${netoCaja.toFixed(
          2,
        )}</div>
     <div class="text-sm text-gray-600 mt-1">
       Ingresos: $${(cajaIngresos || 0).toFixed(2)} ·
       Egresos: $${(cajaEgresos || 0).toFixed(2)} ·
       Movs: ${parseInt(cajaCantidad || 0, 10)}
     </div>`,
        "bi-arrow-left-right",
        "text-amber-600",
        "bg-amber-100",
      );
    }

    if (tipo === "dia") {
      await renderCaja({ usuario, tipo, fecha, inicio, fin });
    }

    agregarBotonesAccionReporte();
  } catch (error) {
    console.error(error);
    swalError.fire("Error", "No se pudo conectar con el servidor.", "error");
    return; // ← evita continuar
  }
}

function crearCard(titulo, valor, icono, iconColor, bgColor) {
  return `
    <div class="${bgColor} rounded-xl shadow p-6 text-center">
      <i class="bi ${icono} text-4xl ${iconColor} mb-3"></i>
      <h2 class="text-lg font-semibold text-gray-700">${titulo}</h2>
      <div class="mt-2 text-gray-800 font-bold">${valor}</div>
    </div>
  `;
}
function crearCardDesgloseTarifas(tarifas = []) {
  const dinero = (valor) =>
    `$${Number(valor || 0).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const cantidad = (valor) => parseInt(valor || 0, 10);

  if (!Array.isArray(tarifas) || tarifas.length === 0) {
    return `
      <div class="col-span-1 md:col-span-2 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70 shadow-xl">
        <div class="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 px-6 py-5 text-white">
          <div class="flex items-center gap-3">
            <i class="bi bi-tags-fill text-3xl"></i>

            <div>
              <h2 class="text-xl font-bold">
                Pagos por tarifa
              </h2>

              <p class="text-sm text-blue-100">
                Cantidades y totales por método de pago
              </p>
            </div>
          </div>
        </div>

        <div class="p-8 text-center text-slate-400">
          <i class="bi bi-inbox text-4xl"></i>

          <p class="mt-3 font-medium">
            No se encontraron pagos por tarifa en el periodo seleccionado.
          </p>
        </div>
      </div>
    `;
  }

  const filas = tarifas
    .map((tarifa) => {
      const nombre = tarifa.nombre || "Tarifa eliminada";

      const efectivoCantidad = cantidad(
        tarifa.efectivo?.cantidad ?? tarifa.cantidad_efectivo,
      );

      const efectivoTotal = Number(
        tarifa.efectivo?.total ?? tarifa.total_efectivo ?? 0,
      );

      const tarjetaCantidad = cantidad(
        tarifa.tarjeta?.cantidad ?? tarifa.cantidad_tarjeta,
      );

      const tarjetaTotal = Number(
        tarifa.tarjeta?.total ?? tarifa.total_tarjeta ?? 0,
      );

      const transferenciaCantidad = cantidad(
        tarifa.transferencia?.cantidad ?? tarifa.cantidad_transferencia,
      );

      const transferenciaTotal = Number(
        tarifa.transferencia?.total ?? tarifa.total_transferencia ?? 0,
      );

      const totalCantidad = cantidad(
        tarifa.cantidad_pagos ??
          efectivoCantidad + tarjetaCantidad + transferenciaCantidad,
      );

      const totalCobrado = Number(
        tarifa.total ?? efectivoTotal + tarjetaTotal + transferenciaTotal,
      );

      return `
        <div class="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/80 shadow-lg">
          
          <div class="flex flex-col gap-4 border-b border-slate-700 bg-slate-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            
            <div>
              <div class="flex items-center gap-2">
                <i class="bi bi-tag-fill text-indigo-400"></i>

                <h3 class="text-lg font-bold text-white">
                  ${escapeHTMLReporte(nombre)}
                </h3>
              </div>

              ${
                tarifa.monto_tarifa != null
                  ? `
                    <p class="mt-1 text-sm text-slate-400">
                      Precio registrado de la tarifa:
                      <span class="font-semibold text-slate-200">
                        ${dinero(tarifa.monto_tarifa)}
                      </span>
                    </p>
                  `
                  : ""
              }
            </div>

            <div class="flex flex-wrap gap-3">
              
              <div class="min-w-[105px] rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-center">
                <div class="text-xs font-semibold uppercase tracking-wide text-indigo-300">
                  Pagos
                </div>

                <div class="text-xl font-bold text-white">
                  ${totalCantidad}
                </div>
              </div>

              <div class="min-w-[125px] rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-center">
                <div class="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  Total
                </div>

                <div class="text-xl font-bold text-emerald-400">
                  ${dinero(totalCobrado)}
                </div>
              </div>

            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 bg-slate-900/40 p-5 md:grid-cols-3">
            
            ${crearMetodoTarifaHTML({
              titulo: "Efectivo",
              icono: "bi-cash-stack",
              cantidad: efectivoCantidad,
              total: efectivoTotal,
              clases: {
                fondo: "bg-emerald-500/10",
                borde: "border-emerald-500/30",
                icono: "text-emerald-400",
                texto: "text-emerald-400",
              },
            })}

            ${crearMetodoTarifaHTML({
              titulo: "Tarjeta",
              icono: "bi-credit-card-2-front-fill",
              cantidad: tarjetaCantidad,
              total: tarjetaTotal,
              clases: {
                fondo: "bg-blue-500/10",
                borde: "border-blue-500/30",
                icono: "text-blue-400",
                texto: "text-blue-400",
              },
            })}

            ${crearMetodoTarifaHTML({
              titulo: "Transferencia",
              icono: "bi-bank",
              cantidad: transferenciaCantidad,
              total: transferenciaTotal,
              clases: {
                fondo: "bg-violet-500/10",
                borde: "border-violet-500/30",
                icono: "text-violet-400",
                texto: "text-violet-400",
              },
            })}

          </div>
        </div>
      `;
    })
    .join("");

  const totalPagosTarifas = tarifas.reduce(
    (acumulado, tarifa) => acumulado + cantidad(tarifa.cantidad_pagos),
    0,
  );

  const totalDineroTarifas = tarifas.reduce(
    (acumulado, tarifa) => acumulado + Number(tarifa.total || 0),
    0,
  );

  return `
    <div class="col-span-1 md:col-span-2 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70 shadow-xl">
      
      <div class="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 px-6 py-5 text-white">
        
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <i class="bi bi-tags-fill text-3xl"></i>
            </div>

            <div>
              <h2 class="text-xl font-bold">
                Pagos por tarifa
              </h2>

              <p class="text-sm text-blue-100">
                Cantidades y totales por método de pago
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-3">
            
            <div class="min-w-[150px] rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-center backdrop-blur">
              <div class="text-xs uppercase tracking-wide text-blue-100">
                Pagos registrados
              </div>

              <div class="text-xl font-bold text-white">
                ${totalPagosTarifas}
              </div>
            </div>

            <div class="min-w-[150px] rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-center backdrop-blur">
              <div class="text-xs uppercase tracking-wide text-blue-100">
                Total cobrado
              </div>

              <div class="text-xl font-bold text-emerald-300">
                ${dinero(totalDineroTarifas)}
              </div>
            </div>

          </div>
        </div>
      </div>

      <div class="space-y-5 bg-slate-900/60 p-5">
        ${filas}
      </div>

    </div>
  `;
}
function crearMetodoTarifaHTML({ titulo, icono, cantidad, total, clases }) {
  const totalFormateado = Number(total || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `
    <div class="${clases.fondo} ${clases.borde} rounded-xl border p-4 shadow-sm">
      
      <div class="flex items-start justify-between gap-3">
        
        <div>
          <div class="flex items-center gap-2">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950/30">
              <i class="bi ${icono} ${clases.icono} text-xl"></i>
            </div>

            <span class="font-semibold text-slate-200">
              ${titulo}
            </span>
          </div>

          <div class="mt-4 text-sm text-slate-400">
            Pagos realizados
          </div>

          <div class="text-2xl font-bold ${clases.texto}">
            ${parseInt(cantidad || 0, 10)}
          </div>
        </div>

        <div class="text-right">
          <div class="text-sm text-slate-400">
            Total
          </div>

          <div class="mt-1 text-xl font-bold ${clases.texto}">
            $${totalFormateado}
          </div>
        </div>

      </div>
    </div>
  `;
}
function mostrarFiltros() {
  document.getElementById("fecha_dia").classList.add("hidden");
  document.getElementById("fecha_mes").classList.add("hidden");
  document.getElementById("fecha_anio").classList.add("hidden");
  document.getElementById("rango_fechas").classList.add("hidden");

  const tipo = document.getElementById("tipoPeriodo").value;

  if (tipo === "dia") {
    document.getElementById("fecha_dia").classList.remove("hidden");
  } else if (tipo === "mes") {
    document.getElementById("fecha_mes").classList.remove("hidden");
  } else if (tipo === "anio") {
    document.getElementById("fecha_anio").classList.remove("hidden");
  } else if (tipo === "rango") {
    document.getElementById("rango_fechas").classList.remove("hidden");
  }
}
function escapeHTMLReporte(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
// Agrega este botón justo debajo del div con ID "reporteContainer"
function agregarBotonesAccionReporte() {
  const container = document.getElementById("reporteContainer");

  // Evita duplicados si ya existen
  const existente = document.getElementById("accionesReporteWrap");
  if (existente) existente.remove();

  const wrap = document.createElement("div");
  wrap.id = "accionesReporteWrap";
  wrap.className =
    "col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6";

  // Card PDF
  const cardPDF = document.createElement("div");
  cardPDF.className =
    "rounded-xl shadow text-2xl text-center flex items-center justify-center overflow-hidden bg-white";

  const btnPDF = document.createElement("button");
  btnPDF.type = "button";
  btnPDF.textContent = "📄 Generar PDF";
  btnPDF.className =
    "bg-green-600 h-full w-full hover:bg-green-700 text-white px-6 py-5 rounded-xl font-semibold shadow transition";
  btnPDF.onclick = generarPDFReporte;

  cardPDF.appendChild(btnPDF);

  // Card Correo
  const cardCorreo = document.createElement("div");
  cardCorreo.className =
    "rounded-xl shadow text-2xl text-center flex items-center justify-center overflow-hidden bg-white";

  const btnCorreo = document.createElement("button");
  btnCorreo.type = "button";
  btnCorreo.textContent = "✉️ Enviar por correo";
  btnCorreo.className =
    "bg-blue-600 h-full w-full hover:bg-blue-700 text-white px-6 py-5 rounded-xl font-semibold shadow transition";
  btnCorreo.onclick = abrirModalCorreoReporte; // por ahora solo placeholder

  cardCorreo.appendChild(btnCorreo);

  // Card Ticket 58 mm
  const cardTicket = document.createElement("div");

  cardTicket.className =
    "rounded-xl shadow text-2xl text-center flex items-center justify-center overflow-hidden bg-white";

  const btnTicket = document.createElement("button");

  btnTicket.type = "button";
  btnTicket.textContent = "🧾 Ticket";

  btnTicket.className =
    "bg-amber-600 h-full w-full hover:bg-amber-700 text-white px-6 py-5 rounded-xl font-semibold shadow transition";

  btnTicket.onclick = generarTicketCorte58mm;

  cardTicket.appendChild(btnTicket);

  wrap.appendChild(cardPDF);
  wrap.appendChild(cardCorreo);
  wrap.appendChild(cardTicket);

  container.appendChild(wrap);
}

async function construirPDFReporte() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // =========================
  // 1) Configuración inicial
  // =========================
  const usuarioId = document.getElementById("usuario").value;
  const tipo = document.getElementById("tipoPeriodo").value;

  let fecha = "",
    inicio = "",
    fin = "";
  if (tipo === "dia") fecha = document.getElementById("fecha_dia").value;
  else if (tipo === "mes") fecha = document.getElementById("fecha_mes").value;
  else if (tipo === "anio") fecha = document.getElementById("fecha_anio").value;
  else if (tipo === "rango") {
    inicio = document.getElementById("rango_inicio").value;
    fin = document.getElementById("rango_fin").value;
  }

  const params = new URLSearchParams({
    usuario: usuarioId,
    tipo,
    fecha,
    inicio,
    fin,
  });

  // Trae TODO desde detalle (pagos, ventas, métodos, caja)
  const res = await fetch(
    `../php/obtener_reportes_detalle.php?${params.toString()}`,
  );
  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error || "No se pudo generar el PDF.");
  }

  // =========================
  // 2) Variables globales PDF
  // =========================
  const logo = await obtenerLogoDesdeDB();
  const usuarioSelect = document.getElementById("usuario");
  const nombreUsuario = usuarioSelect.options[usuarioSelect.selectedIndex].text;

  let y = 15;

  let totalSuscripciones = 0;
  let totalVentas = 0;
  let totalFinanciadosPDF = 0;

  const totalSuscripcionesPorMetodo = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
  };

  const totalFinanciadosPorMetodo = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    otro: 0,
  };

  // =========================
  // 3) Paleta + utilidades
  // =========================
  const PALETTE = {
    title: [45, 55, 72],
    text: [31, 41, 55],
    mute: [107, 114, 128],
    box: [248, 250, 252],
    stroke: [203, 213, 225],
    sub: [2, 132, 199],
    sub2: [234, 88, 12],
    ok: [16, 185, 129],
    bandBg: [15, 23, 42],
    bandTx: [255, 255, 255],
  };

  const fmtMoney = (n) => `$${(Number(n) || 0).toFixed(2)}`;

  function ensureSpace(doc, y, need = 40) {
    if (y + need > 285) {
      doc.addPage();
      return 20;
    }
    return y;
  }
  function renderTituloSeccion({
    titulo,
    subtitulo = "",
    colorFondo = [30, 64, 175],
    colorTexto = [255, 255, 255],
    colorSubtitulo = [219, 234, 254],
  }) {
    const alto = subtitulo ? 25 : 18;

    y = ensureSpace(doc, y, alto + 8);

    doc.setFillColor(...colorFondo);
    doc.roundedRect(10, y, 190, alto, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...colorTexto);
    doc.text(titulo.toUpperCase(), 16, y + 9);

    if (subtitulo) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...colorSubtitulo);
      doc.text(subtitulo, 16, y + 16);
    }

    y += alto + 8;
  }
  function lineAmount(
    doc,
    x,
    y,
    label,
    amount,
    rightBound,
    labelColor = PALETTE.text,
    amountColor = labelColor,
  ) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const right = rightBound;
    const price = fmtMoney(amount);
    const wPrice = doc.getTextWidth(price);
    const dotEnd = right - wPrice - 2;

    const maxLabelW = right - x - (wPrice + 8);
    let labelShown = label;

    if (doc.getTextWidth(labelShown) > maxLabelW) {
      while (
        labelShown.length > 1 &&
        doc.getTextWidth(labelShown + "…") > maxLabelW
      ) {
        labelShown = labelShown.slice(0, -1);
      }
      labelShown += "…";
    }

    // Texto izquierdo
    doc.setTextColor(...labelColor);
    doc.text(labelShown, x, y);

    const labelW = doc.getTextWidth(labelShown);
    const dotsStart = x + labelW + 2;

    if (dotEnd > dotsStart) {
      doc.setDrawColor(...PALETTE.stroke);
      doc.setLineWidth(0.2);
      doc.line(dotsStart, y - 1.2, dotEnd, y - 1.2);
    }

    // Monto derecho
    doc.setTextColor(...amountColor);
    doc.text(price, right - wPrice, y);

    return y + 6;
  }

  // =========================
  // 4) Encabezado
  // =========================
  const renderEncabezado = () => {
    doc.addImage(logo, "PNG", 160, y - 5, 35, 35);

    doc.setFontSize(16);
    doc.setTextColor(33, 37, 41);
    doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE VENTAS Y COBROS", 10, y);
    y += 10;

    doc.setFontSize(13);
    doc.text(`Usuario: ${nombreUsuario}`, 10, y);
    y += 8;

    const fechaActual = new Date().toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const horaActual = new Date().toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`Generado el: ${fechaActual}, ${horaActual}`, 10, y);
    y += 6;

    let textoRango = "";
    if (tipo === "dia") textoRango = `Fecha: ${formatearFechaLocal(fecha)}`;
    else if (tipo === "mes") {
      const [anio, mes] = fecha.split("-");
      const meses = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
      ];
      textoRango = `Mes: ${meses[parseInt(mes, 10) - 1]} de ${anio}`;
    } else if (tipo === "anio") textoRango = `Año: ${fecha}`;
    else if (tipo === "rango") {
      textoRango = `Desde: ${formatearFecha(inicio)}  hasta: ${formatearFecha(fin)}`;
    }

    doc.setTextColor(80, 80, 80);
    doc.text(textoRango, 10, y);
    y += 10;
  };

  // =========================
  // 5) Desglose SUSCRIPCIONES
  // =========================
  const renderPagos = (titulo, pagos, metodo) => {
    if (!pagos || pagos.length === 0) return;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text(titulo, 10, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);

    pagos.forEach((p) => {
      const fechaFormat = formatearFechaLarga(p.fecha);
      const cliente = p.nombre || "Cliente eliminado";

      const descuento = parseFloat(p.descuento || 0);
      const montoOriginal = parseFloat(p.monto || 0);
      const montoFinal = montoOriginal - descuento;

      const texto = `• ${cliente} el ${fechaFormat}${
        descuento > 0 ? ` (-$${descuento.toFixed(2)} descuento)` : ""
      }`;
      const montoTexto = `$${montoFinal.toFixed(2)}`;

      const maxTextWidth = 190 - 12 - doc.getTextWidth(montoTexto) - 4;
      const textoDividido = doc.splitTextToSize(texto, maxTextWidth);

      doc.text(textoDividido, 12, y);
      doc.text(montoTexto, 190 - doc.getTextWidth(montoTexto), y);

      y += textoDividido.length * 5.5;

      totalSuscripciones += montoFinal;
      totalSuscripcionesPorMetodo[metodo] += montoFinal;

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(10, y, 200, y);
      y += 6;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    y += 4;
  };
  // =========================
  // 5.1) Desglose PAGOS FINANCIADOS
  // =========================
  const renderPagosFinanciados = (titulo, pagosFinanciados, metodo) => {
    if (!pagosFinanciados || pagosFinanciados.length === 0) return;

    y = ensureSpace(doc, y, 25);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(8, 145, 178);
    doc.text(titulo, 10, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);

    pagosFinanciados.forEach((p) => {
      y = ensureSpace(doc, y, 18);

      const fechaFormat = formatearFechaLarga(p.fecha || p.fecha_pago);
      const monto = parseFloat(p.monto || 0);
      const usuario = p.usuario || "Usuario eliminado";
      const ventaId = p.venta_financiada_id || "N/A";
      const cuotaId = p.cuota_id || "N/A";
      const referencia = p.referencia ? ` · Ref: ${p.referencia}` : "";

      const texto = `• Venta financiada #${ventaId} · Cuota #${cuotaId} · Recibió ${usuario} el ${fechaFormat}${referencia}`;
      const montoTexto = `$${monto.toFixed(2)}`;

      const maxTextWidth = 190 - 12 - doc.getTextWidth(montoTexto) - 4;
      const textoDividido = doc.splitTextToSize(texto, maxTextWidth);

      doc.text(textoDividido, 12, y);
      doc.text(montoTexto, 190 - doc.getTextWidth(montoTexto), y);

      y += textoDividido.length * 5.5;

      totalFinanciadosPDF += monto;

      if (!totalFinanciadosPorMetodo[metodo]) {
        totalFinanciadosPorMetodo[metodo] = 0;
      }

      totalFinanciadosPorMetodo[metodo] += monto;

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(10, y, 200, y);
      y += 6;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    y += 4;
  };
  const renderMetodoTarifaPDF = ({
    posicionY,
    titulo,
    cantidad,
    total,
    color,
  }) => {
    const xInicial = 17;
    const limiteDerecho = 193;

    const cantidadNumero = parseInt(cantidad || 0, 10);
    const totalNumero = Number(total || 0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...color);
    doc.text(titulo, xInicial, posicionY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);

    const cantidadTexto = `${cantidadNumero} pago${
      cantidadNumero === 1 ? "" : "s"
    }`;

    doc.text(cantidadTexto, 70, posicionY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...color);

    const totalTexto = fmtMoney(totalNumero);

    doc.text(
      totalTexto,
      limiteDerecho - doc.getTextWidth(totalTexto),
      posicionY,
    );

    return posicionY + 8;
  };

  // =========================
  // 5.2) DESGLOSE POR TARIFA
  // =========================
  const renderResumenTarifasPDF = () => {
    const tarifas = Array.isArray(data.resumen_tarifas)
      ? data.resumen_tarifas
      : [];

    if (tarifas.length === 0) {
      return;
    }

    const numeroEntero = (valor) => parseInt(valor || 0, 10);
    const numeroDecimal = (valor) => Number(valor || 0);

    const totalPagosTarifas = tarifas.reduce(
      (acumulado, tarifa) => acumulado + numeroEntero(tarifa.cantidad_pagos),
      0,
    );

    const totalCobradoTarifas = tarifas.reduce(
      (acumulado, tarifa) => acumulado + numeroDecimal(tarifa.total),
      0,
    );

    /*
  |--------------------------------------------------------------------------
  | Encabezado
  |--------------------------------------------------------------------------
  */

    y = ensureSpace(doc, y, 35);

    doc.setFillColor(30, 64, 175);
    doc.roundedRect(10, y, 190, 25, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("PAGOS POR TARIFA", 16, y + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(219, 234, 254);
    doc.text("Cantidades y totales por método de pago", 16, y + 16);

    const pagosTexto = `Pagos: ${totalPagosTarifas}`;
    const totalTexto = `Total: ${fmtMoney(totalCobradoTarifas)}`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);

    doc.text(pagosTexto, 194 - doc.getTextWidth(pagosTexto), y + 9);

    doc.setTextColor(167, 243, 208);

    doc.text(totalTexto, 194 - doc.getTextWidth(totalTexto), y + 17);

    y += 32;

    /*
  |--------------------------------------------------------------------------
  | Tarifa individual
  |--------------------------------------------------------------------------
  */

    tarifas.forEach((tarifa) => {
      const nombreTarifa = String(tarifa.nombre || "Tarifa eliminada");

      const cantidadPagos = numeroEntero(tarifa.cantidad_pagos);

      const totalTarifa = numeroDecimal(tarifa.total);

      const cantidadEfectivo = numeroEntero(
        tarifa.efectivo?.cantidad ?? tarifa.cantidad_efectivo,
      );

      const totalEfectivo = numeroDecimal(
        tarifa.efectivo?.total ?? tarifa.total_efectivo,
      );

      const cantidadTarjeta = numeroEntero(
        tarifa.tarjeta?.cantidad ?? tarifa.cantidad_tarjeta,
      );

      const totalTarjeta = numeroDecimal(
        tarifa.tarjeta?.total ?? tarifa.total_tarjeta,
      );

      const cantidadTransferencia = numeroEntero(
        tarifa.transferencia?.cantidad ?? tarifa.cantidad_transferencia,
      );

      const totalTransferencia = numeroDecimal(
        tarifa.transferencia?.total ?? tarifa.total_transferencia,
      );

      const cantidadOtro = numeroEntero(
        tarifa.otro?.cantidad ?? tarifa.cantidad_otro,
      );

      const totalOtro = numeroDecimal(tarifa.otro?.total ?? tarifa.total_otro);

      const mostrarOtro = cantidadOtro > 0 || totalOtro > 0;

      const altoCaja = mostrarOtro ? 69 : 61;

      y = ensureSpace(doc, y, altoCaja + 10);

      /*
    |--------------------------------------------------------------------------
    | Fondo de la tarifa
    |--------------------------------------------------------------------------
    */

      doc.setDrawColor(71, 85, 105);
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(10, y, 190, altoCaja, 3, 3, "FD");

      /*
    |--------------------------------------------------------------------------
    | Nombre y precio registrado
    |--------------------------------------------------------------------------
    */

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(248, 250, 252);

      const nombreDividido = doc.splitTextToSize(nombreTarifa, 100);

      doc.text(nombreDividido, 16, y + 10);

      if (tarifa.monto_tarifa != null) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);

        doc.text(
          `Precio registrado: ${fmtMoney(tarifa.monto_tarifa)}`,
          16,
          y + 18,
        );
      }

      /*
    |--------------------------------------------------------------------------
    | Caja de cantidad de pagos
    |--------------------------------------------------------------------------
    */

      doc.setFillColor(49, 46, 129);
      doc.roundedRect(130, y + 5, 27, 18, 2, 2, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(199, 210, 254);
      doc.text("PAGOS", 143.5, y + 11, {
        align: "center",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(String(cantidadPagos), 143.5, y + 19, {
        align: "center",
      });

      /*
    |--------------------------------------------------------------------------
    | Caja de total
    |--------------------------------------------------------------------------
    */

      doc.setFillColor(6, 78, 59);
      doc.roundedRect(160, y + 5, 34, 18, 2, 2, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(167, 243, 208);
      doc.text("TOTAL", 177, y + 11, {
        align: "center",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(110, 231, 183);
      doc.text(fmtMoney(totalTarifa), 177, y + 19, {
        align: "center",
      });

      /*
    |--------------------------------------------------------------------------
    | Separador
    |--------------------------------------------------------------------------
    */

      doc.setDrawColor(71, 85, 105);
      doc.setLineWidth(0.25);
      doc.line(16, y + 28, 194, y + 28);

      /*
    |--------------------------------------------------------------------------
    | Métodos de pago
    |--------------------------------------------------------------------------
    */

      let posicionMetodo = y + 38;

      posicionMetodo = renderMetodoTarifaPDF({
        posicionY: posicionMetodo,
        titulo: "Efectivo",
        cantidad: cantidadEfectivo,
        total: totalEfectivo,
        color: [52, 211, 153],
      });

      posicionMetodo = renderMetodoTarifaPDF({
        posicionY: posicionMetodo,
        titulo: "Tarjeta",
        cantidad: cantidadTarjeta,
        total: totalTarjeta,
        color: [96, 165, 250],
      });

      posicionMetodo = renderMetodoTarifaPDF({
        posicionY: posicionMetodo,
        titulo: "Transferencia",
        cantidad: cantidadTransferencia,
        total: totalTransferencia,
        color: [167, 139, 250],
      });

      if (mostrarOtro) {
        renderMetodoTarifaPDF({
          posicionY: posicionMetodo,
          titulo: "Otro",
          cantidad: cantidadOtro,
          total: totalOtro,
          color: [251, 191, 36],
        });
      }

      y += altoCaja + 8;
    });

    y += 3;
  };
  // =========================
  // 6) Desglose PRODUCTOS
  // =========================
  const renderVentas = (titulo, ventas) => {
    if (!ventas || ventas.length === 0) return;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 102, 204);
    doc.text(titulo, 10, y);
    y += 8;

    ventas.forEach((v) => {
      const fechaFormat = formatearFechaLarga(v.fecha);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);

      doc.text(
        `• Venta #${v.venta_id} por ${v.usuario} el ${fechaFormat}`,
        12,
        y,
      );
      y += 6;

      let totalVenta = 0;

      (v.productos || []).forEach((p) => {
        const subtotal = parseFloat(p.total || 0);
        totalVenta += subtotal;
        totalVentas += subtotal;

        const textoProducto = `   - ${p.nombre} x${p.cantidad}`;
        const textoMonto = `$${subtotal.toFixed(2)}`;
        doc.text(textoProducto, 15, y);
        doc.text(textoMonto, 190 - doc.getTextWidth(textoMonto), y);
        y += 5;

        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });

      doc.setFont("helvetica", "italic");
      doc.setTextColor(0, 178, 92);
      const textoTotal = `Total de esta venta: $${totalVenta.toFixed(2)}`;
      doc.text(textoTotal, 190 - doc.getTextWidth(textoTotal), y);
      y += 8;

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(10, y, 200, y);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
  };

  // =========================
  // 7) Resumen de Totales
  // =========================
  const renderTotales = () => {
    const totalVentasPorMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0 };

    (data.ventas || []).forEach((v) => {
      const m = (v.metodo_pago || "").toLowerCase();
      if (totalVentasPorMetodo[m] == null) totalVentasPorMetodo[m] = 0;
      (v.productos || []).forEach((p) => {
        totalVentasPorMetodo[m] += parseFloat(p.total || 0);
      });
    });

    const ventaEfectivo = totalVentasPorMetodo.efectivo || 0;
    const ventaTarjeta = totalVentasPorMetodo.tarjeta || 0;
    const ventaTransferencia = totalVentasPorMetodo.transferencia || 0;

    const totalVentasCalc = ventaEfectivo + ventaTarjeta + ventaTransferencia;

    y = ensureSpace(doc, y, 64);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...PALETTE.title);
    doc.text("Resumen de Totales", 10, y);
    y += 6;

    const gap = 6;
    const cardW = (200 - 10 - gap) / 2;
    const leftX = 10;
    const rightX = leftX + cardW + gap;
    const cardH = 56;

    y = ensureSpace(doc, y, cardH + 12);
    doc.setDrawColor(...PALETTE.stroke);
    doc.setFillColor(...PALETTE.box);
    doc.roundedRect(leftX, y, cardW, cardH, 3, 3, "FD");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.sub2);
    doc.text("MENSUALIDADES", leftX + 6, y + 8);

    let yC = y + 16;
    const leftRight = leftX + cardW - 6;

    yC = lineAmount(
      doc,
      leftX + 6,
      yC,
      "Efectivo",
      totalSuscripcionesPorMetodo.efectivo || 0,
      leftRight,
    );
    yC = lineAmount(
      doc,
      leftX + 6,
      yC,
      "Tarjeta",
      totalSuscripcionesPorMetodo.tarjeta || 0,
      leftRight,
    );
    yC = lineAmount(
      doc,
      leftX + 6,
      yC,
      "Transferencia",
      totalSuscripcionesPorMetodo.transferencia || 0,
      leftRight,
    );

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.ok);
    doc.setFontSize(11);
    doc.text(
      `TOTAL: ${fmtMoney(totalSuscripciones)}`,
      leftX + 6,
      y + cardH - 6,
    );

    doc.setDrawColor(...PALETTE.stroke);
    doc.setFillColor(...PALETTE.box);
    doc.roundedRect(rightX, y, cardW, cardH, 3, 3, "FD");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.sub);
    doc.text("VENTAS DE PRODUCTOS", rightX + 6, y + 8);

    let yR = y + 16;
    const rightRight = rightX + cardW - 6;

    yR = lineAmount(doc, rightX + 6, yR, "Efectivo", ventaEfectivo, rightRight);
    yR = lineAmount(doc, rightX + 6, yR, "Tarjeta", ventaTarjeta, rightRight);
    yR = lineAmount(
      doc,
      rightX + 6,
      yR,
      "Transferencia",
      ventaTransferencia,
      rightRight,
    );

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.ok);
    doc.setFontSize(11);
    doc.text(`TOTAL: ${fmtMoney(totalVentasCalc)}`, rightX + 6, y + cardH - 6);

    y += cardH + 10;

    const finEfectivo = totalFinanciadosPorMetodo.efectivo || 0;
    const finTarjeta = totalFinanciadosPorMetodo.tarjeta || 0;
    const finTransferencia = totalFinanciadosPorMetodo.transferencia || 0;
    const finOtro = totalFinanciadosPorMetodo.otro || 0;
    const finTotal = finEfectivo + finTarjeta + finTransferencia + finOtro;

    const boxXf = 10;
    const boxWf = 190;
    const boxHf = 40;

    if (finTotal > 0) {
      y = ensureSpace(doc, y, boxHf + 10);

      doc.setDrawColor(...PALETTE.stroke);
      doc.setFillColor(236, 254, 255);
      doc.roundedRect(boxXf, y, boxWf, boxHf, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(8, 145, 178);
      doc.text("PAGOS FINANCIADOS", boxXf + 6, y + 9);

      let yF = y + 18;
      const rbF = boxXf + boxWf - 8;

      yF = lineAmount(doc, boxXf + 8, yF, "Efectivo", finEfectivo, rbF);
      yF = lineAmount(doc, boxXf + 8, yF, "Tarjeta", finTarjeta, rbF);
      yF = lineAmount(
        doc,
        boxXf + 8,
        yF,
        "Transferencia",
        finTransferencia,
        rbF,
      );

      if (finOtro > 0) {
        yF = lineAmount(doc, boxXf + 8, yF, "Otro", finOtro, rbF);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...PALETTE.ok);

      const finTotalTxt = `TOTAL: ${fmtMoney(finTotal)}`;
      doc.text(
        finTotalTxt,
        boxXf + boxWf - 8 - doc.getTextWidth(finTotalTxt),
        y + 9,
      );

      y += boxHf + 10;
    }

    /*
|--------------------------------------------------------------------------
| Visitas — código 1
|--------------------------------------------------------------------------
*/

    const visitasTotal = Number(data.visitas_total || 0);

    const visitasCantidad = Number(data.visitas_cantidad || 0);

    const visitasMetodo = data.visitas_por_metodo || {};

    const vEfe = Number(visitasMetodo.efectivo || 0);

    const vTar = Number(visitasMetodo.tarjeta || 0);

    const vTra = Number(visitasMetodo.transferencia || 0);

    const boxXv = 10;
    const boxWv = 190;
    const boxHv = 34;

    y = ensureSpace(doc, y, boxHv + 10);

    doc.setDrawColor(...PALETTE.stroke);
    doc.setFillColor(250, 245, 255);

    doc.roundedRect(boxXv, y, boxWv, boxHv, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(124, 58, 237);

    doc.text("VISITAS (código 1)", boxXv + 6, y + 9);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...PALETTE.title);

    doc.text(String(visitasCantidad), boxXv + 6, y + 22);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...PALETTE.ok);

    const totalVisitasTxt = fmtMoney(visitasTotal);

    doc.text(
      totalVisitasTxt,
      boxXv + boxWv - 6 - doc.getTextWidth(totalVisitasTxt),
      y + 22,
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...PALETTE.mute);

    const metodosVisitasTxt =
      `Efe: ${fmtMoney(vEfe)}  ·  ` +
      `Tar: ${fmtMoney(vTar)}  ·  ` +
      `Trans: ${fmtMoney(vTra)}`;

    doc.text(metodosVisitasTxt, boxXv + 6, y + 31);

    y += boxHv + 10;

    /*
|--------------------------------------------------------------------------
| Clase funcional de adultos — código 2
|--------------------------------------------------------------------------
*/

    const claseFuncionalCantidad = Number(data.clase_funcional_cantidad || 0);

    const claseFuncionalTotalPDF = Number(data.clase_funcional_total || 0);

    const claseFuncionalMetodo = data.clase_funcional_por_metodo || {};

    const cfEfectivo = Number(claseFuncionalMetodo.efectivo || 0);

    const cfTarjeta = Number(claseFuncionalMetodo.tarjeta || 0);

    const cfTransferencia = Number(claseFuncionalMetodo.transferencia || 0);

    /*
     * El bloque solo aparece cuando existen
     * entradas de clase funcional.
     */
    if (claseFuncionalCantidad > 0) {
      const boxXcf = 10;
      const boxWcf = 190;
      const boxHcf = 34;

      y = ensureSpace(doc, y, boxHcf + 10);

      doc.setDrawColor(...PALETTE.stroke);
      doc.setFillColor(255, 247, 237);

      doc.roundedRect(boxXcf, y, boxWcf, boxHcf, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(234, 88, 12);

      doc.text("CLASE FUNCIONAL DE ADULTOS (código 2)", boxXcf + 6, y + 9);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...PALETTE.title);

      doc.text(String(claseFuncionalCantidad), boxXcf + 6, y + 22);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...PALETTE.ok);

      const totalClaseFuncionalTxt = fmtMoney(claseFuncionalTotalPDF);

      doc.text(
        totalClaseFuncionalTxt,
        boxXcf + boxWcf - 6 - doc.getTextWidth(totalClaseFuncionalTxt),
        y + 22,
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...PALETTE.mute);

      const metodosClaseFuncionalTxt =
        `Efe: ${fmtMoney(cfEfectivo)}  ·  ` +
        `Tar: ${fmtMoney(cfTarjeta)}  ·  ` +
        `Trans: ${fmtMoney(cfTransferencia)}`;

      doc.text(metodosClaseFuncionalTxt, boxXcf + 6, y + 31);

      y += boxHcf + 10;
    }

    if (tipo === "dia" && String(usuarioId) !== "todos") {
      const suscripcionesEfectivo = totalSuscripcionesPorMetodo.efectivo || 0;

      const productosEfectivo = ventaEfectivo || 0;

      const financiadosEfectivo = totalFinanciadosPorMetodo.efectivo || 0;

      const visitasEfectivo = Number(data.visitas_por_metodo?.efectivo || 0);

      const claseFuncionalEfectivo = Number(
        data.clase_funcional_por_metodo?.efectivo || 0,
      );

      const efectivoEsperado =
        suscripcionesEfectivo +
        productosEfectivo +
        financiadosEfectivo +
        visitasEfectivo +
        claseFuncionalEfectivo;

      const netoMovs = parseFloat(data.caja_neto || 0);
      const dejado = Number(document.getElementById("monto_caja")?.value || 0);
      const totalEntregar = efectivoEsperado + netoMovs + dejado;

      const boxX = 10,
        boxW = 190,
        boxH = 78;

      y = ensureSpace(doc, y, boxH + 10);

      doc.setDrawColor(...PALETTE.stroke);
      doc.setFillColor(245, 249, 255);
      doc.roundedRect(boxX, y, boxW, boxH, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...PALETTE.title);
      doc.text("Caja del día (solo efectivo)", boxX + 6, y + 10);

      let yK = y + 20;
      const rb = boxX + boxW - 8;

      yK = lineAmount(
        doc,
        boxX + 8,
        yK,
        "Suscripciones efectivo",
        suscripcionesEfectivo,
        rb,
      );

      yK = lineAmount(
        doc,
        boxX + 8,
        yK,
        "Ventas de productos efectivo",
        productosEfectivo,
        rb,
      );

      yK = lineAmount(
        doc,
        boxX + 8,
        yK,
        "Pagos financiados efectivo",
        financiadosEfectivo,
        rb,
      );

      yK = lineAmount(
        doc,
        boxX + 8,
        yK,
        "Visitas efectivo",
        visitasEfectivo,
        rb,
      );
      yK = lineAmount(
        doc,
        boxX + 8,
        yK,
        "Clase funcional efectivo",
        claseFuncionalEfectivo,
        rb,
      );
      yK = lineAmount(
        doc,
        boxX + 8,
        yK,
        "Subtotal efectivo",
        efectivoEsperado,
        rb,
        PALETTE.ok, // texto verde
        [37, 204, 0],
      );

      yK = lineAmount(
        doc,
        boxX + 8,
        yK,
        "Movimientos (ingresos - egresos)",
        netoMovs,
        rb,
      );

      yK = lineAmount(doc, boxX + 8, yK, "Caja", dejado, rb);

      doc.setDrawColor(...PALETTE.stroke);
      doc.setLineWidth(0.3);
      doc.line(boxX + 8, yK + 2, boxX + boxW - 8, yK + 2);
      yK += 8;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PALETTE.ok);

      const label = "TOTAL A ENTREGAR";
      const amount = fmtMoney(totalEntregar);

      doc.text(label, boxX + 8, yK);
      doc.text(amount, boxX + boxW - 8 - doc.getTextWidth(amount), yK);

      y += boxH + 10;
    }

    y = ensureSpace(doc, y, 18);
    doc.setFillColor(...PALETTE.bandBg);
    doc.rect(10, y, 190, 14, "F");

    doc.setTextColor(...PALETTE.bandTx);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    let totalGeneral =
      totalVentasCalc +
      totalSuscripciones +
      totalFinanciadosPDF +
      Number(data.visitas_total || 0) +
      Number(data.clase_funcional_total || 0);

    if (tipo === "dia" && String(usuarioId) !== "todos") {
      const netoMovs = parseFloat(data.caja_neto || 0);
      const dejado = Number(document.getElementById("monto_caja")?.value || 0);
      totalGeneral += (netoMovs || 0) + (dejado || 0);
    }

    doc.text("TOTAL GENERAL", 14, y + 10);

    const amount = fmtMoney(totalGeneral);
    doc.text(amount, 10 + 190 - 6 - doc.getTextWidth(amount), y + 10);

    y += 22;

    const nota =
      "Nota: Los usuarios o productos eliminados aparecen como 'eliminado' porque ya no existen en la base de datos.";
    const lines = doc.splitTextToSize(nota, 188);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...PALETTE.mute);

    y = ensureSpace(doc, y, lines.length * 5 + 4);
    doc.text(lines, 10, y);
    y += lines.length * 5 + 2;
  };

  // =========================
  // 8) Detalle movimientos caja
  // =========================
  const renderMovimientosCajaPDF = () => {
    const movs = data.movimientos_caja || [];

    if (!movs.length) return;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    movs.forEach((m) => {
      const tipoMov = String(m.tipo || "").toUpperCase();
      const monto = Number(m.monto || 0);

      const fechaTxt = m.fecha
        ? formatearFechaLocal(m.fecha)
        : m.fecha_full
          ? formatearFechaLocal(m.fecha_full)
          : "";

      const horaTxt = m.hora
        ? m.hora
        : m.fecha_full
          ? new Date(m.fecha_full).toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

      const concepto = (m.concepto || "").trim();
      const usuario = (m.usuario || "").trim();

      const linea = `• ${horaTxt} ${fechaTxt} · ${tipoMov} · ${concepto}${
        usuario ? ` · ${usuario}` : ""
      }`;
      const montoTxt = fmtMoney(monto);

      if (tipoMov === "EGRESO") doc.setTextColor(220, 38, 38);
      else doc.setTextColor(16, 185, 129);

      const maxTextWidth = 190 - 12 - doc.getTextWidth(montoTxt) - 4;
      const textoDividido = doc.splitTextToSize(linea, maxTextWidth);

      doc.text(textoDividido, 12, y);
      doc.text(montoTxt, 190 - doc.getTextWidth(montoTxt), y);

      y += textoDividido.length * 5.5;

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(10, y, 200, y);
      y += 5;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.setTextColor(0);
    y += 4;
  };

  // =========================
  // 9) Ejecución final
  // =========================
  renderEncabezado();

  const pagos = {
    efectivo: (data.pagos || []).filter(
      (p) => (p.metodo || "").toLowerCase() === "efectivo",
    ),
    tarjeta: (data.pagos || []).filter(
      (p) => (p.metodo || "").toLowerCase() === "tarjeta",
    ),
    transferencia: (data.pagos || []).filter(
      (p) => (p.metodo || "").toLowerCase() === "transferencia",
    ),
  };
  const hayPagosSuscripciones =
    pagos.efectivo.length > 0 ||
    pagos.tarjeta.length > 0 ||
    pagos.transferencia.length > 0;

  if (hayPagosSuscripciones) {
    renderTituloSeccion({
      titulo: "Pagos de suscripciones",
      subtitulo: "Detalle de mensualidades cobradas por método de pago",
      colorFondo: [30, 64, 175],
      colorSubtitulo: [219, 234, 254],
    });
  }
  renderPagos("Pagos por Efectivo:", pagos.efectivo, "efectivo");
  renderPagos("Pagos por Tarjeta:", pagos.tarjeta, "tarjeta");
  renderPagos("Pagos por Transferencia:", pagos.transferencia, "transferencia");
  renderResumenTarifasPDF();
  const pagosFinanciados = {
    efectivo: (data.pagos_financiados || []).filter(
      (p) => (p.metodo_pago || p.metodo || "").toLowerCase() === "efectivo",
    ),
    tarjeta: (data.pagos_financiados || []).filter(
      (p) => (p.metodo_pago || p.metodo || "").toLowerCase() === "tarjeta",
    ),
    transferencia: (data.pagos_financiados || []).filter(
      (p) =>
        (p.metodo_pago || p.metodo || "").toLowerCase() === "transferencia",
    ),
    otro: (data.pagos_financiados || []).filter(
      (p) => (p.metodo_pago || p.metodo || "").toLowerCase() === "otro",
    ),
  };
  const hayPagosFinanciados =
    pagosFinanciados.efectivo.length > 0 ||
    pagosFinanciados.tarjeta.length > 0 ||
    pagosFinanciados.transferencia.length > 0 ||
    pagosFinanciados.otro.length > 0;

  if (hayPagosFinanciados) {
    renderTituloSeccion({
      titulo: "Pagos financiados",
      subtitulo: "Abonos registrados de ventas financiadas",
      colorFondo: [8, 145, 178],
      colorSubtitulo: [207, 250, 254],
    });
  }
  renderPagosFinanciados(
    "Pagos Financiados - Efectivo:",
    pagosFinanciados.efectivo,
    "efectivo",
  );

  renderPagosFinanciados(
    "Pagos Financiados - Tarjeta:",
    pagosFinanciados.tarjeta,
    "tarjeta",
  );

  renderPagosFinanciados(
    "Pagos Financiados - Transferencia:",
    pagosFinanciados.transferencia,
    "transferencia",
  );

  renderPagosFinanciados(
    "Pagos Financiados - Otro:",
    pagosFinanciados.otro,
    "otro",
  );
  const ventas = {
    efectivo: (data.ventas || []).filter(
      (v) => (v.metodo_pago || "").toLowerCase() === "efectivo",
    ),
    tarjeta: (data.ventas || []).filter(
      (v) => (v.metodo_pago || "").toLowerCase() === "tarjeta",
    ),
    transferencia: (data.ventas || []).filter(
      (v) => (v.metodo_pago || "").toLowerCase() === "transferencia",
    ),
  };
  const hayVentasProductos =
    ventas.efectivo.length > 0 ||
    ventas.tarjeta.length > 0 ||
    ventas.transferencia.length > 0;

  if (hayVentasProductos) {
    renderTituloSeccion({
      titulo: "Ventas de productos",
      subtitulo: "Detalle de productos vendidos por método de pago",
      colorFondo: [5, 150, 105],
      colorSubtitulo: [209, 250, 229],
    });
  }
  renderVentas("Ventas de Productos - Efectivo:", ventas.efectivo);
  renderVentas("Ventas de Productos - Tarjeta:", ventas.tarjeta);
  renderVentas("Ventas de Productos - Transferencia:", ventas.transferencia);

  if (
    tipo === "dia" &&
    String(usuarioId) !== "todos" &&
    Array.isArray(data.movimientos_caja) &&
    data.movimientos_caja.length > 0
  ) {
    renderTituloSeccion({
      titulo: "Movimientos de caja",
      subtitulo: "Ingresos y egresos registrados durante el día",
      colorFondo: [180, 83, 9],
      colorSubtitulo: [254, 243, 199],
    });

    renderMovimientosCajaPDF();
  }

  renderTotales();

  return doc;
}
function centrarTextoTicket(doc, texto, y, ancho = 58) {
  doc.text(String(texto), ancho / 2, y, {
    align: "center",
  });
}

function lineaTicket(doc, y, caracter = "-") {
  doc.setDrawColor(20);

  if (caracter === "=") {
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([], 0);
  } else {
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([0.8, 0.8], 0);
  }

  doc.line(3, y, 55, y);
  doc.setLineDashPattern([], 0);

  return y + 3.5;
}

function tituloTicket(doc, titulo, y) {
  y += 1.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);

  centrarTextoTicket(doc, String(titulo || "").toUpperCase(), y);

  return y + 5;
}

function textoTicketIzquierdaDerecha(
  doc,
  izquierda,
  derecha,
  y,
  { negrita = true, tamano = 8, margenIzquierdo = 3, margenDerecho = 55 } = {},
) {
  doc.setFont("helvetica", negrita ? "bold" : "normal");

  doc.setFontSize(tamano);

  const derechaTxt = String(derecha ?? "");
  const anchoDerecha = doc.getTextWidth(derechaTxt);

  const maxAnchoIzquierda = margenDerecho - margenIzquierdo - anchoDerecha - 2;

  let izquierdaTxt = String(izquierda ?? "");

  while (
    izquierdaTxt.length > 1 &&
    doc.getTextWidth(izquierdaTxt) > maxAnchoIzquierda
  ) {
    izquierdaTxt = izquierdaTxt.slice(0, -1);
  }

  doc.text(izquierdaTxt, margenIzquierdo, y);

  doc.text(derechaTxt, margenDerecho, y, {
    align: "right",
  });

  return y + 4.5;
}

function textoTicketMultilinea(
  doc,
  texto,
  y,
  { margen = 3, tamano = 8, negrita = true, centrado = false } = {},
) {
  doc.setFont("helvetica", negrita ? "bold" : "normal");

  doc.setFontSize(tamano);

  const lineas = doc.splitTextToSize(String(texto ?? ""), 52);

  lineas.forEach((linea) => {
    if (centrado) {
      centrarTextoTicket(doc, linea, y);
    } else {
      doc.text(linea, margen, y);
    }

    y += 4.3;
  });

  return y;
}

function dineroTicket(valor) {
  return `$${Number(valor || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function metodoNormalizadoTicket(valor) {
  const metodo = String(valor || "")
    .trim()
    .toLowerCase();

  if (
    metodo === "efectivo" ||
    metodo === "tarjeta" ||
    metodo === "transferencia"
  ) {
    return metodo;
  }

  return "otro";
}

const configuracionesTicketCorte = {
  "48 mm": {
    ancho: 48,
    margen: 3,
    anchoLogo: 36,

    fuenteNombreGym: 10,
    fuenteTitulo: 8.5,
    fuenteFecha: 7,
    fuenteSeccion: 8,
    fuenteTexto: 7,
    fuenteDetalle: 6.5,
    fuenteTotales: 8,
    fuenteFinal: 7,
    fuenteMarca: 6.5,

    espacioLinea: 3.5,

    /*
     * Espacio adicional antes y
     * después de cada título.
     */
    espacioAntesTitulo: 3,
    espacioDespuesTitulo: 3,
  },

  "58 mm": {
    ancho: 58,
    margen: 4,
    anchoLogo: 42,

    fuenteNombreGym: 11,
    fuenteTitulo: 9,
    fuenteFecha: 8,
    fuenteSeccion: 9,
    fuenteTexto: 8,
    fuenteDetalle: 7,
    fuenteTotales: 8.5,
    fuenteFinal: 7.5,
    fuenteMarca: 6.5,

    espacioLinea: 4,

    espacioAntesTitulo: 4,
    espacioDespuesTitulo: 4,
  },
};
async function construirTicketCorte58mm() {
  const { jsPDF } = window.jspdf;

  const usuarioId = document.getElementById("usuario").value;
  const tipo = document.getElementById("tipoPeriodo").value;

  let fecha = "";
  let inicio = "";
  let fin = "";

  if (tipo === "dia") {
    fecha = document.getElementById("fecha_dia").value;
  } else if (tipo === "mes") {
    fecha = document.getElementById("fecha_mes").value;
  } else if (tipo === "anio") {
    fecha = document.getElementById("fecha_anio").value;
  } else if (tipo === "rango") {
    inicio = document.getElementById("rango_inicio").value;
    fin = document.getElementById("rango_fin").value;
  }

  const params = new URLSearchParams({
    usuario: usuarioId,
    tipo,
    fecha,
    inicio,
    fin,
  });

  const response = await fetch(
    `../php/obtener_reportes_detalle.php?${params.toString()}`,
    { cache: "no-store" },
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "No se pudo obtener el detalle del corte.");
  }

  const branding = await obtenerBrandingTicket();
  const nombreGym = branding.app_name || "Gym Admin";

  const tipoImpresora = branding.impresora_tipo === "58 mm" ? "58 mm" : "48 mm";

  const medidas =
    configuracionesTicketCorte[tipoImpresora] ||
    configuracionesTicketCorte["48 mm"];

  const anchoContenido = medidas.ancho - medidas.margen * 2;

  const centroTicket = medidas.ancho / 2;

  const logoBranding = await cargarImagenBase64(branding.logo);

  const usuarioSelect = document.getElementById("usuario");

  const nombreUsuario =
    usuarioSelect.options[usuarioSelect.selectedIndex]?.text || "Usuario";

  const pagos = Array.isArray(data.pagos) ? data.pagos : [];

  const tarifas = Array.isArray(data.resumen_tarifas)
    ? data.resumen_tarifas
    : [];

  const pagosFinanciados = Array.isArray(data.pagos_financiados)
    ? data.pagos_financiados
    : [];

  const ventas = Array.isArray(data.ventas) ? data.ventas : [];

  const movimientosCaja = Array.isArray(data.movimientos_caja)
    ? data.movimientos_caja
    : [];

  /*
   * ==============================
   * TOTALES GENERALES
   * ==============================
   */

  const totalSuscripciones = pagos.reduce(
    (suma, pago) =>
      suma + Number(pago.monto || 0) - Number(pago.descuento || 0),
    0,
  );

  const totalProductos = ventas.reduce(
    (suma, venta) =>
      suma +
      (venta.productos || []).reduce(
        (subtotal, producto) => subtotal + Number(producto.total || 0),
        0,
      ),
    0,
  );

  const totalFinanciados = Number(data.total_financiados || 0);

  const totalVisitas = Number(data.visitas_total || 0);

  const totalClaseFuncional = Number(data.clase_funcional_total || 0);

  const totalVentas =
    totalSuscripciones +
    totalProductos +
    totalFinanciados +
    totalVisitas +
    totalClaseFuncional;

  const cantidadOperaciones =
    pagos.length +
    ventas.length +
    pagosFinanciados.length +
    Number(data.visitas_cantidad || 0) +
    Number(data.clase_funcional_cantidad || 0);

  /*
   * ==============================
   * EFECTIVO DE VENTAS
   * ==============================
   */

  const suscripcionesEfectivo = pagos
    .filter((pago) => metodoNormalizadoTicket(pago.metodo) === "efectivo")
    .reduce(
      (suma, pago) =>
        suma + Number(pago.monto || 0) - Number(pago.descuento || 0),
      0,
    );

  const productosEfectivo = ventas
    .filter(
      (venta) => metodoNormalizadoTicket(venta.metodo_pago) === "efectivo",
    )
    .reduce(
      (suma, venta) =>
        suma +
        (venta.productos || []).reduce(
          (subtotal, producto) => subtotal + Number(producto.total || 0),
          0,
        ),
      0,
    );

  const financiadosEfectivo = pagosFinanciados
    .filter(
      (pago) =>
        metodoNormalizadoTicket(pago.metodo_pago || pago.metodo) === "efectivo",
    )
    .reduce((suma, pago) => suma + Number(pago.monto || 0), 0);

  const visitasEfectivo = Number(data.visitas_por_metodo?.efectivo || 0);

  const claseFuncionalEfectivo = Number(
    data.clase_funcional_por_metodo?.efectivo || 0,
  );

  const ventasEfectivo =
    suscripcionesEfectivo +
    productosEfectivo +
    financiadosEfectivo +
    visitasEfectivo +
    claseFuncionalEfectivo;

  /*
   * ==============================
   * CAJA
   * ==============================
   */

  const cajaInicial = Number(document.getElementById("monto_caja")?.value || 0);

  const entradas = Number(data.caja_ingresos || 0);

  const salidas = Number(data.caja_egresos || 0);

  const efectivoCaja = cajaInicial + ventasEfectivo + entradas - salidas;

  const movimientosEntrada = movimientosCaja.filter(
    (movimiento) => String(movimiento.tipo).toUpperCase() === "INGRESO",
  );

  const movimientosSalida = movimientosCaja.filter(
    (movimiento) => String(movimiento.tipo).toUpperCase() === "EGRESO",
  );

  /*
   * ==============================
   * VENTAS POR MÉTODO
   * ==============================
   */

  const ventasMetodo = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    otro: 0,
  };

  pagos.forEach((pago) => {
    const metodo = metodoNormalizadoTicket(pago.metodo);

    ventasMetodo[metodo] +=
      Number(pago.monto || 0) - Number(pago.descuento || 0);
  });

  pagosFinanciados.forEach((pago) => {
    const metodo = metodoNormalizadoTicket(pago.metodo_pago || pago.metodo);

    ventasMetodo[metodo] += Number(pago.monto || 0);
  });

  ventas.forEach((venta) => {
    const metodo = metodoNormalizadoTicket(venta.metodo_pago);

    const totalVenta = (venta.productos || []).reduce(
      (suma, producto) => suma + Number(producto.total || 0),
      0,
    );

    ventasMetodo[metodo] += totalVenta;
  });

  Object.entries(data.visitas_por_metodo || {}).forEach(
    ([metodoOriginal, total]) => {
      const metodo = metodoNormalizadoTicket(metodoOriginal);

      ventasMetodo[metodo] += Number(total || 0);
    },
  );

  Object.entries(data.clase_funcional_por_metodo || {}).forEach(
    ([metodoOriginal, total]) => {
      const metodo = metodoNormalizadoTicket(metodoOriginal);

      ventasMetodo[metodo] += Number(total || 0);
    },
  );

  /*
   * ==============================
   * AGRUPAR PRODUCTOS
   * ==============================
   */

  const productosAgrupados = new Map();

  ventas.forEach((venta) => {
    (venta.productos || []).forEach((producto) => {
      const claveProducto = String(
        producto.producto_id ||
          producto.id ||
          producto.codigo ||
          producto.nombre ||
          "",
      )
        .trim()
        .toLowerCase();

      const cantidad = Number(producto.cantidad || 0);

      const total = Number(producto.total || 0);

      if (productosAgrupados.has(claveProducto)) {
        const productoExistente = productosAgrupados.get(claveProducto);

        productoExistente.cantidad += cantidad;

        productoExistente.total += total;
      } else {
        productosAgrupados.set(claveProducto, {
          nombre: producto.nombre || "PRODUCTO",

          cantidad,
          total,
        });
      }
    });
  });

  /*
   * ==============================
   * PERIODO
   * ==============================
   */

  let periodoTexto = "";

  if (tipo === "dia") {
    periodoTexto = formatearFecha(fecha);
  } else if (tipo === "mes" || tipo === "anio") {
    periodoTexto = fecha;
  } else {
    periodoTexto = `${formatearFecha(inicio)} A ` + `${formatearFecha(fin)}`;
  }

  const fechaGeneracion = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const horaGeneracion = new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  /*
   * ==============================
   * FUNCIONES AUXILIARES INTERNAS
   * ==============================
   */

  function centrarTextoCorte(doc, texto, y) {
    doc.text(String(texto ?? ""), centroTicket, y, {
      align: "center",
    });
  }

  function lineaCorte(
  doc,
  y,
  tipoLinea = "-",
) {
  doc.setDrawColor(0);

  if (tipoLinea === "=") {
    doc.setLineDashPattern([], 0);
    doc.setLineWidth(0.4);
  } else {
    doc.setLineDashPattern(
      [0.8, 0.8],
      0,
    );
    doc.setLineWidth(0.2);
  }

  doc.line(
    medidas.margen,
    y,
    medidas.ancho - medidas.margen,
    y,
  );

  // Evita que el patrón punteado
  // afecte las líneas posteriores.
  doc.setLineDashPattern([], 0);

  return y + medidas.espacioLinea;
}

  function textoMultilineaCorte(doc, texto, y, opciones = {}) {
    const {
      centrado = false,
      negrita = true,
      tamano = medidas.fuenteTexto,
    } = opciones;

    doc.setFont("helvetica", negrita ? "bold" : "normal");

    doc.setFontSize(tamano);

    const lineas = doc.splitTextToSize(String(texto ?? ""), anchoContenido);

    lineas.forEach((linea) => {
      if (centrado) {
        centrarTextoCorte(doc, linea, y);
      } else {
        doc.text(linea, medidas.margen, y);
      }

      y += medidas.espacioLinea;
    });

    return y;
  }

  function textoIzquierdaDerechaCorte(
    doc,
    textoIzquierda,
    textoDerecha,
    y,
    opciones = {},
  ) {
    const { negrita = true, tamano = medidas.fuenteTexto } = opciones;

    doc.setFont("helvetica", negrita ? "bold" : "normal");

    doc.setFontSize(tamano);

    const izquierda = String(textoIzquierda ?? "");

    const derecha = String(textoDerecha ?? "");

    const anchoDerecha = doc.getTextWidth(derecha);

    const anchoIzquierda = Math.max(12, anchoContenido - anchoDerecha - 2);

    const lineasIzquierda = doc.splitTextToSize(izquierda, anchoIzquierda);

    doc.text(derecha, medidas.ancho - medidas.margen, y, {
      align: "right",
    });

    lineasIzquierda.forEach((linea, indice) => {
      doc.text(linea, medidas.margen, y + indice * medidas.espacioLinea);
    });

    return y + Math.max(1, lineasIzquierda.length) * medidas.espacioLinea;
  }

  function tituloCorte(
  doc,
  texto,
  y,
) {
  /*
   * Las llamadas actuales ya envían y + 2.
   * Aquí agregamos aire adicional.
   */
  const yTitulo =
    y + medidas.espacioAntesTitulo;

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(
    medidas.fuenteSeccion,
  );

  centrarTextoCorte(
    doc,
    String(texto ?? "").toUpperCase(),
    yTitulo,
  );

  return (
    yTitulo +
    medidas.espacioLinea +
    medidas.espacioDespuesTitulo
  );
}

  /*
   * Esta función dibuja el ticket.
   * Primero se utiliza para medirlo
   * y después para crear el PDF final.
   */
  function dibujarTicket(doc) {
    let y = 4;

    /*
     * ==============================
     * LOGO
     * ==============================
     */

    if (logoBranding) {
      try {
        const propiedadesLogo = doc.getImageProperties(logoBranding);

        const anchoLogo = medidas.anchoLogo;

        const altoLogo =
          (propiedadesLogo.height * anchoLogo) / propiedadesLogo.width;

        const posicionX = centroTicket - anchoLogo / 2;

        doc.addImage(
          logoBranding,
          undefined,
          posicionX,
          y,
          anchoLogo,
          altoLogo,
        );

        /*
         * Espaciado de 10 mm entre
         * el logo y el nombre.
         */
        y += altoLogo + 10;
      } catch (error) {
        console.warn(
          "No se pudo agregar el logo del branding al ticket:",
          error,
        );
      }
    }

    /*
     * ==============================
     * NOMBRE DEL GIMNASIO
     * ==============================
     */

    doc.setFont("helvetica", "bold");

    doc.setFontSize(medidas.fuenteNombreGym);

    const lineasNombreGym = doc.splitTextToSize(
      String(nombreGym),
      anchoContenido,
    );

    lineasNombreGym.forEach((linea) => {
      centrarTextoCorte(doc, linea, y);

      y += medidas.espacioLinea;
    });

    y += 1;

    /*
     * ==============================
     * ENCABEZADO
     * ==============================
     */

    y = textoMultilineaCorte(doc, "CORTE DE TURNO", y, {
      centrado: true,
      negrita: true,
      tamano: medidas.fuenteTitulo,
    });

    y = lineaCorte(doc, y, "=");

    y = textoIzquierdaDerechaCorte(
      doc,
      "REALIZADO",
      `${fechaGeneracion} ${horaGeneracion}`,
      y,
      {
        negrita: true,
        tamano: medidas.fuenteFecha,
      },
    );

    y = textoMultilineaCorte(doc, `CAJERO: ${nombreUsuario}`, y, {
      negrita: true,
      tamano: medidas.fuenteTexto,
    });

    y = textoMultilineaCorte(doc, `PERIODO: ${periodoTexto}`, y, {
      negrita: true,
      tamano: medidas.fuenteTexto,
    });

    y = lineaCorte(doc, y);

    /*
     * ==============================
     * RESUMEN GENERAL
     * ==============================
     */

    y = textoIzquierdaDerechaCorte(
      doc,
      "VENTAS TOTALES",
      dineroTicket(totalVentas),
      y,
      {
        negrita: true,
        tamano: medidas.fuenteTotales,
      },
    );

    y = textoIzquierdaDerechaCorte(doc, "OPERACIONES", cantidadOperaciones, y, {
      negrita: true,
      tamano: medidas.fuenteTotales,
    });

    /*
     * ==============================
     * DINERO EN CAJA
     * ==============================
     */

    y = tituloCorte(doc, "DINERO EN CAJA", y + 2);

    y = textoIzquierdaDerechaCorte(
      doc,
      "FONDO DE CAJA",
      dineroTicket(cajaInicial),
      y,
      {
        negrita: true,
      },
    );

    y = textoIzquierdaDerechaCorte(
      doc,
      "VENTAS EFECTIVO",
      `+${dineroTicket(ventasEfectivo)}`,
      y,
      {
        negrita: true,
      },
    );

    y = textoIzquierdaDerechaCorte(
      doc,
      "ENTRADAS",
      `+${dineroTicket(entradas)}`,
      y,
      {
        negrita: true,
      },
    );

    y = textoIzquierdaDerechaCorte(
      doc,
      "SALIDAS",
      `-${dineroTicket(salidas)}`,
      y,
      {
        negrita: true,
      },
    );

    y = lineaCorte(doc, y);

    y = textoIzquierdaDerechaCorte(
      doc,
      "EFECTIVO EN CAJA",
      dineroTicket(efectivoCaja),
      y,
      {
        negrita: true,
        tamano: medidas.fuenteTotales,
      },
    );

    /*
     * ==============================
     * ENTRADAS DE EFECTIVO
     * ==============================
     */

    y = tituloCorte(doc, "ENTRADAS EFECTIVO", y + 2);

    if (!movimientosEntrada.length) {
      y = textoMultilineaCorte(doc, "NO HUBO ENTRADAS", y, {
        centrado: true,
        negrita: true,
      });
    } else {
      movimientosEntrada.forEach((movimiento) => {
        y = textoIzquierdaDerechaCorte(
          doc,
          movimiento.concepto || "Entrada",
          dineroTicket(movimiento.monto),
          y,
          {
            negrita: true,
          },
        );
      });
    }

    y = lineaCorte(doc, y);

    y = textoIzquierdaDerechaCorte(
      doc,
      "TOTAL ENTRADAS",
      dineroTicket(entradas),
      y,
      {
        negrita: true,
      },
    );

    /*
     * ==============================
     * SALIDAS DE EFECTIVO
     * ==============================
     */

    y = tituloCorte(doc, "SALIDAS EFECTIVO", y + 2);

    if (!movimientosSalida.length) {
      y = textoMultilineaCorte(doc, "NO HUBO SALIDAS", y, {
        centrado: true,
        negrita: true,
      });
    } else {
      movimientosSalida.forEach((movimiento) => {
        y = textoIzquierdaDerechaCorte(
          doc,
          movimiento.concepto || "Salida",
          dineroTicket(movimiento.monto),
          y,
          {
            negrita: true,
          },
        );
      });
    }

    y = lineaCorte(doc, y);

    y = textoIzquierdaDerechaCorte(
      doc,
      "TOTAL SALIDAS",
      dineroTicket(salidas),
      y,
      {
        negrita: true,
      },
    );

    /*
     * ==============================
     * VENTAS POR MÉTODO
     * ==============================
     */

    y = tituloCorte(doc, "VENTAS", y + 2);

    y = textoIzquierdaDerechaCorte(
      doc,
      "EN EFECTIVO",
      dineroTicket(ventasMetodo.efectivo),
      y,
      {
        negrita: true,
      },
    );

    y = textoIzquierdaDerechaCorte(
      doc,
      "CON TARJETA",
      dineroTicket(ventasMetodo.tarjeta),
      y,
      {
        negrita: true,
      },
    );

    y = textoIzquierdaDerechaCorte(
      doc,
      "TRANSFERENCIA",
      dineroTicket(ventasMetodo.transferencia),
      y,
      {
        negrita: true,
      },
    );

    if (ventasMetodo.otro > 0) {
      y = textoIzquierdaDerechaCorte(
        doc,
        "OTROS",
        dineroTicket(ventasMetodo.otro),
        y,
        {
          negrita: true,
        },
      );
    }

    y = lineaCorte(doc, y);

    y = textoIzquierdaDerechaCorte(
      doc,
      "TOTAL VENTAS",
      dineroTicket(totalVentas),
      y,
      {
        negrita: true,
        tamano: medidas.fuenteTotales,
      },
    );

        /*
     * ==============================
     * PAGOS POR TARIFA
     * ==============================
     */

    y = tituloCorte(doc, "PAGOS POR TARIFA", y + 2);

    const cantidadVisitasTicket = Number(
      data.visitas_cantidad || 0,
    );

    const cantidadClaseFuncionalTicket = Number(
      data.clase_funcional_cantidad || 0,
    );

    /*
     * Imprime una tarifa especial:
     * Visitas o Clase funcional.
     */
    function imprimirTarifaEspecial(
      nombre,
      cantidad,
      total,
      totalesPorMetodo,
    ) {
      if (cantidad <= 0) {
        return;
      }

      y = textoIzquierdaDerechaCorte(
        doc,
        `${nombre} (${cantidad})`,
        dineroTicket(total),
        y,
        {
          negrita: true,
        },
      );

      const metodos = [
        ["Efectivo", totalesPorMetodo?.efectivo],
        ["Tarjeta", totalesPorMetodo?.tarjeta],
        ["Transferencia", totalesPorMetodo?.transferencia],
        ["Otro", totalesPorMetodo?.otro],
      ].filter(([, totalMetodo]) => Number(totalMetodo || 0) > 0);

      metodos.forEach(([nombreMetodo, totalMetodo]) => {
        /*
         * Si solamente se utilizó un método,
         * todas las entradas pertenecen a ese método
         * y se puede mostrar la cantidad.
         */
        const cantidadMetodo =
          metodos.length === 1
            ? ` x${cantidad}`
            : "";

        y = textoIzquierdaDerechaCorte(
          doc,
          `  ${nombreMetodo}${cantidadMetodo}`,
          dineroTicket(totalMetodo),
          y,
          {
            negrita: true,
            tamano: medidas.fuenteDetalle,
          },
        );
      });
    }

    const hayPagosPorTarifa =
      tarifas.length > 0 ||
      cantidadVisitasTicket > 0 ||
      cantidadClaseFuncionalTicket > 0;

    if (!hayPagosPorTarifa) {
      y = textoMultilineaCorte(
        doc,
        "NO HUBO PAGOS DE TARIFAS",
        y,
        {
          centrado: true,
          negrita: true,
        },
      );
    } else {
      /*
       * Tarifas normales.
       */
      tarifas.forEach((tarifa) => {
        y = textoIzquierdaDerechaCorte(
          doc,
          `${tarifa.nombre} (${tarifa.cantidad_pagos})`,
          dineroTicket(tarifa.total),
          y,
          {
            negrita: true,
          },
        );

        const metodos = [
          [
            "Efectivo",
            tarifa.efectivo,
            tarifa.cantidad_efectivo,
            tarifa.total_efectivo,
          ],
          [
            "Tarjeta",
            tarifa.tarjeta,
            tarifa.cantidad_tarjeta,
            tarifa.total_tarjeta,
          ],
          [
            "Transferencia",
            tarifa.transferencia,
            tarifa.cantidad_transferencia,
            tarifa.total_transferencia,
          ],
          [
            "Otro",
            tarifa.otro,
            tarifa.cantidad_otro,
            tarifa.total_otro,
          ],
        ];

        metodos.forEach(
          ([nombreMetodo, informacion, cantidadAlterna, totalAlterno]) => {
            const cantidad = Number(
              informacion?.cantidad ??
              cantidadAlterna ??
              0,
            );

            const total = Number(
              informacion?.total ??
              totalAlterno ??
              0,
            );

            if (cantidad <= 0 && total <= 0) {
              return;
            }

            y = textoIzquierdaDerechaCorte(
              doc,
              `  ${nombreMetodo} x${cantidad}`,
              dineroTicket(total),
              y,
              {
                negrita: true,
                tamano: medidas.fuenteDetalle,
              },
            );
          },
        );
      });

      /*
       * Visitas como una tarifa adicional.
       */
      imprimirTarifaEspecial(
        "Visitas",
        cantidadVisitasTicket,
        totalVisitas,
        data.visitas_por_metodo,
      );

      /*
       * Clase funcional como una tarifa adicional.
       */
      imprimirTarifaEspecial(
        "Clase funcional adultos",
        cantidadClaseFuncionalTicket,
        totalClaseFuncional,
        data.clase_funcional_por_metodo,
      );
    }
    
    /*
     * ==============================
     * PAGOS FINANCIADOS
     * ==============================
     */

    y = tituloCorte(doc, "PAGOS FINANCIADOS", y + 2);

    if (!pagosFinanciados.length) {
      y = textoMultilineaCorte(doc, "NO HUBO PAGOS FINANCIADOS", y, {
        centrado: true,
        negrita: true,
      });
    } else {
      pagosFinanciados.forEach((pago) => {
        const descripcion =
          `Venta ${pago.venta_financiada_id} ` + `Cuota ${pago.cuota_id}`;

        y = textoIzquierdaDerechaCorte(
          doc,
          descripcion,
          dineroTicket(pago.monto),
          y,
          {
            negrita: true,
          },
        );
      });

      y = lineaCorte(doc, y);

      y = textoIzquierdaDerechaCorte(
        doc,
        "TOTAL FINANCIADOS",
        dineroTicket(totalFinanciados),
        y,
        {
          negrita: true,
        },
      );
    }

    /*
     * ==============================
     * VENTAS DE PRODUCTOS
     * ==============================
     */

    y = tituloCorte(doc, "VENTAS DE PRODUCTOS", y + 2);

    if (!ventas.length) {
      y = textoMultilineaCorte(doc, "NO HUBO VENTAS DE PRODUCTOS", y, {
        centrado: true,
        negrita: true,
      });
    } else {
      productosAgrupados.forEach((producto) => {
        y = textoIzquierdaDerechaCorte(
          doc,
          `${producto.nombre} x${producto.cantidad}`,
          dineroTicket(producto.total),
          y,
          {
            negrita: true,
          },
        );
      });

      y = lineaCorte(doc, y);

      y = textoIzquierdaDerechaCorte(
        doc,
        "TOTAL PRODUCTOS",
        dineroTicket(totalProductos),
        y,
        {
          negrita: true,
        },
      );
    }

    /*
     * ==============================
     * TOTAL FINAL
     * ==============================
     */

    y = lineaCorte(doc, y + 2, "=");

    y = textoIzquierdaDerechaCorte(
      doc,
      "TOTAL GENERAL",
      dineroTicket(totalVentas),
      y,
      {
        negrita: true,
        tamano: medidas.fuenteTotales,
      },
    );

    y = lineaCorte(doc, y, "=");

    /*
     * ==============================
     * PIE DEL TICKET
     * ==============================
     */

    doc.setFont("helvetica", "bold");

    doc.setFontSize(medidas.fuenteFinal);

    centrarTextoCorte(doc, "FIN DEL CORTE", y + 2);

    y += 7;

    doc.setFont("helvetica", "bold");

    doc.setFontSize(medidas.fuenteMarca);

    centrarTextoCorte(doc, "SMARTGATE", y);

    return y + 6;
  }

  /*
   * Primera pasada:
   * mide exactamente la altura del contenido,
   * incluyendo textos que ocupan varias líneas.
   */
  const docMedicion = new jsPDF({
    unit: "mm",
    format: [medidas.ancho, 5000],
    orientation: "portrait",
  });

  const alturaTicket = Math.max(dibujarTicket(docMedicion), 120);

  /*
   * Segunda pasada:
   * crea el documento con la altura definitiva.
   */
  const doc = new jsPDF({
    unit: "mm",
    format: [medidas.ancho, alturaTicket],
    orientation: "portrait",
  });

  dibujarTicket(doc);

  return doc;
}
async function generarTicketCorte58mm() {
  try {
    swalInfo.fire({
      title: "Generando ticket...",
      text: "Preparando el corte de caja para impresión.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const doc = await construirTicketCorte58mm();

    Swal.close();

    window.open(doc.output("bloburl"), "_blank");
  } catch (error) {
    console.error("Error al generar ticket de corte:", error);

    Swal.close();

    swalError.fire(
      "Error",
      error.message || "No se pudo generar el ticket.",
      "error",
    );
  }
}
async function generarPDFReporte() {
  try {
    const doc = await construirPDFReporte();
    window.open(doc.output("bloburl"), "_blank");
  } catch (error) {
    console.error(error);
    swalError.fire(
      "Error",
      error.message || "No se pudo generar el PDF.",
      "error",
    );
  }
}

async function generarPDFReporteBlob() {
  const doc = await construirPDFReporte();
  return doc.output("blob");
}

function formatearFecha(fechaStr) {
  const [anio, mes, dia] = fechaStr.split("-");
  return `${dia}/${mes}/${anio}`;
}
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result || "";
      const base64 = String(result).split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
function formatearFechaLocal(fechaISO) {
  const [anio, mes, dia] = fechaISO.split("T")[0].split("-");
  return `${dia}/${mes}/${anio}`;
}

function formatearFechaLarga(fechaISO) {
  // acepta "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss"
  const [y, m, d] = fechaISO
    .split("T")[0]
    .split("-")
    .map((n) => parseInt(n, 10));

  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  // construye fecha en horario local (evita el corrimiento por UTC)
  const fechaLocal = new Date(y, m - 1, d);

  const dia = fechaLocal.getDate(); // o usa directamente d
  const mesNombre = meses[m - 1];
  const anio = y;

  return `${dia} de ${mesNombre} del ${anio}`;
}

function cargarImagenBase64(ruta) {
  return new Promise((resolve) => {
    if (!ruta) {
      resolve(null);
      return;
    }

    const img = new Image();

    img.onload = function () {
      try {
        const canvas = document.createElement("canvas");

        canvas.width = this.naturalWidth || this.width;

        canvas.height = this.naturalHeight || this.height;

        const contexto = canvas.getContext("2d");

        contexto.drawImage(this, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        console.warn("No se pudo convertir la imagen a base64:", error);

        resolve(null);
      }
    };

    img.onerror = function () {
      console.warn("No se pudo cargar la imagen:", ruta);

      resolve(null);
    };

    /*
     * No hace falta crossOrigin porque logo_branding.php
     * está dentro del mismo dominio.
     */
    img.src = ruta;
  });
}
async function obtenerLogoDesdeDB() {
  try {
    const res = await fetch("../php/obtener_logo.php");
    const data = await res.json();
    if (data.success && data.base64) {
      return data.base64;
    } else {
      console.warn(
        "No se pudo cargar el logo desde la base de datos. Usando logo por defecto.",
      );
      return await cargarImagenBase64("../img/logo-gym.webp"); // fallback
    }
  } catch (err) {
    console.error("Error al obtener logo:", err);
    return await cargarImagenBase64("../img/logo-gym.webp"); // fallback
  }
}
// ==== CAJA: cálculo de efectivo esperado usando obtener_reportes_detalle.php ====
async function getEfectivoEsperado(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`../php/obtener_reportes_detalle.php?${qs}`);
  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error || "No se pudo calcular el efectivo.");
  }

  // Suscripciones en efectivo (monto - descuento)
  const efectivoSuscripciones = (data.pagos || [])
    .filter((p) => (p.metodo || "").toLowerCase() === "efectivo")
    .reduce(
      (sum, p) =>
        sum + (parseFloat(p.monto || 0) - parseFloat(p.descuento || 0)),
      0,
    );

  // Ventas normales en efectivo
  const efectivoVentas = (data.ventas || [])
    .filter((v) => (v.metodo_pago || "").toLowerCase() === "efectivo")
    .reduce(
      (sum, v) =>
        sum +
        (v.productos || []).reduce((s, pr) => s + parseFloat(pr.total || 0), 0),
      0,
    );

  // Pagos financiados en efectivo
  const efectivoFinanciados = (data.pagos_financiados || [])
    .filter(
      (p) => (p.metodo_pago || p.metodo || "").toLowerCase() === "efectivo",
    )
    .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);

  // ✅ Visitas en efectivo
  const efectivoVisitas = parseFloat(data.visitas_por_metodo?.efectivo || 0);
  const efectivoClaseFuncional = parseFloat(
    data.clase_funcional_por_metodo?.efectivo || 0,
  );

  return {
    esperado:
      (efectivoSuscripciones || 0) +
      (efectivoVentas || 0) +
      (efectivoFinanciados || 0) +
      (efectivoVisitas || 0) +
      (efectivoClaseFuncional || 0),

    // opcional: sirve si después quieres mostrar desglose en pantalla
    visitas_efectivo: efectivoVisitas,
    clase_funcional_efectivo: efectivoClaseFuncional,
  };
}

// ==== CAJA: renderizar card (UI) con caja_controller.php y permisos ====
async function renderCaja(params) {
  const container = document.getElementById("reporteContainer");

  const card = document.createElement("div");
  card.className =
    "col-span-1 md:col-span-2 bg-slate-900/40 border border-slate-700 rounded-2xl p-5";
  const esTodos = String(params.usuario) === "todos";
  card.innerHTML = crearCajaHTML(esTodos);

  container.appendChild(card);

  // 1) Efectivo esperado (solo efectivo)
  let esperado = 0;
  try {
    const ef = await getEfectivoEsperado(params);
    esperado = ef.esperado;
  } catch (e) {
    console.error(e);
    card.querySelector("[data-caja-warn]").classList.remove("hidden");
  }

  const $esperado = card.querySelector("[data-efectivo-esperado]");
  const $dejado = card.querySelector("#monto_caja"); // puede ser null en TODOS
  const $entregar = card.querySelector("[data-por-entregar]"); // puede ser null en TODOS
  const selUsuario = document.getElementById("usuario");

  $esperado.textContent = `$${esperado.toFixed(2)}`;
  if (esTodos) {
    // En "Todos" solo mostramos Total General Efectivo.
    // Nada de caja/por entregar/movimientos.
    return;
  }

  // 1.5) Neto de movimientos de caja (INGRESO/EGRESO) usando DETALLE
  let netoMovs = 0;
  try {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`../php/obtener_reportes_detalle.php?${qs}`);
    const det = await r.json();
    if (det.success) {
      netoMovs = parseFloat(det.caja_neto || 0); // INGRESO - EGRESO
    }
  } catch (e) {
    console.warn("No se pudo leer caja_neto para entrega", e);
  }

  // Worker = select deshabilitado (viene así desde PHP)
  const esWorker = selUsuario.disabled === true;

  // Controla si se puede editar (worker: no; admin/root: sí)
  const setEditMode = (editable) => {
    $dejado.readOnly = !editable;
  };

  const recalc = () => {
    const dejado = Number($dejado.value || 0);
    const porEntregar = esperado + dejado + netoMovs; // ← incluye movimientos
    $entregar.textContent = `$${porEntregar.toFixed(2)}`;
    const wrap = card.querySelector("[data-por-entregar-wrap]");
    wrap.classList.remove("text-emerald-400", "text-rose-400");
    wrap.classList.add("text-emerald-400");
  };

  const cargarMontoCaja = async () => {
    const selVal = selUsuario.value;
    const fechaDia = params.tipo === "dia" ? params.fecha : ""; // ✅

    if (esWorker) {
      const { monto } = await getCajaMontoFromController(
        selVal,
        true,
        fechaDia,
      );
      $dejado.value = Number(monto || 0).toFixed(2);
      setEditMode(false);
    } else {
      if (selVal === "todos") {
        $dejado.value = "0.00";
        setEditMode(true);
      } else {
        const { monto } = await getCajaMontoFromController(
          selVal,
          false,
          fechaDia,
        );
        $dejado.value = Number(monto || 0).toFixed(2);
        setEditMode(true);
      }
    }
    recalc();
  };

  // Eventos
  $dejado.addEventListener("input", recalc);

  // Evitar listeners duplicados si se vuelve a buscar
  if (!window._cajaUserChangeBound) {
    selUsuario.addEventListener("change", async () => {
      const tipo = document.getElementById("tipoPeriodo").value;
      if (tipo !== "dia") return;
      await cargarMontoCaja();
    });
    window._cajaUserChangeBound = true;
  }

  // Inicial
  await cargarMontoCaja();
}

function crearCajaHTML(modoTodos = false) {
  if (modoTodos) {
    // SOLO total efectivo
    return `
      <div class="grid grid-cols-1 gap-4">
        <div class="bg-slate-800 rounded-xl p-4">
          <div class="text-sm text-slate-300">Total General Efectivo</div>
          <div class="mt-1 text-3xl font-bold text-white" data-efectivo-esperado>$0.00</div>
          <div data-caja-warn class="mt-2 text-xs text-amber-400 hidden">
            No se pudo calcular el total general.
          </div>
        </div>
      </div>
    `;
  }

  // USUARIO específico (3 bloques)
  return `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="bg-slate-800 rounded-xl p-4">
        <div class="text-sm text-slate-300">Total General Efectivo</div>
        <div class="mt-1 text-3xl font-bold text-white" data-efectivo-esperado>$0.00</div>
        <div data-caja-warn class="mt-2 text-xs text-amber-400 hidden">
          No se pudo calcular el total general.
        </div>
      </div>

      <div class="bg-slate-800 rounded-xl p-4">
        <label for="monto_caja" class="text-sm text-slate-300">Caja</label>
        <div class="mt-1 flex items-center gap-2">
          <span class="text-slate-400">$</span>
          <input id="monto_caja" type="number" step="0.01" min="0"
                 class="w-full rounded-md bg-slate-700 text-white border border-slate-600 px-3 py-2 focus:ring-blue-400 focus:border-blue-400"
                 placeholder="0.00">
        </div>
      </div>

      <div class="bg-slate-800 rounded-xl p-4">
        <div class="text-sm text-slate-300">Por entregar</div>
        <div class="mt-1">
          <span data-por-entregar-wrap class="text-3xl font-extrabold text-emerald-400">
            <span data-por-entregar>$0.00</span>
          </span>
        </div>
        <div class="mt-2 text-xs text-slate-400">
          = Esperado + Dejado en caja + Movimientos (ingresos - egresos)
        </div>
      </div>
    </div>
  `;
}

// ==== CAJA: obtener monto desde caja_controller.php ====
async function getCajaMontoFromController(userValue, esWorker, fechaDia = "") {
  let userParam = "me";
  if (!esWorker) {
    if (String(userValue) === "todos") userParam = "all";
    else userParam = String(userValue);
  }

  const qs = new URLSearchParams({
    action: "get",
    user: userParam,
  });

  // ✅ solo si es reporte por día
  if (fechaDia) qs.set("date", fechaDia);

  const url = `../php/caja_controller.php?${qs.toString()}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => null);

  if (!data || data.ok !== true) {
    console.warn("caja_controller:get fallo", data);
    return { monto: 0, from: "fallback", stale: true };
  }

  if (!data.data) return { monto: 0, from: "all", stale: true };

  return {
    monto: Number(data.data.monto || 0),
    from: "db",
    stale: !!data.data.stale,
    fecha_actualizacion: data.data.fecha_actualizacion || null,
  };
}
// ===== Bloqueo / desbloqueo del botón Buscar Reporte =====
function lockBuscarReporte() {
  const btn = document.getElementById("btnBuscarReporte");
  if (!btn) return;

  btn.disabled = true;
  btn.classList.add("opacity-60", "cursor-not-allowed");
  btn.classList.remove("hover:bg-blue-700");
  btn.dataset.locked = "1";
}

function unlockBuscarReporte() {
  const btn = document.getElementById("btnBuscarReporte");
  if (!btn) return;

  btn.disabled = false;
  btn.classList.remove("opacity-60", "cursor-not-allowed");
  btn.classList.add("hover:bg-blue-700");
  btn.dataset.locked = "0";
}

function initBuscarReporteLock() {
  const ids = [
    "usuario",
    "tipoPeriodo",
    "fecha_dia",
    "fecha_mes",
    "fecha_anio",
    "rango_inicio",
    "rango_fin",
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    // change para selects, input para fechas (por si teclean)
    el.addEventListener("change", unlockBuscarReporte);
    el.addEventListener("input", unlockBuscarReporte);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initBuscarReporteLock();
});
async function abrirModalCorreoReporte() {
  try {
    swalInfo.fire({
      title: "Generando PDF...",
      text: "Espera un momento",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const blob = await generarPDFReporteBlob();
    const pdfBase64 = await blobToBase64(blob);

    const usuarioSelect = document.getElementById("usuario");
    const nombreUsuario =
      usuarioSelect.options[usuarioSelect.selectedIndex].text;
    const tipo = document.getElementById("tipoPeriodo").value;

    let fecha = "",
      inicio = "",
      fin = "",
      textoPeriodo = "";

    if (tipo === "dia") {
      fecha = document.getElementById("fecha_dia").value;
      textoPeriodo = fecha;
    } else if (tipo === "mes") {
      fecha = document.getElementById("fecha_mes").value;
      textoPeriodo = fecha;
    } else if (tipo === "anio") {
      fecha = document.getElementById("fecha_anio").value;
      textoPeriodo = fecha;
    } else if (tipo === "rango") {
      inicio = document.getElementById("rango_inicio").value;
      fin = document.getElementById("rango_fin").value;
      textoPeriodo = `${inicio}_a_${fin}`;
    }

    const nombreArchivo = `reporte_${nombreUsuario
      .replace(/\s+/g, "_")
      .replace(/[^\w\-]/g, "")}_${textoPeriodo}.pdf`;
    let periodoTexto = "";

    if (tipo === "dia") {
      periodoTexto = `Día: ${formatearFecha(fecha)}`;
    } else if (tipo === "mes") {
      const [anio, mes] = fecha.split("-");
      const meses = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
      ];
      periodoTexto = `Mes: ${meses[parseInt(mes, 10) - 1]} de ${anio}`;
    } else if (tipo === "anio") {
      periodoTexto = `Año: ${fecha}`;
    } else if (tipo === "rango") {
      periodoTexto = `Rango: ${formatearFecha(inicio)} al ${formatearFecha(fin)}`;
    }

    const res = await fetch("../php/enviar_reporte_correo.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pdf_base64: pdfBase64,
        nombre_archivo: nombreArchivo,
        asunto: `Reporte - ${nombreUsuario}`,
        mensaje: `Adjuntamos el reporte solicitado para ${nombreUsuario}.`,
        periodo_texto: periodoTexto,
        usuario_texto: nombreUsuario,
      }),
    });

    const data = await res.json();
    Swal.close();

    if (!data.ok) {
      return swalError.fire(
        "Error",
        data.msg || "No se pudo enviar el correo.",
        "error",
      );
    }

    swalSuccess.fire(
      "Enviado",
      data.msg || "El reporte fue enviado correctamente.",
      "success",
    );
  } catch (error) {
    console.error(error);
    Swal.close();
    swalError.fire(
      "Error",
      error.message || "No se pudo enviar el reporte por correo.",
      "error",
    );
  }
}
