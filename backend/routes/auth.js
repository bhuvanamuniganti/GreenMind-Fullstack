// backend/routes/auth.js
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
    console.log("➡️ /api/auth/register body:", req.body);

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
    res.status(201).json({ ...user, token });
  } catch (e) {
    console.error("Register error:", e);
    res.status(400).json({ error: "Invalid input" });
  }
});

// ---------------- Login ----------------
// ---------------- Login ----------------
router.post("/login", async (req, res) => {
  try {
    console.log("➡️ /api/auth/login body:", req.body);

    // Attempt to parse (and catch schema errors)
    let parsed;
    try {
      parsed = loginSchema.parse(req.body);
      console.log("Parsed payload:", parsed);
    } catch (pz) {
      console.error("Login schema parse error:", pz && pz.errors ? pz.errors : pz);
      return res.status(400).json({ error: "Invalid input (schema)" });
    }

    const { email, password } = parsed;

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    console.log("DB user found:", !!user, user ? { id: user.id, email: user.email, hash_len: user.password_hash ? user.password_hash.length : 0 } : null);

    if (!user) {
      console.log("Login failed: user not found");
      return res.status(401).json({ error: "Invalid email or password" });
    }

    let ok = false;
    try {
      ok = await bcrypt.compare(password, user.password_hash);
    } catch (bcErr) {
      console.error("bcrypt error:", bcErr);
    }
    console.log("bcrypt.compare result:", ok);

    if (!ok) {
      console.log("Login failed: bcrypt compare false");
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const cookieOptions = {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
    res.cookie("token", token, cookieOptions);

    console.log("Login success for user id:", user.id);
    res.json({ id: user.id, email: user.email, full_name: user.full_name, token });
  } catch (e) {
    console.error("Login error (unexpected):", e);
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
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: decoded });
  } catch (err) {
    console.error("Token verify error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
