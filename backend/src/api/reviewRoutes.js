const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const reviewService = require('../services/reviewService');
const db = require('../utils/db');

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
    console.error('获取复习任务失败:', error);
    res.status(500).json({ message: '获取复习任务失败' });
  }
});

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const stats = await reviewService.getReviewStats(userId);
    const categories = await reviewService.getWrongQuestionCategories(userId);
    res.json({ success: true, data: { ...stats, categories } });
  } catch (error) {
    console.error('获取复习统计失败:', error);
    res.status(500).json({ message: '获取复习统计失败' });
  }
});

router.get('/plan', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const days = parseInt(req.query.days) || 7;
    const plan = await reviewService.getFuturePlan(userId, days);
    res.json({ success: true, data: plan });
  } catch (error) {
    console.error('获取复习计划失败:', error);
    res.status(500).json({ message: '获取复习计划失败' });
  }
});

router.post('/complete', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { poemId, correct } = req.body;
    const result = await reviewService.completeReview(userId, poemId, correct);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('完成复习失败:', error);
    res.status(500).json({ message: '完成复习失败' });
  }
});

router.post('/categorize', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { questionId, category } = req.body;
    const result = await reviewService.categorizeWrongQuestion(userId, questionId, category);
    res.json(result);
  } catch (error) {
    console.error('分类错题失败:', error);
    res.status(500).json({ message: '分类错题失败' });
  }
});

router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const categories = await reviewService.getWrongQuestionCategories(userId);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('获取分类统计失败:', error);
    res.status(500).json({ message: '获取分类统计失败' });
  }
});

module.exports = router;
