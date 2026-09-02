const ACTIVE_EVENT = 'app-motion-activity'
const IDLE_CLASS = 'motion-idle'
const DEFAULT_IDLE_DELAY = 1400
const INITIAL_ACTIVE_DELAY = 2200

/**
 * Keep decorative motion alive only while the user is interacting.
 * CSS animations preserve their current frame while paused and resume from the
 * same frame, so the visual design is unchanged without paying an idle render cost.
 */
export function installMotionActivity() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}

  const root = document.documentElement
  let idleTimer = null
  let lastActivityAt = performance.now()
  let isActive = true

  const publish = (active) => {
    if (isActive === active) return
    isActive = active
    root.classList.toggle(IDLE_CLASS, !active)
    window.dispatchEvent(new CustomEvent(ACTIVE_EVENT, { detail: { active } }))
  }

  const scheduleIdleCheck = (delay = DEFAULT_IDLE_DELAY) => {
    if (idleTimer !== null) return
    idleTimer = window.setTimeout(() => {
      idleTimer = null
      const remaining = DEFAULT_IDLE_DELAY - (performance.now() - lastActivityAt)
      if (remaining > 0) {
        scheduleIdleCheck(remaining)
        return
      }
      publish(false)
    }, delay)
  }

  const signalActivity = () => {
    lastActivityAt = performance.now()
    publish(true)
    scheduleIdleCheck()
  }

  const handleVisibility = () => {
    if (document.hidden) {
      if (idleTimer !== null) window.clearTimeout(idleTimer)
      idleTimer = null
      publish(false)
      return
    }
    signalActivity()
  }

  const activityEvents = ['pointermove', 'pointerdown', 'wheel', 'touchmove', 'keydown', 'scroll']
  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, signalActivity, { passive: true, capture: eventName === 'scroll' })
  })
  document.addEventListener('visibilitychange', handleVisibility)
  root.classList.remove(IDLE_CLASS)
  scheduleIdleCheck(INITIAL_ACTIVE_DELAY)

  return () => {
    if (idleTimer !== null) window.clearTimeout(idleTimer)
    activityEvents.forEach((eventName) => {
      window.removeEventListener(eventName, signalActivity, { capture: eventName === 'scroll' })
    })
    document.removeEventListener('visibilitychange', handleVisibility)
    root.classList.remove(IDLE_CLASS)
  }
}

export { ACTIVE_EVENT }
