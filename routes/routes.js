import { Router } from "express";
import { registrarUsuario, loginUsuario, perfilUsuario } from "../controllers/usuarioController.js";
import { registrarEmpresa, loginEmpresa, perfilEmpresa } from "../controllers/empresaController.js";
import { verificarToken, soloRol } from "../middlewares/auth.js";

const router = Router();

// ===== Usuario =====
// Públicas
router.post("/registro/usuario", registrarUsuario);
router.post("/login/usuario", loginUsuario);
// Protegidas
router.get("/usuario/perfil", verificarToken, soloRol("usuario"), perfilUsuario);

// ===== Empresa =====
// Públicas
router.post("/registro/empresa", registrarEmpresa);
router.post("/login/empresa", loginEmpresa);
// Protegidas
router.get("/empresa/perfil", verificarToken, soloRol("empresa"), perfilEmpresa);

export default router;