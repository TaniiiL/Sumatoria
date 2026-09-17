import { registrarUsuario as registrarUsuarioService } from "../services/usuarioServices.js";

export async function registrarUsuario(req, res) {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ mensaje: "Falta completar campos" });
    }

    try {
        const nuevoUsuario = await registrarUsuarioService({ nombre, email, password });

        return res.status(201).json({
            mensaje: "Usuario registrado con éxito",
            usuario: nuevoUsuario
        });
    } catch (error) {
        return res.status(500).json({ mensaje: error.message });
    }
}