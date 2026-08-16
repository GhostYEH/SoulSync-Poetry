const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const aiService = require('../services/aiService');
const challengeService = require('../services/challengeService');
const authenticateToken = require('../middleware/auth');
const learningEventService = require('../services/learningEventService');



router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { score, wrongCount, correctCount, missedCount, duration, difficultyLevel, errors } = req.body;
    if (typeof score !== 'number') {
      return res.status(400).json({ success: false, message: '参数错误' });
    }
    const finalUserId = req.user.userId;
    const finalWrong = wrongCount || 0;
    const finalCorrect = correctCount || 0;
    const finalMissed = missedCount || 0;
    const finalDuration = duration || 0;
    const finalDifficulty = difficultyLevel || 1;

    const result = await db.run(
      `INSERT INTO card_game_records (user_id, score, wrong_count, correct_count, missed_count, duration, difficulty_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [finalUserId, score, finalWrong, finalCorrect, finalMissed, finalDuration, finalDifficulty]
    );
    const recordId = result.rows[0].id;

    if (errors && Array.isArray(errors) && errors.length > 0) {
      for (const e of errors) {
        await db.run(
          `INSERT INTO card_game_errors (record_id, question_text, user_answer, correct_answer)
           VALUES ($1, $2, $3, $4)`,
          [recordId, e.questionText || '', e.userAnswer || '', e.correctAnswer || '']
        );
      }
    }

    learningEventService.recordEvent({
      userId: finalUserId,
      eventType: learningEventService.EVENT_TYPES.COMPLETE_GAME,
      gameId: 'card-catch',
      knowledgePoints: ['memorization'],
      correct: finalCorrect > 0,
      score,
      difficulty: finalDifficulty,
      duration: finalDuration,
      metadata: { correctCount: finalCorrect, wrongCount: finalWrong, missedCount: finalMissed },
      eventKey: `card-catch:${finalUserId}:${recordId}`,
    }).catch(err => console.error('[learningEvent] 卡片游戏事件失败:', err.message));

    res.json({ success: true, recordId, message: '游戏记录已保存' });
  } catch (err) {
    console.error('保存游戏记录失败:', err);
    res.status(500).json({ success: false, message: '保存失败' });
  }
});

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;

    const rows = await db.all(
      `SELECT * FROM card_game_records WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    res.json({ success: true, records: rows });
  } catch (err) {
    console.error('获取历史记录失败:', err);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.get('/record/:id', authenticateToken, async (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    const record = await db.get(
      `SELECT * FROM card_game_records WHERE id = $1`,
      [recordId]
    );
    if (!record) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    const errors = await db.all(
      `SELECT * FROM card_game_errors WHERE record_id = $1`,
      [recordId]
    );
    res.json({ success: true, record, errors });
  } catch (err) {
    res.status(500).json({ success: false, message: '获取记录详情失败' });
  }
});

router.get('/ranking', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const rows = await db.all(
      `SELECT r.id, r.score, r.wrong_count, r.correct_count, r.duration, r.difficulty_level, r.created_at,
              u.username
       FROM card_game_records r
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.score DESC, r.duration ASC
       LIMIT $1`,
      [limit]
    );
    res.json({ success: true, ranking: rows });
  } catch (err) {
    console.error('获取排名失败:', err);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.post('/ai-explain', authenticateToken, async (req, res) => {
  const { questionText, wrongAnswer, correctAnswer } = req.body;
  if (!questionText || !wrongAnswer || !correctAnswer) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }

  const systemContent = `你是一位精通中国古诗词的专家，擅长分析诗句错误的原因并给出通俗易懂的讲解。
请根据用户提供的题目、错误答案和正确答案，给出JSON格式的讲解内容。
要求：
- reason: 简洁说明错误原因（20字以内）
- explanation: 详细讲解正确答案的含义和出处（60字以内）
- memory_tip: 一个帮助记忆正确答案的趣味口诀或联想提示（30字以内）
请用中文回答，返回纯JSON对象，不要包含markdown代码块标记。`;

  const userContent = `题目：${questionText}
错误的下句：${wrongAnswer}
正确的下句：${correctAnswer}
请分析：错误答案错在哪里？正确答案好在哪里？如何记住正确答案？`;

  try {
    const result = await aiService.callAIGenerateJSON(userContent, systemContent, {
      max_tokens: 400,
      temperature: 0.7
    });

    if (result && result.reason && result.explanation && result.memory_tip) {
      res.json({ success: true, data: result });
    } else {
      const fallbackData = {
        reason: result?.reason || '该下句与此诗意境不符',
        explanation: result?.explanation || `正确答案"${correctAnswer}"出自原文，意境优美，韵律和谐。`,
        memory_tip: result?.memory_tip || '记住关键词，多读几遍原诗。'
      };
      res.json({ success: true, data: fallbackData, mock: true });
    }
  } catch (error) {
    console.error('AI讲解失败:', error);
    res.json({
      success: true,
      data: {
        reason: '该下句与上句不匹配',
        explanation: `正确下句应为"${correctAnswer}"。该句出自经典诗词，意境深远。`,
        memory_tip: '反复朗读原诗，加深记忆。'
      },
      mock: true
    });
  }
});

router.post('/add-to-review', authenticateToken, async (req, res) => {
  try {
    const { questionText, correctAnswer, userAnswer, recordId, errorId, level, full_poem, author, title, question_id } = req.body;
    const uid = req.user.userId;

    if (!questionText || !correctAnswer) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const now = new Date().toISOString();

    const existing = await db.get(
      `SELECT id FROM wrong_questions WHERE user_id = $1 AND question = $2`,
      [String(uid), questionText]
    );

    let wrongId;
    if (existing) {
      await db.run(
        `UPDATE wrong_questions
         SET user_answer = $1, answer = $2, wrong_count = wrong_count + 1,
             last_wrong_time = CURRENT_TIMESTAMP, mastered = 0, correct_streak = 0,
             full_poem = COALESCE($3, full_poem), author = COALESCE($4, author), title = COALESCE($5, title)
         WHERE id = $6`,
        [userAnswer || '', correctAnswer, full_poem || null, author || null, title || null, existing.id]
      );
      wrongId = existing.id;
    } else {
      const result = await db.run(
        `INSERT INTO wrong_questions
         (user_id, question_id, question, answer, user_answer, level, wrong_count,
          last_wrong_time, correct_streak, mastered, full_poem, author, title, added_at)
         VALUES ($1, $2, $3, $4, $5, $6, 1, CURRENT_TIMESTAMP, 0, 0, $7, $8, $9, CURRENT_TIMESTAMP)
         RETURNING id`,
        [String(uid), question_id || null, questionText, correctAnswer, userAnswer || '',
         level || null, full_poem || null, author || null, title || null]
      );
      wrongId = result.rows[0].id;
    }

    if (errorId) {
      await db.run(`UPDATE card_game_errors SET added_to_review = 1 WHERE id = $1`, [errorId]);
    }
    res.json({ success: true, message: '已添加到错题本', id: wrongId });
  } catch (err) {
    console.error('添加错题失败:', err);
    res.status(500).json({ success: false, message: '添加失败' });
  }
});

router.get('/review-questions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rows = await db.all(
      `SELECT * FROM card_game_review WHERE user_id = $1 ORDER BY reviewed_at DESC LIMIT 20`,
      [userId]
    );
    res.json({ success: true, questions: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

router.post('/review-answer', authenticateToken, async (req, res) => {
  try {
    const { reviewId, userAnswer, isCorrect } = req.body;
    await db.run(
      `UPDATE card_game_review SET user_answer = $1, is_correct = $2, reviewed_at = now()::text WHERE id = $3`,
      [userAnswer || '', isCorrect ? 1 : 0, reviewId]
    );
    res.json({ success: true, message: '已记录' });
  } catch (err) {
    res.status(500).json({ success: false, message: '提交失败' });
  }
});

router.get('/questions', (req, res) => {
  const { difficulty, startLevel, count } = req.query;
  const limit = parseInt(count) || 20;
  const start = parseInt(startLevel) || 1;

  try {
    const { POEMS } = challengeService;
    if (!POEMS || POEMS.length === 0) {
      return res.json({ success: true, questions: [], message: '题库为空' });
    }

    let filtered = POEMS;
    if (difficulty && ['easy', 'medium', 'hard', 'challenge'].includes(difficulty)) {
      filtered = POEMS.filter((p) => p.difficulty === difficulty);
    }

    if (start > 1) {
      filtered = filtered.filter((p) => p.level >= start);
    }

    const questions = [];
    const endLevel = start + limit * 2;
    for (const poem of filtered) {
      if (poem.level >= start && poem.level < endLevel) {
        for (const couplet of poem.couplets) {
          questions.push({
            question: couplet.question,
            answer: couplet.answer,
            poem: poem.title,
            author: poem.author,
            level: poem.level,
            difficulty: poem.difficulty,
            full_poem: poem.full_poem
          });
        }
      }
    }

    const shuffled = questions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(limit, shuffled.length));

    res.json({ success: true, questions: selected, total: questions.length });
  } catch (err) {
    console.error('[cardGame] 获取题目失败:', err);
    res.status(500).json({ success: false, message: '获取题目失败' });
  }
});

router.post('/check', (req, res) => {
  const { question, userAnswer } = req.body;
  if (!question || !userAnswer) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }

  try {
    const { POEMS } = challengeService;
    let matched = null;
    for (const poem of POEMS) {
      for (const couplet of poem.couplets) {
        if (couplet.question === question) {
          matched = couplet;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      return res.status(404).json({ success: false, message: '题目未找到' });
    }

    const { checkAnswer, normalize } = challengeService;
    const isCorrect = checkAnswer(userAnswer, matched.answer);

    res.json({
      success: true,
      isCorrect,
      correctAnswer: matched.answer,
      userAnswer,
      normalizedUser: normalize(userAnswer),
      normalizedCorrect: normalize(matched.answer)
    });
  } catch (err) {
    console.error('[cardGame] 判题失败:', err);
    res.status(500).json({ success: false, message: '判题失败' });
  }
});

module.exports = router;
