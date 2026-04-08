// === VARIABLES GLOBALES ===
let streamActual = null;
let datosVisitaPendiente = null;

const URL_SCRIPT_GOOGLE = "https://script.google.com/macros/s/AKfycbxbUJfgyR6iLUWiR5llY2BHPmWigzIpK2qeKE1TmxQLXEyhYxQCBjScQKrOPgrr9UI0JA/exec";

// === 1. NAVEGACIÓN Y PESTAÑAS ===
function cambiarPestana(idPestana, botonPresionado) {
    const pestanas = document.querySelectorAll('.tab-content');
    pestanas.forEach(pestana => pestana.classList.remove('active'));
    document.getElementById(idPestana).classList.add('active');

    const botones = document.querySelectorAll('.nav-btn');
    botones.forEach(btn => {
        btn.classList.remove('active-btn');
        const icono = btn.querySelector('i');
        if(icono.classList.contains('bi-play-circle-fill')) icono.className = 'bi bi-play-circle';
        if(icono.classList.contains('bi-stop-circle-fill')) icono.className = 'bi bi-stop-circle';
        if(icono.classList.contains('bi-calendar-check-fill')) icono.className = 'bi bi-calendar-check';
    });

    botonPresionado.classList.add('active-btn');
    const iconoActivo = botonPresionado.querySelector('i');
    if(iconoActivo.classList.contains('bi-play-circle')) iconoActivo.className = 'bi bi-play-circle-fill';
    if(iconoActivo.classList.contains('bi-stop-circle')) iconoActivo.className = 'bi bi-stop-circle-fill';
    if(iconoActivo.classList.contains('bi-calendar-check')) iconoActivo.className = 'bi bi-calendar-check-fill';

    gestionarCamaras(idPestana);
}

// === 2. CONTROL DE CÁMARAS ===
function gestionarCamaras(idPestana) {
    detenerCamara();
    if (idPestana === 'pantalla-iniciar') iniciarCamara('videoInicio', 'fotoInicio');
    else if (idPestana === 'pantalla-finalizar') iniciarCamara('videoFin', 'fotoFin');
    else if (idPestana === 'pantalla-visita') iniciarCamara('videoVisita', 'fotoVisita');
}

function iniciarCamara(idVideo, idFoto) {
    const video = document.getElementById(idVideo);
    const foto = document.getElementById(idFoto);
    if (!video) return;

    if(foto) foto.style.display = 'none';
    video.style.display = 'block';

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            streamActual = stream;
            video.srcObject = stream;
        })
        .catch(err => {
            console.error("Error al acceder a la cámara: ", err);
            alert("No se pudo acceder a la cámara. Revisa los permisos.");
        });
}

function detenerCamara() {
    if (streamActual) {
        streamActual.getTracks().forEach(track => track.stop());
        streamActual = null;
    }
}

// === 3. CAPTURA DE JORNADA (INICIO Y FIN) ===
function capturarDatos(tipoBoton) {
    const video = document.getElementById('video' + tipoBoton);
    const canvas = document.getElementById('canvas' + tipoBoton);
    const foto = document.getElementById('foto' + tipoBoton);
    const status = document.getElementById('status' + tipoBoton);
    
    let fotoBase64Limpia = "";

    if (video && video.srcObject) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const fotoDataUrl = canvas.toDataURL('image/jpeg');
        foto.src = fotoDataUrl;
        foto.style.display = 'block';
        video.style.display = 'none';
        fotoBase64Limpia = fotoDataUrl.split(',')[1];
    }

    const ahora = new Date();
    const fechaActual = ahora.toLocaleDateString('es-MX');
    const horaActual = ahora.toLocaleTimeString('es-MX', { hour12: false });
    
    if(document.getElementById('fecha' + tipoBoton)) document.getElementById('fecha' + tipoBoton).textContent = fechaActual;
    if(document.getElementById('hora' + tipoBoton)) document.getElementById('hora' + tipoBoton).textContent = horaActual;

    if (navigator.geolocation) {
        if(status) {
            status.textContent = "Obteniendo GPS y enviando...";
            status.className = "badge bg-warning text-dark";
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                // === ENLACE CORREGIDO PARA QUE FUNCIONE PERFECTO ===
                const enlaceReal = `https://www.google.com/maps?q=${lat},${lon}`;
                
                if(document.getElementById('ubicacion' + tipoBoton)) {
                    document.getElementById('ubicacion' + tipoBoton).innerHTML = `<a href="${enlaceReal}" target="_blank">📍 Ver Mapa</a>`;
                }
                
                enviarA_TuScript(tipoBoton, fechaActual, horaActual, enlaceReal, fotoBase64Limpia, status);
            },
            (error) => {
                if(status) {
                    status.textContent = "Error de GPS. No se pudo enviar.";
                    status.className = "badge bg-danger";
                }
            }
        );
    }
}

function enviarA_TuScript(tipoBoton, fecha, hora, ubicacionMapa, fotoBase64, statusElement) {
    const nombreUsuario = document.getElementById('userNameDisplay').textContent;
    let payload = {
        action: "registrar_actividad",
        fecha: fecha,
        usuario: nombreUsuario,
        fotoB64: fotoBase64
    };

    if (tipoBoton === 'Inicio') {
        payload.tipo = "Inicio de Jornada";
        payload.horaInicio = hora;
        payload.ubicacionInicio = ubicacionMapa;
    } else if (tipoBoton === 'Fin') {
        payload.tipo = "Fin de Jornada";
        payload.horaFin = hora;
        payload.ubicacionFin = ubicacionMapa;
        payload.tiempo = "N/A"; 
    } 

    fetch(URL_SCRIPT_GOOGLE, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(() => {
        if(statusElement) {
            statusElement.textContent = "¡Registro Exitoso!";
            statusElement.className = "badge bg-success";
        }
    })
    .catch(error => {
        if(statusElement) {
            statusElement.textContent = "Error al enviar";
            statusElement.className = "badge bg-danger";
        }
    });
}

function iniciarJornada() { capturarDatos('Inicio'); }
function finalizarJornada() { capturarDatos('Fin'); }

// === 4. VISITA: ENTRADA Y SALIDA CON CRONÓMETRO ===
function iniciarVisita() {
    const sucursal = document.getElementById('sucursalSelect').value;
    if(!sucursal) { alert("Por favor selecciona una sucursal primero."); return; }
    
    const video = document.getElementById('videoVisita');
    const canvas = document.getElementById('canvasVisita');
    const status = document.getElementById('statusVisita');
    
    let fotoBase64Limpia = "";

    // 1. Tomar Foto de Entrada
    if (video && video.srcObject) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const fotoDataUrl = canvas.toDataURL('image/jpeg');
        fotoBase64Limpia = fotoDataUrl.split(',')[1];
        
        video.style.opacity = 0.5;
        setTimeout(() => video.style.opacity = 1, 300);
    }

    const ahora = new Date();
    const fechaActual = ahora.toLocaleDateString('es-MX');
    const horaEntrada = ahora.toLocaleTimeString('es-MX', { hour12: false });
    document.getElementById('horaVisitaInicio').textContent = horaEntrada;

    if (navigator.geolocation) {
        status.textContent = "Obteniendo GPS de Entrada...";
        status.className = "badge bg-warning text-dark";
        
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // === ENLACE CORREGIDO ===
            const enlaceReal = `https://www.google.com/maps?q=${lat},${lon}`;
            document.getElementById('ubicacionVisita').innerHTML = `<a href="${enlaceReal}" target="_blank">📍 Mapa Entrada</a>`;
            
            // === MEMORIA PARA ENVIAR TODO AL FINAL Y CALCULAR TIEMPO ===
            datosVisitaPendiente = {
                fecha: fechaActual,
                horaInicio: horaEntrada,
                timestampInicio: Date.now(), // <-- Esto nos permite calcular el tiempo trabajado
                fotoB64: fotoBase64Limpia,
                sucursal: sucursal,
                ubicacionInicio: enlaceReal
            };
            
            status.textContent = "Entrada registrada. Esperando finalizar...";
            status.className = "badge bg-info";
            
            document.getElementById('btnIniVisita').disabled = true;
            document.getElementById('btnFinVisita').disabled = false;
        }, (error) => {
            status.textContent = "Error de GPS.";
            status.className = "badge bg-danger";
        });
    }
}

function finalizarVisita() {
    if (!datosVisitaPendiente) return; 
    
    const video = document.getElementById('videoVisita');
    const canvas = document.getElementById('canvasVisita');
    const status = document.getElementById('statusVisita');
    const nombreUsuario = document.getElementById('userNameDisplay').textContent;
    let fotoFinB64Limpia = "";

    // 1. Tomar Foto de Salida
    if (video && video.srcObject) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const fotoDataUrl = canvas.toDataURL('image/jpeg');
        fotoFinB64Limpia = fotoDataUrl.split(',')[1];
    }

    const ahora = new Date();
    const horaSalida = ahora.toLocaleTimeString('es-MX', { hour12: false });
    document.getElementById('horaVisitaFin').textContent = horaSalida;
    
    // === 2. CÁLCULO EXACTO DEL TIEMPO LABORADO ===
    const timestampFin = Date.now();
    const diffMs = timestampFin - datosVisitaPendiente.timestampInicio;
    
    const diffSegundos = Math.floor(diffMs / 1000) % 60;
    const diffMinutos = Math.floor(diffMs / (1000 * 60)) % 60;
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    
    // Formato bonito HH:MM:SS
    const tiempoCalculado = 
        String(diffHoras).padStart(2, '0') + ":" + 
        String(diffMinutos).padStart(2, '0') + ":" + 
        String(diffSegundos).padStart(2, '0');
    
    if (navigator.geolocation) {
        status.textContent = "Obteniendo GPS de Salida...";
        status.className = "badge bg-warning text-dark";

        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // === ENLACE CORREGIDO SALIDA ===
            const enlaceReal = `https://www.google.com/maps?q=${lat},${lon}`;
            
            document.getElementById('ubicacionVisita').innerHTML += ` | <a href="${enlaceReal}" target="_blank">📍 Mapa Salida</a>`;
            status.textContent = "Enviando Visita a Google Sheets...";

            let payload = {
                action: "registrar_actividad",
                tipo: "Visita Sucursal",
                fecha: datosVisitaPendiente.fecha,
                usuario: nombreUsuario,
                sucursal: datosVisitaPendiente.sucursal,
                horaInicio: datosVisitaPendiente.horaInicio,
                ubicacionInicio: datosVisitaPendiente.ubicacionInicio,
                fotoB64: datosVisitaPendiente.fotoB64,
                horaFin: horaSalida,
                ubicacionFin: enlaceReal,
                fotoFinB64: fotoFinB64Limpia,
                tiempo: tiempoCalculado // ¡AHORA SÍ MANDA EL CRONÓMETRO!
            };

            fetch(URL_SCRIPT_GOOGLE, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(() => {
                status.textContent = "¡Visita Registrada Completa!";
                status.className = "badge bg-success";
                document.getElementById('btnIniVisita').disabled = false;
                document.getElementById('btnFinVisita').disabled = true;
                datosVisitaPendiente = null; 
            })
            .catch(error => {
                status.textContent = "Error al enviar";
                status.className = "badge bg-danger";
            });
        }, (error) => {
            status.textContent = "Error de GPS al salir.";
            status.className = "badge bg-danger";
        });
    }
}

// === 5. PROGRAMAR VISITA A SUCURSAL ===
function guardarProgramacion() {
    const sucursal = document.getElementById('sucursalProgramar').value;
    const fecha = document.getElementById('fechaProgramar').value;
    const hora = document.getElementById('horaProgramar').value;
    const nombreUsuario = document.getElementById('userNameDisplay').textContent;
    const btn = document.getElementById('btnGuardarPrograma');

    if(!sucursal || !fecha || !hora) {
        alert("Por favor completa todos los campos (Sucursal, Fecha y Hora).");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Guardando...";

    let payload = {
        action: "agendar_visita",
        quienRegistra: nombreUsuario, 
        trabajador: nombreUsuario,
        sucursal: sucursal,
        fecha: fecha,
        hora: hora
    };

    fetch(URL_SCRIPT_GOOGLE, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(() => {
        alert("¡Visita programada con éxito!");
        btn.disabled = false;
        btn.textContent = "GUARDAR PROGRAMACIÓN";
        document.getElementById('sucursalProgramar').value = "";
        document.getElementById('fechaProgramar').value = "";
        document.getElementById('horaProgramar').value = "";
    })
    .catch(error => {
        alert("Hubo un error al programar la visita.");
        btn.disabled = false;
        btn.textContent = "GUARDAR PROGRAMACIÓN";
    });
}

function borrarDatos(tipoPantalla) {
    const tipo = tipoPantalla.charAt(0).toUpperCase() + tipoPantalla.slice(1);
    if(document.getElementById('fecha' + tipo)) document.getElementById('fecha' + tipo).textContent = "--/--/----";
    if(document.getElementById('hora' + tipo)) document.getElementById('hora' + tipo).textContent = "--:--";
    if(document.getElementById('ubicacion' + tipo)) document.getElementById('ubicacion' + tipo).textContent = "--";
    
    if(tipoPantalla === 'visita') {
        if(document.getElementById('horaVisitaInicio')) document.getElementById('horaVisitaInicio').textContent = "--:--";
        if(document.getElementById('horaVisitaFin')) document.getElementById('horaVisitaFin').textContent = "--:--";
        datosVisitaPendiente = null;
    }
    
    const status = document.getElementById('status' + tipo);
    if(status) {
        status.textContent = "Esperando...";
        status.className = "badge bg-secondary";
    }
    iniciarCamara('video' + tipo, 'foto' + tipo);
}

// === 6. CARGAR SUCURSALES EN LAS DOS LISTAS ===
async function cargarMisSucursales(nombreGuardado) {
    const selectVisita = document.getElementById('sucursalSelect');
    const selectProgramar = document.getElementById('sucursalProgramar');
    
    if (!selectVisita || !selectProgramar || !nombreGuardado) return;

    const mensajeCarga = `<option value="" selected disabled>Buscando sucursales...</option>`;
    selectVisita.innerHTML = mensajeCarga;
    selectProgramar.innerHTML = mensajeCarga;

    try {
        const response = await fetch(URL_SCRIPT_GOOGLE, {
            method: 'POST',
            body: JSON.stringify({ action: "obtener_sucursales", usuario: nombreGuardado })
        });
        
        const data = await response.json();

        if (data.ok && data.sucursales && data.sucursales.length > 0) {
            const defaultOption = '<option value="" selected disabled>-- Elige una sucursal --</option>';
            selectVisita.innerHTML = defaultOption;
            selectProgramar.innerHTML = defaultOption;

            data.sucursales.forEach(sucursal => {
                const optVisita = document.createElement("option");
                optVisita.value = sucursal;
                optVisita.textContent = sucursal;
                selectVisita.appendChild(optVisita);

                const optProgramar = document.createElement("option");
                optProgramar.value = sucursal;
                optProgramar.textContent = sucursal;
                selectProgramar.appendChild(optProgramar);
            });
        } else {
            const mensajeError = '<option value="" selected disabled>No tienes sucursales asignadas</option>';
            selectVisita.innerHTML = mensajeError;
            selectProgramar.innerHTML = mensajeError;
        }
    } catch (error) {
        const mensajeFallo = '<option value="" selected disabled>Error de conexión</option>';
        selectVisita.innerHTML = mensajeFallo;
        selectProgramar.innerHTML = mensajeFallo;
    }
}

// === 7. INICIALIZACIÓN ===
document.addEventListener("DOMContentLoaded", () => {
    iniciarCamara('videoInicio', 'fotoInicio');
    const nombreGuardado = sessionStorage.getItem("usuarioActivo") || localStorage.getItem("usuario_nombre");
    if (nombreGuardado) {
        document.getElementById('userNameDisplay').textContent = nombreGuardado;
        cargarMisSucursales(nombreGuardado);
    }
});