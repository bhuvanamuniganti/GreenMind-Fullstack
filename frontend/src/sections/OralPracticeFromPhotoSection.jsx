import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { API_BASE } from "../api";
import "./OralPracticeFromPhotoSection.css";

/* AnimatedButton (small reusable button) */
function AnimatedButton({ children, onClick, style, disabled }) {
  const [pressed, setPressed] = useState(false);
  const base = {
    borderRadius: 8,
    padding: "8px 12px",
    fontWeight: 700,
    color: "#fff",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    userSelect: "none",
    transition: "transform 140ms cubic-bezier(.2,.9,.3,1), box-shadow 160ms ease, opacity 120ms ease",
    transform: pressed ? "translateY(-2px) scale(0.99)" : "translateY(0) scale(1)",
    boxShadow: pressed ? "0 8px 20px rgba(0,0,0,0.12)" : "0 6px 18px rgba(0,0,0,0.06)",
    outline: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  };
  return (
    <button
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={(e) => { if (!disabled) onClick?.(e); }}
      style={{ ...base, ...style }}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

/* OralRecorder - forwarded ref so parent can control start/stop from outside */
const OralRecorder = forwardRef(function OralRecorder({ onFinalBlob, autoStopAfterMs = null }, ref) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const streamRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const audioUrlRef = useRef(null);
  const audioElRef = useRef(null);
  const autoStopTimerRef = useRef(null);

  async function initAudio() {
    if (streamRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    analyserRef.current = analyser;
    drawWave();
  }

  function drawWave() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx2d = canvas.getContext("2d");
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const loop = () => {
      analyser.getByteTimeDomainData(dataArray);
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      ctx2d.fillStyle = "#f8fafc";
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);

      ctx2d.strokeStyle = "#e5e7eb";
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(0, canvas.height / 2);
      ctx2d.lineTo(canvas.width, canvas.height / 2);
      ctx2d.stroke();

      ctx2d.lineWidth = 2;
      ctx2d.strokeStyle = recording ? "#16a34a" : paused ? "#f59e0b" : "#64748b";
      ctx2d.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
        x += sliceWidth;
      }
      ctx2d.stroke();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  function preferredMime() {
    if (typeof MediaRecorder === "undefined") return "";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) return "audio/ogg;codecs=opus";
    return "";
  }

  function makeRecorder(stream) {
    const mime = preferredMime();
    try {
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const mimeType = preferredMime() || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        try { if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current); } catch {}
        audioUrlRef.current = URL.createObjectURL(blob);
        if (audioElRef.current) audioElRef.current.src = audioUrlRef.current;
        onFinalBlob?.(blob);
      };
      return rec;
    } catch (err) {
      console.error("MediaRecorder creation failed", err);
      return null;
    }
  }

  async function start() {
    chunksRef.current = [];
    try { if (audioUrlRef.current) { URL.revokeObjectURL(audioUrlRef.current); audioUrlRef.current = null; } } catch {}

    // ensure we have a usable stream
    try {
      const tracksOk = streamRef.current && streamRef.current.getTracks && streamRef.current.getTracks().some(t => t && t.readyState === 'live');
      if (!tracksOk) {
        try { streamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
        streamRef.current = null;
      }
      if (!streamRef.current) await initAudio();
    } catch (err) {
      console.error("initAudio failed in start():", err);
      throw err;
    }

    const rec = makeRecorder(streamRef.current);
    if (!rec) { alert("Recording not supported in this browser"); return; }
    recRef.current = rec;

    try {
      rec.start();
      setRecording(true);
      setPaused(false);
      if (autoStopAfterMs) {
        if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = setTimeout(() => { stop(); }, autoStopAfterMs);
      }
    } catch (err) {
      console.error("MediaRecorder.start() failed:", err);
      // try to recover once
      try {
        streamRef.current?.getTracks()?.forEach(t => t.stop());
      } catch {}
      streamRef.current = null;
      try {
        await initAudio();
        const recRetry = makeRecorder(streamRef.current);
        if (recRetry) {
          recRef.current = recRetry;
          recRetry.start();
          setRecording(true);
          setPaused(false);
          return;
        }
      } catch (retryErr) {
        console.error("Retry start failed:", retryErr);
      }
      alert("Unable to start the microphone. Please check microphone permissions.");
    }
  }

  function pause() { try { if (recRef.current && recRef.current.state === "recording") { recRef.current.pause(); setRecording(false); setPaused(true); } } catch (e) { console.warn("Pause failed", e); } }
  function resume() { try { if (recRef.current && recRef.current.state === "paused") { recRef.current.resume(); setRecording(true); setPaused(false); return; } if (!streamRef.current) initAudio().then(() => { const rec = makeRecorder(streamRef.current); recRef.current = rec; rec.start(); setRecording(true); setPaused(false); }); } catch (e) { console.warn("Resume failed", e); } }
  function stop() { try { if (recRef.current && (recRef.current.state === "recording" || recRef.current.state === "paused")) { recRef.current.stop(); } } catch (e) { console.warn("Stop failed", e); } finally { setRecording(false); setPaused(false); recRef.current = null; if (autoStopTimerRef.current) { clearTimeout(autoStopTimerRef.current); autoStopTimerRef.current = null; } } }
  function clearAll() { setRecording(false); setPaused(false); try { if (audioUrlRef.current) { URL.revokeObjectURL(audioUrlRef.current); audioUrlRef.current = null; } } catch {} chunksRef.current = []; if (audioElRef.current) audioElRef.current.src = ""; onFinalBlob?.(null); }

  useImperativeHandle(ref, () => ({ start, pause, resume, stop, clearAll }));

  useEffect(() => {
    return () => {
      try {
        cancelAnimationFrame(rafRef.current);
        audioCtxRef.current?.close();
        streamRef.current?.getTracks()?.forEach((t) => t.stop());
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      } catch {}
    };
  }, []);

  return (
    <div className="recorder-box">
      <canvas ref={canvasRef} width={560} height={90} className="recorder-canvas" />
      <div className="recorder-buttons" style={{ marginTop: 8 }}>
        {!recording && !paused && <AnimatedButton onClick={start} style={{ background: "#16a34a" }}>▶ Start</AnimatedButton>}
        {recording && <AnimatedButton onClick={pause} style={{ background: "#f59e0b" }}>⏸ Pause</AnimatedButton>}
        {!recording && paused && <AnimatedButton onClick={resume} style={{ background: "#0ea5e9" }}>⏯ Resume</AnimatedButton>}
        {(recording || paused) && <AnimatedButton onClick={stop} style={{ background: "#1f2937" }}>⏹ Stop</AnimatedButton>}
        <AnimatedButton onClick={clearAll} style={{ background: "#ef4444" }}>❌ Delete</AnimatedButton>
      </div>
      <div style={{ marginTop: 8 }}>
        <audio ref={audioElRef} controls style={{ width: "100%" }} />
      </div>
    </div>
  );
});

export default function OralPracticeFromPhotoSection() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [payload, setPayload] = useState(null); // { source_text, questions: [...] }
  const parentPhoto = "/images/mother.png"; // default

  const [oralBlob, setOralBlob] = useState({});
  const [oralText, setOralText] = useState({});
  const [pronFeedbackMap, setPronFeedbackMap] = useState({});
  const [scoreMap, setScoreMap] = useState({});
  const [loading, setLoading] = useState(false);
  

  const [currentIndex, setCurrentIndex] = useState(0); // show one question at a time

  const recorderRef = useRef(null);
  const [isAsking, setIsAsking] = useState(false);

  
 // const [explainUrl, setExplainUrl] = useState(null);

  // ADDED: ref + speaking state to animate parent photo while audio plays
  const parentPhotoWrapRef = useRef(null); // ADDED
  const [parentSpeaking, setParentSpeaking] = useState(false); // ADDED

  


  useEffect(() => {
    return () => {
      try { if (preview) URL.revokeObjectURL(preview); } catch {}
    
    };
  });

  function onBlobCapture(qid, blob) {
    setOralBlob(prev => ({ ...prev, [qid]: blob || null }));
  }

  function generateQAFromText(text, maxQuestions = 5) {
    if (!text) return { source_text: text, questions: [] };
    const sents = text.replace(/\n+/g, " ").split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(Boolean);
    const q = [];
    let idCounter = 1;
    for (let i = 0; i < sents.length && q.length < maxQuestions; i++) {
      const sentence = sents[i];
      const question = sentence.length < 60 ? `Explain: ${sentence}` : `Summarize: ${sentence.substring(0, 80)}...`;
      q.push({ id: `${Date.now()}-${idCounter++}`, question, answer: sentence, type: "short", options: null });
    }
    if (q.length === 0 && text.length) q.push({ id: `${Date.now()}-1`, question: "Summarize the given passage.", answer: text.slice(0, 400), type: "short" });
    return { source_text: text, questions: q };
  }

  async function analyze() {
    if (!file && !textInput.trim()) {
      alert("Please paste text or upload an image.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      if (file) form.append("file", file, file.name);
      if (textInput.trim()) form.append("text", textInput.trim());

      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/practice-image/analyze`, {
        method: "POST",
        body: form,
        headers,
        credentials: "include",
      });

      const ctype = res.headers.get("content-type") || "";
      if (ctype.includes("text/html")) {
        const text = await res.text().catch(() => "");
        console.error("Server returned HTML when expecting JSON:", text);
        alert("Analyze failed: server returned HTML. Check backend/proxy.");
        setLoading(false);
        return;
      }

      const raw = await res.text().catch(() => "");
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }

      if (!res.ok) {
        console.error("Analyze failed body:", raw);
        const msg = data?.error || data?.message || raw || `Analyze failed (${res.status})`;
        alert(msg);
        setLoading(false);
        return;
      }

      let parsed = data || null;
      if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        const source = parsed?.source_text || textInput || (file ? "(image uploaded)" : "");
        const qa = generateQAFromText(source, 5);
        parsed = { ...parsed, ...qa };
      }

      if (Array.isArray(parsed.questions) && parsed.questions.length) {
        setPayload(parsed);
        setOralBlob({}); setOralText({}); setPronFeedbackMap({}); setScoreMap({});
        setCurrentIndex(0);
      } else {
        alert("Could not create questions from the provided input.");
      }
    } catch (err) {
      console.error("Analyze error:", err);
      const qa = generateQAFromText(textInput || "(fallback sample)", 5);
      setPayload(qa);
      setCurrentIndex(0);
    } finally {
      setLoading(false);
    }
  }

  // transcription (uses your backend)
  async function transcribeOne(qid) {
    const blob = oralBlob[qid];
    if (!blob) { alert("Please record your answer first."); return null; }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("audio", new File([blob], "answer.webm", { type: blob.type || "audio/webm" }));
      const r = await fetch(`${API_BASE}/api/practice-image/transcribe`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.error("Transcribe failed:", r.status, txt);
        alert("Transcription failed. Check backend logs.");
        return null;
      }
      const data = await r.json();
      const text = data?.text || "";
      setOralText(prev => ({ ...prev, [qid]: text }));
      return text;
    } catch (err) {
      console.error("transcribeOne error", err);
      alert("Transcription error");
      return null;
    } finally {
      setLoading(false);
    }
  }

  // Levenshtein + client-side word feedback (fallback)
  function levenshtein(a = "", b = "") {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  }
  function clientSidePronFeedback(expectedText = "", spokenText = "") {
    const normalize = s => (s || "").toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, "").trim();
    const expWords = normalize(expectedText).split(/\s+/).filter(Boolean);
    const spWords = normalize(spokenText).split(/\s+/).filter(Boolean);
    const words = [];
    let correct = 0;
    for (let i = 0; i < expWords.length; i++) {
      const e = expWords[i];
      const s = spWords[i] || "";
      const dist = levenshtein(e, s);
      const norm = e.length ? dist / e.length : 1;
      const mis = norm > 0.34;
      if (!mis) correct++;
      words.push({
        index: i,
        expected: e,
        spoken: s,
        mispronounced: mis,
        suggestion: mis ? `Try saying: ${e}` : null,
        playText: e,
        confidence: mis ? Math.round((1 - norm) * 100) : 100
      });
    }
    const overallScore = Math.round((correct / Math.max(1, expWords.length)) * 100);
    return { overallScore, feedback: `${correct} of ${expWords.length} words OK`, words };
  }

  // --- CHANGED submitCurrent: speak detailed feedback immediately after Submit is clicked ---
  async function submitCurrent() {
    if (!payload) return;
    const q = payload.questions[currentIndex];
    if (!q) return;
    const qid = q.id;

    // ensure there's an audio blob or typed transcript
    const blob = oralBlob[qid];
    if (!blob && !oralText[qid]) {
      alert("Please record your answer first (or type it into the transcript box).");
      return;
    }

    // ensure we have a transcript; if not, transcribe now (blocking)
    let transcript = oralText[qid] || "";
    if (!transcript && blob) {
      const t = await transcribeOne(qid);
      transcript = t || "";
    }

    // evaluate using client-side logic
    const fb = clientSidePronFeedback(q.answer || q.question || "", transcript);
    setPronFeedbackMap(prev => ({ ...prev, [qid]: fb }));
    setScoreMap(prev => ({ ...prev, [qid]: fb.overallScore }));

    // Build spoken feedback summary:
    // - overall score
    // - list up to 6 mispronounced words with what was spoken and suggestion
    // - short encouraging sentence
    try {
      const parts = [];
      parts.push(`Score: ${fb.overallScore} percent.`);

      const misWords = (fb.words || []).filter(w => w.mispronounced);
      if (misWords.length === 0) {
        parts.push("Great! All words sound good.");
      } else {
        // limit to first 6 mispronounced items to avoid overly long TTS
        const listLimit = 6;
        parts.push(`I noticed ${misWords.length} words that need practice. Here are a few:`);
        misWords.slice(0, listLimit).forEach((w, idx) => {
          const spoken = w.spoken || "nothing";
          // keep sentences short and TTS-friendly
          parts.push(`${w.expected}: you said ${spoken}. Try saying, ${w.expected}.`);
        });
        if (misWords.length > listLimit) parts.push(`And ${misWords.length - listLimit} more words need practice.`);
      }

      parts.push(encouragingMessage(fb.overallScore));

      const feedbackText = parts.join(" ");

      // Use parent animation while speaking feedback
      await speakWithParentAnimation(feedbackText, { feedback: true });
    } catch (err) {
      console.error("spoken feedback failed:", err);
      // fallback: play only short encouragement
      try { await playCorrectPronunciation(encouragingMessage(fb.overallScore)); } catch (e) { console.error(e); }
    }
  }
  // --- end of changed submitCurrent ---

  function reattemptCurrent() {
    if (!payload) return;
    const q = payload.questions[currentIndex];
    if (!q) return;
    const qid = q.id;
    setOralBlob(prev => ({ ...prev, [qid]: null }));
    setOralText(prev => ({ ...prev, [qid]: "" }));
    setPronFeedbackMap(prev => { const copy = { ...prev }; delete copy[qid]; return copy; });
    setScoreMap(prev => { const copy = { ...prev }; delete copy[qid]; return copy; });
    // also clear recorder
    recorderRef.current?.clearAll?.();
  }

 


  const currentQuestion = payload && Array.isArray(payload.questions) && payload.questions.length > 0
    ? payload.questions[currentIndex]
    : null;

 

  // --- ADDED: helpers to play audio while toggling parentSpeaking ----
  async function speakWithParentAnimation(text, opts = {}) {
    // opts.feedback = true -> add a 'feedback' class on wrapper briefly
    if (!text) return;
    setParentSpeaking(true);
    if (parentPhotoWrapRef.current) {
      parentPhotoWrapRef.current.classList.add("speaking");
      if (opts.feedback) parentPhotoWrapRef.current.classList.add("feedback");
    }
    try {
      await playCorrectPronunciation(text);
    } finally {
      if (parentPhotoWrapRef.current) {
        parentPhotoWrapRef.current.classList.remove("speaking");
        parentPhotoWrapRef.current.classList.remove("feedback");
      }
      setParentSpeaking(false);
    }
  }

  // ------------------------------------------------------------------

  // enhanced behaviour: play parent's recorded explanation if exists, otherwise just ask question; then start recorder
  // UPDATED: do NOT auto-start the child recorder. 'Ask' will only play parent's audio / TTS.
  async function askQuestionAndStartUsingRecordedExplanation() {
    if (!currentQuestion) return;
    setIsAsking(true);
    try {
     

      // play question via TTS (with parent animation)
      await speakWithParentAnimation(`Question: ${currentQuestion.question}`); // plays with animation
      // do NOT start the recorder here — recording starts only when user clicks Start inside OralRecorder
    } catch (e) {
      console.error("askQuestionAndStartUsingRecordedExplanation error", e);
    } finally {
      setIsAsking(false);
    }
  }

  // when child stops recording, we want to transcribe and show transcript (auto)
  // NOTE: This effect now ONLY transcribes and populates the transcript.
  // It does NOT compute feedback or play TTS — submitCurrent() handles evaluation & spoken feedback.
  useEffect(() => {
    const q = currentQuestion;
    if (!q) return;
    const qid = q.id;
    const blob = oralBlob[qid];
    if (blob) {
      (async () => {
        try {
          await transcribeOne(qid);
        } catch (err) {
          console.error("Auto-transcription after stop failed:", err);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oralBlob, currentIndex]);

  // TTS helper
  async function playCorrectPronunciation(text) {
    if (!text) return;
    try {
      const res = await fetch(`${API_BASE}/api/learning/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      await a.play();
      a.onended = () => { try { URL.revokeObjectURL(url); } catch {} };
    } catch (err) {
      console.error("playCorrectPronunciation error", err);
    }
  }

  // Encouraging messages generator based on score
  function encouragingMessage(score) {
    if (score == null) return "Give it a try — you can do it! 🌟";
    if (score >= 90) return "Excellent! Your speaking is very clear — keep it up! 🎉";
    if (score >= 75) return "Great job! A little more practice and you'll be perfect. 💪";
    if (score >= 50) return "Nice attempt — focus on a couple of words and try again. You're improving! ✨";
    return "Good effort! Listening closely and reattempting will help — you got this! ❤️";
  }

  // --- helper to handle file input change and preview rendering ---
  function onPracticeFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    // revoke previous preview if any
    if (preview) try { URL.revokeObjectURL(preview); } catch {}
    setFile(f);
    if (f.type && f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  return (
    <div className="op-root" style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h2>🎙️ Oral Practice</h2>   
      <div className="pp-layout" style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
        {/* LEFT - Parent Photo Panel */}
        <div className="pp-left" style={{ width: 360 }}>
          <div className="pp-panel card">
            {/* ADDED: attach ref here and toggle class via helpers.
                ALSO: added inline CSS variables with sane defaults so mouth overlay appears and animates. */}
            <div
              className={`pp-photo-wrap ${parentSpeaking ? "speaking" : ""}`}
              style={{
                position: "relative",
                // default mouth placement variables; tweak these values per photo if needed
                '--gm-mouth-left': '50%',
                '--gm-mouth-bottom': '14%',
                '--gm-mouth-width': '64px',
                '--gm-mouth-height': '12px',
                '--gm-mouth-open-scale': '1.25',
                '--gm-mouth-opacity': '0.18',
                '--gm-mouth-blur': '6px'
              }}
              ref={parentPhotoWrapRef}
            >
              <img src={parentPhoto} alt="parent" className="pp-photo" />
            </div>


            <div className="pp-text" style={{ marginTop: 10 }}>
            
            </div>
          </div>
        </div>

        {/* RIGHT - Practice UI */}
        <div className="pp-right" style={{ flex: 1 }}>
      {!payload && (
  <div className="card">
    {/* textarea wrapper */}
    <div style={{ position: "relative" }}>
      <textarea
        className="pp-textarea"
        placeholder="Paste text here (optional) — or upload an image to extract text/questions"
        rows={6}
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          paddingBottom: preview ? 130 : 12, // extra bottom space if preview exists
          borderRadius: 8,
          boxSizing: "border-box",
          minHeight: 160,
        }}
      />

      {/* PREVIEW inside textarea wrapper, bottom-left */}
      {preview && (
        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            display: "flex",
            gap: 10,
            alignItems: "center",
            background: "#fff",
            padding: 6,
            borderRadius: 6,
            boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
          }}
        >
          <img
            src={preview}
            alt="preview"
            style={{ width: 100, height: 70, objectFit: "cover", borderRadius: 4 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontWeight: 600, fontSize: 12, maxWidth: 120, wordBreak: "break-word" }}>
              {file?.name || "Selected image"}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => {
                  if (preview) try { URL.revokeObjectURL(preview); } catch {}
                  setPreview(null);
                  setFile(null);
                }}
                className="btn btn-red small"
              >
                ✕
              </button>
              <label htmlFor="upload-file" className="btn btn-blue small" style={{ cursor: "pointer" }}>
                ↺
              </label>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* buttons row BELOW textarea */}
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
      <input
        id="upload-file"
        type="file"
        accept="image/*,application/pdf"
        style={{ display: "none" }}
        onChange={onPracticeFileChange}
      />
      <label htmlFor="upload-file" className="btn btn-primary" style={{ cursor: "pointer" }}>
        📂 Choose Image / PDF
      </label>

      <AnimatedButton onClick={analyze} style={{ background: "#10b981" }} disabled={loading}>
        {loading ? "Analyzing…" : "Analyze & Create Questions"}
      </AnimatedButton>

      <AnimatedButton
        onClick={() => {
          setFile(null);
          if (preview) try { URL.revokeObjectURL(preview); } catch {}
          setPreview(null);
          setTextInput("");
        }}
        style={{ background: "#ef4444" }}
      >
        Clear
      </AnimatedButton>
    </div>
  </div>
)}


          {/* ONE-AT-A-TIME question UI */}
          {payload && currentQuestion && (
            <div className="card" style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontWeight: 800 }}>Question {currentIndex + 1} / {payload.questions.length}</div>
                <div style={{ color: "#6b7280" }}>{payload.source_text ? "Source: extracted" : ""}</div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <AnimatedButton onClick={() => { setPayload(null); setOralBlob({}); setOralText({}); setPronFeedbackMap({}); setScoreMap({}); }} style={{ background: "#6b7280" }}>Reset</AnimatedButton>
                  <AnimatedButton onClick={() => { const w = window.open("", "_blank"); if (!w) return alert("Popup blocked"); const html = `<html><body><h1>Question Paper</h1>${payload.questions.map((q,idx)=>`<div><strong>${idx+1}.</strong> ${q.question}</div>`).join("")}</body></html>`; w.document.write(html); w.document.close(); }} style={{ background: "#0ea5e9" }}>🖨️ Print Paper</AnimatedButton>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{currentQuestion.question}</div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                  {/* Explain First removed */}
                  <AnimatedButton onClick={() => askQuestionAndStartUsingRecordedExplanation()} style={{ background: "#10b981" }} disabled={isAsking}>🎧 Ask</AnimatedButton>
                </div>

                <div style={{ marginTop: 10 }}>
                  <OralRecorder ref={recorderRef} onFinalBlob={(blob) => onBlobCapture(currentQuestion.id, blob)} />
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>Transcript (editable)</div>
                  <textarea rows={3} value={oralText[currentQuestion.id] || ""} onChange={(e) => setOralText(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))} style={{ width: "100%", padding: 8, borderRadius: 8 }} />
                </div>

                <div className="action-row" style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <AnimatedButton onClick={submitCurrent} style={{ background: "#22c55e" }}>Submit</AnimatedButton>
                  <AnimatedButton onClick={reattemptCurrent} style={{ background: "#ef4444" }}>Reattempt</AnimatedButton>
                  <div style={{ flex: 1 }} />
                  <AnimatedButton onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} style={{ background: "#6b7280" }} disabled={currentIndex <= 0}>Prev</AnimatedButton>
                  <AnimatedButton onClick={() => setCurrentIndex(i => Math.min(payload.questions.length - 1, i + 1))} style={{ background: "#3b82f6" }} disabled={currentIndex >= payload.questions.length - 1}>Next</AnimatedButton>
                </div>

                {/* feedback */}
                {pronFeedbackMap[currentQuestion.id] && (
                  <div style={{ marginTop: 12 }} className="pron-feedback">
                    <div style={{ fontWeight: 800 }}>Feedback — Score: {pronFeedbackMap[currentQuestion.id].overallScore ?? "—"}%</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(pronFeedbackMap[currentQuestion.id].words || []).map(w => (
                        <div key={w.index} className={`pf-word ${w.mispronounced ? "bad" : "good"}`} style={{ display: "flex", gap: 8, alignItems: "center", padding: 8, borderRadius: 8 }}>
                          <div style={{ fontWeight: 800 }}>{w.expected}</div>
                          <div style={{ fontSize: 13 }}>{w.mispronounced ? `you said: «${w.spoken || "—"}»` : "good"}</div>
                          <button onClick={() => {
                            // play TTS for word (animation optional)
                            speakWithParentAnimation(w.playText || w.expected);
                          }} style={{ marginLeft: 6, padding: "6px 8px", borderRadius: 6 }}>🔊</button>
                        </div>
                      ))}
                    </div>
                    {pronFeedbackMap[currentQuestion.id].feedback && <div style={{ marginTop: 8 }}>{pronFeedbackMap[currentQuestion.id].feedback}</div>}
                  </div>
                )}

                {/* score summary */}
                {scoreMap[currentQuestion.id] != null && (
                  <div style={{ marginTop: 12 }} className={`graded ${scoreMap[currentQuestion.id] >= 70 ? "good" : "bad"}`}>
                    <div style={{ fontWeight: 800 }}>{scoreMap[currentQuestion.id] >= 70 ? "Good" : "Needs Improvement"} — {scoreMap[currentQuestion.id]}%</div>
                    <div style={{ color: "#475569" }}>{encouragingMessage(scoreMap[currentQuestion.id])}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
