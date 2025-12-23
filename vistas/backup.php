<?php include_once '../php/verificar_sesion.php'; ?>

<?php
$dashboardPath = strpos($_SERVER['SCRIPT_NAME'], 'vistas/admin/') !== false
    ? '../../dashboard.php'
    : '../dashboard.php';

if (isset($_GET['bloqueado'])):
?>
  <script src="../js/sweetalert2@11.js"></script>
  <script>
    Swal.fire({
      icon: 'error',
      title: 'Acceso restringido',
      text: 'Tu suscripción ha expirado o no es válida.',
      background: '#1e293b',
      color: '#f8fafc'
    }).then(() => {
      window.location.href = "<?php echo $dashboardPath; ?>";
    });
  </script>
<?php
  exit;
endif;
?>

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reportes - Gym Admin</title>
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <link rel="stylesheet" href="../src/output.css">
  <script src="../js/sweetalert2@11.js"></script>
  <script src="../js/lucide.min.js"></script>
  <script src="../js/jspdf.umd.min.js"></script>
  <link rel="stylesheet" href="fonts/bootstrap-icons.css">
</head>
<body class="bg-gray-100 font-sans min-h-screen bg-[url('https://www.toptal.com/designers/subtlepatterns/uploads/brickwall.png')] bg-fixed bg-auto">
<?php include "../includes/navbar.php" ?>
<div class="max-w-xl mx-auto mt-16 bg-white p-8 rounded-xl shadow">
  <h2 class="text-2xl font-bold mb-4 text-center text-gray-700">Respaldo de Clientes</h2>
  <p class="text-gray-600 mb-6 text-center">Exporta la lista completa de clientes para respaldarla o importar a HikCentral.</p>
  <div class="flex justify-center">
    <button onclick="generarRespaldoClientes()" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow">
      📥 Generar respaldo Excel
    </button>
  </div>
</div>

<script>
    async function generarRespaldoClientes() {
  Swal.fire({
    title: 'Generando respaldo...',
    text: 'Por favor espera',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const res = await fetch('../php/exportar_clientes_excel.php');

    if (!res.ok) throw new Error("No se pudo generar el respaldo");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'clientes_respaldo.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();

    Swal.fire('¡Éxito!', 'El respaldo se ha generado correctamente.', 'success');
  } catch (err) {
    console.error(err);
    Swal.fire('Error', 'No se pudo generar el respaldo. Intenta de nuevo.', 'error');
  }
}

</script>
</body>
</html>