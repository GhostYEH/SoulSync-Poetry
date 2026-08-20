<template>
  <div class="challenge-battle-online">
    <!-- 顶部导航 -->
    <div class="nav-header">
      <div class="nav-left">
        <button class="back-btn" @click="goBack">
          <span class="back-icon">←</span>
          返回
        </button>
        <h1 class="page-title">闯关对战 - 邀请对战</h1>
      </div>
      <div class="nav-right">
        <button class="refresh-btn" @click="refreshOnlineUsers" :disabled="isRefreshing">
          {{ isRefreshing ? '刷新中...' : '刷新在线用户' }}
        </button>
      </div>
    </div>

    <!-- 未登录提示 -->
    <div v-if="!isLoggedIn" class="login-prompt">
      <div class="glass-card">
        <h3>请先登录</h3>
        <p>登录后才能参与闯关对战！</p>
        <button class="glass-button" @click="goLogin">立即登录</button>
      </div>
    </div>

    <!-- 主内容 -->
    <div v-else class="main-content">
      <!-- 左侧：游戏规则 -->
      <div class="rules-section">
        <div class="glass-card rules-card">
          <h2 class="section-title">
            <span class="title-icon">📜</span>
            游戏规则
          </h2>
          <div class="rule-list">
            <div class="rule-item">
              <span class="rule-number">1</span>
              <div class="rule-content">
                <span class="rule-title">轮流答题</span>
                <span class="rule-desc">两人轮流填空答题，每人答一题</span>
              </div>
            </div>
            <div class="rule-item">
              <span class="rule-number">2</span>
              <div class="rule-content">
                <span class="rule-title">时间限制</span>
                <span class="rule-desc">每题限时30秒，超时判负</span>
              </div>
            </div>
            <div class="rule-item">
              <span class="rule-number">3</span>
              <div class="rule-content">
                <span class="rule-title">答错即负</span>
                <span class="rule-desc">答错立即判负，对手获胜</span>
              </div>
            </div>
            <div class="rule-item">
              <span class="rule-number">4</span>
              <div class="rule-content">
                <span class="rule-title">答题轮数</span>
                <span class="rule-desc">共30题，全部答完则正确数多者胜</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作提示 -->
        <div class="glass-card tips-card">
          <h3 class="tips-title">对战提示</h3>
          <ul class="tips-list">
            <li>在右侧在线玩家列表中选择对手</li>
            <li>点击"邀请对战"按钮发送邀请</li>
            <li>等待对方接受后游戏开始</li>
            <li>如果收到邀请，会弹出提示框</li>
          </ul>
        </div>

        <!-- 返回按钮 -->
        <button class="glass-button return-btn" @click="goBack">
          返回闯关首页
        </button>
      </div>

      <!-- 右侧：在线玩家 -->
      <div class="players-section">
        <div class="glass-card players-card">
          <div class="players-header">
            <h2 class="section-title">
              <span class="title-icon">👥</span>
              在线玩家
            </h2>
            <span class="player-count">{{ onlineUsers.length }} 人在线</span>
          </div>

          <!-- 加载状态 -->
          <div v-if="onlineUsersLoading" class="loading-state">
            <div class="spinner"></div>
            <span>加载中...</span>
          </div>

          <!-- 无在线玩家 -->
          <div v-else-if="onlineUsers.length === 0" class="empty-state">
            <div class="empty-icon">😔</div>
            <p class="empty-text">当前没有在线玩家</p>
            <p class="empty-tip">邀请好友一起来玩吧！</p>
          </div>

          <!-- 玩家列表 -->
          <div v-else class="players-list">
            <div
              v-for="user in onlineUsers"
              :key="user.userId"
              class="player-item"
              :class="{
                'is-me': String(user.userId) === String(myUserId),
                'in-game': user.inGame
              }"
            >
              <div class="player-avatar">
                {{ user.username?.charAt(0)?.toUpperCase() || '?' }}
                <span v-if="user.inGame" class="status-dot in-game"></span>
                <span v-else class="status-dot online"></span>
              </div>
              <div class="player-info">
                <span class="player-name">
                  {{ user.username }}
                  <span v-if="String(user.userId) === String(myUserId)" class="me-tag">我</span>
                </span>
                <span class="player-status" :class="{ 'in-game': user.inGame }">
                  {{ user.inGame ? '对战中' : '在线' }}
                </span>
              </div>
              <button
                v-if="String(user.userId) !== String(myUserId) && !user.inGame"
                class="invite-btn"
                @click="sendInvitation(user)"
                :disabled="invitingUserId === user.userId"
              >
                {{ invitingUserId === user.userId ? '邀请中...' : '邀请对战' }}
              </button>
              <span v-else-if="String(user.userId) === String(myUserId)" class="self-tag">自己</span>
              <span v-else class="gaming-tag">对战中</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 收到的邀请弹窗 -->
    <div v-if="receivedInvitation" class="invitation-modal">
      <div class="modal-backdrop" @click="rejectInvitation"></div>
      <div class="modal-content glass-card">
        <div class="modal-icon">🎮</div>
        <h3 class="modal-title">收到对战邀请</h3>
        <p class="modal-from">{{ receivedInvitation.from }} 邀请你进行诗词闯关对战</p>
        <div class="modal-info">
          <span class="info-label">挑战规则</span>
          <span class="info-value">30题轮流答，30秒/题，答错超时判负</span>
        </div>
        <div class="modal-actions">
          <button class="accept-btn glass-button" @click="acceptInvitation">
            接受挑战
          </button>
          <button class="reject-btn glass-button" @click="rejectInvitation">
            婉拒
          </button>
        </div>
      </div>
    </div>

    <!-- 等待对方接受的提示 -->
    <div v-if="waitingAccept" class="waiting-modal">
      <div class="modal-backdrop" @click="cancelInvitation"></div>
      <div class="modal-content glass-card">
        <div class="waiting-spinner"></div>
        <h3 class="modal-title">等待回复</h3>
        <p class="waiting-text">正在等待 {{ waitingAccept.username }} 接受邀请...</p>
        <button class="cancel-btn glass-button" @click="cancelInvitation">
          取消邀请
        </button>
      </div>
    </div>

    <!-- Toast通知 -->
    <transition name="toast-fade">
      <div v-if="toast.show" :class="['toast', toast.type]">
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import io from 'socket.io-client';
import { SOCKET_URL } from '../services/api';

export default {
  name: 'ChallengeBattleOnline',
  setup() {
    const router = useRouter();
    const socket = ref(null);

    // 登录状态
    const isLoggedIn = ref(false);
    const myUserId = ref(null);
    const myUsername = ref('');

    // 在线用户
    const onlineUsers = ref([]);
    const onlineUsersLoading = ref(false);
    const isRefreshing = ref(false);
    const invitingUserId = ref(null);
    const waitingAccept = ref(null);
    const receivedInvitation = ref(null);

    // Toast
    const toast = ref({ show: false, message: '', type: 'info' });

    const showToast = (message, type = 'info', duration = 3000) => {
      toast.value = { show: true, message, type };
      setTimeout(() => { toast.value.show = false; }, duration);
    };

    const goLogin = () => {
      localStorage.setItem('redirectPath', '/challenge/battle-online');
      router.push('/login');
    };

    const goBack = () => {
      router.push('/challenge/battle');
    };

    const initSocket = () => {
      // 防止重复初始化
      if (socket.value && socket.value.connected) {
        console.log('[ChallengeBattleOnline] Socket 已连接，跳过初始化');
        return;
      }
      if (socket.value) {
        socket.value.disconnect();
        socket.value = null;
      }

      socket.value = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

      socket.value.on('connect', () => {
        console.log('[ChallengeBattleOnline] Socket已连接');
        const token = localStorage.getItem('token');
        if (token) socket.value.emit('authenticate', { token });
        loadOnlineUsers();
      });

      socket.value.on('authenticated', (data) => {
        myUserId.value = data.userId?.toString();
        myUsername.value = data.username;
        loadOnlineUsers();
      });

      // 接收在线用户列表
      socket.value.on('online-users', (users) => {
        console.log('[ChallengeBattleOnline] 收到在线用户列表:', users);
        onlineUsers.value = users || [];
        onlineUsersLoading.value = false;
        isRefreshing.value = false;
      });

      // 收到对战邀请
      socket.value.on('challenge-invitation', (data) => {
        console.log('[ChallengeBattleOnline] 收到邀请:', data);
        receivedInvitation.value = data;
        showToast(`收到来自 ${data.from} 的对战邀请！`, 'info');
      });

      // 邀请被拒绝
      socket.value.on('challenge-invitation-rejected', () => {
        waitingAccept.value = null;
        invitingUserId.value = null;
        showToast('对方拒绝了邀请', 'info');
      });

      // 对方取消邀请
      socket.value.on('challenge-invitation-cancelled', () => {
        receivedInvitation.value = null;
        waitingAccept.value = null;
        invitingUserId.value = null;
        showToast('对方取消了邀请', 'info');
      });

      // 邀请方/接受方收到的游戏开始事件
      socket.value.on('challenge-dual-started', (data) => {
        console.log('[ChallengeBattleOnline] 收到 challenge-dual-started:', data);
        waitingAccept.value = null;
        invitingUserId.value = null;
        receivedInvitation.value = null;
        showToast('对战开始！', 'success');

        // 保存游戏数据到 localStorage
        localStorage.setItem('pendingDualGame', JSON.stringify(data));

        // 断开当前页面的 socket 连接
        if (socket.value) {
          socket.value.disconnect();
          socket.value = null;
        }

        // 跳转到对战页面
        console.log('[ChallengeBattleOnline] 跳转到 /challenge/battle');
        router.push('/challenge/battle');
      });

      socket.value.on('error', (data) => {
        console.error('[ChallengeBattleOnline] Socket错误:', data);
        showToast(data.error || '发生错误', 'error');
        invitingUserId.value = null;
        waitingAccept.value = null;
      });

      socket.value.on('disconnect', () => {
        console.log('[ChallengeBattleOnline] Socket断开连接');
      });
    };

    const loadOnlineUsers = () => {
      if (!socket.value?.connected) return;
      onlineUsersLoading.value = true;
      socket.value.emit('challenge-get-online-users');
    };

    const refreshOnlineUsers = () => {
      if (!socket.value?.connected) {
        showToast('网络未连接', 'error');
        return;
      }
      isRefreshing.value = true;
      socket.value.emit('challenge-get-online-users');
    };

    const sendInvitation = (user) => {
      if (!socket.value?.connected) {
        showToast('网络未连接', 'error');
        return;
      }
      invitingUserId.value = user.userId;
      waitingAccept.value = { username: user.username, userId: user.userId };
        socket.value.emit('challenge-send-invitation', {
          targetUserId: user.userId,
          targetUsername: user.username,
          username: myUsername.value
      });
      showToast(`已向 ${user.username} 发送邀请`, 'info');
    };

    const cancelInvitation = () => {
      if (socket.value?.connected && waitingAccept.value) {
        socket.value.emit('challenge-cancel-invitation', {
          targetUserId: waitingAccept.value.userId
        });
      }
      waitingAccept.value = null;
      invitingUserId.value = null;
    };

    const acceptInvitation = () => {
      if (!receivedInvitation.value) return;
      console.log('[ChallengeBattleOnline] 接受邀请:', receivedInvitation.value);
      socket.value?.emit('challenge-accept-invitation', {
        inviteId: receivedInvitation.value.inviteId,
        inviterId: receivedInvitation.value.fromId,
        username: myUsername.value
      });
      showToast('已接受邀请，对战即将开始...', 'success');
    };

    const rejectInvitation = () => {
      if (!receivedInvitation.value) return;
      socket.value?.emit('challenge-reject-invitation', {
        inviteId: receivedInvitation.value.inviteId,
        inviterId: receivedInvitation.value.fromId
      });
      receivedInvitation.value = null;
      showToast('已拒绝邀请', 'info');
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

    onMounted(() => {
      checkLogin();
      if (isLoggedIn.value) initSocket();
    });

    onUnmounted(() => {
      if (socket.value) {
        socket.value.disconnect();
        socket.value = null;
      }
    });

    return {
      isLoggedIn,
      myUserId,
      onlineUsers,
      onlineUsersLoading,
      isRefreshing,
      invitingUserId,
      waitingAccept,
      receivedInvitation,
      toast,
      goLogin,
      goBack,
      refreshOnlineUsers,
      sendInvitation,
      cancelInvitation,
      acceptInvitation,
      rejectInvitation
    };
  }
};
</script>

<style scoped>
.challenge-battle-online {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 20px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.glass-button {
  padding: 12px 28px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.4), rgba(118, 75, 162, 0.4));
  backdrop-filter: blur(12px);
  border: 1px solid rgba(102, 126, 234, 0.5);
  border-radius: 16px;
  color: #fff;
  font-family: 'Noto Serif SC', serif;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.glass-button:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.6), rgba(118, 75, 162, 0.6));
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.glass-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 导航栏 */
.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  margin-bottom: 24px;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.back-icon {
  font-size: 16px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(90deg, #f5af19, #f12711);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.refresh-btn {
  padding: 10px 20px;
  background: rgba(102, 126, 234, 0.2);
  border: 1px solid rgba(102, 126, 234, 0.4);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  cursor: pointer;
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

/* 登录提示 */
.login-prompt {
  text-align: center;
  padding: 80px 20px;
}

.login-prompt .glass-card h3 {
  font-family: 'Noto Serif SC', serif;
  color: #fff;
  font-size: 28px;
  margin-bottom: 16px;
}

.login-prompt .glass-card p {
  font-family: 'Noto Serif SC', serif;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 24px;
}

/* 主内容布局 */
.main-content {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}

/* 左侧规则区域 */
.rules-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Noto Serif SC', serif;
  color: #fff;
  font-size: 20px;
  margin: 0 0 24px 0;
  font-weight: 600;
}

.title-icon {
  font-size: 24px;
}

.rule-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.rule-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
}

.rule-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rule-title {
  font-family: 'Noto Serif SC', serif;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.rule-desc {
  font-family: 'Noto Serif SC', serif;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

/* 提示卡片 */
.tips-card {
  padding: 24px;
}

.tips-title {
  font-family: 'Noto Serif SC', serif;
  color: #fff;
  font-size: 16px;
  margin: 0 0 16px 0;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  font-family: 'Noto Serif SC', serif;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  line-height: 2;
}

.tips-list li {
  margin-bottom: 4px;
}

.return-btn {
  margin-top: 8px;
}

/* 右侧玩家区域 */
.players-section {
  min-height: 400px;
}

.players-card {
  height: 100%;
}

.players-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.player-count {
  font-family: 'Noto Serif SC', serif;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

/* 加载状态 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px;
  color: rgba(255, 255, 255, 0.7);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-family: 'Noto Serif SC', serif;
  color: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  margin: 0 0 8px 0;
}

.empty-tip {
  font-family: 'Noto Serif SC', serif;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  margin: 0;
}

/* 玩家列表 */
.players-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s;
}

.player-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(102, 126, 234, 0.3);
}

.player-item.is-me {
  border-color: rgba(118, 75, 162, 0.5);
  background: rgba(118, 75, 162, 0.1);
}

.player-item.in-game {
  opacity: 0.6;
}

.player-avatar {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  flex-shrink: 0;
  position: relative;
}

.status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #1a1a2e;
}

.status-dot.online {
  background: #4ade80;
}

.status-dot.in-game {
  background: #fbbf24;
}

.player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.player-name {
  font-family: 'Noto Serif SC', serif;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.me-tag {
  padding: 2px 8px;
  background: rgba(118, 75, 162, 0.5);
  color: white;
  font-size: 11px;
  border-radius: 8px;
}

.player-status {
  font-family: 'Noto Serif SC', serif;
  font-size: 13px;
  color: #4ade80;
}

.player-status.in-game {
  color: #fbbf24;
}

.invite-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, rgba(245, 87, 108, 0.4), rgba(240, 147, 251, 0.4));
  border: 1px solid rgba(245, 87, 108, 0.4);
  border-radius: 12px;
  color: #fff;
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.invite-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(245, 87, 108, 0.6), rgba(240, 147, 251, 0.6));
  transform: translateY(-2px);
}

.invite-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.self-tag,
.gaming-tag {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-family: 'Noto Serif SC', serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

/* 邀请弹窗 */
.invitation-modal,
.waiting-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
}

.modal-content {
  position: relative;
  text-align: center;
  max-width: 400px;
  width: 90%;
  padding: 40px;
}

.modal-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.modal-title {
  font-family: 'Noto Serif SC', serif;
  color: #fff;
  font-size: 24px;
  margin: 0 0 16px 0;
}

.modal-from {
  font-family: 'Noto Serif SC', serif;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  margin: 0 0 20px 0;
}

.modal-info {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.info-label {
  font-family: 'Noto Serif SC', serif;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.info-value {
  font-family: 'Noto Serif SC', serif;
  color: #a5b4fc;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.accept-btn {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.4), rgba(22, 163, 74, 0.4));
  border-color: rgba(74, 222, 128, 0.5);
  color: #86efac;
}

.accept-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.6), rgba(22, 163, 74, 0.6));
}

.reject-btn {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.4);
  color: #fca5a5;
}

.reject-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.5);
}

/* 等待弹窗 */
.waiting-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

.waiting-text {
  font-family: 'Noto Serif SC', serif;
  color: rgba(255, 255, 255, 0.7);
  font-size: 15px;
  margin: 0 0 24px 0;
}

.cancel-btn {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.4);
  color: #fca5a5;
}

.cancel-btn:hover {
  background: rgba(239, 68, 68, 0.5);
}

/* Toast */
.toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 30px;
  border-radius: 14px;
  font-family: 'Noto Serif SC', serif;
  font-size: 15px;
  z-index: 300;
  animation: toast-in 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.toast.info {
  background: rgba(102, 126, 234, 0.95);
  color: white;
}

.toast.success {
  background: rgba(74, 222, 128, 0.95);
  color: white;
}

.toast.error {
  background: rgba(248, 113, 113, 0.95);
  color: white;
}

@keyframes toast-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
}
</style>
