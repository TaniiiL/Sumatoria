import { db } from "../db.js";

// Cuando un negocio publica (o reactiva) una promo, se avisa a todos sus seguidores.
// ON CONFLICT DO NOTHING: si ya se avisó de esa promo, no se repite.
export const notificarPromoNueva = async (idSucursal, idDescuento, tituloPromo) => {
    await db.query(
        `INSERT INTO notificacion (id_usuario, id_sucursal, id_descuento, tipo, titulo, mensaje)
         SELECT sg.id_usuario, sg.id_sucursal, $2, 'promo', 'Nueva promo',
                e.nombre || ' activó ' || $3 || '.'
         FROM seguimiento sg
         JOIN sucursal s ON s.id_sucursal = sg.id_sucursal
         JOIN empresa e ON e.id_empresa = s.id_empresa
         JOIN descuentos_sucursal d ON d.id_descuento = $2
         WHERE sg.id_sucursal = $1
           AND d.estado = 'activa'
           AND (d.vence IS NULL OR d.vence >= CURRENT_DATE)  -- no avisar de promos ya vencidas
         ON CONFLICT DO NOTHING`,
        [idSucursal, idDescuento, tituloPromo]
    );
};

// Avisos de "tu promo está por vencer": promos guardadas en favoritos
// o de negocios que sigue, que vencen en los próximos 2 días.
// Se generan al momento de pedir las notificaciones.
async function generarAvisosDeVencimiento(idUsuario) {
    await db.query(
        `INSERT INTO notificacion (id_usuario, id_sucursal, id_descuento, tipo, titulo, mensaje)
         SELECT DISTINCT $1::int, d.id_sucursal, d.id_descuento, 'vencimiento', 'Tu promo está por vencer',
                'El ' || d.titulo || ' en ' || e.nombre || ' vence ' ||
                CASE WHEN d.vence = CURRENT_DATE THEN 'hoy.'
                     WHEN d.vence = CURRENT_DATE + 1 THEN 'mañana.'
                     ELSE 'el ' || to_char(d.vence, 'DD/MM') || '.' END
         FROM descuentos_sucursal d
         JOIN sucursal s ON s.id_sucursal = d.id_sucursal
         JOIN empresa e ON e.id_empresa = s.id_empresa
         WHERE d.estado = 'activa'
           AND d.vence BETWEEN CURRENT_DATE AND CURRENT_DATE + 2
           AND (
                EXISTS (SELECT 1 FROM favea_sucursal f WHERE f.id_descuento = d.id_descuento AND f.id_usuario = $1)
             OR EXISTS (SELECT 1 FROM seguimiento sg WHERE sg.id_sucursal = d.id_sucursal AND sg.id_usuario = $1)
           )
         ON CONFLICT DO NOTHING`,
        [idUsuario]
    );
}

// GET /notificaciones
export const listarNotificaciones = async (idUsuario) => {
    await generarAvisosDeVencimiento(idUsuario);

    const resultado = await db.query(
        `SELECT id_notificacion, tipo, titulo, mensaje, fecha, id_sucursal, id_descuento, leida
         FROM notificacion
         WHERE id_usuario = $1
         ORDER BY fecha DESC
         LIMIT 100`,
        [idUsuario]
    );

    return resultado.rows.map((n) => ({
        id: String(n.id_notificacion),
        tipo: n.tipo,
        titulo: n.titulo,
        texto: n.mensaje,
        fecha: n.fecha.toISOString(),
        negocioId: String(n.id_sucursal),
        promoId: n.id_descuento ? String(n.id_descuento) : undefined,
        leida: n.leida
    }));
};

// PUT /notificaciones/leidas { ids: ["1", "2"] }  (sin ids = marcar todas)
export const marcarLeidas = async (idUsuario, ids) => {
    if (Array.isArray(ids)) {
        await db.query(
            `UPDATE notificacion SET leida = true
             WHERE id_usuario = $1 AND id_notificacion = ANY($2::int[])`,
            [idUsuario, ids.map(Number).filter(Number.isInteger)]
        );
    } else {
        await db.query("UPDATE notificacion SET leida = true WHERE id_usuario = $1", [idUsuario]);
    }
};

// GET /notificaciones/sin-leer -> { hay: true/false, cantidad }
export const contarSinLeer = async (idUsuario) => {
    await generarAvisosDeVencimiento(idUsuario);
    const resultado = await db.query(
        "SELECT COUNT(*)::int AS cantidad FROM notificacion WHERE id_usuario = $1 AND NOT leida",
        [idUsuario]
    );
    const cantidad = resultado.rows[0].cantidad;
    return { hay: cantidad > 0, cantidad };
};
