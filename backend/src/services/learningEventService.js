/**
 * 学习事件服务
 *
 * 统一记录学生所有重要学习行为，并驱动知识状态更新。
 *
 * 事件类型：
 *   VIEW_POEM / ANSWER_QUESTION / CORRECT_ANSWER / WRONG_ANSWER
 *   RECITE_POEM / RECITATION_ERROR / USE_HINT / ASK_AI / REVIEW_POEM
 *   PLAY_FEIHUALING / PLAY_CHAIN_GAME / COMPLETE_GAME
 *   START_LEARNING / COMPLETE_LEARNING
 *
 * 流程：
 *   recordEvent(event)
 *     → 插入 learning_events
 *     → 推断/补全 knowledgePoints
 *     → masteryUpdateEngine.updateFromEvent
 */

const db = require('../utils/db');
const knowledgeModel = require('./knowledgeModelService');
const masteryEngine = require('./masteryUpdateEngine');

const EVENT_TYPES = {
  VIEW_POEM: 'VIEW_POEM',
  ANSWER_QUESTION: 'ANSWER_QUESTION',
  CORRECT_ANSWER: 'CORRECT_ANSWER',
  WRONG_ANSWER: 'WRONG_ANSWER',
  RECITE_POEM: 'RECITE_POEM',
  RECITATION_ERROR: 'RECITATION_ERROR',
  USE_HINT: 'USE_HINT',
  ASK_AI: 'ASK_AI',
  REVIEW_POEM: 'REVIEW_POEM',
  PLAY_FEIHUALING: 'PLAY_FEIHUALING',
  PLAY_CHAIN_GAME: 'PLAY_CHAIN_GAME',
  COMPLETE_GAME: 'COMPLETE_GAME',
  START_LEARNING: 'START_LEARNING',
  COMPLETE_LEARNING: 'COMPLETE_LEARNING',
};

/**
 * 将关键词推断的知识点映射写入 question_knowledge_mappings（幂等）
 * source='rule'，confidence=0.8
 * 优先级：manual > rule > ai > legacy
 */
async function persistRuleMappings(questionId, kpIds, executor = db) {
  if (kpIds.length === 0) return 0;
  const placeholders = kpIds.map((_, i) =>
    `($${i * 2 + 1}, $${i * 2 + 2}, 1.0, 'rule', 0.8)`
  ).join(', ');
  const params = kpIds.flatMap(kpId => [String(questionId), kpId]);
  const result = await executor.run(
    `INSERT INTO question_knowledge_mappings (question_id, knowledge_point_id, weight, source, confidence)
     VALUES ${placeholders}
     ON CONFLICT (question_id, knowledge_point_id) DO NOTHING`,
    params
  );
  return result.rowCount || 0;
}

/**
 * 将学习过程中出现的真实题目保存到可检索目录，供个性化教学复用。
 */
async function persistPracticeQuestion(event, executor = db) {
  if (!event.questionId || !event.questionText) return 0;

  const metadata = event.metadata || {};
  const options = metadata.options == null
    ? null
    : (typeof metadata.options === 'string' ? metadata.options : JSON.stringify(metadata.options));
  const result = await executor.run(
    `INSERT INTO challenge_questions
     (question_id, challenge_id, question_index, poem_id, question_type, question_text, correct_answer, options, source, updated_at)
     VALUES ($1,0,0,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)
     ON CONFLICT (question_id) DO UPDATE SET
       poem_id = COALESCE(excluded.poem_id, challenge_questions.poem_id),
       question_type = COALESCE(excluded.question_type, challenge_questions.question_type),
       question_text = excluded.question_text,
       correct_answer = COALESCE(excluded.correct_answer, challenge_questions.correct_answer),
       options = COALESCE(excluded.options, challenge_questions.options),
       source = COALESCE(excluded.source, challenge_questions.source),
       updated_at = CURRENT_TIMESTAMP`,
    [String(event.questionId), event.poemId || null, event.questionType || metadata.questionType || null,
      event.questionText, metadata.correctAnswer || null, options,
      metadata.questionSource || metadata.source || 'learning_event']
  );
  return result.rowCount || 0;
}

/**
 * 将升级前已经存在的闯关记录和错题记录补进练习题目录与知识映射。
 * 稳定 ID 带来源前缀，避免不同业务表的自增 ID 相互冲突。
 */
async function backfillPracticeQuestionCatalog() {
  const [challengeRows, wrongRows, poems, knowledgePoints] = await Promise.all([
    db.all(`SELECT 'challenge_record:' || CAST(r.id AS TEXT) AS question_id,
            r.question_content AS question_text, r.correct_answer,
            r.poem_title, r.poem_author, NULL AS poem_content,
            'challenge_record' AS source
     FROM user_challenge_records r
     WHERE r.question_content IS NOT NULL
       AND (NOT EXISTS (
         SELECT 1 FROM challenge_questions cq
         WHERE cq.question_id = 'challenge_record:' || CAST(r.id AS TEXT)
       ) OR NOT EXISTS (
         SELECT 1 FROM question_knowledge_mappings qkm
         WHERE qkm.question_id = 'challenge_record:' || CAST(r.id AS TEXT)
       ))`),
    db.all(`SELECT 'wrong_question:' || CAST(w.id AS TEXT) AS question_id,
            w.question AS question_text, w.answer AS correct_answer,
            w.title AS poem_title, w.author AS poem_author, w.full_poem AS poem_content,
            'wrong_question' AS source
     FROM wrong_questions w
     WHERE w.question IS NOT NULL
       AND (NOT EXISTS (
         SELECT 1 FROM challenge_questions cq
         WHERE cq.question_id = 'wrong_question:' || CAST(w.id AS TEXT)
       ) OR NOT EXISTS (
         SELECT 1 FROM question_knowledge_mappings qkm
         WHERE qkm.question_id = 'wrong_question:' || CAST(w.id AS TEXT)
       ))`),
    db.all('SELECT id, title, author, content FROM poems'),
    db.all('SELECT id, code FROM knowledge_points'),
  ]);

  const poemsByTitleAndAuthor = new Map();
  const poemsByTitle = new Map();
  for (const poem of poems) {
    poemsByTitleAndAuthor.set(`${poem.title}\u0000${poem.author || ''}`, poem);
    if (!poemsByTitle.has(poem.title)) poemsByTitle.set(poem.title, poem);
  }
  const knowledgePointIds = new Map(knowledgePoints.map(point => [point.code, point.id]));

  let questions = 0;
  let mappings = 0;
  await db.transaction(async tx => {
    for (const row of [...challengeRows, ...wrongRows]) {
      const poem = row.poem_title
        ? (poemsByTitleAndAuthor.get(`${row.poem_title}\u0000${row.poem_author || ''}`)
          || poemsByTitle.get(row.poem_title)
          || null)
        : null;
      questions += await persistPracticeQuestion({
        questionId: row.question_id,
        questionText: row.question_text,
        poemId: poem?.id || null,
        questionType: row.source,
        metadata: {
          correctAnswer: row.correct_answer,
          questionSource: row.source,
        },
      }, tx);

      const kpCodes = knowledgeModel.inferKnowledgePoints(row.question_text, {
        poemContent: row.poem_content || poem?.content || null,
        questionType: row.source,
      });
      const kpIds = kpCodes.map(code => knowledgePointIds.get(code)).filter(Boolean);
      mappings += await persistRuleMappings(row.question_id, kpIds, tx);
    }
  });

  return { questions, mappings };
}

/**
 * 记录学习事件并驱动知识状态更新
 * @param {object} event
 *   { userId, eventType, poemId?, questionId?, gameId?,
 *     knowledgePoints?, score?, correct?, difficulty?, duration?,
 *     attemptCount?, hintCount?, metadata?, questionText? }
 * @returns {Promise<object>} { eventId, knowledgePointIds }
 */
async function recordEvent(event) {
  const {
    userId, eventType, poemId, questionId, gameId,
    knowledgePoints, score, correct, difficulty, duration,
    attemptCount, hintCount, metadata, eventKey,
  } = event;

  if (!userId || !eventType) {
    throw new Error('recordEvent 需要 userId 和 eventType');
  }

  // 推断知识点（如果未显式提供）
  let kpCodes = knowledgePoints || [];
  if (kpCodes.length === 0 && event.questionText) {
    kpCodes = knowledgeModel.inferKnowledgePoints(event.questionText, {
      poemContent: event.poemContent,
      questionType: event.questionType,
    });
  }

  const kpIds = await knowledgeModel.getKnowledgePointIds(kpCodes);

  // 真实题目及其知识映射写入可检索目录；失败时明确记录，不影响核心学习事件。
  if (event.questionId && event.questionText) {
    try {
      await persistPracticeQuestion(event);
      await persistRuleMappings(event.questionId, kpIds);
    } catch (err) {
      console.warn('[learningEvent] 练习题目录写入失败:', err.message);
    }
  }

  // 插入 learning_events（幂等：如果 eventKey 已存在则跳过）
  const result = await db.run(
    `INSERT INTO learning_events
     (user_id, event_type, poem_id, question_id, game_id, knowledge_points,
      score, correct, difficulty, duration, attempt_count, hint_count, metadata, event_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (event_key) DO NOTHING
     RETURNING id`,
    [userId, eventType, poemId || null, questionId || null, gameId || null,
     JSON.stringify(kpCodes), score || 0, correct === undefined ? null : (correct ? 1 : 0),
     difficulty || 3, duration || 0, attemptCount || 1, hintCount || 0,
     JSON.stringify(metadata || {}), eventKey || null]
  );

  // 幂等：如果因 eventKey 冲突未插入，跳过掌握度更新
  if (!result.rows || result.rows.length === 0) {
    return { eventId: null, knowledgePointIds: kpIds, knowledgePointCodes: kpCodes, duplicated: true };
  }
  const eventId = result.rows[0].id;

  // 驱动知识状态更新（仅对产生证据的事件）
  const EVIDENCE_EVENTS = [
    EVENT_TYPES.ANSWER_QUESTION,
    EVENT_TYPES.CORRECT_ANSWER,
    EVENT_TYPES.WRONG_ANSWER,
    EVENT_TYPES.RECITE_POEM,
    EVENT_TYPES.RECITATION_ERROR,
    EVENT_TYPES.COMPLETE_GAME,
    EVENT_TYPES.REVIEW_POEM,
    EVENT_TYPES.PLAY_FEIHUALING,
    EVENT_TYPES.PLAY_CHAIN_GAME,
  ];

  if (EVIDENCE_EVENTS.includes(eventType) && kpIds.length > 0 && correct !== undefined) {
    await masteryEngine.updateFromEvent({
      userId,
      knowledgePointIds: kpIds,
      correct,
      difficulty: difficulty || 3,
      hintCount: hintCount || 0,
      createdAt: new Date(),
    });
  }

  return { eventId, knowledgePointIds: kpIds, knowledgePointCodes: kpCodes };
}

/**
 * 查询用户学习事件
 */
async function getUserEvents(userId, options = {}) {
  const { eventType, limit = 50, offset = 0, startDate, endDate } = options;
  const hasLimit = limit !== null;
  const cappedLimit = hasLimit ? Math.min(Math.max(1, parseInt(limit) || 50), 200) : null;
  const cappedOffset = Math.max(0, parseInt(offset) || 0);
  let sql = `SELECT * FROM learning_events WHERE user_id = $1`;
  const params = [userId];
  let idx = 2;
  if (eventType) { sql += ` AND event_type = $${idx++}`; params.push(eventType); }
  if (startDate) { sql += ` AND created_at >= $${idx++}`; params.push(startDate); }
  if (endDate) { sql += ` AND created_at <= $${idx++}`; params.push(endDate); }
  sql += ' ORDER BY created_at DESC';
  if (hasLimit) {
    sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(cappedLimit, cappedOffset);
  }
  return db.all(sql, params);
}

/**
 * 统计用户某时段事件数
 */
async function countEventsByType(userId, startDate, endDate) {
  return db.all(
    `SELECT event_type, COUNT(*) as count
     FROM learning_events
     WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3
     GROUP BY event_type ORDER BY count DESC`,
    [userId, startDate, endDate]
  );
}

module.exports = {
  EVENT_TYPES,
  recordEvent,
  backfillPracticeQuestionCatalog,
  getUserEvents,
  countEventsByType,
};
