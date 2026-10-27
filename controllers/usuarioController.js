import { registrarUsuario as registrarUsuarioService } from "../services/usuarioServices.js";

export async function registrarUsuario(req, res) {
    let { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ mensaje: "Falta completar campos" });
    }

    // Normalizar el mail: sin espacios y en minúscula
    email = email.trim().toLowerCase();

    try {
        const nuevoUsuario = await registrarUsuarioService({ nombre, email, password });

        return res.status(201).json({
            mensaje: "Usuario registrado con éxito",
            usuario: nuevoUsuario
        });
    } catch (error) {
        // Errores que lanzamos nosotros (ej: mail repetido)
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
}