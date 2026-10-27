import bcrypt from "bcrypt";
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