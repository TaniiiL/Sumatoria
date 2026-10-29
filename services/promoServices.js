import { db } from "../db.js";
import { crearError } from "../utils/manejarError.js";
import { idSucursalDeEmpresa } from "./empresaServices.js";
import { mediosPagoDePromos } from "./negocioServices.js";
import { notificarPromoNueva } from "./notificacionServices.js";

// Fila de descuentos_sucursal -> "PromoNegocio" del front (vista de la empresa)
function aPromoNegocio(fila, mediosPago) {
    return {
        id: String(fila.id_descuento),
        titulo: fila.titulo,
        descripcion: fila.descripcion,
        imagen: fila.imagen ?? undefined,
        dias: fila.dias,
        mediosPago,
        vence: fila.vence ?? undefined,
        estado: fila.estado
    };
}

// Guarda los medios de pago de una promo (borra los anteriores y carga los nuevos)
async function guardarMediosPago(client, idDescuento, mediosPago) {
    await client.query("DELETE FROM aplican WHERE id_descuento = $1", [idDescuento]);

    for (const medio of mediosPago) {
        const esTarjeta = medio.tipo === "debito" || medio.tipo === "credito";
        await client.query(
            `INSERT INTO aplican (id_descuento, tipo, red_pago, emisor)
             VALUES ($1, $2, $3, $4)`,
            [
                idDescuento,
                medio.tipo,
                esTarjeta ? medio.marca || null : null,
                esTarjeta ? medio.banco || null : null
            ]
        );
    }
}

async function buscarPromo(idSucursal, idDescuento) {
    const resultado = await db.query(
        "SELECT * FROM descuentos_sucursal WHERE id_descuento = $1 AND id_sucursal = $2",
        [idDescuento, idSucursal]
    );
    if (resultado.rows.length === 0) {
        throw crearError(404, "Promoción no encontrada");
    }
    const promo = resultado.rows[0];
    const medios = await mediosPagoDePromos([promo.id_descuento]);
    return aPromoNegocio(promo, medios[promo.id_descuento] ?? []);
}

// GET /empresa/promos: todas las promos del negocio (activas, pausadas y vencidas)
export const listarMisPromos = async (idEmpresa) => {
    const idSucursal = await idSucursalDeEmpresa(idEmpresa);

    const resultado = await db.query(
        "SELECT * FROM descuentos_sucursal WHERE id_sucursal = $1 ORDER BY fecha DESC",
        [idSucursal]
    );
    const medios = await mediosPagoDePromos(resultado.rows.map((p) => p.id_descuento));

    return resultado.rows.map((p) => aPromoNegocio(p, medios[p.id_descuento] ?? []));
};

// POST /empresa/promos
export const crearPromo = async (idEmpresa, datos) => {
    const idSucursal = await idSucursalDeEmpresa(idEmpresa);
    const estado = datos.estado ?? "activa";

    const client = await db.connect();
    let idDescuento;
    try {
        await client.query("BEGIN");

        const resultado = await client.query(
            `INSERT INTO descuentos_sucursal (id_sucursal, titulo, descripcion, imagen, dias, vence, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id_descuento`,
            [
                idSucursal,
                datos.titulo.trim(),
                datos.descripcion ?? "",
                datos.imagen || null,
                datos.dias,
                datos.vence || null,
                estado
            ]
        );
        idDescuento = resultado.rows[0].id_descuento;

        await guardarMediosPago(client, idDescuento, datos.mediosPago ?? []);

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    // Si se publica activa, se avisa a los seguidores
    if (estado === "activa") {
        await notificarPromoNueva(idSucursal, idDescuento, datos.titulo.trim());
    }

    return buscarPromo(idSucursal, idDescuento);
};

// PUT /empresa/promos/:id: solo cambia lo que se manda
export const editarPromo = async (idEmpresa, idDescuento, datos) => {
    const idSucursal = await idSucursalDeEmpresa(idEmpresa);
    const anterior = await buscarPromo(idSucursal, idDescuento); // tira 404 si no es suya

    const client = await db.connect();
    try {
        await client.query("BEGIN");

        await client.query(
            `UPDATE descuentos_sucursal
             SET titulo      = COALESCE($1, titulo),
                 descripcion = COALESCE($2, descripcion),
                 imagen      = CASE WHEN $3::boolean THEN $4 ELSE imagen END,
                 dias        = COALESCE($5, dias),
                 vence       = CASE WHEN $6::boolean THEN $7::date ELSE vence END,
                 estado      = COALESCE($8, estado)
             WHERE id_descuento = $9`,
            [
                datos.titulo?.trim() ?? null,
                datos.descripcion ?? null,
                datos.imagen !== undefined, datos.imagen || null,
                datos.dias ?? null,
                datos.vence !== undefined, datos.vence || null,
                datos.estado ?? null,
                idDescuento
            ]
        );

        if (datos.mediosPago) {
            await guardarMediosPago(client, idDescuento, datos.mediosPago);
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    const actualizada = await buscarPromo(idSucursal, idDescuento);

    // Si pasó de pausada a activa, se avisa a los seguidores
    if (anterior.estado === "pausada" && actualizada.estado === "activa") {
        await notificarPromoNueva(idSucursal, idDescuento, actualizada.titulo);
    }

    return actualizada;
};

// DELETE /empresa/promos/:id
export const borrarPromo = async (idEmpresa, idDescuento) => {
    const idSucursal = await idSucursalDeEmpresa(idEmpresa);
    const resultado = await db.query(
        "DELETE FROM descuentos_sucursal WHERE id_descuento = $1 AND id_sucursal = $2",
        [idDescuento, idSucursal]
    );
    if (resultado.rowCount === 0) {
        throw crearError(404, "Promoción no encontrada");
    }
};
