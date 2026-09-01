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

router.get('/progress/:level', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const level = Number(req.params.level);
  if (!Number.isInteger(level) || level < 1 || level > 200) {
    throw ApiError.validation('关卡必须是 1-200 之间的整数');
  }
  res.json(await challengeService.getLevelAnswerProgress(userId, level));
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

  const progress = await challengeService.getUserProgress(userId);
  const nextUnlockedLevel = Math.min(Number(progress.highest_level || 0) + 1, 200);
  if (Number(startLevel) > nextUnlockedLevel) {
    throw ApiError.forbidden(`第 ${startLevel} 关尚未解锁，请先完成第 ${nextUnlockedLevel} 关`);
  }

  try {
    const questions = await challengeService.generateQuestions(
      userId,
      startLevel,
      Math.min(Number(count), nextUnlockedLevel - Number(startLevel) + 1)
    );
    // 出题接口绝不下发答案，判题只能由 answer/submit 在服务端完成。
    res.json(questions.map(({ answer, answerIndex, ...question }) => question));
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
    level: 'required|int|positive|max:200',
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
    questionId: result.recordId ? `challenge_record:${result.recordId}` : null,
    questionText: question,
    correct: serverIsCorrect,
    difficulty: level || 3,
    hintCount: usedAiHelp ? 1 : 0,
    eventKey: `answer:${userId}:${attemptKey}`,
    metadata: {
      userAnswer,
      correctAnswer,
      poemTitle,
      poemAuthor,
      level,
      clientAttemptId: attemptKey,
      questionSource: 'challenge_record',
    },
  }).catch(err => console.error('[learningEvent] 答题事件记录失败:', err.message));

  res.json(result);
}));

router.post('/error-book/add', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { recordId, question, userAnswer, correctAnswer, explanation } = req.body;

  validate(req.body, {
    recordId: 'required|int|positive',
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

router.post('/error-book/:id/review', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { userAnswer } = req.body;
  validate({ id: req.params.id }, { id: 'required|int|positive' });
  validate(req.body, { userAnswer: 'required|string|minLen:1' });
  const result = await challengeService.reviewErrorBookQuestion(userId, Number(req.params.id), userAnswer);
  res.json(result);
}));

router.post('/error-book/:id/master', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  validate({ id: req.params.id }, { id: 'required|int|positive' });
  const updated = await challengeService.markErrorBookQuestionReviewed(userId, Number(req.params.id));
  if (!updated) throw ApiError.notFound('错题不存在');
  res.json({ success: updated });
}));

router.delete('/error-book/:id', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  validate({ id: req.params.id }, { id: 'required|int|positive' });
  const id = Number(req.params.id);
  const removed = await challengeService.removeFromErrorBook(userId, id);
  if (!removed) throw ApiError.notFound('错题不存在');
  res.json({ success: true });
}));

router.get('/leaderboard', asyncHandler(async (req, res) => {
  const leaderboard = await challengeService.getLeaderboard();
  res.json(leaderboard);
}));

module.exports = router;
