<template>
  <section class="ai-personalized-section" aria-labelledby="ai-title">
    <div class="ai-shell">
      <div class="ai-heading">
        <div><span class="eyebrow">YOUR LEARNING COMPASS</span><h2 id="ai-title">AI 建议</h2><p>把学习记录变成看得见的判断，再把判断变成今天能完成的一小步。</p></div>
        <button v-if="userStore.isLoggedIn" class="outline-button" :disabled="dashboardLoading" @click="fetchDashboard(true)"><ArrowsClockwise :size="15" />{{ dashboardLoading ? '正在更新' : '更新建议' }}</button>
        <span v-else class="ai-badge">AI 学习助手</span>
      </div>

      <div v-if="userStore.loading || dashboardLoading && !dashboard" class="ai-state">正在读取你的学习状态与知识掌握度...</div>
      <div v-else-if="!userStore.isLoggedIn" class="login-card"><div class="assistant-mark"><Brain :size="22" weight="duotone" /></div><div><strong>登录后，让学习建议真正属于你</strong><p>同步背诵、错题、闯关与知识掌握度，生成动态学习路线。</p></div><button class="primary-button" @click="$router.push('/login')">登录查看 <ArrowUpRight :size="15" /></button></div>
      <div v-else-if="error" class="ai-state ai-error"><WarningCircle :size="18" /><span>{{ error }}</span><button class="outline-button" @click="fetchDashboard(false)">重新加载</button></div>

      <div v-else-if="dashboard" class="ai-content">
        <article class="advisor-hero">
          <div class="advisor-orbit"><div class="assistant-mark"><Sparkle :size="23" weight="fill" /></div><span>AI</span></div>
          <div class="advisor-copy"><span class="brief-label">{{ greeting }} · 你的学习导航</span><SafeMarkdown class="ai-markdown ai-headline-markdown" :content="dashboard.advice.headline" /><SafeMarkdown class="ai-markdown" :content="dashboard.advice.observation" /></div>
          <button class="primary-button" @click="goToAction(primaryAction)">{{ primaryAction.cta }} <ArrowUpRight :size="15" /></button>
        </article>

        <section class="learning-snapshot" aria-label="学习快照">
          <div class="snapshot-copy"><div class="section-kicker"><ChartLineUp :size="17" /> 学习快照</div><SafeMarkdown class="ai-markdown snapshot-title-markdown" :content="dashboard.advice.focusTitle" /><SafeMarkdown class="ai-markdown" :content="dashboard.advice.focusDetail" /><div class="metric-grid"><div><strong>{{ dashboard.profile.totalLearned }}</strong><span>已学诗词</span></div><div><strong>{{ dashboard.profile.averageScore || '—' }}</strong><span>平均得分</span></div><div><strong>{{ dashboard.profile.masteryRate }}%</strong><span>掌握率</span></div><div><strong>{{ dashboard.profile.weeklyActiveDays }}/7</strong><span>本周学习</span></div></div></div>
          <div class="trend-card"><div class="chart-heading"><div><strong>近 7 日学习轨迹</strong><span>点位表示每日学习事件数</span></div><span class="chart-value">{{ weeklyActivity }} 次</span></div><div ref="trendChart" class="trend-chart" aria-label="近七日学习活动趋势图"></div></div>
        </section>

        <section class="intelligence-grid">
          <article class="insight-card"><div class="card-heading"><div><span class="icon-square"><Compass :size="17" /></span><div><h3>能力坐标</h3><p>来自练习与知识掌握度的综合画像</p></div></div><button @click="$router.push('/dashboard')">查看详情 <ArrowUpRight :size="13" /></button></div><div class="ability-list"><div v-for="dimension in dashboard.profile.dimensions" :key="dimension.key" class="ability-row"><span>{{ dimension.label }}</span><div class="ability-track"><i :style="{ width: dimension.score + '%' }"></i></div><strong>{{ dimension.score }}</strong></div></div><SafeMarkdown class="ai-markdown card-footnote" :content="`优先练习 **${focusDimension.label}**，先把最需要的能力练稳。`" /></article>
          <article class="insight-card"><div class="card-heading"><div><span class="icon-square warm"><CheckCircle :size="17" /></span><div><h3>现在就做</h3><p>每一步都来自你的当前学习画像</p></div></div><span class="action-count">{{ dashboard.advice.quickActions.length }} 件</span></div><button v-for="(action, index) in dashboard.advice.quickActions" :key="action.title" class="action-row" @click="goToAction(action)"><span class="action-index">0{{ index + 1 }}</span><div class="action-copy"><SafeMarkdown class="ai-markdown action-title-markdown" :content="action.title" /><SafeMarkdown class="ai-markdown action-detail-markdown" :content="action.detail" /></div><ArrowUpRight :size="16" /></button></article>
        </section>

        <section class="roadmap-card" aria-labelledby="roadmap-title">
          <div class="roadmap-heading"><div><span class="section-kicker"><Sparkle :size="16" /> AI 学习路线</span><h3 id="roadmap-title">把建议落到接下来的每一天</h3></div><p>路线会随新学习记录自动调整</p></div>
          <div class="roadmap-list"><article v-for="(stage, index) in dashboard.advice.roadmap" :key="stage.phase + stage.title" class="roadmap-stage"><div class="stage-index"><span>0{{ index + 1 }}</span><i></i></div><div class="stage-copy"><span>{{ stage.phase }}</span><SafeMarkdown class="ai-markdown stage-title-markdown" :content="stage.title" /><SafeMarkdown class="ai-markdown" :content="stage.objective" /><SafeMarkdown class="ai-markdown stage-tasks-markdown" :content="formatTasks(stage.tasks)" /></div></article></div>
          <footer class="roadmap-footer"><span>AI 寄语</span><SafeMarkdown class="ai-markdown" :content="dashboard.advice.encouragement" /><em>{{ dashboard.source === 'llm' ? '基于大模型分析与实时学习数据' : '基于实时学习数据生成' }}</em></footer>
        </section>

        <section class="recommendation-grid">
          <article class="recommendation-panel"><div class="card-heading"><div><span class="icon-square"><ArrowsClockwise :size="17" /></span><div><h3>复习清单</h3><p>把快要忘记的，及时捡回来</p></div></div><button @click="$router.push('/challenge/review')">错题本 <ArrowUpRight :size="13" /></button></div><div v-if="reviewLoading" class="panel-state">正在读取复习节奏...</div><div v-else-if="reviewItems.length === 0" class="panel-state">暂时没有需要优先复习的诗词。</div><button v-for="(item, index) in reviewItems.slice(0, 3)" :key="item.poem_id || index" class="recommend-row" @click="navigateToDetail(item.poem_id)"><span>0{{ index + 1 }}</span><div><strong>{{ item.title }}</strong><small>{{ item.author }} · {{ item.reason || '根据最近记录推荐' }}</small></div><em>复习</em></button></article>
          <article class="recommendation-panel"><div class="card-heading"><div><span class="icon-square warm"><Sparkle :size="17" /></span><div><h3>向前一步</h3><p>选择适合当下的新诗开始阅读</p></div></div><button @click="$router.push('/search')">去探索 <ArrowUpRight :size="13" /></button></div><div v-if="learnLoading" class="panel-state">正在挑选下一首...</div><div v-else-if="learnItems.length === 0" class="panel-state">完成今日学习后，这里会出现下一步内容。</div><button v-for="(item, index) in learnItems.slice(0, 3)" :key="item.poem_id || index" class="recommend-row" @click="item.poem_id && navigateToDetail(item.poem_id)"><span>0{{ index + 1 }}</span><div><strong>{{ item.title }}</strong><small>{{ item.author || '精选诗词' }} · {{ item.reason || '与你的路径相衔接' }}</small></div><em>新读</em></button></article>
        </section>
      </div>
    </div>
  </section>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PhArrowUpRight as ArrowUpRight, PhArrowsClockwise as ArrowsClockwise, PhBrain as Brain, PhChartLineUp as ChartLineUp, PhCheckCircle as CheckCircle, PhCompass as Compass, PhSparkle as Sparkle, PhWarningCircle as WarningCircle } from '@phosphor-icons/vue'
import { useUserStore } from '@/stores/user'
import api from '@/services/api'
import SafeMarkdown from '@/components/SafeMarkdown.vue'

export default {
  name: 'AIPersonalizedSection',
  components: { ArrowUpRight, ArrowsClockwise, Brain, ChartLineUp, CheckCircle, Compass, SafeMarkdown, Sparkle, WarningCircle },
  setup() {
    const router = useRouter(); const userStore = useUserStore(); const dashboard = ref(null); const error = ref(''); const dashboardLoading = ref(false); const reviewLoading = ref(false); const learnLoading = ref(false); const reviewItems = ref([]); const learnItems = ref([]); const trendChart = ref(null)
    let chart = null; let initChart = null; let chartRuntimeLoad = null; let resizeObserver = null; let personalizedLoad = null
    const greeting = computed(() => { const hour = new Date().getHours(); return hour < 9 ? '早上好' : hour < 14 ? '午安' : hour < 18 ? '下午好' : '晚上好' })
    const focusDimension = computed(() => dashboard.value?.profile?.focus || { label: '基础能力', score: 50 })
    const primaryAction = computed(() => dashboard.value?.advice?.quickActions?.[0] || { path: '/', cta: '开始学习' })
    const weeklyActivity = computed(() => (dashboard.value?.profile?.trend || []).reduce((sum, day) => sum + Number(day.activity || 0), 0))
    const formatTasks = tasks => Array.isArray(tasks) ? tasks.filter(Boolean).map(task => `- ${task}`).join('\n') : ''
    const navigateToDetail = id => { if (id) router.push(`/poem/${id}`) }
    const goToAction = action => { if (action?.path) router.push(action.path) }
    const fetchReview = async () => { reviewLoading.value = true; try { const result = await api.personalized.getReviewRecommendations(); reviewItems.value = result?.success ? result.data || [] : [] } catch { reviewItems.value = [] } finally { reviewLoading.value = false } }
    const fetchLearn = async () => { learnLoading.value = true; try { const result = await api.personalized.getLearnRecommendations(); learnItems.value = result?.success ? result.data || [] : [] } catch { learnItems.value = [] } finally { learnLoading.value = false } }
    const ensureChartRuntime = async () => {
      if (initChart) return initChart
      if (!chartRuntimeLoad) {
        chartRuntimeLoad = import('@/utils/echarts').then(({ init }) => {
          initChart = init
          return initChart
        })
      }
      return chartRuntimeLoad
    }
    const renderTrend = async () => {
      if (!trendChart.value || !dashboard.value) return
      const init = await ensureChartRuntime()
      if (!trendChart.value || !dashboard.value) return
      const trend = dashboard.value.profile?.trend || []; if (!chart) chart = init(trendChart.value)
      chart.setOption({ animationDuration: 650, animationEasing: 'cubicOut', grid: { left: 8, right: 10, top: 20, bottom: 24 }, tooltip: { trigger: 'axis', backgroundColor: '#164b48', borderWidth: 0, textStyle: { color: '#fff', fontSize: 11 }, formatter: params => `${params[0].axisValue}<br/>学习事件 ${params[0].value} 次` }, xAxis: { type: 'category', data: trend.map(day => day.label), boundaryGap: false, axisLine: { lineStyle: { color: 'rgba(47,138,123,.18)' } }, axisTick: { show: false }, axisLabel: { color: '#7a8c87', fontSize: 10, margin: 10 } }, yAxis: { type: 'value', minInterval: 1, splitNumber: 3, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: 'rgba(47,138,123,.10)', type: 'dashed' } } }, series: [{ type: 'line', data: trend.map(day => day.activity), smooth: .34, symbol: 'circle', symbolSize: 7, lineStyle: { color: '#2f8a7b', width: 2 }, itemStyle: { color: '#f8fbf6', borderColor: '#2f8a7b', borderWidth: 2 }, areaStyle: { color: 'rgba(83, 160, 142, .12)' } }] }, true)
    }
    const fetchDashboard = async (forceRefresh = false) => { if (!userStore.isLoggedIn) return; dashboardLoading.value = true; error.value = ''; try { const result = await api.personalized.getAISuggestionDashboard(forceRefresh); dashboard.value = result?.success ? result.data : null; if (!dashboard.value) throw new Error('学习建议暂时不可用'); await nextTick(); await renderTrend() } catch (err) { error.value = err.message || '暂时无法读取学习建议，请稍后重试' } finally { dashboardLoading.value = false } }
    const loadPersonalizedData = () => {
      if (!userStore.isLoggedIn) return Promise.resolve()
      if (personalizedLoad) return personalizedLoad
      personalizedLoad = Promise.all([fetchDashboard(), fetchReview(), fetchLearn()])
        .finally(() => { personalizedLoad = null })
      return personalizedLoad
    }
    onMounted(async () => { await userStore.initUser(); await loadPersonalizedData(); if (trendChart.value && typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(() => chart?.resize()); resizeObserver.observe(trendChart.value) } })
    onBeforeUnmount(() => { resizeObserver?.disconnect(); chart?.dispose(); chart = null })
    watch(() => userStore.isLoggedIn, value => { if (value) { loadPersonalizedData() } else { dashboard.value = null; reviewItems.value = []; learnItems.value = [] } })
    return { userStore, dashboard, dashboardLoading, reviewLoading, learnLoading, reviewItems, learnItems, trendChart, error, greeting, focusDimension, primaryAction, weeklyActivity, formatTasks, fetchDashboard, navigateToDetail, goToAction }
  }
}
</script>

<style scoped>
.ai-markdown :deep(p),.ai-markdown :deep(ul),.ai-markdown :deep(ol),.ai-markdown :deep(h3),.ai-markdown :deep(h4){margin:0}.ai-markdown :deep(p){color:#637a74;font:14px/1.65 var(--font-sans)}.ai-markdown :deep(strong){color:#164b48;font-weight:700}.ai-headline-markdown :deep(p){margin:8px 0 5px;color:#164b48;font:600 27px/1.35 var(--font-ancient)}.snapshot-title-markdown :deep(p){margin:10px 0 7px;color:#164b48;font:600 27px var(--font-ancient)}.action-copy{min-width:0}.action-title-markdown :deep(p){color:#294641;font:600 17px var(--font-ancient)}.action-detail-markdown :deep(p){overflow:hidden;color:#788a85;font:13px var(--font-sans);text-overflow:ellipsis;white-space:nowrap}.stage-title-markdown :deep(p){margin:7px 0;color:#213534;font:600 21px var(--font-ancient)}.stage-tasks-markdown :deep(ul){margin:14px 0 0;padding:0;list-style:none}.stage-tasks-markdown :deep(li){position:relative;margin:0 0 8px;padding-left:12px;color:#48645d;font:13px/1.55 var(--font-sans)}.stage-tasks-markdown :deep(li::before){position:absolute;left:0;color:#2f8a7b;content:'·';font-weight:800}.card-footnote.ai-markdown :deep(p){color:#718781;font:13px/1.55 var(--font-sans)}
</style>
