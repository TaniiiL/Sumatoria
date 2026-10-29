import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { db } from "../db.js";
import { crearError } from "../utils/manejarError.js";

const CAMPOS_PUBLICOS = "id_usuario, nombre, email, foto, barrio, google_id";

// Fila de la tabla usuario -> formato del front (nunca incluye la contraseña)
function aUsuario(fila) {
    return {
        id_usuario: fila.id_usuario,
        nombre: fila.nombre,
        email: fila.email,
        emailGoogle: fila.google_id ? fila.email : "",
        foto: fila.foto ?? null,
        barrio: fila.barrio ?? ""
    };
}

function crearToken(idUsuario) {
    return jwt.sign(
        { id: idUsuario, rol: "usuario" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

export const registrarUsuario = async ({ nombre, email, password }) => {
    // 1. Verificar que el mail no esté registrado
    const existe = await db.query("SELECT id_usuario FROM usuario WHERE email = $1", [email]);

    if (existe.rows.length > 0) {
        throw crearError(409, "Ya existe un usuario con ese mail");
    }

    // 2. Encriptar la contraseña
    const hash = await bcrypt.hash(password, 10);

    // 3. Guardar el usuario (sin devolver la contraseña)
    const resultado = await db.query(
        `INSERT INTO usuario (nombre, email, password)
         VALUES ($1, $2, $3)
         RETURNING ${CAMPOS_PUBLICOS}`,
        [nombre, email, hash]
    );

    // 4. Se devuelve el token también, así el front no tiene que hacer login aparte
    const usuario = resultado.rows[0];
    return { token: crearToken(usuario.id_usuario), usuario: aUsuario(usuario) };
};

export const loginUsuario = async ({ email, password }) => {
    // 1. Buscar al usuario por mail
    const resultado = await db.query(
        `SELECT ${CAMPOS_PUBLICOS}, password FROM usuario WHERE email = $1`,
        [email]
    );
    const usuario = resultado.rows[0];

    // 2. Comparar la contraseña con la encriptada
    const passwordCorrecta = usuario && await bcrypt.compare(password, usuario.password);

    // Mismo mensaje si no existe el mail o si la contraseña está mal,
    // así no se puede averiguar qué mails están registrados
    if (!passwordCorrecta) {
        throw crearError(401, "Mail o contraseña incorrectos");
    }

    // 3. Crear el token con el id y el rol
    return { token: crearToken(usuario.id_usuario), usuario: aUsuario(usuario) };
};

// POST /login/google { access_token }: el front ya tiene el botón de Google
export const loginGoogle = async (accessToken) => {
    // 1. Le preguntamos a Google de quién es ese token
    const respuesta = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!respuesta.ok) {
        throw crearError(401, "No se pudo verificar la cuenta de Google");
    }

    const google = await respuesta.json();
    if (!google.email) {
        throw crearError(401, "La cuenta de Google no tiene mail");
    }
    const email = google.email.toLowerCase();

    // 2. Si ya existe un usuario con ese mail, se le vincula Google
    const existe = await db.query(`SELECT ${CAMPOS_PUBLICOS} FROM usuario WHERE email = $1`, [email]);

    let usuario;
    if (existe.rows.length > 0) {
        const actualizado = await db.query(
            `UPDATE usuario
             SET google_id = $1, foto = COALESCE(foto, $2)
             WHERE id_usuario = $3
             RETURNING ${CAMPOS_PUBLICOS}`,
            [google.sub, google.picture ?? null, existe.rows[0].id_usuario]
        );
        usuario = actualizado.rows[0];
    } else {
        // 3. Si no existe, se crea. La contraseña es al azar porque entra siempre con Google
        const hash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
        const creado = await db.query(
            `INSERT INTO usuario (nombre, email, password, google_id, foto)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING ${CAMPOS_PUBLICOS}`,
            [google.name || email, email, hash, google.sub, google.picture ?? null]
        );
        usuario = creado.rows[0];
    }

    return { token: crearToken(usuario.id_usuario), usuario: aUsuario(usuario) };
};

export const obtenerPerfil = async (idUsuario) => {
    const resultado = await db.query(
        `SELECT ${CAMPOS_PUBLICOS} FROM usuario WHERE id_usuario = $1`,
        [idUsuario]
    );

    if (resultado.rows.length === 0) {
        throw crearError(404, "Usuario no encontrado");
    }

    return aUsuario(resultado.rows[0]);
};

// PUT /usuario/perfil { nombre, barrio, foto }: solo cambia lo que se manda
export const editarPerfil = async (idUsuario, { nombre, barrio, foto }) => {
    const resultado = await db.query(
        `UPDATE usuario
         SET nombre = COALESCE($1, nombre),
             barrio = COALESCE($2, barrio),
             foto   = CASE WHEN $3::boolean THEN $4 ELSE foto END
         WHERE id_usuario = $5
         RETURNING ${CAMPOS_PUBLICOS}`,
        [nombre ?? null, barrio ?? null, foto !== undefined, foto ?? null, idUsuario]
    );

    if (resultado.rows.length === 0) {
        throw crearError(404, "Usuario no encontrado");
    }

    return aUsuario(resultado.rows[0]);
};
