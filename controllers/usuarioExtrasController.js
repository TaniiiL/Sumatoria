// Favoritos, negocios seguidos, notificaciones y chat: todo lo que es "del usuario logueado"
import * as favoritoService from "../services/favoritoServices.js";
import * as seguimientoService from "../services/seguimientoServices.js";
import * as notificacionService from "../services/notificacionServices.js";
import * as chatService from "../services/chatServices.js";
import { aId, manejarError } from "../utils/manejarError.js";
import { textoValido } from "../utils/validar.js";

// ===== Favoritos =====

// GET /usuario/favoritos -> [{ negocio, promocion }]
export async function listarFavoritos(req, res) {
    try {
        return res.status(200).json(await favoritoService.listarFavoritos(req.usuario.id));
    } catch (error) {
        return manejarError(error, res);
    }
}

// GET /usuario/favoritos/ids -> [{ negocioId, promoId }]
export async function idsFavoritos(req, res) {
    try {
        return res.status(200).json(await favoritoService.idsFavoritos(req.usuario.id));
    } catch (error) {
        return manejarError(error, res);
    }
}

// POST /usuario/favoritos { promoId }
export async function agregarFavorito(req, res) {
    const idPromo = aId(req.body.promoId);
    if (!idPromo) {
        return res.status(400).json({ mensaje: "Mandá el promoId de la promo" });
    }

    try {
        return res.status(200).json(await favoritoService.agregarFavorito(req.usuario.id, idPromo));
    } catch (error) {
        return manejarError(error, res);
    }
}

// DELETE /usuario/favoritos/:promoId
export async function quitarFavorito(req, res) {
    const idPromo = aId(req.params.promoId);
    if (!idPromo) {
        return res.status(400).json({ mensaje: "Id de promo inválido" });
    }

    try {
        return res.status(200).json(await favoritoService.quitarFavorito(req.usuario.id, idPromo));
    } catch (error) {
        return manejarError(error, res);
    }
}

// ===== Negocios seguidos =====

// GET /usuario/seguidos -> negocios completos
export async function listarSeguidos(req, res) {
    try {
        return res.status(200).json(await seguimientoService.listarSeguidos(req.usuario));
    } catch (error) {
        return manejarError(error, res);
    }
}

// GET /usuario/seguidos/ids -> ["1", "4"]
export async function idsSeguidos(req, res) {
    try {
        return res.status(200).json(await seguimientoService.listarIdsSeguidos(req.usuario.id));
    } catch (error) {
        return manejarError(error, res);
    }
}

// POST /negocios/:id/seguir
export async function seguirNegocio(req, res) {
    const idSucursal = aId(req.params.id);
    if (!idSucursal) {
        return res.status(404).json({ mensaje: "Negocio no encontrado" });
    }

    try {
        return res.status(200).json(await seguimientoService.seguir(req.usuario.id, idSucursal));
    } catch (error) {
        return manejarError(error, res);
    }
}

// DELETE /negocios/:id/seguir
export async function dejarDeSeguirNegocio(req, res) {
    const idSucursal = aId(req.params.id);
    if (!idSucursal) {
        return res.status(404).json({ mensaje: "Negocio no encontrado" });
    }

    try {
        return res.status(200).json(await seguimientoService.dejarDeSeguir(req.usuario.id, idSucursal));
    } catch (error) {
        return manejarError(error, res);
    }
}

// ===== Notificaciones =====

// GET /notificaciones
export async function listarNotificaciones(req, res) {
    try {
        return res.status(200).json(await notificacionService.listarNotificaciones(req.usuario.id));
    } catch (error) {
        return manejarError(error, res);
    }
}

// GET /notificaciones/sin-leer -> { hay, cantidad }
export async function notificacionesSinLeer(req, res) {
    try {
        return res.status(200).json(await notificacionService.contarSinLeer(req.usuario.id));
    } catch (error) {
        return manejarError(error, res);
    }
}

// PUT /notificaciones/leidas { ids?: ["1", "2"] }  (sin ids marca todas)
export async function marcarNotificacionesLeidas(req, res) {
    const { ids } = req.body ?? {};
    if (ids !== undefined && !Array.isArray(ids)) {
        return res.status(400).json({ mensaje: "ids tiene que ser una lista" });
    }

    try {
        await notificacionService.marcarLeidas(req.usuario.id, ids);
        return res.status(200).json({ mensaje: "Notificaciones marcadas como leídas" });
    } catch (error) {
        return manejarError(error, res);
    }
}

// ===== Chat con la IA =====

// GET /chat
export async function historialChat(req, res) {
    try {
        return res.status(200).json(await chatService.historial(req.usuario.id));
    } catch (error) {
        return manejarError(error, res);
    }
}

// POST /chat { texto }
export async function enviarMensajeChat(req, res) {
    const { texto } = req.body;
    if (!textoValido(texto)) {
        return res.status(400).json({ mensaje: "El mensaje está vacío" });
    }
    if (texto.length > 1000) {
        return res.status(400).json({ mensaje: "El mensaje es demasiado largo (máximo 1000 caracteres)" });
    }

    try {
        return res.status(200).json(await chatService.enviarMensaje(req.usuario.id, texto.trim()));
    } catch (error) {
        return manejarError(error, res);
    }
}
