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
  filename: (req, file, cb) => {
    const safeBase = file.originalname
      .replace(/\\/g, "")
      .replace(/\//g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.\-_]/g, "");
    const name = `${Date.now()}-${safeBase}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith("image/") || file.mimetype === "application/pdf";
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
        content: "You are an OCR assistant. Return ONLY the plain text content. No preamble, no bullets, no headings.",
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
        content: "Analyze the following content and produce the JSON: \n\n" + text.slice(0, 8000),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  let json;
  try {
    json = JSON.parse(resp.choices[0].message.content);
  } catch (e) {
    const raw = resp.choices[0].message.content || "{}";
    json = JSON.parse(raw.replace(/```json|```/g, ""));
  }

  return {
    title: json.title || "Untitled Resource",
    category: json.category || "General",
    description: json.description || "No description available.",
    quality: ["High", "Medium", "Low"].includes(json.quality) ? json.quality : "Medium",
  };
}

// Conservative fallback heuristic (kept but NOT used unless you change policy)
function heuristicIsEducational({ title, category, description, extractedText }) {
  const keywords = [
    "book","textbook","notebook","workbook","worksheet","exercise","study","learning","education","educational","school",
    "lesson","tutorial","guide","exam","course","lecture","chapter","solution","answers","homework","syllabus","flashcard"
  ];
  const containsKeyword = (txt) => {
    if (!txt) return false;
    const lower = String(txt).toLowerCase();
    return keywords.some(k => lower.includes(k));
  };

  if (containsKeyword(category)) return { ok: true, why: "category_keyword" };
  if (containsKeyword(title)) return { ok: true, reason: "title_keyword" };
  if (containsKeyword(description)) return { ok: true, reason: "description_keyword" };

  const txt = (extractedText || "").trim();
  const words = (txt.match(/\b[A-Za-z]{2,}\b/g) || []).length;
  if (words >= 8) return { ok: true, why: "ocr_word_count", words };

  if (txt && containsKeyword(txt)) return { ok: true, why: "ocr_keyword" };

  return { ok: false, why: "no_keyword_or_text", seen: { title, category, description, words } };
}

// Model-based yes/no classifier
// Returns object with ok: true|false|null (null = classifier error / non-json)
async function classifyEducationalWithModel({ title, category, description, extractedText }) {
  try {
    const promptSystem = `You are a strict classifier. Given metadata and extracted text, answer with STRICT JSON only: {"isEducational": boolean, "reason": string}.
"isEducational" should be true only when the content is a clear educational resource (textbooks, workbooks, worksheets, study guides, curriculum materials, exam practice, lecture notes, flashcards, educational PDFs). If it's a portrait, selfie, product photo, an image with no readable text, or content not intended for study, return isEducational: false. The "reason" must be a short plain-text explanation (one sentence). Do NOT return anything besides valid JSON.`;
    const userContent = `title: ${title || ""}\ncategory: ${category || ""}\ndescription: ${description || ""}\n\nextractedText (first 2000 chars):\n${(extractedText || "").slice(0, 2000)}`;

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: promptSystem },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.0,
    });

    const raw = resp.choices[0].message.content;
    let json;
    try {
      // If already parsed by response_format it may be an object
      json = typeof raw === "object" ? raw : JSON.parse(raw);
    } catch (e) {
      console.warn("Classifier returned non-JSON:", raw);
      return { ok: null, reason: "non_json_response", modelResult: raw };
    }

    if (typeof json.isEducational === "boolean") {
      return { ok: json.isEducational, reason: json.reason || "", modelResult: json };
    }

    return { ok: null, reason: "unexpected_format", modelResult: json };
  } catch (err) {
    console.warn("Classifier call failed:", err?.message || err);
    return { ok: null, reason: "classifier_error", error: err?.message || String(err) };
  }
}

// --- AI-powered Upload Route ---
router.post("/upload", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filename = req.file.filename;
    const imageUrl = `/uploads/${filename}`;
    const absPath = path.join(UPLOADS_DIR, filename);
    const mime = req.file.mimetype;

    // 1) Get text content (OCR or PDF)
    let extractedText = "";
    if (mime.startsWith("image/")) {
      extractedText = await ocrImageToText(absPath);
    } else if (mime === "application/pdf") {
      extractedText = await extractPdfText(absPath);
    }

    // 2) Generate AI metadata (title/category/description/quality)
    const details = await generateMetadataFromText(extractedText || "");

    // 2.5) Reject low quality immediately
    if (details.quality && details.quality.toLowerCase() === "low") {
      try { if (fs.existsSync(absPath)) fs.unlinkSync(absPath); } catch (e) { console.warn("delete failed", e); }
      return res.status(400).json({ error: "Low quality", reason: "low_quality" });
    }

    // 3) Run model-based classifier (preferred)
    const classifier = await classifyEducationalWithModel({
      title: details.title,
      category: details.category,
      description: details.description,
      extractedText,
    });

    // If classifier returned a boolean decision, obey it
    if (classifier.ok === true) {
      // OK — proceed to save
    } else if (classifier.ok === false) {
      // classifier explicitly rejected -> delete file & respond 400
      try { if (fs.existsSync(absPath)) fs.unlinkSync(absPath); } catch (e) { console.warn("delete failed", e); }
      return res.status(400).json({
        error: "Uploaded image is not recognized as an educational item.",
        reason: classifier.reason || (classifier.modelResult && JSON.stringify(classifier.modelResult)) || "classifier_rejected",
      });
    } else {
      // classifier returned null (error / non-json / unexpected) -> BE STRICT: reject
      try { if (fs.existsSync(absPath)) fs.unlinkSync(absPath); } catch (e) { console.warn("delete failed", e); }
      return res.status(400).json({
        error: "Classifier failure or ambiguous result.",
        reason: classifier.reason || "classifier_failure",
        modelResult: classifier.modelResult || null,
      });
    }

    // 4) Save to DB
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

    // 5) Award points
    db.prepare("UPDATE users SET points = points + 10 WHERE id = ?").run(req.user.sub);

    // 6) Respond
    res.json({
      success: true,
      id: info.lastInsertRowid,
      filename,
      imageUrl,
      title: details.title,
      category: details.category,
      description: details.description,
      quality: details.quality,
      extractedText,
    });
  } catch (err) {
    console.error("❌ Upload AI error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

module.exports = router;
