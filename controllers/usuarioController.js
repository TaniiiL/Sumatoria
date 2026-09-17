
import {registrarUsuario} from "../services/usuarioServices.js";
export function  registrarUsuario(req, res) {
    console.log(req.body);

    res.send("Llego la peticion de registrar usuario")
}

export async function registrarUsuario (req, res){
    const {nombre, email, password } = req.body;

    if (!nombre || !email ||  !password){
        return res.status(400).json({mensaje: "Falta completar campos"});
    }
    try {
        const = nuevoUsuario = await  registrarUsuario ({nombre, email, password});

        return res.status(201).json({
            mensaje: "Usuario registrado con exito"
            usuario: nuevoUsuario
        });
    } catch (error) {
        return res.status(500).json({mensaje: error.message});
    }    
}
