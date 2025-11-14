'use strict';

/* =========================================================
 *  KIOSKO – Smartgate Cafetería (Slider nativo)
 * =======================================================*/

// ===== DEBUG =====
const DBG = true;
const dlog = (...args) => { if (DBG) console.log('[KIOSKO]', ...args); };

// ===== API =====
const API = "../php/caf_pedidos_controller.php";

// Avatar por defecto embebido (sin peticiones de red)
const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
  <rect width="100%" height="100%" fill="#0f172a"/>
  <circle cx="64" cy="48" r="24" fill="#334155"/>
  <rect x="28" y="80" width="72" height="28" rx="14" fill="#334155"/>
</svg>`);

// ===== Estado =====
let CATALOGO = [];
let CURRENT_CAT = null;
let CURRENT_PROD = null;
let SIZE_MAP = {};
let CART = [];
let PERSON = null;
let _pcBusy = false;

// ===== Wizard (nativo) =====
const STEP = { PERSON: 0, CATS: 1, DETAIL: 2, CART: 3 };
const MAX_STEP = 3;
let _current = 0;

let wizardEl = null;
let trackEl  = null;
let stepsEls = [];

function initWizard(){
  wizardEl = document.getElementById('wizard');
  trackEl  = document.getElementById('wizardTrack');
  stepsEls = Array.from(document.querySelectorAll('#wizardTrack .step'));
  sizeSteps();
  window.addEventListener('resize', sizeSteps, { passive:true });
}

function sizeSteps(){
  if (!wizardEl) return;
  const w = wizardEl.clientWidth;
  stepsEls.forEach(s => { s.style.width = w + 'px'; });
  // Reposicionar al paso actual sin animación
  trackEl?.scrollTo({ left: w * _current, top: 0, behavior: 'instant' });
}

function goStep(stepIndex){
  const target = Math.max(0, Math.min(stepIndex, MAX_STEP));
  _current = target;
  const w = wizardEl.clientWidth;
  trackEl.scrollTo({ left: w * _current, top: 0, behavior: 'smooth' });
}

function forceReflow(){
  // Recalcula anchos y reubica al paso actual (para acordeones, etc.)
  sizeSteps();
}

function gotoCats(){ goStep(STEP.CATS); }
function gotoCart(){ goStep(STEP.CART); }
function gotoCartWithToast(msg){
  goStep(STEP.CART);
  setTimeout(()=> toastOk(msg), 350); // coincide con scroll-behavior smooth
}

// ===== Helpers DOM/Format =====
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const fmt = (n) => (Number(n)||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});

// ===== Inactividad (kiosko) =====
const IDLE_MS = 2 * 60 * 1000;     // 2 minutos
const IDLE_PROMPT_MS = 15 * 1000;  // 15s para decidir
let _idleEnabled = false;
let _idleTimer   = null;

const Toast = Swal.mixin({
  toast: true,
  position: 'bottom-end',
  showConfirmButton: false,
  timer: 1400,
  timerProgressBar: true,
  backdrop: false,
  didOpen: el => { el.style.zIndex = 2000; },
});
const toastOk   = (msg) => Toast.fire({ icon:'success', title: msg });
const toastWarn = (msg) => Toast.fire({ icon:'warning', title: msg });
const toastErr  = (msg) => Swal.fire({ icon:'error', title:'Error', text: msg });

// ===== Avatar utils =====
function normalizeFace(val){
  if (!val) return null;
  const s = String(val).trim();
  if (!s || s.toLowerCase() === 'null') return null;
  if (s.startsWith('data:image')) return s;
  if (/^(https?:\/\/|\/)/i.test(s)) return s;
  const b64 = s.replace(/^base64,?/i, '');
  return `data:image/jpeg;base64,${b64}`;
}
function setAvatarSafe(imgEl, faceVal){
  if (!imgEl) return;
  imgEl.onerror = null;
  const src = normalizeFace(faceVal) || DEFAULT_AVATAR;
  if (imgEl.getAttribute('src') !== src) {
    imgEl.addEventListener('error', () => {
      imgEl.onerror = null;
      imgEl.src = DEFAULT_AVATAR;
    }, { once:true });
    imgEl.src = src;
  }
  imgEl.classList.remove('hidden');
}
function clearAvatar(imgEl){
  if (!imgEl) return;
  imgEl.onerror = null;
  imgEl.removeAttribute('src');
  imgEl.classList.add('hidden');
}

// ===== Inactividad handlers =====
function _idleAnyActivity(){
  if (!_idleEnabled) return;
  clearTimeout(_idleTimer);
  _idleTimer = setTimeout(_idleShowPrompt, IDLE_MS);
}
function _idleBind(){
  if (_idleEnabled) return;
  _idleEnabled = true;
  document.addEventListener('pointerdown', _idleAnyActivity, true);
  document.addEventListener('keydown',     _idleAnyActivity, true);
  document.addEventListener('wheel',       _idleAnyActivity, {passive:true});
  document.addEventListener('touchstart',  _idleAnyActivity, {passive:true});
  document.addEventListener('visibilitychange', _idleAnyActivity, true);
  _idleAnyActivity();
}
function _idleUnbind(){
  if (!_idleEnabled) return;
  _idleEnabled = false;
  clearTimeout(_idleTimer); _idleTimer = null;
  document.removeEventListener('pointerdown', _idleAnyActivity, true);
  document.removeEventListener('keydown',     _idleAnyActivity, true);
  document.removeEventListener('wheel',       _idleAnyActivity, true);
  document.removeEventListener('touchstart',  _idleAnyActivity, true);
  document.removeEventListener('visibilitychange', _idleAnyActivity, true);
}
function enableIdleWatch(){ _idleBind(); }
function disableIdleWatch(){ _idleUnbind(); }

async function _idleShowPrompt(){
  let interval;
  const total = Math.round(IDLE_PROMPT_MS/1000);
  let left = total;

  const res = await Swal.fire({
    icon: 'question',
    title: '¿Seguir con el pedido?',
    html: `
      No detectamos actividad.<br>
      ¿Deseas continuar o empezar de nuevo?<br>
      <small>Reinicio automático en <b id="idleCounter">${left}</b> s</small>
    `,
    showCancelButton: true,
    confirmButtonText: 'Seguir',
    cancelButtonText: 'Empezar de nuevo',
    allowOutsideClick: false,
    allowEscapeKey: false,
    timer: IDLE_PROMPT_MS,
    didOpen: (el)=>{
      const b = el.querySelector('#idleCounter');
      interval = setInterval(()=>{ left--; if (b) b.textContent = left; }, 1000);
    },
    willClose: ()=>{ clearInterval(interval); }
  });

  if (res.isConfirmed){
    _idleAnyActivity();
    return;
  }

  CART = [];
  renderCart?.();
  resetPersonUI?.();
  disableIdleWatch();
  goStep?.(STEP.PERSON);
  setTimeout(()=> $('#pcInput')?.focus(), 80);
}

// ===== API =====
async function validarPersonCodeAPI(code){
  try{
    const res = await fetch(`${API}?action=validar_person_code&person_code=${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!data || data.success === false) return { success:true, found:false };
    return data;
  }catch(e){
    return { success:true, found:false };
  }
}

// ===== UI Persona =====
function setPersonUI(person){
  PERSON = person;
  const input = $('#personCode');
  if (input) input.value = person.person_code || person.personCode || '';

  const nombre = (person.nombre && person.apellido)
    ? `${person.nombre} ${person.apellido}`
    : (person.nombre || person.fullname || '');
  const code   = person.person_code || person.personCode || '';

  const nameEl = $('#pcName');
  const codeEl = $('#pcCode');
  if (nameEl){ nameEl.textContent = nombre || '(Sin nombre)'; nameEl.classList.remove('hidden'); }
  if (codeEl){ codeEl.textContent = code ? `ID: ${code}` : 'Sin identificar'; codeEl.classList.remove('hidden'); }

  setAvatarSafe($('#pcAvatar'), person.face_icon || person.face);
}

function resetPersonUI(){
  PERSON = null;
  const input = $('#personCode'); if (input) input.value = '';
  const nameEl = $('#pcName');
  const codeEl = $('#pcCode');
  if (nameEl){ nameEl.textContent = '—'; nameEl.classList.add('hidden'); }
  if (codeEl){ codeEl.textContent = '—'; codeEl.classList.add('hidden'); }
  clearAvatar($('#pcAvatar'));
}

// ===== Kiosko (captura de personCode) =====
function bindKiosk(){
  const inp = $('#pcInput');
  if (!inp) return;

  $$('.kkey').forEach(btn=>{
    btn.addEventListener('click', ()=>{ inp.value += btn.textContent.trim(); inp.focus(); });
  });
  $('#kBack')?.addEventListener('click', ()=>{ inp.value = inp.value.slice(0,-1); inp.focus(); });
  $('#btnLimpiarPC')?.addEventListener('click', ()=>{ inp.value=''; inp.focus(); });

  async function validarYContinuar(){
    if (_pcBusy) return;
    _pcBusy = true;
    try{
      const code = (inp?.value || '').trim();
      if (!code) { toastWarn('Escribe tu personCode'); return; }

      const resp = await validarPersonCodeAPI(code);
      if (resp?.found && resp?.person){ setPersonUI(resp.person); goStep(STEP.CATS); enableIdleWatch(); return; }

      await Swal.fire({ icon:'error', title:'PersonCode no válido', text:'Verifica tu código e inténtalo de nuevo.' });
      setTimeout(()=>{ $('#pcInput')?.focus(); }, 50);
    }catch(e){
      console.error(e); toastErr('Error al validar el personCode');
    }finally{ _pcBusy = false; }
  }

  $('#btnValidarPC')?.addEventListener('click', validarYContinuar);
  inp.addEventListener('keydown', (e)=>{ if (e.key==='Enter') validarYContinuar(); });

  $('#btnChangePC')?.addEventListener('click', confirmChangePC);
}

async function confirmChangePC(){
  if (CART.length > 0){
    const res = await Swal.fire({
      icon:'warning', title:'Cambiar de usuario',
      html:'Se <b>vaciará el carrito</b> y perderás el progreso.',
      showCancelButton:true, confirmButtonText:'Sí, continuar', cancelButtonText:'Cancelar'
    });
    if (!res.isConfirmed) return;
  }
  CART = []; renderCart(); resetPersonUI(); disableIdleWatch();
  setTimeout(()=>{ goStep(STEP.PERSON); setTimeout(()=>$('#pcInput')?.focus(), 80); }, 50);
}

function bindFabCart(){
  const fab = $('#fabCart');
  if (!fab) return;
  fab.addEventListener('click', ()=>{ goStep(STEP.CART); });
}

// ===== Catálogo =====
async function cargarCatalogo(){
  try{
    const res = await fetch(`${API}?action=catalogo&solo_activos=1&ocultar_vacias=0`);
    const data = await res.json();
    if(!data.success) throw new Error(data.error || 'No se pudo cargar el catálogo');

    CATALOGO = data.categorias || [];
    SIZE_MAP = {};

    CATALOGO.forEach(cat=>{
      (cat.productos || []).forEach(p=>{
        if (Array.isArray(p.tamanos) && p.tamanos.length) {
          const base = Math.min(...p.tamanos.map(s=>Number(s.precio)||0));
          SIZE_MAP[p.id] = p.tamanos.map(s=>{
            const key = s.key || (s.label ? s.label.toLowerCase().replace(/\s+/g,'_') : 'op');
            return { key, label:(s.label || s.etiqueta || ''), extra:(Number(s.precio)||0) - base };
          });
          p.precio = base;
        } else {
          SIZE_MAP[p.id] = null;
          p.tamanos = [];
          p.precio = Number(p.precio || 0);
        }
      });
    });

    renderAccordion();
    forceReflow(); // recalcular ancho tras pintar
  }catch(err){
    toastErr(err.message);
    // Fallback demo
    CATALOGO = [
      { id:1, nombre:'Cafés', productos:[
        { id:101, nombre:'Café Latte', descripcion:'Espresso doble, leche vaporizada, espuma ligera.', precio:45 },
        { id:102, nombre:'Capuchino',  descripcion:'Espresso, leche, espuma abundante, canela.',    precio:48 },
      ]},
      { id:2, nombre:'Snacks', productos:[
        { id:201, nombre:'Galleta', descripcion:'Harina, mantequilla, chispas de chocolate.', precio:18 },
      ]},
    ];
    SIZE_MAP = {};
    renderAccordion();
    forceReflow();
  }
}

function renderAccordion(){
  const wrap = $('#accordionCats');
  if (!wrap) return;
  wrap.innerHTML = '';

  CATALOGO.forEach(function(cat, idx){
    const panel = document.createElement('div');
    panel.className = 'rounded-2xl border border-slate-700 bg-slate-900/40';

    const hdr = document.createElement('button');
    hdr.type = 'button';
    hdr.className = 'w-full flex items-center justify-between px-4 py-4';
    hdr.innerHTML = `
      <span class="text-left font-semibold text-slate-200">${cat.nombre}</span>
      <i class="bi bi-chevron-down text-slate-400"></i>`;

    const cnt = document.createElement('div');
    cnt.className = 'p-4 border-t border-slate-700 ' + (idx === 0 ? '' : 'hidden');

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4';

    (cat.productos || []).forEach(function(p){
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'group rounded-2xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700/70 p-4 text-left transition flex flex-col justify-between min-h-[140px]';
      card.innerHTML = `
        <div>
          <div class="flex items-start justify-between gap-2">
            <h4 class="font-semibold text-slate-100">${p.nombre}</h4>
            <span class="text-emerald-400 font-bold">${fmt(p.precio)}</span>
          </div>
          <p class="text-slate-400 text-sm mt-1 line-clamp-3">${p.descripcion || ''}</p>
        </div>
        <div class="mt-3 text-right">
          <span class="inline-flex items-center gap-1 text-rose-300 text-sm">Elegir
            <i class="bi bi-arrow-right"></i>
          </span>
        </div>`;
      card.addEventListener('click', function(){ openDetalle(cat, p); });
      grid.appendChild(card);
    });

    cnt.appendChild(grid);
    hdr.addEventListener('click', function(){
      cnt.classList.toggle('hidden');
      setTimeout(forceReflow, 0);
    });
    panel.appendChild(hdr);
    panel.appendChild(cnt);
    wrap.appendChild(panel);
  });
}

// ===== Detalle =====
function openDetalle(cat, prod){
  CURRENT_CAT = cat;
  CURRENT_PROD = prod;

  $('#catTitle') && ($('#catTitle').textContent = cat.nombre);
  $('#catCount') && ($('#catCount').textContent = ((cat.productos||[]).length + ' productos'));

  $('#detNombre').textContent = prod.nombre;
  $('#detDesc').textContent   = prod.descripcion || '';
  $('#qty').value = 1;
  $('#nota').value = '';

  const ingr = (prod.descripcion||'').split(/,|\n/).map(s=>s.trim()).filter(Boolean);
  const ul = $('#listIngr');
  ul.innerHTML = '';
  if(ingr.length === 0){ ul.innerHTML = '<li class="text-slate-500">—</li>'; }
  else { ingr.forEach(i=>{ const li=document.createElement('li'); li.textContent=i; ul.appendChild(li); }); }

  const sizes = SIZE_MAP[prod.id] || null;
  const wrapT = $('#wrapTamanos');
  const optsT = $('#optsTamanos');
  optsT.innerHTML = '';
  if(sizes && sizes.length){
    wrapT.classList.remove('hidden');
    sizes.forEach(function(s, idx){
      const id = 'size_'+prod.id+'_'+s.key;
      const lbl = document.createElement('label');
      lbl.className = 'inline-flex items-center gap-2 px-4 py-3 bg-slate-800/70 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-700/70';
      lbl.innerHTML =
        '<input type="radio" name="size" id="'+id+'" value="'+s.key+'" '+(idx===0?'checked':'')+' class="accent-rose-500">' +
        '<span>'+s.label+(s.extra?(' (+'+fmt(s.extra)+')'):'')+'</span>';
      optsT.appendChild(lbl);
    });
  }else{
    wrapT.classList.add('hidden');
  }

  $('#detPU').textContent = fmt(prod.precio);
  updateDetallePrecio();
  goStep(STEP.DETAIL);
}

function bindUI(){
  $('#btnBack')?.addEventListener('click', ()=>{ goStep(STEP.CATS); });

  const qtyPlus  = $('#qtyPlus');
  const qtyMinus = $('#qtyMinus');
  const qtyInp   = $('#qty');
  if (qtyPlus)  qtyPlus.addEventListener('click', ()=>{ qtyInp.value = Math.min(99, (+qtyInp.value||1)+1); updateDetallePrecio(); });
  if (qtyMinus) qtyMinus.addEventListener('click', ()=>{ qtyInp.value = Math.max(1,  (+qtyInp.value||1)-1); updateDetallePrecio(); });
  if (qtyInp)   qtyInp.addEventListener('input', updateDetallePrecio);

  $('#optsTamanos')?.addEventListener('change', updateDetallePrecio);

  $('#btnAddToCart')?.addEventListener('click', addCurrentToCart);
  $('#btnClearCart')?.addEventListener('click', clearCart);
  $('#btnCrearPedido')?.addEventListener('click', crearPedido);
  $('#btnSeguirPedido')?.addEventListener('click', ()=> goStep(STEP.CATS));
}

function curSizeExtra(){
  const sizes = SIZE_MAP[CURRENT_PROD ? CURRENT_PROD.id : undefined] || null;
  if(!sizes) return { key:null, label:null, extra:0 };
  const checked = document.querySelector('input[name="size"]:checked');
  const selKey = checked ? checked.value : sizes[0].key;
  const found = sizes.find(s=>s.key===selKey) || sizes[0];
  return found || { key:null, label:null, extra:0 };
}

function updateDetallePrecio(){
  if(!CURRENT_PROD) return;
  const qty = Math.max(1, +(($('#qty').value)||1));
  const extra = curSizeExtra().extra || 0;
  const unit = (+CURRENT_PROD.precio || 0) + (+extra);
  const total = unit * qty;
  $('#detPU').textContent     = fmt(unit);
  $('#detPrecio').textContent = fmt(total);
}

// ===== Carrito =====
function addCurrentToCart(){
  const personCode = $('#personCode')?.value.trim() || '';
  if(!personCode) return toastWarn('Captura el personCode primero');
  if(!CURRENT_PROD) return;

  const qty  = Math.max(1, +(($('#qty').value)||1));
  const note = $('#nota').value.trim() || null;
  const size = curSizeExtra();

  const unit  = (+CURRENT_PROD.precio||0) + (+size.extra||0);
  const total = unit * qty;

  CART.push({
    producto_id: CURRENT_PROD.id,
    nombre: CURRENT_PROD.nombre + (size.label ? (' ('+size.label+')') : ''),
    descripcion: CURRENT_PROD.descripcion || null,
    tamano_key: size.key,
    tamano_label: size.label,
    precio_unit: unit,
    cantidad: qty,
    total_linea: total,
    nota: note
  });

  renderCart();
  gotoCartWithToast('Agregado al carrito');
}

function renderCart(){
  const ul = $('#cartList');
  if (!ul) return;
  ul.innerHTML = '';

  let subtotal = 0;
  CART.forEach(function(it, idx){
    subtotal += it.total_linea;
    const li = document.createElement('li');
    li.className = 'rounded-xl border border-slate-700 bg-slate-900/40 p-4';
    li.innerHTML =
      '<div class="flex items-start justify-between gap-2">' +
        '<div>' +
          '<div class="font-medium text-slate-100">'+it.nombre+'</div>' +
          '<div class="text-xs text-slate-400">' +
            'Cant: '+it.cantidad+' · PU: '+fmt(it.precio_unit)+' · Importe: <b class="text-slate-200">'+fmt(it.total_linea)+'</b>' +
          '</div>' +
          (it.nota ? '<div class="text-xs text-amber-400 mt-1"><i class="bi bi-chat-left-text mr-1"></i>'+it.nota+'</div>' : '') +
        '</div>' +
        '<button type="button" class="text-rose-400 hover:text-rose-300" title="Quitar" data-idx="'+idx+'"><i class="bi bi-x-lg"></i></button>' +
      '</div>';
    ul.appendChild(li);
  });

  ul.querySelectorAll('button[data-idx]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const i = +e.currentTarget.getAttribute('data-idx');
      CART.splice(i,1);
      renderCart();
    });
  });

  const descuento = 0, impuestos = 0;
  const total = subtotal - descuento + impuestos;

  $('#sumSubtotal').textContent = fmt(subtotal);
  $('#sumDescuento').textContent = fmt(descuento);
  $('#sumImpuestos').textContent = fmt(impuestos);
  $('#sumTotal').textContent = fmt(total);

  const badge = $('#cartBadge');
  if (badge) badge.textContent = CART.length;
}

function clearCart(){
  if(CART.length===0) return;
  Swal.fire({
    icon:'warning', title:'Vaciar carrito',
    text:'¿Seguro que deseas vaciar el carrito?',
    showCancelButton:true, confirmButtonText:'Sí, vaciar'
  }).then(res=>{
    if(res.isConfirmed){ CART = []; renderCart(); }
  });
}

async function crearPedido(){
  const pc = $('#personCode');
  const personCode = pc ? pc.value.trim() : '';
  if(!personCode) return toastWarn('Captura el personCode');
  if(CART.length===0) return toastWarn('El carrito está vacío');

  const subtotal = CART.reduce((s, it)=> s + it.total_linea, 0);
  const payload = {
    action:'crear_pedido',
    person_code: personCode,
    notas:null,
    subtotal, descuento:0, impuestos:0, propina:0, total: subtotal,
    items: CART.map(it => ({
      producto_id: it.producto_id,
      nombre_snapshot: it.nombre,
      descripcion_snapshot: it.descripcion,
      cantidad: it.cantidad,
      precio_unit: it.precio_unit,
      total_linea: it.total_linea,
      tamano_key: it.tamano_key || null,
      tamano_label: it.tamano_label || null,
      nota: it.nota || null
    }))
  };

  try{
    const res  = await fetch(API,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const data = await res.json();
    if(!data.success) throw new Error(data.error || 'No se pudo crear el pedido');

    await Swal.fire({
      icon:'success',
      title:'Pedido creado',
      html:`<div class="text-slate-200">Código: <b class="text-emerald-400">${data.codigo || '(s/n)'}</b></div>`,
      timer:2000, showConfirmButton:false
    });
    window.location.replace(window.location.pathname);
    resetFlowToPerson();
  }catch(err){
    toastErr(err.message);
  }
}

function resetFlowToPerson(){
  CART = []; renderCart?.();
  resetPersonUI();
  disableIdleWatch?.();
  goStep?.(STEP.PERSON);
  setTimeout(()=> $('#pcInput')?.focus(), 80);
}

// ===== Boot =====
document.addEventListener('DOMContentLoaded', async () => {
  initWizard();
  bindKiosk();
  bindFabCart();
  await cargarCatalogo();
  bindUI();
});
