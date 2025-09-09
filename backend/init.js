// backend/init.js
const db = require("./db");

// Helper: get columns and check missing
function getColumns(table) {
  const rows = db.prepare(`PRAGMA table_info(${table});`).all();
  return new Set(rows.map(r => r.name));
}
function colMissing(table, name) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return !rows.some(r => r.name === name);
}

// Enable foreign keys if driver supports pragma()
try {
  if (typeof db.pragma === "function") {
    db.pragma("foreign_keys = ON");
  } else {
    // If your db wrapper doesn't expose pragma, set it in db.js connection code.
  }
} catch (e) {
  // non-fatal
  console.warn("Could not set foreign_keys pragma:", e.message || e);
}

module.exports = function init() {
  // 1) Users table (create if missing)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      languages TEXT NOT NULL DEFAULT '["en"]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `).run();

  // 2) Add missing columns to users
  if (colMissing('users', 'points'))        db.prepare(`ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0;`).run();
  if (colMissing('users', 'level'))         db.prepare(`ALTER TABLE users ADD COLUMN level INTEGER NOT NULL DEFAULT 1;`).run();
  if (colMissing('users', 'streak_count'))  db.prepare(`ALTER TABLE users ADD COLUMN streak_count INTEGER NOT NULL DEFAULT 0;`).run();
  if (colMissing('users', 'streak_ymd'))    db.prepare(`ALTER TABLE users ADD COLUMN streak_ymd TEXT;`).run();

  const cols = getColumns("users");
  if (!cols.has("reset_token"))     db.prepare(`ALTER TABLE users ADD COLUMN reset_token TEXT;`).run();
  if (!cols.has("reset_expires"))   db.prepare(`ALTER TABLE users ADD COLUMN reset_expires INTEGER;`).run();
  if (!cols.has("failed_attempts")) db.prepare(`ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;`).run();
  if (!cols.has("locked_until"))    db.prepare(`ALTER TABLE users ADD COLUMN locked_until INTEGER NOT NULL DEFAULT 0;`).run();

  // 3) Trigger for updated_at
  // NOTE: this trigger does an UPDATE inside AFTER UPDATE. That works on most SQLite configs
  // (recursive triggers are off by default) but if you see recursion or unexpected behaviour,
  // remove this trigger and update updated_at inside your application update queries instead.
  const triggers = db.prepare(`SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name='users';`).all().map(r => r.name);
  if (!triggers.includes("trg_users_updated")) {
    try {
      db.prepare(`
        CREATE TRIGGER trg_users_updated
        AFTER UPDATE ON users
        FOR EACH ROW
        BEGIN
          UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
        END;
      `).run();
    } catch (e) {
      console.warn("Could not create trg_users_updated trigger:", e.message || e);
    }
  }

  // 4) Index for reset_token lookups
  const indexes = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='users';`).all().map(r => r.name);
  if (!indexes.includes("idx_users_reset_token")) {
    try { db.prepare(`CREATE INDEX idx_users_reset_token ON users(reset_token);`).run(); } catch (e) { /* ignore */ }
  }

  // 5) Points ledger
  db.prepare(`
    CREATE TABLE IF NOT EXISTS points_ledger(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      meta TEXT,
      created_at TEXT NOT NULL
    )
  `).run();
  // Index for ledger
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger(user_id);`).run(); } catch(e){}

  // 6) Tasks / user tasks
  db.prepare(`
    CREATE TABLE IF NOT EXISTS task_catalog(
      code TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      gp INTEGER NOT NULL,
      daily_limit INTEGER
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_tasks(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_code TEXT NOT NULL,
      done_on TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0
    )
  `).run();

  // 7) Listings / transactions
  db.prepare(`
    CREATE TABLE IF NOT EXISTS listings(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT,
      condition TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    )
  `).run();

  // Add columns to listings safely if missing
  if (colMissing('listings', 'description')) db.prepare(`ALTER TABLE listings ADD COLUMN description TEXT;`).run();
  if (colMissing('listings', 'photos'))      db.prepare(`ALTER TABLE listings ADD COLUMN photos TEXT;`).run();
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id);`).run(); } catch(e){}

  db.prepare(`
    CREATE TABLE IF NOT EXISTS transactions(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL,
      giver_id INTEGER NOT NULL,
      receiver_id INTEGER,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();

  // 8) Uploads table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      filename TEXT NOT NULL,
      title TEXT,
      category TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `).run();

  // Add columns to uploads if missing
  if (colMissing('uploads', 'claimed_by')) db.prepare(`ALTER TABLE uploads ADD COLUMN claimed_by INTEGER;`).run();
  if (colMissing('uploads', 'claimed_at')) db.prepare(`ALTER TABLE uploads ADD COLUMN claimed_at TEXT;`).run();
  if (colMissing('uploads', 'quality'))    db.prepare(`ALTER TABLE uploads ADD COLUMN quality TEXT;`).run();
  try { db.prepare(`CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id);`).run(); } catch(e){}

  // 9) Seed task_catalog rows (safe idempotent insert)
  const seed = db.prepare(`INSERT OR IGNORE INTO task_catalog(code,title,gp,daily_limit) VALUES (?,?,?,?)`);
  seed.run('LEARN_20',   'Study with AI for 20 mins',          75,  1);
  seed.run('QUIZ_5',     'Finish 5-question quiz',             50,  2);
  seed.run('UPLOAD_NOTE','Upload handwritten notes',          150,  3);
  seed.run('LIST_BOOK',  'List a book for sharing',           200,  2);
  seed.run('DONATION_OK','Successful donation/exchange',      300,  null);

  // 10) Create an initial admin user if no users exist (local dev convenience)
  try {
    const r = db.prepare("SELECT count(1) as cnt FROM users").get();
    const userCount = r ? r.cnt : 0;
    if (!userCount) {
      const bcrypt = require("bcrypt");
      const password = "admin123";
      const hash = bcrypt.hashSync(password, 10);
      db.prepare(`
        INSERT INTO users (email, full_name, password_hash, role, created_at, updated_at)
        VALUES (?,?,?,?,datetime('now'), datetime('now'))
      `).run("admin@example.com", "Local Admin", hash, "admin");
      console.log("Created initial admin user: admin@example.com / admin123 (change immediately in production).");
    }
  } catch (e) {
    console.warn("Could not seed admin user:", e.message || e);
  }

  console.log("✅ Database initialized for profile/points/sharing.");
};
