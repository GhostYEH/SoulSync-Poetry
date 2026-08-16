const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const wrongQuestionService = require('../services/wrongQuestionService');
const learningEventService = require('../services/learningEventService');

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const stats = await wrongQuestionService.getReviewStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('获取复习统计失败:', error);
    res.status(500).json({ message: '获取复习统计失败' });
  }
});

router.get('/questions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 20;
    const questions = await wrongQuestionService.getWrongQuestions(userId, limit);
    res.json(questions);
  } catch (error) {
    console.error('获取错题列表失败:', error);
    res.status(500).json({ message: '获取错题列表失败' });
  }
});

router.post('/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const questionData = req.body;
    const result = await wrongQuestionService.addWrongQuestion(userId, questionData);

    learningEventService.recordEvent({
      userId,
      eventType: learningEventService.EVENT_TYPES.WRONG_ANSWER,
      questionId: result.id ? String(result.id) : null,
      questionText: questionData.question || '',
      correct: false,
      difficulty: questionData.level || 3,
      eventKey: `wrong-add:${userId}:${result.id}`,
      metadata: { source: 'wrong-questions-add', userAnswer: questionData.user_answer, correctAnswer: questionData.answer },
    }).catch(err => console.error('[learningEvent] 错题添加事件失败:', err.message));

    res.json(result);
  } catch (error) {
    console.error('添加错题失败:', error);
    res.status(500).json({ message: '添加错题失败' });
  }
});

router.post('/answer', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { questionId, userAnswer } = req.body;
    const result = await wrongQuestionService.submitReviewAnswer(userId, questionId, userAnswer);
    res.json(result);
  } catch (error) {
    console.error('提交答案失败:', error);
    res.status(500).json({ message: '提交答案失败' });
  }
});

router.post('/master/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const questionId = req.params.id;
    await wrongQuestionService.markAsMastered(userId, questionId);
    res.json({ success: true });
  } catch (error) {
    console.error('标记已掌握失败:', error);
    res.status(500).json({ message: '标记已掌握失败' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const questionId = req.params.id;
    await wrongQuestionService.deleteWrongQuestion(userId, questionId);
    res.json({ success: true });
  } catch (error) {
    console.error('删除错题失败:', error);
    res.status(500).json({ message: '删除错题失败' });
  }
});

router.post('/hints', authenticateToken, async (req, res) => {
  try {
    const { question, answer, full_poem, author, title } = req.body;
    const hints = await wrongQuestionService.getAIHints(question, answer, full_poem, author, title);
    res.json(hints);
  } catch (error) {
    console.error('获取AI提示失败:', error);
    res.status(500).json({ message: '获取AI提示失败' });
  }
});

module.exports = router;
