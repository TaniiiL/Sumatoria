import { db } from "../db.js";
import { crearError } from "../utils/manejarError.js";

// Fila de la tabla tarjetas -> formato del front
function aTarjeta(fila) {
    return {
        id: String(fila.id_tarjeta),
        marca: fila.red_pago,
        banco: fila.emisor,
        tipo: fila.tipo
    };
}

// GET /tarjetas: catálogo completo para elegir
export const listarTarjetas = async () => {
    const resultado = await db.query(
        "SELECT id_tarjeta, red_pago, emisor, tipo FROM tarjetas ORDER BY emisor, red_pago, tipo"
    );
    return resultado.rows.map(aTarjeta);
};

// GET /usuario/tarjetas: las tarjetas que vinculó el usuario
export const tarjetasDeUsuario = async (idUsuario) => {
    const resultado = await db.query(
        `SELECT t.id_tarjeta, t.red_pago, t.emisor, t.tipo
         FROM pertenecen p
         JOIN tarjetas t ON t.id_tarjeta = p.id_tarjeta
         WHERE p.id_usuario = $1
         ORDER BY t.emisor, t.red_pago, t.tipo`,
        [idUsuario]
    );
    return resultado.rows.map(aTarjeta);
};

// POST /usuario/tarjetas { marca, banco, tipo }: vincula una tarjeta
export const agregarTarjeta = async (idUsuario, { marca, banco, tipo }) => {
    const tarjeta = await db.query(
        "SELECT id_tarjeta FROM tarjetas WHERE red_pago = $1 AND emisor = $2 AND tipo = $3",
        [marca, banco, tipo]
    );

    if (tarjeta.rows.length === 0) {
        throw crearError(400, "Esa combinación de marca, banco y tipo no existe");
    }

    // ON CONFLICT DO NOTHING: si ya la tenía, no hace nada (igual que el front)
    await db.query(
        `INSERT INTO pertenecen (id_usuario, id_tarjeta) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [idUsuario, tarjeta.rows[0].id_tarjeta]
    );

    return tarjetasDeUsuario(idUsuario);
};

// DELETE /usuario/tarjetas/:id: desvincula una tarjeta
export const quitarTarjeta = async (idUsuario, idTarjeta) => {
    await db.query(
        "DELETE FROM pertenecen WHERE id_usuario = $1 AND id_tarjeta = $2",
        [idUsuario, idTarjeta]
    );
    return tarjetasDeUsuario(idUsuario);
};
