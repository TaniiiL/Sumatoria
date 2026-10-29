import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db.js";
import { crearError } from "../utils/manejarError.js";
import { geocodificar } from "../utils/geocodificar.js";

function crearToken(idEmpresa) {
    return jwt.sign(
        { id: idEmpresa, rol: "empresa" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

// Empresa + su sucursal -> "MiNegocio" del front
function aMiNegocio(fila) {
    return {
        id: String(fila.id_sucursal),
        nombre: fila.nombre,
        descripcion: fila.descripcion,
        rubro: fila.rubro,
        direccion: fila.direccion,
        lat: fila.lat,
        lng: fila.lng,
        logo: fila.logo ?? undefined,
        portada: fila.portada ?? undefined,
        horarios: fila.horarios,
        mediosPago: fila.medios_pago,
        email: fila.mail
    };
}

// Trae la empresa con su sucursal (el front maneja un negocio por cuenta)
async function buscarMiNegocio(idEmpresa) {
    const resultado = await db.query(
        `SELECT e.id_empresa, e.nombre, e.mail, e.logo, e.portada, e.rubro, e.descripcion, e.medios_pago,
                s.id_sucursal, s.direccion, s.lat, s.lng, s.horarios
         FROM empresa e
         JOIN sucursal s ON s.id_empresa = e.id_empresa
         WHERE e.id_empresa = $1
         ORDER BY s.id_sucursal
         LIMIT 1`,
        [idEmpresa]
    );

    if (resultado.rows.length === 0) {
        throw crearError(404, "Negocio no encontrado");
    }
    return resultado.rows[0];
}

// Id de la sucursal de una empresa (lo usan las promos y otros services)
export async function idSucursalDeEmpresa(idEmpresa) {
    const fila = await buscarMiNegocio(idEmpresa);
    return fila.id_sucursal;
}

// POST /registro/empresa: crea la empresa y su sucursal juntas
export const registrarEmpresa = async ({ nombre, email, password, rubro, direccion, horarios, logo, lat, lng }) => {
    // 1. Verificar que el mail no esté registrado
    const existe = await db.query("SELECT id_empresa FROM empresa WHERE mail = $1", [email]);
    if (existe.rows.length > 0) {
        throw crearError(409, "Ya existe una empresa con ese mail");
    }

    // 2. Encriptar la contraseña y buscar las coordenadas de la dirección
    const hash = await bcrypt.hash(password, 10);
    const coordenadas =
        typeof lat === "number" && typeof lng === "number"
            ? { lat, lng }
            : await geocodificar(direccion);

    // 3. Transacción: se crean la empresa y la sucursal, o ninguna de las dos
    const client = await db.connect();
    let idEmpresa;
    try {
        await client.query("BEGIN");

        const empresa = await client.query(
            `INSERT INTO empresa (nombre, mail, "contraseña", logo, rubro)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id_empresa`,
            [nombre, email, hash, logo || null, rubro]
        );
        idEmpresa = empresa.rows[0].id_empresa;

        await client.query(
            `INSERT INTO sucursal (id_empresa, direccion, lat, lng, horarios)
             VALUES ($1, $2, $3, $4, $5)`,
            [idEmpresa, direccion, coordenadas.lat, coordenadas.lng, JSON.stringify(horarios)]
        );

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    const negocio = aMiNegocio(await buscarMiNegocio(idEmpresa));
    return { token: crearToken(idEmpresa), negocio };
};

export const loginEmpresa = async ({ email, password }) => {
    const resultado = await db.query(
        `SELECT id_empresa, "contraseña" AS password FROM empresa WHERE mail = $1`,
        [email]
    );
    const empresa = resultado.rows[0];

    const passwordCorrecta = empresa && await bcrypt.compare(password, empresa.password);
    if (!passwordCorrecta) {
        throw crearError(401, "Mail o contraseña incorrectos");
    }

    const negocio = aMiNegocio(await buscarMiNegocio(empresa.id_empresa));
    return { token: crearToken(empresa.id_empresa), negocio };
};

// GET /empresa/negocio
export const obtenerMiNegocio = async (idEmpresa) => {
    return aMiNegocio(await buscarMiNegocio(idEmpresa));
};

// PUT /empresa/negocio: solo cambia los campos que se mandan
export const editarMiNegocio = async (idEmpresa, datos) => {
    const actual = await buscarMiNegocio(idEmpresa);

    // Si cambió la dirección, se recalculan las coordenadas
    let { lat, lng } = actual;
    if (typeof datos.lat === "number" && typeof datos.lng === "number") {
        ({ lat, lng } = datos);
    } else if (datos.direccion !== undefined && datos.direccion !== actual.direccion) {
        ({ lat, lng } = await geocodificar(datos.direccion));
    }

    const client = await db.connect();
    try {
        await client.query("BEGIN");

        await client.query(
            `UPDATE empresa
             SET nombre      = COALESCE($1, nombre),
                 descripcion = COALESCE($2, descripcion),
                 rubro       = COALESCE($3, rubro),
                 medios_pago = COALESCE($4, medios_pago),
                 logo        = CASE WHEN $5::boolean THEN $6 ELSE logo END,
                 portada     = CASE WHEN $7::boolean THEN $8 ELSE portada END
             WHERE id_empresa = $9`,
            [
                datos.nombre ?? null,
                datos.descripcion ?? null,
                datos.rubro ?? null,
                datos.mediosPago ?? null,
                datos.logo !== undefined, datos.logo || null,
                datos.portada !== undefined, datos.portada || null,
                idEmpresa
            ]
        );

        await client.query(
            `UPDATE sucursal
             SET direccion = COALESCE($1, direccion),
                 horarios  = COALESCE($2, horarios),
                 lat = $3,
                 lng = $4
             WHERE id_sucursal = $5`,
            [
                datos.direccion ?? null,
                datos.horarios ? JSON.stringify(datos.horarios) : null,
                lat,
                lng,
                actual.id_sucursal
            ]
        );

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    return aMiNegocio(await buscarMiNegocio(idEmpresa));
};
