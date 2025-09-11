// backend/server.js
require("dotenv").config();
console.log("Loaded API Key?", process.env.OPENAI_API_KEY ? "✅ Yes" : "❌ No");

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// IMPORTS (must appear before usage)
const initDb = require("./init");             // ensure tables/columns exist
const authRoutes = require("./routes/auth");
const appRoutes  = require("./routes/app");   // renamed from appe.js -> app.js
const uploadRoutes = require("./routes/upload");
const receiveRoutes = require("./routes/receive");
const aiTutorRoutes = require("./routes/aiTutor");
const aiLearningRoutes = require("./routes/aiLearningRoutes");
const practiceImageRoutes = require("./routes/practiceImage"); // 👈 import here

// 1) Create app first
const app = express();

const isDev = process.env.NODE_ENV !== "production";



// CORS: allow localhost in dev and CLIENT_ORIGIN in prod
// DEV-friendly CORS: explicitly allow localhost/127.0.0.1 ports + the configured CLIENT_ORIGIN in prod
// Also log incoming origin for debugging.
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
  "https://greenmindaifullstack.netlify.app" // <--- add Netlify origin
];

if (!isDev && process.env.CLIENT_ORIGIN) {
  // keep any existing CLIENT_ORIGIN too (optional)
  if (!allowedOrigins.includes(process.env.CLIENT_ORIGIN)) {
    allowedOrigins.push(process.env.CLIENT_ORIGIN);
  }
}


app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (curl, mobile apps, Postman)
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

// cookie options helper
const cookieOptions = {
  httpOnly: true,
  sameSite: isDev ? "lax" : "none", // none required for cross-site cookies
  secure: !isDev,                   // secure true in production
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
};

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
app.use("/api", practiceImageRoutes); // 👈 now mounted in correct place

// 5) Start server
const PORT = parseInt(process.env.PORT, 10) || 4000;
// In dev prefer explicit localhost (helps Windows loopback/IPv6 issues), otherwise bind to 0.0.0.0
const bindHost = isDev ? '127.0.0.1' : '0.0.0.0';


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
