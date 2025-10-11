const API = "../php/productos_caf_controller.php";

const tbody = document.getElementById("tbodyProd");
const lblResumen = document.getElementById("lblResumen");
const lblPagina = document.getElementById("lblPagina");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");

const q = document.getElementById("q");
const filtroActivo = document.getElementById("filtroActivo");
const filtroCategoria = document.getElementById("filtroCategoria");
const btnNuevo = document.getElementById("btnNuevo");

const modal = document.getElementById("modal");
const btnClose = document.getElementById("btnClose");
const btnCancelar = document.getElementById("btnCancelar");
const formProd = document.getElementById("formProd");

const modalTitle = document.getElementById("modalTitle");
const prod_id = document.getElementById("prod_id");
const nombre = document.getElementById("nombre");
const categoria_id = document.getElementById("categoria_id");

const orden = document.getElementById("orden");
const descripcion = document.getElementById("descripcion");
const imagen_url = document.getElementById("imagen_url");
const activo = document.getElementById("activo");

const imagen_file = document.getElementById("imagen_file");
const imgPreview = document.getElementById("imgPreview");

const sizesWrap  = document.getElementById('sizesWrap');
const btnAddSize = document.getElementById('btnAddSize');
let SIZES_TMP = [];

let paginaActual = 1;
const limit = 10;
let totalRegistros = 0;

document.addEventListener("DOMContentLoaded", async () => {
  await cargarCategoriasSelect();   // para filtros y modal
  cargarProductos();
  bindUI();
});

function bindUI(){
  btnNuevo.addEventListener("click", () => abrirModal());

  btnClose.addEventListener("click", cerrarModal);
  btnCancelar.addEventListener("click", cerrarModal);

  formProd.addEventListener("submit", onSubmitForm);

  btnPrev.addEventListener("click", () => { if (paginaActual>1) cargarProductos(paginaActual-1); });
  btnNext.addEventListener("click", () => {
    const maxPag = Math.ceil(totalRegistros / limit);
    if (paginaActual < maxPag) cargarProductos(paginaActual+1);
  });

  q.addEventListener("keydown", (e)=>{ if(e.key==='Enter') cargarProductos(1); });
  filtroActivo.addEventListener("change", ()=> cargarProductos(1));
  filtroCategoria.addEventListener("change", ()=> cargarProductos(1));

  imagen_file.addEventListener('change', subirImagen);
  if (btnAddSize) btnAddSize.addEventListener('click', addSizeRow);
}

async function cargarCategoriasSelect(){
  try{
    const res = await fetch(`${API}?action=categorias`);
    const data = await res.json();
    if(!data.success) throw new Error(data.error || 'No se pudieron cargar categorías');

    // Filtro
    const sel = filtroCategoria;
    for(const c of data.categorias){
      const op = document.createElement('option');
      op.value = c.id; op.textContent = c.nombre;
      sel.appendChild(op);
    }

    // Modal
    const sel2 = categoria_id;
    sel2.innerHTML = '<option value="">(Sin categoría)</option>';
    for(const c of data.categorias){
      const op = document.createElement('option');
      op.value = c.id; op.textContent = c.nombre;
      sel2.appendChild(op);
    }
  }catch(err){
    console.error(err);
  }
}

async function cargarProductos(pagina=1){
  paginaActual = pagina;
  const offset = (pagina-1) * limit;

  const params = new URLSearchParams({
    action: "listar",
    limit, offset,
    ...(q.value.trim() && { q: q.value.trim() }),
    ...(filtroCategoria.value && { categoria_id: filtroCategoria.value }),
    solo_activos: filtroActivo.checked ? 1 : 0
  });

  try{
    const res = await fetch(`${API}?${params}`);
    const data = await res.json();
    if(!data.success) throw new Error(data.error || "No se pudieron cargar productos");

    totalRegistros = data.total || 0;
    renderTabla(data.productos || []);
    renderPaginacion();
  }catch(err){
    Swal.fire({icon:'error', title:'Error', text:err.message});
  }
}

function renderTabla(items){
  tbody.innerHTML = "";

  if (!items.length){
    tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-6 text-center text-slate-400">Sin resultados</td></tr>`;
    return;
  }

  // helper local para convertir el GROUP_CONCAT "Etiqueta|Precio;;Etiqueta|Precio"
  const parseSizes = (s) => {
    if (!s) return [];
    return s.split(';;').map(piece => {
      const [label, price] = piece.split('|');
      return { etiqueta: (label || '').trim(), precio: Number(price || 0) };
    }).filter(x => x.etiqueta);
  };

  for (const r of items){
    const tr = document.createElement("tr");
    const catName = r.categoria_nombre || '—';

    // imagen
    const src = r.imagen_url ? toPublicUrl(r.imagen_url) : '';
    const img = src
      ? `<img src="${escapeHtml(src)}" class="thumb border border-slate-700 bg-slate-900/20" onerror="this.style.display='none'">`
      : '<div class="thumb border border-slate-700 bg-slate-900/20 flex items-center justify-center text-xs text-slate-500">—</div>';

    // tamaños -> chips
    const sizes = parseSizes(r.sizes_str);
    const sizesHtml = sizes.length
      ? `<div class="flex flex-wrap gap-1.5">
           ${sizes.map(s => `
             <span class="px-2 py-1 rounded-full text-xs border border-slate-600 bg-slate-800/60">
               ${escapeHtml(s.etiqueta)} — ${fmt(s.precio)}
             </span>
           `).join('')}
         </div>`
      : '<span class="text-slate-400">—</span>';

    tr.innerHTML = `
      <td class="px-4 py-3 text-slate-400">${r.id}</td>
      <td class="px-4 py-3">${img}</td>
      <td class="px-4 py-3">
        <div class="font-medium">${escapeHtml(r.nombre)}</div>
        <div class="text-xs text-slate-400 line-clamp-1">${escapeHtml(r.descripcion || '')}</div>
      </td>
      <td class="px-4 py-3">
        ${sizesHtml}
      </td>
      <td class="px-4 py-3">${escapeHtml(catName)}</td>
      <td class="px-4 py-3">${r.orden ?? 0}</td>
      <td class="px-4 py-3">
        ${Number(r.activo)
          ? '<span class="px-2 py-1 rounded-full text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">Activo</span>'
          : '<span class="px-2 py-1 rounded-full text-xs bg-slate-700/40 text-slate-300 border border-slate-600/50">Inactivo</span>'}
      </td>
      <td class="px-4 py-3">
        <div class="flex items-center justify-end gap-2">
          <button class="px-3 py-1.5 rounded-lg border border-amber-600/50 bg-amber-900/20 hover:bg-amber-900/40 text-amber-300" data-edit="${r.id}">
            <i class="bi bi-pencil-square"></i> Editar
          </button>
          <button class="px-3 py-1.5 rounded-lg border border-rose-600/50 bg-rose-900/20 hover:bg-rose-900/40 text-rose-300" data-del="${r.id}">
            <i class="bi bi-trash"></i> Eliminar
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // eventos
  tbody.querySelectorAll("button[data-edit]").forEach(btn=>{
    btn.addEventListener("click", async (e)=>{
      const id = e.currentTarget.getAttribute("data-edit");
      const item = await obtenerProducto(id);
      if(item) abrirModal(item);
    });
  });

  tbody.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
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

async function obtenerProducto(id){
  try{
    const res = await fetch(`${API}?action=obtener&id=${id}`);
    const data = await res.json();
    if(!data.success) throw new Error(data.error || "No encontrado");
    return data.producto;
  }catch(err){
    Swal.fire({icon:'error', title:'Error', text:err.message});
    return null;
  }
}


function abrirModal(data=null){
  modal.classList.remove("hidden");
  modalTitle.textContent = data ? "Editar producto" : "Nuevo producto";

  prod_id.value    = data?.id || "";
  nombre.value     = data?.nombre || "";
  categoria_id.value = data?.categoria_id || "";
  orden.value      = data?.orden ?? 0;
  descripcion.value= data?.descripcion || "";
  imagen_url.value = data?.imagen_url || "";
  activo.checked   = data ? !!Number(data.activo) : true;

  if (imagen_url.value) {
    imgPreview.src = toPublicUrl(imagen_url.value);
    imgPreview.classList.remove('hidden');
  } else {
    imgPreview.classList.add('hidden');
  }

  // Tamaños
  SIZES_TMP = Array.isArray(data?.tamanos)
    ? data.tamanos.map(t => ({
        etiqueta: t.etiqueta,
        precio  : Number(t.precio || 0),
        orden   : Number(t.orden || 0),
        activo  : Number(t.activo || 0) ? 1 : 0
      }))
    : [];

  if (!SIZES_TMP.length) addSizeRow();   // crea 1 fila por defecto
  renderSizeRows();

  nombre.focus();
}


function cerrarModal(){ modal.classList.add("hidden"); }

async function onSubmitForm(e){
  e.preventDefault();

  // 1) Leer filas de tamaños del DOM (solo las reales)
  const tamanos = [];
  const rows = document.querySelectorAll('#sizesWrap .size-row');

  for (const r of rows) {
    const etiqueta = r.querySelector('.size-label').value.trim();

    // Precio: si está vacío toma 0; valida >= 0
    const precioStr = r.querySelector('.size-price').value;
    const precio = Number(precioStr === '' ? 0 : precioStr);

    // Orden: si está vacío (''), autoasigna el índice actual
    const ordenStr = r.querySelector('.size-order').value.trim();
    let orden = ordenStr === '' ? NaN : Number(ordenStr);
    if (Number.isNaN(orden)) orden = tamanos.length;   // << AQUÍ se autoasigna

    const activo = r.querySelector('.size-active').checked ? 1 : 0;

    if (!etiqueta) continue;
    if (isNaN(precio) || precio < 0) {
      Swal.fire({icon:'warning', title:'Precio de tamaño inválido', text:`Revisa "${etiqueta}"`});
      return;
    }

    tamanos.push({ etiqueta, precio, orden, activo });
  }

  if (tamanos.length === 0){
    Swal.fire({icon:'warning', title:'Agrega al menos un tamaño con precio'});
    return;
  }

  // 2) Datos del producto (sin precio base)
  const payload = {
    nombre: nombre.value.trim(),
    categoria_id: categoria_id.value ? Number(categoria_id.value) : null,
    orden: Number(orden.value || 0),
    descripcion: (descripcion.value || '').trim() || null,
    imagen_url: (imagen_url.value || '').trim() || null,
    activo: activo.checked ? 1 : 0,
    tamanos,
    replace_tamanos: 1
  };

  if (!payload.nombre){
    Swal.fire({icon:'warning', title:'Falta nombre'});
    return;
  }

  // 3) Guardar (crear/actualizar)
  try{
    let res, data;
    if (prod_id.value) {
      payload.id = Number(prod_id.value);
      res = await fetch(API, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'actualizar', ...payload })
      });
    } else {
      res = await fetch(API, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'crear', ...payload })
      });
    }
    data = await res.json();
    if (!data.success) throw new Error(data.error || 'Operación fallida');

    cerrarModal();
    Swal.fire({icon:'success', title:'Guardado correctamente', timer:1500, showConfirmButton:false});
    cargarProductos(paginaActual);
  }catch(err){
    Swal.fire({icon:'error', title:'Error', text:err.message});
  }
}




/* Subir imagen por AJAX */
async function subirImagen(){
  const f = imagen_file.files?.[0];
  if(!f) return;
  const fd = new FormData();
  fd.append('action', 'upload_imagen');
  fd.append('file', f);

  try{
    const res = await fetch(API, { method:'POST', body: fd });
    const data = await res.json();
    if(!data.success) throw new Error(data.error || 'No se pudo subir la imagen');

    imagen_url.value = data.path;             // guarda ruta en el input URL
    imgPreview.src   = data.url;    // preview correcto (no 404)
    imgPreview.classList.remove('hidden');
    Swal.fire({icon:'success', title:'Imagen subida', timer:1200, showConfirmButton:false});
  }catch(err){
    Swal.fire({icon:'error', title:'Error', text:err.message});
  }finally{
    imagen_file.value = '';
  }
}

function confirmarEliminar(id){
  Swal.fire({
    icon:'warning',
    title:'Eliminar producto',
    text:'¿Seguro que deseas eliminarlo? (si está referenciado, puedes inactivarlo)',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar'
  }).then(async r=>{
    if(!r.isConfirmed) return;
    try{
      const res = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'eliminar', id:Number(id) }) });
      const data = await res.json();

      if(data.success){
        Swal.fire({icon:'success', title:'Eliminado', timer:1500, showConfirmButton:false});
        cargarProductos(paginaActual);
        return;
      }

      if(data.code === 'FOREIGN_KEY'){
        Swal.fire({
          icon:'info',
          title:'No se puede eliminar',
          text:'El producto está usado en pedidos/ventas. ¿Deseas inactivarlo para ocultarlo?',
          showCancelButton:true, confirmButtonText:'Sí, inactivar'
        }).then(async r2=>{
          if(!r2.isConfirmed) return;
          const res2 = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'actualizar', id:Number(id), activo:0 }) });
          const data2 = await res2.json();
          if(data2.success){
            Swal.fire({icon:'success', title:'Inactivado', timer:1500, showConfirmButton:false});
            cargarProductos(paginaActual);
          }else{
            Swal.fire({icon:'error', title:'Error', text:data2.error || 'No se pudo inactivar'});
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
function renderSizeRows(){
  sizesWrap.innerHTML = `
    <div class="grid grid-cols-12 text-xs text-slate-400 px-1">
      <div class="col-span-4">Tamaño</div>
      <div class="col-span-3">Precio</div>
      <div class="col-span-2">Orden</div>
      <div class="col-span-2">Estado</div>
      <div class="col-span-1"></div>
    </div>
  `;

  if (!SIZES_TMP.length) return;

  SIZES_TMP.forEach((s, idx) => {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-12 gap-2 items-center';

    row.innerHTML = `
      <input class="col-span-4 bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2 outline-none size-label"
             placeholder="Etiqueta (p.ej. Chico)" value="${escapeHtml(s.etiqueta || '')}">
      <input class="col-span-3 bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2 outline-none size-price"
             type="number" step="0.01" min="0" inputmode="decimal" placeholder="Precio"
             value="${(s.precio ?? '')}">
      <input class="col-span-2 bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2 outline-none size-order"
             type="number" step="1" inputmode="numeric" placeholder="#"
             value="${(s.orden ?? '')}">
      <label class="col-span-2 inline-flex items-center gap-2">
        <input type="checkbox" class="accent-emerald-500 size-active" ${s.activo? 'checked':''}>
        <span>Activo</span>
      </label>
      <button type="button" class="col-span-1 px-2 py-2 rounded bg-rose-700/40 hover:bg-rose-700 text-rose-100 size-del" title="Quitar">
        <i class="bi bi-x-lg"></i>
      </button>
    `;

    row.querySelector('.size-del').addEventListener('click', ()=>{
      SIZES_TMP.splice(idx, 1);
      renderSizeRows();
      if (!SIZES_TMP.length) addSizeRow();
    });

    sizesWrap.appendChild(row);
  });

  // tip de orden bajo los tamaños
  const tip = document.createElement('small');
  tip.className = 'text-slate-400 text-xs block mt-1';
  tip.textContent = 'Menor número = aparece primero.';
  sizesWrap.appendChild(tip);
}


function addSizeRow(){
  SIZES_TMP.push({ etiqueta:'', precio:0, orden:SIZES_TMP.length, activo:1 });
  renderSizeRows();
}


/* Utils */
function fmt(n){ return (Number(n)||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'}); }
function escapeHtml(s=''){ return s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function toPublicUrl(u=''){
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u; // ya es completa
  if (u.startsWith('/')) return u;       // root-relative
  // construye /smartgate/... sin importar que estés en /vistas/
  const base = location.pathname.replace(/\/vistas(\/.*)?$/,''); // /smartgate
  return `${base}/${u.replace(/^\//,'')}`;
}
function parseSizesStr(s){
  if (!s) return [];
  return s.split(';;').map(piece=>{
    const [label, price] = piece.split('|');
    return { etiqueta: (label||'').trim(), precio: Number(price||0) };
  }).filter(x => x.etiqueta);
}

