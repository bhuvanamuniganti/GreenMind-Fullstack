require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const initDb = require("./init");       // ensure tables/columns exist
const authRoutes = require("./routes/auth");
const appRoutes  = require("./routes/app");   // <-- after renaming appe.js -> app.js
        const uploadRoutes = require("./routes/upload");
const receiveRoutes = require("./routes/receive");
const aiTutorRoutes = require("./routes/aiTutor");



const app = express();                        // <-- create app FIRST

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

initDb();                                     // <-- run init after middlewares are ready

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/app", appRoutes);       
app.use("/uploads", express.static("uploads"));
        // <-- correct mount
app.use("/api", uploadRoutes);  // or app.use("/upload", uploadRoutes)
app.use("/api", receiveRoutes);
app.use("/api/ai-tutor", aiTutorRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server listening on ${PORT}`));
