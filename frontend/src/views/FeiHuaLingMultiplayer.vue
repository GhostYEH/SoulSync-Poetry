<template>
  <div class="feihualing-multiplayer" :class="{ 'in-game': currentRoom }">
    <!-- 背景效果 -->
    <div class="profile-background" :style="bgStyleInline">
      <div class="bg-skeleton"></div>
      <img
        v-if="backgroundUrl"
        :src="backgroundUrl"
        class="bg-image"
        :class="{ 'bg-image-visible': bgLoaded }"
        @load="onBgLoad"
        @error="onBgError"
        alt="背景"
      />
      <div class="bg-overlay"></div>
      <div class="bg-particle" v-for="n in 30" :key="n" :style="getParticleStyle(n)"></div>
    </div>

    <!-- 大厅容器 -->
    <div v-if="!currentRoom" class="lobby-container">
      <div class="lobby-header">
        <h1 class="page-title">飞花令 - 联机对战</h1>
        <div class="lobby-actions">
          <router-link to="/feihualing/single" class="mode-link">
            <span class="link-icon">🌺</span>
            单人练习
          </router-link>
        </div>
      </div>

      <div class="lobby-content">
        <div class="panel">
          <div class="panel-header">
            <h2 class="panel-title">
              <span class="title-icon">👥</span>
              在线玩家
            </h2>
            <span class="online-count">{{ onlineUsers.length }} 人在线</span>
          </div>
          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
          </div>
          <div v-else-if="onlineUsers.length === 0" class="empty-state">
            <div class="empty-icon">🌸</div>
            <p>暂无在线玩家</p>
            <p class="hint">邀请好友一起来玩吧！</p>
          </div>
          <div v-else class="users-list">
            <div 
              v-for="user in onlineUsers" 
              :key="user.userId"
              class="user-item"
              :class="{ 'in-game': user.inGame }"
              @click="inviteUser(user)"
            >
              <span class="user-avatar">{{ user.username.charAt(0).toUpperCase() }}</span>
              <div class="user-info">
                <span class="user-name">{{ user.username }}</span>
                <span class="status-badge" :class="user.inGame ? 'gaming' : 'online'">
                  {{ user.inGame ? '游戏中' : '在线' }}
                </span>
              </div>
              <div class="user-action">
                <span v-if="user.inGame" class="action-disabled">进行中</span>
                <span v-else class="action-invite">邀请对战</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h2 class="panel-title">
              <span class="title-icon">📜</span>
              最近战绩
            </h2>
          </div>
          <div v-if="historyLoading" class="loading-state small">
            <div class="loading-spinner small"></div>
          </div>
          <div v-else-if="gameHistory.length === 0" class="empty-state">
            <div class="empty-icon">🎮</div>
            <p>暂无对战记录</p>
          </div>
          <div v-else class="history-list">
            <div v-for="record in gameHistory" :key="record.id" class="history-item">
              <div class="history-info">
                <span class="history-players">{{ record.player1 }} VS {{ record.player2 }}</span>
              </div>
              <span class="history-result" :class="getResultClass(record)">
                {{ record.winner ? (record.winner === currentUsername ? '胜利' : '失败') : '平局' }}
              </span>
              <span class="history-date">{{ formatDate(record.date) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 游戏房间 -->
    <div v-else class="game-room-fullscreen">
      <div class="game-hud">
        <div class="hud-left">
          <div class="keyword-display">
            <span class="keyword-label">关键字</span>
            <span class="keyword-char">{{ currentRoom.keyword }}</span>
          </div>
        </div>
        <div class="hud-center">
          <div class="round-display">
            <span class="round-label">第</span>
            <span class="round-num">{{ displayRound }}</span>
            <span class="round-label">回合</span>
          </div>
        </div>
        <div class="hud-right">
          <div class="timer-display" :class="{ 'warning': remainingTime <= 10, 'danger': remainingTime <= 5 }">
            <span class="timer-icon">⏱️</span>
            <span class="timer-value">{{ remainingTime }}秒</span>
          </div>
          <button class="leave-btn" @click="leaveGame" :disabled="isSubmitting">离开</button>
        </div>
      </div>

      <div class="players-section">
        <div 
          v-for="(player, index) in currentRoom.players" 
          :key="playerId(player) || index"
          class="player-card"
          :class="{ 
            'current-turn': index === currentRoom.currentTurn,
            'is-me': playerId(player) === currentUserId,
            'disconnected': player.disconnected
          }"
        >
          <div class="player-avatar-lg">{{ player.username.charAt(0).toUpperCase() }}</div>
          <div class="player-details">
            <span class="player-name">{{ player.username }}</span>
            <span v-if="playerId(player) === currentUserId" class="me-badge">我</span>
          </div>
          <div v-if="player.disconnected" class="disconnect-indicator">
            ⚠️ 断线中...
          </div>
          <div v-else-if="index === currentRoom.currentTurn" class="turn-indicator">
            <span class="pulse-ring"></span>
            思考中
          </div>
          <div v-else class="waiting-indicator">
            等待中
          </div>
        </div>
      </div>

      <div class="poems-display">
        <div class="poems-header">
          <h3>已用诗句</h3>
          <span class="poems-count">{{ currentRoom.usedPoems.length }} 句</span>
        </div>
        <div class="poems-scroll">
          <span 
            v-for="(poem, index) in currentRoom.usedPoems" 
            :key="index"
            class="used-poem"
          >
            {{ formatUsedPoem(poem) }}
          </span>
          <span v-if="currentRoom.usedPoems.length === 0" class="no-poems">暂无诗句</span>
        </div>
      </div>

      <div class="input-section">
        <div v-if="isValidating" class="validating-overlay">
          <div class="validating-spinner"></div>
          <p>正在验证诗句...</p>
        </div>
        <div v-else-if="isMyTurn" class="answer-area">
          <input
            v-model="answerInput"
            type="text"
            class="poem-input"
            :placeholder="`请输入包含「${currentRoom.keyword}」字的诗句...`"
            @keyup.enter="submitAnswer"
            :disabled="isSubmitting"
            ref="answerInputRef"
          />
          <button 
            class="submit-btn"
            @click="submitAnswer"
            :disabled="isSubmitting || !answerInput.trim()"
          >
            <span v-if="isSubmitting" class="btn-loading"></span>
            {{ isSubmitting ? '提交中...' : '提交' }}
          </button>
        </div>
        <div v-else class="waiting-area">
          <div class="waiting-icon">⏳</div>
          <p>等待对方回答...</p>
          <p class="waiting-hint">请准备好你的诗句</p>
        </div>
      </div>
    </div>

    <div v-if="showInvitationModal" class="modal-overlay" @click.self="closeInvitationModal">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-icon">🎮</div>
          <h3>游戏邀请</h3>
        </div>
        <div class="modal-body">
          <p><strong>{{ invitationFrom?.username }}</strong> 邀请你进行飞花令对战</p>
          <p class="invitation-detail">关键字：<span class="keyword-highlight">{{ invitationKeyword }}</span></p>
          <p class="invitation-detail">准备好接受挑战了吗？</p>
        </div>
        <div class="waiting-animation">
          <div class="waiting-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="modal-btn decline" @click="declineInvitation">拒绝</button>
          <button class="modal-btn accept" @click="acceptInvitation">接受挑战</button>
        </div>
      </div>
    </div>

    <div v-if="showGameEndModal" class="modal-overlay" @click.self="closeGameEndModal">
      <div class="modal-card result-modal">
        <div class="modal-header">
          <div class="modal-icon">{{ isWinnerMe ? '🎉' : '😢' }}</div>
          <h3>游戏结束</h3>
        </div>
        <div class="modal-body">
          <div class="result-display" :class="{ 'win': isWinnerMe }">
            <p class="result-text">{{ isWinnerMe ? '恭喜你赢了！' : '对方获胜' }}</p>
            <p v-if="gameEndReason" class="result-reason">{{ gameEndReason }}</p>
          </div>
          <div class="poems-review">
            <h4>精彩回顾</h4>
            <div class="poems-list">
              <span v-for="(poem, index) in currentRoom?.usedPoems" :key="index" class="poem-item">
                {{ poem }}
              </span>
              <span v-if="!currentRoom?.usedPoems?.length" class="no-poems">本局无诗句</span>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="modal-btn primary" @click="backToLobby">返回大厅</button>
        </div>
      </div>
    </div>

    <div v-if="showWaitingModal" class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-icon">⏳</div>
          <h3>等待对方响应</h3>
        </div>
        <div class="modal-body">
          <div class="waiting-animation">
            <div class="waiting-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
          <p>邀请已发送，等待对方接受...</p>
          <p class="invitation-detail">关键字：<span class="keyword-highlight">{{ sentKeyword }}</span></p>
        </div>
        <div class="modal-actions">
          <button class="modal-btn" @click="cancelInvitation">取消邀请</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { io } from 'socket.io-client';
import { getAvailableKeywords } from '@/data/feihuaPoems';

export default {
  name: 'FeiHuaLingMultiplayer',
  setup() {
    const router = useRouter();
    const socket = ref(null);
    const onlineUsers = ref([]);
    const gameHistory = ref([]);
    const currentRoom = ref(null);
    const answerInput = ref('');
    const isSubmitting = ref(false);
    const isValidating = ref(false);
    const showInvitationModal = ref(false);
    const showGameEndModal = ref(false);
    const showWaitingModal = ref(false);
    const invitationFrom = ref(null);
    const invitationKeyword = ref('花');
    const sentKeyword = ref('花');
    const gameWinner = ref(null);
    const gameEndReason = ref('');
    const loading = ref(true);
    const historyLoading = ref(false);
    const remainingTime = ref(30);
    const answerInputRef = ref(null);

    // ===== 本地倒计时管理 =====
    const timerPaused = ref(false);
    const localTimerInterval = ref(null);
    const startLocalTimer = (initialSeconds) => {
      stopLocalTimer();
      remainingTime.value = initialSeconds || currentRoom.value?.turnTimeLimit || 30;
      timerPaused.value = false;
      localTimerInterval.value = setInterval(() => {
        if (!timerPaused.value && remainingTime.value > 0) {
          remainingTime.value -= 1;
        }
        if (remainingTime.value <= 0 && !timerPaused.value) {
          stopLocalTimer();
        }
      }, 1000);
    };
    const stopLocalTimer = () => {
      if (localTimerInterval.value) {
        clearInterval(localTimerInterval.value);
        localTimerInterval.value = null;
      }
    };
    const pauseLocalTimer = () => { timerPaused.value = true; };
    const resetLocalTimer = (seconds) => {
      stopLocalTimer();
      remainingTime.value = seconds || currentRoom.value?.turnTimeLimit || 30;
      timerPaused.value = false;
      startLocalTimer(remainingTime.value);
    };

    const currentUser = ref(JSON.parse(localStorage.getItem('user') || '{}'));
    const currentUserId = ref(currentUser.value?.id?.toString());
    const currentUsername = ref(currentUser.value?.username);

    // ===== 背景图 =====
    const backgroundUrl = ref('');
    const bgLoaded = ref(false);
    const PROFILE_BACKGROUNDS = [
      './profile-bg/1.jpg',
      './profile-bg/2.jpg',
      './profile-bg/3.jpg',
      './profile-bg/4.jpg',
    ];
    const bgStyleInline = ref({});
    const loadBackground = () => {
      const randomIndex = Math.floor(Math.random() * PROFILE_BACKGROUNDS.length);
      const chosen = PROFILE_BACKGROUNDS[randomIndex];
      backgroundUrl.value = chosen;
      bgStyleInline.value = {
        backgroundImage: `url(${chosen})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    };
    const onBgLoad = () => { bgLoaded.value = true; };
    const onBgError = () => { bgLoaded.value = true; };

    /** 兼容服务端下发的 id / userId */
    const playerId = (p) => (p && (p.id ?? p.userId) != null ? String(p.id ?? p.userId) : '');

    const displayRound = computed(() => {
      const r = currentRoom.value;
      if (!r) return 1;
      // usedPoems.length 就是当前已完成的回合数
      // game-start 时: usedPoems=[], 显示 1
      // 第1句诗后: usedPoems=[{...}], 显示 1
      // 第2句诗后: usedPoems=[{...},{...}], 显示 2
      const used = r.usedPoems?.length ?? 0;
      return Math.max(1, used + 1);
    });

    const formatUsedPoem = (poem) => {
      if (typeof poem === 'string') return poem;
      if (poem && typeof poem === 'object') {
        return poem.original || poem.normalized || '';
      }
      return '';
    };

    const isWinnerMe = computed(() => {
      const w = gameWinner.value;
      if (!w) return false;
      const wid = (w.id ?? w.userId)?.toString();
      return wid === currentUserId.value;
    });

    const isMyTurn = computed(() => {
      if (!currentRoom.value) return false;
      const myIndex = currentRoom.value.players.findIndex(p => playerId(p) === currentUserId.value);
      return myIndex === currentRoom.value.currentTurn;
    });

    watch(isMyTurn, async (newVal) => {
      if (newVal && answerInputRef.value) {
        await nextTick();
        answerInputRef.value.focus();
      }
    });

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
    };

    const getPetalStyle = (i) => ({
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 10}s`,
      animationDuration: `${8 + Math.random() * 8}s`,
      fontSize: `${10 + Math.random() * 12}px`,
      opacity: 0.15 + Math.random() * 0.25
    });

    const connectSocket = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
      socket.value = io(socketUrl, {
        transports: ['websocket', 'polling']
      });

      socket.value.on('connect', () => {
        console.log('Socket连接成功');
        socket.value.emit('authenticate', { token });
      });

      socket.value.on('authenticated', () => {
        socket.value.emit('feihualing:get-online-users');
      });

      socket.value.on('online-users', (users) => {
        onlineUsers.value = users.filter(u => u.userId !== currentUserId.value);
        loading.value = false;
      });

      socket.value.on('receive-invitation', (data) => {
        invitationFrom.value = data.from;
        invitationKeyword.value = data.keyword || '花';
        showInvitationModal.value = true;
      });

      socket.value.on('invitation-sent', (data) => {
        showWaitingModal.value = true;
        sentKeyword.value = data.keyword || '花';
      });

      socket.value.on('invitation-rejected', () => {
        showWaitingModal.value = false;
        alert('对方拒绝了你的邀请');
      });

      socket.value.on('game-start', (data) => {
        showWaitingModal.value = false;
        showInvitationModal.value = false;
        currentRoom.value = {
          id: data.roomId,
          keyword: data.keyword,
          difficulty: data.difficulty,
          isRanking: data.isRanking,
          players: data.players,
          currentTurn: data.currentTurn,
          currentRound: 1,
          usedPoems: [],
          turnTimeLimit: data.timeLimit || 30,
          currentQuestion: data.currentQuestion,
          currentQuestionIndex: data.currentQuestionIndex,
          totalQuestions: data.totalQuestions
        };
        startLocalTimer(data.timeLimit || 30);
      });

      socket.value.on('validating', () => {
        isValidating.value = true;
        pauseLocalTimer();
      });

      socket.value.on('poem-submitted', (data) => {
        isValidating.value = false;
        isSubmitting.value = false;
        answerInput.value = '';
        if (!currentRoom.value) return;
        if (data.players) {
          currentRoom.value.players = data.players;
        }
        if (typeof data.currentTurn === 'number') {
          currentRoom.value.currentTurn = data.currentTurn;
        }
        if (typeof data.currentRound === 'number') {
          currentRoom.value.currentRound = data.currentRound;
        }
        if (Array.isArray(data.usedPoems)) {
          currentRoom.value.usedPoems = data.usedPoems;
        }
        // 判题完成后恢复倒计时
        if (data.isCorrect !== false) {
          resetLocalTimer(currentRoom.value?.turnTimeLimit || 30);
        }
      });

      socket.value.on('timer-tick', (data) => {
        remainingTime.value = data.remaining;
        if (currentRoom.value) {
          // data.currentTurn 是数字索引，直接使用
          if (typeof data.currentTurn === 'number') {
            currentRoom.value.currentTurn = data.currentTurn;
          }
          if (Array.isArray(data.players)) {
            currentRoom.value.players = data.players;
          }
        }
      });

      socket.value.on('timer-pause', () => {
        pauseLocalTimer();
      });

      socket.value.on('timer-resume', () => {
        timerPaused.value = false;
      });

      socket.value.on('question-thrown', (data) => {
        if (!currentRoom.value) return;
        if (Array.isArray(data.players)) {
          currentRoom.value.players = data.players;
        }
        if (typeof data.currentTurn === 'number') {
          currentRoom.value.currentTurn = data.currentTurn;
        }
        if (data.remainingThrows != null && currentRoom.value.players) {
          const me = currentRoom.value.players.find(p => playerId(p) === currentUserId.value);
          if (me) me.remainingThrows = data.remainingThrows;
        }
        resetLocalTimer(currentRoom.value?.turnTimeLimit || 30);
      });

      socket.value.on('invitation-cancelled', () => {
        showWaitingModal.value = false;
      });

      socket.value.on('game-result', (data) => {
        stopLocalTimer();
        const winnerUserId = data.winnerId ?? data.winner?.userId;
        const winnerName = data.winnerName ?? data.winner?.username;
        gameWinner.value = { userId: winnerUserId, username: winnerName };
        gameEndReason.value = data.reason || '';
        showGameEndModal.value = true;
        // 同步完整 room 状态，避免 game-start 缓存残留
        if (currentRoom.value) {
          currentRoom.value.currentRound = data.currentRound ?? currentRoom.value.currentRound;
          currentRoom.value.currentTurn = -1;
          currentRoom.value.usedPoems = data.usedPoems ?? currentRoom.value.usedPoems;
        }
        // 等模态框动画结束后再清理
        setTimeout(() => {
          currentRoom.value = null;
        }, 100);
      });

      socket.value.on('opponent-disconnected', (data) => {
        gameWinner.value = data.winner;
        gameEndReason.value = data.message || '对手离开了游戏';
        showGameEndModal.value = true;
        if (currentRoom.value) {
          currentRoom.value.currentRound = data.currentRound ?? currentRoom.value.currentRound;
          currentRoom.value.currentTurn = -1;
        }
        setTimeout(() => {
          currentRoom.value = null;
        }, 100);
      });

      socket.value.on('error', (data) => {
        isValidating.value = false;
        isSubmitting.value = false;
        const errorMsg = data.isDuplicate ? '这句诗已经用过了，请换一句！' : (data.error || '提交失败');
        alert(errorMsg);
      });

      socket.value.on('disconnect', () => {
        console.log('Socket断开连接');
        loading.value = true;
      });
    };

    const inviteUser = (user) => {
      if (user.inGame) {
        alert('对方正在游戏中');
        return;
      }
      if (socket.value) {
        socket.value.emit('send-invitation', { targetUserId: user.userId });
      }
    };

    const acceptInvitation = () => {
      if (socket.value && invitationFrom.value) {
        socket.value.emit('accept-invitation', {
          inviteId: 'invite-' + Date.now(),
          inviterId: invitationFrom.value.userId
        });
        showInvitationModal.value = false;
      }
    };

    const declineInvitation = () => {
      if (socket.value && invitationFrom.value) {
        socket.value.emit('reject-invitation', {
          inviteId: 'invite-' + Date.now(),
          inviterId: invitationFrom.value.userId
        });
        showInvitationModal.value = false;
      }
    };

    const cancelInvitation = () => {
      if (socket.value) {
        socket.value.emit('cancel-invitation');
      }
      showWaitingModal.value = false;
    };

    const submitAnswer = () => {
      if (!answerInput.value.trim() || isSubmitting.value || !socket.value) return;
      isSubmitting.value = true;
      socket.value.emit('submit-poem', {
        roomId: currentRoom.value.id,
        poem: answerInput.value.trim()
      });
      // 等后端 poem-submitted / error 到达后再清空
    };

    const leaveGame = () => {
      if (confirm('确定要离开游戏吗？离开将判负！')) {
        if (socket.value && currentRoom.value) {
          const opponent = currentRoom.value.players.find(p => playerId(p) !== currentUserId.value);
          if (!opponent) {
            currentRoom.value = null;
            return;
          }
          const opponentId = playerId(opponent);
          socket.value.emit('game-over', {
            roomId: currentRoom.value.id,
            winnerId: opponentId,
            loserId: currentUserId.value,
            reason: '主动离开'
          });
        }
      }
    };

    const backToLobby = () => {
      currentRoom.value = null;
      showGameEndModal.value = false;
      if (socket.value) {
        socket.value.emit('feihualing:get-online-users');
      }
    };

    const closeInvitationModal = () => {
      showInvitationModal.value = false;
    };

    const closeGameEndModal = () => {
      showGameEndModal.value = false;
    };

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getResultClass = (record) => {
      return record.winner === currentUsername.value ? 'win' : 'lose';
    };

    const loadGameHistory = async () => {
      historyLoading.value = true;
      try {
        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const response = await fetch(`${baseUrl}/feihua/fight-history`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          gameHistory.value = result.data || [];
        }
      } catch (error) {
        console.error('加载对战历史失败:', error);
      } finally {
        historyLoading.value = false;
      }
    };

    onMounted(() => {
      bgLoaded.value = true;
      loadBackground();
      connectSocket();
      loadGameHistory();
    });

    onUnmounted(() => {
      stopLocalTimer();
      if (socket.value) {
        socket.value.disconnect();
        socket.value = null;
      }
    });

    return {
      bgLoaded,
      backgroundUrl,
      bgStyleInline,
      getParticleStyle,
      getPetalStyle,
      onlineUsers,
      gameHistory,
      currentRoom,
      answerInput,
      isSubmitting,
      isValidating,
      showInvitationModal,
      showGameEndModal,
      showWaitingModal,
      invitationFrom,
      invitationKeyword,
      sentKeyword,
      gameWinner,
      gameEndReason,
      currentUserId,
      currentUsername,
      playerId,
      displayRound,
      formatUsedPoem,
      isWinnerMe,
      isMyTurn,
      loading,
      historyLoading,
      remainingTime,
      answerInputRef,
      inviteUser,
      acceptInvitation,
      declineInvitation,
      cancelInvitation,
      submitAnswer,
      leaveGame,
      backToLobby,
      closeInvitationModal,
      closeGameEndModal,
      formatDate,
      getResultClass
    };
  }
};
</script>

<style scoped>
/* ===== 全屏布局基础 ===== */
.feihualing-multiplayer {
  min-height: 100vh;
  min-height: 100dvh;
  width: 100vw;
  min-width: 100vw;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 50%, #0a1a2a 100%);
  z-index: 999;
}

.feihualing-multiplayer.in-game {
  background: linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #415a77 100%);
}

/* ===== 背景效果 ===== */
.profile-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  overflow: hidden;
  background: linear-gradient(135deg, #0d0b1a 0%, #1a1035 30%, #0f0c2e 60%, #150d2a 100%);
}

.bg-skeleton {
  position: absolute;
  inset: 0;
  background: inherit;
  filter: blur(8px);
  transform: scale(1.05);
  transition: opacity 0.6s ease;
}

.profile-background:has(.bg-image-visible) .bg-skeleton {
  opacity: 0;
}

.bg-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.bg-image-visible {
  opacity: 1;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.1) 0%,
    rgba(0, 0, 0, 0.3) 50%,
    rgba(0, 0, 0, 0.4) 100%
  );
  pointer-events: none;
  z-index: 1;
}

.bg-particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(200, 180, 255, 0.4), transparent);
  animation: floatParticle linear infinite;
  pointer-events: none;
  z-index: 2;
}

@keyframes floatParticle {
  0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
  10% { opacity: 1; }
  50% { transform: translateY(-30vh) translateX(15vw) scale(1.3); opacity: 0.6; }
  90% { opacity: 0.3; }
  100% { transform: translateY(-60vh) translateX(-10vw) scale(0.8); opacity: 0; }
}

/* ===== 大厅容器 ===== */
.lobby-container {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 40px 48px;
}

.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 48px;
}

.page-title {
  font-family: 'ZCOOL XiaoWei', 'Noto Serif SC', serif;
  color: #f4d03f;
  margin: 0;
  font-size: 36px;
  font-weight: bold;
  text-shadow: 0 0 20px rgba(244, 208, 63, 0.3);
}

.lobby-actions { display: flex; gap: 16px; }

.mode-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: all 0.3s ease;
  backdrop-filter: blur(12px);
}

.mode-link:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.link-icon { font-size: 18px; }

.lobby-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.panel {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Noto Serif SC', serif;
  color: #fff;
  margin: 0;
  font-size: 22px;
}

.title-icon { font-size: 24px; }

.online-count {
  padding: 6px 16px;
  background: rgba(74, 222, 128, 0.2);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 20px;
  color: #4ade80;
  font-size: 13px;
}

.loading-state {
  text-align: center;
  padding: 48px 24px;
  color: rgba(255, 255, 255, 0.7);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(168, 85, 247, 0.2);
  border-top-color: #a855f7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.loading-spinner.small { width: 24px; height: 24px; border-width: 2px; }

@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 48px 24px; }
.empty-icon { font-size: 48px; margin-bottom: 16px; }

.empty-state p {
  font-family: 'Noto Serif SC', serif;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 8px 0;
}

.empty-state .hint { font-size: 14px; opacity: 0.7; }

.users-list { display: flex; flex-direction: column; gap: 12px; }

.user-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.user-item:hover:not(.in-game) {
  background: rgba(168, 85, 247, 0.15);
  border-color: rgba(168, 85, 247, 0.3);
  transform: translateY(-2px);
}

.user-item.in-game { opacity: 0.5; cursor: not-allowed; }

.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a855f7, #6366f1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: bold;
}

.user-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }

.user-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 17px;
  color: #fff;
}

.status-badge {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  width: fit-content;
}

.status-badge.online {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.status-badge.gaming {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.user-action { font-size: 13px; font-family: 'Noto Serif SC', serif; }

.action-invite {
  padding: 6px 16px;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(99, 102, 241, 0.4));
  border: 1px solid rgba(168, 85, 247, 0.5);
  border-radius: 10px;
  color: #a855f7;
}

.action-disabled { color: rgba(255, 255, 255, 0.4); }

.history-list { display: flex; flex-direction: column; gap: 12px; }

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.history-info { display: flex; align-items: center; gap: 12px; }

.history-players {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.history-result {
  padding: 4px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
}

.history-result.win {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.history-result.lose {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.history-date { font-size: 12px; color: rgba(255, 255, 255, 0.5); }

/* ===== 游戏房间全屏布局 ===== */
.game-room-fullscreen {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ===== 游戏顶部HUD ===== */
.game-hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 48px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.hud-left, .hud-center, .hud-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.keyword-display { display: flex; align-items: center; gap: 12px; }

.keyword-label {
  padding: 6px 16px;
  background: rgba(168, 85, 247, 0.2);
  border: 1px solid rgba(168, 85, 247, 0.3);
  border-radius: 10px;
  color: #a855f7;
  font-size: 13px;
  font-family: 'Noto Serif SC', serif;
}

.keyword-char {
  font-size: 36px;
  font-weight: bold;
  color: #f4d03f;
  font-family: 'Noto Serif SC', serif;
  text-shadow: 0 0 20px rgba(244, 208, 63, 0.5);
}

.round-display { display: flex; align-items: baseline; gap: 6px; }
.round-label { font-size: 14px; color: rgba(255, 255, 255, 0.6); }
.round-num { font-size: 28px; font-weight: bold; color: #a855f7; }

.timer-display {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 16px;
  font-size: 24px;
  color: #a855f7;
  transition: all 0.3s ease;
}

.timer-display.warning {
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.3);
  color: #fbbf24;
}

.timer-display.danger {
  background: rgba(248, 113, 113, 0.15);
  border-color: rgba(248, 113, 113, 0.3);
  color: #f87171;
  animation: pulse-danger 0.5s ease-in-out infinite;
}

@keyframes pulse-danger {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.timer-icon { font-size: 22px; }
.timer-value { font-weight: bold; font-family: 'Noto Serif SC', serif; }

.leave-btn {
  padding: 12px 24px;
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.25);
  border-radius: 12px;
  color: #fca5a5;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Serif SC', serif;
}

.leave-btn:hover:not(:disabled) { background: rgba(248, 113, 113, 0.25); }
.leave-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== 玩家区域 ===== */
.players-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 80px;
  padding: 60px 48px;
}

.player-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 64px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 32px;
  transition: all 0.3s ease;
  min-width: 280px;
}

.player-card.current-turn {
  border-color: #a855f7;
  box-shadow: 0 0 40px rgba(168, 85, 247, 0.3);
  animation: current-turn-glow 2s ease-in-out infinite;
}

@keyframes current-turn-glow {
  0%, 100% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.3); }
  50% { box-shadow: 0 0 60px rgba(168, 85, 247, 0.5); }
}

.player-card.is-me {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(255, 255, 255, 0.08));
}

.player-card.disconnected {
  opacity: 0.6;
  border-color: rgba(248, 113, 113, 0.5);
}

.player-avatar-lg {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a855f7, #6366f1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  box-shadow: 0 8px 32px rgba(168, 85, 247, 0.4);
}

.player-card.current-turn .player-avatar-lg {
  animation: avatar-pulse 1.5s ease-in-out infinite;
}

@keyframes avatar-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.player-details { display: flex; align-items: center; gap: 10px; }

.player-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 24px;
  color: #fff;
  font-weight: bold;
}

.me-badge {
  padding: 4px 12px;
  background: rgba(74, 222, 128, 0.2);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 10px;
  color: #4ade80;
  font-size: 12px;
}

.turn-indicator, .waiting-indicator, .disconnect-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-family: 'Noto Serif SC', serif;
  padding: 10px 20px;
  border-radius: 12px;
}

.turn-indicator {
  background: rgba(168, 85, 247, 0.2);
  color: #a855f7;
}

.pulse-ring {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #a855f7;
  animation: pulse-ring 1.5s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}

.waiting-indicator {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.5);
}

.disconnect-indicator {
  background: rgba(248, 113, 113, 0.15);
  color: #fca5a5;
}

/* ===== 已用诗句展示 ===== */
.poems-display {
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 24px 48px;
}

.poems-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.poems-header h3 {
  font-family: 'Noto Serif SC', serif;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  font-size: 16px;
}

.poems-count {
  padding: 4px 12px;
  background: rgba(168, 85, 247, 0.2);
  border-radius: 10px;
  color: #a855f7;
  font-size: 13px;
}

.poems-scroll {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  max-height: 100px;
  overflow-y: auto;
}

.used-poem {
  padding: 6px 14px;
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid rgba(168, 85, 247, 0.25);
  color: #c084fc;
  border-radius: 16px;
  font-size: 14px;
  font-family: 'Noto Serif SC', serif;
}

.no-poems {
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  font-family: 'Noto Serif SC', serif;
}

/* ===== 输入区域 ===== */
.input-section {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 24px 48px;
}

.validating-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px;
}

.validating-overlay p {
  font-family: 'Noto Serif SC', serif;
  color: #a855f7;
  margin: 0;
}

.validating-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(168, 85, 247, 0.2);
  border-top-color: #a855f7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.answer-area {
  display: flex;
  gap: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.poem-input {
  flex: 1;
  padding: 18px 24px;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(168, 85, 247, 0.3);
  border-radius: 16px;
  font-size: 20px;
  font-family: 'Noto Serif SC', serif;
  color: #fff;
  outline: none;
  transition: all 0.3s ease;
}

.poem-input:focus {
  border-color: #a855f7;
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.3);
}

.poem-input::placeholder { color: rgba(255, 255, 255, 0.4); }
.poem-input:disabled { opacity: 0.6; }

.submit-btn {
  padding: 18px 40px;
  background: linear-gradient(135deg, #a855f7, #6366f1);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Serif SC', serif;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(168, 85, 247, 0.4);
}

.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.waiting-area { text-align: center; padding: 32px; }
.waiting-icon { font-size: 48px; margin-bottom: 16px; }

.waiting-area p {
  font-family: 'Noto Serif SC', serif;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 8px 0;
}

.waiting-hint { font-size: 14px; color: rgba(255, 255, 255, 0.4); }

/* ===== 模态框 ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-card {
  background: rgba(30, 30, 50, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  padding: 40px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modal-appear 0.3s ease-out;
}

@keyframes modal-appear {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header { text-align: center; margin-bottom: 28px; }
.modal-icon { font-size: 48px; margin-bottom: 16px; }

.modal-header h3 {
  font-family: 'Noto Serif SC', serif;
  color: #fff;
  margin: 0;
  font-size: 24px;
}

.modal-body { text-align: center; margin-bottom: 28px; }

.modal-body p {
  font-family: 'Noto Serif SC', serif;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  margin: 0 0 8px 0;
}

.invitation-detail {
  color: rgba(255, 255, 255, 0.5) !important;
  font-size: 14px !important;
}

.keyword-highlight {
  color: #f4d03f !important;
  font-weight: bold;
  font-size: 18px !important;
  text-shadow: 0 0 10px rgba(244, 208, 63, 0.5);
}

.waiting-animation { margin-bottom: 20px; }

.waiting-dots { display: flex; justify-content: center; gap: 8px; }

.waiting-dots span {
  width: 12px;
  height: 12px;
  background: #a855f7;
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite;
}

.waiting-dots span:nth-child(1) { animation-delay: 0s; }
.waiting-dots span:nth-child(2) { animation-delay: 0.2s; }
.waiting-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.modal-actions { display: flex; gap: 16px; justify-content: center; }

.modal-btn {
  padding: 14px 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Noto Serif SC', serif;
}

.modal-btn:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.15);
}

.modal-btn.decline {
  background: rgba(248, 113, 113, 0.15);
  border-color: rgba(248, 113, 113, 0.3);
  color: #fca5a5;
}

.modal-btn.decline:hover { background: rgba(248, 113, 113, 0.25); }

.modal-btn.accept {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.3), rgba(34, 197, 94, 0.3));
  border-color: rgba(74, 222, 128, 0.5);
  color: #4ade80;
}

.modal-btn.accept:hover {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.4), rgba(34, 197, 94, 0.4));
}

.modal-btn.primary {
  background: linear-gradient(135deg, #a855f7, #6366f1);
  border: none;
  color: white;
}

.result-modal { max-width: 520px; }
.result-display { margin-bottom: 24px; }
.result-display.win .result-text { color: #4ade80; }

.result-icon { font-size: 72px; margin-bottom: 16px; }

.result-text {
  font-size: 26px;
  font-weight: bold;
  color: #f87171;
  margin: 0 0 8px 0;
  font-family: 'Noto Serif SC', serif;
}

.result-reason {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Noto Serif SC', serif;
}

.poems-review h4 {
  font-family: 'Noto Serif SC', serif;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 16px 0;
  font-size: 16px;
}

.poems-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-height: 120px;
  overflow-y: auto;
}

.poem-item {
  padding: 6px 12px;
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 12px;
  color: #c084fc;
  font-size: 13px;
  font-family: 'Noto Serif SC', serif;
}

/* ===== 响应式设计 ===== */
@media (max-width: 900px) {
  .lobby-content { grid-template-columns: 1fr; }
  .players-section {
    flex-direction: column;
    gap: 32px;
    padding: 32px 20px;
  }
  .player-card { width: 100%; min-width: auto; padding: 32px; }
  .game-hud { flex-direction: column; gap: 16px; padding: 20px; }
  .hud-left, .hud-center, .hud-right { width: 100%; justify-content: center; }
  .answer-area { flex-direction: column; }
  .submit-btn { width: 100%; }
}
</style>
