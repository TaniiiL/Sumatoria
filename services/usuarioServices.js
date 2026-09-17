import { db } from "../db.js";

export const registrarUsuario = async ({ nombre, email, password }) => {
    const resultado = await db.query(
        `INSERT INTO usuario (nombre, email, "password") VALUES ($1, $2, $3) RETURNING *`,
        [nombre, email, password]
    );

    return resultado.rows[0];
};