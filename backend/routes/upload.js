// ✅ backend/routes/upload.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const db = require("../db");   // import DB

const router = express.Router();

// --- Auth middleware (same as in app.js) ---
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

// --- File storage config ---
const UPLOADS_DIR = path.join(__dirname, "..", "uploads"); 
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// --- Upload Route ---
// --- Upload Route ---
// --- Upload Route ---
router.post("/upload", auth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const imageUrl = `/uploads/${req.file.filename}`;

  // ✨ Mock auto-categorization
  const categories = ["Book", "Stationery", "Electronics", "Toy"];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const mockTitle = `${category} - ${req.file.originalname.split(".")[0]}`;
  const description = `Auto-detected category: ${category}`;

  // Insert metadata into DB
  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO uploads (user_id, filename, title, category, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.sub, req.file.filename, mockTitle, category, description, now);

  // ✅ Uploader gains 10 points
  db.prepare("UPDATE users SET points = points + 10 WHERE id = ?")
    .run(req.user.sub);

  res.json({
    success: true,
    filename: req.file.filename,
    id: info.lastInsertRowid,
    imageUrl,
    title: mockTitle,
    category,
    description,
  });
});





module.exports = router;
