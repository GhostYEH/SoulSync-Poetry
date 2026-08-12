<template>
  <div class="knowledge-profile">
    <div class="kp-header">
      <h2>🧠 知识掌握画像</h2>
      <span class="kp-hint">点击各维度查看掌握度计算依据</span>
    </div>

    <div v-if="loading" class="kp-state">
      <div class="kp-spinner"></div>
      <p>加载知识画像…</p>
    </div>

    <div v-else-if="error" class="kp-state err">
      <p>{{ error }}</p>
    </div>

    <div v-else class="kp-body">
      <!-- 雷达图 + 统计 -->
      <div class="kp-top">
        <div ref="radarRef" class="kp-radar"></div>
        <div class="kp-stats">
          <div class="stat-item">
            <span class="si-label">学习诗词</span>
            <span class="si-value">{{ profile.stats?.learnedPoems || 0 }} 首</span>
          </div>
          <div class="stat-item">
            <span class="si-label">背诵均分</span>
            <span class="si-value">{{ profile.stats?.avgReciteScore ?? '—' }}</span>
          </div>
          <div class="stat-item">
            <span class="si-label">背诵次数</span>
            <span class="si-value">{{ profile.stats?.totalRecites || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="si-label">错题总数</span>
            <span class="si-value">{{ profile.stats?.totalWrongQuestions || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- 维度列表（可展开） -->
      <div class="dim-list">
        <div
          v-for="d in profile.dimensions"
          :key="d.key"
          class="dim-row"
          :class="masteryClass(d.mastery)"
        >
          <div class="dim-row-head" @click="toggle(d.key)">
            <span class="dr-icon">{{ d.icon }}</span>
            <span class="dr-label">{{ d.label }}</span>
            <div class="dr-bar" v-if="d.mastery !== null">
              <div class="dr-fill" :style="{ width: d.mastery + '%' }"></div>
            </div>
            <span class="dr-value" v-if="d.mastery !== null">{{ d.mastery }}</span>
            <span class="dr-value na" v-else>无数据</span>
            <span class="dr-count" v-if="d.count > 0">（{{ d.count }} 题）</span>
            <span class="dr-arrow" :class="{ open: expanded === d.key }">▾</span>
          </div>

          <!-- 展开详情：可解释依据 -->
          <div class="dim-detail" v-if="expanded === d.key">
            <div class="explain-box">
              <h4>掌握度依据</h4>
              <p class="formula" v-if="d.formula">
                计算公式：<code>{{ d.formula }}</code>
              </p>
              <p class="formula" v-else-if="d.mastery !== null">
                计算公式：<code>加权正确率 × 难度权重，EWMA 融合近期表现</code>
              </p>
              <p class="formula" v-else>
                该维度暂无答题记录，无法计算掌握度。
              </p>

              <div v-if="d.reciteAvg !== null && d.reciteAvg !== undefined" class="recite-info">
                背诵均分：<b>{{ d.reciteAvg }}</b>（已融合进原文记忆维度）
              </div>

              <div v-if="d.evidence && d.evidence.length > 0" class="evidence-list">
                <table class="ev-table">
                  <thead>
                    <tr>
                      <th>题目</th>
                      <th>正确性</th>
                      <th>难度</th>
                      <th>错/对</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(e, i) in d.evidence" :key="i">
                      <td class="ev-q">{{ e.question }}</td>
                      <td>{{ (e.correctness * 100).toFixed(0) }}%</td>
                      <td>第 {{ e.difficulty }} 关</td>
                      <td>
                        <span class="ev-wrong">{{ e.wrongCount }}错</span> /
                        <span class="ev-right">{{ e.correctStreak }}连对</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 薄弱维度提示 -->
      <div class="weak-tip" v-if="profile.weakDimensions && profile.weakDimensions.length > 0">
        <h3>⚠️ 薄弱维度</h3>
        <div class="weak-tags">
          <span v-for="w in profile.weakDimensions" :key="w.key" class="weak-tag">
            {{ w.icon }} {{ w.label }}（{{ w.mastery }}）
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { fetchStudentProfile } from '../../../services/teacher/knowledge'

const props = defineProps({
  userId: { type: [Number, String], required: true },
})

const loading = ref(true)
const error = ref(null)
const profile = ref({ dimensions: [], weakDimensions: [], stats: {} })
const expanded = ref(null)
const radarRef = ref(null)
let radarChart = null

function masteryClass(m) {
  if (m === null || m === undefined) return 'na'
  if (m >= 80) return 'strong'
  if (m >= 60) return 'medium'
  if (m >= 40) return 'weak'
  return 'poor'
}

function toggle(key) {
  expanded.value = expanded.value === key ? null : key
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await fetchStudentProfile(props.userId)
    profile.value = res.data || { dimensions: [], weakDimensions: [], stats: {} }
    await nextTick()
    renderRadar()
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function renderRadar() {
  if (!radarRef.value) return
  if (radarChart) radarChart.dispose()
  radarChart = echarts.init(radarRef.value)
  const dims = profile.value.dimensions || []
  const indicator = dims.map(d => ({ name: d.label, max: 100 }))
  const values = dims.map(d => d.mastery ?? 0)
  radarChart.setOption({
    tooltip: { trigger: 'item' },
    radar: {
      indicator,
      radius: '62%',
      axisName: { color: '#5c4033', fontSize: 12 },
      splitLine: { lineStyle: { color: 'rgba(139,69,19,0.12)' } },
      splitArea: { areaStyle: { color: ['rgba(205,133,63,0.02)', 'rgba(205,133,63,0.05)'] } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: values,
        areaStyle: { color: 'rgba(205,133,63,0.25)' },
        lineStyle: { color: '#8b4513', width: 2 },
        itemStyle: { color: '#8b4513' },
      }],
    }],
  })
}

function handleResize() { radarChart?.resize() }

onMounted(async () => {
  await load()
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  radarChart?.dispose()
})
watch(() => props.userId, () => load())
</script>

<style scoped>
.knowledge-profile {
  --brown: #8b4513;
  --brown-light: #cd853f;
  --text: #5c4033;
  --border: rgba(205, 133, 63, 0.2);
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 3px 14px rgba(139, 69, 19, 0.08);
}
.kp-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 18px;
}
.kp-header h2 {
  font-family: 'SimSun', 'STSong', serif;
  color: var(--brown);
  font-size: 20px;
  margin: 0;
}
.kp-hint { color: #aaa; font-size: 13px; }

.kp-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  gap: 12px;
  color: #888;
}
.kp-state.err { color: #d9534f; }
.kp-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(139, 69, 19, 0.15);
  border-top: 3px solid var(--brown);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.kp-top {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.kp-radar { width: 320px; height: 280px; flex-shrink: 0; }
.kp-stats {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 14px;
  align-content: center;
}
.stat-item {
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: 10px;
  background: rgba(205, 133, 63, 0.06);
  border: 1px solid var(--border);
}
.si-label { font-size: 13px; color: #888; }
.si-value {
  font-size: 22px;
  font-weight: bold;
  color: var(--brown);
  font-family: 'SimSun', 'STSong', serif;
}

/* 维度行 */
.dim-list { display: flex; flex-direction: column; gap: 8px; }
.dim-row {
  border-radius: 10px;
  border: 1px solid var(--border);
  overflow: hidden;
  transition: all 0.2s;
}
.dim-row.strong { border-left: 4px solid #2e8b57; }
.dim-row.medium { border-left: 4px solid #5cb85c; }
.dim-row.weak { border-left: 4px solid #f0ad4e; }
.dim-row.poor { border-left: 4px solid #d9534f; }
.dim-row.na { border-left: 4px solid #ccc; }
.dim-row-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
}
.dim-row-head:hover { background: rgba(205, 133, 63, 0.05); }
.dr-icon { font-size: 20px; }
.dr-label { font-size: 15px; color: var(--text); min-width: 90px; }
.dr-bar {
  flex: 1;
  height: 8px;
  background: rgba(205, 133, 63, 0.12);
  border-radius: 4px;
  overflow: hidden;
  max-width: 300px;
}
.dr-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brown-light), var(--brown));
  border-radius: 4px;
  transition: width 0.4s;
}
.dr-value {
  font-size: 18px;
  font-weight: bold;
  color: var(--brown);
  min-width: 36px;
  text-align: right;
}
.dr-value.na { font-size: 13px; color: #bbb; font-weight: normal; }
.dr-count { font-size: 12px; color: #aaa; }
.dr-arrow {
  color: #aaa;
  transition: transform 0.2s;
  font-size: 12px;
}
.dr-arrow.open { transform: rotate(180deg); }

/* 展开详情 */
.dim-detail { padding: 0 16px 16px; }
.explain-box {
  background: rgba(205, 133, 63, 0.04);
  border-radius: 8px;
  padding: 14px 16px;
}
.explain-box h4 {
  color: var(--brown);
  margin: 0 0 8px;
  font-size: 15px;
}
.formula { font-size: 13px; color: #666; margin: 4px 0; }
.formula code {
  background: rgba(139, 69, 19, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--brown);
}
.recite-info {
  margin: 8px 0;
  font-size: 13px;
  color: #666;
}
.recite-info b { color: var(--brown); }

.ev-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.ev-table th {
  text-align: left;
  padding: 8px;
  color: var(--brown);
  font-size: 12px;
  border-bottom: 1px solid var(--border);
}
.ev-table td {
  padding: 8px;
  font-size: 13px;
  color: var(--text);
  border-bottom: 1px solid rgba(205, 133, 63, 0.06);
}
.ev-q { max-width: 240px; color: #555; }
.ev-wrong { color: #d9534f; }
.ev-right { color: #5cb85c; }

/* 薄弱提示 */
.weak-tip {
  margin-top: 20px;
  padding: 14px 16px;
  background: rgba(240, 173, 78, 0.08);
  border-radius: 10px;
  border: 1px solid rgba(240, 173, 78, 0.3);
}
.weak-tip h3 {
  color: #d9534f;
  font-size: 15px;
  margin: 0 0 10px;
}
.weak-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.weak-tag {
  padding: 4px 12px;
  border-radius: 12px;
  background: rgba(217, 83, 79, 0.12);
  color: #d9534f;
  font-size: 13px;
}

@media (max-width: 768px) {
  .kp-radar { width: 100%; height: 240px; }
  .dr-label { min-width: 70px; }
  .ev-q { max-width: 120px; }
}
</style>