// backend/db.js
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// Use env override if provided (recommended for Render)
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "data", "greenmind.db");

// Ensure parent directory exists
const dbDir = path.dirname(DB_FILE);
try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log("Created DB directory:", dbDir);
  }
} catch (err) {
  console.error("Failed to create DB directory:", err?.message || err);
  // If you want to abort startup instead of continuing, uncomment:
  // throw err;
}

// Open the database. fileMustExist: false allows creation if missing.
const db = new Database(DB_FILE, { fileMustExist: false });
db.pragma("foreign_keys = ON");

module.exports = db;
