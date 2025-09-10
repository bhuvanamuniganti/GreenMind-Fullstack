// src/sections/MathTutorSection.jsx
import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";

export default function MathTutorSection() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [solution, setSolution] = useState("");
  const [similar, setSimilar] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const fileInputRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Small animated button wrapper to give click feedback
  function AnimatedButton({ onClick, children, className = "", disabled = false, style = {} }) {
    const [anim, setAnim] = useState(false);

    const handle = async (e) => {
      if (disabled) return;
      setAnim(true);
      try {
        await onClick?.(e);
      } finally {
        setTimeout(() => setAnim(false), 160);
      }
    };

    const animStyle = anim
      ? { transform: "scale(0.98)", transition: "transform 140ms ease-out" }
      : { transform: "scale(1)", transition: "transform 160ms ease-out" };

    const disabledStyle = disabled ? { opacity: 0.55, cursor: "not-allowed" } : {};

    return (
      <button
        onClick={handle}
        disabled={disabled}
        className={`translator-btn ${className}`}
        style={{ ...animStyle, ...disabledStyle, ...style }}
      >
        {children}
      </button>
    );
  }

  // === Download PDF ===
  const downloadPDF = (title, content) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const maxWidth = pageWidth - margin * 2;
    const wrappedText = doc.splitTextToSize(content, maxWidth);
    doc.setFontSize(12);
    doc.text(title, margin, 15);
    doc.text(wrappedText, margin, 30);
    doc.save(`${title}.pdf`);
  };

  // === OCR ===
  const analyzeImage = async () => {
    if (!file) return;
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", file); // backend expects "file"
      const res = await fetch("http://localhost:4000/api/learning/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!mountedRef.current) return;
      setText(data.result || "");
    } catch (err) {
      console.error("❌ Analyze error:", err);
      setText((prev) => prev || `⚠️ Analyze failed: ${err?.message || "Unknown error"}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // === Solve Math ===
  const handleSolve = async () => {
    if (!text.trim()) {
      alert("⚠️ Please enter or upload a math problem first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/learning/math-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setSolution(data.result || "⚠️ No solution generated.");
    } catch (err) {
      console.error("❌ Math tutor fetch failed:", err);
      setSolution("⚠️ Error solving the problem.");
    }
    setLoading(false);
  };

  // === Similar Questions ===
  const handleSimilar = async () => {
    if (!text.trim()) {
      alert("⚠️ Please enter or upload a math problem first.");
      return;
    }
    try {
      const res = await fetch("http://localhost:4000/api/learning/math-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setSimilar(data.result || "⚠️ No similar questions generated.");
    } catch (err) {
      console.error("❌ Math similar fetch failed:", err);
      setSimilar("⚠️ Error generating similar questions.");
    }
  };

  // === Clear ===
  const clearAll = () => {
    setText("");
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setSolution("");
    setSimilar("");
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const canAnalyze = !!file && !analyzing;

  return (
    <div className="translator-container">
      <h2 className="translator-title">📐 Math Tutor</h2>

      {/* Input wrapper with image overlay bottom-left */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <textarea
          className="translator-textarea"
          rows="4"
          placeholder="Type a math problem (e.g., Solve 2x + 5 = 15)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box" }}
        />

        {preview && (
          <div
            style={{
              position: "absolute",
              left: 12,   // ⬅️ Changed to bottom-left
              bottom: 12,
              background: "rgba(255,255,255,0.98)",
              padding: 6,
              borderRadius: 8,
              boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
              display: "inline-flex",
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <img
              src={preview}
              alt="preview"
              style={{
                maxWidth: 150,
                maxHeight: 100,
                objectFit: "cover",
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
            <button
              onClick={() => {
                setFile(null);
                if (preview) {
                  URL.revokeObjectURL(preview);
                  setPreview(null);
                }
              }}
              style={{
                marginLeft: 8,
                background: "red",
                color: "white",
                border: "none",
                borderRadius: 6,
                width: 28,
                height: 28,
                cursor: "pointer",
                fontWeight: 700,
              }}
              aria-label="Remove image"
              title="Remove image"
            >
              ✖
            </button>
          </div>
        )}
      </div>

      {/* File Upload + Analyze + Clear */}
      <div style={{ margin: "10px 0", display: "flex", gap: "12px" }}>
        <label className="translator-btn primary">
          📂 Upload Image
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
            ref={fileInputRef}
          />
        </label>

        <AnimatedButton onClick={analyzeImage} className="translator-btn secondary" disabled={!canAnalyze}>
          {analyzing ? "Analyzing..." : "📸 Analyze"}
        </AnimatedButton>

        <AnimatedButton onClick={clearAll} className="translator-btn danger" style ={{backgroundColor:"Red", color:"White"}}>
          ❌ Clear
        </AnimatedButton>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <AnimatedButton onClick={handleSolve} className="translator-btn primary" disabled={loading}>
          {loading ? "Solving..." : "Solve Problem"}
        </AnimatedButton>
        <AnimatedButton onClick={handleSimilar} className="translator-btn secondary">
          🔄 Similar Questions
        </AnimatedButton>
      </div>

      {/* Outputs */}
      {solution && (
        <div className="ai-output">
          <h4>📊 Step-by-Step Solution</h4>
          <div className="scroll-box">
            {solution.split("\n").map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          <AnimatedButton onClick={() => downloadPDF("Math Solution", solution)} className="translator-btn primary">
            ⬇ Download Solution PDF
          </AnimatedButton>
        </div>
      )}

      {similar && (
        <div className="ai-output">
          <h4>🔄 Similar Practice Problems</h4>
          <div className="scroll-box">
            {similar.split("\n").map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          <AnimatedButton onClick={() => downloadPDF("Similar Questions", similar)} className="translator-btn primary">
            ⬇ Download Questions PDF
          </AnimatedButton>
        </div>
      )}
    </div>
  );
}
