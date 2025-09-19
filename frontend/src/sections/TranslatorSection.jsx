import { useState, useRef } from "react";
import { API_BASE } from '../api';

export default function TranslatorSection() {
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState("");
  const [lang, setLang] = useState("Hindi");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const audioRef = useRef(null);

  // === API Calls ===
  const callAPI = async (endpoint, setter) => {
    if (file && endpoint === "analyze") {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${API_BASE}/api/learning/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      setText(data.result);
    } else {
      const res = await fetch(
        `${API_BASE}/api/learning/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, targetLang: lang }),
        }
      );
      const data = await res.json();
      setter(data.result);
    }
  };

  // === Translate ===
  const handleTranslate = async () => {
    setLoading(true);
    await callAPI("translate", setTranslated);
    setLoading(false);
  };

  // === Play Audio ===
  const playAudio = async (content) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/learning/tts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content }),
        }
      );

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      audioRef.current = new Audio(url);
      audioRef.current.play();
    } catch (err) {
      console.error("Audio play error:", err);
    }
  };

  // === Pause Audio ===
  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  // === Stop Audio ===
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // === Download Audio ===
  const downloadAudio = async (content, filename) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/learning/tts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content }),
        }
      );

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "tts_audio.mp3";
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Audio download error:", err);
    }
  };

  // === Clear All ===
  const clearAll = () => {
    setText("");
    setFile(null);
    setPreview(null);
    setTranslated("");
  };

  return (
    <div className="translator-container">
      <h2 className="translator-title">🌍 AI Translator</h2>

      {/* Input Area with preview overlay */}
      <div style={{ position: "relative" }}>
        <textarea
          className="translator-textarea"
          rows="6"
          placeholder="Paste text here or upload an image..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            minHeight: "140px",
            resize: "vertical",
            boxSizing: "border-box",
            background: "#fff",
          }}
        />

        {/* Image Preview (bottom-left inside input area) */}
        {preview && (
          <div
            style={{
              position: "absolute",
              left: "12px",
              bottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              padding: "6px",
              boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
              zIndex: 5,
            }}
          >
            <img
              src={preview}
              alt="preview"
              style={{ width: "90px", height: "66px", objectFit: "cover", borderRadius: "6px" }}
            />
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              style={{
                background: "red",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "22px",
                height: "22px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ✖
            </button>
          </div>
        )}
      </div>


{/* File Upload + Buttons + Language Select + Translate Button */}
{/* File Upload + Buttons + Language Select + Translate Button */}
<div
  className="controls-row"
  style={{
    display: "flex",
    justifyContent: "flex-start", // force left alignment
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    padding: 0,
  }}
>
  <div className="controls-left">
    <label className="translator-btn primary">
      📂 Choose Image
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const selectedFile = e.target.files[0];
          setFile(selectedFile);
          setPreview(URL.createObjectURL(selectedFile));
        }}
      />
    </label>

    <button onClick={() => callAPI("analyze", setText)} className="translator-btn secondary">
      📸 Analyze
    </button>

    <button onClick={clearAll} className="translator-btn danger" style ={{backgroundColor:"Red"}}>
      ❌ Clear
    </button>
  </div>

  <div className="translator-controls">
    <label className="translator-label">Language:</label>
    <select className="translator-select" value={lang} onChange={(e) => setLang(e.target.value)}>
      <option value="Hindi">Hindi</option>
      <option value="Telugu">Telugu</option>
      <option value="Tamil">Tamil</option>
      <option value="Kannada">Kannada</option>
      <option value="Malayalam">Malayalam</option>
    </select>

    <button onClick={handleTranslate} className="translator-btn primary" disabled={loading}>
      {loading ? "Translating..." : "Translate"}
    </button>
  </div>
</div>



      {/* English Audio Always Available */}
      {text && (
        <div className="translator-output">
          <h4>📝 English Input:</h4>
          <p>{text}</p>
          <div>
            <button onClick={() => playAudio(text)} className="translator-btn secondary">▶️ Play</button>
            <button onClick={pauseAudio} className="translator-btn secondary" style={{ backgroundColor: "#ff9800" }}>⏸ Pause</button>
            <button onClick={stopAudio} className="translator-btn secondary" style={{ backgroundColor: "#f44336" }}>⏹ Stop</button>
            <button onClick={() => downloadAudio(text, "English_audio.mp3")} className="translator-btn download">⬇️ Download</button>
          </div>
        </div>
      )}

      {/* Translated Output */}
      {translated && (
        <div className="translator-output">
          <h4>🔄 Translated Output ({lang}):</h4>
          <p>{translated}</p>
          <div>
            <button onClick={() => playAudio(translated)} className="translator-btn secondary">▶️ Play</button>
            <button onClick={pauseAudio} className="translator-btn secondary" style={{ backgroundColor: "#ff9800" }}>⏸ Pause</button>
            <button onClick={stopAudio} className="translator-btn secondary" style={{ backgroundColor: "#f44336" }}>⏹ Stop</button>
            <button onClick={() => downloadAudio(translated, `${lang}_translation.mp3`)} className="translator-btn download">⬇️ Download</button>
          </div>
        </div>
      )}
    </div>
  );
}
