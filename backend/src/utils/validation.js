/**
 * 轻量输入验证工具
 *
 * 用法:
 *   const { page, pageSize } = parsePagination(req);
 *   validate(req.body, { username: 'required|string|minLen:2', password: 'required|string|minLen:6' });
 */

const { ApiError } = require('./apiResponse');

function validate(data, rules) {
  const errors = [];

  for (const [field, ruleStr] of Object.entries(rules)) {
    const parts = ruleStr.split('|');
    const value = data[field];

    for (const rule of parts) {
      const [ruleName, ...args] = rule.split(':');
      const arg = args.join(':');

      switch (ruleName) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            errors.push({ field, message: `${field} 为必填项` });
          }
          break;
        case 'string':
          if (value !== undefined && value !== null && typeof value !== 'string') {
            errors.push({ field, message: `${field} 必须为字符串` });
          }
          break;
        case 'int':
          if (value !== undefined && value !== null && (!Number.isInteger(Number(value)) || isNaN(Number(value)))) {
            errors.push({ field, message: `${field} 必须为整数` });
          }
          break;
        case 'positive':
          if (value !== undefined && value !== null && Number(value) <= 0) {
            errors.push({ field, message: `${field} 必须为正数` });
          }
          break;
        case 'minLen':
          if (value !== undefined && value !== null && typeof value === 'string' && value.length < Number(arg)) {
            errors.push({ field, message: `${field} 最少 ${arg} 个字符` });
          }
          break;
        case 'maxLen':
          if (value !== undefined && value !== null && typeof value === 'string' && value.length > Number(arg)) {
            errors.push({ field, message: `${field} 最多 ${arg} 个字符` });
          }
          break;
        case 'min':
          if (value !== undefined && value !== null && Number(value) < Number(arg)) {
            errors.push({ field, message: `${field} 最小值为 ${arg}` });
          }
          break;
        case 'max':
          if (value !== undefined && value !== null && Number(value) > Number(arg)) {
            errors.push({ field, message: `${field} 最大值为 ${arg}` });
          }
          break;
        case 'email':
          if (value !== undefined && value !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push({ field, message: `${field} 格式不正确` });
          }
          break;
        case 'oneOf':
          if (value !== undefined && value !== null && !arg.split(',').includes(String(value))) {
            errors.push({ field, message: `${field} 必须为 ${arg} 之一` });
          }
          break;
      }
    }
  }

  if (errors.length > 0) {
    throw ApiError.validation('输入验证失败', errors);
  }

  return data;
}

function parsePagination(req, defaultPageSize = 20, maxPageSize = 100) {
  let page = parseInt(req.query.page || req.query.pageNum || '1', 10);
  let pageSize = parseInt(req.query.pageSize || req.query.limit || String(defaultPageSize), 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(pageSize) || pageSize < 1) pageSize = defaultPageSize;
  if (pageSize > maxPageSize) pageSize = maxPageSize;

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}

module.exports = { validate, parsePagination };