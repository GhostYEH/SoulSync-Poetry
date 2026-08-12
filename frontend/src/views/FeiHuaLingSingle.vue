<template>
  <div class="feihua-page" :class="{ 'bg-loaded': bgLoaded }">
    <!-- 背景效果 -->
    <div class="feihua-bg">
      <div class="bg-gradient"></div>
      <div class="bg-particles">
        <span v-for="n in 20" :key="n" class="particle" :style="getParticleStyle(n)"></span>
      </div>
      <div class="floating-petals">
        <span v-for="i in 15" :key="i" class="petal" :style="getPetalStyle(i)">🌸</span>
      </div>
      <div class="floating-chars">
        <span v-for="(char, i) in floatingChars" :key="i" class="float-char" :style="char.style">{{ char.text }}</span>
      </div>
    </div>

    <!-- 主容器 -->
    <div class="feihua-container">

      <!-- ===== 顶部标题区 ===== -->
      <transition name="fade-scale" mode="out-in">
        <div v-if="!gameStarted" class="hero-section">
          <div class="hero-badge">
            <span class="badge-star">✦</span>
            <span class="badge-text">飞花令</span>
            <span class="badge-star">✦</span>
          </div>
          <h1 class="hero-title">
            <span class="title-cn">诗词飞花令</span>
            <span class="title-en">LITERARY CHALLENGE</span>
          </h1>
          <p class="hero-subtitle">以诗会友，飞花传韵</p>
        </div>
      </transition>

      <!-- ===== 模式选择 ===== -->
      <transition name="fade-scale" mode="out-in">
        <div class="mode-section" v-if="!gameStarted && !inSetup">
          <div class="section-header">
            <span class="section-icon">🎯</span>
            <h2 class="section-title">选择挑战模式</h2>
          </div>
          <div class="mode-grid">
            <div 
              v-for="(mode, idx) in gameModes" 
              :key="mode.id"
              class="ios26-card mode-card"
              :class="{ active: selectedMode === mode.id }"
              :style="{ animationDelay: `${idx * 0.12}s` }"
              @click="selectedMode = mode.id"
            >
              <div class="card-liquid-border"></div>
              <div class="card-liquid-shine"></div>
              <div class="card-content">
                <div class="mode-icon-wrap">
                  <span class="mode-icon">{{ mode.icon }}</span>
                  <div class="mode-icon-glow"></div>
                </div>
                <h3 class="mode-name">{{ mode.name }}</h3>
                <p class="mode-desc">{{ mode.desc }}</p>
                <div class="mode-stats">
                  <span class="mode-stat">
                    <span class="stat-dot" :style="{ background: mode.color }"></span>
                    <span class="stat-text">{{ mode.difficulty }}</span>
                  </span>
                  <span class="mode-stat">
                    <span class="stat-icon-sm">⏱</span>
                    <span class="stat-text">{{ mode.time }}秒</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="action-row">
            <button class="ios26-btn primary-btn next-step-btn" @click="goToSetup">
              <span class="btn-icon">→</span>
              <span>选择令字</span>
            </button>
          </div>
        </div>
      </transition>

      <!-- ===== 令字选择 ===== -->
      <transition name="fade-slide" mode="out-in">
        <div class="keyword-section" v-if="inSetup && !gameStarted">
          <button class="back-btn ios26-btn secondary-btn" @click="backToMode">
            <span class="btn-icon">←</span>
            <span>返回</span>
          </button>
          
          <div class="section-header">
            <span class="section-icon">🎴</span>
            <h2 class="section-title">选择令字</h2>
            <span class="keyword-hint">选择一个关键字，说出含此字的诗句</span>
          </div>

          <!-- 热门令字 -->
          <div class="keyword-category">
            <h3 class="category-title">
              <span class="category-icon">🔥</span>
              <span>热门令字</span>
              <span class="category-count">{{ hotKeywords.length }}个</span>
            </h3>
            <div class="keyword-grid">
              <button 
                v-for="kw in hotKeywords" 
                :key="kw.char"
                class="ios26-card keyword-btn"
                :class="{ active: selectedKeyword === kw.char }"
                @click="selectKeyword(kw.char)"
              >
                <div class="card-liquid-border"></div>
                <div class="card-liquid-shine"></div>
                <div class="card-content">
                  <span class="kw-char">{{ kw.char }}</span>
                  <span class="kw-count">{{ kw.count }}句</span>
                  <div class="kw-glow"></div>
                </div>
              </button>
            </div>
          </div>

          <!-- 更多令字 -->
          <div class="keyword-category">
            <h3 class="category-title">
              <span class="category-icon">✨</span>
              <span>更多令字</span>
            </h3>
            <div class="keyword-grid">
              <button 
                v-for="char in moreKeywords" 
                :key="char"
                class="ios26-card keyword-btn small"
                :class="{ active: selectedKeyword === char }"
                @click="selectKeyword(char)"
              >
                <div class="card-liquid-border"></div>
                <div class="card-liquid-shine"></div>
                <div class="card-content">
                  <span class="kw-char">{{ char }}</span>
                </div>
              </button>
            </div>
          </div>

          <div class="action-row">
            <button class="ios26-btn random-btn" @click="randomKeyword">
              <span class="btn-icon">🎲</span>
              <span>随机令字</span>
            </button>
          </div>

          <div class="action-row">
            <button class="ios26-btn primary-btn start-game-btn" @click="startGame" :disabled="!selectedKeyword">
              <span class="btn-icon">▶</span>
              <span>开始挑战</span>
            </button>
          </div>
        </div>
      </transition>

      <!-- ===== 游戏界面 ===== -->
      <transition name="fade-scale" mode="out-in">
        <div class="game-section" v-if="gameStarted">

          <!-- 游戏HUD -->
          <div class="game-hud">
            <div class="hud-left">
              <div class="hud-badge">
                <span class="badge-icon">🎴</span>
                <span class="badge-keyword">{{ currentKeyword }}</span>
              </div>
              <div class="hud-round">
                <span class="round-label">第</span>
                <span class="round-num">{{ roundNumber }}</span>
                <span class="round-label">回合</span>
              </div>
            </div>
            
            <div class="hud-center">
              <div class="score-display">
                <span class="score-icon">⭐</span>
                <div class="score-content">
                  <span class="score-value">{{ score }}</span>
                  <span class="score-label">积分</span>
                </div>
              </div>
            </div>

            <div class="hud-right">
              <div class="timer-ring">
                <svg viewBox="0 0 50 50">
                  <circle class="ring-bg" cx="25" cy="25" r="22" />
                  <circle 
                    class="ring-progress" 
                    cx="25" cy="25" r="22"
                    :stroke="timerColor"
                    :stroke-dasharray="`${(timeLeft / timeLimit) * 138} 138`"
                    :class="{ warning: timeLeft <= 10 }"
                  />
                </svg>
                <span class="timer-text" :class="{ warning: timeLeft <= 10 }">{{ timeLeft }}s</span>
              </div>
            </div>
          </div>

          <!-- 题目显示 -->
          <div class="question-card ios26-card">
            <div class="card-liquid-border"></div>
            <div class="card-liquid-shine"></div>
            <div class="card-content">
              <div class="question-prompt">
                <span class="prompt-icon">📜</span>
                <span class="prompt-text">请说出含有</span>
                <span class="prompt-keyword">{{ currentKeyword }}</span>
                <span class="prompt-text">的诗句</span>
              </div>
              <div class="question-hint">
                <span class="hint-icon">💡</span>
                <span>诗句需出自经典诗词，点击下方示例获取灵感</span>
              </div>
            </div>
          </div>

          <!-- 快捷提示 -->
          <div class="hint-card ios26-card" v-if="currentHint">
            <div class="card-liquid-border"></div>
            <div class="card-content">
              <div class="hint-header">
                <span class="hint-icon-lg">💡</span>
                <span class="hint-title">系统提示</span>
              </div>
              <p class="hint-text">{{ currentHint }}</p>
              <p class="hint-meta" v-if="currentHintAuthor">{{ currentHintAuthor }} · {{ currentHintDynasty }}《{{ currentHintTitle }}》</p>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="input-section">
            <div class="input-card ios26-card">
              <div class="card-liquid-border"></div>
              <div class="card-liquid-shine"></div>
              <div class="card-content">
                <input 
                  type="text" 
                  v-model="userInput" 
                  class="poem-input"
                  :placeholder="`请输入含「${currentKeyword}」的完整诗句，如：春眠不觉晓，处处闻啼鸟`"
                  @keyup.enter="submitPoem"
                  :disabled="isThinking"
                  ref="inputRef"
                />
                <button class="submit-btn ios26-btn primary-btn" @click="submitPoem" :disabled="!userInput.trim() || isThinking">
                  <span class="btn-icon">{{ isThinking ? '⏳' : '✦' }}</span>
                  <span>{{ isThinking ? '验证中...' : '提交诗句' }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 历史记录 - 左右分栏对战布局 -->
          <div class="history-section">
            <div class="section-header">
              <span class="section-icon">⚔️</span>
              <h3 class="section-title">对战记录</h3>
              <span class="history-count">共 {{ poemHistory.length }} 句</span>
            </div>
            
            <div class="battle-arena">
              <!-- 左侧：我的答题区 -->
              <div class="battle-side player-side">
                <div class="side-header">
                  <div class="player-avatar">
                    <span class="avatar-icon">👤</span>
                  </div>
                  <div class="player-info">
                    <span class="player-name">我的回答</span>
                    <span class="player-score">{{ userCorrectCount }}/{{ userTotalCount }} 正确</span>
                  </div>
                </div>
                <div class="side-records">
                  <transition-group name="poem-slide">
                    <div 
                      v-for="(item, idx) in userHistory" 
                      :key="item.id"
                      class="record-item user-record"
                      :class="item.result"
                    >
                      <div class="record-content">
                        <div class="record-round">第{{ item.roundIndex }}回合</div>
                        <div class="record-poem">
                          <span 
                            v-for="(char, ci) in item.poem" 
                            :key="ci"
                            class="poem-char"
                            :class="{ highlight: char === currentKeyword }"
                          >{{ char }}</span>
                        </div>
                        <div class="record-meta" v-if="item.analysis">
                          {{ item.analysis.author }} · {{ item.analysis.dynasty }}《{{ item.analysis.title }}》
                        </div>
                        <div class="record-status">
                          <span class="status-icon">{{ item.result === 'correct' ? '✓' : '✗' }}</span>
                          <span class="status-text">{{ item.resultText }}</span>
                          <span class="status-score" v-if="item.scoreGained">+{{ item.scoreGained }}</span>
                        </div>
                      </div>
                    </div>
                  </transition-group>
                  <div v-if="userHistory.length === 0" class="empty-side">
                    <span class="empty-icon">🎯</span>
                    <p>等待你的回答...</p>
                  </div>
                </div>
              </div>

              <!-- 中间：对战指示 -->
              <div class="battle-divider">
                <div class="divider-line"></div>
                <div class="divider-icon">⚔️</div>
                <div class="divider-line"></div>
              </div>

              <!-- 右侧：AI答题区 -->
              <div class="battle-side ai-side">
                <div class="side-header">
                  <div class="player-avatar ai">
                    <span class="avatar-icon">🤖</span>
                  </div>
                  <div class="player-info">
                    <span class="player-name">AI 对手</span>
                    <span class="player-score">{{ aiHistory.length }} 次回答</span>
                  </div>
                </div>
                <div class="side-records">
                  <transition-group name="poem-slide">
                    <div 
                      v-for="(item, idx) in aiHistory" 
                      :key="item.id"
                      class="record-item ai-record"
                    >
                      <div class="record-content">
                        <div class="record-round">第{{ item.roundIndex }}回合</div>
                        <div class="record-poem">
                          <span 
                            v-for="(char, ci) in item.poem" 
                            :key="ci"
                            class="poem-char"
                            :class="{ highlight: char === currentKeyword }"
                          >{{ char }}</span>
                        </div>
                        <div class="record-meta" v-if="item.analysis">
                          {{ item.analysis.author }} · {{ item.analysis.dynasty }}《{{ item.analysis.title }}》
                        </div>
                      </div>
                    </div>
                  </transition-group>
                  <div v-if="aiHistory.length === 0" class="empty-side">
                    <span class="empty-icon">🤖</span>
                    <p>等待AI回答...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 退出按钮 -->
          <div class="action-row">
            <button class="ios26-btn danger-btn quit-btn" @click="quitGame">
              <span class="btn-icon">✕</span>
              <span>结束挑战</span>
            </button>
          </div>
        </div>
      </transition>

      <!-- ===== 游戏结果 ===== -->
      <transition name="fade-scale" mode="out-in">
        <div class="result-section" v-if="gameOver">
          <div class="result-card ios26-card">
            <div class="card-liquid-border"></div>
            <div class="card-liquid-shine"></div>
            
            <div class="card-content">
              <div class="result-animation">
                <div class="result-orb" :class="resultGrade">
                  <span class="orb-icon">{{ resultIcon }}</span>
                  <div class="orb-ring"></div>
                  <div class="orb-glow"></div>
                </div>
              </div>

              <h2 class="result-title">{{ resultTitle }}</h2>
              <p class="result-subtitle">{{ resultSubtitle }}</p>

              <div class="result-stats">
                <div class="main-stat">
                  <span class="stat-icon">🏆</span>
                  <div class="stat-content">
                    <span class="stat-number">{{ score }}</span>
                    <span class="stat-label">最终积分</span>
                  </div>
                </div>
                <div class="stats-row">
                  <div class="stat-item">
                    <span class="item-icon">📜</span>
                    <span class="item-value">{{ poemHistory.length }}</span>
                    <span class="item-label">回合数</span>
                  </div>
                  <div class="stat-item correct">
                    <span class="item-icon">✓</span>
                    <span class="item-value">{{ correctCount }}</span>
                    <span class="item-label">正确</span>
                  </div>
                  <div class="stat-item wrong">
                    <span class="item-icon">✗</span>
                    <span class="item-value">{{ wrongCount }}</span>
                    <span class="item-label">错误</span>
                  </div>
                </div>
              </div>

              <div class="result-actions">
                <button class="ios26-btn primary-btn" @click="restartGame">
                  <span class="btn-icon">🔄</span>
                  <span>再来一局</span>
                </button>
                <button class="ios26-btn secondary-btn" @click="changeKeyword">
                  <span class="btn-icon">🎴</span>
                  <span>换令字</span>
                </button>
                <button class="ios26-btn" @click="goHome">
                  <span class="btn-icon">🏠</span>
                  <span>返回首页</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>

    </div>

    <!-- Toast通知 -->
    <transition name="toast-slide">
      <div v-if="toast.show" class="toast" :class="toast.type">
        <span class="toast-icon">{{ toastIcon }}</span>
        <span class="toast-text">{{ toast.message }}</span>
      </div>
    </transition>

  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { feihuaPoems, getAvailableKeywords, validatePoem, getKeywordCount, validatePoemByAI } from '@/data/feihuaPoems'
import api from '@/services/api'
import { generateAttemptId } from '@/utils/attemptId'

export default {
  name: 'FeiHuaLingSingle',
  setup() {
    const router = useRouter()
    const inputRef = ref(null)
    const bgLoaded = ref(false)
    let historyIdCounter = 0

    // ===== 游戏状态 =====
    const gameStarted = ref(false)
    const gameOver = ref(false)
    const inSetup = ref(false)
    const selectedMode = ref('single')
    const selectedKeyword = ref('')
    const userInput = ref('')
    const isThinking = ref(false)
    const gameSessionId = ref(null)
    const savedToServer = ref(false)
    
    // ===== 游戏数据 =====
    const score = ref(0)
    const roundNumber = ref(1)
    const timeLeft = ref(60)
    const timeLimit = ref(60)
    const poemHistory = ref([])
    const usedPoems = ref([])
    const timer = ref(null)
    const timerInterval = ref(null)

    // ===== Toast =====
    const toast = ref({ show: false, message: '', type: 'info' })
    let toastTimer = null

    const showToast = (message, type = 'info') => {
      toast.value = { show: true, message, type }
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => { toast.value.show = false }, 3000)
    }

    const toastIcon = computed(() => {
      const icons = { success: '✓', error: '✗', info: '💡', warning: '⚠' }
      return icons[toast.value.type] || icons.info
    })

    // ===== 模式选择 =====
    const gameModes = [
      { 
        id: 'single', 
        name: '单人练习', 
        icon: '📖',
        desc: '与AI对战，循序渐进提升诗词功底',
        difficulty: '入门',
        color: '#4ade80',
        time: 60,
        delay: 0.1
      },
      { 
        id: 'online', 
        name: '在线对战', 
        icon: '🌸',
        desc: '与好友实时对战，以诗会友',
        difficulty: '联机',
        color: '#a855f7',
        time: 45,
        delay: 0.15
      },
      { 
        id: 'challenge', 
        name: '限时挑战', 
        icon: '⏱',
        desc: '紧张刺激的限时答题模式',
        difficulty: '进阶',
        color: '#fbbf24',
        time: 45,
        delay: 0.2
      },
      { 
        id: 'ranking', 
        name: '排位赛', 
        icon: '🏆',
        desc: '在线对战提升段位，证明实力',
        difficulty: '竞技',
        color: '#f87171',
        time: 30,
        delay: 0.3
      }
    ]

    // ===== 令字数据库 =====
    const keywordsData = computed(() => {
      const available = getAvailableKeywords()
      return available.reduce((acc, char) => {
        acc[char] = { count: getKeywordCount(char), position: false }
        return acc
      }, {})
    })

    const hotKeywords = computed(() => {
      return Object.entries(keywordsData.value)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8)
        .map(([char, data]) => ({ char, ...data }))
    })

    const moreKeywords = computed(() => {
      return Object.entries(keywordsData.value)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(8)
        .map(([char]) => char)
    })

    const currentKeyword = computed(() => selectedKeyword.value)

    // ===== 快捷提示 =====
    const currentHint = ref('')
    const currentHintAuthor = ref('')
    const currentHintDynasty = ref('')
    const currentHintTitle = ref('')

    const updateHint = () => {
      const available = feihuaPoems[currentKeyword.value] || []
      const unused = available.filter(p => !usedPoems.value.includes(p.poem))
      if (unused.length > 0) {
        const hint = unused[Math.floor(Math.random() * unused.length)]
        currentHint.value = hint.poem
        currentHintAuthor.value = hint.author
        currentHintDynasty.value = hint.dynasty
        currentHintTitle.value = hint.title
      }
    }

    // ===== 计时器颜色 =====
    const timerColor = computed(() => {
      if (timeLeft.value <= 10) return '#f87171'
      if (timeLeft.value <= 20) return '#fbbf24'
      return '#4ade80'
    })

    // ===== 计算属性 =====
    const correctCount = computed(() => 
      poemHistory.value.filter(p => p.player === 'user' && p.result === 'correct').length
    )
    const wrongCount = computed(() => 
      poemHistory.value.filter(p => p.player === 'user' && p.result !== 'correct').length
    )
    
    const userHistory = computed(() => {
      let userRound = 0
      return poemHistory.value
        .filter(p => p.player === 'user')
        .map(p => ({
          ...p,
          roundIndex: ++userRound
        }))
    })
    
    const aiHistory = computed(() => {
      let aiRound = 0
      return poemHistory.value
        .filter(p => p.player === 'system')
        .map(p => ({
          ...p,
          roundIndex: ++aiRound
        }))
    })
    
    const userCorrectCount = computed(() => 
      poemHistory.value.filter(p => p.player === 'user' && p.result === 'correct').length
    )
    
    const userTotalCount = computed(() => 
      poemHistory.value.filter(p => p.player === 'user').length
    )
    
    const resultGrade = computed(() => {
      if (score.value >= 200) return 'grade-immortal'
      if (score.value >= 150) return 'grade-master'
      if (score.value >= 100) return 'grade-expert'
      if (score.value >= 50) return 'grade-talent'
      return 'grade-rookie'
    })

    const resultTitle = computed(() => {
      const titles = {
        'grade-immortal': '诗仙降临！',
        'grade-master': '诗词大师！',
        'grade-expert': '诗词达人！',
        'grade-talent': '诗坛新秀！',
        'grade-rookie': '初露锋芒！'
      }
      return titles[resultGrade.value]
    })

    const resultSubtitle = computed(() => {
      const subtitles = {
        'grade-immortal': '才高八斗，诗词满腹！',
        'grade-master': '功力深厚，令人赞叹！',
        'grade-expert': '表现优异，继续加油！',
        'grade-talent': '潜力无限，期待更好！',
        'grade-rookie': '初学乍练，再接再厉！'
      }
      return subtitles[resultGrade.value]
    })

    const resultIcon = computed(() => {
      const icons = {
        'grade-immortal': '🏆',
        'grade-master': '👑',
        'grade-expert': '⭐',
        'grade-talent': '🌟',
        'grade-rookie': '✨'
      }
      return icons[resultGrade.value]
    })

    // ===== 背景装饰 =====
    const floatingChars = ref([])
    const chars = ['诗', '词', '风', '月', '云', '山', '水', '花', '春', '秋', '雨', '雪', '鸟', '酒', '茶', '琴', '棋', '书', '画', '鹤', '松', '竹', '梅', '兰', '柳']

    const getPetalStyle = (i) => ({
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 10}s`,
      animationDuration: `${8 + Math.random() * 8}s`,
      fontSize: `${10 + Math.random() * 12}px`,
      opacity: 0.15 + Math.random() * 0.25
    })

    const getParticleStyle = (n) => {
      const random = (min, max) => Math.random() * (max - min) + min
      return {
        left: random(0, 100) + '%',
        top: random(0, 100) + '%',
        animationDelay: random(0, 8) + 's',
        animationDuration: random(6, 16) + 's',
        width: random(3, 8) + 'px',
        height: random(3, 8) + 'px',
        opacity: random(0.08, 0.35),
      }
    }

    const initFloatingChars = () => {
      for (let i = 0; i < 15; i++) {
        floatingChars.value.push({
          text: chars[Math.floor(Math.random() * chars.length)],
          style: {
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            fontSize: `${12 + Math.random() * 16}px`,
            opacity: 0.03 + Math.random() * 0.05,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${15 + Math.random() * 15}s`
          }
        })
      }
    }

    // ===== 卡片交互 =====
    const handleCardMouseMove = (e) => {
      const card = e.currentTarget
      if (!card) return
      const rect = card.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      card.style.setProperty('--mouse-x', `${x}%`)
      card.style.setProperty('--mouse-y', `${y}%`)
    }

    const setupCardHover = () => {
      document.querySelectorAll('.ios26-card').forEach(card => {
        card.addEventListener('mousemove', handleCardMouseMove)
      })
    }

    const cleanupCardHover = () => {
      document.querySelectorAll('.ios26-card').forEach(card => {
        card.removeEventListener('mousemove', handleCardMouseMove)
      })
    }

    // ===== 游戏方法 =====
    const selectKeyword = (char) => {
      selectedKeyword.value = char
    }

    const randomKeyword = () => {
      const keys = getAvailableKeywords()
      const random = keys[Math.floor(Math.random() * keys.length)]
      selectedKeyword.value = random
    }

    const goToSetup = () => {
      // 如果选择在线对战，跳转到联机页面
      if (selectedMode.value === 'online') {
        router.push('/feihualing/online')
        return
      }
      // 如果选择排位赛，跳转到排位赛页面
      if (selectedMode.value === 'ranking') {
        router.push('/feihua-ranking')
        return
      }
      inSetup.value = true
    }

    const backToMode = () => {
      inSetup.value = false
    }

    const startGame = () => {
      if (!selectedKeyword.value) return
      
      const limits = { single: 60, online: 45, challenge: 45, ranking: 30 }
      timeLimit.value = limits[selectedMode.value] || 60
      
      gameStarted.value = true
      gameOver.value = false
      inSetup.value = false
      score.value = 0
      roundNumber.value = 1
      timeLeft.value = timeLimit.value
      poemHistory.value = []
      usedPoems.value = []
      userInput.value = ''
      historyIdCounter = 0
      gameSessionId.value = generateAttemptId()
      savedToServer.value = false
      
      updateHint()
      startTimer()
      nextTick(() => {
        inputRef.value?.focus()
        setupCardHover()
      })
    }

    const startTimer = () => {
      stopTimer()
      timerInterval.value = setInterval(() => {
        timeLeft.value--
        if (timeLeft.value <= 0) {
          handleTimeout()
        }
      }, 1000)
    }

    const stopTimer = () => {
      if (timerInterval.value) {
        clearInterval(timerInterval.value)
        timerInterval.value = null
      }
    }

    const pauseTimer = () => {
      stopTimer()
    }

    const resumeTimer = () => {
      if (timeLeft.value > 0 && !gameOver.value && gameStarted.value) {
        timerInterval.value = setInterval(() => {
          timeLeft.value--
          if (timeLeft.value <= 0) {
            handleTimeout()
          }
        }, 1000)
      }
    }

    const handleTimeout = () => {
      stopTimer()
      poemHistory.value.push({
        id: ++historyIdCounter,
        player: 'user',
        poem: '（超时未答）',
        result: 'wrong',
        resultText: '超时未答',
        scoreGained: 0,
        analysis: null
      })
      endGame('timeout')
    }

    const submitPoem = async () => {
      const poem = userInput.value.trim()
      if (!poem || isThinking.value) return

      isThinking.value = true
      pauseTimer() // 验证期间暂停倒计时

      // 先用本地数据库快速验证（同步，立即返回）
      const localResult = validatePoem(poem, currentKeyword.value, usedPoems.value)

      let validation
      if (localResult.valid) {
        // 数据库命中 → 直接使用，无需等待
        validation = localResult
      } else if (localResult.needsAIValidation) {
        // 数据库未命中 → 调用 AI（这步才需要等待）
        const aiResult = await validatePoemByAI(poem, currentKeyword.value)
        if (aiResult.valid && aiResult.poem) {
          validation = { valid: true, poem: aiResult.poem, fromAI: true }
        } else {
          validation = { valid: false, message: aiResult.message || '诗句不在我们的诗词库中，请换一首试试' }
        }
      } else {
        // 数据库明确返回错误（非 notfound 类型）
        validation = localResult
      }

      isThinking.value = false
      resumeTimer() // 验证完毕，恢复计时

      if (!validation.valid) {
        showToast(validation.message, 'error')

        poemHistory.value.push({
          id: ++historyIdCounter,
          player: 'user',
          poem: poem,
          result: 'wrong',
          resultText: validation.message,
          scoreGained: 0,
          analysis: null
        })

        userInput.value = ''
        return
      }

      // 验证通过
      usedPoems.value.push(validation.poem.poem)

      const baseScore = selectedMode.value === 'ranking' ? 30 : selectedMode.value === 'challenge' ? 20 : 10
      score.value += baseScore

      poemHistory.value.push({
        id: ++historyIdCounter,
        player: 'user',
        poem: validation.poem.poem,
        result: 'correct',
        resultText: '正确！',
        scoreGained: baseScore,
        analysis: {
          author: validation.poem.author || '未知',
          dynasty: validation.poem.dynasty || '未知',
          title: validation.poem.title || '未知'
        }
      })

      showToast(`✓ 正确！+${baseScore}分`, 'success')

      userInput.value = ''
      roundNumber.value++
      timeLeft.value = timeLimit.value

      // 系统回复（短暂等待，模拟AI思考）
      setTimeout(() => {
        generateSystemPoem()
      }, 800)
    }

    const generateSystemPoem = () => {
      const available = feihuaPoems[currentKeyword.value] || []
      const unused = available.filter(p => !usedPoems.value.includes(p.poem))

      if (unused.length === 0) {
        endGame('win')
        return
      }

      const selected = unused[Math.floor(Math.random() * unused.length)]
      usedPoems.value.push(selected.poem)

      poemHistory.value.push({
        id: ++historyIdCounter,
        player: 'system',
        poem: selected.poem,
        result: 'correct',
        resultText: '系统回复',
        scoreGained: 0,
        analysis: {
          author: selected.author,
          dynasty: selected.dynasty,
          title: selected.title
        }
      })

      roundNumber.value++
      timeLeft.value = timeLimit.value
      updateHint()
      inputRef.value?.focus()
    }

    const endGame = async (reason = 'manual') => {
      stopTimer()
      gameOver.value = true
      gameStarted.value = false
      
      if (reason === 'win') {
        score.value += 50
        showToast('🎉 系统诗句用尽，通关奖励 +50分！', 'success')
      } else if (reason === 'timeout') {
        showToast('⏱ 时间耗尽，挑战结束', 'warning')
      }

      if (gameSessionId.value && !savedToServer.value && poemHistory.value.length > 0) {
        savedToServer.value = true
        try {
          await api.feihua.save({
            keyword: selectedKeyword.value,
            score: score.value,
            poemCount: userCorrectCount.value,
            history: poemHistory.value,
            gameSessionId: gameSessionId.value
          })
        } catch (err) {
          savedToServer.value = false
          console.error('[feihua] 保存游戏记录失败:', err.message)
        }
      }
      
      cleanupCardHover()
    }

    const restartGame = () => {
      gameOver.value = false
      inSetup.value = true
    }

    const changeKeyword = () => {
      selectedKeyword.value = ''
      gameOver.value = false
      inSetup.value = true
    }

    const quitGame = () => {
      if (confirm('确定要结束挑战吗？')) {
        endGame('quit')
      }
    }

    const goHome = () => {
      router.push('/')
    }

    // ===== 生命周期 =====
    onMounted(() => {
      bgLoaded.value = true
      initFloatingChars()
    })

    onUnmounted(() => {
      stopTimer()
      if (toastTimer) clearTimeout(toastTimer)
      cleanupCardHover()
    })

    return {
      bgLoaded,
      gameStarted,
      gameOver,
      inSetup,
      selectedMode,
      selectedKeyword,
      userInput,
      isThinking,
      score,
      roundNumber,
      timeLeft,
      timeLimit,
      poemHistory,
      gameModes,
      hotKeywords,
      moreKeywords,
      currentKeyword,
      currentHint,
      currentHintAuthor,
      currentHintDynasty,
      currentHintTitle,
      timerColor,
      correctCount,
      wrongCount,
      userHistory,
      aiHistory,
      userCorrectCount,
      userTotalCount,
      resultGrade,
      resultTitle,
      resultSubtitle,
      resultIcon,
      inputRef,
      floatingChars,
      toast,
      toastIcon,
      getPetalStyle,
      getParticleStyle,
      selectKeyword,
      randomKeyword,
      goToSetup,
      backToMode,
      startGame,
      submitPoem,
      restartGame,
      changeKeyword,
      quitGame,
      goHome
    }
  }
}
</script>

<style scoped>
/* ===== iOS26 液态玻璃核心样式（与Profile.vue一致） ===== */
:root {
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-bg-hover: rgba(255, 255, 255, 0.13);
  --glass-border: rgba(255, 255, 255, 0.15);
  --glass-border-hover: rgba(255, 255, 255, 0.28);
  --glass-blur: 24px;
  --glass-shadow: 0 8px 40px rgba(0, 0, 0, 0.25), 0 2px 12px rgba(0, 0, 0, 0.15);
  --glass-shadow-hover: 0 16px 60px rgba(0, 0, 0, 0.35), 0 4px 20px rgba(0, 0, 0, 0.2);
  --liquid-ease: cubic-bezier(0.4, 0, 0.2, 1);
}

.ios26-card {
  position: relative;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  box-shadow: var(--glass-shadow);
  overflow: hidden;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              background 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: cardEntrance 0.8s var(--liquid-ease) both;
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
  top: -30%;
  left: -30%;
  width: 160%;
  height: 160%;
  background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(255,255,255,0.35) 0%,
    rgba(255,255,255,0.15) 15%,
    rgba(168,85,247,0.1) 25%,
    transparent 35%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 4;
  mix-blend-mode: overlay;
}

.ios26-card:hover {
  transform: translateY(-8px) scale(1.02);
  background: var(--glass-bg-hover);
  box-shadow: var(--glass-shadow-hover), 0 0 40px rgba(168,85,247,0.15);
  border-color: var(--glass-border-hover);
}

.ios26-card:hover::before { opacity: 1; }
.ios26-card:hover::after { opacity: 1; }
.ios26-card:hover .card-liquid-shine { animation-duration: 3s; }

@keyframes cardEntrance {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.card-liquid-border {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg,
    rgba(255,255,255,0.3) 0%,
    rgba(255,255,255,0.05) 30%,
    rgba(255,255,255,0.05) 70%,
    rgba(255,255,255,0.15) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  z-index: 1;
}

.card-liquid-shine {
  position: absolute;
  top: -60%;
  left: -60%;
  width: 220%;
  height: 220%;
  background: conic-gradient(from 0deg at 50% 50%,
    transparent 0deg, rgba(255,255,255,0.04) 60deg,
    transparent 120deg, rgba(255,255,255,0.03) 180deg,
    transparent 240deg, rgba(255,255,255,0.04) 300deg,
    transparent 360deg);
  animation: liquidShimmer 8s linear infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes liquidShimmer {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ===== 通用按钮 ===== */
.ios26-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  backdrop-filter: blur(12px);
  font-family: 'Noto Serif SC', serif;
  overflow: hidden;
}

.ios26-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.ios26-btn:hover::before { opacity: 1; }
.ios26-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3); }
.ios26-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

.ios26-btn.primary-btn {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.6), rgba(139, 92, 246, 0.6));
  border-color: rgba(168, 85, 247, 0.5);
  color: white;
  box-shadow: 0 4px 20px rgba(168, 85, 247, 0.3);
}
.ios26-btn.primary-btn:hover {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.8), rgba(139, 92, 246, 0.8));
  box-shadow: 0 8px 30px rgba(168, 85, 247, 0.5);
}
.ios26-btn.secondary-btn {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
}
.ios26-btn.danger-btn {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}
.ios26-btn.danger-btn:hover { background: rgba(239, 68, 68, 0.3); }
.btn-icon { font-size: 18px; z-index: 1; }

/* ===== 页面基础 ===== */
.feihua-page {
  min-height: 100vh;
  min-height: 100dvh;
  width: 100vw;
  min-width: 100vw;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-x: hidden;
  overflow-y: auto;
  background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 50%, #0a1a2a 100%);
  z-index: 999;
}

/* ===== 背景效果 ===== */
.feihua-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.bg-gradient {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(ellipse at 20% 20%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(236, 72, 153, 0.08) 0%, transparent 60%);
}

.bg-particles {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(200,180,255,0.4), transparent);
  animation: floatParticle linear infinite;
}

@keyframes floatParticle {
  0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
  10% { opacity: 1; }
  50% { transform: translateY(-30vh) translateX(15vw) scale(1.3); opacity: 0.6; }
  90% { opacity: 0.3; }
  100% { transform: translateY(-60vh) translateX(-10vw) scale(0.8); opacity: 0; }
}

.floating-petals { 
  position: absolute; 
  inset: 0;
  width: 100%;
  height: 100%;
}

.petal {
  position: absolute;
  animation: petalFall linear infinite;
}

@keyframes petalFall {
  0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
}

.floating-chars { 
  position: absolute; 
  inset: 0;
  width: 100%;
  height: 100%;
}

.float-char {
  position: absolute;
  font-family: 'SimSun', 'STSong', serif;
  color: #f0d78c;
  animation: floatChar linear infinite;
}

@keyframes floatChar {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.03; }
  50% { transform: translateY(-30px) rotate(10deg); opacity: 0.06; }
}

/* ===== 主容器 ===== */
.feihua-container {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: min(96vw, 1320px);
  min-height: 100vh;
  margin: 0 auto;
  /* 与 App 置顶导航栏（z-index 高于本页）对齐，避免标题/令字区被遮挡 */
  padding: calc(var(--app-sticky-nav-offset, 124px) + 20px) clamp(16px, 3vw, 40px) 40px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 32px;
  box-sizing: border-box;
}

/* ===== 标题区 ===== */
.hero-section {
  text-align: center;
  padding: 40px 0;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 24px;
  background: rgba(168, 85, 247, 0.2);
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: 50px;
  margin-bottom: 20px;
  animation: badgePulse 2s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(168, 85, 247, 0); }
}

.badge-star { color: #a855f7; font-size: 14px; }
.badge-text {
  color: #a855f7;
  font-size: 13px;
  letter-spacing: 4px;
  text-transform: uppercase;
}

.hero-title { margin: 0 0 16px; }

.title-cn {
  display: block;
  font-family: 'ZCOOL XiaoWei', 'Noto Serif SC', serif;
  font-size: 56px;
  font-weight: 700;
  background: linear-gradient(135deg, #f4d03f 0%, #fff 50%, #f4d03f 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: titleShine 3s linear infinite;
  letter-spacing: 12px;
}

@keyframes titleShine {
  to { background-position: 200% center; }
}

.title-en {
  display: block;
  font-size: 14px;
  color: rgba(168, 85, 247, 0.6);
  letter-spacing: 8px;
  margin-top: 8px;
  font-weight: 400;
}

.hero-subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
  margin: 0;
}

/* ===== 区块通用 ===== */
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.section-icon { font-size: 24px; }

.section-title {
  font-size: 22px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-family: 'Noto Serif SC', serif;
}

/* ===== 模式选择 ===== */
.mode-section { 
  width: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.mode-grid {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: stretch;
  gap: 20px;
  margin-bottom: 32px;
  overflow-x: auto;
  padding: 10px 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.mode-card {
  flex: 0 0 calc(25% - 15px);
  min-width: 200px;
  max-width: 280px;
  padding: 28px 24px;
  text-align: center;
  cursor: pointer;
}

.mode-card.active {
  border-color: rgba(168, 85, 247, 0.6);
  background: rgba(168, 85, 247, 0.15);
}

.mode-card .card-content {
  position: relative;
  z-index: 2;
}

.mode-icon-wrap {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
}

.mode-icon { font-size: 48px; position: relative; z-index: 1; }

.mode-icon-glow {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(168,85,247,0.3), transparent 70%);
  opacity: 0.5;
  z-index: 0;
  transition: opacity 0.3s ease;
}

.mode-card:hover .mode-icon-glow { opacity: 1; transform: scale(1.2); }

.mode-name {
  font-size: 20px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px;
}

.mode-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 16px;
  line-height: 1.5;
}

.mode-stats {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.mode-stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.stat-icon-sm { font-size: 12px; }

.stat-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.mode-section .action-row {
  display: flex;
  justify-content: center;
  width: 100%;
}

.next-step-btn { margin: 0; display: flex; }

/* ===== 令字选择 ===== */
.keyword-section {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.back-btn { margin-bottom: 24px; }

.keyword-section .section-header {
  flex-wrap: wrap;
  gap: 8px 12px;
}

.keyword-hint {
  margin-left: auto;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  flex-basis: 100%;
  margin-left: 0;
}

@media (min-width: 720px) {
  .keyword-hint {
    flex-basis: auto;
    margin-left: auto;
  }
}

.keyword-category { margin-bottom: 28px; }

.category-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 16px;
}

.category-icon { font-size: 20px; }

.category-count {
  margin-left: auto;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
}

.keyword-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 14px;
}

@media (min-width: 640px) {
  .keyword-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 900px) {
  .keyword-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (min-width: 1100px) {
  .keyword-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

.keyword-btn {
  padding: 16px;
  text-align: center;
  cursor: pointer;
}

.keyword-btn .card-content {
  position: relative;
  z-index: 2;
}

.keyword-btn.active {
  border-color: rgba(168, 85, 247, 0.6);
  background: rgba(168, 85, 247, 0.15);
}

.keyword-btn.small { padding: 12px; }

.kw-char {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin-bottom: 4px;
  font-family: 'Noto Serif SC', serif;
}

.keyword-btn.small .kw-char { font-size: 22px; }

.kw-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.kw-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(244,208,63,0.2), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.keyword-btn:hover .kw-glow,
.keyword-btn.active .kw-glow { opacity: 1; }

.keyword-section .action-row {
  display: flex;
  justify-content: center;
  width: 100%;
}

.random-btn { margin: 24px 0; display: flex; }
.start-game-btn { margin: 0; display: flex; }

/* ===== 游戏界面 ===== */
.game-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  padding: 0;
  box-sizing: border-box;
}

.game-hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 20px;
  backdrop-filter: blur(20px);
}

.hud-left, .hud-right { display: flex; align-items: center; gap: 16px; }

.hud-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(168, 85, 247, 0.2);
  border-radius: 30px;
}

.badge-icon { font-size: 20px; }

.badge-keyword {
  font-size: 24px;
  font-weight: 700;
  color: #f4d03f;
}

.hud-round {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.round-label { font-size: 14px; color: rgba(255, 255, 255, 0.5); }

.round-num {
  font-size: 28px;
  font-weight: 700;
  color: #a855f7;
}

.score-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-icon { font-size: 24px; }

.score-content { display: flex; flex-direction: column; align-items: center; }

.score-value {
  font-size: 32px;
  font-weight: 800;
  color: #fbbf24;
  line-height: 1;
}

.score-label { font-size: 12px; color: rgba(255, 255, 255, 0.5); }

.timer-ring {
  position: relative;
  width: 50px;
  height: 50px;
}

.timer-ring svg { transform: rotate(-90deg); }

.timer-ring .ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 4;
}

.timer-ring .ring-progress {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s ease;
}

.timer-ring .ring-progress.warning { stroke: #f87171; }

.timer-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: white;
}

.timer-text.warning {
  color: #f87171;
  animation: timerPulse 0.5s ease-in-out infinite;
}

@keyframes timerPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 题目卡片 */
.question-card { padding: 32px; text-align: center; }

.question-card .card-content {
  position: relative;
  z-index: 2;
}

.question-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 12px;
}

.prompt-icon { font-size: 28px; }

.prompt-keyword {
  font-size: 36px;
  font-weight: 700;
  color: #f4d03f;
  text-shadow: 0 0 20px rgba(244, 208, 63, 0.5);
}

.question-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

.hint-icon { font-size: 18px; }

/* 快捷提示卡片 */
.hint-card { padding: 20px; }

.hint-card .card-content { position: relative; z-index: 2; }

.hint-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.hint-icon-lg { font-size: 20px; }

.hint-title {
  font-size: 14px;
  color: #a855f7;
  font-weight: 600;
}

.hint-text {
  font-size: 18px;
  font-family: 'Noto Serif SC', serif;
  color: white;
  margin: 0 0 8px;
  line-height: 1.6;
}

.hint-meta {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

/* 输入区域 */
.input-section {}

.input-card { padding: 24px; }

.input-card .card-content {
  position: relative;
  z-index: 2;
}

.poem-input {
  width: 100%;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: white;
  font-size: 18px;
  font-family: 'Noto Serif SC', serif;
  outline: none;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  box-sizing: border-box;
  margin-bottom: 16px;
}

.poem-input:focus {
  border-color: rgba(168, 85, 247, 0.5);
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
}

.poem-input::placeholder { color: rgba(255, 255, 255, 0.3); }
.poem-input:disabled { opacity: 0.5; }

.submit-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 16px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(168, 85, 247, 0.4);
}

.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 历史记录 */
.history-section { width: 100%; padding: 0; box-sizing: border-box; }

.history-count {
  margin-left: auto;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
}

/* 对战区域布局 */
.battle-arena {
  display: flex;
  gap: 16px;
  min-height: 300px;
}

.battle-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 20px;
  overflow: hidden;
}

.player-side {
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.ai-side {
  border: 1px solid rgba(96, 165, 250, 0.3);
}

.side-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.3);
}

.player-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.3), rgba(74, 222, 128, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(74, 222, 128, 0.5);
}

.player-avatar.ai {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.3), rgba(96, 165, 250, 0.1));
  border-color: rgba(96, 165, 250, 0.5);
}

.avatar-icon {
  font-size: 22px;
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.player-name {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.player-score {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.player-side .player-score {
  color: rgba(74, 222, 128, 0.8);
}

.ai-side .player-score {
  color: rgba(96, 165, 250, 0.8);
}

.side-records {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 350px;
}

.side-records::-webkit-scrollbar { width: 4px; }
.side-records::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 4px; }
.side-records::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.4); border-radius: 4px; }

/* 单条记录样式 */
.record-item {
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid;
  animation: recordSlideIn 0.4s ease;
}

@keyframes recordSlideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.user-record {
  border-left-color: rgba(74, 222, 128, 0.6);
}

.user-record.correct {
  background: rgba(74, 222, 128, 0.1);
}

.user-record.wrong {
  background: rgba(248, 113, 113, 0.1);
  border-left-color: rgba(248, 113, 113, 0.6);
}

.ai-record {
  border-left-color: rgba(96, 165, 250, 0.6);
  background: rgba(96, 165, 250, 0.08);
}

.record-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.record-round {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
}

.record-poem {
  font-size: 16px;
  font-family: 'Noto Serif SC', serif;
  color: white;
  line-height: 1.6;
}

.record-poem .poem-char {
  display: inline-block;
  transition: all 0.3s ease;
}

.record-poem .poem-char.highlight {
  color: #f4d03f;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(244, 208, 63, 0.5);
}

.record-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.record-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.status-icon {
  font-size: 14px;
}

.user-record.correct .status-icon { color: #4ade80; }
.user-record.wrong .status-icon { color: #f87171; }

.status-text {
  color: rgba(255, 255, 255, 0.6);
}

.status-score {
  margin-left: auto;
  font-weight: 700;
  color: #4ade80;
}

/* 空状态 */
.empty-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;
}

.empty-side .empty-icon {
  font-size: 36px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-side p {
  margin: 0;
  font-size: 14px;
}

/* 对战分割线 */
.battle-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 4px;
}

.divider-line {
  flex: 1;
  width: 2px;
  background: linear-gradient(to bottom, transparent, rgba(168, 85, 247, 0.3), transparent);
}

.divider-icon {
  font-size: 24px;
  animation: battlePulse 2s ease-in-out infinite;
}

@keyframes battlePulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.2); opacity: 1; }
}

.history-list {
  max-height: 350px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 8px;
}

.history-list::-webkit-scrollbar { width: 4px; }
.history-list::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 4px; }
.history-list::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.4); border-radius: 4px; }

.history-item { padding: 16px 20px; }

.history-item .card-content { position: relative; z-index: 2; }

.history-item.user { border-left: 3px solid #4ade80; }
.history-item.system { border-left: 3px solid #60a5fa; }
.history-item.correct { border-left-color: #4ade80; }
.history-item.wrong { border-left-color: #f87171; }

.item-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.player-tag {
  padding: 4px 12px;
  background: rgba(168, 85, 247, 0.2);
  border-radius: 20px;
  font-size: 12px;
  color: #a855f7;
}

.item-round { font-size: 12px; color: rgba(255, 255, 255, 0.4); }

.item-score {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  color: #4ade80;
}

.poem-text {
  font-size: 20px;
  font-family: 'Noto Serif SC', serif;
  color: white;
  margin-bottom: 8px;
  line-height: 1.6;
}

.poem-char {
  display: inline-block;
  transition: all 0.3s ease;
}

.poem-char.highlight {
  color: #f4d03f;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(244, 208, 63, 0.5);
  animation: charGlow 1s ease-in-out infinite alternate;
}

@keyframes charGlow {
  from { text-shadow: 0 0 10px rgba(244, 208, 63, 0.3); }
  to { text-shadow: 0 0 20px rgba(244, 208, 63, 0.8); }
}

.poem-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 8px;
}

.meta-sep { opacity: 0.5; }

.poem-result {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.result-icon { font-size: 16px; }

.history-item.correct .result-icon,
.history-item.correct .result-text { color: #4ade80; }

.history-item.wrong .result-icon,
.history-item.wrong .result-text { color: #f87171; }

.history-empty {
  text-align: center;
  padding: 48px;
  color: rgba(255,255,255,0.3);
}

.empty-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* 过渡动画 */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-scale-enter-from { opacity: 0; transform: scale(0.95); }
.fade-scale-leave-to { opacity: 0; transform: scale(1.05); }

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from { opacity: 0; transform: translateX(20px); }
.fade-slide-leave-to { opacity: 0; transform: translateX(-20px); }

.poem-slide-enter-active { animation: slideIn 0.5s ease; }
@keyframes slideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.history-empty {
  text-align: center;
  padding: 48px;
  color: rgba(255,255,255,0.3);
}

.empty-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* ===== 结果界面 ===== */
.result-section {
  width: 100%;
  padding: 24px 0 40px;
  display: flex;
  justify-content: center;
  box-sizing: border-box;
}

.result-card { padding: 48px; text-align: center; max-width: 500px; width: 100%; }

.result-card .card-content { position: relative; z-index: 2; }

.result-animation { margin-bottom: 24px; }

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
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.orb-icon { font-size: 48px; z-index: 1; }

.orb-ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 4px solid;
  animation: ringRotate 3s linear infinite;
}

@keyframes ringRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.orb-glow {
  position: absolute;
  inset: -20px;
  border-radius: 50%;
  animation: orbGlow 2s ease-in-out infinite;
}

@keyframes orbGlow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

.grade-immortal { background: radial-gradient(circle, rgba(251,191,36,0.4), rgba(245,158,11,0.2)); }
.grade-immortal .orb-ring { border-color: #fbbf24; box-shadow: 0 0 30px rgba(251,191,36,0.5); }
.grade-immortal .orb-glow { background: radial-gradient(circle, rgba(251,191,36,0.2), transparent); }

.grade-master { background: radial-gradient(circle, rgba(168,85,247,0.4), rgba(139,92,246,0.2)); }
.grade-master .orb-ring { border-color: #a855f7; box-shadow: 0 0 30px rgba(168,85,247,0.5); }
.grade-master .orb-glow { background: radial-gradient(circle, rgba(168,85,247,0.2), transparent); }

.grade-expert { background: radial-gradient(circle, rgba(96,165,250,0.4), rgba(59,130,246,0.2)); }
.grade-expert .orb-ring { border-color: #60a5fa; box-shadow: 0 0 30px rgba(96,165,250,0.5); }
.grade-expert .orb-glow { background: radial-gradient(circle, rgba(96,165,250,0.2), transparent); }

.grade-talent { background: radial-gradient(circle, rgba(34,197,94,0.4), rgba(22,163,74,0.2)); }
.grade-talent .orb-ring { border-color: #4ade80; box-shadow: 0 0 30px rgba(34,197,94,0.5); }
.grade-talent .orb-glow { background: radial-gradient(circle, rgba(34,197,94,0.2), transparent); }

.grade-rookie { background: radial-gradient(circle, rgba(148,163,184,0.4), rgba(100,116,139,0.2)); }
.grade-rookie .orb-ring { border-color: #94a3b8; box-shadow: 0 0 20px rgba(148,163,184,0.3); }
.grade-rookie .orb-glow { background: radial-gradient(circle, rgba(148,163,184,0.2), transparent); }

.result-title {
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px;
  font-family: 'ZCOOL XiaoWei', serif;
}

.result-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 32px;
}

.result-stats { margin-bottom: 32px; }

.main-stat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 20px;
  margin-bottom: 16px;
}

.stat-icon { font-size: 36px; }

.stat-content { display: flex; flex-direction: column; align-items: center; }

.stat-number {
  font-size: 48px;
  font-weight: 800;
  color: #fbbf24;
}

.stat-label { font-size: 14px; color: rgba(255, 255, 255, 0.5); }

.stats-row {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.stat-item {
  flex: 1;
  max-width: 120px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.item-icon { font-size: 24px; }
.item-value { font-size: 24px; font-weight: 700; color: white; }
.stat-item.correct .item-value { color: #4ade80; }
.stat-item.wrong .item-value { color: #f87171; }
.item-label { font-size: 12px; color: rgba(255, 255, 255, 0.4); }

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-actions .ios26-btn { width: 100%; }

/* ===== Toast通知 ===== */
.toast {
  position: fixed;
  top: calc(var(--app-sticky-nav-offset, 124px) + 12px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10050;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 50px;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  font-size: 15px;
  font-weight: 600;
  font-family: 'Noto Sans SC', sans-serif;
  animation: toastAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes toastAppear {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

.toast.success {
  background: rgba(74, 222, 128, 0.2);
  border: 1px solid rgba(74, 222, 128, 0.4);
  color: #4ade80;
}

.toast.error {
  background: rgba(248, 113, 113, 0.2);
  border: 1px solid rgba(248, 113, 113, 0.4);
  color: #f87171;
}

.toast.info {
  background: rgba(168, 85, 247, 0.2);
  border: 1px solid rgba(168, 85, 247, 0.4);
  color: #a855f7;
}

.toast.warning {
  background: rgba(251, 191, 36, 0.2);
  border: 1px solid rgba(251, 191, 36, 0.4);
  color: #fbbf24;
}

.toast-icon { font-size: 18px; }

.toast-slide-enter-active { animation: toastEnter 0.4s ease; }
.toast-slide-leave-active { animation: toastLeave 0.3s ease; }

@keyframes toastEnter {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes toastLeave {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .feihua-page {
    width: 100vw;
    min-width: 100vw;
  }
  .feihua-bg {
    width: 100vw;
    height: 100vh;
  }
  .mode-grid {
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }
  .mode-card {
    flex: 0 0 calc(50% - 6px);
    min-width: 150px;
  }
  .title-cn { font-size: 42px; letter-spacing: 6px; }
  .game-hud { flex-direction: column; gap: 16px; }
  .hud-left, .hud-right { width: 100%; justify-content: center; }
  .result-card { padding: 32px 24px; }
  .keyword-hint { display: none; }
}

@media (max-width: 480px) {
  .feihua-page {
    width: 100vw;
    min-width: 100vw;
  }
  .feihua-bg {
    width: 100vw;
    height: 100vh;
  }
  .mode-grid {
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }
  .mode-card {
    flex: 0 0 calc(50% - 5px);
    min-width: 140px;
    padding: 20px 16px;
  }
  .mode-icon { font-size: 36px; }
  .mode-name { font-size: 16px; }
  .mode-desc { font-size: 12px; }
}
</style>
