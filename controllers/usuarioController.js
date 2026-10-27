import {
    registrarUsuario as registrarUsuarioService,
    loginUsuario as loginUsuarioService
} from "../services/usuarioServices.js";

function manejarError(error, res) {
    // Errores que lanzamos nosotros (mail repetido, login incorrecto, etc.)
    if (error.status) {
        return res.status(error.status).json({ mensaje: error.message });
    }
    // Mail repetido detectado por la base de datos
    if (error.code === "23505") {
        return res.status(409).json({ mensaje: "Ya existe un usuario con ese mail" });
    }
    console.error(error);
    return res.status(500).json({ mensaje: "Error interno del servidor" });
}

export async function registrarUsuario(req, res) {
    let { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ mensaje: "Falta completar campos" });
    }

    email = email.trim().toLowerCase();

    try {
        const nuevoUsuario = await registrarUsuarioService({ nombre, email, password });
        return res.status(201).json({
            mensaje: "Usuario registrado con éxito",
            usuario: nuevoUsuario
        });
    } catch (error) {
        return manejarError(error, res);
    }
}

export async function loginUsuario(req, res) {
    let { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ mensaje: "Falta completar campos" });
    }

    email = email.trim().toLowerCase();

    try {
        const resultado = await loginUsuarioService({ email, password });
        return res.status(200).json({
            mensaje: "Login exitoso",
            ...resultado
        });
    } catch (error) {
        return manejarError(error, res);
    }
}