<template>
  <section id="poem-text-area" class="poem-content-card glass-card">
    <div class="poem-lines">
      <p v-for="(line, index) in lines" :key="index" class="poem-line">
        <template v-for="(char, charIndex) in line" :key="charIndex">
          <span :class="/[一-鿿]/.test(char) ? 'poem-char' : 'poem-punctuation'">{{ char }}</span>
        </template>
      </p>
    </div>
    <div class="read-controls">
      <button v-if="speechState === 'idle' || speechState === 'error'" class="primary-pill" type="button" @click="$emit('play')">
        <SpeakerHigh :size="19" /> 朗读播放
      </button>
      <template v-else>
        <button v-if="speechState !== 'paused'" class="primary-pill" type="button" @click="$emit('pause')"><Pause :size="18" /> 暂停</button>
        <button v-else class="primary-pill" type="button" @click="$emit('resume')"><Play :size="18" /> 继续</button>
        <button class="soft-button" type="button" @click="$emit('replay')"><ArrowCounterClockwise :size="18" /> 重播</button>
        <button class="soft-button" type="button" @click="$emit('stop')"><Stop :size="18" /> 停止</button>
      </template>
    </div>
  </section>
</template>

<script setup>
import { PhArrowCounterClockwise as ArrowCounterClockwise, PhPause as Pause, PhPlay as Play, PhSpeakerHigh as SpeakerHigh, PhStop as Stop } from '@phosphor-icons/vue'
defineProps({ lines: { type: Array, default: () => [] }, speechState: { type: String, default: 'idle' } })
defineEmits(['play', 'pause', 'resume', 'replay', 'stop'])
</script>

<style scoped>
.poem-content-card{display:grid;place-items:center;min-height:236px;padding:30px 30px 22px}.poem-lines{width:min(860px,100%);text-align:center}.poem-line{margin:0;color:var(--pd-ink);font:500 clamp(28px,1.82vw,35px)/1.72 'Noto Serif SC','Songti SC',serif;letter-spacing:.22em}.poem-char{cursor:text}.poem-char::selection{background:rgba(45,112,104,.25)}.poem-punctuation{letter-spacing:.08em}.read-controls{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:18px}.read-controls :deep(button){min-height:40px;padding-inline:20px}@media(max-width:760px){.poem-content-card{padding:28px 17px}.poem-line{font-size:22px;letter-spacing:.11em}}
.poem-line{color:#173331!important;text-shadow:0 1px 0 rgba(255,255,255,.45)}
</style>
