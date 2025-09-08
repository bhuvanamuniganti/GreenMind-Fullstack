// backend/routes/receive.js
const express = require("express");
const db = require("../db");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
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

/* =========================
   Core "Receive" Endpoints
   ========================= */

// List all available uploads except my own & unclaimed
router.get("/receive", auth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.user_id,
              '/uploads/' || u.filename AS imageUrl,
              u.title, u.category, u.description, u.quality, u.created_at,
              usr.full_name AS uploader_name
       FROM uploads u
       JOIN users usr ON usr.id = u.user_id
       WHERE u.user_id <> ?
         AND u.claimed_by IS NULL
       ORDER BY u.created_at DESC`
    )
    .all(req.user.sub);

  res.json(rows);
});

// Claim an item -> HARD DELETE (to prevent overload)
router.post("/receive/claim/:id", auth, (req, res) => {
  const { id } = req.params;

  const item = db.prepare("SELECT * FROM uploads WHERE id = ?").get(id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  if (item.user_id === req.user.sub)
    return res.status(400).json({ error: "You cannot claim your own item" });

  // Delete after claim to keep table small
  db.prepare("DELETE FROM uploads WHERE id = ?").run(id);

  // Deduct 10 points from claimer
  db.prepare("UPDATE users SET points = points - 10 WHERE id = ?").run(req.user.sub);

  res.json({ ok: true, message: "Item successfully claimed and removed!" });
});

/* =========================
   AI Helpers for Receive
   ========================= */

// Temp storage for mic audio uploads
const upload = multer({ dest: path.join(__dirname, "..", "tmp") });

/**
 * 🎤 Voice → Text for search (multi-language)
 * - FormData: audio (webm/m4a/wav), optional lang (ISO-639-1). If lang omitted, auto-detect.
 * - Always returns { text: "" } on failure (never hard-crashes UI).
 */
router.post("/ai/search-voice", auth, upload.single("audio"), async (req, res) => {
  let tmpPath = null;
  try {
    if (!req.file) return res.status(400).json({ text: "" });
    tmpPath = req.file.path;

    const lang = req.body?.lang && req.body.lang !== "auto" ? req.body.lang : undefined;

    const fileStream = fs.createReadStream(tmpPath);
    const t = await client.audio.transcriptions.create({
      model: "whisper-1",
      file: fileStream,
      language: lang,
      temperature: 0.0,
    });

    return res.json({ text: (t.text || "").trim() });
  } catch (e) {
    console.error("Voice search error:", e?.message);
    return res.json({ text: "" });
  } finally {
    if (tmpPath) fs.unlink(tmpPath, () => {});
  }
});

/**
 * 🤖 AI re-rank items by usefulness for a query
 * Body: { query: string, items: [{id,title,description,category,quality}] }
 * Returns: { results: [{id, score, reason, tags: []}, ...] }
 */
router.post("/receive/ai-rank", auth, async (req, res) => {
  try {
    const { query = "", items = [] } = req.body;

    const prompt = `
You are ranking study resources for a student's search.
Return STRICT JSON with key "results": an array of {id, score (0-100), reason, tags}.
Be concise. Prefer higher quality, tighter match to the query, and clear student value.

Query: "${query}"
Items: ${JSON.stringify(items).slice(0, 9000)}
`;

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    let json = {};
    try {
      json = JSON.parse(r.choices[0].message.content);
    } catch {
      json = { results: [] };
    }
    if (!Array.isArray(json.results)) json.results = [];
    res.json(json);
  } catch (e) {
    console.error("AI rank error:", e?.message);
    res.json({ results: [] });
  }
});

/**
 * 💡 Per-item student-friendly blurb + tags
 * Body: { title, description, category }
 * Returns: { blurb, tags: [] }
 */
router.post("/receive/why", auth, async (req, res) => {
  try {
    const { title = "", description = "", category = "" } = req.body;

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Explain the resource to a student in 2–3 sentences and suggest 3–6 short tags. Return STRICT JSON.",
        },
        {
          role: "user",
          content:
            `Title: ${title}\nCategory: ${category}\nDescription: ${description}\n` +
            `JSON: {"blurb": string, "tags": [string]}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    let out = { blurb: "", tags: [] };
    try {
      out = JSON.parse(r.choices[0].message.content);
      if (!Array.isArray(out.tags)) out.tags = [];
    } catch {}
    res.json(out);
  } catch (e) {
    console.error("Why (blurb) error:", e?.message);
    res.json({ blurb: "", tags: [] });
  }
});

// --- AI Thank-you text (with safe fallback)
router.post("/receive/thanks", auth, async (req, res) => {
  const { userName = "Friend", itemTitle = "a resource", category = "Learning" } = req.body || {};
  // Fallback text if OpenAI is unavailable
  const fallback = {
    title: "Certificate of Appreciation",
    subtitle: "For Supporting Smart Learning & Reuse",
    body:
      `${userName}, thank you for receiving “${itemTitle}”.\n\n` +
      `By choosing to reuse instead of buying new, you helped reduce waste and ` +
      `support a smarter, more affordable learning journey for someone in our community.\n\n` +
      `Every small act like this inspires others to share, receive, and learn together. 💚`,
    hashtags: ["#ShareToLearn", "#ReduceWaste", "#GreenMindAI", "#SmartLearning"],
  };

  try {
    const prompt =
      `Write a 3–5 sentence warm appreciation message for someone who claimed ` +
      `an educational resource on GreenMindAI. Mention reuse, learning, and community impact. ` +
      `Return JSON with keys: title, subtitle, body, hashtags (array of 3-6 short tags). ` +
      `Receiver: ${userName}. Item: ${itemTitle}. Category: ${category}. Tone: uplifting, humble, inclusive.`

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    let out = fallback;
    try {
      const parsed = JSON.parse(r.choices[0].message.content);
      out = {
        title: parsed.title || fallback.title,
        subtitle: parsed.subtitle || fallback.subtitle,
        body: parsed.body || fallback.body,
        hashtags: Array.isArray(parsed.hashtags) && parsed.hashtags.length ? parsed.hashtags : fallback.hashtags,
      };
    } catch { /* ignore and use fallback */ }

    res.json(out);
  } catch (e) {
    // Network / OpenAI blocked: serve fallback gracefully
    res.json(fallback);
  }
});

module.exports = router;
