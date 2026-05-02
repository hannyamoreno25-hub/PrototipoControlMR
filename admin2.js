// URL de tu Web App de Google Apps Script 
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbyWGdT5Zl_anPvjP-G28nw7wMS7g645vKAXaz4SSN3IJ1U_A_Tbb6HT25gBp-JL7Bwn0A/exec"; 

const sucursalesPorZona = {
    "Zona A": ["SR INSURGENTES SEARS","SR CONDESA RESTAURANTE","SR CONDESA DELIVERY", "IZK DEL VALLE","SR POLANCO","IZK REFORMA"],
    "Zona B": ["IZK INTERLOMAS", "SR SANTA FE", "IZK ARCOS BOSQUES", "IZK PALMAS"],
    "Zona C": ["IZK ROMA", "SR INSURGENTES", "SR POLANCO","SR SANTA FE","IZK REFORMA","IZK MIRAMONTES","IZK MITIKA","SR PATIO","SR PLAZA INN"],
    "Zona D": ["SR AMERICAS","IZK TEPEYAC","SR CONDESA RESTAURANTE","SR CONDESA DELIVERY","IZK DEL VALLE","OFICINAS AT&LA","SR TLANEPANTLA","SR BUENAVISTA","IZK OCEANIA","SR COSMPOLI"],
    "Zona E": ["IZK COMISARIATO","MARIA GARNACHA","IZK INTERLOMAS","IZK ARCOS BOSQUES","IZK PEDEGRAL","IZK PALMAS","SR CUERNAVACA","IZK PUEBLA","IZK PACHUCA","IZK QUERETARO"],
    "Carpinterias": ["TODAS LAS SUCURSALES"],
    "Zona F": ["SR VILLA HERMOSA"," IZK AKROPOLIS MERIDA","IZK LA ISLA MERIDA","SR GALERIAS MERIDA"]
};

const todasLasSucursales = Object.values(sucursalesPorZona).flat();
let sucursalesSeleccionadas = [];
let datosRegistrosGlobal = [];

function cambiarVista(idVista) {
    document.querySelectorAll('.vista-app').forEach(v => v.style.display = 'none');
    document.getElementById(idVista).style.display = 'block';
}

function seleccionarTodasPorZona() {
    const zona = document.getElementById("asigZona").value;
    const selectExtra = document.getElementById("asigUnidades");
    sucursalesSeleccionadas = []; 
    if (zona && sucursalesPorZona[zona]) { 
        sucursalesSeleccionadas = [...sucursalesPorZona[zona]]; 
    }
    selectExtra.innerHTML = '<option value="" disabled selected>AGREGAR OTRA...</option>';
    todasLasSucursales.forEach(s => {
        const opt = document.createElement("option");
        opt.value = opt.textContent = s;
        selectExtra.appendChild(opt);
    });
    actualizarVistaSucursales();
}

function agregarSucursalLista() {
    const suc = document.getElementById("asigUnidades").value;
    if (suc && !sucursalesSeleccionadas.includes(suc)) { 
        sucursalesSeleccionadas.push(suc); 
        actualizarVistaSucursales(); 
    }
    document.getElementById("asigUnidades").value = "";
}

function removerSucursal(suc) {
    sucursalesSeleccionadas = sucursalesSeleccionadas.filter(s => s !== suc);
    actualizarVistaSucursales();
}

function actualizarVistaSucursales() {
    const lista = document.getElementById("lista-sucursales-agregadas");
    if (!lista) return;
    lista.innerHTML = sucursalesSeleccionadas.length === 0 ? '<p class="text-muted small text-center mt-3">Sin sucursales</p>' : "";
    sucursalesSeleccionadas.forEach(s => {
        lista.innerHTML += `<li class="sucursal-item"><span>${s}</span><button class="btn-eliminar-sucursal" onclick="removerSucursal('${s}')">×</button></li>`;
    });
}

async function ejecutarAsignacion(e) {
    e.preventDefault();
    const zona = document.getElementById("asigZona").value;
    const tecnico = document.getElementById("asigTecnico").value.trim();
    if (!zona || !tecnico || sucursalesSeleccionadas.length === 0) return alert("Faltan datos por llenar");
    const payload = { action: "registrar_asignacion", zona, tecnico, sucursal: sucursalesSeleccionadas.join(", ") };
    try {
        await fetch(URL_SCRIPT, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
        alert("Asignación enviada correctamente"); 
        sucursalesSeleccionadas = []; 
        actualizarVistaSucursales(); 
        document.getElementById("asigTecnico").value = "";
    } catch (e) { 
        alert("Error al guardar la asignación"); 
    }
}

async function ejecutarAltaUsuario() {
    const user = document.getElementById("adminUser").value.trim();
    const pass = document.getElementById("adminPass").value.trim();
    const rol = document.getElementById("adminRol").value;
    if(!user || !pass) return alert("Por favor, llena todos los campos de usuario.");
    try {
        const res = await fetch(URL_SCRIPT, { method: "POST", body: JSON.stringify({ action: "registrar_usuario", usuario: user, password: pass, nombre: user, rol }) });
        const data = await res.json();
        if(data.ok) { 
            alert("Usuario creado con éxito"); 
            document.getElementById("adminUser").value = ""; 
            document.getElementById("adminPass").value = ""; 
        }
    } catch (e) { 
        alert("Error de conexión al crear usuario"); 
    }
}

function mostrarSubVistaMonitoreo(tipo) {
    document.getElementById('subvista-asistencia').style.display = tipo === 'asistencia' ? 'block' : 'none';
    document.getElementById('subvista-visitas').style.display = tipo === 'visitas' ? 'block' : 'none';
    document.getElementById('btnAsistencia').className = tipo === 'asistencia' ? 'btn btn-dark w-100 fw-bold' : 'btn btn-outline-dark w-100 fw-bold';
    document.getElementById('btnVisitas').className = tipo === 'visitas' ? 'btn btn-dark w-100 fw-bold' : 'btn btn-outline-dark w-100 fw-bold';
    if(tipo === 'asistencia') cargarDatosAsistencia();
}

async function cargarDatosAsistencia() {
    const body = document.getElementById("tabla-asistencia-body");
    body.innerHTML = '<tr><td colspan="5" class="text-center">Cargando registros...</td></tr>';
    try {
        const res = await fetch(URL_SCRIPT, { method: "POST", body: JSON.stringify({action: "obtener_asistencia"}) });
        const data = await res.json();
        if(data.ok) {
            datosRegistrosGlobal = data.datos;
            body.innerHTML = "";
            const usuariosUnicos = [...new Set(data.datos.map(d => d[1]))];
            usuariosUnicos.forEach(u => {
                const regs = data.datos.filter(r => r[1] === u && r[2] === "Jornada");
                const asistencias = regs.length;
                const retardos = regs.filter(r => r[4] > "09:10").length;
                body.innerHTML += `
                    <tr>
                        <td class="fw-bold">${u}</td>
                        <td class="text-danger">--</td>
                        <td class="text-warning fw-bold">${retardos}</td> 
                        <td class="text-success fw-bold">${asistencias}</td>
                        <td><button class="btn btn-sm btn-dark" onclick="verDetalleQuincena('${u}')">Ver más</button></td>
                    </tr>`;
            });
        }
    } catch (e) { 
        body.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar datos</td></tr>'; 
    }
}

function verDetalleQuincena(u) {
    document.getElementById('modalTituloNombre').innerText = `Reporte: ${u}`;
    const lista = document.getElementById('lista-detalle-quincena');
    lista.innerHTML = "";
    const registros = datosRegistrosGlobal.filter(r => r[1] === u && r[2] === "Jornada").reverse();
    registros.forEach(r => {
        let status = r[4] > "09:10" ? '<span class="badge bg-warning text-dark">RETARDO</span>' : '<span class="badge bg-success">A TIEMPO</span>';
        lista.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center border-dark mb-1">
            <div>
                <div class="fw-bold">${r[0]}</div>
                <div class="small">Entrada: ${r[4]}</div>
            </div>
            ${status}
        </li>`;
    });
    new bootstrap.Modal(document.getElementById('modalAsistencia')).show();
}

async function cargarVisitasPorZona() {
    const zona = document.getElementById("filtroZonaVisitas").value;
    const cont = document.getElementById("contenedor-cards-visitas");
    if(!zona) return alert("Selecciona una zona");
    
    cont.innerHTML = '<p class="text-center">Cargando visitas...</p>';
    
    try {
        const res = await fetch(URL_SCRIPT, { method: "POST", body: JSON.stringify({ action: "obtener_asistencia" }) });
        const data = await res.json();
        if (data.ok) {
            cont.innerHTML = "";
            const sucursales = sucursalesPorZona[zona] || [];
            const dataRev = [...data.datos].reverse(); // Los más recientes primero
            
            const mapaFotos = data.imagenes || {}; 
            // CHIVATO PARA LAS IMÁGENES: Esto nos dirá qué está leyendo Google Drive
            console.log("Fotos encontradas en Drive:", mapaFotos);
            
            const hoy = new Date();
            
            sucursales.forEach(s => {
                // Filtramos todas las visitas a esta sucursal
                const visitasSucursal = dataRev.filter(r => r[3] === s && r[2] === "Visita");
                const vists = visitasSucursal.length;
                
                // LÓGICA DE LOS 15 DÍAS
                let diasSinVisita = 999; // Si nunca han ido, son 999 días
                if (vists > 0) {
                    // Tomamos la fecha de la última visita (la primera en la lista invertida)
                    const fechaUltima = visitasSucursal[0][0]; 
                    let fechaObj;
                    
                    // Intentamos convertir la fecha de Excel a formato de Javascript
                    if(typeof fechaUltima === 'string' && fechaUltima.includes('/')) {
                        const partes = fechaUltima.split('/');
                        fechaObj = new Date(partes[2], partes[1] - 1, partes[0]); // Asume DD/MM/YYYY
                    } else {
                        fechaObj = new Date(fechaUltima);
                    }
                    
                    if(!isNaN(fechaObj)) {
                        const diferenciaMilisegundos = hoy - fechaObj;
                        diasSinVisita = Math.floor(diferenciaMilisegundos / (1000 * 60 * 60 * 24));
                    }
                }
                
                // Aplicar colores según los días
                let estiloCard = "bg-white border-dark";
                let estiloTexto = "text-muted";
                let badgeAlerta = "";
                
                if (diasSinVisita > 15) {
                    estiloCard = "bg-danger bg-opacity-10 border-danger"; // Tarjeta rojita
                    estiloTexto = "text-danger fw-bold";
                    badgeAlerta = `<span class="badge bg-danger ms-1">¡Requiere Visita!</span>`;
                }
                
                const tec = dataRev.find(r => (r[3] === s || r[3].includes(zona)) && r[1] !== "")?.[1] || "Sin asignar";
                const fotoFachada = mapaFotos[s] || "https://via.placeholder.com/150";
                
                cont.innerHTML += `
                    <div class="card mb-3 ${estiloCard} shadow-sm">
                        <div class="row g-0 align-items-center">
                            <div class="col-4 p-2">
                                <img src="${fotoFachada}" class="img-fluid rounded border border-dark" style="height:110px; width:100%; object-fit:cover;">
                            </div>
                            <div class="col-8">
                                <div class="card-body py-2">
                                    <h6 class="fw-bold text-uppercase mb-1" style="font-size:0.9rem;">${s}</h6>
                                    <p class="small mb-1"><i class="bi bi-person-badge"></i> <strong>Responsable:</strong> ${tec}</p>
                                    <p class="small ${estiloTexto} mb-1"><i class="bi bi-calendar-x"></i> Días sin visita: ${diasSinVisita === 999 ? 'Ninguna' : diasSinVisita}</p>
                                    <p class="fw-bold mb-0 small">Visitas: <span class="badge bg-dark">${vists}</span> ${badgeAlerta}</p>
                                </div>
                            </div>
                        </div>
                    </div>`;
            });
        }
    } catch (e) { 
        cont.innerHTML = '<p class="text-center text-danger">Error al cargar visitas</p>'; 
    }
}

function cerrarSesion() { 
    if(confirm("¿Estás seguro que deseas salir?")) { 
        sessionStorage.clear(); 
        window.location.replace("index.html"); 
    } 
}

document.addEventListener("DOMContentLoaded", () => {
    const n = sessionStorage.getItem("usuarioActivo");
    if (n && document.getElementById('userNameDisplay')) {
        document.getElementById('userNameDisplay').textContent = n;
    }
});