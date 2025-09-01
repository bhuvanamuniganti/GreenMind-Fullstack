const db = require('../db');

const todayYMD = () => new Date().toISOString().slice(0,10);

// Simple level curve: every 1000 GP = +1 level (min 1).
function computeLevel(points) {
  return Math.max(1, Math.floor(points / 1000) + 1);
}

function touchStreak(user) {
  const ymd = todayYMD();
  if (user.streak_ymd === ymd) return; // already counted today

  let newStreak = 1;
  if (user.streak_ymd) {
    const prev = new Date(user.streak_ymd);
    const diff = Math.floor((new Date() - prev) / 86400000);
    newStreak = (diff === 1) ? (user.streak_count + 1) : 1;
  }
  db.prepare(`UPDATE users SET streak_count=?, streak_ymd=? WHERE id=?`)
    .run(newStreak, ymd, user.id);
}

function addPoints(userId, delta, reason, metaObj) {
  const u = db.prepare(`SELECT id, points FROM users WHERE id=?`).get(userId);
  if (!u) throw new Error('User not found');
  const newPts = u.points + delta;
  const newLvl = computeLevel(newPts);

  const meta = metaObj ? JSON.stringify(metaObj) : null;
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(`UPDATE users SET points=?, level=? WHERE id=?`).run(newPts, newLvl, userId);
    db.prepare(`INSERT INTO points_ledger(user_id,delta,reason,meta,created_at) VALUES (?,?,?,?,?)`)
      .run(userId, delta, reason, meta, now);
  });
  tx();

  return { points: newPts, level: newLvl };
}

function incUserTask(userId, taskCode) {
  const ymd = todayYMD();
  const row = db.prepare(`SELECT * FROM user_tasks WHERE user_id=? AND task_code=? AND done_on=?`)
                 .get(userId, taskCode, ymd);
  if (row) {
    db.prepare(`UPDATE user_tasks SET count=? WHERE id=?`).run(row.count + 1, row.id);
    return row.count + 1;
  } else {
    db.prepare(`INSERT INTO user_tasks(user_id,task_code,done_on,count) VALUES (?,?,?,?)`)
      .run(userId, taskCode, ymd, 1);
    return 1;
  }
}

module.exports = { todayYMD, computeLevel, touchStreak, addPoints, incUserTask };
