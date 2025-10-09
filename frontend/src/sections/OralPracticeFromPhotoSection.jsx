// OralPracticeFromPhotoSection.jsx
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
    touchAction: "manipulation",
  };

  const handlePressStart = (e) => {
    if (e && e.type === "touchstart") e.preventDefault?.();
    setPressed(true);
  };
  const handlePressEnd = () => setPressed(false);

  return (
    <button
      type="button"
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerCancel={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressEnd}
      onClick={(e) => { if (!disabled) onClick?.(e); }}
      style={{ ...base, ...style }}
      disabled={disabled}
      className="animated-btn"
    >
      {children}
    </button>
  );
}

/* OralRecorder - forwarded ref so parent can control start/stop from outside */
const OralRecorder = forwardRef(function OralRecorder({ recorderQid = null, onFinalBlob, onStopRecording, autoStopAfterMs = null, disableControls = false }, ref) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const recordingRef = useRef(false);
  const pausedRef = useRef(false);

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
    if (streamRef.current && audioCtxRef.current) {
      try { await audioCtxRef.current.resume(); } catch {}
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;
    try { await ctx.resume(); } catch (e) { /* ignore */ }
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
      if (!analyser) return;
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
      const isRec = recordingRef.current;
      const isPaused = pausedRef.current;
      ctx2d.strokeStyle = isRec ? "#16a34a" : isPaused ? "#f59e0b" : "#64748b";
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

      rec.onstart = () => { /* start */ };
      rec.onpause = () => { /* pause */ };
      rec.onresume = () => { /* resume */ };
      rec.onerror = (ev) => { console.error("MediaRecorder error", ev); };

      rec.onstop = () => {
        try {
          const mimeType = preferredMime() || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: mimeType });
          try { if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current); } catch {}
          audioUrlRef.current = URL.createObjectURL(blob);
          if (audioElRef.current) audioElRef.current.src = audioUrlRef.current;
          try { onFinalBlob?.(blob); } catch (e) { console.error("onFinalBlob threw", e); }
          try { onStopRecording?.(recorderQid, blob); } catch (e) { console.error("onStopRecording threw", e); }
        } catch (err) {
          console.error("onstop processing failed", err);
          try { onFinalBlob?.(null); } catch {}
          try { onStopRecording?.(recorderQid, null); } catch {}
        }
      };
      return rec;
    } catch (err) {
      console.error("MediaRecorder creation failed", err);
      return null;
    }
  }

  // start returns boolean success
  async function start() {
    if (disableControls) return false;

    // use window.location to satisfy ESLint no-restricted-globals
    try {
      const loc = window.location;
      const isLocalhost = loc.hostname === "localhost" || loc.hostname === "127.0.0.1";
      const isSecure = loc.protocol === "https:" || isLocalhost;
      if (!isSecure) {
        // eslint-disable-next-line no-alert
        alert("Microphone access on mobile often requires HTTPS. If you opened this page via an IP (http://...), the browser may block microphone access. Try an HTTPS URL (ngrok/localhost).");
      }
    } catch (e) { /* ignore */ }

    chunksRef.current = [];
    try { if (audioUrlRef.current) { try { URL.revokeObjectURL(audioUrlRef.current); } catch {} audioUrlRef.current = null; } } catch {}

    try {
      // ensure we have a live stream
      try {
        const tracksOk = streamRef.current && streamRef.current.getTracks && streamRef.current.getTracks().some(t => t && t.readyState === 'live');
        if (!tracksOk) {
          try { streamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
          streamRef.current = null;
        }
        if (!streamRef.current) await initAudio();
      } catch (e) {
        console.warn("start: initAudio/getTracks check failed, retrying initAudio", e);
        await initAudio();
      }

      try { await audioCtxRef.current?.resume?.(); } catch (e) {}

      const rec = makeRecorder(streamRef.current);
      if (!rec) { // recording not supported
        // eslint-disable-next-line no-alert
        alert("Recording not supported in this browser");
        return false;
      }
      recRef.current = rec;

      try {
        rec.start();
        setRecording(true);
        recordingRef.current = true;
        setPaused(false);
        pausedRef.current = false;

        if (autoStopAfterMs) {
          if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
          autoStopTimerRef.current = setTimeout(() => { stop(); }, autoStopAfterMs);
        }
        return true;
      } catch (startErr) {
        console.error("MediaRecorder.start() threw:", startErr);
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
            recordingRef.current = true;
            setPaused(false);
            pausedRef.current = false;
            return true;
          }
        } catch (retryErr) {
          console.error("Retry start failed:", retryErr);
        }
        // eslint-disable-next-line no-alert
        alert("Unable to start the microphone. Please check microphone permissions.");
        return false;
      }
    } catch (err) {
      console.error("start() top-level error:", err);
      // eslint-disable-next-line no-alert
      alert("Microphone initialization failed — open console for details.");
      try { streamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
      streamRef.current = null;
      return false;
    }
  }

  function pause() {
    try {
      if (recRef.current && recRef.current.state === "recording") {
        recRef.current.pause();
        setRecording(false); recordingRef.current = false;
        setPaused(true); pausedRef.current = true;
      }
    } catch (e) { console.warn("Pause failed", e); }
  }
  function resume() {
    try {
      if (recRef.current && recRef.current.state === "paused") {
        recRef.current.resume();
        setRecording(true); recordingRef.current = true;
        setPaused(false); pausedRef.current = false;
        return;
      }
      if (!streamRef.current) {
        initAudio().then(() => {
          const rec = makeRecorder(streamRef.current);
          recRef.current = rec;
          rec.start();
          setRecording(true); recordingRef.current = true;
          setPaused(false); pausedRef.current = false;
        });
      }
    } catch (e) { console.warn("Resume failed", e); }
  }
  function stop() {
    try {
      if (recRef.current && (recRef.current.state === "recording" || recRef.current.state === "paused")) {
        recRef.current.stop();
      }
    } catch (e) { console.warn("Stop failed", e); }
    finally {
      setRecording(false); recordingRef.current = false;
      setPaused(false); pausedRef.current = false;
      recRef.current = null;
      if (autoStopTimerRef.current) { clearTimeout(autoStopTimerRef.current); autoStopTimerRef.current = null; }
    }
  }
  function clearAll() {
    setRecording(false); recordingRef.current = false;
    setPaused(false); pausedRef.current = false;
    try { if (audioUrlRef.current) { URL.revokeObjectURL(audioUrlRef.current); } } catch {}
    try { if (audioElRef.current) { audioElRef.current.src = ""; } } catch {}
    audioUrlRef.current = null;
    chunksRef.current = [];
    try { onFinalBlob?.(null); } catch {}
    try { onStopRecording?.(recorderQid, null); } catch {}
  }

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
        {!recording && !paused && <AnimatedButton onClick={async () => { const ok = await start(); if (!ok) console.warn("Recorder start returned false"); }} style={{ background: "#059669" }} disabled={disableControls}>▶ Start</AnimatedButton>}
        {recording && <AnimatedButton onClick={pause} style={{ background: "#f97316" }} disabled={disableControls}>⏸ Pause</AnimatedButton>}
        {!recording && paused && <AnimatedButton onClick={resume} style={{ background: "#0284c7" }} disabled={disableControls}>⏯ Resume</AnimatedButton>}
        {(recording || paused) && <AnimatedButton onClick={stop} style={{ background: "#111827" }} disabled={disableControls}>⏹ Stop</AnimatedButton>}
        <AnimatedButton onClick={clearAll} style={{ background: "#dc2626" }} disabled={disableControls}>❌ Delete</AnimatedButton>
      </div>
      <div style={{ marginTop: 8 }}>
        <audio ref={audioElRef} controls style={{ width: "100%" }} />
      </div>
    </div>
  );
});

/* ---------------- Main component ---------------- */
export default function OralPracticeFromPhotoSection() {
  // --- state & refs ---
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const recorderRef = useRef(null);
  const [isAsking, setIsAsking] = useState(false);

  // feedback audio controls
  const feedbackAudioRef = useRef(null);
  const [feedbackPlaying, setFeedbackPlaying] = useState(false);

  // camera input refs & states
  const parentPhotoWrapRef = useRef(null);
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const cameraStreamRef = useRef(null);

  // state for revealed answers (separate from transcript)
  const [revealedAnswers, setRevealedAnswers] = useState({});

  // --- preview cleanup: revoke previous URL when it changes, and on unmount ---
  useEffect(() => {
    const prev = preview;
    return () => { try { if (prev) URL.revokeObjectURL(prev); } catch {} };
  }, [preview]);

  useEffect(() => {
    return () => {
      try {
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach(t => t.stop());
          cameraStreamRef.current = null;
        }
      } catch {}
    };
  }, []);

  // --- helpers ---
  function onBlobCapture(qid, blob) {
    setOralBlob(prev => ({ ...prev, [qid]: blob || null }));
  }

  // improved natural Q&A generator (heuristic-based)
  function sentenceToQuestionAndAnswer(sentence) {
    const s = sentence.trim();
    if (!s) return null;
    const lower = s.toLowerCase();
    const whWords = ["who", "what", "when", "where", "why", "how", "which"];
    for (const w of whWords) {
      if (lower.startsWith(w + " ")) {
        return { question: s.endsWith("?") ? s : s + "?", answer: s.replace(/\?$/, "") };
      }
    }
    const copulaMatch = s.match(/^(.+?)\s+(is|are|was|were|means|means that)\s+(.+)$/i);
    if (copulaMatch) {
      const subject = copulaMatch[1].trim();
      const remainder = copulaMatch[3].trim().replace(/\.$/, "");
      return { question: `What does "${subject}" refer to?`, answer: remainder };
    }
    if (/\bbecause\b/i.test(s) || /\bso\b/i.test(s)) {
      return { question: `Why does this happen: "${s.replace(/\.$/, "")}"?`, answer: s };
    }
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length <= 10) {
      return { question: `What does this mean: "${s.replace(/\.$/, "")}"?`, answer: s };
    }
    return { question: `Summarize this in one sentence: "${s.substring(0, 120)}${s.length>120?"...":""}"`, answer: s };
  }

  function generateQAFromText(text, maxQuestions = 8) {
    if (!text) return { source_text: text, questions: [] };
    const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n").trim();
    const sents = cleaned.split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(Boolean);
    const q = [];
    let idCounter = 1;
    for (let i = 0; i < sents.length && q.length < maxQuestions; i++) {
      const pair = sentenceToQuestionAndAnswer(sents[i]);
      if (pair) {
        q.push({ id: `${Date.now()}-${idCounter++}`, question: pair.question, answer: pair.answer, type: "short", options: null });
      }
    }
    if (!q.length && text.trim()) {
      const chunk = text.trim().slice(0, 400);
      q.push({ id: `${Date.now()}-1`, question: `Summarize this passage: "${chunk.substring(0,120)}${chunk.length>120?"...":""}"`, answer: chunk, type: "short", options: null });
    }
    return { source_text: text, questions: q };
  }

  async function fetchMoreQuestionsFromServer(baseText, prevQuestions = []) {
    try {
      const res = await fetch(`${API_BASE}/api/practice-image/similar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseText, prevQuestions, count: 20 }),
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.questions && Array.isArray(data.questions) && data.questions.length) return data.questions;
      return null;
    } catch (e) {
      console.error("fetchMoreQuestionsFromServer failed", e);
      return null;
    }
  }

  // ANALYZE
  async function analyze() {
    if (!file && !textInput.trim()) {
      // eslint-disable-next-line no-alert
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
        // eslint-disable-next-line no-alert
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
        // eslint-disable-next-line no-alert
        alert(msg);
        setLoading(false);
        return;
      }

      let parsed = data || null;

      // tolerate different shapes from backend (sometimes 'questions' may be missing or not array)
      if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        const source = parsed?.source_text || textInput || (file ? "(image uploaded)" : "");
        const qa = generateQAFromText(source, 8);
        parsed = { ...parsed, ...qa };
      }

      // if still only 0/1 question, try fetching more using /similar
      if (Array.isArray(parsed.questions) && parsed.questions.length <= 1) {
        const base = parsed.source_text || textInput || (file ? "(image uploaded)" : "");
        const extra = await fetchMoreQuestionsFromServer(base, parsed.questions || []);
        if (extra && extra.length) {
          const normalizedExtra = extra.map((q, i) => ({ id: q.id ?? `${Date.now()}-${i}`, question: q.question || q.prompt || "", answer: q.answer || "" }));
          parsed.questions = (parsed.questions || []).concat(normalizedExtra);
        }
      }

      if (Array.isArray(parsed.questions) && parsed.questions.length) {
        parsed.questions = parsed.questions
          .map((q, i) => ({ id: q.id ?? i+1, question: (q.question||"").trim(), answer: (q.answer||"").trim() }))
          .filter(q => q.question && q.answer);

        if (!parsed.questions.length) {
          parsed = generateQAFromText(parsed.source_text || textInput || "(fallback)", 8);
        }

        setPayload(parsed);
        setOralBlob({}); setOralText({}); setPronFeedbackMap({}); setScoreMap({});
        setCurrentIndex(0);
      } else {
        // eslint-disable-next-line no-alert
        alert("Could not create questions from the provided input.");
      }
    } catch (err) {
      console.error("Analyze error:", err);
      const qa = generateQAFromText(textInput || "(fallback sample)", 8);
      setPayload(qa);
      setCurrentIndex(0);
    } finally {
      setLoading(false);
    }
  }

  // transcription
  async function transcribeOne(qid, blobParam = null) {
    const blob = blobParam || oralBlob[qid];
    if (!blob) { /* eslint-disable-next-line no-alert */ alert("Please record your answer first."); return null; }
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
        // eslint-disable-next-line no-alert
        alert("Transcription failed. Check backend logs.");
        return null;
      }
      const data = await r.json();
      const text = data?.text || "";
      setOralText(prev => ({ ...prev, [qid]: text }));
      return text;
    } catch (err) {
      console.error("transcribeOne error", err);
      // eslint-disable-next-line no-alert
      alert("Transcription error");
      return null;
    } finally {
      setLoading(false);
    }
  }

  // levenshtein + client feedback
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

  // submit -> evaluate + spoken feedback
  async function submitCurrent() {
    if (!payload) return;
    const q = payload.questions[currentIndex];
    if (!q) return;
    const qid = q.id;

    const blob = oralBlob[qid];
    if (!blob && !oralText[qid]) {
      // eslint-disable-next-line no-alert
      alert("Please record your answer first (or type it into the transcript box).");
      return;
    }

    let transcript = oralText[qid] || "";
    if (!transcript && blob) {
      const t = await transcribeOne(qid);
      transcript = t || "";
    }

    const fb = clientSidePronFeedback(q.answer || q.question || "", transcript);
    setPronFeedbackMap(prev => ({ ...prev, [qid]: fb }));
    setScoreMap(prev => ({ ...prev, [qid]: fb.overallScore }));

    try {
      const parts = [];
      parts.push(`Score: ${fb.overallScore} percent.`);

      const misWords = (fb.words || []).filter(w => w.mispronounced);
      if (misWords.length === 0) {
        parts.push("Great! All words sound good.");
      } else {
        const listLimit = 6;
        parts.push(`I noticed ${misWords.length} words that need practice. Here are a few:`);
        misWords.slice(0, listLimit).forEach((w) => {
          const spoken = w.spoken || "nothing";
          parts.push(`${w.expected}: you said ${spoken}. Try saying, ${w.expected}.`);
        });
        if (misWords.length > listLimit) parts.push(`And ${misWords.length - listLimit} more words need practice.`);
      }

      parts.push(encouragingMessage(fb.overallScore));
      const feedbackText = parts.join(" ");

      await speakWithParentAnimation(feedbackText, { feedback: true });
    } catch (err) {
      console.error("spoken feedback failed:", err);
      try { await playCorrectPronunciation(encouragingMessage(fb.overallScore)); } catch (e) { console.error(e); }
    }
  }

  function reattemptCurrent() {
    if (!payload) return;
    const q = payload.questions[currentIndex];
    if (!q) return;
    const qid = q.id;

    // stop & clear recorder to ensure UI state resets
    try { recorderRef.current?.stop?.(); } catch (e) { console.warn("recorder stop failed", e); }
    try { recorderRef.current?.clearAll?.(); } catch (e) { console.warn("recorder clearAll failed", e); }

    // remove stored blob for this question
    setOralBlob(prev => {
      const copy = { ...prev };
      delete copy[qid];
      return copy;
    });

    // remove transcript for this question
    setOralText(prev => {
      const copy = { ...prev };
      delete copy[qid];
      return copy;
    });

    // remove pronunciation feedback and score for this question
    setPronFeedbackMap(prev => {
      const copy = { ...prev };
      delete copy[qid];
      return copy;
    });
    setScoreMap(prev => {
      const copy = { ...prev };
      delete copy[qid];
      return copy;
    });

    // also remove revealed answer (so UI returns to hidden state)
    setRevealedAnswers(prev => {
      const copy = { ...prev };
      delete copy[qid];
      return copy;
    });
  }

  // TTS + feedback audio (keeps ref so we can pause/stop)
  async function playCorrectPronunciation(text, attachRef = false) {
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
      if (attachRef) {
        if (feedbackAudioRef.current) {
          try { feedbackAudioRef.current.pause(); } catch {}
          try { URL.revokeObjectURL(feedbackAudioRef.current.src); } catch {}
        }
        feedbackAudioRef.current = a;
        setFeedbackPlaying(true);
        a.onended = () => { try { URL.revokeObjectURL(url); } catch {}; feedbackAudioRef.current = null; setFeedbackPlaying(false); };
        a.onplay = () => { setFeedbackPlaying(true); };
        a.onpause = () => { /* not tracking paused state anymore */ };
      } else {
        a.onended = () => { try { URL.revokeObjectURL(url); } catch {}; };
      }
      await a.play();
      return new Promise((resolve) => { a.onended = () => { try { URL.revokeObjectURL(url); } catch {} ; resolve(); }; });
    } catch (err) {
      console.error("playCorrectPronunciation error", err);
    }
  }

  async function speakWithParentAnimation(text, opts = {}) {
    if (!text) return;
    try {
      if (parentPhotoWrapRef.current) parentPhotoWrapRef.current.classList.add("speaking");
      await playCorrectPronunciation(text, true);
    } finally {
      if (parentPhotoWrapRef.current) parentPhotoWrapRef.current.classList.remove("speaking");
    }
  }

  function pauseFeedback() { try { feedbackAudioRef.current?.pause(); } catch (e) { console.error(e); } }
  function resumeFeedback() { try { feedbackAudioRef.current?.play(); } catch (e) { console.error(e); } }
  function stopFeedback() { try { if (feedbackAudioRef.current) { feedbackAudioRef.current.pause(); feedbackAudioRef.current.currentTime = feedbackAudioRef.current.duration || 0; try { URL.revokeObjectURL(feedbackAudioRef.current.src); } catch {} feedbackAudioRef.current = null; } setFeedbackPlaying(false); } catch (e) { console.error(e); } }

  // reveal answer and optionally speak it (do NOT overwrite transcript)
  async function revealAnswerAndSpeak() {
    if (!payload) return;
    const q = payload.questions[currentIndex];
    if (!q) return;
    const qid = q.id;
    const answerText = q.answer || "";
    if (!answerText) { /* eslint-disable-next-line no-alert */ alert("No answer available for this question."); return; }
    setRevealedAnswers(prev => ({ ...prev, [qid]: answerText }));
    try { await speakWithParentAnimation(`Answer: ${answerText}`, { feedback: true }); } catch (e) { console.error(e); }
  }

  function encouragingMessage(score) {
    if (score == null) return "Give it a try — you can do it! 🌟";
    if (score >= 90) return "Excellent! Your speaking is very clear — keep it up! 🎉";
    if (score >= 75) return "Great job! A little more practice and you'll be perfect. 💪";
    if (score >= 50) return "Nice attempt — focus on a couple of words and try again. You're improving! ✨";
    return "Good effort! Listening closely and reattempting will help — you got this! ❤️";
  }

  // --- Camera: use effect to start stream after video mounts ---
  useEffect(() => {
    let mounted = true;
    async function begin() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        cameraStreamRef.current = stream;
        if (mounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error("startCamera error", err);
        // eslint-disable-next-line no-alert
        alert("Unable to access camera. Please check permissions or try a different device.");
        setCameraActive(false);
      }
    }
    if (cameraActive) begin();
    return () => { mounted = false; };
  }, [cameraActive]);

  function startCamera() { setCameraActive(true); }
  function stopCamera() {
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        try { videoRef.current.srcObject = null; } catch {}
      }
    } catch (e) { console.error("stopCamera error", e); }
    finally { setCameraActive(false); }
  }

  function takePhoto() {
    try {
      const vid = videoRef.current;
      const canvas = captureCanvasRef.current;
      if (!vid || !canvas) return;
      const w = vid.videoWidth || 640;
      const h = vid.videoHeight || 480;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(vid, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob) { /* eslint-disable-next-line no-alert */ alert("Capture failed"); return; }
        const f = new File([blob], `camera-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
        processFileAndPreview(f);
        stopCamera();
      }, "image/jpeg", 0.92);
    } catch (err) { console.error("takePhoto error", err); }
  }

  // file handling + preview
  function processFileAndPreview(f) {
    if (!f) return;
    if (preview) try { URL.revokeObjectURL(preview); } catch {}
    setFile(f);
    if (f.type && f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }
  function onPracticeFileChange(e) { const f = e.target.files?.[0]; if (!f) return; processFileAndPreview(f); }

  // Plays the current question using TTS + parent animation. DOES NOT auto-start the recorder.
  async function askQuestionAndStartUsingRecordedExplanation() {
    if (!payload) return;
    const q = payload.questions[currentIndex];
    if (!q) return;
    setIsAsking(true);
    try {
      await speakWithParentAnimation(`Question: ${q.question}`, { feedback: false });
    } catch (err) {
      console.error("askQuestionAndStartUsingRecordedExplanation error", err);
    } finally {
      setIsAsking(false);
    }
  }

  const currentQuestion = payload && Array.isArray(payload.questions) && payload.questions.length > 0
    ? payload.questions[currentIndex]
    : null;

  // ---------------- UI ----------------
  return (
    <div className="op-root" style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h2 className="page-title">🎙️ Oral Practice</h2>

      <div className="pp-layout">
        {/* LEFT (sticky photo / context) */}
        <aside className="pp-left">
          <div className="pp-panel card">
            <div
              className={`pp-photo-wrap`}
              style={{
                position: "relative",
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

              {feedbackPlaying && (
                <div className="feedback-controls">
                  <button onClick={pauseFeedback} className="btn small">⏸</button>
                  <button onClick={resumeFeedback} className="btn small">▶</button>
                  <button onClick={stopFeedback} className="btn btn-red small">⏹</button>
                </div>
              )}
            </div>
            <div className="pp-text" style={{ marginTop: 10 }}></div>
          </div>
        </aside>

        {/* RIGHT (main flow) */}
        <main className="pp-right">
          {!payload && (
            <div className="card input-card">
              <div style={{ position: "relative" }}>
                <textarea
                  className="pp-textarea"
                  placeholder="Paste text here (optional) — or upload an image to extract text/questions"
                  rows={6}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />

                {/* PREVIEW inside textarea wrapper */}
                {preview && (
                  <div className="preview-box">
                    <img src={preview} alt="preview" className="preview-img"/>
                    <div className="preview-meta">
                      <div className="preview-name">{file?.name || "Captured image"}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { if (preview) try { URL.revokeObjectURL(preview); } catch {} setPreview(null); setFile(null); }} className="btn btn-red small">✕</button>
                        <label htmlFor="upload-file" className="btn btn-blue small" style={{ cursor: "pointer" }}>↺</label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera modal / view */}
              {cameraActive && (
                <div className="camera-card">
                  <div style={{ position: "relative" }}>
                    <video ref={videoRef} className="camera-video" autoPlay muted playsInline />
                    <canvas ref={captureCanvasRef} style={{ display: "none" }} />
                    <div className="camera-actions">
                      <button onClick={takePhoto} className="btn btn-primary">📸 Capture</button>
                      <button onClick={stopCamera} className="btn btn-red">Close</button>
                    </div>
                  </div>
                </div>
              )}

              {/* buttons row */}
              <div className="file-row">
                <input id="upload-file" type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={onPracticeFileChange} />
                <label htmlFor="upload-file" className="btn" style={{ cursor: "pointer", background:"#b72b6fff", color:"#fff" }}>📂 Choose Image / PDF</label>
                <button onClick={() => startCamera()} className="btn btn-primary" style={{ cursor: "pointer", background:"#341382ee"}}>📷 Camera</button>
                <AnimatedButton onClick={analyze} style={{ background: "#045038ff" }} disabled={loading}>{loading ? "Analyzing…" : "Analyze & Create Questions"}</AnimatedButton>
                <AnimatedButton onClick={() => { setFile(null); if (preview) try { URL.revokeObjectURL(preview); } catch {} setPreview(null); setTextInput(""); }} style={{ background: "#dc2626" }}>Clear</AnimatedButton>
              </div>
            </div>
          )}

          {/* QUESTION UI */}
          {payload && currentQuestion && (
            <div className="card question-card">
              <div className="question-header">
                <div className="question-title">Question {currentIndex + 1} / {payload.questions.length}</div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <AnimatedButton onClick={() => { setPayload(null); setOralBlob({}); setOralText({}); setPronFeedbackMap({}); setScoreMap({}); }} style={{ background: "#e10c0cff" }}>Reset</AnimatedButton>
                  <AnimatedButton onClick={() => { const w = window.open("", "_blank"); if (!w) return alert("Popup blocked"); const html = `<html><body><h1>Question Paper</h1>${payload.questions.map((q,idx)=>`<div><strong>${idx+1}.</strong> ${q.question}</div>`).join("")}</body></html>`; w.document.write(html); w.document.close(); }} style={{ background: "#0284c7" }}>🖨️ Print Paper</AnimatedButton>
                </div>
              </div>

              <div className="question-body">
                <div className="question-text">{currentQuestion.question}</div>

                <div className="qa-row">
                  <AnimatedButton onClick={() => askQuestionAndStartUsingRecordedExplanation()} style={{ background: "#059669" }} disabled={isAsking}>🎧 Ask</AnimatedButton>
                  <AnimatedButton onClick={revealAnswerAndSpeak} style={{ background: "#7c3aed" }}>📝 Answer</AnimatedButton>
                </div>

                {/* Answer area */}
                <div className="answer-area">
                  {revealedAnswers[currentQuestion.id] ? (
                    <div className="answer-box">
                      <strong>Answer:</strong>
                      <div style={{ marginTop: 6 }}>{revealedAnswers[currentQuestion.id]}</div>
                    </div>
                  ) : (
                    <div className="answer-placeholder">Click "Answer" to reveal the correct answer here.</div>
                  )}
                </div>

                {/* recorder-transcript grid */}
                <div className="recorder-transcript-grid">
                  <div className="recorder-column">
                    <OralRecorder
                      ref={recorderRef}
                      recorderQid={currentQuestion.id}
                      onFinalBlob={(blob) => onBlobCapture(currentQuestion.id, blob)}
                      onStopRecording={async (qid, blob) => {
                        onBlobCapture(qid, blob);
                        if (blob) {
                          await transcribeOne(qid, blob);
                        } else {
                          setOralText(prev => ({ ...prev, [qid]: "" }));
                        }
                      }}
                      disableControls={feedbackPlaying}
                    />
                  </div>

                  <div className="transcript-column">
                    <div className="transcript-label">Transcript (editable)</div>
                    <textarea rows={3} className="transcript-textarea" value={oralText[currentQuestion.id] || ""} onChange={(e) => setOralText(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))} />
                    <div className="action-row" style={{ marginTop: 10 }}>
                      <AnimatedButton onClick={submitCurrent} style={{ background: "#059669" }}>Submit</AnimatedButton>
                      <AnimatedButton onClick={reattemptCurrent} style={{ background: "#dc2626" }}>Reattempt</AnimatedButton>
                      <div style={{ flex: 1 }} />
                      <AnimatedButton onClick={() => {
                        // reset current audio then move prev
                        if (currentQuestion) {
                          try { recorderRef.current?.clearAll?.(); } catch {}
                          setOralBlob(prev => { const copy = { ...prev }; delete copy[currentQuestion.id]; return copy; });
                          setOralText(prev => { const copy = { ...prev }; delete copy[currentQuestion.id]; return copy; });
                        }
                        setCurrentIndex(i => Math.max(0, i - 1));
                      }} style={{ background: "#20076bff" }} disabled={currentIndex <= 0}>Prev</AnimatedButton>
                      <AnimatedButton onClick={() => {
                        if (currentQuestion) {
                          try { recorderRef.current?.clearAll?.(); } catch {}
                          setOralBlob(prev => { const copy = { ...prev }; delete copy[currentQuestion.id]; return copy; });
                          setOralText(prev => { const copy = { ...prev }; delete copy[currentQuestion.id]; return copy; });
                        }
                        setCurrentIndex(i => Math.min(payload.questions.length - 1, i + 1));
                      }} style={{ background: "#2563eb" }} disabled={currentIndex >= payload.questions.length - 1}>Next</AnimatedButton>
                    </div>
                  </div>
                </div>

                {/* feedback */}
                {pronFeedbackMap[currentQuestion.id] && (
                  <div className="pron-feedback">
                    <div className="feedback-title">Feedback — Score: {pronFeedbackMap[currentQuestion.id].overallScore ?? "—"}%</div>
                    <div className="feedback-words">
                      {(pronFeedbackMap[currentQuestion.id].words || []).map(w => (
                        <div key={w.index} className={`pf-word ${w.mispronounced ? "bad" : "good"}`}>
                          <div className="word-main">{w.expected}</div>
                          <div className="word-sub">{w.mispronounced ? `you said: «${w.spoken || "—"}»` : "good"}</div>
                          <button onClick={() => { speakWithParentAnimation(w.playText || w.expected, { feedback: true }); }} className="btn small">🔊</button>
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
        </main>
      </div>
    </div>
  );
}
