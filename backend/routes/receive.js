const express = require("express");
const db = require("../db");
const jwt = require("jsonwebtoken");

const router = express.Router();

// --- Auth middleware ---
function auth(req, res, next) {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// --- Fetch all uploads except user's own ---
router.get("/receive", auth, (req, res) => {
  const rows = db.prepare(
    `SELECT u.id, u.user_id,
            '/uploads/' || u.filename AS imageUrl,
            u.title, u.category, u.description, u.created_at,
            usr.full_name as uploader_name
     FROM uploads u
     JOIN users usr ON usr.id = u.user_id
     WHERE u.user_id <> ?   -- exclude my own uploads
       AND u.claimed_by IS NULL -- only unclaimed
     ORDER BY u.created_at DESC`
  ).all(req.user.sub);

  res.json(rows);
});

// --- Claim an upload ---
// --- Claim an upload ---
router.post("/receive/claim/:id", auth, (req, res) => {
  const { id } = req.params;

  const item = db.prepare("SELECT * FROM uploads WHERE id=?").get(id);
  if (!item) return res.status(404).json({ error: "Item not found" });

  if (item.user_id === req.user.sub) {
    return res.status(400).json({ error: "You cannot claim your own item" });
  }
  if (item.claimed_by) {
    return res.status(400).json({ error: "Already claimed" });
  }

  const now = new Date().toISOString();
  db.prepare(
    "UPDATE uploads SET claimed_by=?, claimed_at=? WHERE id=?"
  ).run(req.user.sub, now, id);

  // ✅ Claimer loses 10 points
  db.prepare("UPDATE users SET points = points - 10 WHERE id = ?")
    .run(req.user.sub);

  res.json({ ok: true, message: "Item successfully claimed!" });
});



module.exports = router;
