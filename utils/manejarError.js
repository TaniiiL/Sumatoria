export function manejarError(error, res) {
    // Errores que lanzamos nosotros (mail repetido, login incorrecto, etc.)
    if (error.status) {
        return res.status(error.status).json({ mensaje: error.message });
    }
    // Dato repetido detectado por la base de datos
    if (error.code === "23505") {
        return res.status(409).json({ mensaje: "Ya existe una cuenta con ese mail" });
    }
    console.error(error);
    return res.status(500).json({ mensaje: "Error interno del servidor" });
}