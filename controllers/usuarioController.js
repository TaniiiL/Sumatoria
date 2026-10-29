import * as usuarioService from "../services/usuarioServices.js";
import { manejarError } from "../utils/manejarError.js";
import { textoValido } from "../utils/validar.js";

// POST /registro/usuario { nombre, email, password }
export async function registrarUsuario(req, res) {
    let { nombre, email, password } = req.body;

    if (!textoValido(nombre) || !textoValido(email) || !textoValido(password)) {
        return res.status(400).json({ mensaje: "Falta completar campos" });
    }
    if (password.length < 6) {
        return res.status(400).json({ mensaje: "La contraseña tiene que tener al menos 6 caracteres" });
    }

    // Normalizar el mail: sin espacios y en minúscula
    email = email.trim().toLowerCase();

    try {
        const resultado = await usuarioService.registrarUsuario({ nombre: nombre.trim(), email, password });
        return res.status(201).json({ mensaje: "Usuario registrado con éxito", ...resultado });
    } catch (error) {
        return manejarError(error, res);
    }
}

// POST /login/usuario { email, password }
export async function loginUsuario(req, res) {
    let { email, password } = req.body;

    if (!textoValido(email) || !textoValido(password)) {
        return res.status(400).json({ mensaje: "Falta completar campos" });
    }

    email = email.trim().toLowerCase();

    try {
        const resultado = await usuarioService.loginUsuario({ email, password });
        return res.status(200).json({ mensaje: "Login exitoso", ...resultado });
    } catch (error) {
        return manejarError(error, res);
    }
}

// POST /login/google { access_token }
export async function loginGoogle(req, res) {
    const { access_token } = req.body;

    if (!textoValido(access_token)) {
        return res.status(400).json({ mensaje: "Falta el access_token de Google" });
    }

    try {
        const resultado = await usuarioService.loginGoogle(access_token);
        return res.status(200).json({ mensaje: "Login exitoso", ...resultado });
    } catch (error) {
        return manejarError(error, res);
    }
}

// GET /usuario/perfil
export async function perfilUsuario(req, res) {
    try {
        // req.usuario lo cargó el middleware a partir del token
        const usuario = await usuarioService.obtenerPerfil(req.usuario.id);
        return res.status(200).json(usuario);
    } catch (error) {
        return manejarError(error, res);
    }
}

// PUT /usuario/perfil { nombre?, barrio?, foto? }
export async function editarPerfilUsuario(req, res) {
    const { nombre, barrio, foto } = req.body;

    if (nombre !== undefined && !textoValido(nombre)) {
        return res.status(400).json({ mensaje: "El nombre no puede quedar vacío" });
    }
    if (barrio !== undefined && typeof barrio !== "string") {
        return res.status(400).json({ mensaje: "El barrio tiene que ser texto" });
    }
    if (foto !== undefined && foto !== null && typeof foto !== "string") {
        return res.status(400).json({ mensaje: "La foto tiene que ser texto (link o base64) o null" });
    }

    try {
        const usuario = await usuarioService.editarPerfil(req.usuario.id, {
            nombre: nombre?.trim(),
            barrio: barrio?.trim(),
            foto
        });
        return res.status(200).json(usuario);
    } catch (error) {
        return manejarError(error, res);
    }
}
