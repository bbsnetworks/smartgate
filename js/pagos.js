// ¿La cadena ya viene como dataURL?
function looksLikeDataURL(str) {
  return (
    typeof str === "string" && /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(str)
  );
}

// Log compacto para no saturar la consola
function brief(s, take = 40) {
  if (!s) return s;
  return s.length <= take ? s : s.slice(0, take) + `… (len=${s.length})`;
}

// Imprime cómo viene la imagen de cada cliente
function logImagenCliente(tag, c) {
  console.debug(`[${tag}] id=${c.id} nombre=${c.nombre} ${c.apellido}`, {
    foto_isDataURL: looksLikeDataURL(c.foto),
    foto_head: brief(c.foto),
    foto_icono_isDataURL: looksLikeDataURL(c.foto_icono),
    foto_icono_head: brief(c.foto_icono),
  });
}

let offset = 0;
let ultimaBusqueda = "";
let paginaActualClientes = 1;

function debounce(func, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("filtro");

  const buscarConRetraso = debounce(() => {
    ultimaBusqueda = input.value.trim();
    buscarClientes(ultimaBusqueda, 1);
  }, 300); // ← puedes ajustar el delay (300ms recomendado)
  buscarClientes("", 1);
  input.addEventListener("input", buscarConRetraso);
});

let paginaActual = 1;

function buscarClientes(q = "", pagina = 1) {
  paginaActualClientes = pagina;
  const cuerpoTabla = document.getElementById("tabla-clientes");

  // Limpia la tabla
  cuerpoTabla.innerHTML = `
    <tr id="sin-resultados" class="hidden">
      <td colspan="5" class="p-4 text-center text-gray-400">🔍 No se encontraron resultados</td>
    </tr>
  `;

  fetch(
    `../php/buscar_clientes_tabla_pagos.php?q=${encodeURIComponent(
      q
    )}&page=${pagina}`
  )
    .then((res) => res.json())
    .then((data) => {
      const clientes = data.clientes;
      const total = data.total;
      const limit = data.limit;

      const mensaje = document.getElementById("sin-resultados");

      if (clientes.length === 0) {
        mensaje.classList.remove("hidden");
        document.getElementById("paginacion-clientes").innerHTML = "";
        return;
      }

      mensaje.classList.add("hidden");

      clientes.forEach((c) => {
        const hoy = new Date().toISOString().split("T")[0];
        const activo = new Date(c.Fin) >= new Date(hoy);
        const estado = activo ? "Activo" : "Vencido";
        const estadoColor = activo ? "text-green-400" : "text-red-400";
        const filaColor = activo ? "bg-opacity-10" : "bg-opacity-10";

        const tr = document.createElement("tr");
        tr.className = `border-b border-slate-700 ${filaColor} hover:bg-slate-800`;
        tr.innerHTML = `
          <td class="px-6 py-4 text-slate-200">${c.nombre}</td>
          <td class="px-6 py-4 text-slate-200">${c.apellido}</td>
          <td class="px-6 py-4 text-slate-200">${c.telefono}</td>
          <td class="px-6 py-4 font-medium ${estadoColor}">${estado}</td>
          <td class="px-6 py-4 text-center space-x-2">
            <button onclick="verPagos(${c.id}, '${c.nombre} ${c.apellido}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm shadow">
              <i class="fa-solid fa-calendar-days mr-1"></i> Ver pagos
            </button>
            <button onclick="abrirModalPagoCliente(${c.id})" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md text-sm shadow">
              <i class="fa-solid fa-coins mr-1"></i> Registrar
            </button>
          </td>
        `;
        cuerpoTabla.appendChild(tr);
      });

      renderPaginacionClientes(total, limit, pagina);
    });
}

function renderPaginacionClientes(total, limit, paginaActual) {
  const totalPaginas = Math.ceil(total / limit);
  const contenedor = document.getElementById("paginacion-clientes");
  contenedor.innerHTML = "";

  if (totalPaginas <= 1) return;

  const maxBotones = 5;
  let inicio = Math.max(1, paginaActual - Math.floor(maxBotones / 2));
  let fin = inicio + maxBotones - 1;

  if (fin > totalPaginas) {
    fin = totalPaginas;
    inicio = Math.max(1, fin - maxBotones + 1);
  }

  const crearBoton = (
    numero,
    texto = null,
    activo = false,
    disabled = false
  ) => {
    const btn = document.createElement("button");
    btn.textContent = texto || numero;
    btn.disabled = disabled;
    btn.className = `px-3 py-1 rounded ${
      activo ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
    } text-white ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;
    if (!disabled) {
      btn.onclick = () => buscarClientes(ultimaBusqueda, numero);
    }
    contenedor.appendChild(btn);
  };

  crearBoton(paginaActual - 1, "«", false, paginaActual === 1);

  for (let i = inicio; i <= fin; i++) {
    crearBoton(i, null, i === paginaActual);
  }

  crearBoton(paginaActual + 1, "»", false, paginaActual === totalPaginas);
}

async function abrirModalPago() {
  let html = `<div id="formulario-pago" class="space-y-5">

  <!-- FILA 1: Inicio / Fin -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

    <!-- Fecha Inicio -->
    <div class="w-full">
      <label class="block mb-1 text-sm font-medium flex items-center justify-between gap-2">
        <span class="flex items-center gap-1">
          <i data-lucide="calendar-check" class="w-4 h-4 text-blue-400"></i> Fecha de Inicio:
        </span>

        <button id="btnUnlockInicio" type="button"
          class="hidden text-xs px-3 py-1 rounded-md bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200">
          Desbloquear
        </button>
      </label>

      <div class="relative">
        <input id="fecha_inicio" type="date"
          class="w-full border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 rounded-lg
                 focus:outline-none focus:ring-2 focus:ring-blue-500" />

        <!-- Overlay: SOLO cuando está bloqueado -->
        <button id="lockInicioOverlay" type="button"
          class="hidden absolute inset-0 rounded-lg"
          style="background: transparent;"
          aria-label="Desbloquear fecha inicio"></button>
      </div>

      <p id="hintInicio" class="mt-1 text-xs text-slate-500 hidden"></p>
    </div>

    <!-- Fecha Fin -->
    <div class="w-full">
      <label class="block mb-1 text-sm font-medium flex items-center gap-1">
        <i data-lucide="calendar-clock" class="w-4 h-4 text-rose-400"></i> Fecha de Fin:
      </label>
      <input id="fecha_fin" type="date"
        class="w-full border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 rounded-lg
               focus:outline-none focus:ring-2 focus:ring-rose-500">
    </div>
  </div>

  <!-- PANEL AUTORIZACIÓN: ANCHO COMPLETO (no rompe el grid) -->
  <div id="authPanel"
    class="hidden w-full p-4 rounded-xl border border-slate-600 bg-slate-900/80 shadow-lg">
    <div class="flex items-center gap-2 mb-3">
      <i data-lucide="shield-check" class="w-5 h-5 text-amber-400"></i>
      <div class="text-sm font-semibold text-slate-100">Autorización requerida</div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
      <div class="md:col-span-8">
        <input id="authCode" type="password" placeholder="Código de administrador"
          class="w-full h-11 border border-slate-600 bg-slate-950 text-slate-100 px-3 rounded-lg
                 focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>

      <div class="md:col-span-4 flex gap-2">
        <button id="authValidate" type="button"
          class="flex-1 h-11 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold">
          Validar
        </button>

        <button id="authCancel" type="button"
          class="flex-1 h-11 rounded-lg bg-slate-700 hover:bg-slate-600 text-white">
          Cancelar
        </button>
      </div>
    </div>

    <p id="authMsg" class="mt-3 text-xs text-slate-400"></p>
  </div>

  <!-- FILA 2: Monto / Descuento -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

    <div>
      <label class="block mb-1 text-sm font-medium flex items-center gap-1">
        <i data-lucide="dollar-sign" class="w-4 h-4 text-yellow-400"></i> Monto Total:
      </label>
      <input id="monto" type="text" inputmode="decimal" value="0"
        class="w-full border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 rounded-lg
               focus:outline-none focus:ring-2 focus:ring-yellow-500"
        onkeydown="if(['-','+','e','E'].includes(event.key)) return false;"
        oninput="
          this.value = this.value.replace(',', '.').replace(/[^\d.]/g,'');
          if ((this.value.match(/\./g)||[]).length > 1) this.value = this.value.replace(/\.(?=.*\.)/g,'');
          this.value = this.value.replace(/^(\d*)(?:\.(\d{0,2})?).*$/, function(_, e, d){ return e + (d ? '.'+d : ''); });
        ">
    </div>

    <div>
      <label class="block mb-1 text-sm font-medium flex items-center gap-1">
        <i data-lucide="gift" class="w-4 h-4 text-pink-400"></i> Descuento:
      </label>
      <input id="descuento" type="text" inputmode="decimal" value="0"
        class="w-full border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 rounded-lg
               focus:outline-none focus:ring-2 focus:ring-pink-500"
        onkeydown="if(['-','+','e','E'].includes(event.key)) return false;"
        oninput="
          this.value = this.value.replace(',', '.').replace(/[^\d.]/g,'');
          if ((this.value.match(/\./g)||[]).length > 1) this.value = this.value.replace(/\.(?=.*\.)/g,'');
          this.value = this.value.replace(/^(\d*)(?:\.(\d{0,2})?).*$/, function(_, e, d){ return e + (d ? '.'+d : ''); });
        ">
    </div>

  </div>

  <!-- FILA 3: Recibido / Método -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

    <div>
      <label class="block mb-1 text-sm font-medium flex items-center gap-1">
        <i data-lucide="banknote" class="w-4 h-4 text-green-400"></i> Recibido (solo efectivo):
      </label>
      <input id="recibido" type="text" inputmode="decimal" placeholder="Ej. 700.00"
        class="w-full border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 rounded-lg
               focus:outline-none focus:ring-2 focus:ring-green-500"
        onkeydown="if(['-','+','e','E'].includes(event.key)) return false;"
        oninput="
          this.value = this.value.replace(',', '.').replace(/[^\d.]/g,'');
          if ((this.value.match(/\./g)||[]).length > 1) this.value = this.value.replace(/\.(?=.*\.)/g,'');
          this.value = this.value.replace(/^(\d*)(?:\.(\d{0,2})?).*$/, function(_, e, d){ return e + (d ? '.'+d : ''); });
        ">
      <p class="mt-1 text-xs text-slate-500" id="ayudaCambio"></p>
    </div>

    <div>
      <label class="block mb-1 text-sm font-medium flex items-center gap-1">
        <i data-lucide="credit-card" class="w-4 h-4 text-cyan-400"></i> Método de Pago:
      </label>
      <select id="metodo"
        class="w-full border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 rounded-lg
               focus:outline-none focus:ring-2 focus:ring-cyan-500">
        <option value="efectivo">Efectivo</option>
        <option value="transferencia">Transferencia</option>
        <option value="tarjeta">Tarjeta</option>
      </select>
    </div>

  </div>

</div>


`;

  swalcard
    .fire({
      title: "Registrar Pago",
      html: html,
      width: "800px",
      confirmButtonText: "Guardar pago",
      preConfirm: () => {
        const seleccionado = document.querySelector(".cliente-seleccionado");
        if (!seleccionado) {
          Swal.showValidationMessage("Selecciona un cliente");
          return false;
        }

        const inicio = document.getElementById("fecha_inicio").value;
        const fin = document.getElementById("fecha_fin").value;
        const monto = Number(document.getElementById("monto").value) || 0;
        const descuento =
          Number(document.getElementById("descuento").value) || 0;
        const metodo = document.getElementById("metodo").value;
        const recibido = Number(document.getElementById("recibido").value) || 0;

        if (!inicio || !fin) {
          Swal.showValidationMessage("Debes seleccionar ambas fechas.");
          return false;
        }
        if (new Date(inicio) >= new Date(fin)) {
          Swal.showValidationMessage(
            "La fecha de fin debe ser mayor que la de inicio."
          );
          return false;
        }
        if (monto <= 0) {
          Swal.showValidationMessage("El monto debe ser mayor a 0.");
          return false;
        }
        if (descuento < 0) {
          Swal.showValidationMessage("El descuento no puede ser negativo.");
          return false;
        }
        if (descuento > monto) {
          Swal.showValidationMessage(
            "El descuento no puede ser mayor al monto."
          );
          return false;
        }
        const total = Math.max(0, monto - descuento);

        if (metodo === "efectivo") {
          if (recibido <= 0) {
            Swal.showValidationMessage("Ingresa el efectivo recibido.");
            return false;
          }
          if (recibido < total) {
            Swal.showValidationMessage(
              `El efectivo recibido ($${recibido.toFixed(
                2
              )}) no alcanza el total ($${total.toFixed(2)}).`
            );
            return false;
          }
          const seleccionado = document.querySelector(".cliente-seleccionado");
        }

        return {
          cliente_id: Number(seleccionado.dataset.id), // <-- NUEVO
          nombre: seleccionado.dataset.nombre,
          apellido: seleccionado.dataset.apellido,
          telefono: seleccionado.dataset.telefono,
          fecha_inicio: inicio,
          fecha_fin: fin,
          monto,
          descuento,
          metodo,
          recibido: metodo === "efectivo" ? recibido : null,
        };
      },

      didOpen: () => {
        const input = document.getElementById("buscar-cliente");
        const resultado = document.getElementById("resultado-cliente");

        input.addEventListener("input", async () => {
          fetch(`../php/buscar_cliente.php?q=${input.value}`)
            .then((res) => res.json())
            .then(async (data) => {
              resultado.innerHTML = "";

              if (data.length === 0) {
                const sinResultados = document.createElement("div");
                sinResultados.className = "text-center text-gray-500 mt-4";
                sinResultados.textContent =
                  "🔍 No se encontraron coincidencias";
                resultado.appendChild(sinResultados);
                return;
              }

              for (const c of data) {
                const div = document.createElement("div");
                div.className =
                  "flex items-center gap-2 p-2 border rounded hover:bg-gray-100 cursor-pointer cliente-opcion";
                div.dataset.id = c.id;
                div.dataset.nombre = c.nombre;
                div.dataset.apellido = c.apellido;
                div.dataset.telefono = c.telefono;
                div.dataset.comentarios = c.comentarios || ""; // o c.comentario


                // log de inspección
                logImagenCliente("busqueda", c);

                // normaliza y elige mejor fuente
                let imagenMostrar = null;
                if (c.foto_icono)
                  imagenMostrar = normalizeImageInput(c.foto_icono);
                if (!imagenMostrar && c.foto)
                  imagenMostrar = await reducirImagenBase64Smart(c.foto, 80);
                if (!imagenMostrar)
                  imagenMostrar =
                    "https://cdn-icons-png.flaticon.com/512/847/847969.png";

                div.innerHTML = `
                                <img src="${imagenMostrar}" class="w-10 h-10 rounded-full object-cover border" />
                                <div>
                                    <div class="font-bold">${c.nombre} ${c.apellido}</div>
                                    <div class="text-sm text-gray-500">${c.telefono}</div>
                                </div>
                            `;

                div.onclick = async () => {
                  document
                    .querySelectorAll(".cliente-opcion")
                    .forEach((el) =>
                      el.classList.remove("cliente-seleccionado")
                    );
                  div.classList.add("cliente-seleccionado");

                  const buscarCliente =
                    document.getElementById("buscar-cliente");
                  const resultadoCliente =
                    document.getElementById("resultado-cliente");
                  buscarCliente.classList.add("hidden");

                  resultadoCliente.innerHTML = `
                                  <div class="cliente-seleccionado flex items-center gap-3 p-4 bg-gray-100 rounded-lg shadow"
                                      data-id="${div.dataset.id}" 
                                      data-nombre="${div.dataset.nombre}" 
                                      data-apellido="${div.dataset.apellido}" 
                                      data-telefono="${div.dataset.telefono}">
                                      ${div.querySelector("img").outerHTML}
                                      <div>
                                          <div class="text-lg font-bold text-gray-800">${
                                            div.dataset.nombre
                                          } ${div.dataset.apellido}</div>
                                          <div class="text-sm text-gray-600">${
                                            div.dataset.telefono
                                          }</div>
                                      </div>
                                  </div>
                                `;
                               const comentario = (div.dataset.comentarios || "").trim();

resultadoCliente.innerHTML += `
  <div class="mt-3 flex items-start gap-2 p-3 rounded-xl
              bg-slate-900/60 border border-slate-600/80">
    <i data-lucide="sticky-note" class="w-4 h-4 text-amber-300 mt-0.5"></i>
    <div class="text-sm text-slate-100 whitespace-pre-wrap">
      ${comentario ? comentario : `<span class="text-slate-400">— Sin comentario —</span>`}
    </div>
  </div>
`;
lucide.createIcons();




                  // 🔁 Aquí consultamos la última fecha pagada del cliente
                  // 🔁 Aquí consultamos la última fecha pagada del cliente
                  try {
                    const res = await fetch(
                      `../php/ultimo_pago.php?id=${div.dataset.id}`
                    );
                    const json = await res.json();

                    const fechaInput = document.getElementById("fecha_inicio");
                    if (json.success && json.ultima_fecha) {
                      fechaInput.value = json.ultima_fecha;
                    } else {
                      fechaInput.value = new Date().toISOString().slice(0, 10);
                    }
                  } catch (error) {
                    console.error(
                      "Error al obtener última fecha pagada:",
                      error
                    );
                  }

                  document
                    .getElementById("formulario-pago")
                    .classList.remove("hidden");
                  const montoInput = document.getElementById("monto");
                  const descuentoInput = document.getElementById("descuento");

                  const syncMax = () => {
                    const m = Number(montoInput.value) || 0;
                    descuentoInput.max = m;
                    if (Number(descuentoInput.value) > m) {
                      descuentoInput.value = m;
                    }
                  };

                  const $monto = document.getElementById("monto");
                  const $desc = document.getElementById("descuento");
                  const $rec = document.getElementById("recibido");
                  const $met = document.getElementById("metodo");
                  const $help = document.getElementById("ayudaCambio");

                  function totalACobrar() {
                    const m = Number($monto.value) || 0;
                    const d = Number($desc.value) || 0;
                    return Math.max(0, m - d);
                  }

                  function toggleRecibido() {
                    const esEfectivo = $met.value === "efectivo";
                    $rec.disabled = !esEfectivo;
                    $rec.placeholder = esEfectivo
                      ? "Ej. 700.00"
                      : "Solo para efectivo";
                    if (!esEfectivo) {
                      $rec.value = "";
                      $help.textContent = "";
                      return;
                    }
                    const total = totalACobrar();
                    const rec = Number($rec.value) || 0;
                    const cambio = rec - total;
                    $help.textContent =
                      total > 0
                        ? `Total: $${total.toFixed(2)}${
                            rec > 0
                              ? " | Cambio: $" + Math.max(0, cambio).toFixed(2)
                              : ""
                          }`
                        : "";
                  }

                  [$monto, $desc, $rec].forEach((el) =>
                    el.addEventListener("input", toggleRecibido)
                  );
                  $met.addEventListener("change", toggleRecibido);
                  toggleRecibido();

                  montoInput.addEventListener("input", syncMax);
                  descuentoInput.addEventListener("input", syncMax);

                  syncMax();
                };

                resultado.appendChild(div);
              }
            });
        });
        lucide.createIcons();
      },
    })
    .then((result) => {
      if (result.isConfirmed) {
        fetch("../php/registrar_pago_nombre.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.value),
        })
          .then((res) => res.json())
          .then(async (data) => {
            if (data.success) {
              const total = Math.max(
                0,
                result.value.monto - result.value.descuento
              );
              const esEfectivo = result.value.metodo === "efectivo";
              const recibido = esEfectivo
                ? Number(result.value.recibido) || 0
                : null;
              const cambio = esEfectivo ? recibido - total : null;

              const datosTicket = {
                nombre: result.value.nombre,
                apellido: result.value.apellido,
                telefono: result.value.telefono,
                fecha_inicio: result.value.fecha_inicio,
                fecha_fin: result.value.fecha_fin,
                metodo: result.value.metodo,
                monto: result.value.monto,
                descuento: result.value.descuento,
                fecha_pago: new Date().toISOString(),
                usuario: window.usuarioActual?.nombre || "Usuario desconocido",
                // NUEVO:
                recibido,
                cambio,
              };

              await generarTicketPago(datosTicket);

              if (esEfectivo) {
                await swalSuccess.fire({
                  title: "¡Pago en efectivo registrado!",
                  icon: "success",
                  width: 700,
                  backdrop: true,
                  allowOutsideClick: false,
                  html: `
      <div class="text-left text-slate-200">
        <div class="flex justify-between items-center mb-1">
          <span class="opacity-80">Total:</span>
          <strong class="text-white">$${total.toFixed(2)}</strong>
        </div>
        <div class="flex justify-between items-center mb-1">
          <span class="opacity-80">Recibido:</span>
          <strong class="text-white">$${recibido.toFixed(2)}</strong>
        </div>
      </div>

      <div class="mt-4 border-t border-slate-600 pt-4 text-center">
        <div class="text-lime-400 font-semibold tracking-wide">Cambio:</div>
        <div class="text-lime-400 font-extrabold"
             style="font-size: 40px; line-height: 1; margin-top: 6px;">
          $${Math.max(0, cambio).toFixed(2)}
        </div>
      </div>
    `,
                  customClass: {
                    popup: "bg-slate-800 text-white rounded-2xl",
                    title: "text-3xl font-bold",
                    confirmButton:
                      "bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl",
                  },
                });
              } else {
                await swalSuccess.fire("¡Éxito!", data.msg, "success");
              }

              location.reload();
            } else {
              swalError.fire(
                "Error",
                data.error || "Error desconocido",
                "error"
              );
            }
          });
      }
    });
}
async function abrirModalPagoConCliente(cliente) {
  // log de inspección (si lo tienes)
  try {
    logImagenCliente("modal_directo", cliente);
  } catch (_) {}

  // normaliza y elige mejor fuente de imagen
  let imagenMostrar = null;
  if (cliente.foto_icono)
    imagenMostrar = normalizeImageInput(cliente.foto_icono);
  if (!imagenMostrar && cliente.foto)
    imagenMostrar = await reducirImagenBase64Smart(cliente.foto, 80);
  if (!imagenMostrar)
    imagenMostrar = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
  const comentarioRaw = (cliente.comentarios || cliente.comentario || "").trim();
  const comentario = escapeHtml(comentarioRaw);

  const html = `
  <div class="relative space-y-4 text-left text-slate-200">

    <!-- INFO CLIENTE -->
    <div id="cliente-info"
      class="flex items-center gap-3 p-4 bg-slate-700 rounded-lg shadow cliente-seleccionado"
      data-id="${cliente.id}"
      data-nombre="${cliente.nombre}"
      data-apellido="${cliente.apellido}"
      data-telefono="${cliente.telefono}">
      <img src="${imagenMostrar}" class="w-10 h-10 rounded-full object-cover border" />
      <div>
        <div class="text-lg font-bold text-white">${cliente.nombre} ${cliente.apellido}</div>
        <div class="text-sm text-slate-400">${cliente.telefono}</div>
      </div>
    </div>

    <!-- FORM (contenedor relativo para overlay interno) -->
    <div id="formularioWrap" class="relative">

      <!-- Overlay para congelar el FORM (NO debe tapar authPanel) -->
      <div id="freezeForm"
        class="hidden absolute inset-0 rounded-xl z-10 pointer-events-auto"
        style="background: rgba(0,0,0,.35);">
      </div>

      <div id="formulario-pago" class="space-y-5 relative z-0">

        <!-- FILA 1: Inicio / Fin -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

          <!-- Fecha Inicio -->
          <div class="w-full">
            <label class="block mb-1 text-sm font-medium flex items-center justify-between gap-2">
              <span class="flex items-center gap-1">
                <i data-lucide="calendar-check" class="w-4 h-4 text-blue-400"></i>
                Fecha de Inicio:
              </span>

              <button id="btnUnlockInicio" type="button"
                class="hidden text-xs px-3 py-1 rounded-md bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200">
                Desbloquear
              </button>
            </label>

            <div class="relative">
              <input id="fecha_inicio" type="date"
                class="w-full border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500" />

              <!-- Overlay: SOLO cuando está bloqueado -->
              <button id="lockInicioOverlay" type="button"
                class="hidden absolute inset-0 rounded-lg"
                style="background: transparent;"
                aria-label="Desbloquear fecha inicio"></button>
            </div>

            <p id="hintInicio" class="mt-1 text-xs text-slate-500 hidden"></p>
          </div>

          <!-- Fecha Fin -->
          <div class="w-full">
            <label class="block mb-1 text-sm font-medium flex items-center gap-1">
              <i data-lucide="calendar-clock" class="w-4 h-4 text-rose-400"></i>
              Fecha de Fin:
            </label>
            <input id="fecha_fin" type="date"
              class="w-full border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-rose-500">
          </div>
        </div>

        <!-- FILA 2: Monto / Descuento -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label class="block mb-1 text-sm font-medium flex items-center gap-1">
              <i data-lucide="dollar-sign" class="w-4 h-4 text-yellow-400"></i>
              Monto Total:
            </label>
            <input id="monto" type="text" inputmode="decimal" value="0"
              class="w-full border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-yellow-500"
              onkeydown="if(['-','+','e','E'].includes(event.key)) return false;"
              oninput="
                this.value = this.value.replace(',', '.').replace(/[^\\d.]/g,'');
                if ((this.value.match(/\\./g)||[]).length > 1) this.value = this.value.replace(/\\.(?=.*\\.)/g,'');
                this.value = this.value.replace(/^(\\d*)(?:\\.(\\d{0,2})?).*$/, function(_, e, d){ return e + (d ? '.'+d : ''); });
              ">
          </div>

          <div>
            <label class="block mb-1 text-sm font-medium flex items-center gap-1">
              <i data-lucide="gift" class="w-4 h-4 text-pink-400"></i>
              Descuento:
            </label>
            <input id="descuento" type="text" inputmode="decimal" value="0"
              class="w-full border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-pink-500"
              onkeydown="if(['-','+','e','E'].includes(event.key)) return false;"
              oninput="
                this.value = this.value.replace(',', '.').replace(/[^\\d.]/g,'');
                if ((this.value.match(/\\./g)||[]).length > 1) this.value = this.value.replace(/\\.(?=.*\\.)/g,'');
                this.value = this.value.replace(/^(\\d*)(?:\\.(\\d{0,2})?).*$/, function(_, e, d){ return e + (d ? '.'+d : ''); });
              ">
          </div>

        </div>

        <!-- FILA 3: Recibido / Método -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label class="block mb-1 text-sm font-medium flex items-center gap-1">
              <i data-lucide="banknote" class="w-4 h-4 text-green-400"></i>
              Recibido (solo efectivo):
            </label>
            <input id="recibido" type="text" inputmode="decimal" placeholder="Ej. 700.00"
              class="w-full border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-green-500"
              onkeydown="if(['-','+','e','E'].includes(event.key)) return false;"
              oninput="
                this.value = this.value.replace(',', '.').replace(/[^\\d.]/g,'');
                if ((this.value.match(/\\./g)||[]).length > 1) this.value = this.value.replace(/\\.(?=.*\\.)/g,'');
                this.value = this.value.replace(/^(\\d*)(?:\\.(\\d{0,2})?).*$/, function(_, e, d){ return e + (d ? '.'+d : ''); });
              ">
            <p class="mt-1 text-xs text-slate-500" id="ayudaCambio"></p>
          </div>

          <div>
            <label class="block mb-1 text-sm font-medium flex items-center gap-1">
              <i data-lucide="credit-card" class="w-4 h-4 text-cyan-400"></i>
              Método de Pago:
            </label>
            <select id="metodo"
              class="w-full border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>

        </div>


      </div>

      <!-- PANEL AUTORIZACIÓN: encima del overlay -->
      <div id="authPanel"
        class="hidden w-full mt-4 p-4 rounded-xl border border-slate-600 bg-slate-900/90 shadow-lg relative z-20">
        <div class="flex items-center gap-2 mb-3">
          <i data-lucide="shield-check" class="w-5 h-5 text-amber-400"></i>
          <div class="text-sm font-semibold text-slate-100">Autorización requerida</div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
          <div class="md:col-span-8">
            <input id="authCode" type="password" placeholder="Código de administrador"
              class="w-full h-11 border border-slate-600 bg-slate-950 text-slate-100 px-3 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          <div class="md:col-span-4 flex gap-2">
            <button id="authValidate" type="button"
              class="flex-1 h-11 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold">
              Validar
            </button>

            <button id="authCancel" type="button"
              class="flex-1 h-11 rounded-lg bg-slate-700 hover:bg-slate-600 text-white">
              Cancelar
            </button>
          </div>
        </div>

        <p id="authMsg" class="mt-3 text-xs text-slate-400">
          Ingresa el código para desbloquear la fecha de inicio.
        </p>
      </div>

    </div>
  </div>
  <!-- COMENTARIO DEL CLIENTE -->
<div class="p-3 rounded-lg border border-slate-600 bg-slate-900/70">
  <div class="text-xs uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-2">
    <i data-lucide="message-square" class="w-4 h-4"></i>
    Comentario del cliente
  </div>
  <div class="text-sm text-slate-100 whitespace-pre-wrap">
    ${comentario ? comentario : "— Sin comentario —"}
  </div>
</div>

`;

  swalInfo
    .fire({
      title: "Registrar Pago",
      html,
      width: "800px",
      confirmButtonText: "Guardar pago",
      showCloseButton: true,

      didOpen: async () => {
        // ====== 1) cargar última fecha aplicada en Fecha Inicio ======
        let inicioOriginal = "";
        try {
          const res = await fetch(`../php/ultimo_pago.php?id=${cliente.id}`);
          const json = await res.json();
          const hoy = new Date().toISOString().slice(0, 10);
          const fechaInput = document.getElementById("fecha_inicio");

          if (json.success && json.ultima_fecha) {
            fechaInput.value = json.ultima_fecha;
            inicioOriginal = json.ultima_fecha;
          } else {
            fechaInput.value = hoy;
            inicioOriginal = hoy;
          }
        } catch (e) {
          const hoy = new Date().toISOString().slice(0, 10);
          const fechaInput = document.getElementById("fecha_inicio");
          if (fechaInput) fechaInput.value = hoy;
          inicioOriginal = hoy;
        }

        const tipoUsuario = window.usuarioActual?.tipo; // "admin" | "root" | "worker"
        const $inicio = document.getElementById("fecha_inicio");
        const $btnUnlock = document.getElementById("btnUnlockInicio");
        const $overlay = document.getElementById("lockInicioOverlay");
        const $hint = document.getElementById("hintInicio");

        let inicioAutorizado =
          tipoUsuario === "admin" || tipoUsuario === "root";

        function aplicarEstadoInicio() {
          if (!$inicio) return;

          if (inicioAutorizado) {
            $inicio.readOnly = false;

            $btnUnlock?.classList.add("hidden");
            $btnUnlock && ($btnUnlock.disabled = true);

            $overlay?.classList.add("hidden");
            $overlay && ($overlay.disabled = true);

            document.getElementById("authPanel")?.classList.add("hidden");
            document.getElementById("freezeForm")?.classList.add("hidden");
          } else {
            $inicio.readOnly = true;
            $inicio.classList.add("opacity-60");

            if ($btnUnlock) {
              $btnUnlock.classList.remove("hidden");
              $btnUnlock.disabled = false;
              $btnUnlock.classList.remove("pointer-events-none", "opacity-50");
            }

            $overlay?.classList.remove("hidden");

            if ($hint) {
              $hint.classList.remove("hidden");
              $hint.textContent =
                "Worker: requiere código para modificar la fecha de inicio.";
            }
          }
        }

        aplicarEstadoInicio();

        // ====== 2) Panel interno de autorización (SIN otro swal) ======
        const $authPanel = document.getElementById("authPanel");
        const $freeze = document.getElementById("freezeForm");
        const $code = document.getElementById("authCode");
        const $btnVal = document.getElementById("authValidate");
        const $btnCan = document.getElementById("authCancel");
        const $msg = document.getElementById("authMsg");

        function abrirPanelAuth() {
          // ✅ si ya está autorizado, no hacer nada
          if (inicioAutorizado) return;

          $authPanel?.classList.remove("hidden");
          $freeze?.classList.remove("hidden");
          if ($authPanel) $authPanel.style.zIndex = "20";
          if ($freeze) $freeze.style.zIndex = "10";
          if ($msg)
            $msg.textContent =
              "Ingresa el código para desbloquear la fecha de inicio.";
          if ($code) $code.value = "";
          setTimeout(() => $code?.focus(), 0);
        }

        function cerrarPanelAuth() {
          $authPanel?.classList.add("hidden");
          $freeze?.classList.add("hidden");
          if ($msg) $msg.textContent = "";
        }

        async function validarCodigoInterno() {
          const codigo = ($code?.value || "").trim();
          if (!codigo) {
            if ($msg) $msg.textContent = "Debes ingresar un código.";
            return;
          }

          if ($btnVal) {
            $btnVal.disabled = true;
            $btnVal.classList.add("opacity-70");
          }
          if ($msg) $msg.textContent = "Validando...";

          try {
            const res = await fetch("../php/validar_codigo_admin.php", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ codigo }),
            });
            const j = await res.json();

            if (!j.success) {
              if ($msg) $msg.textContent = "Código inválido o no autorizado.";
              return;
            }

            inicioAutorizado = true;
            aplicarEstadoInicio();
            cerrarPanelAuth();

            // ✅ por seguridad: si existe, fuerza ocultar overlay
            $overlay?.classList.add("hidden");

            // ✅ opcional: enfoca el input y abre selector
            $inicio?.focus();
            $inicio?.showPicker?.();
          } catch (e) {
            if ($msg) $msg.textContent = "Error al validar. Intenta de nuevo.";
          } finally {
            if ($btnVal) {
              $btnVal.disabled = false;
              $btnVal.classList.remove("opacity-70");
            }
          }
        }

        // click en desbloquear (botón o overlay)
        $btnUnlock?.addEventListener("click", abrirPanelAuth);
        $overlay?.addEventListener("click", abrirPanelAuth);

        $btnVal?.addEventListener("click", validarCodigoInterno);
        $btnCan?.addEventListener("click", cerrarPanelAuth);
        $code?.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") validarCodigoInterno();
          if (ev.key === "Escape") cerrarPanelAuth();
        });

        // ====== 3) Cambio / total ======
        const $monto = document.getElementById("monto");
        const $desc = document.getElementById("descuento");
        const $rec = document.getElementById("recibido");
        const $met = document.getElementById("metodo");
        const $help = document.getElementById("ayudaCambio");

        function totalACobrar() {
          return Math.max(
            0,
            (Number($monto.value) || 0) - (Number($desc.value) || 0)
          );
        }

        function toggleRecibido() {
          const esEfectivo = $met.value === "efectivo";
          $rec.disabled = !esEfectivo;
          $rec.placeholder = esEfectivo ? "Ej. 700.00" : "Solo para efectivo";

          if (!esEfectivo) {
            $rec.value = "";
            $help.textContent = "";
            return;
          }

          const total = totalACobrar();
          const recNum = Number($rec.value) || 0;
          const cambio = recNum - total;

          $help.textContent =
            total > 0
              ? `Total: $${total.toFixed(2)}${
                  recNum > 0
                    ? " | Cambio: $" + Math.max(0, cambio).toFixed(2)
                    : ""
                }`
              : "";
        }

        [$monto, $desc, $rec].forEach((el) =>
          el.addEventListener("input", toggleRecibido)
        );
        $met.addEventListener("change", toggleRecibido);
        toggleRecibido();

        // (Opcional) guarda referencia si quieres “blindar” inicio
        window.__pagoInicioOriginal = inicioOriginal;
        window.__pagoInicioAutorizado = inicioAutorizado;

        // icons
        lucide.createIcons();
      },

      preConfirm: () => {
        const inicio = document.getElementById("fecha_inicio").value;
        const fin = document.getElementById("fecha_fin").value;
        const monto = Number(document.getElementById("monto").value) || 0;
        const descuento =
          Number(document.getElementById("descuento").value) || 0;
        const metodo = document.getElementById("metodo").value;
        const recibido =
          Number(document.getElementById("recibido")?.value) || 0;

        if (!inicio || !fin) {
          Swal.showValidationMessage("Debes seleccionar ambas fechas.");
          return false;
        }
        if (new Date(inicio) >= new Date(fin)) {
          Swal.showValidationMessage(
            "La fecha de fin debe ser mayor que la de inicio."
          );
          return false;
        }
        if (monto <= 0) {
          Swal.showValidationMessage("El monto debe ser mayor a 0.");
          return false;
        }
        if (descuento < 0) {
          Swal.showValidationMessage("El descuento no puede ser negativo.");
          return false;
        }
        if (descuento > monto) {
          Swal.showValidationMessage(
            "El descuento no puede ser mayor al monto."
          );
          return false;
        }

        const total = Math.max(0, monto - descuento);
        if (metodo === "efectivo") {
          if (recibido <= 0) {
            Swal.showValidationMessage("Ingresa el efectivo recibido.");
            return false;
          }
          if (recibido < total) {
            Swal.showValidationMessage(
              `El efectivo recibido ($${recibido.toFixed(
                2
              )}) no alcanza el total ($${total.toFixed(2)}).`
            );
            return false;
          }
        }

        return {
          cliente_id: Number(cliente.id),
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          telefono: cliente.telefono,
          fecha_inicio: inicio,
          fecha_fin: fin,
          monto,
          descuento,
          metodo,
          recibido: metodo === "efectivo" ? recibido : null,
        };
      },
    })
    .then((result) => {
      if (!result.isConfirmed) return;

      fetch("../php/registrar_pago_nombre.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.value),
      })
        .then((res) => res.json())
        .then(async (data) => {
          if (!data.success) {
            swalError.fire("Error", data.error || "Error desconocido", "error");
            return;
          }

          const total = Math.max(
            0,
            result.value.monto - result.value.descuento
          );
          const esEfectivo = result.value.metodo === "efectivo";
          const recibido = esEfectivo
            ? Number(result.value.recibido) || 0
            : null;
          const cambio = esEfectivo ? recibido - total : null;

          const datosTicket = {
            nombre: result.value.nombre,
            apellido: result.value.apellido,
            telefono: result.value.telefono,
            fecha_inicio: result.value.fecha_inicio,
            fecha_fin: result.value.fecha_fin,
            metodo: result.value.metodo,
            monto: result.value.monto,
            descuento: result.value.descuento,
            fecha_pago: new Date().toISOString(),
            usuario: window.usuarioActual?.nombre || "Usuario desconocido",
            recibido,
            cambio,
          };

          await generarTicketPago(datosTicket);

          if (esEfectivo) {
            await swalSuccess.fire({
              title: "¡Pago en efectivo registrado!",
              icon: "success",
              width: 700,
              backdrop: true,
              allowOutsideClick: false,
              html: `
              <div class="text-left text-slate-200">
                <div class="flex justify-between items-center mb-1">
                  <span class="opacity-80">Total:</span>
                  <strong class="text-white">$${total.toFixed(2)}</strong>
                </div>
                <div class="flex justify-between items-center mb-1">
                  <span class="opacity-80">Recibido:</span>
                  <strong class="text-white">$${(recibido || 0).toFixed(
                    2
                  )}</strong>
                </div>
              </div>

              <div class="mt-4 border-t border-slate-600 pt-4 text-center">
                <div class="text-lime-400 font-semibold tracking-wide">Cambio:</div>
                <div class="text-lime-400 font-extrabold"
                     style="font-size: 40px; line-height: 1; margin-top: 6px;">
                  $${Math.max(0, cambio).toFixed(2)}
                </div>
              </div>
            `,
              customClass: {
                popup: "bg-slate-800 text-white rounded-2xl",
                title: "text-3xl font-bold",
                confirmButton:
                  "bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl",
              },
            });
          } else {
            await swalSuccess.fire("¡Éxito!", data.msg, "success");
          }

          location.reload();
        })
        .catch(() =>
          swalError.fire(
            "Error",
            "No se pudo conectar con el servidor",
            "error"
          )
        );
    });
}

async function abrirModalPagoCliente(clienteId) {
  const res = await fetch(`../php/buscar_cliente_id.php?id=${clienteId}`);
  const cliente = await res.json();

  if (!cliente || !cliente.success) {
    swalError.fire(
      "Error",
      cliente.error || "No se pudo cargar el cliente",
      "error"
    );
    return;
  }

  const datos = cliente.data;

  // Simular el mismo comportamiento del modal normal, pero con cliente preseleccionado
  abrirModalPagoConCliente(datos);
}

function eliminarPago(idPago, clienteId, nombreCompleto) {
  console.log("DELETE pago ->", { idPago, clienteId });
  const tipoUsuario = window.usuarioActual?.tipo;

  const confirmarYBorrar = () => {
    fetch(`../php/eliminar_pago.php?id=${idPago}&cliente=${clienteId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          swalSuccess
            .fire("Eliminado", data.msg, "success")
            .then(() => verPagos(clienteId, nombreCompleto));
          buscarClientes(ultimaBusqueda, paginaActualClientes); // reutiliza el mismo nombre
        } else {
          swalError.fire("Error", data.error || "No se pudo eliminar", "error");
        }
      })
      .catch(() =>
        swalError.fire("Error", "No se pudo conectar con el servidor", "error")
      );
  };

  if (tipoUsuario === "admin" || tipoUsuario === "root") {
    swalInfo
      .fire({
        title: "¿Eliminar este pago?",
        text: "Esta acción actualizará también la fecha de acceso del cliente si era el último pago.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      })
      .then((c) => {
        if (c.isConfirmed) confirmarYBorrar();
      });
    return;
  }

  // Validación de código para worker
  swalInfo
    .fire({
      title: "Ingrese código de administrador",
      input: "password",
      inputPlaceholder: "Código...",
      showCancelButton: true,
      confirmButtonText: "Validar",
      preConfirm: (codigo) => {
        if (!codigo) {
          swalError.showValidationMessage("Debes ingresar un código");
          return false;
        }
        return fetch("../php/validar_codigo_admin.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigo }),
        })
          .then((r) => r.json())
          .then((j) => {
            if (!j.success) throw new Error("Código inválido o no autorizado");
          });
      },
    })
    .then((r) => {
      if (r.isConfirmed) {
        swalInfo
          .fire({
            title: "¿Eliminar este pago?",
            text: "Esta acción actualizará también la fecha de acceso del cliente si era el último pago.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
          })
          .then((c) => {
            if (c.isConfirmed) confirmarYBorrar();
          });
      }
    });
}

function verPagos(clienteId, nombreCompleto) {
  fetch(`../php/historial_pagos.php?id=${clienteId}`)
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        swalError.fire(
          "Error",
          data.error || "No se pudo cargar el historial",
          "error"
        );
        return;
      }

      const pagos = Array.isArray(data.pagos) ? data.pagos : [];
      // Ordenamos por fecha de pago descendente por seguridad (si no viene desde PHP)
      pagos.sort((a, b) => {
        const A = (a.fecha_pago || "").replace(" ", "T");
        const B = (b.fecha_pago || "").replace(" ", "T");
        return B.localeCompare(A);
      });

      // UI del modal
      const hoy = new Date();
      const anioActual = hoy.getFullYear();
      const mesActual = (hoy.getMonth() + 1).toString().padStart(2, "0");

      const html = `
      <div class="space-y-4 text-sm text-gray-200 text-left">
        <!-- Filtros Mes/Año -->
        <div class="flex flex-col md:flex-row gap-3 items-start md:items-end">
          <div>
            <label class="block mb-1 text-xs uppercase tracking-wide text-slate-400">Mes</label>
            <select id="filtroMes" class="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white">
              ${[...Array(12)]
                .map((_, i) => {
                  const m = (i + 1).toString().padStart(2, "0");
                  const nombre = nombreMes(i + 1);
                  return `<option value="${m}" ${
                    m === mesActual ? "selected" : ""
                  }>${m} - ${nombre}</option>`;
                })
                .join("")}
            </select>
          </div>
          <div>
            <label class="block mb-1 text-xs uppercase tracking-wide text-slate-400">Año</label>
            <select id="filtroAnio" class="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white">
              ${opcionesAnios(pagos, anioActual)}
            </select>
          </div>
          <button id="btnAplicarFiltro" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md">
            Aplicar filtro
          </button>
          <span id="badgeConteo" class="ml-auto text-xs px-2 py-1 rounded bg-slate-700 border border-slate-600"></span>
        </div>

        <!-- Contenedor lista -->
        <div id="listaPagos" class="space-y-3"></div>

        <!-- Botón ver más/menos -->
        <div class="flex justify-center">
          <button id="btnToggleMas" class="hidden bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md">
            Ver más
          </button>
        </div>
      </div>`;

      swalcard.fire({
        title: `Historial de pagos de ${nombreCompleto}`,
        html,
        width: "700px",
        confirmButtonText: "Cerrar",
        showCloseButton: true,
        didOpen: () => {
          lucide.createIcons();

          const $mes = document.getElementById("filtroMes");
          const $anio = document.getElementById("filtroAnio");
          const $apli = document.getElementById("btnAplicarFiltro");
          const $lista = document.getElementById("listaPagos");
          const $toggle = document.getElementById("btnToggleMas");
          const $badge = document.getElementById("badgeConteo");

          // Estado local
          let colapsado = true;
          let pagosVisibles = [...pagos]; // por defecto, todos (sin filtro)

          // Render inicial (muestra 3 + botón ver más)
          renderListaPagos(
            $lista,
            pagosVisibles,
            colapsado,
            clienteId,
            nombreCompleto
          );
          actualizarToggle($toggle, pagosVisibles, colapsado);
          actualizarBadge($badge, pagosVisibles);

          // Eventos
          $apli.addEventListener("click", () => {
            const m = $mes.value; // "01"..."12"
            const y = $anio.value; // "2024"...
            pagosVisibles = filtrarPorMesAnio(pagos, m, y);
            colapsado = true;
            renderListaPagos(
              $lista,
              pagosVisibles,
              colapsado,
              clienteId,
              nombreCompleto
            );
            actualizarToggle($toggle, pagosVisibles, colapsado);
            actualizarBadge($badge, pagosVisibles);
          });

          $toggle.addEventListener("click", () => {
            colapsado = !colapsado;
            renderListaPagos(
              $lista,
              pagosVisibles,
              colapsado,
              clienteId,
              nombreCompleto
            );
            actualizarToggle($toggle, pagosVisibles, colapsado);
          });
          document.getElementById("btnAplicarFiltro").click();
        },
      });
    })
    .catch(() => {
      swalError.fire("Error", "No se pudo conectar con el servidor", "error");
    });
}

function nombreMes(num) {
  const nombres = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return nombres[num - 1];
}

async function generarTicketPago(data) {
  if (!window.jspdf) {
    await import(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
    );
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [58, 170],
  });

  const logoSrc = await obtenerLogoMarca();
const logo = await cargarImagenBase64(logoSrc);


  const fechaPago = new Date(data.fecha_pago);
  const fecha = fechaPago.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hora = fechaPago.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const usuario = data.usuario || "Usuario desconocido";

  doc.addImage(logo, "PNG", 19, 5, 20, 20);
  doc.setFont("courier", "bold");
  doc.setFontSize(10);
  doc.text("Pago Registrado", 29, 30, { align: "center" });

  doc.setFont("courier", "normal");
  doc.text(`${fecha} ${hora}`, 29, 35, { align: "center" });
  doc.text(`Usuario: ${usuario}`, 29, 40, { align: "center" });

  doc.setLineWidth(0.2);
  doc.line(5, 42, 53, 42);

  let y = 49;
  const salto = 6;
  const nombreCompleto = `${data.nombre} ${data.apellido}`;
  const descuento = parseFloat(data.descuento || 0);
  const montoOriginal = parseFloat(data.monto);
  const totalPagado = (montoOriginal - descuento).toFixed(2);

  doc.setFont("courier", "bold");
  doc.text("Nombre:", 5, y);
  doc.setFont("courier", "normal");
  doc.text(nombreCompleto, 5, (y += salto));

  doc.setFont("courier", "bold");
  doc.text("Inicio:", 5, (y += salto));
  doc.setFont("courier", "normal");
  doc.text(data.fecha_inicio, 5, (y += salto));

  doc.setFont("courier", "bold");
  doc.text("Fin:", 5, (y += salto));
  doc.setFont("courier", "normal");
  doc.text(data.fecha_fin, 5, (y += salto));

  doc.setFont("courier", "bold");
  doc.text("Método:", 5, (y += salto));
  doc.setFont("courier", "normal");
  doc.text(data.metodo, 5, (y += salto));

  doc.setFont("courier", "bold");
  doc.text("Monto original:", 5, (y += salto));
  doc.setFont("courier", "normal");
  doc.text(`$${montoOriginal.toFixed(2)}`, 5, (y += salto));

  if (descuento > 0) {
    doc.setFont("courier", "bold");
    doc.text("Descuento:", 5, (y += salto));
    doc.setFont("courier", "normal");
    doc.text(`-$${descuento.toFixed(2)}`, 5, (y += salto));
  }

  doc.setFont("courier", "bold");
  doc.text("Total pagado:", 5, (y += salto));
  doc.setFont("courier", "normal");
  doc.text(`$${totalPagado}`, 5, (y += salto));

  doc.line(5, y + 4, 53, y + 4);
  y += 10;

  doc.setFont("courier", "bold");
  doc.text("Horarios de Atención:", 29, y, { align: "center" });
  doc.setFont("courier", "normal");
  doc.text("Lunes a Viernes:", 29, (y += 5), { align: "center" });
  doc.text("6:00 a.m. - 10:00 p.m.", 29, (y += 4), { align: "center" });
  doc.text("Sábados:", 29, (y += 4), { align: "center" });
  doc.text("7:00 a.m. - 2:00 p.m.", 29, (y += 4), { align: "center" });

  doc.setFont("courier", "bold");
  doc.text("Síguenos en redes:", 29, (y += 8), { align: "center" });
  doc.setFont("courier", "normal");
  doc.text("@BBSNetworks", 29, (y += 4), { align: "center" });

  doc.setFont("courier", "italic");
  doc.text("¡Gracias por tu pago!", 29, (y += 8), { align: "center" });

  const blobUrl = doc.output("bloburl");
  window.open(blobUrl, "_blank");
  doc.autoPrint();
}

// Cargar imagen como base64
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

/* ========= Helpers ========= */
// Obtén AAAA y MM directo de la cadena "YYYY-MM-DD HH:MM:SS"
function getY_M_fromFechaPago(fechaPagoStr) {
  if (!fechaPagoStr || typeof fechaPagoStr !== "string")
    return { y: "", m: "" };
  // Normal: "2025-06-13 14:57:20" ó "2025-06-13"
  const y = fechaPagoStr.slice(0, 4);
  const m = fechaPagoStr.slice(5, 7);
  return { y, m };
}
// Fecha robusta: intenta YYYY-MM-DD HH:MM:SS, o YYYY-MM-DD
function parseFechaSeguro(str) {
  if (!str) return new Date(0);
  // normaliza a ISO si trae espacio
  const iso = str.includes(" ") ? str.replace(" ", "T") : str;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

// Filtra por mes/año usando fecha_pago por cadena (sin Date())
function filtrarPorMesAnio(pagos, mes2d, anio4d) {
  return pagos.filter((p) => {
    const { y, m } = getY_M_fromFechaPago(p.fecha_pago || "");
    return m === mes2d && y === anio4d;
  });
}

// Opciones de años en base a fecha_pago (por cadena)
function opcionesAnios(pagos, anioActual) {
  let minY = anioActual,
    maxY = anioActual;
  pagos.forEach((p) => {
    const { y } = getY_M_fromFechaPago(p.fecha_pago || "");
    const yi = parseInt(y, 10);
    if (!isNaN(yi)) {
      if (yi < minY) minY = yi;
      if (yi > maxY) maxY = yi;
    }
  });
  const inicio = Math.min(minY, anioActual - 5);
  const fin = Math.max(maxY, anioActual + 1);
  let opts = "";
  for (let y = fin; y >= inicio; y--) {
    opts += `<option value="${y}" ${
      y === anioActual ? "selected" : ""
    }>${y}</option>`;
  }
  return opts;
}

function actualizarToggle($btn, arr, colapsado) {
  if (arr.length <= 3) {
    $btn.classList.add("hidden");
    return;
  }
  $btn.classList.remove("hidden");
  $btn.textContent = colapsado ? "Ver más" : "Mostrar menos";
}

function actualizarBadge($badge, arr) {
  $badge.textContent = `Registros: ${arr.length}`;
}

// Pinta tarjetas de pago (colapsado=true => solo 3)
function renderListaPagos(
  $contenedor,
  pagos,
  colapsado,
  clienteId,
  nombreCompleto
) {
  const lista = colapsado ? pagos.slice(0, 3) : pagos;
  if (!lista.length) {
    $contenedor.innerHTML = `
      <div class="p-4 rounded bg-slate-800/80 border border-slate-600 text-center text-slate-300">
        No hay pagos para el filtro seleccionado.
      </div>`;
    return;
  }

  $contenedor.innerHTML = lista
    .map((pago) => renderCardPago(pago, clienteId, nombreCompleto))
    .join("");
  lucide.createIcons(); // re-render icons
}

function renderCardPago(pago, clienteId, nombreCompleto) {
  // 1) Asegura que tengamos el ID del pago (tolerante a distintos nombres)
  const idPago = pago.id ?? pago.idpago ?? pago.id_pago ?? pago.ID ?? pago.Id;

  // 2) Nombre seguro para inyectar en el onclick
  const safeNombre = (nombreCompleto || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");

  const montoOriginal = parseFloat(pago.monto || 0);
  const descuento = parseFloat(pago.descuento || 0);
  const totalCobrado = (montoOriginal - descuento).toFixed(2);
  const usuario = pago.usuario_nombre || "Usuario desconocido";

  // Si no hay idPago, evita romper el onclick y muestra aviso
  const puedeEliminar = Number.isFinite(Number(idPago));

  return `
<div class="bg-slate-800/80 p-4 rounded-lg shadow border border-slate-600">
  <div class="text-base font-semibold text-sky-400 mb-2 flex items-center gap-2">
    <i data-lucide="check-circle" class="w-5 h-5 text-green-400"></i>
    Pago realizado el: <span class="font-bold text-white">${
      pago.fecha_pago
    }</span>
  </div>
  <div class="mb-1 text-slate-300 text-sm flex items-center gap-2">
    <i data-lucide="user-circle" class="w-4 h-4 text-purple-400"></i>
    Registrado por: <strong class="text-white">${usuario}</strong>
  </div>
  <div class="mb-1 text-sm flex items-center gap-2 text-slate-300">
    <i data-lucide="calendar-check" class="w-4 h-4 text-blue-400"></i>
    <strong class="text-white">Fecha aplicada:</strong> ${pago.fecha_aplicada}
  </div>
  <div class="mb-1 text-sm flex items-center gap-2 text-slate-300">
    <i data-lucide="calendar-clock" class="w-4 h-4 text-rose-400"></i>
    <strong class="text-white">Válido hasta:</strong> ${pago.valido_hasta}
  </div>
  <div class="mb-1 text-sm flex items-center gap-2 text-slate-300">
    <i data-lucide="dollar-sign" class="w-4 h-4 text-yellow-400"></i>
    <strong class="text-white">Monto original:</strong> $${montoOriginal.toFixed(
      2
    )}
  </div>
  <div class="mb-1 text-sm flex items-center gap-2 text-slate-300">
    <i data-lucide="gift" class="w-4 h-4 text-pink-400"></i>
    <strong class="text-white">Descuento:</strong> $${descuento.toFixed(2)}
  </div>
  <div class="mb-3 text-sm font-semibold text-lime-400 flex items-center gap-2">
    <i data-lucide="badge-dollar-sign" class="w-4 h-4"></i>
    Total cobrado: $${totalCobrado}
  </div>

  <div class="flex gap-2">
    <button onclick='generarTicketPago({
      nombre: "${safeNombre.split(" ")[0] || ""}",
      apellido: "${safeNombre.split(" ").slice(1).join(" ")}",
      telefono: "${pago.telefono || ""}",
      fecha_inicio: "${pago.fecha_aplicada}",
      fecha_fin: "${pago.valido_hasta}",
      metodo: "${pago.metodo}",
      monto: ${montoOriginal},
      descuento: ${descuento},
      fecha_pago: "${pago.fecha_pago}",
      usuario: "${usuario}"
    })'
    class="mt-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1">
      <i data-lucide="printer" class="w-4 h-4"></i> Ticket
    </button>

    ${
      puedeEliminar
        ? `<button onclick="eliminarPago(${Number(idPago)}, ${Number(
            clienteId
          )}, '${safeNombre}')"
             class="mt-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1">
             <i data-lucide="trash-2" class="w-4 h-4"></i> Eliminar
           </button>`
        : `<span class="mt-1 text-xs text-slate-400">ID no disponible</span>`
    }
  </div>
</div>`;
}

function nombreMes(num) {
  const nombres = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return nombres[num - 1];
}
function normalizeImageInput(value, mimeFallback = "image/jpeg") {
  if (!value) return null;

  // Si ya es una URL http(s) normal, úsala tal cual
  if (/^https?:\/\//i.test(value)) return value;

  // Si ya parece dataURL, respétala
  if (looksLikeDataURL(value)) return value;

  // Si es una cadena base64 "pelona", agrégale prefijo
  // Validamos: solo caracteres base64 + '='
  if (/^[a-zA-Z0-9+/=\s]+$/.test(value)) {
    const clean = value.replace(/\s+/g, ""); // por si viene con saltos
    return `data:${mimeFallback};base64,${clean}`;
  }

  // Cualquier otra cosa: mejor retornar null
  return null;
}
async function reducirImagenBase64Smart(value, maxSize = 80) {
  return new Promise((resolve) => {
    const src =
      normalizeImageInput(value) ||
      "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg"));
    };
    img.onerror = () => {
      console.warn("Imagen corrupta o incompleta, usando imagen default.");
      resolve("https://cdn-icons-png.flaticon.com/512/847/847969.png");
    };
    img.src = src;
  });
}
async function obtenerLogoMarca() {
  try {
    const res = await fetch("../php/obtener_logo.php");
    const json = await res.json();

    if (json.success && json.base64) {
      return json.base64; // data:image/...;base64,...
    }
  } catch (e) {
    console.warn("No se pudo cargar el logo desde BD:", e);
  }

  // Fallback si algo falla
  return "../img/logo-black.webp";
}
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
