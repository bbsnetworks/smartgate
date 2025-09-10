// ../js/importar.js
let clientesCargados = [];
let formDataImportacion = null;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formImportarClientes");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault(); // Evita recargar la página

    const archivo = document.getElementById("archivoExcel")?.files?.[0];
    if (!archivo) {
      Swal.fire("Archivo requerido", "Selecciona un archivo Excel para importar.", "warning");
      return;
    }

    formDataImportacion = new FormData();
    formDataImportacion.append("archivoExcel", archivo);

    Swal.fire({
      title: "Importando clientes...",
      text: "Por favor espera",
      allowOutsideClick: false,
      background: "#1e293b",
      color: "#f8fafc",
      didOpen: () => Swal.showLoading(),
    });

    try {
      const response = await fetch("../php/importar.php", {
        method: "POST",
        body: formDataImportacion
      });

      // Intenta leer JSON incluso si el header no viene perfecto
      const ct = response.headers.get("content-type") || "";
      const resultado = ct.includes("application/json")
        ? await response.json()
        : JSON.parse(await response.text());

      if (!response.ok || resultado.error) {
        throw new Error(resultado.error || "Hubo un problema al importar.");
      }

      clientesCargados = Array.isArray(resultado.clientes) ? resultado.clientes : [];
      renderizarTabla(clientesCargados);     // <- Render vista previa
      renderBotonGuardar();                  // <- Botón "Guardar clientes"
      Swal.fire("¡Éxito!", "Archivo importado. Revisa la vista previa y guarda si todo está bien.", "success");
    } catch (error) {
      console.error("Error de importación:", error);
      Swal.fire("Error", error.message || "No se pudo conectar con el servidor.", "error");
    }
  });
});

/** Renderiza la tabla de vista previa en #tablaPreview */
function renderizarTabla(clientes) {
  const container = document.getElementById("tablaPreview");
  if (!container) return;

  if (!clientes?.length) {
    container.innerHTML = `<div class="text-slate-400 mt-6">No se encontraron registros en el archivo.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto mt-6 rounded-xl border border-slate-700">
      <table class="min-w-full text-sm text-slate-200 bg-slate-900">
        <thead class="bg-slate-700/60">
          <tr class="text-left">
            <th class="px-3 py-2 border-b border-slate-700">Foto</th>
            <th class="px-3 py-2 border-b border-slate-700">Código</th>
            <th class="px-3 py-2 border-b border-slate-700">Nombre</th>
            <th class="px-3 py-2 border-b border-slate-700">Apellido</th>
            <th class="px-3 py-2 border-b border-slate-700">Género</th>
            <th class="px-3 py-2 border-b border-slate-700">PersonID</th>
            <th class="px-3 py-2 border-b border-slate-700">Teléfono</th>
            <th class="px-3 py-2 border-b border-slate-700">Email</th>
            <th class="px-3 py-2 border-b border-slate-700">Organización</th>
          </tr>
        </thead>
        <tbody>
          ${
            clientes.map(c => {
              const foto = c.face_icon
                ? `<img src="${c.face_icon}" alt="foto" class="h-12 w-12 rounded-md object-cover border border-slate-700" />`
                : `<div class="h-12 w-12 flex items-center justify-center bg-slate-700/50 text-xs text-slate-300 rounded-md">Sin foto</div>`;
              return `
                <tr class="hover:bg-slate-800/50">
                  <td class="px-3 py-2 border-b border-slate-800">${foto}</td>
                  <td class="px-3 py-2 border-b border-slate-800">${safe(c.personCode)}</td>
                  <td class="px-3 py-2 border-b border-slate-800">${safe(c.nombre)}</td>
                  <td class="px-3 py-2 border-b border-slate-800">${safe(c.apellido)}</td>
                  <td class="px-3 py-2 border-b border-slate-800">${safe(c.genero)}</td>
                  <td class="px-3 py-2 border-b border-slate-800">${c.data ?? "-"}</td>
                  <td class="px-3 py-2 border-b border-slate-800">${safe(c.telefono || "-")}</td>
                  <td class="px-3 py-2 border-b border-slate-800">${safe(c.email || "-")}</td>
                  <td class="px-3 py-2 border-b border-slate-800">${safe(c.orgIndexCode || "-")}</td>
                </tr>
              `;
            }).join("")
          }
        </tbody>
      </table>
    </div>
  `;
}

/** Inserta el botón "Guardar clientes" después de la tabla (solo aparece tras cargar datos) */
function renderBotonGuardar() {
  const container = document.getElementById("tablaPreview");
  if (!container) return;

  // Elimina botón previo si re-importas
  document.getElementById("wrapGuardarClientes")?.remove();

  const wrap = document.createElement("div");
  wrap.id = "wrapGuardarClientes";
  wrap.className = "text-center mt-4 flex flex-col items-center gap-3";

  const total = clientesCargados.length;
  const conPersonId = clientesCargados.filter(c => Number(c.data) > 0).length;

  const stats = document.createElement("div");
  stats.className = "text-slate-300 text-sm";
  stats.innerHTML = `Total: <b>${total}</b> &nbsp;|&nbsp; Con personId: <b>${conPersonId}</b>`;

  const btn = document.createElement("button");
  btn.id = "btnGuardarClientes";
  btn.className = "bg-blue-600 hover:bg-blue-700 transition px-5 py-2 rounded-lg text-white font-medium shadow disabled:opacity-60";
  btn.textContent = "💾 Guardar clientes";

  const rol = getRol();
  if (rol !== "root") {
     btn.disabled = true;
     btn.title = "Sólo usuarios root pueden guardar en la base de datos.";
   }

  btn.addEventListener("click", guardarRegistros);

  wrap.appendChild(stats);
  wrap.appendChild(btn);
  container.appendChild(wrap);
}

/** Envía clientesCargados a ../php/guardar_clientes.php */
async function guardarRegistros() {
  const rol = getRol();
if (rol !== 'root') {
  Swal.fire("Permiso denegado", "Sólo usuarios root pueden guardar en la base de datos.", "error");
  return;
}


  if (!clientesCargados.length) {
    Swal.fire("Nada que guardar", "Primero importa un archivo con clientes.", "info");
    return;
  }

  const boton = document.getElementById("btnGuardarClientes");
  if (!boton) return;

  boton.disabled = true;
  const textoOriginal = boton.innerHTML;
  boton.innerHTML = `<span class="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2 align-[-2px]"></span> Guardando...`;

  try {
    const res = await fetch("../php/guardar_clientes.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Tu PHP espera un ARRAY (no {clientes: [...]})
      body: JSON.stringify(clientesCargados)
    });

    const ct = res.headers.get("content-type") || "";
    const responseJson = ct.includes("application/json")
      ? await res.json()
      : JSON.parse(await res.text());

    if (!res.ok) {
      throw new Error(responseJson.error || "Error al guardar.");
    }

    Swal.fire("Resultado", responseJson.msg || "Registros guardados", "success");
  } catch (err) {
    console.error(err);
    Swal.fire("Error", err.message || "No se pudieron guardar los registros.", "error");
  } finally {
    boton.disabled = (tipo !== "root");
    boton.innerHTML = textoOriginal;
  }
}

/** Helpers */
function safe(v) {
  if (v === null || v === undefined) return "";
  return String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function getRol() {
  return String(window.tipoUsuario || window.rolUsuario || '').toLowerCase();
}


