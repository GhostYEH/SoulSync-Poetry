let canvas
let context
let width = 1
let height = 1
let visited = new Uint32Array(1)
let queue = new Int32Array(1)
let generation = 0

function resize(nextWidth, nextHeight) {
  width = Math.max(1, Math.round(nextWidth || 1))
  height = Math.max(1, Math.round(nextHeight || 1))
  canvas.width = width
  canvas.height = height

  const pixelCount = width * height
  if (visited.length !== pixelCount) {
    visited = new Uint32Array(pixelCount)
    queue = new Int32Array(pixelCount)
    generation = 0
  }
}

function nextGeneration() {
  generation += 1
  if (generation === 0xffffffff) {
    visited.fill(0)
    generation = 1
  }
  return generation
}

function render(bitmap) {
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const frame = context.getImageData(0, 0, width, height)
  const pixels = frame.data
  const currentGeneration = nextGeneration()
  let head = 0
  let tail = 0
  const baseR = pixels[0]
  const baseG = pixels[1]
  const baseB = pixels[2]

  const enqueue = (index) => {
    if (index < 0 || index >= visited.length || visited[index] === currentGeneration) return
    const offset = index * 4
    const distance = Math.abs(pixels[offset] - baseR)
      + Math.abs(pixels[offset + 1] - baseG)
      + Math.abs(pixels[offset + 2] - baseB)
    if (distance > 72) return
    visited[index] = currentGeneration
    queue[tail++] = index
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x)
    enqueue((height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width)
    enqueue(y * width + width - 1)
  }

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
}

self.onmessage = ({ data }) => {
  if (data.type === 'init') {
    canvas = data.canvas
    context = canvas.getContext('2d', { alpha: true, willReadFrequently: true })
    resize(data.width, data.height)
    self.postMessage({ type: 'ready' })
    return
  }

  if (data.type === 'resize') {
    resize(data.width, data.height)
    return
  }

  if (data.type === 'frame' && context) {
    try {
      render(data.bitmap)
    } finally {
      self.postMessage({ type: 'ready' })
    }
  }
}
