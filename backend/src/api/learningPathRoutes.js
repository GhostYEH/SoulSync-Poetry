// AI学习路径API路由
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const learningPathService = require('../services/learningPathService');
const abilityModelService = require('../services/abilityModelService');

// 获取用户学习路径
router.get('/path', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    let path = await learningPathService.getLearningPath(userId);
    
    // 如果没有记录，生成新的
    if (!path) {
      const generated = await learningPathService.generateLearningPath(userId);
      await learningPathService.updateLearningPath(userId, {
        level: generated.level,
        recommendations: generated.recommendations
      });
      path = await learningPathService.getLearningPath(userId);
    }
    
    res.json({ success: true, data: path });
  } catch (error) {
    console.error('获取学习路径失败:', error);
    res.status(500).json({ message: '获取学习路径失败' });
  }
});

// 重新生成学习路径
router.post('/regenerate', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const generated = await learningPathService.generateLearningPath(userId);
    
    await learningPathService.updateLearningPath(userId, {
      level: generated.level,
      recommendations: generated.recommendations
    });
    
    res.json({ success: true, data: generated });
  } catch (error) {
    console.error('重新生成学习路径失败:', error);
    res.status(500).json({ message: '重新生成学习路径失败' });
  }
});

// 获取能力模型
router.get('/ability', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const model = await abilityModelService.getAbilityModel(userId);
    const trend = await abilityModelService.getAbilityTrend(userId);
    const ranking = await abilityModelService.getAbilityRanking(userId);
    
    res.json({
      success: true,
      data: {
        ...model,
        trend,
        rank: ranking.rank
      }
    });
  } catch (error) {
    console.error('获取能力模型失败:', error);
    res.status(500).json({ message: '获取能力模型失败' });
  }
});

// 重新计算能力模型
router.post('/ability/refresh', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const model = await abilityModelService.calculateAbilityModel(userId);
    res.json({ success: true, data: model });
  } catch (error) {
    console.error('重新计算能力模型失败:', error);
    res.status(500).json({ message: '重新计算能力模型失败' });
  }
});

// 获取用户水平评估
router.get('/assessment', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const assessment = await learningPathService.assessUserLevel(userId);
    res.json({ success: true, data: assessment });
  } catch (error) {
    console.error('获取水平评估失败:', error);
    res.status(500).json({ message: '获取水平评估失败' });
  }
});

// 自适应推荐（基于知识状态）
router.get('/adaptive', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const data = await learningPathService.getAdaptiveRecommendation(userId, limit);
    res.json({ success: true, data });
  } catch (error) {
    console.error('自适应推荐失败:', error);
    res.status(500).json({ message: '自适应推荐失败' });
  }
});

// 今日复习
router.get('/today-review', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const data = await learningPathService.getTodayReview(userId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取今日复习失败:', error);
    res.status(500).json({ message: '获取今日复习失败' });
  }
});

module.exports = router;
