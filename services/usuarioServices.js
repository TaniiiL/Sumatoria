import bcrypt from "bcrypt";
import { db } from "../db.js";

export const registrarUsuario = async ({ nombre, email, password }) => {
    const hash = await bcrypt.hash(password, 10);

    const resultado = await db.query(
        `INSERT INTO usuario (nombre, email, "password") VALUES ($1, $2, $3) RETURNING id, nombre, email`,
        [nombre, email, hash]
    );

    return resultado.rows[0];
};