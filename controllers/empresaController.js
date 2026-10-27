import {
    registrarEmpresa as registrarEmpresaService,
    loginEmpresa as loginEmpresaService,
    obtenerPerfilEmpresa as obtenerPerfilEmpresaService
} from "../services/empresaServices.js";
import { manejarError } from "../utils/manejarError.js";

export async function registrarEmpresa(req, res) {
    let { nombre, email, password, logo } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ mensaje: "Falta completar campos" });
    }

    email = email.trim().toLowerCase();

    try {
        const nuevaEmpresa = await registrarEmpresaService({ nombre, email, password, logo });
        return res.status(201).json({
            mensaje: "Empresa registrada con éxito",
            empresa: nuevaEmpresa
        });
    } catch (error) {
        return manejarError(error, res);
    }
}

export async function loginEmpresa(req, res) {
    let { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ mensaje: "Falta completar campos" });
    }

    email = email.trim().toLowerCase();

    try {
        const resultado = await loginEmpresaService({ email, password });
        return res.status(200).json({
            mensaje: "Login exitoso",
            ...resultado
        });
    } catch (error) {
        return manejarError(error, res);
    }
}

export async function perfilEmpresa(req, res) {
    try {
        const empresa = await obtenerPerfilEmpresaService(req.usuario.id);
        return res.status(200).json(empresa);
    } catch (error) {
        return manejarError(error, res);
    }
}