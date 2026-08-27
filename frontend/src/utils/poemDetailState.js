export function canRenderPoemContent({ loading, poem, isImmersiveMode }) {
  return !loading && Boolean(poem) && Boolean(isImmersiveMode)
}
