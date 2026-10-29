import express from "express";
import cors from "cors";
import router from "./routes/routes.js";

const app = express();

// Permite que el front (que corre en otro puerto, ej: 5173) le pida cosas al back
app.use(cors());

// Las imágenes (logo, portada, foto) llegan como texto base64, por eso el límite es más grande
app.use(express.json({ limit: "10mb" }));

// Si el pedido no trae body, se usa un objeto vacío (así no falla al leer req.body.algo)
app.use((req, res, next) => {
    req.body ??= {};
    next();
});

app.use("/", router);

// Cualquier ruta que no exista
app.use((req, res) => {
    res.status(404).json({ mensaje: `No existe la ruta ${req.method} ${req.path}` });
});

// Errores que no se atajaron en los controllers (ej: un JSON mal escrito en el body)
app.use((error, req, res, next) => {
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ mensaje: "El body no es un JSON válido" });
    }
    if (error.type === "entity.too.large") {
        return res.status(413).json({ mensaje: "El pedido es demasiado grande (¿una imagen muy pesada?)" });
    }
    console.error(error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
