const SURFACE_NAMES = new Set([
  'card', 'panel', 'modal', 'dialog', 'drawer', 'popover', 'toolbar', 'control',
  'controls', 'navbar', 'footer', 'toast', 'field', 'chip', 'tabs', 'menu',
  'surface', 'dock', 'sheet', 'workspace', 'banner', 'summary', 'hero', 'browser',
  'box', 'tile', 'section', 'aside', 'stage', 'result', 'prompt', 'guide',
  'editor', 'view', 'frame', 'area'
])

const EXPLICIT_SURFACES = [
  '.ios26-navbar', '.navbar-brand', '.glass-nav-button', '.footer',
  '.app-toast', '.app-dialog', '.login-panel', '.register-form',
  '.selection-popup', '.score-modal', '.search-container', '.progress-summary',
  '.challenge-stage', '.quest-card', '.level-browser', '.learning-hero',
  '.explore-card', '.daily-poem-card', '.poem-scroll-shell', '.scroll-poem-card',
  '.footprint-summary', '.ranking-card', '.paper-panel', '.poetry-sheet',
  '.creative-stage', '.workflow-brief', '.quiz-aside', '.question-panel',
  '.recitation-area', '.record-panel', '.transcript-section', '.score-result',
  '.compare-box', '.rules-box', '.menu-left', '.menu-right', '.controls-showcase',
  '.view', '.rule-item', '.level-item', '.login-panel-inner',
  '.top-three', '.rank-item', '.current-user', '.mastery-overview', '.review-hero',
  '.review-workspace', '.question-list', '.question-row', '.reason-block',
  '.rhythm-section', '.toolbar-controls', '.work-item', '.empty-state',
  '.ability-section', '.recommendation-card', '.stat-item', '.challenge-display',
  '.theme-card', '.theme-guide', '.rating-section', '.dimension-card',
  '.analysis-section', '.history-item', '.poem-result', '.advice-card',
  '.compare-modal', '.poem-item', '.glass-panel', '.mode-tile', '.setup-card',
  '.ai-assistant-panel', '.recommendations-panel', '.structure-header-card',
  '.structure-node', '.tip-card', '.analysis-card', '.suggestions-box'
].join(',')

const INTERACTIVE_TAGS = new Set(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'])
const SKIP_TAGS = new Set(['HTML', 'BODY', 'SVG', 'PATH', 'CANVAS', 'IMG', 'VIDEO', 'SCRIPT', 'STYLE'])
const STRUCTURAL_TAGS = new Set(['DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'NAV', 'HEADER', 'FORM', 'LI'])

function classLooksLikeSurface(element) {
  return [...element.classList].some((token) => {
    const normalized = token.toLowerCase().replaceAll('_', '-')
    return [...SURFACE_NAMES].some((name) => normalized === name || normalized.endsWith(`-${name}`))
  })
}

function alphaFromColor(color) {
  if (!color || color === 'transparent') return 0
  const commaRgba = color.match(/rgba?\([^)]*[,/]\s*([\d.]+%?)\s*\)$/i)
  if (!commaRgba || !color.toLowerCase().startsWith('rgba')) return 1
  return commaRgba[1].endsWith('%')
    ? Number.parseFloat(commaRgba[1]) / 100
    : Number.parseFloat(commaRgba[1])
}

function hasVisibleBorder(style) {
  return ['Top', 'Right', 'Bottom', 'Left'].some((side) => (
    Number.parseFloat(style[`border${side}Width`]) > 0 &&
    style[`border${side}Style`] !== 'none' &&
    alphaFromColor(style[`border${side}Color`]) > 0
  ))
}

function hasTranslucentGradient(backgroundImage) {
  if (!backgroundImage || backgroundImage === 'none') return false
  if (/url\(/i.test(backgroundImage)) return false
  return /transparent|rgba?\([^)]*[,/]\s*(?:0?\.\d+|\d+%)\s*\)/i.test(backgroundImage)
}

function getBackdropFilter(style) {
  return style.backdropFilter || style.webkitBackdropFilter || 'none'
}

function isTransparentSurface(element, style) {
  const alpha = alphaFromColor(style.backgroundColor)
  const hasBlur = getBackdropFilter(style) !== 'none'
  const hasGradient = hasTranslucentGradient(style.backgroundImage)
  const hasOpaqueGradient = style.backgroundImage !== 'none' && !/url\(/i.test(style.backgroundImage) && !hasGradient
  const hasEdge = hasVisibleBorder(style)
  const hasShadow = style.boxShadow && style.boxShadow !== 'none'

  if (hasBlur || hasGradient || (alpha > 0.015 && alpha < 0.985)) return true
  if (hasOpaqueGradient) return false
  return alpha === 0 && (hasEdge || hasShadow)
}

function shouldEnhance(element) {
  if (!(element instanceof HTMLElement)) return false
  if (SKIP_TAGS.has(element.tagName)) return false
  if (element.classList.contains('liquid-glass-optics') || element.getAttribute('aria-hidden') === 'true') return false
  if (element.hasAttribute('data-liquid-ignore') || element.hasAttribute('data-liquid-glass-component')) return false
  if (element.closest('[data-liquid-glass-component]')) return false

  const interactive = INTERACTIVE_TAGS.has(element.tagName)
  const explicitSurface = element.matches(EXPLICIT_SURFACES)
  const semanticSurface = explicitSurface || classLooksLikeSurface(element)
  const style = window.getComputedStyle(element)
  const ownsBackdrop = getBackdropFilter(style) !== 'none' && !['P', 'SPAN', 'I', 'SMALL'].includes(element.tagName)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  const explicitOpaqueSurface = explicitSurface && !/url\(/i.test(style.backgroundImage) && (hasVisibleBorder(style) || (style.boxShadow && style.boxShadow !== 'none'))
  if (!isTransparentSurface(element, style) && !explicitOpaqueSurface) return false

  const rect = element.getBoundingClientRect()
  const hasStructuralEdge = hasVisibleBorder(style) || (style.boxShadow && style.boxShadow !== 'none')
  const hasContent = element.textContent.trim().length > 0 || Boolean(element.querySelector('button,input,textarea,select,img,svg'))
  const structuralFallback = STRUCTURAL_TAGS.has(element.tagName) && rect.width >= 88 && rect.height >= 42 && hasStructuralEdge && hasContent
  if (!interactive && !semanticSurface && !ownsBackdrop && !structuralFallback) return false

  const isViewportSheet = rect.width > window.innerWidth * 0.92 && rect.height > window.innerHeight * 0.82
  const isRouteRoot = element.parentElement?.matches('main.container')
  if (isViewportSheet && !isRouteRoot && !element.matches('.ios26-navbar,.footer,.modal,.dialog,.drawer')) return false

  return true
}

function classifySurface(element) {
  if (INTERACTIVE_TAGS.has(element.tagName)) return 'control'
  if (element.matches('.modal,.modal-content,.dialog,.drawer,.popover,.score-modal,.login-panel,.register-form')) return 'strong'
  return 'surface'
}

function canHostOptics(element) {
  return !['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(element.tagName)
}

function ensureOptics(element) {
  if (!canHostOptics(element) || element.querySelector(':scope > .liquid-glass-optics')) return
  if (window.getComputedStyle(element).position === 'static') {
    element.classList.add('liquid-glass-positioned')
  }
  const optics = document.createElement('span')
  optics.className = 'liquid-glass-optics'
  optics.setAttribute('aria-hidden', 'true')
  element.prepend(optics)
}

function removeOptics(element) {
  element.querySelector(':scope > .liquid-glass-optics')?.remove()
  element.classList.remove('liquid-glass-positioned')
}

function enhanceElement(element) {
  if (shouldEnhance(element)) {
    element.dataset.liquidGlass = classifySurface(element)
    const style = window.getComputedStyle(element)
    const shouldUseOptics = INTERACTIVE_TAGS.has(element.tagName) || element.matches(EXPLICIT_SURFACES) || classLooksLikeSurface(element) || getBackdropFilter(style) !== 'none'
    if (shouldUseOptics) ensureOptics(element)
    else removeOptics(element)
  } else if (element.hasAttribute('data-liquid-glass')) {
    delete element.dataset.liquidGlass
    removeOptics(element)
  }
}

function enhanceTree(root = document) {
  if (root instanceof HTMLElement) enhanceElement(root)
  root.querySelectorAll?.('[class],button,a,input,textarea,select').forEach(enhanceElement)
}

export function installLiquidGlass(router) {
  if (typeof window === 'undefined' || document.documentElement.dataset.liquidGlassInstalled) return () => {}
  document.documentElement.dataset.liquidGlassInstalled = 'true'

  let scanFrame = null
  let pointerFrame = null
  let activeSurface = null
  let pendingPointer = null
  const scanTimers = new Set()

  const scheduleScan = () => {
    if (scanFrame) return
    scanFrame = window.requestAnimationFrame(() => {
      scanFrame = null
      enhanceTree(document)
    })
  }

  const observer = new MutationObserver((mutations) => {
    const hasRelevantAddition = mutations.some((mutation) => {
      if (mutation.target instanceof HTMLElement && mutation.target.closest('.dynamic-elements')) return false
      return [...mutation.addedNodes].some((node) => (
        !(node instanceof HTMLElement) || !node.classList.contains('liquid-glass-optics')
      ))
    })
    if (hasRelevantAddition) scheduleScan()
  })

  observer.observe(document.getElementById('app') || document.body, {
    childList: true,
    subtree: true
  })

  const applyPointer = () => {
    pointerFrame = null
    if (!activeSurface || !pendingPointer) return
    const rect = activeSurface.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((pendingPointer.x - rect.left) / Math.max(1, rect.width)) * 100))
    const y = Math.min(100, Math.max(0, ((pendingPointer.y - rect.top) / Math.max(1, rect.height)) * 100))
    activeSurface.style.setProperty('--liquid-x', `${x}%`)
    activeSurface.style.setProperty('--liquid-y', `${y}%`)
    activeSurface.style.setProperty('--liquid-angle', `${118 + (x - 50) * 0.38}deg`)
  }

  const handlePointerMove = (event) => {
    const surface = event.target.closest?.('[data-liquid-glass]')
    if (!surface) return
    activeSurface = surface
    pendingPointer = { x: event.clientX, y: event.clientY }
    if (!pointerFrame) pointerFrame = window.requestAnimationFrame(applyPointer)
  }

  const handlePointerOut = (event) => {
    if (!activeSurface || activeSurface.contains(event.relatedTarget)) return
    activeSurface.style.removeProperty('--liquid-x')
    activeSurface.style.removeProperty('--liquid-y')
    activeSurface.style.removeProperty('--liquid-angle')
    activeSurface = null
    pendingPointer = null
  }

  const handlePointerDown = (event) => event.target.closest?.('[data-liquid-glass="control"]')?.classList.add('is-liquid-pressed')
  const clearPressed = () => document.querySelectorAll('.is-liquid-pressed').forEach((element) => element.classList.remove('is-liquid-pressed'))

  document.addEventListener('pointermove', handlePointerMove, { passive: true })
  document.addEventListener('pointerout', handlePointerOut, { passive: true })
  document.addEventListener('pointerdown', handlePointerDown, { passive: true })
  document.addEventListener('pointerup', clearPressed, { passive: true })
  document.addEventListener('pointercancel', clearPressed, { passive: true })

  const queueStableScans = () => {
    scanTimers.forEach((timer) => window.clearTimeout(timer))
    scanTimers.clear()
    scheduleScan()
    ;[80, 260, 620, 1200].forEach((delay) => {
      const timer = window.setTimeout(() => {
        scanTimers.delete(timer)
        scheduleScan()
      }, delay)
      scanTimers.add(timer)
    })
  }

  const removeRouteHook = router?.afterEach(queueStableScans)
  scheduleScan()
  queueStableScans()

  return () => {
    observer.disconnect()
    removeRouteHook?.()
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerout', handlePointerOut)
    document.removeEventListener('pointerdown', handlePointerDown)
    document.removeEventListener('pointerup', clearPressed)
    document.removeEventListener('pointercancel', clearPressed)
    if (scanFrame) window.cancelAnimationFrame(scanFrame)
    if (pointerFrame) window.cancelAnimationFrame(pointerFrame)
    scanTimers.forEach((timer) => window.clearTimeout(timer))
    scanTimers.clear()
    delete document.documentElement.dataset.liquidGlassInstalled
  }
}
