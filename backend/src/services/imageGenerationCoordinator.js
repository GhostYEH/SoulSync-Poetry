function createImageGenerationCoordinator({ ttlMs = 30 * 24 * 60 * 60 * 1000 } = {}) {
  const cache = new Map();
  const inFlight = new Map();

  function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp >= ttlMs) {
      cache.delete(key);
      return null;
    }
    return entry.url;
  }

  function setCached(key, url) {
    if (!url) return;
    cache.set(key, { url, timestamp: Date.now() });
  }

  async function getOrGenerate(key, generate) {
    const cached = getCached(key);
    if (cached) return cached;
    if (inFlight.has(key)) return inFlight.get(key);

    const task = Promise.resolve()
      .then(generate)
      .then((url) => {
        if (!url) throw new Error('图像生成服务未返回可用地址');
        setCached(key, url);
        return url;
      })
      .finally(() => {
        inFlight.delete(key);
      });

    inFlight.set(key, task);
    return task;
  }

  return {
    getCached,
    getOrGenerate,
    hasInFlight: (key) => inFlight.has(key)
  };
}

module.exports = { createImageGenerationCoordinator };
