// JWT认证中间件
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// 认证中间件（严格模式）
// 合法 Token → 正常用户
// 缺失/无效/过期 Token → 401
// 公开接口请使用 optionalAuthenticateToken
function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: '未提供认证令牌', code: 'NO_TOKEN' });
    }

    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
        return res.status(401).json({ message: '认证令牌无效或已过期', code });
      }

      req.user = {
        userId: decoded.userId,
        username: decoded.username
      };

      next();
    });
  } catch (error) {
    console.error('认证失败:', error);
    res.status(500).json({ message: '认证失败' });
  }
}

module.exports = authenticateToken;

// 可选认证中间件：如果请求带了 token 则解析，不带也不报错
function optionalAuthenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      req.user = null;
      return next();
    }
    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        req.user = null;
      } else {
        req.user = { userId: decoded.userId, username: decoded.username };
      }
      next();
    });
  } catch (error) {
    req.user = null;
    next();
  }
}

module.exports.optionalAuthenticateToken = optionalAuthenticateToken;

// 获取用户ID（从token或query参数）
function getUserIdFromToken(req) {
  try {
    // 优先从URL参数获取
    const queryUserId = parseInt(req.query.userId);
    if (queryUserId && !isNaN(queryUserId)) {
      return queryUserId;
    }

    // 从Authorization header获取
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, config.jwt.secret);
        return decoded.userId;
      }
    }

    // 从请求体获取
    if (req.body && req.body.userId) {
      return parseInt(req.body.userId);
    }

    return null;
  } catch (error) {
    return null;
  }
}

module.exports.getUserIdFromToken = getUserIdFromToken;
