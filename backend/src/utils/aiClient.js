const fetch = require('node-fetch');
const crypto = require('crypto');

// 标准化 AI 错误类
class AIError extends Error {
  constructor(code, message, originalError = null, status = null) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.originalError = originalError;
    this.status = status;
  }
}

const AI_ERRORS = {
  TIMEOUT: 'AI_TIMEOUT',
  RATE_LIMITED: 'AI_RATE_LIMITED',
  UNAVAILABLE: 'AI_UNAVAILABLE',
  INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
  AUTH_FAILED: 'AI_AUTH_FAILED',
  BAD_REQUEST: 'AI_BAD_REQUEST',
  INTERNAL_ERROR: 'AI_INTERNAL_ERROR',
  NETWORK_ERROR: 'AI_NETWORK_ERROR'
};

// 提取并解析JSON
function robustJSONParse(text) {
  if (!text) return null;
  let s = text.trim();

  const codeBlockMatch = s.match(/```(?:json)?\s*\n?([\s\S]+?)\n?```/);
  if (codeBlockMatch) s = codeBlockMatch[1].trim();

  try { return JSON.parse(s); } catch (_) {}

  // 一些常见结构的正则表达式匹配尝试
  const jsonPatterns = [
    /\{[\s\S]*?"keywords"[\s\S]*?\}/,
    /\{[\s\S]*?"poem"[\s\S]*?\}/,
    /\{[\s\S]*?"strength"[\s\S]*?\}/,
    /\{[\s\S]*?"suggestions"[\s\S]*?\}/,
    /\{[\s\S]*?"aiLine"[\s\S]*?\}/,
    /\{[\s\S]*?"relatedWords"[\s\S]*?\}/,
    /\{[\s\S]*?"total"[\s\S]*?\}/,
    /\{[\s\S]*?"name"[\s\S]*?\}/,
    /\{[\s\S]+\}/,
    /\[[\s\S]+\]/
  ];

  for (const pattern of jsonPatterns) {
    const match = s.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (_) {}
    }
  }

  return null;
}

function shouldRetry(error) {
  if (error instanceof AIError) {
    return [
      AI_ERRORS.TIMEOUT,
      AI_ERRORS.RATE_LIMITED,
      AI_ERRORS.UNAVAILABLE,
      AI_ERRORS.NETWORK_ERROR
    ].includes(error.code);
  }
  return false;
}

function mapStatusToError(status) {
  if (status === 401 || status === 403) return AI_ERRORS.AUTH_FAILED;
  if (status === 429) return AI_ERRORS.RATE_LIMITED;
  if (status === 400) return AI_ERRORS.BAD_REQUEST;
  if (status >= 500) return AI_ERRORS.UNAVAILABLE;
  return AI_ERRORS.INTERNAL_ERROR;
}

/**
 * 统一的 AI Client
 * 
 * Retry 语义说明：
 * maxRetries = 2 表示：首次请求 + 最多2次重试 = 最多3次网络调用。
 */
class AIClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
    this.defaultModel = config.model;
    // 单次请求超时时间，文本生成约 20~35 秒
    this.defaultPerAttemptTimeout = config.timeout || 30000;
    // 整个业务请求的总 deadline，防止多次重试 + backoff 导致整个请求挂起过久 (默认 60s)
    this.defaultTotalDeadline = config.totalDeadline || 60000;
    this.maxRetries = config.maxRetries !== undefined ? config.maxRetries : 2;
    this.name = config.name || 'AI';
  }

  async request(payload, options = {}) {
    const perAttemptTimeout = options.timeout || this.defaultPerAttemptTimeout;
    const totalDeadline = options.totalDeadline || this.defaultTotalDeadline;
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : this.maxRetries;
    const isJsonResponse = options.isJsonResponse !== false;

    let lastError = null;
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const attemptStartTime = Date.now();
      
      // 检查总时间是否已经超标
      if (attemptStartTime - startTime >= totalDeadline) {
        throw new AIError(AI_ERRORS.TIMEOUT, 'Total request deadline exceeded before attempt');
      }

      try {
        const controller = new AbortController();
        // 取 perAttemptTimeout 和 剩余总时间的较小值
        const remainingTotalTime = totalDeadline - (attemptStartTime - startTime);
        const actualTimeout = Math.min(perAttemptTimeout, remainingTotalTime);
        
        const timeoutId = setTimeout(() => controller.abort(), actualTimeout);

        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          ...(options.headers || {})
        };

        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const status = response.status;
          const errCode = mapStatusToError(status);
          throw new AIError(errCode, `API request failed with status ${status}`, null, status);
        }

        const data = await response.json();
        
        // 记录日志 (脱敏)
        const duration = Date.now() - attemptStartTime;
        this.log({
          requestId,
          task: options.taskName || 'AI_Task',
          model: payload.model,
          duration,
          retryCount: attempt,
          status: 'success'
        });

        if (isJsonResponse) {
          const msg = data.choices?.[0]?.message || {};
          const rawContent = (msg.content || msg.reasoning_content || '').trim();
          
          const parsedJSON = robustJSONParse(rawContent);
          if (!parsedJSON) {
            throw new AIError(AI_ERRORS.INVALID_RESPONSE, 'Failed to parse JSON response');
          }
          return parsedJSON;
        }

        return data;

      } catch (error) {
        lastError = error;
        const duration = Date.now() - attemptStartTime;

        let mappedError = error;
        if (error.name === 'AbortError' || error.type === 'request-timeout') {
          mappedError = new AIError(AI_ERRORS.TIMEOUT, 'Request timeout');
        } else if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          mappedError = new AIError(AI_ERRORS.NETWORK_ERROR, 'Network error');
        } else if (!(error instanceof AIError)) {
          mappedError = new AIError(AI_ERRORS.INTERNAL_ERROR, error.message, error);
        }
        
        lastError = mappedError;

        this.log({
          requestId,
          task: options.taskName || 'AI_Task',
          model: payload.model,
          duration,
          retryCount: attempt,
          status: 'error',
          errorCode: mappedError.code
        });

        if (attempt < maxRetries && shouldRetry(mappedError)) {
          // Exponential backoff with jitter
          const baseDelay = Math.pow(2, attempt) * 1000;
          const jitter = Math.random() * 1000;
          const delay = baseDelay + jitter;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        break;
      }
    }

    throw lastError;
  }

  log(info) {
    // 简单的 JSON log 输出，确保不记录敏感信息
    console.log(JSON.stringify({
      level: 'info',
      module: 'AIClient',
      clientName: this.name,
      ...info,
      timestamp: new Date().toISOString()
    }));
  }
}

module.exports = {
  AIClient,
  AIError,
  AI_ERRORS,
  robustJSONParse
};
