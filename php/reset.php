<?php
require_once '../php/conexion.php';
$token = $_GET['token'] ?? '';
$valido = false;

if ($token) {
    $stmt = $conexion->prepare("
        SELECT r.usuario_id, u.correo, r.expira 
        FROM recuperaciones r 
        JOIN usuarios u ON r.usuario_id = u.id 
        WHERE r.token = ? LIMIT 1
    ");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($res->num_rows > 0) {
        $data = $res->fetch_assoc();
        if (new DateTime() < new DateTime($data['expira'])) {
            $valido = true;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recuperar Contraseña</title>
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/sweetalert2@11.js"></script>
</head>
<body class="bg-gray-100 h-screen flex justify-center items-center">

<?php if (!$valido): ?>
  <div class="bg-white p-8 rounded shadow text-center">
    <h1 class="text-2xl font-bold text-red-600">Token inválido o expirado</h1>
    <p class="mt-4">Solicita nuevamente el enlace de recuperación.</p>
  </div>
<?php else: ?>
  <div class="bg-white p-8 rounded shadow w-full max-w-md">
    <h2 class="text-2xl font-bold text-center mb-6">Nueva Contraseña</h2>
    <form id="resetForm">
      <input type="hidden" id="token" value="<?= htmlspecialchars($token) ?>">
      <div class="mb-4">
        <label class="block text-gray-700 mb-1">Nueva Contraseña:</label>
        <input type="password" id="nueva" class="w-full p-2 border rounded" required>
      </div>
      <div class="mb-4">
        <label class="block text-gray-700 mb-1">Confirmar Contraseña:</label>
        <input type="password" id="confirmar" class="w-full p-2 border rounded" required>
      </div>
      <button type="submit" class="bg-green-600 hover:bg-green-700 text-white w-full py-2 rounded">Cambiar Contraseña</button>
    </form>
  </div>

  <script>
    document.getElementById("resetForm").addEventListener("submit", function(e) {
      e.preventDefault();
      const nueva = document.getElementById("nueva").value;
      const confirmar = document.getElementById("confirmar").value;
      const token = document.getElementById("token").value;

      if (nueva.length < 6) {
        Swal.fire("Error", "La contraseña debe tener al menos 6 caracteres", "error");
        return;
      }

      if (nueva !== confirmar) {
        Swal.fire("Error", "Las contraseñas no coinciden", "error");
        return;
      }

      fetch("../php/reset_password.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: nueva })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          Swal.fire("Éxito", data.msg, "success").then(() => {
            window.location.href = "login.php";
          });
        } else {
          Swal.fire("Error", data.error, "error");
        }
      });
    });
  </script>
<?php endif; ?>

</body>
</html>
