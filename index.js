import express from "express";
import router from "./routes/routes.js";




var app = express();
app.use(express.json());
app.use("/", router);

app.get('/hello', function(req, res){
   res.send("holis porfavor que me salga");
});
app.post('/hello', function(req, res){
   res.send("You just called the post method at '/hello'!\n");
});


app.listen(3000);
