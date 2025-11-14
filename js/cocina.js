/* ----------------- Config ----------------- */
const API = "../php/caf_cocina_controller.php";
let pedidoActual = null;
let lastPendingIds = new Set();
let beepCtx = null;
let selectedId = null;
let lastDetalleSignature = ''

/* ----------------- Utilidades ----------------- */
function paintIcons(){
  try { lucide.createIcons(); } catch(e) {}
}
function nowStr(){ return new Date().toLocaleString(); }
function fmtTime(ts){ if(!ts) return ''; const d=new Date(ts.replace(' ','T')); return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }

function beep(){
  try{
    if(!beepCtx) beepCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = beepCtx.createOscillator();
    const g = beepCtx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(880, beepCtx.currentTime);
    g.gain.setValueAtTime(0.0001, beepCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, beepCtx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, beepCtx.currentTime + 0.25);
    o.connect(g); g.connect(beepCtx.destination); o.start(); o.stop(beepCtx.currentTime + 0.26);
  }catch(e){}
}

/* ----------------- Data ----------------- */
function signature(pedido, items){
  // Sólo campos que cambian el render:
  const base = [
    pedido?.id, pedido?.estado, pedido?.total, pedido?.notas, pedido?.actualizado_en
  ].join('|');
  const its = (items||[]).map(it => [
    it.id, it.nombre_snapshot, it.tamano_label, it.nota, it.cantidad, it.total_linea
  ].join(':')).join('||');
  return base+'#'+its;
}

function loadPendientes(playSound=true){
  fetch(`${API}?action=pendientes`)
    .then(r=>r.json())
    .then(data=>{
      if(!data.ok) throw new Error(data.message||'Error al cargar');
      renderPendientes(data.pedidos || [], playSound);
    })
    .catch(console.warn);
}

function renderPendientes(pedidos, playSound){
  const wrap = document.getElementById('listPendientes');
  wrap.innerHTML = '';

  document.getElementById('badgeCount').textContent = `${pedidos.length} en cola`;

  const ids = new Set();
  for(const p of pedidos) ids.add(String(p.id));

  let newCount = 0;
  ids.forEach(id => { if(!lastPendingIds.has(id)) newCount++; });
  lastPendingIds = ids;
  if (playSound && newCount > 0) beep();

  if (pedidos.length === 0) {
    wrap.innerHTML = `<div class="text-sm text-slate-400 p-4">Sin pedidos pendientes</div>`;
    paintIcons();
    return;
  }

  for (const p of pedidos){
    const isSelected = selectedId === p.id;
    const el = document.createElement('button');
    el.className = `
      w-full text-left px-3 py-2 rounded-xl border bg-slate-700/40 hover:bg-slate-700 transition-colors
      ${isSelected ? 'border-yellow-500 ring-2 ring-yellow-400/30' : 'border-slate-600'}
    `;
    el.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="font-medium truncate flex items-center gap-1">
            <i data-lucide="ticket" class="w-4 h-4 text-yellow-300"></i>
            #${p.id} ${p.codigo ? '· '+p.codigo : ''} ${p.origen ? '· '+p.origen : ''}
          </div>
          <div class="text-xs text-slate-300 truncate">
            ${p.resumen ?? ''}${p.items ? ` · ${p.items} ítem(s)` : ''}
          </div>
          ${p.notas ? `<div class="text-xs text-yellow-300 mt-1 flex items-center gap-1">
            <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> <span class="truncate">${p.notas}</span>
          </div>` : ''}
        </div>
        <div class="text-right shrink-0">
          <div class="text-xs text-slate-400 flex items-center gap-1 justify-end">
            <i data-lucide="clock" class="w-3.5 h-3.5"></i> ${fmtTime(p.creado_en)}
          </div>
          ${p.total ? `<div class="text-sm font-semibold">$${Number(p.total).toFixed(2)}</div>` : ''}
        </div>
      </div>
    `;
    el.addEventListener('click', ()=>{
      selectedId = p.id;
      cargarDetalle(p.id);
      renderPendientes(pedidos, false);
    });
    wrap.appendChild(el);
  }
  paintIcons();
}

function cargarDetalle(id, opts = {silent:false}){
  const wrap = document.getElementById('detalleWrap');

  if (!opts.silent){
    wrap.innerHTML = `
      <div class="p-3 rounded-xl border border-slate-700 bg-slate-700/40 skeleton h-28"></div>
      <div class="mt-2 p-3 rounded-xl border border-slate-700 bg-slate-700/40 skeleton h-40"></div>
    `;
    paintIcons();
  }

  fetch(`${API}?action=detalle&id=${id}`)
    .then(r=>r.json())
    .then(data=>{
      if(!data.ok) throw new Error(data.message||'Error detalle');
      const sig = signature(data.pedido, data.items);

      // Evita re-render si nada cambió → adiós “flash”
      if (sig === lastDetalleSignature && opts.silent) return;

      lastDetalleSignature = sig;
      pedidoActual = data.pedido;
      renderDetalle(data.pedido, data.items || []);
    })
    .catch(err=>{
      if (!opts.silent) Swal.fire({icon:'error', title:'Error', text: err.message});
    });
}


function renderDetalle(pedido, items){
  const badge = document.getElementById('estadoBadge');
  const wrap  = document.getElementById('detalleWrap');
  const btnIniciar  = document.getElementById('btnIniciar');
  const btnListo    = document.getElementById('btnListo');
  const btnCancelar = document.getElementById('btnCancelar');

  const map = {
    'pendiente':      { cls:'bg-slate-700 text-slate-200', icon:'hourglass', label:'Pendiente' },
    'en_preparacion': { cls:'bg-amber-600/30 text-amber-200', icon:'flame', label:'En preparación' },
    'listo':          { cls:'bg-emerald-600/30 text-emerald-200', icon:'check', label:'Listo' },
    'cancelado':      { cls:'bg-red-600/30 text-red-200', icon:'octagon-x', label:'Cancelado' }
  };
  const st = map[pedido.estado] || {cls:'bg-slate-700 text-slate-200', icon:'minus', label: pedido.estado || '—'};

  badge.className = `text-xs px-2 py-1 rounded-full flex items-center gap-1 ${st.cls}`;
  badge.innerHTML = `<i data-lucide="${st.icon}" class="w-3.5 h-3.5"></i> ${st.label}`;

  btnIniciar.classList.toggle('hidden', pedido.estado!=='pendiente');
  btnListo.classList.toggle('hidden', pedido.estado!=='en_preparacion');
  btnCancelar.classList.toggle('hidden', !['pendiente','en_preparacion'].includes(pedido.estado));

  btnIniciar.onclick = iniciarPedido;
  btnListo.onclick   = marcarListo;
  btnCancelar.onclick= cancelarPedido;

  wrap.innerHTML = `
    <div class="grid md:grid-cols-2 gap-3">
      <div class="p-3 rounded-xl border border-slate-700 bg-slate-700/40">
        <div class="flex items-center gap-2 text-sm text-slate-300">
          <i data-lucide="hash" class="w-4 h-4"></i>
          <span class="font-semibold">#${pedido.id}</span>
          ${pedido.codigo ? `<span class="opacity-70">· ${pedido.codigo}</span>`:''}
          ${pedido.origen ? `<span class="opacity-70">· ${pedido.origen}</span>`:''}
        </div>
        <div class="text-xs text-slate-400 mt-1 flex items-center gap-1">
          <i data-lucide="clock" class="w-3.5 h-3.5"></i> Creado: ${fmtTime(pedido.creado_en)}
        </div>
        ${pedido.notas ? `
  <div class="mt-2 text-sm note-pill">
    <i data-lucide="bell-ring" class="w-4 h-4"></i>
    <span class="note-strong">${pedido.notas}</span>
  </div>` : '' }
      </div>

      <div class="p-3 rounded-xl border border-slate-700 bg-slate-700/40 text-right">
        <div class="text-xs text-slate-400">Total</div>
        <div class="text-2xl font-bold">$${Number(pedido.total||0).toFixed(2)}</div>
      </div>
    </div>

    <div class="mt-4">
      <div class="text-xs uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-2">
        <i data-lucide="package" class="w-4 h-4"></i> Ítems
      </div>
      <div class="space-y-2">
        ${items.map(it => `
          <div class="p-3 rounded-xl border border-slate-700 bg-slate-700/40">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-semibold truncate">${it.nombre_snapshot}</div>
                <div class="text-xs text-slate-300">Tamaño: ${it.tamano_label || '—'}</div>
                ${it.nota ? `
  <div class="text-xs mt-1 note-pill">
    <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>
    <span class="note-strong">${it.nota}</span>
  </div>` : '' }
              </div>
              <div class="text-right shrink-0">
                <div class="text-lg font-semibold">x${Number(it.cantidad)}</div>
                <div class="text-sm">$${Number(it.total_linea).toFixed(2)}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  paintIcons();
}

/* ----------------- Acciones ----------------- */
function iniciarPedido(){
  if(!pedidoActual) return;
  const fd = new FormData(); fd.append('action','tomar'); fd.append('id', pedidoActual.id);
  fetch(API, {method:'POST', body:fd})
    .then(r=>r.json())
    .then(data=>{
      if(!data.ok) throw new Error(data.message||'No se pudo iniciar');
      cargarDetalle(pedidoActual.id);
      loadPendientes(false);
    })
    .catch(err=> Swal.fire({icon:'error', title:'Error', text: err.message}));
}

function marcarListo(){
  if(!pedidoActual) return;
  Swal.fire({
    title:'¿Terminar pedido?', text:`#${pedidoActual.id}`, icon:'question',
    showCancelButton:true, confirmButtonText:'Sí, terminar'
  }).then(res=>{
    if(!res.isConfirmed) return;
    const fd = new FormData(); fd.append('action','listo'); fd.append('id', pedidoActual.id);
    fetch(API, {method:'POST', body:fd})
      .then(r=>r.json())
      .then(data=>{
        if(!data.ok) throw new Error(data.message||'No se pudo terminar');
        Swal.fire({icon:'success', title:'Pedido listo', timer:1200, showConfirmButton:false});
        cargarDetalle(pedidoActual.id);
        loadPendientes(false);
      })
      .catch(err=> Swal.fire({icon:'error', title:'Error', text: err.message}));
  });
}

function cancelarPedido(){
  if(!pedidoActual) return;
  Swal.fire({
    title:'¿Cancelar pedido?', text:`#${pedidoActual.id}`,
    icon:'warning', showCancelButton:true,
    confirmButtonText:'Sí, cancelar', confirmButtonColor:'#ef4444'
  }).then(res=>{
    if(!res.isConfirmed) return;

    const fd = new FormData();
    fd.append('action','cancelar');     // ← IMPORTANTE
    fd.append('id', pedidoActual.id);   // ← IMPORTANTE

    fetch(API, { method:'POST', body: fd })
      .then(r=>r.json())
      .then(data=>{
        if(!data.ok) throw new Error(data.message||'No se pudo cancelar');
        Swal.fire({icon:'success', title:'Pedido cancelado', timer:1200, showConfirmButton:false});
        pedidoActual = null; selectedId = null;
        lastDetalleSignature = ''; // reset
        document.getElementById('detalleWrap').innerHTML =
          `<div class="text-slate-400 text-sm">Selecciona un pedido pendiente en la izquierda…</div>`;
        const badge = document.getElementById('estadoBadge');
        badge.className = 'text-xs px-2 py-1 rounded-full bg-slate-700 flex items-center gap-1';
        badge.innerHTML = `<i data-lucide="minus" class="w-3.5 h-3.5"></i> Ninguno`;
        document.getElementById('btnIniciar').classList.add('hidden');
        document.getElementById('btnListo').classList.add('hidden');
        document.getElementById('btnCancelar').classList.add('hidden');
        loadPendientes(false);
        paintIcons();
      })
      .catch(err=> Swal.fire({icon:'error', title:'Error', text: err.message}));
  });
}


/* ----------------- Tareas periódicas ----------------- */
setInterval(()=>{ document.getElementById('clock').textContent = nowStr(); }, 1000);
loadPendientes(false);
setInterval(()=> {
  loadPendientes(true);
  if (selectedId) cargarDetalle(selectedId, {silent:true}); // ← evita skeleton y parpadeo
}, 5000);

// Inicializa iconos al cargar
document.addEventListener('DOMContentLoaded', paintIcons);