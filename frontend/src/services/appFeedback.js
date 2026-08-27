import { reactive } from 'vue'

export const feedbackState = reactive({
  toasts: [],
  dialog: null
})

let toastId = 0
const dialogQueue = []

export function notify(message, type = 'info', duration = 3200) {
  const text = String(message || '').trim()
  if (!text) return

  const id = ++toastId
  feedbackState.toasts.push({ id, message: text, type })

  window.setTimeout(() => dismissToast(id), duration)
}

export function dismissToast(id) {
  const index = feedbackState.toasts.findIndex(toast => toast.id === id)
  if (index !== -1) feedbackState.toasts.splice(index, 1)
}

export function askConfirm(message, options = {}) {
  return new Promise(resolve => {
    dialogQueue.push({
      message: String(message || ''),
      title: options.title || '请确认',
      confirmText: options.confirmText || '确认',
      cancelText: options.cancelText || '取消',
      danger: Boolean(options.danger),
      resolve
    })
    showNextDialog()
  })
}

export function resolveDialog(confirmed) {
  const current = feedbackState.dialog
  if (!current) return

  feedbackState.dialog = null
  current.resolve(Boolean(confirmed))
  window.setTimeout(showNextDialog, 0)
}

function showNextDialog() {
  if (!feedbackState.dialog && dialogQueue.length) {
    feedbackState.dialog = dialogQueue.shift()
  }
}
