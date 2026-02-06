let fotoStream = null;
function setBtnLoading(btn, loading) {
  if (!btn) return;

  if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;

  if (loading) {
    btn.disabled = true;
    btn.classList.add("opacity-60", "cursor-not-allowed");
    btn.innerHTML = `
      <span class="inline-flex items-center gap-2">
        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="4" stroke-linecap="round"></path>
        </svg>
        <span>Cargando...</span>
      </span>
    `;
  } else {
    btn.disabled = false;
    btn.classList.remove("opacity-60", "cursor-not-allowed");
    btn.innerHTML = btn.dataset.originalHtml;
  }
}

function abrirModalFoto(personCode) {
  document.getElementById("fotoPersonCode").value = personCode;

  // reset UI
  document.getElementById("fotoFaceData").value = "";
  document.getElementById("fotoCapturedImage").classList.add("hidden");
  document.getElementById("fotoVideo").classList.remove("hidden");
  document.getElementById("fotoRetakeButton").classList.add("hidden");
  document.getElementById("fotoFileInput").value = "";

  document.getElementById("modalFoto").classList.remove("hidden");
  fotoSetupCamera();
}

function cerrarModalFoto() {
  document.getElementById("modalFoto").classList.add("hidden");
  fotoStopCamera();
}

function fotoStopCamera() {
  if (fotoStream) {
    fotoStream.getTracks().forEach(t => t.stop());
    fotoStream = null;
  }
  const video = document.getElementById("fotoVideo");
  if (video) video.srcObject = null;
}

function fotoSetupCamera() {
  navigator.mediaDevices.enumerateDevices()
    .then(devices => {
      const cameras = devices.filter(d => d.kind === "videoinput");
      const select = document.getElementById("fotoCameraSelect");
      select.innerHTML = "";

      if (cameras.length === 0) {
        swalError.fire({ title: "Sin cámaras", text: "No se detectaron cámaras disponibles." });
        return;
      }

      cameras.forEach((cam, i) => {
        const opt = document.createElement("option");
        opt.value = cam.deviceId;
        opt.textContent = cam.label || `Cámara ${i + 1}`;
        select.appendChild(opt);
      });

      fotoStartCamera(cameras[0].deviceId);
      select.onchange = () => fotoStartCamera(select.value);
    })
    .catch(err => {
      console.error(err);
      swalError.fire({ title: "Error", text: "No se pudo listar cámaras (permisos)." });
    });
}

function fotoStartCamera(deviceId) {
  fotoStopCamera();

  navigator.mediaDevices.getUserMedia({
    video: deviceId ? { deviceId: { exact: deviceId } } : true
  })
  .then(stream => {
    fotoStream = stream;
    document.getElementById("fotoVideo").srcObject = stream;
  })
  .catch(err => {
    console.error(err);
    swalError.fire({ title: "Error", text: "No se pudo acceder a la cámara. Revisa permisos." });
  });
}

function fotoCaptureImage() {
  const video = document.getElementById("fotoVideo");
  const canvas = document.getElementById("fotoCanvas");
  const ctx = canvas.getContext("2d");
  const captured = document.getElementById("fotoCapturedImage");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataURL = canvas.toDataURL("image/jpeg");
  const base64 = dataURL.split(",")[1];

  document.getElementById("fotoFaceData").value = base64;

  captured.src = dataURL;
  captured.classList.remove("hidden");
  video.classList.add("hidden");
  document.getElementById("fotoRetakeButton").classList.remove("hidden");
}

function fotoRetakePhoto() {
  document.getElementById("fotoVideo").classList.remove("hidden");
  document.getElementById("fotoCapturedImage").classList.add("hidden");
  document.getElementById("fotoRetakeButton").classList.add("hidden");

  document.getElementById("fotoFaceData").value = "";
  document.getElementById("fotoFileInput").value = "";

  fotoStartCamera(document.getElementById("fotoCameraSelect").value);
}

document.addEventListener("DOMContentLoaded", () => {
  const inp = document.getElementById("fotoFileInput");
  if (!inp) return;

  inp.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.getElementById("fotoCanvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const dataURL = canvas.toDataURL("image/jpeg");
        document.getElementById("fotoFaceData").value = dataURL.split(",")[1];

        const captured = document.getElementById("fotoCapturedImage");
        captured.src = dataURL;
        captured.classList.remove("hidden");

        document.getElementById("fotoVideo").classList.add("hidden");
        document.getElementById("fotoRetakeButton").classList.remove("hidden");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
});

// Esta función la conectaremos al PHP después
function guardarFotoCliente() {
  const btn = document.getElementById("btnGuardarFoto");
  const personCode = document.getElementById("fotoPersonCode").value.trim();
  const faceData = document.getElementById("fotoFaceData").value.trim();

  if (!faceData) {
    swalError.fire({ title: "Foto requerida", text: "Debes capturar o subir una imagen del rostro." });
    return;
  }

    setBtnLoading(btn, true);

  fetch("../php/update_face_cliente.php", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ personCode, faceData })
  })
  .then(r => r.json())
  .then(res => {
    if (res.ok) {
      swalSuccess.fire({ title: "Éxito", text: "Foto actualizada correctamente." }).then(() => {
  // ✅ actualiza foto en tabla
  const imgTabla = document.getElementById(`foto-${personCode}`);
  if (imgTabla) imgTabla.src = `data:image/jpeg;base64,${faceData}`;

  // ✅ si el modal de info está abierto y es el mismo cliente, actualiza ahí también
  if (clienteInfoActual && String(clienteInfoActual.personCode) === String(personCode)) {
    clienteInfoActual.face = faceData;
    const imgInfo = document.getElementById("info-foto");
    if (imgInfo) imgInfo.src = `data:image/jpeg;base64,${faceData}`;
  }

  cerrarModalFoto();
});
    } else {
      swalError.fire({ title: "Error", text: res.error || "No se pudo actualizar la foto." });
    }
  })
  .catch(err => {
    console.error(err);
    swalError.fire({ title: "Error", text: "Error en la solicitud. Revisa consola." });
  })
  .finally(() => setBtnLoading(btn, false));
}
