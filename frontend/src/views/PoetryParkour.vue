<template>
  <div class="parkour-wrapper" :class="{ 'game-active': gameState === 'PLAYING' || gameState === 'PAUSED' }">
    <!-- 全屏背景图 -->
    <div class="parkour-bg"></div>

    <!-- Canvas 游戏区 -->
    <div class="canvas-container" ref="containerRef">
      <canvas ref="canvasRef" class="game-canvas" />
    </div>

    <!-- 顶部游戏 HUD -->
    <div class="game-hud" v-if="gameState !== 'MENU'">
      <!-- 左侧：生命值 -->
      <div class="hud-section hud-lives">
        <div class="hud-game-name">
          <strong>诗词跑酷</strong>
          <span>辨字穿行</span>
        </div>
        <div class="hud-vitals">
          <div class="lives-container">
            <div
              v-for="i in 5"
              :key="i"
              class="life-orb"
              :class="{ 'life-lost': i > currentLives, 'life-losing': i === currentLives + 1 }"
            >
              <span class="life-icon">气</span>
            </div>
          </div>
          <span class="hud-label">元气</span>
        </div>
      </div>

      <!-- 中间：当前题目 -->
      <div class="hud-section hud-question">
        <div class="question-scroll" v-if="currentQuestion">
          <span class="scroll-deco left">〰</span>
          <span class="q-text">
            <span class="q-part">{{ currentQuestion.beforeBlank }}</span>
            <span class="blank-gap">
              <span class="blank-inner"></span>
            </span>
            <span class="q-part">{{ currentQuestion.afterBlank }}</span>
          </span>
          <span class="scroll-deco right">〰</span>
        </div>
        <div class="no-question" v-else>
          <span class="hint-text">穿越诗词方阵，收集正确答案</span>
        </div>
      </div>

      <!-- 右侧：分数和进度 -->
      <div class="hud-section hud-score">
        <div class="score-ring">
          <svg class="score-ring-svg" viewBox="0 0 60 60">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#60a5fa"/>
                <stop offset="50%" style="stop-color:#a855f7"/>
                <stop offset="100%" style="stop-color:#f472b6"/>
              </linearGradient>
            </defs>
            <circle class="ring-bg" cx="30" cy="30" r="26" />
            <circle
              class="ring-progress"
              cx="30" cy="30" r="26"
              :stroke-dasharray="`${Math.min(score / 50 * 163.36, 163.36)} 163.36`"
            />
          </svg>
          <span class="score-inner">{{ score }}</span>
        </div>
        <span class="hud-label">得分</span>
      </div>
      <button class="hud-pause-btn" type="button" aria-label="暂停游戏" @click="pauseGame">暂停</button>
    </div>

    <!-- 开始菜单 -->
    <transition name="panel-fade">
      <div v-if="gameState === 'MENU'" class="overlay-screen menu-screen">
        <!-- 装饰性卷轴 -->
        <div class="menu-scroll-ornament top"></div>
        <div class="menu-scroll-ornament bottom"></div>

        <div class="menu-card glass-panel">
          <!-- 标题区域 -->
          <div class="menu-header">
            <div class="title-badge">
              <span class="badge-icon">🎮</span>
              <span class="badge-text">全新挑战</span>
            </div>
            <h1 class="menu-title">
              <span class="title-chinese">诗词跑酷</span>
              <span class="title-english">POETRY PARKOUR</span>
            </h1>
            <p class="menu-subtitle">穿越千年诗词，邂逅文人墨客</p>
          </div>

          <!-- 左右布局内容 -->
          <div class="menu-content">
            <!-- 左侧：操作指南 -->
            <div class="menu-left">
              <div class="controls-showcase">
                <h3 class="section-title">操作指南</h3>
                <div class="control-keys">
                  <div class="key-group">
                    <div class="key-cluster">
                      <span class="key-btn">W</span>
                    </div>
                    <div class="key-cluster">
                      <span class="key-btn">A</span>
                      <span class="key-btn">S</span>
                      <span class="key-btn">D</span>
                    </div>
                  </div>
                  <div class="key-desc">
                    <span class="desc-arrow">↑</span>
                    <span class="desc-arrow">←</span>
                    <span class="desc-arrow">↓</span>
                    <span class="desc-arrow">→</span>
                  </div>
                  <div class="control-text">
                    <span>控制飞行方向</span>
                    <span>或使用方向键</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：游戏规则 -->
            <div class="menu-right">
              <div class="rules-box">
                <div class="rule-item">
                  <span class="rule-icon correct-icon">✓</span>
                  <span class="rule-text">撞击<strong>正确</strong>汉字 +1 分</span>
                </div>
                <div class="rule-item">
                  <span class="rule-icon wrong-icon">✗</span>
                  <span class="rule-text">撞击<strong>错误</strong>汉字 -1 元气</span>
                </div>
                <div class="rule-item">
                  <span class="rule-icon pass-icon">→</span>
                  <span class="rule-text">穿越方阵时注意辨别汉字</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 难度选择 -->
          <div class="difficulty-section">
            <h3 class="section-title">选择难度</h3>
            <div class="diff-tabs">
              <button
                v-for="d in difficulties"
                :key="d.value"
                :class="['diff-tab', { active: selectedDifficulty === d.value, [d.value]: true }]"
                @click="selectedDifficulty = d.value"
              >
                <span class="diff-icon">{{ d.icon }}</span>
                <span class="diff-name">{{ d.label }}</span>
                <span class="diff-desc">{{ d.desc }}</span>
              </button>
            </div>
          </div>

          <!-- 开始按钮 -->
          <div class="menu-actions">
            <button class="start-btn primary-action" @click="startGame">
              <span class="btn-icon">▶</span>
              <span class="btn-text">开始挑战</span>
              <span class="btn-shine"></span>
            </button>
            <button class="back-btn secondary-action" @click="goBack">
              <span class="btn-icon">↩</span>
              <span class="btn-text">返回首页</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 暂停遮罩 -->
    <transition name="panel-fade">
      <div v-if="gameState === 'PAUSED'" class="overlay-screen pause-screen">
        <div class="pause-card glass-panel">
          <div class="modal-header">
            <span class="modal-icon">⏸</span>
            <h2 class="modal-title">游戏暂停</h2>
          </div>

          <div class="pause-stats">
            <div class="stat-card">
              <span class="stat-icon">📊</span>
              <span class="stat-value">{{ score }}</span>
              <span class="stat-label">当前得分</span>
            </div>
            <div class="stat-card">
              <span class="stat-icon">💨</span>
              <span class="stat-value">{{ Math.floor(distance / 60) }}m</span>
              <span class="stat-label">飞行距离</span>
            </div>
            <div class="stat-card">
              <span class="stat-icon">❤️</span>
              <span class="stat-value">{{ currentLives }}</span>
              <span class="stat-label">剩余元气</span>
            </div>
          </div>

          <div class="modal-actions">
            <button class="action-btn primary-action" @click="resumeGame">
              <span class="btn-icon">▶</span>
              <span class="btn-text">继续游戏</span>
            </button>
            <button class="action-btn danger-action" @click="quitGame">
              <span class="btn-icon">✕</span>
              <span class="btn-text">退出游戏</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 游戏结束遮罩 -->
    <transition name="panel-fade">
      <div v-if="gameState === 'GAME_OVER'" class="overlay-screen gameover-screen">
        <div class="gameover-card glass-panel">
          <!-- 结束动画 -->
          <div class="result-animation">
            <div class="result-ring" :class="gradeClass">
              <span class="ring-grade">{{ gradeText }}</span>
            </div>
          </div>

          <!-- 结果展示 -->
          <div class="result-header">
            <h2 class="result-title">本轮挑战结束</h2>
            <p class="result-subtitle">你的诗词之旅暂时告一段落</p>
          </div>

          <!-- 统计数据 -->
          <div class="result-stats">
            <div class="result-stat main-stat">
              <span class="stat-icon-large">🏆</span>
              <div class="stat-content">
                <span class="stat-number">{{ score }}</span>
                <span class="stat-name">最终得分</span>
              </div>
            </div>

            <div class="result-stats-row">
              <div class="result-stat">
                <span class="stat-icon">📜</span>
                <span class="stat-value">{{ Math.floor(distance / 60) }}</span>
                <span class="stat-name">飞行距离</span>
              </div>
              <div class="result-stat correct">
                <span class="stat-icon">✓</span>
                <span class="stat-value">{{ correctHits }}</span>
                <span class="stat-name">正确撞击</span>
              </div>
              <div class="result-stat wrong">
                <span class="stat-icon">✗</span>
                <span class="stat-value">{{ wrongHits }}</span>
                <span class="stat-name">失误次数</span>
              </div>
            </div>
          </div>

          <!-- 错题汇总 (有错题时显示) -->
          <div class="wrong-summary" v-if="wrongHits > 0 && wrongQuestions.length > 0">
            <div class="summary-header">
              <span class="summary-icon">📝</span>
              <span class="summary-title">本次失误题目</span>
            </div>
            <div class="wrong-list">
              <div
                v-for="(wq, idx) in wrongQuestions.slice(0, 5)"
                :key="idx"
                class="wrong-item"
              >
                <span class="wrong-num">{{ idx + 1 }}</span>
                <span class="wrong-content">
                  {{ wq.beforeBlank }}【{{ wq.wrongChar }}】{{ wq.afterBlank }}
                </span>
                <span class="correct-answer">正确答案：{{ wq.correctChar }}</span>
              </div>
              <div v-if="wrongQuestions.length > 5" class="wrong-more">
                还有 {{ wrongQuestions.length - 5 }} 道错题...
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="modal-actions">
            <button
              class="action-btn primary-action"
              @click="addAllToErrorBook"
              :disabled="isAddingToErrorBook || wrongQuestions.length === 0"
              :class="{ 'btn-loading': isAddingToErrorBook }"
            >
              <span class="btn-icon">{{ isAddingToErrorBook ? '⏳' : '📚' }}</span>
              <span class="btn-text">
                {{ isAddingToErrorBook ? '添加中...' : '一键加入错题本' }}
              </span>
            </button>
            <button class="action-btn success-action" @click="restartGame">
              <span class="btn-icon">🔄</span>
              <span class="btn-text">再来一局</span>
            </button>
            <button class="action-btn secondary-action" @click="goBack">
              <span class="btn-icon">🏠</span>
              <span class="btn-text">返回首页</span>
            </button>
          </div>

          <!-- 添加成功提示 -->
          <transition name="success-pop">
            <div v-if="addedToErrorBook" class="success-notification">
              <span class="success-icon">✓</span>
              <span class="success-text">已成功加入错题本！</span>
            </div>
          </transition>
        </div>
      </div>
    </transition>

    <!-- Toast 通知 -->
    <transition name="toast-pop">
      <div v-if="toast.show" :class="['game-toast', toast.type]">
        <span class="toast-icon">{{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'ℹ' }}</span>
        <span class="toast-text">{{ toast.text }}</span>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import questionsData from '@/data/poetryQuestions.json';
import api, { API_BASE_URL } from '../services/api';
import scholarAvatarUrl from '@/assets/poets/unknown-scholar.png';

const FPS = 60;
const PLAYER_ACCEL = 0.32;
const PLAYER_MAX_VY = 4.5;
const PLAYER_MAX_VX = 4.5;
const PLAYER_FRICTION = 0.88;
const BASE_SPEED = 3.2;
const PLAYER_W = 44;
const PLAYER_H = 44;
const BLOCK_W_CHAR = 64;
const BLOCK_H = 56;
const BLOCK_GAP = 10;
const TOWER_MIN_BLOCKS = 3;
const TOWER_MAX_BLOCKS = 5;
const INITIAL_LIVES = 5;
const SPAWN_INTERVAL_BASE = 180;
const DIFFICULTY_SPEEDS = { easy: 0.85, medium: 1.15, hard: 1.5 };

export default {
  name: 'PoetryParkour',
  setup() {
    const router = useRouter();
    const canvasRef = ref(null);
    const containerRef = ref(null);
    const scholarAvatar = typeof Image !== 'undefined' ? new Image() : null;
    if (scholarAvatar) scholarAvatar.src = scholarAvatarUrl;

    // 游戏状态
    const gameState = ref('MENU');
    const score = ref(0);
    const currentLives = ref(INITIAL_LIVES);
    const distance = ref(0);
    const correctHits = ref(0);
    const wrongHits = ref(0);
    const currentQuestion = ref(null);
    const usedQuestionIndices = ref([]);
    const selectedDifficulty = ref('medium');
    // 去重窗口：最近 30 秒内出现过的诗题目标题（title -> 到期时间戳）
    const recentPoemTitles = ref({});

    // 错题记录
    const wrongQuestions = ref([]);
    const isAddingToErrorBook = ref(false);
    const addedToErrorBook = ref(false);

    const difficulties = [
      { value: 'easy', label: '入门', icon: '🌱', desc: '初学者' },
      { value: 'medium', label: '进阶', icon: '🌿', desc: '有基础' },
      { value: 'hard', label: '专业', icon: '🌳', desc: '诗词达人' }
    ];

    // Canvas 上下文
    let ctx = null;
    let canvas = null;
    let containerW = 0;
    let containerH = 0;
    let animFrameId = null;
    let lastTime = 0;
    let spawnTimer = 0;
    let speedMultiplier = 1;

    // 玩家对象
    const player = {
      x: 0, y: 0, vx: 0, vy: 0,
      wingAngle: 0, wingDir: 1,
      trail: [], trailTimer: 0,
      flash: 0, flashColor: '',
      pulsePhase: 0
    };

    // 障碍物数组
    let towers = [];
    const QUESTION_QUEUE_MIN = 16;
    let questionQueue = [];

    // 背景装饰
    const bgElements = [];
    const BG_COLORS = ['#f9f3e9', '#f5eedf', '#fff8f0', '#f0e8d5'];
    const DECOR_CHARS = ['诗', '词', '风', '月', '云', '山', '水', '花', '春', '秋', '雨', '雪', '鸟', '酒', '茶', '琴', '棋', '书', '画', '鹤', '松', '竹', '梅', '兰', '菊', '柳', '桃', '桂', '枫', '泉', '石', '亭', '楼', '台', '阁'];

    // 粒子效果
    let particles = [];
    // 墨迹粒子
    let inkParticles = [];

    // 按键状态
    const keys = { up: false, down: false, left: false, right: false };
    const movementCodes = {
      ArrowUp: 'up',
      KeyW: 'up',
      ArrowDown: 'down',
      KeyS: 'down',
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right'
    };
    const movementKeyFallbacks = {
      ArrowUp: 'ArrowUp', w: 'KeyW', W: 'KeyW',
      ArrowDown: 'ArrowDown', s: 'KeyS', S: 'KeyS',
      ArrowLeft: 'ArrowLeft', a: 'KeyA', A: 'KeyA',
      ArrowRight: 'ArrowRight', d: 'KeyD', D: 'KeyD'
    };
    const pressedMovementCodes = new Set();
    const syncMovementKeys = () => {
      keys.up = pressedMovementCodes.has('ArrowUp') || pressedMovementCodes.has('KeyW');
      keys.down = pressedMovementCodes.has('ArrowDown') || pressedMovementCodes.has('KeyS');
      keys.left = pressedMovementCodes.has('ArrowLeft') || pressedMovementCodes.has('KeyA');
      keys.right = pressedMovementCodes.has('ArrowRight') || pressedMovementCodes.has('KeyD');
    };
    const getMovementCode = (event) => (
      movementCodes[event.code] ? event.code : movementKeyFallbacks[event.key]
    );
    const resetKeys = () => {
      pressedMovementCodes.clear();
      keys.up = false;
      keys.down = false;
      keys.left = false;
      keys.right = false;
    };

    // Toast
    const toast = ref({ show: false, text: '', type: 'info' });
    let toastTimer = null;

    const showToast = (text, type = 'info') => {
      toast.value = { show: true, text, type };
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.value.show = false; }, 2000);
    };

    // 评级
    const gradeText = computed(() => {
      const s = score.value;
      if (s >= 50) return '诗仙';
      if (s >= 35) return '诗圣';
      if (s >= 20) return '诗豪';
      if (s >= 10) return '诗杰';
      if (s >= 5) return '诗人';
      return '初学者';
    });

    const gradeClass = computed(() => {
      const s = score.value;
      if (s >= 50) return 'grade-god';
      if (s >= 35) return 'grade-sage';
      if (s >= 20) return 'grade-hero';
      if (s >= 10) return 'grade-elite';
      if (s >= 5) return 'grade-poet';
      return 'grade-novice';
    });

    // ==================== 初始化 ====================

    const initCanvas = () => {
      canvas = canvasRef.value;
      if (!canvas) return;
      ctx = canvas.getContext('2d');
      if (!ctx.roundRect) {
        ctx.roundRect = function(x, y, w, h, r) {
          if (typeof r === 'number') r = [r, r, r, r];
          const [tl, tr, br, bl] = r;
          this.beginPath();
          this.moveTo(x + tl, y);
          this.lineTo(x + w - tr, y);
          this.quadraticCurveTo(x + w, y, x + w, y + tr);
          this.lineTo(x + w, y + h - br);
          this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
          this.lineTo(x + bl, y + h);
          this.quadraticCurveTo(x, y + h, x, y + h - bl);
          this.lineTo(x, y + tl);
          this.quadraticCurveTo(x, y, x + tl, y);
          this.closePath();
        };
      }
      resizeCanvas();
      initBackground();
      window.addEventListener('resize', resizeCanvas);
    };

    const resizeCanvas = () => {
      if (!containerRef.value || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const hadCanvasSize = containerW > 0 && containerH > 0;
      containerW = containerRef.value.clientWidth;
      containerH = containerRef.value.clientHeight;
      canvas.width = Math.round(containerW * dpr);
      canvas.height = Math.round(containerH * dpr);
      canvas.style.width = `${containerW}px`;
      canvas.style.height = `${containerH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!hadCanvasSize) {
        player.x = Math.round(containerW * 0.12);
        player.y = Math.round((containerH + 60) / 2);
      } else {
        // 窗口或应用标题栏变化时保留当前位置，只把角色收回新的有效边界。
        player.x = Math.min(Math.max(8, player.x), Math.max(8, containerW - PLAYER_W - 8));
        player.y = Math.min(Math.max(60, player.y), Math.max(60, containerH - PLAYER_H - 8));
      }
    };

    const initBackground = () => {
      bgElements.length = 0;
      for (let i = 0; i < 40; i++) {
        bgElements.push({
          x: Math.random() * containerW,
          y: Math.random() * containerH,
          char: DECOR_CHARS[Math.floor(Math.random() * DECOR_CHARS.length)],
          size: 14 + Math.random() * 14,
          alpha: 0.03 + Math.random() * 0.06,
          speed: 0.2 + Math.random() * 0.4,
          rotate: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.008,
          depth: 0.3 + Math.random() * 0.7
        });
      }
    };

    // ==================== 题目系统 ====================

    // 清理已过期的诗题目标题
    const cleanupRecentPoems = () => {
      const now = Date.now();
      const keys = Object.keys(recentPoemTitles.value);
      for (const k of keys) {
        if (now >= recentPoemTitles.value[k]) {
          delete recentPoemTitles.value[k];
        }
      }
    };

    const getNextQuestion = () => {
      const available = [];
      for (let i = 0; i < questionsData.length; i++) {
        if (usedQuestionIndices.value.includes(i)) continue;
        // 跳过 30 秒内出现过的诗
        const title = questionsData[i].title || questionsData[i].poem || '';
        if (recentPoemTitles.value[title] && Date.now() < recentPoemTitles.value[title]) continue;
        available.push(i);
      }
      if (available.length === 0) {
        // 如果所有题都用过了，清空所有窗口后重试
        usedQuestionIndices.value = [];
        recentPoemTitles.value = {};
        for (let i = 0; i < questionsData.length; i++) available.push(i);
      }
      const idx = available[Math.floor(Math.random() * available.length)];
      usedQuestionIndices.value.push(idx);
      const title = questionsData[idx].title || questionsData[idx].poem || '';
      // 设置 30 秒后过期
      recentPoemTitles.value[title] = Date.now() + 30000;
      return questionsData[idx];
    };

    const shuffleInPlace = (a) => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const buildTowerPayload = (q) => {
      const answer = (q.answer || '').trim();
      if (!answer) return null;
      const chars = [...answer];
      const validIdx = [];
      for (let i = 0; i < chars.length; i++) {
        if (/[\u4e00-\u9fff]/.test(chars[i])) validIdx.push(i);
      }
      if (!validIdx.length) return null;
      const bi = validIdx[Math.floor(Math.random() * validIdx.length)];
      const correctChar = chars[bi];

      const wrongChars = new Set();
      for (const opt of q.options || []) {
        if (!opt || opt === q.answer) continue;
        const oChars = [...opt];
        if (oChars[bi] && /[\u4e00-\u9fff]/.test(oChars[bi]) && oChars[bi] !== correctChar) {
          wrongChars.add(oChars[bi]);
        }
        for (const ch of oChars) {
          if (/[\u4e00-\u9fff]/.test(ch) && ch !== correctChar) wrongChars.add(ch);
        }
      }
      wrongChars.delete(correctChar);
      let wrongPool = [...wrongChars];
      const FALLBACK = '山水云月花春夏秋冬风雨雪霜人天地江海河湖';
      for (let fi = 0; fi < FALLBACK.length && wrongPool.length < 8; fi++) {
        const c = FALLBACK[fi];
        if (c !== correctChar && !wrongPool.includes(c)) wrongPool.push(c);
      }
      if (!wrongPool.length) {
        wrongPool = [...FALLBACK].filter((c) => c !== correctChar);
      }
      shuffleInPlace(wrongPool);

      const rawQ = (q.question || '');
      let prefix = '';
      let suffix = '';
      const BLANK_MARKER = '_____';
      if (rawQ.includes(BLANK_MARKER)) {
        const qp = rawQ.split(BLANK_MARKER);
        prefix = (qp[0] || '').trim();
        suffix = (qp[1] || '').trim();
      }
      const beforeBlank = prefix + chars.slice(0, bi).join('');
      const afterBlank = chars.slice(bi + 1).join('') + suffix;
      return { q, correctChar, wrongPool, beforeBlank, afterBlank };
    };

    const refillQuestionQueue = () => {
      let guard = 0;
      while (questionQueue.length < QUESTION_QUEUE_MIN && guard++ < 300) {
        const q = getNextQuestion();
        const p = buildTowerPayload(q);
        if (p) questionQueue.push(p);
      }
    };

    const syncHudQuestion = () => {
      const pending = towers.filter((t) => !t.passed && !t.scored);
      pending.sort((a, b) => a.x - b.x);
      if (!pending.length) {
        currentQuestion.value = null;
        return;
      }
      const playerCx = player.x + PLAYER_W / 2;
      const leftOfPlayer = pending.filter((t) => t.x + t.w / 2 < playerCx);
      let next;
      if (leftOfPlayer.length) {
        leftOfPlayer.sort((a, b) => b.x - a.x);
        next = leftOfPlayer[0];
      } else {
        next = pending[0];
      }
      currentQuestion.value = {
        beforeBlank: next.beforeBlank,
        afterBlank: next.afterBlank
      };
    };

    // ==================== 障碍物系统 ====================

    const createTower = () => {
      if (!containerH) return;
      refillQuestionQueue();
      const payload = questionQueue.shift();
      if (!payload) return;

      const speed = BASE_SPEED * speedMultiplier * DIFFICULTY_SPEEDS[selectedDifficulty.value];
      const numBlocks = TOWER_MIN_BLOCKS + Math.floor(Math.random() * (TOWER_MAX_BLOCKS - TOWER_MIN_BLOCKS + 1));
      const correctIdx = Math.floor(Math.random() * numBlocks);

      const blocks = [];
      for (let i = 0; i < numBlocks; i++) {
        const isCorrect = i === correctIdx;
        let text;
        if (isCorrect) {
          text = payload.correctChar;
        } else {
          const pool = payload.wrongPool;
          let w = pool[(i * 3 + correctIdx * 7) % pool.length];
          let tries = 0;
          while (w === payload.correctChar && tries++ < 24) {
            w = pool[Math.floor(Math.random() * pool.length)];
          }
          text = w;
        }
        blocks.push({
          text,
          isCorrect,
          h: BLOCK_H,
          w: BLOCK_W_CHAR,
          hit: false,
          glow: 0
        });
      }

      const totalH = blocks.reduce((s, b) => s + b.h + BLOCK_GAP, -BLOCK_GAP);
      const topMargin = 180;
      const bottomMargin = 15;
      const minY = topMargin;
      const maxY = containerH - totalH - bottomMargin;
      const baseY = minY + Math.random() * Math.max(0, maxY - minY);

      let curY = baseY;
      for (const block of blocks) {
        block.x = containerW + 20;
        block.y = curY;
        curY += block.h + BLOCK_GAP;
      }

      const towerW = BLOCK_W_CHAR + 16;

      towers.push({
        blocks,
        x: containerW + 20,
        y: baseY,
        w: towerW,
        totalH,
        speed,
        passed: false,
        scored: false,
        correctChar: payload.correctChar,
        beforeBlank: payload.beforeBlank,
        afterBlank: payload.afterBlank,
        // 保存原始题库题目信息用于错题本
        originalQuestion: payload.q
      });
      refillQuestionQueue();
    };

    // ==================== 碰撞检测 ====================

    const checkCollision = (px, py, pw, ph, bx, by, bw, bh) => {
      return px < bx + bw && px + pw > bx && py < by + bh && py + ph > by;
    };

    const processCollisions = () => {
      const pcx = player.x + PLAYER_W / 2;
      const pcy = player.y + PLAYER_H / 2;

      for (const tower of towers) {
        for (const block of tower.blocks) {
          if (block.hit) continue;
          const bx = block.x;
          const by = block.y;
          const bw = block.w;
          const bh = block.h;

          const inside = pcx >= bx && pcx <= bx + bw && pcy >= by && pcy <= by + bh;
          if (!inside) continue;

          block.hit = true;
          block.glow = 1;

          if (block.isCorrect) {
            if (!tower.scored) {
              tower.scored = true;
              score.value++;
              correctHits.value++;
              player.flash = 15;
              player.flashColor = 'rgba(34, 197, 94, 0.7)';
              spawnParticles(block.x + block.w / 2, block.y + block.h / 2, '#22c55e', 15);
              spawnInkSplatter(block.x + block.w / 2, block.y + block.h / 2);
              showToast('+1 诗句通达！', 'success');
            }
          } else {
            wrongHits.value++;
            currentLives.value--;

            // 记录错题
            wrongQuestions.value.push({
              beforeBlank: tower.beforeBlank,
              afterBlank: tower.afterBlank,
              correctChar: tower.correctChar,
              wrongChar: block.text,
              originalQuestion: tower.originalQuestion
            });

            player.flash = 20;
            player.flashColor = 'rgba(239, 68, 68, 0.7)';
            spawnParticles(block.x + block.w / 2, block.y + block.h / 2, '#ef4444', 10);
            showToast('-1 元气流失！', 'error');

            if (currentLives.value <= 0) {
              endGame();
            }
          }
          break;
        }
      }
    };

    // ==================== 粒子系统 ====================

    const spawnParticles = (x, y, color, count) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 1,
          decay: 0.02 + Math.random() * 0.025,
          size: 3 + Math.random() * 5,
          color,
          rotation: Math.random() * Math.PI * 2
        });
      }
    };

    const spawnInkSplatter = (x, y) => {
      for (let i = 0; i < 5; i++) {
        inkParticles.push({
          x: x + (Math.random() - 0.5) * 60,
          y: y + (Math.random() - 0.5) * 60,
          size: 8 + Math.random() * 20,
          alpha: 0.15 + Math.random() * 0.2,
          life: 1,
          decay: 0.008 + Math.random() * 0.01
        });
      }
    };

    const updateParticles = () => {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= p.decay;
        p.rotation += 0.1;
        if (p.life <= 0) particles.splice(i, 1);
      }
      for (let i = inkParticles.length - 1; i >= 0; i--) {
        const p = inkParticles[i];
        p.life -= p.decay;
        if (p.life <= 0) inkParticles.splice(i, 1);
      }
    };

    // ==================== 绘制函数 ====================

    const drawBackground = () => {
      // Canvas 覆盖整块舞台，必须每帧清空，否则半透明底色会持续叠加成深色。
      ctx.clearRect(0, 0, containerW, containerH);
      const paperGrad = ctx.createLinearGradient(0, 0, 0, containerH);
      paperGrad.addColorStop(0, 'rgba(255, 255, 255, .12)');
      paperGrad.addColorStop(0.56, 'rgba(244, 250, 246, .22)');
      paperGrad.addColorStop(1, 'rgba(225, 240, 232, .34)');
      ctx.fillStyle = paperGrad;
      ctx.fillRect(0, 0, containerW, containerH);

      // 飞行走廊只承担空间层级，不影响角色边界或障碍物位置。
      const laneTop = 126;
      const laneGrad = ctx.createLinearGradient(0, laneTop, 0, containerH);
      laneGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      laneGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
      laneGrad.addColorStop(1, 'rgba(26, 111, 94, 0.08)');
      ctx.fillStyle = laneGrad;
      ctx.fillRect(0, laneTop, containerW, containerH - laneTop);

      // 飘浮装饰字符
      ctx.font = `bold ${16}px 'STSong', 'SimSun', serif`;
      for (const el of bgElements) {
        el.x -= el.speed * speedMultiplier;
        el.rotate += el.rotSpeed;
        if (el.x < -30) {
          el.x = containerW + 30;
          el.y = Math.random() * containerH;
        }
        ctx.save();
        ctx.translate(el.x, el.y);
        ctx.rotate(el.rotate);
        ctx.globalAlpha = el.alpha * el.depth;
        ctx.fillStyle = '#b08c5c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.char, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // 墨迹粒子
      for (const p of inkParticles) {
        ctx.save();
        ctx.globalAlpha = p.alpha * p.life;
        const inkGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        inkGrad.addColorStop(0, 'rgba(30, 30, 60, 0.8)');
        inkGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = inkGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const drawPlayer = () => {
      const x = player.x;
      const y = player.y;
      const w = PLAYER_W;
      const h = PLAYER_H;

      player.pulsePhase += 0.05;

      // 拖尾
      player.trailTimer++;
      if (player.trailTimer % 2 === 0) {
        player.trail.push({ x: x + w / 2, y: y + h / 2, life: 1 });
        if (player.trail.length > 18) player.trail.shift();
      }
      for (let i = player.trail.length - 1; i >= 0; i--) {
        const t = player.trail[i];
        t.life -= 0.05;
        if (t.life <= 0) { player.trail.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = t.life * 0.3;
        const r = 10 * t.life;
        const grd = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, r);
        grd.addColorStop(0, '#2d9d8a');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);

      // 玩家光晕
      const glowSize = 1 + Math.sin(player.pulsePhase) * 0.1;
      const haloGrad = ctx.createRadialGradient(0, 0, w * 0.2, 0, 0, w * 0.8 * glowSize);
      haloGrad.addColorStop(0, 'rgba(45, 157, 138, 0.2)');
      haloGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.8 * glowSize, 0, Math.PI * 2);
      ctx.fill();

      // 翅膀动画
      player.wingAngle += 0.2 * player.wingDir;
      if (Math.abs(player.wingAngle) > 0.4) player.wingDir *= -1;

      // 受击闪烁
      if (player.flash > 0) {
        player.flash--;
        ctx.globalAlpha = player.flash % 4 < 2 ? 1 : 0.3;
        ctx.shadowColor = player.flashColor;
        ctx.shadowBlur = 35;
      }

      // 纸翼采用项目现有的玉青与暖金，替换原来的蓝色霓虹。
      ctx.save();
      ctx.rotate(player.wingAngle);
      const wingGradL = ctx.createLinearGradient(-w * 0.5, 0, 0, 0);
      wingGradL.addColorStop(0, 'rgba(176, 140, 92, 0.08)');
      wingGradL.addColorStop(1, 'rgba(255, 253, 244, 0.9)');
      ctx.fillStyle = wingGradL;
      ctx.beginPath();
      ctx.ellipse(-w * 0.46, 0, w * 0.54, h * 0.24, -0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(176, 140, 92, 0.42)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.rotate(-player.wingAngle);
      const wingGradR = ctx.createLinearGradient(0, 0, w * 0.5, 0);
      wingGradR.addColorStop(0, 'rgba(255, 253, 244, 0.9)');
      wingGradR.addColorStop(1, 'rgba(176, 140, 92, 0.08)');
      ctx.fillStyle = wingGradR;
      ctx.beginPath();
      ctx.ellipse(w * 0.46, 0, w * 0.54, h * 0.24, 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(176, 140, 92, 0.42)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 水墨书生头像。绘制范围略大于碰撞盒，碰撞中心和判定逻辑保持不变。
      const avatarR = w * 0.58;
      ctx.fillStyle = '#faf6eb';
      ctx.shadowColor = 'rgba(25, 91, 77, 0.3)';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, avatarR + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, avatarR, 0, Math.PI * 2);
      ctx.clip();
      if (scholarAvatar?.complete && scholarAvatar.naturalWidth) {
        ctx.drawImage(scholarAvatar, -avatarR, -avatarR, avatarR * 2, avatarR * 2);
      }
      ctx.restore();
      ctx.strokeStyle = '#197666';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, avatarR + 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    const drawTower = (tower) => {
      for (const block of tower.blocks) {
        const { x, y, w, h, text, hit } = block;

        ctx.save();

        const visualX = x - 4;
        const visualY = y - 2;
        const visualW = w + 8;
        const visualH = h + 4;

        // 方块光晕只标记仍可选择的字块。
        if (!hit) {
          const blockGlow = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w);
          blockGlow.addColorStop(0, 'rgba(45, 157, 138, 0.13)');
          blockGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = blockGlow;
          ctx.fillRect(x - 10, y - 10, w + 20, h + 20);
        }

        // 方块阴影
        ctx.shadowColor = 'rgba(30, 77, 65, 0.24)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 7;

        // 方块背景 - 统一样式
        let bg, border, textColor;
        if (hit) {
          bg = 'rgba(215, 232, 224, 0.62)';
          border = 'rgba(45, 121, 105, 0.42)';
          textColor = 'rgba(25, 118, 102, 0.58)';
        } else {
          const bgGrad = ctx.createLinearGradient(visualX, visualY, visualX, visualY + visualH);
          bgGrad.addColorStop(0, '#fffdf5');
          bgGrad.addColorStop(0.6, '#f5faf5');
          bgGrad.addColorStop(1, '#dcebe3');
          bg = bgGrad;
          border = '#6f998d';
          textColor = '#173f39';
        }

        ctx.fillStyle = bg;
        ctx.strokeStyle = border;
        ctx.lineWidth = 2.5;

        const radius = 13;
        ctx.beginPath();
        ctx.roundRect(visualX, visualY, visualW, visualH, radius);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // 文字
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fontSize = Math.min(31, Math.max(22, h * 0.56));
        ctx.font = `700 ${fontSize}px 'STKaiti', 'KaiTi', 'STSong', 'SimSun', serif`;
        ctx.fillText(text, x + w / 2, y + h / 2, w - 18);

        // 右下压印给字块增加实体感，不提示答案。
        if (!hit) {
          ctx.strokeStyle = 'rgba(176, 140, 92, 0.36)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(visualX + visualW - 15, visualY + visualH - 6);
          ctx.lineTo(visualX + visualW - 6, visualY + visualH - 15);
          ctx.stroke();
        }

        ctx.restore();
      }
    };

    const drawParticles = () => {
      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        // 菱形粒子
        const s = p.size * p.life;
        ctx.moveTo(0, -s);
        ctx.lineTo(s, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    };

    // ==================== 游戏主循环 ====================

    const gameLoop = (timestamp) => {
      if (gameState.value !== 'PLAYING') return;

      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;

      const speed = BASE_SPEED * speedMultiplier * DIFFICULTY_SPEEDS[selectedDifficulty.value];

      // 角色速度更新
      const verticalInput = Number(keys.down) - Number(keys.up);
      if (verticalInput !== 0) {
        player.vy += verticalInput * PLAYER_ACCEL;
      } else {
        player.vy *= PLAYER_FRICTION;
      }
      player.vy = Math.max(-PLAYER_MAX_VY, Math.min(PLAYER_MAX_VY, player.vy));
      if (Math.abs(player.vy) < 0.05) player.vy = 0;
      player.y += player.vy;

      const horizontalInput = Number(keys.right) - Number(keys.left);
      if (horizontalInput !== 0) {
        player.vx += horizontalInput * PLAYER_ACCEL;
      } else {
        player.vx *= PLAYER_FRICTION;
      }
      player.vx = Math.max(-PLAYER_MAX_VX, Math.min(PLAYER_MAX_VX, player.vx));
      if (Math.abs(player.vx) < 0.05) player.vx = 0;
      player.x += player.vx;

      // 边界
      const topMargin = 60;
      const margin = 8;
      if (player.y < topMargin) {
        player.y = topMargin;
        player.vy = Math.abs(player.vy) * 0.4;
      }
      if (player.y + PLAYER_H > containerH - margin) {
        player.y = containerH - PLAYER_H - margin;
        player.vy = -Math.abs(player.vy) * 0.4;
      }
      if (player.x < margin) {
        player.x = margin;
        player.vx = Math.abs(player.vx) * 0.4;
      }
      if (player.x + PLAYER_W > containerW - margin) {
        player.x = containerW - PLAYER_W - margin;
        player.vx = -Math.abs(player.vx) * 0.4;
      }

      // 更新障碍物
      spawnTimer += dt;
      const spawnInterval = SPAWN_INTERVAL_BASE / FPS / speedMultiplier;
      if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        createTower();
      }

      for (let i = towers.length - 1; i >= 0; i--) {
        const tower = towers[i];
        tower.x -= speed;
        for (const block of tower.blocks) {
          block.x = tower.x;
        }

        if (!tower.passed && tower.x + tower.w < player.x) {
          tower.passed = true;
        }

        if (tower.x < -tower.w - 40) {
          towers.splice(i, 1);
        }
      }

      // 碰撞检测
      processCollisions();
      syncHudQuestion();

      // 粒子
      updateParticles();

      // 距离递增
      distance.value += dt * 60;
      speedMultiplier = 1 + distance.value / 5000;
      if (speedMultiplier > 1.55) speedMultiplier = 1.55;

      // 清理已过期的诗题目标题（每帧最多清理一次）
      cleanupRecentPoems();

      // 绘制
      drawBackground();

      for (const tower of towers) drawTower(tower);

      drawParticles();
      drawPlayer();

      animFrameId = requestAnimationFrame(gameLoop);
    };

    // ==================== 游戏控制 ====================

    const startGame = () => {
      resetKeys();
      score.value = 0;
      currentLives.value = INITIAL_LIVES;
      distance.value = 0;
      correctHits.value = 0;
      wrongHits.value = 0;
      usedQuestionIndices.value = [];
      recentPoemTitles.value = {};
      wrongQuestions.value = [];
      addedToErrorBook.value = false;
      speedMultiplier = 1;
      spawnTimer = 0;
      towers = [];
      particles = [];
      inkParticles = [];
      questionQueue = [];
      player.trail = [];
      player.x = Math.round(containerW * 0.12);
      player.y = (containerH + 60) / 2;
      player.vx = 0;
      player.vy = 0;
      player.flash = 0;
      currentQuestion.value = null;
      refillQuestionQueue();
      createTower();
      syncHudQuestion();

      gameState.value = 'PLAYING';
      lastTime = performance.now();
      animFrameId = requestAnimationFrame(gameLoop);
    };

    const pauseGame = () => {
      if (gameState.value !== 'PLAYING') return;
      resetKeys();
      gameState.value = 'PAUSED';
      cancelAnimationFrame(animFrameId);
    };

    const resumeGame = () => {
      if (gameState.value !== 'PAUSED') return;
      resetKeys();
      gameState.value = 'PLAYING';
      lastTime = performance.now();
      animFrameId = requestAnimationFrame(gameLoop);
    };

    const endGame = () => {
      resetKeys();
      gameState.value = 'GAME_OVER';
      cancelAnimationFrame(animFrameId);
      drawBackground();
      for (const tower of towers) drawTower(tower);
      drawPlayer();
    };

    const restartGame = () => {
      startGame();
    };

    const quitGame = () => {
      resetKeys();
      gameState.value = 'MENU';
      cancelAnimationFrame(animFrameId);
      towers = [];
      particles = [];
      inkParticles = [];
      questionQueue = [];
      drawBackground();
    };

    const goBack = () => {
      resetKeys();
      cancelAnimationFrame(animFrameId);
      router.push('/');
    };

    // ==================== 错题本功能 ====================

    const addAllToErrorBook = async () => {
      if (wrongQuestions.value.length === 0) {
        showToast('没有错题需要添加', 'info');
        return;
      }

      isAddingToErrorBook.value = true;
      addedToErrorBook.value = false;

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          showToast('请先登录后再添加错题', 'error');
          return;
        }

        const apiBaseUrl = API_BASE_URL;

        let successCount = 0;
        let failedCount = 0;

        for (const wq of wrongQuestions.value) {
          const questionContent = `${wq.beforeBlank}【】${wq.afterBlank}`;

          try {
            const response = await fetch(`${apiBaseUrl}/wrong-questions/add`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                question: questionContent,
                answer: wq.correctChar,
                user_answer: wq.wrongChar,
                level: 1,
                full_poem: '',
                author: wq.originalQuestion?.author || '',
                title: wq.originalQuestion?.poem || wq.originalQuestion?.title || '',
                source: 'parkour'
              })
            });

            const result = await response.json();
            if (response.ok && result?.id) {
              successCount++;
            } else {
              failedCount++;
              console.error('添加错题失败:', result);
            }
          } catch (e) {
            failedCount++;
            console.error('添加错题失败:', e);
          }
        }

        if (successCount > 0) {
          addedToErrorBook.value = true;
          showToast(
            failedCount > 0
              ? `已添加 ${successCount} 道，${failedCount} 道失败，请重试`
              : `已成功添加 ${successCount} 道错题到错题本！`,
            failedCount > 0 ? 'warn' : 'success'
          );
        } else {
          showToast('错题添加失败，请重试', 'error');
        }

        setTimeout(() => {
          addedToErrorBook.value = false;
        }, 3000);

      } catch (error) {
        console.error('添加错题失败:', error);
        showToast('添加错题失败，请重试', 'error');
      } finally {
        isAddingToErrorBook.value = false;
      }
    };

    // ==================== 键盘事件 ====================

    const handleKeyDown = (e) => {
      const movementCode = getMovementCode(e);
      if (movementCode && gameState.value === 'PLAYING') {
        pressedMovementCodes.add(movementCode);
        syncMovementKeys();
        e.preventDefault();
        return;
      }
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (gameState.value === 'PLAYING') pauseGame();
        else if (gameState.value === 'PAUSED') resumeGame();
      }
      if ((e.key === ' ' || e.key === 'Enter') && gameState.value === 'MENU') startGame();
    };

    const handleKeyUp = (e) => {
      const movementCode = getMovementCode(e);
      if (!movementCode) return;
      pressedMovementCodes.delete(movementCode);
      syncMovementKeys();
      if (gameState.value === 'PLAYING') e.preventDefault();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) resetKeys();
    };

    // ==================== 生命周期 ====================

    onMounted(() => {
      initCanvas();
      // 捕获阶段接管游戏方向键，避免按钮焦点、输入法或页面滚动中途吞掉某个轴。
      window.addEventListener('keydown', handleKeyDown, true);
      window.addEventListener('keyup', handleKeyUp, true);
      window.addEventListener('blur', resetKeys);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    });

    onUnmounted(() => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resizeCanvas);
      resetKeys();
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', resetKeys);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (toastTimer) clearTimeout(toastTimer);
    });

    return {
      canvasRef, containerRef,
      gameState, score, currentLives, currentQuestion,
      distance, correctHits, wrongHits,
      selectedDifficulty, difficulties,
      toast, gradeText, gradeClass,
      wrongQuestions, isAddingToErrorBook, addedToErrorBook,
      startGame, pauseGame, resumeGame, restartGame, quitGame, goBack,
      addAllToErrorBook
    };
  }
};
</script>

<style scoped>

/* ==================== 基础布局 ==================== */
.parkour-wrapper {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

/* ==================== 全屏背景图 ==================== */
.parkour-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('/run.jpg');
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  z-index: 0;
}

/* ==================== 游戏 HUD ==================== */
.game-hud {
  position: fixed;
  top: 100px;
  left: 10px;
  right: 10px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: linear-gradient(180deg, rgba(15, 15, 35, 0.8) 0%, rgba(15, 15, 35, 0.6) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(96, 165, 250, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.hud-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hud-label {
  font-size: 11px;
  color: rgba(200, 220, 255, 0.95);
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 500;
}

/* 生命值 */
.hud-lives {
  align-items: flex-start;
  min-width: 150px;
}

.lives-container {
  display: flex;
  gap: 6px;
}

.life-orb {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #60a5fa, #3b82f6, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(96, 165, 250, 0.5), inset 0 -2px 4px rgba(0,0,0,0.3);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: lifePulse 2s ease-in-out infinite;
}

.life-orb:nth-child(2) { animation-delay: 0.2s; }
.life-orb:nth-child(3) { animation-delay: 0.4s; }
.life-orb:nth-child(4) { animation-delay: 0.6s; }
.life-orb:nth-child(5) { animation-delay: 0.8s; }

@keyframes lifePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.life-orb.life-lost {
  background: radial-gradient(circle at 30% 30%, rgba(100, 100, 120, 0.3), rgba(60, 60, 80, 0.3));
  box-shadow: none;
  animation: none;
  opacity: 0.3;
  transform: scale(0.85);
}

.life-orb.life-losing {
  animation: lifeLose 0.5s ease-out;
}

@keyframes lifeLose {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); background: radial-gradient(circle at 30% 30%, #ef4444, #dc2626); }
  100% { transform: scale(0.85); opacity: 0.3; }
}

.life-icon {
  font-size: 14px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.life-lost .life-icon { color: rgba(255, 255, 255, 0.3); }

/* 当前题目 */
.hud-question {
  flex: 1;
  align-items: center;
  max-width: 600px;
}

.question-scroll {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 40px;
  padding: 8px 18px;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.05);
}

.scroll-deco {
  color: rgba(200, 220, 255, 0.8);
  font-size: 16px;
  animation: scrollWave 1.5s ease-in-out infinite;
}

.scroll-deco.left { animation-delay: 0s; }
.scroll-deco.right { animation-delay: 0.75s; }

@keyframes scrollWave {
  0%, 100% { opacity: 0.4; transform: translateX(0); }
  50% { opacity: 0.8; transform: translateX(2px); }
}

.q-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 18px;
  color: #ffffff;
}

.q-part {
  color: rgba(240, 248, 255, 0.98);
  font-weight: 500;
  letter-spacing: 1px;
}

.blank-gap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5em;
  position: relative;
}

.blank-inner {
  width: 2em;
  height: 1.4em;
  border-bottom: 3px solid #60a5fa;
  animation: blankGlow 1.5s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(96, 165, 250, 0.4);
}

@keyframes blankGlow {
  0%, 100% { border-color: rgba(96, 165, 250, 0.6); box-shadow: 0 0 6px rgba(96, 165, 250, 0.3); }
  50% { border-color: #60a5fa; box-shadow: 0 0 12px rgba(96, 165, 250, 0.6); }
}

.no-question {
  padding: 10px 24px;
}

.hint-text {
  color: rgba(200, 220, 255, 0.85);
  font-size: 14px;
  font-style: italic;
}

/* 分数环 */
.hud-score {
  min-width: 80px;
  align-items: center;
}

.score-ring {
  position: relative;
  width: 44px;
  height: 44px;
}

.score-ring-svg {
  transform: rotate(-90deg);
}

.score-ring-svg .ring-bg {
  fill: none;
  stroke: rgba(96, 165, 250, 0.15);
  stroke-width: 4;
}

.score-ring-svg .ring-progress {
  fill: none;
  stroke: url(#scoreGradient);
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s ease-out;
}

.score-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 16px;
  font-weight: 700;
  color: rgba(200, 220, 255, 0.95);
  text-shadow: 0 0 10px rgba(150, 180, 220, 0.5);
}

/* ==================== Canvas ==================== */
.canvas-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* ==================== 通用玻璃面板 ==================== */
.glass-panel {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 32px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(96, 165, 250, 0.1), inset 0 1px 0 rgba(255,255,255,0.05);
  position: relative;
  overflow: hidden;
}

.glass-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.4), transparent);
}

/* ==================== 遮罩层 ==================== */
.overlay-screen {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, rgba(15, 15, 35, 0.88) 0%, rgba(10, 10, 25, 0.95) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 20px;
}

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

/* ==================== 开始菜单 ==================== */
.menu-card {
  padding: 40px 48px;
  max-width: 90vw;
  width: 100%;
  max-width: 800px;
  text-align: center;
  box-sizing: border-box;
}

/* 左右布局内容 */
.menu-content {
  display: flex;
  gap: 30px;
  margin: 20px 0 10px 0;
  align-items: center;
}

.menu-left,
.menu-right {
  flex: 1;
}

@media (max-width: 768px) {
  .menu-content {
    flex-direction: column;
    gap: 20px;
  }
  
  .menu-card {
    max-width: 95vw;
    padding: 30px 24px;
  }
}

.menu-scroll-ornament {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.4), transparent);
}

.menu-scroll-ornament.top { top: 20px; }
.menu-scroll-ornament.bottom { bottom: 20px; }

.menu-header {
  margin-bottom: 20px;
}

.title-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 18px;
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(59, 130, 246, 0.1));
  border: 1px solid rgba(96, 165, 250, 0.3);
  border-radius: 30px;
  margin-bottom: 20px;
  animation: badgePulse 2s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(96, 165, 250, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(96, 165, 250, 0); }
}

.badge-icon { font-size: 16px; }
.badge-text { font-size: 12px; color: rgba(200, 220, 255, 0.95); font-weight: 500; letter-spacing: 2px; text-transform: uppercase; }

.menu-title {
  margin: 0 0 12px;
}

.title-chinese {
  display: block;
  font-family: 'ZCOOL XiaoWei', 'Noto Serif SC', serif;
  font-size: 52px;
  font-weight: 700;
  background: linear-gradient(135deg, #f1f5f9 0%, #93c5fd 50%, #f1f5f9 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: titleShine 3s linear infinite;
  letter-spacing: 8px;
}

@keyframes titleShine {
  to { background-position: 200% center; }
}

.title-english {
  display: block;
  font-size: 12px;
  color: rgba(200, 220, 255, 0.75);
  letter-spacing: 6px;
  margin-top: 8px;
  font-weight: 400;
}

.menu-subtitle {
  color: rgba(200, 220, 255, 0.9);
  font-size: 15px;
  margin: 0;
  font-style: italic;
}

/* 操作展示 */
.controls-showcase {
  margin-bottom: 24px;
}

.section-title {
  font-size: 13px;
  color: rgba(200, 220, 255, 0.85);
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-bottom: 16px;
  font-weight: 500;
}

.control-keys {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.key-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.key-cluster {
  display: flex;
  gap: 6px;
}

.key-btn {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, rgba(80, 100, 130, 0.8), rgba(60, 80, 110, 0.9));
  border: 1px solid rgba(150, 180, 220, 0.3);
  border-radius: 8px;
  color: rgba(200, 220, 255, 0.9);
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
  transition: all 0.2s;
}

.key-btn:hover {
  background: linear-gradient(145deg, rgba(100, 120, 150, 0.85), rgba(80, 100, 130, 0.95));
  border-color: rgba(180, 200, 240, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.key-desc {
  display: flex;
  gap: 8px;
}

.desc-arrow {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(100, 140, 200, 0.25);
  border: 1px solid rgba(150, 180, 220, 0.35);
  border-radius: 6px;
  color: rgba(200, 220, 255, 0.9);
  font-size: 12px;
}

.control-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: rgba(200, 220, 255, 0.85);
  font-size: 12px;
}

/* 游戏规则 */
.rules-box {
  background: rgba(50, 70, 100, 0.5);
  border: 1px solid rgba(150, 180, 220, 0.2);
  border-radius: 16px;
  padding: 18px 20px;
  margin-bottom: 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: rgba(200, 220, 255, 0.9);
}

.rule-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.correct-icon { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.wrong-icon { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.pass-icon { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }

.rule-text { text-align: left; }
.rule-text strong { color: #e2e8f0; font-weight: 600; }

/* 难度选择 */
.difficulty-section { margin-bottom: 32px; }

.diff-tabs {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.diff-tab {
  flex: 1;
  max-width: 140px;
  padding: 14px 12px;
  background: rgba(50, 70, 100, 0.5);
  border: 2px solid rgba(150, 180, 220, 0.2);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(180, 200, 230, 0.85);
}

.diff-tab:hover {
  background: rgba(80, 100, 130, 0.7);
  border-color: rgba(150, 180, 220, 0.35);
  transform: translateY(-3px);
}

.diff-tab.active { color: #f1f5f9; }

.diff-tab.active.easy { background: rgba(34, 197, 94, 0.15); border-color: #22c55e; }
.diff-tab.active.medium { background: rgba(96, 165, 250, 0.15); border-color: #60a5fa; }
.diff-tab.active.hard { background: rgba(168, 85, 247, 0.15); border-color: #a855f7; }

.diff-icon { font-size: 22px; }
.diff-name { font-size: 15px; font-weight: 600; color: rgba(200, 220, 255, 0.95); }
.diff-desc { font-size: 11px; color: rgba(180, 200, 230, 0.7); }

/* 菜单按钮 */
.menu-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn, .start-btn, .back-btn {
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

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.btn-icon { font-size: 18px; }
.btn-text { letter-spacing: 2px; }
.btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: btnShine 2s ease-in-out infinite;
}

@keyframes btnShine {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}

.primary-action {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.4);
}

.primary-action:hover:not(:disabled) {
  background: linear-gradient(135deg, #60a5fa, #3b82f6);
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(59, 130, 246, 0.5);
}

.success-action {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  box-shadow: 0 8px 30px rgba(34, 197, 94, 0.3);
}

.success-action:hover:not(:disabled) {
  background: linear-gradient(135deg, #4ade80, #22c55e);
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(34, 197, 94, 0.4);
}

.secondary-action {
  background: rgba(80, 100, 130, 0.5);
  color: rgba(200, 220, 255, 0.9);
  border: 1px solid rgba(150, 180, 220, 0.3);
}

.secondary-action:hover:not(:disabled) {
  background: rgba(100, 120, 150, 0.6);
  color: rgba(230, 240, 255, 1);
  border-color: rgba(180, 200, 240, 0.5);
  transform: translateY(-3px);
}

.danger-action {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.danger-action:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.25);
  color: #fecaca;
  border-color: rgba(239, 68, 68, 0.5);
  transform: translateY(-3px);
}

.btn-loading { pointer-events: none; }
.btn-loading .btn-icon { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ==================== 暂停面板 ==================== */
.pause-card {
  padding: 40px 44px;
  max-width: 420px;
  width: 90%;
  text-align: center;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-bottom: 28px;
}

.modal-icon { font-size: 36px; }
.modal-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  color: #f1f5f9;
  margin: 0;
  font-weight: 700;
}

.pause-stats {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 28px;
}

.stat-card {
  flex: 1;
  max-width: 110px;
  background: rgba(50, 70, 100, 0.6);
  border: 1px solid rgba(150, 180, 220, 0.2);
  border-radius: 16px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.stat-icon { font-size: 20px; }
.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: rgba(200, 220, 255, 0.95);
}
.stat-label { font-size: 11px; color: rgba(200, 220, 255, 0.85); }

.modal-actions { display: flex; flex-direction: column; gap: 8px; }

/* ==================== 游戏结束面板 ==================== */
.gameover-card {
  padding: 24px 32px;
  max-width: 480px;
  width: 90%;
  text-align: center;
  position: relative;
}

/* 结果动画环 */
.result-animation {
  margin-bottom: 24px;
}

.result-ring {
  width: 90px;
  height: 90px;
  margin: 0 auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: ringAppear 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes ringAppear {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.result-ring::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 4px solid;
  animation: ringRotate 3s linear infinite;
}

.result-ring::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  backdrop-filter: blur(10px);
}

.grade-god { background: radial-gradient(circle, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.1)); }
.grade-god::before { border-color: #fbbf24; box-shadow: 0 0 20px rgba(251, 191, 36, 0.5); }
.grade-sage { background: radial-gradient(circle, rgba(168, 85, 247, 0.3), rgba(139, 92, 246, 0.1)); }
.grade-sage::before { border-color: #a855f7; box-shadow: 0 0 20px rgba(168, 85, 247, 0.5); }
.grade-hero { background: radial-gradient(circle, rgba(96, 165, 250, 0.3), rgba(59, 130, 246, 0.1)); }
.grade-hero::before { border-color: #60a5fa; box-shadow: 0 0 20px rgba(96, 165, 250, 0.5); }
.grade-elite { background: radial-gradient(circle, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.1)); }
.grade-elite::before { border-color: #22c55e; box-shadow: 0 0 20px rgba(34, 197, 94, 0.5); }
.grade-poet { background: radial-gradient(circle, rgba(251, 146, 60, 0.3), rgba(249, 115, 22, 0.1)); }
.grade-poet::before { border-color: #fb923c; box-shadow: 0 0 20px rgba(251, 146, 60, 0.5); }
.grade-novice { background: radial-gradient(circle, rgba(180, 195, 215, 0.35), rgba(150, 165, 185, 0.15)); }
.grade-novice::before { border-color: rgba(200, 215, 235, 0.8); box-shadow: 0 0 20px rgba(180, 195, 215, 0.4); }

@keyframes ringRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.ring-grade {
  font-size: 22px;
  font-weight: 900;
  color: white;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
  z-index: 1;
  font-family: 'ZCOOL XiaoWei', 'Noto Serif SC', serif;
}

.result-header { margin-bottom: 24px; }

.result-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 20px;
  color: #f1f5f9;
  margin: 0 0 8px;
  font-weight: 700;
}

.result-subtitle {
  color: rgba(200, 220, 255, 0.85);
  font-size: 12px;
  margin: 0;
}

/* 统计 */
.result-stats {
  margin-bottom: 16px;
}

.result-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(50, 70, 100, 0.5);
  border: 1px solid rgba(150, 180, 220, 0.15);
  border-radius: 10px;
  margin-bottom: 8px;
}

.result-stat.main-stat {
  justify-content: center;
  background: rgba(100, 140, 200, 0.2);
  border-color: rgba(180, 200, 240, 0.3);
  margin-bottom: 12px;
}

.stat-icon-large { font-size: 24px; }

.stat-content { display: flex; flex-direction: column; align-items: center; }
.stat-number { font-size: 28px; font-weight: 800; color: rgba(200, 220, 255, 0.95); line-height: 1; }
.stat-name { font-size: 10px; color: rgba(200, 220, 255, 0.75); margin-top: 2px; }

.result-stats-row {
  display: flex;
  gap: 10px;
}

.result-stats-row .result-stat {
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 0;
}

.result-stats-row .stat-icon { font-size: 16px; }
.result-stats-row .stat-value { font-size: 20px; font-weight: 700; color: rgba(200, 220, 255, 0.95); }
.result-stats-row .stat-name { font-size: 10px; color: rgba(200, 220, 255, 0.85); }

.result-stat.correct .stat-value { color: #22c55e; }
.result-stat.wrong .stat-value { color: #ef4444; }

/* 错题汇总 */
.wrong-summary {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
  text-align: left;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.summary-icon { font-size: 14px; }
.summary-title { font-size: 12px; color: rgba(250, 180, 180, 0.95); font-weight: 600; }

.wrong-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 120px;
  overflow-y: auto;
}

.wrong-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(50, 70, 100, 0.5);
  border-radius: 6px;
  font-size: 11px;
}

.wrong-num {
  width: 18px;
  height: 18px;
  background: rgba(239, 68, 68, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: rgba(255, 220, 220, 0.95);
  flex-shrink: 0;
}

.wrong-content { flex: 1; color: rgba(220, 235, 255, 0.95); }
.correct-answer { color: rgba(180, 255, 200, 0.95); font-size: 11px; flex-shrink: 0; }
.wrong-more { text-align: center; color: rgba(200, 220, 255, 0.7); font-size: 11px; padding: 4px; }

/* 成功通知 */
.success-notification {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  border-radius: 50px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 8px 30px rgba(34, 197, 94, 0.4);
  animation: successBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes successBounce {
  from { transform: translateX(-50%) scale(0); opacity: 0; }
  to { transform: translateX(-50%) scale(1); opacity: 1; }
}

.success-icon { font-size: 18px; }

.success-pop-enter-active { animation: successBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.success-pop-leave-active { animation: successFade 0.3s ease-in forwards; }
@keyframes successFade { to { opacity: 0; transform: translateX(-50%) translateY(10px); } }

/* ==================== Toast ==================== */
.game-toast {
  position: fixed;
  top: 190px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 28px;
  border-radius: 50px;
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  font-weight: 600;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
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
.game-toast.info {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.95), rgba(59, 130, 246, 0.95));
  color: white;
  border: 1px solid rgba(96, 165, 250, 0.5);
}

.toast-icon { font-size: 16px; }
.toast-text { letter-spacing: 1px; }

.toast-pop-enter-active { animation: toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-pop-leave-active { animation: toastOut 0.3s ease-in; }
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.8); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes toastOut {
  to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
}

/* ==================== 响应式 ==================== */
@media (max-width: 600px) {
  .menu-card { padding: 32px 24px; }
  .title-chinese { font-size: 38px; letter-spacing: 4px; }
  .diff-tabs { flex-direction: column; align-items: center; }
  .diff-tab { max-width: 200px; width: 100%; }
  .pause-stats { flex-direction: column; }
  .stat-card { max-width: none; }
  .result-stats-row { flex-direction: column; }
  .gameover-card { padding: 28px 20px; }
  .game-hud { padding: 12px 16px; }
  .question-scroll { padding: 8px 16px; }
  .q-text { font-size: 15px; }
  .lives-container { gap: 4px; }
  .life-orb { width: 26px; height: 26px; }
  .life-icon { font-size: 11px; }
  .score-ring { width: 44px; height: 44px; }
  .score-inner { font-size: 16px; }
}
</style>
