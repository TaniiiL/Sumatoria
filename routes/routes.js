import { Router } from "express";
import * as usuario from "../controllers/usuarioController.js";
import * as empresa from "../controllers/empresaController.js";
import * as tarjeta from "../controllers/tarjetaController.js";
import * as negocio from "../controllers/negocioController.js";
import * as promo from "../controllers/promoController.js";
import * as extras from "../controllers/usuarioExtrasController.js";
import { verificarToken, tokenOpcional, soloRol } from "../middlewares/auth.js";

const router = Router();

// Atajos: rutas que necesitan sesión de usuario o de empresa
const soloUsuario = [verificarToken, soloRol("usuario")];
const soloEmpresa = [verificarToken, soloRol("empresa")];

// Para chequear rápido que el servidor anda
router.get("/", (req, res) => res.json({ mensaje: "API de Sumatoria funcionando" }));

// ===== Cuentas =====
router.post("/registro/usuario", usuario.registrarUsuario);
router.post("/login/usuario", usuario.loginUsuario);
router.post("/login/google", usuario.loginGoogle);
router.post("/registro/empresa", empresa.registrarEmpresa);
router.post("/login/empresa", empresa.loginEmpresa);

// ===== Usuario: perfil y tarjetas =====
router.get("/usuario/perfil", soloUsuario, usuario.perfilUsuario);
router.put("/usuario/perfil", soloUsuario, usuario.editarPerfilUsuario);
router.get("/usuario/tarjetas", soloUsuario, tarjeta.misTarjetas);
router.post("/usuario/tarjetas", soloUsuario, tarjeta.agregarMiTarjeta);
router.delete("/usuario/tarjetas/:id", soloUsuario, tarjeta.quitarMiTarjeta);

// ===== Usuario: favoritos =====
router.get("/usuario/favoritos", soloUsuario, extras.listarFavoritos);
router.get("/usuario/favoritos/ids", soloUsuario, extras.idsFavoritos);
router.post("/usuario/favoritos", soloUsuario, extras.agregarFavorito);
router.delete("/usuario/favoritos/:promoId", soloUsuario, extras.quitarFavorito);

// ===== Usuario: negocios que sigue =====
router.get("/usuario/seguidos", soloUsuario, extras.listarSeguidos);
router.get("/usuario/seguidos/ids", soloUsuario, extras.idsSeguidos);
router.post("/negocios/:id/seguir", soloUsuario, extras.seguirNegocio);
router.delete("/negocios/:id/seguir", soloUsuario, extras.dejarDeSeguirNegocio);

// ===== Usuario: notificaciones =====
router.get("/notificaciones", soloUsuario, extras.listarNotificaciones);
router.get("/notificaciones/sin-leer", soloUsuario, extras.notificacionesSinLeer);
router.put("/notificaciones/leidas", soloUsuario, extras.marcarNotificacionesLeidas);

// ===== Usuario: chat con la IA =====
router.get("/chat", soloUsuario, extras.historialChat);
router.post("/chat", soloUsuario, extras.enviarMensajeChat);

// ===== Públicas: home, mapa, buscador y detalle =====
// tokenOpcional: si viene el token de un usuario, las promos se filtran por sus tarjetas
router.get("/tarjetas", tarjeta.listarTarjetas);
router.get("/inicio", tokenOpcional, negocio.inicio);
router.get("/negocios", tokenOpcional, negocio.listarNegocios);
router.get("/negocios/:id", tokenOpcional, negocio.obtenerNegocio);

// ===== Empresa: su negocio y sus promos =====
router.get("/empresa/negocio", soloEmpresa, empresa.miNegocio);
router.put("/empresa/negocio", soloEmpresa, empresa.editarMiNegocio);
router.get("/empresa/promos", soloEmpresa, promo.listarMisPromos);
router.post("/empresa/promos", soloEmpresa, promo.crearPromo);
router.put("/empresa/promos/:id", soloEmpresa, promo.editarPromo);
router.delete("/empresa/promos/:id", soloEmpresa, promo.borrarPromo);

export default router;
