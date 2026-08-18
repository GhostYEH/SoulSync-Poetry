const { AIError, AI_ERRORS } = require('../utils/aiClient');

// 这是一个单实例的简单限流器，如果不涉及多实例部署无需引入 Redis。
const rateLimits = new Map();
const WINDOW_MS = 60 * 1000; // 1分钟
const MAX_REQUESTS = 10; // AI 接口限流：每分钟 10 次

// 定期清理过期记录以防止内存持续增长
setInterval(() => {
  const now = Date.now();
  for (const [key, limitData] of rateLimits.entries()) {
    if (now - limitData.lastReset > WINDOW_MS) {
      rateLimits.delete(key);
    }
  }
}, WINDOW_MS * 2);

function aiRateLimiter(req, res, next) {
  // Use user ID if authenticated, otherwise use IP address
  const identifier = (req.user && req.user.userId) ? `user_${req.user.userId}` : `ip_${req.ip}`;
  
  const now = Date.now();
  let limitData = rateLimits.get(identifier);
  
  if (!limitData) {
    limitData = { count: 0, lastReset: now };
  }
  
  // Reset window
  if (now - limitData.lastReset > WINDOW_MS) {
    limitData.count = 0;
    limitData.lastReset = now;
  }
  
  if (limitData.count >= MAX_REQUESTS) {
    res.setHeader('Retry-After', Math.ceil((WINDOW_MS - (now - limitData.lastReset)) / 1000));
    return next(new AIError(AI_ERRORS.RATE_LIMITED, '请求过于频繁，请稍后再试'));
  }
  
  limitData.count++;
  rateLimits.set(identifier, limitData);
  
  next();
}

module.exports = {
  aiRateLimiter
};
