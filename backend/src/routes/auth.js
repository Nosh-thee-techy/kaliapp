import { Router } from "express";
import { loginOfficer, registerOfficer } from "../services/authService.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const result = await loginOfficer(email, password);
    if (!result) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    return res.json(result);
  } catch (error) {
    console.error("[auth/login]", error);
    return res.status(500).json({ error: error.message });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, branch } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const result = await registerOfficer({ name, email, password, branch });
    return res.status(201).json(result);
  } catch (error) {
    if (error.code === "EMAIL_EXISTS") {
      return res.status(409).json({ error: error.message });
    }
    console.error("[auth/register]", error);
    return res.status(500).json({ error: error.message });
  }
});

router.get("/me", requireAuth, (req, res) => {
  return res.json({ officer: req.officer });
});

export default router;
