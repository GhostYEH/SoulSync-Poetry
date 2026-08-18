const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const feihuaRankingService = require('../services/feihuaRankingService');
const { parsePagination } = require('../utils/validation');
const { ApiError } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const info = await feihuaRankingService.getRankingInfo(userId);
  const rankInfo = await feihuaRankingService.getUserRank(userId);
  res.json({
    success: true,
    data: {
      ...info,
      rank: rankInfo.rank
    }
  });
}));

router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { limit, page } = parsePagination(req, 50);
  const leaderboard = await feihuaRankingService.getLeaderboard(limit, page);
  res.json({ success: true, data: leaderboard });
}));

router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await feihuaRankingService.getRankingStats();
  res.json({ success: true, data: stats });
}));

router.get('/levels', asyncHandler(async (req, res) => {
  res.json({ success: true, data: feihuaRankingService.RANK_LEVELS });
}));

router.get('/user/:userId', asyncHandler(async (req, res) => {
  const userIdNum = parseInt(req.params.userId);
  if (isNaN(userIdNum) || userIdNum <= 0) {
    throw ApiError.badRequest('无效的用户ID');
  }
  const info = await feihuaRankingService.getRankingInfo(userIdNum);
  const rankInfo = await feihuaRankingService.getUserRank(userIdNum);
  res.json({
    success: true,
    data: {
      ...info,
      rank: rankInfo?.rank
    }
  });
}));

module.exports = router;
