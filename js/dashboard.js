document.addEventListener('DOMContentLoaded', async () => {
  const esValida = await verificarSuscripcionSistema();

  if (!esValida) {
    // Bloquear las cards clicables
    document.querySelectorAll('.card-bloqueable').forEach(card => {
      card.classList.add('pointer-events-none', 'opacity-50', 'cursor-not-allowed');
      card.addEventListener('click', (e) => {
        e.preventDefault();
        Swal.fire({
          icon: 'error',
          title: 'Licencia no activa',
          text: 'Debes activar una suscripción para usar esta función',
          background: '#1e293b',
          color: '#f8fafc'
        });
      });
    });
  }
});

async function verificarSuscripcionSistema() {
  try {
    const res = await fetch("php/verificar_suscripcion.php");
    const data = await res.json();
    return !!data.valida;
  } catch (err) {
    return false;
  }
}

async function modalSuscripcion() {
  const estado = await verificarSuscripcion(true);

  Swal.fire({
    title: 'Administrar Suscripción',
    html: `
      <p class="text-sm mb-2">Verifica o agrega la licencia actual del sistema.</p>
      <div id="estadoSuscripcion" class="text-md font-semibold ${estado.clase}">${estado.mensaje}</div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Verificar',
    cancelButtonText: 'Cerrar',
    showDenyButton: true,
    denyButtonText: estado.mostrarAgregar ? 'Agregar licencia' : 'Eliminar',
    background: '#1e293b',
    color: '#f8fafc',
    confirmButtonColor: '#3b82f6',
    denyButtonColor: estado.mostrarAgregar ? '#22c55e' : '#ef4444',
    didOpen: async () => {
      const nuevoEstado = await verificarSuscripcion();
      const divEstado = document.getElementById("estadoSuscripcion");
      if (divEstado) {
        divEstado.textContent = nuevoEstado.mensaje;
        divEstado.className = `text-md font-semibold mb-4 ${nuevoEstado.clase}`;
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      modalSuscripcion(); // volver a verificar
    } else if (result.isDenied) {
      if (estado.mostrarAgregar) {
        agregarLicencia();
      } else {
        eliminarSuscripcion();
      }
    }
  });
}
function agregarLicencia() {
  Swal.fire({
    title: 'Agregar Licencia',
    html: `
      <input id="input-id" type="number" class="swal2-input" placeholder="ID de la suscripción">
      <input id="input-codigo" type="text" class="swal2-input" placeholder="Código de activación">
    `,
    confirmButtonText: 'Guardar',
    showCancelButton: true,
    background: '#1e293b',
    color: '#f8fafc',
    preConfirm: () => {
      const id = document.getElementById("input-id").value;
      const codigo = document.getElementById("input-codigo").value;
      if (!id || !codigo) {
        Swal.showValidationMessage('Debes ingresar ambos campos');
        return false;
      }
      return { id, codigo };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      const res = await fetch('php/activar_suscripcion.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.value)
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Listo', `Licencia activada hasta ${data.fecha_fin}`, 'success');
        location.reload();
      } else {
        Swal.fire('Error', data.error || 'No se pudo activar', 'error');
      }
    }
  });
}



function activarSuscripcion() {
  Swal.fire({
    title: 'Activar Licencia',
    html: `
      <input id="input-id" type="number" class="swal2-input" placeholder="ID de la suscripción">
      <input id="input-codigo" type="text" class="swal2-input" placeholder="Código de activación">
    `,
    confirmButtonText: 'Activar',
    showCancelButton: true,
    cancelButtonText: 'Cancelar',
    background: '#1e293b',
    color: '#f8fafc',
    preConfirm: () => {
      const id = document.getElementById('input-id').value;
      const codigo = document.getElementById('input-codigo').value;
      if (!id || !codigo) {
        Swal.showValidationMessage('Debes ingresar ambos campos');
        return false;
      }
      return { id, codigo };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      const { id, codigo } = result.value;
      const res = await fetch('php/activar_suscripcion.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, codigo })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Activada', `Licencia válida hasta ${data.fecha_fin}`, 'success');
      } else {
        Swal.fire('Error', data.error || 'No se pudo activar', 'error');
      }
    }
  });
}



function eliminarSuscripcion() {
  Swal.fire({
    title: '¿Eliminar suscripción?',
    text: 'Esto desactivará el sistema. ¿Deseas continuar?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    background: '#1e293b',
    color: '#f8fafc',
    confirmButtonColor: '#ef4444'
  }).then(async (result) => {
    if (result.isConfirmed) {
      const res = await fetch('php/eliminar_suscripcion.php', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Eliminada', 'La suscripción fue eliminada.', 'success');
        location.reload();
      } else {
        Swal.fire('Error', data.error || 'No se pudo eliminar.', 'error');
      }
    }
  });
}
async function verificarSuscripcion(retornarSolo = false) {
  let mensaje = "Verificando...";
  let clase = "text-yellow-400";
  let mostrarAgregar = false;

  try {
    const res = await fetch("php/verificar_suscripcion.php");
    const data = await res.json();

    if (data.valida) {
      mensaje = `✅ Suscripción válida hasta ${data.fecha_fin}`;
      clase = "text-green-400";
    } else {
      mensaje = `❌ ${data.error}`;
      clase = "text-red-400";

      if (
        data.error?.toLowerCase().includes("archivo") ||
        data.error?.toLowerCase().includes("incompleto") ||
        data.error?.toLowerCase().includes("vacía") ||
        data.error?.toLowerCase().includes("agregar")
      ) {
        mostrarAgregar = true;
      }
    }
  } catch (err) {
    mensaje = "⚠️ Error al verificar la suscripción";
    clase = "text-orange-400";
  }

  if (retornarSolo) return { mensaje, clase, mostrarAgregar };
  return { mensaje, clase, mostrarAgregar };
}
async function modalApiConfig() {
  // 1) Leer si existe la configuración
  let existe = false;
  let prev = { userKey: '', userSecret: '', urlHikCentralAPI: '' };
  try {
    const r = await fetch('php/api_config_controller.php?action=obtener', { cache: 'no-store' });
    const d = await r.json();
    if (d.ok && d.data) {
      existe = true;
      prev = d.data;
    }
  } catch (e) {
    // no bloquear si falla; permitimos crear
  }

  // 2) Mostrar modal con valores (si existen)
  const denyText = existe ? 'Eliminar' : undefined;
  const showDenyButton = !!existe;

  Swal.fire({
    title: 'Configurar API HikCentral',
    html: `
      <div class="flex flex-col gap-2 text-left">
        <label class="text-sm text-slate-300">User Key</label>
        <input id="api_userKey" class="swal2-input" placeholder="11111111" value="${escapeHtml(prev.userKey || '')}">
        <label class="text-sm text-slate-300 mt-2">User Secret</label>
        <input id="api_userSecret" type="password" class="swal2-input" placeholder="••••••••••" value="${escapeHtml(prev.userSecret || '')}">
        <label class="text-sm text-slate-300 mt-2">URL HikCentral API</label>
        <input id="api_url" class="swal2-input" placeholder="" value="${escapeHtml(prev.urlHikCentralAPI || 'http://127.0.0.1:9016')}">
        ${prev.updated_at ? `<small class="text-slate-400 mt-1">Última actualización: ${prev.updated_at}</small>` : '' }
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar',
    showDenyButton,
    denyButtonText: denyText,
    background: '#1e293b',
    color: '#f8fafc',
    confirmButtonColor: '#10b981',
    denyButtonColor: '#ef4444',
    preConfirm: () => {
      const userKey = document.getElementById('api_userKey').value.trim();
      const userSecret = document.getElementById('api_userSecret').value.trim();
      const urlHikCentralAPI = document.getElementById('api_url').value.trim();

      if (!userKey || !userSecret || !urlHikCentralAPI) {
        Swal.showValidationMessage('Todos los campos son obligatorios');
        return false;
      }
      if (!/^https?:\/\/.+/i.test(urlHikCentralAPI)) {
        Swal.showValidationMessage('La URL debe comenzar con http:// o https://');
        return false;
      }
      return { userKey, userSecret, urlHikCentralAPI };
    }
  }).then(async (res) => {
    if (res.isConfirmed && res.value) {
      await guardarApiConfig(res.value);
    } else if (res.isDenied && existe) {
      await eliminarApiConfig();
    }
  });
}

// Guardar (insert/overwrite id=1)
async function guardarApiConfig(payload) {
  try {
    const r = await fetch('php/api_config_controller.php?action=guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const d = await r.json();
    if (d.ok) {
      Swal.fire({ icon: 'success', title: 'Listo', text: 'Configuración guardada.', background: '#1e293b', color: '#f8fafc' });
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: d.msg || 'No se pudo guardar', background: '#1e293b', color: '#f8fafc' });
    }
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: 'Error de red/servidor', background: '#1e293b', color: '#f8fafc' });
  }
}

// Eliminar (si existe)
async function eliminarApiConfig() {
  const confirm = await Swal.fire({
    title: '¿Eliminar configuración?',
    text: 'Se eliminarán las credenciales guardadas.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    background: '#1e293b',
    color: '#f8fafc',
    confirmButtonColor: '#ef4444'
  });
  if (!confirm.isConfirmed) return;

  try {
    const r = await fetch('php/api_config_controller.php?action=eliminar', { method: 'POST' });
    const d = await r.json();
    if (d.ok) {
      Swal.fire({ icon: 'success', title: 'Eliminada', text: 'La configuración fue eliminada.', background: '#1e293b', color: '#f8fafc' });
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: d.msg || 'No se pudo eliminar', background: '#1e293b', color: '#f8fafc' });
    }
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: 'Error de red/servidor', background: '#1e293b', color: '#f8fafc' });
  }
}

// Utilidad simple para evitar inyectar HTML en inputs del modal
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}



