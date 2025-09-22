
// Modal de éxito (verde)
window.swalSuccess = Swal.mixin({
  icon: 'success',
  background: '#1e293b', // gray-800
  color: '#f8fafc',       // zinc-50
  confirmButtonColor: '#22c55e', // verde tailwind
  cancelButtonColor: '#334155',  // gris oscuro
  customClass: {
    popup: 'rounded-xl shadow-lg',
    title: 'text-lg font-semibold',
    confirmButton: 'px-4 py-2',
  },
});

// Modal de error (rojo)
window.swalError = Swal.mixin({
  icon: 'error',
  background: '#1e293b',
  color: '#f8fafc',
  confirmButtonColor: '#ef4444', // rojo tailwind
  cancelButtonColor: '#334155',
  customClass: {
    popup: 'rounded-xl shadow-lg',
    title: 'text-lg font-semibold',
    confirmButton: 'px-4 py-2',
  },
});
window.swalInfo = Swal.mixin({
  icon: 'info',
  background: '#1e293b',
  color: '#f8fafc',
  confirmButtonColor: '#6366f1',
  customClass: {
    popup: 'rounded-xl shadow-md',
    title: 'text-white text-lg font-semibold text-center', // ← centrado
    htmlContainer: 'text-slate-200 text-sm text-center px-4', // ← centrado y padding
    confirmButton: 'bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded mx-2',
    cancelButton: 'bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded mx-2',
    actions: 'flex justify-center gap-4 mt-4', // ← separa botones
    closeButton: 'text-white hover:text-red-500'
  },
  buttonsStyling: false
});
window.swalcard = Swal.mixin({
  background: '#1e293b',
  color: '#f8fafc',
  confirmButtonColor: '#6366f1',
  customClass: {
    popup: 'rounded-xl shadow-md',
    title: 'text-white text-lg font-semibold text-center', // ← centrado
    htmlContainer: 'text-slate-200 text-sm text-center px-4', // ← centrado y padding
    confirmButton: 'bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded mx-2',
    cancelButton: 'bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded mx-2',
    actions: 'flex justify-center gap-4 mt-4', // ← separa botones
    closeButton: 'text-white hover:text-red-500'
  },
  buttonsStyling: false
});
// Inyectar estilos para inputs/selects dentro de SweetAlert
const swalStyle = document.createElement("style");
swalStyle.innerHTML = `
  .swal2-popup select,
  .swal2-popup input,
  .swal2-popup textarea {
    background-color: #1e293b !important; /* fondo oscuro */
    color: #f8fafc !important;           /* texto claro */
    border: 1px solid #334155 !important; /* borde gris */
    border-radius: 0.5rem; /* rounded-md */
    padding: 0.5rem;
  }

  .swal2-popup select:focus {
    outline: none;
    border-color: #6366f1; /* indigo-500 */
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
  }

  .swal2-popup select option {
    background-color: #1e293b;
    color: #f8fafc;
  }
`;
document.head.appendChild(swalStyle);