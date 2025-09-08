// backend/routes/upload.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const pdfParse = require("pdf-parse");
const db = require("../db");
const OpenAI = require("openai");

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// --- File storage config ---
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf";
    if (!ok) return cb(new Error("Only images or PDFs are allowed"));
    cb(null, true);
  },
});

// --- Helpers ---
async function ocrImageToText(absPath) {
  const b64 = fs.readFileSync(absPath, { encoding: "base64" });
  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an OCR assistant. Return ONLY the plain text content. No preamble, no bullets, no headings.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract plain text from this image:" },
          { type: "image_url", image_url: { url: `data:image/png;base64,${b64}` } },
        ],
      },
    ],
  });
  return (resp.choices[0].message.content || "").trim();
}

async function extractPdfText(absPath) {
  const dataBuffer = fs.readFileSync(absPath);
  const parsed = await pdfParse(dataBuffer);
  return (parsed.text || "").trim();
}

async function generateMetadataFromText(text) {
  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You review uploaded study resources and return STRICT JSON only (no markdown) with keys: " +
          `{"title": string, "category": string, "description": string, "quality": "High"|"Medium"|"Low"}. ` +
          "Category should be short (e.g., Math, Biology, Physics, Language, General). " +
          "Description must be 1–2 sentences, student-friendly.",
      },
      {
        role: "user",
        content:
          "Analyze the following content and produce the JSON: \n\n" + text.slice(0, 8000),
      },
    ],
    // asks the model to return valid JSON only
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  let json;
  try {
    json = JSON.parse(resp.choices[0].message.content);
  } catch (e) {
    // fallback: try to coerce
    const raw = resp.choices[0].message.content || "{}";
    json = JSON.parse(raw.replace(/```json|```/g, ""));
  }

  // minimal guards
  return {
    title: json.title || "Untitled Resource",
    category: json.category || "General",
    description: json.description || "No description available.",
    quality: ["High", "Medium", "Low"].includes(json.quality) ? json.quality : "Medium",
  };
}

// --- AI-powered Upload Route ---
router.post("/upload", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filename = req.file.filename;
    const imageUrl = `/uploads/${filename}`;
    const absPath = path.join(UPLOADS_DIR, filename);
    const mime = req.file.mimetype;

    // 1) Get text content (OCR for image, pdf-parse for PDF)
    let extractedText = "";
    if (mime.startsWith("image/")) {
      extractedText = await ocrImageToText(absPath);
    } else if (mime === "application/pdf") {
      extractedText = await extractPdfText(absPath);
    }

    if (!extractedText) {
      return res.status(400).json({ error: "Could not extract text from file" });
    }

    // 2) Generate AI metadata
    const details = await generateMetadataFromText(extractedText);

    // 3) Save to DB
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `
        INSERT INTO uploads (user_id, filename, title, category, description, quality, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        req.user.sub,
        filename,
        details.title,
        details.category,
        details.description,
        details.quality,
        now
      );

    // 4) Award points
    db.prepare("UPDATE users SET points = points + 10 WHERE id = ?").run(req.user.sub);

    // 5) Respond
    res.json({
      success: true,
      id: info.lastInsertRowid,
      filename,
      imageUrl,
      title: details.title,
      category: details.category,
      description: details.description,
      quality: details.quality,
    });
  } catch (err) {
    console.error("❌ Upload AI error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

module.exports = router;
