import { db } from "../db.js";
import { crearError } from "../utils/manejarError.js";
import { armarNegocios, aPromocion, mediosPagoDePromos } from "./negocioServices.js";

// GET /usuario/favoritos -> [{ negocio, promocion }]
export const listarFavoritos = async (idUsuario) => {
    const resultado = await db.query(
        `SELECT d.*
         FROM favea_sucursal f
         JOIN descuentos_sucursal d ON d.id_descuento = f.id_descuento
         WHERE f.id_usuario = $1
         ORDER BY d.fecha DESC`,
        [idUsuario]
    );
    const promos = resultado.rows;
    if (promos.length === 0) return [];

    const medios = await mediosPagoDePromos(promos.map((p) => p.id_descuento));
    const idsSucursales = [...new Set(promos.map((p) => p.id_sucursal))];
    const negocios = await armarNegocios(idsSucursales);

    return promos
        .map((p) => ({
            negocio: negocios.find((n) => n.id === String(p.id_sucursal)),
            promocion: aPromocion(p, medios[p.id_descuento] ?? [])
        }))
        .filter((favorito) => favorito.negocio);
};

// GET /usuario/favoritos/ids -> [{ negocioId, promoId }] (para pintar los corazones)
export const idsFavoritos = async (idUsuario) => {
    const resultado = await db.query(
        `SELECT d.id_sucursal, d.id_descuento
         FROM favea_sucursal f
         JOIN descuentos_sucursal d ON d.id_descuento = f.id_descuento
         WHERE f.id_usuario = $1`,
        [idUsuario]
    );
    return resultado.rows.map((f) => ({
        negocioId: String(f.id_sucursal),
        promoId: String(f.id_descuento)
    }));
};

// POST /usuario/favoritos { promoId }
export const agregarFavorito = async (idUsuario, idDescuento) => {
    const existe = await db.query(
        "SELECT 1 FROM descuentos_sucursal WHERE id_descuento = $1",
        [idDescuento]
    );
    if (existe.rows.length === 0) {
        throw crearError(404, "Promoción no encontrada");
    }

    await db.query(
        `INSERT INTO favea_sucursal (id_usuario, id_descuento) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [idUsuario, idDescuento]
    );
    return idsFavoritos(idUsuario);
};

// DELETE /usuario/favoritos/:promoId
export const quitarFavorito = async (idUsuario, idDescuento) => {
    await db.query(
        "DELETE FROM favea_sucursal WHERE id_usuario = $1 AND id_descuento = $2",
        [idUsuario, idDescuento]
    );
    return idsFavoritos(idUsuario);
};
