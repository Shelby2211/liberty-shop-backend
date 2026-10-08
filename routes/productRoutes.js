import express from "express";
import Product from "../models/Product.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// GET - Tous les produits
// PUBLIC
// ==========================================

router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des produits",
      error: error.message,
    });
  }
});

// ==========================================
// GET - Un produit
// PUBLIC
// ==========================================

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Produit introuvable",
      });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération du produit",
      error: error.message,
    });
  }
});

// ==========================================
// POST - Ajouter un produit
// ADMIN
// ==========================================

router.post("/", authMiddleware, async (req, res) => {
  try {
    const product = new Product(req.body);

    const savedProduct = await product.save();

    res.status(201).json({
      message: "Produit ajouté avec succès",
      product: savedProduct,
    });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de l'ajout du produit",
      error: error.message,
    });
  }
});

// ==========================================
// PATCH - Modifier le stock
// ADMIN
// ==========================================

router.patch("/:id/stock", authMiddleware, async (req, res) => {
  try {
    const { stock } = req.body;

    if (stock === undefined || stock === null) {
      return res.status(400).json({
        message: "La quantité de stock est requise.",
      });
    }

    const newStock = Number(stock);

    if (!Number.isInteger(newStock) || newStock < 0) {
      return res.status(400).json({
        message: "Le stock doit être un nombre entier positif ou égal à zéro.",
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        stock: newStock,
        available: newStock > 0,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!product) {
      return res.status(404).json({
        message: "Produit introuvable.",
      });
    }

    res.json({
      message: "Stock mis à jour avec succès.",
      product,
    });
  } catch (error) {
    console.error("Erreur modification stock :", error);

    res.status(500).json({
      message: "Erreur lors de la modification du stock.",
    });
  }
});

// ==========================================
// PUT - Modifier un produit
// ADMIN
// ==========================================

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedProduct) {
      return res.status(404).json({
        message: "Produit introuvable",
      });
    }

    res.status(200).json({
      message: "Produit modifié avec succès",
      product: updatedProduct,
    });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la modification du produit",
      error: error.message,
    });
  }
});

// ==========================================
// DELETE - Supprimer un produit
// ADMIN
// ==========================================

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({
        message: "Produit introuvable",
      });
    }

    res.status(200).json({
      message: "Produit supprimé avec succès",
      product: deletedProduct,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression du produit",
      error: error.message,
    });
  }
});

export default router;
