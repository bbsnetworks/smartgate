document.addEventListener("DOMContentLoaded", function () {
    fetchOrganizations();
    fetchGroups();
    setupCamera();
    fetchNextPersonCode();

    const form = document.getElementById("addUserForm");
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (validarFormulario()) {
            addUser();
        }
    });
});
function validarFormulario() {
    const fields = {
        personCode: document.getElementById("personCode"),
        personFamilyName: document.getElementById("personFamilyName"),
        personGivenName: document.getElementById("personGivenName"),
        gender: document.getElementById("gender"),
        orgIndexCode: document.getElementById("orgIndexCode"),
        phoneNo: document.getElementById("phoneNo"),
        email: document.getElementById("email"),
        groupIndexCode: document.getElementById("groupIndexCode"),
        faceData: document.getElementById("faceData"),
        faceIconData: document.getElementById("faceIconData")
    };

    // Limpiar errores previos
    Object.values(fields).forEach(el => el?.classList.remove("border-red-500", "ring", "ring-red-300"));
    document.querySelectorAll(".text-red-500.text-sm").forEach(el => {
    if (el.id !== "personCodeError") el.remove();
});

    let valido = true;

    function marcarError(el, mensaje) {
        el.classList.add("border-red-500", "ring", "ring-red-300");
        const error = document.createElement("div");
        error.className = "text-red-500 text-sm mt-1";
        error.textContent = mensaje;
        el.parentElement.appendChild(error);
        valido = false;
    }

    if (!fields.personCode.value.trim()) marcarError(fields.personCode, "Código de persona requerido");

    if (!fields.personGivenName.value.trim()) {
        marcarError(fields.personGivenName, "Nombre requerido");
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(fields.personGivenName.value.trim())) {
        marcarError(fields.personGivenName, "Solo letras en el nombre");
    }

    if (!fields.personFamilyName.value.trim()) {
        marcarError(fields.personFamilyName, "Apellido requerido");
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(fields.personFamilyName.value.trim())) {
        marcarError(fields.personFamilyName, "Solo letras en el apellido");
    }

    if (!fields.orgIndexCode.value) marcarError(fields.orgIndexCode, "Selecciona una suborganización");
    if (!fields.groupIndexCode.value) marcarError(fields.groupIndexCode, "Selecciona un grupo");

    if (fields.phoneNo.value && !/^\d{10}$/.test(fields.phoneNo.value.trim())) {
        marcarError(fields.phoneNo, "Teléfono debe tener 10 dígitos");
    }

    if (fields.email.value && !/^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(fields.email.value.trim())) {
        marcarError(fields.email, "Correo electrónico no válido");
    }

    if (!fields.faceData.value || !fields.faceIconData.value) {
        Swal.fire("Foto requerida", "Debes capturar una imagen para el usuario.", "warning");
        valido = false;
    }
    const tieneImagenValida =
    fields.faceData.value.trim() !== "" &&
    fields.faceIconData.value.trim() !== "" &&
    !document.getElementById("capturedImage").classList.contains("hidden");

    if (!tieneImagenValida) {
        Swal.fire("Foto requerida", "Debes capturar o subir una imagen del rostro.", "warning");
        valido = false;
    }
    return valido;
}
function fetchGroups() {
    fetch("../php/get_groups.php")
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById("groupIndexCode");
            select.innerHTML = "";
            let defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Seleccione un grupo";
            select.appendChild(defaultOption);
            data.list.forEach(group => {
                let option = document.createElement("option");
                option.value = group.privilegeGroupId;
                option.textContent = group.privilegeGroupName;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error("Error al obtener grupos:", error);
            alert("No se pudieron cargar los grupos. Revisa la consola.");
        });
}

async function addUser() {
    const submitButton = document.querySelector(
        "#addUserForm button[type='submit']"
    );

    // Evitar doble clic
    if (submitButton.disabled) return;

    submitButton.disabled = true;

    // Guardamos el contenido original del botón
    const contenidoOriginal = submitButton.innerHTML;

    submitButton.innerHTML = `
        <span class="inline-flex items-center gap-2">
            <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                    fill="none">
                </circle>
                <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z">
                </path>
            </svg>
            Procesando...
        </span>
    `;

    Swal.fire({
        title: "Registrando usuario",
        html: "Espera un momento mientras procesamos la información.",
        background: "#1e293b",
        color: "#f8fafc",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        },
    });

    try {
        const orgParentName =
            document.getElementById("orgParent")
                .selectedOptions[0]?.text || "";

        const orgSubName =
            document.getElementById("orgIndexCode")
                .selectedOptions[0]?.text || "";

        const department =
            `All Departments/${orgParentName}/${orgSubName}`;

        const formData = {
            personCode: document
                .getElementById("personCode").value.trim(),

            personFamilyName: document
                .getElementById("personFamilyName").value.trim(),

            personGivenName: document
                .getElementById("personGivenName").value.trim(),

            gender: parseInt(
                document.getElementById("gender").value
            ),

            orgIndexCode:
                document.getElementById("orgIndexCode").value,

            orgName: orgSubName,
            orgParentName: orgParentName,
            department: department,

            phoneNo: document
                .getElementById("phoneNo").value.trim(),

            email: document
                .getElementById("email").value.trim(),

            groupIndexCode:
                document.getElementById("groupIndexCode").value,

            emergencia:
                document.getElementById("emergencia")
                    ?.value.trim() || null,

            sangre:
                document.getElementById("sangre")
                    ?.value.trim() || null,

            comentarios:
                document.getElementById("comentarios")
                    ?.value.trim() || null,

            faces: [{
                faceData:
                    document.getElementById("faceData").value,

                faceIconData:
                    document.getElementById("faceIconData").value,
            }],
        };

        const response = await fetch("../php/add_user.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
        });

        if (!response.ok) {
            throw new Error(
                `Error HTTP ${response.status}`
            );
        }

        const data = await response.json();

        if (data.code === 0) {
            await Swal.fire({
                icon: "success",
                title: "Usuario registrado",
                text: "El usuario se registró correctamente.",
                background: "#1e293b",
                color: "#f8fafc",
                confirmButtonColor: "#22c55e",
            });

            await generarTicketInscripcion({
                nombre:
                    document.getElementById("personGivenName").value,

                apellido:
                    document.getElementById("personFamilyName").value,

                telefono:
                    document.getElementById("phoneNo").value,

                email:
                    document.getElementById("email").value,

                organizacion: orgSubName,

                grupo:
                    document.getElementById("groupIndexCode").value,
            });

            document.getElementById("addUserForm").reset();

            document
                .getElementById("capturedImage")
                .classList.add("hidden");

            document
                .getElementById("video")
                .classList.remove("hidden");

            document
                .getElementById("retakeButton")
                .classList.add("hidden");

            fetchNextPersonCode();

            startCamera(
                document.getElementById("cameraSelect").value
            );

            return;
        }

        const mensajeError =
            data.error || "No se pudo agregar el usuario";

        if (
            mensajeError
                .toLowerCase()
                .includes("person code already exists")
        ) {
            const input =
                document.getElementById("personCode");

            const errorDiv =
                document.getElementById("personCodeError");

            errorDiv.textContent =
                "⚠️ El código ya está registrado. Puedes escribir uno diferente.";

            errorDiv.classList.remove("hidden");

            input.removeAttribute("readonly");

            input.classList.remove(
                "bg-gray-100",
                "cursor-not-allowed"
            );

            input.classList.add(
                "border-red-500",
                "ring",
                "ring-red-300"
            );

            await Swal.fire({
                icon: "warning",
                title: "Código en uso",
                text: "Este código ya fue utilizado. Ingresa uno diferente.",
                background: "#1e293b",
                color: "#f8fafc",
                confirmButtonColor: "#f59e0b",
            });
        } else {
            await Swal.fire({
                icon: "error",
                title: "No se pudo registrar",
                text: mensajeError,
                background: "#1e293b",
                color: "#f8fafc",
                confirmButtonColor: "#ef4444",
            });
        }
    } catch (error) {
        console.error("Error al registrar usuario:", error);

        await Swal.fire({
            icon: "error",
            title: "Error de conexión",
            text: "No fue posible registrar al usuario. Inténtalo nuevamente.",
            background: "#1e293b",
            color: "#f8fafc",
            confirmButtonColor: "#ef4444",
        });
    } finally {
        // Siempre restaurar el botón, haya éxito o error
        submitButton.disabled = false;
        submitButton.innerHTML = contenidoOriginal;
    }
}

function markInvalid(el) {
    el?.classList?.add("border-red-500", "ring", "ring-red-300");
}


function fetchNextPersonCode() {
    fetch("../php/get_last_person_code.php")
        .then(response => response.json())
        .then(data => {
            const input = document.getElementById("personCode");
            input.value = data.nextCode;
            validarCodigoBD(data.nextCode); // 🔍 Validar inmediatamente
        })
        .catch(error => {
            console.error("Error al obtener el siguiente código:", error);
        });
}
function validarCodigoBD(code) {
    const input = document.getElementById("personCode");
    const errorDiv = document.getElementById("personCodeError");

    fetch(`../php/validar_codigo.php?code=${code}`)
        .then(response => response.json())
        .then(data => {
            if (data.enUso) {
                input.classList.add("border-red-500", "ring", "ring-red-300");
                errorDiv.textContent = "⚠️ Este código ya está en uso en la base de datos.";
                errorDiv.classList.remove("hidden");
            } else {
                input.classList.remove("border-red-500", "ring", "ring-red-300");
                errorDiv.textContent = "";
                errorDiv.classList.add("hidden");
            }
        })
        .catch(error => {
            console.error("Error al validar código:", error);
        });
}

let organizaciones = []; // se llena con los datos de la API

function fetchOrganizations() {
    fetch("../php/get_organizations.php")
        .then(res => res.json())
        .then(data => {
            organizaciones = data.list;

            const padreSelect = document.getElementById("orgParent");
            const hijoSelect = document.getElementById("orgIndexCode");

            padreSelect.innerHTML = '<option value="">Selecciona una organización</option>';

            const principales = organizaciones.filter(o => o.parentOrgIndexCode === "1");

            principales.forEach(org => {
                const option = document.createElement("option");
                option.value = org.orgIndexCode;
                option.textContent = org.orgName;
                padreSelect.appendChild(option);
            });

            padreSelect.addEventListener("change", () => {
                const seleccion = padreSelect.value;
                hijoSelect.innerHTML = '<option value="">Selecciona un subdepartamento</option>';

                let subOrgs = organizaciones.filter(o => o.parentOrgIndexCode === seleccion);

                // 🔒 Si el usuario es worker, solo mostrar "Clientes"
                if (typeof usuarioRol !== 'undefined' && usuarioRol === 'worker') {
                    subOrgs = subOrgs.filter(sub => sub.orgName.toLowerCase() === 'clientes');
                }

                subOrgs.forEach(sub => {
                    const option = document.createElement("option");
                    option.value = sub.orgIndexCode;
                    option.textContent = sub.orgName;
                    hijoSelect.appendChild(option);
                });
            });
        });
}





function setupCamera() {
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const cameras = devices.filter(device => device.kind === "videoinput");
            const select = document.getElementById("cameraSelect");
            if (cameras.length === 0) {
                alert("No se detectaron cámaras.");
                return;
            }
            cameras.forEach((camera, index) => {
                let option = document.createElement("option");
                option.value = camera.deviceId;
                option.textContent = camera.label || `Cámara ${index + 1}`;
                select.appendChild(option);
            });
            startCamera(cameras[0].deviceId);
            select.addEventListener("change", function () {
                startCamera(select.value);
            });
        })
        .catch(error => {
            console.error("Error al detectar cámaras:", error);
            alert("Error al acceder a las cámaras.");
        });
}

function startCamera(deviceId = null) {
    const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            document.getElementById("video").srcObject = stream;
        })
        .catch(error => {
            console.error("Error al acceder a la cámara:", error);
            Swal.fire("Error", "No se pudo acceder a la cámara. Verifica los permisos o cambia de cámara.", "error");
        });
}

function captureImage() {
    let video = document.getElementById("video");
    let canvas = document.getElementById("canvas");
    let context = canvas.getContext("2d");
    let capturedImage = document.getElementById("capturedImage");
    let retakeButton = document.getElementById("retakeButton");

    // Tomar la imagen original (tamaño completo)
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    let fullImageData = canvas.toDataURL("image/jpeg").split(',')[1];
    document.getElementById("faceData").value = fullImageData;

    // 🔵 Ahora generamos también el icono reducido
    let miniCanvas = document.createElement('canvas');
    let miniContext = miniCanvas.getContext('2d');

    const miniWidth = 100;  // o el tamaño que prefieras (puedes bajarlo a 80x80 si quieres aún más rápido)
    const miniHeight = 100;

    miniCanvas.width = miniWidth;
    miniCanvas.height = miniHeight;
    miniContext.drawImage(video, 0, 0, miniWidth, miniHeight);

    let miniImageData = miniCanvas.toDataURL("image/jpeg").split(',')[1];
    document.getElementById("faceIconData").value = miniImageData; // 🔥 Guardamos el ícono aquí

    // Mostrar la imagen capturada en el modal
    capturedImage.src = canvas.toDataURL("image/jpeg");
    capturedImage.classList.remove("hidden");
    video.classList.add("hidden");
    retakeButton.classList.remove("hidden");
}

function retakePhoto() {
    const video = document.getElementById("video");
    const capturedImage = document.getElementById("capturedImage");
    const retakeButton = document.getElementById("retakeButton");
    const fileInput = document.getElementById("fileInput");

    // Mostrar video y ocultar imagen capturada
    video.classList.remove("hidden");
    capturedImage.classList.add("hidden");
    retakeButton.classList.add("hidden");

    // Borrar datos del formulario oculto
    document.getElementById("faceData").value = "";
    document.getElementById("faceIconData").value = "";

    // Limpiar canvas (opcional, por limpieza)
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Resetear input de archivo para permitir volver a subir la misma imagen
    if (fileInput) {
        fileInput.value = "";
    }

    // Reiniciar cámara (si aplica)
    startCamera(document.getElementById("cameraSelect").value);
}

document.getElementById("fileInput").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");
  
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
  
        const fullImageData = canvas.toDataURL("image/jpeg");
        const base64Image = fullImageData.split(',')[1];
        document.getElementById("faceData").value = base64Image;
  
        // Crear miniatura
        const miniCanvas = document.createElement("canvas");
        const miniCtx = miniCanvas.getContext("2d");
        miniCanvas.width = 100;
        miniCanvas.height = 100;
        miniCtx.drawImage(img, 0, 0, 100, 100);
        const miniImageData = miniCanvas.toDataURL("image/jpeg").split(',')[1];
        document.getElementById("faceIconData").value = miniImageData;
  
        // Mostrar imagen en el <img>
        const capturedImage = document.getElementById("capturedImage");
        capturedImage.src = fullImageData;
        capturedImage.classList.remove("hidden");
  
        document.getElementById("video").classList.add("hidden");
        document.getElementById("retakeButton").classList.remove("hidden");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
  async function obtenerDatosTicket() {
  const datos = {
    logo: null,
    horario: "",
    redes_sociales: "",
    mensaje_ticket: "",
    tipo_impresora: "48 mm",
  };

  try {
    const brandingResponse = await fetch(
      "../php/obtener_branding.php",
      {
        cache: "no-store",
      },
    );

    const branding = await brandingResponse.json();

    if (brandingResponse.ok && branding.ok !== false) {
      datos.horario = branding.horario || "";
      datos.redes_sociales =
        branding.redes_sociales || "";
      datos.mensaje_ticket =
        branding.mensaje_ticket || "";
    }
  } catch (error) {
    console.error(
      "No se pudo cargar la información del ticket:",
      error,
    );
  }
  try {
  const impresoraResponse = await fetch(
    "../php/obtener_tipo_impresora.php",
    {
      cache: "no-store",
    }
  );

  const impresora = await impresoraResponse.json();

  if (
    impresoraResponse.ok &&
    impresora.ok !== false
  ) {
    datos.tipo_impresora =
      impresora.tipo_impresora || "48 mm";
  }
} catch (error) {
  console.error(
    "No se pudo obtener el tamaño de impresora:",
    error
  );
}
  try {
    const logoResponse = await fetch(
      "../php/obtener_logo.php",
      {
        cache: "no-store",
      },
    );

    const logo = await logoResponse.json();

    if (
      logoResponse.ok &&
      logo.success &&
      logo.base64
    ) {
      datos.logo = logo.base64;
    }
  } catch (error) {
    console.error(
      "No se pudo cargar el logo del ticket:",
      error,
    );
  }

  return datos;
}
  const configuracionesTicket = {
  "48 mm": {
    ancho: 48,
    alto: 205,
    margen: 3,
    anchoLogo: 36,
    fuenteTitulo: 10.5,
    fuenteEtiqueta: 8.5,
    fuenteTexto: 8,
    fuenteMensaje: 7.5,
  },

  "58 mm": {
    ancho: 58,
    alto: 205,
    margen: 3,
    anchoLogo: 42,
    fuenteTitulo: 12,
    fuenteEtiqueta: 9.5,
    fuenteTexto: 9,
    fuenteMensaje: 8.5,
  },
};

 async function generarTicketInscripcion(data) {
  const { jsPDF } = window.jspdf;

  const configuracion = await obtenerDatosTicket();

  const medidas =
    configuracionesTicket[
      configuracion.tipo_impresora
    ] || configuracionesTicket["48 mm"];

  const ancho = medidas.ancho;
  const centro = ancho / 2;
  const margen = medidas.margen;
  const anchoContenido = ancho - (margen * 2);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [ancho, medidas.alto],
  });


  const fecha = new Date().toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });

  let y = 5;

  /*
   * Logo configurado
   */
  if (configuracion.logo) {
  try {
    const propiedadesLogo = doc.getImageProperties(
      configuracion.logo,
    );

    const anchoLogo = medidas.anchoLogo;

    const altoLogo =
      (propiedadesLogo.height * anchoLogo) /
      propiedadesLogo.width;

    const posicionX = (ancho - anchoLogo) / 2;

    doc.addImage(
      configuracion.logo,
      undefined,
      posicionX,
      y,
      anchoLogo,
      altoLogo,
    );

    y += altoLogo + 10;
  } catch (error) {
    console.error(
      "No se pudo colocar el logo:",
      error,
    );
  }
}

  /*
   * Título
   */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(medidas.fuenteTitulo);

  doc.text(
    "INSCRIPCIÓN EXITOSA",
    centro,
    y,
    {
      align: "center",
    },
  );

  y += 5;

  /*
   * Fecha
   */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  doc.text(
    fecha,
    centro,
    y,
    {
      align: "center",
    },
  );

  y += 4;

  /*
   * Separador
   */
  doc.setDrawColor(20);
  doc.setLineWidth(0.4);
  doc.line(2, y, ancho - 2, y);

  y += 6;

  /*
   * Datos de la inscripción
   */
  const campos = [
    {
      label: "Nombre",
      value: `${data.nombre || ""} ${
        data.apellido || ""
      }`.trim(),
    },
    {
      label: "Teléfono",
      value: data.telefono,
    },
    {
      label: "Email",
      value: data.email,
    },
    {
      label: "Organización",
      value: data.organizacion,
    },
    {
      label: "Grupo",
      value: data.grupo,
    },
  ];

  campos.forEach((campo) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(medidas.fuenteEtiqueta);

    doc.text(
      `${campo.label.toUpperCase()}:`,
      3,
      y,
    );

    y += 4.5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(medidas.fuenteTexto);

    const valor = String(
      campo.value || "NO ESPECIFICADO",
    );

    const lineasValor = doc.splitTextToSize(
      valor,
      anchoContenido,
    );

    lineasValor.forEach((linea) => {
      doc.text(linea, 3, y);
      y += 4.3;
    });

    y += 2;
  });

  /*
   * Horario configurado
   */
  if (configuracion.horario) {
    doc.setDrawColor(20);
    doc.setLineWidth(0.4);
    doc.line(2, y, ancho - 2, y);

    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(medidas.fuenteEtiqueta);

    doc.text(
      "HORARIOS DE ATENCIÓN",
      centro,
      y,
      {
        align: "center",
      },
    );

    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(medidas.fuenteTexto);

    const lineasHorario = configuracion.horario
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter(Boolean);

    lineasHorario.forEach((linea) => {
      const lineasAjustadas =
        doc.splitTextToSize(linea, anchoContenido);

      lineasAjustadas.forEach(
        (lineaAjustada) => {
          doc.text(
            lineaAjustada,
            centro,
            y,
            {
              align: "center",
            },
          );

          y += 4;
        },
      );

      y += 0.5;
    });
  }

  /*
   * Redes sociales configuradas
   */
  if (configuracion.redes_sociales) {
    y += 1;

    doc.setDrawColor(20);
    doc.setLineWidth(0.4);
    doc.line(2, y, ancho - 2, y);

    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(medidas.fuenteEtiqueta);

    doc.text(
      "SÍGUENOS EN REDES",
      centro,
      y,
      {
        align: "center",
      },
    );

    y += 4.5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(medidas.fuenteTexto);

    const lineasRedes = doc.splitTextToSize(
      configuracion.redes_sociales,
      anchoContenido,
    );

    lineasRedes.forEach((linea) => {
      doc.text(
        linea,
        centro,
        y,
        {
          align: "center",
        },
      );

      y += 4;
    });
  }

  /*
   * Mensaje general configurado
   */
  if (configuracion.mensaje_ticket) {
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(medidas.fuenteMensaje);

    const lineasMensaje = doc.splitTextToSize(
      configuracion.mensaje_ticket,
      anchoContenido,
    );

    lineasMensaje.forEach((linea) => {
      doc.text(
        linea,
        centro,
        y,
        {
          align: "center",
        },
      );

      y += 4;
    });
  }

  /*
   * Abrir e imprimir
   */
  doc.autoPrint();

  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(
    pdfUrl,
    "_blank",
  );

  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  } else {
    URL.revokeObjectURL(pdfUrl);

    await Swal.fire({
      icon: "warning",
      title: "Ventana bloqueada",
      text: "Permite las ventanas emergentes para imprimir el ticket.",
      background: "#1e293b",
      color: "#f8fafc",
      confirmButtonColor: "#f59e0b",
    });
  }
}
  
  function cargarImagenComoBase64(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  
  
  
