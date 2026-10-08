import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Créer une commande
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { customer, items, delivery, shippingCost, payment } = req.body;

    // Vérification des informations client
    if (
      !customer?.firstName ||
      !customer?.lastName ||
      !customer?.phone ||
      !customer?.city ||
      !customer?.address
    ) {
      return res.status(400).json({
        message: "Les informations du client sont incomplètes.",
      });
    }

    // Vérification du panier
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "La commande doit contenir au moins un produit.",
      });
    }

    // Vérification de la livraison
    if (!["standard", "express"].includes(delivery)) {
      return res.status(400).json({
        message: "Mode de livraison invalide.",
      });
    }

    // Vérification du paiement
    if (!["delivery", "wave", "orange-money"].includes(payment)) {
      return res.status(400).json({
        message: "Mode de paiement invalide.",
      });
    }

    // Vérification des identifiants produits
    const productIds = items.map((item) => item.product);

    const invalidId = productIds.some(
      (id) => !mongoose.Types.ObjectId.isValid(id),
    );

    if (invalidId) {
      return res.status(400).json({
        message: "Un ou plusieurs produits sont invalides.",
      });
    }

    // Vérification des quantités
    for (const item of items) {
      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          message: "Une ou plusieurs quantités sont invalides.",
        });
      }
    }

    // Récupération des vrais produits depuis MongoDB
    const products = await Product.find({
      _id: { $in: productIds },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        message: "Un ou plusieurs produits n'existent plus.",
      });
    }

    // Vérification du stock
    for (const item of items) {
      const product = products.find(
        (product) => product._id.toString() === item.product,
      );

      const quantity = Number(item.quantity);

      if (!product) {
        return res.status(404).json({
          message: `Le produit "${item.name}" est introuvable.`,
        });
      }

      if (product.available === false || product.stock < quantity) {
        return res.status(400).json({
          message: `Stock insuffisant pour "${product.name}". Stock disponible : ${product.stock}.`,
        });
      }
    }

    // Reconstruction sécurisée des articles
    const orderItems = items.map((item) => {
      const product = products.find(
        (product) => String(product._id) === String(item.product),
      );

      const quantity = Number(item.quantity);

      return {
        product: product._id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.image,
      };
    });

    // Calcul sécurisé du sous-total
    const subtotal = orderItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );

    // Vérification des frais de livraison
    const validatedShippingCost = Number(shippingCost);

    if (!Number.isFinite(validatedShippingCost) || validatedShippingCost < 0) {
      return res.status(400).json({
        message: "Frais de livraison invalides.",
      });
    }

    // Calcul sécurisé du total
    const total = subtotal + validatedShippingCost;

    // Transaction MongoDB
    session.startTransaction();

    // Diminution du stock
    for (const item of orderItems) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.product,
          stock: { $gte: item.quantity },
        },
        {
          $inc: {
            stock: -item.quantity,
          },
        },
        {
          new: true,
          session,
        },
      );

      if (!updatedProduct) {
        throw new Error(
          `Le stock du produit "${item.name}" n'est plus suffisant.`,
        );
      }

      // Mise à jour automatique de la disponibilité
      updatedProduct.available = updatedProduct.stock > 0;

      await updatedProduct.save({ session });
    }

    // Création de la commande
    const [order] = await Order.create(
      [
        {
          customer,
          items: orderItems,
          delivery,
          shippingCost: validatedShippingCost,
          payment,
          subtotal,
          total,
        },
      ],
      { session },
    );

    // Validation de la transaction
    await session.commitTransaction();

    res.status(201).json({
      message: "Commande enregistrée avec succès.",
      order,
    });
  } catch (error) {
    // Annulation de toutes les modifications
    await session.abortTransaction();

    console.error("Erreur création commande :", error);

    res.status(500).json({
      message: error.message || "Impossible d'enregistrer la commande.",
    });
  } finally {
    await session.endSession();
  }
});

// Récupérer toutes les commandes
router.get("/", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Erreur récupération commandes :", error);

    res.status(500).json({
      message: "Impossible de récupérer les commandes.",
      error: error.message,
    });
  }
});

// Récupérer une commande par son ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("items.product");

    if (!order) {
      return res.status(404).json({
        message: "Commande introuvable.",
      });
    }

    res.json(order);
  } catch (error) {
    console.error("Erreur récupération commande :", error);

    res.status(500).json({
      message: "Impossible de récupérer la commande.",
      error: error.message,
    });
  }
});

// Modifier le statut d'une commande
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Statut de commande invalide.",
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    if (!order) {
      return res.status(404).json({
        message: "Commande introuvable.",
      });
    }

    res.json({
      message: "Statut de la commande mis à jour.",
      order,
    });
  } catch (error) {
    console.error("Erreur modification statut :", error);

    res.status(500).json({
      message: "Impossible de modifier le statut de la commande.",
      error: error.message,
    });
  }
});

export default router;
