import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

export const registrarUsuario = async ({ nombre, email, password }) => {
    // 1. Verificar que el mail no esté registrado
    const existe = await db.query(
        "SELECT id_usuario FROM usuario WHERE email = $1",
        [email]
    );

    if (existe.rows.length > 0) {
        const error = new Error("Ya existe un usuario con ese mail");
        error.status = 409;
        throw error;
    }

    // 2. Encriptar la contraseña
    const hash = await bcrypt.hash(password, 10);

    // 3. Guardar el usuario (sin devolver la contraseña)
    const resultado = await db.query(
        `INSERT INTO usuario (nombre, email, password)
         VALUES ($1, $2, $3)
         RETURNING id_usuario, nombre, email`,
        [nombre, email, hash]
    );

    return resultado.rows[0];
};

export const loginUsuario = async ({ email, password }) => {
    // 1. Buscar al usuario por mail
    const resultado = await db.query(
        "SELECT id_usuario, nombre, email, password FROM usuario WHERE email = $1",
        [email]
    );
    const usuario = resultado.rows[0];

    // 2. Comparar la contraseña con la encriptada
    const passwordCorrecta = usuario && await bcrypt.compare(password, usuario.password);

    // Mismo mensaje si no existe el mail o si la contraseña está mal,
    // así no se puede averiguar qué mails están registrados
    if (!passwordCorrecta) {
        const error = new Error("Mail o contraseña incorrectos");
        error.status = 401;
        throw error;
    }

    // 3. Crear el token con el id y el rol
    const token = jwt.sign(
        { id: usuario.id_usuario, rol: "usuario" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    return {
        token,
        usuario: {
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            email: usuario.email
        }
    };
};