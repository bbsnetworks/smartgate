document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const hoy = `${yyyy}-${mm}-${dd}`;
  document.getElementById("fecha_dia").value = hoy;
});

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
    if (!fecha)
      return swalError.fire(
        "Falta fecha",
        "Selecciona una fecha para el reporte por día.",
        "warning"
      );
  } else if (tipo === "mes") {
    fecha = document.getElementById("fecha_mes").value;
    if (!fecha)
      return swalError.fire("Falta mes", "Selecciona un mes.", "warning");
  } else if (tipo === "anio") {
    fecha = document.getElementById("fecha_anio").value;
    if (!fecha)
      return swalError.fire("Falta año", "Selecciona un año.", "warning");
  } else if (tipo === "rango") {
    inicio = document.getElementById("rango_inicio").value;
    fin = document.getElementById("rango_fin").value;
    if (!inicio || !fin)
      return swalError.fire(
        "Falta rango",
        "Selecciona ambas fechas del rango.",
        "warning"
      );
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
      `../php/obtener_reportes.php?${params.toString()}`
    );
    const data = await response.json();

    Swal.close();

    if (!data.success) {
      return swalError.fire(
        "Error",
        data.error || "No se pudo obtener la información.",
        "error"
      );
    }

    const {
      total_pagos,
      total_productos,
      cantidad_pagos,
      cantidad_productos,
      total_general,
    } = data;

    container.innerHTML += crearCard(
      "Total en Suscripciones",
      `$${parseFloat(total_pagos).toFixed(2)}`,
      "bi-currency-dollar",
      "text-blue-600",
      "bg-sky-100"
    );
    container.innerHTML += crearCard(
      "Suscripciones Registradas",
      cantidad_pagos,
      "bi-people-fill",
      "text-blue-500",
      "bg-sky-100"
    );

    container.innerHTML += crearCard(
      "Total en Productos Vendidos",
      `$${parseFloat(total_productos).toFixed(2)}`,
      "bi-cart-check",
      "text-green-600",
      "bg-stone-200"
    );
    container.innerHTML += crearCard(
      "Ventas Registradas",
      cantidad_productos,
      "bi-boxes",
      "text-green-500",
      "bg-stone-200"
    );

    container.innerHTML += crearCard(
      "Total General",
      `$${parseFloat(total_general).toFixed(2)}`,
      "bi-coin",
      "text-indigo-600",
      "bg-green-200"
    );
    

// ===== Movimientos de caja (desde DETALLE) =====
if (tipo === "dia" && String(usuario) !== "todos") {
  // ===== Movimientos de caja (desde DETALLE) =====
  let cajaIngresos = 0, cajaEgresos = 0, cajaCantidad = 0;

  try {
    const detRes = await fetch(`../php/obtener_reportes_detalle.php?${params.toString()}`);
    const det = await detRes.json();

    if (det.success) {
      cajaIngresos  = parseFloat(det.caja_ingresos || 0);
      cajaEgresos   = parseFloat(det.caja_egresos || 0);
      cajaCantidad  = (det.movimientos_caja || []).length;
    }
  } catch (e) {
    console.warn("No se pudo cargar movimientos de caja", e);
  }

  const netoCaja = (cajaIngresos || 0) - (cajaEgresos || 0);

  container.innerHTML += crearCard(
    "Movimientos de caja",
    `<div class="text-xl font-bold text-gray-800">$${netoCaja.toFixed(2)}</div>
     <div class="text-sm text-gray-600 mt-1">
       Ingresos: $${(cajaIngresos || 0).toFixed(2)} ·
       Egresos: $${(cajaEgresos || 0).toFixed(2)} ·
       Movs: ${parseInt(cajaCantidad || 0, 10)}
     </div>`,
    "bi-arrow-left-right",
    "text-amber-600",
    "bg-amber-100"
  );
}



    if (tipo === "dia") {
  await renderCaja({ usuario, tipo, fecha, inicio, fin });
}


    agregarBotonPDF();
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

// Agrega este botón justo debajo del div con ID "reporteContainer"
function agregarBotonPDF() {
  const container = document.getElementById("reporteContainer");

  const card = document.createElement("div");
  card.className =
    "bg-white rounded-xl shadow text-2xl text-center flex items-center justify-center";

  const btn = document.createElement("button");
  btn.textContent = "📄 Generar PDF";
  btn.className =
    "bg-green-600 h-full w-full hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold shadow";
  btn.onclick = generarPDFReporte;

  card.appendChild(btn);
  container.appendChild(card);
}

async function generarPDFReporte() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // =========================
  // 1) Configuración inicial
  // =========================
  const usuarioId = document.getElementById("usuario").value;
  const tipo = document.getElementById("tipoPeriodo").value;

  let fecha = "", inicio = "", fin = "";
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
  const res = await fetch(`../php/obtener_reportes_detalle.php?${params.toString()}`);
  const data = await res.json();

  if (!data.success) {
    swalError.fire("Error", data.error || "No se pudo generar el PDF.", "error");
    return;
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

  const totalSuscripcionesPorMetodo = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
  };

  // =========================
  // 3) Paleta + utilidades
  // =========================
  const PALETTE = {
    title: [45, 55, 72],     // slate-700
    text: [31, 41, 55],      // slate-800
    mute: [107, 114, 128],   // gray-500
    box: [248, 250, 252],    // slate-50
    stroke: [203, 213, 225], // slate-300
    sub: [2, 132, 199],      // sky-600
    sub2: [234, 88, 12],     // orange-600
    ok: [16, 185, 129],      // emerald-500
    bandBg: [15, 23, 42],    // slate-900
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

  function lineAmount(doc, x, y, label, amount, rightBound, color = PALETTE.text) {
    doc.setTextColor(...color);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const right = rightBound;
    const price = fmtMoney(amount);
    const wPrice = doc.getTextWidth(price);
    const dotEnd = right - wPrice - 2;

    const maxLabelW = right - x - (wPrice + 8);
    let labelShown = label;

    if (doc.getTextWidth(labelShown) > maxLabelW) {
      while (labelShown.length > 1 && doc.getTextWidth(labelShown + "…") > maxLabelW) {
        labelShown = labelShown.slice(0, -1);
      }
      labelShown += "…";
    }

    doc.text(labelShown, x, y);

    const labelW = doc.getTextWidth(labelShown);
    const dotsStart = x + labelW + 2;
    if (dotEnd > dotsStart) {
      doc.setDrawColor(...PALETTE.stroke);
      doc.setLineWidth(0.2);
      doc.line(dotsStart, y - 1.2, dotEnd, y - 1.2);
    }

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
      const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
      textoRango = `Mes: ${meses[parseInt(mes, 10) - 1]} de ${anio}`;
    } else if (tipo === "anio") textoRango = `Año: ${fecha}`;
    else if (tipo === "rango") textoRango = `Desde: ${formatearFecha(inicio)}  hasta: ${formatearFecha(fin)}`;

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

      const texto = `• ${cliente} el ${fechaFormat}${descuento > 0 ? ` (-$${descuento.toFixed(2)} descuento)` : ""}`;
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

      doc.text(`• Venta #${v.venta_id} por ${v.usuario} el ${fechaFormat}`, 12, y);
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
  //    + Card de CAJA adentro
  // =========================
  const renderTotales = () => {
    // Ventas por método
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

    // --- Card SUSCRIPCIONES ---
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

    yC = lineAmount(doc, leftX + 6, yC, "Efectivo", totalSuscripcionesPorMetodo.efectivo || 0, leftRight);
    yC = lineAmount(doc, leftX + 6, yC, "Tarjeta", totalSuscripcionesPorMetodo.tarjeta || 0, leftRight);
    yC = lineAmount(doc, leftX + 6, yC, "Transferencia", totalSuscripcionesPorMetodo.transferencia || 0, leftRight);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.ok);
    doc.setFontSize(11);
    doc.text(`TOTAL: ${fmtMoney(totalSuscripciones)}`, leftX + 6, y + cardH - 6);

    // --- Card VENTAS ---
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
    yR = lineAmount(doc, rightX + 6, yR, "Transferencia", ventaTransferencia, rightRight);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.ok);
    doc.setFontSize(11);
    doc.text(`TOTAL: ${fmtMoney(totalVentasCalc)}`, rightX + 6, y + cardH - 6);

    // Debajo de las 2 cards
    y += cardH + 10;

    // --- Card CAJA (solo si es día) ---
    if (tipo === "dia" && String(usuarioId) !== "todos") {
      const efectivoEsperado = (totalSuscripcionesPorMetodo.efectivo || 0) + (ventaEfectivo || 0);
      const netoMovs = parseFloat(data.caja_neto || 0);
      const dejado = Number(document.getElementById("monto_caja")?.value || 0);
      const totalEntregar = efectivoEsperado + netoMovs + dejado;

      const boxX = 10, boxW = 190, boxH = 56; // más alta
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

      yK = lineAmount(doc, boxX + 8, yK, "Total General efectivo", efectivoEsperado, rb);
      yK = lineAmount(doc, boxX + 8, yK, "Movimientos (ingresos - egresos)", netoMovs, rb);
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

    // --- Banda TOTAL GENERAL ---
    y = ensureSpace(doc, y, 18);
    doc.setFillColor(...PALETTE.bandBg);
    doc.rect(10, y, 190, 14, "F");

    doc.setTextColor(...PALETTE.bandTx);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    let totalGeneral = totalVentasCalc + totalSuscripciones;

// SOLO cuando es por día y un usuario específico:
// sumar movimientos netos + lo dejado en caja
if (tipo === "dia" && String(usuarioId) !== "todos") {
  const netoMovs = parseFloat(data.caja_neto || 0);
  const dejado = Number(document.getElementById("monto_caja")?.value || 0);
  totalGeneral += (netoMovs || 0) + (dejado || 0);
}

    doc.text("TOTAL GENERAL", 14, y + 10);

    const amount = fmtMoney(totalGeneral);
    doc.text(amount, 10 + 190 - 6 - doc.getTextWidth(amount), y + 10);

    y += 22;

    // Nota
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
  // 8) Detalle movimientos caja (al final)
  // =========================
  const renderMovimientosCajaPDF = () => {
    const movs = data.movimientos_caja || [];
    if (!movs.length) return;

    y = ensureSpace(doc, y, 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...PALETTE.title);
    doc.text("Detalle de movimientos de caja", 10, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    movs.forEach((m) => {
      const tipoMov = String(m.tipo || "").toUpperCase();
      const monto = Number(m.monto || 0);

      // Soporta fecha/hora separados o fecha full
      const fechaTxt = m.fecha
        ? formatearFechaLocal(m.fecha)
        : (m.fecha_full ? formatearFechaLocal(m.fecha_full) : "");

      const horaTxt = m.hora ? m.hora : (m.fecha_full ? new Date(m.fecha_full).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}) : "");

      const concepto = (m.concepto || "").trim();
      const usuario = (m.usuario || "").trim();

      const linea = `• ${horaTxt} ${fechaTxt} · ${tipoMov} · ${concepto}${usuario ? ` · ${usuario}` : ""}`;
      const montoTxt = fmtMoney(monto);

      // Color por tipo
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
  // 9) EJECUCIÓN ORDEN FINAL
  // =========================
  renderEncabezado();

  // 1) Suscripciones
  const pagos = {
    efectivo: (data.pagos || []).filter((p) => (p.metodo || "").toLowerCase() === "efectivo"),
    tarjeta: (data.pagos || []).filter((p) => (p.metodo || "").toLowerCase() === "tarjeta"),
    transferencia: (data.pagos || []).filter((p) => (p.metodo || "").toLowerCase() === "transferencia"),
  };

  renderPagos("Pagos por Efectivo:", pagos.efectivo, "efectivo");
  renderPagos("Pagos por Tarjeta:", pagos.tarjeta, "tarjeta");
  renderPagos("Pagos por Transferencia:", pagos.transferencia, "transferencia");

  // 2) Productos
  const ventas = {
    efectivo: (data.ventas || []).filter((v) => (v.metodo_pago || "").toLowerCase() === "efectivo"),
    tarjeta: (data.ventas || []).filter((v) => (v.metodo_pago || "").toLowerCase() === "tarjeta"),
    transferencia: (data.ventas || []).filter((v) => (v.metodo_pago || "").toLowerCase() === "transferencia"),
  };

  renderVentas("Ventas de Productos - Efectivo:", ventas.efectivo);
  renderVentas("Ventas de Productos - Tarjeta:", ventas.tarjeta);
  renderVentas("Ventas de Productos - Transferencia:", ventas.transferencia);

   // 4) Detalle caja al final
  if (tipo === "dia" && String(usuarioId) !== "todos") {
    renderMovimientosCajaPDF();
  }

  // 3) Totales (incluye card caja dentro)
  renderTotales();

 

  // Abrir PDF
  window.open(doc.output("bloburl"), "_blank");
}




function formatearFecha(fechaStr) {
  const [anio, mes, dia] = fechaStr.split("-");
  return `${dia}/${mes}/${anio}`;
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
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = this.naturalWidth;
      canvas.height = this.naturalHeight;
      canvas.getContext("2d").drawImage(this, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
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
        "No se pudo cargar el logo desde la base de datos. Usando logo por defecto."
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
  if (!data.success)
    throw new Error(data.error || "No se pudo calcular el efectivo.");

  // Suscripciones en efectivo (monto - descuento)
  const efectivoSuscripciones = (data.pagos || [])
    .filter((p) => (p.metodo || "").toLowerCase() === "efectivo")
    .reduce(
      (sum, p) =>
        sum + (parseFloat(p.monto || 0) - parseFloat(p.descuento || 0)),
      0
    );

  // Ventas en efectivo
  const efectivoVentas = (data.ventas || [])
    .filter((v) => (v.metodo_pago || "").toLowerCase() === "efectivo")
    .reduce(
      (sum, v) =>
        sum +
        (v.productos || []).reduce((s, pr) => s + parseFloat(pr.total || 0), 0),
      0
    );

  return {
    esperado: (efectivoSuscripciones || 0) + (efectivoVentas || 0),
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
const $dejado = card.querySelector("#monto_caja");          // puede ser null en TODOS
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
  const fechaDia = (params.tipo === "dia" ? params.fecha : ""); // ✅

  if (esWorker) {
    const { monto } = await getCajaMontoFromController(selVal, true, fechaDia);
    $dejado.value = Number(monto || 0).toFixed(2);
    setEditMode(false);
  } else {
    if (selVal === "todos") {
      $dejado.value = "0.00";
      setEditMode(true);
    } else {
      const { monto } = await getCajaMontoFromController(selVal, false, fechaDia);
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

