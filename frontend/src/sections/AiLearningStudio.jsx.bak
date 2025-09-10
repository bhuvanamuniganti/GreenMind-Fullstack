// src/sections/AiLearningStudio.jsx
import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import "../App.css";

function AiLearningStudio() {
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // separate states for each section
  const [qa, setQa] = useState("");
  const [mcq, setMcq] = useState("");
  const [summary, setSummary] = useState("");
  const [highlight, setHighlight] = useState("");
  const [fillBlanks, setFillBlanks] = useState("");
  const [similar, setSimilar] = useState("");
  const [imageText, setImageText] = useState("");

  const fileInputRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const callAPI = async (endpoint, setter) => {
    try {
      if (file && endpoint === "analyze") {
        const formData = new FormData();
        // IMPORTANT: backend expects 'file' (keeps same as other working sections)
        formData.append("file", file);

        const res = await fetch(`http://localhost:4000/api/learning/analyze`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Analyze failed: ${res.status} ${res.statusText} ${txt}`);
        }

        const data = await res.json();
        if (!mountedRef.current) return;
        setImageText(data.result || "");
        setInput(data.result || "");
      } else {
        const res = await fetch(`http://localhost:4000/api/learning/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: input }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`API ${endpoint} failed: ${res.status} ${res.statusText} ${txt}`);
        }

        const data = await res.json();
        if (!mountedRef.current) return;
        setter(formatOutput(endpoint, data.result));
      }
    } catch (err) {
      console.error("callAPI error:", err);
      // keep behavior minimal—user can inspect console; you can add toast/UI later
      if (endpoint === "analyze") {
        setImageText(`⚠️ Analyze failed: ${err?.message || "Unknown error"}`);
      } else {
        setter(`⚠️ Request failed: ${err?.message || "Unknown error"}`);
      }
    }
  };

  // ✅ Format output nicely for each section
  const formatOutput = (endpoint, text) => {
    if (!text) return "";

    if (endpoint === "qa") {
      let qCount = 1;
      let aCount = 1;
      return text
        .replace(/\*\*Question\s*\d*:\*\*/g, () => `\nQ${qCount++}) `)
        .replace(/\*\*Answer\s*\d*:\*\*/g, () => `\nA${aCount++}) `)
        .trim();
    }

    if (endpoint === "mcq") {
      return "📝 Multiple Choice Questions:\n\n" + text;
    }

    if (endpoint === "fill-blanks") {
      return "✏️ Fill in the Blanks:\n\n" + text;
    }

    if (endpoint === "highlight") {
      return "🔑 Key Terms:\n\n" + text;
    }

    if (endpoint === "similar") {
      return "🔄 Similar Questions:\n\n" + text;
    }

    return text;
  };

  // ✅ PDF download
  const downloadSectionPDF = (title, content) => {
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

  // ✅ Clear everything
  const clearAll = () => {
    setInput("");
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setQa("");
    setMcq("");
    setSummary("");
    setHighlight("");
    setFillBlanks("");
    setSimilar("");
    setImageText("");
  };

  // Handle file selection (keeps your existing behaviour)
  const onFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    // revoke old url if exists
    if (preview) URL.revokeObjectURL(preview);

    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);
  };

  return (
    <div className="ai-container">
      <h2 className="ai-title">AI Learning Studio</h2>

      {/* Input area wrapper: textarea + image overlay bottom-left */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <textarea
          className="ai-input"
          placeholder="Paste text here or upload an image..."
          rows="6"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box" }}
        />

        {/* IMAGE overlay positioned bottom-left inside input area */}
        {preview && (
          <div
            style={{
              position: "absolute",
              left: 12,
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
                // remove image and keep focus on textarea
                setFile(null);
                if (preview) {
                  URL.revokeObjectURL(preview);
                  setPreview(null);
                }
                // focus back to textarea
                setTimeout(() => {
                  const ta = document.querySelector(".ai-input");
                  if (ta) ta.focus();
                }, 30);
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

      {/* File Upload + Buttons */}
      <div style={{ margin: "10px 0", display: "flex", gap: "12px", alignItems: "center" }}>
        {/* Custom styled file input */}
        <label
          style={{
            background: "#4CAF50",
            color: "white",
            padding: "8px 14px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          📂 Choose File
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={onFileChange}
            ref={fileInputRef}
          />
        </label>

        {/* Analyze button - disabled until a file is selected */}
        <button
          onClick={() => callAPI("analyze", setImageText)}
          disabled={!file}
          style={{
            background: file ? "#2196F3" : "#9bbff2",
            color: "white",
            padding: "8px 14px",
            borderRadius: "6px",
            border: "none",
            cursor: file ? "pointer" : "not-allowed",
            fontWeight: "bold",
          }}
          title={file ? "Analyze image" : "Select a file to enable Analyze"}
        >
          📸 Analyze
        </button>

        {/* Styled clear button */}
        <button
          onClick={clearAll}
          style={{
            background: "red",
            color: "white",
            padding: "8px 14px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ❌ Clear
        </button>
      </div>

  
      {/* Action Buttons */}
      <div className="ai-buttons">
        <button onClick={() => callAPI("qa", setQa)}>Q&A</button>
        <button onClick={() => callAPI("fill-blanks", setFillBlanks)}>Fill Blanks</button>
        <button onClick={() => callAPI("mcq", setMcq)}>MCQs</button>
        <button onClick={() => callAPI("summary", setSummary)}>Summarize</button>
        <button onClick={() => callAPI("highlight", setHighlight)}>Key Terms</button>
        <button onClick={() => callAPI("similar", setSimilar)}>Similar Questions</button>
      </div>

      {/* Outputs */}
      {imageText && (
        <div className="ai-output">
          <h4>📸 Extracted Text</h4>
          <div className="scroll-box">{imageText}</div>
          <button onClick={() => downloadSectionPDF("Extracted Text", imageText)}>
            Download Extracted Text
          </button>
        </div>
      )}

      {qa && (
        <div className="ai-output">
          <h4>❓ Q&A</h4>
          <div className="scroll-box">{qa}</div>
          <button onClick={() => downloadSectionPDF("Q&A", qa)}>Download Q&A</button>
        </div>
      )}

      {fillBlanks && (
        <div className="ai-output">
          <h4>✏️ Fill in the Blanks</h4>
          <div className="scroll-box">{fillBlanks}</div>
          <button onClick={() => downloadSectionPDF("Fill Blanks", fillBlanks)}>
            Download Fill Blanks
          </button>
        </div>
      )}

      {mcq && (
        <div className="ai-output">
          <h4>📝 MCQs</h4>
          <div className="scroll-box">{mcq}</div>
          <button onClick={() => downloadSectionPDF("MCQs", mcq)}>Download MCQs</button>
        </div>
      )}

      {summary && (
        <div className="ai-output">
          <h4>📖 Summary</h4>
          <div className="scroll-box">{summary}</div>
          <button onClick={() => downloadSectionPDF("Summary", summary)}>Download Summary</button>
        </div>
      )}

      {highlight && (
        <div className="ai-output">
          <h4>🔑 Key Terms</h4>
          <div className="scroll-box">{highlight}</div>
          <button onClick={() => downloadSectionPDF("Key Terms", highlight)}>
            Download Key Terms
          </button>
        </div>
      )}

      {similar && (
        <div className="ai-output">
          <h4>🔄 Similar Questions</h4>
          <div className="scroll-box">{similar}</div>
          <button onClick={() => downloadSectionPDF("Similar Questions", similar)}>
            Download Similar Questions
          </button>
        </div>
      )}
    </div>
  );
}

export default AiLearningStudio;
