<template>
  <div class="search-page">

    <!-- 动态背景粒子 -->
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>

    <!-- 顶部背景装饰 -->
    <div class="header-bg-decor">
      <div class="decor-circle c1"></div>
      <div class="decor-circle c2"></div>
      <div class="decor-circle c3"></div>
    </div>

    <!-- 页面头部 -->
    <div class="search-header">
      <h1 class="page-title">
        <span class="title-icon" aria-hidden="true">📚</span>
        诗词探索
      </h1>
      <p class="page-subtitle">输入诗意关键词，开启一场穿越千年的诗词之旅</p>
    </div>

    <!-- 智能搜索框 -->
    <div class="search-wrapper">
      <div class="search-box" :class="{ focused: isSearchFocused }">
        <div class="search-input-wrap">
          <svg class="search-icon" width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <input
            ref="searchInputRef"
            type="text"
            v-model="searchQuery"
            placeholder="输入诗词标题、作者或诗句..."
            class="search-input"
            @focus="onSearchFocus"
            @blur="onSearchBlur"
            @input="onSearchInput"
            @keyup.enter="performSearch"
            @keyup.up="navigateSuggestion(-1)"
            @keyup.down="navigateSuggestion(1)"
            autocomplete="off"
            spellcheck="false"
          />
          <button v-if="searchQuery" class="clear-btn" @click="clearSearch">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <button class="search-btn" @click="performSearch" :disabled="!searchQuery.trim()">
          <span v-if="searchLoading" class="btn-spinner"></span>
          <span v-else>探索</span>
        </button>
      </div>

      <!-- AI智能补全建议 -->
      <Transition name="dropdown">
        <div v-if="showSuggestions && suggestions.length > 0" class="suggestions-dropdown">
          <div class="suggestions-list">
            <div
              v-for="(suggestion, idx) in suggestions"
              :key="idx"
              class="suggestion-item"
              :class="{ active: idx === activeSuggestionIdx }"
              @mousedown.prevent="selectSuggestion(suggestion)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="suggestion-icon">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span class="suggestion-text" v-html="highlightMatch(suggestion.text, searchQuery)"></span>
              <span v-if="suggestion.tag" class="suggestion-tag">{{ suggestion.tag }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 搜索分类快捷标签 -->
    <div class="category-chips" v-if="!hasSearched && !searchQuery">
      <span class="chips-label">快速探索</span>
      <div class="chips-row">
        <button
          v-for="chip in quickChips"
          :key="chip.label"
          class="category-chip"
          :data-color="chip.color"
          @click="searchByCategory(chip)"
        >
          <span class="chip-icon">{{ chip.icon }}</span>
          {{ chip.label }}
        </button>
      </div>
    </div>

    <!-- 热门搜索词 -->
    <div class="hot-topics" v-if="!hasSearched && !searchQuery && hotTopics.length > 0">
      <div class="hot-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" stroke="#FF5722" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" stroke="#FF5722" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        热门搜索
      </div>
      <div class="hot-tags">
        <button
          v-for="(topic, idx) in hotTopics"
          :key="idx"
          class="hot-tag"
          :class="{ top: idx < 3 }"
          @click="searchByTopic(topic)"
        >
          <span class="hot-rank" v-if="idx < 3">{{ idx + 1 }}</span>
          {{ topic }}
        </button>
      </div>
    </div>

    <!-- 搜索历史 -->
    <div class="search-history" v-if="!hasSearched && searchHistory.length > 0">
      <div class="history-header">
        <span class="history-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          最近搜索
        </span>
        <button class="clear-history-btn" @click="clearHistory">清空</button>
      </div>
      <div class="history-tags">
        <button
          v-for="(item, idx) in searchHistory.slice(0, 8)"
          :key="idx"
          class="history-tag"
          @click="searchByTopic(item)"
        >
          {{ item }}
        </button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="search-main" v-if="hasSearched">

      <!-- AI智能分析卡片 -->
      <div class="ai-analysis-card glass-card" v-if="aiAnalysis">
        <div class="ai-analysis-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="#6495ed" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>AI智能解读</span>
          <!-- 情感/题材检测徽章 -->
          <span v-if="searchEmotion" class="emotion-badge">
            {{ searchIntent === 'emotion' ? '情感搜索' : searchIntent === 'theme' ? '题材搜索' : '意象搜索' }}：{{ searchEmotion }}
          </span>
        </div>
      <!-- 情感搜索提示 -->
      <div class="emotion-hint" v-if="searchEmotion && searchEmotion !== query">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#6495ed" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        检测到您可能在寻找关于「{{ searchEmotion }}」的诗词
      </div>
      <div class="emotion-hint emotion-hint-neutral" v-if="emotionOnly && searchEmotion">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#8d6e63" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        关键词未精确匹配，正在根据「{{ searchEmotion }}」主题为你扩展搜索
      </div>
        <div class="ai-analysis-body">
          <div class="ai-summary" v-if="aiAnalysis.summary">
            <p>{{ aiAnalysis.summary }}</p>
          </div>
          <div class="ai-tags" v-if="aiAnalysis.tags && aiAnalysis.tags.length">
            <span v-for="tag in aiAnalysis.tags" :key="tag" class="ai-tag">{{ tag }}</span>
          </div>
          <div class="ai-suggestions" v-if="aiAnalysis.suggestions && aiAnalysis.suggestions.length">
            <div class="suggestions-title">相关探索方向</div>
            <div class="suggestion-chips">
              <button
                v-for="(s, i) in aiAnalysis.suggestions"
                :key="i"
                class="suggestion-chip"
                @click="searchByTopic(s)"
              >
                {{ s }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- "您是否在找"纠错建议 -->
      <div class="did-you-mean glass-card" v-if="didYouMean && didYouMean !== searchQuery">
        <div class="did-you-mean-text">
          您是否在找：
          <button class="did-you-mean-btn" @click="searchQuery = didYouMean; performSearch()">
            {{ didYouMean }}
          </button>
        </div>
      </div>

      <!-- 搜索结果统计 -->
      <div class="results-header">
        <div class="results-meta">
          <span class="results-count">
            <template v-if="searchLoading">搜索中...</template>
            <template v-else-if="results.length > 0">
              找到 <strong>{{ results.length }}</strong> 首诗词
              <span class="time-cost" v-if="searchTimeCost">（耗时 {{ searchTimeCost }}ms）</span>
            </template>
            <template v-else>未找到相关诗词</template>
          </span>
        </div>

        <!-- 结果排序/筛选 -->
        <div class="results-filter" v-if="results.length > 0">
          <button
            v-for="filter in filterOptions"
            :key="filter.value"
            class="filter-btn"
            :class="{ active: activeFilter === filter.value }"
            @click="setFilter(filter.value)"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>

      <!-- 诗词结果网格 -->
      <div class="poem-grid" v-if="results.length > 0">
        <div
          v-for="poem in filteredResults"
          :key="poem.id"
          class="poem-card glass-card"
          :class="{ 'is-highlight': highlightedPoems.has(poem.id) }"
          @click="navigateToDetail(poem.id)"
        >
          <!-- 卡片顶部装饰线 -->
          <div class="card-topbar" :style="{ background: getCardGradient(poem) }"></div>

          <div class="card-body">
            <div class="card-header">
              <h3 class="card-title">{{ poem.title }}</h3>
              <span class="card-dynasty">{{ poem.dynasty }}</span>
            </div>
            <p class="card-author">{{ poem.author }}</p>
            <p class="card-content">{{ poem.content }}</p>

            <!-- 关键词高亮 -->
            <div class="card-highlight" v-if="getMatchedKeywords(poem)">
              <span class="highlight-label">匹配：</span>
              <span v-for="kw in getMatchedKeywords(poem)" :key="kw" class="keyword-badge">{{ kw }}</span>
            </div>
          </div>

          <div class="card-footer">
            <div class="card-tags">
              <span v-if="poem.level" class="card-tag level-tag">Lv.{{ poem.level }}</span>
              <span v-if="poem.tags && poem.tags.length" v-for="tag in poem.tags.slice(0, 2)" :key="tag" class="card-tag">{{ tag }}</span>
            </div>
            <div class="card-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 空结果 -->
      <div class="empty-results" v-if="!searchLoading && results.length === 0">
        <div class="empty-illustration">
          <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" fill="rgba(107,142,35,0.06)" stroke="rgba(107,142,35,0.15)" stroke-width="1.5"/>
            <path d="M35 50 L45 60 L65 40" stroke="rgba(107,142,35,0.2)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <text x="50" y="75" text-anchor="middle" fill="rgba(107,142,35,0.4)" font-size="12" font-family="SimSun">未找到</text>
          </svg>
        </div>
        <h3 class="empty-title">未找到相关诗词</h3>
        <p class="empty-desc">换个关键词试试，或使用下方推荐进行探索</p>
        <div class="empty-suggestions">
          <button
            v-for="tip in searchTips"
            :key="tip"
            class="tip-btn"
            @click="searchByTopic(tip)"
          >
            {{ tip }}
          </button>
        </div>
      </div>
    </div>

    <!-- 初始未搜索状态 -->
    <div class="initial-explore" v-if="!hasSearched && !searchQuery">
      <div class="explore-grid">
        <div class="explore-card" v-for="card in exploreCards" :key="card.title" @click="handleExploreCard(card)">
          <div class="explore-icon">{{ card.icon }}</div>
          <div class="explore-info">
            <h4>{{ card.title }}</h4>
            <p>{{ card.desc }}</p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { request, TIMEOUTS } from '@/services/api.js';

export default {
  name: 'Search',
  data() {
    return {
      searchQuery: '',
      results: [],
      searchLoading: false,
      searchError: '',
      hasSearched: false,
      searchTimeCost: 0,

      // 搜索框聚焦
      isSearchFocused: false,
      showSuggestions: false,
      suggestions: [],
      activeSuggestionIdx: -1,
      suggestionTimer: null,

      // 分类快捷标签
      quickChips: [
        { label: '送别诗', icon: '🎊', color: '#e91e63', query: '送别' },
        { label: '思乡诗', icon: '🏯', color: '#ff9800', query: '思乡' },
        { label: '山水诗', icon: '🌳', color: '#4CAF50', query: '山水' },
        { label: '边塞诗', icon: '🏴', color: '#f44336', query: '边塞' },
        { label: '咏物诗', icon: '🌿', color: '#9C27B0', query: '咏物' },
        { label: '怀古诗', icon: '🏛', color: '#795548', query: '怀古' },
        { label: '宋词精选', icon: '📖', color: '#2196F3', query: '宋词' },
        { label: '五言律诗', icon: '✍', color: '#607D8B', query: '五言' },
      ],

      // 热门搜索
      hotTopics: ['春晓', '静夜思', '李白', '杜甫', '登鹳雀楼', '思念', '月', '秋'],

      // 搜索历史
      searchHistory: [],

      // AI分析
      aiAnalysis: null,
      didYouMean: null,
      // 搜索意向/情感
      searchIntent: 'general',
      searchEmotion: null,
      emotionOnly: false,

      // 筛选
      activeFilter: 'relevance',
      filterOptions: [
        { label: '默认排序', value: 'relevance' },
        { label: '按朝代', value: 'dynasty' },
        { label: '按作者', value: 'author' },
      ],

      // 高亮诗词
      highlightedPoems: new Set(),

      // 背景粒子
      particleCanvas: null,
      particleCtx: null,
      particles: [],
      animationFrame: null,

      // 探索卡片
      exploreCards: [
        { title: '按朝代探索', desc: '唐诗宋词元曲，穿越各代文坛', icon: '🏛', query: '唐' },
        { title: '按情感探索', desc: '离别、思乡、豪放、婉约', icon: '😊', query: '思乡' },
        { title: '按意象探索', desc: '月、酒、花、雁、柳', icon: '🌻', query: '月' },
        { title: '随机一首', desc: '让命运为你安排一首诗', icon: '🎲', query: '__random__' },
      ],

      // 空结果提示
      searchTips: ['春', '月', '思乡', '送别', '饮酒', '登高'],

      // 缓存
      searchCache: new Map(),
      // 诗词全量缓存（null = 未加载，[] = 已加载但为空）
      _poemCache: null,
      // 搜索竞态 ID（递增，异步结果回来时检查是否过期）
      _searchId: 0,
    };
  },
  computed: {
    filteredResults() {
      if (this.activeFilter === 'relevance') return this.results;
      return [...this.results].sort((a, b) => {
        if (this.activeFilter === 'dynasty') {
          return (a.dynasty || '').localeCompare(b.dynasty || '');
        }
        if (this.activeFilter === 'author') {
          return (a.author || '').localeCompare(b.author || '');
        }
        return 0;
      });
    },
  },
  watch: {
    searchQuery(val) {
      if (val.trim().length >= 1) {
        this.debounceSuggestions();
      } else {
        this.suggestions = [];
        this.showSuggestions = false;
      }
    },
  },
  mounted() {
    this.loadSearchHistory();
    this.initParticles();
    this.loadHotTopics();

    // 静默预热诗词缓存，让首次搜索更快
    this._warmupCache();

    const query = this.$route.query.q;
    if (query) {
      this.searchQuery = query;
      this.performSearch();
    }
  },
  beforeUnmount() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  },
  methods: {
    // ---- 搜索 ----
    async performSearch() {
      const q = this.searchQuery.trim();
      if (!q) return;

      this.showSuggestions = false;
      this.hasSearched = true;
      this.searchLoading = true;
      this.searchError = '';
      this.aiAnalysis = null;
      this.didYouMean = null;
      this.searchIntent = 'general';
      this.searchEmotion = null;
      this.emotionOnly = false;
      this.highlightedPoems.clear();

      // 防竞态：每次搜索分配唯一ID，后端结果返回时检查是否过期
      const searchId = ++this._searchId;

      const rest = { ...this.$route.query };
      delete rest.q;
      this.$router.replace({ query: { ...rest, q } }).catch(() => {});

      const startTime = Date.now();

      // 保存到历史
      this.saveToHistory(q);

      // ---------- 第一步（同步）：立即用本地数据搜索，立即显示 ----------
      const terms = q
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0);

      const localResults =
        terms.length === 0
          ? []
          : this.localSearch(q, terms);

      this.results = localResults;
      this.searchTimeCost = Date.now() - startTime;
      this.highlightMatchedPoems(terms);
      this.searchLoading = false;

      // 如果本地已有结果，生成基础AI分析（不阻塞）
      if (this.results.length > 0) {
        this.generateFallbackAnalysis(q, this.results);
      }

      // ---------- 第二步（异步）：后台请求后端AI，结果静默替换 ----------
      this._fetchBackendSearch(q, terms, searchId);
    },

    // 本地关键词搜索（纯同步，无网络）
    localSearch(query, terms) {
      const poems = this._poemCache;
      if (!poems || poems.length === 0) return [];
      const q = query.toLowerCase().trim();
      // 评分排序：整体子串匹配 > 多词匹配 > 单字匹配
      const scored = [];
      for (const p of poems) {
        const hay = [
          p.title || '',
          p.author || '',
          p.content || '',
          p.dynasty || '',
          Array.isArray(p.tags) ? p.tags.join(' ') : (p.tags || ''),
        ]
          .join('\n')
          .toLowerCase();
        let score = 0;
        if (q && hay.includes(q)) score += 100;
        terms.forEach((t) => {
          if (hay.includes(t)) {
            score += t.length === 1 ? 2 : 10;
          }
        });
        if (score > 0) scored.push({ poem: p, score });
      }
      scored.sort((a, b) => b.score - a.score);
      return scored.map((s) => s.poem);
    },

    // 后台请求后端AI搜索，结果回来后替换本地结果
    async _fetchBackendSearch(query, terms, searchId) {
      // 预热缓存（如果还没有）
      if (this._poemCache === null) {
        await this._warmupCache();
      }

      try {
        const data = await request(`/ai/search`, {
          method: 'POST',
          body: JSON.stringify({ query, limit: 50 }),
          timeout: TIMEOUTS.SHORT,
        });

        // 竞态检查：搜索词已变化则丢弃结果
        if (searchId !== this._searchId) return;

        const poems = data.poems || [];
        this.results = poems.length > 0 ? poems : this.results;
        this.didYouMean = data.didYouMean || null;
        this.searchIntent = data.intent || 'general';
        this.searchEmotion = data.emotion || null;
        this.emotionOnly = data.emotionOnly || false;

        if (poems.length > 0) {
          this.highlightMatchedPoems(terms);
          // 使用后端返回的分析结果（已合并，无需再单独请求）
          if (data.analysis) {
            this.aiAnalysis = data.analysis;
          } else {
            // 降级：本地生成分析
            this.generateFallbackAnalysis(query, poems);
          }
        }
      } catch (err) {
        // 后端不可用时静默保留本地结果
        if (searchId === this._searchId) {
          console.warn('后端搜索不可用，使用本地结果:', err.message);
        }
      }
    },

    // AI语义搜索（保留，静态页面/直接调用时仍可用）
    async aiSemanticSearch(query) {
      const terms = query
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0);
      if (terms.length === 0) return { poems: [], didYouMean: null };
      if (this._poemCache === null) await this._warmupCache();
      return { poems: this.localSearch(query, terms), didYouMean: null };
    },

    // 启动时预热诗词缓存
    async _warmupCache() {
      if (this._poemCache !== null) return;
      const cacheKey = '__all_poems__';
      if (this.searchCache.has(cacheKey)) {
        this._poemCache = this.searchCache.get(cacheKey);
        return;
      }
      try {
        const data = await request(`/poems?page=1&pageSize=2000`, {
          includeAuth: false,
          timeout: TIMEOUTS.SHORT,
        });
        const list = Array.isArray(data) ? data : [];
        this._poemCache = list;
        this.searchCache.set(cacheKey, list);
      } catch {
        this._poemCache = [];
      }
    },

    // ---- 情感检测 & 分析建议 ----
    _detectEmotionLocally(query) {
      const EMOTION_THEME_MAP = {
        '思乡': ['乡', '思乡', '故乡', '归', '家', '归家', '归乡'],
        '离别': ['送别', '离别', '分手', '相送', '赠', '饯', '别离', '折柳'],
        '思念': ['思', '念', '想', '思君', '想念', '牵挂', '忆', '怀'],
        '山水': ['山', '水', '江', '河', '湖', '海', '峰', '岭', '溪'],
        '边塞': ['塞', '关', '羌', '胡', '敌', '烽火', '大漠', '沙', '征'],
        '田园': ['田', '亩', '桑', '麻', '稻', '麦', '农', '村', '牧'],
        '送别': ['送', '别', '离', '远', '辞', '赠', '长亭', '灞桥'],
        '怀古': ['古', '遗迹', '故', '旧', '前朝', '凭吊'],
        '闲适': ['闲', '悠然', '隐居', '隐', '归隐', '隐者', '山林'],
        '孤独': ['孤', '独', '寂', '愁', '惆怅', '凄', '冷', '寒'],
        '豪放': ['豪', '壮', '万丈', '壮志', '豪情', '慷慨'],
        '爱国': ['忠', '报国', '杀敌', '从军', '出征', '家国'],
        '闺怨': ['闺', '妾', '思妇', '春闺', '闺怨'],
        '羁旅': ['客', '旅', '游', '宦', '漂', '羁旅', '飘零'],
        '月': ['月', '明月', '月光', '圆月'],
        '酒': ['酒', '醉', '杯', '酌', '饮'],
        '花': ['花', '落花', '花瓣', '花开'],
        '雁': ['雁', '鸿雁', '归雁', '飞雁'],
        '柳': ['柳', '杨柳', '柳枝', '折柳'],
        '雨': ['雨', '春雨', '细雨', '夜雨'],
        '雪': ['雪', '白雪', '飞雪', '瑞雪'],
      };

      const q = query.toLowerCase();
      let bestMatch = null;
      let bestScore = 0;

      for (const [theme, keywords] of Object.entries(EMOTION_THEME_MAP)) {
        for (const kw of keywords) {
          if (q.includes(kw) || kw.includes(q)) {
            const score = q === kw ? 20 : 10;
            if (score > bestScore) {
              bestScore = score;
              bestMatch = theme;
            }
          }
        }
      }

      return bestMatch;
    },

    generateFallbackAnalysis(query, poems) {
      const dynasties = {};
      const authors = {};
      poems.forEach(p => {
        if (p.dynasty) dynasties[p.dynasty] = (dynasties[p.dynasty] || 0) + 1;
        if (p.author) authors[p.author] = (authors[p.author] || 0) + 1;
      });

      const topDynasty = Object.entries(dynasties).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      const topAuthor = Object.entries(authors).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

      // 检测情感/题材
      const detectedEmotion = this._detectEmotionLocally(query);
      this.searchEmotion = detectedEmotion;
      if (detectedEmotion) {
        this.searchIntent = 'emotion';
      }

      const suggestions = this.getSearchSuggestions(query, poems, detectedEmotion);

      if (detectedEmotion) {
        this.aiAnalysis = {
          summary: `为您找到 ${poems.length} 首与"${detectedEmotion}"相关的诗词，情感鲜明，多为${topDynasty || '各代'}${topAuthor ? '·' + topAuthor : ''}所作，富有感染力。`,
          tags: [detectedEmotion, topDynasty, topAuthor].filter(Boolean).slice(0, 4),
          suggestions,
        };
      } else {
        this.aiAnalysis = {
          summary: `为您找到 ${poems.length} 首与"${query}"相关的诗词，涵盖${topDynasty || '各代'}时期，以${topAuthor || '佚名'}的诗作最为丰富。`,
          tags: [topDynasty, topAuthor].filter(Boolean),
          suggestions,
        };
      }
    },

    getSearchSuggestions(query, poems, detectedEmotion) {
      const suggestions = [];
      const q = query.toLowerCase();

      // 根据情感/题材上下文智能推荐
      const emotionRelated = {
        '思乡': ['送别', '月', '归', '家'],
        '离别': ['思念', '酒', '柳', '长亭'],
        '思念': ['怀人', '月', '雁', '书'],
        '山水': ['田园', '隐居', '隐', '渔樵'],
        '边塞': ['爱国', '从军', '沙场', '金鼓'],
        '闺怨': ['春怨', '红颜', '独守', '玉阶'],
        '羁旅': ['孤独', '无眠', '客路', '漂泊'],
        '闲适': ['田园', '悠然', '归隐', '溪'],
        '孤独': ['感伤', '无眠', '夜', '寂'],
        '豪放': ['壮志', '报国', '江山', '豪情'],
        '送别': ['思念', '酒', '折柳', '长亭'],
        '怀古': ['兴衰', '历史', '故国', '遗迹'],
        '月': ['思乡', '团圆', '清冷', '夜'],
        '酒': ['宴饮', '离别', '豪放', '醉'],
        '花': ['春', '美人', '惜春', '落花'],
      };

      if (detectedEmotion && emotionRelated[detectedEmotion]) {
        emotionRelated[detectedEmotion].forEach(s => {
          if (!q.includes(s.toLowerCase())) suggestions.push(s);
        });
      } else {
        if (!q.includes('送别')) suggestions.push('送别');
        if (!q.includes('思乡')) suggestions.push('思乡');
        if (!q.includes('月')) suggestions.push('月');
        if (!q.includes('春')) suggestions.push('春');
      }

      return suggestions.slice(0, 4);
    },

    // ---- 搜索建议 ----
    debounceSuggestions() {
      if (this.suggestionTimer) clearTimeout(this.suggestionTimer);
      this.suggestionTimer = setTimeout(() => this.fetchSuggestions(), 300);
    },

    async fetchSuggestions() {
      const q = this.searchQuery.trim();
      if (!q || q.length < 1) {
        this.suggestions = [];
        return;
      }

      // 缓存未就绪时先静默预热，再用缓存（仍是异步，但无额外开销）
      if (this._poemCache === null) {
        await this._warmupCache();
      }

      const poems = this._poemCache || [];
      const ql = q.toLowerCase();

      const titleMatches = poems
        .filter((p) => (p.title || '').toLowerCase().includes(ql))
        .slice(0, 3)
        .map((p) => ({ text: p.title, tag: '标题' }));

      const authorMatches = poems
        .filter(
          (p) =>
            (p.author || '').toLowerCase().includes(ql) &&
            !(p.title || '').toLowerCase().includes(ql),
        )
        .slice(0, 2)
        .map((p) => ({ text: p.author, tag: '作者' }));

      const contentMatches = poems
        .filter(
          (p) =>
            (p.content || '').toLowerCase().includes(ql) &&
            !(p.title || '').toLowerCase().includes(ql) &&
            !(p.author || '').toLowerCase().includes(ql),
        )
        .slice(0, 2)
        .map((p) => {
          const content = p.content || '';
          const idx = content.toLowerCase().indexOf(ql);
          const snippet = content.substring(Math.max(0, idx - 5), idx + ql.length + 5);
          return { text: `《${p.title}》${snippet}...`, tag: '诗句' };
        });

      this.suggestions = [...titleMatches, ...authorMatches, ...contentMatches];
      this.showSuggestions = this.suggestions.length > 0;
    },

    highlightMatch(text, query) {
      if (!query || !text) return text;
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    },

    selectSuggestion(suggestion) {
      const raw = (suggestion && suggestion.text) || '';
      const book = raw.match(/^《([^》]+)》/);
      this.searchQuery = (book ? book[1] : raw.replace(/^《|》$/g, '')).replace(/…+$/g, '').trim();
      this.showSuggestions = false;
      this.performSearch();
    },

    navigateSuggestion(dir) {
      if (this.suggestions.length === 0) return;
      this.activeSuggestionIdx += dir;
      if (this.activeSuggestionIdx < -1) this.activeSuggestionIdx = this.suggestions.length - 1;
      if (this.activeSuggestionIdx >= this.suggestions.length) this.activeSuggestionIdx = -1;
    },

    // ---- 搜索历史 ----
    loadSearchHistory() {
      try {
        this.searchHistory = JSON.parse(localStorage.getItem('poem_search_history') || '[]');
      } catch { this.searchHistory = []; }
    },

    saveToHistory(query) {
      const q = query.trim();
      if (!q) return;
      const history = this.searchHistory.filter(h => h !== q);
      history.unshift(q);
      this.searchHistory = history.slice(0, 20);
      localStorage.setItem('poem_search_history', JSON.stringify(this.searchHistory));
    },

    clearHistory() {
      this.searchHistory = [];
      localStorage.removeItem('poem_search_history');
    },

    // ---- 热门搜索 ----
    loadHotTopics() {
      try {
        const saved = localStorage.getItem('poem_hot_topics');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Date.now() - parsed.timestamp < 3600000) {
            this.hotTopics = parsed.topics;
            return;
          }
        }
      } catch { /* ignore */ }

      // 默认热门词
      this.hotTopics = ['春晓', '静夜思', '李白', '杜甫', '登鹳雀楼', '思念', '月', '秋'];
    },

    // ---- 分类/话题搜索 ----
    searchByCategory(chip) {
      this.searchQuery = chip.query;
      this.performSearch();
    },

    searchByTopic(topic) {
      this.searchQuery = topic;
      this.performSearch();
    },

    // ---- 探索卡片 ----
    handleExploreCard(card) {
      if (card.query === '__random__') {
        this.randomExplore();
      } else {
        this.searchByTopic(card.query);
      }
    },

    async randomExplore() {
      this.searchLoading = true;
      this.hasSearched = true;
      try {
        const data = await request(`/poems?random=true&pageSize=12`, {
          includeAuth: false,
          timeout: TIMEOUTS.SHORT,
        });
        this.results = Array.isArray(data) ? data : [];
        this.aiAnalysis = {
          summary: `随机为你挑选了 ${this.results.length} 首诗词，开启一场未知的诗意之旅吧！`,
          tags: ['随机推荐'],
          suggestions: ['随机一首', '按朝代探索', '按情感探索'],
        };
      } catch {
        this.results = [];
      } finally {
        this.searchLoading = false;
      }
    },

    // ---- 搜索框交互 ----
    onSearchFocus() {
      this.isSearchFocused = true;
      if (this.suggestions.length > 0) {
        this.showSuggestions = true;
      }
    },

    onSearchBlur() {
      this.isSearchFocused = false;
      setTimeout(() => { this.showSuggestions = false; }, 200);
    },

    onSearchInput() {
      this.activeSuggestionIdx = -1;
    },

    clearSearch() {
      this.searchQuery = '';
      this.suggestions = [];
      this.showSuggestions = false;
      const rest = { ...this.$route.query };
      delete rest.q;
      this.$router.replace({ query: rest }).catch(() => {});
      this.$refs.searchInputRef?.focus();
    },

    // ---- 结果处理 ----
    setFilter(filter) {
      this.activeFilter = filter;
    },

    highlightMatchedPoems(terms) {
      // terms: string[]（已小写、已过滤的词数组）
      if (!terms || terms.length === 0) return;
      this.results.forEach((p) => {
        const title = (p.title || '').toLowerCase();
        const author = (p.author || '').toLowerCase();
        if (terms.some((t) => title.includes(t) || author.includes(t))) {
          this.highlightedPoems.add(p.id);
        }
      });
    },

    getMatchedKeywords(poem) {
      const terms = this.searchQuery
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0);
      if (terms.length === 0) return [];
      const keywords = [];
      const title = (poem.title || '').toLowerCase();
      const author = (poem.author || '').toLowerCase();
      const content = (poem.content || '').toLowerCase();
      const dynasty = (poem.dynasty || '').toLowerCase();
      if (terms.some((t) => title.includes(t))) keywords.push('标题');
      if (terms.some((t) => author.includes(t))) keywords.push('作者');
      if (terms.some((t) => content.includes(t))) keywords.push('诗句');
      if (terms.some((t) => dynasty.includes(t))) keywords.push('朝代');
      const tagStr = (Array.isArray(poem.tags) ? poem.tags : []).join(' ').toLowerCase();
      if (terms.some((t) => tagStr.includes(t))) keywords.push('标签');
      return keywords;
    },

    getCardGradient(poem) {
      const gradients = [
        'linear-gradient(90deg, #4CAF50, #81C784)',
        'linear-gradient(90deg, #2196F3, #64B5F6)',
        'linear-gradient(90deg, #FF9800, #FFB74D)',
        'linear-gradient(90deg, #9C27B0, #BA68C8)',
        'linear-gradient(90deg, #f44336, #e57373)',
        'linear-gradient(90deg, #00BCD4, #4DD0E1)',
      ];
      const idx = (poem.id || 0) % gradients.length;
      return gradients[idx];
    },

    navigateToDetail(id) {
      this.$router.push(`/poem/${id}`);
    },

    // ---- 粒子背景 ----
    initParticles() {
      this.particleCanvas = this.$refs.particleCanvas;
      if (!this.particleCanvas) return;

      const canvas = this.particleCanvas;
      const ctx = canvas.getContext('2d');
      this.particleCtx = ctx;

      const resize = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      };
      resize();
      window.addEventListener('resize', resize);

      const chars = ['诗', '词', '风', '月', '花', '云', '山', '水', '雨', '雪', '春', '秋', '酒', '思', '归', '梦'];
      for (let i = 0; i < 40; i++) {
        this.particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 12 + Math.random() * 16,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3,
          char: chars[Math.floor(Math.random() * chars.length)],
          opacity: 0.04 + Math.random() * 0.06,
          color: `hsl(${30 + Math.random() * 30}, 60%, ${40 + Math.random() * 20}%)`,
        });
      }

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.particles.forEach(p => {
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;

          ctx.font = `${p.size}px SimSun, serif`;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.fillText(p.char, p.x, p.y);
        });
        ctx.globalAlpha = 1;
        this.animationFrame = requestAnimationFrame(animate);
      };
      animate();
    },
  }
};
</script>

<style scoped>
/* ===== 页面基础 ===== */
.search-page {
  min-height: 100vh;
  padding: 0 20px 60px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(107,142,35,0.03) 0%, rgba(245,245,220,0.3) 50%, rgba(107,142,35,0.05) 100%);
}

/* 粒子画布 */
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

/* ===== 头部装饰 ===== */
.header-bg-decor {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 300px;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.decor-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.06;
}

.c1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #4CAF50, transparent);
  top: -100px;
  right: -50px;
  animation: float-slow 8s ease-in-out infinite;
}

.c2 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #2196F3, transparent);
  top: 50px;
  left: -80px;
  animation: float-slow 10s ease-in-out infinite reverse;
}

.c3 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, #FF9800, transparent);
  bottom: 0;
  right: 20%;
  animation: float-slow 6s ease-in-out infinite 2s;
}

@keyframes float-slow {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(15px, -15px) scale(1.05); }
  66% { transform: translate(-10px, 10px) scale(0.95); }
}

/* ===== 页面头部 ===== */
.search-header {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 50px 20px 30px;
}

.page-title {
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 36px;
  color: #5d4037;
  margin: 0 0 10px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.title-icon {
  font-size: 36px;
}

.page-subtitle {
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 15px;
  color: #8d6e63;
  margin: 0;
  letter-spacing: 1px;
}

/* ===== 搜索框 ===== */
.search-wrapper {
  position: relative;
  z-index: 10;
  max-width: 680px;
  margin: 0 auto 28px;
}

.search-box {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1.5px solid rgba(107, 142, 35, 0.2);
  border-radius: 50px;
  padding: 6px 6px 6px 18px;
  box-shadow: 0 8px 32px rgba(107, 142, 35, 0.12);
  transition: all 0.3s ease;
}

.search-box.focused {
  border-color: rgba(107, 142, 35, 0.5);
  box-shadow: 0 12px 40px rgba(107, 142, 35, 0.2);
  background: rgba(255, 255, 255, 0.98);
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.search-icon {
  color: #8d6e63;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 17px;
  color: #4e342e;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  outline: none;
  min-width: 0;
}

.search-input::placeholder {
  color: #bcaaa4;
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 50%;
  color: #8d6e63;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.clear-btn:hover {
  background: rgba(0, 0, 0, 0.12);
  color: #4e342e;
}

.search-btn {
  flex-shrink: 0;
  padding: 12px 28px;
  border-radius: 50px;
  background: linear-gradient(135deg, #6b8e23, #8fbc8f);
  color: white;
  border: none;
  font-size: 15px;
  font-weight: bold;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 16px rgba(107, 142, 35, 0.3);
}

.search-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #556b2f, #6b8e23);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(107, 142, 35, 0.4);
}

.search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 下拉建议 ===== */
.suggestions-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(107, 142, 35, 0.15);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 100;
}

.suggestions-list { padding: 6px; }

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 14px;
  color: #5d4037;
}

.suggestion-item:hover,
.suggestion-item.active {
  background: rgba(107, 142, 35, 0.1);
}

.suggestion-icon { color: #a5d6a7; flex-shrink: 0; }

.suggestion-text { flex: 1; }

.suggestion-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(107, 142, 35, 0.1);
  color: #6b8e23;
  flex-shrink: 0;
}

.suggestion-text :deep(mark) {
  background: rgba(255, 193, 7, 0.3);
  color: #e65100;
  border-radius: 2px;
  padding: 0 2px;
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active { transition: all 0.2s ease; }
.dropdown-enter-from,
.dropdown-leave-to { opacity: 0; transform: translateY(-8px); }

/* ===== 分类快捷标签 ===== */
.category-chips {
  position: relative;
  z-index: 1;
  max-width: 680px;
  margin: 0 auto 20px;
}

.chips-label {
  display: block;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 12px;
  color: #a1887f;
  margin-bottom: 10px;
  letter-spacing: 1px;
}

.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 50px;
  border: 1px solid rgba(107, 142, 35, 0.25);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-size: 13px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  color: #5d4037;
  cursor: pointer;
  transition: all 0.25s ease;
}

.category-chip:hover {
  background: rgba(245, 248, 235, 0.95);
  border-color: rgba(107, 142, 35, 0.45);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(107, 142, 35, 0.18);
}

.category-chip[data-color="e91e63"]:hover { border-color: rgba(233, 30, 99, 0.45); box-shadow: 0 4px 12px rgba(233, 30, 99, 0.18); }
.category-chip[data-color="ff9800"]:hover { border-color: rgba(255, 152, 0, 0.45); box-shadow: 0 4px 12px rgba(255, 152, 0, 0.18); }
.category-chip[data-color="4CAF50"]:hover { border-color: rgba(76, 175, 80, 0.45); box-shadow: 0 4px 12px rgba(76, 175, 80, 0.18); }
.category-chip[data-color="f44336"]:hover { border-color: rgba(244, 67, 54, 0.45); box-shadow: 0 4px 12px rgba(244, 67, 54, 0.18); }
.category-chip[data-color="9C27B0"]:hover { border-color: rgba(156, 39, 176, 0.45); box-shadow: 0 4px 12px rgba(156, 39, 176, 0.18); }
.category-chip[data-color="795548"]:hover { border-color: rgba(121, 85, 72, 0.45); box-shadow: 0 4px 12px rgba(121, 85, 72, 0.18); }
.category-chip[data-color="2196F3"]:hover { border-color: rgba(33, 150, 243, 0.45); box-shadow: 0 4px 12px rgba(33, 150, 243, 0.18); }
.category-chip[data-color="607D8B"]:hover { border-color: rgba(96, 125, 139, 0.45); box-shadow: 0 4px 12px rgba(96, 125, 139, 0.18); }

.chip-icon { font-size: 15px; }

/* ===== 热门搜索 ===== */
.hot-topics {
  position: relative;
  z-index: 1;
  max-width: 680px;
  margin: 0 auto 20px;
}

.hot-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 13px;
  font-weight: bold;
  color: #8d6e63;
  margin-bottom: 10px;
}

.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hot-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 50px;
  border: 1px solid rgba(205, 133, 63, 0.2);
  background: rgba(255, 252, 240, 0.8);
  font-size: 13px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  color: #8b4513;
  cursor: pointer;
  transition: all 0.2s;
}

.hot-tag:hover {
  background: rgba(255, 245, 230, 0.95);
  border-color: rgba(205, 133, 63, 0.4);
  transform: translateY(-1px);
}

.hot-tag.top {
  background: rgba(139, 69, 19, 0.08);
  border-color: rgba(139, 69, 19, 0.25);
  font-weight: bold;
}

.hot-rank {
  font-size: 11px;
  color: #cd853f;
  font-weight: bold;
  min-width: 14px;
}

/* ===== 搜索历史 ===== */
.search-history {
  position: relative;
  z-index: 1;
  max-width: 680px;
  margin: 0 auto 20px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.history-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 13px;
  font-weight: bold;
  color: #8d6e63;
}

.clear-history-btn {
  font-size: 12px;
  color: #a1887f;
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.clear-history-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #795548;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.history-tag {
  padding: 5px 14px;
  border-radius: 50px;
  border: 1px dashed rgba(205, 133, 63, 0.3);
  background: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  color: #8b4513;
  cursor: pointer;
  transition: all 0.2s;
}

.history-tag:hover {
  background: rgba(255, 252, 240, 0.9);
  border-style: solid;
  border-color: rgba(205, 133, 63, 0.4);
}

/* ===== 主内容区域 ===== */
.search-main {
  position: relative;
  z-index: 1;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ===== 玻璃卡片通用 ===== */
.glass-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(205, 133, 63, 0.15);
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(139, 69, 19, 0.06);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.glass-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
}

/* ===== AI分析卡片 ===== */
.ai-analysis-card {
  padding: 24px;
  background: linear-gradient(135deg, rgba(100, 149, 237, 0.06), rgba(70, 130, 180, 0.04));
  border-color: rgba(100, 149, 237, 0.15);
}

.ai-analysis-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 14px;
  font-weight: bold;
  color: #6495ed;
  margin-bottom: 16px;
}

.emotion-badge {
  padding: 2px 10px;
  border-radius: 50px;
  background: rgba(100, 149, 237, 0.15);
  border: 1px solid rgba(100, 149, 237, 0.3);
  font-size: 11px;
  color: #4169e1;
  font-weight: normal;
}

.emotion-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(100, 149, 237, 0.06);
  border: 1px solid rgba(100, 149, 237, 0.12);
  font-size: 13px;
  color: #6495ed;
  margin-bottom: 14px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
}

.emotion-hint-neutral {
  background: rgba(141, 110, 99, 0.06);
  border-color: rgba(141, 110, 99, 0.15);
  color: #8d6e63;
}

.ai-analysis-body {}

.ai-summary {
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 15px;
  color: #5d4037;
  line-height: 1.8;
  margin-bottom: 14px;
}

.ai-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.ai-tag {
  padding: 4px 12px;
  border-radius: 50px;
  background: rgba(100, 149, 237, 0.1);
  border: 1px solid rgba(100, 149, 237, 0.2);
  font-size: 12px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  color: #6495ed;
}

.suggestions-title {
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 12px;
  color: #a1887f;
  margin-bottom: 8px;
}

.suggestion-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestion-chip {
  padding: 6px 14px;
  border-radius: 50px;
  border: 1px solid rgba(107, 142, 35, 0.25);
  background: rgba(107, 142, 35, 0.06);
  font-size: 13px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  color: #6b8e23;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-chip:hover {
  background: rgba(107, 142, 35, 0.12);
  border-color: rgba(107, 142, 35, 0.4);
  transform: translateY(-1px);
}

/* ===== 纠错建议 ===== */
.did-you-mean {
  padding: 16px 24px;
  background: rgba(255, 193, 7, 0.05);
  border-color: rgba(255, 193, 7, 0.2);
}

.did-you-mean-text {
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 14px;
  color: #8d6e63;
}

.did-you-mean-btn {
  background: none;
  border: none;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 14px;
  color: #FF9800;
  cursor: pointer;
  text-decoration: underline;
  font-weight: bold;
  padding: 0;
}

.did-you-mean-btn:hover { color: #e65100; }

/* ===== 结果头部 ===== */
.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.results-count {
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 14px;
  color: #8d6e63;
}

.results-count strong { color: #5d4037; }

.time-cost {
  font-size: 12px;
  color: #bcaaa4;
  margin-left: 8px;
}

.results-filter {
  display: flex;
  gap: 6px;
}

.filter-btn {
  padding: 5px 14px;
  border-radius: 50px;
  border: 1px solid rgba(205, 133, 63, 0.2);
  background: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  color: #8b4513;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn.active {
  background: rgba(107, 142, 35, 0.15);
  border-color: rgba(107, 142, 35, 0.4);
  color: #6b8e23;
  font-weight: bold;
}

.filter-btn:hover:not(.active) {
  background: rgba(255, 252, 240, 0.9);
  border-color: rgba(205, 133, 63, 0.3);
}

/* ===== 诗词结果网格 ===== */
.poem-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.poem-card {
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.poem-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(139, 69, 19, 0.12);
  border-color: rgba(205, 133, 63, 0.3);
}

.poem-card.is-highlight {
  border-color: rgba(107, 142, 35, 0.3);
  box-shadow: 0 4px 20px rgba(107, 142, 35, 0.12);
}

.card-topbar {
  height: 4px;
  width: 100%;
  flex-shrink: 0;
}

.card-body {
  padding: 18px 20px 12px;
  flex: 1;
}

.card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.card-title {
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 18px;
  font-weight: bold;
  color: #5d4037;
  margin: 0;
}

.card-dynasty {
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 11px;
  color: #a1887f;
  background: rgba(139, 69, 19, 0.06);
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}

.card-author {
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 13px;
  color: #8d6e63;
  margin: 0 0 10px;
}

.card-content {
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 14px;
  color: #795548;
  line-height: 1.8;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-highlight {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
}

.highlight-label {
  font-size: 11px;
  color: #bcaaa4;
}

.keyword-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 152, 0, 0.1);
  color: #e65100;
  border: 1px solid rgba(255, 152, 0, 0.2);
}

.card-footer {
  padding: 10px 20px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(205, 133, 63, 0.08);
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.04);
  color: #a1887f;
  font-family: 'Noto Serif SC', 'SimSun', serif;
}

.card-tag.level-tag {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.card-arrow {
  color: #bcaaa4;
  transition: all 0.2s;
}

.poem-card:hover .card-arrow {
  color: #8d6e63;
  transform: translateX(3px);
}

/* ===== 空结果 ===== */
.empty-results {
  text-align: center;
  padding: 60px 20px;
}

.empty-illustration { margin-bottom: 20px; }

.empty-title {
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 22px;
  color: #8b4513;
  margin: 0 0 10px;
}

.empty-desc {
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 14px;
  color: #a1887f;
  margin: 0 0 24px;
}

.empty-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.tip-btn {
  padding: 8px 18px;
  border-radius: 50px;
  border: 1px solid rgba(107, 142, 35, 0.25);
  background: rgba(107, 142, 35, 0.06);
  font-size: 13px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  color: #6b8e23;
  cursor: pointer;
  transition: all 0.2s;
}

.tip-btn:hover {
  background: rgba(107, 142, 35, 0.15);
  border-color: rgba(107, 142, 35, 0.4);
  transform: translateY(-1px);
}

/* ===== 初始探索 ===== */
.initial-explore {
  position: relative;
  z-index: 1;
  max-width: 960px;
  margin: 20px auto 0;
}

.explore-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.explore-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(205, 133, 63, 0.15);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.explore-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(139, 69, 19, 0.1);
  border-color: rgba(205, 133, 63, 0.3);
  background: rgba(255, 252, 240, 0.95);
}

.explore-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.explore-info h4 {
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 15px;
  color: #5d4037;
  margin: 0 0 4px;
  font-weight: bold;
}

.explore-info p {
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 12px;
  color: #a1887f;
  margin: 0;
  line-height: 1.5;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .search-page { padding: 0 15px 40px; }

  .search-header { padding: 30px 15px 20px; }

  .page-title { font-size: 26px; }
  .title-icon { font-size: 26px; }

  .search-box {
    flex-direction: column;
    border-radius: 20px;
    padding: 12px;
    gap: 8px;
  }

  .search-input-wrap {
    width: 100%;
    padding: 0 4px;
  }

  .search-input { font-size: 15px; }

  .search-btn {
    width: 100%;
    padding: 12px;
    border-radius: 14px;
  }

  .chips-row { justify-content: flex-start; }

  .poem-grid { grid-template-columns: 1fr; }

  .explore-grid { grid-template-columns: 1fr 1fr; }

  .explore-icon { font-size: 24px; }
  .explore-info h4 { font-size: 13px; }
  .explore-info p { font-size: 11px; }

  .results-header { flex-direction: column; align-items: flex-start; }
}
</style>
