import { db } from "../db.js";
import { crearError } from "../utils/manejarError.js";
import { tarjetasDeUsuario } from "./tarjetaServices.js";

// Condición SQL de "promo vigente": activa y no vencida
export const PROMO_VIGENTE = "d.estado = 'activa' AND (d.vence IS NULL OR d.vence >= CURRENT_DATE)";

// ---------------------------------------------------------------------
// Formatos que espera el front
// ---------------------------------------------------------------------

// Fila de la tabla aplican -> medio de pago del front
export function aMedioPago(fila) {
    if (fila.tipo === "debito" || fila.tipo === "credito") {
        return { tipo: fila.tipo, marca: fila.red_pago, banco: fila.emisor };
    }
    return { tipo: fila.tipo };
}

// Fila de descuentos_sucursal -> promoción del front
export function aPromocion(fila, mediosPago) {
    return {
        id: String(fila.id_descuento),
        descuento: fila.titulo,
        descripcion: fila.descripcion,
        imagen: fila.imagen ?? undefined,
        dias: fila.dias,
        mediosPago,
        vence: fila.vence ?? undefined
    };
}

// Medios de pago de varias promos de una sola vez: { idPromo: [medios] }
export async function mediosPagoDePromos(idsPromos) {
    const porPromo = {};
    if (idsPromos.length === 0) return porPromo;

    const resultado = await db.query(
        `SELECT id_descuento, tipo, red_pago, emisor
         FROM aplican
         WHERE id_descuento = ANY($1::int[])
         ORDER BY id_aplican`,
        [idsPromos]
    );

    for (const fila of resultado.rows) {
        porPromo[fila.id_descuento] ??= [];
        porPromo[fila.id_descuento].push(aMedioPago(fila));
    }
    return porPromo;
}

// ¿La promo sirve con alguna de las tarjetas del usuario? (misma lógica que el front)
export function sirveConTarjetas(promo, tarjetas) {
    if (tarjetas.length === 0 || promo.mediosPago.length === 0) return true;

    return promo.mediosPago.some((medio) => {
        if (medio.tipo !== "debito" && medio.tipo !== "credito") {
            // efectivo y transferencia los puede usar cualquiera
            return medio.tipo === "efectivo" || medio.tipo === "transferencia";
        }
        return tarjetas.some(
            (tarjeta) =>
                tarjeta.tipo === medio.tipo &&
                (!medio.marca || medio.marca === tarjeta.marca) &&
                (!medio.banco || medio.banco === tarjeta.banco)
        );
    });
}

// Tarjetas del que hace el pedido (solo si es un usuario logueado)
export async function tarjetasDeQuienPide(sesion) {
    if (!sesion || sesion.rol !== "usuario") return [];
    return tarjetasDeUsuario(sesion.id);
}

// ---------------------------------------------------------------------
// Arma los negocios completos (con horarios y promociones) a partir de
// una lista de ids de sucursal, respetando el orden de la lista.
// ---------------------------------------------------------------------
export async function armarNegocios(idsSucursales, tarjetas = []) {
    if (idsSucursales.length === 0) return [];

    const sucursales = await db.query(
        `SELECT s.id_sucursal, s.direccion, s.lat, s.lng, s.horarios,
                e.nombre, e.rubro, e.logo, e.portada, e.descripcion
         FROM sucursal s
         JOIN empresa e ON e.id_empresa = s.id_empresa
         WHERE s.id_sucursal = ANY($1::int[])`,
        [idsSucursales]
    );

    const promos = await db.query(
        `SELECT d.*
         FROM descuentos_sucursal d
         WHERE d.id_sucursal = ANY($1::int[]) AND ${PROMO_VIGENTE}
         ORDER BY d.fecha DESC`,
        [idsSucursales]
    );

    const medios = await mediosPagoDePromos(promos.rows.map((p) => p.id_descuento));

    const negocios = sucursales.rows.map((s) => ({
        id: String(s.id_sucursal),
        nombre: s.nombre,
        rubro: s.rubro,
        logo: s.logo ?? undefined,
        portada: s.portada ?? undefined,
        descripcion: s.descripcion,
        direccion: s.direccion,
        lat: s.lat,
        lng: s.lng,
        horarios: s.horarios,
        promociones: promos.rows
            .filter((p) => p.id_sucursal === s.id_sucursal)
            .map((p) => aPromocion(p, medios[p.id_descuento] ?? []))
            .filter((promo) => sirveConTarjetas(promo, tarjetas))
    }));

    // Devolver en el mismo orden en que se pidieron
    return idsSucursales
        .map((id) => negocios.find((n) => n.id === String(id)))
        .filter(Boolean);
}

// ---------------------------------------------------------------------
// Endpoints públicos
// ---------------------------------------------------------------------

// GET /negocios y GET /negocios?buscar=texto
export const listarNegocios = async (buscar, sesion) => {
    let resultado;

    if (buscar && buscar.trim() !== "") {
        // Busca en nombre, rubro, descripción, dirección y en las promos
        // (unaccent no siempre está instalado, por eso se usa ILIKE común)
        const patron = `%${buscar.trim()}%`;
        resultado = await db.query(
            `SELECT DISTINCT s.id_sucursal
             FROM sucursal s
             JOIN empresa e ON e.id_empresa = s.id_empresa
             LEFT JOIN descuentos_sucursal d ON d.id_sucursal = s.id_sucursal AND ${PROMO_VIGENTE}
             WHERE e.nombre ILIKE $1 OR e.rubro ILIKE $1 OR e.descripcion ILIKE $1
                OR s.direccion ILIKE $1 OR d.titulo ILIKE $1 OR d.descripcion ILIKE $1`,
            [patron]
        );
    } else {
        resultado = await db.query("SELECT id_sucursal FROM sucursal ORDER BY id_sucursal");
    }

    const tarjetas = await tarjetasDeQuienPide(sesion);
    return armarNegocios(resultado.rows.map((f) => f.id_sucursal), tarjetas);
};

// GET /negocios/:id
export const obtenerNegocio = async (idSucursal, sesion) => {
    const tarjetas = await tarjetasDeQuienPide(sesion);
    const [negocio] = await armarNegocios([idSucursal], tarjetas);

    if (!negocio) throw crearError(404, "Negocio no encontrado");
    return negocio;
};

// GET /inicio -> { hot, sugeridas, elegidos, nuevos }
export const seccionesInicio = async (sesion) => {
    const tarjetas = await tarjetasDeQuienPide(sesion);
    const LIMITE = 10;

    // HOT: los que tienen promos más guardadas en favoritos
    const hot = await db.query(
        `SELECT d.id_sucursal, COUNT(f.id_usuario) AS favoritos, COUNT(DISTINCT d.id_descuento) AS promos
         FROM descuentos_sucursal d
         LEFT JOIN favea_sucursal f ON f.id_descuento = d.id_descuento
         WHERE ${PROMO_VIGENTE}
         GROUP BY d.id_sucursal
         ORDER BY favoritos DESC, promos DESC
         LIMIT $1`,
        [LIMITE]
    );

    // ELEGIDOS: los que tienen más seguidores
    const elegidos = await db.query(
        `SELECT s.id_sucursal, COUNT(sg.id_usuario) AS seguidores
         FROM sucursal s
         LEFT JOIN seguimiento sg ON sg.id_sucursal = s.id_sucursal
         GROUP BY s.id_sucursal
         HAVING COUNT(sg.id_usuario) > 0
         ORDER BY seguidores DESC
         LIMIT $1`,
        [LIMITE]
    );

    // NUEVOS: los últimos negocios que se sumaron
    const nuevos = await db.query(
        "SELECT id_sucursal FROM sucursal ORDER BY creado_en DESC LIMIT $1",
        [LIMITE]
    );

    // SUGERIDAS: si el usuario cargó su barrio, primero los de su barrio; después el resto con promos
    let barrio = "";
    if (sesion?.rol === "usuario") {
        const r = await db.query("SELECT barrio FROM usuario WHERE id_usuario = $1", [sesion.id]);
        barrio = r.rows[0]?.barrio ?? "";
    }
    const sugeridas = await db.query(
        `SELECT s.id_sucursal
         FROM sucursal s
         WHERE EXISTS (SELECT 1 FROM descuentos_sucursal d WHERE d.id_sucursal = s.id_sucursal AND ${PROMO_VIGENTE})
         ORDER BY ($1 <> '' AND s.direccion ILIKE '%' || $1 || '%') DESC, random()
         LIMIT $2`,
        [barrio, LIMITE]
    );

    const ids = (resultado) => resultado.rows.map((f) => f.id_sucursal);

    return {
        hot: await armarNegocios(ids(hot), tarjetas),
        sugeridas: await armarNegocios(ids(sugeridas), tarjetas),
        elegidos: await armarNegocios(ids(elegidos), tarjetas),
        nuevos: await armarNegocios(ids(nuevos), tarjetas)
    };
};
