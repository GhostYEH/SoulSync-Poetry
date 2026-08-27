
<template>
  <div class="error-book-page review-study-page">
    <section class="review-workspace" aria-labelledby="review-title">
      <header class="review-hero">
        <div class="review-title-block">
          <span class="review-title-mark" aria-hidden="true"></span>
          <div>
            <h1 id="review-title">诗词错题本</h1>
            <p>回顾错因，温故知新</p>
          </div>
        </div>
        <div class="review-hero-actions">
          <router-link to="/challenge" class="quiet-action">
            <PhArrowLeft :size="17" />返回闯关
          </router-link>
          <button type="button" class="primary-action" :disabled="errors.length === 0" @click="startSmartReview">
            <PhBookOpenText :size="18" />开始复习
          </button>
        </div>
      </header>

      <div v-if="loading" class="review-loading" aria-live="polite">
        <div class="loading-summary"></div>
        <div v-for="index in 4" :key="index" class="loading-row"></div>
      </div>

      <div v-else-if="errors.length === 0" class="review-empty">
        <PhCheckCircle :size="58" weight="thin" aria-hidden="true" />
        <h2>错题已经温习完毕</h2>
        <p>继续闯关积累新的练习记录，错题会自动归入这里。</p>
        <router-link to="/challenge">去诗词闯关<PhArrowRight :size="17" /></router-link>
      </div>

      <div v-else class="review-content">
        <section class="mastery-overview" aria-label="掌握概览">
          <div class="mastery-ring" :style="{ '--mastery': `${masteryRate * 3.6}deg` }">
            <div>
              <strong>{{ masteryRate }}%</strong>
              <span>掌握进度</span>
            </div>
          </div>
          <div class="mastery-stat">
            <PhWarningCircle :size="21" weight="duotone" />
            <span>待巩固</span>
            <strong>{{ stats.total - stats.mastered }}</strong>
          </div>
          <div class="mastery-stat">
            <PhCheckCircle :size="21" weight="duotone" />
            <span>已掌握</span>
            <strong>{{ stats.mastered }}</strong>
          </div>
          <div class="mastery-stat">
            <PhCalendarBlank :size="21" weight="duotone" />
            <span>本周新增</span>
            <strong>{{ stats.weekCount }}</strong>
          </div>
          <button type="button" class="overview-review" @click="startSmartReview">
            继续巩固<PhArrowRight :size="17" />
          </button>
        </section>

        <nav class="review-tabs" aria-label="错题状态筛选">
          <button type="button" :class="{ active: filterType === 'all' }" @click="filterType = 'all'">全部 <span>{{ stats.total }}</span></button>
          <button type="button" :class="{ active: filterType === 'unmastered' }" @click="filterType = 'unmastered'">待复习 <span>{{ stats.total - stats.mastered }}</span></button>
          <button type="button" :class="{ active: filterType === 'mastered' }" @click="filterType = 'mastered'">已掌握 <span>{{ stats.mastered }}</span></button>
        </nav>

        <section class="rhythm-section" aria-labelledby="rhythm-title">
          <div class="section-heading">
            <div>
              <small>近七日</small>
              <h2 id="rhythm-title">掌握节律</h2>
            </div>
            <div class="rhythm-legend">
              <span><i class="pending-dot"></i>新增错题</span>
              <span><i class="mastered-dot"></i>已掌握</span>
            </div>
          </div>
          <div class="rhythm-track">
            <div v-for="day in reviewRhythm" :key="day.key" class="rhythm-day" :class="{ today: day.today }">
              <span>{{ day.weekday }}</span>
              <div class="day-bars">
                <i class="wrong-bar" :style="{ height: `${Math.max(4, day.wrong * 7)}px` }"></i>
                <i class="done-bar" :style="{ height: `${Math.max(4, day.mastered * 7)}px` }"></i>
              </div>
              <strong>{{ day.date }}</strong>
            </div>
          </div>
        </section>

        <section class="question-section" aria-labelledby="question-list-title">
          <div class="question-toolbar">
            <div>
              <small>错题清单</small>
              <h2 id="question-list-title">共 {{ filteredErrors.length }} 道</h2>
            </div>
            <div class="toolbar-controls">
              <label>
                <PhFunnel :size="16" aria-hidden="true" />
                <select v-model="filterSource" aria-label="按来源筛选">
                  <option value="all">全部来源</option>
                  <option value="challenge">诗词闯关</option>
                  <option value="battle">闯关对战</option>
                  <option value="parkour">诗词跑酷</option>
                  <option value="card-catch">诗词大富翁</option>
                  <option value="feihualing_answer">飞花令作答</option>
                  <option value="feihualing_hint">飞花令提示</option>
                </select>
              </label>
              <label>
                <PhArrowsDownUp :size="16" aria-hidden="true" />
                <select v-model="sortType" aria-label="错题排序">
                  <option value="recent">按时间排序</option>
                  <option value="mostwrong">按错误次数</option>
                  <option value="difficulty">按难度排序</option>
                </select>
              </label>
              <button type="button" class="clear-all" @click="confirmClearAll"><PhTrash :size="16" />清空</button>
            </div>
          </div>

          <div class="question-list">
            <article
              v-for="item in paginatedErrors"
              :key="item.id"
              class="question-row"
              :class="{ mastered: item.mastered === 1 || item.mastered === true, expanded: expandedPoems[item.id] }"
            >
              <button type="button" class="question-summary" :aria-expanded="Boolean(expandedPoems[item.id])" @click="togglePoem(item.id)">
                <span class="question-status" :class="{ mastered: item.mastered === 1 || item.mastered === true }">
                  {{ item.mastered === 1 || item.mastered === true ? '已掌握' : '待复习' }}
                </span>
                <span class="question-main">
                  <strong>{{ item.question_content || item.question || item.q }}</strong>
                  <small>
                    {{ sourceLabel(item.source) }}
                    <template v-if="item.title"> · 《{{ item.title }}》{{ item.author ? ` · ${item.author}` : '' }}</template>
                  </small>
                </span>
                <span class="question-meta">
                  <small>错误 {{ item.wrong_count || item.wrongTimes || 1 }} 次</small>
                  <small>{{ formatDate(item.added_at || item.addedAt || item.created_at) }}</small>
                </span>
                <PhCaretDown :size="18" class="summary-caret" aria-hidden="true" />
              </button>

              <Transition name="answer-reveal">
                <div v-if="expandedPoems[item.id]" class="question-detail">
                  <div class="answer-compare">
                    <div class="answer-block wrong-answer">
                      <span>你的答案</span>
                      <strong>{{ item.user_answer || item.userAnswer || '未作答' }}</strong>
                    </div>
                    <PhArrowRight :size="18" aria-hidden="true" />
                    <div class="answer-block correct-answer">
                      <span>正确答案</span>
                      <strong>{{ item.correct_answer || item.correctAnswer || item.answer }}</strong>
                    </div>
                  </div>
                  <div v-if="item.explanation" class="reason-block">
                    <span>错因解析</span>
                    <p>{{ item.explanation }}</p>
                  </div>
                  <div v-if="item.full_poem" class="poem-context">
                    <span>诗词原文</span>
                    <p>{{ item.full_poem }}</p>
                  </div>
                  <div class="detail-actions">
                    <button type="button" class="review-single" @click="reviewSingle(item)"><PhBookOpenText :size="16" />专项复习</button>
                    <button type="button" class="delete-single" @click="removeSingle(item.id)"><PhTrash :size="16" />移出错题本</button>
                  </div>
                </div>
              </Transition>
            </article>
          </div>

          <div v-if="totalPages > 1" class="review-pagination" aria-label="错题分页">
            <button type="button" :disabled="currentPage === 1" aria-label="上一页" @click="currentPage--"><PhCaretLeft :size="16" /></button>
            <button
              v-for="page in visiblePages"
              :key="page"
              type="button"
              :disabled="page === '...'"
              :class="{ active: page === currentPage }"
              @click="page !== '...' && (currentPage = page)"
            >{{ page }}</button>
            <button type="button" :disabled="currentPage === totalPages" aria-label="下一页" @click="currentPage++"><PhCaretRight :size="16" /></button>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import { askConfirm } from '../services/appFeedback';
import {
  PhArrowLeft,
  PhArrowRight,
  PhArrowsDownUp,
  PhBookOpenText,
  PhCalendarBlank,
  PhCaretDown,
  PhCaretLeft,
  PhCaretRight,
  PhCheckCircle,
  PhFunnel,
  PhTrash,
  PhWarningCircle,
} from '@phosphor-icons/vue';

export default {
  name: 'ErrorBook',
  components: {
    PhArrowLeft,
    PhArrowRight,
    PhArrowsDownUp,
    PhBookOpenText,
    PhCalendarBlank,
    PhCaretDown,
    PhCaretLeft,
    PhCaretRight,
    PhCheckCircle,
    PhFunnel,
    PhTrash,
    PhWarningCircle,
  },
  setup() {
    const router = useRouter();

    // ---- 状态 ----
    const loading = ref(true);
    const errors = ref([]);
    const filterType = ref('all');
    const filterSource = ref('all');
    const sortType = ref('recent');
    const currentPage = ref(1);
    const pageSize = 10;

    // 展开诗词全文
    const expandedPoems = ref({});

    const sourceLabel = (source) => ({
      challenge: '闯关',
      battle: '对战',
      parkour: '诗词跑酷',
      'card-catch': '诗词大富翁',
      card_catch: '诗词大富翁',
      feihualing_answer: '飞花令作答',
      feihualing_hint: '飞花令提示'
    }[source] || '学习练习');

    // ---- 复习模式状态（错题复习页使用，此处仅保留兼容） ----
    const reviewMode = ref(false);

    // ---- 计算属性 ----
    const stats = computed(() => {
      const total = errors.value.length;
      const mastered = errors.value.filter(e => e.mastered === 1 || e.mastered === true).length;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekCount = errors.value.filter(e => new Date(e.added_at || e.addedAt || e.created_at) >= oneWeekAgo).length;
      return { total, mastered, weekCount };
    });

    const masteryRate = computed(() => {
      if (errors.value.length === 0) return 100;
      return Math.round((stats.value.mastered / stats.value.total) * 100);
    });

    const filteredErrors = computed(() => {
      let result = [...errors.value];

      // 按类型筛选
      if (filterType.value === 'mastered') {
        result = result.filter(e => e.mastered === 1 || e.mastered === true);
      } else if (filterType.value === 'unmastered') {
        result = result.filter(e => !e.mastered || e.mastered === 0 || e.mastered === false);
      }

      // 按来源筛选
      if (filterSource.value !== 'all') {
        result = result.filter(e => e.source === filterSource.value);
      }

      // 排序
      if (sortType.value === 'recent') {
        result.sort((a, b) => new Date(b.added_at || b.addedAt || b.created_at) - new Date(a.added_at || a.addedAt || a.created_at));
      } else if (sortType.value === 'mostwrong') {
        result.sort((a, b) => (b.wrong_count || b.wrongTimes || 1) - (a.wrong_count || a.wrongTimes || 1));
      } else if (sortType.value === 'difficulty') {
        result.sort((a, b) => (b.level || 0) - (a.level || 0));
      }

      return result;
    });

    const totalPages = computed(() => Math.ceil(filteredErrors.value.length / pageSize));

    const paginatedErrors = computed(() => {
      const start = (currentPage.value - 1) * pageSize;
      return filteredErrors.value.slice(start, start + pageSize);
    });

    const visiblePages = computed(() => {
      const pages = [];
      const total = totalPages.value;
      const current = currentPage.value;
      if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        if (current > 3) pages.push('...');
        for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
        if (current < total - 2) pages.push('...');
        pages.push(total);
      }
      return pages;
    });

    const reviewRhythm = computed(() => {
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (6 - index));
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);
        const items = errors.value.filter((item) => {
          const value = item.added_at || item.addedAt || item.last_wrong_time || item.created_at;
          if (!value) return false;
          const itemDate = new Date(value);
          return itemDate >= date && itemDate < nextDay;
        });
        return {
          key: date.toISOString(),
          weekday: `周${weekdays[date.getDay()]}`,
          date: date.getDate(),
          today: index === 6,
          wrong: items.length,
          mastered: items.filter((item) => item.mastered === 1 || item.mastered === true).length,
        };
      });
    });

    // ---- 数据加载 ----
    const loadErrors = async () => {
      try {
        loading.value = true;
        // 并行加载错题本数据和复习统计数据
        const [errorBookData, reviewStats] = await Promise.all([
          api.challenge.getErrorBook().catch(() => []),
          api.wrongQuestions.getStats().catch(() => ({ pending: 0, mastered: 0, total: 0 }))
        ]);

        // 获取 wrong_questions 表的数据
        let reviewQuestions = [];
        try {
          reviewQuestions = await api.wrongQuestions.getQuestions(100);
        } catch {}

        // 合并两个数据源
        const allErrors = [];
        const addedQuestions = new Set();

        // 添加 user_error_book 的数据
        (errorBookData || []).forEach(item => {
          const questionKey = item.question_content || item.question || '';
          if (!addedQuestions.has(questionKey)) {
            allErrors.push({
              ...item,
              question: item.question_content || item.question,
              source: 'challenge'
            });
            addedQuestions.add(questionKey);
          }
        });

        // 添加 wrong_questions 的数据
        (reviewQuestions || []).forEach(item => {
          const questionKey = item.question || '';
          if (!addedQuestions.has(questionKey)) {
            allErrors.push({
              ...item,
              // 新记录由后端写入来源；旧记录没有 source 时继续按跑酷兼容展示。
              source: item.source || 'parkour'
            });
            addedQuestions.add(questionKey);
          }
        });

        // 按时间排序
        allErrors.sort((a, b) => {
          const timeA = new Date(a.added_at || a.last_wrong_time || a.created_at || 0).getTime();
          const timeB = new Date(b.added_at || b.last_wrong_time || b.created_at || 0).getTime();
          return timeB - timeA;
        });

        errors.value = allErrors;

      } catch (error) {
        console.error('加载错题本失败:', error);
        errors.value = [];
      } finally {
        loading.value = false;
      }
    };


    // ---- 错题操作 ----
    const removeSingle = async (id) => {
      if (!await askConfirm('确定要删除这道错题吗？', { title: '删除错题', confirmText: '删除', danger: true })) return;
      try {
        await api.challenge.removeFromErrorBook(id);
        errors.value = errors.value.filter(e => e.id !== id);
      } catch (error) {
        console.error('删除错题失败:', error);
      }
    };

    const confirmClearAll = async () => {
      if (!await askConfirm(`确定要清空所有 ${errors.value.length} 道错题吗？此操作不可恢复！`, { title: '清空错题本', confirmText: '全部清空', danger: true })) return;
      try {
        await Promise.all(errors.value.map(e => api.challenge.removeFromErrorBook(e.id).catch(() => {})));
        errors.value = [];
      } catch (error) {
        console.error('清空错题失败:', error);
      }
    };

    const togglePoem = (id) => {
      expandedPoems.value[id] = !expandedPoems.value[id];
    };

    // ---- 复习模式 ----
    const startSmartReview = () => {
      router.push('/challenge/review');
    };

    const reviewSingle = (item) => {
      // 跳转到错题复习页面并携带题目ID
      router.push({ path: '/challenge/review', query: { questionId: item.id } });
    };

    // ---- 工具函数 ----
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now - date;
      if (diff < 60000) return '刚刚';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
      if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    };

    // ---- 生命周期 ----
    onMounted(() => {
      loadErrors();
    });

    // 筛选变化时重置页码
    watch([filterType, filterSource, sortType], () => { currentPage.value = 1; });

    return {
      loading, errors, filterType, filterSource, sortType,
      currentPage, pageSize, totalPages, paginatedErrors, visiblePages,
      stats, masteryRate, filteredErrors,
      reviewRhythm,
      sourceLabel,
      expandedPoems, reviewMode,
      removeSingle, confirmClearAll, togglePoem,
      startSmartReview, reviewSingle,
      formatDate
    };
  }
};
</script>


<style scoped>
.review-study-page {
  --review-ink: #194f49;
  --review-deep: #236b61;
  --review-jade: #2f9882;
  --review-gold: #b9853e;
  --review-paper: #f9fbf6;
  --review-line: rgba(39, 103, 92, .14);
  position: relative;
  min-height: calc(100dvh - 104px);
  padding: 26px clamp(18px, 3.2vw, 52px) 52px;
  color: #365d58;
  background: #eef5ef;
  font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
}

.review-study-page::before {
  position: absolute;
  inset: 0;
  content: '';
  background: url('@/assets/jade-paper-ambient.png') center top / cover no-repeat;
  opacity: .34;
  pointer-events: none;
}

.review-workspace {
  position: relative;
  z-index: 1;
  width: min(1400px, 100%);
  min-height: 720px;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.84);
  border-radius: 28px;
  background: rgba(250, 252, 247, .91);
  box-shadow: 0 24px 70px rgba(31, 77, 68, .12), inset 0 1px 0 #fff;
  backdrop-filter: blur(18px);
}

.review-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 112px;
  padding: 24px 30px;
  border-bottom: 1px solid var(--review-line);
  background: rgba(250,252,247,.72);
}

.review-hero::after {
  position: absolute;
  top: 0;
  right: 140px;
  width: 340px;
  height: 100%;
  content: '';
  background: url('@/assets/review-inkwash.png') center / cover no-repeat;
  opacity: .12;
  pointer-events: none;
}

.review-title-block { position: relative; z-index: 1; display: flex; align-items: center; gap: 15px; }
.review-title-mark { width: 4px; height: 52px; border-radius: 4px; background: var(--review-jade); }
.review-title-block h1,
.section-heading h2,
.question-toolbar h2,
.review-empty h2 {
  margin: 0;
  color: var(--review-ink);
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-weight: 600;
}
.review-title-block h1 { font-size: 29px; letter-spacing: .08em; }
.review-title-block p { margin: 5px 0 0; color: #7a928d; font-size: 12px; }
.review-hero-actions { position: relative; z-index: 1; display: flex; align-items: center; gap: 9px; }
.quiet-action,
.primary-action,
.overview-review,
.review-empty a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 15px;
  border-radius: 10px;
  font-size: 12px;
  text-decoration: none;
}
.quiet-action { border: 1px solid var(--review-line); color: #577670; background: rgba(255,255,255,.48); }
.primary-action,
.overview-review,
.review-empty a { border: 0; color: #fff; background: #258e79; box-shadow: 0 8px 18px rgba(32, 127, 108, .17); }
.primary-action:disabled { cursor: not-allowed; opacity: .48; }

.review-content { padding: 24px 28px 32px; }
.mastery-overview {
  display: grid;
  grid-template-columns: 150px repeat(3, minmax(100px, 1fr)) minmax(150px, auto);
  align-items: center;
  min-height: 118px;
  gap: 0;
  padding: 16px 20px;
  border: 1px solid var(--review-line);
  border-radius: 16px;
  background: rgba(255,255,252,.68);
  box-shadow: 0 9px 24px rgba(37, 80, 72, .04);
}
.mastery-ring {
  display: grid;
  width: 82px;
  height: 82px;
  margin: 0 auto;
  place-items: center;
  border: 7px solid rgba(47, 152, 130, .22);
  border-top-color: #2f9882;
  border-right-color: #2f9882;
  border-radius: 50%;
  background: #fbfcf8;
}
.mastery-ring div { display: flex; flex-direction: column; align-items: center; }
.mastery-ring strong { color: var(--review-ink); font: 600 21px 'Noto Serif SC', serif; }
.mastery-ring span { margin-top: 2px; color: #849b96; font-size: 9px; }
.mastery-stat { display: grid; grid-template-columns: 32px 1fr; grid-template-rows: auto auto; align-items: center; padding: 8px 22px; border-left: 1px solid var(--review-line); color: #4b8278; }
.mastery-stat svg { grid-row: 1 / span 2; }
.mastery-stat span { color: #819792; font-size: 10px; }
.mastery-stat strong { color: var(--review-ink); font: 600 21px 'Noto Serif SC', serif; }
.overview-review { justify-self: end; min-width: 142px; }

.review-tabs { display: flex; align-items: center; gap: 5px; margin: 22px 0 0; border-bottom: 1px solid var(--review-line); }
.review-tabs button { position: relative; padding: 11px 17px 13px; border: 0; color: #6e8782; background: transparent; font-size: 12px; }
.review-tabs button::after { position: absolute; right: 17px; bottom: -1px; left: 17px; height: 2px; content: ''; background: transparent; }
.review-tabs button.active { color: var(--review-deep); font-weight: 600; }
.review-tabs button.active::after { background: var(--review-jade); }
.review-tabs span { display: inline-grid; min-width: 20px; height: 20px; margin-left: 5px; padding: 0 5px; place-items: center; border-radius: 10px; color: #638079; background: rgba(45, 130, 112, .08); font-size: 9px; }

.rhythm-section { margin-top: 20px; padding: 19px 22px 16px; border: 1px solid var(--review-line); border-radius: 14px; background: rgba(255,255,252,.58); }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; }
.section-heading small,
.question-toolbar small { color: #94a6a2; font-size: 9px; }
.section-heading h2 { margin-top: 2px; font-size: 17px; }
.rhythm-legend { display: flex; gap: 13px; color: #7c918d; font-size: 9px; }
.rhythm-legend span { display: flex; align-items: center; gap: 5px; }
.rhythm-legend i { width: 7px; height: 7px; border-radius: 50%; }
.pending-dot { background: #cf9850; }
.mastered-dot { background: #3d9b87; }
.rhythm-track { position: relative; display: grid; grid-template-columns: repeat(7, 1fr); align-items: end; height: 96px; margin-top: 8px; }
.rhythm-track::before { position: absolute; right: 4%; bottom: 23px; left: 4%; height: 1px; content: ''; background: rgba(45, 130, 112, .12); }
.rhythm-day { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; color: #8aa09b; font-size: 9px; }
.rhythm-day.today span { color: var(--review-deep); font-weight: 600; }
.rhythm-day strong { display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; color: #67817c; font-size: 9px; }
.rhythm-day.today strong { color: #fff; background: #34917d; }
.day-bars { display: flex; align-items: end; height: 42px; gap: 3px; }
.day-bars i { display: block; width: 5px; max-height: 38px; border-radius: 4px 4px 1px 1px; }
.wrong-bar { background: #cf9850; }
.done-bar { background: #3d9b87; }

.question-section { margin-top: 20px; }
.question-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.question-toolbar h2 { margin-top: 3px; font-size: 18px; }
.toolbar-controls { display: flex; align-items: center; gap: 8px; }
.toolbar-controls label { display: flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 10px; border: 1px solid var(--review-line); border-radius: 9px; color: #65817b; background: rgba(255,255,255,.54); }
.toolbar-controls select { min-width: 100px; border: 0; outline: 0; color: #57736d; background: transparent; font-size: 10px; }
.clear-all { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 11px; border: 1px solid rgba(166, 91, 75, .16); border-radius: 9px; color: #a05f52; background: rgba(178, 96, 79, .045); font-size: 10px; }

.question-list { overflow: hidden; border: 1px solid var(--review-line); border-radius: 14px; background: rgba(255,255,252,.66); }
.question-row { border-bottom: 1px solid var(--review-line); }
.question-row:last-child { border-bottom: 0; }
.question-row.expanded { background: rgba(246, 250, 244, .75); }
.question-summary { display: grid; grid-template-columns: 66px minmax(0, 1fr) 118px 24px; align-items: center; width: 100%; gap: 14px; padding: 16px 18px; border: 0; color: #3b5c57; background: transparent; text-align: left; }
.question-summary:hover { background: rgba(44, 135, 116, .035); }
.question-status { justify-self: start; padding: 5px 8px; border-radius: 7px; color: #a9732e; background: rgba(207, 152, 80, .11); font-size: 9px; }
.question-status.mastered { color: #317c6d; background: rgba(61, 155, 135, .1); }
.question-main { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.question-main strong { overflow: hidden; color: #2e5650; font: 500 13px 'Noto Serif SC', serif; text-overflow: ellipsis; white-space: nowrap; }
.question-main small,
.question-meta small { color: #8b9d99; font-size: 9px; }
.question-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.summary-caret { color: #64837d; transition: transform .2s ease; }
.question-row.expanded .summary-caret { transform: rotate(180deg); }

.question-detail { padding: 4px 18px 18px 98px; }
.answer-compare { display: grid; grid-template-columns: 1fr 24px 1fr; align-items: center; gap: 12px; }
.answer-compare > svg { color: #9ca9a6; }
.answer-block { display: flex; flex-direction: column; gap: 6px; padding: 13px 15px; border-radius: 10px; }
.answer-block span,
.reason-block > span,
.poem-context > span { font-size: 9px; }
.answer-block strong { font: 500 13px 'Noto Serif SC', serif; }
.wrong-answer { color: #925f54; background: rgba(174, 94, 77, .055); }
.correct-answer { color: #2e776a; background: rgba(44, 140, 119, .06); }
.reason-block,
.poem-context { margin-top: 11px; padding: 13px 15px; border-left: 2px solid rgba(47, 152, 130, .42); border-radius: 3px 9px 9px 3px; background: rgba(47, 152, 130, .035); }
.reason-block > span,
.poem-context > span { color: #2e776a; font-weight: 600; }
.reason-block p,
.poem-context p { margin: 6px 0 0; color: #627b76; font-size: 11px; line-height: 1.7; }
.poem-context p { white-space: pre-line; font-family: 'Noto Serif SC', serif; }
.detail-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.detail-actions button { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 11px; border-radius: 8px; font-size: 10px; }
.review-single { border: 0; color: #fff; background: #2f907c; }
.delete-single { border: 1px solid rgba(166,91,75,.17); color: #9c6257; background: transparent; }

.review-pagination { display: flex; justify-content: center; gap: 6px; margin-top: 18px; }
.review-pagination button { display: grid; min-width: 32px; height: 32px; padding: 0 8px; border: 1px solid var(--review-line); border-radius: 8px; place-items: center; color: #607c76; background: rgba(255,255,255,.52); font-size: 10px; }
.review-pagination button.active { border-color: #2f907c; color: #fff; background: #2f907c; }
.review-pagination button:disabled { opacity: .42; }

.review-loading { padding: 26px 28px; }
.loading-summary,
.loading-row { border-radius: 14px; background: rgba(43, 124, 108, .065); animation: review-pulse 1.2s ease-in-out infinite alternate; }
.loading-summary { height: 118px; margin-bottom: 22px; }
.loading-row { height: 62px; margin-bottom: 9px; }
@keyframes review-pulse { to { opacity: .45; } }
.review-empty { display: grid; min-height: 560px; place-items: center; align-content: center; gap: 10px; color: #6f8b85; text-align: center; }
.review-empty h2 { font-size: 23px; }
.review-empty p { margin: 0 0 8px; font-size: 12px; }

.answer-reveal-enter-active,
.answer-reveal-leave-active { transition: opacity .18s ease, transform .18s ease; }
.answer-reveal-enter-from,
.answer-reveal-leave-to { opacity: 0; transform: translateY(-5px); }

@media (max-width: 980px) {
  .mastery-overview { grid-template-columns: 120px repeat(3, 1fr); }
  .overview-review { grid-column: 1 / -1; justify-self: stretch; margin-top: 12px; }
  .mastery-stat { padding-inline: 14px; }
}

@media (max-width: 720px) {
  .review-study-page { width: calc(100vw - 24px) !important; max-width: calc(100vw - 24px) !important; min-width: 0; padding: 12px 8px 30px !important; overflow-x: hidden; }
  .review-workspace { width: calc(100% - 12px); max-width: calc(100% - 12px); margin-right: 12px; border-radius: 18px; }
  .review-hero { align-items: flex-start; flex-direction: column; gap: 18px; padding: 20px 16px; }
  .review-hero-actions { width: 100%; }
  .review-hero-actions > * { flex: 1; min-width: 0; padding-inline: 8px; white-space: nowrap; }
  .review-content { padding: 16px 14px 24px; }
  .mastery-overview { grid-template-columns: repeat(3, 1fr); }
  .mastery-ring { grid-column: 1 / -1; margin-bottom: 14px; }
  .mastery-stat { display: flex; flex-direction: column; gap: 4px; padding: 10px 4px; border-top: 1px solid var(--review-line); border-left: 0; text-align: center; }
  .mastery-stat svg { grid-row: auto; }
  .review-tabs { overflow-x: auto; }
  .rhythm-legend { display: none; }
  .question-toolbar { align-items: flex-start; flex-direction: column; gap: 12px; }
  .toolbar-controls { width: 100%; flex-wrap: wrap; }
  .toolbar-controls label { flex: 1; }
  .toolbar-controls select { width: 100%; }
  .question-summary { grid-template-columns: 62px minmax(0,1fr) 20px; gap: 9px; padding: 14px 12px; }
  .question-meta { display: none; }
  .question-detail { padding: 4px 12px 16px; }
  .answer-compare { grid-template-columns: 1fr; }
  .answer-compare > svg { display: none; }
  .review-hero,
  .review-content,
  .mastery-overview,
  .rhythm-section,
  .question-section { min-width: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .summary-caret,
  .answer-reveal-enter-active,
  .answer-reveal-leave-active { transition: none; }
  .loading-summary,
  .loading-row { animation: none; }
}
</style>
