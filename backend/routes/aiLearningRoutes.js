const express = require("express");
const OpenAI = require("openai");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const upload = multer({ dest: "uploads/" });
const fetch = require("node-fetch");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// === Generate Q&A ===
router.post("/qa", async (req, res) => {
  try {
    const { text } = req.body;
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Generate question-answer pairs." },
        { role: "user", content: text }
      ],
    });
    res.json({ result: response.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Fill in the Blanks ===
router.post("/fill-blanks", async (req, res) => {
  try {
    const { text } = req.body;
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Convert text into fill-in-the-blanks." },
        { role: "user", content: text }
      ],
    });
    res.json({ result: response.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === MCQs ===
router.post("/mcq", async (req, res) => {
  try {
    const { text } = req.body;
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Generate 3 MCQs with options + correct answers." },
        { role: "user", content: text }
      ],
    });
    res.json({ result: response.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Summarize ===
router.post("/summary", async (req, res) => {
  try {
    const { text } = req.body;
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Summarize this text clearly." },
        { role: "user", content: text }
      ],
    });
    res.json({ result: response.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Highlight Key Terms ===
router.post("/highlight", async (req, res) => {
  try {
    const { text } = req.body;
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Extract and highlight important keywords from this text." },
        { role: "user", content: text }
      ],
    });
    res.json({ result: response.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Analyze Uploaded Image (fixed with Base64) ===
// === Analyze Uploaded Image (clean text output) ===
router.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    const fs = require("fs");
    const filePath = path.resolve(req.file.path);
    const imageBase64 = fs.readFileSync(filePath, { encoding: "base64" });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Vision-capable
      messages: [
        {
          role: "system",
          content:
            "You are an OCR assistant. Extract only the plain text from the image. Do not add explanations, do not say 'Here is the text', do not add bullets. Just return the raw text exactly as seen, in readable paragraphs."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract and return only the plain text from this image:" },
            { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
          ]
        }
      ]
    });

    res.json({ result: response.choices[0].message.content?.trim() || "No text detected." });
  } catch (err) {
    console.error("❌ Image analyze error:", err);
    res.status(500).json({ error: err.message });
  }
});

// === Explain (text + TTS as base64, respects targetLang) ===
router.post("/explain", async (req, res) => {
  try {
    const { text, style = "story", targetLang = "English" } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "⚠️ Please provide input text to explain." });
    }

    // 1) Generate an easy-to-understand explanation in the requested language
    const prompt = `You are a friendly teacher. Explain the following content in simple, clear language as a short ${style} that an average learner can easily understand. Keep it concise (3-6 short paragraphs). Use simple words, examples, and analogies if helpful. Do NOT include extra meta commentary or headings. Return only the explanation text in ${targetLang}.`;

    const chatResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text }
      ],
      temperature: 0.6,
      max_tokens: 800,
    });

    const explanation = (chatResp.choices?.[0]?.message?.content || "").trim();
    if (!explanation) {
      return res.status(500).json({ error: "Model did not return an explanation." });
    }

    // 2) Generate TTS audio for the explanation
    // Note: We request TTS of the explanation. If the model returned text in targetLang,
    // TTS will attempt to speak that text. Voice/language availability may vary.
    const ttsResp = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy", // change if you want different voice
      input: explanation,
    });

    // Convert TTS response to a Buffer then to base64
    const audioArrayBuffer = await ttsResp.arrayBuffer();
    const audioBuffer = Buffer.from(await audioArrayBuffer);
    const audioBase64 = audioBuffer.toString("base64");

    // Return both explanation text and base64 audio
    res.json({
      result: {
        text: explanation,
        audio: audioBase64,
      },
    });
  } catch (err) {
    console.error("❌ Explain error:", err);
    res.status(500).json({ error: err.message });
  }
});

// === Generate Similar Questions ===
router.post("/similar", async (req, res) => {
  try {
    const { text } = req.body;
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Given a question, generate 3 to 5 similar practice questions without answers." },
        { role: "user", content: text }
      ],
    });
    res.json({ result: response.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Translation ===
router.post("/translate", async (req, res) => {
  try {
    const { text, targetLang } = req.body;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful translator. Translate the following text into ${targetLang}. Return only the translated text without explanations.`
        },
        { role: "user", content: text }
      ],
    });

    res.json({ result: response.choices[0].message.content });
  } catch (err) {
    console.error("❌ Translation error:", err);
    res.status(500).json({ error: err.message });
  }
});
// === Text-to-Speech ===
router.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;

    const response = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",  // options: alloy, verse, coral, sage
      input: text,
    });

    // Convert response to audio buffer
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audioBuffer);
  } catch (err) {
    console.error("❌ TTS error:", err);
    res.status(500).json({ error: err.message });
  }
});
// === AI-Powered Book Recommendations with OpenLibrary cover lookup ===
router.post("/recommend-books", async (req, res) => {
  try {
    const { text = "", maxResults = 6 } = req.body;
    if (!text || !text.trim()) return res.json({ result: [] });

    console.log(">>> AI Book Recommendation - starting");

    // Build prompt for OpenAI
    const prompt = `
You are an educational book recommender for parents and learners.
Based on the following text, suggest up to ${maxResults} relevant books.
For each book return JSON with: title, authors (array), description (short), reason (1 line).
Return STRICT JSON array only.

Text:
"""${text.slice(0, 1000)}"""
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful book recommendation assistant." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    let raw = completion.choices?.[0]?.message?.content || "[]";
    let booksArr = [];

    // Try to parse JSON from the model output
    try {
      booksArr = JSON.parse(raw);
    } catch (err) {
      console.warn("AI output not strict JSON. Attempting to extract JSON array...");
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          booksArr = JSON.parse(match[0]);
        } catch (e) {
          console.error("Failed to parse extracted JSON:", e);
          booksArr = [];
        }
      } else {
        booksArr = [];
      }
    }

    if (!Array.isArray(booksArr)) booksArr = [];

    // Normalize shape
    const normalized = booksArr.slice(0, Math.min(Number(maxResults) || 6, 20)).map((b) => ({
      title: (b.title || "").trim(),
      authors: Array.isArray(b.authors) ? b.authors : (b.authors ? [b.authors] : []),
      description: b.description || b.reason || "",
      reason: b.reason || "",
      thumbnail: null, // will attempt to fill below
      infoLink: b.infoLink || null,
    }));

    // Helper: try OpenLibrary to find a cover id by title+author
    const findOpenLibraryCover = async (title, authors = []) => {
      try {
        const q = encodeURIComponent(`${title} ${authors.join(" ")}`.trim());
        const url = `https://openlibrary.org/search.json?q=${q}&limit=1`;
        const r = await fetch(url);
        if (!r.ok) return null;
        const j = await r.json();
        if (Array.isArray(j.docs) && j.docs.length > 0 && j.docs[0].cover_i) {
          return `https://covers.openlibrary.org/b/id/${j.docs[0].cover_i}-M.jpg`;
        }
        return null;
      } catch (err) {
        console.warn("OpenLibrary cover lookup error:", err);
        return null;
      }
    };

    // For each normalized book, try to get a thumbnail from OpenLibrary in parallel
    const withCovers = await Promise.all(
      normalized.map(async (bk) => {
        if (!bk.title) return { ...bk, thumbnail: null };
        const cover = await findOpenLibraryCover(bk.title, bk.authors || []);
        return { ...bk, thumbnail: cover || null };
      })
    );

    // Final result: keep thumbnail null if not found (frontend will use placeholder)
    console.log(`>>> /recommend-books returning ${withCovers.length} items (covers attempted)`);
    res.json({ result: withCovers });
  } catch (err) {
    console.error("recommend-books error:", err);
    res.status(500).json({ error: "Failed to generate book suggestions" });
  }
});





// === Flashcards Quiz Mode ===
// === Flashcards Quiz Mode (JSON output) ===
router.post("/flashcards", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "⚠️ Please provide some input text." });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a flashcard quiz generator. From the given text, create EXACTLY 10 flashcards in JSON array format. " +
            "Each object must have this structure:\n" +
            "{ \"type\": \"mcq\" | \"fill\" | \"qa\", \"question\": string, \"options\"?: string[], \"answer\": string }\n\n" +
            "Rules:\n- For MCQs include 4 options, one correct.\n- For Fill cards, use a blank '_____' in the question.\n- For QA, use short simple answers.\n" +
            "⚠️ Return ONLY valid JSON array. No markdown, no explanations."
        },
        { role: "user", content: text },
      ],
      temperature: 0.7,
    });

    let parsed;
    try {
      parsed = JSON.parse(response.choices[0].message.content);
    } catch (err) {
      console.error("❌ Could not parse JSON:", response.choices[0].message.content);
      return res.status(500).json({ error: "Invalid JSON from model" });
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return res.status(500).json({ error: "Model did not return flashcards" });
    }

    res.json({ result: parsed.slice(0, 10) });
  } catch (err) {
    console.error("❌ Flashcards API error:", err);
    res.status(500).json({ error: err.message });
  }
});

// === Math Tutor (clean output) ===
router.post("/math-tutor", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "⚠️ Please provide a math problem." });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a math tutor. Solve the problem step by step in plain text, NOT LaTeX. " +
            "Format like this:\n\n" +
            "Step 1: ...\nStep 2: ...\nFinal Answer: ...\n\n" +
            "Then give 2 practice problems of the same type (without solutions).\n" +
            "⚠️ Do not use LaTeX, markdown, or headings. Keep it very simple."
        },
        { role: "user", content: text },
      ],
      temperature: 0.3,
    });

    res.json({ result: response.choices[0].message.content.trim() });
  } catch (err) {
    console.error("❌ Math tutor error:", err);
    res.status(500).json({ error: err.message });
  }
});

// === Math Tutor: Generate Similar Questions ===
router.post("/math-similar", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "⚠️ Please provide a math problem." });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a math practice generator. From the given math problem, generate 5 similar problems of the same type. " +
            "Only return the problems, numbered 1 to 5. Do not include solutions, explanations, or extra text."
        },
        { role: "user", content: text },
      ],
      temperature: 0.7,
    });

    res.json({ result: response.choices[0].message.content.trim() });
  } catch (err) {
    console.error("❌ Math similar error:", err);
    res.status(500).json({ error: err.message });
  }
});

// === Ask Anything ===
router.post("/ask-anything", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "⚠️ Please enter a question or upload an image." });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant. Answer questions clearly, concisely, and in plain text. " +
            "Do not use LaTeX or markdown headings unless necessary."
        },
        { role: "user", content: text },
      ],
      temperature: 0.6,
    });

    res.json({ result: response.choices[0].message.content.trim() });
  } catch (err) {
    console.error("❌ Ask Anything error:", err);
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;

