# API de Sumatoria — guía para el front

Todas las rutas devuelven JSON. Los errores siempre vienen como `{ "mensaje": "..." }` con un código HTTP (400 dato inválido, 401 sin sesión, 403 rol equivocado, 404 no existe, 409 ya existe).

## Configuración en el front

1. En el `.env` del front agregar:
   ```
   VITE_API_URL=http://localhost:3000
   ```
   `negociosService.ts` y `notificacionesService.ts` ya leen esa variable: con eso dejan de usar los datos de prueba.

2. **Token.** Al registrarse o iniciar sesión, el back devuelve un `token`. Hay que guardarlo (por ejemplo en `localStorage`) y mandarlo en **todos** los pedidos así:
   ```ts
   fetch(`${API_URL}/usuario/perfil`, {
     headers: {
       "Content-Type": "application/json",
       Authorization: `Bearer ${token}`,
     },
   });
   ```
   Conviene mandarlo también en `/inicio` y `/negocios`: si viene el token de un usuario, el back ya filtra las promos por sus tarjetas (el front no necesita filtrar más).

3. Los ids siempre son **texto** (`"12"`), igual que en los tipos del front.

---

## Cuentas

| Pantalla | Método y ruta | Body | Respuesta |
|---|---|---|---|
| Registrarse (persona) | `POST /registro/usuario` | `{ nombre, email, password }` | `201 { token, usuario }` |
| Login (persona) | `POST /login/usuario` | `{ email, password }` | `200 { token, usuario }` |
| Botón de Google | `POST /login/google` | `{ access_token }` (el que da Google) | `200 { token, usuario }` |
| Crear cuenta (negocio) | `POST /registro/empresa` | `{ nombre, email, password, rubro, direccion, horarios, logo? }` | `201 { token, negocio }` |
| Login (negocio) | `POST /login/empresa` | `{ email, password }` | `200 { token, negocio }` |

- `password`: mínimo 6 caracteres.
- **Ojo:** la pantalla "Crear cuenta → Negocio" (`cuentanegocio.tsx`) hoy no pide **email ni contraseña**. Hay que agregar esos dos campos, si no el negocio no puede volver a iniciar sesión.
- La pantalla de login hoy acepta cualquier dato: hay que cambiar `iniciarSesion()` para que llame a `/login/usuario`.
- El back calcula la latitud y longitud a partir de la `direccion` (con OpenStreetMap). Si el front ya las tiene, puede mandar `lat` y `lng` y se usan esas.

`usuario` tiene el formato de `Usuario` del front, más el id:
```json
{ "id_usuario": 4, "nombre": "Vicky", "email": "vicky@mail.com", "emailGoogle": "", "foto": null, "barrio": "" }
```

## Perfil del usuario (requiere token de usuario)

| Acción | Método y ruta | Body | Respuesta |
|---|---|---|---|
| Ver perfil | `GET /usuario/perfil` | — | `Usuario` |
| Editar perfil | `PUT /usuario/perfil` | `{ nombre?, barrio?, foto? }` (solo lo que cambia) | `Usuario` |

## Tarjetas

| Acción | Método y ruta | Body | Respuesta |
|---|---|---|---|
| Catálogo completo | `GET /tarjetas` (pública) | — | `TarjetaVinculada[]` |
| Mis tarjetas | `GET /usuario/tarjetas` | — | `TarjetaVinculada[]` |
| Vincular tarjeta | `POST /usuario/tarjetas` | `{ marca, banco, tipo }` | lista actualizada |
| Quitar tarjeta | `DELETE /usuario/tarjetas/:id` | — | lista actualizada |

Mismo formato que `TarjetaVinculada`: `{ id, marca: "visa", banco: "Banco Galicia", tipo: "debito" }`. Las marcas y bancos válidos son exactamente los de `tarjetasService.ts` (`MARCAS` y `BANCOS`). Si se agrega un banco en el front, hay que agregarlo también en la tabla `tarjetas`.

Reemplazo directo: `obtenerTarjetas()` → `GET /usuario/tarjetas`, `agregarTarjeta()` → `POST`, `quitarTarjeta(id)` → `DELETE`.

## Home, mapa, buscador y detalle (públicas)

| Pantalla | Método y ruta | Respuesta |
|---|---|---|
| Inicio | `GET /inicio` | `{ hot, sugeridas, elegidos, nuevos }`, cada uno `Negocio[]` |
| Mapa | `GET /negocios` | `Negocio[]` (con `lat` y `lng`) |
| Buscador | `GET /negocios?buscar=texto` | `Negocio[]` |
| Detalle | `GET /negocios/:id` | `Negocio` (404 si no existe) |

Son exactamente las rutas que ya pide `negociosService.ts`. `Negocio` y `Promocion` tienen el mismo formato que los tipos del front. Solo se devuelven promos **activas y no vencidas**.

- **hot:** negocios con las promos más guardadas en favoritos.
- **elegidos:** negocios con más seguidores.
- **nuevos:** los últimos negocios que se registraron.
- **sugeridas:** negocios con promos, primero los del barrio del usuario (si cargó uno).

## Favoritos (requiere token de usuario)

| Acción | Método y ruta | Body | Respuesta |
|---|---|---|---|
| Pantalla Favoritos | `GET /usuario/favoritos` | — | `Favorito[]` = `[{ negocio, promocion }]` |
| Saber qué corazones pintar | `GET /usuario/favoritos/ids` | — | `PromoGuardada[]` = `[{ negocioId, promoId }]` |
| Guardar promo | `POST /usuario/favoritos` | `{ promoId }` | `PromoGuardada[]` actualizada |
| Quitar promo | `DELETE /usuario/favoritos/:promoId` | — | `PromoGuardada[]` actualizada |

Reemplazo directo: `obtenerFavoritos()`, `obtenerPromosGuardadas()` y `cambiarPromoGuardada()`.

## Negocios que sigo (requiere token de usuario)

| Acción | Método y ruta | Respuesta |
|---|---|---|
| Pantalla "Negocios que sigo" | `GET /usuario/seguidos` | `Negocio[]` |
| Ids que sigo (botón Seguir) | `GET /usuario/seguidos/ids` | `["1", "4"]` |
| Seguir | `POST /negocios/:id/seguir` | ids actualizados |
| Dejar de seguir | `DELETE /negocios/:id/seguir` | ids actualizados |

Reemplazo directo: `obtenerSeguidos()`, `cambiarSeguimiento()` y `obtenerNegociosSeguidos()`.

## Notificaciones (requiere token de usuario)

| Acción | Método y ruta | Body | Respuesta |
|---|---|---|---|
| Pantalla Notificaciones | `GET /notificaciones` | — | `Notificacion[]` |
| Punto rojo de "sin leer" | `GET /notificaciones/sin-leer` | — | `{ hay: true, cantidad: 3 }` |
| Marcar leídas | `PUT /notificaciones/leidas` | `{ ids?: ["1","2"] }` (sin ids = todas) | `{ mensaje }` |

`Notificacion` tiene el formato del front, más `promoId` y `leida`:
```json
{ "id": "7", "tipo": "promo", "titulo": "Nueva promo", "texto": "Panadería Norte activó 20% OFF.",
  "fecha": "2026-10-28T21:00:00.000Z", "negocioId": "1", "promoId": "3", "leida": false }
```
El back ya devuelve solo las de negocios que sigue el usuario: el filtro por seguidos del front se puede sacar, y `obtenerLeidas()` / `marcarLeidas()` pasan a usar `leida` y `PUT /notificaciones/leidas`.

- **promo:** se crea sola cuando un negocio que sigue publica (o reactiva) una promo.
- **vencimiento:** se crea sola cuando una promo guardada en favoritos, o de un negocio que sigue, vence en los próximos 2 días.

## Chat con la IA (requiere token de usuario)

| Acción | Método y ruta | Body | Respuesta |
|---|---|---|---|
| Abrir el chat | `GET /chat` | — | `Mensaje[]` = `[{ id, autor: "usuario" \| "asistente", texto, fecha }]` |
| Enviar mensaje | `POST /chat` | `{ texto }` | `{ pregunta: Mensaje, respuesta: Mensaje }` |

Mismo formato que `Mensaje` en `IA.tsx`. Si el chat está vacío, `GET /chat` devuelve el saludo inicial. Los botones de sugerencia ("Ofertas hot", "Bancos") pueden mandar ese mismo texto con `POST /chat`.

## Panel del negocio (requiere token de empresa)

| Pantalla | Método y ruta | Body | Respuesta |
|---|---|---|---|
| Mi negocio | `GET /empresa/negocio` | — | `MiNegocio` |
| Editar negocio | `PUT /empresa/negocio` | `{ nombre?, descripcion?, rubro?, direccion?, horarios?, logo?, portada?, mediosPago? }` | `MiNegocio` |
| Mis promociones | `GET /empresa/promos` | — | `PromoNegocio[]` (activas, pausadas y vencidas) |
| Crear promo | `POST /empresa/promos` | `{ titulo, descripcion?, imagen?, dias, mediosPago, vence?, estado? }` | `PromoNegocio` |
| Editar / pausar promo | `PUT /empresa/promos/:id` | solo lo que cambia, ej: `{ estado: "pausada" }` | `PromoNegocio` |
| Borrar promo | `DELETE /empresa/promos/:id` | — | `{ mensaje }` |

`MiNegocio` y `PromoNegocio` tienen el mismo formato que en `miNegocioService.ts`. Reemplazo directo: `obtenerMiNegocio()`, `guardarMiNegocio()`, `obtenerMisPromos()` y `guardarMisPromos()`.

Formatos válidos:
- `rubro`: `Gastronomía`, `Indumentaria`, `Supermercado`, `Electrodomésticos`, `Farmacia`, `Librería`, `Otro`.
- `horarios`: `[{ "dia": "Lunes", "abierto": true, "desde": "09:00", "hasta": "18:00" }, ...]`.
- `dias`: `["Lunes", "Miércoles"]`.
- `vence`: `"2026-11-30"` o `null`.
- `mediosPago` de una promo: `[{ "tipo": "efectivo" }, { "tipo": "debito", "marca": "visa", "banco": null }]`. Con `marca` o `banco` en `null` significa "cualquiera".
- Imágenes (`logo`, `portada`, `foto`, `imagen`): el texto base64 que ya genera `leerImagen()`. Máximo 10 MB por pedido.
