// Convierte una dirección de texto ("Av. Cabildo 2140") en coordenadas
// (latitud y longitud) para que el front pueda mostrar el local en el mapa.
// Usa Nominatim, el buscador gratuito de OpenStreetMap (el mismo mapa que usa el front).

const CENTRO_CABA = { lat: -34.6037, lng: -58.3816 };

// Zona de Buenos Aires: se prefieren resultados dentro de este recuadro
const VIEWBOX = "-58.75,-34.45,-58.20,-34.85";

export async function geocodificar(direccion) {
    const parametros = new URLSearchParams({
        q: `${direccion}, Argentina`,
        format: "json",
        limit: "1",
        countrycodes: "ar",
        viewbox: VIEWBOX
    });

    try {
        const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?${parametros}`, {
            headers: { "User-Agent": "Sumatoria/1.0 (proyecto escolar)" },
            signal: AbortSignal.timeout(8000)
        });
        const resultados = await respuesta.json();

        if (Array.isArray(resultados) && resultados.length > 0) {
            return {
                lat: Number(resultados[0].lat),
                lng: Number(resultados[0].lon),
                encontrada: true
            };
        }
    } catch (error) {
        console.warn("No se pudo geocodificar la dirección:", error.message);
    }

    // Si no se encuentra, se usa el centro de CABA (igual que hace el front)
    return { ...CENTRO_CABA, encontrada: false };
}
