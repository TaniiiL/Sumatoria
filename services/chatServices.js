import { db } from "../db.js";
import { PROMO_VIGENTE, mediosPagoDePromos, sirveConTarjetas } from "./negocioServices.js";
import { tarjetasDeUsuario } from "./tarjetaServices.js";

const SALUDO =
    "¡Hola! 👋 Soy tu asistente de Sumatoria. Preguntame por promociones, locales cerca tuyo o beneficios bancarios.";

const NOMBRES_MARCA = { visa: "Visa", mastercard: "Mastercard", amex: "American Express", cabal: "Cabal" };
const NOMBRES_SIMPLES = { efectivo: "Efectivo", transferencia: "Transferencia", mercadopago: "Mercado Pago" };

function textoMedio(medio) {
    if (medio.tipo !== "debito" && medio.tipo !== "credito") return NOMBRES_SIMPLES[medio.tipo];
    const tipo = medio.tipo === "debito" ? "Débito" : "Crédito";
    const marca = medio.marca ? ` ${NOMBRES_MARCA[medio.marca]}` : "";
    const banco = medio.banco ? ` · ${medio.banco}` : "";
    return `${tipo}${marca}${banco}`;
}

function aMensaje(fila) {
    return {
        id: String(fila.id_mensaje),
        autor: fila.emisor,
        texto: fila.contenido,
        fecha: fila.fecha.toISOString()
    };
}

// GET /chat: el historial. Si está vacío, arranca con el saludo.
export const historial = async (idUsuario) => {
    const resultado = await db.query(
        "SELECT * FROM mensaje WHERE id_usuario = $1 ORDER BY fecha, id_mensaje",
        [idUsuario]
    );
    if (resultado.rows.length === 0) {
        return [{ id: "saludo", autor: "asistente", texto: SALUDO, fecha: new Date().toISOString() }];
    }
    return resultado.rows.map(aMensaje);
};

// Todas las promos vigentes, con su negocio y medios de pago, filtradas por las tarjetas del usuario
async function promosParaUsuario(tarjetas) {
    const resultado = await db.query(
        `SELECT d.id_descuento, d.titulo, d.descripcion, d.dias, d.vence, d.id_sucursal,
                e.nombre, e.rubro, s.direccion,
                (SELECT COUNT(*) FROM favea_sucursal f WHERE f.id_descuento = d.id_descuento)::int AS favoritos
         FROM descuentos_sucursal d
         JOIN sucursal s ON s.id_sucursal = d.id_sucursal
         JOIN empresa e ON e.id_empresa = s.id_empresa
         WHERE ${PROMO_VIGENTE}
         ORDER BY favoritos DESC, d.fecha DESC
         LIMIT 80`
    );
    const medios = await mediosPagoDePromos(resultado.rows.map((p) => p.id_descuento));

    return resultado.rows
        .map((p) => ({ ...p, mediosPago: medios[p.id_descuento] ?? [] }))
        .filter((p) => sirveConTarjetas(p, tarjetas));
}

function describirPromo(p) {
    const dias = p.dias.length === 7 || p.dias.length === 0 ? "todos los días" : p.dias.join(", ");
    const medios = p.mediosPago.length ? p.mediosPago.map(textoMedio).join(", ") : "cualquier medio";
    const vence = p.vence ? ` (vence ${p.vence})` : "";
    return `• ${p.titulo} en ${p.nombre} (${p.rubro}, ${p.direccion}) — ${dias} — ${medios}${vence}`;
}

// ---------------------------------------------------------------------
// Respuesta con IA (si hay una ANTHROPIC_API_KEY en el .env)
// ---------------------------------------------------------------------
async function responderConIA(pregunta, promos, tarjetas, anteriores) {
    const listaPromos = promos.length ? promos.map(describirPromo).join("\n") : "(no hay promos cargadas)";
    const listaTarjetas = tarjetas.length
        ? tarjetas.map((t) => textoMedio({ tipo: t.tipo, marca: t.marca, banco: t.banco })).join(", ")
        : "no cargó tarjetas";

    const system =
        "Sos el asistente de Sumatoria, una app argentina que muestra descuentos y promociones " +
        "de locales según las tarjetas del usuario. Respondé en español rioplatense, breve y amable. " +
        "Usá SOLO las promociones de la lista; si ninguna sirve, decilo y sugerí buscar otra cosa. " +
        "No inventes locales ni descuentos.\n\n" +
        `Tarjetas del usuario: ${listaTarjetas}\n\n` +
        `Promociones disponibles para este usuario:\n${listaPromos}`;

    // Últimos mensajes, para que la IA tenga el contexto de la charla
    const messages = anteriores
        .map((m) => ({ role: m.emisor === "usuario" ? "user" : "assistant", content: m.contenido }))
        .concat({ role: "user", content: pregunta });

    // La API exige que el primer mensaje sea del usuario
    while (messages.length && messages[0].role !== "user") messages.shift();

    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        },
        body: JSON.stringify({
            model: process.env.IA_MODELO || "claude-haiku-5-5",
            max_tokens: 600,
            system,
            messages
        }),
        signal: AbortSignal.timeout(30000)
    });

    if (!respuesta.ok) {
        throw new Error(`La IA respondió con estado ${respuesta.status}: ${await respuesta.text()}`);
    }
    const datos = await respuesta.json();
    return datos.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

// ---------------------------------------------------------------------
// Respuesta sin IA: busca palabras de la pregunta en la base
// ---------------------------------------------------------------------
const SINONIMOS = {
    zapatillas: "Indumentaria", ropa: "Indumentaria", remera: "Indumentaria", zapatos: "Indumentaria",
    comer: "Gastronomía", comida: "Gastronomía", cafe: "Gastronomía", café: "Gastronomía",
    restaurante: "Gastronomía", almorzar: "Gastronomía", cenar: "Gastronomía",
    remedios: "Farmacia", farmacia: "Farmacia", super: "Supermercado", supermercado: "Supermercado",
    heladera: "Electrodomésticos", tele: "Electrodomésticos", libros: "Librería", cuadernos: "Librería"
};

function quitarTildes(texto) {
    return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function responderSinIA(pregunta, promos) {
    const texto = quitarTildes(pregunta);
    let elegidas;

    if (texto.includes("hot") || texto.includes("mejores") || texto.includes("populares")) {
        elegidas = promos.slice(0, 5); // ya vienen ordenadas por favoritos
    } else {
        const palabras = texto.split(/[^a-zñ0-9]+/).filter((p) => p.length > 3);
        const rubros = palabras.map((p) => SINONIMOS[p]).filter(Boolean).map(quitarTildes);

        elegidas = promos.filter((p) => {
            const campos = quitarTildes(`${p.titulo} ${p.descripcion} ${p.nombre} ${p.rubro} ${p.direccion}`);
            return (
                rubros.includes(quitarTildes(p.rubro)) ||
                palabras.some((palabra) => campos.includes(palabra) || (palabra.endsWith("s") && campos.includes(palabra.slice(0, -1))))
            );
        });

        if (texto.includes("banco") || texto.includes("tarjeta")) {
            elegidas = promos.filter((p) => p.mediosPago.some((m) => m.tipo === "debito" || m.tipo === "credito"));
        }
    }

    if (elegidas.length === 0) {
        return "No encontré promos para eso con tus tarjetas. Probá preguntarme por un rubro (comida, ropa, farmacia) o por el nombre de un local.";
    }
    return `Esto es lo que encontré:\n${elegidas.slice(0, 5).map(describirPromo).join("\n")}`;
}

// POST /chat { texto }
export const enviarMensaje = async (idUsuario, texto) => {
    // Últimos 10 mensajes (antes de guardar el nuevo), para el contexto de la IA
    const anteriores = await db.query(
        `SELECT emisor, contenido FROM (
             SELECT emisor, contenido, fecha, id_mensaje FROM mensaje
             WHERE id_usuario = $1 ORDER BY fecha DESC, id_mensaje DESC LIMIT 10
         ) ultimos ORDER BY fecha, id_mensaje`,
        [idUsuario]
    );

    const pregunta = await db.query(
        `INSERT INTO mensaje (id_usuario, emisor, contenido) VALUES ($1, 'usuario', $2) RETURNING *`,
        [idUsuario, texto]
    );

    const tarjetas = await tarjetasDeUsuario(idUsuario);
    const promos = await promosParaUsuario(tarjetas);

    let contenido;
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            contenido = await responderConIA(texto, promos, tarjetas, anteriores.rows);
        } catch (error) {
            console.error("Falló la IA, respondo sin IA:", error.message);
            contenido = responderSinIA(texto, promos);
        }
    } else {
        contenido = responderSinIA(texto, promos);
    }

    const respuesta = await db.query(
        `INSERT INTO mensaje (id_usuario, emisor, contenido) VALUES ($1, 'asistente', $2) RETURNING *`,
        [idUsuario, contenido]
    );

    return { pregunta: aMensaje(pregunta.rows[0]), respuesta: aMensaje(respuesta.rows[0]) };
};
