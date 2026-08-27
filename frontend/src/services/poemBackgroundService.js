import { request, TIMEOUTS } from './api'

export class ImageGenerationProvider {
  async getCached(_input, _options = {}) { return null }
  async generate(_input, _options = {}) { return null }
}

export class ExistingApiImageProvider extends ImageGenerationProvider {
  async getCached(input, { signal } = {}) {
    const result = await request('/ai/image/get', {
      method: 'POST', signal, timeout: TIMEOUTS.SHORT,
      body: JSON.stringify({ poemId: input.poemId, title: input.title, author: input.author })
    })
    return result?.success ? result.url : null
  }

  async generate(input, { signal } = {}) {
    return request('/ai/image/pregenerate', {
      method: 'POST', signal, timeout: TIMEOUTS.LONG,
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
    this.promptVersion = 'v3'
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

  async load(poem, { onGenerated } = {}) {
    this.cancel()
    const requestId = ++this.requestId
    this.controller = new AbortController()
    const input = this.buildInput(poem)
    const local = localStorage.getItem(this.cacheKey(poem))
    if (local) return { url: local, source: 'local-cache' }
    try {
      const cached = await this.provider.getCached(input, { signal: this.controller.signal })
      if (requestId !== this.requestId) return null
      if (cached) {
        localStorage.setItem(this.cacheKey(poem), cached)
        return { url: cached, source: 'provider-cache' }
      }
      await this.provider.generate(input, { signal: this.controller.signal })
      onGenerated?.({ pending: true, requestId })
      return { url: null, source: 'fallback', pending: true }
    } catch (error) {
      if (error?.name !== 'AbortError') console.info('[PoemBackground] using bundled fallback.')
      return { url: null, source: 'fallback' }
    }
  }

  remember(poem, url) {
    if (poem?.id && url) localStorage.setItem(this.cacheKey(poem), url)
  }

  cancel() { this.controller?.abort(); this.controller = null }
  dispose() { this.cancel(); this.requestId += 1 }
}

export const poemBackgroundService = new PoemBackgroundService()
