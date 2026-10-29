import * as empresaService from "../services/empresaServices.js";
import { manejarError } from "../utils/manejarError.js";
import { RUBROS, horariosValidos, textoValido } from "../utils/validar.js";

// POST /registro/empresa { nombre, email, password, rubro, direccion, horarios, logo? }
export async function registrarEmpresa(req, res) {
    let { nombre, email, password, rubro, direccion, horarios, logo, lat, lng } = req.body;

    if (!textoValido(nombre) || !textoValido(email) || !textoValido(password) || !textoValido(direccion)) {
        return res.status(400).json({ mensaje: "Falta completar campos (nombre, email, password y direccion)" });
    }
    if (password.length < 6) {
        return res.status(400).json({ mensaje: "La contraseña tiene que tener al menos 6 caracteres" });
    }

    rubro = rubro ?? "Otro";
    if (!RUBROS.includes(rubro)) {
        return res.status(400).json({ mensaje: `El rubro tiene que ser uno de: ${RUBROS.join(", ")}` });
    }

    horarios = horarios ?? [];
    if (!horariosValidos(horarios)) {
        return res.status(400).json({ mensaje: "Los horarios no tienen el formato correcto" });
    }

    email = email.trim().toLowerCase();

    try {
        const resultado = await empresaService.registrarEmpresa({
            nombre: nombre.trim(),
            email,
            password,
            rubro,
            direccion: direccion.trim(),
            horarios,
            logo,
            lat,
            lng
        });
        return res.status(201).json({ mensaje: "Empresa registrada con éxito", ...resultado });
    } catch (error) {
        return manejarError(error, res);
    }
}

// POST /login/empresa { email, password }
export async function loginEmpresa(req, res) {
    let { email, password } = req.body;

    if (!textoValido(email) || !textoValido(password)) {
        return res.status(400).json({ mensaje: "Falta completar campos" });
    }

    email = email.trim().toLowerCase();

    try {
        const resultado = await empresaService.loginEmpresa({ email, password });
        return res.status(200).json({ mensaje: "Login exitoso", ...resultado });
    } catch (error) {
        return manejarError(error, res);
    }
}

// GET /empresa/negocio
export async function miNegocio(req, res) {
    try {
        const negocio = await empresaService.obtenerMiNegocio(req.usuario.id);
        return res.status(200).json(negocio);
    } catch (error) {
        return manejarError(error, res);
    }
}

// PUT /empresa/negocio { nombre?, descripcion?, rubro?, direccion?, horarios?, logo?, portada?, mediosPago? }
export async function editarMiNegocio(req, res) {
    const datos = req.body;

    if (datos.nombre !== undefined && !textoValido(datos.nombre)) {
        return res.status(400).json({ mensaje: "El nombre no puede quedar vacío" });
    }
    if (datos.direccion !== undefined && !textoValido(datos.direccion)) {
        return res.status(400).json({ mensaje: "La dirección no puede quedar vacía" });
    }
    if (datos.rubro !== undefined && !RUBROS.includes(datos.rubro)) {
        return res.status(400).json({ mensaje: `El rubro tiene que ser uno de: ${RUBROS.join(", ")}` });
    }
    if (datos.horarios !== undefined && !horariosValidos(datos.horarios)) {
        return res.status(400).json({ mensaje: "Los horarios no tienen el formato correcto" });
    }
    if (datos.mediosPago !== undefined &&
        !(Array.isArray(datos.mediosPago) && datos.mediosPago.every((m) => typeof m === "string"))) {
        return res.status(400).json({ mensaje: "mediosPago tiene que ser una lista de textos" });
    }
    if (datos.descripcion !== undefined && typeof datos.descripcion !== "string") {
        return res.status(400).json({ mensaje: "La descripción tiene que ser texto" });
    }

    try {
        const negocio = await empresaService.editarMiNegocio(req.usuario.id, {
            ...datos,
            nombre: datos.nombre?.trim(),
            direccion: datos.direccion?.trim()
        });
        return res.status(200).json(negocio);
    } catch (error) {
        return manejarError(error, res);
    }
}
