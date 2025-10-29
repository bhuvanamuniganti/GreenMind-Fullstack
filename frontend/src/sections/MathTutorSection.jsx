// src/sections/MathTutorSection.jsx
import { API_BASE } from "../api";
import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";

export default function MathTutorSection() {
  const [text, setText] = useState("");
  const [problemFile, setProblemFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // Teacher pattern inputs + preview
  const [teacherPatternText, setTeacherPatternText] = useState("");
  const [teacherPatternFile, setTeacherPatternFile] = useState(null);
  const [teacherPatternPreview, setTeacherPatternPreview] = useState(null);

  // Separate outputs / loadings
  const [quickSolution, setQuickSolution] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);

  const [teacherSolution, setTeacherSolution] = useState("");
  const [teacherLoading, setTeacherLoading] = useState(false);

  const [altSolution, setAltSolution] = useState("");
  const [altLoading, setAltLoading] = useState(false);

  const [similar, setSimilar] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const fileInputRef = useRef(null);
  const patternFileRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (preview) URL.revokeObjectURL(preview);
      if (teacherPatternPreview) URL.revokeObjectURL(teacherPatternPreview);
    };
  }, [preview, teacherPatternPreview]);

  // Reusable button (keeps animation)
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
    const animStyle = anim ? { transform: "scale(0.98)", transition: "transform 140ms ease-out" } : { transform: "scale(1)", transition: "transform 160ms ease-out" };
    const disabledStyle = disabled ? { opacity: 0.55, cursor: "not-allowed" } : {};
    return (
      <button onClick={handle} disabled={disabled} className={`translator-btn ${className}`} style={{ ...animStyle, ...disabledStyle, ...style }}>
        {children}
      </button>
    );
  }

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

  // === Problem OCR analyze (uses new math-only route) ===
  const analyzeProblemImage = async () => {
    if (!problemFile) return;
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", problemFile);
      const res = await fetch(`${API_BASE}/api/learning/analyze-math`, {
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

  // === Quick Solve (placed beside upload/analyze) - alternative-mode quick answer
  const handleQuickSolve = async () => {
    if (!text.trim()) {
      alert("⚠️ Please enter or upload a math problem first.");
      return;
    }
    setQuickLoading(true);
    setQuickSolution("");
    try {
      const res = await fetch(`${API_BASE}/api/learning/math-tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode: "alternative" }),
      });
      const data = await res.json();
      setQuickSolution(data.result || "⚠️ No quick solution generated.");
      // Scroll to quick result on small screens
      setTimeout(() => {
        const el = document.getElementById("quick-solution-anchor");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } catch (err) {
      console.error("❌ Quick solve failed:", err);
      setQuickSolution("⚠️ Error generating quick solution.");
    } finally {
      setQuickLoading(false);
    }
  };

  // === Teacher-pattern OCR (reload) - extracts pattern text from uploaded image ===
  const analyzeTeacherPatternImage = async () => {
    if (!teacherPatternFile) return;
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", teacherPatternFile);
      const res = await fetch(`${API_BASE}/api/learning/analyze-math`, { method: "POST", body: formData });
      const data = await res.json();
      if (!mountedRef.current) return;
      if (data.result) setTeacherPatternText((prev) => (prev ? `${prev}\n${data.result}`.trim() : data.result));
    } catch (err) {
      console.error("❌ Pattern OCR failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  // === Solve Teacher method (separate) ===
  const handleSolveTeacher = async () => {
    if (!text.trim()) { alert("Enter or upload a math problem first."); return; }
    if (!teacherPatternText.trim() && !teacherPatternFile) { alert("Provide teacher pattern text or image."); return; }

    setTeacherLoading(true);
    setTeacherSolution("");
    try {
      if (teacherPatternFile) {
        const formData = new FormData();
        formData.append("text", text);
        formData.append("mode", "teacher");
        formData.append("file", teacherPatternFile);
        if (teacherPatternText) formData.append("teacherPattern", teacherPatternText);
        const res = await fetch(`${API_BASE}/api/learning/math-tutor`, { method: "POST", body: formData });
        const data = await res.json();
        setTeacherSolution(data.result || "⚠️ No solution generated (teacher).");
      } else {
        const res = await fetch(`${API_BASE}/api/learning/math-tutor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, mode: "teacher", teacherPattern: teacherPatternText }),
        });
        const data = await res.json();
        setTeacherSolution(data.result || "⚠️ No solution generated (teacher).");
      }
      setTimeout(() => {
        const el = document.getElementById("teacher-solution-anchor");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } catch (err) {
      console.error("❌ Teacher solve failed:", err);
      setTeacherSolution("⚠️ Error solving the problem (teacher).");
    }
    setTeacherLoading(false);
  };

  // === Solve Alternative method (separate) ===
  const handleSolveAlt = async () => {
    if (!text.trim()) { alert("Enter or upload a math problem first."); return; }

    setAltLoading(true);
    setAltSolution("");
    try {
      const res = await fetch(`${API_BASE}/api/learning/math-tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode: "alternative", teacherPattern: teacherPatternText || undefined }),
      });
      const data = await res.json();
      setAltSolution(data.result || "⚠️ No alternative solution generated.");
      setTimeout(() => {
        const el = document.getElementById("alt-solution-anchor");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } catch (err) {
      console.error("❌ Alternative solve failed:", err);
      setAltSolution("⚠️ Error generating alternative method.");
    }
    setAltLoading(false);
  };

  // Similar Questions
  const handleSimilar = async () => {
    if (!text.trim()) { alert("Enter or upload a math problem first."); return; }
    try {
      const res = await fetch(`${API_BASE}/api/learning/math-similar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setSimilar(data.result || "");
    } catch (err) {
      console.error("❌ Math similar fetch failed:", err);
      setSimilar("⚠️ Error generating similar questions.");
    }
  };

  const clearAll = () => {
    setText(""); setProblemFile(null);
    if (preview) { URL.revokeObjectURL(preview); setPreview(null); }
    setTeacherPatternFile(null); setTeacherPatternText(""); if (teacherPatternPreview) { URL.revokeObjectURL(teacherPatternPreview); setTeacherPatternPreview(null); }
    setQuickSolution(""); setTeacherSolution(""); setAltSolution(""); setSimilar("");
  };

  const handleProblemFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setProblemFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const removeProblemFile = () => {
    setProblemFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    // also clear any text extracted earlier? (optional)
    // setText("");
  };

  const handlePatternFileChange = (e) => {
    const f = e.target.files?.[0];
    setTeacherPatternFile(f || null);
    if (teacherPatternPreview) URL.revokeObjectURL(teacherPatternPreview);
    if (f) setTeacherPatternPreview(URL.createObjectURL(f));
  };

  const removeTeacherPatternFile = () => {
    setTeacherPatternFile(null);
    if (teacherPatternPreview) { URL.revokeObjectURL(teacherPatternPreview); setTeacherPatternPreview(null); }
  };

  const canAnalyze = !!problemFile && !analyzing;

  // styles for distinctive buttons (can adjust hexs to taste)
  const styles = {
    upload: { background: "#2E8B57", color: "#fff" },        // sea green
    analyze: { background: "#20B2AA", color: "#fff" },       // light sea green / teal
    solve: { background: "#6a5acd", color: "#fff" },         // slate blue / purple
    clear: { background: "#e74c3c", color: "#fff" },         // red
    teacher: { background: "#1e90ff", color: "#fff" },       // dodger blue
    alternative: { background: "#ff8c42", color: "#fff" },   // orange
    similarBtn: { background: "#16a085", color: "#fff" },    // green-teal
    download: { background: "#2e7d32", color: "#fff" },      // darker green
  };

  return (
    <div className="translator-container" style={{ padding: 16 }}>
      <style>{`
        /* Responsive layout tweaks */
        .top-controls { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
        .file-column { display:flex; gap:12px; align-items:center; flex-wrap:wrap; width:100%; }
        .left-area { flex:1 1 320px; min-width:220px; }
        .right-area { flex: 0 0 auto; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .translator-textarea { width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #ddd; resize:vertical; min-height:88px;}
        .translator-btn { padding:10px 14px; border-radius:10px; border: none; cursor:pointer; font-weight:600; box-shadow:0 6px 14px rgba(0,0,0,0.08); }
        .translator-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .ai-output { margin-top:16px; }
        .scroll-box { max-height:320px; overflow:auto; background:#fff; border-radius:8px; padding:12px; border:1px solid #eee; }
        .thumb-wrap { display:flex; gap:12px; align-items:flex-start; margin-top:8px; }
        .thumb-img { width:140px; height:100px; object-fit:cover; border-radius:6px; border:1px solid #ddd; }
        @media (max-width:720px) {
          .right-area { width:100%; justify-content:flex-start; }
          .left-area { flex-basis: 100%; }
        }
      `}</style>

      <h2 className="translator-title" style={{ marginBottom: 12 }}>📐 Math Tutor</h2>

      {/* Problem textarea */}
      <div style={{ marginBottom: 12 }}>
        <textarea
          className="translator-textarea"
          rows="4"
          placeholder="Type a math problem (e.g., Solve 2x + 5 = 15)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      {/* Row: Upload | Analyze | Solve | Clear  (Solve placed beside Upload+Analyze) */}
      <div className="top-controls" style={{ marginBottom: 12 }}>
        <div className="file-column left-area">
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }} className="translator-btn" title="Upload problem image">
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleProblemFileChange} ref={fileInputRef} />
            <span style={{ display: "inline-block", padding: "6px 8px", borderRadius: 6, ...styles.upload }}>📂 Upload Image</span>
          </label>

          <AnimatedButton onClick={analyzeProblemImage} className="translator-btn" disabled={!canAnalyze} style={{ ...styles.analyze }}>
            {analyzing ? "Analyzing..." : "📸 Analyze"}
          </AnimatedButton>

          <AnimatedButton onClick={handleQuickSolve} className="translator-btn" disabled={quickLoading} style={{ ...styles.solve }}>
            {quickLoading ? "Solving..." : "⚡ Quick Solve"}
          </AnimatedButton>

          <AnimatedButton onClick={clearAll} className="translator-btn" style={{ ...styles.clear }}>
            ❌ Clear
          </AnimatedButton>

          {/* Problem image thumbnail + controls (left-down of input area) */}
          {preview && (
            <div className="thumb-wrap" style={{ marginTop: 6 }}>
              <img src={preview} alt="problem preview" className="thumb-img" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={removeProblemFile} className="translator-btn" style={{ ...styles.clear, padding: "6px 8px" }}>Close</button>
                  <button onClick={analyzeProblemImage} className="translator-btn" style={{ ...styles.analyze, padding: "6px 8px" }}>{analyzing ? "OCR…" : "Reload (OCR)"}</button>
                </div>
                <small style={{ color: "#666" }}>Uploaded problem image</small>
              </div>
            </div>
          )}
        </div>

       
      </div>

      {/* Quick Solution area - appears immediately below input and above teacher pattern */}
      <div id="quick-solution-anchor" style={{ marginBottom: 14 }}>
        <div className="ai-output">
          <h4 style={{ margin: "6px 0 10px 0" }}>🔎 Quick Solution</h4>
          <div className="scroll-box" style={{ minHeight: 72 }}>
            {quickLoading ? <p>Solving…</p> : quickSolution ? quickSolution.split("\n").map((l, i) => <p key={i} style={{ margin: "6px 0" }}>{l}</p>) : <p style={{ color: "#999" }}>No quick solution yet. Use Quick Solve to get a fast solution (alternative method).</p>}
          </div>
          {quickSolution && <AnimatedButton onClick={() => downloadPDF("Quick Solution", quickSolution)} className="translator-btn" style={{ marginTop: 8, ...styles.download }}>⬇ Download Quick PDF</AnimatedButton>}
        </div>
      </div>

    {/* Teacher pattern section */}
<div style={{ marginTop: 4 }}>
  <h4 style={{ marginBottom: 8 }}>📘 Teacher's Pattern (paste text or upload image)</h4>
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {/* Textarea for teacher pattern text */}
    <textarea
      placeholder="Paste teacher's pattern steps here (optional)"
      rows="3"
      value={teacherPatternText}
      onChange={(e) => setTeacherPatternText(e.target.value)}
      style={{
        flex: 1,
        padding: 8,
        borderRadius: 6,
        border: "1px solid #ccc",
        minWidth: 160,
      }}
    />

    {/* Upload pattern image area */}
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
      {/* Hidden input */}
      <input
        type="file"
        accept="image/*"
        onChange={handlePatternFileChange}
        ref={patternFileRef}
        id="pattern-upload"
        style={{ display: "none" }}
      />

      {/* Styled upload button */}
      <label
        htmlFor="pattern-upload"
        className="translator-btn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          background: "#2E8B57",
          color: "#fff",
          padding: "8px 12px",
          borderRadius: 10,
          boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
          fontWeight: 600,
        }}
      >
        📂 Upload Pattern Image
      </label>

      {/* Preview of uploaded teacher pattern */}
      {teacherPatternPreview && (
        <div style={{ marginTop: 6 }}>
          <img
            src={teacherPatternPreview}
            alt="pattern preview"
            style={{
              width: 140,
              height: 100,
              objectFit: "cover",
              borderRadius: 6,
              border: "1px solid #ddd",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              onClick={removeTeacherPatternFile}
              className="translator-btn"
              style={{ ...styles.clear, padding: "6px 8px" }}
            >
              Close
            </button>
            <button
              onClick={analyzeTeacherPatternImage}
              className="translator-btn"
              style={{ ...styles.teacher, padding: "6px 8px" }}
            >
              {analyzing ? "OCR…" : "Reload (OCR)"}
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
</div>


      {/* Action buttons: Follow Teacher's Method / Alternative / Similar */}
      <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        <AnimatedButton onClick={handleSolveTeacher} className="translator-btn" disabled={teacherLoading} style={{ ...styles.teacher }}>
          {teacherLoading ? "Solving (teacher)..." : "Follow Teacher's Method"}
        </AnimatedButton>

        <AnimatedButton onClick={handleSolveAlt} className="translator-btn" disabled={altLoading} style={{ ...styles.alternative }}>
          {altLoading ? "Solving (alternative)..." : "Alternative Method"}
        </AnimatedButton>

        <AnimatedButton onClick={handleSimilar} className="translator-btn" style={{ ...styles.similarBtn }}>
          🔄 Similar Questions
        </AnimatedButton>
      </div>

      {/* Teacher solution (always above alternative) */}
      <div id="teacher-solution-anchor" style={{ marginTop: 18 }}>
        <div className="ai-output">
          <h4>📊 Step-by-Step Solution (Teacher's Method)</h4>
          <div className="scroll-box" style={{ padding: 12, border: "1px solid #eee", borderRadius: 6, minHeight: 80 }}>
            {teacherLoading ? <p>Solving (teacher)...</p> : (teacherSolution ? teacherSolution.split("\n").map((l,i)=>(<p key={i}>{l}</p>)) : <p style={{ color: "#999" }}>⚠️ No teacher solution generated. Click "Follow Teacher's Method".</p>)}
          </div>
          {teacherSolution && <AnimatedButton onClick={() => downloadPDF("Math Solution (Teacher)", teacherSolution)} className="translator-btn" style={{ marginTop: 8, ...styles.download }}>⬇ Download Solution PDF</AnimatedButton>}
        </div>
      </div>

      {/* Alternative solution (below teacher) */}
      <div id="alt-solution-anchor" style={{ marginTop: 18 }}>
        <div className="ai-output">
          <h4>🔁 Alternative Method</h4>
          <div className="scroll-box" style={{ padding: 12, border: "1px solid #eee", borderRadius: 6, minHeight: 80 }}>
            {altLoading ? <p>Solving (alternative)...</p> : (altSolution ? altSolution.split("\n").map((l,i)=>(<p key={i}>{l}</p>)) : <p style={{ color: "#999" }}>⚠️ No alternative solution generated. Click "Alternative Method".</p>)}
          </div>
          {altSolution && <AnimatedButton onClick={() => downloadPDF("Math Solution (Alternative)", altSolution)} className="translator-btn" style={{ marginTop: 8, ...styles.download }}>⬇ Download Alternative PDF</AnimatedButton>}
        </div>
      </div>

      {/* Similar questions */}
      {similar && (
        <div style={{ marginTop: 18 }}>
          <h4>🔄 Similar Practice Problems</h4>
          <div className="scroll-box" style={{ padding: 12, border: "1px solid #eee", borderRadius: 6 }}>
            {similar.split("\n").map((line, i) => <p key={i}>{line}</p>)}
          </div>
          <AnimatedButton onClick={() => downloadPDF("Similar Questions", similar)} className="translator-btn" style={{ marginTop: 8, ...styles.download }}>⬇ Download Questions PDF</AnimatedButton>
        </div>
      )}
    </div>
  );
}
