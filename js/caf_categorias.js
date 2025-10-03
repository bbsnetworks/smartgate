const API = "../php/categorias_caf_controller.php";

const tbody = document.getElementById("tbodyCats");
const lblResumen = document.getElementById("lblResumen");
const lblPagina = document.getElementById("lblPagina");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");

const q = document.getElementById("q");
const filtroActivo = document.getElementById("filtroActivo");
const btnNuevo = document.getElementById("btnNuevo");

const modal = document.getElementById("modal");
const btnClose = document.getElementById("btnClose");
const btnCancelar = document.getElementById("btnCancelar");
const formCat = document.getElementById("formCat");

const modalTitle = document.getElementById("modalTitle");
const cat_id = document.getElementById("cat_id");
const nombre = document.getElementById("nombre");
const orden = document.getElementById("orden");
const activo = document.getElementById("activo");

let paginaActual = 1;
const limit = 10;
let totalRegistros = 0;

document.addEventListener("DOMContentLoaded", () => {
  cargarCategorias();
  bindUI();
});

function bindUI(){
  btnNuevo.addEventListener("click", () => abrirModal());
  btnClose.addEventListener("click", cerrarModal);
  btnCancelar.addEventListener("click", cerrarModal);

  formCat.addEventListener("submit", onSubmitForm);

  btnPrev.addEventListener("click", () => { if (paginaActual>1) cargarCategorias(paginaActual-1); });
  btnNext.addEventListener("click", () => {
    const maxPag = Math.ceil(totalRegistros / limit);
    if (paginaActual < maxPag) cargarCategorias(paginaActual+1);
  });

  q.addEventListener("keydown", (e)=>{ if(e.key==='Enter') cargarCategorias(1); });
  filtroActivo.addEventListener("change", ()=> cargarCategorias(1));
}

function abrirModal(data=null){
  modal.classList.remove("hidden");
  modalTitle.textContent = data ? "Editar categoría" : "Nueva categoría";

  cat_id.value = data?.id || "";
  nombre.value = data?.nombre || "";
  orden.value  = data?.orden ?? 0;
  activo.checked = data ? !!Number(data.activo) : true;
  nombre.focus();
}

function cerrarModal(){ modal.classList.add("hidden"); }

async function cargarCategorias(pagina=1){
  paginaActual = pagina;
  const offset = (pagina-1) * limit;

  const params = new URLSearchParams({
    action: "listar",
    limit, offset,
    ...(q.value.trim() && { q: q.value.trim() }),
    solo_activos: filtroActivo.checked ? 1 : 0
  });

  try{
    const res = await fetch(`${API}?${params}`);
    const data = await res.json();
    if(!data.success) throw new Error(data.error || "No se pudieron cargar categorías");

    totalRegistros = data.total || 0;
    renderTabla(data.categorias || []);
    renderPaginacion();
  }catch(err){
    Swal.fire({icon:'error', title:'Error', text:err.message});
  }
}

function renderTabla(items){
  tbody.innerHTML = "";

  if(items.length === 0){
    tbody.innerHTML = `
      <tr><td colspan="5" class="px-4 py-6 text-center text-slate-400">Sin resultados</td></tr>
    `;
    return;
  }

  for(const c of items){
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="px-4 py-3 text-slate-400">${c.id}</td>
      <td class="px-4 py-3 font-medium">${escapeHtml(c.nombre)}</td>
      <td class="px-4 py-3">${c.orden ?? 0}</td>
      <td class="px-4 py-3">
        ${Number(c.activo) ? 
          '<span class="px-2 py-1 rounded-full text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">Activa</span>' :
          '<span class="px-2 py-1 rounded-full text-xs bg-slate-700/40 text-slate-300 border border-slate-600/50">Inactiva</span>'
        }
      </td>
      <td class="px-4 py-3">
        <div class="flex items-center justify-end gap-2">
          <button class="px-3 py-1.5 rounded-lg border border-amber-600/50 bg-amber-900/20 hover:bg-amber-900/40 text-amber-300"
                  data-edit="${c.id}">
            <i class="bi bi-pencil-square"></i> Editar
          </button>
          <button class="px-3 py-1.5 rounded-lg border border-rose-600/50 bg-rose-900/20 hover:bg-rose-900/40 text-rose-300"
                  data-del="${c.id}">
            <i class="bi bi-trash"></i> Eliminar
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // Bind acción botones
  tbody.querySelectorAll("button[data-edit]").forEach(btn=>{
    btn.addEventListener("click", async (e)=>{
      const id = e.currentTarget.getAttribute("data-edit");
      const item = await obtenerCategoria(id);
      if(item) abrirModal(item);
    });
  });

  tbody.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.addEventListener("click", async (e)=>{
      const id = e.currentTarget.getAttribute("data-del");
      confirmarEliminar(id);
    });
  });
}

function renderPaginacion(){
  const desde = (paginaActual-1)*limit + 1;
  const hasta = Math.min(paginaActual*limit, totalRegistros);
  lblResumen.textContent = totalRegistros ? `Mostrando ${desde}-${hasta} de ${totalRegistros}` : '—';
  lblPagina.textContent = `Página ${paginaActual} / ${Math.max(1, Math.ceil(totalRegistros/limit))}`;

  btnPrev.disabled = (paginaActual <= 1);
  btnNext.disabled = (paginaActual >= Math.ceil(totalRegistros/limit));
}

async function obtenerCategoria(id){
  try{
    const res = await fetch(`${API}?action=obtener&id=${id}`);
    const data = await res.json();
    if(!data.success) throw new Error(data.error || "No encontrado");
    return data.categoria;
  }catch(err){
    Swal.fire({icon:'error', title:'Error', text:err.message});
    return null;
  }
}

async function onSubmitForm(e){
  e.preventDefault();

  const payload = {
    nombre: nombre.value.trim(),
    orden: Number(orden.value || 0),
    activo: activo.checked ? 1 : 0
  };
  if(!payload.nombre){
    return Swal.fire({icon:'warning', title:'Falta nombre'});
  }

  try{
    let res, data;
    if(cat_id.value){ // actualizar
      payload.id = Number(cat_id.value);
      res = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'actualizar', ...payload }) });
    }else{ // crear
      res = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'crear', ...payload }) });
    }
    data = await res.json();
    if(!data.success) throw new Error(data.error || 'Operación fallida');

    cerrarModal();
    Swal.fire({icon:'success', title:'Guardado correctamente', timer:1500, showConfirmButton:false});
    cargarCategorias(paginaActual);
  }catch(err){
    Swal.fire({icon:'error', title:'Error', text:err.message});
  }
}

function confirmarEliminar(id){
  Swal.fire({
    icon:'warning',
    title:'Eliminar categoría',
    text:'¿Seguro que deseas eliminarla? (si tiene productos relacionados, el sistema te propondrá desactivarla)',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar'
  }).then(async r=>{
    if(!r.isConfirmed) return;
    try{
      const res = await fetch(API, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'eliminar', id:Number(id) })
      });
      const data = await res.json();

      if(data.success){
        Swal.fire({icon:'success', title:'Eliminada', timer:1500, showConfirmButton:false});
        cargarCategorias(paginaActual);
        return;
      }

      // si viene código de FK, ofrecer desactivar
      if(data.code === 'FOREIGN_KEY'){
        Swal.fire({
          icon:'info',
          title:'No se puede eliminar',
          text:'La categoría tiene productos asociados. ¿Deseas desactivarla para ocultarla?',
          showCancelButton:true,
          confirmButtonText:'Sí, desactivar'
        }).then(async r2=>{
          if(!r2.isConfirmed) return;
          const r3 = await fetch(API, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ action:'actualizar', id:Number(id), activo:0 })
          });
          const j3 = await r3.json();
          if(j3.success){
            Swal.fire({icon:'success', title:'Desactivada', timer:1500, showConfirmButton:false});
            cargarCategorias(paginaActual);
          }else{
            Swal.fire({icon:'error', title:'Error', text:j3.error || 'No se pudo desactivar'});
          }
        });
      }else{
        Swal.fire({icon:'error', title:'Error', text:data.error || 'No se pudo eliminar'});
      }
    }catch(err){
      Swal.fire({icon:'error', title:'Error', text:err.message});
    }
  });
}

function escapeHtml(s=''){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
