// backend/routes/aiTutor.js
const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  const { question } = req.body;

  if (!question) return res.status(400).json({ error: "Question is required" });

  // 🔹 MOCK answer (replace with real OpenAI API call if needed)
  const mockAnswers = [
    "That’s an excellent question! Let’s break it down step by step.",
    "Good observation! Here’s a simple explanation you can follow.",
    "Think of it like this… (mock AI response).",
  ];
  const answer = mockAnswers[Math.floor(Math.random() * mockAnswers.length)];

  res.json({ question, answer });
});

module.exports = router;
