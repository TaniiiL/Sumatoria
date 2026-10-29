import * as promoService from "../services/promoServices.js";
import { aId, manejarError } from "../utils/manejarError.js";
import { diasValidos, fechaValida, mediosPagoValidos, textoValido } from "../utils/validar.js";

// Revisa los datos de una promo. "parcial" = en una edición, los campos son opcionales
function validarPromo(datos, parcial) {
    const falta = (campo) => datos[campo] === undefined;

    if (!(parcial && falta("titulo")) && !textoValido(datos.titulo)) return "Falta el título de la promo";
    if (!falta("descripcion") && typeof datos.descripcion !== "string") return "La descripción tiene que ser texto";
    if (!(parcial && falta("dias")) && !diasValidos(datos.dias ?? [])) return "Los días no son válidos";
    if (!falta("mediosPago") && !mediosPagoValidos(datos.mediosPago)) return "Los medios de pago no son válidos";
    if (!fechaValida(datos.vence)) return "La fecha de vencimiento tiene que tener el formato AAAA-MM-DD";
    if (!falta("estado") && !["activa", "pausada"].includes(datos.estado)) return "El estado tiene que ser 'activa' o 'pausada'";
    return null;
}

// GET /empresa/promos
export async function listarMisPromos(req, res) {
    try {
        return res.status(200).json(await promoService.listarMisPromos(req.usuario.id));
    } catch (error) {
        return manejarError(error, res);
    }
}

// POST /empresa/promos { titulo, descripcion?, imagen?, dias, mediosPago, vence?, estado? }
export async function crearPromo(req, res) {
    const datos = { ...req.body, dias: req.body.dias ?? [] };
    const problema = validarPromo(datos, false);
    if (problema) {
        return res.status(400).json({ mensaje: problema });
    }

    try {
        const promo = await promoService.crearPromo(req.usuario.id, datos);
        return res.status(201).json(promo);
    } catch (error) {
        return manejarError(error, res);
    }
}

// PUT /empresa/promos/:id  (ej: { estado: "pausada" } para pausarla)
export async function editarPromo(req, res) {
    const idPromo = aId(req.params.id);
    if (!idPromo) {
        return res.status(404).json({ mensaje: "Promoción no encontrada" });
    }

    const problema = validarPromo(req.body, true);
    if (problema) {
        return res.status(400).json({ mensaje: problema });
    }

    try {
        const promo = await promoService.editarPromo(req.usuario.id, idPromo, req.body);
        return res.status(200).json(promo);
    } catch (error) {
        return manejarError(error, res);
    }
}

// DELETE /empresa/promos/:id
export async function borrarPromo(req, res) {
    const idPromo = aId(req.params.id);
    if (!idPromo) {
        return res.status(404).json({ mensaje: "Promoción no encontrada" });
    }

    try {
        await promoService.borrarPromo(req.usuario.id, idPromo);
        return res.status(200).json({ mensaje: "Promoción borrada" });
    } catch (error) {
        return manejarError(error, res);
    }
}
