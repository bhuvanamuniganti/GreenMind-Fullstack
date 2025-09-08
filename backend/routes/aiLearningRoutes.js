const express = require("express");
const OpenAI = require("openai");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

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

