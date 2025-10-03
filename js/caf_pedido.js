// ==========================
//  Configuración / Endpoints
// ==========================
const API = "../php/cafeteria_controller.php"; // ajusta si usas otro nombre
// Rutas ejemplo esperadas:
//  GET  ?action=catalogo -> { success, categorias:[{id,nombre, productos:[{id,nombre,descripcion,precio,imagen_url}]}] }
//  POST ?action=crear_pedido (ver payload al final)

// ===============
//  Estado global
// ===============
let CATALOGO = [];
let CURRENT_CAT = null;
let CURRENT_PROD = null;
let SIZE_MAP = {
  // Define tamaños opcionales por producto_id (si quieres)
  // 1: [
  //   {key: "ch", label:"Chico", extra: 0},
  //   {key: "md", label:"Mediano", extra: 5},
  //   {key: "gr", label:"Grande", extra: 10},
  // ]
};
let CART = [];

// ===============
//  Utilidades
// ===============
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const fmt = (n) => (Number(n)||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});

function toastOk(msg){ Swal.fire({ icon:'success', title:msg, timer:1500, showConfirmButton:false }); }
function toastWarn(msg){ Swal.fire({ icon:'warning', title:msg, timer:1800, showConfirmButton:false }); }
function toastErr(msg){ Swal.fire({ icon:'error', title:'Error', text:msg }); }

// ===================
//  Carga del catálogo
// ===================
document.addEventListener('DOMContentLoaded', async () => {
  await cargarCatalogo();
  bindUI();
});

async function cargarCatalogo(){
  try{
    const res = await fetch(`${API}?action=catalogo`);
    const data = await res.json();
    if(!data.success) throw new Error(data.error || 'No se pudo cargar el catálogo');

    CATALOGO = data.categorias || [];
    renderAccordion();
  }catch(err){
    toastErr(err.message);
    // fallback mínimo para pruebas
    CATALOGO = [
      { id:1, nombre:'Cafés', productos:[
        { id:101, nombre:'Café Latte', descripcion:'Espresso doble, leche vaporizada, espuma ligera.', precio:45, imagen_url:null },
        { id:102, nombre:'Capuchino',  descripcion:'Espresso, leche, espuma abundante, canela.',    precio:48, imagen_url:null },
      ]},
      { id:2, nombre:'Snacks', productos:[
        { id:201, nombre:'Galleta', descripcion:'Harina, mantequilla, chispas de chocolate.', precio:18, imagen_url:null },
      ]},
    ];
    renderAccordion();
  }
}

// =====================
//  Render del Acordeón
// =====================
function renderAccordion(){
  const wrap = $('#accordionCats');
  wrap.innerHTML = '';

  CATALOGO.forEach(cat => {
    const panel = document.createElement('div');
    panel.className = 'rounded-lg border border-slate-700 bg-slate-900/40';

    // Header del acordeón
    const hdr = document.createElement('button');
    hdr.className = 'w-full flex items-center justify-between px-4 py-3';
    hdr.innerHTML = `
      <span class="text-left font-medium text-slate-200">${cat.nombre}</span>
      <i class="bi bi-chevron-down text-slate-400"></i>
    `;
    hdr.addEventListener('click', () => {
      cnt.classList.toggle('hidden');
    });

    // Contenido: grilla de productos
    const cnt = document.createElement('div');
    cnt.className = 'p-3 border-t border-slate-700 hidden';
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 gap-3';
    (cat.productos || []).forEach(p => {
      const card = document.createElement('button');
      card.className = `
        group rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700/70
        p-3 text-left transition flex flex-col justify-between
      `;
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
        </div>
      `;
      card.addEventListener('click', () => openDetalle(cat, p));
      grid.appendChild(card);
    });
    cnt.appendChild(grid);

    panel.appendChild(hdr);
    panel.appendChild(cnt);
    wrap.appendChild(panel);
  });
}

// ========================
//  Panel Detalle / Slide
// ========================
function openDetalle(cat, prod){
  CURRENT_CAT = cat;
  CURRENT_PROD = prod;

  // Título central
  $('#catTitle').textContent = cat.nombre;
  $('#catCount').textContent = `${(cat.productos||[]).length} productos`;

  // Llenar detalle
  $('#detNombre').textContent = prod.nombre;
  $('#detDesc').textContent   = prod.descripcion || '';
  $('#qty').value = 1;
  $('#nota').value = '';

  // Ingredientes desde la descripción (separar por coma o salto de línea)
  const ingr = (prod.descripcion||'').split(/,|\n/).map(s=>s.trim()).filter(Boolean);
  const ul = $('#listIngr');
  ul.innerHTML = '';
  if(ingr.length === 0){
    ul.innerHTML = '<li class="text-slate-500">—</li>';
  }else{
    ingr.forEach(i => {
      const li = document.createElement('li');
      li.textContent = i;
      ul.appendChild(li);
    });
  }

  // Tamaños (opcional si existe en SIZE_MAP)
  const sizes = SIZE_MAP[prod.id] || null;
  const wrapT = $('#wrapTamanos');
  const optsT = $('#optsTamanos');
  optsT.innerHTML = '';
  if(sizes && sizes.length){
    wrapT.classList.remove('hidden');
    sizes.forEach((s, idx) => {
      const id = `size_${prod.id}_${s.key}`;
      const lbl = document.createElement('label');
      lbl.className = 'inline-flex items-center gap-2 px-3 py-2 bg-slate-800/70 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700/70';
      lbl.innerHTML = `
        <input type="radio" name="size" id="${id}" value="${s.key}" ${idx===0?'checked':''} class="accent-rose-500">
        <span>${s.label}${s.extra?` (+${fmt(s.extra)})`:''}</span>
      `;
      optsT.appendChild(lbl);
    });
  }else{
    wrapT.classList.add('hidden');
  }

  // Precios
  $('#detPU').textContent = fmt(prod.precio);
  updateDetallePrecio();

  // Mostrar página detalle
  $('#centerPanel').classList.add('show-detail');
}

function bindUI(){
  // regresar de detalle
  $('#btnBack').addEventListener('click', () => {
    $('#centerPanel').classList.remove('show-detail');
  });

  // qty +/-
  $('#qtyPlus').addEventListener('click', () => { $('#qty').value = Math.min(99, (+$('#qty').value||1)+1); updateDetallePrecio(); });
  $('#qtyMinus').addEventListener('click', () => { $('#qty').value = Math.max(1,  (+$('#qty').value||1)-1); updateDetallePrecio(); });
  $('#qty').addEventListener('input', updateDetallePrecio);
  $('#optsTamanos')?.addEventListener('change', updateDetallePrecio);

  // carrito
  $('#btnAddToCart').addEventListener('click', addCurrentToCart);
  $('#btnOpenCart').addEventListener('click', () => {
    // scroll to cart
    document.querySelector('#btnCrearPedido').scrollIntoView({behavior:'smooth', block:'center'});
  });
  $('#btnClearCart').addEventListener('click', clearCart);
  $('#btnCrearPedido').addEventListener('click', crearPedido);
}

function curSizeExtra(){
  const sizes = SIZE_MAP[CURRENT_PROD?.id] || null;
  if(!sizes) return { key:null, label:null, extra:0 };
  const checked = document.querySelector('input[name="size"]:checked');
  const selKey = checked ? checked.value : sizes[0].key;
  const found = sizes.find(s => s.key===selKey) || sizes[0];
  return found || { key:null, label:null, extra:0 };
}

function updateDetallePrecio(){
  if(!CURRENT_PROD) return;
  const qty = Math.max(1, +($('#qty').value||1));
  const extra = curSizeExtra().extra || 0;
  const unit = (+CURRENT_PROD.precio || 0) + (+extra);
  const total = unit * qty;

  $('#detPU').textContent    = fmt(unit);
  $('#detPrecio').textContent= fmt(total);
}

// ===================
//  Carrito: operaciones
// ===================
function addCurrentToCart(){
  const personCode = $('#personCode').value.trim();
  if(!personCode){
    return toastWarn('Captura el personCode primero');
  }
  if(!CURRENT_PROD) return;

  const qty = Math.max(1, +($('#qty').value||1));
  const note = $('#nota').value.trim() || null;
  const size = curSizeExtra(); // {key,label,extra}

  const unit = (+CURRENT_PROD.precio||0) + (+size.extra||0);
  const total = unit * qty;

  CART.push({
    producto_id: CURRENT_PROD.id,
    nombre: CURRENT_PROD.nombre + (size.label ? ` (${size.label})` : ''),
    descripcion: CURRENT_PROD.descripcion || null,
    tamano_key: size.key,
    tamano_label: size.label,
    precio_unit: unit,
    cantidad: qty,
    total_linea: total,
    nota: note
  });

  renderCart();
  toastOk('Agregado al carrito');
  // volver a la lista
  $('#centerPanel').classList.remove('show-detail');
}

function renderCart(){
  const ul = $('#cartList');
  ul.innerHTML = '';

  let subtotal = 0;
  CART.forEach((it, idx) => {
    subtotal += it.total_linea;

    const li = document.createElement('li');
    li.className = 'rounded-lg border border-slate-700 bg-slate-900/40 p-3';
    li.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="font-medium text-slate-100">${it.nombre}</div>
          <div class="text-xs text-slate-400">
            Cant: ${it.cantidad} · PU: ${fmt(it.precio_unit)} · Importe: <b class="text-slate-200">${fmt(it.total_linea)}</b>
          </div>
          ${it.nota ? `<div class="text-xs text-amber-400 mt-1"><i class="bi bi-chat-left-text mr-1"></i>${it.nota}</div>` : ''}
        </div>
        <button class="text-rose-400 hover:text-rose-300" title="Quitar" data-idx="${idx}">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    `;
    ul.appendChild(li);
  });

  // eliminar
  ul.querySelectorAll('button[data-idx]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const i = +e.currentTarget.dataset.idx;
      CART.splice(i,1);
      renderCart();
    });
  });

  // totales simples
  const descuento = 0;
  const impuestos = 0;
  const total = subtotal - descuento + impuestos;

  $('#sumSubtotal').textContent = fmt(subtotal);
  $('#sumDescuento').textContent = fmt(descuento);
  $('#sumImpuestos').textContent = fmt(impuestos);
  $('#sumTotal').textContent = fmt(total);

  // badge
  $('#cartBadge').textContent = CART.length;
}

function clearCart(){
  if(CART.length===0) return;
  Swal.fire({
    icon:'warning', title:'Vaciar carrito',
    text:'¿Seguro que deseas vaciar el carrito?',
    showCancelButton:true, confirmButtonText:'Sí, vaciar'
  }).then(res=>{
    if(res.isConfirmed){
      CART = [];
      renderCart();
    }
  });
}

// ===================
//  Crear Pedido (POST)
// ===================
async function crearPedido(){
  const personCode = $('#personCode').value.trim();
  if(!personCode) return toastWarn('Captura el personCode');
  if(CART.length===0) return toastWarn('El carrito está vacío');

  // Calcular totales
  const subtotal = CART.reduce((s, it)=> s + it.total_linea, 0);
  const payload = {
    action: 'crear_pedido',
    person_code: personCode,
    notas: null,
    subtotal: subtotal,
    descuento: 0,
    impuestos: 0,
    propina: 0,
    total: subtotal,
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
    const res = await fetch(API, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if(!data.success) throw new Error(data.error || 'No se pudo crear el pedido');

    // Respuesta esperada: { success:true, pedido_id, codigo }
    Swal.fire({
      icon:'success',
      title:'Pedido creado',
      html:`<div class="text-slate-200">Código: <b class="text-emerald-400">${data.codigo || '(s/n)'}</b></div>`,
      timer:2200, showConfirmButton:false
    });

    // limpiar carrito
    CART = [];
    renderCart();
  }catch(err){
    toastErr(err.message);
  }
}
