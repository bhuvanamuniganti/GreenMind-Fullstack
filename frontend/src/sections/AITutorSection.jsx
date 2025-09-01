import { useState } from "react";
import axios from "axios";

export default function AITutorSection() {
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleAsk() {
    if (!question.trim()) return;
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:4000/api/ai-tutor", { question });
      setChat([...chat, { role: "user", text: question }, { role: "ai", text: res.data.answer }]);
      
      setQuestion("");
    } catch (err) {
      setChat([...chat, { role: "ai", text: "⚠️ Failed to fetch AI response." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass" style={{ padding: 20, maxWidth: 800, margin: "auto" }}>
      <h2>🤖 AI Tutor</h2>
      <p>Ask questions and get instant AI-powered explanations.</p>

      <div style={{ marginBottom: 12 }}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="Type your question here..."
          style={{ width: "100%", padding: 10, borderRadius: 6 }}
        />
        <button className="btn primary" onClick={handleAsk} disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Thinking..." : "Ask AI Tutor"}
        </button>
      </div>

      {/* Chat display */}
      <div style={{ marginTop: 20 }}>
        {chat.map((msg, i) => (
          <div
            key={i}
            style={{
              textAlign: msg.role === "user" ? "right" : "left",
              margin: "6px 0",
            }}
          >
            <span
              style={{
                display: "inline-block",
                background: msg.role === "user" ? "#4CAF50" : "#eee",
                color: msg.role === "user" ? "#fff" : "#000",
                padding: "8px 12px",
                borderRadius: 12,
                maxWidth: "70%",
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      <small style={{ display: "block", marginTop: 20, textAlign: "center", color: "#666" }}>
        ⚡ Powered by OpenAI GPT-4o (mocked for demo)
      </small>
    </div>
    
  );
}
