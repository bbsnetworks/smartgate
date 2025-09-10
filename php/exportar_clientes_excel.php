<?php
ob_end_clean();
require 'conexion.php';
require '../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

try {
  $spreadsheet = new Spreadsheet();
  $sheet = $spreadsheet->getActiveSheet();

  // Encabezados EXACTOS
  $encabezados = [
    "ID", "First Name", "Last Name", "Department", "Start Time of Effective Period",
    "End Time of Effective Period", "Enrollment Date", "Type", "Card", "Gender",
    "Position", "Email", "Phone", "Remark", "PIN", "Superuser", "Extended Access",
    "Resident Location", "Skin-Surface Temperature", "Temperature Status", "Floor",
    "Device Administrator", "Digital Signage Public Additional Information", "Departure Date",
    "Resignation Type", "Application Date", "Departure Reason", "Self-Service Password",
    "Open Door via Bluetooth", "Check-In/Out via Mobile Client", "Access Level", "Schedule"
  ];
  $sheet->fromArray($encabezados, null, 'A1');

  $sql = "SELECT personCode, nombre, apellido, genero, telefono, email, Inicio, Fin, FechaIngreso, grupo, tipo, department FROM clientes";
  $res = mysqli_query($conexion, $sql);

  if (!$res) {
    http_response_code(500);
    echo "Error al consultar la base de datos.";
    exit;
  }

  $fila = 2;
while ($row = mysqli_fetch_assoc($res)) {
  $genderText = $row['genero'] == 1 ? 'Male' : 'Female';
  $start = date("Y/m/d H:i:s", strtotime($row['Inicio']));
  $end = date("Y/m/d H:i:s", strtotime($row['Fin']));
  $enroll = date("Y/m/d H:i:s", strtotime($row['Inicio']));

  $sheet->fromArray([
    $row['personCode'],                       // ID
    $row['nombre'],                           // First Name
    $row['apellido'],                         // Last Name
    $row['department'],                              // Department
    $start,                                   
    $end,                                     
    $enroll,                                  
    "Basic Person",                           // Type
    "",                                       // Card
    $genderText,                              // Gender
    "",                                       // Position
    $row['email'],                            
    $row['telefono'],                         
    "",                                       // Remark
    "",                                       // PIN
    "Disable",                                // Superuser
    "Disable",                                // Extended Access
    "",                                       // Resident Location
    "Unknown",                                // Skin-Surface Temperature
    "Unknown",                                // Temperature Status
    "",                                       // Floor
    "Disable",                                // Device Administrator
    "", "", "", "", "",                       // Digital Signage → Departure Reason
    "",                                       // Self-Service Password
    "Enable",                                 // Open Door via Bluetooth
    "Disable",                                // Check-In/Out via Mobile Client
    "Gym Access Level-gym Schedule",         // Access Level
    ""                                        // Schedule
  ], null, "A$fila");

  $fila++;
}


  header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  header('Content-Disposition: attachment;filename="clientes_respaldo.xlsx"');
  header('Cache-Control: max-age=0');

  $writer = new Xlsx($spreadsheet);
  $writer->save('php://output');
  exit;
  
} catch (Exception $e) {
  http_response_code(500);
  echo "Error al generar el respaldo: " . $e->getMessage();
}




