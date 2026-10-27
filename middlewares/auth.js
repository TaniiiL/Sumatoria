import jwt from "jsonwebtoken";

// Revisa que el pedido traiga un token válido
export function verificarToken(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ mensaje: "Tenés que iniciar sesión" });
    }

    const token = header.split(" ")[1];

    try {
        // Si la firma es válida, guardamos { id, rol } en req.usuario
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        next(); // deja pasar el pedido al controller
    } catch (error) {
        return res.status(401).json({ mensaje: "Sesión inválida o vencida" });
    }
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