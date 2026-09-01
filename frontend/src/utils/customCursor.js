import cursorOne from '../assets/cursors/ink-pointer-1.png'
import cursorTwo from '../assets/cursors/ink-pointer-2.png'
import cursorThree from '../assets/cursors/ink-pointer-3.png'
import cursorFour from '../assets/cursors/ink-pointer-4.png'

const cursorAssets = [cursorOne, cursorTwo, cursorThree, cursorFour]
const interactiveSelector = 'a, button, [role="button"], summary, label, select, [tabindex]:not([tabindex="-1"])'
const textEntrySelector = 'input:not([type="hidden"]), textarea, [contenteditable="true"], [contenteditable=""]'
const glassSelector = '[data-liquid-glass], [data-liquid-glass-component]'

function canUseCustomCursor(mediaQuery) {
  return mediaQuery.matches
}

function getClosestElement(target, selector) {
  return target instanceof Element ? target.closest(selector) : null
}

/**
 * Install the desktop-only cursor layer once for the whole application.
 * The router callback changes the artwork only after a successful navigation,
 * so the active artwork remains stable while a view is open.
 */
export function installCustomCursor(router) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const root = document.documentElement
  const pointerMedia = window.matchMedia('(hover: hover) and (pointer: fine)')
  const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
  let cursorElement = null
  let cursorImage = null
  let pointerMoveHandler = null
  let pointerDownHandler = null
  let pointerUpHandler = null
  let pointerLeaveHandler = null
  let windowBlurHandler = null
  let renderFrame = null
  let currentX = -120
  let currentY = -120
  let targetX = -120
  let targetY = -120
  let currentAssetIndex = -1
  let lastModeTarget = null
  let lastInteractiveMode = false
  let lastTextMode = false
  let lastGlassMode = false
  let cursorWarmupScheduled = false
  let enabled = false

  const scheduleCursorAssetWarmup = (activeAsset) => {
    if (cursorWarmupScheduled) return
    cursorWarmupScheduled = true

    const warmRemainingAssets = () => {
      cursorAssets.filter((src) => src !== activeAsset).forEach((src) => {
        const image = new Image()
        image.decoding = 'async'
        image.src = src
      })
    }
    const scheduleWhenIdle = () => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(warmRemainingAssets, { timeout: 3000 })
      } else {
        window.setTimeout(warmRemainingAssets, 500)
      }
    }

    if (document.readyState === 'complete') scheduleWhenIdle()
    else window.addEventListener('load', scheduleWhenIdle, { once: true })
  }

  const setCursorArtwork = () => {
    if (!cursorImage) return

    let nextIndex = Math.floor(Math.random() * cursorAssets.length)
    if (cursorAssets.length > 1 && nextIndex === currentAssetIndex) {
      nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (cursorAssets.length - 1))) % cursorAssets.length
    }

    currentAssetIndex = nextIndex
    cursorImage.src = cursorAssets[nextIndex]
    cursorImage.dataset.cursorIndex = String(nextIndex + 1)
  }

  const renderCursor = () => {
    if (!cursorElement) {
      renderFrame = null
      return
    }

    if (motionMedia.matches) {
      currentX = targetX
      currentY = targetY
    } else {
      currentX += (targetX - currentX) * 0.24
      currentY += (targetY - currentY) * 0.24
    }

    cursorElement.style.setProperty('--cursor-x', `${currentX}px`)
    cursorElement.style.setProperty('--cursor-y', `${currentY}px`)

    if (motionMedia.matches || (Math.abs(targetX - currentX) < 0.2 && Math.abs(targetY - currentY) < 0.2)) {
      currentX = targetX
      currentY = targetY
      cursorElement.style.setProperty('--cursor-x', `${currentX}px`)
      cursorElement.style.setProperty('--cursor-y', `${currentY}px`)
      renderFrame = null
      return
    }

    renderFrame = window.requestAnimationFrame(renderCursor)
  }

  const scheduleCursorRender = () => {
    if (!renderFrame) renderFrame = window.requestAnimationFrame(renderCursor)
  }

  const updateCursorMode = (target) => {
    const glassElement = getClosestElement(target, glassSelector)
    const nextGlassMode = Boolean(glassElement)
    if (target === lastModeTarget && nextGlassMode === lastGlassMode) return
    lastModeTarget = target
    const interactiveElement = getClosestElement(target, interactiveSelector)
    const textEntryElement = getClosestElement(target, textEntrySelector)
    const nextInteractiveMode = Boolean(interactiveElement && !textEntryElement)
    const nextTextMode = Boolean(textEntryElement)
    if (nextInteractiveMode !== lastInteractiveMode) {
      cursorElement.classList.toggle('custom-cursor-interactive', nextInteractiveMode)
      lastInteractiveMode = nextInteractiveMode
    }
    if (nextTextMode !== lastTextMode) {
      cursorElement.classList.toggle('custom-cursor-text', nextTextMode)
      lastTextMode = nextTextMode
    }
    if (nextGlassMode !== lastGlassMode) {
      cursorElement.classList.toggle('custom-cursor-over-glass', nextGlassMode)
      lastGlassMode = nextGlassMode
    }
  }

  const showCursor = () => {
    cursorElement?.classList.add('custom-cursor-visible')
  }

  const hideCursor = () => {
    cursorElement?.classList.remove('custom-cursor-visible', 'custom-cursor-pressed', 'custom-cursor-interactive', 'custom-cursor-text', 'custom-cursor-over-glass')
    lastModeTarget = null
    lastInteractiveMode = false
    lastTextMode = false
    lastGlassMode = false
  }

  const enableCursor = () => {
    if (enabled) return
    enabled = true
    root.classList.remove('custom-cursor-pending')
    root.classList.add('custom-cursor-enabled')

    cursorElement = document.createElement('div')
    cursorElement.className = 'custom-cursor'
    cursorElement.setAttribute('aria-hidden', 'true')
    cursorImage = document.createElement('img')
    cursorImage.alt = ''
    cursorImage.draggable = false
    cursorImage.decoding = 'async'
    cursorElement.appendChild(cursorImage)
    document.body.appendChild(cursorElement)
    setCursorArtwork()
    scheduleCursorAssetWarmup(cursorAssets[currentAssetIndex])

    pointerMoveHandler = (event) => {
      targetX = event.clientX
      targetY = event.clientY
      updateCursorMode(event.target)
      showCursor()
      scheduleCursorRender()
    }
    pointerDownHandler = () => cursorElement?.classList.add('custom-cursor-pressed')
    pointerUpHandler = () => cursorElement?.classList.remove('custom-cursor-pressed')
    pointerLeaveHandler = () => hideCursor()
    windowBlurHandler = () => hideCursor()

    document.addEventListener('pointermove', pointerMoveHandler, { passive: true })
    document.addEventListener('pointerdown', pointerDownHandler, { passive: true })
    document.addEventListener('pointerup', pointerUpHandler, { passive: true })
    document.addEventListener('pointercancel', pointerUpHandler, { passive: true })
    document.addEventListener('pointerleave', pointerLeaveHandler)
    window.addEventListener('blur', windowBlurHandler)
  }

  const disableCursor = () => {
    if (!enabled) {
      root.classList.remove('custom-cursor-pending')
      return
    }

    enabled = false
    root.classList.remove('custom-cursor-enabled', 'custom-cursor-pending')
    if (renderFrame) window.cancelAnimationFrame(renderFrame)
    renderFrame = null
    if (pointerMoveHandler) document.removeEventListener('pointermove', pointerMoveHandler)
    if (pointerDownHandler) document.removeEventListener('pointerdown', pointerDownHandler)
    if (pointerUpHandler) {
      document.removeEventListener('pointerup', pointerUpHandler)
      document.removeEventListener('pointercancel', pointerUpHandler)
    }
    if (pointerLeaveHandler) document.removeEventListener('pointerleave', pointerLeaveHandler)
    if (windowBlurHandler) window.removeEventListener('blur', windowBlurHandler)
    cursorElement?.remove()
    cursorElement = null
    cursorImage = null
    lastModeTarget = null
    lastInteractiveMode = false
    lastTextMode = false
    lastGlassMode = false
  }

  const syncCursorCapability = () => {
    if (canUseCustomCursor(pointerMedia)) enableCursor()
    else disableCursor()
  }

  const handlePointerCapabilityChange = () => syncCursorCapability()
  const handleMotionPreferenceChange = () => {
    if (motionMedia.matches) {
      currentX = targetX
      currentY = targetY
      scheduleCursorRender()
    }
  }

  pointerMedia.addEventListener?.('change', handlePointerCapabilityChange)
  motionMedia.addEventListener?.('change', handleMotionPreferenceChange)
  router?.afterEach(() => {
    if (enabled) setCursorArtwork()
  })

  syncCursorCapability()
  router?.isReady?.().then(() => {
    if (enabled && currentAssetIndex === -1) setCursorArtwork()
  })
}
