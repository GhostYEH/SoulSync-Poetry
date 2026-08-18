/**
 * async 路由包装器 — 自动捕获 Promise 异常并传递给 errorHandler 中间件
 *
 * 用法:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 */

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };