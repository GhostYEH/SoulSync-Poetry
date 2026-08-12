const express = require('express');

const router = express.Router();
const db = require('../utils/db');
const challengeService = require('../services/challengeService');
const learningEventService = require('../services/learningEventService');

const authenticateToken = require('../middleware/auth');

router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const progress = await challengeService.getUserProgress(userId);
    res.json(progress);
  } catch (error) {
    console.error('获取用户进度失败:', error);
    res.status(500).json({ message: '获取进度失败' });
  }
});

router.post('/progress/update', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { level } = req.body;
    await challengeService.updateUserProgress(userId, level);
    res.json({ success: true });
  } catch (error) {
    console.error('更新进度失败:', error);
    res.status(500).json({ message: '更新进度失败' });
  }
});

router.post('/questions/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startLevel, count = 20 } = req.body;
    const questions = await challengeService.generateQuestions(userId, startLevel, count);
    res.json(questions);
  } catch (error) {
    console.error('生成题目失败:', error);
    if (error.message === '服务不可用，请稍后再试') {
      res.status(503).json({ message: error.message });
    } else {
      res.status(500).json({ message: '生成题目失败' });
    }
  }
});

router.post('/answer/submit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { level, question, userAnswer, correctAnswer, isCorrect, poemTitle, poemAuthor, usedAiHelp, clientAttemptId } = req.body;
    const result = await challengeService.submitAnswer(
      userId,
      level,
      question,
      userAnswer,
      isCorrect,
      poemTitle,
      poemAuthor
    );

    // 接入学习事件闭环（异步，不阻塞答题主流程）
    // 幂等设计：clientAttemptId 由前端在一次答题开始时生成 UUID，HTTP 重试复用同一值
    // 同一次 attempt 的 retry → 相同 eventKey → LearningEvent 不重复
    // 不同时间重新答题 → 不同 clientAttemptId → 新 LearningEvent
    const attemptKey = clientAttemptId || `legacy_record_${result.recordId}`;
    if (!clientAttemptId) {
      console.warn('[challengeRoutes] 未提供 clientAttemptId，无法保证幂等，回退到 recordId');
    }
    learningEventService.recordEvent({
      userId,
      eventType: isCorrect ? learningEventService.EVENT_TYPES.CORRECT_ANSWER
                            : learningEventService.EVENT_TYPES.WRONG_ANSWER,
      questionId: result.recordId ? String(result.recordId) : null,
      questionText: question,
      correct: !!isCorrect,
      difficulty: level || 3,
      hintCount: usedAiHelp ? 1 : 0,
      eventKey: `answer:${userId}:${attemptKey}`,
      metadata: { userAnswer, correctAnswer, poemTitle, poemAuthor, level, clientAttemptId: attemptKey },
    }).catch(err => console.error('[learningEvent] 答题事件记录失败:', err.message));

    res.json(result);
  } catch (error) {
    console.error('提交答案失败:', error);
    res.status(500).json({ message: '提交答案失败' });
  }
});

router.post('/error-book/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { recordId, question, userAnswer, correctAnswer, explanation } = req.body;
    await challengeService.addToErrorBook(
      userId,
      recordId,
      question,
      userAnswer,
      correctAnswer,
      explanation
    );
    res.json({ success: true });
  } catch (error) {
    console.error('加入错题本失败:', error);
    res.status(500).json({ message: '加入错题本失败' });
  }
});

router.get('/error-book', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const errors = await challengeService.getErrorBook(userId);
    res.json(errors);
  } catch (error) {
    console.error('获取错题本失败:', error);
    res.status(500).json({ message: '获取错题本失败' });
  }
});

router.delete('/error-book/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const id = req.params.id;
    await challengeService.removeFromErrorBook(userId, id);
    res.json({ success: true });
  } catch (error) {
    console.error('删除错题失败:', error);
    res.status(500).json({ message: '删除错题失败' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await challengeService.getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({ message: '获取排行榜失败' });
  }
});

module.exports = router;
