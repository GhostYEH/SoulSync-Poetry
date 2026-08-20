const express = require('express');
const router = express.Router();
const feihuaService = require('../services/feihuaService');
const feihualingService = require('../services/feihualingService');
const authenticateToken = require('../middleware/auth');
const learningEventService = require('../services/learningEventService');
const wrongQuestionService = require('../services/wrongQuestionService');
const aiService = require('../services/aiService');
const feihuaData = require('../data/feihuaPoems');
const feihuaPoems = feihuaData.feihuaPoems || feihuaData;
const { validate } = require('../utils/validation');
const { ApiError } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const db = require('../utils/db');

// 每局最多三次提示；状态只保存本局，避免把提示次数跨局串在一起。
const hintSessions = new Map();
const HINT_LIMIT = 3;
const normalizePoem = (value) => String(value || '').replace(/[，。！？；：、""''（）【】《》\s]/g, '');

function pickUnusedHint(keyword, usedPoems = []) {
  const used = new Set(usedPoems.map(normalizePoem));
  const pool = Array.isArray(feihuaPoems[keyword]) ? feihuaPoems[keyword] : [];
  return pool.find(item => !used.has(normalizePoem(item.poem))) || null;
}

function parseAIHint(result, keyword, usedPoems) {
  if (!result) return null;
  const raw = result.poem || result.sentence || result.answer || result.data;
  const poem = typeof raw === 'string' ? raw : raw?.poem;
  if (!poem || !normalizePoem(poem).includes(keyword)) return null;
  const used = new Set(usedPoems.map(normalizePoem));
  if (used.has(normalizePoem(poem))) return null;
  return {
    poem,
    author: typeof raw === 'object' ? raw.author : result.author,
    dynasty: typeof raw === 'object' ? raw.dynasty : result.dynasty,
    title: typeof raw === 'object' ? raw.title : result.title
  };
}

router.post('/hint', authenticateToken, asyncHandler(async (req, res) => {
  const { keyword, usedPoems = [], sessionId } = req.body;
  validate(req.body, {
    keyword: 'required|string|minLen:1|maxLen:2',
    sessionId: 'required|string|minLen:1|maxLen:100'
  });

  const key = `${req.user.userId}:${sessionId}`;
  const state = hintSessions.get(key) || { count: 0, poems: [] };
  if (state.count >= HINT_LIMIT) {
    return res.status(429).json({ success: false, message: '本局提示次数已用完', remaining: 0 });
  }

  const seen = [...new Set([...usedPoems, ...state.poems])];
  const prompt = `请为飞花令令字「${keyword}」推荐一句真实、经典、可核验的古诗词句。\n已使用或已提示过的诗句（绝对不能重复）：${seen.join('；') || '无'}\n只返回JSON：{"poem":"完整诗句","author":"作者","dynasty":"朝代","title":"诗题"}。不要编造，不要返回解释。`;
  const system = '你是严谨的中国古诗词检索助手。只返回真实诗句，必须包含指定令字，不能与排除列表重复。';

  let picked = null;
  let source = 'database';
  try {
    const aiResult = await aiService.callAIGenerateJSON(prompt, system, { max_tokens: 220, temperature: 0.2 });
    picked = parseAIHint(aiResult, keyword, seen);
    if (picked) source = 'ai';
  } catch (error) {
    console.warn('[feihuaRoutes] 飞花令提示AI失败，使用题库兜底:', error.message);
  }
  picked = picked || pickUnusedHint(keyword, seen);
  if (!picked) {
    return res.status(404).json({ success: false, message: '本局可提示的诗句已用尽' });
  }

  state.count += 1;
  state.poems.push(picked.poem);
  hintSessions.set(key, state);

  await wrongQuestionService.addWrongQuestion(req.user.userId, {
    question_id: null,
    question: `飞花令·${keyword}（提示诗句）·${picked.poem}`,
    answer: picked.poem,
    user_answer: '',
    level: 3,
    full_poem: picked.poem,
    author: picked.author || '佚名',
    title: picked.title || '飞花令提示',
    source: 'feihualing_hint'
  });

  return res.json({
    success: true,
    poem: picked,
    source,
    count: state.count,
    remaining: HINT_LIMIT - state.count
  });
}));

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
