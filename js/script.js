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

function addUser() {
    const submitButton = document.querySelector("#addUserForm button[type='submit']");
    submitButton.disabled = true;

    const orgParentName = document.getElementById("orgParent").selectedOptions[0]?.text || "";
    const orgSubName = document.getElementById("orgIndexCode").selectedOptions[0]?.text || "";

    const department = `All Departments/${orgParentName}/${orgSubName}`;

    const formData = {
        personCode: document.getElementById("personCode").value.trim(),
        personFamilyName: document.getElementById("personFamilyName").value.trim(),
        personGivenName: document.getElementById("personGivenName").value.trim(),
        gender: parseInt(document.getElementById("gender").value),
        orgIndexCode: document.getElementById("orgIndexCode").value,
        orgName: orgSubName,
        orgParentName: orgParentName,
        department: department, // ✨ nuevo campo
        phoneNo: document.getElementById("phoneNo").value.trim(),
        email: document.getElementById("email").value.trim(),
        groupIndexCode: document.getElementById("groupIndexCode").value,
        emergencia: document.getElementById("emergencia")?.value.trim() || null,
        sangre: document.getElementById("sangre")?.value.trim() || null,
        comentarios: document.getElementById("comentarios")?.value.trim() || null,
        faces: [{
            faceData: document.getElementById("faceData").value,
            faceIconData: document.getElementById("faceIconData").value
        }]
    };

    fetch("../php/add_user.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.code === 0) {
    Swal.fire("Éxito", "Usuario registrado correctamente.", "success").then(() => {
        generarTicketInscripcion({
            nombre: document.getElementById("personGivenName").value,
            apellido: document.getElementById("personFamilyName").value,
            telefono: document.getElementById("phoneNo").value,
            email: document.getElementById("email").value,
            organizacion: orgSubName,
            grupo: document.getElementById("groupIndexCode").value
        });

        document.getElementById("addUserForm").reset();
        document.getElementById("capturedImage").classList.add("hidden");
        document.getElementById("video").classList.remove("hidden");
        document.getElementById("retakeButton").classList.add("hidden");
        fetchNextPersonCode();
        startCamera(document.getElementById("cameraSelect").value);
        submitButton.disabled = false;
    });
} else {
    const mensajeError = data.error || "No se pudo agregar el usuario";

    // Detectar si es un error por código duplicado
    if (mensajeError.includes("person code already exists")) {
        const input = document.getElementById("personCode");
        const errorDiv = document.getElementById("personCodeError");

        // Mostrar mensaje en español
        errorDiv.textContent = "⚠️ El código ya está registrado en el sistema. Puedes escribir uno diferente.";
        errorDiv.classList.remove("hidden");

        // Habilitar el campo para que el usuario pueda cambiarlo
        input.removeAttribute("readonly");
        input.classList.remove("bg-gray-100", "cursor-not-allowed");
        input.classList.add("border-red-500", "ring", "ring-red-300");

        Swal.fire("Código en uso", "Este código ya fue utilizado. Ingresa uno diferente.", "warning");
    } else {
        // Otro tipo de error
        Swal.fire("Error", mensajeError, "error");
    }

    submitButton.disabled = false;
}

    })
    .catch(error => {
        console.error("API Error:", error);
        Swal.fire("Error", "Error en la API. Revisa la consola.", "error").then(() => {
            submitButton.disabled = false;
        });
    });
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
  async function generarTicketInscripcion(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        unit: "mm",
        format: [48, 150], // aumenta a 150mm de alto
      });
  
    const fecha = new Date().toLocaleString("es-MX", {
      dateStyle: "short",
      timeStyle: "short"
    });
  
    const imgBase64 = await cargarImagenComoBase64('../img/logo-black.webp');
    doc.addImage(imgBase64, 'PNG', 12, 5, 24, 24); // centrado
  
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.text("Inscripción Exitosa", 24, 34, { align: "center" });
    doc.setFontSize(8);
    doc.text(fecha, 24, 39, { align: "center" });
  
    doc.setLineWidth(0.3);
    doc.line(2, 42, 46, 42); // línea divisoria
  
    doc.setFont("courier", "normal");
    let y = 47;
    const espacio = 5;
  
    const campos = [
        { label: "Nombre", value: `${data.nombre} ${data.apellido}` },
        { label: "Teléfono", value: data.telefono },
        { label: "Email", value: data.email },
        { label: "Organización", value: data.organizacion },
        { label: "Grupo", value: data.grupo }
      ];
  
      campos.forEach(campo => {
        doc.setFont("courier", "bold");
        doc.text(`${campo.label}:`, 4, y);
        y += 4;
        doc.setFont("courier", "normal");
        doc.text(campo.value || "-", 4, y);
        y += espacio + 1;
      });
  
      doc.line(2, y, 46, y);
      y += 5;
      doc.setFont("courier", "bold");
      doc.setFontSize(7.5);
      doc.text("Horarios de Atención:", 4, y);
      y += 4;
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.text("Lunes a Viernes:", 4, y);
      y += 4;
      doc.text("6:00 a.m. - 10:00 p.m.", 4, y);
      y += 4;
      doc.text("Sábados:", 4, y);
      y += 4;
      doc.text("7:00 a.m. - 2:00 p.m.", 4, y);
      y += 4;
      doc.line(2, y, 46, y);
      y += 6;
  
    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    doc.text("Síguenos en redes:", 24, y, { align: "center" });
    y += 5;
    doc.setFont("courier", "normal");
    doc.text("@BBSNetworks", 24, y, { align: "center" });
  
    y += 8;
    doc.setFont("courier", "italic");
    doc.setFontSize(8);
    doc.text("¡Gracias por formar parte!", 24, y, { align: "center" });
  
    // Imprimir automáticamente pero también abrir la pestaña
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
  
    const printWindow = window.open(pdfUrl);
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
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
  
  
  
