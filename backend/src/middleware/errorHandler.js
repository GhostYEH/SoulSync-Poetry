const { JsonWebTokenError } = require('jsonwebtoken');
const { ApiError, ERROR_CODES } = require('../utils/apiResponse');

const PG_ERRORS = {
  '23505': { status: 409, code: ERROR_CODES.CONFLICT, message: '资源冲突' },
  '23503': { status: 400, code: ERROR_CODES.BAD_REQUEST, message: '关联资源不存在' },
  '42P01': { status: 500, code: ERROR_CODES.INTERNAL_ERROR, message: '数据库表未定义' },
};

function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV !== 'production';

  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.detail && { detail: err.detail }) },
      message: err.message,
    });
  }

  if (err.code && PG_ERRORS[err.code]) {
    const pgErr = PG_ERRORS[err.code];
    return res.status(pgErr.status).json({
      success: false,
      error: { code: pgErr.code, message: pgErr.message, ...(isDev && { detail: err.detail }) },
      message: pgErr.message,
    });
  }

  if (err instanceof JsonWebTokenError) {
    return res.status(401).json({
      success: false,
      error: { code: ERROR_CODES.UNAUTHORIZED, message: '认证失败', ...(isDev && { detail: err.message }) },
      message: '认证失败',
    });
  }

  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code || ERROR_CODES.INTERNAL_ERROR, message: err.message, ...(err.detail && { detail: err.detail }) },
      message: err.message,
    });
  }

  if (isDev) {
    console.error('[errorHandler]', err);
  }

  res.status(500).json({
    success: false,
    error: { code: ERROR_CODES.INTERNAL_ERROR, message: '服务器内部错误', ...(isDev && { detail: err.message }) },
    message: '服务器内部错误',
  });
}

module.exports = errorHandler;
