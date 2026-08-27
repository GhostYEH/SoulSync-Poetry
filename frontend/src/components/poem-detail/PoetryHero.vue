<template>
  <section class="poetry-hero glass-card">
    <button class="soft-button back" type="button" @click="$emit('back')">
      <ArrowLeft :size="17" /> 返回
    </button>
    <div class="hero-copy">
      <h1>{{ poem.title }}</h1>
      <p class="author">{{ poem.author }} <span>·</span> {{ poem.dynasty }}</p>
      <div class="tag-row">
        <span v-for="tag in normalizedTags" :key="tag" class="poem-tag">{{ tag }}</span>
      </div>
    </div>
    <button class="soft-button collect" :class="{ active: collected }" type="button" @click="$emit('collect')">
      <Heart :size="19" :weight="collected ? 'fill' : 'regular'" />
      {{ collected ? '已收藏' : '收藏' }}
    </button>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { PhArrowLeft as ArrowLeft, PhHeart as Heart } from '@phosphor-icons/vue'

const props = defineProps({ poem: { type: Object, required: true }, collected: Boolean })
defineEmits(['back', 'collect'])

const normalizedTags = computed(() => {
  const raw = Array.isArray(props.poem.tags) ? props.poem.tags : String(props.poem.tags || '').split(',')
  const tags = raw.map((tag) => tag.trim()).filter(Boolean)
  const fallbacks = [props.poem.theme, props.poem.emotion, props.poem.genre, props.poem.style, '古典诗词', '意境品读', `${props.poem.dynasty || '古代'}诗词`, `${props.poem.title}意境`].filter(Boolean)
  return [...new Set([...tags, ...fallbacks])].slice(0, 4)
})
</script>

<style scoped>
.poetry-hero{position:relative;height:300px;min-height:0;padding:78px 54px 26px;overflow:hidden}.back{position:absolute;left:30px;top:20px}.hero-copy{max-width:82%}.hero-copy h1{margin:0;color:var(--pd-ink);font:500 clamp(58px,4.25vw,78px)/1.04 'Noto Serif SC','Songti SC',serif;letter-spacing:.14em}.author{margin:20px 0 18px;color:var(--pd-ink);font:500 20px/1.35 'Noto Serif SC','Songti SC',serif;letter-spacing:.08em}.author span{margin:0 6px;color:var(--pd-muted)}.tag-row{display:flex;flex-wrap:wrap;gap:10px}.poem-tag{min-height:34px;padding:7px 14px;border:1px solid rgba(44,104,98,.14);border-radius:999px;background:rgba(242,248,246,.56);box-shadow:inset 0 1px 0 rgba(255,255,255,.72);color:#365f5b;font-size:13px}.collect{position:absolute;right:38px;top:82px;min-width:118px}.collect.active{color:#9b4f55}@media(max-width:760px){.poetry-hero{height:auto;min-height:250px;padding:70px 22px 24px}.hero-copy{max-width:100%}.collect{top:18px;right:18px;min-width:auto}.hero-copy h1{font-size:48px}.author{font-size:17px}}
</style>
