const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { registerSchema, loginSchema } = require("../validators");

const router = express.Router();
const nowIso = () => new Date().toISOString();

// ---------------- Register ----------------
router.post("/register", async (req, res) => {
  try {
    const { email, full_name, password } = registerSchema.parse(req.body);

    const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const password_hash = await bcrypt.hash(password, 10);

    db.prepare(`
      INSERT INTO users (
        email, full_name, password_hash, role,
        created_at, updated_at
      )
      VALUES (?,?,?,?,?,?)
    `).run(email, full_name, password_hash, "user", nowIso(), nowIso());

    const user = db.prepare("SELECT id, email, full_name FROM users WHERE email = ?").get(email);

    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.status(201).json(user);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Invalid input" });
  }
});

// ---------------- Login ----------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });

    res.json({ id: user.id, email: user.email, full_name: user.full_name });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Invalid input" });
  }
});

// ---------------- Logout ----------------
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

// ---------------- Get Current User ----------------
router.get("/me", (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: decoded });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
