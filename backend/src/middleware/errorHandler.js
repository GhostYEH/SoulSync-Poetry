const { JsonWebTokenError } = require('jsonwebtoken');

const PG_ERRORS = {
  '23505': { status: 409, message: '资源冲突' },
  '23503': { status: 400, message: '关联资源不存在' },
  '42P01': { status: 500, message: '数据库表未定义' },
};

function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV !== 'production';

  if (err.code && PG_ERRORS[err.code]) {
    const pgErr = PG_ERRORS[err.code];
    return res.status(pgErr.status).json({
      error: pgErr.message,
      ...(isDev && { detail: err.detail }),
    });
  }

  if (err instanceof JsonWebTokenError) {
    return res.status(401).json({
      error: '认证失败',
      ...(isDev && { detail: err.message }),
    });
  }

  if (err.status) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.detail && { detail: err.detail }),
    });
  }

  if (isDev) {
    console.error(err);
  }

  res.status(500).json({
    error: '服务器内部错误',
    ...(isDev && { detail: err.message }),
  });
}

module.exports = errorHandler;
