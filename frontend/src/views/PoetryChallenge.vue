<template>
  <div class="poetry-challenge-page">
    <div class="challenge-header">
      <h1>🎨 诗词创作挑战</h1>
      <p class="subtitle">选择主题，AI为你创作一首诗，体验专业诗词点评</p>
    </div>

    <!-- 主题选择 -->
    <div class="theme-selection" v-if="!currentChallenge">
      <h2>选择创作主题</h2>
      <div class="theme-grid">
        <div
          v-for="theme in themes"
          :key="theme.name"
          class="theme-card"
          @click="selectTheme(theme)"
          :class="{ selected: selectedTheme?.name === theme.name }"
        >
          <span class="theme-icon">{{ theme.icon }}</span>
          <span class="theme-name">{{ theme.name }}</span>
          <span class="theme-desc">{{ theme.description }}</span>
          <span class="theme-keywords">{{ theme.keywords }}</span>
        </div>
      </div>

      <!-- 主题创作指南 -->
      <div class="theme-guide" v-if="selectedTheme && themeGuide">
        <h3>📖 {{ selectedTheme.name }} 创作指南</h3>
        <div class="guide-content">
          <div class="guide-item">
            <span class="guide-label">常用意象</span>
            <span class="guide-value">{{ themeGuide.typicalImages?.join('、') }}</span>
          </div>
          <div class="guide-item">
            <span class="guide-label">情感表达</span>
            <span class="guide-value">{{ themeGuide.emotions?.join('、') }}</span>
          </div>
          <div class="guide-item">
            <span class="guide-label">经典范例</span>
            <span class="guide-value classic">{{ themeGuide.classicExamples?.join('；') }}</span>
          </div>
          <div class="guide-tip">
            <span class="tip-icon">💡</span>
            <span>{{ themeGuide.tips }}</span>
          </div>
        </div>
      </div>

      <div class="keyword-input" v-if="selectedTheme">
        <label>指定关键词（可选，最多2个字）</label>
        <input
          v-model="keyword"
          placeholder="例如：春风、明月..."
          maxlength="2"
        />
        <span class="keyword-hint">不填则由AI随机选择</span>
      </div>

      <button
        class="btn-generate"
        @click="generateChallenge"
        :disabled="generating || !selectedTheme"
      >
        {{ generating ? '🎭 AI创作中...' : '🎯 开始创作' }}
      </button>
    </div>

    <!-- AI创作展示 -->
    <div class="challenge-display" v-if="currentChallenge">
      <button class="btn-back" @click="resetChallenge">← 重新选择主题</button>

      <!-- 诗词展示 -->
      <div class="poem-result">
        <div class="ai-badge">🤖 AI创作</div>
        <h2 class="poem-title">{{ currentChallenge.poem?.title }}</h2>
        <div class="poem-content">
          <p v-for="(line, i) in poemLines" :key="i" class="poem-line">
            <span class="line-number">{{ i + 1 }}</span>
            {{ line }}
          </p>
        </div>
        <div class="poem-meta">
          <span class="meta-item">主题：<strong>{{ currentChallenge.theme }}</strong></span>
          <span class="meta-item" v-if="currentChallenge.keyword">关键词：<strong>{{ currentChallenge.keyword }}</strong></span>
        </div>
        <div class="rhyme-info" v-if="currentChallenge.poem?.rhymeScheme">
          押韵：{{ currentChallenge.poem.rhymeScheme }}
        </div>
      </div>

      <!-- AI专业点评 -->
      <div class="ai-evaluation" v-if="currentChallenge.poem?.evaluation">
        <h3>📝 AI专业点评</h3>
        
        <!-- 雷达图 -->
        <div class="radar-chart-container">
          <div ref="radarChartRef" class="radar-chart"></div>
        </div>

        <!-- 分维度评分 -->
        <div class="dimensions-grid">
          <!-- 意境营造 -->
          <div class="dimension-card" :class="'level-' + getScoreLevel(currentChallenge.poem.evaluation.dimensions?.yijing?.score)">
            <div class="dimension-header">
              <span class="dimension-icon">🎨</span>
              <span class="dimension-name">意境营造</span>
              <span class="dimension-score">{{ currentChallenge.poem.evaluation.dimensions?.yijing?.score || 0 }}</span>
            </div>
            <div class="score-bar">
              <div class="bar-fill" :style="{ width: (currentChallenge.poem.evaluation.dimensions?.yijing?.score || 0) + '%' }"></div>
            </div>
            <p class="dimension-comment">{{ currentChallenge.poem.evaluation.dimensions?.yijing?.comment }}</p>
          </div>

          <!-- 用词精妙 -->
          <div class="dimension-card" :class="'level-' + getScoreLevel(currentChallenge.poem.evaluation.dimensions?.yongci?.score)">
            <div class="dimension-header">
              <span class="dimension-icon">✍️</span>
              <span class="dimension-name">用词精妙</span>
              <span class="dimension-score">{{ currentChallenge.poem.evaluation.dimensions?.yongci?.score || 0 }}</span>
            </div>
            <div class="score-bar">
              <div class="bar-fill" :style="{ width: (currentChallenge.poem.evaluation.dimensions?.yongci?.score || 0) + '%' }"></div>
            </div>
            <p class="dimension-comment">{{ currentChallenge.poem.evaluation.dimensions?.yongci?.comment }}</p>
          </div>

          <!-- 典故运用 -->
          <div class="dimension-card" :class="'level-' + getScoreLevel(currentChallenge.poem.evaluation.dimensions?.diangu?.score)">
            <div class="dimension-header">
              <span class="dimension-icon">📚</span>
              <span class="dimension-name">典故运用</span>
              <span class="dimension-score">{{ currentChallenge.poem.evaluation.dimensions?.diangu?.score || 0 }}</span>
            </div>
            <div class="score-bar">
              <div class="bar-fill" :style="{ width: (currentChallenge.poem.evaluation.dimensions?.diangu?.score || 0) + '%' }"></div>
            </div>
            <p class="dimension-comment">{{ currentChallenge.poem.evaluation.dimensions?.diangu?.comment }}</p>
          </div>

          <!-- 格律音韵 -->
          <div class="dimension-card" :class="'level-' + getScoreLevel(currentChallenge.poem.evaluation.dimensions?.gelv?.score)">
            <div class="dimension-header">
              <span class="dimension-icon">🎵</span>
              <span class="dimension-name">格律音韵</span>
              <span class="dimension-score">{{ currentChallenge.poem.evaluation.dimensions?.gelv?.score || 0 }}</span>
            </div>
            <div class="score-bar">
              <div class="bar-fill" :style="{ width: (currentChallenge.poem.evaluation.dimensions?.gelv?.score || 0) + '%' }"></div>
            </div>
            <p class="dimension-comment">{{ currentChallenge.poem.evaluation.dimensions?.gelv?.comment }}</p>
          </div>

          <!-- 主题契合 -->
          <div class="dimension-card" :class="'level-' + getScoreLevel(currentChallenge.poem.evaluation.dimensions?.zhuti?.score)">
            <div class="dimension-header">
              <span class="dimension-icon">💫</span>
              <span class="dimension-name">主题契合</span>
              <span class="dimension-score">{{ currentChallenge.poem.evaluation.dimensions?.zhuti?.score || 0 }}</span>
            </div>
            <div class="score-bar">
              <div class="bar-fill" :style="{ width: (currentChallenge.poem.evaluation.dimensions?.zhuti?.score || 0) + '%' }"></div>
            </div>
            <p class="dimension-comment">{{ currentChallenge.poem.evaluation.dimensions?.zhuti?.comment }}</p>
          </div>

          <!-- 创新程度 -->
          <div class="dimension-card" :class="'level-' + getScoreLevel(currentChallenge.poem.evaluation.dimensions?.chuangxin?.score)">
            <div class="dimension-header">
              <span class="dimension-icon">✨</span>
              <span class="dimension-name">创新程度</span>
              <span class="dimension-score">{{ currentChallenge.poem.evaluation.dimensions?.chuangxin?.score || 0 }}</span>
            </div>
            <div class="score-bar">
              <div class="bar-fill" :style="{ width: (currentChallenge.poem.evaluation.dimensions?.chuangxin?.score || 0) + '%' }"></div>
            </div>
            <p class="dimension-comment">{{ currentChallenge.poem.evaluation.dimensions?.chuangxin?.comment }}</p>
          </div>

          <!-- 整体美感 -->
          <div class="dimension-card" :class="'level-' + getScoreLevel(currentChallenge.poem.evaluation.dimensions?.meigan?.score)">
            <div class="dimension-header">
              <span class="dimension-icon">🌟</span>
              <span class="dimension-name">整体美感</span>
              <span class="dimension-score">{{ currentChallenge.poem.evaluation.dimensions?.meigan?.score || 0 }}</span>
            </div>
            <div class="score-bar">
              <div class="bar-fill" :style="{ width: (currentChallenge.poem.evaluation.dimensions?.meigan?.score || 0) + '%' }"></div>
            </div>
            <p class="dimension-comment">{{ currentChallenge.poem.evaluation.dimensions?.meigan?.comment }}</p>
          </div>

          <!-- 综合评分 -->
          <div class="dimension-card highlight" :class="'level-' + getScoreLevel(currentChallenge.poem.evaluation.dimensions?.zonghe?.score)">
            <div class="dimension-header">
              <span class="dimension-icon">🏆</span>
              <span class="dimension-name">综合评分</span>
              <span class="dimension-score highlight">{{ currentChallenge.poem.evaluation.dimensions?.zonghe?.score || 0 }}</span>
            </div>
            <div class="score-bar">
              <div class="bar-fill highlight" :style="{ width: (currentChallenge.poem.evaluation.dimensions?.zonghe?.score || 0) + '%' }"></div>
            </div>
            <p class="dimension-comment">{{ currentChallenge.poem.evaluation.dimensions?.zonghe?.comment }}</p>
          </div>
        </div>

        <!-- 亮点与建议 -->
        <div class="analysis-sections">
          <div class="analysis-section highlights">
            <h4>🌟 亮点</h4>
            <ul>
              <li v-for="(item, i) in currentChallenge.poem.evaluation.highlights" :key="i">{{ item }}</li>
            </ul>
          </div>
          <div class="analysis-section suggestions">
            <h4>📈 改进建议</h4>
            <ul>
              <li v-for="(item, i) in currentChallenge.poem.evaluation.suggestions" :key="i">{{ item }}</li>
            </ul>
          </div>
        </div>

        <!-- 逐句分析 -->
        <div class="line-analysis" v-if="currentChallenge.poem.evaluation.poemAnalysis">
          <h4>📖 逐句解读</h4>
          <div class="lines-grid">
            <div class="line-item" v-if="currentChallenge.poem.evaluation.poemAnalysis.firstLine">
              <span class="line-text">{{ currentChallenge.poem.evaluation.poemAnalysis.firstLine.text }}</span>
              <span class="line-ana">{{ currentChallenge.poem.evaluation.poemAnalysis.firstLine.analysis }}</span>
            </div>
            <div class="line-item" v-if="currentChallenge.poem.evaluation.poemAnalysis.secondLine">
              <span class="line-text">{{ currentChallenge.poem.evaluation.poemAnalysis.secondLine.text }}</span>
              <span class="line-ana">{{ currentChallenge.poem.evaluation.poemAnalysis.secondLine.analysis }}</span>
            </div>
            <div class="line-item" v-if="currentChallenge.poem.evaluation.poemAnalysis.thirdLine">
              <span class="line-text">{{ currentChallenge.poem.evaluation.poemAnalysis.thirdLine.text }}</span>
              <span class="line-ana">{{ currentChallenge.poem.evaluation.poemAnalysis.thirdLine.analysis }}</span>
            </div>
            <div class="line-item" v-if="currentChallenge.poem.evaluation.poemAnalysis.fourthLine">
              <span class="line-text">{{ currentChallenge.poem.evaluation.poemAnalysis.fourthLine.text }}</span>
              <span class="line-ana">{{ currentChallenge.poem.evaluation.poemAnalysis.fourthLine.analysis }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 评分区域 -->
      <div class="rating-section">
        <h3>你的评价</h3>
        <div class="rating-instruction">请从专业角度给这首诗打分</div>
        <div class="star-rating">
          <span
            v-for="n in 10"
            :key="n"
            class="star"
            :class="{ active: n <= userScore, hover: n <= hoverScore }"
            @click="setScore(n)"
            @mouseenter="hoverScore = n"
            @mouseleave="hoverScore = 0"
          >★</span>
        </div>
        <div class="score-label">{{ scoreLabel }}</div>

        <!-- 评价理由 -->
        <div class="feedback-input">
          <textarea
            v-model="feedback"
            placeholder="写下你的评价理由（可选）..."
            rows="3"
          ></textarea>
        </div>

        <button
          class="btn-submit-score"
          @click="submitScore"
          :disabled="userScore === 0 || submitting"
        >
          {{ submitting ? '提交中...' : '提交评价' }}
        </button>
      </div>

      <!-- 统计 -->
      <div class="stats-section" v-if="challengeStats">
        <div class="stat-card">
          <span class="stat-icon">📝</span>
          <span class="stat-value">{{ challengeStats.total_challenges || 0 }}</span>
          <span class="stat-label">总创作数</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">⭐</span>
          <span class="stat-value">{{ challengeStats.avg_score?.toFixed(1) || '0.0' }}</span>
          <span class="stat-label">平均评分</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🏅</span>
          <span class="stat-value">{{ challengeStats.max_score || 0 }}</span>
          <span class="stat-label">最高评分</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">💎</span>
          <span class="stat-value">{{ challengeStats.excellent_count || 0 }}</span>
          <span class="stat-label">优秀(8+)</span>
        </div>
      </div>

      <!-- 历史记录 -->
      <div class="history-section" v-if="challengeHistory.length > 0">
        <h3>📚 历史创作</h3>
        <div class="history-list">
          <div v-for="item in challengeHistory.slice(0, 5)" :key="item.id" class="history-item">
            <div class="history-theme">{{ item.theme }}</div>
            <div class="history-poem">{{ item.poem?.title }}</div>
            <div class="history-score" v-if="item.user_score">评分: {{ item.user_score }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { init as initChart } from '@/utils/echarts'
import api from '../services/api'
import { notify } from '../services/appFeedback'

const themes = ref([])
const selectedTheme = ref(null)
const themeGuide = ref(null)
const keyword = ref('')
const generating = ref(false)
const submitting = ref(false)
const hoverScore = ref(0)
const userScore = ref(0)
const feedback = ref('')
const currentChallenge = ref(null)
const challengeStats = ref(null)
const challengeHistory = ref([])
const radarChartRef = ref(null)

const poemLines = computed(() => {
  if (!currentChallenge.value?.poem?.content) return []
  return currentChallenge.value.poem.content.split(/[，,。.]/).filter(l => l.trim())
})

const scoreLabel = computed(() => {
  if (userScore.value === 0) return '请选择评分'
  if (userScore.value <= 3) return '还需努力 💪'
  if (userScore.value <= 5) return '有一定创意 🌱'
  if (userScore.value <= 7) return '很不错 ✨'
  if (userScore.value <= 9) return '很棒！🌟'
  return '完美！🏆'
})

const getScoreLevel = (score) => {
  if (!score) return 'low'
  if (score >= 80) return 'high'
  if (score >= 60) return 'medium'
  return 'low'
}

const loadThemes = async () => {
  try {
    const res = await api.poetryChallenge.getThemes()
    if (res?.data) themes.value = res.data
  } catch (error) {
    console.error('加载主题失败:', error)
  }
}

const loadStats = async () => {
  try {
    const res = await api.poetryChallenge.getStats()
    if (res?.data) challengeStats.value = res.data
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

const loadHistory = async () => {
  try {
    const res = await api.poetryChallenge.getHistory()
    if (res?.data) challengeHistory.value = res.data
  } catch (error) {
    console.error('加载历史失败:', error)
  }
}

const selectTheme = (theme) => {
  selectedTheme.value = theme
  // 设置创作指南
  const guides = {
    '春天': {
      typicalImages: ['春风、春雨、春花、春草、春柳、燕子、蝴蝶'],
      emotions: ['喜悦、希望、新生'],
      classicExamples: ['春眠不觉晓，处处闻啼鸟', '春江潮水连海平'],
      tips: '描写春天时可注重色彩的变化和生命的萌动，用动词增加动感。'
    },
    '夏天': {
      typicalImages: ['烈日、荷花、蝉鸣、骤雨'],
      emotions: ['热烈、烦躁、清凉'],
      classicExamples: ['接天莲叶无穷碧，映日荷花别样红', '小荷才露尖尖角'],
      tips: '夏日诗词可通过对比手法，炎热与清凉对照，营造意境。'
    },
    '秋天': {
      typicalImages: ['落叶、明月、菊花、大雁'],
      emotions: ['萧瑟、思念、丰收'],
      classicExamples: ['停车坐爱枫林晚，霜叶红于二月花', '月落乌啼霜满天'],
      tips: '秋诗常寓情于景，注意选取典型意象如"西风""寒蝉"等。'
    },
    '冬天': {
      typicalImages: ['白雪、红梅、寒风、炉火'],
      emotions: ['高洁、孤傲、温暖'],
      classicExamples: ['墙角数枝梅，凌寒独自开', '忽如一夜春风来'],
      tips: '冬诗常以梅雪象征高洁品格，对比手法突出特点。'
    },
    '思乡': {
      typicalImages: ['明月、归雁、故土'],
      emotions: ['思念、惆怅、期盼'],
      classicExamples: ['举头望明月，低头思故乡', '春风又绿江南岸'],
      tips: '思乡主题常用月、雁等意象烘托情感，以景衬情。'
    },
    '友情': {
      typicalImages: ['酒、柳、亭、琴'],
      emotions: ['珍重、离别、祝愿'],
      classicExamples: ['桃花潭水深千尺，不及汪伦送我情', '海内存知己'],
      tips: '送别诗多用具体意象寄托情感，如"柳"谐音"留"。'
    },
    '山水': {
      typicalImages: ['青山、绿水、白云、松林'],
      emotions: ['闲适、超脱、静谧'],
      classicExamples: ['两岸猿声啼不住，轻舟已过万重山', '空山新雨后'],
      tips: '山水诗注重动静结合，色彩搭配，营造清幽意境。'
    },
    '爱国': {
      typicalImages: ['山河、边疆、战马'],
      emotions: ['壮志、悲壮、忠诚'],
      classicExamples: ['王师北定中原日，家祭无忘告乃翁', '人生自古谁无死'],
      tips: '爱国诗词需有宏大视角，融入个人理想与家国情怀。'
    }
  }
  themeGuide.value = guides[theme.name] || {
    typicalImages: ['自然景物'],
    emotions: ['根据主题而定'],
    classicExamples: ['注意格律对仗'],
    tips: '创作时注意主题明确、意象贴切、情感真挚。'
  }
}

const generateChallenge = async () => {
  if (!selectedTheme.value) return
  generating.value = true
  try {
    const res = await api.poetryChallenge.generate(selectedTheme.value.name, keyword.value)
    if (res?.success) {
      currentChallenge.value = res
      userScore.value = 0
      feedback.value = ''
      await nextTick()
      initRadarChart()
    } else {
      notify(res?.message || '生成失败', 'error')
    }
  } catch (error) {
    console.error('生成挑战失败:', error)
  } finally {
    generating.value = false
  }
}

const setScore = (n) => {
  userScore.value = n
}

const submitScore = async () => {
  if (userScore.value === 0 || !currentChallenge.value?.challengeId) return
  submitting.value = true
  try {
    const res = await api.poetryChallenge.rate(
      currentChallenge.value.challengeId,
      userScore.value,
      feedback.value
    )
    if (res?.success) {
      await loadStats()
      notify('评价成功！感谢参与！', 'success')
    }
  } catch (error) {
    console.error('提交评分失败:', error)
  } finally {
    submitting.value = false
  }
}

const resetChallenge = () => {
  currentChallenge.value = null
  selectedTheme.value = null
  keyword.value = ''
  userScore.value = 0
  feedback.value = ''
}

const initRadarChart = () => {
  if (!radarChartRef.value || !currentChallenge.value?.poem?.evaluation?.dimensions) return
  
  const dims = currentChallenge.value.poem.evaluation.dimensions
  
  const chart = initChart(radarChartRef.value)
  
  const option = {
    radar: {
      indicator: [
        { name: '意境', max: 100 },
        { name: '用词', max: 100 },
        { name: '典故', max: 100 },
        { name: '格律', max: 100 },
        { name: '主题', max: 100 },
        { name: '创新', max: 100 },
        { name: '美感', max: 100 },
        { name: '综合', max: 100 }
      ],
      shape: 'polygon',
      splitNumber: 5,
      axisName: {
        color: '#8b4513'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(139, 69, 19, 0.2)'
        }
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(139, 69, 19, 0.05)', 'rgba(139, 69, 19, 0.1)']
        }
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(139, 69, 19, 0.3)'
        }
      }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          dims.yijing?.score || 0,
          dims.yongci?.score || 0,
          dims.diangu?.score || 0,
          dims.gelv?.score || 0,
          dims.zhuti?.score || 0,
          dims.chuangxin?.score || 0,
          dims.meigan?.score || 0,
          dims.zonghe?.score || 0
        ],
        name: 'AI评分',
        areaStyle: {
          color: 'rgba(205, 133, 63, 0.3)'
        },
        lineStyle: {
          color: '#8b4513',
          width: 2
        },
        itemStyle: {
          color: '#8b4513'
        }
      }]
    }]
  }
  
  chart.setOption(option)
}

watch(currentChallenge, async () => {
  if (currentChallenge.value?.poem?.evaluation) {
    await nextTick()
    initRadarChart()
  }
})

onMounted(() => {
  loadThemes()
  loadStats()
  loadHistory()
})
</script>

<style scoped>
.poetry-challenge-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.challenge-header {
  text-align: center;
  margin-bottom: 40px;
}

.challenge-header h1 {
  font-size: 32px;
  color: #8b4513;
  margin-bottom: 8px;
}

.subtitle { color: #666; font-size: 16px; }

.theme-selection h2 {
  font-size: 20px;
  color: #8b4513;
  margin-bottom: 20px;
  text-align: center;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 30px;
}

.theme-card {
  background: rgba(255,255,255,0.9);
  border: 2px solid rgba(139,69,19,0.15);
  border-radius: 16px;
  padding: 20px 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(139,69,19,0.15); }
.theme-card.selected { border-color: #8b4513; background: rgba(139,69,19,0.08); }

.theme-icon { font-size: 36px; display: block; margin-bottom: 8px; }
.theme-name { font-size: 16px; font-weight: bold; color: #8b4513; display: block; margin-bottom: 4px; }
.theme-desc { font-size: 12px; color: #666; display: block; }
.theme-keywords { font-size: 11px; color: #999; display: block; margin-top: 4px; }

.theme-guide {
  background: rgba(139,69,19,0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.theme-guide h3 {
  font-size: 16px;
  color: #8b4513;
  margin-bottom: 16px;
}

.guide-content { display: flex; flex-direction: column; gap: 12px; }

.guide-item {
  display: flex;
  gap: 12px;
  font-size: 14px;
}

.guide-label {
  color: #8b4513;
  font-weight: bold;
  min-width: 80px;
}

.guide-value { color: #666; flex: 1; }
.guide-value.classic { color: #a0522d; font-style: italic; }

.guide-tip {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: rgba(139,69,19,0.08);
  border-radius: 8px;
  font-size: 13px;
  color: #666;
  margin-top: 8px;
}

.tip-icon { font-size: 16px; }

.keyword-input {
  text-align: center;
  margin-bottom: 24px;
}

.keyword-input label { display: block; font-size: 14px; color: #666; margin-bottom: 8px; }
.keyword-input input {
  padding: 12px 20px;
  border: 2px solid rgba(139,69,19,0.2);
  border-radius: 12px;
  font-size: 16px;
  text-align: center;
  width: 180px;
}
.keyword-hint { display: block; font-size: 12px; color: #999; margin-top: 4px; }

.btn-generate {
  display: block;
  margin: 0 auto;
  padding: 16px 48px;
  background: linear-gradient(135deg, #cd853f, #8b4513);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn-generate:hover:not(:disabled) { transform: scale(1.05); }
.btn-generate:disabled { opacity: 0.7; cursor: not-allowed; }

.challenge-display {
  background: rgba(255,255,255,0.95);
  border-radius: 24px;
  padding: 30px;
}

.btn-back {
  padding: 8px 16px;
  background: rgba(139,69,19,0.1);
  border: none;
  border-radius: 8px;
  color: #8b4513;
  cursor: pointer;
  margin-bottom: 20px;
}

.poem-result {
  background: rgba(139,69,19,0.05);
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  margin-bottom: 30px;
  position: relative;
}

.ai-badge {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(155,89,182,0.15);
  color: #8e44ad;
  border-radius: 20px;
  font-size: 14px;
  margin-bottom: 16px;
}

.poem-title { font-size: 28px; color: #8b4513; margin-bottom: 20px; }

.poem-content { margin-bottom: 20px; }

.poem-line {
  font-size: 22px;
  color: #333;
  line-height: 2;
  margin: 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.line-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: rgba(139,69,19,0.15);
  border-radius: 50%;
  font-size: 12px;
  color: #8b4513;
}

.poem-meta {
  display: flex;
  justify-content: center;
  gap: 24px;
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.meta-item strong { color: #8b4513; }

.rhyme-info {
  font-size: 13px;
  color: #999;
}

/* AI点评 */
.ai-evaluation {
  background: rgba(255,255,255,0.9);
  border: 2px solid rgba(139,69,19,0.15);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 30px;
}

.ai-evaluation h3 {
  font-size: 18px;
  color: #8b4513;
  margin-bottom: 20px;
  text-align: center;
}

.radar-chart-container {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.radar-chart { width: 400px; height: 300px; }

.dimensions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.dimension-card {
  background: rgba(139,69,19,0.05);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(139,69,19,0.1);
}

.dimension-card.highlight {
  grid-column: span 2;
  background: rgba(139,69,19,0.1);
}

.dimension-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.dimension-icon { font-size: 18px; }
.dimension-name { flex: 1; font-size: 14px; color: #666; }
.dimension-score {
  font-size: 20px;
  font-weight: bold;
  color: #8b4513;
}

.dimension-score.highlight {
  font-size: 28px;
  color: #cd853f;
}

.score-bar {
  height: 6px;
  background: rgba(139,69,19,0.15);
  border-radius: 3px;
  margin-bottom: 8px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #cd853f, #8b4513);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.bar-fill.highlight { background: linear-gradient(90deg, #f39c12, #e74c3c); }

.dimension-card.level-high .bar-fill { background: linear-gradient(90deg, #27ae60, #2ecc71); }
.dimension-card.level-medium .bar-fill { background: linear-gradient(90deg, #f39c12, #e67e22); }
.dimension-card.level-low .bar-fill { background: linear-gradient(90deg, #e74c3c, #c0392b); }

.dimension-comment {
  font-size: 12px;
  color: #666;
  margin: 0;
  line-height: 1.5;
}

.analysis-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.analysis-section {
  padding: 16px;
  border-radius: 12px;
}

.analysis-section.highlights {
  background: rgba(39,174,96,0.1);
  border: 1px solid rgba(39,174,96,0.2);
}

.analysis-section.suggestions {
  background: rgba(52,152,219,0.1);
  border: 1px solid rgba(52,152,219,0.2);
}

.analysis-section h4 {
  font-size: 14px;
  margin-bottom: 12px;
}

.analysis-section ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #666;
}

.analysis-section li { margin-bottom: 4px; }

.line-analysis {
  background: rgba(139,69,19,0.05);
  border-radius: 12px;
  padding: 16px;
}

.line-analysis h4 {
  font-size: 14px;
  color: #8b4513;
  margin-bottom: 12px;
}

.lines-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.line-item {
  background: white;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.line-text {
  font-size: 16px;
  color: #333;
  font-weight: bold;
}

.line-ana {
  font-size: 12px;
  color: #666;
}

/* 评分区域 */
.rating-section {
  text-align: center;
  padding: 24px;
  background: rgba(139,69,19,0.05);
  border-radius: 16px;
  margin-bottom: 24px;
}

.rating-section h3 {
  font-size: 18px;
  color: #8b4513;
  margin-bottom: 8px;
}

.rating-instruction {
  font-size: 13px;
  color: #999;
  margin-bottom: 16px;
}

.star-rating { font-size: 40px; cursor: pointer; margin-bottom: 8px; }
.star { color: #ddd; transition: color 0.1s; display: inline-block; }
.star.active, .star.hover { color: #f1c40f; }
.star:hover { transform: scale(1.2); }

.score-label { font-size: 18px; color: #666; margin-bottom: 16px; }

.feedback-input {
  margin-bottom: 16px;
}

.feedback-input textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(139,69,19,0.2);
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
}

.btn-submit-score {
  padding: 14px 40px;
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn-submit-score:hover:not(:disabled) { transform: scale(1.05); }
.btn-submit-score:disabled { opacity: 0.5; cursor: not-allowed; }

.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: rgba(139,69,19,0.05);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-icon { font-size: 20px; }
.stat-value { font-size: 24px; font-weight: bold; color: #8b4513; }
.stat-label { font-size: 12px; color: #666; }

.history-section h3 {
  font-size: 16px;
  color: #8b4513;
  margin-bottom: 12px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: rgba(139,69,19,0.05);
  border-radius: 8px;
}

.history-theme {
  padding: 4px 8px;
  background: rgba(139,69,19,0.1);
  border-radius: 4px;
  font-size: 12px;
  color: #8b4513;
}

.history-poem { flex: 1; font-size: 14px; color: #333; }
.history-score { font-size: 14px; color: #f39c12; font-weight: bold; }

@media (max-width: 768px) {
  .theme-grid { grid-template-columns: repeat(2, 1fr); }
  .dimensions-grid { grid-template-columns: 1fr; }
  .dimension-card.highlight { grid-column: span 1; }
  .stats-section { grid-template-columns: repeat(2, 1fr); }
  .radar-chart { width: 100%; height: 250px; }
  .lines-grid { grid-template-columns: 1fr; }
}
</style>
