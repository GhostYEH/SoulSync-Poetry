<template>
  <section class="learning-overview glass-card">
    <header><ChartDonut :size="22" weight="duotone" /><strong>学习概览</strong></header>
    <div v-for="item in items" :key="item.label" class="overview-item">
      <span class="icon-box"><component :is="item.icon" :size="28" weight="duotone" /></span>
      <div><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
    </div>
    <div class="mastery"><span class="ring" :style="{ '--value': `${mastery * 3.6}deg` }"></span><div><small>我的掌握度</small><strong>{{ mastery }}%</strong></div></div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { PhChartDonut as ChartDonut, PhFeather as Feather, PhHeart as Heart, PhMountains as Mountains, PhStar as Star } from '@phosphor-icons/vue'
const props = defineProps({ poem: { type: Object, required: true }, mastery: { type: Number, default: 72 } })
const tags = computed(() => Array.isArray(props.poem.tags) ? props.poem.tags : String(props.poem.tags || '').split(',').filter(Boolean))
const items = computed(() => [
  { label: '诗歌情感', value: props.poem.emotion || tags.value[1] || '含蓄隽永', icon: Heart },
  { label: '诗歌主题', value: props.poem.theme || tags.value[0] || '诗意人生', icon: Mountains },
  { label: '写作风格', value: props.poem.style || '清新自然', icon: Feather },
  { label: '难度等级', value: props.poem.difficulty || '★★★☆☆', icon: Star }
])
</script>

<style scoped>
.learning-overview{display:grid;grid-template-columns:220px repeat(4,minmax(160px,1fr)) 220px;align-items:center;gap:0;min-height:103px;padding:14px 24px}.learning-overview header{display:flex;align-items:center;gap:12px;color:var(--pd-jade)}.learning-overview header strong{color:var(--pd-ink);font:600 22px 'Noto Serif SC','Songti SC',serif}.overview-item,.mastery{display:flex;align-items:center;gap:14px;min-height:68px;padding:0 22px;border-left:1px solid rgba(42,88,83,.14);color:var(--pd-jade)}.icon-box{display:grid;flex:0 0 58px;width:58px;height:58px;place-items:center;border:1px solid rgba(255,255,255,.7);border-radius:14px;background:rgba(251,253,252,.52);box-shadow:0 7px 18px rgba(28,68,62,.06)}.overview-item div,.mastery div{display:grid;gap:5px}.overview-item span:not(.icon-box),.mastery small{color:var(--pd-muted);font-size:13px}.overview-item strong,.mastery strong{color:var(--pd-ink);font-size:14px;font-weight:500}.ring{width:58px;height:58px;border-radius:50%;background:conic-gradient(var(--pd-jade) var(--value),rgba(54,107,100,.14) 0);mask:radial-gradient(circle 20px,transparent 98%,#000 100%)}@media(max-width:1250px){.learning-overview{grid-template-columns:repeat(3,1fr)}.learning-overview header{grid-column:1/-1;padding-bottom:12px}.overview-item:first-of-type{border-left:0}}@media(max-width:680px){.learning-overview{grid-template-columns:1fr}.overview-item,.mastery{border-left:0;border-top:1px solid rgba(42,88,83,.12);padding-block:10px}}
</style>
