const db = require('../utils/db');

async function getReviewList(userId) {
  const rows = await db.all(
    `SELECT lr.*, p.title as poem_title, p.author as poem_author, p.content as poem_content
     FROM learning_records lr
     JOIN poems p ON lr.poem_id = p.id
     WHERE lr.user_id = $1
       AND (lr.view_count > 0 OR lr.ai_explain_count > 0 OR lr.recite_attempts > 0)
     ORDER BY lr.last_view_time ASC`,
    [userId]
  );

  const reviewList = [];
  for (const row of rows) {
    const score = row.best_score || 0;
    const reciteCount = row.recite_attempts || 0;
    let priority = 'normal';
    let nextReviewDate = null;

    if (score === 0) {
      priority = 'high';
      nextReviewDate = new Date().toISOString();
    } else if (score < 60) {
      priority = 'high';
      const daysSinceLast = getDaysSince(row.last_view_time);
      if (daysSinceLast >= 1) {
        nextReviewDate = new Date().toISOString();
      }
    } else if (score < 80) {
      priority = 'medium';
      const daysSinceLast = getDaysSinceLast(row.last_view_time);
      if (daysSinceLast >= 3) {
        nextReviewDate = new Date().toISOString();
      }
    } else if (score < 100) {
      priority = 'low';
      const daysSinceLast = getDaysSinceLast(row.last_view_time);
      if (daysSinceLast >= 7) {
        nextReviewDate = new Date().toISOString();
      }
    } else {
      if (reciteCount < 3) {
        priority = 'low';
        const daysSinceLast = getDaysSinceLast(row.last_view_time);
        if (daysSinceLast >= 14) {
          nextReviewDate = new Date().toISOString();
        }
      } else {
        continue;
      }
    }

    reviewList.push({
      ...row,
      reviewPriority: priority,
      nextReviewDate
    });
  }

  reviewList.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.reviewPriority] - priorityOrder[b.reviewPriority];
  });

  return reviewList;
}

function getDaysSince(dateStr) {
  if (!dateStr) return 999;
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

async function getReviewStats(userId) {
  const row = await db.get(
    `SELECT
       COUNT(*) as total_learned,
       SUM(CASE WHEN best_score >= 100 AND recite_attempts >= 3 THEN 1 ELSE 0 END) as mastered,
       SUM(CASE WHEN best_score > 0 AND best_score < 60 THEN 1 ELSE 0 END) as weak,
       SUM(CASE WHEN best_score >= 60 AND best_score < 100 THEN 1 ELSE 0 END) as medium,
       SUM(CASE WHEN recite_attempts = 0 AND view_count > 0 THEN 1 ELSE 0 END) as viewed_only
     FROM learning_records
     WHERE user_id = $1
       AND (view_count > 0 OR ai_explain_count > 0 OR recite_attempts > 0)`,
    [userId]
  );

  return {
    totalLearned: row?.total_learned || 0,
    mastered: row?.mastered || 0,
    weak: row?.weak || 0,
    medium: row?.medium || 0,
    viewedOnly: row?.viewed_only || 0,
    needsReview: (row?.weak || 0) + (row?.medium || 0) + (row?.viewed_only || 0)
  };
}

async function createReviewSession(userId, poemIds) {
  const result = await db.run(
    `INSERT INTO review_sessions (user_id, started_at, total_poems)
     VALUES ($1, CURRENT_TIMESTAMP, $2)
     RETURNING id`,
    [userId, poemIds.length]
  );

  const sessionId = result.rows[0].id;

  for (const poemId of poemIds) {
    await db.run(
      `INSERT INTO review_session_items (session_id, poem_id)
       VALUES ($1, $2)`,
      [sessionId, poemId]
    );
  }

  return { sessionId, totalPoems: poemIds.length };
}

async function updateReviewSession(sessionId, poemId, score) {
  await db.run(
    `UPDATE review_session_items
     SET score = $1, reviewed_at = CURRENT_TIMESTAMP
     WHERE session_id = $2 AND poem_id = $3`,
    [score, sessionId, poemId]
  );

  const row = await db.get(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN reviewed_at IS NOT NULL THEN 1 ELSE 0 END) as reviewed
     FROM review_session_items
     WHERE session_id = $1`,
    [sessionId]
  );

  if (row.reviewed >= row.total) {
    await db.run(
      `UPDATE review_sessions
       SET completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [sessionId]
    );
  }

  return { reviewed: row.reviewed, total: row.total, completed: row.reviewed >= row.total };
}

async function getReviewHistory(userId, days = 30) {
  return db.all(
    `SELECT rs.*,
       (SELECT COUNT(*) FROM review_session_items WHERE session_id = rs.id) as total_poems,
       (SELECT SUM(CASE WHEN reviewed_at IS NOT NULL THEN 1 ELSE 0 END) FROM review_session_items WHERE session_id = rs.id) as reviewed_poems,
       (SELECT AVG(score) FROM review_session_items WHERE session_id = rs.id AND score IS NOT NULL) as avg_score
     FROM review_sessions rs
     WHERE rs.user_id = $1 AND rs.started_at >= CURRENT_DATE - $2::int
     ORDER BY rs.started_at DESC`,
    [userId, days]
  );
}

module.exports = {
  getReviewList,
  getReviewStats,
  createReviewSession,
  updateReviewSession,
  getReviewHistory
};
