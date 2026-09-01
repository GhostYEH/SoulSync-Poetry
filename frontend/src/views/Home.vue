<template>
  <div class="home cockpit-home">
    <section class="home-intro" aria-labelledby="home-title">
      <div class="intro-copy">
        <span class="eyebrow">{{ isLoggedIn ? '欢迎回来，继续你的学习节奏' : '一日一诗，慢慢积累' }}</span>
        <h1 id="home-title">今天，从一首诗开始。</h1>
        <p>读懂一首，记住一句，再把它写进自己的表达里。</p>
      </div>
      <div class="intro-note"><span class="note-kicker">今日一句</span><p>{{ hitokotoText }}</p><small v-if="hitokotoFrom">{{ hitokotoFrom }}</small></div>
    </section>

    <section class="learning-hero" aria-labelledby="today-learning-title">
      <div class="learning-main">
        <div class="learning-copy">
          <div class="section-kicker"><span class="kicker-line"></span> 今日学习重点</div>
          <h2 id="today-learning-title">{{ dailyPoem?.title || '每日一诗' }}</h2>
          <p v-if="dailyPoem" class="learning-author">{{ dailyPoem.author }} · {{ dailyPoem.dynasty }} · {{ currentMonth }}{{ currentDay }}日</p>
          <p class="learning-advice">先通读一遍，再试着说出它写下的情绪。把理解放在记忆之前，学习会更轻松。</p>
          <div class="learning-actions"><button class="primary-action" @click="dailyPoem && navigateToDetail(dailyPoem.id)">继续学习 <span>↗</span></button><button class="quiet-action" @click="navigateTo('/challenge')">进入题库 <span>↗</span></button></div>
          <div class="progress-block"><div class="progress-label"><span>今日学习进度</span><strong>{{ learningProgress }}%</strong></div><div class="progress-track"><span :style="{ width: `${learningProgress}%` }"></span></div><div class="progress-meta"><span>{{ isLoggedIn ? '保持连续，今天再前进一点' : '登录后同步你的学习足迹' }}</span><button @click="navigateTo(isLoggedIn ? '/dashboard' : '/login')">{{ isLoggedIn ? '查看仪表盘' : '登录同步' }}</button></div></div>
        </div>
        <div class="hero-orbit" aria-hidden="true"><span class="orbit-label label-poem">诗</span><span class="orbit-label label-meaning">意</span><span class="orbit-label label-rhythm">韵</span><div class="orbit-ring ring-large"></div><div class="orbit-ring ring-small"></div><div class="orbit-core"><strong>AI</strong><span>陪你读诗</span></div></div>
      </div>
      <aside class="learning-status" aria-label="学习状态摘要"><div class="status-heading"><span>学习状态</span><span class="status-live">实时</span></div><div class="status-level"><strong>{{ userStatsData[2]?.displayValue || 0 }}</strong><span>闯关等级</span></div><div class="status-list"><div><span>已学诗词</span><strong>{{ userStatsData[0]?.displayValue || 0 }}<small>首</small></strong></div><div><span>学习时长</span><strong>{{ userStatsData[1]?.displayValue || 0 }}<small>分钟</small></strong></div><div><span>本周打卡</span><strong>{{ userStatsData[5]?.displayValue || 0 }}<small>天</small></strong></div></div></aside>
    </section>

    <section id="features" class="explore-section" aria-labelledby="explore-title"><div class="section-heading-row"><div><span class="eyebrow">CHANGE THE WAY YOU LEARN</span><h2 id="explore-title">换一种方式，继续学诗</h2></div><span class="section-note">今天想读、想玩，还是想写？</span></div><div class="explore-layout"><button v-for="(feature, index) in features" :key="feature.name" class="explore-card" :class="{ 'is-primary': index === 0 }" :data-feature-name="feature.name" :style="{ '--feature-image': featureImagesReady[feature.name] ? `url(${feature.image})` : 'none' }" @pointerenter="prefetchNavigation(feature.path)" @focus="prefetchNavigation(feature.path)" @click="navigateTo(feature.path)"><span class="feature-card-wash" aria-hidden="true"></span><span class="feature-card-watermark" aria-hidden="true">{{ feature.symbol }}</span><span class="feature-card-topline"><span class="feature-index">0{{ index + 1 }}</span><span class="feature-symbol">{{ feature.symbol }}</span></span><span class="feature-card-copy"><strong>{{ feature.name }}</strong><small>{{ feature.desc }}</small></span><span class="feature-cta">进入模块 <i>↗</i></span></button></div></section>

    <section class="path-section" aria-labelledby="path-title"><div class="section-heading-row path-heading"><div><span class="eyebrow">A GROWING PRACTICE</span><h2 id="path-title">学习路径</h2></div><button class="text-action" @click="navigateTo('/learning-path')">查看完整路径 <span>↗</span></button></div><div class="path-rail"><div class="path-line" aria-hidden="true"><span :style="{ width: `${pathProgress}%` }"></span></div><article v-for="(module, index) in learningModules" :key="module.title" class="path-step" :class="{ current: index === currentPathIndex, completed: index < currentPathIndex }"><div class="path-node">{{ index < currentPathIndex ? '✓' : `0${index + 1}` }}</div><div class="path-step-copy"><span class="path-status">{{ index === currentPathIndex ? '正在学习' : module.status }}</span><h3>{{ module.title }}</h3><p>{{ module.desc }}</p><div class="path-lessons"><span v-for="lesson in module.lessons" :key="lesson.label" :class="{ complete: lesson.complete, current: lesson.current }"><i></i>{{ lesson.label }}</span></div></div><div class="path-step-meta"><strong>{{ getModuleProgress(index) }}%</strong><span>{{ module.count }} 个小节</span></div></article></div></section>

    <section class="daily-poem-section" aria-labelledby="daily-title"><div class="section-heading-row"><div><span class="eyebrow">A QUIET MOMENT</span><h2 id="daily-title">每日一诗</h2></div><span class="section-note">给今天留一段慢读的时间</span></div><div v-if="dailyPoem" class="daily-poem-card" @click="navigateToDetail(dailyPoem.id)"><div class="date-stamp"><strong>{{ currentDay }}</strong><span>{{ currentMonth }}</span></div><div class="daily-poem-copy"><span class="poem-label">今日读本 · {{ dailyPoem.dynasty }}代</span><h3>{{ dailyPoem.title }}</h3><p>{{ dailyPoem.author }}</p><blockquote>{{ dailyPoem.content.split('\n').join(' / ') }}</blockquote></div><div class="daily-poem-actions"><button class="quiet-action" @click.stop="toggleRead(dailyPoem)">{{ isReading && readingPoemId === dailyPoem.id ? '停止朗读' : '朗读诗篇' }}</button><button class="poem-detail-link" @click.stop="navigateToDetail(dailyPoem.id)">读全文与赏析 <span>↗</span></button></div></div><div v-else class="loading-state">加载每日一诗...</div></section>

    <section class="library-section" aria-labelledby="library-title">
      <div class="section-heading-row"><div><span class="eyebrow">OPEN THE LIBRARY</span><h2 id="library-title">精选诗句</h2></div><span class="section-note">沿卷浏览，找到下一首想读的诗</span></div>
      <div class="library-toolbar"><label class="search-field"><span>⌕</span><input v-model="searchQuery" placeholder="搜索诗词、诗人..." @keyup.enter="handleSearch" /></label><button class="primary-action compact-action" @click="handleSearch">搜索</button><select v-model="dynastyFilter" @change="filterPoems"><option value="">全部朝代</option><option value="唐">唐朝</option><option value="宋">宋朝</option><option value="元">元朝</option></select></div>
      <div v-if="loading" class="loading-state">加载中...</div>
      <div v-else-if="error" class="error-state"><span>{{ error }}</span><button class="text-action" @click="fetchPoems">重试</button></div>
      <div v-else-if="filteredPoems.length === 0" class="loading-state">暂无诗词</div>
      <div v-else class="poem-scroll-shell">
        <img class="poem-scroll-art" :src="scrollArt" alt="" aria-hidden="true" />
        <div class="poem-scroll-heading"><span class="scroll-seal">藏</span><div><strong>沿卷读诗</strong><small>拖动卷轴，浏览诗词库</small></div><span class="scroll-hint">横向滑动 ↔</span></div>
        <div id="poem-scroll-viewport" ref="poemScroller" class="poem-scroll-viewport" role="listbox" tabindex="0" aria-label="精选古诗词，可横向拖动浏览" @scroll.passive="syncPoemScrollbar" @pointerdown="startPoemScrollDrag" @pointermove="movePoemScrollDrag" @pointerup="endPoemScrollDrag" @pointercancel="endPoemScrollDrag">
          <div class="poem-scroll-track"><button v-for="(poem, index) in filteredPoems" :key="poem.id" class="scroll-poem-card" @click="openPoemFromScroll(poem.id)"><span class="scroll-poem-index">{{ String(index + 1).padStart(2, '0') }}</span><span class="scroll-poem-title">{{ poem.title }}</span><span class="scroll-poem-author">{{ poem.author }} · {{ poem.dynasty }}</span><span class="scroll-poem-content">{{ getShortContent(poem.content) }}</span><span class="scroll-poem-arrow">↗</span></button><button v-if="hasMore" class="scroll-load-more" :disabled="loadingMore" @click.stop="loadMore"><span class="load-more-mark">↓</span><strong>{{ loadingMore ? '加载中' : '继续加载' }}</strong><small>下一卷诗词</small></button><div v-else class="scroll-end-mark"><span>卷尽</span><small>已读完当前诗词库</small></div></div>
        </div>
        <div ref="poemScrollbar" class="poem-scrollbar" :class="{ 'is-dragging': poemScrollbarDrag.active, 'is-disabled': poemScrollMetrics.max <= 0 }" role="scrollbar" aria-controls="poem-scroll-viewport" aria-label="精选古诗词横向滚动条" aria-orientation="horizontal" :aria-valuemax="Math.round(poemScrollMetrics.max)" :aria-valuenow="Math.round(poemScrollMetrics.left)" aria-valuemin="0" tabindex="0" @keydown="handlePoemScrollbarKeydown" @pointerdown="startPoemScrollbarDrag" @pointermove="movePoemScrollbarDrag" @pointerup="endPoemScrollbarDrag" @pointercancel="endPoemScrollbarDrag">
          <span class="poem-scrollbar-thumb" :style="{ width: `${poemScrollMetrics.thumbWidth}px`, transform: `translate3d(${poemScrollMetrics.thumbOffset}px, 0, 0)` }"></span>
        </div>
      </div>
    </section>

    <section class="footprint-section" aria-labelledby="footprint-title"><div class="section-heading-row"><div><span class="eyebrow">LEAVE A TRACE</span><h2 id="footprint-title">学习足迹</h2></div><span class="section-note">你的坚持，会慢慢变成可见的地图</span></div><div class="footprint-layout"><div class="footprint-summary"><div class="summary-top"><span>本周学习节奏</span><button class="text-action" @click="navigateTo('/dashboard')">打开学习仪表盘 ↗</button></div><div class="summary-number"><strong>{{ userStatsData[5]?.displayValue || 0 }}</strong><span>/ 7 天<br />有学习记录</span></div><div class="week-dots"><span v-for="(day, index) in weekDays" :key="day" :class="{ active: index < Number(userStatsData[5]?.value || 0) }"><i></i><small>{{ day }}</small></span></div></div><div class="ranking-card"><div class="ranking-card-head"><div><span class="eyebrow">SOCIAL PRACTICE</span><strong>诗友排行榜</strong></div><div class="ranking-tabs"><button v-for="tab in rankingTabs" :key="tab.key" :class="{ active: activeRankingTab === tab.key }" @click="switchRankingTab(tab.key)">{{ tab.label }}</button></div></div><div v-if="rankingLoading" class="loading-state">加载排行榜...</div><div v-else-if="currentRankingList.length === 0" class="loading-state compact-loading">暂无排名数据</div><div v-else class="ranking-rows"><div v-for="(item, index) in currentRankingList.slice(0, 4)" :key="item.id || index" class="ranking-row"><span class="ranking-rank">{{ index + 1 }}</span><span class="ranking-avatar">{{ item.username?.charAt(0) || '游' }}</span><span class="ranking-name">{{ item.username }}</span><span class="ranking-score">{{ item.score }}<small>{{ item.unit }}</small></span></div></div></div></div></section>

    <section class="ai-home-section"><AIPersonalizedSection /></section>
  </div>
</template>

<script>
import AIPersonalizedSection from '@/components/AIPersonalizedSection.vue'
import api, { request, TIMEOUTS } from '@/services/api.js'
import { prefetchRoute } from '@/router'
import scrollArt from '@/assets/jade-poetry-scroll.png'
import challengeFeatureArt from '@/assets/feature-challenge.png'
import feihualingFeatureArt from '@/assets/feature-feihualing.png'
import creationFeatureArt from '@/assets/feature-creation.png'
import parkourFeatureArt from '@/assets/feature-parkour.png'
import cardCatchFeatureArt from '@/assets/feature-card-catch.png'
import analyticsFeatureArt from '@/assets/feature-analytics.png'

// 接口不可用或返回内容不适合学习场景时使用的安全兜底语句。
const POSITIVE_HITOKOTO = [
  { text: '路漫漫其修远兮，吾将上下而求索。', from: '屈原《离骚》' },
  { text: '不积跬步，无以至千里；不积小流，无以成江海。', from: '荀子《劝学》' },
  { text: '业精于勤，荒于嬉；行成于思，毁于随。', from: '韩愈《进学解》' },
  { text: '长风破浪会有时，直挂云帆济沧海。', from: '李白《行路难》' },
  { text: '千磨万击还坚劲，任尔东西南北风。', from: '郑燮《竹石》' },
  { text: '会当凌绝顶，一览众山小。', from: '杜甫《望岳》' },
  { text: '沉舟侧畔千帆过，病树前头万木春。', from: '刘禹锡《酬乐天扬州初逢席上见赠》' },
  { text: '山重水复疑无路，柳暗花明又一村。', from: '陆游《游山西村》' },
  { text: '纸上得来终觉浅，绝知此事要躬行。', from: '陆游《冬夜读书示子聿》' },
  { text: '天行健，君子以自强不息。', from: '《周易》' },
  { text: '知之者不如好之者，好之者不如乐之者。', from: '《论语·雍也》' },
  { text: '博学而笃志，切问而近思。', from: '《论语·子张》' },
  { text: '一日不书，百事荒芜。', from: '李诩《戒庵老人漫笔》' },
  { text: '读书破万卷，下笔如有神。', from: '杜甫《奉赠韦左丞丈二十二韵》' },
  { text: '宝剑锋从磨砺出，梅花香自苦寒来。', from: '古语' },
  { text: '学而时习之，不亦说乎？', from: '《论语·学而》' }
]
const HITOKOTO_API_URL = 'https://v1.hitokoto.cn/?c=i&c=k&min_length=8&max_length=60'
const HITOKOTO_NEGATIVE_PATTERN = /自杀|死亡|杀戮|血腥|仇恨|绝望|恐怖|色情|淫秽|辱骂|垃圾|傻逼|操你|滚蛋|去死|毒品|战争|暴力|犯罪|颓废|抑郁|痛苦|悲伤|哭泣|遗憾|后悔|失败|病痛|灾难|地狱|末日|毁灭/

export default {
  name: 'Home', components: { AIPersonalizedSection },
  data() { return {
    scrollArt, currentDate: new Date(), dailyPoem: null, hitokotoText: POSITIVE_HITOKOTO[0].text, hitokotoFrom: POSITIVE_HITOKOTO[0].from, isLoggedIn: false, isReading: false, readingPoemId: null, audio: null, speechSynthesisSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
    features: [{ name: '诗词闯关', desc: '逐关挑战，检查真正掌握的内容', short: '闯关 · 复习', symbol: '闯', path: '/challenge', image: challengeFeatureArt }, { name: '飞花令', desc: '在线对战，以诗会友', short: '对战 · 反应', symbol: '令', path: '/feihualing/single', image: feihualingFeatureArt }, { name: 'AI 创作', desc: '让积累变成自己的文字', short: '灵感 · 表达', symbol: '写', path: '/creation', image: creationFeatureArt }, { name: '诗词跑酷', desc: '在游戏中背诵经典', short: '游戏 · 记忆', symbol: '行', path: '/parkour', image: parkourFeatureArt }, { name: '诗词大富翁', desc: '接住千古名句', short: '趣味 · 连击', symbol: '游', path: '/card-catch', image: cardCatchFeatureArt }, { name: '学习分析', desc: '查看你的学习轨迹', short: '数据 · 反馈', symbol: '迹', path: '/dashboard', image: analyticsFeatureArt }],
    learningModules: [{ title: '诗词基础', desc: '建立阅读古诗词的第一套方法', status: '待开始', count: 6, lessons: [{ label: '格律与意象', complete: true }, { label: '常见表达', current: true }, { label: '名句积累' }] }, { title: '理解与赏析', desc: '从字句走向情境与情绪', status: '下一阶段', count: 8, lessons: [{ label: '诗句拆解' }, { label: '情境判断' }, { label: '作品赏析' }] }, { title: '闯关与复习', desc: '在挑战里检查真正掌握的内容', status: '待解锁', count: 10, lessons: [{ label: '诗词闯关' }, { label: '错题复习' }, { label: '飞花令' }] }, { title: '创作与表达', desc: '把积累转化成自己的文字', status: '待解锁', count: 5, lessons: [{ label: '灵感采集' }, { label: 'AI 辅助创作' }, { label: '作品记录' }] }],
    userStatsData: [{ label: '已学诗词', value: 0, displayValue: '0', percentage: 0 }, { label: '学习时长', value: 0, displayValue: '0', percentage: 0 }, { label: '闯关进度', value: 0, displayValue: '0', percentage: 0 }, { label: '飞花令积分', value: 1000, displayValue: '1000', percentage: 50 }, { label: '创作作品', value: 0, displayValue: '0', percentage: 0 }, { label: '本周打卡', value: 0, displayValue: '0', percentage: 0 }],
    poems: [], filteredPoems: [], loading: true, loadingMore: false, hasMore: true, error: '', searchQuery: '', dynastyFilter: '', page: 1, pageSize: 20,
    scrollDrag: { active: false, startX: 0, startScrollLeft: 0, moved: false, suppressClick: false },
    poemScrollMetrics: { max: 0, left: 0, thumbWidth: 0, thumbOffset: 0 },
    poemScrollbarDrag: { active: false, startX: 0, startScrollLeft: 0, pointerId: null },
    rankingTabs: [{ key: 'feihua', label: '飞花令' }, { key: 'challenge', label: '闯关' }, { key: 'creation', label: '创作' }], activeRankingTab: 'feihua', rankingData: { feihua: [], challenge: [], creation: [] }, rankingLoading: false, featureImagesReady: {}
  } },
  computed: { currentMonth() { return `${this.currentDate.getMonth() + 1}月` }, currentDay() { return this.currentDate.getDate() }, currentPathIndex() { return Math.min(3, Math.floor(this.learningProgress / 25)) }, learningProgress() { return Math.round(this.userStatsData[2]?.percentage || 0) }, pathProgress() { return this.learningProgress }, currentRankingList() { return this.rankingData[this.activeRankingTab] || [] }, weekDays() { return ['一', '二', '三', '四', '五', '六', '日'] } },
  mounted() { this.checkLoginStatus(); this.fetchDailyPoem(); this.fetchHitokoto(); this.fetchPoems(); this.fetchRankingData(); this.fetchLearningStats(); this.$nextTick(this.observeFeatureImages) },
  beforeUnmount() { this.stopReading(); this.featureImageObserver?.disconnect(); this.poemScrollResizeObserver?.disconnect() },
  methods: {
    checkLoginStatus() { this.isLoggedIn = !!localStorage.getItem('token') }, prefetchNavigation(path) { prefetchRoute(path).catch(() => {}) }, navigateTo(path) { this.prefetchNavigation(path); this.$router.push(path) }, navigateToDetail(id) { if (id) this.$router.push(`/poem/${id}`) }, getModuleProgress(index) { return index === 0 || index === 2 ? this.learningProgress : 0 },
    observeFeatureImages() {
      const loadImage = (card) => {
        const name = card.dataset.featureName
        if (name && !this.featureImagesReady[name]) this.featureImagesReady[name] = true
      }
      const cards = this.$el.querySelectorAll('.explore-card')
      if (!('IntersectionObserver' in window)) {
        cards.forEach(loadImage)
        return
      }
      this.featureImageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          loadImage(entry.target)
          this.featureImageObserver.unobserve(entry.target)
        })
      }, { rootMargin: '360px 0px' })
      cards.forEach((card) => this.featureImageObserver.observe(card))
    },
    async fetchDailyPoem() { try { this.dailyPoem = await request('/daily-poem', { includeAuth: false, timeout: TIMEOUTS.SHORT }) || null } catch { this.dailyPoem = null } if (!this.dailyPoem) this.dailyPoem = { id: 1, title: '静夜思', author: '李白', dynasty: '唐', content: '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。' } },
    async fetchHitokoto() {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3500)
      try {
        const response = await fetch(HITOKOTO_API_URL, { signal: controller.signal })
        const data = response.ok ? await response.json() : null
        if (!this.isPositiveMeaningfulHitokoto(data)) throw new Error('一言内容未通过学习场景筛选')
        this.hitokotoText = data.hitokoto.trim()
        this.hitokotoFrom = data.from || data.from_who || '一言'
      } catch {
        this.pickFallbackHitokoto()
      } finally {
        clearTimeout(timeout)
      }
    },
    isPositiveMeaningfulHitokoto(data) {
      const text = typeof data?.hitokoto === 'string' ? data.hitokoto.replace(/\s+/g, ' ').trim() : ''
      return ['i', 'k'].includes(data?.type) && text.length >= 8 && text.length <= 60 && !HITOKOTO_NEGATIVE_PATTERN.test(text)
    },
    pickFallbackHitokoto() { const quote = POSITIVE_HITOKOTO[Math.floor(Math.random() * POSITIVE_HITOKOTO.length)]; this.hitokotoText = quote.text; this.hitokotoFrom = quote.from },
    async fetchLearningStats() { try { const result = await api.home.getLearningStats(); if (result.success && result.data) { if (result.data.loggedIn) { this.isLoggedIn = true; this.updateUserStats(result.data) } else this.isLoggedIn = false } } catch { this.isLoggedIn = !!localStorage.getItem('token') } },
    updateUserStats(data) { const values = [data.poemsStudied || 0, Math.round((data.totalStudyTime || 0) / 60), data.challengeLevel || 0, data.feihuaRating || 1000, data.totalCreations || 0, data.weeklyCheckins || 0]; const maxes = [100, 1000, 100, 2000, 50, 7]; values.forEach((value, index) => { this.userStatsData[index].value = value; this.userStatsData[index].displayValue = Number(value).toLocaleString(); this.userStatsData[index].percentage = Math.min(100, (value / maxes[index]) * 100) }) },
    async fetchPoems() { try { if (this.page === 1) this.loading = true; this.error = ''; let url = `/poems?page=${this.page}&pageSize=${this.pageSize}&random=true`; if (this.dynastyFilter) url += `&dynasty=${encodeURIComponent(this.dynastyFilter)}`; const data = await request(url, { includeAuth: false, timeout: TIMEOUTS.SHORT }); this.hasMore = data.length === this.pageSize; this.poems = this.page === 1 ? data : [...this.poems, ...data]; this.filteredPoems = this.poems } catch (err) { this.error = err.message || '诗词库暂时未能打开' } finally { this.loading = false; this.loadingMore = false; await this.$nextTick(); this.setupPoemScrollbar() } },
    loadMore() { if (this.loadingMore || !this.hasMore) return; this.loadingMore = true; this.page += 1; this.fetchPoems() }, handleSearch() { if (this.searchQuery.trim()) this.$router.push({ path: '/search', query: { q: this.searchQuery } }) }, filterPoems() { this.page = 1; this.poems = []; this.hasMore = true; this.fetchPoems() }, getShortContent(content) { const clean = (content || '').replace(/\s+/g, ' ').trim(); return clean.length > 58 ? `${clean.substring(0, 58)}...` : clean },
    setupPoemScrollbar() {
      this.poemScrollResizeObserver?.disconnect()
      const scroller = this.$refs.poemScroller
      if (!scroller) return
      if ('ResizeObserver' in window) {
        this.poemScrollResizeObserver = new ResizeObserver(this.syncPoemScrollbar)
        this.poemScrollResizeObserver.observe(scroller)
        if (scroller.firstElementChild) this.poemScrollResizeObserver.observe(scroller.firstElementChild)
      }
      this.syncPoemScrollbar()
    },
    syncPoemScrollbar() {
      const scroller = this.$refs.poemScroller
      const scrollbar = this.$refs.poemScrollbar
      if (!scroller || !scrollbar) return
      const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
      const left = Math.min(max, Math.max(0, scroller.scrollLeft))
      const trackWidth = scrollbar.clientWidth
      const visibleRatio = scroller.scrollWidth > 0 ? scroller.clientWidth / scroller.scrollWidth : 1
      const thumbWidth = max > 0 ? Math.min(trackWidth, Math.max(56, trackWidth * visibleRatio)) : trackWidth
      const thumbTravel = Math.max(0, trackWidth - thumbWidth)
      const thumbOffset = max > 0 ? (left / max) * thumbTravel : 0
      this.poemScrollMetrics = { max, left, thumbWidth, thumbOffset }
    },
    startPoemScrollDrag(event) {
      if (event.button !== 0) return
      const scroller = this.$refs.poemScroller
      if (!scroller) return
      this.scrollDrag.active = true
      this.scrollDrag.startX = event.clientX
      this.scrollDrag.startScrollLeft = scroller.scrollLeft
      this.scrollDrag.moved = false
    },
    movePoemScrollDrag(event) {
      if (!this.scrollDrag.active) return
      const scroller = this.$refs.poemScroller
      const distance = event.clientX - this.scrollDrag.startX
      if (Math.abs(distance) > 4) {
        if (!this.scrollDrag.moved) scroller.setPointerCapture?.(event.pointerId)
        this.scrollDrag.moved = true
        scroller.scrollLeft = this.scrollDrag.startScrollLeft - distance
      }
    },
    endPoemScrollDrag(event) {
      if (!this.scrollDrag.active) return
      if (this.$refs.poemScroller?.hasPointerCapture?.(event.pointerId)) this.$refs.poemScroller.releasePointerCapture(event.pointerId)
      if (this.scrollDrag.moved) {
        this.scrollDrag.suppressClick = true
        setTimeout(() => { this.scrollDrag.suppressClick = false }, 120)
      }
      this.scrollDrag.active = false
    },
    startPoemScrollbarDrag(event) {
      if (event.button !== 0 || this.poemScrollMetrics.max <= 0) return
      const scroller = this.$refs.poemScroller
      const scrollbar = this.$refs.poemScrollbar
      if (!scroller || !scrollbar) return
      if (!event.target.classList.contains('poem-scrollbar-thumb')) {
        const rect = scrollbar.getBoundingClientRect()
        const travel = Math.max(1, rect.width - this.poemScrollMetrics.thumbWidth)
        const nextRatio = Math.min(1, Math.max(0, (event.clientX - rect.left - this.poemScrollMetrics.thumbWidth / 2) / travel))
        scroller.scrollLeft = nextRatio * this.poemScrollMetrics.max
      }
      scrollbar.setPointerCapture?.(event.pointerId)
      this.poemScrollbarDrag = { active: true, startX: event.clientX, startScrollLeft: scroller.scrollLeft, pointerId: event.pointerId }
    },
    movePoemScrollbarDrag(event) {
      if (!this.poemScrollbarDrag.active || event.pointerId !== this.poemScrollbarDrag.pointerId) return
      const scroller = this.$refs.poemScroller
      const scrollbar = this.$refs.poemScrollbar
      const travel = Math.max(1, scrollbar.clientWidth - this.poemScrollMetrics.thumbWidth)
      scroller.scrollLeft = this.poemScrollbarDrag.startScrollLeft + ((event.clientX - this.poemScrollbarDrag.startX) / travel) * this.poemScrollMetrics.max
    },
    endPoemScrollbarDrag(event) {
      if (!this.poemScrollbarDrag.active || event.pointerId !== this.poemScrollbarDrag.pointerId) return
      const scrollbar = this.$refs.poemScrollbar
      if (scrollbar?.hasPointerCapture?.(event.pointerId)) scrollbar.releasePointerCapture(event.pointerId)
      this.poemScrollbarDrag.active = false
      this.poemScrollbarDrag.pointerId = null
    },
    handlePoemScrollbarKeydown(event) {
      const scroller = this.$refs.poemScroller
      if (!scroller) return
      const step = Math.max(80, scroller.clientWidth * 0.18)
      const keyOffsets = { ArrowLeft: -step, ArrowRight: step, PageUp: -scroller.clientWidth * 0.8, PageDown: scroller.clientWidth * 0.8 }
      if (event.key === 'Home' || event.key === 'End') scroller.scrollTo({ left: event.key === 'Home' ? 0 : this.poemScrollMetrics.max, behavior: 'smooth' })
      else if (event.key in keyOffsets) scroller.scrollBy({ left: keyOffsets[event.key], behavior: 'smooth' })
      else return
      event.preventDefault()
    },
    openPoemFromScroll(id) { if (!this.scrollDrag.suppressClick) this.navigateToDetail(id) },
    async fetchRankingData() { this.rankingLoading = true; try { const tabs = ['feihua', 'challenge', 'creation']; const results = await Promise.all(tabs.map(tab => api.home.getLeaderboard(tab))); tabs.forEach((tab, index) => { if (results[index]?.success) this.rankingData[tab] = results[index].data || [] }) } catch { /* empty state remains useful */ } finally { this.rankingLoading = false } }, switchRankingTab(key) { this.activeRankingTab = key }, toggleRead(poem) { if (this.isReading) return this.stopReading(); this.startReading(poem) }, stopReading() { if (this.audio) { this.audio.pause(); this.audio.currentTime = 0; this.audio = null } if (this.speechSynthesisSupported) speechSynthesis.cancel(); this.isReading = false; this.readingPoemId = null }, async startReading(poem) { if (!poem?.content) return; this.stopReading(); this.isReading = true; this.readingPoemId = poem.id; try { const audioBlob = await api.ai.tts(poem.content.replace(/\n/g, '。')); const audioUrl = URL.createObjectURL(audioBlob); this.audio = new Audio(audioUrl); this.audio.onended = () => { this.isReading = false; this.readingPoemId = null; URL.revokeObjectURL(audioUrl) }; await this.audio.play() } catch { this.stopReading() } }
  }
}
</script>

<style scoped>
.cockpit-home { --jade-deep:#164b48; --jade:#2f8a7b; --jade-soft:#cfe8df; --ink:#213534; --muted:#6d817d; --line:rgba(51,103,94,.16); max-width:1680px; margin:0 auto; padding:48px clamp(28px,4vw,72px) 108px; color:var(--ink); font-size:17px; }
.cockpit-home button,.cockpit-home input,.cockpit-home select{font:inherit}.cockpit-home button{cursor:pointer}.home-intro{display:flex;justify-content:space-between;align-items:flex-end;gap:32px;padding:30px 6px 34px;animation:rise-in .7s ease both}.intro-copy{max-width:720px}.eyebrow{display:block;color:var(--jade);font:600 11px/1.3 var(--font-sans);letter-spacing:.18em;text-transform:uppercase}.intro-copy h1{margin:15px 0 10px;color:var(--jade-deep);font:600 clamp(36px,5vw,64px)/1.08 var(--font-ancient);letter-spacing:-.05em}.intro-copy p{margin:0;color:var(--muted);font:15px/1.8 var(--font-sans)}.intro-note{min-width:240px;padding:15px 0 0 22px;border-left:1px solid var(--line)}.note-kicker{color:var(--jade);font:600 11px/1 var(--font-sans);letter-spacing:.15em}.intro-note p{margin:14px 0 3px;color:var(--ink);font:18px/1.55 var(--font-ancient)}.intro-note small{color:var(--muted);font:12px var(--font-sans)}
.learning-hero{display:grid;grid-template-columns:minmax(0,1fr) 260px;min-height:420px;overflow:hidden;border:1px solid rgba(97,157,143,.28);border-radius:28px;background:linear-gradient(115deg,rgba(245,252,248,.92),rgba(220,240,232,.7));box-shadow:0 26px 70px rgba(45,94,83,.12);animation:rise-in .75s .08s ease both}.learning-main{display:grid;grid-template-columns:minmax(0,1fr) 280px;align-items:center;padding:50px 56px;position:relative}.section-kicker{display:flex;align-items:center;gap:10px;color:var(--jade);font:600 12px var(--font-sans);letter-spacing:.12em}.kicker-line{width:34px;height:1px;background:currentColor}.learning-copy h2{margin:20px 0 6px;color:var(--jade-deep);font:600 clamp(34px,4.2vw,58px)/1.12 var(--font-ancient);letter-spacing:-.05em}.learning-author{margin:0;color:#64847c;font:13px var(--font-sans)}.learning-advice{max-width:430px;margin:24px 0 25px;color:var(--muted);font:15px/1.85 var(--font-sans)}.learning-actions{display:flex;align-items:center;gap:14px}.primary-action,.quiet-action,.text-action{border:0;background:transparent;color:var(--jade-deep)}.primary-action{padding:12px 18px;border-radius:12px;background:var(--jade-deep);color:#fff;box-shadow:0 8px 20px rgba(22,75,72,.18);transition:transform .25s ease,box-shadow .25s ease}.primary-action:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(22,75,72,.24)}.quiet-action{padding:10px 2px;color:var(--jade);font:600 13px var(--font-sans)}.quiet-action span,.primary-action span{margin-left:8px}.progress-block{max-width:460px;margin-top:38px}.progress-label,.progress-meta{display:flex;justify-content:space-between;align-items:center;color:var(--muted);font:12px var(--font-sans)}.progress-label strong{color:var(--jade-deep)}.progress-track{height:5px;margin:10px 0 8px;overflow:hidden;border-radius:10px;background:rgba(47,138,123,.12)}.progress-track span{display:block;height:100%;border-radius:inherit;background:var(--jade);transition:width .6s ease}.progress-meta{color:#79958e;font-size:11px}.progress-meta button{padding:0;border:0;background:transparent;color:var(--jade)}
.hero-orbit{position:relative;min-height:265px;align-self:center}.orbit-ring{position:absolute;border:1px solid rgba(47,138,123,.28);border-radius:50%;transform:rotate(-18deg)}.ring-large{inset:22px 10px;animation:drift 12s ease-in-out infinite}.ring-small{inset:53px 43px;border-style:dashed;animation:drift 9s ease-in-out infinite reverse}.orbit-core{position:absolute;inset:89px 79px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.8);border-radius:50%;background:rgba(255,255,255,.65);box-shadow:0 14px 34px rgba(47,138,123,.14)}.orbit-core strong{color:var(--jade-deep);font:700 24px var(--font-sans);letter-spacing:.08em}.orbit-core span{margin-top:4px;color:var(--muted);font:11px var(--font-sans)}.orbit-label{position:absolute;z-index:1;display:grid;place-items:center;width:38px;height:38px;border:1px solid rgba(47,138,123,.22);border-radius:50%;background:rgba(255,255,255,.74);color:var(--jade-deep);font:18px var(--font-ancient);box-shadow:0 8px 20px rgba(47,138,123,.1)}.label-poem{top:16px;left:26px}.label-meaning{top:22px;right:18px}.label-rhythm{right:7px;bottom:16px}.learning-status{display:flex;flex-direction:column;padding:32px 28px;border-left:1px solid rgba(76,132,119,.18);background:rgba(255,255,255,.38)}.status-heading{display:flex;justify-content:space-between;color:var(--jade-deep);font:600 13px var(--font-sans)}.status-live{color:var(--jade);font-size:11px}.status-live:before{content:'';display:inline-block;width:6px;height:6px;margin:0 5px 1px 0;border-radius:50%;background:var(--jade)}.status-level{display:flex;flex-direction:column;align-items:center;justify-content:center;width:130px;height:130px;margin:36px auto 30px;border:1px solid rgba(47,138,123,.28);border-radius:50%;background:radial-gradient(circle,#fff 0 54%,transparent 55%),conic-gradient(var(--jade) 0 26%,rgba(47,138,123,.1) 26% 100%);box-shadow:inset 0 0 0 10px rgba(255,255,255,.3)}.status-level strong{color:var(--jade-deep);font:600 34px var(--font-sans)}.status-level span{color:var(--muted);font:11px var(--font-sans)}.status-list{margin-top:auto}.status-list div{display:flex;justify-content:space-between;align-items:baseline;padding:13px 0;border-top:1px solid rgba(76,132,119,.14);color:var(--muted);font:12px var(--font-sans)}.status-list strong{color:var(--jade-deep);font-size:16px}.status-list small{margin-left:3px;color:var(--muted);font-size:10px;font-weight:400}
.section-heading-row{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:23px}.section-heading-row h2{margin:8px 0 0;color:var(--jade-deep);font:600 30px/1.2 var(--font-ancient);letter-spacing:-.03em}.section-note{padding-bottom:3px;color:var(--muted);font:13px var(--font-sans)}.explore-section,.path-section,.daily-poem-section,.library-section,.footprint-section{margin-top:92px}.explore-layout{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:minmax(218px,auto);gap:16px}.explore-card{position:relative;display:flex;flex-direction:column;align-items:flex-start;min-height:218px;overflow:hidden;isolation:isolate;padding:23px 24px 21px;border:1px solid rgba(94,139,125,.25);border-radius:18px;background-color:#edf5ef;background-image:linear-gradient(110deg,rgba(246,251,247,.96) 0%,rgba(246,251,247,.78) 47%,rgba(239,247,241,.42) 100%),var(--feature-image);background-position:center;background-size:cover;color:var(--jade-deep);text-align:left;box-shadow:0 10px 24px rgba(43,97,86,.045);transition:transform .3s ease,box-shadow .3s ease,border-color .3s ease}.explore-card::after{position:absolute;inset:0;z-index:-1;border:1px solid rgba(255,255,255,.52);border-radius:inherit;content:'';pointer-events:none}.explore-card:hover{transform:translateY(-4px);border-color:rgba(47,138,123,.42);box-shadow:0 18px 34px rgba(43,97,86,.12)}.explore-card:focus-visible{outline:3px solid rgba(47,138,123,.28);outline-offset:3px}.explore-card.is-primary{border-color:rgba(47,138,123,.38);background-image:linear-gradient(110deg,rgba(232,247,239,.95) 0%,rgba(235,247,240,.72) 48%,rgba(229,242,236,.38) 100%),var(--feature-image);box-shadow:0 12px 28px rgba(43,97,86,.09)}.feature-card-wash{position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 92% 84%,rgba(255,255,255,.2),transparent 33%),linear-gradient(180deg,transparent 46%,rgba(225,240,231,.24));pointer-events:none}.feature-card-watermark{position:absolute;right:20px;top:15px;color:rgba(47,138,123,.14);font:72px/1 var(--font-ancient);pointer-events:none}.feature-card-topline{display:flex;align-items:center;justify-content:space-between;width:100%}.feature-index{color:#7e9f95;font:11px var(--font-sans);letter-spacing:.12em}.feature-symbol{display:grid;place-items:center;width:34px;height:34px;border:1px solid rgba(47,138,123,.2);border-radius:50%;background:rgba(255,255,255,.58);color:var(--jade-deep);font:17px var(--font-ancient);box-shadow:0 5px 13px rgba(43,97,86,.07)}.feature-card-copy{display:flex;flex-direction:column;gap:5px;margin-top:auto}.feature-card-copy strong{color:var(--jade-deep);font:600 23px var(--font-ancient);letter-spacing:-.02em}.feature-card-copy small{max-width:19em;color:#58726b;font:12px/1.6 var(--font-sans)}.feature-cta{margin-top:17px;color:var(--jade);font:600 12px var(--font-sans)}.feature-cta i{margin-left:7px;font-style:normal}
.path-rail{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:18px;padding-top:24px}.path-line{position:absolute;top:43px;left:9%;right:9%;height:1px;background:rgba(47,138,123,.16)}.path-line span{display:block;height:100%;background:var(--jade);transition:width .5s ease}.path-step{position:relative;padding:0 3px}.path-node{position:relative;z-index:1;display:grid;place-items:center;width:38px;height:38px;margin-bottom:18px;border:1px solid rgba(47,138,123,.25);border-radius:50%;background:rgba(246,251,247,.92);color:#78918a;font:11px var(--font-sans)}.path-step.current .path-node{border-color:var(--jade);background:var(--jade);color:#fff;box-shadow:0 8px 18px rgba(47,138,123,.2)}.path-step.completed .path-node{background:var(--jade-soft);color:var(--jade-deep)}.path-step-copy{min-height:190px;padding-right:12px}.path-status{color:var(--jade);font:600 11px var(--font-sans)}.path-step:not(.current) .path-status{color:#97a9a4}.path-step h3{margin:9px 0 7px;color:var(--jade-deep);font:600 22px var(--font-ancient)}.path-step p{margin:0;color:var(--muted);font:12px/1.7 var(--font-sans)}.path-lessons{display:flex;flex-direction:column;gap:8px;margin-top:18px;color:#71847f;font:11px var(--font-sans)}.path-lessons span{display:flex;align-items:center;gap:7px}.path-lessons i{width:6px;height:6px;border:1px solid #9eb5ad;border-radius:50%}.path-lessons .complete i{border-color:var(--jade);background:var(--jade)}.path-lessons .current{color:var(--jade-deep)}.path-step-meta{display:flex;justify-content:space-between;color:#91a49e;font:11px var(--font-sans)}.path-step-meta strong{color:var(--jade);font-size:14px}
.daily-poem-card{position:relative;display:grid;grid-template-columns:90px minmax(0,1fr) 185px;gap:28px;align-items:center;min-height:310px;overflow:hidden;padding:52px 58px;border:1px solid rgba(117,152,136,.25);border-radius:20px;background:linear-gradient(90deg,rgba(250,251,246,.95),rgba(237,246,239,.77)),url('../assets/jade-paper-ambient.png') center/cover;box-shadow:0 18px 40px rgba(61,100,83,.08);cursor:pointer}.date-stamp{align-self:start;display:flex;flex-direction:column;color:var(--jade-deep)}.date-stamp strong{font:600 64px/.9 var(--font-sans);letter-spacing:-.08em}.date-stamp span{margin-top:9px;color:var(--jade);font:12px var(--font-sans)}.poem-label{color:var(--jade);font:600 11px var(--font-sans);letter-spacing:.14em}.daily-poem-copy h3{margin:12px 0 1px;color:var(--jade-deep);font:600 34px var(--font-ancient)}.daily-poem-copy p{margin:0;color:var(--muted);font:13px var(--font-sans)}.daily-poem-copy blockquote{max-width:640px;margin:25px 0 0;color:#45645d;font:21px/1.85 var(--font-ancient)}.daily-poem-actions{display:flex;flex-direction:column;align-items:flex-start;gap:24px}.poem-detail-link{padding:0;border:0;background:transparent;color:var(--jade-deep);font:600 12px var(--font-sans)}.poem-detail-link span{margin-left:7px;color:var(--jade)}
.library-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:20px}.search-field{display:flex;align-items:center;flex:1;max-width:460px;gap:8px;padding:0 14px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.6);color:var(--jade)}.search-field input{width:100%;height:42px;border:0;outline:0;background:transparent;color:var(--ink);font-size:13px}.library-toolbar select{height:42px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.55);color:var(--muted);font-size:12px}.compact-action{height:42px;padding:0 17px;border-radius:10px}.poem-scroll-shell{position:relative;overflow:hidden;min-height:280px;padding:32px 30px 26px;border:1px solid rgba(142,168,151,.25);border-radius:20px;background:rgba(248,250,244,.72)}.poem-scroll-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.42;pointer-events:none}.poem-scroll-heading,.poem-scroll-viewport{position:relative;z-index:1}.poem-scroll-heading{display:flex;align-items:center;gap:13px;margin-bottom:22px}.scroll-seal{display:grid;place-items:center;width:36px;height:36px;border:1px solid rgba(47,138,123,.35);border-radius:50%;color:var(--jade);font:19px var(--font-ancient)}.poem-scroll-heading strong{display:block;color:var(--jade-deep);font:600 18px var(--font-ancient)}.poem-scroll-heading small,.scroll-end-mark small,.scroll-load-more small{display:block;margin-top:3px;color:var(--muted);font:11px var(--font-sans)}.scroll-hint{margin-left:auto;color:#7e9690;font:11px var(--font-sans)}.poem-scroll-viewport{overflow-x:auto;cursor:grab;scrollbar-width:thin}.poem-scroll-track{display:flex;gap:12px;width:max-content}.scroll-poem-card,.scroll-load-more{position:relative;display:flex;flex-direction:column;align-items:flex-start;width:210px;min-height:166px;padding:19px;border:1px solid rgba(115,153,137,.22);border-radius:13px;background:rgba(255,255,255,.62);color:var(--ink);text-align:left;transition:transform .25s ease,background .25s ease}.scroll-poem-card:hover,.scroll-load-more:hover{transform:translateY(-3px);background:rgba(255,255,255,.9)}.scroll-poem-index{color:#91a8a0;font:11px var(--font-sans)}.scroll-poem-title{margin-top:20px;color:var(--jade-deep);font:600 19px var(--font-ancient)}.scroll-poem-author{margin-top:4px;color:var(--jade);font:11px var(--font-sans)}.scroll-poem-content{margin-top:14px;color:var(--muted);font:11px/1.65 var(--font-sans)}.scroll-poem-arrow{position:absolute;top:17px;right:17px;color:var(--jade)}.scroll-load-more{align-items:center;justify-content:center;border-style:dashed;text-align:center}.load-more-mark{color:var(--jade);font-size:22px}.scroll-load-more strong,.scroll-end-mark span{color:var(--jade-deep);font:600 15px var(--font-ancient)}.scroll-end-mark{align-self:center;padding:42px 20px;text-align:center}
.footprint-layout{display:grid;grid-template-columns:.92fr 1.08fr;gap:22px}.footprint-summary,.ranking-card{min-height:320px;padding:32px 36px;border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.48)}.summary-top,.ranking-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.summary-top>span{color:var(--jade-deep);font:600 18px var(--font-ancient)}.text-action{padding:0;color:var(--jade);font:600 14px var(--font-sans)}.summary-number{display:flex;align-items:baseline;gap:12px;margin-top:42px}.summary-number strong{color:var(--jade-deep);font:600 76px/.85 var(--font-sans);letter-spacing:-.08em}.summary-number span{color:var(--muted);font:14px/1.55 var(--font-sans)}.week-dots{display:grid;grid-template-columns:repeat(7,1fr);gap:9px;margin-top:35px}.week-dots span{display:flex;flex-direction:column;align-items:center;gap:9px;color:#94a7a1;font:12px var(--font-sans)}.week-dots i{width:11px;height:11px;border:1px solid #b7c9c0;border-radius:50%}.week-dots .active i{border-color:var(--jade);background:var(--jade);box-shadow:0 0 0 4px rgba(47,138,123,.1)}.ranking-card-head .eyebrow{margin-bottom:7px;font-size:11px}.ranking-card-head strong{color:var(--jade-deep);font:600 23px var(--font-ancient)}.ranking-tabs{display:flex;gap:8px}.ranking-tabs button{padding:7px 10px;border:0;border-radius:7px;background:transparent;color:var(--muted);font-size:13px}.ranking-tabs button.active{background:var(--jade-soft);color:var(--jade-deep)}.ranking-rows{margin-top:24px;border-bottom:1px solid rgba(76,132,119,.11)}.ranking-row{display:grid;grid-template-columns:42px 40px minmax(0,1fr) minmax(96px,auto);align-items:center;gap:14px;min-height:54px;padding:0 14px;border-top:1px solid rgba(76,132,119,.11);color:var(--muted);font:15px var(--font-sans)}.ranking-rank{color:#6f978c;font-weight:700;text-align:center;font-variant-numeric:tabular-nums}.ranking-avatar{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--jade-soft);color:var(--jade-deep);font:14px var(--font-ancient)}.ranking-name{min-width:0;overflow:hidden;color:var(--ink);font-weight:500;text-overflow:ellipsis;white-space:nowrap}.ranking-score{padding-right:4px;color:var(--jade-deep);font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}.ranking-score small{margin-left:4px;color:var(--muted);font-size:12px;font-weight:400}.loading-state,.error-state{padding:36px 20px;color:var(--muted);text-align:center;font:15px var(--font-sans)}.error-state{display:flex;justify-content:center;gap:14px}.compact-loading{padding:24px 0}.ai-home-section{margin:104px calc(-1 * clamp(28px,4vw,72px)) 0;border-top:1px solid rgba(76,132,119,.12)}
@keyframes rise-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes drift{0%,100%{transform:rotate(-18deg) translate(0)}50%{transform:rotate(-12deg) translate(4px,-5px)}}
@media (prefers-reduced-motion:reduce){.home-intro,.learning-hero{animation:none}.ring-large,.ring-small{animation:none}*{scroll-behavior:auto!important}}
@media (max-width:980px){.cockpit-home{padding-inline:20px}.learning-main{grid-template-columns:1fr 220px;padding:40px}.learning-hero{grid-template-columns:1fr 220px}.explore-layout{grid-template-columns:repeat(2,minmax(0,1fr))}.path-rail{grid-template-columns:repeat(2,1fr);gap:34px 18px}.path-line{display:none}.path-step-copy{min-height:0}.daily-poem-card{grid-template-columns:70px minmax(0,1fr)}.daily-poem-actions{grid-column:2;flex-direction:row;align-items:center;gap:18px}.ai-home-section{margin-inline:-20px}}
@media (max-width:700px){.cockpit-home{padding:20px 14px 68px}.home-intro{display:block;padding:22px 4px 28px}.intro-copy h1{font-size:42px}.intro-note{margin-top:28px;padding:15px 0 0;border-top:1px solid var(--line);border-left:0}.learning-hero{display:block}.learning-main{display:block;padding:30px 24px 26px}.learning-copy h2{font-size:42px}.hero-orbit{min-height:200px;margin-top:20px}.orbit-core{inset:66px calc(50% - 52px)}.ring-large{inset:14px 15%}.ring-small{inset:40px 29%}.label-poem{left:23%}.label-meaning{right:20%}.label-rhythm{right:17%;bottom:4px}.learning-status{display:grid;grid-template-columns:auto 1fr;gap:15px 20px;padding:22px 24px;border-top:1px solid rgba(76,132,119,.18);border-left:0}.status-heading{grid-column:1/-1}.status-level{width:90px;height:90px;margin:0}.status-level strong{font-size:25px}.status-list{margin:0}.status-list div{padding:7px 0}.section-heading-row{display:block}.section-note{display:block;margin-top:9px}.explore-section,.path-section,.daily-poem-section,.library-section,.footprint-section{margin-top:68px}.explore-layout{grid-template-columns:1fr;gap:12px}.explore-card{min-height:196px;padding:20px}.feature-card-copy strong{font-size:21px}.feature-card-watermark{font-size:64px}.path-rail{grid-template-columns:1fr;gap:24px}.path-step{display:grid;grid-template-columns:42px 1fr;gap:12px}.path-node{margin-bottom:0}.path-step-meta{grid-column:2}.daily-poem-card{display:block;padding:28px 24px}.date-stamp{flex-direction:row;align-items:baseline;gap:8px}.date-stamp strong{font-size:52px}.daily-poem-copy blockquote{font-size:18px}.daily-poem-actions{flex-wrap:wrap;margin-top:26px}.library-toolbar{flex-wrap:wrap}.search-field{flex-basis:100%;max-width:none}.library-toolbar select{flex:1}.poem-scroll-shell{padding:24px 16px 20px}.scroll-hint{display:none}.footprint-summary,.ranking-card{padding:22px 18px}.summary-number{margin-top:32px}.summary-number strong{font-size:62px}.ranking-card-head{display:block}.ranking-tabs{margin-top:16px}.ranking-row{grid-template-columns:32px 34px minmax(0,1fr) auto;gap:9px;padding:0 4px;min-height:50px;font-size:14px}.ranking-score{min-width:0;padding-right:0;font-size:15px}.ai-home-section{margin-inline:-14px}}
.poem-scroll-viewport{scrollbar-width:none;touch-action:pan-y;user-select:none}.poem-scroll-viewport::-webkit-scrollbar{display:none}.poem-scrollbar{position:relative;z-index:1;height:10px;margin-top:8px;border-radius:999px;background:rgba(33,53,52,.12);outline:none;touch-action:none}.poem-scrollbar:focus-visible{box-shadow:0 0 0 3px rgba(47,138,123,.2)}.poem-scrollbar.is-disabled{opacity:.35}.poem-scrollbar-thumb{display:block;height:100%;min-width:56px;border-radius:inherit;background:rgba(33,53,52,.72);box-shadow:0 1px 4px rgba(22,75,72,.16);transition:background .16s ease}.poem-scrollbar:hover .poem-scrollbar-thumb,.poem-scrollbar:focus-visible .poem-scrollbar-thumb,.poem-scrollbar.is-dragging .poem-scrollbar-thumb{background:var(--jade-deep)}
</style>
