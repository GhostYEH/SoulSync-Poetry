const db = require('../utils/db');
const aiService = require('./aiService');

/**
 * 添加错题到错题本
 * @param {string} userId - 用户ID
 * @param {object} questionData - 错题数据 {question_id, question, answer, user_answer, level, full_poem, author, title}
 * @returns {Promise<object>} {id, duplicated}
 */
async function addWrongQuestion(userId, questionData) {
  const {
    question_id, question, answer, user_answer,
    level, full_poem, author, title
  } = questionData;

  const existing = await db.get(
    `SELECT * FROM wrong_questions WHERE user_id = $1 AND question = $2`,
    [String(userId), question || '']
  );

  if (existing) {
    await db.run(
      `UPDATE wrong_questions
       SET user_answer = $1, answer = $2, wrong_count = wrong_count + 1,
           last_wrong_time = CURRENT_TIMESTAMP, mastered = 0, correct_streak = 0,
           full_poem = COALESCE($3, full_poem), author = COALESCE($4, author), title = COALESCE($5, title)
       WHERE id = $6`,
      [user_answer || '', answer || '', full_poem || null, author || null, title || null, existing.id]
    );
    return { id: existing.id, duplicated: false };
  }

  const result = await db.run(
    `INSERT INTO wrong_questions
     (user_id, question_id, question, answer, user_answer, level, wrong_count,
      last_wrong_time, correct_streak, mastered, full_poem, author, title, added_at)
     VALUES ($1, $2, $3, $4, $5, $6, 1, CURRENT_TIMESTAMP, 0, 0, $7, $8, $9, CURRENT_TIMESTAMP)
     RETURNING id`,
    [String(userId), question_id || null, question || '', answer || '', user_answer || '',
     level || null, full_poem || null, author || null, title || null]
  );

  return { id: result.rows[0].id, duplicated: false };
}

/**
 * 获取错题列表
 * @param {string} userId - 用户ID
 * @param {number} limit - 返回数量上限
 * @returns {Promise<Array>}
 */
async function getWrongQuestions(userId, limit = 20) {
  return db.all(
    `SELECT * FROM wrong_questions
     WHERE user_id = $1
     ORDER BY last_wrong_time DESC LIMIT $2`,
    [String(userId), limit]
  );
}

/**
 * 获取复习统计数据
 * @param {string} userId
 * @returns {Promise<object>} {pending, mastered, total, byLevel, recentErrors, frequentErrors}
 */
async function getReviewStats(userId) {
  const uid = String(userId);

  const totalRow = await db.get(
    `SELECT COUNT(*) as count FROM wrong_questions WHERE user_id = $1`,
    [uid]
  );
  const masteredRow = await db.get(
    `SELECT COUNT(*) as count FROM wrong_questions WHERE user_id = $1 AND mastered = 1`,
    [uid]
  );
  const pendingRow = await db.get(
    `SELECT COUNT(*) as count FROM wrong_questions WHERE user_id = $1 AND mastered = 0`,
    [uid]
  );

  const byLevel = await db.all(
    `SELECT level, COUNT(*) as count,
       AVG(wrong_count) as avg_wrong_count,
       MAX(wrong_count) as max_errors
     FROM wrong_questions
     WHERE user_id = $1
     GROUP BY level ORDER BY level`,
    [uid]
  );

  const recentErrors = await db.all(
    `SELECT * FROM wrong_questions
     WHERE user_id = $1
     ORDER BY last_wrong_time DESC LIMIT 5`,
    [uid]
  );

  const frequentErrors = await db.all(
    `SELECT * FROM wrong_questions
     WHERE user_id = $1
     ORDER BY wrong_count DESC LIMIT 5`,
    [uid]
  );

  return {
    total: parseInt(totalRow?.count) || 0,
    mastered: parseInt(masteredRow?.count) || 0,
    pending: parseInt(pendingRow?.count) || 0,
    byLevel,
    recentErrors,
    frequentErrors
  };
}

/**
 * 提交复习答案
 * @param {string} userId
 * @param {number} questionId - wrong_questions.id
 * @param {string} userAnswer
 * @returns {Promise<object>} {correct, mastered, correctAnswer, correctStreak}
 */
async function submitReviewAnswer(userId, questionId, userAnswer) {
  const row = await db.get(
    `SELECT * FROM wrong_questions WHERE id = $1 AND user_id = $2`,
    [questionId, String(userId)]
  );

  if (!row) {
    throw new Error('错题不存在');
  }

  const normalize = (s) => String(s || '').trim().replace(/[，。！？、；：""''（）\s]/g, '');
  const correct = normalize(userAnswer) === normalize(row.answer);

  if (correct) {
    const newStreak = (row.correct_streak || 0) + 1;
    const mastered = newStreak >= 2 ? 1 : 0;

    await db.run(
      `UPDATE wrong_questions
       SET correct_streak = $1, mastered = $2, last_reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newStreak, mastered, questionId]
    );

    return {
      correct: true,
      mastered: mastered === 1,
      correctAnswer: row.answer,
      correctStreak: newStreak
    };
  } else {
    await db.run(
      `UPDATE wrong_questions
       SET wrong_count = wrong_count + 1, correct_streak = 0,
           last_wrong_time = CURRENT_TIMESTAMP, user_answer = $1
       WHERE id = $2`,
      [userAnswer || '', questionId]
    );

    return {
      correct: false,
      mastered: false,
      correctAnswer: row.answer,
      correctStreak: 0
    };
  }
}

/**
 * 标记错题为已掌握
 * @param {string} userId
 * @param {number} questionId
 */
async function markAsMastered(userId, questionId) {
  const result = await db.run(
    `UPDATE wrong_questions
     SET mastered = 1, correct_streak = GREATEST(correct_streak, 2),
         last_reviewed_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2`,
    [questionId, String(userId)]
  );
  return result.rowCount > 0;
}

/**
 * 删除错题
 * @param {string} userId
 * @param {number} questionId
 */
async function deleteWrongQuestion(userId, questionId) {
  const result = await db.run(
    `DELETE FROM wrong_questions WHERE id = $1 AND user_id = $2`,
    [questionId, String(userId)]
  );
  return result.rowCount > 0;
}

/**
 * 获取AI提示
 * @param {string} question - 题目
 * @param {string} answer - 正确答案
 * @param {string} full_poem - 诗词全文
 * @param {string} author - 作者
 * @param {string} title - 标题
 * @returns {Promise<object>} {hint1, hint2, hint3}
 */
async function getAIHints(question, answer, full_poem, author, title) {
  const systemContent = `你是一位精通中国古诗词的国学大师，擅长给出循序渐进的提示帮助学生回忆起正确答案。
请根据题目信息，给出3条由浅入深的提示，帮助学生逐步回忆起正确答案。
要求：
- hint1: 最浅层的提示（给出方向性引导，不直接透露答案，30字以内）
- hint2: 中等提示（结合诗词背景或意象给出更具体的线索，40字以内）
- hint3: 最深层提示（几乎直接点明答案特征，如首字、字数等，30字以内）
请用中文回答，返回纯JSON对象，不要包含markdown代码块标记。`;

  const userContent = `题目：${question || ''}
正确答案：${answer || ''}
诗词全文：${full_poem || '无'}
作者：${author || '佚名'}
标题：${title || '无'}
请给出3条由浅入深的提示。`;

  try {
    const result = await aiService.callAIGenerateJSON(userContent, systemContent, {
      max_tokens: 400,
      temperature: 0.7
    });

    if (result && (result.hint1 || result.hint2 || result.hint3)) {
      return {
        hint1: result.hint1 || '',
        hint2: result.hint2 || '',
        hint3: result.hint3 || ''
      };
    }

    return _getFallbackHints(question, answer, full_poem, author, title);
  } catch (error) {
    console.error('[wrongQuestionService] AI提示生成失败:', error.message);
    return _getFallbackHints(question, answer, full_poem, author, title);
  }
}

/**
 * 本地兜底提示（AI不可用时使用）
 */
function _getFallbackHints(question, answer, full_poem, author, title) {
  const ans = String(answer || '').trim();
  const ttl = String(title || '').trim();
  const auth = String(author || '').trim();
  const poem = String(full_poem || '').trim();
  const firstLine = poem.split(/\r?\n/).map(l => l.trim()).filter(Boolean)[0] || '';

  return {
    hint1: auth
      ? (ttl ? `本题出自《${ttl}》，作者${auth}。` : `本题与诗人${auth}相关。`)
      : (firstLine ? `可从首句意象入手：「${firstLine.slice(0, 20)}」` : '先明确题目在问哪类信息。'),
    hint2: firstLine
      ? '结合全诗结构，注意对仗句与押韵位置是否给出线索。'
      : '若题干提到上下句或对仗，可从词性对应入手。',
    hint3: ans
      ? (ans.length <= 3
          ? `标答较短（${ans.length}字），可逐一核对候选字。`
          : `答案首字为「${ans.charAt(0)}」，共${ans.length}字。`)
      : '回忆与题干直接对应的原文表述。'
  };
}

/**
 * 获取复习题目列表（按错误次数排序，仅未掌握的）
 */
async function getReviewQuestions(userId, count = 10) {
  return db.all(
    `SELECT * FROM wrong_questions
     WHERE user_id = $1 AND mastered = 0
     ORDER BY wrong_count DESC, last_wrong_time DESC LIMIT $2`,
    [String(userId), count]
  );
}

/**
 * 获取错题数量
 */
async function getWrongQuestionCount(userId) {
  const row = await db.get(
    'SELECT COUNT(*) as count FROM wrong_questions WHERE user_id = $1',
    [String(userId)]
  );
  return parseInt(row?.count) || 0;
}

/**
 * 清空错题
 */
async function clearWrongQuestions(userId) {
  const result = await db.run(
    'DELETE FROM wrong_questions WHERE user_id = $1',
    [String(userId)]
  );
  return result.rowCount;
}

module.exports = {
  addWrongQuestion,
  getWrongQuestions,
  getWrongQuestionCount,
  deleteWrongQuestion,
  clearWrongQuestions,
  getReviewStats,
  submitReviewAnswer,
  markAsMastered,
  getAIHints,
  getReviewQuestions,
};
