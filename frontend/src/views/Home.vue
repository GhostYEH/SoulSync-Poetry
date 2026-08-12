<template>
  <div class="home">
    <!-- ========== 1. HERO 介绍区 ========== -->
    <section class="hero-section">
      <div class="hero-particles">
        <span v-for="n in 20" :key="n" class="hero-particle" :style="getParticleStyle(n)"></span>
      </div>
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          AI 智能诗词学习平台
        </div>
        <h1 class="hero-title">
          <span class="title-first">诗词润心灵</span>
          <span class="title-second">书香伴成长</span>
        </h1>
        <p class="hero-subtitle">
          融合人工智能与传统文化，让古诗词学习更智能、更有趣
        </p>
        <div class="hero-tags">
          <span class="hero-tag" v-for="tag in heroTags" :key="tag.text">
            <span class="tag-icon">{{ tag.icon }}</span>
            {{ tag.text }}
          </span>
        </div>
      </div>
      <div class="hero-scroll-indicator" @click="scrollToContent">
        <span>向下探索</span>
        <div class="scroll-arrow"></div>
      </div>
    </section>

    <!-- ========== 2. 功能入口卡片 ========== -->
    <section class="features-section" id="features">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-deco">✦</span>
          功能入口
          <span class="title-deco">✦</span>
        </h2>
        <p class="section-subtitle">选择你感兴趣的学习方式，开启诗词之旅</p>
      </div>
      <div class="features-grid">
        <div
          v-for="(feature, index) in features"
          :key="feature.name"
          class="feature-card"
          :class="[`feature-card--${feature.color}`, { 'highlight-card': feature.highlight }]"
          :style="{ animationDelay: `${index * 0.1}s` }"
          @click="navigateTo(feature.path)"
        >
          <div class="feature-card-inner">
            <div class="feature-icon-wrap">
              <span class="feature-icon">{{ feature.icon }}</span>
              <div class="feature-glow"></div>
            </div>
            <div class="feature-info">
              <h3 class="feature-name">{{ feature.name }}</h3>
              <p class="feature-desc">{{ feature.desc }}</p>
            </div>
            <div class="feature-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
          <div class="feature-card-shine"></div>
        </div>
      </div>
    </section>

    <!-- ========== 3. AI 个性化推荐区 ========== -->
    <AIPersonalizedSection />

    <!-- ========== 4. 每日一诗（增强版） ========== -->
    <section class="daily-section">
      <div class="hitokoto-wrap">
        <div class="hitokoto-card">
          <div class="hitokoto-label">📜 今日一言</div>
          <p class="hitokoto-text">{{ hitokotoText }}</p>
          <p class="hitokoto-from" v-if="hitokotoFrom">— {{ hitokotoFrom }}</p>
        </div>
      </div>
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-deco">✦</span>
          每日一诗
          <span class="title-deco">✦</span>
        </h2>
        <p class="section-subtitle">每天一首，感受诗词之美</p>
      </div>
      <div class="daily-poem-wrapper" v-if="dailyPoem">
        <div class="daily-poem-bg-decoration"></div>
        <div class="daily-poem-card" @click="navigateToDetail(dailyPoem.id)">
          <div class="daily-poem-inner">
            <div class="daily-poem-left">
              <div class="daily-date-badge">
                <span class="daily-month">{{ currentMonth }}</span>
                <span class="daily-day">{{ currentDay }}</span>
              </div>
              <div class="daily-label-wrap">
                <span class="daily-label-icon">📅</span>
                <span>每日一诗</span>
              </div>
            </div>
            <div class="daily-poem-center">
              <h2 class="daily-title">{{ dailyPoem.title }}</h2>
              <p class="daily-author">{{ dailyPoem.author }} · {{ dailyPoem.dynasty }}</p>
              <div class="daily-content-wrap">
                <div class="daily-content-scroll">
                  <p class="daily-content" v-for="(line, i) in dailyPoem.content.split('\n')" :key="i">
                    {{ line }}
                  </p>
                </div>
              </div>
            </div>
            <div class="daily-poem-right">
              <button
                class="read-btn"
                @click.stop="toggleRead(dailyPoem)"
              >
                {{ isReading && readingPoemId === dailyPoem.id ? '⏹ 停止' : '🔊 朗读' }}
              </button>
              <button class="start-learn-btn" @click.stop="navigateToDetail(dailyPoem.id)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                开始学习
              </button>
              <div class="daily-action-tip">点击卡片查看详情</div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="daily-loading">
        <div class="loading-spinner large"></div>
        <p>加载每日一诗...</p>
      </div>
    </section>

    <!-- ========== 5. 三栏布局：排行榜 + 精选诗句 + 学习数据 ========== -->
    <section class="main-section" ref="mainSection">
      <div class="main-section-bg"></div>

      <!-- 左侧边栏：排行榜 -->
      <aside class="sidebar sidebar-left" ref="sidebarLeft">
        <div class="sidebar-card ranking-sidebar" :class="{ 'is-sticky': isLeftSticky }">
          <div class="sidebar-card-header">
            <h3 class="sidebar-card-title">
              <span class="sidebar-icon">🏆</span>
              排行榜
            </h3>
            <p class="sidebar-card-subtitle">诗词达人风采</p>
          </div>
          <div class="ranking-tabs">
            <button
              v-for="tab in rankingTabs"
              :key="tab.key"
              class="ranking-tab"
              :class="{ active: activeRankingTab === tab.key }"
              @click="switchRankingTab(tab.key)"
            >
              {{ tab.label }}
            </button>
          </div>
          <div class="ranking-list" v-if="!rankingLoading">
            <div
              v-for="(item, index) in currentRankingList"
              :key="item.id"
              class="ranking-item"
              :class="getRankingClass(index)"
              :style="{ animationDelay: `${index * 0.05}s` }"
            >
              <div class="ranking-position">
                <span v-if="index < 3" class="position-medal">{{ getMedalEmoji(index) }}</span>
                <span v-else class="position-number">{{ index + 1 }}</span>
              </div>
              <div class="ranking-avatar">
                <span>{{ item.username?.charAt(0) || '游' }}</span>
              </div>
              <div class="ranking-info">
                <div class="ranking-name">{{ item.username }}</div>
                <div class="ranking-meta">{{ item.meta }}</div>
              </div>
              <div class="ranking-score">
                <span class="score-value">{{ item.score }}</span>
                <span class="score-unit">{{ item.unit }}</span>
              </div>
            </div>
            <div v-if="currentRankingList.length === 0" class="ranking-empty">
              <p>暂无排名数据</p>
            </div>
          </div>
          <div v-else class="ranking-loading">
            <div class="loading-spinner"></div>
            <span>加载中...</span>
          </div>
        </div>
      </aside>

      <!-- 中间主栏：精选诗句 -->
      <main class="main-content">
        <div class="main-content-header">
          <h2 class="section-title">
            <span class="title-deco">✦</span>
            精选诗句
            <span class="title-deco">✦</span>
          </h2>
          <p class="section-subtitle">品味经典，感受诗词韵律</p>
        </div>

        <!-- 搜索 & 筛选 -->
        <div class="search-container">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="搜索诗词、诗人..."
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            搜索
          </button>
        </div>
        <div class="filter-container">
          <div class="filter-item">
            <label>朝代</label>
            <select v-model="dynastyFilter" @change="filterPoems" class="filter-select">
              <option value="">全部</option>
              <option value="唐">唐朝</option>
              <option value="宋">宋朝</option>
              <option value="元">元朝</option>
            </select>
          </div>
          <div class="filter-item">
            <label>诗人</label>
            <select v-model="authorFilter" @change="filterPoems" class="filter-select">
              <option value="">全部</option>
              <option v-for="author in authors" :key="author" :value="author">{{ author }}</option>
            </select>
          </div>
          <button class="reset-btn" @click="resetFilters">重置</button>
        </div>

        <!-- 诗词列表 -->
        <div class="poem-list">
          <div v-if="loading" class="loading-state">
            <div class="loading-spinner large"></div>
            <p>加载中...</p>
          </div>
          <div v-else-if="error" class="error-state">
            <p>{{ error }}</p>
            <button class="retry-btn" @click="fetchPoems">重试</button>
          </div>
          <div v-else-if="filteredPoems.length === 0" class="empty-state">
            <p>暂无诗词</p>
          </div>
          <template v-else>
            <div
              v-for="(poem, index) in filteredPoems"
              :key="poem.id"
              class="poem-item"
              :style="{ animationDelay: `${(index % 10) * 0.05}s` }"
              @click="navigateToDetail(poem.id)"
            >
              <div class="poem-item-inner">
                <p class="poem-content">{{ getShortContent(poem.content) }}</p>
                <p class="poem-author">{{ poem.author }} · 《{{ poem.title }}》</p>
                <div class="poem-tags">
                  <span class="poem-tag" v-if="poem.dynasty">{{ poem.dynasty }}</span>
                </div>
              </div>
              <button
                class="read-btn-small"
                @click.stop="toggleRead(poem)"
              >
                {{ isReading && readingPoemId === poem.id ? '⏹' : '🔊' }}
              </button>
            </div>
          </template>
        </div>
        <div v-if="filteredPoems.length > 0" class="load-more">
          <button v-if="hasMore" class="load-more-btn" @click="loadMore" :disabled="loadingMore">
            <span v-if="loadingMore" class="loading-spinner small"></span>
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </button>
          <p v-else class="no-more">已经到底了~</p>
        </div>
      </main>

      <!-- 右侧边栏：学习数据 -->
      <aside class="sidebar sidebar-right" ref="sidebarRight">
        <div class="sidebar-card stats-sidebar" :class="{ 'is-sticky': isRightSticky }">
          <div class="sidebar-card-header">
            <h3 class="sidebar-card-title">
              <span class="sidebar-icon">📊</span>
              学习数据
            </h3>
            <p class="sidebar-card-subtitle">{{ isLoggedIn ? '我的学习数据' : '平台数据一览' }}</p>
          </div>
          
          <!-- 未登录状态 -->
          <div v-if="!isLoggedIn" class="login-prompt">
            <div class="login-prompt-icon">🔐</div>
            <p class="login-prompt-text">登录后查看个人学习数据</p>
            <button class="login-prompt-btn" @click="$router.push('/login')">立即登录</button>
            <div class="login-prompt-divider">
              <span>或查看平台数据</span>
            </div>
            <div class="stats-vertical-list compact">
              <div class="stat-item" v-for="(stat, index) in platformStats" :key="stat.label">
                <div class="stat-item-header">
                  <span class="stat-item-icon">{{ stat.icon }}</span>
                  <div class="stat-item-info">
                    <div class="stat-item-label">{{ stat.label }}</div>
                    <div class="stat-item-value">{{ stat.displayValue }}<span class="stat-item-unit">{{ stat.unit }}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 已登录状态 -->
          <div v-else class="stats-vertical-list">
            <div
              class="stat-item"
              v-for="(stat, index) in userStatsData"
              :key="stat.label"
              :style="{ animationDelay: `${index * 0.1}s` }"
            >
              <div class="stat-item-header">
                <span class="stat-item-icon">{{ stat.icon }}</span>
                <div class="stat-item-info">
                  <div class="stat-item-label">{{ stat.label }}</div>
                  <div class="stat-item-value">{{ stat.displayValue }}<span class="stat-item-unit">{{ stat.unit }}</span></div>
                </div>
              </div>
              <div class="stat-item-bar">
                <div class="stat-item-bar-fill" :style="{ width: stat.percentage + '%', background: stat.barColor }"></div>
              </div>
              <div class="stat-item-sublabel">{{ stat.sublabel }}</div>
            </div>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>

<script>
import AIPersonalizedSection from '@/components/AIPersonalizedSection.vue'
import api from '@/services/api.js'

const API_BASE_URL = 'http://localhost:3000'

export default {
  name: 'Home',
  components: {
    AIPersonalizedSection
  },
  data() {
    return {
      // Hero
      heroTags: [
        { icon: '🤖', text: 'AI 智能讲解', color: '#667eea' },
        { icon: '🎮', text: '趣味对战', color: '#f093fb' },
        { icon: '📊', text: '学习分析', color: '#4facfe' },
        { icon: '✍️', text: 'AI 创作', color: '#fa709a' },
      ],
      // 功能卡片
      features: [
        { name: '诗词闯关', icon: '🏰', desc: '逐关挑战，层层递进，系统化学习古诗词', path: '/challenge', color: 'blue' },
        { name: '飞花令', icon: '🌸', desc: '在线对战，以诗会友，感受飞花令的乐趣', path: '/feihualing/single', color: 'pink' },
        { name: 'AI 创作', icon: '✒️', desc: '智能辅助创作，挥洒才情写就锦绣诗篇', path: '/creation', color: 'purple' },
        { name: '诗词跑酷', icon: '🏃', desc: '穿越文字方块塔，在游戏中背诵诗词经典', path: '/parkour', color: 'green' },
        { name: '诗词大富翁', icon: '🎲', desc: '接住千古名句，对接诗词灵魂，体验连击的快乐！', path: '/card-catch', color: 'amber' },
        { name: '学习分析', icon: '📊', desc: '详细记录学习轨迹，智能分析薄弱环节', path: '/dashboard', color: 'orange' },
      ],
      // 每日一诗
      dailyPoem: null,
      currentDate: new Date(),
      speechSynthesisSupported: 'speechSynthesis' in window,
      isReading: false,
      readingPoemId: null,
      speechUtterance: null,
      audio: null,
      // 一言
      hitokotoText: '心有猛虎，细嗅蔷薇',
      hitokotoFrom: '余光中',
      // 诗词列表
      poems: [],
      filteredPoems: [],
      authors: [],
      loading: true,
      loadingMore: false,
      hasMore: true,
      error: '',
      searchQuery: '',
      dynastyFilter: '',
      authorFilter: '',
      page: 1,
      pageSize: 20,
      savedScrollTop: 0,
      // 排行榜
      rankingTabs: [
        { key: 'feihua', label: '飞花令' },
        { key: 'challenge', label: '闯关' },
        { key: 'creation', label: '创作' },
      ],
      activeRankingTab: 'feihua',
      rankingData: {
        feihua: [],
        challenge: [],
        creation: [],
      },
      rankingLoading: false,
      // 滚动固定相关
      isLeftSticky: false,
      isRightSticky: false,
      sidebarOffsetTop: 0,
      // 登录状态
      isLoggedIn: false,
      // 用户学习数据
      userStatsData: [
        { icon: '📚', label: '已学诗词', value: 0, displayValue: '0', percentage: 0, counting: false, barColor: 'linear-gradient(90deg, #667eea, #764ba2)', unit: '首', sublabel: '累计学习诗词数' },
        { icon: '⏱️', label: '学习时长', value: 0, displayValue: '0', percentage: 0, counting: false, barColor: 'linear-gradient(90deg, #f093fb, #f5576c)', unit: '分钟', sublabel: '累计学习时间' },
        { icon: '🏆', label: '闯关进度', value: 0, displayValue: '0', percentage: 0, counting: false, barColor: 'linear-gradient(90deg, #4facfe, #00f2fe)', unit: '关', sublabel: '最高通关关卡' },
        { icon: '⚔️', label: '飞花令积分', value: 1000, displayValue: '1000', percentage: 50, counting: false, barColor: 'linear-gradient(90deg, #fa709a, #fee140)', unit: '分', sublabel: '当前排位积分' },
        { icon: '✍️', label: '创作作品', value: 0, displayValue: '0', percentage: 0, counting: false, barColor: 'linear-gradient(90deg, #a8edea, #fed6e3)', unit: '首', sublabel: '累计创作作品' },
        { icon: '📅', label: '本周打卡', value: 0, displayValue: '0', percentage: 0, counting: false, barColor: 'linear-gradient(90deg, #d299c2, #fef9d7)', unit: '天', sublabel: '近7天打卡天数' },
      ],
      // 平台统计数据（未登录时显示）
      platformStats: [
        { icon: '👥', label: '学习人数', value: 0, displayValue: '0', unit: '人' },
        { icon: '📝', label: '收录诗词', value: 0, displayValue: '0', unit: '首' },
        { icon: '🎯', label: '平均正确率', value: 0, displayValue: '0', unit: '%' },
      ],
    }
  },
  computed: {
    currentMonth() {
      return (this.currentDate.getMonth() + 1) + '月'
    },
    currentDay() {
      return this.currentDate.getDate()
    },
    currentRankingList() {
      return this.rankingData[this.activeRankingTab] || []
    },
  },
  beforeRouteLeave(to, from, next) {
    this.savedScrollTop = window.pageYOffset || document.documentElement.scrollTop
    next()
  },
  activated() {
    if (this.savedScrollTop > 0) {
      setTimeout(() => {
        window.scrollTo({ top: this.savedScrollTop, behavior: 'auto' })
      }, 100)
    }
  },
  mounted() {
    this.checkLoginStatus()
    this.fetchDailyPoem()
    this.fetchHitokoto()
    this.fetchPoems()
    this.fetchRankingData()
    this.fetchLearningStats()
    this.initScrollListener()
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll)
  },
  methods: {
    // 检查登录状态
    checkLoginStatus() {
      const token = localStorage.getItem('token')
      this.isLoggedIn = !!token
    },
    // 滚动监听
    initScrollListener() {
      this.$nextTick(() => {
        if (this.$refs.mainSection) {
          const rect = this.$refs.mainSection.getBoundingClientRect()
          this.sidebarOffsetTop = rect.top + window.pageYOffset
        }
      })
      window.addEventListener('scroll', this.handleScroll)
    },
    handleScroll() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const stickyThreshold = this.sidebarOffsetTop - 80
      this.isLeftSticky = scrollTop >= stickyThreshold
      this.isRightSticky = scrollTop >= stickyThreshold
    },
    // Hero 相关
    getParticleStyle(n) {
      const random = (min, max) => Math.random() * (max - min) + min
      return {
        left: random(0, 100) + '%',
        animationDelay: random(0, 5) + 's',
        animationDuration: random(3, 8) + 's',
        width: random(4, 10) + 'px',
        height: random(4, 10) + 'px',
        opacity: random(0.1, 0.4),
      }
    },
    scrollToContent() {
      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
    },
    // 功能导航
    navigateTo(path) {
      this.$router.push(path)
    },
    navigateToDetail(id) {
      this.$router.push(`/poem/${id}`)
    },
    // 每日一诗
    async fetchDailyPoem() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(`${API_BASE_URL}/api/daily-poem`, { signal: controller.signal });
        clearTimeout(timeout);
        if (response.ok) {
          this.dailyPoem = await response.json()
        } else {
          this.dailyPoem = {
            id: 1, title: '静夜思', author: '李白', dynasty: '唐',
            content: '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。'
          }
        }
      } catch (e) {
        console.warn('每日一诗获取失败，使用默认', e)
        this.dailyPoem = {
          id: 1, title: '静夜思', author: '李白', dynasty: '唐',
          content: '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。'
        }
      }
    },
    // 一言
    async fetchHitokoto() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch('https://v1.hitokoto.cn/?c=l', { signal: controller.signal });
        clearTimeout(timeout);
        if (response.ok) {
          const data = await response.json()
          if (data.hitokoto) {
            this.hitokotoText = data.hitokoto
            this.hitokotoFrom = data.from || data.from_who || ''
          }
        }
      } catch (e) {
        console.warn('一言获取失败', e)
      }
    },
    // 获取排行榜数据
    async fetchRankingData() {
      this.rankingLoading = true
      try {
        const tabs = ['feihua', 'challenge', 'creation']
        const promises = tabs.map(tab => api.home.getLeaderboard(tab))
        const results = await Promise.all(promises)
        tabs.forEach((tab, index) => {
          if (results[index].success && results[index].data) {
            this.rankingData[tab] = results[index].data
          }
        })
      } catch (e) {
        console.warn('排行榜数据获取失败', e)
      } finally {
        this.rankingLoading = false
      }
    },
    // 获取学习数据
    async fetchLearningStats() {
      try {
        const result = await api.home.getLearningStats()
        if (result.success && result.data) {
          if (result.data.loggedIn) {
            this.isLoggedIn = true
            this.updateUserStats(result.data)
          } else {
            this.isLoggedIn = false
            await this.fetchPlatformStats()
          }
        }
      } catch (e) {
        console.warn('学习数据获取失败', e)
        this.isLoggedIn = false
        await this.fetchPlatformStats()
      }
    },
    // 更新用户统计数据
    updateUserStats(data) {
      const maxPoems = 100
      const maxTime = 1000
      const maxLevel = 100
      const maxRating = 2000
      const maxCreations = 50
      const maxCheckins = 7

      this.userStatsData[0].value = data.poemsStudied || 0
      this.userStatsData[0].percentage = Math.min((data.poemsStudied / maxPoems) * 100, 100)
      
      this.userStatsData[1].value = Math.round((data.totalStudyTime || 0) / 60)
      this.userStatsData[1].percentage = Math.min((this.userStatsData[1].value / maxTime) * 100, 100)
      
      this.userStatsData[2].value = data.challengeLevel || 0
      this.userStatsData[2].percentage = Math.min((data.challengeLevel / maxLevel) * 100, 100)
      
      this.userStatsData[3].value = data.feihuaRating || 1000
      this.userStatsData[3].percentage = Math.min(((data.feihuaRating - 800) / (maxRating - 800)) * 100, 100)
      
      this.userStatsData[4].value = data.totalCreations || 0
      this.userStatsData[4].percentage = Math.min((data.totalCreations / maxCreations) * 100, 100)
      
      this.userStatsData[5].value = data.weeklyCheckins || 0
      this.userStatsData[5].percentage = Math.min((data.weeklyCheckins / maxCheckins) * 100, 100)

      this.userStatsData.forEach(stat => {
        this.animateCounter(stat)
      })
    },
    // 获取平台统计数据（未登录时）
    async fetchPlatformStats() {
      try {
        const data = { totalUsers: 12847, totalPoems: 56832 }
        this.platformStats[0].value = data.totalUsers || 12847
        this.platformStats[1].value = data.totalPoems || 56832
        this.platformStats[2].value = 86.5
        this.platformStats.forEach(stat => {
          this.animateCounter(stat)
        })
      } catch (e) {
        this.platformStats[0].value = 12847
        this.platformStats[1].value = 56832
        this.platformStats[2].value = 86.5
        this.platformStats.forEach(stat => {
          this.animateCounter(stat)
        })
      }
    },
    animateCounter(stat) {
      if (stat.counting) return
      stat.counting = true
      const duration = 2000
      const startTime = performance.now()
      const isFloat = !Number.isInteger(stat.value)
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        const current = stat.value * eased
        stat.displayValue = isFloat ? current.toFixed(1) : Math.floor(current).toLocaleString()
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          stat.displayValue = isFloat ? stat.value.toFixed(1) : stat.value.toLocaleString()
        }
      }
      requestAnimationFrame(animate)
    },
    // 排行榜
    switchRankingTab(key) {
      this.activeRankingTab = key
    },
    getRankingClass(index) {
      if (index === 0) return 'ranking-gold'
      if (index === 1) return 'ranking-silver'
      if (index === 2) return 'ranking-bronze'
      return ''
    },
    getMedalEmoji(index) {
      return ['🥇', '🥈', '🥉'][index]
    },
    // 诗词列表
    async fetchPoems() {
      try {
        if (this.page === 1) this.loading = true
        this.error = ''
        let url = `${API_BASE_URL}/api/poems?page=${this.page}&pageSize=${this.pageSize}&_=${Date.now()}`
        if (this.dynastyFilter) {
          url += `&dynasty=${encodeURIComponent(this.dynastyFilter)}`
        }
        if (this.authorFilter) {
          url += `&author=${encodeURIComponent(this.authorFilter)}`
        }
        if (!this.dynastyFilter && !this.authorFilter) {
          url += '&random=true'
        }
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)
        const response = await fetch(url, { signal: controller.signal })
        clearTimeout(timeout)
        if (!response.ok) throw new Error('获取诗词列表失败')
        const data = await response.json()
        
        this.hasMore = data.length === this.pageSize
        
        if (this.page === 1) {
          this.poems = data
          this.filteredPoems = data
          this.extractAuthors()
        } else {
          this.poems = [...this.poems, ...data]
          this.filteredPoems = this.poems
          this.extractAuthors()
        }
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
        this.loadingMore = false
      }
    },
    loadMore() {
      if (this.loadingMore || !this.hasMore) return
      this.loadingMore = true
      this.page++
      this.fetchPoems()
    },
    handleSearch() {
      if (this.searchQuery.trim()) {
        this.$router.push({ path: '/search', query: { q: this.searchQuery } })
      }
    },
    getShortContent(content) {
      if (!content) return ''
      const cleanContent = content.replace(/\s+/g, ' ').trim()
      return cleanContent.length > 50 ? cleanContent.substring(0, 50) + '...' : cleanContent
    },
    extractAuthors() {
      const authorSet = new Set()
      this.poems.forEach(poem => {
        if (poem.author) authorSet.add(poem.author)
      })
      this.authors = Array.from(authorSet).sort()
    },
    filterPoems() {
      this.page = 1
      this.poems = []
      this.hasMore = true
      this.fetchPoems()
    },
    resetFilters() {
      this.dynastyFilter = ''
      this.authorFilter = ''
      this.page = 1
      this.poems = []
      this.hasMore = true
      this.fetchPoems()
    },
    // 朗读
    toggleRead(poem) {
      if (this.isReading) {
        this.stopReading()
        return
      }
      this.startReading(poem)
    },
    stopReading() {
      if (this.audio) {
        this.audio.pause()
        this.audio.currentTime = 0
        this.audio = null
      }
      if (this.speechSynthesisSupported) {
        speechSynthesis.cancel()
      }
      this.isReading = false
      this.readingPoemId = null
    },
    async startReading(poem) {
      if (!poem || !poem.content) return
      
      this.stopReading()
      this.isReading = true
      this.readingPoemId = poem.id
      
      try {
        let text = poem.content
        text = text.replace(/([。！？；])\s*/g, '$1，').replace(/\n/g, '。')
        
        const audioBlob = await api.ai.tts(text)
        const audioUrl = URL.createObjectURL(audioBlob)
        
        this.audio = new Audio(audioUrl)
        this.audio.onended = () => {
          this.isReading = false
          this.readingPoemId = null
          URL.revokeObjectURL(audioUrl)
        }
        this.audio.onerror = () => {
          console.error('音频播放失败')
          this.isReading = false
          this.readingPoemId = null
          URL.revokeObjectURL(audioUrl)
        }
        
        this.audio.play()
      } catch (error) {
        console.error('朗读失败:', error)
        this.isReading = false
        this.readingPoemId = null
      }
    },
  },
}
</script>

<style scoped>
/* ========== 全局布局 ========== */
.home {
  padding: 0 0 60px 0;
  max-width: 1600px;
  margin: 0 auto;
}

/* ========== 通用 Section Header ========== */
.section-header {
  text-align: center;
  margin-bottom: 48px;
}
.section-title {
  font-size: 28px;
  font-weight: 700;
  color: #8b4513;
  font-family: 'Noto Serif SC', 'SimSun', 'STSong', serif;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.main-content-header .section-title {
  font-size: 24px;
}
.title-deco {
  color: #cd853f;
  font-size: 18px;
}
.section-subtitle {
  font-size: 15px;
  color: #888;
  font-family: 'Noto Sans SC', sans-serif;
}

/* ========== 1. HERO ========== */
.hero-section {
  position: relative;
  min-height: 88vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.05) 0%, rgba(205, 133, 63, 0.08) 50%, rgba(218, 165, 32, 0.05) 100%);
  border-bottom: 1px solid rgba(205, 133, 63, 0.15);
  margin-bottom: 80px;
}
.hero-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.hero-particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, #cd853f, transparent);
  animation: float-particle linear infinite;
}
@keyframes float-particle {
  0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-10vh) rotate(360deg); opacity: 0; }
}
.hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 800px;
  padding: 0 20px;
  animation: fadeInUp 1s ease-out;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 18px;
  background: rgba(102, 126, 234, 0.12);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 50px;
  font-size: 14px;
  color: #667eea;
  font-family: 'Noto Sans SC', sans-serif;
  margin-bottom: 28px;
  backdrop-filter: blur(8px);
}
.badge-dot {
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
  animation: pulse-dot 2s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.6; }
}
.hero-title {
  margin: 0 0 20px 0;
  line-height: 1.3;
}
.title-first {
  display: block;
  font-size: 52px;
  font-weight: 700;
  font-family: 'Noto Serif SC', 'Ma Shan Zheng', serif;
  background: linear-gradient(135deg, #8b4513, #cd853f, #d4a853);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 8px;
}
.title-second {
  display: block;
  font-size: 30px;
  font-weight: 400;
  color: #666;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  letter-spacing: 12px;
  margin-top: 8px;
}
.hero-subtitle {
  font-size: 17px;
  color: #666;
  font-family: 'Noto Sans SC', sans-serif;
  margin-bottom: 36px;
  line-height: 1.6;
}
.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}
.hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 50px;
  font-size: 14px;
  color: #8b4513;
  font-family: 'Noto Sans SC', sans-serif;
  backdrop-filter: blur(12px);
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(139, 69, 19, 0.08);
}
.hero-tag:hover {
  background: rgba(205, 133, 63, 0.1);
  border-color: rgba(205, 133, 63, 0.4);
  transform: translateY(-2px);
}
.tag-icon { font-size: 16px; }
.hero-scroll-indicator {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #999;
  font-size: 12px;
  font-family: 'Noto Sans SC', sans-serif;
  animation: bounce 2s ease-in-out infinite;
  z-index: 2;
}
.scroll-arrow {
  width: 20px;
  height: 20px;
  border-right: 2px solid #cd853f;
  border-bottom: 2px solid #cd853f;
  transform: rotate(45deg);
}
@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(8px); }
}

/* ========== 2. 功能入口 ========== */
.features-section {
  padding: 0 24px 80px;
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 1100px;
  margin: 0 auto;
}
.feature-card {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  animation: fadeInUp 0.6s ease-out both;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.feature-card:hover {
  transform: translateY(-6px);
}
.feature-card--blue { background: linear-gradient(135deg, #e8f0fe, #d2e3fc); }
.feature-card--blue:hover { box-shadow: 0 12px 40px rgba(66, 133, 244, 0.2); }
.feature-card--pink { background: linear-gradient(135deg, #fce4ec, #f8bbd0); }
.feature-card--pink:hover { box-shadow: 0 12px 40px rgba(233, 30, 99, 0.2); }
.feature-card--purple { background: linear-gradient(135deg, #f3e5f5, #e1bee7); }
.feature-card--purple:hover { box-shadow: 0 12px 40px rgba(156, 39, 176, 0.2); }
.feature-card--green { background: linear-gradient(135deg, #e8f5e9, #c8e6c9); }
.feature-card--green:hover { box-shadow: 0 12px 40px rgba(76, 175, 80, 0.2); }
.feature-card--orange { background: linear-gradient(135deg, #fff3e0, #ffe0b2); }
.feature-card--orange:hover { box-shadow: 0 12px 40px rgba(255, 152, 0, 0.2); }
.feature-card--teal { background: linear-gradient(135deg, #e0f2f1, #b2dfdb); }
.feature-card--teal:hover { box-shadow: 0 12px 40px rgba(0, 150, 136, 0.2); }
.feature-card--amber { background: linear-gradient(135deg, #fff8e1, #ffecb3); }
.feature-card--amber:hover { box-shadow: 0 12px 40px rgba(255, 160, 0, 0.2); }
.feature-card--pink-light { background: linear-gradient(135deg, #fce4ec, #f8bbd0); }
.feature-card--pink-light:hover { box-shadow: 0 12px 40px rgba(233, 30, 99, 0.15); }
/* 联机对战入口特殊高亮样式 */
.feature-card.highlight-card {
  background: linear-gradient(135deg, #ff6b9d 0%, #c44569 50%, #ff6b9d 100%) !important;
  background-size: 200% 200%;
  animation: highlightPulse 3s ease-in-out infinite !important;
  box-shadow: 0 8px 32px rgba(255, 107, 157, 0.4) !important;
  transform: scale(1.03);
  z-index: 10;
}
.feature-card.highlight-card .feature-name {
  font-size: 22px;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.feature-card.highlight-card .feature-desc {
  color: rgba(255,255,255,0.9);
}
.feature-card.highlight-card .feature-arrow {
  color: rgba(255,255,255,0.7);
}
.feature-card.highlight-card:hover {
  transform: scale(1.06) translateY(-4px) !important;
  box-shadow: 0 16px 48px rgba(255, 107, 157, 0.5) !important;
}
@keyframes highlightPulse {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.feature-card-inner {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  z-index: 1;
}
.feature-icon-wrap {
  position: relative;
  width: 56px;
  height: 56px;
}
.feature-icon {
  font-size: 32px;
  position: relative;
  z-index: 2;
}
.feature-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  filter: blur(8px);
  z-index: 1;
}
.feature-info { flex: 1; }
.feature-name {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0 0 8px 0;
  font-family: 'Noto Serif SC', 'SimSun', serif;
}
.feature-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
  font-family: 'Noto Sans SC', sans-serif;
}
.feature-arrow {
  color: #999;
  align-self: flex-end;
  transition: transform 0.3s ease, color 0.3s ease;
}
.feature-card:hover .feature-arrow {
  transform: translateX(4px);
  color: #8b4513;
}
.feature-card-shine {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent 40%, rgba(255, 255, 255, 0.3) 50%, transparent 60%);
  transform: rotate(30deg) translateX(-100%);
  transition: transform 0.6s ease;
  pointer-events: none;
}
.feature-card:hover .feature-card-shine {
  transform: rotate(30deg) translateX(100%);
}

/* ========== 3. 每日一诗 ========== */
.daily-section {
  padding: 80px 24px;
}
.hitokoto-wrap {
  max-width: 1100px;
  margin: 0 auto 32px;
}
.daily-poem-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  position: relative;
}
.daily-poem-bg-decoration {
  position: absolute;
  inset: -20px;
  background: radial-gradient(ellipse at top, rgba(205, 133, 63, 0.08), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.daily-poem-card {
  background: linear-gradient(135deg, rgba(255, 252, 240, 0.95), rgba(255, 248, 225, 0.9));
  backdrop-filter: blur(20px);
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 24px;
  padding: 40px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  z-index: 1;
  box-shadow: 0 8px 40px rgba(139, 69, 19, 0.1);
}
.daily-poem-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(139, 69, 19, 0.15);
}
.daily-poem-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #cd853f, #d4a853, #8b4513);
}
.daily-poem-inner {
  display: flex;
  gap: 40px;
  align-items: center;
}
.daily-poem-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.daily-date-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #8b4513, #cd853f);
  color: white;
  border-radius: 12px;
  padding: 12px 16px;
  min-width: 70px;
}
.daily-month { font-size: 14px; opacity: 0.8; font-family: 'Noto Sans SC', sans-serif; }
.daily-day { font-size: 32px; font-weight: 700; font-family: 'Noto Serif SC', serif; }
.daily-label-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #8b4513;
  font-family: 'Noto Sans SC', sans-serif;
}
.daily-label-icon { font-size: 14px; }
.daily-poem-center { flex: 1; }
.daily-title {
  font-size: 28px;
  font-weight: 700;
  color: #8b4513;
  margin: 0 0 8px 0;
  font-family: 'Noto Serif SC', 'SimSun', serif;
}
.daily-author {
  font-size: 15px;
  color: #888;
  margin: 0 0 16px 0;
  font-family: 'Noto Sans SC', sans-serif;
}
.daily-content-wrap {
  background: rgba(139, 69, 19, 0.04);
  border-radius: 12px;
  padding: 16px 20px;
  border: 1px solid rgba(205, 133, 63, 0.1);
  max-height: 120px;
  overflow: hidden;
}
.daily-content-scroll {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.daily-content {
  font-size: 16px;
  color: #555;
  line-height: 1.8;
  margin: 0;
  font-family: 'SimSun', 'STSong', serif;
  text-align: center;
}
.daily-poem-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
  align-items: center;
}
.read-btn {
  padding: 10px 24px;
  background: rgba(255, 252, 240, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 50px;
  color: #8b4513;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Sans SC', sans-serif;
  white-space: nowrap;
}
.read-btn:hover {
  background: rgba(255, 252, 240, 0.95);
  border-color: rgba(205, 133, 63, 0.5);
  transform: translateY(-2px);
}
.start-learn-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #4facfe, #00f2fe);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Sans SC', sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.start-learn-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(79, 172, 254, 0.35);
}
.daily-action-tip {
  font-size: 11px;
  color: #bbb;
  font-family: 'Noto Sans SC', sans-serif;
  text-align: center;
}
.daily-loading {
  text-align: center;
  padding: 60px;
  color: #888;
  font-family: 'Noto Sans SC', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* ========== 5. 三栏布局 ========== */
.main-section {
  position: relative;
  padding: 60px 24px;
  display: grid;
  grid-template-columns: 280px 1fr 260px;
  gap: 24px;
  align-items: start;
  max-width: 1400px;
  margin: 0 auto;
}
.main-section-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 5% 50%, rgba(102, 126, 234, 0.04) 0%, transparent 50%),
    radial-gradient(circle at 95% 50%, rgba(244, 114, 208, 0.04) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

/* 通用侧边栏卡片 */
.sidebar-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(205, 133, 63, 0.1);
  border-radius: 20px;
  padding: 24px;
  position: sticky;
  top: 80px;
  z-index: 10;
  box-shadow: 0 4px 24px rgba(139, 69, 19, 0.08);
  transition: all 0.3s ease;
}
.sidebar-card.is-sticky {
  box-shadow: 0 8px 32px rgba(139, 69, 19, 0.15);
  border-color: rgba(205, 133, 63, 0.25);
}
.sidebar-card-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(205, 133, 63, 0.1);
}
.sidebar-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #8b4513;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.sidebar-icon { font-size: 18px; }
.sidebar-card-subtitle {
  font-size: 12px;
  color: #bbb;
  font-family: 'Noto Sans SC', sans-serif;
  margin: 0;
}

/* 排行榜 */
.ranking-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
}
.ranking-tab {
  flex: 1;
  padding: 6px 0;
  background: rgba(205, 133, 63, 0.06);
  border: 1px solid rgba(205, 133, 63, 0.12);
  border-radius: 8px;
  font-size: 12px;
  color: #888;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Sans SC', sans-serif;
  text-align: center;
}
.ranking-tab.active {
  background: linear-gradient(135deg, #8b4513, #cd853f);
  color: white;
  border-color: transparent;
}
.ranking-tab:hover:not(.active) {
  background: rgba(205, 133, 63, 0.12);
  color: #8b4513;
}
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 500px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(205, 133, 63, 0.2) transparent;
}
.ranking-list::-webkit-scrollbar { width: 4px; }
.ranking-list::-webkit-scrollbar-track { background: transparent; }
.ranking-list::-webkit-scrollbar-thumb { background: rgba(205, 133, 63, 0.2); border-radius: 2px; }
.ranking-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(205, 133, 63, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  animation: fadeInUp 0.5s ease-out both;
  transition: all 0.3s ease;
}
.ranking-item:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateX(3px);
  box-shadow: 0 2px 12px rgba(139, 69, 19, 0.08);
}
.ranking-gold { background: rgba(255, 215, 0, 0.08); border-color: rgba(255, 215, 0, 0.2); }
.ranking-silver { background: rgba(192, 192, 192, 0.08); border-color: rgba(192, 192, 192, 0.2); }
.ranking-bronze { background: rgba(205, 127, 50, 0.08); border-color: rgba(205, 127, 50, 0.2); }
.ranking-position {
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}
.position-medal { font-size: 18px; }
.position-number {
  font-size: 13px;
  font-weight: 600;
  color: #bbb;
  font-family: 'Noto Sans SC', sans-serif;
}
.ranking-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #cd853f, #8b4513);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Noto Serif SC', serif;
  flex-shrink: 0;
}
.ranking-gold .ranking-avatar { background: linear-gradient(135deg, #ffd700, #ffaa00); }
.ranking-silver .ranking-avatar { background: linear-gradient(135deg, #c0c0c0, #a8a8a8); }
.ranking-bronze .ranking-avatar { background: linear-gradient(135deg, #cd7f32, #b87333); }
.ranking-info { flex: 1; min-width: 0; }
.ranking-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  font-family: 'Noto Serif SC', serif;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ranking-meta {
  font-size: 11px;
  color: #aaa;
  font-family: 'Noto Sans SC', sans-serif;
}
.ranking-score {
  display: flex;
  align-items: baseline;
  gap: 2px;
  flex-shrink: 0;
}
.score-value {
  font-size: 16px;
  font-weight: 700;
  color: #8b4513;
  font-family: 'Noto Serif SC', serif;
}
.score-unit {
  font-size: 11px;
  color: #aaa;
  font-family: 'Noto Sans SC', sans-serif;
}
.ranking-empty {
  text-align: center;
  padding: 24px;
  color: #bbb;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 13px;
}
.ranking-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  gap: 12px;
  color: #888;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 13px;
}

/* 登录提示 */
.login-prompt {
  text-align: center;
}
.login-prompt-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
.login-prompt-text {
  font-size: 14px;
  color: #666;
  font-family: 'Noto Sans SC', sans-serif;
  margin-bottom: 16px;
}
.login-prompt-btn {
  padding: 10px 28px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 14px;
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  transition: all 0.3s ease;
}
.login-prompt-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35);
}
.login-prompt-divider {
  display: flex;
  align-items: center;
  margin: 20px 0;
}
.login-prompt-divider::before,
.login-prompt-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(205, 133, 63, 0.15);
}
.login-prompt-divider span {
  padding: 0 12px;
  font-size: 12px;
  color: #bbb;
  font-family: 'Noto Sans SC', sans-serif;
}
.stats-vertical-list.compact .stat-item {
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(205, 133, 63, 0.06);
}
.stats-vertical-list.compact .stat-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

/* 主内容区 */
.main-content {
  position: relative;
  z-index: 1;
}
.main-content-header {
  text-align: center;
  margin-bottom: 24px;
}
.main-content-header .section-title {
  margin-bottom: 6px;
}
.search-container {
  display: flex;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 14px;
  padding: 5px;
  margin-bottom: 12px;
  box-shadow: 0 2px 12px rgba(139, 69, 19, 0.06);
}
.search-input {
  flex: 1;
  padding: 10px 14px;
  font-size: 14px;
  border: none;
  outline: none;
  background: transparent;
  color: #333;
  font-family: 'Noto Sans SC', sans-serif;
}
.search-input::placeholder { color: #bbb; }
.search-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: linear-gradient(135deg, #8b4513, #cd853f);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Sans SC', sans-serif;
  white-space: nowrap;
}
.search-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(139, 69, 19, 0.25);
}
.filter-container {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(205, 133, 63, 0.1);
  margin-bottom: 20px;
}
.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-item label {
  font-size: 12px;
  color: #888;
  font-family: 'Noto Sans SC', sans-serif;
  white-space: nowrap;
}
.filter-select {
  padding: 5px 10px;
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 8px;
  outline: none;
  background: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  color: #555;
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
}
.reset-btn {
  padding: 5px 14px;
  background: rgba(205, 133, 63, 0.1);
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 8px;
  font-size: 12px;
  color: #8b4513;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Sans SC', sans-serif;
  margin-left: auto;
}
.reset-btn:hover { background: rgba(205, 133, 63, 0.2); }

/* 诗词列表 */
.poem-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}
.poem-item {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(205, 133, 63, 0.1);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: fadeInUp 0.5s ease-out both;
  position: relative;
}
.poem-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 28px rgba(139, 69, 19, 0.1);
  border-color: rgba(205, 133, 63, 0.25);
  background: rgba(255, 255, 255, 0.9);
}
.poem-item-inner { padding-right: 36px; }
.poem-content {
  font-size: 15px;
  color: #444;
  line-height: 1.7;
  margin: 0 0 8px 0;
  font-family: 'SimSun', 'STSong', serif;
}
.poem-author {
  font-size: 12px;
  color: #999;
  margin: 0;
  font-family: 'Noto Sans SC', sans-serif;
  text-align: right;
}
.poem-tags {
  display: flex;
  gap: 5px;
  margin-top: 8px;
  justify-content: flex-start;
}
.poem-tag {
  padding: 2px 7px;
  background: rgba(139, 69, 19, 0.06);
  color: #8b4513;
  border-radius: 4px;
  font-size: 10px;
  font-family: 'Noto Sans SC', sans-serif;
}
.read-btn-small {
  position: absolute;
  bottom: 14px;
  right: 14px;
  width: 28px;
  height: 28px;
  background: rgba(255, 252, 240, 0.9);
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.read-btn-small:hover {
  background: rgba(255, 252, 240, 1);
  transform: scale(1.1);
}
.loading-state, .error-state, .empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 48px;
  color: #888;
  font-family: 'Noto Sans SC', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.error-state { color: #e57373; }
.retry-btn {
  padding: 7px 20px;
  background: rgba(205, 133, 63, 0.1);
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 8px;
  color: #8b4513;
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 13px;
}
.load-more {
  text-align: center;
  margin-bottom: 20px;
}
.load-more-btn {
  padding: 10px 36px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 50px;
  font-size: 13px;
  color: #8b4513;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Sans SC', sans-serif;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.load-more-btn:hover:not(:disabled) {
  background: rgba(205, 133, 63, 0.1);
  transform: translateY(-2px);
}
.load-more-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.no-more {
  text-align: center;
  color: #999;
  font-size: 14px;
  padding: 20px 0;
}

/* 右侧统计数据 */
.stats-vertical-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.stat-item {
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(205, 133, 63, 0.08);
  animation: fadeInUp 0.5s ease-out both;
}
.stat-item:last-child { border-bottom: none; padding-bottom: 0; }
.stat-item-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.stat-item-icon { font-size: 22px; flex-shrink: 0; }
.stat-item-info { flex: 1; }
.stat-item-label {
  font-size: 12px;
  color: #888;
  font-family: 'Noto Sans SC', sans-serif;
  margin-bottom: 2px;
}
.stat-item-value {
  font-size: 22px;
  font-weight: 700;
  color: #8b4513;
  font-family: 'Noto Serif SC', serif;
}
.stat-item-unit {
  font-size: 12px;
  font-weight: 400;
  color: #aaa;
  margin-left: 2px;
}
.stat-item-bar {
  height: 5px;
  background: rgba(205, 133, 63, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}
.stat-item-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 2s cubic-bezier(0.4, 0, 0.2, 1);
}
.stat-item-sublabel {
  font-size: 11px;
  color: #bbb;
  font-family: 'Noto Sans SC', sans-serif;
}

/* 今日一言（位于每日一诗上方） */
.hitokoto-card {
  background: linear-gradient(135deg, rgba(255, 252, 240, 0.95), rgba(255, 248, 225, 0.88));
  backdrop-filter: blur(12px);
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 20px;
  padding: 22px 28px;
  box-shadow: 0 4px 20px rgba(139, 69, 19, 0.08);
}
.hitokoto-label {
  font-size: 12px;
  color: #cd853f;
  font-family: 'Noto Sans SC', sans-serif;
  margin-bottom: 10px;
  font-weight: 600;
}
.hitokoto-text {
  font-size: 14px;
  color: #555;
  font-family: 'SimSun', 'STSong', serif;
  line-height: 1.7;
  margin: 0 0 8px 0;
  font-style: italic;
}
.hitokoto-from {
  font-size: 12px;
  color: #aaa;
  font-family: 'Noto Sans SC', sans-serif;
  margin: 0;
  text-align: right;
}

/* ========== 加载动画 ========== */
.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(205, 133, 63, 0.15);
  border-top-color: #cd853f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.loading-spinner.large { width: 36px; height: 36px; border-width: 3px; }
.loading-spinner.small { width: 14px; height: 14px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ========== 响应式 ========== */
@media (max-width: 1200px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
  .ai-recommend-grid { grid-template-columns: repeat(2, 1fr); }
  .main-section {
    grid-template-columns: 240px 1fr 220px;
    gap: 16px;
    padding: 60px 16px;
  }
}
@media (max-width: 900px) {
  .main-section {
    grid-template-columns: 1fr;
    padding: 60px 16px;
  }
  .sidebar {
    position: static !important;
  }
  .sidebar-left { order: 2; }
  .main-content { order: 1; }
  .sidebar-right { order: 3; }
  .ranking-sidebar, .stats-sidebar {
    position: static !important;
  }
  .stats-vertical-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
  .sidebar-right {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    align-items: start;
  }
  .poem-list { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .title-first { font-size: 36px; letter-spacing: 4px; }
  .title-second { font-size: 20px; letter-spacing: 6px; }
  .hero-subtitle { font-size: 15px; }
  .hero-tags { gap: 8px; }
  .hero-tag { padding: 6px 14px; font-size: 13px; }
  .features-grid { grid-template-columns: 1fr; }
  .ai-recommend-grid { grid-template-columns: 1fr; }
  .daily-poem-inner { flex-direction: column; text-align: center; gap: 20px; }
  .daily-poem-left { flex-direction: row; justify-content: center; }
  .daily-content-wrap { max-height: none; }
  .daily-poem-right { flex-direction: row; flex-wrap: wrap; justify-content: center; }
  .section-title { font-size: 22px; }
  .sidebar-right {
    grid-template-columns: 1fr;
  }
  .stats-vertical-list {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 480px) {
  .stats-vertical-list { grid-template-columns: 1fr 1fr; gap: 12px; }
  .hero-section { min-height: 70vh; }
  .filter-container { flex-direction: column; align-items: flex-start; }
  .reset-btn { margin-left: 0; }
  .daily-poem-card { padding: 24px; }
  .sidebar-right {
    grid-template-columns: 1fr;
  }
}
</style>
