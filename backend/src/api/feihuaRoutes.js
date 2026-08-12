const express = require('express');
const router = express.Router();
const feihuaService = require('../services/feihuaService');
const feihualingService = require('../services/feihualingService');
const authenticateToken = require('../middleware/auth');
const learningEventService = require('../services/learningEventService');
const db = require('../utils/db');

router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { keyword, score, poemCount, history, gameSessionId } = req.body;
    const { userId } = req.user;

    if (!keyword || !score || !poemCount || !history) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    const gameRecord = await feihuaService.saveFeihuaGame(userId, keyword, score, poemCount, history);

    // 接入学习事件闭环：飞花令考察诗句记忆 + 意象联想
    // 幂等设计：gameSessionId 由前端在游戏开始时生成 UUID，HTTP 重试复用同一值
    // 同一局游戏的 retry → 相同 eventKey → LearningEvent 不重复
    // 不同局游戏 → 不同 gameSessionId → 新 LearningEvent
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
  } catch (error) {
    console.error('保存游戏记录失败:', error);
    res.status(500).json({ message: '保存游戏记录失败' });
  }
});

router.get('/games', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const games = await feihuaService.getUserFeihuaGames(userId);

    res.json({
      success: true,
      data: games,
      total: games.length
    });
  } catch (error) {
    console.error('获取游戏记录失败:', error);
    res.status(500).json({ message: '获取游戏记录失败' });
  }
});

router.get('/high-score', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const highScore = await feihuaService.getHighScore(userId);

    res.json({
      success: true,
      data: {
        highScore
      }
    });
  } catch (error) {
    console.error('获取最高得分失败:', error);
    res.status(500).json({ message: '获取最高得分失败' });
  }
});

router.get('/fight-history', authenticateToken, async (req, res) => {
  try {
    const id = req.user.userId;
    const user = await db.get('SELECT username FROM users WHERE id = $1', [id]);

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const history = await feihualingService.getFightHistory(user.username);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('获取对战历史失败:', error);
    res.status(500).json({ message: '获取对战历史失败' });
  }
});

module.exports = router;
