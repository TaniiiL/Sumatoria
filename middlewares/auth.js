import jwt from "jsonwebtoken";

function leerToken(req) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return null;
    return header.split(" ")[1];
}

// Revisa que el pedido traiga un token válido
export function verificarToken(req, res, next) {
    const token = leerToken(req);

    if (!token) {
        return res.status(401).json({ mensaje: "Tenés que iniciar sesión" });
    }

    try {
        // Si la firma es válida, guardamos { id, rol } en req.usuario
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        next(); // deja pasar el pedido al controller
    } catch (error) {
        return res.status(401).json({ mensaje: "Sesión inválida o vencida" });
    }
}

// Para rutas públicas que funcionan distinto si hay sesión
// (ej: la home filtra las promos por las tarjetas del usuario si está logueado)
export function tokenOpcional(req, res, next) {
    const token = leerToken(req);
    req.usuario = null;

    if (token) {
        try {
            req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            req.usuario = null; // token vencido o inválido: se sigue como si no hubiera sesión
        }
    }
    next();
}

// Revisa que el que hace el pedido tenga el rol correcto
export function soloRol(rol) {
    return (req, res, next) => {
        if (req.usuario.rol !== rol) {
            return res.status(403).json({ mensaje: "No tenés permiso para esto" });
        }
        next();
    };
}
