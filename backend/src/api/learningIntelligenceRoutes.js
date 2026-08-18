/**
 * 学习智能 API
 * 暴露知识模型、学生知识状态、认知诊断、自适应推荐
 */
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const knowledgeModel = require('../services/knowledgeModelService');
const masteryEngine = require('../services/masteryUpdateEngine');
const cognitiveDiagnosis = require('../services/cognitiveDiagnosisService');
const { parsePagination } = require('../utils/validation');
const learningEventService = require('../services/learningEventService');
const learningPathService = require('../services/learningPathService');

// 知识树
router.get('/knowledge-tree', async (req, res) => {
  try {
    const tree = await knowledgeModel.getKnowledgeTree();
    res.json({ success: true, data: tree });
  } catch (err) {
    res.status(500).json({ message: '获取知识树失败' });
  }
});

// 学生知识状态
router.get('/student/states', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const states = await masteryEngine.getAllStates(userId);
    res.json({
      success: true,
      data: states.map(s => ({
        ...s,
        mastery: Math.round((s.mastery || 0) * 100),
        confidence: Math.round((s.confidence || 0) * 100),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: '获取知识状态失败' });
  }
});

// 学生认知诊断
router.get('/student/diagnosis', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const diag = await cognitiveDiagnosis.diagnoseStudent(userId);
    res.json({ success: true, data: diag });
  } catch (err) {
    res.status(500).json({ message: '认知诊断失败' });
  }
});

// 自适应推荐
router.get('/student/recommendation', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit } = parsePagination(req, 5, 50);
    const data = await learningPathService.getAdaptiveRecommendation(userId, limit);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ message: '推荐失败' });
  }
});

// 今日复习
router.get('/student/today-review', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const data = await learningPathService.getTodayReview(userId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ message: '获取复习失败' });
  }
});

// 学习事件查询
router.get('/student/events', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit } = parsePagination(req, 50, 200);
    const eventType = req.query.eventType || null;
    const data = await learningEventService.getUserEvents(userId, { eventType, limit });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ message: '获取学习事件失败' });
  }
});



module.exports = router;