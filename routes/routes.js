import { Router } from "express";
import { registrarUsuario, loginUsuario, perfilUsuario } from "../controllers/usuarioController.js";
import { verificarToken, soloRol } from "../middlewares/auth.js";

const router = Router();

// Usuario: rutas públicas (no necesitan token)
router.post("/registro/usuario", registrarUsuario);
router.post("/login/usuario", loginUsuario);

// Usuario: rutas protegidas (necesitan token de usuario)
router.get("/usuario/perfil", verificarToken, soloRol("usuario"), perfilUsuario);

export default router;