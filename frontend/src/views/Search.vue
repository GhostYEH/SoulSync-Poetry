
<template>
  <div class="search-page search-study-page">
    <canvas ref="particleCanvas" class="particle-canvas" aria-hidden="true"></canvas>

    <section class="search-workspace" aria-labelledby="search-title">
      <header class="study-hero">
        <div class="hero-copy">
          <span class="hero-mark" aria-hidden="true"></span>
          <div>
            <h1 id="search-title">寻诗</h1>
            <p>从诗句、作者与意境开始</p>
          </div>
        </div>

        <div class="search-command" :class="{ focused: isSearchFocused }">
          <label class="search-kind" for="poetry-search">全部</label>
          <div class="search-input-wrap">
            <PhMagnifyingGlass :size="20" aria-hidden="true" />
            <input
              id="poetry-search"
              ref="searchInputRef"
              v-model="searchQuery"
              type="search"
              placeholder="输入诗句、作者、关键词或意境"
              autocomplete="off"
              spellcheck="false"
              @focus="onSearchFocus"
              @blur="onSearchBlur"
              @input="onSearchInput"
              @keyup.enter="performSearch"
              @keyup.up="navigateSuggestion(-1)"
              @keyup.down="navigateSuggestion(1)"
            />
            <button v-if="searchQuery" class="icon-button clear-button" type="button" aria-label="清空搜索" @click="clearSearch">
              <PhX :size="17" />
            </button>
          </div>
          <button class="search-submit" type="button" :disabled="!searchQuery.trim() || searchLoading" @click="performSearch">
            <span v-if="searchLoading" class="button-spinner" aria-hidden="true"></span>
            <PhMagnifyingGlass v-else :size="18" aria-hidden="true" />
            {{ searchLoading ? '寻诗中' : '搜索' }}
          </button>

          <Transition name="dropdown">
            <div v-if="showSuggestions && suggestions.length" class="suggestions-dropdown">
              <button
                v-for="(suggestion, index) in suggestions"
                :key="`${suggestion.text}-${index}`"
                type="button"
                class="suggestion-row"
                :class="{ active: index === activeSuggestionIdx }"
                @mousedown.prevent="selectSuggestion(suggestion)"
              >
                <PhMagnifyingGlass :size="15" />
                <span v-html="highlightMatch(suggestion.text, searchQuery)"></span>
                <small v-if="suggestion.tag">{{ suggestion.tag }}</small>
              </button>
            </div>
          </Transition>
        </div>

        <div class="popular-queries" aria-label="热门搜索">
          <span>热门搜索：</span>
          <button v-for="topic in hotTopics.slice(0, 6)" :key="topic" type="button" @click="searchByTopic(topic)">
            {{ topic }}
          </button>
        </div>
      </header>

      <div class="search-layout">
        <main class="result-panel">
          <div class="topic-tabs" aria-label="诗词主题快捷筛选">
            <button type="button" :class="{ active: !hasSearched }" @click="clearSearch">全部</button>
            <button v-for="chip in quickChips.slice(0, 7)" :key="chip.label" type="button" @click="searchByCategory(chip)">
              {{ chip.label.replace('诗', '') }}
            </button>
            <button class="filter-trigger" type="button" @click="$refs.searchInputRef && $refs.searchInputRef.focus()">
              <PhFunnel :size="16" />筛选
            </button>
          </div>

          <div class="result-toolbar">
            <div>
              <span v-if="searchLoading">正在检索诗卷</span>
              <span v-else-if="hasSearched">结果 <strong>{{ filteredResults.length }}</strong></span>
              <span v-else>精选诗词索引</span>
              <small v-if="searchTimeCost && hasSearched">{{ searchTimeCost }} ms</small>
            </div>
            <div class="sort-tabs" v-if="hasSearched && results.length">
              <button
                v-for="filter in filterOptions"
                :key="filter.value"
                type="button"
                :class="{ active: activeFilter === filter.value }"
                @click="setFilter(filter.value)"
              >{{ filter.label }}</button>
              <PhSquaresFour :size="17" aria-hidden="true" />
            </div>
          </div>

          <div v-if="aiAnalysis || didYouMean" class="search-insight-strip">
            <PhSparkle :size="18" weight="fill" aria-hidden="true" />
            <div>
              <strong>{{ searchEmotion ? `识别到“${searchEmotion}”相关意境` : '为你延展诗意线索' }}</strong>
              <p v-if="aiAnalysis?.summary">{{ aiAnalysis.summary }}</p>
              <button v-if="didYouMean && didYouMean !== searchQuery" type="button" @click="searchQuery = didYouMean; performSearch()">
                试试“{{ didYouMean }}”
              </button>
            </div>
          </div>

          <div v-if="hasSearched && filteredResults.length" class="poem-result-grid">
            <article
              v-for="poem in paginatedSearchResults"
              :key="poem.id"
              class="poem-result-card"
              tabindex="0"
              @click="navigateToDetail(poem.id)"
              @keyup.enter="navigateToDetail(poem.id)"
            >
              <div class="poem-card-head">
                <div>
                  <h2>{{ poem.title }}</h2>
                  <p>{{ poem.dynasty }} · {{ poem.author }}</p>
                </div>
                <span v-if="poem.level" class="match-score">Lv.{{ poem.level }}</span>
              </div>
              <p class="poem-excerpt">{{ poem.content }}</p>
              <div class="poem-card-foot">
                <div class="poem-tags">
                  <span v-for="tag in (poem.tags || []).slice(0, 3)" :key="tag">{{ tag }}</span>
                  <span v-for="keyword in (getMatchedKeywords(poem) || []).slice(0, 2)" :key="keyword">{{ keyword }}</span>
                </div>
                <PhArrowRight :size="18" aria-label="查看诗词详情" />
              </div>
            </article>
          </div>

          <div v-if="hasSearched && totalSearchPages > 1" class="search-pagination" aria-label="搜索结果分页">
            <button type="button" :disabled="currentSearchPage === 1" aria-label="上一页" @click="currentSearchPage--">
              <PhCaretLeft :size="15" />
            </button>
            <button
              v-for="page in totalSearchPages"
              :key="page"
              type="button"
              :class="{ active: page === currentSearchPage }"
              :aria-current="page === currentSearchPage ? 'page' : undefined"
              @click="currentSearchPage = page"
            >{{ page }}</button>
            <button type="button" :disabled="currentSearchPage === totalSearchPages" aria-label="下一页" @click="currentSearchPage++">
              <PhCaretRight :size="15" />
            </button>
          </div>

          <div v-else-if="hasSearched && !searchLoading" class="search-empty">
            <PhBookOpenText :size="44" weight="thin" aria-hidden="true" />
            <h2>暂未寻到相合诗篇</h2>
            <p>换一个诗句、作者或意象，也许会遇见新的答案。</p>
            <div>
              <button v-for="tip in searchTips" :key="tip" type="button" @click="searchByTopic(tip)">{{ tip }}</button>
            </div>
          </div>

          <div v-else-if="!hasSearched" class="discovery-state">
            <div class="discovery-heading">
              <div>
                <small>从一个方向开始</small>
                <h2>今日诗意索引</h2>
              </div>
              <button type="button" @click="randomExplore">
                <PhShuffle :size="17" />偶遇一首
              </button>
            </div>
            <div class="discovery-grid">
              <button v-for="card in exploreCards" :key="card.title" type="button" @click="handleExploreCard(card)">
                <span>{{ card.title }}</span>
                <small>{{ card.desc }}</small>
                <PhArrowUpRight :size="18" />
              </button>
            </div>
            <div v-if="searchHistory.length" class="history-line">
              <PhClockCounterClockwise :size="17" />
              <span>最近搜索</span>
              <button v-for="item in searchHistory.slice(0, 5)" :key="item" type="button" @click="searchByTopic(item)">{{ item }}</button>
              <button class="history-clear" type="button" @click="clearHistory">清空</button>
            </div>
          </div>
        </main>

        <aside class="poetry-insights" aria-label="诗词洞察">
          <div class="insight-title">
            <PhChartDonut :size="20" aria-hidden="true" />
            <h2>诗词洞察</h2>
          </div>

          <section>
            <div class="aside-section-head">
              <h3>相关作者</h3>
              <span>{{ hasSearched ? '随结果更新' : '热门诗家' }}</span>
            </div>
            <div class="author-list">
              <button v-for="author in insightAuthors" :key="author.name" type="button" @click="searchByTopic(author.name)">
                <img class="author-portrait" :src="author.avatar" :alt="`${author.name}人物小像`">
                <strong>{{ author.name }}</strong>
                <small>{{ author.count }} 首</small>
              </button>
            </div>
          </section>

          <section>
            <div class="aside-section-head">
              <h3>朝代分布</h3>
              <span>诗脉</span>
            </div>
            <div class="dynasty-list">
              <button v-for="item in insightDynasties" :key="item.name" type="button" @click="searchByTopic(item.name)">
                <span>{{ item.name }}</span><strong>{{ item.count }}</strong>
              </button>
            </div>
          </section>

          <section>
            <div class="aside-section-head">
              <h3>主题分布</h3>
              <span>意境</span>
            </div>
            <div class="theme-bars">
              <button v-for="item in insightThemes" :key="item.name" type="button" @click="searchByTopic(item.name)">
                <span>{{ item.name }}</span>
                <i><b :style="{ width: `${item.ratio}%` }"></b></i>
                <strong>{{ item.count }}</strong>
              </button>
            </div>
          </section>

          <div class="search-tip-card">
            <PhLightbulbFilament :size="22" weight="duotone" aria-hidden="true" />
            <div>
              <strong>搜索小贴士</strong>
              <p>试试输入诗句中的关键词、作者名，或“月”“思乡”等意象。</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </div>
</template>

<script>
import { request, TIMEOUTS } from '@/services/api.js';
import {
  PhArrowRight,
  PhArrowUpRight,
  PhBookOpenText,
  PhCaretLeft,
  PhCaretRight,
  PhChartDonut,
  PhClockCounterClockwise,
  PhFunnel,
  PhLightbulbFilament,
  PhMagnifyingGlass,
  PhShuffle,
  PhSparkle,
  PhSquaresFour,
  PhX,
} from '@phosphor-icons/vue';
import liBaiPortrait from '@/assets/poets/li-bai.png';
import duFuPortrait from '@/assets/poets/du-fu.png';
import suShiPortrait from '@/assets/poets/su-shi.png';
import wangWeiPortrait from '@/assets/poets/wang-wei.png';
import baiJuyiPortrait from '@/assets/poets/bai-juyi.png';
import unknownScholarPortrait from '@/assets/poets/unknown-scholar.png';

const POET_PORTRAITS = {
  李白: liBaiPortrait,
  杜甫: duFuPortrait,
  苏轼: suShiPortrait,
  王维: wangWeiPortrait,
  白居易: baiJuyiPortrait,
};

export default {
  name: 'Search',
  components: {
    PhArrowRight,
    PhArrowUpRight,
    PhBookOpenText,
    PhCaretLeft,
    PhCaretRight,
    PhChartDonut,
    PhClockCounterClockwise,
    PhFunnel,
    PhLightbulbFilament,
    PhMagnifyingGlass,
    PhShuffle,
    PhSparkle,
    PhSquaresFour,
    PhX,
  },
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
      suggestionSuppressedFor: '',

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
      currentSearchPage: 1,
      searchPageSize: 6,
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
    totalSearchPages() {
      return Math.max(1, Math.ceil(this.filteredResults.length / this.searchPageSize));
    },
    paginatedSearchResults() {
      const start = (this.currentSearchPage - 1) * this.searchPageSize;
      return this.filteredResults.slice(start, start + this.searchPageSize);
    },
    insightAuthors() {
      if (!this.results.length) {
        return [
          { name: '李白', count: 32, avatar: POET_PORTRAITS.李白 },
          { name: '杜甫', count: 28, avatar: POET_PORTRAITS.杜甫 },
          { name: '苏轼', count: 25, avatar: POET_PORTRAITS.苏轼 },
          { name: '王维', count: 20, avatar: POET_PORTRAITS.王维 },
          { name: '白居易', count: 18, avatar: POET_PORTRAITS.白居易 },
        ];
      }
      const counts = new Map();
      this.results.forEach((poem) => {
        const name = poem.author || '佚名';
        counts.set(name, (counts.get(name) || 0) + 1);
      });
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count, avatar: POET_PORTRAITS[name] || unknownScholarPortrait }));
    },
    insightDynasties() {
      const source = this.results.length ? this.results : [
        { dynasty: '唐代' }, { dynasty: '唐代' }, { dynasty: '唐代' },
        { dynasty: '宋代' }, { dynasty: '宋代' }, { dynasty: '元代' },
        { dynasty: '先秦' }, { dynasty: '其他' },
      ];
      const counts = new Map();
      source.forEach((poem) => {
        const name = poem.dynasty || '其他';
        counts.set(name, (counts.get(name) || 0) + 1);
      });
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
    },
    insightThemes() {
      const fallback = [
        { name: '山水', count: 12 },
        { name: '思乡', count: 8 },
        { name: '送别', count: 6 },
        { name: '咏物', count: 5 },
        { name: '边塞', count: 3 },
      ];
      if (!this.results.length) {
        return fallback.map((item, index) => ({ ...item, ratio: 100 - index * 15 }));
      }
      const counts = new Map();
      this.results.forEach((poem) => {
        (poem.tags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
      });
      const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (!ranked.length) return fallback.map((item, index) => ({ ...item, ratio: 100 - index * 15 }));
      const max = ranked[0][1] || 1;
      return ranked.map(([name, count]) => ({ name, count, ratio: Math.max(18, Math.round((count / max) * 100)) }));
    },
  },
  watch: {
    searchQuery(val) {
      if (val.trim() === this.suggestionSuppressedFor) {
        this.showSuggestions = false;
        return;
      }
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

      clearTimeout(this.suggestionTimer);
      this.suggestionSuppressedFor = q;
      this.showSuggestions = false;
      this.activeSuggestionIdx = -1;
      this.hasSearched = true;
      this.currentSearchPage = 1;
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
      this.suggestionSuppressedFor = '';
      this.activeSuggestionIdx = -1;
    },

    clearSearch() {
      this.suggestionSuppressedFor = '';
      this.currentSearchPage = 1;
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
      this.currentSearchPage = 1;
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
.search-study-page {
  --study-ink: #194f49;
  --study-deep: #236b61;
  --study-jade: #2f9b83;
  --study-gold: #b9853e;
  --study-paper: #f8faf4;
  --study-line: rgba(38, 103, 91, .14);
  position: relative;
  min-height: calc(100dvh - 104px);
  padding: 26px clamp(18px, 3.2vw, 52px) 48px;
  color: #365d58;
  background: #eef5ef;
  font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  overflow: hidden;
}

.search-study-page::before {
  position: absolute;
  inset: 0;
  content: '';
  background: url('@/assets/jade-paper-ambient.png') center top / cover no-repeat;
  opacity: .34;
  pointer-events: none;
}

.search-study-page .particle-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  opacity: .16;
  pointer-events: none;
}

.search-workspace {
  position: relative;
  z-index: 1;
  width: min(1480px, 100%);
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .82);
  border-radius: 28px;
  background: rgba(250, 252, 247, .9);
  box-shadow: 0 24px 70px rgba(31, 77, 68, .12), inset 0 1px 0 #fff;
  backdrop-filter: blur(18px);
}

.study-hero {
  position: relative;
  padding: 26px 30px 20px;
  border-bottom: 1px solid var(--study-line);
  background: rgba(250, 252, 247, .78);
}

.study-hero::after {
  position: absolute;
  top: 0;
  right: 0;
  width: 290px;
  height: 100%;
  content: '';
  background: url('@/assets/review-inkwash.png') right center / cover no-repeat;
  opacity: .14;
  pointer-events: none;
}

.hero-copy {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 15px;
  width: 205px;
}

.hero-mark {
  width: 4px;
  height: 47px;
  border-radius: 4px;
  background: var(--study-jade);
}

.hero-copy h1,
.insight-title h2,
.discovery-heading h2,
.search-empty h2 {
  margin: 0;
  color: var(--study-ink);
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-weight: 600;
}

.hero-copy h1 { font-size: 30px; letter-spacing: .12em; }
.hero-copy p { margin: 4px 0 0; color: #78918c; font-size: 12px; }

.search-command {
  position: absolute;
  z-index: 4;
  top: 26px;
  left: 250px;
  right: 30px;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) auto;
  align-items: center;
  min-height: 48px;
  border: 1px solid rgba(37, 112, 98, .2);
  border-radius: 13px;
  background: rgba(255, 255, 255, .82);
  box-shadow: 0 10px 24px rgba(35, 91, 81, .06);
  transition: border-color .2s ease, box-shadow .2s ease;
}

.search-command.focused {
  border-color: rgba(47, 155, 131, .58);
  box-shadow: 0 0 0 4px rgba(47, 155, 131, .09), 0 12px 26px rgba(35, 91, 81, .08);
}

.search-kind {
  display: grid;
  height: 30px;
  place-items: center;
  border-right: 1px solid var(--study-line);
  color: #496f69;
  font-size: 12px;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 0 14px;
  color: #659087;
}

.search-input-wrap input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: #214f49;
  background: transparent;
  font: 14px/1.4 'Noto Sans SC', sans-serif;
}

.search-input-wrap input::placeholder { color: #9cb0ac; }
.icon-button { display: grid; flex: 0 0 auto; padding: 4px; border: 0; place-items: center; color: #79948f; background: transparent; }

.search-submit {
  display: inline-flex;
  align-items: center;
  align-self: stretch;
  gap: 7px;
  min-width: 96px;
  margin: 4px;
  padding: 0 20px;
  border: 0;
  border-radius: 10px;
  color: #fff;
  background: #228c78;
  font-weight: 600;
  justify-content: center;
}

.search-submit:disabled { cursor: not-allowed; opacity: .52; }
.button-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: study-spin .7s linear infinite; }
@keyframes study-spin { to { transform: rotate(360deg); } }

.popular-queries {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 26px;
  margin: 11px 0 0 250px;
  color: #849a96;
  font-size: 11px;
}

.popular-queries button,
.history-line button,
.search-empty button {
  padding: 5px 10px;
  border: 0;
  border-radius: 8px;
  color: #55736e;
  background: rgba(39, 112, 98, .055);
  font-size: 11px;
}

.suggestions-dropdown {
  position: absolute;
  top: 55px;
  left: 75px;
  right: 0;
  overflow: hidden;
  padding: 6px;
  border: 1px solid var(--study-line);
  border-radius: 12px;
  background: rgba(255, 255, 252, .98);
  box-shadow: 0 18px 40px rgba(28, 71, 63, .16);
}

.suggestion-row {
  display: grid;
  grid-template-columns: 20px 1fr auto;
  align-items: center;
  width: 100%;
  gap: 8px;
  padding: 9px 11px;
  border: 0;
  border-radius: 8px;
  color: #355e58;
  background: transparent;
  text-align: left;
}

.suggestion-row:hover,
.suggestion-row.active { background: rgba(47, 155, 131, .09); }
.suggestion-row small { color: #8da19d; }

.search-layout { display: grid; grid-template-columns: minmax(0, 1fr) 318px; min-height: 650px; }
.result-panel { min-width: 0; padding: 22px 24px 28px; }
.poetry-insights { padding: 25px 24px; border-left: 1px solid var(--study-line); background: rgba(247, 250, 244, .72); }

.topic-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 16px;
  overflow-x: auto;
  border-bottom: 1px solid var(--study-line);
}

.topic-tabs button,
.sort-tabs button {
  flex: 0 0 auto;
  padding: 7px 13px;
  border: 0;
  border-radius: 9px;
  color: #55736e;
  background: transparent;
  font-size: 12px;
}

.topic-tabs button:hover,
.topic-tabs button.active,
.sort-tabs button.active { color: #fff; background: #29947e; }
.topic-tabs .filter-trigger { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; border-left: 1px solid var(--study-line); border-radius: 0; }
.topic-tabs .filter-trigger:hover { color: var(--study-deep); background: transparent; }

.result-toolbar { display: flex; align-items: center; justify-content: space-between; min-height: 55px; color: #52726c; font-size: 12px; }
.result-toolbar strong { color: var(--study-ink); font: 600 17px 'Noto Serif SC', serif; }
.result-toolbar small { margin-left: 9px; color: #96a8a4; }
.sort-tabs { display: flex; align-items: center; gap: 3px; }
.sort-tabs button { padding: 6px 9px; }

.search-insight-strip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 15px;
  padding: 11px 14px;
  border-left: 3px solid #d2a45a;
  border-radius: 5px 10px 10px 5px;
  color: #8b6a35;
  background: rgba(221, 184, 116, .1);
  font-size: 12px;
}

.search-insight-strip strong { color: #6e5a35; }
.search-insight-strip p { display: inline; margin: 0 8px; color: #7f8175; }
.search-insight-strip button { padding: 0; border: 0; color: var(--study-deep); background: transparent; }

.poem-result-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
.poem-result-card {
  position: relative;
  min-height: 168px;
  overflow: hidden;
  padding: 19px 20px 16px;
  border: 1px solid rgba(46, 105, 94, .12);
  border-radius: 14px;
  background: rgba(255, 255, 252, .76);
  box-shadow: 0 8px 20px rgba(38, 79, 72, .04);
  cursor: pointer;
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
}

.poem-result-card::after {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 48%;
  height: 66%;
  content: '';
  background: url('@/assets/review-inkwash.png') right bottom / cover no-repeat;
  opacity: .075;
  pointer-events: none;
}

.poem-result-card:hover,
.poem-result-card:focus-visible { border-color: rgba(47, 155, 131, .36); box-shadow: 0 14px 30px rgba(38, 79, 72, .09); transform: translateY(-2px); outline: 0; }
.poem-card-head { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.poem-card-head h2 { margin: 0; color: #17645b; font: 600 19px/1.35 'Noto Serif SC', serif; }
.poem-card-head p { margin: 5px 0 0; color: #6f8782; font-size: 11px; }
.match-score { flex: 0 0 auto; padding: 4px 7px; border-radius: 7px; color: #a46f25; background: rgba(209, 166, 92, .13); font-size: 10px; }
.poem-excerpt { position: relative; z-index: 1; display: -webkit-box; min-height: 45px; margin: 15px 0; overflow: hidden; color: #445f5b; font: 14px/1.8 'Noto Serif SC', serif; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.poem-card-foot { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; color: #2a8374; }
.poem-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.poem-tags span { padding: 3px 7px; border-radius: 6px; color: #5d7d76; background: rgba(43, 124, 108, .07); font-size: 10px; }
.search-pagination { display: flex; justify-content: center; gap: 6px; margin-top: 18px; }
.search-pagination button { display: grid; min-width: 31px; height: 31px; padding: 0 7px; border: 1px solid var(--study-line); border-radius: 8px; place-items: center; color: #607c76; background: rgba(255,255,255,.56); font-size: 10px; }
.search-pagination button.active { border-color: #2f907c; color: #fff; background: #2f907c; }
.search-pagination button:disabled { opacity: .38; }

.discovery-state { padding: 10px 0 0; }
.discovery-heading { display: flex; align-items: end; justify-content: space-between; margin-bottom: 18px; }
.discovery-heading small { color: #91a29e; font-size: 10px; }
.discovery-heading h2 { margin-top: 3px; font-size: 21px; }
.discovery-heading > button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border: 1px solid var(--study-line); border-radius: 9px; color: var(--study-deep); background: rgba(255,255,255,.5); }
.discovery-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
.discovery-grid > button { display: grid; grid-template-columns: 1fr auto; min-height: 110px; padding: 19px; border: 1px solid var(--study-line); border-radius: 14px; color: var(--study-deep); background: rgba(255,255,252,.68); text-align: left; }
.discovery-grid span { font: 600 18px 'Noto Serif SC', serif; }
.discovery-grid small { align-self: end; color: #7f9590; }
.discovery-grid svg { grid-column: 2; grid-row: 1 / span 2; align-self: center; }
.history-line { display: flex; align-items: center; gap: 7px; margin-top: 18px; padding: 13px 0; color: #6c8781; font-size: 11px; }
.history-line .history-clear { margin-left: auto; color: #9a8174; background: transparent; }

.search-empty { display: grid; min-height: 360px; place-items: center; align-content: center; gap: 10px; color: #73908a; text-align: center; }
.search-empty h2 { font-size: 21px; }
.search-empty p { margin: 0 0 6px; font-size: 12px; }
.search-empty > div { display: flex; gap: 7px; }

.insight-title { display: flex; align-items: center; gap: 9px; padding-bottom: 21px; border-bottom: 1px solid var(--study-line); color: var(--study-deep); }
.insight-title h2 { font-size: 20px; }
.poetry-insights section { padding: 22px 0 3px; }
.aside-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.aside-section-head h3 { margin: 0; color: #2c6f65; font: 600 13px 'Noto Serif SC', serif; }
.aside-section-head span { color: #96a6a2; font-size: 9px; }
.author-list { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
.author-list button { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; padding: 0; border: 0; color: #516e69; background: transparent; }
.author-portrait { width: 38px; height: 38px; border: 1px solid rgba(46, 119, 105, .16); border-radius: 50%; object-fit: cover; box-shadow: 0 4px 10px rgba(39, 82, 74, .1); }
.author-list strong { max-width: 100%; overflow: hidden; font: 500 10px 'Noto Serif SC', serif; text-overflow: ellipsis; white-space: nowrap; }
.author-list small { color: #91a29e; font-size: 8px; }
.dynasty-list { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.dynasty-list button { display: flex; flex-direction: column; gap: 6px; padding: 10px 4px; border: 0; border-radius: 9px; color: #67817c; background: rgba(43, 124, 108, .045); font-size: 9px; }
.dynasty-list strong { color: var(--study-deep); font-size: 12px; }
.theme-bars button { display: grid; grid-template-columns: 37px 1fr 20px; align-items: center; width: 100%; gap: 8px; padding: 5px 0; border: 0; color: #607c76; background: transparent; font-size: 10px; text-align: left; }
.theme-bars i { height: 4px; overflow: hidden; border-radius: 4px; background: rgba(44, 129, 113, .08); }
.theme-bars b { display: block; height: 100%; border-radius: inherit; background: #3d9b87; }
.theme-bars strong { color: #5c7872; font-weight: 500; text-align: right; }
.search-tip-card { display: flex; align-items: flex-start; gap: 10px; margin-top: 24px; padding: 15px; border: 1px solid rgba(188, 142, 67, .14); border-radius: 12px; color: #a77a36; background: rgba(222, 190, 128, .09); }
.search-tip-card strong { color: #795f38; font: 600 12px 'Noto Serif SC', serif; }
.search-tip-card p { margin: 5px 0 0; color: #7d8276; font-size: 9px; line-height: 1.7; }

@media (max-width: 1080px) {
  .search-layout { grid-template-columns: 1fr; }
  .poetry-insights { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; border-top: 1px solid var(--study-line); border-left: 0; }
  .insight-title { grid-column: 1 / -1; }
  .poetry-insights section { padding-top: 0; }
  .search-tip-card { grid-column: 1 / -1; margin-top: 0; }
}

@media (max-width: 760px) {
  .search-study-page { width: calc(100vw - 24px) !important; max-width: calc(100vw - 24px) !important; min-width: 0; padding: 12px 8px 28px !important; overflow-x: hidden; }
  .search-workspace { width: calc(100% - 12px); max-width: calc(100% - 12px); margin-right: 12px; border-radius: 18px; }
  .study-hero { padding: 20px 16px 16px; }
  .hero-copy { width: auto; }
  .search-command { position: relative; top: auto; right: auto; left: auto; width: 100%; max-width: 100%; grid-template-columns: 58px minmax(0, 1fr); margin-top: 18px; }
  .search-submit { grid-column: 1 / -1; min-height: 42px; }
  .popular-queries { margin: 10px 0 0; overflow-x: auto; white-space: nowrap; }
  .result-panel { padding: 16px 14px 22px; }
  .topic-tabs .filter-trigger { margin-left: 0; }
  .poem-result-grid,
  .discovery-grid { grid-template-columns: 1fr; }
  .poetry-insights { grid-template-columns: 1fr; padding: 20px 16px; }
  .insight-title,
  .search-tip-card { grid-column: auto; }
  .history-line { flex-wrap: wrap; }
  .history-line .history-clear { margin-left: 0; }
  .study-hero,
  .result-panel,
  .poetry-insights,
  .search-input-wrap { min-width: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .poem-result-card,
  .search-command { transition: none; }
  .button-spinner { animation-duration: 1.5s; }
}
</style>
