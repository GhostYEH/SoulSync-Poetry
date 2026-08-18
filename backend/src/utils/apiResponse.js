/**
 * 统一 API 响应工具
 *
 * 成功格式: { success: true, data: ..., message?: '...' }
 * 错误格式: { success: false, error: { code, message }, message: '...' }
 *
 * message 顶层字段保留用于向后兼容旧前端。
 */

const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  BAD_REQUEST: 'BAD_REQUEST',
};

class ApiError extends Error {
  constructor(status, code, message, detail = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }

  static badRequest(message, detail) {
    return new ApiError(400, ERROR_CODES.BAD_REQUEST, message, detail);
  }

  static validation(message, detail) {
    return new ApiError(400, ERROR_CODES.VALIDATION_ERROR, message, detail);
  }

  static unauthorized(message = '认证失败') {
    return new ApiError(401, ERROR_CODES.UNAUTHORIZED, message);
  }

  static forbidden(message = '权限不足') {
    return new ApiError(403, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message = '资源不存在') {
    return new ApiError(404, ERROR_CODES.NOT_FOUND, message);
  }

  static conflict(message = '资源冲突') {
    return new ApiError(409, ERROR_CODES.CONFLICT, message);
  }

  static rateLimited(message = '请求过于频繁') {
    return new ApiError(429, ERROR_CODES.RATE_LIMITED, message);
  }

  static unavailable(message = '服务暂不可用') {
    return new ApiError(503, ERROR_CODES.SERVICE_UNAVAILABLE, message);
  }

  static internal(message = '服务器内部错误') {
    return new ApiError(500, ERROR_CODES.INTERNAL_ERROR, message);
  }
}

function success(res, data = null, message = null) {
  const body = { success: true, data };
  if (message) body.message = message;
  return res.json(body);
}

function fail(res, status, code, message, detail = null) {
  const body = {
    success: false,
    error: { code, message },
    message,
  };
  if (detail !== null) body.error.detail = detail;
  return res.status(status).json(body);
}

function failFromError(res, err) {
  if (err instanceof ApiError) {
    return fail(res, err.status, err.code, err.message, err.detail);
  }
  const isDev = process.env.NODE_ENV !== 'production';
  return fail(res, 500, ERROR_CODES.INTERNAL_ERROR, '服务器内部错误', isDev ? err.message : null);
}

module.exports = {
  ApiError,
  ERROR_CODES,
  success,
  fail,
  failFromError,
};