import { db } from "../db.js";
import { crearError } from "../utils/manejarError.js";
import { armarNegocios, tarjetasDeQuienPide } from "./negocioServices.js";

async function idsSeguidos(idUsuario) {
    const resultado = await db.query(
        "SELECT id_sucursal FROM seguimiento WHERE id_usuario = $1 ORDER BY id_seguimiento DESC",
        [idUsuario]
    );
    return resultado.rows.map((f) => f.id_sucursal);
}

// GET /usuario/seguidos -> negocios que sigue
export const listarSeguidos = async (sesion) => {
    const tarjetas = await tarjetasDeQuienPide(sesion);
    return armarNegocios(await idsSeguidos(sesion.id), tarjetas);
};

// GET /usuario/seguidos/ids -> ["1", "4"] (para saber qué botones pintar como "Siguiendo")
export const listarIdsSeguidos = async (idUsuario) => {
    return (await idsSeguidos(idUsuario)).map(String);
};

// POST /negocios/:id/seguir
export const seguir = async (idUsuario, idSucursal) => {
    const existe = await db.query("SELECT 1 FROM sucursal WHERE id_sucursal = $1", [idSucursal]);
    if (existe.rows.length === 0) {
        throw crearError(404, "Negocio no encontrado");
    }

    await db.query(
        `INSERT INTO seguimiento (id_usuario, id_sucursal) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [idUsuario, idSucursal]
    );
    return listarIdsSeguidos(idUsuario);
};

// DELETE /negocios/:id/seguir
export const dejarDeSeguir = async (idUsuario, idSucursal) => {
    await db.query(
        "DELETE FROM seguimiento WHERE id_usuario = $1 AND id_sucursal = $2",
        [idUsuario, idSucursal]
    );
    return listarIdsSeguidos(idUsuario);
};
