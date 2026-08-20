<template>
  <div class="feihua-online">
    <!-- 顶部导航 -->
    <div class="nav-header">
      <h1 class="page-title">
        <span v-if="isRankingMode" class="title-ranking">🏆 排位赛</span>
        <span v-else class="title-online">飞花令 - 在线对战</span>
      </h1>
      <div class="nav-links">
        <router-link to="/feihualing/single" class="nav-link">单人模式</router-link>
        <router-link to="/feihua-ranking" class="nav-link ranking-link">排位赛</router-link>
      </div>
    </div>

    <!-- 未开始游戏时显示 -->
    <div v-if="!inGame" class="lobby">
      <!-- 难度选择 -->
      <div v-if="!selectedDifficulty" class="difficulty-select">
        <h2>选择难度</h2>
        <div v-if="isFromRanking && currentUserRank" class="current-rank-display">
          <span class="rank-label">当前段位：</span>
          <span class="rank-badge" :style="{ color: getRankColor(currentUserRank.rank_level) }">
            {{ getRankIcon(currentUserRank.rank_level) }} {{ currentUserRank.rank_level || '青铜' }}
          </span>
          <span class="rank-rating">{{ currentUserRank.rating || 0 }}分</span>
        </div>
        <div class="difficulty-options">
          <div
            v-for="diff in difficulties"
            :key="diff.level"
            class="difficulty-card"
            :class="{ 'ranking-card': diff.level === 'ranking' }"
            @click="selectDifficulty(diff.level)"
          >
            <h3>{{ diff.name }}</h3>
            <p>{{ diff.description }}</p>
            <p class="time-limit">时限：{{ diff.timeLimit }}秒/回合</p>
          </div>
        </div>
      </div>

      <!-- 令字选择（非排位赛模式需手动选择，排位赛自动抽取） -->
      <div v-if="selectedDifficulty && selectedDifficulty !== 'ranking' && !selectedKeyword" class="keyword-select">
        <h2>选择令字</h2>
        <div class="keyword-options">
          <button
            v-for="keyword in recommendedKeywords"
            :key="keyword"
            class="keyword-btn"
            @click="selectKeyword(keyword)"
          >
            {{ keyword }}
          </button>
        </div>
        <div class="custom-keyword">
          <input
            v-model="customKeyword"
            placeholder="自定义令字"
            maxlength="1"
          />
          <button @click="selectKeyword(customKeyword)" :disabled="!customKeyword">
            确定
          </button>
        </div>
        <button class="back-btn" @click="selectedDifficulty = null">返回</button>
      </div>

      <!-- 在线用户列表 -->
      <div v-if="selectedDifficulty && selectedKeyword && !inGame" class="online-users-section">
        <div class="current-setting">
          <p>难度：{{ getDifficultyName(selectedDifficulty) }}</p>
          <p>令字：<span class="keyword-badge">{{ selectedKeyword }}</span></p>
          <button class="change-btn" @click="resetSelection">重新选择</button>
        </div>

        <div class="online-users-header">
          <h2>在线玩家</h2>
          <button class="refresh-btn" @click="refreshOnlineUsers" :disabled="isRefreshing">
            {{ isRefreshing ? '刷新中...' : '刷新' }}
          </button>
        </div>
        <div v-if="onlineUsers.length === 0" class="empty-users">
          <p>暂无在线玩家</p>
          <p class="tip">邀请好友一起来玩吧！</p>
        </div>
        <div v-else class="users-list">
          <div
            v-for="user in onlineUsers"
            :key="user.userId"
            class="user-card"
            :class="{ 'in-game': user.inGame, 'is-me': user.userId === currentUserId }"
          >
            <div class="user-info">
              <div class="user-avatar">{{ user.username.charAt(0).toUpperCase() }}</div>
              <div class="user-details">
                <span class="user-name">{{ user.username }}</span>
                <span class="user-class">班级：{{ user.classId || '未设置' }}</span>
                <span class="user-record">最高记录：{{ user.maxRounds || 0 }}轮</span>
              </div>
            </div>
            <button
              v-if="user.userId !== currentUserId"
              class="invite-btn"
              @click="inviteUser(user)"
              :disabled="user.inGame"
            >
              {{ user.inGame ? '游戏中' : '邀请' }}
            </button>
            <span v-else class="me-badge">我</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 邀请弹窗 -->
    <div v-if="showInvitation" class="invitation-modal">
      <div class="modal-content">
        <h3>收到对战邀请</h3>
        <div class="inviter-info">
          <p><strong>{{ invitation.from?.username || invitation.inviterName }}</strong> 邀请你进行飞花令对战</p>
          <p>班级：{{ invitation.from?.classId || invitation.inviterClassId || '未设置' }}</p>
          <p>最高记录：{{ invitation.from?.maxRounds || invitation.inviterMaxRounds || 0 }}轮</p>
          <p>令字：<span class="keyword-badge">{{ invitation.keyword }}</span></p>
          <p>难度：{{ getDifficultyName(invitation.difficulty) }}</p>
        </div>
        <div class="modal-actions">
          <button class="accept-btn" @click="acceptInvitation">接受</button>
          <button class="reject-btn" @click="rejectInvitation">拒绝</button>
        </div>
      </div>
    </div>

    <!-- 游戏房间 - 轮流飞花令 -->
    <div v-if="inGame" class="game-room">
      <!-- 第一行：顶部信息栏 -->
      <div class="game-top-bar">
        <div class="round-info">
          <span class="round-tag">第 {{ gameData.currentRound }} 轮</span>
          <span class="time-tag" :class="{ 'time-warning': timeLeft <= 10 }">
            {{ timeLeft }}s
          </span>
        </div>
        <div class="keyword-display">
          令字：<span class="keyword-hero">{{ gameData.keyword }}</span>
        </div>
        <button class="leave-btn" @click="leaveGame">离开</button>
      </div>

      <!-- 第二行：玩家比分卡片 -->
      <div class="players-row">
        <div
          v-for="(player, index) in gameData.players"
          :key="player.userId"
          class="player-card-compact"
          :class="{
            'current-turn': index === gameData.currentTurn,
            'is-me': player.userId === currentUserId
          }"
        >
          <div class="player-top">
            <div class="player-avatar-small">
              {{ player.username.charAt(0).toUpperCase() }}
              <span v-if="isRankingMode && player.rankLevel" class="rank-badge-mini" :style="{ background: getRankColor(player.rankLevel) }">
                {{ getRankIcon(player.rankLevel) }}
              </span>
            </div>
            <div class="player-name-line">
              <span class="player-name">{{ player.username }}</span>
              <span v-if="index === gameData.currentTurn" class="turn-badge">回合中</span>
              <span v-if="player.userId === currentUserId" class="me-tag">我</span>
            </div>
          </div>
          <div class="player-score-display">
            <span class="score-correct">{{ player.score || 0 }} 分</span>
          </div>
        </div>
      </div>

      <!-- 第三行：题目面板 + 输入区域 -->
      <div class="game-main-area">
        <!-- 已用诗句面板 -->
        <div class="used-poems-panel">
          <div class="panel-header">
            <span class="panel-title">已用诗句</span>
            <span class="panel-count">共 {{ gameData.usedPoems?.length || 0 }} 句</span>
          </div>
          <div class="poems-scroll-area">
            <div v-if="!gameData.usedPoems || gameData.usedPoems.length === 0" class="poems-empty">
              还没有诗句，开始吧！
            </div>
            <div v-else>
              <div v-for="(poem, index) in gameData.usedPoems" :key="index" class="poem-line">
                <span class="poem-num">{{ index + 1 }}.</span>
                <div class="poem-content">
                  <span class="poem-text">{{ poem.original }}</span>
                  <span class="poem-author">— {{ poem.submittedByName }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入面板 -->
        <div class="input-panel">
          <template v-if="isMyTurn">
            <div class="input-prompt">
              请写出包含令字「<span class="prompt-keyword">{{ gameData.keyword }}</span>」的诗句
            </div>
            <div class="input-row">
              <input
                v-model="answerInput"
                type="text"
                class="answer-input"
                placeholder="输入诗句..."
                @keyup.enter="submitAnswer"
                :disabled="answerSubmitting"
                autofocus
              />
              <button
                class="submit-btn"
                @click="submitAnswer"
                :disabled="answerSubmitting || !answerInput.trim()"
              >
                {{ answerSubmitting ? '验证中...' : '提交' }}
              </button>
            </div>
          </template>
          <template v-else>
            <div class="waiting-panel">
              <div class="waiting-icon">
                <span class="pulse-ring"></span>
                <span class="pulse-dot"></span>
              </div>
              <p class="waiting-text">等待 {{ getOpponentName }} 答题...</p>
              <p class="waiting-hint">对方还有 <span class="time-remain">{{ timeLeft }}</span> 秒</p>
            </div>
          </template>
        </div>
      </div>

      <!-- 答题结果提示 -->
      <div v-if="showAnswerResult" class="answer-result-overlay" :class="answerResultClass">
        <div class="result-card">
          <div class="result-icon">{{ answerResult.isCorrect ? '✓' : '✗' }}</div>
          <p class="result-text">{{ answerResult.message }}</p>
          <p v-if="answerResult.aiResult" class="result-reason">{{ answerResult.aiResult.reason }}</p>
        </div>
      </div>
    </div>

    <!-- 游戏结果弹窗 -->
    <div v-if="showResult" class="result-modal">
      <div class="modal-content">
        <h3>{{ gameResult.isWinner ? '恭喜获胜！' : '很遗憾，你输了' }}</h3>
        <div class="result-info">
          <p>胜者：{{ gameResult.winner?.username || gameResult.winner?.userId }} ({{ gameResult.winnerScore || 0 }}分)</p>
          <p>败者：{{ gameResult.loser?.username || gameResult.loser?.userId }} ({{ gameResult.loserScore || 0 }}分)</p>
          <p>共 {{ gameResult.totalRounds || 0 }} 轮</p>
          <p v-if="gameResult.reason">原因：{{ getReasonText(gameResult.reason) }}</p>
        </div>
        <div v-if="gameResult.isRanking && rankingChange" class="ranking-change">
          <div class="change-item">
            <span class="change-label">积分变化</span>
            <span class="change-value" :style="{ color: rankingChange.ratingChange >= 0 ? '#4ade80' : '#f87171' }">
              {{ rankingChange.ratingChange >= 0 ? '+' : '' }}{{ rankingChange.ratingChange }}分
            </span>
          </div>
          <div class="change-item" v-if="rankingChange.newLevel">
            <span class="change-label">当前段位</span>
            <span class="change-value rank-display" :style="{ color: getRankColor(rankingChange.newLevel) }">
              {{ getRankIcon(rankingChange.newLevel) }} {{ rankingChange.newLevel }}
            </span>
          </div>
        </div>
        <button class="confirm-btn" @click="closeResult">确定</button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-toast">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import feihualingSocket from '@/services/feihualingSocket'
import api from '@/services/api'

const router = useRouter()

const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
const currentUserId = ref(storedUser?.id?.toString() || null)
const currentUsername = ref(storedUser?.username || '')
const onlineUsers = ref([])

const selectedDifficulty = ref(null)
const difficulties = [
  { level: 'easy', name: '入门', description: '任意位置包含令字即可', timeLimit: 60 },
  { level: 'medium', name: '进阶', description: '令字位置轮流变化', timeLimit: 45 },
  { level: 'hard', name: '专业', description: '令字位置严格限制', timeLimit: 30 },
  { level: 'ranking', name: '🏆 排位赛', description: '在线对战提升段位，证明实力', timeLimit: 30, isRanking: true }
]

const isFromRanking = ref(false)
const isRankingMode = computed(() => selectedDifficulty.value === 'ranking')

const selectedKeyword = ref(null)
const customKeyword = ref('')
const recommendedKeywords = ref(['春', '花', '月', '风', '雨', '山', '水', '云', '雪', '夜', '酒', '鸟', '秋', '江', '人', '天'])

const showInvitation = ref(false)
const invitation = ref({})

const inGame = ref(false)
const currentUserRank = ref(null)
const gameData = ref({
  roomId: null,
  keyword: '',
  difficulty: '',
  isRanking: false,
  players: [],
  currentTurn: 0,
  currentRound: 1,
  usedPoems: [],
  timeLimit: 30
})

const showAnswerResult = ref(false)
const answerResult = ref({})
const answerResultClass = ref('')

const timeLeft = ref(30)
let timer = null

const answerInput = ref('')
const answerSubmitting = ref(false)
const isValidating = ref(false)

const showResult = ref(false)
const gameResult = ref({})
const rankingChange = ref(null)

const errorMessage = ref('')
let errorTimer = null
const isRefreshing = ref(false)

const refreshOnlineUsers = () => {
  isRefreshing.value = true
  feihualingSocket.refreshOnlineUsers()
  setTimeout(() => {
    isRefreshing.value = false
  }, 1000)
}

const isMyTurn = computed(() => {
  if (!gameData.value.players.length) return false
  const currentPlayer = gameData.value.players[gameData.value.currentTurn]
  if (!currentPlayer) return false
  // 确保类型一致，都转为字符串比较
  const turnUserId = String(currentPlayer.userId || currentPlayer.id || '')
  const myUserId = String(currentUserId.value || '')
  console.log('[飞花令] isMyTurn检查:', { 
    turnUserId, 
    myUserId, 
    currentTurn: gameData.value.currentTurn,
    players: gameData.value.players 
  })
  return turnUserId === myUserId && myUserId !== ''
})

const getOpponentName = computed(() => {
  const myUserId = String(currentUserId.value || '')
  const opponent = gameData.value.players.find(p => String(p.userId || p.id) !== myUserId)
  return opponent?.username || '对方'
})

const getRankColor = (rankLevel) => {
  const colors = {
    '青铜': '#cd7f32',
    '白银': '#c0c0c0',
    '黄金': '#ffd700',
    '铂金': '#e5e4e2',
    '钻石': '#b9f2ff',
    '大师': '#9932cc',
    '宗师': '#ff4500',
    '王者': '#ff0000'
  }
  return colors[rankLevel] || '#a855f7'
}

const getRankIcon = (rankLevel) => {
  const icons = {
    '青铜': '🥉',
    '白银': '🥈',
    '黄金': '🥇',
    '铂金': '💎',
    '钻石': '💠',
    '大师': '🏆',
    '宗师': '👑',
    '王者': '🌟'
  }
  return icons[rankLevel] || '🥉'
}

const getDifficultyName = (level) => {
  const diff = difficulties.find(d => d.level === level)
  return diff ? diff.name : level
}

const selectDifficulty = (level) => {
  selectedDifficulty.value = level
  
  if (level === 'ranking') {
    const randomIndex = Math.floor(Math.random() * recommendedKeywords.value.length)
    selectedKeyword.value = recommendedKeywords.value[randomIndex]
    console.log(`[排位赛] 自动随机令字: ${selectedKeyword.value}`)
  }
}

const selectKeyword = (keyword) => {
  if (!keyword || keyword.trim().length !== 1) {
    showError('请输入单个汉字')
    return
  }
  selectedKeyword.value = keyword.trim()
}

const resetSelection = () => {
  selectedDifficulty.value = null
  selectedKeyword.value = null
  customKeyword.value = ''
}

const inviteUser = (user) => {
  if (!selectedKeyword.value) {
    showError('请先选择令字')
    return
  }

  feihualingSocket.sendInvitation(
    user.userId,
    selectedKeyword.value,
    selectedDifficulty.value
  )

  showError(`已向 ${user.username} 发送邀请`)
}

const acceptInvitation = () => {
  feihualingSocket.acceptInvitation(
    invitation.value.inviteId,
    invitation.value.from?.userId || invitation.value.inviterId,
    invitation.value.keyword,
    invitation.value.difficulty
  )
  showInvitation.value = false
}

const rejectInvitation = () => {
  feihualingSocket.rejectInvitation(
    invitation.value.inviteId,
    invitation.value.from?.userId || invitation.value.inviterId
  )
  showInvitation.value = false
}

const submitAnswer = () => {
  if (!answerInput.value.trim()) return

  answerSubmitting.value = true
  feihualingSocket.submitAnswer(gameData.value.roomId, answerInput.value.trim())
}

const leaveGame = () => {
  if (confirm('确定要离开游戏吗？离开将判负。')) {
    const myPlayer = gameData.value.players.find(p => p.userId === currentUserId.value)
    const opponent = gameData.value.players.find(p => p.userId !== currentUserId.value)
    if (myPlayer && opponent) {
      feihualingSocket.gameOver(
        gameData.value.roomId,
        opponent.userId,
        currentUserId.value,
        'leave'
      )
    }
    inGame.value = false
    resetSelection()
  }
}

const closeResult = () => {
  showResult.value = false
  showAnswerResult.value = false
  inGame.value = false
  resetSelection()
}

const getReasonText = (reason) => {
  const reasonMap = {
    'wrong_answer': '答错',
    'timeout': '超时',
    'disconnected': '对手断线',
    'leave': '主动离开',
    'score': '分数更高',
    'tie': '平局'
  }
  return reasonMap[reason] || reason || '正常结束'
}

const showError = (message) => {
  errorMessage.value = message
  if (errorTimer) clearTimeout(errorTimer)
  errorTimer = setTimeout(() => {
    errorMessage.value = ''
  }, 3000)
}

const startTimer = () => {
  if (timer) clearInterval(timer)

  timeLeft.value = gameData.value.timeLimit || 30

  timer = setInterval(() => {
    timeLeft.value--

    if (timeLeft.value <= 0) {
      clearInterval(timer)
      feihualingSocket.timeout(gameData.value.roomId)
    }
  }, 1000)
}

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const setupSocketListeners = () => {
  feihualingSocket.on('authenticated', (data) => {
    currentUserId.value = String(data.userId)
    currentUsername.value = data.username
    setTimeout(() => {
      feihualingSocket.refreshOnlineUsers()
    }, 300)
  })

  feihualingSocket.on('online-list-update', (users) => {
    console.log('[飞花令] 收到在线用户列表:', users)
    onlineUsers.value = users
  })

  feihualingSocket.on('online-users', (users) => {
    console.log('[飞花令] 收到在线用户列表(兼容):', users)
    onlineUsers.value = users
  })

  feihualingSocket.on('receive-invitation', (data) => {
    invitation.value = data
    showInvitation.value = true
  })

  feihualingSocket.on('invitation-rejected', () => {
    showError('对方拒绝了你的邀请')
  })

  feihualingSocket.on('game-start', (data) => {
    console.log('[飞花令] 游戏开始:', data)
    console.log('[飞花令] 当前用户ID:', currentUserId.value)
    
    // 后端发送的数据是包裹在 data.room 中的
    const roomData = data.room || data
    
    gameData.value = {
      roomId: roomData.id || roomData.roomId,
      keyword: roomData.keyword || '',
      difficulty: roomData.difficulty || '',
      isRanking: roomData.isRanking || false,
      players: (roomData.players || []).map(p => ({
        ...p,
        userId: String(p.userId || p.id),
        score: 0
      })),
      currentTurn: roomData.currentTurn ?? 0,
      currentRound: roomData.currentRound ?? 1,
      usedPoems: roomData.usedPoems || [],
      timeLimit: roomData.turnTimeLimit || roomData.timeLimit || 30
    }
    
    console.log('[飞花令] 游戏数据:', gameData.value)
    inGame.value = true
    showInvitation.value = false
    answerInput.value = ''
    stopTimer()
    startTimer()

    if (roomData.isRanking) {
      loadPlayersRankInfo(roomData.players || [])
    }
  })

  const loadPlayersRankInfo = async (players) => {
    for (const player of players) {
      try {
        const res = await api.feihuaRanking.getUserRank(player.userId || player.id)
        if (res?.data) {
          const playerIndex = gameData.value.players.findIndex(p => (p.userId || p.id) === (player.userId || player.id))
          if (playerIndex !== -1) {
            gameData.value.players[playerIndex].rankLevel = res.data.rank_level
            gameData.value.players[playerIndex].rating = res.data.rating
          }
        }
      } catch (e) {
        console.log('获取玩家段位失败:', e)
      }
    }
  }

  feihualingSocket.on('validating', () => {
    isValidating.value = true
    stopTimer()
  })

  feihualingSocket.on('timer-tick', (data) => {
    if (data && typeof data.remaining === 'number') {
      timeLeft.value = data.remaining
    }
  })

  feihualingSocket.on('poem-submitted', (data) => {
    answerSubmitting.value = false
    isValidating.value = false

    if (data.isCorrect) {
      showAnswerResult.value = true
      answerResult.value = {
        isCorrect: true,
        message: '回答正确！',
        aiResult: data.aiResult
      }
      answerResultClass.value = 'result-correct'

      setTimeout(() => {
        showAnswerResult.value = false
        // 更新当前轮次
        gameData.value.currentRound = data.currentRound ?? gameData.value.currentRound
        // 更新已用诗句
        if (data.usedPoems) {
          gameData.value.usedPoems = data.usedPoems
        }
        // 更新玩家分数
        if (data.players) {
          gameData.value.players = data.players.map(p => ({
            ...p,
            userId: String(p.userId || p.id)
          }))
        }
        // 切换到下一回合
        gameData.value.currentTurn = data.currentTurn ?? 0
        answerInput.value = ''
        stopTimer()
        startTimer()
      }, 1000)
    }
  })

  feihualingSocket.on('game-result', (data) => {
    stopTimer()
    answerSubmitting.value = false
    isValidating.value = false

    console.log('[飞花令] game-result 事件:', data)
    console.log('[飞花令] 当前用户ID:', currentUserId.value)

    // 统一使用 flat 字段，兼容旧格式
    const winnerUserId = String(data.winnerId ?? data.winner?.userId)
    const loserUserId = String(data.loserId ?? data.loser?.userId)
    const winnerName = data.winnerName ?? data.winner?.username
    const loserName = data.loserName ?? data.loser?.username
    console.log('[飞花令] 胜负判定:', { winnerUserId, myUserId: currentUserId.value, isWinner: winnerUserId === String(currentUserId.value) })

    gameResult.value = {
      isWinner: winnerUserId === String(currentUserId.value),
      winner: { userId: winnerUserId, username: winnerName },
      loser: { userId: loserUserId, username: loserName },
      winnerScore: data.winnerScore ?? 0,
      loserScore: data.loserScore ?? 0,
      totalRounds: data.totalRounds,
      reason: data.reason,
      isRanking: data.isRanking
    }
    
    if (data.rankingChange) {
      rankingChange.value = data.rankingChange
    }
    
    showResult.value = true
  })

  feihualingSocket.on('opponent-disconnected', (data) => {
    stopTimer()

    gameResult.value = {
      isWinner: true,
      winner: data.winner,
      totalRounds: gameData.value.currentRound,
      reason: '对手断线',
      isRanking: gameData.value.isRanking
    }
    
    if (data.rankingChange) {
      rankingChange.value = data.rankingChange
    }
    
    showResult.value = true
  })

  feihualingSocket.on('error', (error) => {
    answerSubmitting.value = false
    isValidating.value = false
    showError(error.error || error.message || '发生错误')
    
    if (!error.isDuplicate) {
      startTimer()
    }
  })

  feihualingSocket.on('disconnected', () => {
    showError('连接已断开，请重新登录')
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  })
}

onMounted(() => {
  const token = localStorage.getItem('token')
  if (!token) {
    router.push('/login')
    return
  }

  setupSocketListeners()
  feihualingSocket.connect(token)

  const fromRanking = sessionStorage.getItem('feihua_ranking_mode')
  if (fromRanking === 'true') {
    isFromRanking.value = true
    selectedDifficulty.value = 'ranking'
    const randomIndex = Math.floor(Math.random() * recommendedKeywords.value.length)
    selectedKeyword.value = recommendedKeywords.value[randomIndex]
    console.log(`[飞花令] 从排位赛页面进入，自动随机令字: ${selectedKeyword.value}`)
    sessionStorage.removeItem('feihua_ranking_mode')
  }

  loadCurrentUserRank()
})

const loadCurrentUserRank = async () => {
  try {
    const res = await api.feihuaRanking.getMe()
    if (res?.data) {
      currentUserRank.value = res.data
    }
  } catch (e) {
    console.log('获取段位信息失败:', e)
  }
}

onUnmounted(() => {
  stopTimer()
  if (errorTimer) clearTimeout(errorTimer)
  feihualingSocket.clearHandlers()
  feihualingSocket.disconnect()
})
</script>

<style scoped>
.feihua-online {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 20px;
  color: #fff;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  padding: 16px 24px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.title-ranking, .title-online {
  background: linear-gradient(90deg, #f5af19, #f12711);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-links {
  display: flex;
  gap: 16px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 20px;
  transition: all 0.3s;
}

.nav-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.nav-link.ranking-link {
  background: rgba(245, 175, 25, 0.2);
  border-color: rgba(245, 175, 25, 0.4);
  color: #f5af19;
}

.lobby {
  max-width: 900px;
  margin: 0 auto;
}

.difficulty-select, .keyword-select, .online-users-section {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  padding: 32px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.difficulty-select h2, .keyword-select h2, .online-users-section h2 {
  margin: 0 0 24px 0;
  text-align: center;
  font-size: 20px;
  color: rgba(255, 255, 255, 0.9);
}

.difficulty-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.difficulty-card {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
  border: 1px solid rgba(102, 126, 234, 0.4);
  padding: 24px 20px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.difficulty-card:hover {
  transform: translateY(-4px);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.5), rgba(118, 75, 162, 0.5));
  border-color: rgba(102, 126, 234, 0.7);
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.difficulty-card h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
  color: #fff;
}

.difficulty-card p {
  margin: 6px 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.time-limit {
  color: #f5af19 !important;
  font-weight: 600;
}

.current-rank-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 20px;
  background: rgba(245, 175, 25, 0.1);
  border: 1px solid rgba(245, 175, 25, 0.3);
  border-radius: 12px;
  margin-bottom: 20px;
}

.rank-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.rank-badge {
  font-size: 18px;
  font-weight: 700;
}

.rank-rating {
  color: #f4d03f;
  font-size: 14px;
  font-weight: 600;
}

.difficulty-card.ranking-card {
  background: linear-gradient(135deg, rgba(245, 175, 25, 0.3), rgba(241, 39, 17, 0.3));
  border: 1px solid rgba(245, 175, 25, 0.5);
}

.difficulty-card.ranking-card:hover {
  background: linear-gradient(135deg, rgba(245, 175, 25, 0.5), rgba(241, 39, 17, 0.5));
  border-color: rgba(245, 175, 25, 0.7);
  box-shadow: 0 8px 32px rgba(245, 175, 25, 0.3);
}

.difficulty-card.ranking-card h3 {
  color: #f5af19;
}

.keyword-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.keyword-btn {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  border: 2px solid rgba(102, 126, 234, 0.5);
  background: rgba(102, 126, 234, 0.15);
  color: #fff;
  font-size: 22px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.keyword-btn:hover {
  background: rgba(102, 126, 234, 0.4);
  border-color: rgba(102, 126, 234, 0.8);
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.custom-keyword {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
}

.custom-keyword input {
  padding: 10px 16px;
  border: 2px solid rgba(102, 126, 234, 0.5);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 18px;
  width: 100px;
  text-align: center;
  outline: none;
}

.custom-keyword input::placeholder {
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
}

.custom-keyword button {
  padding: 10px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.custom-keyword button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.custom-keyword button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.back-btn, .change-btn {
  display: block;
  margin: 0 auto;
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover, .change-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.current-setting {
  background: rgba(0, 0, 0, 0.2);
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.current-setting p {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
}

.keyword-badge {
  display: inline-block;
  padding: 4px 14px;
  background: linear-gradient(135deg, #f5af19, #f12711);
  color: white;
  border-radius: 20px;
  font-weight: 600;
  font-size: 16px;
}

.empty-users {
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.5);
}

.online-users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.online-users-header h2 {
  margin: 0;
}

.refresh-btn {
  padding: 8px 16px;
  background: rgba(102, 126, 234, 0.2);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(102, 126, 234, 0.4);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(102, 126, 234, 0.4);
  border-color: rgba(102, 126, 234, 0.6);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tip {
  font-size: 13px;
  margin-top: 8px;
}

.users-list {
  display: grid;
  gap: 12px;
}

.user-card {
  background: rgba(255, 255, 255, 0.06);
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;
}

.user-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(102, 126, 234, 0.4);
}

.user-card.in-game {
  opacity: 0.5;
}

.user-card.is-me {
  border-color: rgba(118, 75, 162, 0.6);
  background: rgba(118, 75, 162, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.user-name {
  font-weight: 600;
  color: #fff;
  font-size: 15px;
}

.user-class, .user-record {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.invite-btn {
  padding: 8px 18px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.3s;
}

.invite-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.invite-btn:disabled {
  background: rgba(255, 255, 255, 0.15);
  cursor: not-allowed;
}

.me-badge {
  padding: 4px 12px;
  background: rgba(118, 75, 162, 0.6);
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.invitation-modal, .result-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: rgba(30, 30, 60, 0.98);
  padding: 32px;
  border-radius: 20px;
  max-width: 420px;
  width: 90%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.modal-content h3 {
  margin: 0 0 20px 0;
  color: #fff;
  font-size: 20px;
}

.inviter-info p {
  margin: 10px 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  text-align: left;
  padding-left: 12px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.accept-btn, .reject-btn, .confirm-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s;
}

.accept-btn {
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  color: white;
}

.accept-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.reject-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.reject-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.confirm-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.result-info p {
  margin: 10px 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 15px;
}

.ranking-change {
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.change-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.change-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.change-value {
  font-size: 18px;
  font-weight: 700;
}

.change-value.rank-display {
  font-size: 20px;
}

.game-room {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.game-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.round-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.keyword-display {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
}

.keyword-hero {
  font-size: 28px;
  font-weight: 700;
  color: #f5af19;
  text-shadow: 0 0 15px rgba(245, 175, 25, 0.5);
}

.round-tag {
  background: rgba(102, 126, 234, 0.3);
  color: rgba(255, 255, 255, 0.9);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.time-tag {
  background: rgba(244, 67, 54, 0.3);
  color: #ff6b6b;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  min-width: 52px;
  text-align: center;
  transition: all 0.3s;
}

.time-tag.time-warning {
  background: rgba(244, 67, 54, 0.6);
  color: #fff;
  animation: timePulse 0.5s infinite;
}

@keyframes timePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.leave-btn {
  padding: 8px 16px;
  background: rgba(244, 67, 54, 0.2);
  color: #ff6b6b;
  border: 1px solid rgba(244, 67, 54, 0.4);
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.leave-btn:hover {
  background: rgba(244, 67, 54, 0.35);
}

.players-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.player-card-compact {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px 20px;
  transition: all 0.3s;
}

.player-card-compact.current-turn {
  border-color: rgba(102, 126, 234, 0.6);
  background: rgba(102, 126, 234, 0.12);
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.15);
}

.player-card-compact.is-me {
  border-color: rgba(245, 175, 25, 0.5);
}

.player-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.player-avatar-small {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
  position: relative;
}

.rank-badge-mini {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  border: 2px solid #1a1a2e;
}

.player-card-compact.current-turn .player-avatar-small {
  background: linear-gradient(135deg, #f5af19, #f12711);
}

.player-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.player-name {
  font-weight: 600;
  color: #fff;
  font-size: 15px;
}

.turn-badge {
  background: linear-gradient(135deg, #f5af19, #f12711);
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.me-tag {
  background: rgba(118, 75, 162, 0.5);
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.player-score-display {
  padding-left: 54px;
}

.score-correct {
  color: #4ade80;
  font-size: 15px;
  font-weight: 600;
}

.game-main-area {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.used-poems-panel {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 360px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.panel-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.poems-scroll-area {
  overflow-y: auto;
  flex: 1;
  padding: 8px 0;
}

.poems-scroll-area::-webkit-scrollbar {
  width: 4px;
}

.poems-scroll-area::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.poems-empty {
  padding: 40px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
}

.poem-line {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.2s;
}

.poem-line:last-child {
  border-bottom: none;
}

.poem-line:hover {
  background: rgba(255, 255, 255, 0.04);
}

.poem-num {
  color: rgba(102, 126, 234, 0.7);
  font-size: 12px;
  font-weight: 600;
  min-width: 18px;
  padding-top: 2px;
}

.poem-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.poem-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  line-height: 1.5;
  font-family: 'STSong', 'SimSun', serif;
}

.poem-author {
  color: rgba(255, 255, 255, 0.35);
  font-size: 11px;
}

.input-panel {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.question-display {
  text-align: center;
  padding: 16px;
  background: rgba(102, 126, 234, 0.15);
  border-radius: 12px;
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.question-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.question-text {
  font-size: 18px;
  color: #fff;
  font-weight: 600;
  line-height: 1.5;
}

.progress-info {
  padding: 16px;
}

.player-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.player-progress:last-child {
  margin-bottom: 0;
}

.progress-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  min-width: 60px;
}

.progress-bar-container {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-score {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-score {
  font-size: 14px;
  color: #4ade80;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}

.input-prompt {
  text-align: center;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);
  padding: 10px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.prompt-keyword {
  color: #f5af19;
  font-size: 20px;
  font-weight: 700;
  margin: 0 4px;
  text-shadow: 0 0 10px rgba(245, 175, 25, 0.4);
}

.input-row {
  display: flex;
  gap: 10px;
}

.answer-input {
  flex: 1;
  padding: 14px 16px;
  border: 2px solid rgba(102, 126, 234, 0.4);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 16px;
  outline: none;
  transition: all 0.3s;
}

.answer-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
}

.answer-input:focus {
  border-color: rgba(102, 126, 234, 0.8);
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.answer-input:disabled {
  opacity: 0.6;
}

.submit-btn {
  padding: 14px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.answer-result-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
  pointer-events: none;
}

.result-card {
  background: rgba(30, 30, 60, 0.98);
  padding: 32px 48px;
  border-radius: 20px;
  text-align: center;
  animation: resultPop 0.4s ease;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.result-correct .result-card {
  border-color: rgba(74, 222, 128, 0.5);
  box-shadow: 0 0 40px rgba(74, 222, 128, 0.2);
}

.result-wrong .result-card {
  border-color: rgba(248, 113, 113, 0.5);
  box-shadow: 0 0 40px rgba(248, 113, 113, 0.2);
}

@keyframes resultPop {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

.result-icon {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 12px;
}

.result-correct .result-icon {
  color: #4ade80;
}

.result-wrong .result-icon {
  color: #f87171;
}

.result-text {
  color: #fff;
  font-size: 18px;
  margin: 0 0 8px 0;
}

.result-reason {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  margin: 0;
}

.waiting-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 14px;
}

.waiting-icon {
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  width: 60px;
  height: 60px;
  border: 3px solid rgba(102, 126, 234, 0.3);
  border-radius: 50%;
  animation: pulseRing 1.5s infinite;
}

.pulse-dot {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  animation: pulseDot 1.5s infinite;
}

@keyframes pulseRing {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}

@keyframes pulseDot {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.waiting-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  margin: 0;
  font-weight: 500;
}

.waiting-hint {
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  margin: 0;
}

.time-remain {
  color: #ff6b6b;
  font-weight: 700;
  font-size: 15px;
}

.error-toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(244, 67, 54, 0.9);
  color: white;
  padding: 12px 28px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1001;
  animation: slideUp 0.3s ease;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateX(-50%) translateY(16px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@media (max-width: 768px) {
  .feihua-online {
    padding: 12px;
  }

  .nav-header {
    flex-direction: column;
    gap: 12px;
  }

  .game-top-bar {
    flex-wrap: wrap;
    justify-content: center;
  }

  .players-row {
    grid-template-columns: 1fr;
  }

  .player-score-display {
    padding-left: 0;
  }

  .game-main-area {
    grid-template-columns: 1fr;
  }
}
</style>
