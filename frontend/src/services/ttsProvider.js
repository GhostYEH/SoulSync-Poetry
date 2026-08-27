import api from './api'

export class TTSProvider {
  async synthesize(_text, _options = {}) {
    throw new Error('TTSProvider.synthesize must be implemented')
  }
}

export class ApiTTSProvider extends TTSProvider {
  async synthesize(text) {
    const audioBuffer = await api.ai.tts(text)
    return { audioBuffer, duration: null, visemes: [], sentences: [] }
  }
}

export class BrowserTTSProvider extends TTSProvider {
  async synthesize(text, { lang = 'zh-CN', rate = 0.9 } = {}) {
    return { browserSpeech: { text, lang, rate }, duration: null, visemes: [], sentences: [] }
  }
}

export const createTTSProvider = () => new ApiTTSProvider()
