<template>
  <div class="app-toast-region" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="app-toast">
      <button
        v-for="toast in feedbackState.toasts"
        :key="toast.id"
        class="app-toast-item"
        :class="`is-${toast.type}`"
        type="button"
        @click="dismissToast(toast.id)"
      >
        <span class="app-toast-mark" aria-hidden="true">{{ toastMark(toast.type) }}</span>
        <span>{{ toast.message }}</span>
      </button>
    </TransitionGroup>
  </div>

  <Transition name="app-dialog">
    <div
      v-if="feedbackState.dialog"
      class="app-dialog-backdrop"
      @click.self="resolveDialog(false)"
    >
      <section
        class="app-dialog-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby="app-dialog-message"
        @keydown.esc="resolveDialog(false)"
      >
        <span class="app-dialog-seal" aria-hidden="true">问</span>
        <h2 id="app-dialog-title">{{ feedbackState.dialog.title }}</h2>
        <p id="app-dialog-message">{{ feedbackState.dialog.message }}</p>
        <div class="app-dialog-actions">
          <button type="button" class="app-dialog-cancel" @click="resolveDialog(false)">
            {{ feedbackState.dialog.cancelText }}
          </button>
          <button
            ref="confirmButton"
            type="button"
            class="app-dialog-confirm"
            :class="{ 'is-danger': feedbackState.dialog.danger }"
            @click="resolveDialog(true)"
          >
            {{ feedbackState.dialog.confirmText }}
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { dismissToast, feedbackState, resolveDialog } from '../services/appFeedback'

const confirmButton = ref(null)
const toastMark = type => ({ success: '✓', error: '!', warning: '!', info: 'i' }[type] || 'i')

watch(() => feedbackState.dialog, dialog => {
  if (dialog && document.visibilityState === 'visible' && document.hasFocus()) {
    nextTick(() => confirmButton.value?.focus())
  }
})
</script>

<style scoped>
.app-toast-region{position:fixed;z-index:10000;right:24px;top:24px;display:grid;gap:10px;width:min(380px,calc(100vw - 32px));pointer-events:none}.app-toast-item{display:grid;grid-template-columns:26px 1fr;gap:11px;align-items:center;width:100%;padding:13px 16px;border:1px solid rgba(255,255,255,.7);border-radius:14px;color:#254d47;background:rgba(247,250,245,.94);box-shadow:0 16px 42px rgba(25,71,64,.18);backdrop-filter:blur(18px);font:13px/1.6 'Noto Sans SC','Microsoft YaHei',sans-serif;text-align:left;pointer-events:auto;cursor:pointer}.app-toast-mark{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;color:#fff;background:#4f8c80;font-weight:700}.app-toast-item.is-success .app-toast-mark{background:#368b72}.app-toast-item.is-error .app-toast-mark{background:#b45b50}.app-toast-item.is-warning .app-toast-mark{background:#ad7b37}.app-toast-enter-active,.app-toast-leave-active{transition:.24s ease}.app-toast-enter-from,.app-toast-leave-to{opacity:0;transform:translateY(-8px)}.app-dialog-backdrop{position:fixed;z-index:10001;inset:0;display:grid;place-items:center;padding:20px;background:rgba(20,50,45,.34);backdrop-filter:blur(7px)}.app-dialog-card{width:min(430px,100%);padding:28px;border:1px solid rgba(255,255,255,.76);border-radius:20px;color:#244b45;background:linear-gradient(145deg,rgba(251,250,242,.98),rgba(235,245,239,.98));box-shadow:0 28px 80px rgba(18,55,49,.26);text-align:center}.app-dialog-seal{display:grid;place-items:center;width:42px;height:42px;margin:0 auto 14px;border:1px solid rgba(177,124,67,.48);color:#a16248;font:22px 'Noto Serif SC',serif;transform:rotate(-4deg)}.app-dialog-card h2{margin:0;color:#173f39;font:600 22px 'Noto Serif SC','Songti SC',serif}.app-dialog-card p{margin:13px 0 24px;color:#58736d;font-size:14px;line-height:1.75}.app-dialog-actions{display:flex;justify-content:center;gap:12px}.app-dialog-actions button{min-width:108px;padding:10px 18px;border-radius:999px;font:13px 'Noto Sans SC','Microsoft YaHei',sans-serif;cursor:pointer}.app-dialog-cancel{border:1px solid rgba(40,99,88,.25);color:#456c64;background:rgba(255,255,255,.6)}.app-dialog-confirm{border:1px solid transparent;color:#fff;background:#337f70}.app-dialog-confirm.is-danger{background:#a9554b}.app-dialog-actions button:focus-visible{outline:3px solid rgba(51,127,112,.24);outline-offset:2px}.app-dialog-enter-active,.app-dialog-leave-active{transition:opacity .2s ease}.app-dialog-enter-active .app-dialog-card,.app-dialog-leave-active .app-dialog-card{transition:transform .2s ease}.app-dialog-enter-from,.app-dialog-leave-to{opacity:0}.app-dialog-enter-from .app-dialog-card,.app-dialog-leave-to .app-dialog-card{transform:translateY(10px) scale(.98)}@media(max-width:600px){.app-toast-region{right:16px;top:16px}.app-dialog-actions{flex-direction:column-reverse}.app-dialog-actions button{width:100%}}@media(prefers-reduced-motion:reduce){.app-toast-enter-active,.app-toast-leave-active,.app-dialog-enter-active,.app-dialog-leave-active,.app-dialog-enter-active .app-dialog-card,.app-dialog-leave-active .app-dialog-card{transition:none}}
</style>
