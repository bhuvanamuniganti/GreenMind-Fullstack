// backend/init.js
const db = require("./db");

/**
 * Return a Set of existing column names for a table.
 */
function getColumns(table) {
  const rows = db.prepare(`PRAGMA table_info(${table});`).all();
  return new Set(rows.map(r => r.name));
}

function colMissing(table, name) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return !rows.some(r => r.name === name);
}

module.exports = function init() {
  // 1) Ensure base table exists
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      languages TEXT NOT NULL DEFAULT '["en"]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `).run();

  // 2) Add missing columns
  if (colMissing('users', 'points'))        db.prepare(`ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0`).run();
  if (colMissing('users', 'level'))         db.prepare(`ALTER TABLE users ADD COLUMN level INTEGER NOT NULL DEFAULT 1`).run();
  if (colMissing('users', 'streak_count'))  db.prepare(`ALTER TABLE users ADD COLUMN streak_count INTEGER NOT NULL DEFAULT 0`).run();
  if (colMissing('users', 'streak_ymd'))    db.prepare(`ALTER TABLE users ADD COLUMN streak_ymd TEXT`).run();

  const cols = getColumns("users");
  if (!cols.has("reset_token"))     db.prepare(`ALTER TABLE users ADD COLUMN reset_token TEXT;`).run();
  if (!cols.has("reset_expires"))   db.prepare(`ALTER TABLE users ADD COLUMN reset_expires INTEGER;`).run();
  if (!cols.has("failed_attempts")) db.prepare(`ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;`).run();
  if (!cols.has("locked_until"))    db.prepare(`ALTER TABLE users ADD COLUMN locked_until INTEGER NOT NULL DEFAULT 0;`).run();

  // 3) Trigger for updated_at
  const triggers = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name='users';`
  ).all().map(r => r.name);
  if (!triggers.includes("trg_users_updated")) {
    db.prepare(`
      CREATE TRIGGER trg_users_updated
      AFTER UPDATE ON users
      FOR EACH ROW
      BEGIN
        UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
      END;
    `).run();
  }

  // 4) Helpful index for reset_token lookups
  const indexes = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='users';`
  ).all().map(r => r.name);
  if (!indexes.includes("idx_users_reset_token")) {
    db.prepare(`CREATE INDEX idx_users_reset_token ON users(reset_token);`).run();
  }

  // 5) Other tables (ledger, tasks, listings, transactions)
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

  // Ensure uploads table has claimed_by and claimed_at
try {
  db.prepare("ALTER TABLE uploads ADD COLUMN claimed_by INTEGER").run();
} catch (e) {
  if (!String(e).includes("duplicate column")) throw e;
}

try {
  db.prepare("ALTER TABLE uploads ADD COLUMN claimed_at TEXT").run();
} catch (e) {
  if (!String(e).includes("duplicate column")) throw e;
}


  // --- seed tasks ---
  const seed = db.prepare(`INSERT OR IGNORE INTO task_catalog(code,title,gp,daily_limit) VALUES (?,?,?,?)`);
  seed.run('LEARN_20',   'Study with AI for 20 mins',          75,  1);
  seed.run('QUIZ_5',     'Finish 5-question quiz',             50,  2);
  seed.run('UPLOAD_NOTE','Upload handwritten notes',          150,  3);
  seed.run('LIST_BOOK',  'List a book for sharing',           200,  2);
  seed.run('DONATION_OK','Successful donation/exchange',      300,  null);
  // backend/init.js  (ADD these near your other colMissing checks)
if (colMissing('listings', 'description')) db.prepare(`ALTER TABLE listings ADD COLUMN description TEXT`).run();
if (colMissing('listings', 'photos'))      db.prepare(`ALTER TABLE listings ADD COLUMN photos TEXT`).run();


  console.log("✅ Database initialized for profile/points/sharing.");
};
