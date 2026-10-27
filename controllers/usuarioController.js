import {
    registrarUsuario as registrarUsuarioService,
    loginUsuario as loginUsuarioService,
    obtenerPerfil as obtenerPerfilService
} from "../services/usuarioServices.js";
   import { manejarError } from "../utils/manejarError.js";

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

export async function perfilUsuario(req, res) {
    try {
        // req.usuario lo cargó el middleware a partir del token
        const usuario = await obtenerPerfilService(req.usuario.id);
        return res.status(200).json(usuario);
    } catch (error) {
        return manejarError(error, res);
    }
}