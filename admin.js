const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbwJi-s1ZBoFK87ffOp5G-v6wv30fIRBAN9eckY4AgWfyBEIXAeFS4E3Uf2rbr42cDjjag/exec"; 

const sucursalesPorZona = {
    "Zona C": ["IZK ROMA", "SR INSUGENTES", "SR PÑOLANCO","SR SANTA FE","IZK REFORMA","IZK MIRAMONTES","IZK MITIKA","SR PATIO","SR PLAZA INN"],
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

// ASIGNACIÓN
function seleccionarTodasPorZona() {
    const zona = document.getElementById("asigZona").value;
    const selectExtra = document.getElementById("asigUnidades");
    if (zona && sucursalesPorZona[zona]) { sucursalesSeleccionadas = [...sucursalesPorZona[zona]]; }
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
    if (suc && !sucursalesSeleccionadas.includes(suc)) { sucursalesSeleccionadas.push(suc); actualizarVistaSucursales(); }
    document.getElementById("asigUnidades").value = "";
}

function removerSucursal(suc) {
    sucursalesSeleccionadas = sucursalesSeleccionadas.filter(s => s !== suc);
    actualizarVistaSucursales();
}

function actualizarVistaSucursales() {
    const lista = document.getElementById("lista-sucursales-agregadas");
    lista.innerHTML = sucursalesSeleccionadas.length === 0 ? '<p class="text-muted small text-center mt-3">Sin sucursales</p>' : "";
    sucursalesSeleccionadas.forEach(s => {
        lista.innerHTML += `<li class="sucursal-item"><span>${s}</span><button class="btn-eliminar-sucursal" onclick="removerSucursal('${s}')">×</button></li>`;
    });
}

async function ejecutarAsignacion(e) {
    e.preventDefault();
    const zona = document.getElementById("asigZona").value;
    const tecnico = document.getElementById("asigTecnico").value.trim();
    if (!zona || !tecnico || sucursalesSeleccionadas.length === 0) return alert("Faltan datos");
    const payload = { action: "registrar_asignacion", zona, tecnico, sucursal: sucursalesSeleccionadas.join(", ") };
    try {
        const res = await fetch(URL_SCRIPT, { method: "POST", body: JSON.stringify(payload) });
        if((await res.json()).ok) { alert("Asignación guardada"); sucursalesSeleccionadas = []; actualizarVistaSucursales(); document.getElementById("asigTecnico").value = ""; }
    } catch (e) { alert("Error"); }
}

// USUARIOS
async function ejecutarAltaUsuario() {
    const user = document.getElementById("adminUser").value.trim();
    const pass = document.getElementById("adminPass").value.trim();
    const rol = document.getElementById("adminRol").value;
    if(!user || !pass) return alert("Llena los campos");
    try {
        const res = await fetch(URL_SCRIPT, { method: "POST", body: JSON.stringify({ action: "registrar_usuario", usuario: user, password: pass, nombre: user, rol }) });
        if((await res.json()).ok) { alert("Usuario creado"); document.getElementById("adminUser").value = ""; document.getElementById("adminPass").value = ""; }
    } catch (e) { alert("Error"); }
}

// MONITOREO
function mostrarSubVistaMonitoreo(tipo) {
    document.getElementById('subvista-asistencia').style.display = tipo === 'asistencia' ? 'block' : 'none';
    document.getElementById('subvista-visitas').style.display = tipo === 'visitas' ? 'block' : 'none';
    document.getElementById('btnAsistencia').className = tipo === 'asistencia' ? 'btn btn-dark w-100 fw-bold' : 'btn btn-outline-dark w-100 fw-bold';
    document.getElementById('btnVisitas').className = tipo === 'visitas' ? 'btn btn-dark w-100 fw-bold' : 'btn btn-outline-dark w-100 fw-bold';
    if(tipo === 'asistencia') cargarDatosAsistencia();
}

async function cargarDatosAsistencia() {
    const body = document.getElementById("tabla-asistencia-body");
    body.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
    try {
        const res = await fetch(URL_SCRIPT, { method: "POST", body: JSON.stringify({action: "obtener_asistencia"}) });
        const data = await res.json();
        if(data.ok) {
            datosRegistrosGlobal = data.datos;
            body.innerHTML = "";
            const usuariosUnicos = [...new Set(data.datos.map(d => d[1]))];
            usuariosUnicos.forEach(u => {
                const asists = data.datos.filter(r => r[1] === u && r[2] === "Jornada").length;
                body.innerHTML += `<tr><td>${u}</td><td>--</td><td>${asists}</td><td><button class="btn btn-sm btn-dark" onclick="verDetalleQuincena('${u}')">Ver más</button></td></tr>`;
            });
        }
    } catch (e) { body.innerHTML = '<tr><td colspan="4">Error</td></tr>'; }
}

function verDetalleQuincena(u) {
    document.getElementById('modalTituloNombre').innerText = `Reporte: ${u}`;
    const lista = document.getElementById('lista-detalle-quincena');
    lista.innerHTML = "";
    const registros = datosRegistrosGlobal.filter(r => r[1] === u && r[2] === "Jornada").reverse();
    registros.forEach(r => {
        let status = r[4] > "09:10" ? '<span class="badge bg-warning text-dark">RETARDO</span>' : '<span class="badge bg-success">OK</span>';
        lista.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center"><div><div class="fw-bold">${r[0]}</div><div class="small">Entrada: ${r[4]}</div></div>${status}</li>`;
    });
    new bootstrap.Modal(document.getElementById('modalAsistencia')).show();
}

async function cargarVisitasPorZona() {
    const zona = document.getElementById("filtroZonaVisitas").value;
    const cont = document.getElementById("contenedor-cards-visitas");
    cont.innerHTML = '<p class="text-center">Cargando...</p>';
    try {
        const res = await fetch(URL_SCRIPT, { method: "POST", body: JSON.stringify({ action: "obtener_asistencia" }) });
        const data = await res.json();
        if (data.ok) {
            cont.innerHTML = "";
            const sucursales = sucursalesPorZona[zona] || [];
            const dataRev = [...data.datos].reverse();
            sucursales.forEach(s => {
                const vists = data.datos.filter(r => r[3] === s && r[2] === "Visita").length;
                const tec = dataRev.find(r => (r[3] === s || r[3].includes(zona)) && r[1] !== "")?.[1] || "Sin asignar";
                const foto = dataRev.find(r => r[3] === s && r[7] !== "")?.[7] || "https://via.placeholder.com/150";
                cont.innerHTML += `
                    <div class="card mb-3 border-dark"><div class="row g-0 align-items-center">
                        <div class="col-4 p-2"><img src="${foto}" class="img-fluid rounded border border-dark" style="height:100px; width:100%; object-fit:cover;"></div>
                        <div class="col-8"><div class="card-body py-2">
                            <h6 class="fw-bold text-uppercase mb-1">${s}</h6>
                            <p class="small mb-1"><i class="bi bi-person-badge"></i> ${tec}</p>
                            <p class="small text-muted mb-0"><i class="bi bi-geo-alt"></i> Ubicación activa</p>
                            <p class="fw-bold mb-0 small">Visitas: <span class="badge bg-dark">${vists}</span></p>
                        </div></div>
                    </div></div>`;
            });
        }
    } catch (e) { cont.innerHTML = 'Error'; }
}

function cerrarSesion() { if(confirm("¿Salir?")) { sessionStorage.clear(); window.location.replace("index.html"); } }
document.addEventListener("DOMContentLoaded", () => {
    const n = sessionStorage.getItem("usuarioActivo");
    if (n) document.getElementById('userNameDisplay').textContent = n;
});