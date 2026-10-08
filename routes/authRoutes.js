import jwt from "jsonwebtoken";
import express from "express";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";

const router = express.Router();

// Connexion administrateur
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Identifiant et mot de passe requis.",
      });
    }

    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.status(401).json({
        message: "Identifiant ou mot de passe incorrect.",
      });
    }

    const passwordIsCorrect = await bcrypt.compare(password, admin.password);

    if (!passwordIsCorrect) {
      return res.status(401).json({
        message: "Identifiant ou mot de passe incorrect.",
      });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
      },
    );

    res.json({
      message: "Connexion administrateur réussie.",
      token,
      admin: {
        id: admin._id,
        username: admin.username,
      },
    });
  } catch (error) {
    console.error("Erreur connexion admin :", error);

    res.status(500).json({
      message: "Erreur lors de la connexion.",
    });
  }
});

export default router;
