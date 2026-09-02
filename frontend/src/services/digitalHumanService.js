import { BrowserTTSProvider, createTTSProvider } from './ttsProvider'

const listeners = new Map()
const emit = (event, payload) => (listeners.get(event) || []).forEach((fn) => fn(payload))

class DigitalHumanService {
  constructor() {
    this.state = 'idle'
    this.animation = 'idle'
    this.unityInstance = null
    this.audio = null
    this.audioUrl = ''
    this.ttsProvider = createTTSProvider()
    this.browserProvider = new BrowserTTSProvider()
    this.lastText = ''
    this.unityTarget = 'DigitalHuman'
    this.mockTimer = null
    this.mockLipTimer = null
    this.mockResolve = null
    this.mockRemainingMs = 0
    this.mockStartedAt = 0
    this.mockSession = 0
    this.speechSession = 0
  }

  init() {
    window.onDigitalHumanEvent = (raw) => {
      let detail = raw
      try { detail = typeof raw === 'string' ? JSON.parse(raw) : raw } catch { /* keep raw */ }
      if (detail?.event) emit(detail.event, detail)
    }
    this.enterIdle({ reset: true })
    emit('ready', { state: this.state })
  }

  attachUnity(instance) {
    if (!instance?.SendMessage) return
    this.unityInstance = instance
    this.syncUnityState({ reset: true })
    emit('unityReady', { state: this.state })
  }

  detachUnity(instance) {
    if (!instance || this.unityInstance === instance) this.unityInstance = null
  }

  on(event, handler) {
    const bucket = listeners.get(event) || []
    bucket.push(handler)
    listeners.set(event, bucket)
    return () => listeners.set(event, bucket.filter((item) => item !== handler))
  }

  setState(next) {
    this.state = next
    emit('stateChanged', { state: next })
  }

  sendUnity(method, value = '') {
    const instance = this.unityInstance || window.digitalHumanUnityInstance || window.unityInstance
    if (!instance?.SendMessage) return false
    instance.SendMessage(this.unityTarget, method, String(value))
    return true
  }

  syncUnityState({ reset = false } = {}) {
    if (reset) this.sendUnity('ResetDigitalHuman', '')
    this.sendUnity('SetAnimation', this.animation)
    if (this.state === 'speaking') this.sendUnity('StartAudioLipSync', '')
    if (this.state === 'paused') {
      this.sendUnity('StartAudioLipSync', '')
      this.sendUnity('PauseSpeaking', '')
    }
  }

  enterIdle({ reset = false } = {}) {
    if (reset) this.sendUnity('ResetDigitalHuman', '')
    else this.sendUnity('StopSpeaking', '')
    this.animation = 'idle'
    this.sendUnity('SetAnimation', 'idle')
    this.setState('idle')
  }

  async speak(text, options = {}) {
    if (!text?.trim()) return
    this.stopSpeaking()
    const session = ++this.speechSession
    this.lastText = text
    this.setState('preparing')
    this.setAnimation('speaking')
    try {
      const result = await this.ttsProvider.synthesize(text, options)
      if (session !== this.speechSession) return
      if (result.audioBuffer) {
        this.audioUrl = URL.createObjectURL(result.audioBuffer)
        this.audio = new Audio(this.audioUrl)
        this.audio.addEventListener('play', () => {
          if (session !== this.speechSession) return
          this.setState('speaking')
          this.sendUnity('StartAudioLipSync', '')
          emit('speechStarted', { text })
        })
        this.audio.addEventListener('ended', () => this.finishSpeech(session))
        this.audio.addEventListener('timeupdate', () => {
          if (session !== this.speechSession) return
          const level = 0.18 + Math.abs(Math.sin(this.audio.currentTime * 8)) * 0.62
          this.sendUnity('SetLipSyncLevel', level.toFixed(3))
        })
        await this.audio.play()
        return
      }
      await this.playBrowserSpeech(result.browserSpeech, session)
    } catch (error) {
      if (session !== this.speechSession) return
      // Audio.play() 失败时也必须释放刚创建的 Blob URL，避免重复回退造成泄漏。
      this.releaseAudio()
      console.info('[DigitalHuman] TTS API unavailable, using browser speech fallback.')
      try {
        const fallback = await this.browserProvider.synthesize(text, options)
        if (session !== this.speechSession) return
        await this.playBrowserSpeech(fallback.browserSpeech, session)
      } catch {
        if (session !== this.speechSession) return
        console.info('[DigitalHuman] Browser speech unavailable, using timed lip-sync fallback.')
        await this.playMockSpeech(text, session)
      }
    }
  }

  playBrowserSpeech({ text, lang, rate }, session) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) return reject(new Error('Speech synthesis unavailable'))
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = rate
      utterance.onstart = () => {
        if (session !== this.speechSession) return
        this.setState('speaking')
        this.sendUnity('StartAudioLipSync', '')
        emit('speechStarted', { text, fallback: true })
      }
      utterance.onboundary = () => {
        if (session === this.speechSession) this.sendUnity('SetLipSyncLevel', (0.35 + Math.random() * 0.55).toFixed(3))
      }
      utterance.onend = () => { this.finishSpeech(session); resolve() }
      utterance.onerror = (event) => {
        if (session === this.speechSession) this.setState('error')
        reject(event.error)
      }
      this.utterance = utterance
      window.speechSynthesis.speak(utterance)
    })
  }

  playMockSpeech(text, session) {
    return new Promise((resolve) => {
      if (session !== this.speechSession) return resolve()
      const duration = Math.min(12000, Math.max(2800, String(text).length * 150))
      this.mockResolve = resolve
      this.mockRemainingMs = duration
      this.mockSession = session
      this.setState('speaking')
      this.sendUnity('StartAudioLipSync', '')
      emit('speechStarted', { text, fallback: true, mock: true })
      this.startMockTimers(session)
    })
  }

  startMockTimers(session) {
    if (!this.mockResolve || session !== this.speechSession) return
    this.mockStartedAt = performance.now()
    this.mockLipTimer = window.setInterval(() => {
      if (session === this.speechSession) this.sendUnity('SetLipSyncLevel', (0.25 + Math.random() * 0.65).toFixed(3))
    }, 120)
    this.mockTimer = window.setTimeout(() => {
      this.mockTimer = null
      if (this.mockLipTimer) window.clearInterval(this.mockLipTimer)
      this.mockLipTimer = null
      const resolve = this.mockResolve
      this.mockResolve = null
      this.mockRemainingMs = 0
      this.mockSession = 0
      this.finishSpeech(session)
      resolve?.()
    }, this.mockRemainingMs)
  }

  pauseMockSpeech() {
    if (!this.mockTimer) return
    this.mockRemainingMs = Math.max(0, this.mockRemainingMs - (performance.now() - this.mockStartedAt))
    window.clearTimeout(this.mockTimer)
    if (this.mockLipTimer) window.clearInterval(this.mockLipTimer)
    this.mockTimer = null
    this.mockLipTimer = null
  }

  resumeMockSpeech() {
    if (this.mockResolve && this.mockSession === this.speechSession) {
      this.startMockTimers(this.mockSession)
    }
  }

  clearMockSpeech() {
    if (this.mockTimer) window.clearTimeout(this.mockTimer)
    if (this.mockLipTimer) window.clearInterval(this.mockLipTimer)
    const resolve = this.mockResolve
    this.mockTimer = null
    this.mockLipTimer = null
    this.mockResolve = null
    this.mockRemainingMs = 0
    this.mockStartedAt = 0
    this.mockSession = 0
    resolve?.()
  }

  pauseSpeaking() {
    if (this.state !== 'speaking') return
    this.pauseMockSpeech()
    this.audio?.pause()
    window.speechSynthesis?.pause()
    this.sendUnity('PauseSpeaking', '')
    this.setState('paused')
  }

  resumeSpeaking() {
    if (this.state !== 'paused') return
    this.resumeMockSpeech()
    this.audio?.play()
    window.speechSynthesis?.resume()
    this.sendUnity('ResumeSpeaking', '')
    this.setState('speaking')
  }

  stopSpeaking() {
    this.speechSession += 1
    if (this.audio) { this.audio.pause(); this.audio.currentTime = 0 }
    window.speechSynthesis?.cancel()
    this.clearMockSpeech()
    this.releaseAudio()
    this.enterIdle()
  }

  finishSpeech(session = this.speechSession) {
    if (session !== this.speechSession) return
    this.speechSession += 1
    this.clearMockSpeech()
    this.releaseAudio()
    this.enterIdle()
    emit('speechEnded', { text: this.lastText })
  }

  releaseAudio() {
    this.audio = null
    if (this.audioUrl) URL.revokeObjectURL(this.audioUrl)
    this.audioUrl = ''
  }

  playPoem(poem) { return this.speak(poem?.content || '', { mode: 'reading' }) }
  explain(text) { return this.speak(text, { mode: 'explaining' }) }
  setEmotion(type) { this.sendUnity('SetEmotion', type) }
  setAnimation(name) {
    this.animation = name || 'idle'
    this.sendUnity('SetAnimation', this.animation)
  }
  setVisible(visible) { this.sendUnity('SetVisible', visible ? 'true' : 'false') }
  reset() { this.stopSpeaking(); this.enterIdle({ reset: true }) }
  dispose() { this.reset(); this.unityInstance = null; delete window.onDigitalHumanEvent }
}

export const digitalHumanService = new DigitalHumanService()
