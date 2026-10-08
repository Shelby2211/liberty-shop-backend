import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "./models/Product.js";
import products from "../src/data/products.js";

dotenv.config();

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Atlas connecté.");

    // Supprime les anciens produits
    await Product.deleteMany({});

    console.log("Anciens produits supprimés.");

    // Prépare les produits pour MongoDB
    const productsToInsert = products.map((product) => ({
      name: product.name,
      brand: product.brand,
      category: product.category,
      system: product.system,
      type: product.type || "",
      price: product.price,
      image: product.image,
      description: "",
      stock: 10,
      badge: product.badge || "",
      available: true,
    }));

    // Insère les 32 produits
    const insertedProducts = await Product.insertMany(productsToInsert);

    console.log(`${insertedProducts.length} produits importés avec succès !`);

    await mongoose.connection.close();

    console.log("Connexion MongoDB fermée.");
  } catch (error) {
    console.error("Erreur lors de l'importation :", error.message);

    process.exit(1);
  }
};

seedProducts();
