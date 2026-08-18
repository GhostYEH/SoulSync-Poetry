const express = require('express');
const router = express.Router();
const feihuaService = require('../services/feihuaService');
const feihualingService = require('../services/feihualingService');
const authenticateToken = require('../middleware/auth');
const learningEventService = require('../services/learningEventService');
const { validate } = require('../utils/validation');
const { ApiError } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const db = require('../utils/db');

router.post('/save', authenticateToken, asyncHandler(async (req, res) => {
  const { keyword, score, poemCount, history, gameSessionId } = req.body;
  const { userId } = req.user;

  validate(req.body, {
    keyword: 'required|string|minLen:1|maxLen:20',
    score: 'required|int|min:0',
    poemCount: 'required|int|min:0',
    history: 'required',
  });

  const gameRecord = await feihuaService.saveFeihuaGame(userId, keyword, score, poemCount, history);

  if (!gameSessionId) {
    console.warn('[feihuaRoutes] 未提供 gameSessionId，无法保证幂等，回退到 gameRecord.id');
  }
  const sessionKey = gameSessionId || `legacy_game_${gameRecord.id}`;
  const knowledgePoints = ['memorization'];
  const imageryMap = { '月': 'imagery_moon', '柳': 'imagery_willow', '雁': 'imagery_wildgoose',
    '酒': 'imagery_wine', '花': 'imagery', '风': 'imagery', '雪': 'imagery', '春': 'imagery' };
  if (imageryMap[keyword]) knowledgePoints.push(imageryMap[keyword]);

  learningEventService.recordEvent({
    userId,
    eventType: learningEventService.EVENT_TYPES.PLAY_FEIHUALING,
    gameId: 'feihua',
    knowledgePoints,
    correct: poemCount > 0,
    score,
    difficulty: 3,
    duration: poemCount * 10,
    metadata: { keyword, poemCount, score, gameSessionId: sessionKey },
    questionText: `飞花令·${keyword}`,
    eventKey: `feihua:${userId}:${sessionKey}`,
  }).catch(err => console.error('[learningEvent] 飞花令事件失败:', err.message));

  res.json({
    success: true,
    message: '游戏记录保存成功',
    data: gameRecord
  });
}));

router.get('/games', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const games = await feihuaService.getUserFeihuaGames(userId);
  res.json({
    success: true,
    data: games,
    total: games.length
  });
}));

router.get('/high-score', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const highScore = await feihuaService.getHighScore(userId);
  res.json({
    success: true,
    data: {
      highScore
    }
  });
}));

router.get('/fight-history', authenticateToken, asyncHandler(async (req, res) => {
  const id = req.user.userId;
  const user = await db.get('SELECT username FROM users WHERE id = $1', [id]);

  if (!user) {
    throw ApiError.notFound('用户不存在');
  }

  const history = await feihualingService.getFightHistory(user.username);
  res.json({
    success: true,
    data: history
  });
}));

module.exports = router;
