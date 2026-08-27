import { BrowserTTSProvider, createTTSProvider } from './ttsProvider'

const listeners = new Map()
const emit = (event, payload) => (listeners.get(event) || []).forEach((fn) => fn(payload))

class DigitalHumanService {
  constructor() {
    this.state = 'idle'
    this.audio = null
    this.audioUrl = ''
    this.ttsProvider = createTTSProvider()
    this.browserProvider = new BrowserTTSProvider()
    this.lastText = ''
    this.unityTarget = 'DigitalHuman'
    this.mockTimer = null
    this.mockLipTimer = null
    this.mockResolve = null
  }

  init() {
    window.onDigitalHumanEvent = (raw) => {
      let detail = raw
      try { detail = typeof raw === 'string' ? JSON.parse(raw) : raw } catch { /* keep raw */ }
      if (detail?.event) emit(detail.event, detail)
    }
    this.sendUnity('SetAnimation', 'idle')
    emit('ready', { state: this.state })
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
    const instance = window.unityInstance || window.digitalHumanUnityInstance
    if (!instance?.SendMessage) return false
    instance.SendMessage(this.unityTarget, method, String(value))
    return true
  }

  async speak(text, options = {}) {
    if (!text?.trim()) return
    this.stopSpeaking()
    this.lastText = text
    this.setState('preparing')
    this.sendUnity('SetAnimation', options.mode || 'speaking')
    try {
      const result = await this.ttsProvider.synthesize(text, options)
      if (result.audioBuffer) {
        this.audioUrl = URL.createObjectURL(result.audioBuffer)
        this.audio = new Audio(this.audioUrl)
        this.audio.addEventListener('play', () => {
          this.setState('speaking')
          this.sendUnity('StartAudioLipSync', '')
          emit('speechStarted', { text })
        })
        this.audio.addEventListener('ended', () => this.finishSpeech())
        this.audio.addEventListener('timeupdate', () => {
          const level = 0.18 + Math.abs(Math.sin(this.audio.currentTime * 8)) * 0.62
          this.sendUnity('SetLipSyncLevel', level.toFixed(3))
        })
        await this.audio.play()
        return
      }
      await this.playBrowserSpeech(result.browserSpeech)
    } catch (error) {
      console.info('[DigitalHuman] TTS API unavailable, using browser speech fallback.')
      try {
        const fallback = await this.browserProvider.synthesize(text, options)
        await this.playBrowserSpeech(fallback.browserSpeech)
      } catch {
        console.info('[DigitalHuman] Browser speech unavailable, using timed lip-sync fallback.')
        await this.playMockSpeech(text)
      }
    }
  }

  playBrowserSpeech({ text, lang, rate }) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) return reject(new Error('Speech synthesis unavailable'))
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = rate
      utterance.onstart = () => {
        this.setState('speaking')
        this.sendUnity('StartAudioLipSync', '')
        emit('speechStarted', { text, fallback: true })
      }
      utterance.onboundary = () => this.sendUnity('SetLipSyncLevel', (0.35 + Math.random() * 0.55).toFixed(3))
      utterance.onend = () => { this.finishSpeech(); resolve() }
      utterance.onerror = (event) => { this.setState('error'); reject(event.error) }
      this.utterance = utterance
      window.speechSynthesis.speak(utterance)
    })
  }

  playMockSpeech(text) {
    return new Promise((resolve) => {
      const duration = Math.min(12000, Math.max(2800, String(text).length * 150))
      this.mockResolve = resolve
      this.setState('speaking')
      this.sendUnity('StartAudioLipSync', '')
      emit('speechStarted', { text, fallback: true, mock: true })
      this.mockLipTimer = window.setInterval(() => {
        this.sendUnity('SetLipSyncLevel', (0.25 + Math.random() * 0.65).toFixed(3))
      }, 120)
      this.mockTimer = window.setTimeout(() => {
        this.clearMockSpeech()
        this.finishSpeech()
        resolve()
      }, duration)
    })
  }

  clearMockSpeech() {
    if (this.mockTimer) window.clearTimeout(this.mockTimer)
    if (this.mockLipTimer) window.clearInterval(this.mockLipTimer)
    this.mockTimer = null
    this.mockLipTimer = null
    this.mockResolve?.()
    this.mockResolve = null
  }

  pauseSpeaking() {
    this.audio?.pause()
    window.speechSynthesis?.pause()
    this.sendUnity('PauseSpeaking', '')
    this.setState('paused')
  }

  resumeSpeaking() {
    this.audio?.play()
    window.speechSynthesis?.resume()
    this.sendUnity('ResumeSpeaking', '')
    this.setState('speaking')
  }

  stopSpeaking() {
    if (this.audio) { this.audio.pause(); this.audio.currentTime = 0 }
    window.speechSynthesis?.cancel()
    this.clearMockSpeech()
    this.sendUnity('StopSpeaking', '')
    this.releaseAudio()
    this.setState('idle')
  }

  finishSpeech() {
    this.clearMockSpeech()
    this.sendUnity('StopSpeaking', '')
    this.releaseAudio()
    this.setState('idle')
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
  setAnimation(name) { this.sendUnity('SetAnimation', name) }
  setVisible(visible) { this.sendUnity('SetVisible', visible ? 'true' : 'false') }
  reset() { this.stopSpeaking(); this.sendUnity('ResetDigitalHuman', '') }
  dispose() { this.reset(); delete window.onDigitalHumanEvent }
}

export const digitalHumanService = new DigitalHumanService()
