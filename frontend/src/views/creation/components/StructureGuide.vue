<template>
  <div class="structure-guide">
    <div class="panel-header">
      <div class="header-icon">结构</div>
      <div class="header-text"><h2>结构引导</h2><p>AI 会根据你的主题、体裁和意象生成这一首诗专属的写作骨架</p></div>
    </div>

    <div v-if="localLoading" class="state-card loading-state" aria-live="polite">
      <div class="loading-spinner-large"></div><strong>AI 正在拆解你的创作意图</strong><p>正在生成每一句的任务和真实参考范例，请稍候。</p>
    </div>
    <div v-else-if="error" class="state-card error-state" role="alert">
      <strong>结构引导暂时没有生成</strong><p>{{ error }}</p><button class="load-btn" type="button" @click="loadStructure">重新请求 AI</button>
    </div>

    <div v-else-if="structure" class="structure-info">
      <div class="structure-header-card">
        <div class="structure-title"><h3>{{ structure.name || genre }}</h3><span class="structure-badge" v-if="structure.lines && structure.charactersPerLine">{{ structure.lines }}句 × {{ structure.charactersPerLine }}字</span><span class="structure-badge" v-else>按词牌创作</span></div>
        <p class="structure-intro">{{ structure.introduction }}</p>
        <div class="context-line"><span>主题</span><strong>{{ theme }}</strong><span v-if="mood">情绪</span><strong v-if="mood">{{ mood }}</strong></div>
      </div>

      <div class="structure-flow">
        <div class="flow-title"><span class="flow-icon">01</span><h3>逐句任务与参考范例</h3><span class="flow-note">范例只作观察，不会直接写入你的作品</span></div>
        <div v-for="(item, index) in structure.structure" :key="`${index}-${item.position}`" class="structure-item">
          <div class="structure-node"><div class="node-number">{{ index + 1 }}</div><div class="node-content">
            <div class="node-meta"><span class="node-role-badge">{{ item.role || item.position }}</span><span class="node-position">{{ item.position }}</span></div>
            <p class="node-desc">{{ item.description }}</p>
            <div class="node-theme-hint" v-if="item.themeHint"><span class="hint-icon">提示</span><span>{{ item.themeHint }}</span></div>
            <div class="node-example"><span class="example-label">AI 参考范例</span><span class="example-text">“{{ item.example }}”</span></div>
          </div></div>
          <div class="structure-connector" v-if="index < structure.structure.length - 1" aria-hidden="true">↓</div>
        </div>
      </div>

      <div class="keyword-section" v-if="structure.keywordSuggestions?.length"><div class="section-header"><span class="section-icon">02</span><h3>关键词运用</h3></div><div class="keyword-suggestions"><div v-for="item in structure.keywordSuggestions" :key="item.keyword" class="keyword-item"><span class="keyword-tag">{{ item.keyword }}</span><span>{{ item.usage }}</span></div></div></div>
      <div class="tips-section" v-if="structure.tips?.length"><div class="section-header"><span class="section-icon">03</span><h3>写作技巧</h3></div><div class="tips-grid"><div v-for="(tip, index) in structure.tips" :key="index" class="tip-card"><span class="tip-number">{{ index + 1 }}</span><span>{{ tip }}</span></div></div></div>
      <div class="rhyme-section" v-if="structure.rhyme"><div class="section-header"><span class="section-icon">04</span><h3>韵律要求</h3></div><div class="rhyme-content"><p>{{ structure.rhyme }}</p><div class="rhyme-examples" v-if="structure.rhymeExamples?.length"><span v-for="rhyme in structure.rhymeExamples" :key="rhyme" class="rhyme-tag">{{ rhyme }}</span></div></div></div>
      <div class="avoid-section" v-if="structure.avoid?.length"><div class="section-header"><span class="section-icon">05</span><h3>这首诗要避开的坑</h3></div><div class="avoid-list"><div v-for="(item, index) in structure.avoid" :key="index" class="avoid-item"><span class="avoid-icon">!</span><span>{{ item }}</span></div></div></div>
      <div class="action-buttons"><button class="back-btn" type="button" @click="$emit('back')">← 返回灵感</button><button class="start-btn" type="button" @click="$emit('start')">开始创作 <span>→</span></button></div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted } from 'vue';
import { api } from '../../../services/api.js';

const expectedLines = (genre) => genre === '宋词' ? 1 : (genre?.includes('律诗') ? 8 : 4);

function validateStructure(data, genre) {
  if (!data || !Array.isArray(data.structure)) throw new Error('AI 返回的结构列表为空');
  if (data.structure.length < expectedLines(genre)) throw new Error('AI 返回的结构句数不完整');
  const invalid = data.structure.some((item) => {
    const example = String(item?.example || '').trim();
    return !String(item?.description || '').trim() || example.length < 2 || /^(示例|建议|起句|承句|转句|合句|example)/i.test(example);
  });
  if (invalid) throw new Error('AI 返回的参考范例不完整，请重新请求');
  const tips = Array.isArray(data.tips)
    ? data.tips.filter(Boolean).map(String)
    : typeof data.tips === 'string' ? data.tips.split(/[。；;\n]+/).map(item => item.trim()).filter(Boolean) : [];
  if (!tips.length) throw new Error('AI 返回的写作技巧为空');
  const avoid = Array.isArray(data.avoid)
    ? data.avoid.filter(Boolean).map(String)
    : typeof data.avoid === 'string' ? data.avoid.split(/[。；;\n]+/).map(item => item.trim()).filter(Boolean) : [];
  return {
    ...data,
    structure: data.structure.slice(0, expectedLines(genre)),
    tips,
    keywordSuggestions: Array.isArray(data.keywordSuggestions) ? data.keywordSuggestions : [],
    avoid,
    rhymeExamples: Array.isArray(data.rhymeExamples) ? data.rhymeExamples : []
  };
}

export default {
  name: 'StructureGuide',
  props: { genre: { type: String, required: true }, theme: { type: String, default: '' }, keywords: { type: Array, default: () => [] }, mood: { type: String, default: '' } },
  emits: ['load', 'back', 'start'],
  setup(props, { emit }) {
    const structure = ref(null); const localLoading = ref(false); const error = ref(''); let requestSerial = 0;
    const loadStructure = async () => {
      if (!props.genre) return;
      const serial = ++requestSerial; localLoading.value = true; error.value = ''; structure.value = null; emit('load');
      try {
        const response = await api.creationWorkbench.getStructureGuide({ genre: props.genre, theme: props.theme, keywords: props.keywords, mood: props.mood });
        if (serial !== requestSerial) return;
        structure.value = validateStructure(response.data || response, props.genre);
      } catch (requestError) {
        if (serial !== requestSerial) return;
        console.error('获取 AI 结构引导失败:', requestError); error.value = requestError.message || 'AI 服务暂时不可用，请稍后重试';
      } finally { if (serial === requestSerial) localLoading.value = false; }
    };
    watch([() => props.genre, () => props.theme, () => props.keywords, () => props.mood], loadStructure, { deep: true }); onMounted(loadStructure);
    return { structure, localLoading, error, loadStructure };
  }
};
</script>

<style scoped>
.structure-guide{padding:24px;color:#244b48}.panel-header{display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid rgba(36,75,72,.12)}.header-icon{width:56px;height:56px;display:grid;place-items:center;border-radius:16px;background:#e3f0eb;color:#2d8b80;font-weight:700;letter-spacing:.08em}.header-text h2{margin:0 0 5px;color:#244b48;font-size:23px;font-family:'Noto Serif SC',serif}.header-text p{margin:0;color:#73908b;font-size:14px}.state-card{padding:46px 24px;border:1px solid rgba(45,139,128,.15);border-radius:18px;background:rgba(247,252,250,.92);text-align:center}.state-card strong{display:block;margin-bottom:8px;font-size:17px}.state-card p{margin:0 auto 20px;max-width:42em;color:#73908b;line-height:1.7}.error-state{border-color:rgba(183,96,86,.28);color:#7f443d}.loading-spinner-large{width:34px;height:34px;margin:0 auto 16px;border:3px solid rgba(45,139,128,.18);border-top-color:#2d8b80;border-radius:50%;animation:spin .8s linear infinite}.structure-header-card{padding:24px;border-radius:18px;background:linear-gradient(135deg,#f4fbf7,#e9f5f0);border:1px solid rgba(45,139,128,.12)}.structure-title{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.structure-title h3{margin:0;color:#244b48;font-size:21px;font-family:'Noto Serif SC',serif}.structure-badge{padding:6px 11px;border-radius:999px;background:#d5ebe3;color:#2d756c;font-size:12px}.structure-intro{margin:13px 0 0;color:#5d7d77;line-height:1.8}.context-line{display:flex;gap:8px;align-items:center;margin-top:16px;color:#7b9b95;font-size:12px}.context-line strong{margin-right:12px;color:#2d756c;font-size:13px}.structure-flow,.keyword-section,.tips-section,.rhyme-section,.avoid-section{margin-top:20px;padding:20px;border:1px solid rgba(36,75,72,.1);border-radius:18px;background:rgba(255,255,255,.76)}.flow-title,.section-header{display:flex;align-items:center;gap:10px}.flow-title h3,.section-header h3{margin:0;color:#244b48;font-size:16px;font-family:'Noto Serif SC',serif}.flow-icon,.section-icon{display:grid;place-items:center;width:27px;height:27px;border-radius:9px;background:#dbeee8;color:#2d8b80;font-size:10px;font-weight:700}.flow-note{margin-left:auto;color:#8aa49f;font-size:12px}.structure-item{padding-top:18px}.structure-node{display:flex;gap:14px}.node-number{flex:0 0 34px;height:34px;display:grid;place-items:center;border-radius:12px;background:#2d8b80;color:#fff;font-weight:700}.node-content{flex:1;min-width:0}.node-meta{display:flex;align-items:center;gap:9px}.node-role-badge{padding:4px 9px;border-radius:8px;background:#e9f4ef;color:#2d756c;font-size:12px;font-weight:700}.node-position{color:#74918c;font-size:12px}.node-desc{margin:8px 0 0;color:#4f6e69;line-height:1.65}.node-theme-hint{display:flex;gap:8px;margin-top:9px;color:#7b9791;font-size:12px}.hint-icon{color:#b4814c;font-weight:700}.node-example{display:flex;align-items:baseline;gap:9px;margin-top:12px;padding:12px 14px;border-left:3px solid #b9d9cd;border-radius:0 10px 10px 0;background:#f4faf7}.example-label{color:#78958f;font-size:11px}.example-text{color:#2a625c;font-size:18px;font-family:'Noto Serif SC',serif}.structure-connector{padding:7px 0 0 10px;color:#acc4bd;font-size:20px;line-height:1}.keyword-suggestions,.avoid-list{display:grid;gap:10px;margin-top:15px}.keyword-item,.avoid-item{display:flex;align-items:center;gap:10px;color:#607e78;font-size:13px;line-height:1.6}.keyword-tag,.rhyme-tag{padding:5px 9px;border-radius:8px;background:#e8f3ee;color:#2d756c;white-space:nowrap}.tips-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:15px}.tip-card{display:flex;gap:10px;padding:12px;border-radius:12px;background:#f4faf7;color:#5d7974;font-size:13px;line-height:1.6}.tip-number{color:#2d8b80;font-weight:700}.rhyme-content{margin-top:14px;color:#5d7974;line-height:1.7}.rhyme-content p{margin:0}.rhyme-examples{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.avoid-icon{flex:0 0 20px;display:grid;place-items:center;height:20px;border-radius:50%;background:#f6e8e2;color:#b66d5d;font-size:12px;font-weight:700}.action-buttons{display:flex;justify-content:space-between;gap:12px;margin-top:24px}.back-btn,.start-btn,.load-btn{border:0;border-radius:12px;padding:12px 18px;cursor:pointer;font-family:inherit}.back-btn{border:1px solid rgba(45,139,128,.2);background:#fff;color:#528078}.start-btn,.load-btn{background:#2d8b80;color:#fff;box-shadow:0 8px 20px rgba(45,139,128,.18)}.start-btn{display:flex;gap:12px;align-items:center}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:700px){.structure-guide{padding:16px}.flow-note{display:none}.tips-grid{grid-template-columns:1fr}.action-buttons{flex-direction:column-reverse}.back-btn,.start-btn{justify-content:center}}
</style>
