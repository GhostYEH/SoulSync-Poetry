<template>
  <section class="digital-human" aria-label="云堇数字人学习伙伴">
    <div class="stage">
      <canvas id="digital-human-unity-canvas" ref="canvas" class="unity-canvas-source" tabindex="-1" aria-hidden="true"></canvas>
      <canvas ref="outputCanvas" class="unity-canvas" aria-label="云堇数字人"></canvas>
      <div v-if="!ready" class="stage-status">
        <span class="loader-ring"></span>
        <p>{{ loadMessage }}</p>
      </div>
      <div class="mode-badge">{{ stateLabel }}</div>
    </div>
    <div class="companion-name"><strong>灵犀</strong><span><i></i> 在线</span></div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({ state: { type: String, default: 'idle' }, autoExplain: Boolean })
const canvas = ref(null)
const outputCanvas = ref(null)
const ready = ref(false)
const loadMessage = ref('数字人场景加载中')
let unityInstance
let cutoutFrame
const webglRoot = (import.meta.env.VITE_DIGITAL_HUMAN_WEBGL_URL || '/digital-human').replace(/\/index\.html$/, '').replace(/\/$/, '')
const labels = { idle: '静候陪读', preparing: '准备语音', speaking: '正在讲解', paused: '讲解暂停', thinking: '正在思考', error: '暂时离线' }
const stateLabel = computed(() => labels[props.state] || '静候陪读')

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

onMounted(mountUnity)
onBeforeUnmount(async () => {
  cancelAnimationFrame(cutoutFrame)
  if (window.digitalHumanUnityInstance === unityInstance) delete window.digitalHumanUnityInstance
  if (unityInstance?.Quit) await unityInstance.Quit()
})
</script>

<style scoped>
.digital-human{position:relative;display:grid;grid-template-rows:minmax(0,1fr) auto;width:190px;min-width:190px;height:370px;min-height:0;overflow:hidden;border-right:1px solid rgba(39,91,84,.12)}.stage{position:relative;min-height:0;overflow:hidden;background:transparent}.unity-canvas-source{position:absolute;inset:0;width:100%;height:100%;opacity:0;pointer-events:none}.unity-canvas{display:block;width:100%;height:100%;border:0;background:transparent!important;image-rendering:auto;pointer-events:none}.stage-status{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;color:var(--pd-muted);background:rgba(230,241,237,.12);pointer-events:none}.loader-ring{width:28px;height:28px;border:2px solid rgba(44,103,96,.18);border-top-color:var(--pd-jade);border-radius:50%;animation:spin .9s linear infinite}.stage-status p{margin:10px 0;font-size:12px}.mode-badge{position:absolute;left:10px;top:10px;padding:6px 10px;border:1px solid rgba(255,255,255,.72);border-radius:999px;background:rgba(245,249,247,.72);backdrop-filter:blur(12px);color:#315d58;font-size:11px}.companion-name{display:grid;place-items:center;gap:3px;padding:8px 0 10px}.companion-name strong{color:var(--pd-ink);font:600 15px 'Noto Serif SC','Songti SC',serif}.companion-name span{display:flex;align-items:center;gap:5px;color:var(--pd-muted);font-size:11px}.companion-name i{width:7px;height:7px;border-radius:50%;background:#2b9a83;box-shadow:0 0 0 4px rgba(43,154,131,.1)}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:720px){.digital-human{width:142px;min-width:142px;height:300px}}
</style>
