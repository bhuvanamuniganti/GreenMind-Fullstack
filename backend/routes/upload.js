const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const pdfParse = require("pdf-parse");
const db = require("../db");
const OpenAI = require("openai");
const cloudinary = require("cloudinary").v2;

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

// --- TEMP File storage (only to read & upload to Cloudinary) ---
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

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

// STRICT title extractor (vision)
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
            "Return ONLY JSON: {\"title\": string, \"subtitle\": string|null, \"is_confident\": boolean}. " +
            "Copy the exact printed book title from the cover/spine. If uncertain, use title:\"\".",
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
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Return STRICT JSON: {\"title\": string, \"title_exact_from_text\": string, \"category\": string, \"description\": string, \"quality\": \"High\"|\"Medium\"|\"Low\"}. " +
          "title_exact_from_text must be verbatim from the input text.",
      },
      { role: "user", content: "Analyze:\n\n" + (text || "").slice(0, 8000) },
    ],
  });

  let json;
  try {
    json = JSON.parse(resp.choices[0].message.content);
  } catch {
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

async function classifyEducationalWithModel({ title, category, description, extractedText }) {
  try {
    const promptSystem =
      `You are a strict classifier. Answer JSON: {"isEducational": boolean, "reason": string}. ` +
      `True only for clear study resources.`;

    const userContent =
      `title: ${title || ""}\ncategory: ${category || ""}\n` +
      `description: ${description || ""}\n\n` +
      `extractedText (first 2000 chars):\n${(extractedText || "").slice(0, 2000)}`;

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
    } catch {
      return { ok: null, reason: "non_json_response", modelResult: raw };
    }

    if (typeof json.isEducational === "boolean") {
      return { ok: json.isEducational, reason: json.reason || "", modelResult: json };
    }

    return { ok: null, reason: "unexpected_format", modelResult: json };
  } catch (err) {
    return { ok: null, reason: "classifier_error", error: err?.message || String(err) };
  }
}

// --- AI-powered Upload Route (Cloudinary) ---
router.post("/upload", auth, upload.single("image"), async (req, res) => {
  let absPath = null;

  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filename = req.file.filename;
    absPath = path.join(UPLOADS_DIR, filename);
    const mime = req.file.mimetype;

    // ✅ 1) Extract text FIRST (OCR or PDF parse)
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

    // ✅ 2) Generate metadata from extracted text
    const details = await generateMetadataFromText(extractedText || "");

    if (details.quality && details.quality.toLowerCase() === "low") {
      try { if (fs.existsSync(absPath)) fs.unlinkSync(absPath); } catch {}
      return res.status(400).json({ error: "Low quality", reason: "low_quality" });
    }

    // ✅ 3) Pick exact title
    let finalTitle = (details.title_exact_from_text || "").trim();

    if (!finalTitle && pdfInfoTitle) finalTitle = pdfInfoTitle;

    if (!finalTitle && mime.startsWith("image/")) {
      const fromImage = await extractExactTitleFromImage(absPath);
      if (fromImage) finalTitle = fromImage;
    }

    if (!finalTitle || finalTitle.length < 3 || finalTitle.length > 120) {
      finalTitle = (details.title || "Untitled Resource").trim();
    }

    // ✅ 4) Classify educational
    const classifier = await classifyEducationalWithModel({
      title: finalTitle,
      category: details.category,
      description: details.description,
      extractedText,
    });

    if (classifier.ok !== true) {
      try { if (fs.existsSync(absPath)) fs.unlinkSync(absPath); } catch {}
      return res.status(400).json({
        error:
          classifier.ok === false
            ? "Uploaded image is not recognized as an educational item."
            : "Classifier failure or ambiguous result.",
        reason:
          classifier.reason ||
          (classifier.modelResult && JSON.stringify(classifier.modelResult)) ||
          "classifier_error",
      });
    }

    // ✅ 5) Upload to Cloudinary AFTER processing
    const cloudResult = await cloudinary.uploader.upload(absPath, {
      folder: "greenmind_uploads",
      resource_type: "auto",
    });

    const imageUrl = cloudResult.secure_url;

    // ✅ 6) Delete local file AFTER cloud upload ✅ (this is the correction)
    try {
      if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
    } catch {}

    // ✅ 7) Save in DB (store Cloudinary URL in filename column)
    const now = new Date().toISOString();

    const info = db
      .prepare(
        `INSERT INTO uploads (user_id, filename, title, category, description, quality, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.user.sub,
        imageUrl, // ✅ Cloudinary URL saved here
        finalTitle,
        details.category,
        details.description,
        details.quality,
        now
      );

    // ✅ 8) Award points
    db.prepare("UPDATE users SET points = points + 10 WHERE id = ?").run(req.user.sub);

    // ✅ 9) Respond
    res.json({
      success: true,
      id: info.lastInsertRowid,
      filename: imageUrl,
      imageUrl, // ✅ cloudinary link
      title: finalTitle,
      category: details.category,
      description: details.description,
      quality: details.quality,
      extractedText,
    });
  } catch (err) {
    console.error("❌ Upload AI error:", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  } finally {
    // Extra safety cleanup
    if (absPath) {
      try {
        if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
      } catch {}
    }
  }
});

module.exports = router;
