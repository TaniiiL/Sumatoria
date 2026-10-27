import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

export const registrarEmpresa = async ({ nombre, email, password, logo }) => {
    // 1. Verificar que el mail no esté registrado
    const existe = await db.query(
        "SELECT id_empresa FROM empresa WHERE mail = $1",
        [email]
    );

    if (existe.rows.length > 0) {
        const error = new Error("Ya existe una empresa con ese mail");
        error.status = 409;
        throw error;
    }

    // 2. Encriptar la contraseña
    const hash = await bcrypt.hash(password, 10);

    // 3. Guardar la empresa (sin devolver la contraseña)
    const resultado = await db.query(
        `INSERT INTO empresa (nombre, mail, "contraseña", logo)
         VALUES ($1, $2, $3, $4)
         RETURNING id_empresa, nombre, mail, logo`,
        [nombre, email, hash, logo || null]
    );

    return resultado.rows[0];
};

export const loginEmpresa = async ({ email, password }) => {
    // 1. Buscar la empresa por mail
    const resultado = await db.query(
        `SELECT id_empresa, nombre, mail, logo, "contraseña" AS password
         FROM empresa WHERE mail = $1`,
        [email]
    );
    const empresa = resultado.rows[0];

    // 2. Comparar la contraseña
    const passwordCorrecta = empresa && await bcrypt.compare(password, empresa.password);

    if (!passwordCorrecta) {
        const error = new Error("Mail o contraseña incorrectos");
        error.status = 401;
        throw error;
    }

    // 3. Crear el token con rol "empresa"
    const token = jwt.sign(
        { id: empresa.id_empresa, rol: "empresa" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    return {
        token,
        empresa: {
            id_empresa: empresa.id_empresa,
            nombre: empresa.nombre,
            mail: empresa.mail,
            logo: empresa.logo
        }
    };
};

export const obtenerPerfilEmpresa = async (idEmpresa) => {
    const resultado = await db.query(
        "SELECT id_empresa, nombre, mail, logo FROM empresa WHERE id_empresa = $1",
        [idEmpresa]
    );

    if (resultado.rows.length === 0) {
        const error = new Error("Empresa no encontrada");
        error.status = 404;
        throw error;
    }

    return resultado.rows[0];
};