// backend/routes/app.js
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { addPoints, incUserTask, touchStreak } = require('../lib/points');
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // saves in backend/uploads folder


const router = express.Router();

// --- auth middleware (cookie or bearer) ---
function auth(req, res, next) {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// -------- PROFILE SUMMARY (you may already have this) --------
router.get('/summary', auth, (req, res) => {
  const u = db.prepare(
    `SELECT id,email,full_name,points,level,streak_count,streak_ymd
       FROM users WHERE id=?`
  ).get(req.user.sub);
  if (!u) return res.status(404).json({ error: 'User not found' });

  // keep streak fresh on activity
  touchStreak(u);
  const updated = db.prepare(
    `SELECT points,level,streak_count,streak_ymd FROM users WHERE id=?`
  ).get(u.id);

  const canReceive = updated.points >= 500;
  const progress = Math.min(100, Math.round((updated.points / 500) * 100));
  res.json({
    user: {
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      points: updated.points,
      level: updated.level,
      streak_count: updated.streak_count,
      streak_ymd: updated.streak_ymd,
      can_receive: canReceive,
      progress_to_unlock: progress
    }
  });
});

// ==================== LEARN ====================

// END study session → award if >= 15 min
router.post('/learn/session/end', auth, (req, res) => {
  const { duration_min } = req.body || {};
  const mins = Number(duration_min || 0);

  if (Number.isNaN(mins) || mins < 0) {
    return res.status(400).json({ error: 'duration_min must be a positive number' });
  }

  let awarded = 0;
  if (mins >= 15) {
    // Optional: limit to 1 per day
    incUserTask(req.user.sub, 'LEARN_20'); // your helper records daily count
    awarded = 75;
    const out = addPoints(req.user.sub, awarded, 'LEARN_SESSION_15_MIN', { mins });
    return res.json({ ok: true, awarded, points: out.points, level: out.level });
  }
  return res.json({ ok: true, awarded: 0 });
});

// QUIZ submit → award if >= 4/5
router.post('/learn/quiz/submit', auth, (req, res) => {
  const { correct, total } = req.body || {};
  const c = Number(correct || 0), t = Number(total || 0);
  if (Number.isNaN(c) || Number.isNaN(t) || t <= 0) {
    return res.status(400).json({ error: 'correct/total must be numbers' });
  }

  let awarded = 0;
  if (t >= 5 && c >= 4) {
    incUserTask(req.user.sub, 'QUIZ_5');
    awarded = 50;
    const out = addPoints(req.user.sub, awarded, 'QUIZ_PASS', { correct: c, total: t });
    return res.json({ ok: true, awarded, points: out.points, level: out.level });
  }
  return res.json({ ok: true, awarded: 0 });
});

// ==================== SHARE ====================

// Create listing (text-only for now; photos later)
router.post('/listings', auth, (req, res) => {
  const { title, category, condition, description } = req.body || {};
  if (!title || title.trim().length < 3) return res.status(400).json({ error: 'Title too short' });

  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO listings(user_id,title,category,condition,status,created_at,description,photos)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(req.user.sub, title.trim(), category || null, condition || 'Good', 'active', now, description || null, JSON.stringify([]));

  // Award once per day (your helper can enforce daily limit through user_tasks)
  incUserTask(req.user.sub, 'LIST_BOOK');
  const out = addPoints(req.user.sub, 150, 'LIST_CREATED', { listing_id: info.lastInsertRowid });

  res.status(201).json({ id: info.lastInsertRowid, points: out.points, level: out.level });
});

// My listings
router.get('/listings/mine', auth, (req, res) => {
  const rows = db.prepare(`SELECT * FROM listings WHERE user_id=? ORDER BY created_at DESC`).all(req.user.sub);
  res.json(rows);
});

// All available (others' active)
router.get('/listings/available', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT l.* FROM listings l
    WHERE l.status='active' AND l.user_id <> ?
    ORDER BY l.created_at DESC
  `).all(req.user.sub);
  res.json(rows);
});

// ==================== RECEIVE ====================

// Claim → reserve listing if user has >= 500 GP
router.post('/transactions/claim', auth, (req, res) => {
  const { listing_id } = req.body || {};
  if (!listing_id) return res.status(400).json({ error: 'listing_id required' });

  const me = db.prepare(`SELECT points FROM users WHERE id=?`).get(req.user.sub);
  if (!me) return res.status(404).json({ error: 'User not found' });
  if (me.points < 500) return res.status(403).json({ error: 'Receiver unlocks at 500 GP' });

  const lst = db.prepare(`SELECT * FROM listings WHERE id=? AND status='active'`).get(listing_id);
  if (!lst) return res.status(404).json({ error: 'Listing not available' });

  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO transactions(listing_id,giver_id,receiver_id,status,created_at)
                VALUES (?,?,?,?,?)`)
      .run(lst.id, lst.user_id, req.user.sub, 'pending', now);
    db.prepare(`UPDATE listings SET status='reserved' WHERE id=?`).run(lst.id);
  });
  tx();

  res.json({ ok: true });
});

// Mark done (giver completes exchange) → award giver +300 GP
router.post('/transactions/complete', auth, (req, res) => {
  const { transaction_id } = req.body || {};
  if (!transaction_id) return res.status(400).json({ error: 'transaction_id required' });

  const tx = db.prepare(`SELECT * FROM transactions WHERE id=?`).get(transaction_id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  if (tx.giver_id !== req.user.sub) return res.status(403).json({ error: 'Only giver can complete' });
  if (tx.status !== 'pending') return res.status(400).json({ error: 'Already completed/cancelled' });

  const now = new Date().toISOString();
  const run = db.transaction(() => {
    db.prepare(`UPDATE transactions SET status='done' WHERE id=?`).run(tx.id);
    db.prepare(`UPDATE listings SET status='done' WHERE id=?`).run(tx.listing_id);
  });
  run();

  const out = addPoints(req.user.sub, 300, 'DONATION_DONE', { transaction_id: tx.id, listing_id: tx.listing_id });
  res.json({ ok: true, points: out.points, level: out.level, awarded: 300 });
});


// Stats API
router.get('/stats', (req, res) => {
  const users = db.prepare(`SELECT COUNT(*) as c FROM users`).get().c;
  const items = db.prepare(`SELECT COUNT(*) as c FROM listings WHERE status='active' OR status='reserved' OR status='completed'`).get().c;
  const co2 = items * 0.8; // estimate: 0.8kg CO2 saved per reused item
  res.json({ active_users: users, items_exchanged: items, co2_saved: co2 });
});

// Leaderboard API
router.get('/leaderboard', (req, res) => {
  const rows = db.prepare(
    `SELECT id, full_name, points, level FROM users ORDER BY points DESC LIMIT ?`
  ).all(req.query.limit || 10);
  res.json(rows);
});



module.exports = router;
