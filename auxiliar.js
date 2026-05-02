// === VARIABLES GLOBALES ===
let streamActual = null;
let datosVisitaPendiente = null; // Guarda la info de la visita mientras termina

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
    });

    botonPresionado.classList.add('active-btn');
    const iconoActivo = botonPresionado.querySelector('i');
    if(iconoActivo.classList.contains('bi-play-circle')) iconoActivo.className = 'bi bi-play-circle-fill';
    if(iconoActivo.classList.contains('bi-stop-circle')) iconoActivo.className = 'bi bi-stop-circle-fill';

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

// === 3. CAPTURA Y ENVÍO A GOOGLE SHEETS ===
const URL_SCRIPT_GOOGLE = "https://script.google.com/macros/s/AKfycbyWGdT5Zl_anPvjP-G28nw7wMS7g645vKAXaz4SSN3IJ1U_A_Tbb6HT25gBp-JL7Bwn0A/exec"

// Función original (Solo se usará para Inicio y Fin de Jornada)
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
                const enlaceReal = `https://www.google.com/maps?q=$${lat},${lon}`;
                
                if(document.getElementById('ubicacion' + tipoBoton)) {
                    document.getElementById('ubicacion' + tipoBoton).innerHTML = `<a href="${enlaceReal}" target="_blank">📍 Ver Mapa</a>`;
                }
                
                const enlaceParaSheets = `=HYPERLINK("${enlaceReal}", "📍 Ver Ubicación")`;
                enviarA_TuScript(tipoBoton, fechaActual, horaActual, enlaceParaSheets, fotoBase64Limpia, status);
            },
            (error) => {
                if(status) {
                    status.textContent = "Error de GPS. No se pudo enviar.";
                    status.className = "badge bg-danger";
                }
            }
        );
    } else {
        alert("Tu navegador no soporta geolocalización.");
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
        payload.tiempo = ""; 
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
        console.error("Error:", error);
        if(statusElement) {
            statusElement.textContent = "Error al enviar";
            statusElement.className = "badge bg-danger";
        }
    });
}

// === 4. FUNCIONES DE LOS BOTONES DEL HTML ===
function iniciarJornada() { capturarDatos('Inicio'); }
function finalizarJornada() { capturarDatos('Fin'); }

// === NUEVA LÓGICA EXCLUSIVA PARA VISITAS ===
function iniciarVisita() {
    const sucursal = document.getElementById('sucursalSelect').value;
    if(!sucursal) {
        alert("Por favor selecciona una sucursal primero.");
        return;
    }
    
    const video = document.getElementById('videoVisita');
    const canvas = document.getElementById('canvasVisita');
    const foto = document.getElementById('fotoVisita');
    const status = document.getElementById('statusVisita');
    
    let fotoBase64Limpia = "";

    // 1. Tomar Foto
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

    // 2. Obtener Hora de Entrada
    const ahora = new Date();
    const fechaActual = ahora.toLocaleDateString('es-MX');
    const horaEntrada = ahora.toLocaleTimeString('es-MX', { hour12: false });
    document.getElementById('horaVisitaInicio').textContent = horaEntrada;

    // 3. Obtener GPS y guardar datos en memoria (Aún NO se envía)
    if (navigator.geolocation) {
        status.textContent = "Obteniendo GPS...";
        status.className = "badge bg-warning text-dark";
        
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const enlaceReal = `https://www.google.com/maps?q=$${lat},${lon}`;
            document.getElementById('ubicacionVisita').innerHTML = `<a href="${enlaceReal}" target="_blank">📍 Ver Mapa</a>`;
            
            // GUARDAMOS EN MEMORIA PARA ENVIARLO DESPUÉS
            datosVisitaPendiente = {
                fecha: fechaActual,
                horaInicio: horaEntrada,
                fotoB64: fotoBase64Limpia,
                sucursal: sucursal
            };
            
            status.textContent = "Visita iniciada. Recuerda finalizar al salir.";
            status.className = "badge bg-info";
            
            document.getElementById('btnIniVisita').disabled = true;
            document.getElementById('btnFinVisita').disabled = false;
        }, (error) => {
            status.textContent = "Error de GPS.";
            status.className = "badge bg-danger";
        });
    } else {
        alert("Tu navegador no soporta geolocalización.");
    }
}

function finalizarVisita() {
    if (!datosVisitaPendiente) return; 
    
    // 1. Obtener la hora de salida
    const ahora = new Date();
    const horaSalida = ahora.toLocaleTimeString('es-MX', { hour12: false });
    document.getElementById('horaVisitaFin').textContent = horaSalida;
    
    const status = document.getElementById('statusVisita');
    status.textContent = "Enviando a Google Sheets...";
    status.className = "badge bg-warning text-dark";

    const nombreUsuario = document.getElementById('userNameDisplay').textContent;

    // 2. Armar el paquete completo para Google Sheets
    let payload = {
        action: "registrar_actividad",
        tipo: "Visita Sucursal",
        fecha: datosVisitaPendiente.fecha,
        usuario: nombreUsuario,
        sucursal: datosVisitaPendiente.sucursal,
        horaInicio: datosVisitaPendiente.horaInicio,
        horaFin: horaSalida,
        tiempo: "", 
        fotoB64: datosVisitaPendiente.fotoB64
    };

    // 3. Enviar todo junto
    fetch(URL_SCRIPT_GOOGLE, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(() => {
        status.textContent = "¡Visita Registrada en Excel!";
        status.className = "badge bg-success";
        document.getElementById('btnIniVisita').disabled = false;
        document.getElementById('btnFinVisita').disabled = true;
        datosVisitaPendiente = null; // Vaciamos la memoria
    })
    .catch(error => {
        console.error("Error:", error);
        status.textContent = "Error al enviar";
        status.className = "badge bg-danger";
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

// === 5. CARGAR SUCURSALES ===
async function cargarMisSucursales(nombreGuardado) {
    const select = document.getElementById('sucursalSelect');
    if (!select || !nombreGuardado) return;

    select.innerHTML = `<option value="" selected disabled>Buscando sucursales de ${nombreGuardado}...</option>`;

    try {
        const response = await fetch(URL_SCRIPT_GOOGLE, {
            method: 'POST',
            body: JSON.stringify({ action: "obtener_sucursales", usuario: nombreGuardado })
        });
        
        const data = await response.json();

        if (data.ok) {
            if (data.sucursales && data.sucursales.length > 0) {
                select.innerHTML = '<option value="" selected disabled>-- Selecciona tu sucursal --</option>';
                data.sucursales.forEach(sucursal => {
                    const option = document.createElement("option");
                    option.value = sucursal;
                    option.textContent = sucursal;
                    select.appendChild(option);
                });
            } else {
                select.innerHTML = '<option value="" selected disabled>No tienes sucursales asignadas</option>';
            }
        } else {
            select.innerHTML = `<option value="" selected disabled>Error: ${data.error}</option>`;
        }
    } catch (error) {
        console.error("Error al cargar sucursales:", error);
        select.innerHTML = '<option value="" selected disabled>Error de conexión con Google</option>';
    }
}

// === 6. INICIALIZACIÓN ===
document.addEventListener("DOMContentLoaded", () => {
    iniciarCamara('videoInicio', 'fotoInicio');

    const nombreGuardado = sessionStorage.getItem("usuarioActivo") || localStorage.getItem("usuario_nombre");
    
    if (nombreGuardado) {
        document.getElementById('userNameDisplay').textContent = nombreGuardado;
        cargarMisSucursales(nombreGuardado);
    }
});