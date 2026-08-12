<template>
  <div class="learning-dashboard" :class="{ 'bg-loaded': bgLoaded, 'bg-transitioning': bgTransitioning }">
    
    <!-- 背景图 -->
    <div class="dashboard-background">
      <img
        v-if="backgroundUrl"
        :src="backgroundUrl"
        class="bg-image"
        :class="{ 'bg-image-visible': bgLoaded }"
        @load="onBgLoad"
        @error="onBgError"
        alt="仪表盘背景"
      />
      <div class="bg-overlay"></div>
      <div class="bg-particle" v-for="n in 30" :key="n" :style="getParticleStyle(n)"></div>
    </div>

    <!-- 主内容 -->
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1 class="page-title">📊 学习仪表盘</h1>
        <div class="refresh-section">
          <span class="last-updated">上次更新: {{ lastUpdatedTime }}</span>
          <button class="btn btn-primary refresh-btn" @click="fetchDashboardData">
            🔄 刷新数据
          </button>
        </div>
      </div>
      
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
      
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <button class="btn btn-primary" @click="fetchDashboardData">重试</button>
      </div>
      
      <div v-else class="dashboard-content">
      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card ios26-card">
          <div class="liquid-border"></div>
          <div class="liquid-shine"></div>
          <div class="stat-icon learned">📚</div>
          <div class="stat-content">
            <h3>已学习诗词</h3>
            <p class="stat-number">{{ dashboardData.totalLearned }}</p>
            <p class="stat-desc">首</p>
            <div class="stat-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: (dashboardData.totalLearned / 100 * 100) + '%' }"></div>
              </div>
              <span class="progress-text">{{ dashboardData.totalLearned }}/100 目标</span>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon score">🎯</div>
          <div class="stat-content">
            <h3>平均背诵得分</h3>
            <p class="stat-number">{{ dashboardData.averageScore }}%</p>
            <p class="stat-desc">正确率</p>
            <div class="stat-progress">
              <div class="progress-bar">
                <div class="progress-fill score" :style="{ width: dashboardData.averageScore + '%' }"></div>
              </div>
              <span class="progress-text">目标: 90%</span>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon mistake">❌</div>
          <div class="stat-content">
            <h3>错题数量</h3>
            <p class="stat-number">{{ dashboardData.mistakeCount }}</p>
            <p class="stat-desc">题</p>
            <div class="stat-progress">
              <div class="progress-bar">
                <div class="progress-fill mistake" :style="{ width: Math.min(dashboardData.mistakeCount * 5, 100) + '%' }"></div>
              </div>
              <span class="progress-text">目标: < 5题</span>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon mastery">💯</div>
          <div class="stat-content">
            <h3>掌握率</h3>
            <p class="stat-number">{{ dashboardData.masteryRate }}%</p>
            <p class="stat-desc">已掌握</p>
            <div class="stat-progress">
              <div class="progress-bar">
                <div class="progress-fill mastery" :style="{ width: dashboardData.masteryRate + '%' }"></div>
              </div>
              <span class="progress-text">目标: 80%</span>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon streak">🔥</div>
          <div class="stat-content">
            <h3>连续学习</h3>
            <p class="stat-number">{{ dashboardData.streakDays }}</p>
            <p class="stat-desc">天</p>
            <div class="stat-progress">
              <div class="progress-bar">
                <div class="progress-fill streak" :style="{ width: Math.min(dashboardData.streakDays * 10, 100) + '%' }"></div>
              </div>
              <span class="progress-text">目标: 7天</span>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon time">⏱️</div>
          <div class="stat-content">
            <h3>学习时长</h3>
            <p class="stat-number">{{ dashboardData.totalStudyTime }}</p>
            <p class="stat-desc">分钟</p>
            <div class="stat-progress">
              <div class="progress-bar">
                <div class="progress-fill time" :style="{ width: Math.min(dashboardData.totalStudyTime, 100) + '%' }"></div>
              </div>
              <span class="progress-text">今日目标: 30分钟</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 数据可视化区域 -->
      <div class="visualization-section">
        <div class="viz-grid">
          <!-- 核心指标：环形 + 条形对照 -->
          <div class="viz-card ios26-card core-metrics-card">
            <h3 class="viz-title">核心指标</h3>
            <div class="core-metrics-layout">
              <div class="ring-charts">
                <div class="ring-item">
                  <div class="ring-chart" :style="getRingStyle(dashboardData.averageScore, '#4CAF50')">
                    <span class="ring-value">{{ dashboardData.averageScore }}%</span>
                  </div>
                  <span class="ring-label">背诵得分</span>
                </div>
                <div class="ring-item">
                  <div class="ring-chart" :style="getRingStyle(dashboardData.masteryRate, '#2196F3')">
                    <span class="ring-value">{{ dashboardData.masteryRate }}%</span>
                  </div>
                  <span class="ring-label">掌握率</span>
                </div>
                <div class="ring-item">
                  <div class="ring-chart" :style="getRingStyle(corePoemsRingPercent, '#FF9800')">
                    <span class="ring-value">{{ dashboardData.totalLearned }}</span>
                  </div>
                  <span class="ring-label">已学诗词</span>
                </div>
              </div>
              <div class="core-bar-chart" aria-label="核心指标条形对照">
                <div
                  v-for="row in coreMetricBars"
                  :key="row.key"
                  class="core-bar-row"
                >
                  <span class="core-bar-label">{{ row.label }}</span>
                  <div class="core-bar-track">
                    <div
                      class="core-bar-fill"
                      :style="{ width: row.pct + '%', background: row.gradient }"
                    />
                  </div>
                  <span class="core-bar-value">{{ row.display }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 学习能力雷达图 -->
          <div class="viz-card ios26-card">
            <h3 class="viz-title">学习能力分析</h3>
            <p class="viz-hint">
              六维由学习记录推算：背诵均分、近期 AI 讲解参与、诗词覆盖面（20 首为满）、近 7 日活跃天数、无错题诗词占比、创作平均分（无作品为 0）。
            </p>
            <div class="radar-container">
              <svg viewBox="0 0 200 200" class="radar-svg">
                <!-- 背景网格 -->
                <g class="radar-grid">
                  <polygon points="100,20 170,65 170,135 100,180 30,135 30,65" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
                  <polygon points="100,40 155,70 155,130 100,160 45,130 45,70" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
                  <polygon points="100,60 140,80 140,120 100,140 60,120 60,80" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
                </g>
                <!-- 轴线 -->
                <g class="radar-axis">
                  <line x1="100" y1="100" x2="100" y2="20" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
                  <line x1="100" y1="100" x2="170" y2="65" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
                  <line x1="100" y1="100" x2="170" y2="135" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
                  <line x1="100" y1="100" x2="100" y2="180" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
                  <line x1="100" y1="100" x2="30" y2="135" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
                  <line x1="100" y1="100" x2="30" y2="65" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
                </g>
                <!-- 数据区域 -->
                <polygon
                  :points="radarPolygonPoints"
                  fill="rgba(129, 199, 132, 0.22)"
                  stroke="rgba(255,255,255,0.65)"
                  stroke-width="1.5"
                />
                <!-- 数据点 -->
                <circle
                  v-for="(coord, idx) in radarCoords"
                  :key="'rp-' + idx"
                  :cx="coord.x"
                  :cy="coord.y"
                  r="4"
                  fill="rgba(255,255,255,0.95)"
                  stroke="rgba(76, 175, 80, 0.9)"
                  stroke-width="1"
                />
                <!-- 标签 -->
                <text x="100" y="10" text-anchor="middle" class="radar-label">背诵</text>
                <text x="180" y="62" text-anchor="start" class="radar-label">理解</text>
                <text x="180" y="140" text-anchor="start" class="radar-label">记忆</text>
                <text x="100" y="195" text-anchor="middle" class="radar-label">坚持</text>
                <text x="20" y="140" text-anchor="end" class="radar-label">应用</text>
                <text x="20" y="62" text-anchor="end" class="radar-label">创作</text>
              </svg>
            </div>
          </div>

          <!-- 学习热力图 -->
          <div class="viz-card ios26-card heatmap-card">
            <h3 class="viz-title">本周学习活跃度</h3>
            <div class="heatmap-container">
              <div class="heatmap-row">
                <span class="heatmap-label">周一</span>
                <div class="heatmap-bars">
                  <div v-for="n in 7" :key="n" class="heatmap-bar-wrapper">
                    <div
                      class="heatmap-bar"
                      :style="{ height: getHeatmapHeight(n) }"
                      :class="{ active: isHeatmapActive(n) }"
                    ></div>
                  </div>
                </div>
              </div>
              <div class="heatmap-legend">
                <span class="legend-label">少</span>
                <div class="legend-scale">
                  <div class="legend-bar" style="opacity:0.2"></div>
                  <div class="legend-bar" style="opacity:0.4"></div>
                  <div class="legend-bar" style="opacity:0.6"></div>
                  <div class="legend-bar" style="opacity:0.8"></div>
                  <div class="legend-bar" style="opacity:1"></div>
                </div>
                <span class="legend-label">多</span>
              </div>
            </div>
          </div>

          <!-- 学习类型分布 -->
          <div class="viz-card ios26-card">
            <h3 class="viz-title">学习类型分布</h3>
            <div class="distribution-chart">
              <div class="dist-item">
                <div class="dist-bar-container">
                  <div class="dist-bar" style="--dist-width: 60%; background: linear-gradient(90deg, #4CAF50, #81C784);"></div>
                </div>
                <span class="dist-label">查看学习</span>
                <span class="dist-value">60%</span>
              </div>
              <div class="dist-item">
                <div class="dist-bar-container">
                  <div class="dist-bar" style="--dist-width: 25%; background: linear-gradient(90deg, #2196F3, #64B5F6);"></div>
                </div>
                <span class="dist-label">AI讲解</span>
                <span class="dist-value">25%</span>
              </div>
              <div class="dist-item">
                <div class="dist-bar-container">
                  <div class="dist-bar" style="--dist-width: 15%; background: linear-gradient(90deg, #FF9800, #FFB74D);"></div>
                </div>
                <span class="dist-label">背诵练习</span>
                <span class="dist-value">15%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 学习趋势 -->
      <div class="learning-trends">
        <h2 class="section-title">📈 学习趋势</h2>
        <div class="trend-card">
          <div class="trend-content">
            <div class="trend-chart" v-if="dashboardData.learningTrends.length > 0">
              <div class="chart-shell">
                <div class="chart-bg-grid" aria-hidden="true">
                  <div
                    v-for="i in 5"
                    :key="'gl-' + i"
                    class="chart-grid-line"
                    :style="{ bottom: (i * 20) + '%' }"
                  />
                </div>
                <div
                  class="chart-columns"
                  :style="{
                    gridTemplateColumns: `repeat(${dashboardData.learningTrends.length}, minmax(0, 1fr))`
                  }"
                >
                  <div
                    v-for="(trend, index) in dashboardData.learningTrends"
                    :key="'col-' + index"
                    class="chart-column"
                  >
                    <div class="chart-bar-track">
                      <div
                        class="chart-bar"
                        :class="{ 'chart-bar--empty': !trend.score }"
                        :style="{ height: barHeightPercent(trend.score) }"
                      >
                        <div class="chart-tooltip">
                          {{ trend.date }} · {{ trend.score }}%
                          <template v-if="trend.activePoems != null"> · {{ trend.activePoems }} 首活跃</template>
                        </div>
                      </div>
                    </div>
                    <div class="chart-label">{{ trend.date }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="no-trend-data">
              <p>学习数据正在分析中...</p>
              <p class="trend-tip">随着学习的进行，这里会显示您的学习进度和趋势图表。</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 学习建议（AI） -->
      <div class="learning-suggestions">
        <h2 class="section-title">💡 学习建议</h2>
        <div class="suggestion-card ai-suggestion-card">
          <div class="ai-suggestion-toolbar">
            <p class="ai-suggestion-hint">由 AI 根据您的个人学习记录生成，可多次刷新获取新角度。</p>
            <button
              type="button"
              class="btn-ai-refresh"
              :disabled="aiAdviceLoading"
              @click="fetchAiAdvice"
            >
              {{ aiAdviceLoading ? '生成中…' : (aiAdviceFull ? '重新生成' : '生成学习建议') }}
            </button>
          </div>
          <div v-if="aiAdviceLoading" class="ai-advice-loading">
            <div class="loading-spinner small"></div>
            <span>正在结合您的学习记录分析与写作…</span>
          </div>
          <div v-if="aiAdviceError" class="ai-advice-error" :class="{ 'no-key': aiAdviceErrorCode === 'NO_API_KEY' }">
            <p>{{ aiAdviceError }}</p>
            <p v-if="aiAdviceErrorCode === 'NO_API_KEY'" class="ai-advice-error-sub">
              请在服务器环境变量中配置 <code>ALIYUN_BAILIAN_API_KEY</code> 后重试。
            </p>
          </div>
          <div v-if="aiAdviceData" class="ai-advice-cards">
            <div class="advice-card summary">
              <div class="advice-icon">📊</div>
              <div class="advice-content">
                <h4>学习概况</h4>
                <p>{{ aiAdviceData.summary }}</p>
              </div>
            </div>
            <div class="advice-card strength">
              <div class="advice-icon">💪</div>
              <div class="advice-content">
                <h4>优势亮点</h4>
                <p>{{ aiAdviceData.strength }}</p>
              </div>
            </div>
            <div class="advice-card weakness">
              <div class="advice-icon">🔍</div>
              <div class="advice-content">
                <h4>薄弱环节</h4>
                <p>{{ aiAdviceData.weakness }}</p>
              </div>
            </div>
            <div class="advice-card suggestion">
              <div class="advice-icon">💡</div>
              <div class="advice-content">
                <h4>改进建议</h4>
                <p>{{ aiAdviceData.suggestion }}</p>
              </div>
            </div>
            <div class="advice-card plan">
              <div class="advice-icon">📅</div>
              <div class="advice-content">
                <h4>本周计划</h4>
                <div v-if="Array.isArray(aiAdviceData.plan)" class="plan-list">
                  <div v-for="(item, index) in aiAdviceData.plan" :key="index" class="plan-item">
                    <span class="plan-number">{{ index + 1 }}.</span>
                    <span class="plan-text">{{ item }}</span>
                  </div>
                </div>
                <p v-else>{{ aiAdviceData.plan }}</p>
              </div>
            </div>
            <div class="advice-card encourage">
              <div class="advice-icon">🌟</div>
              <div class="advice-content">
                <h4>激励寄语</h4>
                <p>{{ aiAdviceData.encourage }}</p>
              </div>
            </div>
          </div>
          <div
            v-if="aiAdviceDisplayed && !aiAdviceData"
            class="ai-advice-typewriter ink-paper"
          >{{ aiAdviceDisplayed }}<span v-if="!typewriterDone" class="type-cursor" aria-hidden="true">▍</span></div>
          <div v-if="showFallbackSuggestions" class="suggestion-list fallback-suggestions">
            <p class="fallback-title">{{ aiAdviceErrorCode === 'NO_API_KEY' ? '💡 为您准备的学习建议：' : '以下为系统提示：' }}</p>
            <div
              v-for="(suggestion, index) in fallbackSuggestions"
              :key="'fb-' + index"
              class="suggestion-item"
            >
              <div class="suggestion-icon">{{ suggestion.icon }}</div>
              <div class="suggestion-content">
                <h4>{{ suggestion.title }}</h4>
                <p>{{ suggestion.description }}</p>
                <button
                  v-if="suggestion.action"
                  class="suggestion-action"
                  @click="handleSuggestionAction(suggestion)"
                >
                  {{ suggestion.actionText }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 最近学习记录 -->
      <div class="recent-learnings">
        <h2 class="section-title">📅 最近学习</h2>
        <div class="recent-list">
          <div v-if="dashboardData.recentLearnings.length === 0" class="empty">
            <p>暂无学习记录</p>
          </div>
          <div 
            v-for="(learning, index) in dashboardData.recentLearnings" 
            :key="index"
            class="recent-item"
            @click="navigateToDetail(learning.poem_id)"
          >
            <div class="recent-info">
              <h4>{{ learning.poem_title }}</h4>
              <p class="recent-author">{{ learning.poem_author }}</p>
              <p class="recent-time">{{ formatDate(learning.last_view_time) }}</p>
            </div>
            <div class="recent-stats">
              <span class="stat-item">
                👁️ {{ learning.view_count }}次查看
              </span>
              <span class="stat-item">
                🤖 {{ learning.ai_explain_count }}次AI讲解
              </span>
              <span class="stat-item">
                📝 {{ learning.recite_attempts }}次背诵
              </span>
              <span class="best-score" v-if="learning.best_score > 0">
                最高分: {{ learning.best_score }}%
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 学习目标 -->
      <div class="learning-goals">
        <h2 class="section-title">🎯 学习目标</h2>
        <div class="goals-card">
          <div class="goal-item">
            <div class="goal-header">
              <h3>每日学习</h3>
              <div class="goal-status" :class="{ completed: dashboardData.dailyGoalCompleted }">{{ dashboardData.dailyGoalCompleted ? '已完成' : '进行中' }}</div>
            </div>
            <div class="goal-progress">
              <div class="progress-bar">
                <div class="progress-fill goal" :style="{ width: dashboardData.dailyGoalProgress + '%' }"></div>
              </div>
              <span class="progress-text">{{ dashboardData.dailyGoalProgress }}% 完成</span>
            </div>
            <div class="goal-details">
              <p>今日目标: 学习 3 首诗词</p>
              <p>已完成: {{ dashboardData.dailyPoemsLearned }} 首</p>
            </div>
          </div>
          <div class="goal-item">
            <div class="goal-header">
              <h3>本周目标</h3>
              <div class="goal-status" :class="{ completed: dashboardData.weeklyGoalCompleted }">{{ dashboardData.weeklyGoalCompleted ? '已完成' : '进行中' }}</div>
            </div>
            <div class="goal-progress">
              <div class="progress-bar">
                <div class="progress-fill goal" :style="{ width: dashboardData.weeklyGoalProgress + '%' }"></div>
              </div>
              <span class="progress-text">{{ dashboardData.weeklyGoalProgress }}% 完成</span>
            </div>
            <div class="goal-details">
              <p>本周目标: 学习 15 首诗词</p>
              <p>已完成: {{ dashboardData.weeklyPoemsLearned }} 首</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 创作成长 -->
      <div class="creation-growth">
        <h2 class="section-title">✍️ 创作成长</h2>
        <div class="creation-card">
          <div class="creation-stats-grid">
            <div class="creation-stat-tile">
              <div class="creation-stat-icon">📝</div>
              <div class="creation-stat-body">
                <span class="creation-stat-label">总创作数</span>
                <div class="creation-stat-value-row">
                  <span class="creation-stat-number">{{ creationData.total_creations }}</span>
                  <span class="creation-stat-unit">篇</span>
                </div>
              </div>
            </div>
            <div class="creation-stat-tile">
              <div class="creation-stat-icon">🏆</div>
              <div class="creation-stat-body">
                <span class="creation-stat-label">达标作品</span>
                <div class="creation-stat-value-row">
                  <span class="creation-stat-number">{{ creationData.qualified_works }}</span>
                  <span class="creation-stat-unit">篇</span>
                </div>
                <span class="creation-stat-hint">评分≥60分</span>
              </div>
            </div>
            <div class="creation-stat-tile">
              <div class="creation-stat-icon">📊</div>
              <div class="creation-stat-body">
                <span class="creation-stat-label">平均分</span>
                <div class="creation-stat-value-row">
                  <span class="creation-stat-number">{{ formatCreationAverage(creationData.average_score) }}</span>
                  <span class="creation-stat-unit">分</span>
                </div>
              </div>
            </div>
            <div class="creation-stat-tile">
              <div class="creation-stat-icon">🌟</div>
              <div class="creation-stat-body">
                <span class="creation-stat-label">最高分</span>
                <div class="creation-stat-value-row">
                  <span class="creation-stat-number">{{ creationData.highest_score }}</span>
                  <span class="creation-stat-unit">分</span>
                </div>
              </div>
            </div>
          </div>
          <p v-if="creationData.last_creation_time" class="creation-last">
            最近创作：{{ formatDate(creationData.last_creation_time) }}
          </p>
          <div class="creation-actions">
            <router-link to="/creation" class="btn btn-creation-primary">开始创作</router-link>
            <router-link to="/creation/records" class="btn btn-creation-secondary">查看作品</router-link>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()
const loading = ref(true)
const error = ref('')

// 背景图相关
const backgroundUrl = ref('')
const bgLoaded = ref(false)
const bgTransitioning = ref(false)

const BG_CANDIDATES = [
  './profile-bg/1.jpg',
  './profile-bg/2.jpg',
  './profile-bg/3.jpg',
  './profile-bg/4.jpg',
]
let currentBgIndex = -1

const getRandomBg = () => {
  let newIndex
  do {
    newIndex = Math.floor(Math.random() * BG_CANDIDATES.length)
  } while (newIndex === currentBgIndex && BG_CANDIDATES.length > 1)
  currentBgIndex = newIndex
  return BG_CANDIDATES[newIndex]
}

const onBgLoad = () => {
  nextTick(() => {
    bgLoaded.value = true
    bgTransitioning.value = false
  })
}

const onBgError = () => {
  console.warn('Dashboard Background failed to load, using fallback.')
  bgLoaded.value = true
  bgTransitioning.value = false
}

const getParticleStyle = (n) => {
  const i = n - 1
  const size = 16 + (i % 5) * 8
  const left = (i * 73) % 100
  const top = (i * 47) % 100
  const delay = (i * 0.7) % 5
  const duration = 12 + (i % 10)
  const rotate = (i * 13) % 360
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${left}%`,
    top: `${top}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    transform: `rotate(${rotate}deg)`,
  }
}

const setupCardHoverEffects = () => {
  const cards = document.querySelectorAll('.ios26-card')
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      card.style.setProperty('--mouse-x', `${x}%`)
      card.style.setProperty('--mouse-y', `${y}%`)
    })
  })
}

const cleanupCardHoverEffects = () => {
  const cards = document.querySelectorAll('.ios26-card')
  cards.forEach(card => {
    card.removeEventListener('mousemove', () => {})
  })
}
const dashboardData = ref({
  totalLearned: 0,
  averageScore: 0,
  mistakeCount: 0,
  recentLearnings: [],
  masteryRate: 0,
  streakDays: 0,
  totalStudyTime: 0,
  learningTrends: [],
  dailyGoalCompleted: false,
  dailyGoalProgress: 0,
  dailyPoemsLearned: 0,
  weeklyGoalCompleted: false,
  weeklyGoalProgress: 0,
  weeklyPoemsLearned: 0
})

const aiAdviceLoading = ref(false)
const aiAdviceError = ref('')
const aiAdviceErrorCode = ref('')
const aiAdviceFull = ref('')
const aiAdviceDisplayed = ref('')
const aiAdviceData = ref(null)
const typewriterDone = ref(true)
const fallbackSuggestions = ref([])
let typeTimer = null

const showFallbackSuggestions = computed(
  () => fallbackSuggestions.value.length > 0 && !aiAdviceFull.value && !aiAdviceLoading.value && !aiAdviceData.value
)

const barHeightPercent = (score) => {
  const s = Math.max(0, Math.min(100, Number(score) || 0))
  return `${s}%`
}

// 环形图（--ring-percent 须带 %，conic-gradient 才能正确断点）
const getRingStyle = (percent, color) => {
  const p = Math.max(0, Math.min(100, Number(percent) || 0))
  return {
    '--ring-percent': `${p}%`,
    '--ring-color': color,
  }
}

// 热力图高度计算
const getHeatmapHeight = (day) => {
  const trends = dashboardData.value.learningTrends || []
  if (day <= trends.length) {
    const trend = trends[trends.length - day]
    if (trend && trend.activePoems > 0) {
      return Math.min(100, trend.activePoems * 30) + '%'
    }
  }
  return '10%'
}

const isHeatmapActive = (day) => {
  const trends = dashboardData.value.learningTrends || []
  if (day <= trends.length) {
    const trend = trends[trends.length - day]
    return trend && trend.activePoems > 0
  }
  return false
}

const buildFallbackSuggestions = (data) => {
  const suggestions = []
  const avgScore = data.averageScore || 0
  const totalLearned = data.totalLearned || 0
  const masteryRate = data.masteryRate || 0

  if (totalLearned === 0) {
    suggestions.push({
      icon: '📚',
      title: '开始您的诗词学习之旅',
      description: '从今天起，每天学习一首诗词，养成良好的学习习惯。推荐从简单的五言绝句开始。',
      action: null,
      actionText: ''
    })
  } else {
    if (avgScore < 80) {
      suggestions.push({
        icon: '🎯',
        title: '加强背诵训练',
        description: `您的平均背诵得分是${avgScore}%，建议每天花10分钟复习已学诗词，重点关注得分较低的篇目。`,
        action: null,
        actionText: ''
      })
    }
    if (masteryRate < 60) {
      suggestions.push({
        icon: '🔄',
        title: '巩固薄弱诗词',
        description: `您的掌握率为${masteryRate}%，建议回顾错题本，对未完全掌握的诗词进行针对性复习。`,
        action: null,
        actionText: ''
      })
    }
  }

  suggestions.push({
    icon: '🔥',
    title: '保持学习节奏',
    description: '每天坚持学习一首新诗词，并复习一首旧诗词，循序渐进才能事半功倍。',
    action: null,
    actionText: ''
  })

  if (totalLearned > 0) {
    suggestions.push({
      icon: '✨',
      title: '探索新领域',
      description: `您已学习${totalLearned}首诗词，不妨尝试不同题材，如山水诗、边塞诗等，拓展诗词视野。`,
      action: null,
      actionText: ''
    })
  }

  return suggestions.slice(0, 4)
}

const runTypewriter = (text) => {
  clearInterval(typeTimer)
  typewriterDone.value = false
  aiAdviceDisplayed.value = ''
  if (!text) {
    typewriterDone.value = true
    return
  }
  let i = 0
  const chunk = 2
  const tick = 14
  typeTimer = setInterval(() => {
    if (i >= text.length) {
      clearInterval(typeTimer)
      typewriterDone.value = true
      return
    }
    aiAdviceDisplayed.value += text.slice(i, i + chunk)
    i += chunk
  }, tick)
}

const fetchAiAdvice = async () => {
  clearInterval(typeTimer)
  typeTimer = null
  aiAdviceLoading.value = true
  aiAdviceError.value = ''
  aiAdviceErrorCode.value = ''
  fallbackSuggestions.value = []
  aiAdviceFull.value = ''
  aiAdviceDisplayed.value = ''
  aiAdviceData.value = null
  typewriterDone.value = true
  try {
    const res = await api.learn.aiSuggestions()
    if (res.success && res.data?.content) {
      const content = res.data.content
      if (typeof content === 'object' && content.summary) {
        aiAdviceData.value = content
        aiAdviceFull.value = 'loaded'
      } else {
        aiAdviceFull.value = content
        runTypewriter(content)
      }
    } else {
      throw new Error(res.message || '未返回建议内容')
    }
  } catch (e) {
    aiAdviceFull.value = ''
    aiAdviceDisplayed.value = ''
    aiAdviceData.value = null
    typewriterDone.value = true
    let errorMsg = e.message || '生成学习建议失败'
    if (e.code === 'NO_API_KEY' || errorMsg.includes('API') || errorMsg.includes('未配置')) {
      errorMsg = 'AI 服务暂不可用，已为您准备学习提示'
      aiAdviceErrorCode.value = 'NO_API_KEY'
    }
    aiAdviceError.value = errorMsg
    fallbackSuggestions.value = buildFallbackSuggestions(dashboardData.value)
  } finally {
    aiAdviceLoading.value = false
  }
}

const creationData = ref({
  total_creations: 0,
  qualified_works: 0,
  average_score: 0,
  highest_score: 0,
  last_creation_time: null
})

/** 已学诗词环形进度：与上方统计卡一致，20 首视为占满 100% */
const corePoemsRingPercent = computed(() =>
  Math.min(100, Math.round((dashboardData.value.totalLearned || 0) * 5))
)

const coreMetricBars = computed(() => {
  const d = dashboardData.value
  const score = Math.max(0, Math.min(100, Number(d.averageScore) || 0))
  const mastery = Math.max(0, Math.min(100, Number(d.masteryRate) || 0))
  const poemsPct = Math.min(100, Math.round(((d.totalLearned || 0) / 20) * 100))
  return [
    {
      key: 'score',
      label: '背诵得分',
      pct: score,
      display: `${Math.round(score)}%`,
      gradient: 'linear-gradient(90deg, #4CAF50, #81C784)',
    },
    {
      key: 'mastery',
      label: '掌握率',
      pct: mastery,
      display: `${Math.round(mastery)}%`,
      gradient: 'linear-gradient(90deg, #2196F3, #64B5F6)',
    },
    {
      key: 'poems',
      label: '诗词覆盖面（20 首满）',
      pct: poemsPct,
      display: `${d.totalLearned || 0} 首`,
      gradient: 'linear-gradient(90deg, #FF9800, #FFB74D)',
    },
  ]
})

/**
 * 雷达六维 0–100，顺序与顶点一致：背诵、理解、记忆、坚持、应用、创作
 * （旧版「坚持」误用 streakDays 且前端写死为 0；「创作」写死 50，导致图形畸形）
 */
const radarValues = computed(() => {
  const d = dashboardData.value
  const c = creationData.value
  const recent = d.recentLearnings || []
  const trends = d.learningTrends || []

  const recitation = Math.max(0, Math.min(100, Number(d.averageScore) || 0))

  let understanding = 0
  if (recent.length) {
    let sum = 0
    for (const r of recent) {
      const v = Math.max(1, Number(r.view_count) || 0)
      const ai = Number(r.ai_explain_count) || 0
      sum += Math.min(1, ai / v)
    }
    understanding = Math.round((sum / recent.length) * 100)
  } else {
    understanding = Math.round(Math.max(0, Math.min(100, (Number(d.masteryRate) || 0) * 0.75)))
  }

  const memoryBreadth = Math.min(100, Math.round(((Number(d.totalLearned) || 0) / 20) * 100))

  const nDays = Math.max(trends.length, 1)
  const activeDays = trends.filter(
    (t) => (Number(t.activePoems) || 0) > 0 || (Number(t.score) || 0) > 0
  ).length
  const persistence = Math.round((activeDays / nDays) * 100)

  const tl = Math.max(Number(d.totalLearned) || 0, 0)
  const mc = Number(d.mistakeCount) || 0
  const application =
    tl > 0
      ? Math.max(0, Math.min(100, Math.round((1 - Math.min(mc, tl) / tl) * 100)))
      : 0

  let creation = 0
  if (Number(c.total_creations) > 0) {
    const avg = Number(c.average_score) || 0
    const hi = Number(c.highest_score) || 0
    creation = Math.round(Math.min(100, avg > 0 ? avg : hi))
  }

  return [recitation, understanding, memoryBreadth, persistence, application, creation]
})

const radarCoords = computed(() => {
  const values = radarValues.value
  const center = { x: 100, y: 100 }
  const maxRadius = 80
  return values.map((val, i) => {
    const angle = (i * 60 - 90) * (Math.PI / 180)
    const radius = (Math.max(0, Math.min(100, val)) / 100) * maxRadius
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    }
  })
})

const radarPolygonPoints = computed(() =>
  radarCoords.value.map((c) => `${c.x},${c.y}`).join(' ')
)

const lastUpdatedTime = ref('')
let refreshTimer = null
const aiAdviceSeeded = ref(false)

const fetchDashboardData = async () => {
  loading.value = true
  error.value = ''
  
  try {
    // 获取学习数据
    const response = await api.learn.dashboard()
    const data = response.data
    
    // 填充数据（学习趋势由后端按最近 7 天真实记录聚合）
    dashboardData.value = {
      ...data,
      streakDays: 0, // 这里可以根据实际数据计算
      totalStudyTime: data.totalStudyTime ?? 0,
      learningTrends: Array.isArray(data.learningTrends) ? data.learningTrends : [],
      dailyGoalCompleted: data.totalLearned >= 3,
      dailyGoalProgress: Math.min((data.totalLearned / 3) * 100, 100),
      dailyPoemsLearned: data.totalLearned,
      weeklyGoalCompleted: data.totalLearned >= 15,
      weeklyGoalProgress: Math.min((data.totalLearned / 15) * 100, 100),
      weeklyPoemsLearned: data.totalLearned
    }
    
    // 获取创作成长数据（与 user_creations 一致，走统一 API 与动态端口）
    try {
      const creationResult = await api.creationWorkbench.getStats()
      if (creationResult.success && creationResult.data) {
        creationData.value = {
          total_creations: creationResult.data.total_creations ?? 0,
          qualified_works: creationResult.data.qualified_works ?? 0,
          average_score: creationResult.data.average_score ?? 0,
          highest_score: creationResult.data.highest_score ?? 0,
          last_creation_time: creationResult.data.last_creation_time ?? null
        }
      }
    } catch (creationError) {
      console.error('获取创作成长数据失败:', creationError)
      creationData.value = {
        total_creations: 0,
        qualified_works: 0,
        average_score: 0,
        highest_score: 0,
        last_creation_time: null
      }
    }

    if (!aiAdviceSeeded.value) {
      aiAdviceSeeded.value = true
      fetchAiAdvice()
    }
  } catch (err) {
    console.error('获取仪表盘数据失败:', err)
    error.value = '获取仪表盘数据失败'
    // 使用模拟数据作为备份
    useMockData()
  } finally {
    loading.value = false
    // 更新最后更新时间
    lastUpdatedTime.value = new Date().toLocaleString('zh-CN')
  }
}

const useMockData = () => {
  // 模拟数据，确保仪表盘能正常显示
  dashboardData.value = {
    totalLearned: 45,
    averageScore: 85,
    mistakeCount: 3,
    recentLearnings: [
      {
        poem_id: 1,
        poem_title: '静夜思',
        poem_author: '李白',
        last_view_time: new Date().toISOString(),
        view_count: 12,
        ai_explain_count: 3,
        recite_attempts: 5,
        best_score: 95
      },
      {
        poem_id: 2,
        poem_title: '望庐山瀑布',
        poem_author: '李白',
        last_view_time: new Date(Date.now() - 86400000).toISOString(),
        view_count: 8,
        ai_explain_count: 2,
        recite_attempts: 3,
        best_score: 88
      },
      {
        poem_id: 3,
        poem_title: '春晓',
        poem_author: '孟浩然',
        last_view_time: new Date(Date.now() - 172800000).toISOString(),
        view_count: 15,
        ai_explain_count: 4,
        recite_attempts: 6,
        best_score: 92
      }
    ],
    masteryRate: 75,
    streakDays: 5,
    totalStudyTime: 45,
    learningTrends: [
      { date: '03-19', score: 62, activePoems: 1 },
      { date: '03-20', score: 0, activePoems: 0 },
      { date: '03-21', score: 71, activePoems: 2 },
      { date: '03-22', score: 0, activePoems: 0 },
      { date: '03-23', score: 78, activePoems: 1 },
      { date: '03-24', score: 0, activePoems: 0 },
      { date: '03-25', score: 85, activePoems: 3 }
    ],
    dailyGoalCompleted: false,
    dailyGoalProgress: 66,
    dailyPoemsLearned: 2,
    weeklyGoalCompleted: false,
    weeklyGoalProgress: 60,
    weeklyPoemsLearned: 9
  }
  
  creationData.value = {
    total_creations: 0,
    qualified_works: 0,
    average_score: 0,
    highest_score: 0,
    last_creation_time: null
  }
}

const formatCreationAverage = (n) => {
  if (n == null || Number.isNaN(Number(n))) return '0.0'
  return Number(n).toFixed(1)
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const navigateToDetail = (poemId) => {
  router.push(`/poem/${poemId}`)
}

const handleSuggestionAction = (suggestion) => {
  if (suggestion.action && suggestion.action === 'navigateToDetail') {
    navigateToDetail(suggestion.actionParams)
  }
}

onMounted(() => {
  backgroundUrl.value = getRandomBg()
  fetchDashboardData()
  
  // 等待DOM更新后设置卡片效果
  nextTick(() => {
    setupCardHoverEffects()
  })
  
  // 设置定时刷新，每30秒自动刷新一次数据
  refreshTimer = setInterval(() => {
    fetchDashboardData()
  }, 30000)
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  if (typeTimer) {
    clearInterval(typeTimer)
  }
  cleanupCardHoverEffects()
})
</script>

<style scoped>
.learning-dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
}

/* 背景容器 */
.dashboard-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.bg-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.1) brightness(1.05);
  opacity: 0;
  transition: opacity 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bg-image-visible {
  opacity: 1;
}

.bg-transitioning .bg-image {
  opacity: 0;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.45) 100%);
  z-index: 1;
}

.bg-particle {
  position: absolute;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  filter: blur(1px);
  animation: floatParticle 15s ease-in-out infinite;
  z-index: 2;
}

@keyframes floatParticle {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  50% { transform: translateY(-30px) translateX(10px); }
}

.dashboard-container {
  position: relative;
  z-index: 10;
}

/* iOS 26 液态玻璃卡片样式 */
:root {
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.14);
  --glass-blur: 24px;
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  --liquid-duration: 0.5s;
  --liquid-ease: cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ios26-card {
  position: relative;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow: var(--glass-shadow);
  overflow: hidden;
  transition: transform 0.4s var(--liquid-ease),
              box-shadow 0.4s var(--liquid-ease);
  animation: cardEntrance 0.6s var(--liquid-ease) both;
}

@keyframes cardEntrance {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.ios26-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, transparent 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: 3;
}

.ios26-card::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.18) 0%, transparent 40%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 4;
}

.ios26-card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 16px 48px rgba(0,0,0,0.25), 0 0 40px rgba(102,126,234,0.1);
  border-color: rgba(255,255,255,0.28);
}

.ios26-card:hover::before { opacity: 1; }
.ios26-card:hover::after { opacity: 1; }

/* 液态边框 */
.liquid-border {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.18) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  z-index: 1;
}

/* 液态光泽 */
.liquid-shine {
  position: absolute;
  top: -60%;
  left: -60%;
  width: 220%;
  height: 220%;
  background: conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.05) 60deg, transparent 120deg, rgba(255,255,255,0.03) 180deg, transparent 240deg, rgba(255,255,255,0.05) 300deg, transparent 360deg);
  animation: liquidShimmer 8s linear infinite;
  pointer-events: none;
  z-index: 0;
  border-radius: 50%;
}

@keyframes liquidShimmer {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.ios26-card:hover .liquid-shine {
  animation-duration: 3s;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  flex-wrap: wrap;
  gap: 20px;
}

.page-title {
  font-size: 28px;
  color: #ffffff;
  font-weight: bold;
  margin: 0;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.refresh-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.last-updated {
  font-size: 14px;
  color: rgba(255, 248, 240, 0.85);
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.refresh-btn {
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 8px;
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .refresh-section {
    width: 100%;
    justify-content: space-between;
  }
  
  .page-title {
    font-size: 24px;
  }
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(139, 69, 19, 0.1);
  border-top: 4px solid #8b4513;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  text-align: center;
  padding: 40px 0;
  color: #f44336;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.stat-card {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--card-accent, #8b4513), transparent);
  opacity: 0.8;
}

.stat-card.learned { --card-accent: #4CAF50; }
.stat-card.score { --card-accent: #2196F3; }
.stat-card.mistake { --card-accent: #f44336; }
.stat-card.mastery { --card-accent: #9C27B0; }
.stat-card.streak { --card-accent: #FF9800; }
.stat-card.time { --card-accent: #00BCD4; }

.stat-icon {
  font-size: 40px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  position: relative;
  z-index: 10;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-content {
  flex: 1;
  position: relative;
  z-index: 10;
}

.stat-content h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #ffffff;
  font-weight: 500;
}

.stat-number {
  margin: 0 0 4px 0;
  font-size: 32px;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.stat-desc {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.section-title {
  font-size: 20px;
  color: #ffffff;
  margin-bottom: 20px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
}

.recent-learnings {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: var(--glass-shadow);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recent-item {
  background: rgba(255, 252, 240, 0.2);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.recent-item:hover {
  transform: translateY(-4px);
  background: rgba(255, 252, 240, 0.3);
  box-shadow: 0 8px 16px rgba(31, 38, 135, 0.1);
}

.recent-info {
  flex: 1;
}

.recent-info h4 {
  margin: 0 0 4px 0;
  font-size: 18px;
  color: #ffffff;
}

.recent-author {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}

.recent-time {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.recent-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.stat-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 252, 240, 0.3);
  padding: 4px 8px;
  border-radius: 12px;
}

.best-score {
  font-size: 14px;
  font-weight: bold;
  color: #4CAF50;
  margin-top: 8px;
}

.learning-trends {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: var(--glass-shadow);
}

.trend-card {
  background: rgba(255, 252, 240, 0.2);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
}

.trend-content p {
  margin: 0 0 16px 0;
  color: rgba(255, 255, 255, 0.9);
}

.trend-tip {
  font-style: italic;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.empty {
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.8);
}

/* 数据可视化区域 */
.visualization-section {
  margin-bottom: 0;
}

.viz-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 900px) {
  .viz-grid {
    grid-template-columns: 1fr;
  }
}

.viz-card {
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.viz-title {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #ffffff;
  font-weight: 600;
}

.viz-hint {
  margin: -8px 0 16px;
  font-size: 12px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.72);
}

.core-metrics-layout {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.core-bar-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.core-bar-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(120px, 2fr) auto;
  align-items: center;
  gap: 10px 14px;
}

.core-bar-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.88);
  font-weight: 500;
}

.core-bar-track {
  height: 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}

.core-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.45s ease;
}

.core-bar-value {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  min-width: 3.2em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 480px) {
  .core-bar-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .core-bar-value {
    text-align: left;
  }
}

/* 环形图样式 */
.ring-charts {
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 16px;
}

.ring-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.ring-chart {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: conic-gradient(
    var(--ring-color) var(--ring-percent),
    rgba(255, 255, 255, 0.14) var(--ring-percent)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.5s ease;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
}

.ring-chart::before {
  content: '';
  position: absolute;
  width: 60px;
  height: 60px;
  background: rgba(14, 18, 28, 0.88);
  border-radius: 50%;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.ring-value {
  position: relative;
  z-index: 2;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.ring-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

/* 雷达图样式 */
.radar-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.radar-svg {
  width: 100%;
  max-width: 240px;
  height: auto;
}

.radar-label {
  font-size: 10px;
  fill: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

/* 热力图样式 */
.heatmap-card {
  grid-column: span 2;
}

@media (max-width: 900px) {
  .heatmap-card {
    grid-column: span 1;
  }
}

.heatmap-container {
  padding: 10px 0;
}

.heatmap-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.heatmap-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  width: 40px;
  flex-shrink: 0;
}

.heatmap-bars {
  flex: 1;
  display: flex;
  gap: 8px;
  align-items: flex-end;
  justify-content: center;
}

.heatmap-bar-wrapper {
  flex: 1;
  max-width: 60px;
  height: 80px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.heatmap-bar {
  width: 100%;
  height: 20%;
  background: linear-gradient(180deg, rgba(139, 69, 19, 0.6), rgba(139, 69, 19, 0.3));
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
  min-height: 4px;
}

.heatmap-bar.active {
  background: linear-gradient(180deg, #8b4513, #a0522d);
}

.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}

.legend-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

.legend-scale {
  display: flex;
  gap: 2px;
}

.legend-bar {
  width: 16px;
  height: 10px;
  background: rgba(139, 69, 19, 0.4);
  border-radius: 2px;
}

/* 分布图样式 */
.distribution-chart {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dist-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
}

.dist-bar-container {
  height: 12px;
  background: rgba(139, 69, 19, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.dist-bar {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease;
  width: var(--dist-width);
}

.dist-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  min-width: 60px;
}

.dist-value {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  min-width: 40px;
  text-align: right;
}

.stat-progress {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(139, 69, 19, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
  background: #8b4513;
}

.progress-fill.score {
  background: #4CAF50;
}

.progress-fill.mistake {
  background: #f44336;
}

.progress-fill.mastery {
  background: #2196F3;
}

.progress-fill.streak {
  background: #FF9800;
}

.progress-fill.time {
  background: #9C27B0;
}

.progress-fill.goal {
  background: #00BCD4;
}

.progress-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  text-align: right;
}

.chart-shell {
  position: relative;
  width: 100%;
  height: 300px;
  box-sizing: border-box;
  overflow: hidden;
}

.chart-bg-grid {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 36px;
  top: 12px;
  z-index: 1;
  pointer-events: none;
}

.chart-grid-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(139, 69, 19, 0.12);
}

.chart-columns {
  position: relative;
  z-index: 2;
  display: grid;
  height: 100%;
  align-items: stretch;
  gap: 4px;
  padding: 12px 8px 4px;
  box-sizing: border-box;
}

.chart-column {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
  height: 100%;
}

.chart-bar-track {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  border-bottom: 1px solid rgba(139, 69, 19, 0.18);
  padding: 0 2px 0;
}

.chart-bar {
  width: min(52%, 32px);
  border-radius: 6px 6px 2px 2px;
  background: linear-gradient(180deg, #a0522d 0%, #8b4513 100%);
  transition: height 0.35s ease;
  cursor: pointer;
  position: relative;
  box-shadow: 0 2px 8px rgba(139, 69, 19, 0.15);
}

.chart-bar--empty {
  min-height: 0;
  height: 0 !important;
  box-shadow: none;
  pointer-events: none;
}

.chart-bar:not(.chart-bar--empty) {
  min-height: 4px;
}

.chart-bar:hover {
  filter: brightness(1.06);
}

.chart-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-6px);
  background: rgba(44, 36, 28, 0.92);
  color: #fff8f0;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.25s ease;
  z-index: 10;
  pointer-events: none;
  max-width: 200px;
}

.chart-bar:not(.chart-bar--empty):hover .chart-tooltip {
  opacity: 1;
}

.chart-label {
  flex-shrink: 0;
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
  line-height: 1.2;
  word-break: keep-all;
}

.ai-suggestion-card {
  text-align: left;
}

.ai-suggestion-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.ai-suggestion-hint {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
  min-width: 200px;
}

.btn-ai-refresh {
  background: linear-gradient(135deg, #8b4513 0%, #6d3710 100%);
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition, transform 0.2s ease, box-shadow 0.2s ease);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.2);
}

.btn-ai-refresh:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(139, 69, 19, 0.28);
}

.btn-ai-refresh:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.ai-advice-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.loading-spinner.small {
  width: 22px;
  height: 22px;
  border-width: 3px;
}

.ai-advice-error {
  padding: 16px;
  background: rgba(244, 67, 54, 0.06);
  border: 1px solid rgba(244, 67, 54, 0.2);
  border-radius: 10px;
  color: #c62828;
  font-size: 14px;
  margin-bottom: 12px;
}

.ai-advice-error.no-key {
  background: rgba(255, 152, 0, 0.08);
  border-color: rgba(255, 152, 0, 0.3);
  color: #e65100;
}

.ai-advice-error-sub {
  margin: 8px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.ai-advice-error-sub code {
  font-size: 12px;
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}

.ai-advice-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.advice-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(255, 252, 240, 0.95) 0%, rgba(250, 245, 235, 0.9) 100%);
  border: 1px solid rgba(139, 69, 19, 0.15);
  border-radius: 10px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.advice-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.12);
}

.advice-card .advice-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.advice-card .advice-content h4 {
  margin: 0 0 4px;
  font-size: 13px;
  color: #8b4513;
  font-weight: 600;
}

.advice-card .advice-content p {
  margin: 0;
  font-size: 12px;
  color: #5d4e37;
  line-height: 1.5;
}

.advice-card.summary { border-left: 3px solid #4CAF50; }
.advice-card.strength { border-left: 3px solid #2196F3; }
.advice-card.weakness { border-left: 3px solid #FF9800; }
.advice-card.suggestion { border-left: 3px solid #9C27B0; }
.advice-card.plan { border-left: 3px solid #00BCD4; }
.advice-card.encourage { border-left: 3px solid #E91E63; }

.plan-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.plan-item {
  display: flex;
  margin-bottom: 6px;
  align-items: flex-start;
}

.plan-number {
  font-weight: bold;
  margin-right: 8px;
  color: #00BCD4;
  min-width: 20px;
  font-size: 12px;
}

.plan-text {
  flex: 1;
  line-height: 1.4;
  font-size: 12px;
  color: #5d4e37;
}

@media (max-width: 900px) {
  .ai-advice-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .ai-advice-cards {
    grid-template-columns: 1fr;
  }
}

.ai-advice-typewriter.ink-paper {
  margin-top: 8px;
  padding: 20px 22px;
  min-height: 120px;
  background: linear-gradient(180deg, rgba(255, 252, 240, 0.95) 0%, rgba(250, 245, 235, 0.9) 100%);
  border: 1px solid rgba(139, 69, 19, 0.15);
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.75;
  color: #3e3428;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Georgia', 'Noto Serif SC', 'Songti SC', serif;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.type-cursor {
  display: inline-block;
  margin-left: 2px;
  color: #8b4513;
  animation: ink-blink 1s step-end infinite;
  font-weight: 300;
}

@keyframes ink-blink {
  50% {
    opacity: 0;
  }
}

.fallback-suggestions {
  margin-top: 20px;
}

.fallback-title {
  margin: 0 0 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.learning-suggestions {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: var(--glass-shadow);
}

.suggestion-card {
  background: rgba(255, 252, 240, 0.2);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 24px;
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.suggestion-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  transition: var(--transition);
}

.suggestion-item:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.suggestion-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 69, 19, 0.1);
  border-radius: 50%;
  flex-shrink: 0;
}

.suggestion-content {
  flex: 1;
}

.suggestion-content h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #ffffff;
}

.suggestion-content p {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}

.suggestion-action {
  background: #8b4513;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition);
}

.suggestion-action:hover {
  background: #a0522d;
  transform: translateY(-2px);
}

.learning-goals {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: var(--glass-shadow);
}

.goals-card {
  background: rgba(255, 252, 240, 0.2);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 24px;
}

.goal-item {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(139, 69, 19, 0.1);
}

.goal-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.goal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #ffffff;
}

.goal-status {
  font-size: 14px;
  padding: 4px 12px;
  border-radius: 12px;
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.goal-status.completed {
  background: rgba(76, 175, 80, 0.2);
  font-weight: bold;
}

.goal-progress {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.goal-details {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.creation-growth {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: var(--glass-shadow);
}

.creation-card {
  background: rgba(255, 252, 240, 0.25);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 20px 20px 16px;
}

.creation-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.creation-stat-tile {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(139, 69, 19, 0.12);
  border-radius: 12px;
  min-height: 88px;
  transition: var(--transition);
}

.creation-stat-tile:hover {
  background: rgba(255, 255, 255, 0.5);
  border-color: rgba(139, 69, 19, 0.2);
  transform: translateY(-2px);
}

.creation-stat-tile .creation-stat-icon {
  font-size: 28px;
  line-height: 1;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 69, 19, 0.08);
  border-radius: 12px;
  flex-shrink: 0;
}

.creation-stat-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.creation-stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.creation-stat-value-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: nowrap;
}

.creation-stat-number {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
}

.creation-stat-unit {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
}

.creation-stat-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  margin-top: 2px;
}

.creation-last {
  margin: 14px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
}

.creation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 18px;
  padding-top: 4px;
}

.btn-creation-primary,
.btn-creation-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 132px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: var(--transition);
  border: 1px solid transparent;
}

.btn-creation-primary {
  background: linear-gradient(135deg, #8b4513 0%, #a0522d 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.25);
}

.btn-creation-primary:hover {
  filter: brightness(1.05);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(139, 69, 19, 0.3);
}

.btn-creation-secondary {
  background: rgba(255, 255, 255, 0.6);
  color: #8b4513;
  border-color: rgba(139, 69, 19, 0.35);
}

.btn-creation-secondary:hover {
  background: rgba(255, 252, 240, 0.9);
  border-color: #8b4513;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .learning-dashboard {
    padding: 15px;
  }

  .page-title {
    font-size: 24px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .creation-stats-grid {
    grid-template-columns: 1fr;
  }

  .creation-actions {
    flex-direction: column;
  }

  .btn-creation-primary,
  .btn-creation-secondary {
    width: 100%;
  }

  .stat-card {
    flex-direction: column;
    text-align: center;
  }

  .recent-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .recent-stats {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chart-shell {
    height: 220px;
  }

  .chart-label {
    font-size: 10px;
  }

  .goal-details {
    flex-direction: column;
    gap: 4px;
  }

  .viz-grid {
    grid-template-columns: 1fr;
  }

  .ring-charts {
    flex-wrap: wrap;
  }
}
</style>
