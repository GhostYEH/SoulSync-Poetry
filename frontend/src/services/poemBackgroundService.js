import { API_BASE_URL, request, TIMEOUTS } from './api'

function normalizeGeneratedImageUrl(url) {
  if (typeof url !== 'string') return url
  const value = url.trim()
  if (!value) return null

  // 后端返回的是同源相对地址；独立部署时也要把图片请求发到 API 主机，
  // 不能让浏览器把它错误地发到前端站点或 file:// 页面。
  const apiOrigin = /^https?:\/\//i.test(API_BASE_URL)
    ? new URL(API_BASE_URL).origin
    : ''
  const path = value.startsWith('/generated-images/')
    ? `/api${value}`
    : value
  if (path.startsWith('/api/') && apiOrigin) return `${apiOrigin}${path}`
  if (path.startsWith('//')) return `${window.location.protocol}${path}`
  return path
}

export class ImageGenerationProvider {
  async getCached(_input, _options = {}) { return null }
  async generate(_input, _options = {}) { return null }
}

export class ExistingApiImageProvider extends ImageGenerationProvider {
  async getCached(input, { signal } = {}) {
    const result = await request('/ai/image/get', {
      method: 'POST', signal, timeout: TIMEOUTS.SHORT,
      body: JSON.stringify({
        poemId: input.poemId, title: input.title, author: input.author,
        promptVersion: input.promptVersion
      })
    })
    return result?.success ? normalizeGeneratedImageUrl(result.url) : null
  }

  async generate(input, { signal } = {}) {
    return request('/ai/image/pregenerate', {
      method: 'POST', signal, timeout: TIMEOUTS.LONG + 15000,
      body: JSON.stringify({
        poemId: input.poemId, title: input.title, author: input.author,
        dynasty: input.dynasty, content: input.poemContent,
        theme: input.theme, emotion: input.emotion, imagery: input.imagery,
        promptVersion: input.promptVersion
      })
    })
  }
}

export class PoemBackgroundService {
  constructor(provider = new ExistingApiImageProvider()) {
    this.provider = provider
    this.promptVersion = 'scene-v13'
    this.controller = null
    this.requestId = 0
  }

  buildInput(poem) {
    const tags = Array.isArray(poem?.tags) ? poem.tags : String(poem?.tags || '').split(',').filter(Boolean)
    return {
      poemId: poem?.id, title: poem?.title, author: poem?.author, dynasty: poem?.dynasty,
      poemContent: poem?.content, theme: poem?.theme || tags[0] || '',
      emotion: poem?.emotion || tags[1] || '', imagery: poem?.imagery || tags.slice(2).join('、'),
      promptVersion: this.promptVersion
    }
  }

  cacheKey(poem) { return `poem-bg:${poem?.id}:${this.promptVersion}` }

  async load(poem, { onGenerated, ignoreLocalCache = false } = {}) {
    this.cancel()
    const requestId = ++this.requestId
    this.controller = new AbortController()
    const input = this.buildInput(poem)
    const cacheKey = this.cacheKey(poem)
    const local = ignoreLocalCache ? null : localStorage.getItem(cacheKey)
    if (local) {
      const normalized = normalizeGeneratedImageUrl(local)
      if (normalized !== local) localStorage.setItem(cacheKey, normalized)
      return { url: normalized, source: 'local-cache' }
    }
    try {
      const cached = await this.provider.getCached(input, { signal: this.controller.signal })
      if (requestId !== this.requestId) return null
      if (cached) {
        localStorage.setItem(this.cacheKey(poem), cached)
        return { url: cached, source: 'provider-cache' }
      }
      const generated = await this.provider.generate(input, { signal: this.controller.signal })
      if (requestId !== this.requestId) return null
      const generatedUrl = normalizeGeneratedImageUrl(generated?.url)
      if (generatedUrl) {
        localStorage.setItem(this.cacheKey(poem), generatedUrl)
        return { url: generatedUrl, source: 'generated' }
      }
      onGenerated?.({ pending: true, requestId })
      return { url: null, source: 'fallback', pending: true }
    } catch (error) {
      if (error?.name !== 'AbortError') console.info('[PoemBackground] using bundled fallback.')
      return { url: null, source: 'fallback' }
    }
  }

  remember(poem, url) {
    if (poem?.id && url) localStorage.setItem(this.cacheKey(poem), normalizeGeneratedImageUrl(url))
  }

  forget(poem) {
    if (poem?.id) localStorage.removeItem(this.cacheKey(poem))
  }

  cancel() { this.controller?.abort(); this.controller = null }
  dispose() { this.cancel(); this.requestId += 1 }
}

export const poemBackgroundService = new PoemBackgroundService()
