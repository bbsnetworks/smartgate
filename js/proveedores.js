// js/proveedores.js
const API = '../php/proveedores_controller.php';

const tbody = document.getElementById('tbodyProv');
const lblResumen = document.getElementById('lblResumen');
const lblPagina = document.getElementById('lblPagina');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');

const q = document.getElementById('q');
const filtroActivo = document.getElementById('filtroActivo');
const btnBuscar = document.getElementById('btnBuscar');
const btnLimpiar = document.getElementById('btnLimpiar');

const modal = document.getElementById('modal');
const btnNuevo = document.getElementById('btnNuevo');
const btnClose = document.getElementById('btnClose');
const btnCancelar = document.getElementById('btnCancelar');
const formProv = document.getElementById('formProv');

const modalTitle = document.getElementById('modalTitle');
const prov_id = document.getElementById('prov_id');
const nombre = document.getElementById('nombre');
const contacto = document.getElementById('contacto');
const telefono = document.getElementById('telefono');
const email = document.getElementById('email');
const rfc = document.getElementById('rfc');
const direccion = document.getElementById('direccion');

let state = {
  page: 1,
  limit: 10,
  total: 0,
};

function openModal(edit=false) {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (!edit) {
    modalTitle.textContent = 'Nuevo proveedor';
    prov_id.value = '';
    formProv.reset();
  } else {
    modalTitle.textContent = 'Editar proveedor';
  }
}
function closeModal(){
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function listar(){
  const params = new URLSearchParams({
    action: 'listar',
    q: q.value.trim(),
    page: state.page,
    limit: state.limit,
    activo: filtroActivo.value
  });
  const r = await fetch(`${API}?${params.toString()}`);
  const j = await r.json();
  if (!j.success) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-3 py-4 text-center text-red-400">${j.error||'Error'}</td></tr>`;
    return;
  }
  state.total = j.total;
  renderRows(j.proveedores);
  renderPager();
}

// js/proveedores.js  (mantén el resto igual que ya tienes)
function renderRows(rows){
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-6 text-center opacity-70">Sin resultados</td></tr>`;
    lblPagina.textContent = `Página 1 / 1`;
    lblResumen.textContent = `0 proveedor(es) — mostrando ${state.limit} por página`;
    return;
  }
  tbody.innerHTML = rows.map(r => {
    const badge = r.activo == 1
      ? `<span class="px-2 py-0.5 text-xs rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-700/50">Activo</span>`
      : `<span class="px-2 py-0.5 text-xs rounded-lg bg-red-500/15 text-red-300 border border-red-700/50">Desactivado</span>`;

    const btnEditar =
      `<button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-300 border border-yellow-600 hover:bg-yellow-500 hover:text-slate-900 transition"
               onclick='editar(${r.id})'>
         <i data-lucide="pencil" class="w-4 h-4"></i> Editar
       </button>`;

    const isOn = r.activo == 1;
    const btnToggle =
      `<button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ${isOn
          ? 'bg-transparent text-red-400 border border-red-600 hover:bg-red-600 hover:text-white'
          : 'bg-transparent text-emerald-400 border border-emerald-600 hover:bg-emerald-600 hover:text-white'
        } transition"
        onclick='toggleActivo(${r.id}, ${isOn?0:1})'>
         <i data-lucide="${isOn?'power':'power'}" class="w-4 h-4"></i> ${isOn?'Desactivar':'Activar'}
       </button>`;

    return `
      <tr class="hover:bg-slate-700/40">
        <td class="px-4 py-3">${escapeHTML(r.nombre||'')}</td>
        <td class="px-4 py-3">${escapeHTML(r.contacto||'')}</td>
        <td class="px-4 py-3">${escapeHTML(r.telefono||'')}</td>
        <td class="px-4 py-3">${escapeHTML(r.email||'')}</td>
        <td class="px-4 py-3">${escapeHTML(r.rfc||'')}</td>
        <td class="px-4 py-3">${badge}</td>
        <td class="px-4 py-3">
          <div class="flex justify-center gap-2">${btnEditar}${btnToggle}</div>
        </td>
      </tr>
    `;
  }).join('');
  // Pintar iconos lucide en los botones
  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

// Arreglo al escape de HTML (quitar el &nbsp; accidental)
function escapeHTML(s){ 
  return (s ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

function renderPager(){
  const tot = state.total;
  const pages = Math.max(1, Math.ceil(tot / state.limit));
  const page = Math.min(state.page, pages);
  state.page = page;
  lblPagina.textContent = `Página ${page} / ${pages}`;
  lblResumen.textContent = `${tot} proveedor(es) — mostrando ${state.limit} por página`;
  btnPrev.disabled = (page<=1);
  btnNext.disabled = (page>=pages);
}

async function editar(id){
  const r = await fetch(`${API}?action=obtener&id=${id}`);
  const j = await r.json();
  if (!j.success) {
    Swal.fire('Error','No se pudo obtener el proveedor','error');
    return;
  }
  const p = j.proveedor;
  prov_id.value = p.id;
  nombre.value = p.nombre||'';
  contacto.value = p.contacto||'';
  telefono.value = p.telefono||'';
  email.value = p.email||'';
  rfc.value = p.rfc||'';
  direccion.value = p.direccion||'';
  openModal(true);
}

async function toggleActivo(id, activo){
  const {isConfirmed} = await Swal.fire({
    title: activo==1?'¿Activar proveedor?':'¿Desactivar proveedor?',
    text: activo==1?'Podrás asignarlo a productos.':'Los productos existentes conservarán proveedor_id pero puedes filtrar por Activos.',
    icon: 'question', showCancelButton: true, confirmButtonText: 'Sí'
  });
  if (!isConfirmed) return;
  const r = await fetch(`${API}?action=toggle_activo`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({id, activo})
  });
  const j = await r.json();
  if (!j.success) { Swal.fire('Error', j.error||'No se pudo cambiar el estado', 'error'); return; }
  await listar();
}

formProv.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const payload = {
    nombre: nombre.value.trim(),
    contacto: contacto.value.trim(),
    telefono: telefono.value.trim(),
    email: email.value.trim(),
    rfc: rfc.value.trim(),
    direccion: direccion.value.trim()
  };
  if (!payload.nombre) { 
    swalInfo.fire('Falta nombre','El nombre es obligatorio','warning');
    return;
  }
  let url = `${API}?action=crear`;
  let msgOk = 'Proveedor creado';
  if (prov_id.value) {
    url = `${API}?action=actualizar`;
    payload.id = parseInt(prov_id.value,10);
    msgOk = 'Proveedor actualizado';
  }
  const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
  const j = await r.json();
  if (!j.success) { Swal.fire('Error', j.error||'No se pudo guardar', 'error'); return; }
  swalSuccess.fire('Listo', msgOk, 'success');
  closeModal();
  await listar();
});

btnBuscar.addEventListener('click', ()=> { state.page=1; listar(); });
btnLimpiar.addEventListener('click', ()=> {
  q.value=''; filtroActivo.value='1'; state.page=1; listar();
});
btnPrev.addEventListener('click', ()=> { if (state.page>1){ state.page--; listar(); }});
btnNext.addEventListener('click', ()=> { state.page++; listar(); });

btnNuevo.addEventListener('click', ()=> openModal(false));
btnClose.addEventListener('click', closeModal);
btnCancelar.addEventListener('click', closeModal);

function escapeHTML(s){ return (s??'').replace(/[&<>"']/g, m=>({ '&':'&nbsp;&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

document.addEventListener('DOMContentLoaded', listar);
