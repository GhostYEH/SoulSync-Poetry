const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const wrongQuestionService = require('../services/wrongQuestionService');
const learningEventService = require('../services/learningEventService');
const { validate, parsePagination } = require('../utils/validation');
const { ApiError } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const stats = await wrongQuestionService.getReviewStats(userId);
  res.json(stats);
}));

router.get('/questions', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { limit } = parsePagination(req, 20);
  const questions = await wrongQuestionService.getWrongQuestions(userId, limit);
  res.json(questions);
}));

router.post('/add', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const questionData = req.body;

  validate(req.body, {
    question: 'required|string|minLen:1',
    answer: 'required|string|minLen:1',
  });

  const result = await wrongQuestionService.addWrongQuestion(userId, questionData);

  learningEventService.recordEvent({
    userId,
    eventType: learningEventService.EVENT_TYPES.WRONG_ANSWER,
    questionId: result.id ? `wrong_question:${result.id}` : null,
    questionText: questionData.question || '',
    correct: false,
    difficulty: questionData.level || 3,
    eventKey: `wrong-add:${userId}:${result.id}`,
    metadata: {
      source: 'wrong-questions-add',
      questionSource: 'wrong_question',
      userAnswer: questionData.user_answer,
      correctAnswer: questionData.answer,
    },
  }).catch(err => console.error('[learningEvent] 错题添加事件失败:', err.message));

  res.json(result);
}));

router.post('/answer', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { questionId, userAnswer } = req.body;

  validate(req.body, {
    questionId: 'required|int|positive',
    userAnswer: 'required|string|minLen:1',
  });

  const result = await wrongQuestionService.submitReviewAnswer(userId, questionId, userAnswer);
  res.json(result);
}));

router.post('/master/:id', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  validate({ id: req.params.id }, { id: 'required|int|positive' });
  const questionId = Number(req.params.id);
  const updated = await wrongQuestionService.markAsMastered(userId, questionId);
  if (!updated) throw ApiError.notFound('错题不存在');
  res.json({ success: true });
}));

router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  validate({ id: req.params.id }, { id: 'required|int|positive' });
  const questionId = Number(req.params.id);
  const removed = await wrongQuestionService.deleteWrongQuestion(userId, questionId);
  if (!removed) throw ApiError.notFound('错题不存在');
  res.json({ success: true });
}));

router.post('/hints', authenticateToken, asyncHandler(async (req, res) => {
  const { question, answer, full_poem, author, title } = req.body;

  validate(req.body, {
    question: 'required|string|minLen:1',
    answer: 'required|string|minLen:1',
  });

  const hints = await wrongQuestionService.getAIHints(question, answer, full_poem, author, title);
  res.json(hints);
}));

module.exports = router;
