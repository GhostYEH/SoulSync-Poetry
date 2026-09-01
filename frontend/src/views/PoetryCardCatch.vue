<template>
  <div
    ref="rootRef"
    class="poetry-mahjong-wrapper"
    :class="{ 'game-active': phase === 'PLAYING' || phase === 'PAUSED' }"
    @keydown.prevent
    @keyup.prevent
  >
    <!-- ==================== 开始菜单 ==================== -->
    <transition name="panel-fade">
      <div v-if="phase === 'MENU'" class="overlay menu-overlay">
        <!-- 背景装饰 -->
        <div class="menu-bg-effects">
          <div class="floating-petals">
            <span v-for="i in 15" :key="i" class="petal" :style="getPetalStyle(i)">🌸</span>
          </div>
          <div class="mountain-silhouette"></div>
        </div>

        <div class="menu-card scroll-card">
          <!-- 装饰卷轴头 -->
          <div class="scroll-top-ornament">
            <div class="ornament-left"></div>
            <div class="ornament-center">
              <span class="ornament-icon">📜</span>
            </div>
            <div class="ornament-right"></div>
          </div>

          <!-- 标题区域 -->
          <div class="title-section">
            <div class="game-badge">
              <span class="badge-star">✦</span>
              <span class="badge-text">诗词大富翁</span>
              <span class="badge-star">✦</span>
            </div>
            <h1 class="game-title">
              <span class="title-cn">诗词大富翁</span>
              <span class="title-en">Poetry Catcher</span>
            </h1>
            <p class="game-slogan">接住千古名句，对接诗词灵魂</p>
          </div>

          <!-- 操作指南 -->
          <div class="controls-showcase">
            <div class="control-keys">
              <div class="key-group">
                <span class="key-btn">A</span>
                <span class="key-sep">/</span>
                <span class="key-btn">←</span>
              </div>
              <div class="control-label">向左移动</div>
            </div>
            <div class="control-keys">
              <div class="key-group">
                <span class="key-btn">D</span>
                <span class="key-sep">/</span>
                <span class="key-btn">→</span>
              </div>
              <div class="control-label">向右移动</div>
            </div>
          </div>

          <!-- 游戏规则 -->
          <div class="rules-panel">
            <div class="rules-header">
              <span class="rules-icon">📖</span>
              <span class="rules-title">游戏规则</span>
            </div>
            <div class="rules-grid">
              <div class="rule-item correct">
                <span class="rule-icon">✓</span>
                <span class="rule-text">接<strong>正确</strong>诗句 <strong>+1分</strong>，连击有加成</span>
              </div>
              <div class="rule-item wrong">
                <span class="rule-icon">✗</span>
                <span class="rule-text">接<strong>错误</strong>诗句 <strong>-1分</strong>，最低为0</span>
              </div>
              <div class="rule-item miss">
                <span class="rule-icon">◎</span>
                <span class="rule-text">没有接到诗句 <strong>不加不扣</strong></span>
              </div>
              <div class="rule-item danger">
                <span class="rule-icon">❤</span>
                <span class="rule-text">失误<strong>满5次</strong> 游戏结束</span>
              </div>
            </div>
          </div>

          <!-- 难度选择 -->
          <div class="difficulty-section">
            <span class="diff-label">选择难度</span>
            <div class="diff-tabs">
              <button
                v-for="d in DIFFICULTIES"
                :key="d.value"
                :class="['diff-tab', d.value, { active: diff === d.value }]"
                @click="diff = d.value"
              >
                <span class="diff-icon">{{ d.icon }}</span>
                <span class="diff-name">{{ d.label }}</span>
                <span class="diff-desc">{{ d.desc }}</span>
              </button>
            </div>
          </div>

          <!-- 按钮组 -->
          <div class="menu-actions">
            <button class="start-btn primary-action" :disabled="isStarting" @click="startGame">
              <span class="btn-icon">🎮</span>
              <span class="btn-text">{{ isStarting ? '诗笺准备中' : '开始挑战' }}</span>
              <span class="btn-shimmer"></span>
            </button>
            <button class="start-btn secondary-action" @click="$router.push('/')">
              <span class="btn-icon">🏠</span>
              <span class="btn-text">返回首页</span>
            </button>
          </div>

          <!-- 底部装饰 -->
          <div class="scroll-bottom-ornament">
            <div class="ornament-line"></div>
            <div class="ornament-dot"></div>
            <div class="ornament-line"></div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ==================== 游戏 HUD ==================== -->
    <transition name="hud-slide">
      <div v-if="phase === 'PLAYING' || phase === 'PAUSED'" class="game-hud">
        <div class="hud-brand">
          <span>POETRY MATCH</span>
          <strong>诗词大富翁</strong>
        </div>

        <!-- 元气：接错五次后本轮结束 -->
        <div class="hud-left">
          <div class="lives-container">
            <div
              v-for="i in 5"
              :key="i"
              class="life-orb"
              :class="{ 'life-lost': i <= wrongCount, 'life-losing': i === wrongCount + 1 }"
            >
              <span class="life-icon">气</span>
            </div>
          </div>
          <span class="hud-label">元气</span>
        </div>

        <!-- 中间：等级和连击 -->
        <div class="hud-center">
          <div class="level-badge" :class="`level-${gameLevel}`">
            {{ levelLabel }}
          </div>
          <div class="combo-display" v-if="combo >= 3">
            <span class="combo-label">连击</span>
            <span class="combo-value">{{ combo }}x</span>
          </div>
        </div>

        <!-- 右侧：分数和时间 -->
        <div class="hud-right">
          <div class="score-container">
            <span class="hud-label">得分</span>
            <strong class="score-number" :class="{ 'score-bounce': scoreAnim }">{{ score }}</strong>
          </div>
          <div class="time-display">
            <PhClock class="time-icon" :size="17" weight="duotone" />
            <span class="time-value">{{ formatTime(elapsed) }}</span>
          </div>
          <div class="control-hint"><kbd>A</kbd><kbd>D</kbd><span>或</span><kbd>←</kbd><kbd>→</kbd><span>移动</span></div>
          <button class="hud-pause-btn" type="button" aria-label="暂停游戏" @click="pauseGame"><PhPause :size="16" weight="bold" />暂停</button>
        </div>
      </div>
    </transition>

    <!-- ==================== Canvas 游戏区 ==================== -->
    <div class="canvas-wrap" ref="wrapRef" tabindex="0">
      <canvas ref="canvasRef" class="game-canvas" />
    </div>

    <!-- ==================== 暂停遮罩 ==================== -->
    <transition name="panel-fade">
      <div v-if="phase === 'PAUSED'" class="overlay pause-overlay">
        <div class="pause-card scroll-card">
          <div class="pause-header">
            <span class="pause-icon">⏸</span>
            <h2 class="pause-title">游戏暂停</h2>
          </div>

          <div class="pause-stats-grid">
            <div class="pause-stat correct-stat">
              <span class="stat-icon">✓</span>
              <span class="stat-value">{{ correctCount }}</span>
              <span class="stat-label">接正确</span>
            </div>
            <div class="pause-stat wrong-stat">
              <span class="stat-icon">✗</span>
              <span class="stat-value">{{ wrongCount }}</span>
              <span class="stat-label">失误</span>
            </div>
            <div class="pause-stat miss-stat">
              <span class="stat-icon">◎</span>
              <span class="stat-value">{{ missedCount }}</span>
              <span class="stat-label">漏掉</span>
            </div>
            <div class="pause-stat time-stat">
              <span class="stat-icon">⏱</span>
              <span class="stat-value">{{ formatTime(elapsed) }}</span>
              <span class="stat-label">用时</span>
            </div>
          </div>

          <div class="pause-actions">
            <button class="action-btn primary-btn" @click="resumeGame">
              <span class="btn-icon">▶</span>
              <span class="btn-text">继续游戏</span>
            </button>
            <button class="action-btn danger-btn" @click="quitGame">
              <span class="btn-icon">✕</span>
              <span class="btn-text">退出游戏</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ==================== 游戏结束遮罩 ==================== -->
    <transition name="panel-fade">
      <div v-if="phase === 'GAME_OVER'" class="overlay gameover-overlay">
        <div class="gameover-card scroll-card">
          <!-- 结果动画 -->
          <div class="result-animation">
            <div class="result-orb" :class="gradeClass">
              <span class="orb-text">{{ gradeText }}</span>
              <div class="orb-ring"></div>
            </div>
          </div>

          <!-- 标题 -->
          <div class="gameover-header">
            <h2 class="gameover-title">本轮挑战结束</h2>
            <p class="gameover-subtitle">你的诗词之旅暂时告一段落</p>
          </div>

          <!-- 统计 -->
          <div class="gameover-stats">
            <div class="main-stat">
              <span class="main-icon">🏆</span>
              <div class="main-content">
                <span class="main-value">{{ score }}</span>
                <span class="main-label">最终得分</span>
              </div>
            </div>
            <div class="stats-row">
              <div class="stat-box">
                <span class="stat-icon correct-icon">✓</span>
                <span class="stat-value">{{ correctCount }}</span>
                <span class="stat-label">正确</span>
              </div>
              <div class="stat-box">
                <span class="stat-icon wrong-icon">✗</span>
                <span class="stat-value">{{ wrongCount }}</span>
                <span class="stat-label">失误</span>
              </div>
              <div class="stat-box">
                <span class="stat-icon miss-icon">◎</span>
                <span class="stat-value">{{ missedCount }}</span>
                <span class="stat-label">漏掉</span>
              </div>
              <div class="stat-box">
                <span class="stat-icon time-icon">⏱</span>
                <span class="stat-value">{{ formatTime(elapsed) }}</span>
                <span class="stat-label">用时</span>
              </div>
            </div>
          </div>

          <!-- 最高连击 -->
          <div class="max-combo" v-if="maxCombo >= 3">
            <span class="combo-badge">🔥</span>
            <span class="combo-text">最高连击：{{ maxCombo }}x</span>
          </div>

          <!-- 操作按钮 -->
          <div class="gameover-actions">
            <button
              v-if="wrongCaughtLog.length > 0"
              class="action-btn review-btn"
              @click="showReview"
            >
              <span class="btn-text">复盘错题</span>
            </button>
            <button
              v-if="wrongCaughtLog.length > 0"
              class="action-btn error-book-btn"
              :class="{ 'all-added': allErrorsAddedToBook }"
              :disabled="isAddingAllToBook || allErrorsAddedToBook"
              @click="addAllErrorsToBook"
            >
              <span class="btn-icon">{{ isAddingAllToBook ? '⏳' : '📚' }}</span>
              <span class="btn-text">
                {{ isAddingAllToBook ? '添加中...' : (allErrorsAddedToBook ? '已加入错题本' : '一键加入错题本') }}
              </span>
              <span class="btn-count" v-if="!allErrorsAddedToBook">({{ wrongCaughtLog.length }}条)</span>
            </button>
            <button class="action-btn primary-btn" @click="restartGame">
              <span class="btn-icon">🔄</span>
              <span class="btn-text">再来一局</span>
            </button>
            <button v-if="gameLevel < 5" class="action-btn primary-btn" @click="nextLevel">
              <span class="btn-icon">▶</span>
              <span class="btn-text">下一关</span>
            </button>
            <button class="action-btn secondary-btn" @click="quitGame">
              <span class="btn-icon">🏠</span>
              <span class="btn-text">返回首页</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ==================== 复盘界面 ==================== -->
    <transition name="panel-fade">
      <div v-if="phase === 'REVIEW'" class="overlay review-overlay">
        <div class="review-panel scroll-card">
          <!-- 头部 -->
          <div class="review-header">
            <button class="header-back-btn" @click="quitGame">
              <span>返回</span>
            </button>
            <h2 class="review-title">
              <span class="title-icon">📜</span>
              复盘讲解
            </h2>
            <button class="header-restart-btn" @click="restartGame">
              再来一局
            </button>
          </div>

          <!-- 一键添加错题本按钮 -->
          <div class="batch-actions" v-if="reviewErrors.length > 0">
            <button
              class="batch-add-btn"
              :class="{ 'all-added': allAddedToReview }"
              :disabled="isAddingAll || allAddedToReview"
              @click="addAllToErrorBook"
            >
              <span class="btn-icon">{{ isAddingAll ? '⏳' : '📚' }}</span>
              <span class="btn-text">
                {{ isAddingAll ? '添加中...' : (allAddedToReview ? '已全部添加' : '一键加入错题本') }}
              </span>
              <span class="btn-count" v-if="!allAddedToReview">({{ reviewErrors.length }}条)</span>
            </button>
          </div>

          <!-- 加载状态 -->
          <div v-if="reviewLoading" class="review-loading">
            <div class="loading-spinner">
              <div class="spinner-ring"></div>
            </div>
            <p class="loading-text">AI 正在生成讲解...</p>
          </div>

          <!-- 无错误 -->
          <div v-else-if="reviewErrors.length === 0" class="review-empty">
            <div class="empty-illustration">🎉</div>
            <h3 class="empty-title">太棒了！本轮没有错误！</h3>
            <p class="empty-subtitle">你的诗词功底非常扎实，继续保持！</p>
          </div>

          <!-- 错误列表 -->
          <div v-else class="review-list">
            <div class="review-legend">
              <span class="legend-icon">📝</span>
              <span>共 <strong>{{ reviewErrors.length }}</strong> 条错误</span>
            </div>

            <div
              v-for="(err, idx) in reviewErrors"
              :key="idx"
              class="review-card-item"
            >
              <!-- 卡片头部 -->
              <div class="card-item-header">
                <span class="item-num">{{ idx + 1 }}</span>
                <span class="item-badge error-badge">错误</span>
                <button
                  class="add-single-btn"
                  :class="{ 'added': err.addedToReview }"
                  :disabled="err.addedToReview"
                  @click="addSingleToErrorBook(err)"
                >
                  {{ err.addedToReview ? '✓ 已添加' : '+ 错题本' }}
                </button>
              </div>

              <!-- 诗句卷轴 -->
              <div class="poem-scroll-display">
                <div class="scroll-roll left"></div>
                <div class="scroll-content">
                  <div class="scroll-upper">
                    <span class="scroll-label">上句：</span>
                    <span class="scroll-text">{{ err.questionText }}</span>
                  </div>
                  <div class="scroll-divider">
                    <span>──────</span>
                  </div>
                  <div class="scroll-answer-section">
                    <div class="answer-row user-wrong">
                      <span class="answer-label">❌ 你接的：</span>
                      <span class="answer-text wrong-text">{{ err.userAnswer }}</span>
                    </div>
                    <div class="answer-row ai-analysis" v-if="err.aiData">
                      <span class="answer-label">💡 AI分析：</span>
                      <span class="ai-reason">{{ err.aiData.reason }}</span>
                    </div>
                    <div class="answer-row correct-answer">
                      <span class="answer-label">✅ 正确下句：</span>
                      <span class="answer-text correct-text">{{ err.correctAnswer }}</span>
                    </div>
                  </div>
                </div>
                <div class="scroll-roll right"></div>
              </div>

              <!-- AI 讲解区域 -->
              <div class="ai-explain-section" v-if="err.aiData">
                <div class="ai-block explanation-block">
                  <div class="ai-block-header">
                    <span class="ai-icon">📖</span>
                    <span class="ai-block-title">详细讲解</span>
                  </div>
                  <p class="ai-block-content">{{ err.aiData.explanation }}</p>
                </div>
                <div class="ai-block tip-block">
                  <div class="ai-block-header">
                    <span class="ai-icon">🧠</span>
                    <span class="ai-block-title">记忆口诀</span>
                  </div>
                  <p class="ai-block-content tip-content">{{ err.aiData.memory_tip }}</p>
                </div>
              </div>
              <div class="ai-loading-state" v-else>
                <div class="mini-spinner"></div>
                <span>AI 讲解生成中...</span>
              </div>

              <!-- 填空练习 -->
              <div class="fill-practice-section">
                <div class="fill-badge">
                  <span class="fill-icon">✏️</span>
                  <span class="fill-title">填空练习</span>
                </div>
                <div class="fill-display">
                  <span class="fill-text">{{ err.questionText.replace('_____', '【    】') }}</span>
                  <span class="fill-answer">{{ err.correctAnswer }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ==================== Toast 提示 ==================== -->
    <transition name="toast-pop">
      <div v-if="toast.show" :class="['game-toast', toast.type]" role="status" aria-live="polite">
        <span class="toast-icon">{{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : toast.type === 'warn' ? '!' : 'ℹ' }}</span>
        <span class="toast-text">{{ toast.text }}</span>
        <span v-if="toast.combo" class="toast-combo">×{{ toast.combo }}</span>
      </div>
    </transition>

    <!-- ==================== 成功添加提示 ==================== -->
    <transition name="success-pop">
      <div v-if="addedSuccess" class="success-banner">
        <span class="success-icon">✓</span>
        <span class="success-text">已成功加入错题本！</span>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, onActivated, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import questionsData from '@/data/poetryQuestions.json';
import { API_BASE_URL } from '../services/api';
import { generateAttemptId } from '../utils/attemptId';
import { applyCardCatchScore } from '../utils/cardCatchScore';
import { PhClock, PhPause } from '@phosphor-icons/vue';
import scholarAvatarUrl from '@/assets/poets/unknown-scholar.png';

const API_BASE = `${API_BASE_URL}/card-game`;

// ==================== 常量 ====================
const CANVAS_W = 1400;
const CANVAS_H = 600;
const PLAYER_W = 72;
const PLAYER_H = 88;
const CARD_W = 280;
const CARD_H = 120;
const CARD_SPEED_BASE = 2.4;
const MAX_WRONG = 5;

const DIFFICULTIES = [
  { value: 'easy', label: '入门', icon: '🌱', desc: '初学者', color: '#4CAF50' },
  { value: 'medium', label: '进阶', icon: '🌿', desc: '有基础', color: '#FF9800' },
  { value: 'hard', label: '挑战', icon: '🌳', desc: '诗词达人', color: '#f44336' }
];

const authFetch = (url, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
};

export default {
  name: 'PoetryCardCatch',
  components: { PhClock, PhPause },
  setup() {
    const router = useRouter();
    const rootRef = ref(null);
    const canvasRef = ref(null);
    const wrapRef = ref(null);
    const scholarAvatar = typeof Image !== 'undefined' ? new Image() : null;
    if (scholarAvatar) scholarAvatar.src = scholarAvatarUrl;

    // ==================== 游戏状态 ====================
    const phase = ref('MENU');
    const gameSessionId = ref(null);
    const diff = ref('medium');
    const score = ref(0);
    const wrongCount = ref(0);
    const correctCount = ref(0);
    const missedCount = ref(0);
    const elapsed = ref(0);
    const gameLevel = ref(1);
    const combo = ref(0);
    const maxCombo = ref(0);
    const scoreAnim = ref(false);

    let ctx = null;
    let animId = null;
    let lastTime = 0;
    let elapsedTimer = null;
    let spawnTimer = 0;
    let gameStartTime = 0;
    let elapsedBeforePause = 0;
    let startingLevel = 1;
    let startToken = 0;

    // ==================== 玩家 ====================
    const player = {
      x: CANVAS_W / 2 - PLAYER_W / 2,
      y: CANVAS_H - PLAYER_H - 20,
      vx: 0,
      bounce: 0,
      trail: []
    };

    const ACCEL = 2.8;
    const MAX_VX = 14;
    const FRICTION = 0.84;
    const keys = { left: false, right: false };
    const resetKeys = () => {
      keys.left = false;
      keys.right = false;
    };

    // ==================== 卡片 ====================
    let cards = [];
    let cardIdCounter = 0;
    // 从API获取的题目（带难度梯度 1-200关）
    let questionBank = [];
    let spawnedCorrect = new Set();
    let spawnedWrong = new Set();
    let poemSpawnTime = new Map();
    let wrongCardPool = [];
    let wrongCaughtLog = [];

    // ==================== 粒子特效 ====================
    let particles = [];
    let petals = [];
    let confetti = [];

    // ==================== 背景装饰 ====================
    const bgDots = [];
    const BG_CHARS = ['诗', '词', '风', '月', '云', '山', '水', '花', '春', '秋', '雨', '雪', '鸟', '酒', '茶'];

    // ==================== 复盘 ====================
    const reviewErrors = ref([]);
    const reviewLoading = ref(false);
    const isAddingAll = ref(false);
    const addedSuccess = ref(false);
    const isAddingAllToBook = ref(false);
    const allErrorsAddedToBook = ref(false);
    const toast = ref({ show: false, text: '', type: 'info', combo: 0 });
    let toastTimer = null;

    // ==================== 计算属性 ====================
    const gradeText = computed(() => {
      const s = score.value;
      if (s >= 40) return '诗仙';
      if (s >= 28) return '诗词大师';
      if (s >= 18) return '诗词达人';
      if (s >= 10) return '诗坛新秀';
      if (s >= 5) return '初露锋芒';
      return '诗海初探';
    });

    const gradeClass = computed(() => {
      const s = score.value;
      if (s >= 40) return 'grade-immortal';
      if (s >= 28) return 'grade-master';
      if (s >= 18) return 'grade-expert';
      if (s >= 10) return 'grade-talent';
      if (s >= 5) return 'grade-rookie';
      return 'grade-novice';
    });

    const levelLabel = computed(() => {
      const labels = ['入门', '进阶', '挑战', '大师', '诗仙'];
      return labels[Math.min(gameLevel.value - 1, labels.length - 1)];
    });

    const allAddedToReview = computed(() => {
      return reviewErrors.value.length > 0 && reviewErrors.value.every(e => e.addedToReview);
    });
    const isStarting = ref(false);

    // ==================== 方法 ====================
    const showToast = (text, type = 'info', comboVal = 0) => {
      toast.value = { show: true, text, type, combo: comboVal };
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.value.show = false; }, 1800);
    };

    const formatTime = (s) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${String(sec).padStart(2, '0')}`;
    };

    const getPetalStyle = (i) => {
      return {
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${8 + Math.random() * 6}s`,
        fontSize: `${12 + Math.random() * 8}px`,
        opacity: 0.3 + Math.random() * 0.4
      };
    };

    // ==================== 难度系统 ====================
    const getDifficultyParams = () => {
      const d = diff.value;
      const t = elapsed.value;
      const level = Math.min(startingLevel + Math.floor(t / 30), 5);
      gameLevel.value = level;
      const mult = 1 + (level - 1) * 0.15;
      const speedMap = { easy: 1.0, medium: 1.35, hard: 1.8 };
      const spawnMap = { easy: 2500, medium: 1800, hard: 1300 };
      const maxCards = { easy: 5, medium: 7, hard: 10 };
      return {
        speed: CARD_SPEED_BASE * speedMap[d] * mult,
        spawnInterval: Math.max(1200, spawnMap[d] / mult),
        maxCards: Math.min(maxCards[d] + level - 1, 10),
        level
      };
    };

    const getQuestionsByLevel = () => {
      return questionBank;
    };

    // 根据题库构建错误选项池
    const buildWrongPoolFromBank = () => {
      if (!questionBank || questionBank.length === 0) return [];
      const pool = [];
      const allAnswers = questionBank.map((q) => q.answer);
      questionBank.forEach((q) => {
        const otherAnswers = allAnswers.filter((a) => a !== q.answer);
        const shuffled = [...otherAnswers].sort(() => Math.random() - 0.5);
        const wrongCount = Math.random() < 0.5 ? 1 : 2;
        for (let i = 0; i < wrongCount && i < shuffled.length; i++) {
          pool.push({ lowerText: shuffled[i], poem: q });
        }
      });
      return pool;
    };

    // 从API获取带难度梯度的题库（200关题库）
    const fetchQuestionBank = async (difficulty) => {
      try {
        const resp = await fetch(`${API_BASE}/questions?difficulty=${difficulty}&startLevel=1&count=60`);
        const json = await resp.json();
        if (json.success && json.questions && json.questions.length > 0) {
          questionBank = json.questions;
        } else {
          questionBank = buildLocalQuestionBank();
        }
      } catch (e) {
        console.warn('从API获取题目失败，使用本地题库:', e);
        questionBank = buildLocalQuestionBank();
      }
    };

    // 从本地 JSON 构建题库（降级用）
    const buildLocalQuestionBank = () => {
      return questionsData.map((q) => ({
        question: q.question,
        answer: q.answer,
        poem: q.poem,
        author: q.author,
        level: 1,
        difficulty: 'easy'
      }));
    };

    // ==================== 卡片生成 ====================
    const createCard = (forceCorrect) => {
      const params = getDifficultyParams();
      const levelQuestions = getQuestionsByLevel();
      if (levelQuestions.length === 0) return null;

      let isCorrect = forceCorrect;
      if (!isCorrect) {
        const activeCards = cards.filter((c) => !c.collected);
        const correctActive = activeCards.filter((c) => c.isCorrect).length;
        const wrongActive = activeCards.filter((c) => !c.isCorrect).length;
        // 严格保持50/50：如果正确卡>错误卡，强制生成错误卡；反之亦然
        if (correctActive > wrongActive) {
          isCorrect = false;
        } else if (wrongActive > correctActive) {
          isCorrect = true;
        } else {
          isCorrect = Math.random() < 0.5;
        }
      }

      let q, lowerText;

      const now = Date.now();
      const POEM_COOLDOWN = 30000;

      const isPoemAvailable = (poemTitle) => {
        const lastSpawn = poemSpawnTime.get(poemTitle);
        if (!lastSpawn) return true;
        return now - lastSpawn > POEM_COOLDOWN;
      };

      if (isCorrect) {
        const available = levelQuestions.filter(q =>
          !spawnedCorrect.has(q.question) && isPoemAvailable(q.poem || q.question)
        );
        if (available.length === 0) {
          spawnedCorrect.clear();
          const availableAfterClear = levelQuestions.filter(q => isPoemAvailable(q.poem || q.question));
          if (availableAfterClear.length === 0) {
            poemSpawnTime.clear();
          }
          return createCard(true);
        }
        q = available[Math.floor(Math.random() * available.length)];
        spawnedCorrect.add(q.question);
        poemSpawnTime.set(q.poem || q.question, now);
        lowerText = q.answer;
      } else {
        if (wrongCardPool.length === 0) wrongCardPool = buildWrongPoolFromBank();
        const shuffled = [...wrongCardPool].sort(() => Math.random() - 0.5);
        // wrongOfCurrent: 已出现过的下句，用于去重
        const wrongOfCurrent = cards.filter((c) => !c.collected).map((c) => c.lowerText);
        const available = shuffled.filter(
          (w) => !spawnedWrong.has(w.lowerText) && !wrongOfCurrent.includes(w.lowerText)
        );
        if (available.length === 0) {
          // 强制回到正确卡，防止卡住
          return createCard(true);
        }
        const chosen = available[0];
        lowerText = chosen.lowerText;
        q = chosen.poem;
        spawnedWrong.add(chosen.lowerText);
      }

      const x = 50 + Math.random() * (CANVAS_W - CARD_W - 100);
      const card = {
        id: cardIdCounter++,
        x,
        y: -CARD_H - 20,
        w: CARD_W,
        h: CARD_H,
        speed: params.speed * (0.88 + Math.random() * 0.28),
        upperText: q.question,
        lowerText,
        correctAnswer: q.answer,
        poem: q,
        isCorrect,
        collected: false,
        passed: false,
        glow: 0,
        rot: (Math.random() - 0.5) * 0.06,
        shimmer: Math.random() * Math.PI * 2,
        fallAngle: 0
      };
      cards.push(card);
      return card;
    };

    // ==================== 碰撞检测 ====================
    const hitTest = (px, py, pw, ph, cx, cy, cw, ch) => {
      return px < cx + cw && px + pw > cx && py < cy + ch && py + ph > cy;
    };

    // ==================== 粒子系统 ====================
    const spawnParticles = (x, y, color, count) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 4;
        particles.push({
          x, y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 3,
          life: 1,
          decay: 0.018 + Math.random() * 0.018,
          size: 4 + Math.random() * 6,
          color,
          rotation: Math.random() * Math.PI * 2
        });
      }
    };

    const spawnConfetti = (x, y, count) => {
      for (let i = 0; i < count; i++) {
        confetti.push({
          x, y,
          vx: (Math.random() - 0.5) * 8,
          vy: -Math.random() * 6 - 2,
          life: 1,
          decay: 0.012,
          size: 6 + Math.random() * 6,
          color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F472B6'][Math.floor(Math.random() * 5)],
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.3
        });
      }
    };

    // ==================== Canvas 初始化 ====================
    const initCanvas = () => {
      const canvas = canvasRef.value;
      if (!canvas) return;
      ctx = canvas.getContext('2d');
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;

      if (!ctx.roundRect) {
        ctx.roundRect = (x, y, w, h, r) => {
          if (typeof r === 'number') r = [r, r, r, r];
          const [tl, tr, br, bl] = r;
          ctx.beginPath();
          ctx.moveTo(x + tl, y);
          ctx.lineTo(x + w - tr, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
          ctx.lineTo(x + w, y + h - br);
          ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
          ctx.lineTo(x + bl, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
          ctx.lineTo(x, y + tl);
          ctx.quadraticCurveTo(x, y, x + tl, y);
          ctx.closePath();
        };
      }

      bgDots.length = 0;
      for (let i = 0; i < 32; i++) {
        bgDots.push({
          x: Math.random() * CANVAS_W,
          y: Math.random() * CANVAS_H,
          char: BG_CHARS[Math.floor(Math.random() * BG_CHARS.length)],
          size: 14 + Math.random() * 14,
          alpha: 0.025 + Math.random() * 0.035,
          speed: 0.12 + Math.random() * 0.22,
          rot: Math.random() * Math.PI * 2,
          rotSpd: (Math.random() - 0.5) * 0.005
        });
      }

      petals.length = 0;
      for (let i = 0; i < 8; i++) {
        petals.push({
          x: Math.random() * CANVAS_W,
          y: Math.random() * CANVAS_H,
          size: 10 + Math.random() * 8,
          speed: 0.3 + Math.random() * 0.4,
          rot: Math.random() * Math.PI * 2,
          rotSpd: (Math.random() - 0.5) * 0.02,
          sway: Math.random() * Math.PI * 2,
          swaySpd: 0.01 + Math.random() * 0.01
        });
      }
    };

    // ==================== 绘制函数 ====================
    const drawBackground = () => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // 只补充视觉边界，不改变碰撞范围：让玩家一眼看出下方是接取区域。
      const catchZoneY = player.y - 18;
      const catchWash = ctx.createLinearGradient(0, catchZoneY, 0, CANVAS_H);
      catchWash.addColorStop(0, 'rgba(235, 244, 235, 0)');
      catchWash.addColorStop(1, 'rgba(114, 164, 144, 0.18)');
      ctx.fillStyle = catchWash;
      ctx.fillRect(0, catchZoneY, CANVAS_W, CANVAS_H - catchZoneY);
      ctx.strokeStyle = 'rgba(74, 132, 115, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([7, 9]);
      ctx.beginPath();
      ctx.moveTo(54, catchZoneY);
      ctx.lineTo(CANVAS_W - 54, catchZoneY);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const p of petals) {
        p.y += p.speed;
        p.x += Math.sin(p.sway) * 0.5;
        p.rot += p.rotSpd;
        p.sway += p.swaySpd;
        if (p.y > CANVAS_H + 20) {
          p.y = -20;
          p.x = Math.random() * CANVAS_W;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = 0.25;
        ctx.font = `${p.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffb7c5';
        ctx.fillText('🌸', 0, 0);
        ctx.restore();
      }

      ctx.font = `bold ${16}px 'STSong', 'SimSun', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const el of bgDots) {
        el.x += el.speed;
        el.rot += el.rotSpd;
        if (el.x > CANVAS_W + 40) {
          el.x = -40;
          el.y = Math.random() * CANVAS_H;
        }
        ctx.save();
        ctx.translate(el.x, el.y);
        ctx.rotate(el.rot);
        ctx.globalAlpha = el.alpha;
        ctx.fillStyle = '#f0d78c';
        ctx.fillText(el.char, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    const drawCard = (card) => {
      const { x, y, w, h, upperText, lowerText, collected, glow } = card;

      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(card.rot || 0);
      ctx.translate(-(x + w / 2), -(y + h / 2));
      ctx.globalAlpha = collected ? 0.5 : 1;

      // 接取反馈只改变光晕，题签本身不泄露答案。
      if (glow > 0 && !collected) {
        ctx.shadowColor = 'rgba(176, 140, 92, 0.46)';
        ctx.shadowBlur = 24 * glow;
      }

      if (!collected) {
        ctx.shadowColor = 'rgba(35, 78, 67, 0.24)';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 9;
      }

      const paper = ctx.createLinearGradient(x, y, x + w, y + h);
      paper.addColorStop(0, '#fffdf5');
      paper.addColorStop(0.55, '#f8fbf5');
      paper.addColorStop(1, '#e8f3ec');
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 15);
      ctx.fillStyle = paper;
      ctx.fill();
      ctx.strokeStyle = 'rgba(137, 104, 58, 0.62)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 左侧书脊让题签更像正在下落的诗册页。
      const spine = ctx.createLinearGradient(x, y, x + 12, y);
      spine.addColorStop(0, '#8f6c3f');
      spine.addColorStop(0.42, '#d4b57f');
      spine.addColorStop(1, '#a37b47');
      ctx.fillStyle = spine;
      ctx.beginPath();
      ctx.roundRect(x, y + 3, 11, h - 6, [12, 0, 0, 12]);
      ctx.fill();

      // 右上角折页。
      ctx.fillStyle = 'rgba(176, 140, 92, 0.18)';
      ctx.beginPath();
      ctx.moveTo(x + w - 28, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + 28);
      ctx.closePath();
      ctx.fill();

      // 上句区域。
      ctx.fillStyle = '#8c7352';
      ctx.font = `600 10px 'Noto Sans SC','Microsoft YaHei',sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('上句', x + 24, y + 22);

      const upperFont = Math.min(16, Math.max(13, (w - 74) / Math.max(upperText.length, 1) * 1.5));
      ctx.fillStyle = '#294f48';
      ctx.font = `600 ${upperFont}px 'STKaiti','KaiTi','STSong','SimSun',serif`;
      ctx.textAlign = 'center';
      ctx.fillText(upperText, x + w / 2 + 5, y + 42, w - 54);

      ctx.strokeStyle = 'rgba(56, 111, 96, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 24, y + 59);
      ctx.lineTo(x + w - 18, y + 59);
      ctx.stroke();

      // 候选下句使用独立承托区，但正确和错误卡保持完全相同的样式。
      ctx.fillStyle = 'rgba(25, 118, 102, 0.09)';
      ctx.strokeStyle = 'rgba(25, 118, 102, 0.16)';
      ctx.beginPath();
      ctx.roundRect(x + 22, y + 69, w - 38, h - 81, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#197666';
      ctx.font = `700 ${Math.min(20, Math.max(15, (w - 62) / Math.max(lowerText.length, 1) * 1.7))}px 'STKaiti','KaiTi','STSong','SimSun',serif`;
      ctx.fillText(lowerText, x + w / 2 + 4, y + 89, w - 56);

      ctx.restore();
    };

    const drawPlayer = () => {
      const px = player.x;
      const py = player.y;
      const pw = PLAYER_W;
      const ph = PLAYER_H;

      // 拖尾
      player.trail.unshift({ x: px + pw / 2, y: py + ph / 2, life: 1 });
      if (player.trail.length > 12) player.trail.pop();
      for (let i = player.trail.length - 1; i >= 0; i--) {
        const t = player.trail[i];
        t.life -= 0.08;
        if (t.life <= 0) { player.trail.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = t.life * 0.25;
        const grd = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 8 * t.life);
        grd.addColorStop(0, '#f0d78c');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 8 * t.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(px + pw / 2, py + ph / 2);

      // 弹跳效果
      if (player.bounce > 0) {
        ctx.scale(1 + player.bounce * 0.08, 1 - player.bounce * 0.06);
        player.bounce -= 0.15;
        if (player.bounce < 0) player.bounce = 0;
      }

      // 光晕和落地阴影。
      const haloGrad = ctx.createRadialGradient(0, 4, pw * 0.18, 0, 4, pw * 0.92);
      haloGrad.addColorStop(0, 'rgba(45, 157, 138, 0.18)');
      haloGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 4, pw * 0.92, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(33, 85, 72, 0.16)';
      ctx.beginPath();
      ctx.ellipse(0, ph * 0.38, pw * 0.48, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // 接诗托盘与人物使用同一碰撞范围，视觉上强调“接取”动作。
      ctx.shadowColor = 'rgba(34, 83, 70, 0.22)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      const trayGrad = ctx.createLinearGradient(0, -ph * 0.45, 0, -ph * 0.22);
      trayGrad.addColorStop(0, '#fffdf4');
      trayGrad.addColorStop(1, '#dcece4');
      ctx.fillStyle = trayGrad;
      ctx.strokeStyle = '#8e744e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-pw * 0.62, -ph * 0.42, pw * 1.24, 17, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = '#b08c5c';
      ctx.beginPath();
      ctx.arc(-pw * 0.56, -ph * 0.335, 3.2, 0, Math.PI * 2);
      ctx.arc(pw * 0.56, -ph * 0.335, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // 现有水墨书生资产，替代原来的几何小圆脸。
      const avatarY = ph * 0.08;
      const avatarR = pw * 0.43;
      ctx.shadowColor = 'rgba(30, 78, 67, 0.25)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#f8f4e8';
      ctx.beginPath();
      ctx.arc(0, avatarY, avatarR + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, avatarY, avatarR, 0, Math.PI * 2);
      ctx.clip();
      if (scholarAvatar?.complete && scholarAvatar.naturalWidth) {
        ctx.drawImage(scholarAvatar, -avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
      }
      ctx.restore();
      ctx.strokeStyle = '#287b6c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, avatarY, avatarR + 3, 0, Math.PI * 2);
      ctx.stroke();

      // 接取光晕
      if (cards.some((c) => !c.collected && Math.abs(c.x + c.w / 2 - (px + pw / 2)) < pw * 1.4 && c.y + c.h > py)) {
        ctx.strokeStyle = 'rgba(176, 140, 92, 0.72)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-pw * 0.68, -ph * 0.47, pw * 1.36, 25, 12);
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawParticles = () => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.life -= p.decay;
        p.rotation += 0.1;
        if (p.life <= 0) continue;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        // 菱形粒子
        const s = p.size * p.life;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 彩带
      for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.15;
        c.vx *= 0.99;
        c.rotation += c.rotSpeed;
        c.life -= c.decay;
        if (c.life <= 0) { confetti.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = c.life;
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
        ctx.restore();
      }
    };

    // ==================== 游戏主循环 ====================
    const gameLoop = (timestamp) => {
      if (phase.value !== 'PLAYING') return;
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;

      const params = getDifficultyParams();

      // 玩家移动
      if (keys.left) player.vx -= ACCEL;
      if (keys.right) player.vx += ACCEL;
      player.vx *= FRICTION;
      if (Math.abs(player.vx) < 0.1) player.vx = 0;
      player.vx = Math.max(-MAX_VX, Math.min(MAX_VX, player.vx));
      player.x += player.vx;

      // 边界
      if (player.x < 0) { player.x = 0; player.vx = 0; }
      if (player.x + PLAYER_W > CANVAS_W) { player.x = CANVAS_W - PLAYER_W; player.vx = 0; }

      // 生成卡片
      spawnTimer += dt * 1000;
      if (spawnTimer >= params.spawnInterval) {
        spawnTimer = 0;
        if (cards.filter((c) => !c.collected).length < params.maxCards) {
          createCard();
        }
      }

      // 更新卡片
      for (let i = cards.length - 1; i >= 0; i--) {
        const card = cards[i];
        card.y += card.speed;
        card.shimmer += 0.05;
        if (card.collected && card.glow > 0) {
          card.glow *= 0.85;
          if (card.glow < 0.04) card.glow = 0;
        }

        if (!card.collected) {
          if (hitTest(player.x, player.y, PLAYER_W, PLAYER_H, card.x, card.y, card.w, card.h)) {
            card.collected = true;
            card.glow = 1;
            player.bounce = 1;

            if (card.isCorrect) {
              // 连击系统
              combo.value++;
              if (combo.value > maxCombo.value) maxCombo.value = combo.value;
              
              // 连击加分
              const comboBonus = combo.value >= 5 ? 2 : combo.value >= 3 ? 1 : 0;
              score.value = applyCardCatchScore(score.value, 'correct', comboBonus);
              correctCount.value++;
              scoreAnim.value = true;
              setTimeout(() => { scoreAnim.value = false; }, 300);
              
              spawnParticles(card.x + card.w / 2, card.y + card.h / 2, '#4ade80', 16);
              spawnConfetti(card.x + card.w / 2, card.y, 8);
              
              if (comboBonus > 0) {
                showToast(`+${1 + comboBonus} 诗句通达！`, 'success', combo.value);
              } else {
                showToast('+1 正确！', 'success');
              }
            } else {
              combo.value = 0; // 重置连击
              const previousScore = score.value;
              score.value = applyCardCatchScore(score.value, 'wrong');
              wrongCount.value++;
              wrongCaughtLog.push({
                questionText: card.upperText,
                userAnswer: card.lowerText,
                correctAnswer: card.correctAnswer,
                poem: card.poem,
                addedToReview: false
              });
              spawnParticles(card.x + card.w / 2, card.y + card.h / 2, '#f87171', 12);
              showToast(previousScore > 0 ? '-1 接错了' : '接错了，当前已是 0 分', 'error');

              if (wrongCount.value >= MAX_WRONG) {
                endGame();
                return;
              }
            }
          }
        }

        // 漏过检测
        if (!card.passed && !card.collected && card.y > CANVAS_H) {
          card.passed = true;
          if (card.isCorrect) {
            score.value = applyCardCatchScore(score.value, 'missed');
            missedCount.value++;
            combo.value = 0; // 重置连击
            spawnParticles(card.x + card.w / 2, CANVAS_H - 10, '#fbbf24', 6);
            showToast('错过正确句，不加不扣', 'warn');
          }
        }

        if (card.y > CANVAS_H + 80) {
          cards.splice(i, 1);
        }
      }

      // 更新粒子
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1);
      }

      // 绘制
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBackground();
      for (const card of cards) drawCard(card);
      drawParticles();
      drawPlayer();

      animId = requestAnimationFrame(gameLoop);
    };

    // ==================== 游戏控制 ====================
    const startElapsedTimer = () => {
      if (elapsedTimer) clearInterval(elapsedTimer);
      gameStartTime = Date.now();
      elapsedTimer = setInterval(() => {
        elapsed.value = elapsedBeforePause + Math.floor((Date.now() - gameStartTime) / 1000);
      }, 1000);
    };

    const startGame = async ({ level = 1 } = {}) => {
      if (isStarting.value) return;
      const requestToken = ++startToken;
      isStarting.value = true;
      resetKeys();
      phase.value = 'PLAYING';
      gameSessionId.value = generateAttemptId();
      score.value = 0;
      wrongCount.value = 0;
      correctCount.value = 0;
      missedCount.value = 0;
      elapsed.value = 0;
      gameLevel.value = 1;
      startingLevel = Math.min(Math.max(level, 1), 5);
      gameLevel.value = startingLevel;
      combo.value = 0;
      maxCombo.value = 0;
      spawnTimer = 0;
      cards = [];
      particles = [];
      confetti = [];
      player.x = CANVAS_W / 2 - PLAYER_W / 2;
      player.vx = 0;
      player.bounce = 0;
      player.trail = [];
      spawnedCorrect.clear();
      spawnedWrong.clear();
      poemSpawnTime.clear();
      wrongCaughtLog = [];
      reviewErrors.value = [];
      reviewLoading.value = false;
      allErrorsAddedToBook.value = false;
      cardIdCounter = 0;

      // 从API获取带难度梯度的题库
      try {
        await fetchQuestionBank(diff.value, 1);
        // 开始按钮、重开或退出可能在请求期间再次触发。旧请求回来后不能偷跑一局。
        if (requestToken !== startToken || phase.value !== 'PLAYING') return;
        wrongCardPool = buildWrongPoolFromBank();

        elapsedBeforePause = 0;
        startElapsedTimer();

        await nextTick();

        // 确保全屏切换时立即响应
        requestAnimationFrame(() => {
          if (requestToken !== startToken || phase.value !== 'PLAYING') return;
          scrollGameIntoView();
          lastTime = performance.now();
          animId = requestAnimationFrame(gameLoop);
        });
      } finally {
        if (requestToken === startToken) isStarting.value = false;
      }
    };

    const pauseGame = () => {
      // 题库尚未准备好时不允许切到 PAUSED，避免请求返回后无法启动循环。
      if (isStarting.value || phase.value !== 'PLAYING') return;
      phase.value = 'PAUSED';
      cancelAnimationFrame(animId);
      if (elapsedTimer) clearInterval(elapsedTimer);
      elapsedBeforePause = elapsed.value;
    };

    const resumeGame = () => {
      if (phase.value !== 'PAUSED') return;
      phase.value = 'PLAYING';
      startElapsedTimer();
      lastTime = performance.now();
      animId = requestAnimationFrame(gameLoop);
    };

    const endGame = () => {
      phase.value = 'GAME_OVER';
      cancelAnimationFrame(animId);
      if (elapsedTimer) clearInterval(elapsedTimer);
      if (toastTimer) clearTimeout(toastTimer);
      toast.value.show = false;
      saveRecord();
    };

    const nextLevel = () => {
      if (gameLevel.value < 5) {
        startGame({ level: Math.min(gameLevel.value + 1, 5) });
      } else {
        endGame();
      }
    };

    const restartGame = () => {
      startGame();
    };

    const quitGame = () => {
      startToken++;
      isStarting.value = false;
      resetKeys();
      phase.value = 'MENU';
      cancelAnimationFrame(animId);
      if (elapsedTimer) clearInterval(elapsedTimer);
      wrongCaughtLog = [];
      reviewErrors.value = [];
      reviewLoading.value = false;
      ctx?.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBackground();
      router.push('/');
    };

    // ==================== 复盘功能 ====================
    const showReview = async () => {
      const reviewToken = startToken;
      phase.value = 'REVIEW';
      cancelAnimationFrame(animId);
      reviewLoading.value = true;

      const errList = wrongCaughtLog.map((e) => ({
        questionText: e.questionText,
        userAnswer: e.userAnswer,
        correctAnswer: e.correctAnswer,
        poem: e.poem,
        aiData: null,
        addedToReview: false
      }));

      if (errList.length === 0) {
        reviewErrors.value = [];
        reviewLoading.value = false;
        return;
      }

      reviewErrors.value = errList;

      // 调用 AI 讲解
      for (let i = 0; i < errList.length; i++) {
        try {
          const resp = await authFetch(`${API_BASE}/ai-explain`, {
            method: 'POST',
            body: JSON.stringify({
              questionText: errList[i].questionText,
              wrongAnswer: errList[i].userAnswer,
              correctAnswer: errList[i].correctAnswer
            })
          });
          const json = await resp.json();
          if (reviewToken !== startToken || phase.value !== 'REVIEW') return;
          if (json.success && json.data) {
            errList[i].aiData = json.data;
            reviewErrors.value = [...errList];
          }
        } catch (e) {
          console.error('AI讲解请求失败', e);
        }
      }
      if (reviewToken === startToken && phase.value === 'REVIEW') {
        reviewLoading.value = false;
      }
    };

    const buildReviewPayload = (err) => {
      const poem = err.poem || {};
      return {
        questionText: err.questionText,
        correctAnswer: err.correctAnswer,
        userAnswer: err.userAnswer,
        question_id: poem.id || poem.question_id || null,
        level: Number(poem.level) || gameLevel.value || 1,
        full_poem: poem.full_poem || poem.fullPoem || '',
        author: poem.author || '',
        title: poem.title || poem.poem || '',
        source: 'card-catch'
      };
    };

    const addSingleToErrorBook = async (err) => {
      try {
        const resp = await authFetch(`${API_BASE}/add-to-review`, {
          method: 'POST',
          body: JSON.stringify(buildReviewPayload(err))
        });
        const json = await resp.json();
        if (resp.ok && json.success) {
          err.addedToReview = true;
          reviewErrors.value = [...reviewErrors.value];
          showToast('已加入错题本', 'success');
        } else {
          showToast(json.message || '添加失败', 'error');
        }
      } catch (e) {
        console.error('添加错题失败', e);
        showToast('添加失败', 'error');
      }
    };

    const addAllToErrorBook = async () => {
      if (isAddingAll.value || allAddedToReview.value) return;
      isAddingAll.value = true;

      const notAdded = reviewErrors.value.filter(e => !e.addedToReview);
      let successCount = 0;
      let failedCount = 0;
      
      for (const err of notAdded) {
        try {
          const resp = await authFetch(`${API_BASE}/add-to-review`, {
            method: 'POST',
            body: JSON.stringify(buildReviewPayload(err))
          });
          const json = await resp.json();
          if (resp.ok && json.success) {
            err.addedToReview = true;
            successCount++;
          } else {
            failedCount++;
          }
        } catch (e) {
          failedCount++;
          console.error('添加错题失败', e);
        }
      }

      reviewErrors.value = [...reviewErrors.value];
      isAddingAll.value = false;
      
      if (successCount > 0) {
        addedSuccess.value = true;
        setTimeout(() => { addedSuccess.value = false; }, 3000);
        showToast(
          failedCount > 0
            ? `已添加 ${successCount} 条，${failedCount} 条失败，请重试`
            : `已成功添加 ${successCount} 条错题！`,
          failedCount > 0 ? 'warn' : 'success'
        );
      } else if (notAdded.length > 0) {
        showToast('错题添加失败，请重试', 'error');
      }
    };

    const addAllErrorsToBook = async () => {
      if (isAddingAllToBook.value || allErrorsAddedToBook.value) return;
      if (wrongCaughtLog.length === 0) return;
      
      isAddingAllToBook.value = true;

      const pendingErrors = wrongCaughtLog.filter(err => !err.addedToReview);
      let successCount = 0;
      let failedCount = 0;

      for (const err of pendingErrors) {
        try {
          const resp = await authFetch(`${API_BASE}/add-to-review`, {
            method: 'POST',
            body: JSON.stringify(buildReviewPayload(err))
          });
          const json = await resp.json();
          if (resp.ok && json.success) {
            err.addedToReview = true;
            successCount++;
          } else {
            failedCount++;
            console.error('添加错题失败:', json.message);
          }
        } catch (e) {
          failedCount++;
          console.error('添加错题失败', e);
        }
      }

      isAddingAllToBook.value = false;
      allErrorsAddedToBook.value = pendingErrors.length > 0 && failedCount === 0;
      if (successCount > 0) {
        addedSuccess.value = true;
        setTimeout(() => { addedSuccess.value = false; }, 3000);
        showToast(
          failedCount > 0
            ? `已添加 ${successCount} 条，${failedCount} 条失败，请重试`
            : `已成功添加 ${successCount} 条错题到错题本！`,
          failedCount > 0 ? 'warn' : 'success'
        );
      } else if (pendingErrors.length > 0) {
        showToast('错题添加失败，请重试', 'error');
      }
    };

    // ==================== 保存记录 ====================
    const saveRecord = async () => {
      const errorsPayload = wrongCaughtLog.map((e) => ({
        questionText: e.questionText,
        userAnswer: e.userAnswer,
        correctAnswer: e.correctAnswer
      }));

      try {
        await authFetch(`${API_BASE}/save`, {
          method: 'POST',
          body: JSON.stringify({
            score: score.value,
            wrongCount: wrongCount.value,
            correctCount: correctCount.value,
            missedCount: missedCount.value,
            duration: elapsed.value,
            difficultyLevel: gameLevel.value,
            errors: errorsPayload,
            gameSessionId: gameSessionId.value
          })
        });
      } catch (e) {
        console.error('保存记录失败', e);
      }
    };

    // ==================== 键盘事件 ====================
    const handleKeyDown = (e) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') { keys.right = true; e.preventDefault(); }
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (phase.value === 'PLAYING') pauseGame();
        else if (phase.value === 'PAUSED') resumeGame();
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = false;
    };

    // ==================== 生命周期 ====================
    const scrollGameIntoView = () => {
      // 立即强制重绘，避免全屏切换时出现闪烁
      if (canvasRef.value && ctx) {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        drawBackground();
      }

      // 使用 requestAnimationFrame 确保在下一帧之前完成滚动
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        if (rootRef.value) {
          rootRef.value.scrollTop = 0;
        }

        // 聚焦到游戏区域
        if (wrapRef.value) {
          wrapRef.value.focus();
        }
      });
    };

    // 强制重绘，确保全屏切换时画面不卡顿
    const forceRedraw = () => {
      if (ctx && canvasRef.value) {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        drawBackground();
        // 如果在游戏中，重新绘制游戏状态
        if (phase.value === 'PLAYING') {
          for (const card of cards) drawCard(card);
          drawPlayer();
        }
      }
    };

    onMounted(() => {
      // 预计算背景装饰，避免运行时计算
      initCanvas();
      drawBackground();

      // 确保页面打开时滚动到最顶端
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // 延迟设置键盘监听，确保 DOM 完全就绪
      setTimeout(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        wrapRef.value?.focus();

        // 立即处理全屏切换
        forceRedraw();
      }, 50);
    });

    onActivated(() => {
      // 每次激活时强制重绘
      nextTick(() => {
        forceRedraw();
        if (phase.value === 'PLAYING' || phase.value === 'PAUSED') {
          scrollGameIntoView();
        }
      });
    });

    onUnmounted(() => {
      startToken++;
      resetKeys();
      cancelAnimationFrame(animId);
      if (elapsedTimer) clearInterval(elapsedTimer);
      if (toastTimer) clearTimeout(toastTimer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    });

    return {
      rootRef, canvasRef, wrapRef,
      phase, diff, isStarting, score, wrongCount, correctCount, missedCount,
      elapsed, gameLevel, gradeText, gradeClass, levelLabel,
      combo, maxCombo, scoreAnim,
      DIFFICULTIES,
      reviewErrors, reviewLoading, isAddingAll, allAddedToReview,
      isAddingAllToBook, allErrorsAddedToBook, wrongCaughtLog,
      toast, addedSuccess,
      formatTime, getPetalStyle, showReview, addSingleToErrorBook, addAllToErrorBook, addAllErrorsToBook,
      startGame, pauseGame, resumeGame, restartGame, quitGame, nextLevel
    };
  }
};
</script>

<style scoped>

/* ==================== 基础布局 ==================== */
.poetry-mahjong-wrapper {
  position: relative !important;
  inset: auto !important;
  width: 100vw !important;
  height: calc(100dvh - 84px) !important;
  min-height: calc(100dvh - 84px) !important;
  max-height: calc(100dvh - 84px) !important;
  margin: 0 calc(50% - 50vw) !important;
  background: #edf7f2;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  outline: none;
  will-change: transform;
  contain: layout style paint;
  z-index: 1000;
}

.poetry-mahjong-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(ellipse at 82% 15%, rgba(255, 248, 220, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 20% 80%, rgba(139, 90, 43, 0.05) 0%, transparent 40%);
  pointer-events: none;
  z-index: 0;
}

.poetry-mahjong-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60%;
  background-image: 
    radial-gradient(1px 1px at 10% 10%, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(1px 1px at 20% 25%, rgba(255, 255, 255, 0.5), transparent),
    radial-gradient(1.5px 1.5px at 30% 15%, rgba(255, 255, 255, 0.7), transparent),
    radial-gradient(1px 1px at 40% 35%, rgba(255, 255, 255, 0.4), transparent),
    radial-gradient(1px 1px at 50% 8%, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(1.5px 1.5px at 60% 28%, rgba(255, 255, 255, 0.5), transparent),
    radial-gradient(1px 1px at 70% 18%, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(1px 1px at 80% 40%, rgba(255, 255, 255, 0.4), transparent),
    radial-gradient(1.5px 1.5px at 90% 12%, rgba(255, 255, 255, 0.7), transparent),
    radial-gradient(1px 1px at 15% 45%, rgba(255, 255, 255, 0.5), transparent),
    radial-gradient(1px 1px at 25% 55%, rgba(255, 255, 255, 0.4), transparent),
    radial-gradient(1.5px 1.5px at 35% 38%, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(1px 1px at 45% 52%, rgba(255, 255, 255, 0.5), transparent),
    radial-gradient(1px 1px at 55% 42%, rgba(255, 255, 255, 0.4), transparent),
    radial-gradient(1.5px 1.5px at 65% 58%, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(1px 1px at 75% 48%, rgba(255, 255, 255, 0.5), transparent),
    radial-gradient(1px 1px at 85% 62%, rgba(255, 255, 255, 0.4), transparent),
    radial-gradient(1.5px 1.5px at 95% 35%, rgba(255, 255, 255, 0.7), transparent),
    radial-gradient(1px 1px at 5% 30%, rgba(255, 255, 255, 0.5), transparent),
    radial-gradient(1px 1px at 12% 65%, rgba(255, 255, 255, 0.4), transparent);
  pointer-events: none;
  z-index: 0;
  animation: twinkle 4s ease-in-out infinite alternate;
}

@keyframes twinkle {
  0% { opacity: 0.6; }
  100% { opacity: 1; }
}

/* ==================== 通用卷轴卡片 ==================== */
.scroll-card {
  background: linear-gradient(135deg, rgba(20, 15, 40, 0.98) 0%, rgba(15, 10, 30, 0.98) 100%);
  border: 2px solid rgba(205, 133, 63, 0.4);
  border-radius: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(205, 133, 63, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
}

.scroll-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(205, 133, 63, 0.6), transparent);
}

/* ==================== 菜单背景装饰 ==================== */
.menu-bg-effects {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.floating-petals {
  position: absolute;
  inset: 0;
}

.petal {
  position: absolute;
  animation: petalFall linear infinite;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

@keyframes petalFall {
  0% {
    transform: translateY(-20px) rotate(0deg) translateX(0);
    opacity: 0;
  }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% {
    transform: translateY(100vh) rotate(360deg) translateX(50px);
    opacity: 0;
  }
}

.mountain-silhouette {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: linear-gradient(0deg, #0a0812 0%, transparent 100%);
  clip-path: polygon(0 100%, 0 60%, 20% 40%, 35% 55%, 50% 30%, 65% 50%, 80% 35%, 100% 55%, 100% 100%);
}

/* ==================== 开始菜单 ==================== */
.menu-overlay {
  background: radial-gradient(ellipse at center, rgba(15, 10, 30, 0.9) 0%, rgba(8, 5, 16, 0.95) 100%);
  backdrop-filter: blur(12px);
}

.menu-card {
  max-width: 520px;
  width: 95%;
  padding: 40px 44px;
  text-align: center;
}

.scroll-top-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.ornament-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(205, 133, 63, 0.5), transparent);
}

.ornament-center {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, rgba(205, 133, 63, 0.3), rgba(139, 90, 43, 0.2));
  border: 2px solid rgba(205, 133, 63, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ornament-icon { font-size: 24px; }

/* 标题区域 */
.title-section {
  margin-bottom: 28px;
}

.game-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 20px;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(0, 217, 255, 0.1));
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: 30px;
  margin-bottom: 16px;
  animation: badgePulse 2s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(168, 85, 247, 0); }
}

.badge-star { font-size: 12px; color: #a855f7; }
.badge-text { font-size: 12px; color: #a855f7; letter-spacing: 3px; }

.game-title {
  margin: 0 0 8px;
}

.title-cn {
  display: block;
  font-family: 'ZCOOL XiaoWei', 'Noto Serif SC', serif;
  font-size: 48px;
  font-weight: 700;
  background: linear-gradient(135deg, #f4d03f 0%, #fff 50%, #f4d03f 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: titleShine 3s linear infinite;
  letter-spacing: 8px;
}

.title-en {
  display: block;
  font-size: 14px;
  color: rgba(168, 85, 247, 0.7);
  letter-spacing: 4px;
  margin-top: 4px;
}

@keyframes titleShine {
  to { background-position: 200% center; }
}

.game-slogan {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  font-style: italic;
}

/* 操作展示 */
.controls-showcase {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-bottom: 24px;
}

.control-keys {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.key-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.key-btn {
  width: 40px;
  height: 40px;
  background: linear-gradient(145deg, rgba(51, 65, 85, 0.8), rgba(30, 41, 59, 0.9));
  border: 1px solid rgba(96, 165, 250, 0.25);
  border-radius: 8px;
  color: #94a3b8;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.key-sep { color: rgba(255, 255, 255, 0.3); font-size: 14px; }

.control-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

/* 游戏规则 */
.rules-panel {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 24px;
}

.rules-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 14px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

.rules-icon { font-size: 16px; }
.rules-title { letter-spacing: 2px; }

.rules-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.rule-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
}

.rule-item.correct .rule-icon { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.rule-item.wrong .rule-icon { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.rule-item.miss .rule-icon { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.rule-item.danger .rule-icon { background: rgba(239, 68, 68, 0.2); color: #f87171; }

.rule-text strong { color: #fff; }

/* 难度选择 */
.difficulty-section {
  margin-bottom: 28px;
}

.diff-label {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 12px;
  letter-spacing: 2px;
}

.diff-tabs {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.diff-tab {
  flex: 1;
  max-width: 120px;
  padding: 14px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.5);
}

.diff-tab:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-2px);
}

.diff-tab.active { color: #fff; }
.diff-tab.active.easy { background: rgba(34, 197, 94, 0.15); border-color: #4ade80; }
.diff-tab.active.medium { background: rgba(251, 191, 36, 0.15); border-color: #fbbf24; }
.diff-tab.active.hard { background: rgba(239, 68, 68, 0.15); border-color: #f87171; }

.diff-icon { font-size: 22px; }
.diff-name { font-size: 14px; font-weight: 600; }
.diff-desc { font-size: 10px; opacity: 0.6; }

/* 菜单按钮 */
.menu-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  border-radius: 16px;
  font-family: 'Noto Serif SC', serif;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
  border: none;
}

.start-btn.primary-action {
  background: linear-gradient(135deg, #f4d03f, #f39c12);
  color: #1a1035;
  box-shadow: 0 8px 30px rgba(244, 208, 63, 0.4);
}

.start-btn.primary-action:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 12px 40px rgba(244, 208, 63, 0.5);
}

.start-btn.secondary-action {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.start-btn.secondary-action:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.btn-icon { font-size: 18px; }
.btn-text { letter-spacing: 2px; }

.btn-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: btnShimmer 2s ease-in-out infinite;
}

@keyframes btnShimmer {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}

/* 底部装饰 */
.scroll-bottom-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}

.ornament-dot {
  width: 8px;
  height: 8px;
  background: rgba(205, 133, 63, 0.6);
  border-radius: 50%;
}

/* ==================== 游戏 HUD ==================== */
.game-hud {
  position: fixed;
  top: 90px;
  left: 0;
  right: 0;
  z-index: 20;
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 20px;
  background: linear-gradient(180deg, rgba(15, 10, 30, 0.95) 0%, rgba(15, 10, 30, 0.85) 100%);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(205, 133, 63, 0.15);
  box-sizing: border-box;
}

.hud-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.hud-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.hud-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hud-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* 生命值 */
.lives-container {
  display: flex;
  gap: 4px;
}

.life-orb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #60a5fa, #3b82f6, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 8px rgba(96, 165, 250, 0.5);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: lifePulse 2s ease-in-out infinite;
}

.life-orb:nth-child(2) { animation-delay: 0.2s; }
.life-orb:nth-child(3) { animation-delay: 0.4s; }
.life-orb:nth-child(4) { animation-delay: 0.6s; }
.life-orb:nth-child(5) { animation-delay: 0.8s; }

@keyframes lifePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

.life-orb.life-lost {
  background: radial-gradient(circle at 30% 30%, rgba(100, 100, 120, 0.3), rgba(60, 60, 80, 0.3));
  box-shadow: none;
  animation: none;
  opacity: 0.25;
  transform: scale(0.8);
}

.life-orb.life-losing {
  animation: lifeLose 0.5s ease-out;
}

@keyframes lifeLose {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); background: radial-gradient(circle at 30% 30%, #ef4444, #dc2626); }
  100% { transform: scale(0.8); opacity: 0.25; }
}

.life-icon {
  font-size: 12px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.9);
}

.life-lost .life-icon { color: rgba(255, 255, 255, 0.3); }

/* 等级徽章 */
.level-badge {
  padding: 4px 14px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 700;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(0, 217, 255, 0.2));
  border: 1px solid rgba(168, 85, 247, 0.3);
  color: #a855f7;
  letter-spacing: 2px;
}

/* 连击显示 */
.combo-display {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(239, 68, 68, 0.2));
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 10px;
  animation: comboBounce 0.5s ease;
}

@keyframes comboBounce {
  0% { transform: scale(0.8); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.combo-label { font-size: 10px; color: #fbbf24; }
.combo-value { font-size: 12px; font-weight: 700; color: #fbbf24; }

/* 分数 */
.score-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.score-ring {
  position: relative;
  width: 40px;
  height: 40px;
}

.score-ring svg {
  transform: rotate(-90deg);
}

.score-ring .ring-bg {
  fill: none;
  stroke: rgba(244, 208, 63, 0.15);
  stroke-width: 3;
}

.score-ring .ring-fill {
  fill: none;
  stroke: #f4d03f;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s ease;
}

.score-number {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #f4d03f;
}

.score-number.score-bounce {
  animation: scoreBounce 0.3s ease;
}

@keyframes scoreBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); color: #4ade80; }
  100% { transform: scale(1); }
}

/* 时间 */
.time-display {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.time-icon { font-size: 12px; }
.time-value { font-size: 12px; font-weight: 600; color: rgba(255, 255, 255, 0.8); }

/* ==================== Canvas ==================== */
.canvas-wrap {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  z-index: 1;
}

.game-canvas {
  border-radius: 12px;
  border: 2px solid rgba(205, 133, 63, 0.2);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(205, 133, 63, 0.1);
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 140px);
}

/* ==================== 遮罩 ==================== */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.menu-overlay {
  background: radial-gradient(ellipse at center, rgba(15, 10, 30, 0.92) 0%, rgba(8, 5, 16, 0.97) 100%);
  backdrop-filter: blur(16px);
}

.pause-overlay,
.gameover-overlay,
.review-overlay {
  background: rgba(8, 5, 16, 0.88);
  backdrop-filter: blur(16px);
}

/* ==================== 暂停面板 ==================== */
.pause-card {
  padding: 36px 44px;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.pause-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.pause-icon { font-size: 48px; }
.pause-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.pause-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.pause-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.pause-stat .stat-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.pause-stat .stat-value {
  font-size: 24px;
  font-weight: 700;
}

.pause-stat .stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.correct-stat .stat-icon { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.correct-stat .stat-value { color: #4ade80; }
.wrong-stat .stat-icon { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.wrong-stat .stat-value { color: #f87171; }
.miss-stat .stat-icon { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.miss-stat .stat-value { color: #fbbf24; }
.time-stat .stat-icon { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
.time-stat .stat-value { color: #60a5fa; }

.pause-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ==================== 游戏结束面板 ==================== */
.gameover-card {
  padding: 36px 44px;
  max-width: 440px;
  width: 90%;
  text-align: center;
}

/* 结果动画 */
.result-animation {
  margin-bottom: 20px;
}

.result-orb {
  width: 100px;
  height: 100px;
  margin: 0 auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: orbAppear 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes orbAppear {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.orb-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 4px solid;
  animation: ringRotate 3s linear infinite;
}

@keyframes ringRotate {
  to { transform: rotate(360deg); }
}

.grade-immortal { background: radial-gradient(circle, rgba(251, 191, 36, 0.4), rgba(245, 158, 11, 0.2)); }
.grade-immortal .orb-ring { border-color: #fbbf24; box-shadow: 0 0 30px rgba(251, 191, 36, 0.5); }
.grade-master { background: radial-gradient(circle, rgba(168, 85, 247, 0.4), rgba(139, 92, 246, 0.2)); }
.grade-master .orb-ring { border-color: #a855f7; box-shadow: 0 0 30px rgba(168, 85, 247, 0.5); }
.grade-expert { background: radial-gradient(circle, rgba(96, 165, 250, 0.4), rgba(59, 130, 246, 0.2)); }
.grade-expert .orb-ring { border-color: #60a5fa; box-shadow: 0 0 30px rgba(96, 165, 250, 0.5); }
.grade-talent { background: radial-gradient(circle, rgba(34, 197, 94, 0.4), rgba(22, 163, 74, 0.2)); }
.grade-talent .orb-ring { border-color: #4ade80; box-shadow: 0 0 30px rgba(34, 197, 94, 0.5); }
.grade-rookie { background: radial-gradient(circle, rgba(251, 146, 60, 0.4), rgba(249, 115, 22, 0.2)); }
.grade-rookie .orb-ring { border-color: #fb923c; box-shadow: 0 0 30px rgba(251, 146, 60, 0.5); }
.grade-novice { background: radial-gradient(circle, rgba(148, 163, 184, 0.4), rgba(100, 116, 139, 0.2)); }
.grade-novice .orb-ring { border-color: #94a3b8; box-shadow: 0 0 20px rgba(148, 163, 184, 0.3); }

.orb-text {
  font-size: 24px;
  font-weight: 900;
  color: #fff;
  z-index: 1;
  font-family: 'ZCOOL XiaoWei', serif;
}

.gameover-header {
  margin-bottom: 20px;
}

.gameover-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 6px;
}

.gameover-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

/* 统计 */
.gameover-stats {
  margin-bottom: 16px;
}

.main-stat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 16px;
  background: rgba(244, 208, 63, 0.1);
  border: 1px solid rgba(244, 208, 63, 0.2);
  border-radius: 16px;
  margin-bottom: 12px;
}

.main-icon { font-size: 28px; }

.main-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.main-value {
  font-size: 32px;
  font-weight: 800;
  color: #f4d03f;
  line-height: 1;
}

.main-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
}

.stat-box .stat-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.stat-box .stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.stat-box .stat-label {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.4);
}

.correct-icon { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.correct-stat .stat-value { color: #4ade80; }
.wrong-icon { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.wrong-stat .stat-value { color: #f87171; }
.miss-icon { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.miss-stat .stat-value { color: #fbbf24; }
.time-icon { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
.time-stat .stat-value { color: #60a5fa; }

/* 最高连击 */
.max-combo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(239, 68, 68, 0.1));
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 20px;
  margin-bottom: 20px;
}

.combo-badge { font-size: 18px; }
.combo-text { font-size: 13px; color: #fbbf24; }

.gameover-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ==================== 通用按钮 ==================== */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  border-radius: 14px;
  font-family: 'Noto Serif SC', serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: none;
}

.action-btn.primary-btn {
  background: linear-gradient(135deg, #f4d03f, #f39c12);
  color: #1a1035;
  box-shadow: 0 6px 24px rgba(244, 208, 63, 0.35);
}

.action-btn.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 32px rgba(244, 208, 63, 0.45);
}

.action-btn.review-btn {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.3), rgba(59, 130, 246, 0.2));
  color: #60a5fa;
  border: 1px solid rgba(96, 165, 250, 0.3);
}

.action-btn.review-btn:hover {
  transform: translateY(-2px);
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.4), rgba(59, 130, 246, 0.3));
}

.action-btn.error-book-btn {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.2));
  color: #4ade80;
  border: 2px solid rgba(34, 197, 94, 0.4);
}

.action-btn.error-book-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.4), rgba(22, 163, 74, 0.3));
  box-shadow: 0 8px 30px rgba(34, 197, 94, 0.3);
}

.action-btn.error-book-btn.all-added {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.15));
  border-color: rgba(34, 197, 94, 0.3);
  color: rgba(74, 222, 128, 0.6);
  cursor: default;
}

.action-btn.error-book-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-count {
  font-size: 12px;
  opacity: 0.7;
}

.action-btn.secondary-btn {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.action-btn.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.action-btn.danger-btn {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.action-btn.danger-btn:hover {
  background: rgba(239, 68, 68, 0.25);
}

/* ==================== 复盘面板 ==================== */
.review-overlay {
  align-items: flex-start;
  overflow-y: auto;
  padding: 20px;
}

.review-panel {
  padding: 28px 32px;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
}

.review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-back-btn {
  padding: 8px 16px;
  background: rgba(205, 133, 63, 0.15);
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 10px;
  color: #cd853f;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.header-back-btn:hover {
  background: rgba(205, 133, 63, 0.25);
}

.review-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.title-icon { font-size: 26px; }

.header-restart-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.header-restart-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* 一键添加按钮 */
.batch-actions {
  margin-bottom: 20px;
}

.batch-add-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.2));
  border: 2px solid rgba(34, 197, 94, 0.4);
  border-radius: 14px;
  color: #4ade80;
  font-family: 'Noto Serif SC', serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.batch-add-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.4), rgba(22, 163, 74, 0.3));
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(34, 197, 94, 0.3);
}

.batch-add-btn.all-added {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.15));
  border-color: rgba(34, 197, 94, 0.3);
  color: rgba(74, 222, 128, 0.6);
  cursor: default;
}

.batch-add-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-count {
  font-size: 12px;
  opacity: 0.7;
}

/* 加载状态 */
.review-loading {
  text-align: center;
  padding: 60px;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  margin: 0 auto 16px;
}

.spinner-ring {
  width: 100%;
  height: 100%;
  border: 4px solid rgba(205, 133, 63, 0.2);
  border-top-color: #cd853f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-text {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.6);
}

/* 无错误 */
.review-empty {
  text-align: center;
  padding: 60px 20px;
}

.empty-illustration { font-size: 72px; margin-bottom: 16px; }
.empty-title { font-size: 22px; color: #4ade80; margin: 0 0 8px; }
.empty-subtitle { font-size: 14px; color: rgba(255, 255, 255, 0.5); margin: 0; }

/* 错误列表 */
.review-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
}

.legend-icon { font-size: 16px; }

/* 错误卡片 */
.review-card-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
}

.card-item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.item-num {
  width: 28px;
  height: 28px;
  background: rgba(205, 133, 63, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #cd853f;
}

.item-badge {
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.error-badge {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.add-single-btn {
  margin-left: auto;
  padding: 6px 14px;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  color: #4ade80;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-single-btn:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.25);
}

.add-single-btn.added {
  border-color: rgba(34, 197, 94, 0.5);
  color: rgba(74, 222, 128, 0.6);
  cursor: default;
}

.add-single-btn:disabled {
  opacity: 0.7;
  cursor: default;
}

/* 诗句卷轴 */
.poem-scroll-display {
  display: flex;
  margin-bottom: 16px;
}

.scroll-roll {
  width: 16px;
  background: linear-gradient(90deg, rgba(139, 90, 43, 0.8), rgba(205, 133, 63, 1), rgba(139, 90, 43, 0.8));
  border-radius: 4px;
  flex-shrink: 0;
}

.scroll-roll.left { border-radius: 4px 0 0 4px; }
.scroll-roll.right { border-radius: 0 4px 4px 0; }

.scroll-content {
  flex: 1;
  background: linear-gradient(135deg, rgba(20, 30, 60, 0.97), rgba(15, 25, 50, 0.97));
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 14px 16px;
}

.scroll-upper {
  margin-bottom: 8px;
}

.scroll-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.scroll-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.scroll-divider {
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.2);
  margin-bottom: 10px;
  letter-spacing: 4px;
}

.scroll-answer-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.answer-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.answer-label {
  font-size: 12px;
  flex-shrink: 0;
  width: 70px;
}

.answer-text {
  font-size: 15px;
  font-weight: 600;
  font-family: 'STSong', 'SimSun', serif;
}

.wrong-text { color: #f87171; }
.correct-text { color: #4ade80; }
.ai-reason { font-size: 13px; color: #fbbf24; }

/* AI 讲解 */
.ai-explain-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.ai-block {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  padding: 12px 14px;
}

.ai-block-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.ai-icon { font-size: 14px; }
.ai-block-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
}

.ai-block-content {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin: 0;
}

.tip-content {
  color: #fbbf24;
  font-style: italic;
}

.ai-loading-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-bottom: 14px;
}

.mini-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(205, 133, 63, 0.2);
  border-top-color: #cd853f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 填空练习 */
.fill-practice-section {
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  padding-top: 12px;
}

.fill-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.fill-icon { font-size: 14px; }
.fill-title { font-size: 12px; color: #60a5fa; font-weight: 600; }

.fill-display {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
}

.fill-text {
  color: rgba(255, 255, 255, 0.7);
  font-family: 'STSong', 'SimSun', serif;
}

.fill-answer {
  color: #4ade80;
  font-weight: 700;
  font-family: 'STSong', 'SimSun', serif;
}

/* ==================== Toast ==================== */
.game-toast {
  position: fixed;
  top: 120px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 28px;
  border-radius: 50px;
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  font-weight: 600;
  z-index: 200;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
}

.game-toast.success {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(22, 163, 74, 0.95));
  color: white;
  border: 1px solid rgba(34, 197, 94, 0.5);
}

.game-toast.error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95));
  color: white;
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.game-toast.warn {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.95), rgba(245, 158, 11, 0.95));
  color: #1a1035;
  border: 1px solid rgba(251, 191, 36, 0.5);
}

.toast-icon { font-size: 16px; }
.toast-combo {
  font-size: 12px;
  opacity: 0.8;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}

/* ==================== 成功提示 ==================== */
.success-banner {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  border-radius: 50px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 10px 40px rgba(34, 197, 94, 0.4);
  z-index: 200;
}

.success-icon { font-size: 20px; }

/* ==================== 过渡动画 ==================== */
.panel-fade-enter-active {
  animation: panelIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.panel-fade-leave-active {
  animation: panelOut 0.3s ease-in;
}

@keyframes panelIn {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes panelOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}

.hud-slide-enter-active {
  animation: hudIn 0.4s ease-out;
}

@keyframes hudIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.toast-pop-enter-active {
  animation: toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-pop-leave-active {
  animation: toastOut 0.3s ease-in;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.8); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

@keyframes toastOut {
  to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
}

.success-pop-enter-active {
  animation: successIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.success-pop-leave-active {
  animation: successOut 0.3s ease-in;
}

@keyframes successIn {
  from { opacity: 0; transform: translateX(-50%) scale(0); }
  to { opacity: 1; transform: translateX(-50%) scale(1); }
}

@keyframes successOut {
  to { opacity: 0; transform: translateX(-50%) translateY(10px); }
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .menu-card { padding: 32px 24px; }
  .title-cn { font-size: 38px; letter-spacing: 4px; }
  .diff-tabs { flex-direction: column; align-items: center; }
  .diff-tab { max-width: 200px; width: 100%; }
  .rules-grid { grid-template-columns: 1fr; }
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .game-hud { padding: 10px 16px; }
  .canvas-wrap { padding: 8px 12px; }
}
</style>
