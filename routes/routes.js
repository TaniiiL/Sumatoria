import Router from "express";
import { registrarUsuario } from "../controllers/usuarioController.js";


 


const router = Router();


router.post("/registro/nousuario", registrarUsuario );



export default router;