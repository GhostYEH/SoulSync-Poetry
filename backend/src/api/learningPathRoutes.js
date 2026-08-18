const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const learningPathService = require('../services/learningPathService');
const { parsePagination } = require('../utils/validation');
const { asyncHandler } = require('../utils/asyncHandler');
const abilityModelService = require('../services/abilityModelService');

router.get('/path', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  let path = await learningPathService.getLearningPath(userId);

  if (!path) {
    const generated = await learningPathService.generateLearningPath(userId);
    await learningPathService.updateLearningPath(userId, {
      level: generated.level,
      recommendations: generated.recommendations
    });
    path = await learningPathService.getLearningPath(userId);
  }

  res.json({ success: true, data: path });
}));

router.post('/regenerate', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const generated = await learningPathService.generateLearningPath(userId);

  await learningPathService.updateLearningPath(userId, {
    level: generated.level,
    recommendations: generated.recommendations
  });

  res.json({ success: true, data: generated });
}));

router.get('/ability', authenticateToken, asyncHandler(async (req, res) => {
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
}));

router.post('/ability/refresh', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const model = await abilityModelService.calculateAbilityModel(userId);
  res.json({ success: true, data: model });
}));

router.get('/assessment', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const assessment = await learningPathService.assessUserLevel(userId);
  res.json({ success: true, data: assessment });
}));

router.get('/adaptive', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { limit } = parsePagination(req, 5, 50);
  const data = await learningPathService.getAdaptiveRecommendation(userId, limit);
  res.json({ success: true, data });
}));

router.get('/today-review', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const data = await learningPathService.getTodayReview(userId);
  res.json({ success: true, data });
}));

module.exports = router;
