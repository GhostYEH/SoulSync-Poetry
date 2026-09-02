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
const BUTTON_INPUT_TYPES = new Set(['button', 'submit', 'reset', 'image'])
const BUTTON_CLASS_PATTERN = /(^|[-_])(btn|button|action|cta|toggle|trigger|chip|pill|tab|choice|option)([-_]|$)/i
const ENHANCE_SELECTOR = '[class],button,a,input,textarea,select'
const INTERNAL_GLASS_CLASSES = new Set(['liquid-glass-positioned', 'is-liquid-hovered', 'is-liquid-pressed'])

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

function isButtonLike(element) {
  if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') return true
  if (element.tagName === 'INPUT') {
    return BUTTON_INPUT_TYPES.has((element.getAttribute('type') || 'text').toLowerCase())
  }
  return ['A', 'LABEL'].includes(element.tagName) && [...element.classList].some((token) => BUTTON_CLASS_PATTERN.test(token))
}

function parseCssColor(value) {
  if (!value || value === 'transparent') return null
  const match = value.match(/rgba?\([^)]*\)/i)
  if (!match) return null
  const channels = match[0].match(/[\d.]+/g)?.map(Number) || []
  if (channels.length < 3) return null
  const alpha = channels.length > 3 ? channels[3] : 1
  return { r: channels[0], g: channels[1], b: channels[2], alpha }
}

function colorScore(color) {
  const chroma = Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b)
  const luminance = color.r * .2126 + color.g * .7152 + color.b * .0722
  return chroma * 2.1 + Math.max(0, 224 - luminance)
}

function readControlTint(style) {
  const gradientColors = [...(style.backgroundImage || '').matchAll(/rgba?\([^)]*\)/gi)]
    .map((match) => parseCssColor(match[0]))
    .filter((color) => color && color.alpha > .04)
  const backgroundColor = parseCssColor(style.backgroundColor)
  const candidates = backgroundColor?.alpha > .04
    ? [...gradientColors, backgroundColor]
    : gradientColors
  if (!candidates.length) return null
  return candidates.sort((a, b) => colorScore(b) - colorScore(a))[0]
}

function tintSignature(element) {
  const classes = [...element.classList].filter((name) => name !== 'is-liquid-pressed').sort().join(' ')
  return [classes, element.disabled, element.getAttribute('aria-pressed'), element.getAttribute('aria-selected')].join('|')
}

function updateControlTint(element, existingStyle) {
  const signature = tintSignature(element)
  if (element.dataset.liquidTintSignature === signature) return

  const previousGlass = element.getAttribute('data-liquid-glass')
  const previousTone = element.getAttribute('data-liquid-tone')
  let tint
  if (previousGlass || previousTone) {
    element.removeAttribute('data-liquid-glass')
    element.removeAttribute('data-liquid-tone')
    tint = readControlTint(window.getComputedStyle(element))
    if (previousGlass) element.setAttribute('data-liquid-glass', previousGlass)
    if (previousTone) element.setAttribute('data-liquid-tone', previousTone)
  } else {
    tint = readControlTint(existingStyle || window.getComputedStyle(element))
  }

  const chroma = tint ? Math.max(tint.r, tint.g, tint.b) - Math.min(tint.r, tint.g, tint.b) : 0
  const luminance = tint ? tint.r * .2126 + tint.g * .7152 + tint.b * .0722 : 255
  const hasSemanticTint = /(^|[-_\s])(active|selected|primary|success|danger|warning)([-_\s]|$)/i.test(
    [...element.classList].join(' ')
  )
  const isTinted = Boolean(tint && (hasSemanticTint || chroma >= 18 || luminance < 205))
  const resolved = isTinted ? tint : { r: 235, g: 249, b: 244, alpha: 1 }
  const alpha = isTinted
    ? (luminance < 125 ? .7 : Math.min(.62, Math.max(.42, resolved.alpha * .6)))
    : .16

  element.style.setProperty('--liquid-control-tint-rgb', `${Math.round(resolved.r)}, ${Math.round(resolved.g)}, ${Math.round(resolved.b)}`)
  element.style.setProperty('--liquid-control-tint-alpha', alpha.toFixed(2))
  element.dataset.liquidTone = isTinted ? 'tinted' : 'neutral'
  element.dataset.liquidTintSignature = signature
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

function shouldEnhance(element, style) {
  if (!(element instanceof HTMLElement)) return false
  if (SKIP_TAGS.has(element.tagName)) return false
  if (element.classList.contains('liquid-glass-optics') || element.getAttribute('aria-hidden') === 'true') return false
  const isRouteRoot = element.parentElement?.matches('main.container')
  // A route root is the page canvas, not a card. Applying the displacement
  // filter there creates a full-viewport GPU layer. Pages that explicitly opt
  // into the glass surface list are still enhanced normally.
  if (isRouteRoot && !element.matches(EXPLICIT_SURFACES)) return false
  const buttonLike = isButtonLike(element)
  if (element.hasAttribute('data-liquid-ignore') || element.hasAttribute('data-liquid-glass-component')) return false
  if (element.closest('[data-liquid-glass-component]') && !buttonLike) return false

  const interactive = INTERACTIVE_TAGS.has(element.tagName)
  const explicitSurface = element.matches(EXPLICIT_SURFACES)
  const semanticSurface = explicitSurface || classLooksLikeSurface(element)
  style ||= window.getComputedStyle(element)
  const ownsBackdrop = getBackdropFilter(style) !== 'none' && !['P', 'SPAN', 'I', 'SMALL'].includes(element.tagName)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  // Buttons are always glass, including fully opaque primary/danger controls.
  if (buttonLike) return true
  const explicitOpaqueSurface = explicitSurface && !/url\(/i.test(style.backgroundImage) && (hasVisibleBorder(style) || (style.boxShadow && style.boxShadow !== 'none'))
  if (!isTransparentSurface(element, style) && !explicitOpaqueSurface) return false

  const rect = element.getBoundingClientRect()
  const hasStructuralEdge = hasVisibleBorder(style) || (style.boxShadow && style.boxShadow !== 'none')
  const hasContent = element.textContent.trim().length > 0 || Boolean(element.querySelector('button,input,textarea,select,img,svg'))
  const structuralFallback = STRUCTURAL_TAGS.has(element.tagName) && rect.width >= 88 && rect.height >= 42 && hasStructuralEdge && hasContent
  if (!interactive && !semanticSurface && !ownsBackdrop && !structuralFallback) return false

  const isViewportSheet = rect.width > window.innerWidth * 0.92 && rect.height > window.innerHeight * 0.82
  if (isViewportSheet && !isRouteRoot && !element.matches('.ios26-navbar,.footer,.modal,.dialog,.drawer')) return false

  return true
}

function isImmediatelyIneligible(element) {
  if (!(element instanceof HTMLElement)) return true
  if (SKIP_TAGS.has(element.tagName)) return true
  if (element.classList.contains('liquid-glass-optics') || element.getAttribute('aria-hidden') === 'true') return true
  if (element.hasAttribute('data-liquid-ignore') || element.hasAttribute('data-liquid-glass-component')) return true
  return element.closest('[data-liquid-glass-component]') && !isButtonLike(element)
}

function enhancementSignature(element) {
  const classes = [...element.classList]
    .filter((className) => !INTERNAL_GLASS_CLASSES.has(className))
    .sort()
    .join(' ')
  return [classes, element.disabled, element.getAttribute('aria-pressed'), element.getAttribute('aria-selected')].join('|')
}

function classifySurface(element) {
  if (isButtonLike(element)) return 'control'
  if (element.matches('.modal,.modal-content,.dialog,.drawer,.popover,.score-modal,.login-panel,.register-form')) return 'strong'
  return 'surface'
}

function canHostOptics(element) {
  return !['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(element.tagName)
}

function ensureOptics(element, positionIsStatic) {
  if (!canHostOptics(element) || element.querySelector(':scope > .liquid-glass-optics')) return
  if (positionIsStatic) {
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

function planEnhancement(element) {
  if (isImmediatelyIneligible(element)) {
    return { element, eligible: false }
  }

  const signature = enhancementSignature(element)
  if (element.dataset.liquidEnhanceSignature === signature) {
    return { element, skip: true }
  }

  const style = window.getComputedStyle(element)
  if (!shouldEnhance(element, style)) return { element, eligible: false, signature }

  const surfaceType = classifySurface(element)
  return {
    element,
    eligible: true,
    surfaceType,
    style,
    signature,
    positionIsStatic: style.position === 'static',
    shouldUseOptics: isButtonLike(element)
      || INTERACTIVE_TAGS.has(element.tagName)
      || element.matches(EXPLICIT_SURFACES)
      || classLooksLikeSurface(element)
      || getBackdropFilter(style) !== 'none'
  }
}

function applyEnhancement(plan) {
  const { element } = plan
  if (plan.skip) return
  if (plan.eligible) {
    if (plan.surfaceType === 'control') updateControlTint(element, plan.style)
    element.dataset.liquidGlass = plan.surfaceType
    if (plan.shouldUseOptics) ensureOptics(element, plan.positionIsStatic)
    else removeOptics(element)
  } else if (element.hasAttribute('data-liquid-glass')) {
    delete element.dataset.liquidGlass
    removeOptics(element)
  }
  if (plan.signature) element.dataset.liquidEnhanceSignature = plan.signature
}

function enhanceElement(element) {
  applyEnhancement(planEnhancement(element))
}

function enhanceTree(root = document) {
  const elements = []
  if (root instanceof HTMLElement) elements.push(root)
  root.querySelectorAll?.(ENHANCE_SELECTOR).forEach((element) => elements.push(element))

  // Complete every style/layout read before inserting optics or attributes.
  // This prevents each element from invalidating the next element's read.
  const plans = elements.map(planEnhancement)
  plans.forEach(applyEnhancement)
}

function hasOnlyInternalClassChanges(element, previousValue = '') {
  const before = new Set(String(previousValue ?? '').split(/\s+/).filter(Boolean))
  const after = new Set(element.classList)
  const changed = new Set([
    ...[...before].filter((className) => !after.has(className)),
    ...[...after].filter((className) => !before.has(className))
  ])

  if (!changed.size) return true
  if (element.hasAttribute('data-liquid-glass-component')) {
    return [...changed].every((className) => ['is-pointer-inside', 'is-pressed'].includes(className))
  }
  return [...changed].every((className) => INTERNAL_GLASS_CLASSES.has(className))
}

export function installLiquidGlass(router) {
  if (typeof window === 'undefined' || document.documentElement.dataset.liquidGlassInstalled) return () => {}
  document.documentElement.dataset.liquidGlassInstalled = 'true'

  let scanFrame = null
  let pointerFrame = null
  let activeSurface = null
  let activeSurfaceRect = null
  let pendingPointer = null
  let pointerGeometryDirty = false
  const appRoot = document.getElementById('app') || document.body
  const pendingScanRoots = new Set()
  const pendingElementScans = new Set()
  const pressedControls = new Set()
  const scanTimers = new Set()

  const addScanRoot = (root) => {
    if (!(root instanceof Element) && root !== document) return false
    if (root instanceof Element && root.closest('.dynamic-elements')) return false

    for (const pendingRoot of pendingScanRoots) {
      if (pendingRoot === root || pendingRoot.contains?.(root)) return false
      if (root.contains?.(pendingRoot)) pendingScanRoots.delete(pendingRoot)
    }

    // A full scan supersedes any single-element checks inside that subtree.
    pendingElementScans.forEach((element) => {
      if (root === document || root === element || root.contains?.(element)) {
        pendingElementScans.delete(element)
      }
    })
    pendingScanRoots.add(root)
    return true
  }

  const flushScans = () => {
    if (scanFrame) return
    scanFrame = window.requestAnimationFrame(() => {
      scanFrame = null
      const roots = [...pendingScanRoots]
      const elements = [...pendingElementScans]
      pendingScanRoots.clear()
      pendingElementScans.clear()
      roots.forEach((scanRoot) => {
        if (scanRoot === document || scanRoot.isConnected) enhanceTree(scanRoot)
      })
      elements.forEach((element) => {
        const isCoveredByTreeScan = roots.some((root) => root === document || root === element || root.contains?.(element))
        if (!isCoveredByTreeScan && element.isConnected) enhanceElement(element)
      })
    })
  }

  const scheduleScan = (root = appRoot) => {
    addScanRoot(root)
    flushScans()
  }

  // Attribute changes and child removals only affect the element itself. The
  // old path scanned every descendant as well, even when a list container had
  // hundreds of unchanged glass surfaces. Keep the exact enhancement result
  // while avoiding those redundant style/layout reads.
  const scheduleElementScan = (element) => {
    if (!(element instanceof HTMLElement) || element.closest('.dynamic-elements')) return
    if ([...pendingScanRoots].some((root) => root === document || root === element || root.contains?.(element))) return

    for (const pendingElement of pendingElementScans) {
      if (pendingElement === element || pendingElement.contains?.(element)) return
      if (element.contains?.(pendingElement)) pendingElementScans.delete(pendingElement)
    }

    pendingElementScans.add(element)
    flushScans()
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      const target = mutation.target
      if (!(target instanceof HTMLElement) || target.closest('.dynamic-elements')) return

      if (mutation.type === 'attributes') {
        if (mutation.attributeName === 'class' && hasOnlyInternalClassChanges(target, mutation.oldValue)) return
        scheduleElementScan(target)
        return
      }

      const isInternalOpticsNode = (node) => (
        node instanceof HTMLElement && node.classList.contains('liquid-glass-optics')
      )
      const addedNodes = [...mutation.addedNodes].filter((node) => !isInternalOpticsNode(node))
      const hasRelevantRemoval = [...mutation.removedNodes].some((node) => !isInternalOpticsNode(node))
      if (!addedNodes.length && !hasRelevantRemoval) return

      // Re-evaluate the parent because adding/removing text or controls can turn
      // a structural element into (or out of) an eligible glass surface.
      scheduleElementScan(target)
      addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) scheduleScan(node)
      })
    })
  })

  observer.observe(appRoot, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'disabled', 'aria-pressed', 'aria-selected'],
    attributeOldValue: true
  })

  const applyPointer = () => {
    pointerFrame = null
    if (!activeSurface || !pendingPointer) return
    if (!activeSurfaceRect || pointerGeometryDirty) {
      activeSurfaceRect = activeSurface.getBoundingClientRect()
      pointerGeometryDirty = false
    }
    const rect = activeSurfaceRect
    const x = Math.min(100, Math.max(0, ((pendingPointer.x - rect.left) / Math.max(1, rect.width)) * 100))
    const y = Math.min(100, Math.max(0, ((pendingPointer.y - rect.top) / Math.max(1, rect.height)) * 100))
    activeSurface.style.setProperty('--liquid-x', `${x}%`)
    activeSurface.style.setProperty('--liquid-y', `${y}%`)
    activeSurface.style.setProperty('--liquid-angle', `${118 + (x - 50) * 0.38}deg`)
  }

  const clearActiveSurface = () => {
    if (activeSurface) {
      activeSurface.classList.remove('is-liquid-hovered')
      activeSurface.style.removeProperty('--liquid-x')
      activeSurface.style.removeProperty('--liquid-y')
      activeSurface.style.removeProperty('--liquid-angle')
    }
    activeSurface = null
    activeSurfaceRect = null
    pendingPointer = null
  }

  const setActiveSurface = (surface) => {
    if (surface === activeSurface) return
    clearActiveSurface()
    activeSurface = surface
    activeSurfaceRect = surface.getBoundingClientRect()
    activeSurface.classList.add('is-liquid-hovered')
    pointerGeometryDirty = false
  }

  const handlePointerMove = (event) => {
    const surface = event.target.closest?.('[data-liquid-glass]')
    if (!surface) {
      clearActiveSurface()
      return
    }
    setActiveSurface(surface)
    pendingPointer = { x: event.clientX, y: event.clientY }
    if (!pointerFrame) pointerFrame = window.requestAnimationFrame(applyPointer)
  }

  const handlePointerOut = (event) => {
    if (!event.relatedTarget) clearActiveSurface()
  }

  const handlePointerDown = (event) => {
    const control = event.target.closest?.('[data-liquid-glass="control"]')
    if (!control) return
    control.classList.add('is-liquid-pressed')
    pressedControls.add(control)
  }
  const clearPressed = () => {
    pressedControls.forEach((element) => element.classList.remove('is-liquid-pressed'))
    pressedControls.clear()
  }
  const invalidatePointerGeometry = () => {
    pointerGeometryDirty = true
  }

  document.addEventListener('pointermove', handlePointerMove, { passive: true })
  document.addEventListener('pointerout', handlePointerOut, { passive: true })
  document.addEventListener('pointerdown', handlePointerDown, { passive: true })
  document.addEventListener('pointerup', clearPressed, { passive: true })
  document.addEventListener('pointercancel', clearPressed, { passive: true })
  window.addEventListener('resize', invalidatePointerGeometry, { passive: true })
  window.addEventListener('scroll', invalidatePointerGeometry, { passive: true, capture: true })

  const queueStableScans = () => {
    scanTimers.forEach((timer) => window.clearTimeout(timer))
    scanTimers.clear()
    scheduleScan()
    // One delayed safety pass covers async view content and late CSS without
    // repeatedly rescanning the entire application after every navigation.
    ;[320].forEach((delay) => {
      const timer = window.setTimeout(() => {
        scanTimers.delete(timer)
        scheduleScan()
      }, delay)
      scanTimers.add(timer)
    })
  }

  const removeRouteHook = router?.afterEach(queueStableScans)
  queueStableScans()

  return () => {
    observer.disconnect()
    removeRouteHook?.()
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerout', handlePointerOut)
    document.removeEventListener('pointerdown', handlePointerDown)
    document.removeEventListener('pointerup', clearPressed)
    document.removeEventListener('pointercancel', clearPressed)
    window.removeEventListener('resize', invalidatePointerGeometry)
    window.removeEventListener('scroll', invalidatePointerGeometry, { capture: true })
    if (scanFrame) window.cancelAnimationFrame(scanFrame)
    if (pointerFrame) window.cancelAnimationFrame(pointerFrame)
    pendingScanRoots.clear()
    pendingElementScans.clear()
    clearActiveSurface()
    clearPressed()
    scanTimers.forEach((timer) => window.clearTimeout(timer))
    scanTimers.clear()
    delete document.documentElement.dataset.liquidGlassInstalled
  }
}
