<template>
  <section class="digital-human" :class="`state-${state}`" aria-label="灵犀数字人学习伙伴">
    <div class="stage">
      <canvas id="digital-human-unity-canvas" ref="canvas" class="unity-canvas-source" tabindex="-1" aria-hidden="true"></canvas>
      <canvas
        ref="outputCanvas"
        class="unity-canvas"
        :class="state === 'idle' && idleMotion ? `idle-${idleMotion}` : ''"
        aria-label="灵犀数字人"
      ></canvas>
      <div v-if="!ready" class="stage-status">
        <span class="loader-ring"></span>
        <p>{{ loadMessage }}</p>
      </div>
      <div class="mode-badge" aria-live="polite">{{ stateLabel }}</div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { digitalHumanService } from '../../services/digitalHumanService'

const props = defineProps({ state: { type: String, default: 'idle' }, autoExplain: Boolean })
const canvas = ref(null)
const outputCanvas = ref(null)
const ready = ref(false)
const loadMessage = ref('数字人场景加载中')
const idleMotion = ref('')
let unityInstance
let cutoutFrame
let idleMotionTimer
let lastIdleMotion = -1
const webglRoot = (import.meta.env.VITE_DIGITAL_HUMAN_WEBGL_URL || '/digital-human').replace(/\/index\.html$/, '').replace(/\/$/, '')
const labels = { idle: '静候陪读', preparing: '准备语音', speaking: '正在讲解', paused: '讲解暂停', thinking: '正在思考', error: '载入失败' }
const stateLabel = computed(() => labels[props.state] || '静候陪读')
const idleMotions = [
  { name: 'breathe', duration: 6200 },
  { name: 'sway', duration: 5600 },
  { name: 'stretch', duration: 5200 },
  { name: 'settle', duration: 4800 }
]

const stopIdleMotion = () => {
  window.clearTimeout(idleMotionTimer)
  idleMotionTimer = undefined
  idleMotion.value = ''
}

const scheduleIdleMotion = (delay = 0) => {
  window.clearTimeout(idleMotionTimer)
  if (props.state !== 'idle') return
  idleMotionTimer = window.setTimeout(() => {
    let next = Math.floor(Math.random() * idleMotions.length)
    if (next === lastIdleMotion) next = (next + 1) % idleMotions.length
    lastIdleMotion = next
    const motion = idleMotions[next]
    idleMotion.value = motion.name
    idleMotionTimer = window.setTimeout(() => {
      idleMotion.value = ''
      scheduleIdleMotion(900 + Math.round(Math.random() * 1500))
    }, motion.duration)
  }, delay)
}

const loadUnityLoader = () => new Promise((resolve, reject) => {
  if (window.createUnityInstance) return resolve()
  const existing = document.querySelector('script[data-digital-human-loader]')
  if (existing) {
    existing.addEventListener('load', resolve, { once: true })
    existing.addEventListener('error', reject, { once: true })
    return
  }
  const script = document.createElement('script')
  script.src = `${webglRoot}/Build/digital-human.loader.js`
  script.dataset.digitalHumanLoader = 'true'
  script.onload = resolve
  script.onerror = reject
  document.body.appendChild(script)
})

const mountUnity = async () => {
  try {
    await loadUnityLoader()
    unityInstance = await window.createUnityInstance(canvas.value, {
      dataUrl: `${webglRoot}/Build/digital-human.data`,
      frameworkUrl: `${webglRoot}/Build/digital-human.framework.js`,
      codeUrl: `${webglRoot}/Build/digital-human.wasm`,
      streamingAssetsUrl: `${webglRoot}/StreamingAssets`,
      devicePixelRatio: Math.max(2, Math.min(window.devicePixelRatio || 1, 2)),
      webglContextAttributes: { alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' },
      companyName: 'CampusMate',
      productName: 'CampusMate Digital Human',
      productVersion: '0.1.0',
      showBanner: (message, type) => console[type === 'error' ? 'error' : 'warn']('[DigitalHuman]', message)
    }, progress => { loadMessage.value = `数字人加载 ${Math.round(progress * 100)}%` })
    window.digitalHumanUnityInstance = unityInstance
    digitalHumanService.attachUnity(unityInstance)
    ready.value = true
    startCutoutRenderer()
  } catch (error) {
    loadMessage.value = '数字人载入失败'
    console.error('[DigitalHuman] Unity WebGL load failed', error)
  }
}

const startCutoutRenderer = () => {
  const source = canvas.value
  const output = outputCanvas.value
  const context = output?.getContext('2d', { willReadFrequently: true })
  if (!source || !output || !context) return

  const render = () => {
    const width = Math.max(1, Math.round(output.clientWidth * Math.min(window.devicePixelRatio || 1, 1.5)))
    const height = Math.max(1, Math.round(output.clientHeight * Math.min(window.devicePixelRatio || 1, 1.5)))
    if (output.width !== width || output.height !== height) {
      output.width = width
      output.height = height
    }
    context.clearRect(0, 0, width, height)
    context.drawImage(source, 0, 0, width, height)
    const frame = context.getImageData(0, 0, width, height)
    const pixels = frame.data
    const visited = new Uint8Array(width * height)
    const queue = new Int32Array(width * height)
    let head = 0
    let tail = 0
    const baseR = pixels[0]
    const baseG = pixels[1]
    const baseB = pixels[2]
    const enqueue = index => {
      if (index < 0 || index >= visited.length || visited[index]) return
      const offset = index * 4
      const distance = Math.abs(pixels[offset] - baseR) + Math.abs(pixels[offset + 1] - baseG) + Math.abs(pixels[offset + 2] - baseB)
      if (distance > 72) return
      visited[index] = 1
      queue[tail++] = index
    }
    for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x) }
    for (let y = 1; y < height - 1; y += 1) { enqueue(y * width); enqueue(y * width + width - 1) }
    while (head < tail) {
      const index = queue[head++]
      const offset = index * 4
      pixels[offset] = 0
      pixels[offset + 1] = 0
      pixels[offset + 2] = 0
      pixels[offset + 3] = 0
      const x = index % width
      if (x > 0) enqueue(index - 1)
      if (x + 1 < width) enqueue(index + 1)
      if (index >= width) enqueue(index - width)
      if (index + width < visited.length) enqueue(index + width)
    }
    context.putImageData(frame, 0, 0)
    cutoutFrame = requestAnimationFrame(render)
  }
  cutoutFrame = requestAnimationFrame(render)
}

watch(() => props.state, (state) => {
  if (state === 'idle') scheduleIdleMotion(350)
  else stopIdleMotion()
})

onMounted(() => {
  mountUnity()
  scheduleIdleMotion(450)
})
onBeforeUnmount(async () => {
  cancelAnimationFrame(cutoutFrame)
  stopIdleMotion()
  digitalHumanService.detachUnity(unityInstance)
  if (window.digitalHumanUnityInstance === unityInstance) delete window.digitalHumanUnityInstance
  if (unityInstance?.Quit) await unityInstance.Quit()
})
</script>

<style scoped>
.digital-human {
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  width: 190px;
  min-width: 190px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid rgba(39, 91, 84, .12);
}

.stage {
  position: relative;
  min-height: 0;
  overflow: hidden;
  background: transparent;
}

.unity-canvas-source {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
}

.unity-canvas {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent !important;
  image-rendering: auto;
  pointer-events: none;
  transform: translate3d(0, 0, 0) scale(1.14);
  transform-origin: 50% 100%;
  will-change: transform;
}

.idle-breathe { animation: digital-human-breathe 6.2s ease-in-out both; }
.idle-sway { animation: digital-human-sway 5.6s ease-in-out both; }
.idle-stretch { animation: digital-human-stretch 5.2s cubic-bezier(.45, 0, .2, 1) both; }
.idle-settle { animation: digital-human-settle 4.8s ease-in-out both; }

.stage-status {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  color: var(--pd-muted);
  background: rgba(230, 241, 237, .12);
  pointer-events: none;
}

.loader-ring {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(44, 103, 96, .18);
  border-top-color: var(--pd-jade);
  border-radius: 50%;
  animation: spin .9s linear infinite;
}

.stage-status p {
  margin: 10px 0;
  font-size: 12px;
}

.mode-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, .72);
  border-radius: 999px;
  background: rgba(245, 249, 247, .72);
  backdrop-filter: blur(12px);
  color: #315d58;
  font-size: 11px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes digital-human-breathe {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1.14); }
  46% { transform: translate3d(0, -1%, 0) scale(1.155); }
  62% { transform: translate3d(0, -.6%, 0) scale(1.15); }
}

@keyframes digital-human-sway {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0) scale(1.14); }
  32% { transform: translate3d(-2.4%, -.4%, 0) rotate(-.35deg) scale(1.145); }
  68% { transform: translate3d(2%, -.8%, 0) rotate(.3deg) scale(1.145); }
}

@keyframes digital-human-stretch {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1.14); }
  35% { transform: translate3d(0, -1.2%, 0) scale3d(1.145, 1.16, 1); }
  58% { transform: translate3d(0, -.7%, 0) scale3d(1.15, 1.155, 1); }
  78% { transform: translate3d(0, -.25%, 0) scale(1.142); }
}

@keyframes digital-human-settle {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1.14); }
  24% { transform: translate3d(-1.2%, -.4%, 0) rotate(-.2deg) scale(1.145); }
  48% { transform: translate3d(.8%, 0, 0) rotate(.15deg) scale(1.14); }
  70% { transform: translate3d(0, -.5%, 0) scale(1.148); }
}

@media (max-width: 720px) {
  .digital-human {
    width: 142px;
    min-width: 142px;
    height: 100%;
  }

  .unity-canvas { transform: translate3d(0, 0, 0) scale(1.1); }

  @keyframes digital-human-breathe {
    0%, 100% { transform: translate3d(0, 0, 0) scale(1.1); }
    46% { transform: translate3d(0, -1%, 0) scale(1.115); }
    62% { transform: translate3d(0, -.6%, 0) scale(1.11); }
  }

  @keyframes digital-human-sway {
    0%, 100% { transform: translate3d(0, 0, 0) rotate(0) scale(1.1); }
    32% { transform: translate3d(-2%, -.4%, 0) rotate(-.3deg) scale(1.105); }
    68% { transform: translate3d(1.7%, -.8%, 0) rotate(.25deg) scale(1.105); }
  }

  @keyframes digital-human-stretch {
    0%, 100% { transform: translate3d(0, 0, 0) scale(1.1); }
    35% { transform: translate3d(0, -1%, 0) scale3d(1.105, 1.12, 1); }
    58% { transform: translate3d(0, -.6%, 0) scale3d(1.11, 1.115, 1); }
    78% { transform: translate3d(0, -.2%, 0) scale(1.102); }
  }

  @keyframes digital-human-settle {
    0%, 100% { transform: translate3d(0, 0, 0) scale(1.1); }
    24% { transform: translate3d(-1%, -.4%, 0) rotate(-.18deg) scale(1.105); }
    48% { transform: translate3d(.7%, 0, 0) rotate(.12deg) scale(1.1); }
    70% { transform: translate3d(0, -.5%, 0) scale(1.108); }
  }
}

@media (prefers-reduced-motion: reduce) {
  .unity-canvas,
  .idle-breathe,
  .idle-sway,
  .idle-stretch,
  .idle-settle {
    animation: none;
    transform: translate3d(0, 0, 0) scale(1.1);
  }
}
</style>
