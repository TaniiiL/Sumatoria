import * as negocioService from "../services/negocioServices.js";
import { aId, manejarError } from "../utils/manejarError.js";

// GET /negocios  y  GET /negocios?buscar=texto
export async function listarNegocios(req, res) {
    try {
        const negocios = await negocioService.listarNegocios(req.query.buscar, req.usuario);
        return res.status(200).json(negocios);
    } catch (error) {
        return manejarError(error, res);
    }
}

// GET /negocios/:id
export async function obtenerNegocio(req, res) {
    const idSucursal = aId(req.params.id);
    if (!idSucursal) {
        return res.status(404).json({ mensaje: "Negocio no encontrado" });
    }

    try {
        const negocio = await negocioService.obtenerNegocio(idSucursal, req.usuario);
        return res.status(200).json(negocio);
    } catch (error) {
        return manejarError(error, res);
    }
}

// GET /inicio
export async function inicio(req, res) {
    try {
        const secciones = await negocioService.seccionesInicio(req.usuario);
        return res.status(200).json(secciones);
    } catch (error) {
        return manejarError(error, res);
    }
}
