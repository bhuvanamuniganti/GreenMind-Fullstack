require("dotenv").config();
console.log("Loaded API Key?", process.env.OPENAI_API_KEY ? "✅ Yes" : "❌ No");

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// ---------- Defensive startup helpers ----------
try {
  const uploadsDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("Created uploads directory:", uploadsDir);
  }
} catch (err) {
  console.warn("Could not create uploads directory:", err?.message || err);
}

// Log expected DB file path (useful when DB_FILE is provided via env on Render)
const dbFileDebug = process.env.DB_FILE || path.join(__dirname, "data", "greenmind.db");
console.log("DB file path (used by backend):", dbFileDebug);

// IMPORTS (must appear before usage)
const initDb = require("./init");             // ensure tables/columns exist
const authRoutes = require("./routes/auth");
const appRoutes  = require("./routes/app");
const uploadRoutes = require("./routes/upload");
const receiveRoutes = require("./routes/receive");
const aiTutorRoutes = require("./routes/aiTutor");
const aiLearningRoutes = require("./routes/aiLearningRoutes");
const practiceImageRoutes = require("./routes/practiceImage");
const requestRoutes = require("./routes/request");

// 1) Create app first
const app = express();

const isDev = process.env.NODE_ENV !== "production";

// Log incoming origin header for debugging
app.use((req, res, next) => {
  console.log("Incoming request Origin header:", req.headers.origin);
  next();
});

// DEV + PROD allowed origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://greenmindaifullstack.netlify.app" // Netlify frontend origin
];

if (!isDev && process.env.CLIENT_ORIGIN) {
  if (!allowedOrigins.includes(process.env.CLIENT_ORIGIN)) {
    allowedOrigins.push(process.env.CLIENT_ORIGIN);
  }
}

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("Blocked by CORS, origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// cookie options helper (used by routes via req.app.get('cookieOptions'))
const cookieOptions = {
  httpOnly: true,
  sameSite: isDev ? "lax" : "none", // 'none' needed for cross-site cookie in production
  secure: !isDev,                   // secure required for sameSite:'none' in browsers
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
};

// expose cookieOptions to routes (so they can use same settings)
app.set("cookieOptions", cookieOptions);

// 3) Init DB after middleware
initDb();

// 4) Routes
app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/app", appRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api", uploadRoutes);
app.use("/api", receiveRoutes);
app.use("/api/ai-tutor", aiTutorRoutes);
app.use("/api/learning", aiLearningRoutes);
app.use("/api", practiceImageRoutes);
app.use("/api", requestRoutes);

// 5) Start server
const PORT = parseInt(process.env.PORT, 10) || 4000;
const bindHost = '0.0.0.0';


const server = app.listen(PORT, bindHost, function () {
  const a = server.address();
  console.log(`✅ Server listening — address: ${a.address}, family: ${a.family}, port: ${a.port}`);
});

// graceful shutdown
function shutdown(signal) {
  console.log(`${signal} received — shutting down`);
  server.close(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
