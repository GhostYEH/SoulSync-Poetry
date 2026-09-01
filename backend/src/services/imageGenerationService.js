const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// 百炼返回的图片 URL 只有短暂有效期，因此缓存的是下载后的本地 PNG，而非临时 URL。
// 生成图属于运行时数据，不能放在 Vite 的 public 构建目录里；
// `vite build` 会清空 backend/public，放在那里会让已生成背景在构建后失效。
const CACHE_DIR = path.resolve(
  process.env.IMAGE_GENERATION_CACHE_DIR || path.join(__dirname, '../../generated-images')
);
const inFlight = new Map();

function ensureCacheDirectory() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function cacheKey(prompt, size) {
  return crypto.createHash('sha256')
    .update([config.imageGeneration.model, config.imageGeneration.promptVersion, size, prompt].join('\n'))
    .digest('hex');
}

function getCachedUrl(key) {
  const filename = `${key}.png`;
  return fs.existsSync(path.join(CACHE_DIR, filename)) ? `/api/generated-images/${filename}` : null;
}

function extractImageUrl(payload) {
  const content = payload?.output?.choices?.[0]?.message?.content;
  if (!Array.isArray(content)) return null;
  return content.find(item => typeof item?.image === 'string')?.image || null;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function requestImage(prompt, size) {
  if (!config.imageGeneration.apiKey) {
    throw new Error('未配置 DASHSCOPE_API_KEY 或 ALIYUN_BAILIAN_API_KEY');
  }

  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.imageGeneration.timeout);
    try {
      const response = await fetch(config.imageGeneration.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.imageGeneration.apiKey}`
        },
        body: JSON.stringify({
          model: config.imageGeneration.model,
          input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
          parameters: { size, prompt_extend: false }
        }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        const url = extractImageUrl(payload);
        if (url) return url;
        throw new Error('百炼响应中没有图片 URL');
      }
      lastError = new Error(payload?.message || `百炼文生图请求失败 (${response.status})`);
      if (response.status !== 429 || attempt === 2) throw lastError;
      const retryAfter = Number(response.headers.get('retry-after'));
      await wait(Number.isFinite(retryAfter) ? retryAfter * 1000 : 1000 * (2 ** attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error('百炼文生图请求失败');
}

async function downloadImage(url, targetPath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`生成图片下载失败 (${response.status})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error('生成图片为空');
  fs.writeFileSync(targetPath, buffer);
}

async function generateCachedImage({ prompt, size = '1280*720' }) {
  const key = cacheKey(prompt, size);
  const cachedUrl = getCachedUrl(key);
  if (cachedUrl) return { success: true, url: cachedUrl, cached: true, model: config.imageGeneration.model };
  if (inFlight.has(key)) return inFlight.get(key);

  const task = (async () => {
    ensureCacheDirectory();
    const imageUrl = await requestImage(prompt, size);
    const targetPath = path.join(CACHE_DIR, `${key}.png`);
    await downloadImage(imageUrl, targetPath);
    return { success: true, url: `/api/generated-images/${key}.png`, cached: false, model: config.imageGeneration.model };
  })();
  inFlight.set(key, task);
  try {
    return await task;
  } finally {
    inFlight.delete(key);
  }
}

module.exports = { generateCachedImage };
