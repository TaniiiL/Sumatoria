-- =====================================================================
-- SUMATORIA - Migración de la base para que coincida con el front
-- Correr TODO junto en el SQL Editor de Neon (una sola vez).
-- Está dentro de BEGIN/COMMIT: si algo falla, no se cambia nada.
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- 1. USUARIO: se mantiene, se agregan los datos que usa el perfil del front
-- ---------------------------------------------------------------------
ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS barrio    text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS foto      text,
    ADD COLUMN IF NOT EXISTS google_id text;

-- ---------------------------------------------------------------------
-- 2. EMPRESA: se mantiene, se agregan los datos del "negocio" del front
-- ---------------------------------------------------------------------
ALTER TABLE empresa
    ADD COLUMN IF NOT EXISTS rubro       text   NOT NULL DEFAULT 'Otro',
    ADD COLUMN IF NOT EXISTS descripcion text   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS portada     text,
    ADD COLUMN IF NOT EXISTS medios_pago text[] NOT NULL DEFAULT '{}';

-- ---------------------------------------------------------------------
-- 3. Se borran las tablas que cambian de forma (estaban vacías o con
--    datos de prueba) y se vuelven a crear con la estructura nueva.
--    Las de productos (productos, venden, descuentos_producto,
--    tiene_descuento, favea) NO se tocan: el front no las usa.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS mensaje, mensajes CASCADE;
DROP TABLE IF EXISTS notificacion, notificaciones CASCADE;
DROP TABLE IF EXISTS seguimiento, seguimientos CASCADE;
DROP TABLE IF EXISTS favea_sucursal CASCADE;
DROP TABLE IF EXISTS aplican CASCADE;
DROP TABLE IF EXISTS descuentos_sucursal, descuentos_sucursales CASCADE;
DROP TABLE IF EXISTS sucursal, sucursales CASCADE;
DROP TABLE IF EXISTS pertenecen CASCADE;
DROP TABLE IF EXISTS tarjetas CASCADE;

-- TARJETAS: catálogo fijo. marca + banco + débito/crédito (como en el front)
CREATE TABLE tarjetas (
    id_tarjeta serial PRIMARY KEY,
    red_pago   text NOT NULL CHECK (red_pago IN ('visa', 'mastercard', 'amex', 'cabal')),
    emisor     text NOT NULL,
    tipo       text NOT NULL CHECK (tipo IN ('debito', 'credito')),
    UNIQUE (red_pago, emisor, tipo)
);

-- PERTENECEN: qué tarjetas tiene cada usuario
CREATE TABLE pertenecen (
    id_usuario int NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_tarjeta int NOT NULL REFERENCES tarjetas(id_tarjeta) ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_tarjeta)
);

-- SUCURSAL: el "negocio" que ve el usuario (dirección, mapa y horarios)
CREATE TABLE sucursal (
    id_sucursal serial PRIMARY KEY,
    id_empresa  int NOT NULL REFERENCES empresa(id_empresa) ON DELETE CASCADE,
    direccion   text NOT NULL,
    lat         double precision NOT NULL,
    lng         double precision NOT NULL,
    horarios    jsonb NOT NULL DEFAULT '[]',
    creado_en   timestamptz NOT NULL DEFAULT now()
);

-- DESCUENTOS_SUCURSAL: las promociones
CREATE TABLE descuentos_sucursal (
    id_descuento serial PRIMARY KEY,
    id_sucursal  int NOT NULL REFERENCES sucursal(id_sucursal) ON DELETE CASCADE,
    titulo       text NOT NULL,
    descripcion  text NOT NULL DEFAULT '',
    imagen       text,
    dias         text[] NOT NULL DEFAULT '{}',
    vence        date,
    estado       text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'pausada')),
    fecha        timestamptz NOT NULL DEFAULT now()
);

-- APLICAN: con qué medios de pago aplica cada promo.
-- tipo = efectivo / transferencia / mercadopago / debito / credito.
-- Para tarjetas, red_pago y emisor pueden quedar vacíos (NULL) =
-- "cualquier tarjeta de débito", "cualquier Visa", etc.
CREATE TABLE aplican (
    id_aplican   serial PRIMARY KEY,
    id_descuento int NOT NULL REFERENCES descuentos_sucursal(id_descuento) ON DELETE CASCADE,
    tipo         text NOT NULL CHECK (tipo IN ('efectivo', 'transferencia', 'mercadopago', 'debito', 'credito')),
    red_pago     text,
    emisor       text
);

-- FAVEA_SUCURSAL: promos favoritas de cada usuario
CREATE TABLE favea_sucursal (
    id_usuario   int NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_descuento int NOT NULL REFERENCES descuentos_sucursal(id_descuento) ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_descuento)
);

-- SEGUIMIENTO: qué negocios sigue cada usuario
CREATE TABLE seguimiento (
    id_seguimiento serial PRIMARY KEY,
    id_usuario     int NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_sucursal    int NOT NULL REFERENCES sucursal(id_sucursal) ON DELETE CASCADE,
    UNIQUE (id_usuario, id_sucursal)
);

-- NOTIFICACION: avisos de promo nueva y de promo por vencer
CREATE TABLE notificacion (
    id_notificacion serial PRIMARY KEY,
    id_usuario      int NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_sucursal     int NOT NULL REFERENCES sucursal(id_sucursal) ON DELETE CASCADE,
    id_descuento    int REFERENCES descuentos_sucursal(id_descuento) ON DELETE CASCADE,
    tipo            text NOT NULL CHECK (tipo IN ('promo', 'vencimiento')),
    titulo          text NOT NULL,
    mensaje         text NOT NULL,
    fecha           timestamptz NOT NULL DEFAULT now(),
    leida           boolean NOT NULL DEFAULT false,
    UNIQUE (id_usuario, id_descuento, tipo)
);

-- MENSAJE: el chat con la IA (un solo chat largo por usuario)
CREATE TABLE mensaje (
    id_mensaje serial PRIMARY KEY,
    id_usuario int NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    emisor     text NOT NULL CHECK (emisor IN ('usuario', 'asistente')),
    contenido  text NOT NULL,
    fecha      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 4. Catálogo de tarjetas: mismas marcas y bancos que tiene el front
-- ---------------------------------------------------------------------
INSERT INTO tarjetas (red_pago, emisor, tipo)
SELECT marca, banco, tipo
FROM unnest(ARRAY['visa', 'mastercard', 'amex', 'cabal']) AS marca
CROSS JOIN unnest(ARRAY[
    'Banco Andes', 'Banco Nación', 'Banco Provincia', 'Banco Galicia',
    'Banco Santander', 'BBVA', 'Banco Macro', 'Banco Ciudad',
    'ICBC', 'Brubank', 'Mercado Pago', 'Ualá'
]) AS banco
CROSS JOIN unnest(ARRAY['debito', 'credito']) AS tipo;

COMMIT;
