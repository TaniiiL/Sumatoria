import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool, types } = pkg;

// Las columnas de tipo DATE (ej: "vence") se devuelven como texto "2026-11-30",
// que es el formato que usa el front, en vez de un objeto Date.
types.setTypeParser(1082, (valor) => valor);

export const db = new Pool({
    connectionString: process.env.DATABASE_URL
});
