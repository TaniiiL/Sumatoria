// Crea un error con código HTTP, para usar en los services
export function crearError(status, mensaje) {
    const error = new Error(mensaje);
    error.status = status;
    return error;
}

export function manejarError(error, res) {
    // Errores que lanzamos nosotros (mail repetido, login incorrecto, etc.)
    if (error.status) {
        return res.status(error.status).json({ mensaje: error.message });
    }
    // Dato repetido detectado por la base de datos
    if (error.code === "23505") {
        return res.status(409).json({ mensaje: "Ese dato ya existe" });
    }
    // Se hizo referencia a algo que no existe (ej: una tarjeta inexistente)
    if (error.code === "23503") {
        return res.status(400).json({ mensaje: "Alguno de los datos enviados no existe" });
    }
    // Un dato no cumple las reglas de la tabla (ej: un estado que no es 'activa' ni 'pausada')
    if (error.code === "23514" || error.code === "22P02") {
        return res.status(400).json({ mensaje: "Alguno de los datos enviados no es válido" });
    }
    console.error(error);
    return res.status(500).json({ mensaje: "Error interno del servidor" });
}

// Convierte "12" en 12. Si no es un número válido, devuelve null
export function aId(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : null;
}
