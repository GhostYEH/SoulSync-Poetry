export function clearRouteTransitionStyles(element) {
  if (!element?.style) return

  element.style.removeProperty('transform')
  element.style.removeProperty('opacity')
  element.style.removeProperty('visibility')
}
