<template>
  <div class="knowledge-diagnosis">
    <!-- 页头 -->
    <div class="page-header">
      <div class="title-area">
        <h1>认知诊断</h1>
        <p class="subtitle">从知识维度诊断学生掌握状况，辅助精准教学</p>
      </div>
      <div class="header-actions">
        <select v-model="selectedClass" class="class-select" @change="loadAll">
          <option value="">全部学生</option>
          <option v-for="c in classes" :key="c.class_id" :value="c.class_id">
            {{ c.class_name || `班级 ${c.class_id}` }}
          </option>
        </select>
      </div>
    </div>

    <!-- 加载 -->
    <div v-if="loading" class="state-box">
      <div class="spinner"></div>
      <p>正在分析知识掌握数据…</p>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" class="state-box error">
      <p>{{ error }}</p>
      <button class="btn-retry" @click="loadAll">重试</button>
    </div>

    <!-- 主体 -->
    <div v-else class="content">
      <!-- 教学建议 -->
      <div class="suggestion-card" :class="`level-${suggestion.level}`" v-if="suggestion">
        <div class="suggestion-icon">
          <span v-if="suggestion.level === 'urgent'">⚠️</span>
          <span v-else-if="suggestion.level === 'attention'">🎯</span>
          <span v-else>✅</span>
        </div>
        <div class="suggestion-body">
          <h3>教学建议</h3>
          <p v-if="suggestion.focusLabel">
            重点维度：<b>{{ suggestion.focusLabel }}</b>
          </p>
          <p>{{ suggestion.message }}</p>
        </div>
      </div>

      <!-- 班级知识掌握雷达图 -->
      <section class="panel">
        <div class="panel-head">
          <h2>📊 班级知识掌握概览</h2>
          <span class="hint">8 个知识维度的平均掌握度（0–100）</span>
        </div>
        <div ref="radarRef" class="chart-box" style="height: 380px;"></div>
        <div class="dimension-grid">
          <div
            v-for="d in overview"
            :key="d.key"
            class="dim-card"
            :class="masteryClass(d.avgMastery)"
          >
            <span class="dim-icon">{{ d.icon }}</span>
            <div class="dim-info">
              <span class="dim-label">{{ d.label }}</span>
              <span class="dim-value" v-if="d.avgMastery !== null">{{ d.avgMastery }}</span>
              <span class="dim-value na" v-else>暂无数据</span>
            </div>
            <span class="dim-count" v-if="d.totalQuestions > 0">{{ d.totalQuestions }} 题</span>
          </div>
        </div>
      </section>

      <!-- 学生×知识维度热力图 -->
      <section class="panel">
        <div class="panel-head">
          <h2>🔥 学生知识掌握热力图</h2>
          <span class="hint">每行一名学生，每列一个知识维度，颜色越深掌握越好</span>
        </div>
        <div ref="heatmapRef" class="chart-box" style="height: 500px;"></div>
        <div class="legend">
          <span class="legend-item"><i class="lc strong"></i> ≥80 掌握</span>
          <span class="legend-item"><i class="lc medium"></i> 60–79 基本掌握</span>
          <span class="legend-item"><i class="lc weak"></i> 40–59 偏弱</span>
          <span class="legend-item"><i class="lc poor"></i> &lt;40 薄弱</span>
          <span class="legend-item"><i class="lc none"></i> 无数据</span>
        </div>
      </section>

      <!-- 高频薄弱知识点 -->
      <section class="panel">
        <div class="panel-head">
          <h2>❗ 高频薄弱知识点</h2>
          <span class="hint">按错误频次排序，定位班级共性难点</span>
        </div>
        <div class="weak-dimensions">
          <div
            v-for="d in weakSummary"
            :key="d.key"
            class="weak-dim"
            :class="{ active: activeWeakDim === d.key }"
            @click="activeWeakDim = d.key"
          >
            <span class="wd-icon">{{ d.icon }}</span>
            <span class="wd-label">{{ d.label }}</span>
            <span class="wd-count">{{ d.errorCount }} 次错误</span>
          </div>
        </div>
        <div class="weak-questions">
          <table class="wq-table">
            <thead>
              <tr>
                <th>题目</th>
                <th>出处</th>
                <th>难度</th>
                <th>错误频次</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(q, i) in activeWeakQuestions" :key="i">
                <td class="q-text">{{ q.question }}</td>
                <td class="q-src">{{ q.title ? `${q.title} · ${q.author || ''}` : '—' }}</td>
                <td>第 {{ q.level || 1 }} 关</td>
                <td><span class="freq-badge">{{ q.errorFreq }}</span></td>
                <td>
                  <span :class="q.mastered ? 'tag-ok' : 'tag-err'">
                    {{ q.mastered ? '已攻克' : '未攻克' }}
                  </span>
                </td>
              </tr>
              <tr v-if="activeWeakQuestions.length === 0">
                <td colspan="5" class="empty-row">该维度暂无错题记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import {
  fetchOverview,
  fetchHeatmap,
  fetchWeakPoints,
} from '../../services/teacher/knowledge'

const router = useRouter()
const loading = ref(true)
const error = ref(null)
const classes = ref([])
const selectedClass = ref('')
const overview = ref([])
const heatmap = ref({ dimensions: [], students: [] })
const weakSummary = ref([])
const weakByDim = ref({})
const suggestion = ref(null)
const activeWeakDim = ref('')

const radarRef = ref(null)
const heatmapRef = ref(null)
let radarChart = null
let heatmapChart = null

const activeWeakQuestions = computed(() => weakByDim.value[activeWeakDim.value] || [])

function masteryClass(m) {
  if (m === null) return 'na'
  if (m >= 80) return 'strong'
  if (m >= 60) return 'medium'
  if (m >= 40) return 'weak'
  return 'poor'
}

async function loadClasses() {
  try {
    const token = localStorage.getItem('teacherToken')
    const resp = await fetch('http://localhost:3000/api/teacher/classes', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await resp.json()
    classes.value = result.data || []
  } catch (e) {
    // 忽略班级加载失败
  }
}

async function loadAll() {
  loading.value = true
  error.value = null
  try {
    const classId = selectedClass.value || null
    const [ov, hm, wp] = await Promise.all([
      fetchOverview(classId),
      fetchHeatmap(classId, 50),
      fetchWeakPoints(classId, 15),
    ])
    overview.value = ov.data || []
    heatmap.value = hm.data || { dimensions: [], students: [] }
    weakSummary.value = (wp.data && wp.data.dimensionSummary) || []
    weakByDim.value = (wp.data && wp.data.byDimension) || {}
    suggestion.value = wp.suggestion || null
    if (weakSummary.value.length > 0) {
      activeWeakDim.value = weakSummary.value[0].key
    }
    await nextTick()
    renderRadar()
    renderHeatmap()
  } catch (e) {
    error.value = e.message || '数据加载失败'
  } finally {
    loading.value = false
  }
}

function renderRadar() {
  if (!radarRef.value) return
  if (radarChart) radarChart.dispose()
  radarChart = echarts.init(radarRef.value)
  const dims = overview.value
  const indicator = dims.map(d => ({ name: d.label, max: 100 }))
  const values = dims.map(d => d.avgMastery ?? 0)
  const hasData = dims.some(d => d.avgMastery !== null)
  radarChart.setOption({
    tooltip: { trigger: 'item' },
    radar: {
      indicator,
      radius: '65%',
      axisName: { color: '#5c4033', fontSize: 13 },
      splitLine: { lineStyle: { color: 'rgba(139,69,19,0.15)' } },
      splitArea: { areaStyle: { color: ['rgba(205,133,63,0.03)', 'rgba(205,133,63,0.06)'] } },
      axisLine: { lineStyle: { color: 'rgba(139,69,19,0.2)' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: values,
        name: '班级平均掌握度',
        areaStyle: { color: 'rgba(205,133,63,0.25)' },
        lineStyle: { color: '#8b4513', width: 2 },
        itemStyle: { color: '#8b4513' },
      }],
    }],
    graphic: hasData ? null : [{
      type: 'text',
      left: 'center',
      top: 'middle',
      style: { text: '暂无掌握度数据', fontSize: 16, fill: '#aaa' },
    }],
  })
}

function renderHeatmap() {
  if (!heatmapRef.value) return
  if (heatmapChart) heatmapChart.dispose()
  heatmapChart = echarts.init(heatmapRef.value)
  const dims = heatmap.value.dimensions || []
  const students = heatmap.value.students || []
  const xLabels = dims.map(d => d.label)
  const yLabels = students.map(s => s.username || `用户${s.userId}`)
  const data = []
  let maxVal = 100
  for (let i = 0; i < students.length; i++) {
    for (let j = 0; j < dims.length; j++) {
      const cell = students[i].dimensions[dims[j].key]
      const v = cell && cell.mastery !== null ? cell.mastery : -1
      data.push([j, i, v])
    }
  }
  heatmapChart.setOption({
    tooltip: {
      position: 'top',
      formatter: (p) => {
        const v = p.value[2]
        const cnt = students[p.value[1]].dimensions[dims[p.value[0]].key]?.count || 0
        return `<b>${yLabels[p.value[1]]}</b><br/>${xLabels[p.value[0]]}: ${v < 0 ? '无数据' : v}<br/>相关题目: ${cnt} 题`
      },
    },
    grid: { left: 100, right: 20, top: 30, bottom: 80 },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: { rotate: 30, color: '#5c4033', fontSize: 12 },
      splitArea: { show: true, areaStyle: { color: ['rgba(205,133,63,0.02)', 'transparent'] } },
    },
    yAxis: {
      type: 'category',
      data: yLabels,
      axisLabel: { color: '#5c4033', fontSize: 12 },
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      inRange: { color: ['#d9534f', '#f0ad4e', '#5cb85c', '#2e8b57'] },
      text: ['掌握', '薄弱'],
      textStyle: { color: '#5c4033' },
    },
    series: [{
      type: 'heatmap',
      data,
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
    }],
  })
}

function handleResize() {
  radarChart?.resize()
  heatmapChart?.resize()
}

onMounted(async () => {
  const token = localStorage.getItem('teacherToken')
  if (!token) {
    router.push('/teacher/login')
    return
  }
  await loadClasses()
  await loadAll()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  radarChart?.dispose()
  heatmapChart?.dispose()
})
</script>

<style scoped>
.knowledge-diagnosis {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  --brown: #8b4513;
  --brown-light: #cd853f;
  --bg: rgba(255, 255, 255, 0.95);
  --border: rgba(205, 133, 63, 0.2);
  --text: #5c4033;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
}
.title-area h1 {
  font-family: 'SimSun', 'STSong', serif;
  color: var(--brown);
  font-size: 28px;
  margin: 0;
}
.subtitle {
  color: #888;
  font-size: 14px;
  margin: 6px 0 0;
}
.class-select {
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  min-width: 160px;
}

.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
  color: #888;
}
.state-box.error { color: #d9534f; }
.spinner {
  width: 44px;
  height: 44px;
  border: 4px solid rgba(139, 69, 19, 0.15);
  border-top: 4px solid var(--brown);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.btn-retry {
  padding: 8px 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  color: var(--brown);
  cursor: pointer;
}

/* 教学建议 */
.suggestion-card {
  display: flex;
  gap: 16px;
  background: var(--bg);
  border-radius: 14px;
  padding: 18px 22px;
  margin-bottom: 24px;
  box-shadow: 0 3px 12px rgba(139, 69, 19, 0.08);
  border-left: 5px solid var(--brown-light);
}
.suggestion-card.level-urgent { border-left-color: #d9534f; }
.suggestion-card.level-attention { border-left-color: #f0ad4e; }
.suggestion-card.level-good { border-left-color: #5cb85c; }
.suggestion-icon { font-size: 28px; }
.suggestion-body h3 {
  font-family: 'SimSun', 'STSong', serif;
  color: var(--brown);
  margin: 0 0 6px;
  font-size: 18px;
}
.suggestion-body p { margin: 4px 0; color: var(--text); line-height: 1.6; }
.suggestion-body b { color: var(--brown); }

/* 面板 */
.panel {
  background: var(--bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 3px 14px rgba(139, 69, 19, 0.08);
}
.panel-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.panel-head h2 {
  font-family: 'SimSun', 'STSong', serif;
  color: var(--brown);
  font-size: 20px;
  margin: 0;
}
.hint { color: #aaa; font-size: 13px; }
.chart-box { width: 100%; }

/* 维度卡片网格 */
.dimension-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  margin-top: 20px;
}
.dim-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid var(--border);
  position: relative;
}
.dim-card.strong { border-color: rgba(46, 139, 87, 0.4); background: rgba(46, 139, 87, 0.06); }
.dim-card.medium { border-color: rgba(92, 184, 92, 0.3); }
.dim-card.weak { border-color: rgba(240, 173, 78, 0.4); background: rgba(240, 173, 78, 0.06); }
.dim-card.poor { border-color: rgba(217, 83, 79, 0.4); background: rgba(217, 83, 79, 0.06); }
.dim-icon { font-size: 24px; }
.dim-info { display: flex; flex-direction: column; }
.dim-label { font-size: 14px; color: var(--text); }
.dim-value {
  font-size: 22px;
  font-weight: bold;
  color: var(--brown);
  font-family: 'SimSun', 'STSong', serif;
}
.dim-value.na { font-size: 13px; color: #bbb; font-weight: normal; font-family: inherit; }
.dim-count {
  position: absolute;
  right: 12px;
  top: 10px;
  font-size: 11px;
  color: #aaa;
}

/* 图例 */
.legend {
  display: flex;
  gap: 18px;
  margin-top: 14px;
  flex-wrap: wrap;
  justify-content: center;
}
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #777; }
.lc { width: 16px; height: 16px; border-radius: 3px; display: inline-block; }
.lc.strong { background: #2e8b57; }
.lc.medium { background: #5cb85c; }
.lc.weak { background: #f0ad4e; }
.lc.poor { background: #d9534f; }
.lc.none { background: #eee; border: 1px dashed #ccc; }

/* 薄弱维度标签 */
.weak-dimensions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.weak-dim {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}
.weak-dim:hover { background: rgba(205, 133, 63, 0.1); }
.weak-dim.active {
  background: linear-gradient(135deg, var(--brown-light), var(--brown));
  color: #fff;
  border-color: transparent;
}
.weak-dim.active .wd-count { color: rgba(255, 255, 255, 0.85); }
.wd-count { font-size: 12px; color: #999; }

/* 错题表 */
.wq-table {
  width: 100%;
  border-collapse: collapse;
}
.wq-table th {
  text-align: left;
  padding: 12px 10px;
  color: var(--brown);
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  border-bottom: 2px solid var(--border);
}
.wq-table td {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(205, 133, 63, 0.08);
  color: var(--text);
  font-size: 14px;
}
.q-text { max-width: 320px; }
.q-src { color: #888; font-size: 13px; }
.freq-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  background: rgba(217, 83, 79, 0.12);
  color: #d9534f;
  font-weight: bold;
}
.tag-ok { color: #5cb85c; }
.tag-err { color: #d9534f; }
.empty-row { text-align: center; color: #aaa; padding: 30px; }

@media (max-width: 768px) {
  .knowledge-diagnosis { padding: 12px; }
  .title-area h1 { font-size: 22px; }
  .panel { padding: 16px; }
  .q-text { max-width: 160px; }
}
</style>