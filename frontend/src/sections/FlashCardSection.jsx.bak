// src/sections/FlashCardSection.jsx
import { useState, useRef } from "react";

export default function FlashCardSection() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [flashcards, setFlashcards] = useState([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState("");
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const fileInputRef = useRef(null);

  function AnimatedButton({ onClick, children, disabled = false, className = "", style = {} }) {
    const [anim, setAnim] = useState(false);
    const handle = async (e) => {
      if (disabled) return;
      setAnim(true);
      try {
        await onClick?.(e);
      } finally {
        setTimeout(() => setAnim(false), 180);
      }
    };
    return (
      <button
        onClick={handle}
        disabled={disabled}
        className={className}
        style={{
          transform: anim ? "translateY(-3px) scale(1.02)" : "none",
          transition: "transform .18s ease, box-shadow .18s ease, opacity .12s",
          boxShadow: "0 6px 18px rgba(2,55,20,0.08)",
          padding: "8px 12px",
          borderRadius: 10,
          fontWeight: 800,
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          background: className.includes("danger")
            ? "linear-gradient(90deg,#ff5e5e,#ff7b7b)"
            : className.includes("secondary")
            ? "linear-gradient(90deg,#139f31,#7dcb85)"
            : "linear-gradient(90deg,#0e682f,#1f8a46)",
          color: className.includes("secondary") ? "#082b18" : "#fff",
          ...style,
        }}
      >
        {children}
      </button>
    );
  }

  // === Analyze Image ===
  const analyzeImage = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:4000/api/learning/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setText(data.result || "");
    } catch (err) {
      console.error("Analyze failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadOrAnalyze = async () => {
    if (!file) {
      fileInputRef.current?.click();
      return;
    }
    await analyzeImage();
  };

  // === Generate Flashcards ===
  const handleGenerate = async () => {
    if (!text.trim()) {
      alert("⚠️ Please enter or upload text first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/learning/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (Array.isArray(data.result) && data.result.length > 0) {
        setFlashcards(data.result);
        setCurrent(0);
        setScore(0);
        setSelected("");
        setAnswered(false);
        setCompleted(false);
      } else {
        alert("⚠️ No flashcards generated. Try again with different input.");
        setFlashcards([]);
      }
    } catch (err) {
      console.error("❌ Flashcard fetch failed:", err);
      setFlashcards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (choice) => {
    if (!choice || !choice.trim()) {
      alert("⚠️ Please select or enter an answer.");
      return;
    }

    setSelected(choice);
    setAnswered(true);

    if (
      choice.trim().toLowerCase() ===
      flashcards[current].answer.trim().toLowerCase()
    ) {
      setScore((s) => s + 1);
    }
  };

  const nextCard = () => {
    if (current < flashcards.length - 1) {
      setCurrent((c) => c + 1);
      setSelected("");
      setAnswered(false);
    } else {
      setCompleted(true);
    }
  };

  // === Quit Quiz (no confirm) ===
  const quitQuiz = () => {
    setFlashcards([]);
    setCurrent(0);
    setScore(0);
    setSelected("");
    setAnswered(false);
    setCompleted(false);
  };

  const clearAll = () => {
    setText("");
    setFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    setFlashcards([]);
    setCurrent(0);
    setScore(0);
    setSelected("");
    setAnswered(false);
    setCompleted(false);
  };

  const onFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);
  };

  return (
    <div className="translator-container" style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <h2 className="translator-title">🃏 Flashcard Quiz</h2>

      {/* Input area with image preview bottom-left */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <textarea
          className="translator-textarea"
          rows="5"
          placeholder="Paste text here or upload an image..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{
            width: "100%",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            padding: 12,
            minHeight: 120,
            resize: "vertical",
            boxSizing: "border-box",
            fontSize: 15,
          }}
        />

        {preview && (
          <div
            style={{
              position: "absolute",
              left: 12,
              bottom: 12,
              background: "rgba(255,255,255,0.98)",
              padding: 6,
              borderRadius: 8,
              boxShadow: "0 6px 18px rgba(2,55,20,0.06)",
              display: "inline-flex",
              alignItems: "flex-start",
              zIndex: 8,
            }}
          >
            <img
              src={preview}
              alt="preview"
              style={{ maxWidth: 150, maxHeight: 96, objectFit: "cover", borderRadius: 6 }}
            />
            <button
              onClick={() => {
                setFile(null);
                if (preview) {
                  URL.revokeObjectURL(preview);
                  setPreview(null);
                }
              }}
              title="Remove image"
              style={{
                marginLeft: 8,
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                width: 30,
                height: 30,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ✖
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      <div style={{ margin: "10px 0", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <AnimatedButton onClick={handleUploadOrAnalyze} className="primary" disabled={loading}>
          {loading ? (file ? "Analyzing..." : "Uploading...") : file ? "📸 Analyze" : "📂 Upload"}
        </AnimatedButton>

        <AnimatedButton onClick={clearAll} className="danger" >
          ❌ Clear
        </AnimatedButton>

        <AnimatedButton onClick={handleGenerate} className="primary" disabled={loading}>
          {loading ? "Generating..." : "Generate Quiz (10 Cards)"}
        </AnimatedButton>
      </div>

      {/* Quiz Section */}
      {Array.isArray(flashcards) && flashcards.length > 0 && !completed && (
        <div className="quiz-container" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Card {current + 1} / {flashcards.length}</h3>
            <AnimatedButton onClick={quitQuiz} className="danger" style={{ padding: "6px 10px" }}>
              Quit Quiz
            </AnimatedButton>
          </div>

          <p style={{ marginTop: 8 }}><strong>{flashcards[current].question}</strong></p>

          {/* MCQ */}
          {flashcards[current].type === "mcq" && (
            <div>
              {flashcards[current].options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => !answered && handleAnswer(opt)}
                  disabled={answered}
                  style={{
                    display: "block",
                    margin: "8px 0",
                    padding: "10px 12px",
                    width: "100%",
                    textAlign: "left",
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.06)",
                    background: answered
                      ? (opt === flashcards[current].answer ? "#d1fae5" : opt === selected ? "#fee2e2" : "#fff")
                      : "#fff",
                    cursor: answered ? "default" : "pointer",
                    fontWeight: 700,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Fill/QA */}
          {(flashcards[current].type === "fill" || flashcards[current].type === "qa") && (
            <div style={{ marginTop: 8 }}>
              {!answered ? (
                <input
                  type="text"
                  placeholder="Type your answer..."
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  style={{ padding: "8px 10px", width: "100%", borderRadius: 8, border: "1px solid #d1d5db" }}
                />
              ) : (
                <div style={{ marginTop: 8 }}>
                  {selected.trim().toLowerCase() === flashcards[current].answer.trim().toLowerCase() ? (
                    <p>✅ Correct!</p>
                  ) : (
                    <p>❌ Your Answer: <strong>{selected}</strong><br/>✅ Correct Answer: <strong>{flashcards[current].answer}</strong></p>
                  )}
                </div>
              )}

              {!answered && (
                <AnimatedButton onClick={() => handleAnswer(selected)} className="secondary" style={{ marginTop: 10 }}>
                  Submit
                </AnimatedButton>
              )}
            </div>
          )}

          {/* Next */}
          {answered && (
            <AnimatedButton onClick={nextCard} className="primary" style={{ marginTop: 12 }}>
              {current === flashcards.length - 1 ? "Finish Quiz" : "Next ➡"}
            </AnimatedButton>
          )}
        </div>
      )}

      {/* Final Score */}
      {completed && (
        <div style={{ marginTop: 20 }}>
          <h3>🎉 Quiz Completed!</h3>
          <p>Your Score: {score} / {flashcards.length}</p>
          <div style={{ marginTop: 12 }}>
            <AnimatedButton
              onClick={() => {
                setFlashcards([]);
                setCompleted(false);
                setCurrent(0);
                setScore(0);
                setSelected("");
                setAnswered(false);
              }}
              className="primary"
            >
              OK
            </AnimatedButton>
          </div>
        </div>
      )}
    </div>
  );
}
