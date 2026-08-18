const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const poetryChallengeService = require('../services/poetryChallengeService');
const { validate, parsePagination } = require('../utils/validation');
const { ApiError } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

router.get('/themes', asyncHandler(async (req, res) => {
  const themes = poetryChallengeService.getThemes();
  res.json({ success: true, data: themes });
}));

router.post('/generate', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { theme, keyword } = req.body;

  validate(req.body, {
    theme: 'required|string|minLen:1|maxLen:50',
  });

  const result = await poetryChallengeService.generateChallenge(userId, theme, keyword);
  res.json(result);
}));

router.post('/rate', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { challengeId, score } = req.body;

  validate(req.body, {
    challengeId: 'required|int|positive',
    score: 'required|int|min:1|max:10',
  });

  const result = await poetryChallengeService.ratePoem(userId, challengeId, score);
  res.json(result);
}));

router.get('/history', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { limit } = parsePagination(req, 20);
  const history = await poetryChallengeService.getChallengeHistory(userId, limit);
  res.json({ success: true, data: history });
}));

router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const stats = await poetryChallengeService.getChallengeStats(userId);
  res.json({ success: true, data: stats });
}));

module.exports = router;
