<template>
  <div class="challenge-battle">
    <!-- 未登录提示 -->
    <div v-if="!isLoggedIn" class="login-prompt">
      <div class="glass-card">
        <h3>请先登录</h3>
        <p>登录后才能参与闯关对战！</p>
        <button class="glass-button" @click="goLogin">立即登录</button>
      </div>
    </div>

    <!-- 开始界面 -->
    <div v-else-if="!gameStarted && !matching" class="start-panel">
      <div class="start-header">
        <h1 class="start-title">闯关对战</h1>
        <button class="glass-nav-button" @click="goBack">返回闯关</button>
      </div>

      <div class="mode-cards">
        <!-- 单人模式 -->
        <div class="glass-card mode-card single-card">
          <div class="mode-icon">剑</div>
          <h2 class="mode-heading">单人练习</h2>
          <p class="mode-desc">本地快速出题，无需等待对手。系统从诗词库中随机抽取题目，答错自动收录至错题本。</p>
          <div class="rule-list">
            <div class="rule-item"><span class="rule-icon">1</span><span class="rule-text">题目包含上句填下句、下句填上句</span></div>
            <div class="rule-item"><span class="rule-icon">2</span><span class="rule-text">每题限时30秒，超时视为答错</span></div>
            <div class="rule-item"><span class="rule-icon">3</span><span class="rule-text">答错自动收录至错题本</span></div>
            <div class="rule-item"><span class="rule-icon">4</span><span class="rule-text">共30题，答题正确越多成绩越好</span></div>
          </div>
          <button class="glass-button start-btn" @click="startSingleGame" :disabled="starting">
            {{ starting ? '准备中...' : '开始挑战' }}
          </button>
        </div>

        <!-- 双人模式 -->
        <div class="glass-card mode-card dual-card">
          <div class="mode-icon dual-icon">战</div>
          <h2 class="mode-heading">双人对战</h2>
          <p class="mode-desc">实时对战，系统从诗词库随机抽题，双方轮流填空答题。答错或超时30秒直接判负！</p>
          <div class="rule-list">
            <div class="rule-item"><span class="rule-icon">1</span><span class="rule-text">两人轮流答题填空</span></div>
            <div class="rule-item"><span class="rule-icon">2</span><span class="rule-text">每题限时30秒，超时判负</span></div>
            <div class="rule-item"><span class="rule-icon">3</span><span class="rule-text">答错立即判负</span></div>
            <div class="rule-item"><span class="rule-icon">4</span><span class="rule-text">共30题，全部答完则正确数多者胜</span></div>
          </div>
          <button class="glass-button dual-start-btn" @click="goToBattleOnline" :disabled="starting">
            邀请对战
          </button>
        </div>
      </div>

      <!-- 历史战绩 -->
      <div class="glass-card history-card">
        <h3 class="panel-title">历史战绩</h3>
        <div v-if="historyLoading" class="loading-mini">
          <div class="spinner"></div><span>加载中...</span>
        </div>
        <div v-else-if="history.length === 0" class="no-history">
          <p>暂无历史记录</p><p class="tip">开始挑战即可查看战绩</p>
        </div>
        <div v-else class="history-list">
          <div v-for="(h, idx) in history.slice(0, 5)" :key="idx" class="history-item">
            <div class="history-info">
              <span class="history-date">{{ formatDate(h.ended_at) }}</span>
              <span class="history-mode-tag" :class="h.player2_id ? 'dual' : 'single'">
                {{ h.player2_id ? '双人对战' : '单人练习' }}
              </span>
            </div>
            <div class="history-detail">
              <span v-if="h.player2_id" class="history-players">
                {{ h.player1_name }} <span class="vs">vs</span> {{ h.player2_name || 'AI' }}
              </span>
              <span v-else class="history-score">
                正确 {{ h.player1_correct }} / 共 {{ h.total_questions }} 题
              </span>
            </div>
            <div class="history-bar-wrap">
              <div
                class="history-bar"
                :style="{ width: Math.round((h.player1_correct / h.total_questions) * 100) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 匹配等待界面 -->
    <div v-if="matching" class="matching-panel">
      <div class="matching-card glass-card">
        <div class="matching-spinner"></div>
        <h2 class="matching-title">匹配中...</h2>
        <p class="matching-desc">正在为您寻找对手，请稍候</p>
        <div class="matching-dots">
          <span></span><span></span><span></span>
        </div>
        <button class="glass-button cancel-btn" @click="cancelMatching">取消匹配</button>
      </div>
    </div>

    <!-- ========== 游戏中 - 单人 ========== -->
    <div v-else-if="gameStarted && gameMode === 'single'" class="game-room-fullscreen">
      <div class="game-hud-full">
        <div class="hud-left">
          <h1 class="game-title">闯关对战</h1>
          <span class="round-badge">第 {{ currentRound }} / 30轮</span>
        </div>
        <div class="hud-center">
          <div class="score-display">
            <span class="score-correct">{{ correctCount }} 正确</span>
            <span class="score-sep">|</span>
            <span class="score-wrong">{{ wrongCount }} 错误</span>
          </div>
        </div>
        <div class="hud-right">
          <button class="quit-game-btn" @click="confirmQuit">结束挑战</button>
        </div>
      </div>

      <div class="game-main-area">
        <div class="timer-section">
          <div :class="['timer-ring', { 'warning': remainingTime <= 10, 'danger': remainingTime <= 5 }]">
            <svg class="timer-svg" viewBox="0 0 100 100">
              <circle class="timer-bg" cx="50" cy="50" r="45" />
              <circle class="timer-progress" cx="50" cy="50" r="45"
                :stroke-dasharray="circumference"
                :stroke-dashoffset=" timerOffset" />
            </svg>
            <div class="timer-text">
              <span class="timer-number">{{ remainingTime }}</span>
              <span class="timer-label">秒</span>
            </div>
          </div>
        </div>

        <div class="question-area">
          <div v-if="currentQuestion" class="question-card">
            <div class="question-meta">
              <span class="question-type">{{ currentQuestion.type || '诗词接句' }}</span>
              <span class="question-poem-info">{{ currentQuestion.title }} - {{ currentQuestion.author }}</span>
            </div>
            <div class="question-text">{{ currentQuestion.question }}</div>
          </div>

          <div class="answer-section">
            <input v-model="userAnswer" type="text" class="answer-input"
              placeholder="请输入答案" @keyup.enter="submitAnswer"
              ref="answerInput" :disabled="answerFeedback !== null" />
            <button class="submit-btn" @click="submitAnswer"
              :disabled="!userAnswer.trim() || submitting || answerFeedback !== null">
              {{ submitting ? '判定中...' : '提交答案' }}
            </button>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-card">
            <div class="progress-title">答题进度</div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: ((currentRound - 1) / 30 * 100) + '%' }"></div>
            </div>
            <div class="progress-text">{{ currentRound - 1 }} / 30</div>
          </div>
          <div class="accuracy-card">
            <div class="accuracy-title">正确率</div>
            <div class="accuracy-value">{{ currentRound > 1 ? Math.round((correctCount / (currentRound - 1)) * 100) : 0 }}%</div>
          </div>
        </div>
      </div>

      <!-- 答题反馈 -->
      <transition name="feedback-fade">
        <div v-if="answerFeedback" class="feedback-overlay">
          <div :class="['feedback-card', answerFeedback.isCorrect ? 'feedback-correct' : 'feedback-wrong']">
            <div class="feedback-icon">{{ answerFeedback.isCorrect ? '✓' : '✗' }}</div>
            <p class="feedback-title">{{ answerFeedback.isCorrect ? '回答正确！' : '回答错误' }}</p>
            <p v-if="!answerFeedback.isCorrect" class="feedback-answer">
              正确答案：<strong>{{ answerFeedback.correctAnswer }}</strong>
            </p>
            <p class="feedback-analysis" v-if="currentQuestion?.analysis">{{ currentQuestion.analysis }}</p>
          </div>
        </div>
      </transition>
    </div>

    <!-- ========== 游戏中 - 双人 ========== -->
    <div v-else-if="gameStarted && gameMode === 'dual'" class="game-room-fullscreen dual-mode">
      <div class="game-hud-full">
        <div class="hud-left">
          <h1 class="game-title">双人对战</h1>
          <span class="round-badge">第 {{ dualRound }} / 30题</span>
        </div>
        <div class="hud-center">
          <div class="dual-scores">
            <div class="dual-player-score" :class="{ 'is-current-turn': isMyTurn }">
              <span class="dual-player-name">{{ myPlayer.username }}</span>
              <span class="dual-correct">{{ myPlayer.correct }} 正确</span>
              <span v-if="isMyTurn" class="turn-indicator">轮到你了</span>
            </div>
            <span class="vs-badge">VS</span>
            <div class="dual-player-score opponent" :class="{ 'is-current-turn': !isMyTurn }">
              <span class="dual-player-name">{{ opponentPlayer?.username || '等待对手...' }}</span>
              <span class="dual-correct">{{ opponentPlayer?.correct ?? '-' }} 正确</span>
              <span v-if="!isMyTurn && opponentPlayer?.username" class="turn-indicator">轮到对方</span>
            </div>
          </div>
        </div>
        <div class="hud-right">
          <button class="quit-game-btn" @click="confirmQuit">结束对战</button>
        </div>
      </div>

      <div class="game-main-area">
        <div class="timer-section">
          <div :class="['timer-ring', { 'warning': dualRemainingTime <= 10, 'danger': dualRemainingTime <= 5 }]">
            <svg class="timer-svg" viewBox="0 0 100 100">
              <circle class="timer-bg" cx="50" cy="50" r="45" />
              <circle class="timer-progress" cx="50" cy="50" r="45"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="dualTimerOffset" />
            </svg>
            <div class="timer-text">
              <span class="timer-number">{{ dualRemainingTime }}</span>
              <span class="timer-label">秒</span>
            </div>
          </div>
        </div>

        <div class="question-area">
          <!-- 题目卡片 -->
          <div v-if="dualQuestion" class="question-card">
            <div class="question-meta">
              <span class="question-type">{{ dualQuestion.type || '诗词接句' }}</span>
              <span class="question-poem-info">{{ dualQuestion.title }} - {{ dualQuestion.author }}</span>
            </div>
            <div class="question-text">{{ dualQuestion.question }}</div>
          </div>

          <!-- 我的答题区（轮到自己的时候显示） -->
          <div v-if="isMyTurn" class="answer-section">
            <input
              v-model="dualAnswer"
              type="text"
              class="answer-input"
              placeholder="请输入答案"
              @keyup.enter="submitDualAnswer"
              ref="dualAnswerInput"
              :disabled="dualSubmitting"
            />
            <button
              class="submit-btn"
              @click="submitDualAnswer"
              :disabled="!dualAnswer.trim() || dualSubmitting"
            >
              {{ dualSubmitting ? '判定中...' : '提交答案' }}
            </button>
          </div>

          <!-- 等待对方答题区（不是自己的时候显示） -->
          <div v-else class="waiting-opponent-section">
            <div class="waiting-icon">
              <div class="waiting-spinner-small"></div>
            </div>
            <p class="waiting-text">等待 {{ opponentPlayer?.username || '对方' }} 答题中...</p>
          </div>

          <!-- 答题结果反馈 -->
          <div v-if="dualAnswerFeedback" class="dual-feedback-card" :class="dualAnswerFeedback.isCorrect ? 'feedback-correct' : 'feedback-wrong'">
            <div class="feedback-icon">{{ dualAnswerFeedback.isCorrect ? '✓' : '✗' }}</div>
            <p class="feedback-title">{{ dualAnswerFeedback.isCorrect ? '回答正确！' : '回答错误' }}</p>
            <p v-if="!dualAnswerFeedback.isCorrect" class="feedback-answer">
              正确答案：<strong>{{ dualAnswerFeedback.correctAnswer }}</strong>
            </p>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-card">
            <div class="progress-title">答题进度</div>
            <div class="progress-bar">
              <div class="progress-fill dual-fill" :style="{ width: ((dualRound - 1) / 30 * 100) + '%' }"></div>
            </div>
            <div class="progress-text">{{ dualRound - 1 }} / 30</div>
          </div>
          <div class="dual-accuracy-card">
            <div class="accuracy-title">当前领先</div>
            <div class="accuracy-value">
              {{ myPlayer.correct > (opponentPlayer?.correct || 0) ? '我方领先' : (myPlayer.correct < (opponentPlayer?.correct || 0) ? '对方领先' : '平局') }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 游戏结束 ========== -->
    <div v-if="gameEnded" class="modal-overlay">
      <div class="modal-content glass-card result-modal">
        <!-- 单人结束 -->
        <template v-if="gameMode === 'single'">
          <h3 class="modal-title">挑战结束</h3>
          <div class="result-score-big">
            <span class="score-num">{{ finalCorrect }}</span>
            <span class="score-denom">/ {{ finalTotal }} 题正确</span>
          </div>
          <div class="result-accuracy">正确率 {{ Math.round((finalCorrect / finalTotal) * 100) }}%</div>
          <div class="result-summary">
            <div class="summary-item correct-item">
              <span class="summary-num">{{ finalCorrect }}</span>
              <span class="summary-label">正确</span>
            </div>
            <div class="summary-item wrong-item">
              <span class="summary-num">{{ finalWrong }}</span>
              <span class="summary-label">错误</span>
            </div>
          </div>
          <div v-if="wrongQuestions.length > 0" class="wrong-questions-section">
            <h4 class="wrong-title"><span class="wrong-icon">✗</span>错题收录 ({{ wrongQuestions.length }}题)</h4>
            <div class="wrong-list">
              <div v-for="(wq, idx) in wrongQuestions" :key="idx" class="wrong-item">
                <div class="wrong-q">{{ wq.question }}</div>
                <div class="wrong-a">
                  <span class="wrong-yours">你的答案：{{ wq.userAnswer }}</span>
                  <span class="wrong-correct">正确答案：{{ wq.answer }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="no-wrong"><p>太棒了！本次挑战全部答对！</p></div>
        </template>

        <!-- 双人结束 -->
        <template v-if="gameMode === 'dual'">
          <h3 class="modal-title">{{ isTie ? '平局！' : (iWon ? '你赢了！' : '你输了') }}</h3>
          <div class="dual-result-scores">
            <div class="dual-result-player" :class="iWon ? 'winner' : ''">
              <div class="result-player-name">{{ myPlayer.username }}</div>
              <div class="result-player-score">{{ myPlayer.correct }} 正确</div>
            </div>
            <div class="dual-result-vs">VS</div>
            <div class="dual-result-player" :class="!isTie && !iWon ? 'winner' : ''">
              <div class="result-player-name">{{ opponentPlayer?.username || '对手' }}</div>
              <div class="result-player-score">{{ opponentPlayer?.correct || 0 }} 正确</div>
            </div>
          </div>
          <div class="result-accuracy">
            共 {{ dualResult?.totalQuestions || 30 }} 题
          </div>
          <div v-if="dualResult?.wrongQuestions?.length" class="wrong-questions-section">
            <h4 class="wrong-title"><span class="wrong-icon">✗</span>错题收录 ({{ dualResult.wrongQuestions.length }}题)</h4>
            <div class="wrong-list">
              <div v-for="(wq, idx) in dualResult.wrongQuestions" :key="`${wq.userId || 'player'}-${idx}`" class="wrong-item">
                <div class="wrong-q">{{ wq.question }}</div>
                <div class="wrong-a">
                  <span class="wrong-yours">你的答案：{{ wq.userId === myUserId ? wq.userAnswer : '对手答错' }}</span>
                  <span class="wrong-correct">正确答案：{{ wq.answer }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div class="result-actions">
          <button v-if="gameMode === 'single'" class="glass-button review-btn" @click="goToReview">查看错题本</button>
          <button class="glass-button retry-btn" @click="retryGame">再来一局</button>
          <button class="glass-button return-btn" @click="returnToStart">返回大厅</button>
        </div>
      </div>
    </div>

    <!-- Toast通知 -->
    <div v-if="toast.show" :class="['toast', toast.type]">{{ toast.message }}</div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import feihualingSocket from '../services/feihualingSocket';
import { askConfirm } from '../services/appFeedback';

export default {
  name: 'ChallengeBattle',
  setup() {
    const router = useRouter();
    const socket = ref(null);

    // ========== 状态 ==========
    const isLoggedIn = ref(false);
    const myUserId = ref(null);
    const myUsername = ref('');
    const starting = ref(false);
    const history = ref([]);
    const historyLoading = ref(false);
    const matching = ref(false);
    const gameStarted = ref(false);
    const gameMode = ref('single');
    const roomId = ref(null);

    // 单人模式
    const currentRound = ref(1);
    const currentQuestion = ref(null);
    const remainingTime = ref(30);
    const totalTime = 30;
    const userAnswer = ref('');
    const submitting = ref(false);
    const answerFeedback = ref(null);
    const correctCount = ref(0);
    const wrongCount = ref(0);

    // 双人模式
    const dualRound = ref(1);
    const dualQuestion = ref(null);
    const dualRemainingTime = ref(30);
    const dualAnswer = ref('');
    const dualSubmitting = ref(false);
    const dualAnswerFeedback = ref(null);
    const dualRoomId = ref(null);
    const myPlayer = ref({ id: null, username: '', correct: 0 });
    const opponentPlayer = ref(null);
    const currentQuestionIndex = ref(0);
    const totalQuestions = ref(30);
    const myPlayerIndex = ref(0);
    const currentTurn = ref(0);

    // 结束状态
    const gameEnded = ref(false);
    const finalCorrect = ref(0);
    const finalWrong = ref(0);
    const finalTotal = ref(0);
    const wrongQuestions = ref([]);
    const dualResult = ref(null);

    // Toast
    const toast = ref({ show: false, message: '', type: 'info' });
    let timerInterval = null;
    let dualTimerInterval = null;
    const answerInput = ref(null);
    const dualAnswerInput = ref(null);

    const circumference = 2 * Math.PI * 45;
    const timerOffset = computed(() => {
      const time = remainingTime.value ?? 30;
      const total = totalTime || 30;
      return circumference * (1 - time / total);
    });
    const dualTimerOffset = computed(() => {
      const time = dualRemainingTime.value ?? 30;
      const total = totalTime || 30;
      return circumference * (1 - time / total);
    });

    // ========== 辅助函数 ==========
    const showToast = (message, type = 'info', duration = 3000) => {
      toast.value = { show: true, message, type };
      setTimeout(() => { toast.value.show = false; }, duration);
    };

    const idsEqual = (id1, id2) => {
      if (id1 === undefined || id1 === null || id2 === undefined || id2 === null) return false;
      return String(id1) === String(id2);
    };

    // 是否轮到自己（基于题目索引和自己在玩家数组中的位置）
    const isMyTurn = computed(() => {
      if (!myPlayerIndex.value && myPlayerIndex.value !== 0) return true;
      return currentQuestionIndex.value % 2 === myPlayerIndex.value;
    });

    // ========== 路由 ==========
    const goLogin = () => {
      localStorage.setItem('redirectPath', '/challenge/battle');
      router.push('/login');
    };
    const goBack = () => router.push('/challenge');
    const goToBattleOnline = () => router.push('/challenge/battle-online');
    const goToReview = () => router.push('/challenge/error-book');

    // ========== Socket 初始化 ==========
    const initSocket = () => {
      if (socket.value && socket.value.connected) return;
      socket.value?.dispose?.();
      socket.value = null;

      feihualingSocket.connect(localStorage.getItem('token'));
      socket.value = feihualingSocket.channel();

      socket.value.on('connect', () => {
        console.log('[ChallengeBattle] Socket已连接');
      });

      socket.value.on('authenticated', (data) => {
        console.log('[ChallengeBattle] 认证成功:', data);
        myUserId.value = data.userId?.toString();
        myUsername.value = data.username;
        myPlayer.value = { id: data.userId, username: data.username, correct: 0 };
        loadHistory();
      });

      // ========== 单人模式事件 ==========
      socket.value.on('challenge-started', (data) => {
        starting.value = false;
        roomId.value = data.roomId;
        gameMode.value = 'single';
        currentQuestion.value = data.currentQuestion;
        currentRound.value = data.currentRound;
        correctCount.value = 0;
        wrongCount.value = 0;
        userAnswer.value = '';
        answerFeedback.value = null;
        gameStarted.value = true;
        gameEnded.value = false;
        remainingTime.value = totalTime;
        wrongQuestions.value = [];
        startSingleTimer();
        setTimeout(() => answerInput.value?.focus(), 100);
      });

      socket.value.on('challenge-answer-result', (data) => {
        submitting.value = false;
        if (data.isCorrect) correctCount.value++;
        else wrongCount.value++;
        answerFeedback.value = {
          isCorrect: data.isCorrect,
          correctAnswer: data.correctAnswer
        };

        // 单人房间结束时由服务端统一落库 room.wrongQuestions，
        // 这里不再即时写入，避免同一道错题被累计两次。

        setTimeout(() => {
          answerFeedback.value = null;
          userAnswer.value = '';
        }, 1500);
      });

      socket.value.on('challenge-next', (data) => {
        currentQuestion.value = data.question;
        currentRound.value = data.currentRound;
        correctCount.value = data.correctCount;
        wrongCount.value = data.wrongCount;
        userAnswer.value = '';
        answerFeedback.value = null;
        remainingTime.value = totalTime;
        startSingleTimer();
        setTimeout(() => answerInput.value?.focus(), 100);
      });

      socket.value.on('challenge-timeouted', (data) => {
        wrongCount.value++;
        answerFeedback.value = {
          isCorrect: false,
          correctAnswer: data.correctAnswer
        };
        currentQuestion.value = data.question;
        currentRound.value = data.currentRound;
        correctCount.value = data.correctCount;
        wrongCount.value = data.wrongCount;
        remainingTime.value = totalTime;
        startSingleTimer();
        setTimeout(() => {
          answerFeedback.value = null;
          userAnswer.value = '';
        }, 1500);
      });

      socket.value.on('challenge-finished', (data) => {
        stopSingleTimer();
        gameEnded.value = true;
        finalCorrect.value = data.correctCount;
        finalWrong.value = data.wrongCount;
        finalTotal.value = data.totalQuestions;
        wrongQuestions.value = data.wrongQuestions || [];
      });

      // ========== 双人模式事件 ==========
      socket.value.on('challenge-matchmaking-waiting', () => {
        matching.value = true;
        starting.value = true;
      });

      socket.value.on('challenge-matchmaking-cancelled', () => {
        matching.value = false;
        starting.value = false;
      });

      // 游戏开始（邀请对战 + 匹配对战共用）
      socket.value.on('challenge-dual-started', (data) => {
        console.log('[ChallengeBattle] 收到 challenge-dual-started:', data);
        startDualGameFromData(data);
      });

      // 答案提交结果反馈
      socket.value.on('poem-submitted', (data) => {
        console.log('[ChallengeBattle] 收到 poem-submitted:', data);
        if (gameMode.value !== 'dual') return;
        if (data.currentQuestionIndex === undefined) return;

        dualAnswerFeedback.value = {
          isCorrect: data.isCorrect,
          correctAnswer: data.correctAnswer,
          currentQuestionIndex: data.currentQuestionIndex,
          nextTurn: data.nextTurn
        };

        if (!data.isCorrect && dualQuestion.value) {
          const q = dualQuestion.value;
          api.wrongQuestions.add({
            question: q.question || q.question_content || '',
            answer: data.correctAnswer || q.answer || '',
            user_answer: dualAnswer.value || '',
            level: q.level || 1,
            full_poem: q.full_poem || '',
            author: q.author || '',
            title: q.title || ''
          }).catch(err => console.error('[ChallengeBattle] 同步错题失败:', err.message));
        }

        // 更新玩家分数
        if (data.players) {
          data.players.forEach(p => {
            if (idsEqual(p.id, myUserId.value) || idsEqual(p.userId, myUserId.value)) {
              myPlayer.value.correct = p.correctAnswers || 0;
            } else {
              if (!opponentPlayer.value) opponentPlayer.value = { username: p.username, correct: 0 };
              opponentPlayer.value.correct = p.correctAnswers || 0;
            }
          });
        }

        // 更新当前题号和回合
        if (data.nextQuestionIndex !== undefined) {
          currentQuestionIndex.value = data.nextQuestionIndex;
          currentTurn.value = data.nextTurn;
          dualRound.value = data.nextQuestionIndex + 1;
        }

        dualSubmitting.value = false;
        dualAnswer.value = '';

        // 收到反馈后清除计时器
        stopDualTimer();

        // 1.5秒后清除反馈
        setTimeout(() => {
          dualAnswerFeedback.value = null;
        }, 1500);
      });

      // 下一题
      socket.value.on('challenge-dual-next', (data) => {
        console.log('[ChallengeBattle] 收到 challenge-dual-next:', data);
        if (gameMode.value !== 'dual') return;

        dualQuestion.value = data.currentQuestion;
        dualRound.value = (data.currentQuestionIndex || 0) + 1;
        currentQuestionIndex.value = data.currentQuestionIndex || 0;
        dualAnswerFeedback.value = null;
        dualAnswer.value = '';

        // 更新玩家分数
        if (data.players) {
          data.players.forEach(p => {
            if (idsEqual(p.id, myUserId.value) || idsEqual(p.userId, myUserId.value)) {
              myPlayer.value.correct = p.correctAnswers || 0;
            } else {
              if (!opponentPlayer.value) opponentPlayer.value = { username: p.username, correct: 0 };
              opponentPlayer.value.correct = p.correctAnswers || 0;
            }
          });
        }

        // 重启计时器
        dualRemainingTime.value = 30;
        startDualTimer();
        setTimeout(() => dualAnswerInput.value?.focus(), 100);
      });

      // 游戏结束
      socket.value.on('challenge-dual-finished', (data) => {
        console.log('[ChallengeBattle] 收到 challenge-dual-finished:', data);
        stopDualTimer();
        gameEnded.value = true;
        dualResult.value = data;
        wrongQuestions.value = data.wrongQuestions || [];

        // 更新最终分数
        if (data.players) {
          data.players.forEach(p => {
            if (idsEqual(p.id, myUserId.value) || idsEqual(p.userId, myUserId.value)) {
              myPlayer.value.correct = p.correctAnswers || p.correct || 0;
            } else {
              if (!opponentPlayer.value) opponentPlayer.value = { username: p.username, correct: 0 };
              opponentPlayer.value.correct = p.correctAnswers || p.correct || 0;
            }
          });
        }
      });

      // 对手断线等待重连
      socket.value.on('opponent-reconnecting', (data) => {
        console.log('[ChallengeBattle] 对手断线，等待重连:', data);
        showToast(data.message || '对手断线中，等待重连...', 'warning');
        stopDualTimer();
      });

      // 对手重连成功
      socket.value.on('opponent-reconnected', (data) => {
        console.log('[ChallengeBattle] 对手重连成功:', data);
        showToast(data.message || '对手已重连，游戏继续', 'success');
        currentQuestionIndex.value = data.currentQuestionIndex;
        currentTurn.value = data.currentTurn;
        if (data.players) {
          data.players.forEach(p => {
            if (idsEqual(p.id, myUserId.value) || idsEqual(p.userId, myUserId.value)) {
              myPlayer.value.correct = p.correctAnswers || 0;
            } else {
              if (!opponentPlayer.value) opponentPlayer.value = { username: p.username, correct: 0 };
              opponentPlayer.value.correct = p.correctAnswers || 0;
            }
          });
        }
        dualRemainingTime.value = data.remainingTime ?? 30;
        startDualTimer(dualRemainingTime.value);
      });

      // 计时器心跳（仅双人对战）
      socket.value.on('challenge-dual-timer-tick', (data) => {
        if (gameMode.value !== 'dual') return;
        dualRemainingTime.value = data.remaining;
        // 如果收到的题目索引和本地不一致，说明这是旧数据，忽略
        if (data.currentQuestionIndex !== undefined && data.currentQuestionIndex !== currentQuestionIndex.value) {
          return;
        }
      });

      socket.value.on('error', (data) => {
        console.error('[ChallengeBattle] Socket错误:', JSON.stringify(data));
        showToast(data.error || '发生错误', 'error');
        starting.value = false;
        submitting.value = false;
        dualSubmitting.value = false;
      });

      socket.value.on('disconnect', () => {
        console.log('[ChallengeBattle] Socket断开连接');
      });
    };

    // ========== 单人模式方法 ==========
    const startSingleGame = () => {
      if (!socket.value?.connected) { showToast('网络未连接', 'error'); return; }
      starting.value = true;
      socket.value.emit('challenge-start', { userId: myUserId.value, username: myUsername.value });
    };

    const submitAnswer = () => {
      if (!userAnswer.value.trim() || submitting.value) return;
      submitting.value = true;
      stopSingleTimer();
      socket.value.emit('challenge-answer', { roomId: roomId.value, answer: userAnswer.value.trim() });
    };

    const startSingleTimer = () => {
      stopSingleTimer();
      remainingTime.value = totalTime;
      timerInterval = setInterval(() => {
        if (remainingTime.value > 0) remainingTime.value--;
        else {
          stopSingleTimer();
          socket.value.emit('challenge-timeout', { roomId: roomId.value });
        }
      }, 1000);
    };

    const stopSingleTimer = () => {
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    };

    // ========== 双人模式方法 ==========
    const submitDualAnswer = () => {
      if (!dualAnswer.value.trim() || dualSubmitting.value) return;
      if (!isMyTurn.value) { showToast('还没轮到你答题', 'error'); return; }
      dualSubmitting.value = true;
      stopDualTimer();
      socket.value.emit('challenge-dual-invite-answer', {
        roomId: dualRoomId.value,
        answer: dualAnswer.value.trim()
      });
    };

    const startDualTimer = (initialTimeValue = dualRemainingTime.value) => {
      stopDualTimer();
      const initialTime = Number(initialTimeValue);
      dualRemainingTime.value = Number.isFinite(initialTime) ? Math.max(0, initialTime) : 30;
      dualTimerInterval = setInterval(() => {
        if (dualRemainingTime.value > 0) dualRemainingTime.value--;
        else {
          stopDualTimer();
          socket.value.emit('challenge-dual-invite-timeout', { roomId: dualRoomId.value });
        }
      }, 1000);
    };

    const stopDualTimer = () => {
      if (dualTimerInterval) { clearInterval(dualTimerInterval); dualTimerInterval = null; }
    };

    // 从游戏开始数据初始化双人游戏
    const startDualGameFromData = (data) => {
      console.log('[ChallengeBattle] startDualGameFromData:', JSON.stringify(data));

      if (!data) return;

      // 重置所有状态
      matching.value = false;
      starting.value = false;
      gameMode.value = 'dual';
      gameStarted.value = true;
      gameEnded.value = false;
      dualRoomId.value = data.id;
      currentQuestionIndex.value = data.currentQuestionIndex ?? 0;
      totalQuestions.value = data.totalQuestions ?? 30;
      dualRound.value = (data.currentQuestionIndex ?? 0) + 1;
      dualQuestion.value = data.currentQuestion;
      dualAnswerFeedback.value = null;
      dualAnswer.value = '';
      dualRemainingTime.value = data.timeLimit || 30;

      // 确定自己在 players 数组中的位置
      const players = data.players || [];
      let myIdx = 0;
      for (let i = 0; i < players.length; i++) {
        if (idsEqual(players[i].id, myUserId.value) || idsEqual(players[i].userId, myUserId.value)) {
          myIdx = i;
          break;
        }
      }
      myPlayerIndex.value = myIdx;

      const me = players[myIdx];
      const other = players.find((p, idx) => idx !== myIdx);

      if (me) {
        myPlayer.value = {
          id: me.id || me.userId,
          username: me.username,
          correct: me.correctAnswers || 0
        };
      }
      if (other) {
        opponentPlayer.value = {
          id: other.id || other.userId,
          username: other.username,
          correct: other.correctAnswers || 0
        };
      }

      console.log('[ChallengeBattle] 我的索引:', myIdx, '当前回合判断:', currentQuestionIndex.value % 2, '===', myIdx, '?', isMyTurn.value);

      startDualTimer();
      setTimeout(() => dualAnswerInput.value?.focus(), 100);
    };

    // ========== 胜负判定 ==========
    const iWon = computed(() => {
      if (!dualResult.value?.winner) return false;
      if (dualResult.value.winner.tie) return false;
      return idsEqual(dualResult.value.winner.id, myUserId.value);
    });

    const isTie = computed(() => {
      return dualResult.value?.winner?.tie === true;
    });

    // ========== 通用方法 ==========
    const retryGame = () => {
      gameEnded.value = false;
      gameStarted.value = false;
      roomId.value = null;
      dualRoomId.value = null;
      currentQuestion.value = null;
      dualQuestion.value = null;
      answerFeedback.value = null;
      dualAnswerFeedback.value = null;
      userAnswer.value = '';
      dualAnswer.value = '';
      myPlayer.value = { id: myUserId.value, username: myUsername.value, correct: 0 };
      opponentPlayer.value = null;
      dualResult.value = null;
      if (gameMode.value === 'single') {
        startSingleGame();
      } else {
        returnToStart();
      }
    };

    const confirmQuit = async () => {
      if (!await askConfirm('确定要结束挑战吗？这将结束所有挑战。', { title: '结束挑战', confirmText: '结束挑战', danger: true })) return;
      stopSingleTimer();
      stopDualTimer();
      if (gameMode.value === 'single') {
        socket.value?.emit('challenge-quit', { roomId: roomId.value, mode: 'single' });
      } else {
        socket.value?.emit('challenge-dual-invite-quit', { roomId: dualRoomId.value });
      }
    };

    const returnToStart = () => {
      stopSingleTimer();
      stopDualTimer();
      gameEnded.value = false;
      gameStarted.value = false;
      matching.value = false;
      roomId.value = null;
      dualRoomId.value = null;
      currentQuestion.value = null;
      dualQuestion.value = null;
      answerFeedback.value = null;
      dualAnswerFeedback.value = null;
      userAnswer.value = '';
      dualAnswer.value = '';
      myPlayer.value = { id: myUserId.value, username: myUsername.value, correct: 0 };
      opponentPlayer.value = null;
      dualResult.value = null;
      currentQuestionIndex.value = 0;
      loadHistory();
    };

    const loadHistory = () => {
      if (!socket.value?.connected || !myUserId.value) return;
      historyLoading.value = true;
      socket.value.emit('challenge-history', { userId: myUserId.value });
      socket.value.once('challenge-history-result', (data) => {
        history.value = data.history || [];
        historyLoading.value = false;
      });
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const checkLogin = () => {
      const token = localStorage.getItem('token');
      isLoggedIn.value = !!token;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          myUserId.value = payload.userId?.toString();
          myUsername.value = payload.username || '';
        } catch {
          isLoggedIn.value = false;
        }
      }
    };

    const checkPendingDualGame = () => {
      const pendingGame = localStorage.getItem('pendingDualGame');
      console.log('[ChallengeBattle] pendingGame:', pendingGame ? '存在' : '不存在');
      if (pendingGame) {
        localStorage.removeItem('pendingDualGame');
        try {
          const gameData = JSON.parse(pendingGame);
          console.log('[ChallengeBattle] 解析游戏数据:', gameData);
          nextTick().then(() => startDualGameFromData(gameData));
        } catch (e) {
          console.error('[ChallengeBattle] 解析游戏数据失败:', e);
        }
      }
    };

    onMounted(() => {
      checkLogin();
      console.log('[ChallengeBattle] onMounted, isLoggedIn:', isLoggedIn.value);
      if (isLoggedIn.value) {
        initSocket();
        if (feihualingSocket.connected) {
          myPlayer.value = { id: myUserId.value, username: myUsername.value, correct: 0 };
          loadHistory();
        }
        checkPendingDualGame();
      }
    });

    onUnmounted(() => {
      stopSingleTimer();
      stopDualTimer();
      socket.value?.dispose?.();
      socket.value = null;
    });

    return {
      isLoggedIn, starting, history, historyLoading,
      matching, gameStarted, gameMode,
      currentRound, currentQuestion, remainingTime, totalTime,
      circumference, timerOffset, dualTimerOffset,
      userAnswer, submitting, answerFeedback, correctCount, wrongCount,
      dualRound, dualQuestion, dualRemainingTime, dualAnswer,
      dualSubmitting, dualAnswerFeedback, myPlayer, opponentPlayer,
      currentQuestionIndex, myPlayerIndex,
      gameEnded, finalCorrect, finalWrong, finalTotal,
      wrongQuestions, dualResult,
      toast, answerInput, dualAnswerInput,
      goLogin, goBack, goToReview, goToBattleOnline,
      startSingleGame, submitAnswer, cancelMatching: () => { matching.value = false; starting.value = false; },
      submitDualAnswer, retryGame, confirmQuit, returnToStart, formatDate,
      iWon, isTie, isMyTurn
    };
  }
};
</script>

<style scoped>
.challenge-battle {
  --ink: #234f49;
  --muted: #789087;
  --jade: #238f7c;
  --jade-deep: #176f61;
  --gold: #b9853e;
  min-height: calc(100dvh - 84px);
  padding: 28px clamp(16px, 4vw, 64px) 56px;
  color: var(--ink);
  font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  background:
    linear-gradient(135deg, rgba(239, 247, 242, .9), rgba(246, 242, 229, .88)),
    url('../assets/jade-paper-ambient.png') center / cover fixed;
}
.challenge-battle::before {
  content: '';
  position: fixed;
  inset: 84px 0 0;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(circle at 78% 15%, rgba(255,255,255,.68), transparent 36%), linear-gradient(180deg, rgba(255,255,255,.14), transparent 58%);
}
.glass-card {
  position: relative;
  padding: 26px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.72);
  border-radius: 22px;
  background: rgba(250,253,249,.66);
  box-shadow: 0 18px 48px rgba(42,84,73,.1), inset 0 1px 0 rgba(255,255,255,.88);
  backdrop-filter: blur(18px) saturate(118%);
}
.glass-card::after { content:''; position:absolute; inset:0; pointer-events:none; background:linear-gradient(120deg,rgba(255,255,255,.2),transparent 46%); }
.glass-button,.glass-nav-button,.quit-game-btn {
  border: 1px solid rgba(47,131,115,.22);
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(180deg,#2a8178,#216d65);
  box-shadow: 0 8px 18px rgba(29,90,81,.18);
  cursor: pointer;
  transition: transform .2s ease, filter .2s ease, box-shadow .2s ease;
  font: 600 13px 'Noto Sans SC','Microsoft YaHei',sans-serif;
}
.glass-button { min-height: 42px; padding: 9px 22px; }
.glass-button:hover:not(:disabled),.glass-nav-button:hover,.quit-game-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
.glass-button:disabled { opacity:.48; cursor:not-allowed; }
.glass-nav-button { padding: 8px 16px; color:var(--ink); background:rgba(255,255,255,.64); box-shadow:0 6px 16px rgba(41,86,74,.08); }
.login-prompt { display:grid; place-items:center; min-height:56vh; }
.login-prompt .glass-card { width:min(420px,100%); text-align:center; }
.login-prompt h3,.login-prompt p { position:relative; z-index:1; }
.login-prompt h3 { margin:0 0 10px; font:600 24px 'Noto Serif SC',serif; }
.login-prompt p { margin:0 0 20px; color:var(--muted); font-size:13px; }
.start-panel { position:relative; z-index:1; width:min(1180px,100%); margin:0 auto; }
.start-header { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:24px; }
.start-title { margin:0; color:var(--ink); font:600 clamp(28px,3vw,42px) 'Noto Serif SC',serif; letter-spacing:.08em; }
.mode-cards { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
.mode-card { display:flex; flex-direction:column; align-items:center; min-height:440px; text-align:center; }
.mode-icon { display:grid; place-items:center; width:72px; height:72px; margin:0 auto 16px; border:1px solid rgba(47,131,115,.2); border-radius:50%; color:#fff; background:linear-gradient(145deg,#65ad94,#2b8874); box-shadow:0 10px 24px rgba(38,111,91,.2); font:44px 'Noto Serif SC',serif; }
.dual-icon { color:#fff8e8; background:linear-gradient(145deg,#d7ad69,#b37b39); }
.mode-heading { margin:0 0 10px; color:var(--ink); font:600 24px 'Noto Serif SC',serif; }
.mode-desc { min-height:48px; margin:0 0 18px; color:var(--muted); font-size:13px; line-height:1.7; }
.rule-list { align-self:stretch; margin:0 0 22px; text-align:left; }
.rule-item { display:flex; align-items:center; gap:10px; margin:10px 0; color:#55756c; font-size:12px; }
.rule-icon { display:grid; place-items:center; flex:0 0 25px; width:25px; height:25px; border-radius:50%; color:#fff; background:var(--jade); font-size:11px; font-weight:700; }
.dual-card .rule-icon { background:var(--gold); }
.rule-text { color:inherit; }
.mode-card .glass-button { margin-top:auto; min-width:150px; }
.start-btn { background:linear-gradient(180deg,#2a8178,#216d65); }
.dual-start-btn { background:linear-gradient(180deg,#c39858,#a66e30); }
.history-card { width:100%; margin-top:18px; }
.panel-title { position:relative; z-index:1; margin:0 0 16px; color:var(--ink); font:600 18px 'Noto Serif SC',serif; }
.no-history,.loading-mini { position:relative; z-index:1; color:var(--muted); text-align:center; font-size:12px; }
.no-history p { margin:6px 0; }.no-history .tip { color:#9aaba4; }
.history-list { position:relative; z-index:1; display:grid; gap:9px; }
.history-item { padding:12px 15px; border:1px solid rgba(79,132,116,.14); border-radius:13px; background:rgba(255,255,255,.42); }
.history-info,.history-detail { display:flex; justify-content:space-between; gap:10px; }.history-info { margin-bottom:7px; }
.history-date,.history-players,.history-score { color:var(--muted); font-size:11px; }.history-mode-tag { padding:3px 8px; border-radius:99px; color:#317967; background:#e4f2e9; font-size:10px; }.history-mode-tag.dual { color:#9a6e32; background:#f7ecd8; }
.history-bar-wrap { height:5px; margin-top:9px; overflow:hidden; border-radius:99px; background:rgba(65,122,105,.12); }.history-bar { height:100%; border-radius:inherit; background:linear-gradient(90deg,#53a98e,#267565); }
.matching-panel { display:grid; place-items:center; min-height:64vh; }.matching-card { width:min(420px,100%); text-align:center; }.matching-spinner,.waiting-spinner { width:58px; height:58px; margin:0 auto 18px; border:4px solid rgba(47,131,115,.16); border-top-color:var(--jade); border-radius:50%; animation:spin .9s linear infinite; }.matching-title { margin:0 0 8px; color:var(--ink); font:600 25px 'Noto Serif SC',serif; }.matching-desc { margin:0 0 18px; color:var(--muted); font-size:13px; }.matching-dots { display:flex; justify-content:center; gap:7px; margin-bottom:22px; }.matching-dots span { width:8px; height:8px; border-radius:50%; background:var(--jade); animation:dot-bounce 1.2s ease-in-out infinite; }.matching-dots span:nth-child(2){animation-delay:.15s}.matching-dots span:nth-child(3){animation-delay:.3s}.cancel-btn { color:#9c604d; background:#fff2e9; border-color:#e8c0a6; box-shadow:none; }
.game-room-fullscreen { position:relative; z-index:1; width:min(1440px,100%); min-height:calc(100dvh - 140px); margin:0 auto; padding:20px; border:1px solid rgba(255,255,255,.72); border-radius:24px; background:rgba(241,248,243,.66); box-shadow:0 18px 52px rgba(40,87,73,.1); backdrop-filter:blur(18px); }
.game-hud-full { display:flex; align-items:center; justify-content:space-between; gap:18px; padding:4px 4px 18px; border-bottom:1px solid rgba(60,110,94,.13); }.hud-left,.hud-center,.hud-right{display:flex;align-items:center;gap:14px}.game-title { margin:0; color:var(--ink); font:600 24px 'Noto Serif SC',serif; }.round-badge { padding:7px 12px; border-radius:99px; color:#9b6d2f; background:#f7ecd5; font-size:11px; }.score-display,.dual-scores { color:var(--muted); font-size:12px; }.score-correct,.dual-correct { color:var(--jade-deep); font-weight:700; }.score-wrong { color:#af6b58; font-weight:700; }.score-sep { color:#b4c4bd; }.dual-player-score { padding:7px 12px; border:1px solid transparent; border-radius:12px; text-align:center; }.dual-player-score.is-current-turn { border-color:rgba(47,131,115,.24); background:rgba(227,244,235,.7); }.dual-player-name { display:block; color:var(--ink); font-size:12px; }.dual-correct { display:block; font-size:16px; }.opponent .dual-correct { color:#9a7a47; }.turn-indicator { display:block; margin-top:2px; color:var(--gold); font-size:10px; }.vs-badge { color:#a87835; font-weight:700; }
.game-main-area { display:grid; grid-template-columns:170px minmax(0,1fr) 210px; gap:24px; align-items:start; padding:26px 4px 4px; }.timer-section,.progress-section{position:sticky;top:112px}.timer-ring { position:relative; width:150px; height:150px; margin:auto; padding:15px; border-radius:50%; background:rgba(255,255,255,.55); box-shadow:inset 0 0 0 1px rgba(73,129,111,.12); }.timer-svg{width:100%;height:100%;transform:rotate(-90deg)}.timer-bg{fill:none;stroke:rgba(75,132,113,.16);stroke-width:8}.timer-progress{fill:none;stroke:var(--jade);stroke-width:8;stroke-linecap:round;transition:stroke-dashoffset 1s linear}.timer-ring.warning .timer-progress{stroke:#c8984f}.timer-ring.danger .timer-progress{stroke:#b46150}.timer-text{position:absolute;inset:0;display:grid;place-content:center;justify-items:center}.timer-number{color:var(--ink);font:600 38px 'Noto Serif SC',serif}.timer-label{color:var(--muted);font-size:11px}.question-area{display:grid;gap:16px}.question-card,.answer-section,.waiting-opponent-section,.progress-card,.accuracy-card{border:1px solid rgba(255,255,255,.72);border-radius:18px;background:rgba(255,255,255,.56);box-shadow:0 10px 28px rgba(40,88,74,.06);backdrop-filter:blur(14px)}.question-card{padding:24px}.question-meta{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}.question-type,.question-poem-info{padding:6px 10px;border-radius:99px;font-size:11px}.question-type{color:var(--jade-deep);background:#e4f3eb}.question-poem-info{color:var(--muted);background:rgba(237,242,236,.8)}.question-text{padding:28px 18px;color:var(--ink);background:rgba(246,241,225,.6);border:1px solid rgba(184,139,70,.16);border-radius:13px;text-align:center;font:500 clamp(22px,2.5vw,34px)/1.65 'Noto Serif SC',serif;letter-spacing:.12em}.answer-section{display:flex;gap:10px;padding:14px}.answer-input{flex:1;min-width:0;padding:12px 15px;border:1px solid rgba(65,126,107,.22);border-radius:12px;outline:0;color:var(--ink);background:rgba(255,255,255,.72);font:15px 'Noto Serif SC',serif}.answer-input:focus{border-color:var(--jade);box-shadow:0 0 0 3px rgba(47,131,115,.12)}.answer-input::placeholder{color:#9aaba4}.submit-btn{min-width:110px}.waiting-opponent-section{display:grid;place-items:center;gap:12px;padding:32px}.waiting-spinner-small{width:42px;height:42px;border:3px solid rgba(47,131,115,.16);border-top-color:var(--jade);border-radius:50%;animation:spin .9s linear infinite}.waiting-text{margin:0;color:var(--muted);font-size:13px}.progress-section{display:grid;gap:14px}.progress-card,.accuracy-card{padding:18px}.progress-title,.accuracy-title{margin-bottom:10px;color:var(--muted);font-size:11px}.progress-bar{height:8px;overflow:hidden;border-radius:99px;background:rgba(65,126,107,.13)}.progress-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#55aa8f,#287866)}.progress-fill.dual-fill{background:linear-gradient(90deg,#c99d59,#a87638)}.progress-text,.accuracy-value{margin-top:9px;color:var(--ink);font:600 21px 'Noto Serif SC',serif;text-align:center}.accuracy-value{color:var(--jade-deep);font-size:24px}.feedback-overlay,.modal-overlay{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:20px;background:rgba(26,70,61,.32);backdrop-filter:blur(8px)}.feedback-card,.modal-content{position:relative;width:min(620px,100%);max-height:86vh;overflow:auto;padding:34px;border:1px solid rgba(255,255,255,.82);border-radius:22px;background:rgba(250,253,249,.92);box-shadow:0 24px 70px rgba(26,70,61,.2);text-align:center}.feedback-icon{font-size:56px}.feedback-correct .feedback-icon,.feedback-correct .feedback-title{color:var(--jade-deep)}.feedback-wrong .feedback-icon,.feedback-wrong .feedback-title{color:#ae6651}.feedback-title,.modal-title{margin:10px 0;color:var(--ink);font:600 24px 'Noto Serif SC',serif}.feedback-answer,.feedback-analysis{color:var(--muted);font-size:13px}.feedback-answer strong{color:var(--jade-deep)}.result-score-big{margin:16px 0}.score-num{color:var(--jade-deep);font:600 64px 'Noto Serif SC',serif}.score-denom,.result-accuracy,.summary-label{color:var(--muted);font-size:13px}.result-summary,.dual-result-scores{display:flex;justify-content:center;gap:18px;margin:18px 0}.summary-item,.dual-result-player{padding:12px 20px;border:1px solid rgba(75,132,113,.15);border-radius:14px;background:#f1f8f2}.summary-num{font:600 25px 'Noto Serif SC',serif}.correct-item .summary-num,.result-player-score{color:var(--jade-deep)}.wrong-item .summary-num{color:#ae6651}.result-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:18px}.review-btn{color:#9b6049;background:#fff0e7;box-shadow:none}.retry-btn{background:linear-gradient(180deg,#2a8178,#216d65)}.return-btn{color:var(--ink);background:rgba(255,255,255,.72);box-shadow:none}.wrong-questions-section{text-align:left;max-height:220px;overflow:auto}.wrong-title{color:#ae6651;font-size:13px}.wrong-item{margin:8px 0;padding:10px 12px;border-radius:10px;background:#fff2eb}.wrong-q,.wrong-a span{font-size:11px}.wrong-yours{color:#ae6651}.wrong-correct{color:var(--jade-deep)}.toast{position:fixed;left:50%;bottom:28px;z-index:300;padding:11px 18px;border-radius:99px;transform:translateX(-50%);color:#fff;background:#246f62;box-shadow:0 12px 30px rgba(25,76,66,.2);font-size:12px}.toast.success{background:#2e8d74}.toast.error{background:#ad6652}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes dot-bounce{0%,80%,100%{transform:scale(1);opacity:.5}40%{transform:scale(1.3);opacity:1}}
@media(max-width:900px){.game-main-area{grid-template-columns:1fr}.timer-section,.progress-section{position:static}.timer-ring{margin:0 auto}.mode-cards{grid-template-columns:1fr}.game-hud-full{flex-wrap:wrap}.hud-center{order:3;width:100%;justify-content:center}}
@media(max-width:620px){.challenge-battle{padding:18px 12px 38px}.start-header{align-items:flex-start}.start-title{font-size:28px}.mode-card{min-height:auto}.game-room-fullscreen{padding:14px}.game-hud-full{gap:10px}.game-title{font-size:20px}.question-card{padding:16px}.question-text{padding:20px 12px;font-size:21px}.answer-section{flex-direction:column}.submit-btn{width:100%}.feedback-card,.modal-content{padding:24px 18px}}
</style>
