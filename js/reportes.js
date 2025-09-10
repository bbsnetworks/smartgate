document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const hoy = `${yyyy}-${mm}-${dd}`;
  document.getElementById("fecha_dia").value = hoy;
});

async function buscarReportes() {
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

    agregarBotonPDF();
  } catch (error) {
    console.error(error);
    swalError.fire("Error", "No se pudo conectar con el servidor.", "error");
  }
}

function crearCard(titulo, valor, icono, iconColor, bgColor) {
  return `
    <div class="${bgColor} rounded-xl shadow p-6 text-center">
      <i class="fas ${icono} text-4xl ${iconColor} mb-3"></i>
      <h2 class="text-lg font-semibold text-gray-700">${titulo}</h2>
      <p class="text-2xl font-bold text-gray-800 mt-2">${valor}</p>
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

  // Configuración inicial
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
  const res = await fetch(
    `../php/obtener_reportes_detalle.php?${params.toString()}`
  );
  const data = await res.json();

  if (!data.success) {
    swalError.fire(
      "Error",
      data.error || "No se pudo generar el PDF.",
      "error"
    );
    return;
  }

  // === Configurar variables globales ===
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
  const totalMetodo = {
    efectivo: data.total_efectivo ?? 0,
    tarjeta: data.total_tarjeta ?? 0,
    transferencia: data.total_transferencia ?? 0,
  };

  // === Encabezado PDF ===
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
    else if (tipo === "rango")
      textoRango = `Desde: ${formatearFecha(inicio)}  hasta: ${formatearFecha(
        fin
      )}`;

    doc.setTextColor(80, 80, 80);
    doc.text(textoRango, 10, y);
    y += 10;
  };

  // === Renderizar pagos de suscripción por método ===
  const renderPagos = (titulo, pagos, metodo) => {
    if (pagos.length === 0) return;

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
      const montoOriginal = parseFloat(p.monto);
      const montoFinal = montoOriginal - descuento;

      const texto = `• ${cliente} el ${fechaFormat}${descuento > 0 ? ` (-$${descuento.toFixed(2)} descuento)` : ''}`;
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

  // === Renderizar ventas de productos ===
  const renderVentas = (titulo, ventas) => {
    if (ventas.length === 0) return;

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
        y
      );
      y += 6;

      let totalVenta = 0;
      v.productos.forEach((p) => {
        const subtotal = parseFloat(p.total);
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

  // === Renderizar resumen de totales ===
  const renderTotales = () => {
    // Recalcula ventas por método (restando suscripciones por método)
    const totalVentasPorMetodo = {
  efectivo: 0,
  tarjeta: 0,
  transferencia: 0,
};

data.ventas.forEach((v) => {
  const m = (v.metodo_pago || "").toLowerCase();
  if (!totalVentasPorMetodo[m]) totalVentasPorMetodo[m] = 0;
  v.productos.forEach((p) => {
    totalVentasPorMetodo[m] += parseFloat(p.total || 0);
    totalVentas += parseFloat(p.total || 0);
  });
});

const ventaEfectivo = totalVentasPorMetodo.efectivo;
const ventaTarjeta = totalVentasPorMetodo.tarjeta;
const ventaTransferencia = totalVentasPorMetodo.transferencia;


    // Layout
    y = ensureSpace(doc, y, 64);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...PALETTE.title);
    doc.text("Resumen de Totales", 10, y);
    y += 6;

    // Medidas tarjetas
    const marginX = 10;
    const gap = 6;
    const cardW = (200 - marginX - gap) / 2; // ancho de cada card
    const leftX = 10;
    const rightX = leftX + cardW + gap;
    const cardH = 56;

    // --- Card SUSCRIPCIONES ---
    y = ensureSpace(doc, y, cardH + 12);
    doc.setDrawColor(...PALETTE.stroke);
    doc.setFillColor(...PALETTE.box);
    doc.roundedRect(leftX, y, cardW, cardH, 3, 3, "FD");

    // Título card
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.sub2);
    doc.text("MENSUALIDADES", leftX + 6, y + 8);

    // Contenido
    let yC = y + 16;
    const leftRight = leftX + cardW - 6; // <-- borde derecho interno del card
    yC = lineAmount(
      doc,
      leftX + 6,
      yC,
      "Efectivo",
      totalSuscripcionesPorMetodo.efectivo || 0,
      leftRight
    );
    yC = lineAmount(
      doc,
      leftX + 6,
      yC,
      "Tarjeta",
      totalSuscripcionesPorMetodo.tarjeta || 0,
      leftRight
    );
    yC = lineAmount(
      doc,
      leftX + 6,
      yC,
      "Transferencia",
      totalSuscripcionesPorMetodo.transferencia || 0,
      leftRight
    );

    // Total card
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.ok);
    doc.setFontSize(11);
    const subt = `TOTAL: ${fmtMoney(totalSuscripciones)}`;
    doc.text(subt, leftX + 6, y + cardH - 6);

    // --- Card VENTAS ---
    doc.setDrawColor(...PALETTE.stroke);
    doc.setFillColor(...PALETTE.box);
    doc.roundedRect(rightX, y, cardW, cardH, 3, 3, "FD");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.sub);
    doc.text("VENTAS DE PRODUCTOS", rightX + 6, y + 8);

    let yR = y + 16;
    const rightRight = rightX + cardW - 6; // <-- borde derecho interno del card
    yR = lineAmount(doc, rightX + 6, yR, "Efectivo", ventaEfectivo, rightRight);
    yR = lineAmount(doc, rightX + 6, yR, "Tarjeta", ventaTarjeta, rightRight);
    yR = lineAmount(
      doc,
      rightX + 6,
      yR,
      "Transferencia",
      ventaTransferencia,
      rightRight
    );

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PALETTE.ok);
    doc.setFontSize(11);
    const totVentasTxt = `TOTAL: ${fmtMoney(totalVentas)}`;
    doc.text(totVentasTxt, rightX + 6, y + cardH - 6);

    // Avanza debajo de las tarjetas
    y += cardH + 10;

    // --- Banda TOTAL GENERAL ---
    y = ensureSpace(doc, y, 18);
    doc.setFillColor(...PALETTE.bandBg);
    doc.rect(10, y, 190, 14, "F");
    doc.setTextColor(...PALETTE.bandTx);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const totalGeneral = totalVentas + totalSuscripciones;
    const label = "TOTAL GENERAL";
    const amount = fmtMoney(totalGeneral);
    const wLabel = doc.getTextWidth(label);
    const wAmount = doc.getTextWidth(amount);

    doc.text(label, 14, y + 10);
    doc.text(amount, 10 + 190 - 6 - wAmount, y + 10);
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
  // Paleta y utilidades (puedes ponerlo cerca de tus otras constantes/helpers)
  const PALETTE = {
    title: [45, 55, 72], // slate-700
    text: [31, 41, 55], // slate-800
    mute: [107, 114, 128], // gray-500
    box: [248, 250, 252], // slate-50
    stroke: [203, 213, 225], // slate-300
    sub: [2, 132, 199], // sky-600
    sub2: [234, 88, 12], // orange-600
    ok: [16, 185, 129], // emerald-500
    bandBg: [15, 23, 42], // slate-900
    bandTx: [255, 255, 255],
  };

  const fmtMoney = (n) => `$${(Number(n) || 0).toFixed(2)}`;

  // Helper: agrega salto si falta espacio
  function ensureSpace(doc, y, need = 40) {
    if (y + need > 285) {
      doc.addPage();
      return 20;
    }
    return y;
  }

  // Helper: mini línea “Etiqueta ……… $monto”, limitada al ancho del card
  function lineAmount(
    doc,
    x,
    y,
    label,
    amount,
    rightBound,
    color = PALETTE.text
  ) {
    doc.setTextColor(...color);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const right = rightBound; // <-- borde derecho del card
    const price = fmtMoney(amount);
    const wPrice = doc.getTextWidth(price);
    const dotEnd = right - wPrice - 2;

    // etiqueta (si fuera muy larga, la recortamos con “…”)
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
    doc.text(labelShown, x, y);

    // línea punteada visual
    const labelW = doc.getTextWidth(labelShown);
    const dotsStart = x + labelW + 2;
    if (dotEnd > dotsStart) {
      doc.setDrawColor(...PALETTE.stroke);
      doc.setLineWidth(0.2);
      doc.line(dotsStart, y - 1.2, dotEnd, y - 1.2);
    }

    // monto
    doc.text(price, right - wPrice, y);

    return y + 6;
  }

  // === Ejecutar las secciones ===
  renderEncabezado();

  const pagos = {
    efectivo: data.pagos.filter((p) => p.metodo?.toLowerCase() === "efectivo"),
    tarjeta: data.pagos.filter((p) => p.metodo?.toLowerCase() === "tarjeta"),
    transferencia: data.pagos.filter(
      (p) => p.metodo?.toLowerCase() === "transferencia"
    ),
  };
  renderPagos("Pagos por Efectivo:", pagos.efectivo, "efectivo");
  renderPagos("Pagos por Tarjeta:", pagos.tarjeta, "tarjeta");
  renderPagos("Pagos por Transferencia:", pagos.transferencia, "transferencia");

  const ventas = {
    efectivo: data.ventas.filter(
      (v) => v.metodo_pago?.toLowerCase() === "efectivo"
    ),
    tarjeta: data.ventas.filter(
      (v) => v.metodo_pago?.toLowerCase() === "tarjeta"
    ),
    transferencia: data.ventas.filter(
      (v) => v.metodo_pago?.toLowerCase() === "transferencia"
    ),
  };
  renderVentas("Ventas de Productos - Efectivo:", ventas.efectivo);
  renderVentas("Ventas de Productos - Tarjeta:", ventas.tarjeta);
  renderVentas("Ventas de Productos - Transferencia:", ventas.transferencia);

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
  const [y, m, d] = fechaISO.split('T')[0].split('-').map(n => parseInt(n, 10));

  const meses = [
    "enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","septiembre","octubre","noviembre","diciembre"
  ];

  // construye fecha en horario local (evita el corrimiento por UTC)
  const fechaLocal = new Date(y, m - 1, d);

  const dia = fechaLocal.getDate();      // o usa directamente d
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
      console.warn("No se pudo cargar el logo desde la base de datos. Usando logo por defecto.");
      return await cargarImagenBase64("../img/logo-gym.webp"); // fallback
    }
  } catch (err) {
    console.error("Error al obtener logo:", err);
    return await cargarImagenBase64("../img/logo-gym.webp"); // fallback
  }
}
