import { Router } from "express";
import { registrarUsuario, loginUsuario } from "../controllers/usuarioController.js";

const router = Router();

// Usuario
router.post("/registro/usuario", registrarUsuario);
router.post("/login/usuario", loginUsuario);

export default router;