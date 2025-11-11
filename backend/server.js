// backend/server.js
require("dotenv").config();
console.log("Loaded API Key?", process.env.OPENAI_API_KEY ? "✅ Yes" : "❌ No");

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// ✅ Create app FIRST
const app = express();
const isDev = process.env.NODE_ENV !== "production";

// ----------- UPLOADS DIR (supports persistent disk) -----------
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, "uploads");
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log("Created uploads directory:", UPLOADS_DIR);
  }
} catch (err) {
  console.warn("Could not create uploads directory:", err?.message || err);
}
console.log("Serving /uploads from:", UPLOADS_DIR);

// Debug helper
const dbFileDebug = process.env.DB_FILE || path.join(__dirname, "data", "greenmind.db");
console.log("DB file path (used by backend):", dbFileDebug);

// Log incoming origin (debug)
app.use((req, _res, next) => {
  console.log("Incoming request Origin header:", req.headers.origin);
  next();
});

// CORS
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://greenmindaifullstack.netlify.app",
];
if (!isDev && process.env.CLIENT_ORIGIN && !allowedOrigins.includes(process.env.CLIENT_ORIGIN)) {
  allowedOrigins.push(process.env.CLIENT_ORIGIN);
}
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow tools/curl
      if (allowedOrigins.includes(origin)) return cb(null, true);
      console.warn("Blocked by CORS, origin:", origin);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ✅ Body parsing (once)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Cookie options available to routes if needed
const cookieOptions = {
  httpOnly: true,
  sameSite: isDev ? "lax" : "none",
  secure: !isDev,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
app.set("cookieOptions", cookieOptions);

// IMPORTS
const initDb = require("./init");
const authRoutes = require("./routes/auth");
const appRoutes = require("./routes/app");
const uploadRoutes = require("./routes/upload");
const receiveRoutes = require("./routes/receive");
const aiTutorRoutes = require("./routes/aiTutor");
const aiLearningRoutes = require("./routes/aiLearningRoutes");
const practiceImageRoutes = require("./routes/practiceImage");
const requestRoutes = require("./routes/request");
const speakingRoutes = require("./routes/speakingRoutes");

// Init DB
initDb();

// Static + routes
app.use("/uploads", express.static(UPLOADS_DIR));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/app", appRoutes);
app.use("/api", uploadRoutes);
app.use("/api", receiveRoutes);
app.use("/api/ai-tutor", aiTutorRoutes);
app.use("/api/learning", aiLearningRoutes);
app.use("/api", practiceImageRoutes);
app.use("/api", requestRoutes);
app.use("/api/speaking", speakingRoutes); // ✅ moved after app creation

// Start server
const PORT = parseInt(process.env.PORT, 10) || 4000;
const bindHost = "0.0.0.0";
const server = app.listen(PORT, bindHost, () => {
  const a = server.address();
  console.log(`✅ Server listening — address: ${a.address}, family: ${a.family}, port: ${a.port}`);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`${signal} received — shutting down`);
  server.close(() => process.exit(0));
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
