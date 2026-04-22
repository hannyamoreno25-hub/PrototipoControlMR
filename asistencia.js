// ==========================================
// 🛡️ 0. GUARDIA DE SEGURIDAD (Asistencias)
// ==========================================
(function() {
    const usuarioActual = sessionStorage.getItem('usuario_nombre');
    const rolActual = sessionStorage.getItem('usuario_rol');

    // 1. Verificamos si NO hay sesión
    if (!usuarioActual) {
        document.documentElement.style.display = 'none'; 
        alert("⛔ Acceso denegado. Debes iniciar sesión primero.");
        // Ojo aquí con tu ruta, la dejé exactamente como la tenías abajo
        window.location.replace("loig/index.html"); 
        throw new Error("Acceso bloqueado: No hay sesión.");
    }

    // 2. Verificamos que el rol sea EXACTAMENTE 'administrador'
    // (Si necesitas que el técnico también lo vea, cámbialo a: if(rolActual !== 'administrador' && rolActual !== 'tecnico') )
    if (rolActual !== 'administrador') { 
        document.documentElement.style.display = 'none';
        alert("⛔ Acceso restringido. Esta vista es solo para Administradores.");
        window.location.replace("loig/index.html"); 
        throw new Error("Acceso bloqueado: Permisos insuficientes.");
    }
})();

// ==========================================
// AQUI VA LA URL DE TU GOOGLE APPS SCRIPT
// ==========================================
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzD6TzxDFY71ilBDGfecAHp7mFM7fqr08tZ9ojyHfB92LYBaaMMIPpmxnjhkRtmjd5dRQ/exec";

document.addEventListener("DOMContentLoaded", () => {
    cargarAsistencia();
});

async function cargarAsistencia() {
    const container = document.getElementById("employeeListContainer");

    try {
        const response = await fetch(URL_SCRIPT, {
            method: "POST",
            body: JSON.stringify({ action: "obtener_asistencia" })
        });
        const result = await response.json();

        if (result.ok) {
            renderizarTarjetas(result.datos);
        } else {
            container.innerHTML = `<p class="text-danger text-center fw-bold">Error: ${result.error}</p>`;
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        container.innerHTML = `<p class="text-danger text-center fw-bold">Fallo de conexión al cargar asistencias.</p>`;
    }
}

function renderizarTarjetas(registros) {
    const container = document.getElementById("employeeListContainer");
    container.innerHTML = ""; // Limpiamos el loading

    // Agrupar registros por usuario
    const usuariosAsistencia = {};
    
    // Obtener las fechas de los últimos 15 días
    const ultimos15Dias = [];
    for (let i = 14; i >= 0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        ultimos15Dias.push(d.toLocaleDateString()); 
    }

    // Procesar los datos que vienen de Google Sheets
    registros.forEach(reg => {
        // reg = [Fecha, Usuario, Tipo, Sucursal, Inicio, Fin, Tiempo, Foto]
        const fecha = reg[0];
        const usuario = reg[1];
        const tipo = reg[2]; // Jornada o Visita

        // Solo contamos "Jornada" como asistencia principal
        if (tipo === "Jornada") {
            if (!usuariosAsistencia[usuario]) {
                usuariosAsistencia[usuario] = { diasTrabajados: new Set() };
            }
            usuariosAsistencia[usuario].diasTrabajados.add(fecha);
        }
    });

    // Si no hay datos
    if (Object.keys(usuariosAsistencia).length === 0) {
        container.innerHTML = `<p class="text-center text-muted">No hay registros de jornada en la base de datos.</p>`;
        return;
    }

    // Crear la tarjeta HTML para cada usuario
    for (const [usuario, info] of Object.entries(usuariosAsistencia)) {
        let cajasHtml = "";
        let totalLaborados = 0;

        ultimos15Dias.forEach(dia => {
            // Verificamos si el usuario trabajó en este día exacto
            const trabajoEseDia = info.diasTrabajados.has(dia);
            
            if (trabajoEseDia) {
                totalLaborados++;
                cajasHtml += `<div class="p-2 bg-dark text-white border border-dark rounded text-center" style="width: 40px; height: 40px; font-weight: bold;" title="${dia}">✔</div>`;
            } else {
                cajasHtml += `<div class="p-2 bg-secondary text-white border border-secondary rounded text-center opacity-50" style="width: 40px; height: 40px;" title="${dia}">-</div>`;
            }
        });

        const tarjeta = `
            <div class="card shadow-sm formal-style">
                <div class="card-body">
                    <h5 class="card-title fw-bold text-uppercase mb-3">
                        <i class="bi bi-person-badge me-2"></i>${usuario}
                    </h5>
                    <div class="d-flex flex-wrap gap-2">
                        ${cajasHtml}
                    </div>
                    <div class="mt-3 text-muted fw-bold">
                        Total laborados en la quincena: <span class="text-dark fs-5">${totalLaborados}/15</span>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += tarjeta;
    }
}

// ==========================================
// CERRAR SESIÓN (Corregido)
// ==========================================
function cerrarSesion() {
    if (confirm("¿Cerrar sesión?")) {
        sessionStorage.clear(); // Se limpia la sesión segura
        window.location.replace("loig/index.html"); // Replace para evitar el botón "Atrás"
    }
}