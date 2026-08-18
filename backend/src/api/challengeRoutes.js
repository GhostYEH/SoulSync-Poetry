const express = require('express');

const router = express.Router();
const db = require('../utils/db');
const challengeService = require('../services/challengeService');
const learningEventService = require('../services/learningEventService');
const { validate } = require('../utils/validation');
const { ApiError } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const authenticateToken = require('../middleware/auth');

router.get('/progress', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const progress = await challengeService.getUserProgress(userId);
  res.json(progress);
}));

router.post('/progress/update', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { level } = req.body;

  validate(req.body, {
    level: 'required|int|positive|max:200',
  });

  await challengeService.updateUserProgress(userId, level);
  res.json({ success: true });
}));

router.post('/questions/generate', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { startLevel, count = 20 } = req.body;

  validate(req.body, {
    startLevel: 'required|int|positive|max:200',
  });

  if (count !== undefined) {
    const countNum = Number(count);
    if (!Number.isInteger(countNum) || countNum < 1 || countNum > 100) {
      throw ApiError.validation('count 必须为 1-100 之间的整数');
    }
  }

  try {
    const questions = await challengeService.generateQuestions(userId, startLevel, count);
    res.json(questions);
  } catch (error) {
    if (error.message === '服务不可用，请稍后再试') {
      throw ApiError.unavailable(error.message);
    }
    throw error;
  }
}));

router.post('/answer/submit', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { level, question, userAnswer, correctAnswer, isCorrect, poemTitle, poemAuthor, usedAiHelp, clientAttemptId } = req.body;

  validate(req.body, {
    question: 'required|string|minLen:1',
    userAnswer: 'required|string|minLen:1',
  });

  const result = await challengeService.submitAnswer(
    userId,
    level,
    question,
    userAnswer,
    isCorrect,
    poemTitle,
    poemAuthor,
    correctAnswer
  );

  const serverIsCorrect = result.correct;

  const attemptKey = clientAttemptId || `legacy_record_${result.recordId}`;
  if (!clientAttemptId) {
    console.warn('[challengeRoutes] 未提供 clientAttemptId，无法保证幂等，回退到 recordId');
  }
  learningEventService.recordEvent({
    userId,
    eventType: serverIsCorrect ? learningEventService.EVENT_TYPES.CORRECT_ANSWER
                          : learningEventService.EVENT_TYPES.WRONG_ANSWER,
    questionId: result.recordId ? String(result.recordId) : null,
    questionText: question,
    correct: serverIsCorrect,
    difficulty: level || 3,
    hintCount: usedAiHelp ? 1 : 0,
    eventKey: `answer:${userId}:${attemptKey}`,
    metadata: { userAnswer, correctAnswer, poemTitle, poemAuthor, level, clientAttemptId: attemptKey },
  }).catch(err => console.error('[learningEvent] 答题事件记录失败:', err.message));

  res.json(result);
}));

router.post('/error-book/add', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { recordId, question, userAnswer, correctAnswer, explanation } = req.body;

  validate(req.body, {
    question: 'required|string|minLen:1',
    correctAnswer: 'required|string|minLen:1',
  });

  await challengeService.addToErrorBook(
    userId,
    recordId,
    question,
    userAnswer,
    correctAnswer,
    explanation
  );
  res.json({ success: true });
}));

router.get('/error-book', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const errors = await challengeService.getErrorBook(userId);
  res.json(errors);
}));

router.delete('/error-book/:id', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const id = req.params.id;
  await challengeService.removeFromErrorBook(userId, id);
  res.json({ success: true });
}));

router.get('/leaderboard', asyncHandler(async (req, res) => {
  const leaderboard = await challengeService.getLeaderboard();
  res.json(leaderboard);
}));

module.exports = router;
