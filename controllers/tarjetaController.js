import * as tarjetaService from "../services/tarjetaServices.js";
import { aId, manejarError } from "../utils/manejarError.js";
import { MARCAS, TIPOS_TARJETA, textoValido } from "../utils/validar.js";

// GET /tarjetas
export async function listarTarjetas(req, res) {
    try {
        return res.status(200).json(await tarjetaService.listarTarjetas());
    } catch (error) {
        return manejarError(error, res);
    }
}

// GET /usuario/tarjetas
export async function misTarjetas(req, res) {
    try {
        return res.status(200).json(await tarjetaService.tarjetasDeUsuario(req.usuario.id));
    } catch (error) {
        return manejarError(error, res);
    }
}

// POST /usuario/tarjetas { marca, banco, tipo }
export async function agregarMiTarjeta(req, res) {
    const { marca, banco, tipo } = req.body;

    if (!MARCAS.includes(marca) || !TIPOS_TARJETA.includes(tipo) || !textoValido(banco)) {
        return res.status(400).json({
            mensaje: `Mandá marca (${MARCAS.join(", ")}), banco y tipo (${TIPOS_TARJETA.join(", ")})`
        });
    }

    try {
        const tarjetas = await tarjetaService.agregarTarjeta(req.usuario.id, { marca, banco, tipo });
        return res.status(200).json(tarjetas);
    } catch (error) {
        return manejarError(error, res);
    }
}

// DELETE /usuario/tarjetas/:id
export async function quitarMiTarjeta(req, res) {
    const idTarjeta = aId(req.params.id);
    if (!idTarjeta) {
        return res.status(400).json({ mensaje: "Id de tarjeta inválido" });
    }

    try {
        const tarjetas = await tarjetaService.quitarTarjeta(req.usuario.id, idTarjeta);
        return res.status(200).json(tarjetas);
    } catch (error) {
        return manejarError(error, res);
    }
}
