/**
 * 稳定 Attempt ID 生成工具
 *
 * 用于学习事件幂等闭环：
 *   - 同一次学习行为的 HTTP 重试 → 复用同一 ID
 *   - 不同时间重新学习 → 生成新 ID
 *
 * 优先使用原生 crypto.randomUUID()，不支持时 fallback 到手动 RFC4122 v4。
 * 不依赖任何第三方 UUID 库。
 */

/**
 * 生成一个 RFC4122 v4 UUID
 * @returns {string} 36 字符 UUID
 */
export function generateAttemptId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return fallbackUUID();
}

/**
 * 手动 UUID v4 fallback（适用于不支持 crypto.randomUUID 的环境）
 */
function fallbackUUID() {
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4';
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 0 | 8];
    } else {
      uuid += hex[(Math.random() * 16) | 0];
    }
  }
  return uuid;
}

export default generateAttemptId;