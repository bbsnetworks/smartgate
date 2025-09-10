document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const boton = this.querySelector('button[type="submit"]');
  const correo = document.getElementById("correo").value;
  const password = document.getElementById("password").value;

  // Desactivar botón y mostrar texto de carga
  boton.disabled = true;
  const textoOriginal = boton.innerHTML;
  boton.innerHTML = `<span class="animate-spin mr-2 border-2 border-t-2 border-white rounded-full w-4 h-4 inline-block align-middle"></span> Cargando...`;

  fetch("../php/login.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      swalSuccess.fire({
        icon: 'success',
        title: 'Bienvenido',
        text: data.msg || 'Redirigiendo...',
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#22c55e'
      }).then(() => {
        window.location.href = "../index.php";
      });
    } else {
      swalError.fire({
        icon: 'error',
        title: 'Error',
        text: data.error || 'Credenciales incorrectas',
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#ef4444'
      });
    }
  })
  .catch(error => {
    console.error("Error de red:", error);
    swalError.fire("Error", "Error de red. Intenta de nuevo.", "error");
  })
  .finally(() => {
    // Restaurar botón
    boton.disabled = false;
    boton.innerHTML = textoOriginal;
  });
});
document.getElementById("togglePassword").addEventListener("click", function () {
  const passwordInput = document.getElementById("password");
  const iconEye = document.getElementById("iconEye");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    // Cambiar icono a "ojo tachado"
    iconEye.outerHTML = `
      <svg id="iconEye" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7
                 a10.05 10.05 0 012.67-4.418M15 12a3 3 0 11-6 0 3 3 0 016 0zM3 3l18 18" />
      </svg>`;
  } else {
    passwordInput.type = "password";
    // Cambiar icono a "ojo normal"
    iconEye.outerHTML = `
      <svg id="iconEye" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7
                 -1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>`;
  }
});

