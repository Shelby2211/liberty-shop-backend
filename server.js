import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Bienvenue sur l'API LibertyShop !",
    status: "success",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    message: "Le serveur LibertyShop fonctionne correctement.",
    status: "OK",
  });
});

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("La variable MONGO_URI est absente du fichier .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Atlas connecté avec succès !");

    app.listen(PORT, () => {
      console.log(`Serveur LibertyShop démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error("Erreur de connexion :", error.message);
    process.exit(1);
  }
}

startServer();
