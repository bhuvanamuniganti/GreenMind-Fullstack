const express = require("express");
const db = require("../db");
const nowIso = () => new Date().toISOString();

const router = express.Router();

// POST /api/request
router.post("/request", (req, res) => {
  try {
    const { title, description, category } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: "Missing title" });

    const created_at = nowIso();
    db.prepare(`
      INSERT INTO requests (title, description, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(title.trim(), description || "", category || "", created_at, created_at);

    // optional: you can return the created row id or a success message
    res.status(201).json({ ok: true, message: "Request submitted" });
  } catch (err) {
    console.error("POST /api/request error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
