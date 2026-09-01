<template>
  <component
    :is="as"
    ref="rootElement"
    class="liquid-glass-vue"
    :class="{ 'is-interactive': interactive, 'is-over-light': overLight, 'is-pointer-inside': isPointerInside, 'is-pressed': isPressed }"
    :style="glassStyle"
    data-liquid-glass-component
    @pointerenter="handlePointerEnter"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
    @click="emit('click', $event)"
  >
    <svg class="liquid-glass-vue__filters" aria-hidden="true" focusable="false">
      <defs>
        <filter
          :id="filterId"
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
          color-interpolation-filters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            :baseFrequency="noiseFrequency"
            numOctaves="2"
            seed="8"
            result="liquidNoise"
          />
          <feGaussianBlur in="liquidNoise" stdDeviation="1.15" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            :scale="effectiveDisplacement"
            xChannelSelector="R"
            yChannelSelector="B"
            result="refractedGlass"
          />
          <feGaussianBlur
            in="refractedGlass"
            :stdDeviation="aberrationBlur"
            result="softRefraction"
          />
          <feComposite in="softRefraction" in2="SourceGraphic" operator="over" />
        </filter>
      </defs>
    </svg>

    <span class="liquid-glass-vue__warp" :style="warpStyle" aria-hidden="true"></span>
    <span class="liquid-glass-vue__edge" aria-hidden="true"></span>
    <span class="liquid-glass-vue__highlight" aria-hidden="true"></span>
    <div class="liquid-glass-vue__content">
      <slot />
    </div>
  </component>
</template>

<script setup>
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  as: { type: String, default: 'div' },
  displacementScale: { type: Number, default: 32 },
  blurAmount: { type: Number, default: 0.32 },
  saturation: { type: Number, default: 145 },
  aberrationIntensity: { type: Number, default: 1.4 },
  elasticity: { type: Number, default: 0.15 },
  cornerRadius: { type: [Number, String], default: 24 },
  padding: { type: String, default: '24px 32px' },
  overLight: { type: Boolean, default: false },
  interactive: { type: Boolean, default: false },
  noiseFrequency: { type: String, default: '0.012 0.028' }
})

const emit = defineEmits(['click'])
const rootElement = ref(null)
const isPressed = ref(false)
const isPointerInside = ref(false)
const instanceId = getCurrentInstance()?.uid ?? Math.round(Math.random() * 100000)
const filterId = `liquid-glass-vue-${instanceId}`
const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('firefox')
const supportsFinePointer = typeof window === 'undefined' || window.matchMedia('(hover: hover) and (pointer: fine)').matches
const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let frameId = null
let elementRect = null
let pendingPointer = null
let resizeObserver = null

const radiusValue = computed(() => (
  typeof props.cornerRadius === 'number' ? `${props.cornerRadius}px` : props.cornerRadius
))

const blurPixels = computed(() => (props.overLight ? 10 : 5) + props.blurAmount * 32)
const effectiveDisplacement = computed(() => Math.max(0, props.displacementScale * (props.overLight ? 0.55 : 1)))
const aberrationBlur = computed(() => Math.max(0.08, 0.58 - props.aberrationIntensity * 0.12))

const glassStyle = computed(() => ({
  '--lg-radius': radiusValue.value,
  '--lg-padding': props.padding,
  '--lg-blur': `${blurPixels.value}px`,
  '--lg-saturation': `${props.saturation}%`,
  '--lg-aberration': `${Math.max(0, props.aberrationIntensity)}px`
}))

const warpStyle = computed(() => ({
  filter: isFirefox ? undefined : `url(#${filterId})`
}))

function refreshRect() {
  elementRect = rootElement.value?.getBoundingClientRect() ?? null
}

function applyPointerPosition() {
  frameId = null
  const element = rootElement.value
  if (!element || !elementRect || !pendingPointer) return

  const x = Math.min(1, Math.max(0, (pendingPointer.x - elementRect.left) / Math.max(1, elementRect.width)))
  const y = Math.min(1, Math.max(0, (pendingPointer.y - elementRect.top) / Math.max(1, elementRect.height)))
  const dx = x - 0.5
  const dy = y - 0.5

  element.style.setProperty('--lg-pointer-x', `${x * 100}%`)
  element.style.setProperty('--lg-pointer-y', `${y * 100}%`)
  element.style.setProperty('--lg-highlight-angle', `${135 + dx * 48}deg`)

  if (props.interactive && !reduceMotion) {
    const travel = Math.min(8, Math.max(0, props.elasticity * 30))
    element.style.setProperty('--lg-shift-x', `${dx * travel}px`)
    element.style.setProperty('--lg-shift-y', `${dy * travel}px`)
    element.style.setProperty('--lg-scale-x', `${1 + Math.abs(dx) * props.elasticity * 0.055}`)
    element.style.setProperty('--lg-scale-y', `${1 + Math.abs(dy) * props.elasticity * 0.055}`)
  }
}

function handlePointerEnter(event) {
  if (!supportsFinePointer) return
  refreshRect()
  handlePointerMove(event)
}

function handlePointerMove(event) {
  if (!supportsFinePointer) return
  const nestedGlass = event.target instanceof Element
    ? event.target.closest('[data-liquid-glass]')
    : null
  if (nestedGlass && nestedGlass !== rootElement.value) {
    isPointerInside.value = false
    pendingPointer = null
    resetPointer()
    return
  }
  isPointerInside.value = true
  pendingPointer = { x: event.clientX, y: event.clientY }
  if (!frameId) frameId = window.requestAnimationFrame(applyPointerPosition)
}

function resetPointer() {
  const element = rootElement.value
  if (!element) return
  element.style.setProperty('--lg-pointer-x', '24%')
  element.style.setProperty('--lg-pointer-y', '0%')
  element.style.setProperty('--lg-highlight-angle', '135deg')
  element.style.setProperty('--lg-shift-x', '0px')
  element.style.setProperty('--lg-shift-y', '0px')
  element.style.setProperty('--lg-scale-x', '1')
  element.style.setProperty('--lg-scale-y', '1')
}

function handlePointerLeave() {
  isPointerInside.value = false
  isPressed.value = false
  pendingPointer = null
  resetPointer()
}

function handlePointerDown() {
  if (props.interactive) isPressed.value = true
}

function handlePointerUp() {
  isPressed.value = false
}

onMounted(() => {
  refreshRect()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(refreshRect)
    resizeObserver.observe(rootElement.value)
  }
})

onBeforeUnmount(() => {
  if (frameId) window.cancelAnimationFrame(frameId)
  resizeObserver?.disconnect()
})
</script>

<style>
.liquid-glass-vue {
  --lg-pointer-x: 24%;
  --lg-pointer-y: 0%;
  --lg-highlight-angle: 135deg;
  --lg-shift-x: 0px;
  --lg-shift-y: 0px;
  --lg-scale-x: 1;
  --lg-scale-y: 1;
  --lg-pointer-warp-alpha: 0;
  --lg-pointer-highlight-alpha: 0;
  position: relative;
  box-sizing: border-box;
  isolation: isolate;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .82);
  border-radius: var(--lg-radius);
  background: transparent !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .96),
    inset 0 -1px 0 rgba(42, 125, 107, .2),
    inset 2px 0 0 rgba(237, 122, 145, .1),
    inset -2px 0 0 rgba(40, 177, 160, .14),
    0 18px 54px rgba(30, 82, 72, .16);
}

.liquid-glass-vue__filters {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.liquid-glass-vue__warp,
.liquid-glass-vue__edge,
.liquid-glass-vue__highlight {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}

.liquid-glass-vue__warp {
  z-index: -3;
  background:
    radial-gradient(150px circle at var(--lg-pointer-x) var(--lg-pointer-y), rgba(255,255,255,var(--lg-pointer-warp-alpha)), transparent 68%),
    linear-gradient(135deg, rgba(255,255,255,.24), rgba(216,244,235,.08) 48%, rgba(255,248,225,.17)),
    rgba(226,246,238,.1);
  backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-saturation)) contrast(1.09) brightness(1.03);
  -webkit-backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-saturation)) contrast(1.09) brightness(1.03);
  transform: translate3d(var(--lg-shift-x), var(--lg-shift-y), 0) scaleX(var(--lg-scale-x)) scaleY(var(--lg-scale-y));
  transition: transform .28s cubic-bezier(.2,.8,.2,1), background-position .18s ease;
}

.liquid-glass-vue__edge {
  z-index: -2;
  inset: 1px;
  border: 1px solid rgba(255,255,255,.58);
  box-shadow:
    inset var(--lg-aberration) 0 rgba(239,112,132,.16),
    inset calc(var(--lg-aberration) * -1) 0 rgba(72,174,165,.2),
    inset 0 1px 0 rgba(255,255,255,.82);
  mix-blend-mode: screen;
}

.liquid-glass-vue__highlight {
  z-index: -1;
  background:
    linear-gradient(var(--lg-highlight-angle), transparent 18%, rgba(255,255,255,.38) 42%, rgba(199,241,232,.12) 49%, transparent 65%),
    radial-gradient(150px circle at var(--lg-pointer-x) var(--lg-pointer-y), rgba(218,255,246,var(--lg-pointer-highlight-alpha)), transparent 70%);
  opacity: .88;
  transition: opacity .2s ease;
}

.liquid-glass-vue__content {
  position: relative;
  z-index: 1;
  min-width: 0;
  padding: var(--lg-padding);
}

.liquid-glass-vue.is-interactive {
  cursor: pointer;
}

.liquid-glass-vue.is-interactive:hover .liquid-glass-vue__highlight {
  opacity: 1;
}

.liquid-glass-vue.is-pointer-inside {
  --lg-pointer-warp-alpha: .52;
  --lg-pointer-highlight-alpha: .48;
}

.liquid-glass-vue.is-pressed .liquid-glass-vue__warp,
.liquid-glass-vue.is-pressed .liquid-glass-vue__content {
  transform: scale(.985);
}

.liquid-glass-vue.is-over-light .liquid-glass-vue__warp {
  background:
    radial-gradient(circle at var(--lg-pointer-x) var(--lg-pointer-y), rgba(255,255,255,.4), transparent 30%),
    linear-gradient(135deg, rgba(239,248,244,.3), rgba(197,222,215,.17)),
    rgba(47,86,78,.14);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .liquid-glass-vue__warp { background: rgba(244,250,247,.94); }
}

@media (prefers-reduced-transparency: reduce) {
  .liquid-glass-vue__warp {
    background: rgba(244,250,247,.96);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    filter: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .liquid-glass-vue__warp,
  .liquid-glass-vue__highlight,
  .liquid-glass-vue__content { transition: none; transform: none !important; }
}
</style>
