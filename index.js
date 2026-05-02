// 1. Configuración global
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbyWGdT5Zl_anPvjP-G28nw7wMS7g645vKAXaz4SSN3IJ1U_A_Tbb6HT25gBp-JL7Bwn0A/exec";

async function login(event) {
    event.preventDefault(); // Evita que la página se recargue
    
    // 2. Captura de elementos
    const loginForm = document.getElementById("loginForm");
    const usuario = document.getElementById("usuario").value.trim();
    const password = document.getElementById("password").value.trim();
    const msgElement = document.getElementById("msg");
    const btn = document.querySelector(".btn");

    // 3. Validación inicial
    if (!usuario || !password) {
        msgElement.innerText = "Por favor, llena todos los campos.";
        msgElement.style.color = "#FF4B4B";
        return;
    }

    // 4. Feedback visual de carga
    msgElement.innerText = "Verificando credenciales...";
    msgElement.style.color = "#fff"; 
    btn.disabled = true;
    btn.innerText = "Cargando...";

    try {
        // 5. Petición al servidor (Google Apps Script)
        const response = await fetch(URL_SCRIPT, {
            method: "POST",
            body: JSON.stringify({ usuario: usuario, contraseña: password })
        });

        const data = await response.json();

        if (data.ok) {
            // ÉXITO: Usuario encontrado
            msgElement.style.color = "#00FF00";
            msgElement.innerText = "¡Bienvenido/a, " + data.nombre + "!";
            
            const rolLimpio = (data.rol || "").toLowerCase().trim(); 
            
            localStorage.setItem("usuario_rol", rolLimpio); 
            localStorage.setItem("usuario_nombre", data.nombre);

            // ==========================================
            // 🚨 SOLUCIÓN: AQUÍ CREAMOS EL TOKEN DE SEGURIDAD 🚨
            // ==========================================
            sessionStorage.setItem("tokenSeguridadSMR", "acceso_concedido");
            sessionStorage.setItem("usuarioActivo", data.nombre);
            // ==========================================

            // 6. Redirección por roles
            setTimeout(() => {
                if (rolLimpio === "administrador") {
                    window.location.href = "./administrador.html";
                } else if (rolLimpio === "tecnico") {
                    window.location.href = "./tecnico.html";
                } else if (rolLimpio === "auxiliar") {
                    window.location.href = "./auxiliar.html";
                } else {
                    msgElement.innerText = "Error: Rol desconocido (" + data.rol + ")";
                    msgElement.style.color = "#FF4B4B";
                    btn.disabled = false;
                    btn.innerText = "Entrar";
                }
            }, 1500);

        } else {
            // ERROR: Credenciales incorrectas
            msgElement.innerText = data.mensaje || "Usuario o contraseña incorrectos.";
            msgElement.style.color = "#FF4B4B";
            btn.disabled = false;
            btn.innerText = "Entrar";
        }

    } catch (error) {
        // ERROR: Problema de conexión o servidor
        console.error("Error:", error);
        msgElement.innerText = "Error de conexión. Intenta de nuevo.";
        msgElement.style.color = "#FF4B4B";
        btn.disabled = false;
        btn.innerText = "Entrar";
    }
}

// ----------------------------------------------------
// LÓGICA PARA SUBIR IMAGEN Y PONERLA DE FONDO
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const bgUpload = document.getElementById("bgUpload");
    
    const savedBg = localStorage.getItem("customBackground");
    if (savedBg) {
        document.body.style.backgroundImage = `url('${savedBg}')`;
    }

    if(bgUpload) {
        bgUpload.addEventListener("change", function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imageUrl = e.target.result;
                    document.body.style.backgroundImage = `url('${imageUrl}')`;
                    localStorage.setItem("customBackground", imageUrl);
                };
                reader.readAsDataURL(file);
            }
        });
    }
});