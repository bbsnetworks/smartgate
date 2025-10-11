  const API = "../php/caf_lista_controller.php";

  const modo      = document.getElementById('modo');
  const wrapDia   = document.getElementById('wrapDia');
  const wrapMes   = document.getElementById('wrapMes');
  const fechaDia  = document.getElementById('fechaDia');
  const fechaMes  = document.getElementById('fechaMes');
  const codigo    = document.getElementById('codigo');
  const btnBuscar = document.getElementById('btnBuscar');
  const btnLimpiar= document.getElementById('btnLimpiar');

  const lblResumen= document.getElementById('lblResumen');
  const lblPagina = document.getElementById('lblPagina');
  const btnPrev   = document.getElementById('btnPrev');
  const btnNext   = document.getElementById('btnNext');
  const pageSizeSel = document.getElementById('pageSize');

  const tbody     = document.getElementById('tbody');
  const vacio     = document.getElementById('vacio');

  const estado    = document.getElementById('estado');


  let page = 1;
  let pageSize = parseInt(pageSizeSel.value, 10);
  let total = 0;

  // UI: toggle día/mes
  modo.addEventListener('change', () => {
    if (modo.value === 'dia') {
      wrapDia.classList.remove('hidden');
      wrapMes.classList.add('hidden');
    } else {
      wrapMes.classList.remove('hidden');
      wrapDia.classList.add('hidden');
    }
  });

  // Defaults: hoy y mes actual
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth()+1).padStart(2,'0');
  const dd = String(hoy.getDate()).padStart(2,'0');
  fechaDia.value = `${yyyy}-${mm}-${dd}`;
  fechaMes.value = `${yyyy}-${mm}`;

  btnBuscar.addEventListener('click', () => { page = 1; cargar(); });
  btnLimpiar.addEventListener('click', () => {
    codigo.value = '';
    page = 1; cargar();
    estado.value = 'pendiente';
  });

  btnPrev.addEventListener('click', () => {
    if (page > 1) { page--; cargar(); }
  });
  btnNext.addEventListener('click', () => {
    const maxPage = Math.ceil(total / pageSize) || 1;
    if (page < maxPage) { page++; cargar(); }
  });
  pageSizeSel.addEventListener('change', () => {
    pageSize = parseInt(pageSizeSel.value, 10);
    page = 1; cargar();
  });

  codigo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { page = 1; cargar(); }
  });

  function fmtMoney(n) {
    const num = Number(n || 0);
    return num.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  }

  async function cargar() {
  try {
    const params = new URLSearchParams({
      action: 'listar',
      modo: modo.value,
      page: page,
      pageSize: pageSize
    });

    if (modo.value === 'dia') {
      if (!fechaDia.value) { Swal.fire({icon:'warning', title:'Selecciona un día'}); return; }
      params.set('fecha', fechaDia.value);
    } else {
      if (!fechaMes.value) { Swal.fire({icon:'warning', title:'Selecciona un mes'}); return; }
      params.set('mes', fechaMes.value);
    }

    if (codigo.value.trim() !== '') params.set('codigo', codigo.value.trim());

    // 🔽 NUEVO: enviar estado
    if (estado.value) params.set('estado', estado.value);

    const url = `${API}?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) throw new Error(data.message || 'No se pudo cargar la lista');

    total = data.total || 0;
    renderTabla(data.rows || []);
    renderResumen();
    renderPaginacion();
  } catch (err) {
    console.error(err);
    Swal.fire({icon:'error', title:'Error', text: err.message});
  }
}


  function renderTabla(rows) {
  tbody.innerHTML = '';
  if (!rows.length) {
    vacio.classList.remove('hidden');
    return;
  }
  vacio.classList.add('hidden');

  rows.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-800/50";
    tr.innerHTML = `
      <td class="px-4 py-3 align-middle">${(page-1)*pageSize + idx + 1}</td>
      <td class="px-4 py-3 align-middle font-medium">${r.codigo || ''}</td>
      <td class="px-4 py-3 align-middle">${(r.origen || '').toUpperCase()}</td>
      <td class="px-4 py-3 align-middle">
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${badgeEstado(r.estado)}">
          ${r.estado || ''}
        </span>
      </td>
      <td class="px-4 py-3 align-middle text-right">${fmtMoney(r.subtotal)}</td>
      <td class="px-4 py-3 align-middle text-right">-${fmtMoney(r.descuento)}</td>
      <td class="px-4 py-3 align-middle text-right">${fmtMoney(r.impuestos)}</td>
      <td class="px-4 py-3 align-middle text-right">${fmtMoney(r.propina)}</td>
      <td class="px-4 py-3 align-middle text-right font-semibold">${fmtMoney(r.total)}</td>
      <td class="px-4 py-3 align-middle">${fmtFecha(r.creado_en)}</td>
      <td class="px-4 py-3 align-middle">${r.pagado_en ? fmtFecha(r.pagado_en) : ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

function badgeEstado(estado = '') {
  const e = (estado || '').toLowerCase();
  if (e === 'pagado' || e === 'entregado' || e === 'listo') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-600/30';
  if (e === 'pendiente' || e === 'en_preparacion') return 'bg-amber-500/15 text-amber-300 border border-amber-600/30';
  if (e === 'cancelado') return 'bg-rose-500/15 text-rose-300 border border-rose-600/30';
  return 'bg-slate-700/30 text-slate-300 border border-slate-600/30';
}


  function fmtFecha(dt) {
    if (!dt) return '';
    // Render local legible
    const d = new Date(dt.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dt;
    return d.toLocaleString('es-MX', { hour12: false });
  }

  function renderResumen() {
    const maxPage = Math.ceil(total / pageSize) || 1;
    lblResumen.textContent = `${total} pedido${total===1?'':'s'} · mostrando ${(total===0)?0:((page-1)*pageSize+1)}–${Math.min(page*pageSize, total)}`;
    lblPagina.textContent  = `Página ${page} de ${maxPage}`;
  }

  function renderPaginacion() {
    btnPrev.disabled = page <= 1;
    const maxPage = Math.ceil(total / pageSize) || 1;
    btnNext.disabled = page >= maxPage;
  }

  // Primera carga
  cargar();