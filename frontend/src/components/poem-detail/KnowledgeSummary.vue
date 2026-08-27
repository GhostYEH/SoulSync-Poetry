<template>
  <section class="knowledge-summary glass-card">
    <header><LightbulbFilament :size="27" weight="duotone" /><strong>知识点小结</strong></header>
    <div class="knowledge-items">
      <div v-for="item in items" :key="item.label" class="knowledge-item"><span>{{ item.label }}</span><p>{{ item.value }}</p></div>
    </div>
    <aside class="knowledge-companion" aria-label="数字人讲解入口">
      <div><span>需要我为你</span><strong>讲解这首诗吗？</strong><button type="button" @click="$emit('explain')"><span>开始讲解</span><ArrowRight :size="14" /></button></div>
      <img src="../../assets/poem-detail/study-companion.png" alt="古风数字人助手">
    </aside>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { PhArrowRight as ArrowRight, PhLightbulbFilament as LightbulbFilament } from '@phosphor-icons/vue'
const props = defineProps({ poem: { type: Object, required: true } })
defineEmits(['explain'])
const tags = computed(() => Array.isArray(props.poem.tags) ? props.poem.tags : String(props.poem.tags || '').split(',').filter(Boolean))
const items = computed(() => [
  { label: '体裁', value: props.poem.genre || (/词牌|词/.test(props.poem.type || '') ? '词' : '古诗') },
  { label: '主题', value: props.poem.theme || tags.value[0] || '古典意境' },
  { label: '意象', value: props.poem.imagery || tags.value.slice(1, 4).join('、') || '山水、风月' },
  { label: '情感', value: props.poem.emotion || '含蓄深远' },
  { label: '写作手法', value: props.poem.technique || '借景抒情、情景交融' }
])
</script>

<style scoped>
.knowledge-summary{position:relative;display:grid;grid-template-columns:1fr;min-height:142px;padding:10px 278px 10px 20px;overflow:hidden}.knowledge-summary header{display:flex;align-items:center;gap:10px;color:var(--pd-jade)}.knowledge-summary header strong{color:var(--pd-ink);font:600 21px 'Noto Serif SC','Songti SC',serif}.knowledge-items{display:grid;grid-template-columns:110px 1.35fr .85fr 1.15fr 1.1fr;gap:18px;margin-top:8px}.knowledge-item{min-width:0;padding:10px 18px;border:1px solid rgba(255,255,255,.58);border-radius:16px;background:rgba(250,252,250,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.64)}.knowledge-item span{color:var(--pd-ink);font:600 15px 'Noto Serif SC','Songti SC',serif}.knowledge-item p{margin:6px 0 0;color:var(--pd-muted);font-size:13px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.knowledge-companion{position:absolute;right:0;bottom:0;display:grid;grid-template-columns:130px 112px;align-items:end;width:258px;height:132px;padding:13px 4px 8px 14px;border-left:1px solid rgba(255,255,255,.56);background:rgba(250,252,251,.28)}.knowledge-companion>div{position:relative;z-index:2;display:grid;align-self:center;gap:4px}.knowledge-companion span,.knowledge-companion strong{color:var(--pd-ink);font-size:12px}.knowledge-companion strong{font:600 13px 'Noto Serif SC','Songti SC',serif}.knowledge-companion button{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:max-content;min-height:32px;margin-top:4px;padding:6px 8px 6px 14px;border:0;border-radius:999px;background:#24786f;color:#fff;font-size:12px;font-weight:600}.knowledge-companion button svg{display:grid;width:22px;height:22px;padding:4px;border-radius:50%;background:#fff;color:#24786f}.knowledge-companion img{position:absolute;right:-4px;bottom:-35px;width:124px;height:150px;object-fit:contain;filter:drop-shadow(0 8px 16px rgba(23,62,56,.16))}@media(max-width:1000px){.knowledge-summary{padding-right:20px;padding-bottom:145px}.knowledge-items{grid-template-columns:repeat(2,1fr)}.knowledge-companion{left:50%;right:auto;transform:translateX(-50%)}}@media(max-width:620px){.knowledge-items{grid-template-columns:1fr}.knowledge-item p{white-space:normal}}
</style>
