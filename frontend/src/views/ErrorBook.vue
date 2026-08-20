<template>
  <div class="error-book-page">
    <!-- 页眉 -->
    <div class="page-header">
      <div class="header-left">
        <router-link to="/challenge" class="back-btn">
          <span class="back-icon">←</span>
          <span>返回闯关</span>
        </router-link>
      </div>
      <div class="header-center">
        <div class="page-title-wrap">
          <span class="title-icon">错</span>
          <h1 class="page-title">诗词错题本</h1>
        </div>
        <p class="page-subtitle">把错过的，再读一遍</p>
      </div>
      <div class="header-right">
        <button class="header-action-btn" @click="startSmartReview" :disabled="errors.length === 0">
          <span class="btn-icon">✦</span>
          <span>智能复习</span>
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-section">
      <div class="loading-cards">
        <div v-for="i in 3" :key="i" class="skeleton-card">
          <div class="skeleton-line wide"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line narrow"></div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="errors.length === 0" class="empty-state">
      <div class="empty-illustration">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="55" fill="rgba(205,133,63,0.08)" stroke="rgba(205,133,63,0.2)" stroke-width="2"></circle>
          <path d="M40 55C40 55 48 45 60 45C72 45 80 55 80 55" stroke="#cd853f" stroke-width="2.5" stroke-linecap="round"></path>
          <path d="M38 68C38 68 48 78 60 78C72 78 82 68 82 68" stroke="#cd853f" stroke-width="2.5" stroke-linecap="round"></path>
          <circle cx="45" cy="50" r="3" fill="#cd853f"></circle>
          <circle cx="75" cy="50" r="3" fill="#cd853f"></circle>
        </svg>
      </div>
      <h3>暂无错题记录</h3>
      <p>继续保持，诗词之路任重道远</p>
      <router-link to="/challenge" class="action-link-btn">
        去闯关练兵
      </router-link>
    </div>

    <!-- 主内容 -->
    <div v-else class="main-content">

      <!-- 第一行：统计数据 + 图表 -->
      <div class="stats-row">
        <!-- 统计卡片组 -->
        <div class="stats-cards">
          <div class="stat-card glass-card">
            <div class="stat-card-inner">
              <div class="stat-icon total-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                </svg>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ stats.total }}</span>
                <span class="stat-label">总错题数</span>
              </div>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-card-inner">
              <div class="stat-icon mastered-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
              </div>
              <div class="stat-info">
                <span class="stat-value mastered">{{ stats.mastered }}</span>
                <span class="stat-label">已掌握</span>
              </div>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-card-inner">
              <div class="stat-icon week-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                </svg>
              </div>
              <div class="stat-info">
                <span class="stat-value week">{{ stats.weekCount }}</span>
                <span class="stat-label">本周新增</span>
              </div>
            </div>
          </div>

          <div class="stat-card glass-card">
            <div class="stat-card-inner">
              <div class="stat-icon rate-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
              </div>
              <div class="stat-info">
                <span class="stat-value rate">{{ masteryRate }}%</span>
                <span class="stat-label">掌握率</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 错题趋势图表 -->
        <div class="chart-panel glass-card">
          <div class="chart-header">
            <span class="chart-title">掌握趋势</span>
            <div class="chart-legend">
              <span class="legend-item"><span class="dot total-dot"></span>错题数</span>
              <span class="legend-item"><span class="dot mastered-dot"></span>掌握数</span>
            </div>
          </div>
          <div ref="trendChartRef" class="chart-area"></div>
        </div>
      </div>

      <!-- 第二行：筛选 + 操作 -->
      <div class="control-row glass-card">
        <div class="filter-group">
          <div class="filter-item">
            <label>筛选类型</label>
            <select v-model="filterType" class="filter-select">
              <option value="all">全部 ({{ stats.total }})</option>
              <option value="unmastered">未掌握 ({{ stats.total - stats.mastered }})</option>
              <option value="mastered">已掌握 ({{ stats.mastered }})</option>
            </select>
          </div>
          <div class="filter-item">
            <label>来源</label>
            <select v-model="filterSource" class="filter-select">
              <option value="all">全部来源</option>
              <option value="challenge">诗词闯关</option>
              <option value="battle">闯关对战</option>
              <option value="feihualing_answer">飞花令作答</option>
              <option value="feihualing_hint">飞花令提示</option>
            </select>
          </div>
          <div class="filter-item">
            <label>排序</label>
            <select v-model="sortType" class="filter-select">
              <option value="recent">按最近添加</option>
              <option value="mostwrong">按错题次数</option>
              <option value="difficulty">按难度</option>
            </select>
          </div>
        </div>
        <div class="control-actions">
          <button class="ctrl-btn primary" @click="startSmartReview">
            <span>开始复习</span>
            <span class="badge" v-if="filteredErrors.length > 0">{{ filteredErrors.length }}</span>
          </button>
          <button class="ctrl-btn danger" @click="confirmClearAll" :disabled="errors.length === 0">
            清空全部
          </button>
        </div>
      </div>

      <!-- 错题列表 -->
      <div class="error-list">
        <TransitionGroup name="list">
          <div
            v-for="item in paginatedErrors"
            :key="item.id"
            class="error-card glass-card"
            :class="{ mastered: item.mastered === 1 || item.mastered === true }"
          >
            <!-- 卡片顶部：诗词信息 -->
            <div class="error-card-header">
              <div class="poem-badge" v-if="item.title">
                <span class="poem-title-text">{{ item.title }}</span>
                <span class="poem-author-text">{{ item.author || '佚名' }}</span>
              </div>
              <div class="error-meta">
                <span class="meta-tag source-tag" v-if="item.source">
                  {{ sourceLabel(item.source) }}
                </span>
                <span class="meta-tag level-tag" v-if="item.level">
                  Lv.{{ item.level }}
                </span>
                <span class="meta-tag wrong-count-tag">
                  错 {{ item.wrong_count || item.wrongTimes || 1 }} 次
                </span>
                <span class="meta-tag mastered-tag" v-if="item.mastered === 1 || item.mastered === true">
                  已掌握
                </span>
              </div>
            </div>

            <!-- 题目区域 -->
            <div class="error-question-block">
              <div class="question-label">题目</div>
              <div class="question-content">{{ item.question_content || item.question || item.q }}</div>
            </div>

            <!-- 答案对比 -->
            <div class="answer-comparison">
              <div class="answer-row wrong-row">
                <span class="answer-label">你的答案</span>
                <span class="answer-text wrong-text">
                  {{ item.user_answer || item.userAnswer || '未作答' }}
                </span>
              </div>
              <div class="answer-arrow">→</div>
              <div class="answer-row correct-row">
                <span class="answer-label">正确答案</span>
                <span class="answer-text correct-text">
                  {{ item.correct_answer || item.correctAnswer || item.answer }}
                </span>
              </div>
            </div>

            <!-- 解析 -->
            <div class="error-explanation" v-if="item.explanation">
              <div class="explanation-label">解析</div>
              <div class="explanation-text">{{ item.explanation }}</div>
            </div>

            <!-- 诗词全文（如果有） -->
            <div class="full-poem-preview" v-if="item.full_poem" @click="togglePoem(item.id)">
              <span class="poem-label">查看诗词全文</span>
              <span class="poem-toggle">{{ expandedPoems[item.id] ? '▲' : '▼' }}</span>
              <div v-if="expandedPoems[item.id]" class="full-poem-text">
                {{ item.full_poem }}
              </div>
            </div>

            <!-- 底部操作栏 -->
            <div class="error-card-footer">
              <div class="footer-info">
                <span class="add-time">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                  </svg>
                  {{ formatDate(item.added_at || item.addedAt || item.created_at) }}
                </span>
                <span class="last-review" v-if="item.last_reviewed_at">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                  </svg>
                  {{ formatDate(item.last_reviewed_at) }}
                </span>
              </div>
              <div class="footer-actions">
                <button class="footer-btn review-btn" @click="reviewSingle(item)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                  </svg>
                  复习
                </button>
                <button class="footer-btn delete-btn" @click="removeSingle(item.id)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                  </svg>
                  删除
                </button>
              </div>
            </div>
          </div>
        </TransitionGroup>

        <!-- 分页 -->
        <div class="pagination" v-if="totalPages > 1">
          <button class="page-btn" @click="currentPage--" :disabled="currentPage === 1">
            ‹
          </button>
          <button
            v-for="page in visiblePages"
            :key="page"
            class="page-btn"
            :class="{ active: page === currentPage }"
            @click="currentPage = page"
          >
            {{ page }}
          </button>
          <button class="page-btn" @click="currentPage++" :disabled="currentPage === totalPages">
            ›
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import api from '../services/api';

export default {
  name: 'ErrorBook',
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

    // 图表
    const trendChartRef = ref(null);
    let chartInstance = null;

    // 展开诗词全文
    const expandedPoems = ref({});

    const sourceLabel = (source) => ({
      challenge: '闯关',
      battle: '对战',
      parkour: '诗词跑酷',
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
              source: 'parkour'
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

        await nextTick();
        initTrendChart();
      } catch (error) {
        console.error('加载错题本失败:', error);
        errors.value = [];
      } finally {
        loading.value = false;
      }
    };

    // ---- 图表初始化 ----
    const initTrendChart = () => {
      // 延迟初始化，确保 DOM 渲染完成
      setTimeout(() => {
        try {
          if (!trendChartRef.value) return;
          if (chartInstance) {
            chartInstance.dispose();
            chartInstance = null;
          }

          chartInstance = echarts.init(trendChartRef.value);

          // 生成最近14天的数据
          const dates = [];
          const errorCounts = [];
          const masteredCounts = [];

          for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
            dates.push(dateStr);

            const dayStart = new Date(d);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(d);
            dayEnd.setHours(23, 59, 59, 999);

            const dayErrors = errors.value.filter(e => {
              const t = new Date(e.added_at || e.addedAt || e.created_at);
              return t >= dayStart && t <= dayEnd;
            });

            errorCounts.push(dayErrors.length);
            masteredCounts.push(dayErrors.filter(e => e.mastered === 1 || e.mastered === true).length);
          }

          const option = {
            tooltip: {
              trigger: 'axis',
              backgroundColor: 'rgba(255,252,240,0.95)',
              borderColor: 'rgba(205,133,63,0.3)',
              textStyle: { color: '#8b4513', fontFamily: 'SimSun' },
              axisPointer: { type: 'shadow' }
            },
            legend: { show: false },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '10px', containLabel: true },
            xAxis: {
              type: 'category', data: dates,
              axisLabel: { color: '#a0522d', fontSize: 11, fontFamily: 'SimSun' },
              axisLine: { lineStyle: { color: 'rgba(205,133,63,0.2)' } },
              splitLine: { show: false }
            },
            yAxis: {
              type: 'value', minInterval: 1,
              axisLabel: { color: '#a0522d', fontFamily: 'SimSun' },
              splitLine: { lineStyle: { color: 'rgba(205,133,63,0.1)' } }
            },
            series: [
              {
                name: '错题数', type: 'bar',
                data: errorCounts,
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#cd853f' }, { offset: 1, color: 'rgba(205,133,63,0.4)' }
                  ]),
                  borderRadius: [4, 4, 0, 0]
                },
                barMaxWidth: 20
              },
              {
                name: '掌握数', type: 'bar',
                data: masteredCounts,
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#6b8e23' }, { offset: 1, color: 'rgba(107,142,35,0.4)' }
                  ]),
                  borderRadius: [4, 4, 0, 0]
                },
                barMaxWidth: 20
              }
            ]
          };

          chartInstance.setOption(option);

          // 只注册一次 resize 监听器（移除旧的）
          window.removeEventListener('resize', handleChartResize);
          window.addEventListener('resize', handleChartResize);
        } catch (err) {
          console.error('初始化趋势图表失败:', err);
        }
      }, 100);
    };

    const handleChartResize = () => {
      if (chartInstance) chartInstance.resize();
    };

    // ---- 错题操作 ----
    const removeSingle = async (id) => {
      if (!confirm('确定要删除这道错题吗？')) return;
      try {
        await api.challenge.removeFromErrorBook(id);
        errors.value = errors.value.filter(e => e.id !== id);
        await nextTick();
        initTrendChart();
      } catch (error) {
        console.error('删除错题失败:', error);
      }
    };

    const confirmClearAll = async () => {
      if (!confirm(`确定要清空所有 ${errors.value.length} 道错题吗？此操作不可恢复！`)) return;
      try {
        await Promise.all(errors.value.map(e => api.challenge.removeFromErrorBook(e.id).catch(() => {})));
        errors.value = [];
        await nextTick();
        initTrendChart();
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

    onUnmounted(() => {
      if (chartInstance) { chartInstance.dispose(); chartInstance = null; }
      window.removeEventListener('resize', handleChartResize);
    });

    // 筛选变化时重置页码
    watch([filterType, filterSource, sortType], () => { currentPage.value = 1; });

    return {
      loading, errors, filterType, filterSource, sortType,
      currentPage, pageSize, totalPages, paginatedErrors, visiblePages,
      stats, masteryRate, filteredErrors,
      sourceLabel,
      trendChartRef, expandedPoems, reviewMode,
      removeSingle, confirmClearAll, togglePoem,
      startSmartReview, reviewSingle,
      formatDate
    };
  }
};
</script>

<style scoped>
/* ===== 页面基础 ===== */
.error-book-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px 60px;
  min-height: 100vh;
  background: linear-gradient(180deg, rgba(210,180,140,0.06) 0%, rgba(139,90,43,0.04) 100%);
}

/* ===== 页眉 ===== */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 0 24px;
  position: sticky;
  top: 0;
  background: linear-gradient(180deg, rgba(255,252,240,0.97) 0%, rgba(255,252,240,0) 100%);
  z-index: 100;
  backdrop-filter: blur(8px);
}

.header-left, .header-right {
  min-width: 140px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  color: #8b4513;
  text-decoration: none;
  font-size: 14px;
  font-family: 'SimSun', 'STSong', serif;
  background: rgba(255,252,240,0.9);
  border: 1px solid rgba(205,133,63,0.3);
  border-radius: 20px;
  transition: all 0.25s ease;
  backdrop-filter: blur(8px);
}
.back-btn:hover {
  background: rgba(255,252,240,1);
  border-color: rgba(205,133,63,0.5);
  transform: translateY(-1px);
}
.back-icon { font-size: 16px; }

.header-center { text-align: center; }
.page-title-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, rgba(205,133,63,0.2), rgba(139,69,19,0.15));
  border: 1px solid rgba(205,133,63,0.3);
  border-radius: 8px;
  font-family: 'SimSun', serif;
  font-size: 18px;
  color: #8b4513;
}
.page-title {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 24px;
  color: #8b4513;
  margin: 0;
  font-weight: bold;
}
.page-subtitle {
  font-family: 'SimSun', 'STSong', serif;
  color: #a0522d;
  font-size: 13px;
  margin: 4px 0 0;
}

.header-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  color: #fff;
  background: linear-gradient(135deg, rgba(107,142,35,0.8), rgba(85,107,47,0.7));
  border: 1px solid rgba(107,142,35,0.4);
  border-radius: 20px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-left: auto;
}
.header-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107,142,35,0.3);
}
.header-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-icon { font-size: 14px; }

/* ===== 加载状态 ===== */
.loading-section { padding-top: 20px; }
.loading-cards { display: flex; flex-direction: column; gap: 16px; }
.skeleton-card {
  padding: 24px;
  background: rgba(255,252,240,0.7);
  border-radius: 16px;
  border: 1px solid rgba(205,133,63,0.15);
}
.skeleton-line {
  background: linear-gradient(90deg, rgba(240,230,210,0.8) 25%, rgba(224,210,185,0.8) 50%, rgba(240,230,210,0.8) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 6px;
  margin-bottom: 14px;
}
.skeleton-line.wide { height: 24px; width: 80%; }
.skeleton-line.medium { height: 18px; width: 60%; }
.skeleton-line.narrow { height: 18px; width: 40%; margin-bottom: 0; }
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ===== 空状态 ===== */
.empty-state {
  text-align: center;
  padding: 80px 20px;
}
.empty-illustration { margin-bottom: 20px; }
.empty-state h3 {
  font-family: 'SimSun', 'STSong', serif;
  color: #8b4513;
  font-size: 22px;
  margin: 0 0 10px;
}
.empty-state p {
  font-family: 'SimSun', 'STSong', serif;
  color: #a0522d;
  margin: 0 0 30px;
  font-size: 15px;
}
.action-link-btn {
  display: inline-block;
  padding: 12px 36px;
  color: #fff;
  background: linear-gradient(135deg, rgba(205,133,63,0.8), rgba(139,69,19,0.7));
  border-radius: 20px;
  text-decoration: none;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 15px;
  transition: all 0.25s ease;
}
.action-link-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139,69,19,0.3);
}

/* ===== Glass卡片通用 ===== */
.glass-card {
  background: rgba(255,252,240,0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(205,133,63,0.25);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(139,69,19,0.08);
  position: relative;
  overflow: hidden;
}
.glass-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
}

/* ===== 主内容 ===== */
.main-content { display: flex; flex-direction: column; gap: 20px; }

/* ===== 统计行 ===== */
.stats-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 20px;
  align-items: stretch;
}

.stats-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 160px;
}

.stat-card {
  padding: 14px 18px;
  transition: all 0.25s ease;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(139,69,19,0.15); }
.stat-card-inner { display: flex; align-items: center; gap: 12px; }
.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  flex-shrink: 0;
}
.total-icon { background: rgba(205,133,63,0.15); color: #cd853f; }
.mastered-icon { background: rgba(107,142,35,0.15); color: #6b8e23; }
.week-icon { background: rgba(220,20,60,0.1); color: #dc143c; }
.rate-icon { background: rgba(100,149,237,0.15); color: #6495ed; }

.stat-info { display: flex; flex-direction: column; }
.stat-value {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 22px;
  font-weight: bold;
  color: #8b4513;
  line-height: 1.2;
}
.stat-value.mastered { color: #6b8e23; }
.stat-value.week { color: #dc143c; }
.stat-value.rate { color: #6495ed; }
.stat-label {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 12px;
  color: #a0522d;
  margin-top: 2px;
}

/* 图表 */
.chart-panel { padding: 20px; }
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.chart-title {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 15px;
  color: #8b4513;
  font-weight: bold;
}
.chart-legend { display: flex; gap: 16px; }
.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 12px;
  color: #a0522d;
}
.dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.total-dot { background: #cd853f; }
.mastered-dot { background: #6b8e23; }
.chart-area { width: 100%; height: 180px; }

/* ===== 控制行 ===== */
.control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  gap: 20px;
}
.filter-group { display: flex; gap: 16px; flex-wrap: wrap; }
.filter-item { display: flex; align-items: center; gap: 8px; }
.filter-item label {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  color: #a0522d;
  white-space: nowrap;
}
.filter-select {
  padding: 7px 14px;
  border: 1px solid rgba(205,133,63,0.3);
  border-radius: 10px;
  background: rgba(255,252,240,0.8);
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}
.filter-select:focus { border-color: rgba(205,133,63,0.6); }
.control-actions { display: flex; gap: 10px; }
.ctrl-btn {
  padding: 8px 20px;
  border-radius: 12px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.ctrl-btn.primary {
  background: linear-gradient(135deg, rgba(107,142,35,0.85), rgba(85,107,47,0.75));
  color: #fff;
  border-color: rgba(107,142,35,0.4);
}
.ctrl-btn.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107,142,35,0.3);
}
.ctrl-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.ctrl-btn.danger {
  background: rgba(220,20,60,0.08);
  color: #dc143c;
  border-color: rgba(220,20,60,0.3);
}
.ctrl-btn.danger:hover:not(:disabled) {
  background: rgba(220,20,60,0.15);
}
.ctrl-btn.danger:disabled { opacity: 0.5; cursor: not-allowed; }
.badge {
  background: rgba(255,255,255,0.3);
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 12px;
}

/* ===== 错题卡片列表 ===== */
.error-list { display: flex; flex-direction: column; gap: 16px; }

.error-card {
  padding: 22px 24px;
  transition: all 0.25s ease;
}
.error-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(139,69,19,0.15);
  border-color: rgba(205,133,63,0.4);
}
.error-card.mastered {
  border-left: 3px solid rgba(107,142,35,0.5);
}

.error-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.poem-badge { display: flex; flex-direction: column; gap: 3px; }
.poem-title-text {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 17px;
  font-weight: bold;
  color: #8b4513;
}
.poem-author-text {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  color: #a0522d;
}
.error-meta { display: flex; gap: 8px; flex-wrap: wrap; }
.meta-tag {
  padding: 3px 10px;
  border-radius: 12px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 12px;
}
.source-tag { background: rgba(100,149,237,0.15); color: #6495ed; }
.level-tag { background: rgba(205,133,63,0.15); color: #cd853f; }
.wrong-count-tag { background: rgba(220,20,60,0.1); color: #dc143c; }
.mastered-tag { background: rgba(107,142,35,0.15); color: #6b8e23; }

.error-question-block {
  background: linear-gradient(135deg, rgba(255,248,220,0.6), rgba(255,252,240,0.3));
  border: 1px solid rgba(205,133,63,0.2);
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 14px;
}
.question-label, .answer-label, .explanation-label {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 12px;
  font-weight: bold;
  color: #a0522d;
  margin-bottom: 4px;
}
.question-content {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  color: #8b4513;
  line-height: 1.7;
}

.answer-comparison {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.answer-row { flex: 1; min-width: 200px; }
.answer-arrow {
  font-size: 20px;
  color: rgba(139,69,19,0.3);
  flex-shrink: 0;
}
.answer-text {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 15px;
  padding: 6px 14px;
  border-radius: 8px;
  display: inline-block;
  line-height: 1.5;
}
.wrong-text {
  background: rgba(220,20,60,0.08);
  color: #dc143c;
  text-decoration: line-through;
}
.correct-text {
  background: rgba(50,205,50,0.1);
  color: #32cd32;
}

.error-explanation {
  background: rgba(255,248,220,0.5);
  border: 1px solid rgba(205,133,63,0.15);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 12px;
}
.explanation-text {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  color: #8b4513;
  line-height: 1.7;
}

.full-poem-preview {
  border: 1px dashed rgba(205,133,63,0.3);
  border-radius: 10px;
  padding: 10px 16px;
  margin-bottom: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}
.full-poem-preview:hover { border-color: rgba(205,133,63,0.5); background: rgba(255,248,220,0.3); }
.poem-label {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  color: #a0522d;
  flex: 1;
}
.poem-toggle { color: #a0522d; font-size: 12px; }
.full-poem-text {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  color: #8b4513;
  line-height: 2;
  white-space: pre-wrap;
  margin-top: 10px;
  border-top: 1px dashed rgba(205,133,63,0.2);
  padding-top: 10px;
}

.error-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid rgba(205,133,63,0.15);
  flex-wrap: wrap;
  gap: 10px;
}
.footer-info { display: flex; gap: 16px; flex-wrap: wrap; }
.add-time, .last-review {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 12px;
  color: #a0522d;
}
.footer-actions { display: flex; gap: 8px; }
.footer-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 10px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
}
.footer-btn.review-btn {
  background: rgba(107,142,35,0.1);
  color: #6b8e23;
  border-color: rgba(107,142,35,0.3);
}
.footer-btn.review-btn:hover {
  background: rgba(107,142,35,0.2);
  transform: translateY(-1px);
}
.footer-btn.delete-btn {
  background: rgba(220,20,60,0.06);
  color: #dc143c;
  border-color: rgba(220,20,60,0.25);
}
.footer-btn.delete-btn:hover {
  background: rgba(220,20,60,0.12);
}

/* ===== 分页 ===== */
.pagination {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 20px 0;
}
.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  background: rgba(255,252,240,0.8);
  border: 1px solid rgba(205,133,63,0.25);
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) { background: rgba(205,133,63,0.15); }
.page-btn.active {
  background: linear-gradient(135deg, rgba(205,133,63,0.8), rgba(139,69,19,0.7));
  color: #fff;
  border-color: rgba(205,133,63,0.4);
}
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ===== 复习模式弹窗 ===== */
.review-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.review-modal-large {
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px 32px;
}

.review-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.review-progress { flex: 1; max-width: 300px; }
.review-progress-text {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  color: #a0522d;
  margin-bottom: 6px;
  display: block;
}
.review-progress-bar {
  height: 6px;
  background: rgba(205,133,63,0.15);
  border-radius: 3px;
  overflow: hidden;
}
.review-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #cd853f, #6b8e23);
  border-radius: 3px;
  transition: width 0.4s ease;
}
.review-header-actions { display: flex; gap: 10px; align-items: center; }
.master-toggle-btn {
  padding: 7px 16px;
  border-radius: 10px;
  background: rgba(107,142,35,0.1);
  border: 1px solid rgba(107,142,35,0.3);
  color: #6b8e23;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.master-toggle-btn:hover {
  background: rgba(107,142,35,0.2);
}
.exit-review-btn {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: rgba(205,133,63,0.1);
  border: 1px solid rgba(205,133,63,0.2);
  color: #8b4513;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.exit-review-btn:hover { background: rgba(205,133,63,0.2); }

.review-poem-info { text-align: center; margin-bottom: 16px; }
.review-poem-title {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 20px;
  font-weight: bold;
  color: #8b4513;
}
.review-poem-author {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  color: #a0522d;
  margin-top: 4px;
}

.review-full-poem {
  background: linear-gradient(135deg, rgba(255,248,220,0.5), rgba(255,252,240,0.3));
  border: 1px solid rgba(205,133,63,0.2);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;
  text-align: center;
}
.poem-text-display {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 15px;
  color: #8b4513;
  line-height: 2.2;
  white-space: pre-wrap;
  margin: 0;
}

.review-question-area { margin-bottom: 20px; }
.review-question-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  font-weight: bold;
  color: #a0522d;
  margin-bottom: 10px;
}
.review-question-text {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 20px;
  color: #8b4513;
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, rgba(255,248,220,0.6), rgba(255,252,240,0.3));
  border: 1px solid rgba(205,133,63,0.2);
  border-radius: 14px;
  line-height: 1.7;
}

.review-answer-area { margin-bottom: 20px; }
.review-answer-input {
  width: 100%;
  padding: 14px 18px;
  border: 2px solid rgba(205,133,63,0.3);
  border-radius: 14px;
  background: rgba(255,252,240,0.9);
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 17px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
  margin-bottom: 12px;
}
.review-answer-input:focus {
  border-color: #cd853f;
  box-shadow: 0 0 0 3px rgba(205,133,63,0.1);
}

.review-hint-row { display: flex; gap: 10px; justify-content: space-between; }
.hint-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 12px;
  background: rgba(100,149,237,0.1);
  border: 1px solid rgba(100,149,237,0.3);
  color: #6495ed;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.hint-btn:hover, .hint-btn.active {
  background: rgba(100,149,237,0.2);
}
.submit-review-btn {
  padding: 10px 28px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(205,133,63,0.85), rgba(139,69,19,0.75));
  border: none;
  color: #fff;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.submit-review-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139,69,19,0.25);
}
.submit-review-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ai-hints-panel {
  margin-top: 14px;
  background: rgba(100,149,237,0.06);
  border: 1px solid rgba(100,149,237,0.2);
  border-radius: 12px;
  padding: 14px 16px;
}
.hints-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  color: #6495ed;
}
.get-hints-btn {
  padding: 4px 12px;
  border-radius: 8px;
  background: rgba(100,149,237,0.15);
  border: 1px solid rgba(100,149,237,0.3);
  color: #6495ed;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.get-hints-btn:hover { background: rgba(100,149,237,0.25); }
.hints-list { display: flex; flex-direction: column; gap: 8px; }
.hint-item-reveal {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: rgba(100,149,237,0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.hint-item-reveal:hover { background: rgba(100,149,237,0.15); }
.hint-item-reveal.revealed { background: rgba(100,149,237,0.15); }
.hint-num {
  width: 20px; height: 20px;
  background: rgba(100,149,237,0.2);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 11px;
  color: #6495ed;
  flex-shrink: 0;
}
.hint-content {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  color: #6495ed;
  line-height: 1.6;
}
.hint-hidden-text {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  color: #6495ed;
  opacity: 0.6;
}
.hints-loading {
  text-align: center;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  color: #6495ed;
  padding: 10px;
}

/* 答案结果 */
.review-result-area { margin-top: 16px; }
.result-banner {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border-radius: 14px;
  margin-bottom: 16px;
}
.result-banner.correct {
  background: rgba(50,205,50,0.08);
  border: 1px solid rgba(50,205,50,0.25);
}
.result-banner.wrong {
  background: rgba(220,20,60,0.08);
  border: 1px solid rgba(220,20,60,0.25);
}
.result-icon-large { flex-shrink: 0; }
.result-banner.correct .result-icon-large { color: #32cd32; }
.result-banner.wrong .result-icon-large { color: #dc143c; }
.result-message { flex: 1; }
.result-title {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 18px;
  font-weight: bold;
  color: #8b4513;
  margin: 0 0 8px;
}
.result-correct-answer {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 15px;
  color: #32cd32;
  margin: 0 0 4px;
}
.result-your-answer {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  color: #8b4513;
  margin: 0;
}
.result-your-answer .wrong-text { background: none; text-decoration: line-through; color: #dc143c; }

.ai-analysis-block {
  background: linear-gradient(135deg, rgba(100,149,237,0.06), rgba(70,130,180,0.04));
  border: 1px solid rgba(100,149,237,0.2);
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 16px;
}
.ai-analysis-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  font-weight: bold;
  color: #6495ed;
  margin-bottom: 8px;
}
.ai-analysis-text {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  color: #8b4513;
  line-height: 1.8;
}

.result-nav-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.result-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: 12px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
}
.result-nav-btn.primary {
  background: linear-gradient(135deg, rgba(107,142,35,0.85), rgba(85,107,47,0.75));
  color: #fff;
  border-color: rgba(107,142,35,0.4);
}
.result-nav-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107,142,35,0.3);
}
.result-nav-btn.secondary {
  background: rgba(205,133,63,0.1);
  color: #8b4513;
  border-color: rgba(205,133,63,0.3);
}
.result-nav-btn.secondary:hover {
  background: rgba(205,133,63,0.2);
}

/* ===== 列表过渡动画 ===== */
.list-enter-active, .list-leave-active { transition: all 0.3s ease; }
.list-enter-from { opacity: 0; transform: translateY(10px); }
.list-leave-to { opacity: 0; transform: translateX(-20px); }

/* ===== 弹窗过渡 ===== */
.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .review-modal-large, .modal-leave-active .review-modal-large { transition: transform 0.3s ease; }
.modal-enter-from .review-modal-large { transform: scale(0.95); }
.modal-leave-to .review-modal-large { transform: scale(0.95); }

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .stats-row { grid-template-columns: 1fr; }
  .stats-cards { flex-direction: row; flex-wrap: wrap; }
  .stat-card { flex: 1; min-width: 140px; }
  .chart-panel { display: none; }
}

@media (max-width: 640px) {
  .page-header { flex-direction: column; gap: 12px; align-items: stretch; }
  .header-left, .header-right { min-width: 0; }
  .back-btn { width: fit-content; }
  .header-action-btn { width: 100%; justify-content: center; }
  .header-center { text-align: left; }
  .control-row { flex-direction: column; align-items: stretch; }
  .filter-group { flex-direction: column; }
  .control-actions { justify-content: flex-end; }
  .review-modal-large { padding: 20px 16px; }
  .result-nav-row { flex-direction: column; }
  .result-nav-btn { justify-content: center; width: 100%; }
  .review-hint-row { flex-direction: column; }
  .stats-cards { display: grid; grid-template-columns: 1fr 1fr; }
}

/* ===== 首页同源重构：错题本书页舞台 ===== */
.error-book-page {
  --error-cinnabar: #b7695f;
  --error-cinnabar-soft: rgba(183, 105, 95, .11);
  max-width: none;
  min-height: calc(100dvh - 70px);
  padding: 18px clamp(18px, 3vw, 52px) 72px;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 0 !important;
  border-radius: 28px !important;
  background: linear-gradient(115deg, rgba(247, 252, 249, .98) 0%, rgba(247, 252, 249, .9) 54%, rgba(247, 252, 249, .74) 100%) !important;
  box-shadow: none !important;
}

.error-book-page::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(circle at 12% 18%, rgba(47, 157, 138, .08), transparent 25%),
    radial-gradient(circle at 80% 76%, rgba(222, 154, 115, .09), transparent 28%);
}

.error-book-page::after {
  content: '';
  position: absolute;
  inset: 0 0 0 auto;
  z-index: 0;
  width: 68%;
  pointer-events: none;
  background: url('../assets/review-inkwash.png') center right / cover no-repeat;
  opacity: .22;
  mix-blend-mode: multiply;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, .35) 22%, #000 58%, #000 100%);
  mask-image: linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, .35) 22%, #000 58%, #000 100%);
}
.error-book-page > * { position: relative; z-index: 1; }

.error-book-page .page-header {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 16px 0 26px;
  display: grid;
  grid-template-columns: minmax(160px, 1fr) auto minmax(160px, 1fr);
  align-items: center;
  gap: 18px;
  position: relative;
  top: auto;
  background: rgba(255, 255, 255, .52) !important;
  border: 0 !important;
  border-bottom: 1px solid rgba(74, 133, 121, .16) !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
}

.error-book-page .header-left,
.error-book-page .header-right { min-width: 0; }
.error-book-page .header-right { display: flex; justify-content: flex-end; }
.error-book-page .header-center { position: relative; }
.error-book-page .page-title-wrap { gap: 12px; }
.error-book-page .title-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  color: var(--jade-accent-strong) !important;
  background: rgba(47, 157, 138, .12) !important;
  border-color: rgba(47, 157, 138, .2) !important;
  font-family: var(--font-calligraphy);
}
.error-book-page .page-title {
  margin: 0;
  color: var(--jade-ink) !important;
  font-family: var(--font-ancient);
  font-size: clamp(22px, 2.2vw, 30px);
  letter-spacing: .08em;
}
.error-book-page .page-subtitle {
  margin: 6px 0 0;
  color: var(--jade-muted) !important;
  font-family: var(--font-sans);
  font-size: 12px;
  letter-spacing: .16em;
}
.error-book-page .back-btn,
.error-book-page .header-action-btn {
  border-radius: 10px;
  font-family: var(--font-sans);
  box-shadow: none;
}
.error-book-page .back-btn {
  padding: 9px 14px;
  color: var(--jade-accent-strong) !important;
  background: rgba(255, 255, 255, .62) !important;
  border-color: rgba(47, 157, 138, .24) !important;
}
.error-book-page .header-action-btn {
  padding: 10px 16px;
  color: #fff !important;
  background: var(--jade-accent-strong) !important;
  border-color: transparent !important;
  box-shadow: 0 8px 20px rgba(25, 118, 102, .16);
}
.error-book-page .header-action-btn:hover:not(:disabled) { box-shadow: 0 12px 26px rgba(25, 118, 102, .22); }

.error-book-page .main-content {
  width: 100%;
  max-width: 1440px;
  margin: 22px auto 0;
  gap: 20px;
}
.error-book-page .stats-row {
  grid-template-columns: minmax(310px, .78fr) minmax(0, 1.22fr);
  gap: 20px;
}
.error-book-page .stats-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.error-book-page .stat-card,
.error-book-page .chart-panel,
.error-book-page .control-row,
.error-book-page .error-card {
  border-radius: 18px;
  background: rgba(255, 255, 255, .72) !important;
  border-color: rgba(74, 133, 121, .18) !important;
  box-shadow: 0 12px 32px rgba(30, 82, 73, .07) !important;
}
.error-book-page .stat-card { padding: 17px 18px; }
.error-book-page .stat-card:hover,
.error-book-page .error-card:hover { border-color: rgba(47, 157, 138, .34) !important; box-shadow: 0 16px 36px rgba(30, 82, 73, .11) !important; }
.error-book-page .stat-icon { border-radius: 12px; }
.error-book-page .total-icon { color: var(--jade-accent-strong); background: rgba(47, 157, 138, .1); }
.error-book-page .mastered-icon { color: #5f856f; background: rgba(95, 133, 111, .12); }
.error-book-page .week-icon { color: var(--error-cinnabar); background: var(--error-cinnabar-soft); }
.error-book-page .rate-icon { color: #6f8e9c; background: rgba(111, 142, 156, .12); }
.error-book-page .stat-value { color: var(--jade-ink) !important; font-family: var(--font-sans); font-size: 24px; }
.error-book-page .stat-value.mastered { color: #5f856f !important; }
.error-book-page .stat-value.week { color: var(--error-cinnabar) !important; }
.error-book-page .stat-value.rate { color: #6f8e9c !important; }
.error-book-page .stat-label,
.error-book-page .chart-title,
.error-book-page .legend-item { color: var(--jade-muted) !important; font-family: var(--font-sans); }
.error-book-page .chart-panel { padding: 22px 24px 18px; min-height: 190px; }
.error-book-page .chart-title { font-size: 15px; font-weight: 600; letter-spacing: .08em; }
.error-book-page .chart-area { height: 158px; }
.error-book-page .total-dot { background: var(--error-cinnabar); }
.error-book-page .mastered-dot { background: var(--jade-accent); }

.error-book-page .control-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  padding: 18px 22px;
  gap: 20px;
}
.error-book-page .filter-group { gap: 14px 20px; }
.error-book-page .filter-item { align-items: flex-start; flex-direction: column; gap: 5px; }
.error-book-page .filter-item label { color: var(--jade-muted) !important; font-family: var(--font-sans); font-size: 11px; letter-spacing: .08em; }
.error-book-page .filter-select {
  min-width: 146px;
  border-radius: 9px;
  color: var(--jade-ink) !important;
  background: rgba(247, 252, 249, .9) !important;
  border-color: rgba(74, 133, 121, .22) !important;
  font-family: var(--font-sans);
}
.error-book-page .control-actions { align-items: center; }
.error-book-page .ctrl-btn { border-radius: 10px; font-family: var(--font-sans); }
.error-book-page .ctrl-btn.primary { background: var(--jade-accent-strong) !important; border-color: transparent !important; }
.error-book-page .ctrl-btn.danger { color: var(--error-cinnabar) !important; background: var(--error-cinnabar-soft) !important; border-color: rgba(183, 105, 95, .22) !important; }

.error-book-page .error-list { gap: 14px; }
.error-book-page .error-card { padding: 22px 24px 18px; }
.error-book-page .poem-title-text,
.error-book-page .question-content,
.error-book-page .explanation-text,
.error-book-page .full-poem-text { color: var(--jade-ink) !important; font-family: var(--font-ancient); }
.error-book-page .poem-title-text { font-size: 19px; letter-spacing: .04em; }
.error-book-page .poem-author-text,
.error-book-page .question-label,
.error-book-page .answer-label,
.error-book-page .explanation-label,
.error-book-page .add-time,
.error-book-page .last-review,
.error-book-page .poem-label { color: var(--jade-muted) !important; font-family: var(--font-sans); }
.error-book-page .error-question-block,
.error-book-page .error-explanation { background: rgba(239, 248, 244, .72) !important; border-color: rgba(74, 133, 121, .15) !important; }
.error-book-page .error-question-block { border-radius: 14px; }
.error-book-page .question-content { font-size: 17px; }
.error-book-page .answer-arrow { color: var(--jade-accent); }
.error-book-page .wrong-text { color: var(--error-cinnabar); background: var(--error-cinnabar-soft); }
.error-book-page .correct-text { color: #4f8a72; background: rgba(79, 138, 114, .11); }
.error-book-page .source-tag,
.error-book-page .level-tag,
.error-book-page .mastered-tag { color: var(--jade-accent-strong); background: rgba(47, 157, 138, .1); }
.error-book-page .wrong-count-tag { color: var(--error-cinnabar); background: var(--error-cinnabar-soft); }
.error-book-page .full-poem-preview { border-color: rgba(74, 133, 121, .24); }
.error-book-page .error-card-footer { border-color: rgba(74, 133, 121, .14); }
.error-book-page .footer-btn { border-radius: 9px; font-family: var(--font-sans); }
.error-book-page .footer-btn.review-btn { color: var(--jade-accent-strong); background: rgba(47, 157, 138, .1); border-color: rgba(47, 157, 138, .22); }
.error-book-page .footer-btn.delete-btn { color: var(--error-cinnabar); background: var(--error-cinnabar-soft); border-color: rgba(183, 105, 95, .2); }
.error-book-page .pagination { padding: 12px 0 0; }
.error-book-page .page-btn { border-radius: 9px; color: var(--jade-accent-strong); background: rgba(255, 255, 255, .64); border-color: rgba(74, 133, 121, .2); }
.error-book-page .page-btn.active { background: var(--jade-accent-strong); border-color: transparent; }
.error-book-page .empty-state { padding: 132px 20px 160px; }
.error-book-page .empty-state h3 { color: var(--jade-ink) !important; font-family: var(--font-ancient); }
.error-book-page .empty-state p { color: var(--jade-muted) !important; font-family: var(--font-sans); }
.error-book-page .action-link-btn { border-radius: 10px; background: var(--jade-accent-strong); font-family: var(--font-sans); }

@media (max-width: 900px) {
  .error-book-page .stats-row { grid-template-columns: 1fr; }
  .error-book-page .chart-panel { display: block; }
}
@media (max-width: 680px) {
  .error-book-page { padding: 10px 12px 48px; }
  .error-book-page::after { width: 92%; opacity: .16; }
  .error-book-page .page-header { grid-template-columns: 1fr; gap: 12px; padding-bottom: 18px; }
  .error-book-page .header-center { order: -1; text-align: left; }
  .error-book-page .header-right { justify-content: stretch; }
  .error-book-page .header-action-btn { width: 100%; justify-content: center; }
  .error-book-page .control-row { grid-template-columns: 1fr; }
  .error-book-page .filter-group { display: grid; grid-template-columns: 1fr 1fr; }
  .error-book-page .filter-select { min-width: 0; width: 100%; }
  .error-book-page .control-actions { justify-content: stretch; }
  .error-book-page .control-actions > * { flex: 1; justify-content: center; }
  .error-book-page .error-card { padding: 18px 16px 15px; }
  .error-book-page .answer-comparison { align-items: stretch; }
  .error-book-page .answer-row { min-width: 100%; }
  .error-book-page .answer-arrow { display: none; }
}
</style>
