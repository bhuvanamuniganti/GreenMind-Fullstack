import { useState, useRef, useEffect } from "react";
import { API_BASE } from '../api';

import "./TranslatorSection.css";

export default function TranslatorSection() {
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState("");
  const [lang, setLang] = useState("Hindi");

  // NEW: detected input language
  const [detectedLang, setDetectedLang] = useState("English");

  // split loading flags so only relevant button shows working...
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [explanation, setExplanation] = useState("");
  const [explainAudioUrl, setExplainAudioUrl] = useState(null);

  // books state and loader
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);

  const audioRef = useRef(null);

  // === Helpers ===
  const base64ToBlobUrl = (base64, mime = "audio/mpeg") => {
    try {
      const byteChars = atob(base64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("base64 to blob error:", e);
      return null;
    }
  };

  // NEW: detect language from text using Unicode script ranges (fast, client-side)
  const detectLanguageFromText = (inputText) => {
    if (!inputText || !inputText.trim()) return "English";

    // trim and pick a slice to be faster
    const sample = inputText.trim().slice(0, 400);

    // Unicode regexes for common Indian scripts + Latin
    const patterns = [
      { lang: "Hindi", re: /[\u0900-\u097F]/ }, // Devanagari (Hindi, Marathi, Nepali, etc.)
      { lang: "Telugu", re: /[\u0C00-\u0C7F]/ }, // Telugu
      { lang: "Tamil", re: /[\u0B80-\u0BFF]/ }, // Tamil
      { lang: "Kannada", re: /[\u0C80-\u0CFF]/ }, // Kannada
      { lang: "Malayalam", re: /[\u0D00-\u0D7F]/ }, // Malayalam
      // You can add more checks here if needed (e.g., Gujarati, Bengali, etc.)
    ];

    for (const p of patterns) {
      if (p.re.test(sample)) return p.lang;
    }

    // If mostly ASCII letters, assume English; otherwise do a simple fallback scan:
    const nonWhitespace = sample.replace(/\s/g, "");
    const asciiLetters = (nonWhitespace.match(/[A-Za-z]/g) || []).length;
    const nonAscii = nonWhitespace.length - asciiLetters;

    // heuristics
    if (asciiLetters > Math.max(5, nonAscii)) return "English";

    // fallback: return English if uncertain
    return "English";
  };

  // === Book recommendations (only called after Analyze) ===
  const fetchRecommendedBooks = async (inputText) => {
    setBooksLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/learning/recommend-books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, maxResults: 6 }),
      });
      const data = await res.json();
      setBooks(Array.isArray(data.result) ? data.result : []);
    } catch (err) {
      console.error("Books fetch error:", err);
      setBooks([]);
    } finally {
      setBooksLoading(false);
    }
  };

  // === API wrappers ===
  // Analyze (image upload)
  const handleAnalyze = async () => {
    if (!file) {
      alert("Please choose an image to analyze.");
      return;
    }
    setAnalyzeLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/learning/analyze`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      // support both formats: { result: "text" } or { result: "text", books: [...] }
      const extracted = (data?.result) || "";
      setText(extracted);

      // NEW: detect language from extracted text
      const detected = detectLanguageFromText(extracted);
      setDetectedLang(detected);

      // If server returned books inline (Option B), use them.
      if (Array.isArray(data?.books) && data.books.length > 0) {
        setBooks(data.books);
      } else {
        // otherwise fetch recommended books using separate endpoint
        if (extracted && extracted.trim()) {
          fetchRecommendedBooks(extracted);
        } else {
          setBooks([]); // no text -> clear suggestions
        }
      }
    } catch (err) {
      console.error("Analyze error:", err);
      alert("Error analyzing image. See console.");
    } finally {
      setAnalyzeLoading(false);
    }
  };

  // Translate (does NOT touch books)
  const handleTranslate = async () => {
    if (!text || !text.trim()) {
      alert("Please enter or analyze some text to translate.");
      return;
    }
    setTranslateLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/learning/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang: lang }),
      });
      const data = await res.json();
      setTranslated(data.result || "");
      // DO NOT clear or overwrite `books`
    } catch (err) {
      console.error("Translate error:", err);
      alert("Translate failed. See console.");
    } finally {
      setTranslateLoading(false);
    }
  };

  // Explain (does NOT touch books)
  const handleExplain = async () => {
    if (!text || !text.trim()) {
      alert("Please enter or analyze some text first.");
      return;
    }
    setExplainLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/learning/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, style: "story", targetLang: lang }),
      });
      const data = await res.json();

      if (data?.result) {
        const { text: explText = "", audio: audioBase64 = null } = data.result;
        setExplanation(explText);

        // cleanup previous audio url
        if (explainAudioUrl) {
          URL.revokeObjectURL(explainAudioUrl);
          setExplainAudioUrl(null);
        }

        if (audioBase64) {
          const url = base64ToBlobUrl(audioBase64, "audio/mpeg");
          if (url) {
            setExplainAudioUrl(url);
            try {
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
              }
              audioRef.current = new Audio(url);
              audioRef.current.play().catch((e) => console.warn("Autoplay blocked:", e));
            } catch (e) {
              console.warn("Audio play error after explain:", e);
            }
          }
        }
      } else {
        alert("No explanation returned from server.");
      }
    } catch (err) {
      console.error("Explain fetch error:", err);
      alert("Error generating explanation. Check console.");
    } finally {
      setExplainLoading(false);
    }
  };

  // === Play / Pause / Stop / Download Audio ===
  const playAudio = async (content) => {
    try {
      const res = await fetch(`${API_BASE}/api/learning/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
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

  const pauseAudio = () => {
    if (audioRef.current) audioRef.current.pause();
  };
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const downloadAudio = async (content, filename) => {
    try {
      const res = await fetch(`${API_BASE}/api/learning/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
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

  // Clear everything (explicit user action)
  const clearAll = () => {
    setText("");
    setFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    setTranslated("");
    setExplanation("");
    setBooks([]);
    setDetectedLang("English"); // reset detected language
    if (explainAudioUrl) {
      URL.revokeObjectURL(explainAudioUrl);
      setExplainAudioUrl(null);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  // keep cleanup on unmount
  useEffect(() => {
    return () => {
      if (explainAudioUrl) URL.revokeObjectURL(explainAudioUrl);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NEW: when user types or pastes text, update detected language live
  const handleTextChange = (val) => {
    setText(val);
    const detected = detectLanguageFromText(val);
    setDetectedLang(detected);
    // don't clear books (user might want to keep suggestions)
    setTranslated("");
    setExplanation("");
  };

  return (
    <div className="translator-container">
      <h2 className="translator-title">🌍 AI Translator</h2>

      <div style={{ position: "relative" }}>
        <textarea
          className="translator-textarea"
          rows="6"
          placeholder="Paste text here or upload an image..."
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
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
            <img src={preview} alt="preview" style={{ width: "90px", height: "66px", objectFit: "cover", borderRadius: "6px" }} />
            <button
              onClick={() => {
                setFile(null);
                if (preview) { URL.revokeObjectURL(preview); setPreview(null); }
                setBooks([]); // explicit: removing image clears suggestions
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

      <div className="controls-row" style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: 0 }}>
        <div className="controls-left">
          <label className="translator-btn choose">
            📂 Choose Image
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const selectedFile = e.target.files[0];
                setFile(selectedFile);
                setPreview(URL.createObjectURL(selectedFile));
                // do not clear books here — user may choose to re-analyze
                setText("");
                setTranslated("");
                setExplanation("");
                setDetectedLang("English"); // reset until analyze returns text
              }}
            />
          </label>

          <button onClick={handleAnalyze} className="translator-btn secondary" disabled={analyzeLoading}>
            {analyzeLoading ? "Working..." : "📸 Analyze"}
          </button>

          <button onClick={handleExplain} className="translator-btn explain" disabled={explainLoading}>
            {explainLoading ? "Working..." : "Explain"}
          </button>
        </div>

        <div className="translator-controls">
          <label className="translator-label">Language:</label>
          <select className="translator-select" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Telugu">Telugu</option>
            <option value="Tamil">Tamil</option>
            <option value="Kannada">Kannada</option>
            <option value="Malayalam">Malayalam</option>
          </select>

          <button onClick={handleTranslate} className="translator-btn primary" disabled={translateLoading}>
            {translateLoading ? "Translating..." : "🔄 Translate"}
          </button>
        </div>

        <button onClick={clearAll} className="translator-btn danger">❌ Clear</button>
      </div>

      {/* English Input */}
      {text && (
        <div className="translator-output">
          <h4>📝 Input ({detectedLang}):</h4>
          <p>{text}</p>
          <div>
            <button onClick={() => playAudio(text)} className="translator-btn play">▶️ Play</button>
            <button onClick={pauseAudio} className="translator-btn pause">⏸ Pause</button>
            <button onClick={stopAudio} className="translator-btn stop">⏹ Stop</button>
            <button onClick={() => downloadAudio(text, "Input_audio.mp3")} className="translator-btn download">⬇️ Download</button>
          </div>
        </div>
      )}

      {/* Translated Output */}
      {translated && (
        <div className="translator-output">
          <h4>🔄 Translated Output ({lang}):</h4>
          <p>{translated}</p>
          <div>
            <button onClick={() => playAudio(translated)} className="translator-btn play">▶️ Play</button>
            <button onClick={pauseAudio} className="translator-btn pause">⏸ Pause</button>
            <button onClick={stopAudio} className="translator-btn stop">⏹ Stop</button>
            <button onClick={() => downloadAudio(translated, `${lang}_translation.mp3`)} className="translator-btn download">⬇️ Download</button>
          </div>
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <div className="translator-output">
          <h4>💡 Explanation ({lang}):</h4>
          <p>{explanation}</p>
          <div>
            <button onClick={() => {
              if (explainAudioUrl) {
                if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                audioRef.current = new Audio(explainAudioUrl);
                audioRef.current.play().catch((e) => console.warn(e));
              } else {
                playAudio(explanation);
              }
            }} className="translator-btn play">▶️ Play</button>

            <button onClick={pauseAudio} className="translator-btn pause">⏸ Pause</button>
            <button onClick={stopAudio} className="translator-btn stop">⏹ Stop</button>

            <button onClick={() => {
              if (explainAudioUrl) {
                const a = document.createElement("a");
                a.href = explainAudioUrl;
                a.download = `${lang}_explanation.mp3`;
                a.click();
              } else {
                downloadAudio(explanation, `${lang}_explanation.mp3`);
              }
            }} className="translator-btn download">⬇️ Download</button>
          </div>
        </div>
      )}

      {/* Book Recommendations */}
      <div style={{ marginTop: 16 }}>
        <h4>📚 Suggested Books</h4>
        {booksLoading && <p>Looking for relevant books...</p>}
        {!booksLoading && books.length === 0 && <p style={{ color: "#666" }}>No suggestions yet — analyze to get recommendations.</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 8 }}>
          {books.map((b, i) => (
            <div key={i} style={{ border: "1px solid #e5e7eb", padding: 10, borderRadius: 8, background: "#fff", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <img src={b.thumbnail || "/book-placeholder.png"} alt={b.title} style={{ width: 64, height: 96, objectFit: "cover", borderRadius: 4 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{b.title}</div>
                <div style={{ fontSize: 13, color: "#444", marginBottom: 6 }}>{(b.authors || []).join(", ")}</div>
                <div style={{ fontSize: 12, color: "#666", height: 40, overflow: "hidden" }}>{b.description || ""}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  {b.infoLink && <a href={b.infoLink} target="_blank" rel="noreferrer" className="translator-btn play" style={{ padding: "6px 8px", fontSize: 13 }}>View</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
