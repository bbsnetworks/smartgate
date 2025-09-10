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



