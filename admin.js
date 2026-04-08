// ==========================================
// CONTROL DE VISTAS (NAVEGACIÓN INFERIOR)
// ==========================================
function cambiarVista(idVista) {
    const vistas = document.querySelectorAll('.vista-app');
    vistas.forEach(vista => {
        vista.style.display = 'none';
    });
    document.getElementById(idVista).style.display = 'block';
}

// ==========================================
// CONFIGURACIÓN DE GOOGLE SHEETS
// ==========================================
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbxbUJfgyR6iLUWiR5llY2BHPmWigzIpK2qeKE1TmxQLXEyhYxQCBjScQKrOPgrr9UI0JA/exec"; 

const sucursalesPorZona = {
    "Zona C": ["IZK ROMA", "SR INSUGENTES", "SR PÑOLANCO","SR SANTA FE","IZK REFORMA","IZK MIRAMONTES","IZK MITIKA","SR PATIO","SR PLAZA INN"],
    "Zona D": ["SR AMERICAS","IZK TEPEYAC","SR CONDESA RESTAURANTE","SR CONDESA DELIVERY","IZK DEL VALLE","OFICINAS AT&LA","SR TLANEPANTLA","SR BUENAVISTA","IZK OCEANIA","SR COSMPOLI"],
    "Zona E": ["IZK COMISARIATO","MARIA GARNACHA","IZK INTERLOMAS","IZK ARCOS BOSQUES","IZK PEDEGRAL","IZK PALMAS","SR CUERNAVACA","IZK PUEBLA","IZK PACHUCA","IZK QUERETARO"],
    "Carpinterias": ["TODAS LAS SUCURSALES"],
    "Zona F": ["SR VILLA HERMOSA"," IZK AKROPOLIS MERIDA","IZK LA ISLA MERIDA","SR GALERIAS MERIDA"]
};

let sucursalesSeleccionadas = [];

// ==========================================
// LÓGICA DE ASIGNACIÓN Y SUCURSALES
// ==========================================
function filtrarSucursalesPorZona() {
    const zona = document.getElementById("asigZona").value;
    const selectUnidades = document.getElementById("asigUnidades");
    
    selectUnidades.innerHTML = '<option value="" disabled selected>Selecciona para agregar...</option>';
    sucursalesSeleccionadas = []; 
    
    if (zona && sucursalesPorZona[zona]) {
        // === LA MAGIA: Agregamos todas las sucursales de golpe ===
        sucursalesSeleccionadas = [...sucursalesPorZona[zona]];
        
        // Mantenemos las opciones en la lista desplegable por si borra una por error y quiere agregarla de nuevo
        sucursalesPorZona[zona].forEach(sucursal => {
            const opcion = document.createElement("option");
            opcion.value = sucursal;
            opcion.textContent = sucursal;
            selectUnidades.appendChild(opcion);
        });
    }
    
    // Mostramos visualmente todas las que acabamos de meter de golpe
    actualizarVistaSucursales();
}

function agregarSucursalLista() {
    const select = document.getElementById("asigUnidades");
    const sucursal = select.value;

    if (sucursal && !sucursalesSeleccionadas.includes(sucursal)) {
        sucursalesSeleccionadas.push(sucursal);
        actualizarVistaSucursales();
    }
    select.value = ""; 
}

function removerSucursal(sucursal) {
    sucursalesSeleccionadas = sucursalesSeleccionadas.filter(s => s !== sucursal);
    actualizarVistaSucursales();
}

function actualizarVistaSucursales() {
    const listaHTML = document.getElementById("lista-sucursales-agregadas");
    const placeholder = document.getElementById("placeholder-sucursales");
    
    listaHTML.innerHTML = ""; 
    
    if (sucursalesSeleccionadas.length === 0) {
        placeholder.style.display = "block";
    } else {
        placeholder.style.display = "none";
        sucursalesSeleccionadas.forEach(sucursal => {
            listaHTML.innerHTML += `
                <li class="sucursal-item">
                    <span>${sucursal}</span>
                    <button class="btn-eliminar-sucursal" onclick="removerSucursal('${sucursal}')">×</button>
                </li>
            `;
        });
    }
}

async function ejecutarAsignacion(e) {
    e.preventDefault();
    
    const zona = document.getElementById("asigZona").value;
    const tecnico = document.getElementById("asigTecnico").value.trim();
    
    if (!zona || !tecnico || sucursalesSeleccionadas.length === 0) {
        alert("Por favor, selecciona una zona, un técnico y asegúrate de tener sucursales.");
        return;
    }

    const sucursalesString = sucursalesSeleccionadas.join(", ");

    const payload = {
        action: "registrar_asignacion",
        zona: zona,
        tecnico: tecnico,
        sucursal: sucursalesString 
    };

    try {
        const response = await fetch(URL_SCRIPT, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if(result.ok) {
            alert("¡Asignación guardada con éxito!");
            document.getElementById("listaAsignacionesSheet").innerHTML += `
                <tr>
                    <td>${zona}</td>
                    <td>${tecnico}</td>
                    <td class="small">${sucursalesString}</td>
                </tr>
            `;
            document.getElementById("asigTecnico").value = "";
            sucursalesSeleccionadas = [];
            actualizarVistaSucursales();
            document.getElementById("asigZona").value = "";
            document.getElementById("asigUnidades").innerHTML = '<option value="" disabled selected>Selecciona para agregar...</option>';

        } else {
            alert("Error al guardar: " + result.error);
        }
    } catch (error) {
        alert("Fallo de conexión.");
        console.error(error);
    }
}

// ==========================================
// ALTA DE USUARIOS
// ==========================================
async function ejecutarAltaUsuario() {
    const user = document.getElementById("adminUser").value.trim();
    const pass = document.getElementById("adminPass").value.trim();
    const nombre = document.getElementById("adminNombreCompleto").value.trim();
    const rol = document.getElementById("adminRol").value;
    const foto = document.getElementById("adminFotoURL").value.trim() || "N/A";
    const btnAlta = document.getElementById("btnAlta");

    if (!user || !pass || !nombre) {
        alert("Por favor llena Usuario, Contraseña y Nombre.");
        return;
    }

    btnAlta.disabled = true;
    btnAlta.innerText = "GUARDANDO...";

    const payload = {
        action: "registrar_usuario",
        usuario: user,
        password: pass,
        nombre: nombre,
        rol: rol,
        foto: foto
    };

    try {
        const response = await fetch(URL_SCRIPT, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.ok) {
            alert(`¡Usuario ${nombre} creado exitosamente!`);
            
            document.getElementById("listaUsuariosPersiana").innerHTML += `
                <tr>
                    <td>${user}</td>
                    <td>${nombre}</td>
                    <td><span class="badge bg-dark">${rol}</span></td>
                </tr>
            `;
            
            document.getElementById("adminUser").value = "";
            document.getElementById("adminPass").value = "";
            document.getElementById("adminNombreCompleto").value = "";
            document.getElementById("adminFotoURL").value = "";
        } else {
            alert("Error del servidor: " + result.error);
        }
    } catch (error) {
        alert("Error de conexión al guardar el usuario.");
        console.error(error);
    }
    
    btnAlta.disabled = false;
    btnAlta.innerText = "GUARDAR USUARIO";
}

// ==========================================
// CERRAR SESIÓN
// ==========================================
function cerrarSesion() {
    if (confirm("¿Seguro que deseas salir del panel?")) {
        sessionStorage.clear();
        window.location.replace("index.html"); // Cambia por el nombre de tu página de login
    }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Jalamos el nombre del usuario logueado de la memoria del navegador
    const nombreGuardado = sessionStorage.getItem("usuarioActivo") || localStorage.getItem("usuario_nombre");
    
    if (nombreGuardado) {
        const display = document.getElementById('userNameDisplay');
        if (display) {
            display.textContent = nombreGuardado;
        }
    }
});