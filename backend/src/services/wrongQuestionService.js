const db = require('../utils/db');

async function addWrongQuestion(userId, poemId, questionType, userAnswer, correctAnswer, score) {
  const existing = await db.get(
    'SELECT * FROM wrong_questions WHERE user_id = $1 AND poem_id = $2 AND question_type = $3',
    [userId, poemId, questionType]
  );

  if (existing) {
    await db.run(
      `UPDATE wrong_questions
       SET user_answer = $1, correct_answer = $2, score = $3,
           error_count = error_count + 1, last_wrong_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [userAnswer, correctAnswer, score, existing.id]
    );
    return existing.id;
  }

  const result = await db.run(
    `INSERT INTO wrong_questions (user_id, poem_id, question_type, user_answer, correct_answer, score, error_count, last_wrong_at)
     VALUES ($1, $2, $3, $4, $5, $6, 1, CURRENT_TIMESTAMP)
     RETURNING id`,
    [userId, poemId, questionType, userAnswer, correctAnswer, score]
  );

  return result.rows[0].id;
}

async function getWrongQuestions(userId, options = {}) {
  const { questionType, page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  let sql = `SELECT wq.*, p.title as poem_title, p.author as poem_author, p.content as poem_content
     FROM wrong_questions wq
     JOIN poems p ON wq.poem_id = p.id
     WHERE wq.user_id = $1`;
  const params = [userId];
  let paramIdx = 2;

  if (questionType) {
    sql += ` AND wq.question_type = $${paramIdx}`;
    params.push(questionType);
    paramIdx++;
  }

  sql += ` ORDER BY wq.last_wrong_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
  params.push(limit, offset);

  return db.all(sql, params);
}

async function getWrongQuestionCount(userId) {
  const row = await db.get(
    'SELECT COUNT(*) as count FROM wrong_questions WHERE user_id = $1',
    [userId]
  );
  return row?.count || 0;
}

async function removeWrongQuestion(userId, wrongQuestionId) {
  const result = await db.run(
    'DELETE FROM wrong_questions WHERE id = $1 AND user_id = $2',
    [wrongQuestionId, userId]
  );
  return result.rowCount > 0;
}

async function clearWrongQuestions(userId, questionType) {
  if (questionType) {
    const result = await db.run(
      'DELETE FROM wrong_questions WHERE user_id = $1 AND question_type = $2',
      [userId, questionType]
    );
    return result.rowCount;
  }

  const result = await db.run(
    'DELETE FROM wrong_questions WHERE user_id = $1',
    [userId]
  );
  return result.rowCount;
}

async function getWrongQuestionStats(userId) {
  const typeStats = await db.all(
    `SELECT question_type, COUNT(*) as count,
       AVG(score) as avg_score,
       MAX(error_count) as max_errors
     FROM wrong_questions
     WHERE user_id = $1
     GROUP BY question_type`,
    [userId]
  );

  const recentErrors = await db.all(
    `SELECT wq.*, p.title as poem_title
     FROM wrong_questions wq
     JOIN poems p ON wq.poem_id = p.id
     WHERE wq.user_id = $1
     ORDER BY wq.last_wrong_at DESC
     LIMIT 5`,
    [userId]
  );

  const frequentErrors = await db.all(
    `SELECT wq.*, p.title as poem_title
     FROM wrong_questions wq
     JOIN poems p ON wq.poem_id = p.id
     WHERE wq.user_id = $1
     ORDER BY wq.error_count DESC
     LIMIT 5`,
    [userId]
  );

  return {
    byType: typeStats,
    recentErrors,
    frequentErrors
  };
}

async function getReviewQuestions(userId, count = 10) {
  return db.all(
    `SELECT wq.*, p.title as poem_title, p.author as poem_author, p.content as poem_content
     FROM wrong_questions wq
     JOIN poems p ON wq.poem_id = p.id
     WHERE wq.user_id = $1
     ORDER BY wq.error_count DESC, wq.last_wrong_at DESC
     LIMIT $2`,
    [userId, count]
  );
}

async function updateWrongQuestionAfterReview(userId, wrongQuestionId, correct) {
  if (correct) {
    const row = await db.get(
      'SELECT error_count FROM wrong_questions WHERE id = $1 AND user_id = $2',
      [wrongQuestionId, userId]
    );

    if (row && row.error_count <= 1) {
      await db.run(
        'DELETE FROM wrong_questions WHERE id = $1 AND user_id = $2',
        [wrongQuestionId, userId]
      );
      return { removed: true };
    } else {
      await db.run(
        'UPDATE wrong_questions SET error_count = GREATEST(error_count - 1, 0) WHERE id = $1 AND user_id = $2',
        [wrongQuestionId, userId]
      );
      return { removed: false, remainingErrors: row.error_count - 1 };
    }
  } else {
    await db.run(
      `UPDATE wrong_questions
       SET error_count = error_count + 1, last_wrong_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2`,
      [wrongQuestionId, userId]
    );
    return { removed: false };
  }
}

module.exports = {
  addWrongQuestion,
  getWrongQuestions,
  getWrongQuestionCount,
  removeWrongQuestion,
  clearWrongQuestions,
  getWrongQuestionStats,
  getReviewQuestions,
  updateWrongQuestionAfterReview
};
