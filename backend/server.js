// backend/server.js
require("dotenv").config();
console.log("Loaded API Key?", process.env.OPENAI_API_KEY ? "✅ Yes" : "❌ No");

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

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

// 2) Middleware
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

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
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => console.log(`✅ Server listening on ${PORT}`));
