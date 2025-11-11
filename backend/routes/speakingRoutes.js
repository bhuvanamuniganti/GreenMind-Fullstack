// backend/routes/speakingRoutes.js
// OpenAI-powered speaking routes (guidance, example, translate, correct, score, TTS, ping)
const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
require("dotenv").config();

const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const openai = new OpenAI({ apiKey: OPENAI_KEY });

/* ----------------- small helpers ----------------- */
function slug(s = "") {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function normalizeWords(s = "") {
  return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}'\s]/gu, " ").split(/\s+/).filter(Boolean);
}
function levenshtein(a = "", b = "") {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost);
    }
  }
  return dp[m][n];
}

/* ----------------- Ping to verify OpenAI key works ----------------- */
router.get("/_ping_openai", async (req, res) => {
  try {
    if (!OPENAI_KEY) {
      return res.status(500).json({ ok: false, error: "OPENAI_API_KEY not set on server" });
    }
    // minimal check (tiny completion)
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say hi" }],
      max_tokens: 5,
    });
    const example = r?.choices?.[0]?.message?.content || "ok";
    return res.json({ ok: true, example: example.slice(0, 120) });
  } catch (err) {
    console.error("ping_openai error:", err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

/* ----------------- Guidance (GPT) ----------------- */
// POST /api/speaking/guidance
router.post("/guidance", async (req, res) => {
  try {
    const topic = String(req.body?.topic || "My Daily Routine").trim();
    const level = String(req.body?.level || "basic").toLowerCase();

    // If no OpenAI key, return deterministic fallback guidance
    if (!OPENAI_KEY) {
      const modelLine = level === "basic"
        ? `I will talk about ${topic}. First, I will say what it is. Then, I will give one example.`
        : `I will talk about ${topic}. I will give a short example and one closing line.`;
      return res.json({
        topic,
        level,
        guidance: {
          modelLine,
          openers: [modelLine],
          warmups: [
            `Why is ${topic} useful for you?`,
            `Can you share one example about ${topic}?`
          ],
          outline: level === "advanced"
            ? [
                "Start: State the topic in one line.",
                "Middle: Give a real example or story.",
                "End: Say one benefit or learning."
              ]
            : [
                "Start: Say your topic.",
                "Middle: One example.",
                "End: One simple closing line."
              ],
          parentTip: "Listen, smile, and encourage short clear sentences."
        },
        suggestions: [topic, "Helping at home", "My best friend", "A happy memory", "How I save water", "My favourite food"]
      });
    }

    const prompt = `
You are a friendly assistant that creates short speaking guidance for young children.
Topic: "${topic}"
Level: "${level}"

Produce JSON ONLY with these keys:
{
  "modelLine": "a single short model opening line",
  "openers": ["3 short opener options"],
  "warmups": ["2 short warmup questions (parent asks)"],
  "outline": ["3 short steps: start, middle, end"],
  "parentTip": "one short parent tip"
}
Keep text simple, kid-friendly and short.
`;

    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 450,
      response_format: { type: "json_object" }
    });

    // parse GPT JSON output (SDK may provide parsed already in response_format)
    let guidance = null;
    if (r?.choices?.[0]?.message?.content) {
      try {
        guidance = typeof r.choices[0].message.content === "object"
          ? r.choices[0].message.content
          : JSON.parse(r.choices[0].message.content);
      } catch (e) {
        console.warn("Failed to JSON-parse guidance, using fallback text", e);
      }
    }

    // fallback safety
    if (!guidance) {
      guidance = {
        modelLine: `I will talk about ${topic}. First, I will say what it is. Then, I will give one example.`,
        openers: [`I will talk about ${topic}.`],
        warmups: [
          `Why is ${topic} useful for you?`,
          `Can you share one example about ${topic}?`
        ],
        outline: [
          "Start: Say your topic.",
          "Middle: One example.",
          "End: One simple closing line."
        ],
        parentTip: "Listen and encourage short sentences."
      };
    }

    return res.json({
      topic,
      level,
      guidance,
      suggestions: [topic, "Helping at home", "My best friend", "A happy memory", "How I save water", "My favourite food"]
    });
  } catch (err) {
    console.error("guidance error:", err);
    return res.status(500).json({ error: "Failed to build guidance", detail: err?.message || String(err) });
  }
});

/* ----------------- Example (short example + pitch/rate hints) ----------------- */
// POST /api/speaking/example
router.post("/example", async (req, res) => {
  try {
    const topic = String(req.body?.topic || "My Daily Routine");
    const level = String(req.body?.level || "basic").toLowerCase();

    if (!OPENAI_KEY) {
      return res.json({
        exampleText: level === "basic"
          ? `I will talk about ${topic}. First, I will say what it is. Then, I will give one example.`
          : `Today I will talk about ${topic}. I will give a short story and end with a lesson.`,
        pitchHint: 1.2,
        rateHint: 0.95
      });
    }

    const prompt = `Write a short 1-3 sentence example speech for a child about "${topic}" at ${level} level. Keep it simple and friendly.`;
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.6
    });

    const exampleText = (r?.choices?.[0]?.message?.content || "").trim();
    res.json({ exampleText: exampleText || `I will talk about ${topic}.`, pitchHint: 1.2, rateHint: 0.95 });
  } catch (err) {
    console.error("example error:", err);
    res.status(500).json({ error: "Failed to build example", detail: err?.message || String(err) });
  }
});

// ------------------ AI-ENHANCED SCORING ------------------
router.post("/score", async (req, res) => {
  try {
    const ref = String(req.body?.referenceText || "").trim();
    const spoken = String(req.body?.transcript || "").trim();
    const topic = String(req.body?.topic || "General");
    if (!spoken) return res.json({ error: "Transcript missing" });

    // 1️⃣ Basic similarity score (your existing logic)
    const exp = normalizeWords(ref);
    const sp = normalizeWords(spoken);
    const maxLen = Math.max(exp.length, sp.length);
    let ok = 0;
    for (let i = 0; i < exp.length; i++) {
      const e = exp[i] || "";
      const s = sp[i] || "";
      const d = levenshtein(e, s);
      const norm = e.length ? d / e.length : 1;
      if (norm <= 0.34) ok++;
    }
    const wordMatch = Math.round((ok / maxLen) * 100);
    const pronunciation = Math.min(100, Math.round(wordMatch + 10));
    const fluency = Math.min(100, Math.round(wordMatch + 5));

    // 2️⃣ Semantic evaluation with OpenAI (optional but powerful)
    const prompt = `
You are an English speech evaluation coach for children aged 6–12.
Compare the child's speech with the model sentence.

Model (expected): "${ref || "I will talk about my daily routine."}"
Child's speech: "${spoken}"

Evaluate:
1. Pronunciation issues (describe mispronounced words phonetically)
2. Grammar improvements
3. Relevance (is the child speaking about the same topic?)
4. Fluency and confidence level
Return structured JSON with:
{
  "pronunciation_tips": [],
  "grammar_tips": [],
  "relevance_comment": "",
  "suggested_correction": "",
  "relevance_score": 0-100
}`;

    let aiFeedback = {};
    try {
      const result = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });
      aiFeedback = JSON.parse(result.choices[0].message.content);
    } catch (err) {
      console.warn("AI feedback skipped:", err.message);
    }

    // 3️⃣ Merge scores
    const finalScore = Math.round(
      0.5 * wordMatch + 0.2 * pronunciation + 0.2 * fluency + 0.1 * (aiFeedback.relevance_score || 0)
    );

    res.json({
      topic,
      score: finalScore,
      breakdown: {
        pronunciation,
        wordMatch,
        fluency,
        relevance: aiFeedback.relevance_score || 0,
      },
      feedback: aiFeedback,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "AI scoring failed" });
  }
});


// POST /api/speaking/correct
router.post("/correct", async (req, res) => {
  try {
    const referenceText = String(req.body?.referenceText || "");
    const transcript = String(req.body?.transcript || "");

    // simple fallback if no OpenAI key
    if (!OPENAI_KEY) {
      const suggested = referenceText ? referenceText : transcript;
      return res.json({ corrected: postProcessCorrected(suggested), diffs: [], grammarHints: [], pronunciationTips: [] });
    }

    // Helper: small post-processor to ensure capitalization and trailing punctuation
    function postProcessCorrected(text = "") {
      let s = String(text || "").trim();

      // Collapse multiple spaces
      s = s.replace(/\s+/g, " ");

      // Ensure sentences start with capital letters: split on .!? and capitalize
      s = s.replace(/([.!?]\s*|^)([a-z])/g, (m, p1, ch) => `${p1}${ch.toUpperCase()}`);

      // Guarantee trailing punctuation (prefer period)
      if (s && !/[.!?]$/.test(s)) s = s + ".";
      return s;
    }

    // Prompt: be explicit about corrected text formatting and length
    const prompt = `
You are a careful, parent-facing editor. Compare the Reference text (expected) and Child's transcript.
Task: produce a single high-quality, grammatically-correct version of the child's sentence(s). Also return:
 - diffs: list of mismatched words (expected vs actual) with a short matchPct estimate (0-100)
 - grammarHints: short bullet tips parents can use
 - pronunciationTips: very short, specific tips for mispronounced words

Rules (important):
1) Return JSON ONLY with keys exactly: { "corrected": "...", "diffs": [ { "expected":"", "actual":"", "matchPct": 0 } ], "grammarHints": ["..."], "pronunciationTips": ["..."] }
2) "corrected" MUST be a single short paragraph (1-3 sentences), properly capitalized and punctuated, simple child-friendly English.
3) Keep hints short (1-2 lines each). If nothing to suggest, return an empty array for that key.
4) Do NOT include any extra commentary outside JSON.

Reference: """${referenceText}"""
Child: """${transcript}"""
Keep JSON concise, parent-friendly.
`;

    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.2, // lower temperature for deterministic edits
      response_format: { type: "json_object" }
    });

    let data = null;
    if (r?.choices?.[0]?.message?.content) {
      try {
        data = typeof r.choices[0].message.content === "object"
          ? r.choices[0].message.content
          : JSON.parse(r.choices[0].message.content);
      } catch (e) {
        console.warn("Failed to parse correction JSON", e);
      }
    }

    // fallback: construct basic response if model didn't return valid JSON
    if (!data || typeof data.corrected !== "string") {
      const fallbackCorrected = referenceText || transcript || "";
      data = { corrected: postProcessCorrected(fallbackCorrected), diffs: [], grammarHints: [], pronunciationTips: [] };
    } else {
      // defensively post-process "corrected" text to ensure capitalization/periods
      data.corrected = postProcessCorrected(data.corrected);
    }

    return res.json(data);
  } catch (err) {
    console.error("correct error:", err);
    return res.status(500).json({ error: "Correction failed", detail: err?.message || String(err) });
  }
});


router.post("/translate/forward", async (req, res) => {
  try {
    let text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ error: "Missing text" });

    // accept either code ("hi") or full name ("Hindi")
    const rawTo = String(req.body?.to || req.body?.targetLang || "Hindi").trim();
    const codeToName = { hi: "Hindi", ta: "Tamil", te: "Telugu", en: "English", bn: "Bengali" };
    const to = codeToName[rawTo.toLowerCase()] || rawTo;

    if (!OPENAI_KEY) {
      console.warn("translate/forward: OPENAI_KEY missing on server");
      return res.status(500).json({ error: "Server: OPENAI_API_KEY not configured" });
    }

    // explicit translation instruction, request only the translated text
    const prompt = `Translate the following text into ${to}. Return only the translated text with no commentary:\n\n${text}`;

    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.2
    });

    const translatedRaw = (r?.choices?.[0]?.message?.content || "").trim();

    if (!translatedRaw) {
      console.error("translate/forward: empty result from provider", JSON.stringify(r?.choices || r?.error || r));
      return res.status(502).json({ error: "Empty translation from provider", provider: r });
    }

    return res.json({ translated: translatedRaw, detected: "auto", to });
  } catch (err) {
    console.error("translate/forward error:", err && err.message ? err.message : err);
    return res.status(500).json({
      error: "Translation API failed",
      detail: err?.message || String(err),
      provider: err?.response || null
    });
  }
});

/* ----------------- TTS (OpenAI Audio) ----------------- */
// POST /api/learning/tts
// If OPENAI_API_KEY is not set, frontend should fallback to browser speechSynthesis
router.post("/learning/tts", async (req, res) => {
  try {
    const text = String(req.body?.text || "");
    const lang = String(req.body?.lang || "en-IN");
    const pitch = Number(req.body?.pitch || 1);

    if (!text) return res.status(400).json({ error: "Missing text" });
    if (!OPENAI_KEY) {
      return res.status(501).json({ error: "TTS not configured on server. Set OPENAI_API_KEY or use browser speechSynthesis." });
    }

    // Use OpenAI audio speech create (if supported by your SDK)
    try {
      const speechResp = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: text,
      });
      // speechResp might be a stream/arrayBuffer depending on SDK; convert to buffer and send
      const buffer = Buffer.from(await speechResp.arrayBuffer());
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    } catch (err) {
      console.error("openai TTS call failed:", err);
      return res.status(502).json({ error: "TTS provider failed", detail: err?.message || String(err) });
    }
  } catch (err) {
    console.error("tts handler error:", err);
    return res.status(500).json({ error: "TTS failed", detail: err?.message || String(err) });
  }
});

module.exports = router;
