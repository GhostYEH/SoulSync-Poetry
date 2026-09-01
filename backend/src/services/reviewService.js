const db = require('../utils/db');
const { ApiError } = require('../utils/apiResponse');
const { dateKey, addDays, parseCorrect, calculateReviewState } = require('../utils/reviewPolicy');

async function getTodayReviewTasks(userId) {
  const today = dateKey(new Date());
  return db.all(
    `SELECT rs.*,
       CASE WHEN COALESCE(rs.next_review, rs.scheduled_date) < $2 THEN 'overdue' ELSE 'today' END as review_status
     FROM review_schedules rs
     WHERE rs.user_id = $1
       AND COALESCE(rs.mastered, 0) = 0
       AND COALESCE(rs.next_review, rs.scheduled_date) <= $2
     ORDER BY COALESCE(rs.next_review, rs.scheduled_date) ASC, rs.id ASC`,
    [userId, today]
  );
}

async function getFuturePlan(userId, days = 7) {
  const range = Math.max(1, Math.min(Number(days) || 7, 90));
  const today = dateKey(new Date());
  const endDate = addDays(new Date(), range - 1);
  const rows = await db.all(
    `SELECT * FROM review_schedules
     WHERE user_id = $1
       AND COALESCE(next_review, scheduled_date) >= $2
       AND COALESCE(next_review, scheduled_date) <= $3
     ORDER BY COALESCE(next_review, scheduled_date) ASC, id ASC`,
    [userId, today, endDate]
  );

  const byDate = new Map();
  for (const row of rows) {
    const date = row.next_review || row.scheduled_date;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(row);
  }

  return Array.from({ length: range }, (_, index) => {
    const date = addDays(new Date(), index);
    const items = byDate.get(date) || [];
    return {
      date,
      total: items.length,
      pending: items.filter(item => Number(item.mastered) !== 1).length,
      mastered: items.filter(item => Number(item.mastered) === 1).length,
      items,
    };
  });
}

async function getWrongQuestionCategories(userId) {
  const rows = await db.all(
    `SELECT COALESCE(wqc.category, '未分类') as category, COUNT(*) as count
     FROM wrong_questions wq
     LEFT JOIN wrong_question_categories wqc
       ON wqc.question_id = wq.id AND CAST(wqc.user_id AS TEXT) = wq.user_id
     WHERE wq.user_id = $1
     GROUP BY COALESCE(wqc.category, '未分类')
     ORDER BY count DESC, category ASC`,
    [String(userId)]
  );
  return rows.map(row => ({ category: row.category, count: Number(row.count) || 0 }));
}

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
      const daysSinceLast = getDaysSince(row.last_view_time);
      if (daysSinceLast >= 3) {
        nextReviewDate = new Date().toISOString();
      }
    } else if (score < 100) {
      priority = 'low';
      const daysSinceLast = getDaysSince(row.last_view_time);
      if (daysSinceLast >= 7) {
        nextReviewDate = new Date().toISOString();
      }
    } else {
      if (reciteCount < 3) {
        priority = 'low';
        const daysSinceLast = getDaysSince(row.last_view_time);
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
  const diffTime = Math.max(0, now - date);
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

  const totalLearned = Number(row?.total_learned) || 0;
  const mastered = Number(row?.mastered) || 0;
  const weak = Number(row?.weak) || 0;
  const medium = Number(row?.medium) || 0;
  const viewedOnly = Number(row?.viewed_only) || 0;
  return {
    totalLearned,
    mastered,
    weak,
    medium,
    viewedOnly,
    needsReview: weak + medium + viewedOnly
  };
}

async function completeReview(userId, poemId, correct) {
  const isCorrect = parseCorrect(correct);
  const today = dateKey(new Date());

  return db.transaction(async (tx) => {
    let schedule = await tx.get(
      `SELECT * FROM review_schedules
       WHERE user_id = $1 AND poem_id = $2
       ORDER BY CASE WHEN mastered = 0 THEN 0 ELSE 1 END,
                COALESCE(next_review, scheduled_date) ASC, id ASC
       LIMIT 1`,
      [userId, poemId]
    );

    if (!schedule) {
      const inserted = await tx.run(
        `INSERT INTO review_schedules
         (user_id, poem_id, scheduled_date, review_count, next_review, interval_days, mastered)
         VALUES ($1, $2, $3, 0, $3, 1, 0)
         RETURNING id`,
        [userId, poemId, today]
      );
      schedule = await tx.get('SELECT * FROM review_schedules WHERE id = $1', [inserted.rows[0].id]);
    }

    const nextState = calculateReviewState({
      reviewCount: schedule.review_count,
      intervalDays: schedule.interval_days,
      correct: isCorrect,
      today,
    });

    await tx.run(
      `UPDATE review_schedules
       SET review_count = $1,
           next_review = $2,
           scheduled_date = $2,
           interval_days = $3,
           mastered = $4
       WHERE id = $5 AND user_id = $6`,
      [nextState.reviewCount, nextState.nextReview, nextState.intervalDays, nextState.mastered ? 1 : 0, schedule.id, userId]
    );

    return {
      poemId: Number(poemId),
      correct: isCorrect,
      reviewCount: nextState.reviewCount,
      intervalDays: nextState.intervalDays,
      nextReview: nextState.nextReview,
      mastered: nextState.mastered,
    };
  });
}

async function categorizeWrongQuestion(userId, questionId, category) {
  const question = await db.get(
    'SELECT id FROM wrong_questions WHERE id = $1 AND user_id = $2',
    [questionId, String(userId)]
  );
  if (!question) throw ApiError.notFound('错题不存在');

  const existing = await db.get(
    'SELECT id FROM wrong_question_categories WHERE user_id = $1 AND question_id = $2',
    [userId, questionId]
  );
  if (existing) {
    await db.run(
      'UPDATE wrong_question_categories SET category = $1 WHERE id = $2 AND user_id = $3',
      [category, existing.id, userId]
    );
  } else {
    await db.run(
      `INSERT INTO wrong_question_categories (user_id, question_id, category)
       VALUES ($1, $2, $3)`,
      [userId, questionId, category]
    );
  }
  return { success: true, questionId: Number(questionId), category };
}

async function createReviewSession(userId, poemIds) {
  return db.transaction(async (tx) => {
    const result = await tx.run(
      `INSERT INTO review_sessions (user_id, started_at, total_poems)
       VALUES ($1, CURRENT_TIMESTAMP, $2)
       RETURNING id`,
      [userId, poemIds.length]
    );

    const sessionId = result.rows[0].id;

    for (const poemId of poemIds) {
      await tx.run(
        `INSERT INTO review_session_items (session_id, poem_id)
         VALUES ($1, $2)`,
        [sessionId, poemId]
      );
    }

    return { sessionId, totalPoems: poemIds.length };
  });
}

async function updateReviewSession(sessionId, poemId, score) {
  return db.transaction(async (tx) => {
    await tx.run(
      `UPDATE review_session_items
       SET score = $1, reviewed_at = CURRENT_TIMESTAMP
       WHERE session_id = $2 AND poem_id = $3`,
      [score, sessionId, poemId]
    );

    const row = await tx.get(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN reviewed_at IS NOT NULL THEN 1 ELSE 0 END) as reviewed
       FROM review_session_items
       WHERE session_id = $1`,
      [sessionId]
    );

    if (row.reviewed >= row.total) {
      await tx.run(
        `UPDATE review_sessions
         SET completed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [sessionId]
      );
    }

    return { reviewed: row.reviewed, total: row.total, completed: row.reviewed >= row.total };
  });
}

async function getReviewHistory(userId, days = 30) {
  const dateFilter = db.isPostgres() ? `CURRENT_DATE - $2::int` : `DATE('now', '-' || ? || ' days')`;
  return db.all(
    `SELECT rs.*,
       (SELECT COUNT(*) FROM review_session_items WHERE session_id = rs.id) as total_poems,
       (SELECT SUM(CASE WHEN reviewed_at IS NOT NULL THEN 1 ELSE 0 END) FROM review_session_items WHERE session_id = rs.id) as reviewed_poems,
       (SELECT AVG(score) FROM review_session_items WHERE session_id = rs.id AND score IS NOT NULL) as avg_score
     FROM review_sessions rs
     WHERE rs.user_id = $1 AND rs.started_at >= ${dateFilter}
     ORDER BY rs.started_at DESC`,
    [userId, days]
  );
}

module.exports = {
  getTodayReviewTasks,
  getFuturePlan,
  getWrongQuestionCategories,
  getReviewList,
  getReviewStats,
  completeReview,
  categorizeWrongQuestion,
  createReviewSession,
  updateReviewSession,
  getReviewHistory
};
