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

// NEW: vision exact-title extractor for images (strict, verbatim)
async function extractExactTitleFromImage(absPath) {
  try {
    const b64 = fs.readFileSync(absPath, { encoding: "base64" });
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a STRICT extractor. Return ONLY JSON: {\"title\": string, \"subtitle\": string|null, \"is_confident\": boolean}. " +
            "Rules: (1) Copy the exact printed book title from the cover/spine (preserve casing & punctuation). " +
            "(2) If uncertain, set title:\"\" and is_confident:false.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the exact printed book title from this image." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } },
          ],
        },
      ],
    });
    const data = JSON.parse(resp.choices[0].message.content || "{}");
    return (data.title || "").trim();
  } catch {
    return "";
  }
}

async function generateMetadataFromText(text) {
  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0, // more deterministic
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You review uploaded study resources and return STRICT JSON only (no markdown) with keys: " +
          `{"title": string, "title_exact_from_text": string, "category": string, "description": string, "quality": "High"|"Medium"|"Low"}. ` +
          "Rules: (1) 'title_exact_from_text' must be a verbatim substring from the provided text (no rephrasing). " +
          "(2) If no clear title appears in the text, set 'title_exact_from_text' to ''. " +
          "(3) 'title' can be cleaned/human-friendly, but prefer 'title_exact_from_text' when available. " +
          "Category should be short (e.g., Math, Biology, Physics, Language, General). " +
          "Description must be 1–2 sentences, student-friendly.",
      },
      {
        role: "user",
        content: "Analyze the following content and produce the JSON: \n\n" + (text || "").slice(0, 8000),
      },
    ],
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
    title_exact_from_text: json.title_exact_from_text || "",
    category: json.category || "General",
    description: json.description || "No description available.",
    quality: ["High", "Medium", "Low"].includes(json.quality) ? json.quality : "Medium",
  };
}

// Model-based yes/no classifier
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
    let pdfInfoTitle = "";
    if (mime.startsWith("image/")) {
      extractedText = await ocrImageToText(absPath);
    } else if (mime === "application/pdf") {
      const dataBuffer = fs.readFileSync(absPath);
      const parsed = await pdfParse(dataBuffer);
      extractedText = (parsed.text || "").trim();
      pdfInfoTitle = parsed?.info?.Title ? String(parsed.info.Title).trim() : "";
    }

    // 2) Generate AI metadata (title/category/description/quality)
    const details = await generateMetadataFromText(extractedText || "");

    // 2.5) Reject low quality immediately
    if (details.quality && details.quality.toLowerCase() === "low") {
      try { if (fs.existsSync(absPath)) fs.unlinkSync(absPath); } catch (e) { console.warn("delete failed", e); }
      return res.status(400).json({ error: "Low quality", reason: "low_quality" });
    }

    // --- NEW: choose an EXACT title if possible ---
    let finalTitle = (details.title_exact_from_text || "").trim();

    // prefer PDF metadata title if present
    if (!finalTitle && pdfInfoTitle) {
      finalTitle = pdfInfoTitle;
    }

    // for images, try strict vision exact-title if we still don't have one
    if (!finalTitle && mime.startsWith("image/")) {
      const fromImage = await extractExactTitleFromImage(absPath);
      if (fromImage) finalTitle = fromImage;
    }

    // sanity fallback to friendly title
    if (!finalTitle || finalTitle.length < 3 || finalTitle.length > 120) {
      finalTitle = (details.title || "Untitled Resource").trim();
    }

    // 3) Run model-based classifier (preferred) with finalTitle
    const classifier = await classifyEducationalWithModel({
      title: finalTitle,
      category: details.category,
      description: details.description,
      extractedText,
    });

    if (classifier.ok === true) {
      // proceed
    } else if (classifier.ok === false) {
      try { if (fs.existsSync(absPath)) fs.unlinkSync(absPath); } catch (e) { console.warn("delete failed", e); }
      return res.status(400).json({
        error: "Uploaded image is not recognized as an educational item.",
        reason: classifier.reason || (classifier.modelResult && JSON.stringify(classifier.modelResult)) || "classifier_rejected",
      });
    } else {
      try { if (fs.existsSync(absPath)) fs.unlinkSync(absPath); } catch (e) { console.warn("delete failed", e); }
      return res.status(400).json({
        error: "Classifier failure or ambiguous result.",
        reason: classifier.reason || "classifier_failure",
        modelResult: classifier.modelResult || null,
      });
    }

    // 4) Save to DB (store finalTitle)
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
        finalTitle,
        details.category,
        details.description,
        details.quality,
        now
      );

    // 5) Award points
    db.prepare("UPDATE users SET points = points + 10 WHERE id = ?").run(req.user.sub);

    // 6) Respond (return finalTitle)
    res.json({
      success: true,
      id: info.lastInsertRowid,
      filename,
      imageUrl,
      title: finalTitle,
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
