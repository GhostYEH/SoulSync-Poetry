<template>
  <div class="learning-path-page">
    <div class="path-header">
      <h1>📚 个性化学习路径</h1>
      <button class="btn-refresh" @click="regeneratePath">
        <span v-if="loading">生成中...</span>
        <span v-else>🔄 重新生成</span>
      </button>
    </div>

    <!-- 水平评估卡片 -->
    <div class="level-card" :class="'level-' + currentLevel">
      <div class="level-badge">
        <span class="level-icon">{{ levelIcon }}</span>
        <span class="level-text">{{ currentLevel }}</span>
      </div>
      <div class="level-info">
        <div class="level-score">
          <span class="score-label">综合评分</span>
          <span class="score-value">{{ levelScore }}</span>
        </div>
        <div class="level-stats">
          <div class="stat-item">
            <span class="stat-icon">📖</span>
            <span class="stat-value">{{ assessment?.poemsLearned || 0 }}</span>
            <span class="stat-label">已学诗词</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">🎯</span>
            <span class="stat-value">{{ assessment?.avgScore || 0 }}%</span>
            <span class="stat-label">平均得分</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">❌</span>
            <span class="stat-value">{{ assessment?.wrongCount || 0 }}</span>
            <span class="stat-label">错题数</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">🏆</span>
            <span class="stat-value">第{{ assessment?.challengeLevel || 1 }}关</span>
            <span class="stat-label">闯关等级</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 推荐学习列表 -->
    <div class="recommendations-section">
      <h2>💡 推荐学习内容</h2>
      <div class="recommendations-grid">
        <div
          v-for="(rec, index) in recommendations"
          :key="index"
          class="recommendation-card"
          :class="'priority-' + rec.priority"
          @click="startLearning(rec)"
        >
          <div class="rec-header">
            <span class="rec-type" :class="'type-' + rec.type">{{ rec.type }}</span>
            <span class="rec-priority">
              {{ rec.priority === 'high' ? '🔥' : rec.priority === 'medium' ? '✨' : '📝' }}
            </span>
          </div>
          <div class="rec-content">{{ rec.content }}</div>
          <button class="btn-start">开始学习 →</button>
        </div>
      </div>
    </div>

    <!-- 能力雷达图 -->
    <div class="ability-section" v-if="abilityData">
      <h2>🎯 能力模型</h2>
      <div class="ability-container">
        <div ref="radarChartRef" class="radar-chart"></div>
        <div class="ability-details">
          <div class="ability-item">
            <span class="ability-icon">🧠</span>
            <span class="ability-name">记忆能力</span>
            <div class="ability-bar">
              <div class="bar-fill memory" :style="{ width: abilityData.memory + '%' }"></div>
            </div>
            <span class="ability-score">{{ abilityData.memory }}</span>
          </div>
          <div class="ability-item">
            <span class="ability-icon">💡</span>
            <span class="ability-name">理解能力</span>
            <div class="ability-bar">
              <div class="bar-fill understanding" :style="{ width: abilityData.understanding + '%' }"></div>
            </div>
            <span class="ability-score">{{ abilityData.understanding }}</span>
          </div>
          <div class="ability-item">
            <span class="ability-icon">🚀</span>
            <span class="ability-name">应用能力</span>
            <div class="ability-bar">
              <div class="bar-fill application" :style="{ width: abilityData.application + '%' }"></div>
            </div>
            <span class="ability-score">{{ abilityData.application }}</span>
          </div>
          <div class="ability-item">
            <span class="ability-icon">🎨</span>
            <span class="ability-name">创作能力</span>
            <div class="ability-bar">
              <div class="bar-fill creativity" :style="{ width: abilityData.creativity + '%' }"></div>
            </div>
            <span class="ability-score">{{ abilityData.creativity }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { init as initChart } from '@/utils/echarts'
import api from '../services/api'

const router = useRouter()
const loading = ref(false)
const currentLevel = ref('初级')
const levelScore = ref(0)
const recommendations = ref([])
const assessment = ref(null)
const abilityData = ref(null)
const radarChartRef = ref(null)
let radarChart = null

const levelIcon = computed(() => {
  const icons = { '初级': '🌱', '基础': '📗', '进阶': '🌟', '精通': '🏆' }
  return icons[currentLevel.value] || '🌱'
})

const loadData = async () => {
  loading.value = true
  try {
    // 并行加载学习路径和能力数据
    const [pathRes, abilityRes] = await Promise.all([
      api.learning.getPath().catch(() => null),
      api.learning.getAbility().catch(() => null)
    ])

    if (pathRes?.data) {
      const data = pathRes.data
      currentLevel.value = data.level || '初级'
      levelScore.value = data.levelScore || 0
      recommendations.value = data.recommendations || []
      assessment.value = data.assessment || null
    }

    if (abilityRes?.data) {
      abilityData.value = abilityRes.data
      await nextTick()
      initRadarChart()
    }
  } catch (error) {
    console.error('加载学习路径失败:', error)
  } finally {
    loading.value = false
  }
}

const regeneratePath = async () => {
  loading.value = true
  try {
    const res = await api.learning.regeneratePath()
    if (res?.data) {
      const data = res.data
      currentLevel.value = data.level
      levelScore.value = data.levelScore
      recommendations.value = data.recommendations
      assessment.value = data.assessment
    }
  } catch (error) {
    console.error('重新生成失败:', error)
  } finally {
    loading.value = false
  }
}

const startLearning = (rec) => {
  // 根据推荐类型跳转到对应页面
  if (rec.type === '诗人') {
    router.push({ path: '/search', query: { author: rec.content.match(/《?(.*?)》?代表作品/)?.[1] || rec.content } })
  } else if (rec.type === '主题') {
    router.push({ path: '/search', query: { tag: rec.content } })
  } else if (rec.type === '竞技') {
    router.push('/feihualing/online')
  } else if (rec.type === '创作') {
    router.push('/creation')
  } else {
    router.push('/search')
  }
}

const initRadarChart = () => {
  if (!radarChartRef.value || !abilityData.value) return
  if (radarChart) radarChart.dispose()

  radarChart = initChart(radarChartRef.value)
  const option = {
    radar: {
      indicator: [
        { name: '记忆', max: 100 },
        { name: '理解', max: 100 },
        { name: '应用', max: 100 },
        { name: '创作', max: 100 }
      ],
      shape: 'polygon',
      splitNumber: 4,
      axisName: { color: '#8b4513', fontSize: 14 },
      splitLine: { lineStyle: { color: 'rgba(139,69,19,0.15)' } },
      splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)'] } },
      axisLine: { lineStyle: { color: 'rgba(139,69,19,0.2)' } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          abilityData.value.memory || 0,
          abilityData.value.understanding || 0,
          abilityData.value.application || 0,
          abilityData.value.creativity || 0
        ],
        name: '能力模型',
        areaStyle: { color: 'rgba(139,69,19,0.3)' },
        lineStyle: { color: '#8b4513', width: 2 },
        itemStyle: { color: '#8b4513' }
      }]
    }]
  }
  radarChart.setOption(option)
}

const handleResize = () => {
  radarChart?.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  radarChart?.dispose()
})
</script>

<style scoped>
.learning-path-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.path-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.path-header h1 {
  font-size: 28px;
  color: #8b4513;
  margin: 0;
}

.btn-refresh {
  padding: 10px 20px;
  background: linear-gradient(135deg, #cd853f, #8b4513);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  transition: transform 0.2s;
}

.btn-refresh:hover { transform: scale(1.05); }

.level-card {
  background: linear-gradient(135deg, rgba(205,133,63,0.15), rgba(139,69,19,0.1));
  border: 2px solid rgba(139,69,19,0.3);
  border-radius: 20px;
  padding: 30px;
  margin-bottom: 30px;
  display: flex;
  gap: 30px;
  align-items: center;
}

.level-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 30px;
  background: rgba(255,255,255,0.5);
  border-radius: 16px;
  min-width: 120px;
}

.level-icon { font-size: 48px; }

.level-text {
  font-size: 24px;
  font-weight: bold;
  color: #8b4513;
  margin-top: 8px;
}

.level-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  flex: 1;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: rgba(255,255,255,0.6);
  border-radius: 12px;
}

.stat-icon { font-size: 28px; }
.stat-value { font-size: 24px; font-weight: bold; color: #8b4513; }
.stat-label { font-size: 12px; color: #666; margin-top: 4px; }

.recommendations-section h2,
.ability-section h2 {
  font-size: 20px;
  color: #8b4513;
  margin-bottom: 16px;
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 30px;
}

.recommendation-card {
  background: rgba(255,255,255,0.9);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid rgba(139,69,19,0.15);
}

.recommendation-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(139,69,19,0.15);
}

.recommendation-card.priority-high { border-left: 4px solid #e74c3c; }
.recommendation-card.priority-medium { border-left: 4px solid #f39c12; }
.recommendation-card.priority-low { border-left: 4px solid #27ae60; }

.rec-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.rec-type {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}

.rec-type.type-诗人 { background: rgba(231,76,60,0.15); color: #c0392b; }
.rec-type.type-主题 { background: rgba(52,152,219,0.15); color: #2980b9; }
.rec-type.type-训练 { background: rgba(155,89,182,0.15); color: #8e44ad; }
.rec-type.type-竞技 { background: rgba(241,196,15,0.15); color: #d4ac0d; }
.rec-type.type-创作 { background: rgba(46,204,113,0.15); color: #27ae60; }

.rec-content {
  font-size: 16px;
  color: #333;
  margin-bottom: 16px;
  min-height: 48px;
}

.btn-start {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #cd853f, #8b4513);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s;
}

.btn-start:hover { opacity: 0.9; }

.ability-section {
  background: rgba(255,255,255,0.9);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(139,69,19,0.15);
}

.ability-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  align-items: center;
}

.radar-chart { width: 100%; height: 350px; }

.ability-details { display: flex; flex-direction: column; gap: 20px; }

.ability-item {
  display: grid;
  grid-template-columns: 40px 80px 1fr 50px;
  align-items: center;
  gap: 12px;
}

.ability-icon { font-size: 24px; text-align: center; }
.ability-name { font-size: 14px; color: #666; }
.ability-bar { height: 12px; background: rgba(139,69,19,0.1); border-radius: 6px; overflow: hidden; }

.bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.8s ease;
}

.bar-fill.memory { background: linear-gradient(90deg, #3498db, #2980b9); }
.bar-fill.understanding { background: linear-gradient(90deg, #e74c3c, #c0392b); }
.bar-fill.application { background: linear-gradient(90deg, #f39c12, #d68910); }
.bar-fill.creativity { background: linear-gradient(90deg, #9b59b6, #8e44ad); }

.ability-score { font-size: 20px; font-weight: bold; color: #8b4513; text-align: right; }

@media (max-width: 768px) {
  .level-card { flex-direction: column; }
  .level-stats { grid-template-columns: repeat(2, 1fr); }
  .ability-container { grid-template-columns: 1fr; }
}
</style>
