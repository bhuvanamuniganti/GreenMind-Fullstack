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

// ✅ List all uploads (works across devices)
// NOTE: if filename is NOT a cloudinary url, send empty string -> UI will show placeholder
router.get("/receive", auth, (req, res) => {
  const rowsRaw = db
    .prepare(
      `SELECT u.id, u.user_id, u.filename,
              u.title, u.category, u.description, u.quality, u.created_at,
              usr.full_name AS uploader_name,
              (u.user_id = ?) AS isMine
       FROM uploads u
       JOIN users usr ON usr.id = u.user_id
       WHERE u.claimed_by IS NULL
       ORDER BY u.created_at DESC`
    )
    .all(req.user.sub);

  const rows = rowsRaw.map((r) => ({
    ...r,
    imageUrl: r.filename || "",
  }));

  res.json(rows);
});


// ✅ Claim item -> DO NOT delete from DB (fixes disappearing uploads)
router.post("/receive/claim/:id", auth, (req, res) => {
  const { id } = req.params;

  const item = db.prepare("SELECT * FROM uploads WHERE id = ?").get(id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  if (item.user_id === req.user.sub)
    return res.status(400).json({ error: "You cannot claim your own item" });

  // ✅ mark claimed instead of deleting
  db.prepare("UPDATE uploads SET claimed_by = ? WHERE id = ?").run(req.user.sub, id);

  // ✅ deduct points
  db.prepare("UPDATE users SET points = points - 10 WHERE id = ?").run(req.user.sub);

  res.json({ ok: true, message: "Item successfully claimed!" });
});


/* =========================
   AI Helpers for Receive
   ========================= */

const upload = multer({ dest: path.join(__dirname, "..", "tmp") });

router.post("/ai/search-voice", auth, upload.single("audio"), async (req, res) => {
  let tmpPath = null;
  try {
    if (!req.file) return res.status(400).json({ text: "" });
    tmpPath = req.file.path;

    const lang =
      req.body?.lang && req.body.lang !== "auto" ? req.body.lang : undefined;

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

router.post("/receive/thanks", auth, (req, res) => {
  const {
    userName = "Friend",
    itemTitle = "your item",
    address = "",
    orderId = "",
    etaDays = 3,
  } = req.body || {};

  const maskedAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "";

  const message = `Thank you for choosing us, ${userName}! We’ve received your order for “${itemTitle}”. It will be delivered to your address soon${
    etaDays ? ` (ETA ~${etaDays} days)` : ""
  }.`;

  return res.json({
    ok: true,
    message,
    details: {
      orderId: orderId || undefined,
      address: maskedAddress || undefined,
      etaDays,
    },
  });
});

module.exports = router;
