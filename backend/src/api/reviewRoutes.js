const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const reviewService = require('../services/reviewService');
const db = require('../utils/db');
const { validate } = require('../utils/validation');

function sendReviewError(res, error, fallbackMessage) {
  console.error(fallbackMessage + ':', error);
  const status = Number(error?.status) >= 400 && Number(error?.status) < 500 ? Number(error.status) : 500;
  return res.status(status).json({
    success: false,
    message: status < 500 ? error.message : fallbackMessage,
  });
}

router.get('/today', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const tasks = await reviewService.getTodayReviewTasks(userId);

    const enrichedTasks = await Promise.all(tasks.map(async (task) => {
      const poem = await db.get('SELECT * FROM poems WHERE id = $1', [task.poem_id]);
      return {
        ...task,
        poem: poem || null
      };
    }));

    res.json({ success: true, data: enrichedTasks });
  } catch (error) {
    sendReviewError(res, error, '获取复习任务失败');
  }
});

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const stats = await reviewService.getReviewStats(userId);
    const categories = await reviewService.getWrongQuestionCategories(userId);
    res.json({ success: true, data: { ...stats, categories } });
  } catch (error) {
    sendReviewError(res, error, '获取复习统计失败');
  }
});

router.get('/plan', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const days = req.query.days === undefined ? 7 : Number(req.query.days);
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      return res.status(400).json({ message: '复习计划天数必须是 1-90 的整数' });
    }
    const plan = await reviewService.getFuturePlan(userId, days);
    res.json({ success: true, data: plan });
  } catch (error) {
    sendReviewError(res, error, '获取复习计划失败');
  }
});

router.post('/complete', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { poemId, correct } = req.body;
    validate(req.body, { poemId: 'required|int|positive' });
    if (![true, false, 0, 1, '0', '1', 'true', 'false'].includes(correct)) {
      return res.status(400).json({ message: 'correct 必须是布尔值' });
    }
    const poem = await db.get('SELECT id FROM poems WHERE id = $1', [poemId]);
    if (!poem) {
      return res.status(404).json({ message: '诗词不存在' });
    }
    const result = await reviewService.completeReview(userId, poemId, correct);
    res.json({ success: true, data: result });
  } catch (error) {
    sendReviewError(res, error, '完成复习失败');
  }
});

router.post('/categorize', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { questionId, category } = req.body;
    validate(req.body, {
      questionId: 'required|int|positive',
      category: 'required|string|minLen:1|maxLen:50',
    });
    const result = await reviewService.categorizeWrongQuestion(userId, questionId, category);
    res.json(result);
  } catch (error) {
    sendReviewError(res, error, '分类错题失败');
  }
});

router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const categories = await reviewService.getWrongQuestionCategories(userId);
    res.json({ success: true, data: categories });
  } catch (error) {
    sendReviewError(res, error, '获取分类统计失败');
  }
});

module.exports = router;
