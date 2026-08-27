const express = require('express');
const router = express.Router();
const {
  getPersonalizedData,
  getReviewRecommendations,
  getLearnRecommendations,
  generateAIAnalysisReport,
  getAISuggestionDashboard,
  getChallengeRecords,
  getFeihuaRecords,
  getLearningRecords
} = require('../services/personalizedService');
const { getWrongQuestions } = require('../services/wrongQuestionService');

// 缓存配置
const CACHE_TTL = 30 * 60 * 1000; // 30分钟缓存
const analysisCache = new Map(); // userId -> { data, timestamp }
const adviceCache = new Map(); // userId -> { data, timestamp }

/**
 * 获取缓存数据
 */
function getCachedData(userId) {
  const cached = analysisCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[personalizedRoutes] 使用缓存数据，用户:', userId);
    return cached.data;
  }
  return null;
}

/**
 * 设置缓存数据
 */
function setCachedData(userId, data) {
  analysisCache.set(userId, {
    data,
    timestamp: Date.now()
  });
  console.log('[personalizedRoutes] 缓存已更新，用户:', userId);
}

/**
 * 清除缓存
 */
function clearCache(userId) {
  analysisCache.delete(userId);
  adviceCache.delete(userId);
}

function getCachedAdvice(userId) {
  const cached = adviceCache.get(userId);
  return cached && Date.now() - cached.timestamp < 10 * 60 * 1000 ? cached.data : null;
}

function setCachedAdvice(userId, data) {
  adviceCache.set(userId, { data, timestamp: Date.now() });
}

/**
 * 带超时的Promise执行
 */
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`操作超时（${ms / 1000}秒），请稍后重试`));
    }, ms);
    promise
      .then((data) => {
        clearTimeout(timer);
        resolve(data);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * 从请求中提取用户ID
 */
function extractUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.userId;
  } catch (e) {
    return null;
  }
}

/**
 * 统一认证中间件
 */
function authMiddleware(req, res, next) {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ message: '未登录，请先登录' });
  }
  req.userId = userId;
  next();
}

/**
 * GET /api/personalized
 * 获取完整的个性化推荐数据（需要认证）
 * 返回：{ review, learn, analysis }
 */
router.get('/', async (req, res) => {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ message: '未登录，请先登录' });
  }

  console.log('[personalizedRoutes] 收到个性化推荐请求，用户ID:', userId);

  try {
    const data = await withTimeout(getPersonalizedData(userId), 60000);
    console.log('[personalizedRoutes] 个性化数据获取成功');
    res.json(data);
  } catch (err) {
    console.error('[personalizedRoutes] 获取个性化数据失败:', err.message);
    
    res.json({
      review: [],
      learn: [],
      analysis: {
        strength: ['开始您的诗词学习之旅', '探索古诗词的魅力', '积累诗词知识'],
        weakness: ['暂无学习记录', '建议开始学习诗词', '可以尝试闯关模式'],
        suggestion: [
          '建议从基础诗词开始学习',
          '可以尝试诗词闯关，循序渐进提升',
          '收藏喜欢的诗词，建立个人诗库'
        ],
        summary: '欢迎���到古诗词学习系统，开始您的诗词之旅吧！',
        stats: {
          user_id: userId,
          total_learned: 0,
          average_score: 0,
          mastery_rate: 0,
          wrong_count: 0,
          total_recite_attempts: 0,
          top_dynasty: '未知',
          dynasty_distribution: {},
          typical_wrong_questions: [],
          challenge_correct_count: 0,
          challenge_total_count: 0
        }
      },
      _meta: {
        total_learned: 0,
        wrong_count: 0,
        has_data: false,
        error: err.message
      }
    });
  }
});

/**
 * GET /api/personalized/review
 * 获取复习推荐数据（独立接口，支持并行请求）
 */
router.get('/review', authMiddleware, async (req, res) => {
  console.log('[personalizedRoutes] 收到复习推荐请求，用户ID:', req.userId);
  
  try {
    const result = await withTimeout(getReviewRecommendations(req.userId), 30000);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[personalizedRoutes] 获取复习推荐失败:', err.message);
    res.json({
      success: false,
      data: [],
      error: err.message
    });
  }
});

/**
 * GET /api/personalized/learn
 * 获取学习推荐数据（独立接口，支持并行请求）
 */
router.get('/learn', authMiddleware, async (req, res) => {
  console.log('[personalizedRoutes] 收到学习推荐请求，用户ID:', req.userId);
  
  try {
    const result = await withTimeout(getLearnRecommendations(req.userId), 30000);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[personalizedRoutes] 获取学习推荐失败:', err.message);
    res.json({
      success: false,
      data: [],
      error: err.message
    });
  }
});

/**
 * GET /api/personalized/analysis
 * 获取AI学习分析报告（独立接口，支持并行请求和缓存）
 */
router.get('/analysis', authMiddleware, async (req, res) => {
  const { forceRefresh } = req.query;
  console.log('[personalizedRoutes] 收到AI分析请求，用户ID:', req.userId, '强制刷新:', forceRefresh);
  
  // 检查缓存（除非强制刷新）
  if (!forceRefresh) {
    const cachedData = getCachedData(req.userId);
    if (cachedData) {
      console.log('[personalizedRoutes] 缓存命中，直接返回');
      return res.json({
        success: true,
        data: cachedData,
        fromCache: true
      });
    }
  }
  
  try {
    // 并行获取所有需要的数据
    const [wrongQuestions, challengeRecords, feihuaRecords, learningRecords] = await Promise.all([
      getWrongQuestions(req.userId).catch(() => []),
      getChallengeRecords(req.userId).catch(() => []),
      getFeihuaRecords(req.userId).catch(() => []),
      getLearningRecords(req.userId).catch(() => [])
    ]);
    
    const result = await withTimeout(
      generateAIAnalysisReport(req.userId, wrongQuestions, challengeRecords, feihuaRecords, learningRecords),
      45000
    );
    
    // 保存到缓存
    setCachedData(req.userId, result);
    
    res.json({
      success: true,
      data: result,
      fromCache: false
    });
  } catch (err) {
    console.error('[personalizedRoutes] 获取AI分析失败:', err.message);
    res.json({
      success: false,
      data: {
        strength: ['开始您的诗词学习之旅', '探索古诗词的魅力', '积累诗词知识'],
        weakness: ['暂无学习记录', '建议开始学习诗词', '可以尝试闯关模式'],
        suggestion: ['建议从基础诗词开始学习', '可以尝试诗词闯关', '收藏喜欢的诗词'],
        summary: '欢迎来到古诗词学习系统！',
        stats: { user_id: req.userId, total_learned: 0, average_score: 0, mastery_rate: 0 }
      },
      error: err.message
    });
  }
});

/**
 * POST /api/personalized/advice
 * 聚合真实学习数据后调用大模型生成 AI 建议与学习路线。
 * 结果短暂缓存，避免用户每次回到首页都重复触发模型调用。
 */
router.post('/advice', authMiddleware, async (req, res) => {
  const forceRefresh = Boolean(req.body?.forceRefresh);
  if (!forceRefresh) {
    const cached = getCachedAdvice(req.userId);
    if (cached) return res.json({ success: true, data: cached, fromCache: true });
  }

  try {
    const result = await withTimeout(getAISuggestionDashboard(req.userId), 50000);
    setCachedAdvice(req.userId, result);
    res.json({ success: true, data: result, fromCache: false });
  } catch (err) {
    console.error('[personalizedRoutes] 获取 AI 建议失败:', err.message);
    res.status(500).json({ success: false, message: '暂时无法生成学习建议，请稍后重试' });
  }
});

module.exports = router;
