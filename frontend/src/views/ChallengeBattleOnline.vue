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
            <PhScroll class="title-icon" :size="20" weight="duotone" />
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
            <PhUsersThree class="title-icon" :size="20" weight="duotone" />
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
            <PhSmileySad class="empty-icon" :size="32" weight="duotone" />
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
import feihualingSocket from '../services/feihualingSocket';
import { PhScroll, PhSmileySad, PhUsersThree } from '@phosphor-icons/vue';

export default {
  name: 'ChallengeBattleOnline',
  components: { PhScroll, PhSmileySad, PhUsersThree },
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
    let socketChannel = null;

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

      feihualingSocket.connect(localStorage.getItem('token'));
      socketChannel = feihualingSocket.channel();
      socket.value = socketChannel;

      socket.value.on('connect', () => {
        console.log('[ChallengeBattleOnline] Socket已连接');
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

      // 邀请被拒绝
      socket.value.on('challenge-invitation-rejected', () => {
        waitingAccept.value = null;
        invitingUserId.value = null;
        showToast('对方拒绝了邀请', 'info');
      });

      // 对方取消邀请
      socket.value.on('challenge-invitation-cancelled', () => {
        waitingAccept.value = null;
        invitingUserId.value = null;
        showToast('对方取消了邀请', 'info');
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

      // 全局连接可能在进入本页之前就已认证，不能只依赖 connect 事件。
      if (socket.value.connected) loadOnlineUsers();
    };

    const loadOnlineUsers = () => {
      if (!socket.value?.connected) return;
      onlineUsersLoading.value = true;
      feihualingSocket.challengeRefreshOnlineUsers();
    };

    const refreshOnlineUsers = () => {
      if (!socket.value?.connected) {
        showToast('网络未连接', 'error');
        return;
      }
      isRefreshing.value = true;
      feihualingSocket.challengeRefreshOnlineUsers();
    };

    const sendInvitation = (user) => {
      if (!socket.value?.connected) {
        showToast('网络未连接', 'error');
        return;
      }
      invitingUserId.value = user.userId;
      waitingAccept.value = { username: user.username, userId: user.userId };
      feihualingSocket.challengeSendInvitation(user.userId, user.username, myUsername.value);
      showToast(`已向 ${user.username} 发送邀请`, 'info');
    };

    const cancelInvitation = () => {
      if (socket.value?.connected && waitingAccept.value) {
        feihualingSocket.challengeCancelInvitation(waitingAccept.value.userId);
      }
      waitingAccept.value = null;
      invitingUserId.value = null;
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
      socketChannel?.dispose();
      socketChannel = null;
      socket.value = null;
    });

    return {
      isLoggedIn,
      myUserId,
      onlineUsers,
      onlineUsersLoading,
      isRefreshing,
      invitingUserId,
      waitingAccept,
      toast,
      goLogin,
      goBack,
      refreshOnlineUsers,
      sendInvitation,
      cancelInvitation
    };
  }
};
</script>

<style scoped>
.challenge-battle-online {
  --ink:#234f49; --muted:#789087; --jade:#238f7c; --jade-deep:#176f61; --gold:#b9853e;
  min-height:calc(100dvh - 84px); padding:24px clamp(14px,4vw,64px) 54px; color:var(--ink);
  font-family:'Noto Sans SC','Microsoft YaHei',sans-serif;
  background:linear-gradient(135deg,rgba(239,247,242,.9),rgba(246,242,229,.88)),url('../assets/jade-paper-ambient.png') center/cover fixed;
}
.challenge-battle-online::before{content:'';position:fixed;inset:84px 0 0;z-index:-1;pointer-events:none;background:radial-gradient(circle at 78% 12%,rgba(255,255,255,.7),transparent 34%),linear-gradient(180deg,rgba(255,255,255,.16),transparent 58%)}
.glass-card{position:relative;padding:24px;overflow:hidden;border:1px solid rgba(255,255,255,.72);border-radius:22px;background:rgba(250,253,249,.68);box-shadow:0 18px 48px rgba(42,84,73,.1),inset 0 1px 0 rgba(255,255,255,.88);backdrop-filter:blur(18px) saturate(118%)}
.glass-card::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(255,255,255,.2),transparent 46%)}
.glass-button,.back-btn,.refresh-btn,.invite-btn,.return-btn,.cancel-btn{border:1px solid rgba(47,131,115,.22);border-radius:999px;color:#fff;background:linear-gradient(180deg,#2a8178,#216d65);box-shadow:0 8px 18px rgba(29,90,81,.16);cursor:pointer;transition:transform .2s ease,filter .2s ease}
.glass-button{min-height:40px;padding:8px 20px;font:600 12px 'Noto Sans SC','Microsoft YaHei',sans-serif}.glass-button:hover:not(:disabled),.back-btn:hover,.refresh-btn:hover:not(:disabled),.invite-btn:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.05)}.glass-button:disabled,.refresh-btn:disabled,.invite-btn:disabled{opacity:.48;cursor:not-allowed}
.nav-header{display:flex;align-items:center;justify-content:space-between;gap:16px;width:min(1260px,100%);margin:0 auto 20px;padding:12px 16px;border:1px solid rgba(255,255,255,.72);border-radius:18px;background:rgba(250,253,249,.62);box-shadow:0 12px 30px rgba(42,84,73,.07);backdrop-filter:blur(14px)}
.nav-left{display:flex;align-items:center;gap:12px;min-width:0}.back-btn{padding:8px 14px;color:var(--ink);background:rgba(255,255,255,.7);box-shadow:none;font:600 12px 'Noto Sans SC','Microsoft YaHei',sans-serif}.back-icon{font-size:15px}.page-title{margin:0;color:var(--ink);font:600 clamp(18px,2.2vw,26px) 'Noto Serif SC',serif;letter-spacing:.06em}.refresh-btn{padding:8px 14px;color:var(--jade-deep);background:rgba(227,244,235,.8);box-shadow:none;font:600 11px 'Noto Sans SC','Microsoft YaHei',sans-serif}
.login-prompt{display:grid;place-items:center;min-height:56vh}.login-prompt .glass-card{width:min(420px,100%);text-align:center}.login-prompt h3{position:relative;z-index:1;margin:0 0 8px;font:600 24px 'Noto Serif SC',serif}.login-prompt p{position:relative;z-index:1;margin:0 0 18px;color:var(--muted);font-size:13px}
.main-content{display:grid;grid-template-columns:minmax(260px,360px) minmax(0,1fr);gap:20px;width:min(1260px,100%);margin:0 auto}.rules-section{display:grid;align-content:start;gap:16px}.rules-card,.tips-card,.players-card{padding:22px}.section-title{position:relative;z-index:1;display:flex;align-items:center;gap:9px;margin:0 0 16px;color:var(--ink);font:600 19px 'Noto Serif SC',serif}.title-icon{font-size:20px}.rule-list{position:relative;z-index:1;display:grid;gap:10px}.rule-item{display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border:1px solid rgba(75,132,113,.12);border-radius:12px;background:rgba(255,255,255,.42)}.rule-number{display:grid;place-items:center;flex:0 0 26px;width:26px;height:26px;border-radius:50%;color:#fff;background:var(--jade);font-size:11px;font-weight:700}.rule-content{display:grid;gap:3px}.rule-title{color:var(--ink);font-size:12px;font-weight:600}.rule-desc{color:var(--muted);font-size:11px;line-height:1.5}.tips-title{position:relative;z-index:1;margin:0 0 10px;color:var(--ink);font:600 16px 'Noto Serif SC',serif}.tips-list{position:relative;z-index:1;margin:0;padding-left:18px;color:var(--muted);font-size:11px;line-height:1.9}.return-btn{width:100%;color:var(--ink);background:rgba(255,255,255,.72);box-shadow:none}
.players-card{min-height:420px}.players-header{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px}.players-header .section-title{margin-bottom:0}.player-count{color:var(--muted);font-size:11px}.loading-state,.empty-state{position:relative;z-index:1;display:grid;place-items:center;gap:8px;min-height:280px;color:var(--muted);text-align:center;font-size:12px}.spinner,.waiting-spinner{width:42px;height:42px;border:3px solid rgba(47,131,115,.16);border-top-color:var(--jade);border-radius:50%;animation:spin .9s linear infinite}.empty-icon{font-size:30px;opacity:.75}.empty-text{margin:0;color:var(--ink)}.empty-tip{margin:0;color:#9aaba4;font-size:11px}.players-list{position:relative;z-index:1;display:grid;gap:9px;margin-top:18px}.player-item{display:flex;align-items:center;gap:11px;padding:12px 13px;border:1px solid rgba(75,132,113,.13);border-radius:14px;background:rgba(255,255,255,.48)}.player-item.in-game{opacity:.62}.player-avatar{position:relative;display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;border:1px solid rgba(47,131,115,.2);border-radius:50%;color:var(--jade-deep);background:#e4f2ea;font:600 15px 'Noto Serif SC',serif}.status-dot{position:absolute;right:-1px;bottom:1px;width:9px;height:9px;border:2px solid #fff;border-radius:50%;background:#55a686}.status-dot.in-game{background:#ba8750}.player-info{display:grid;gap:3px;min-width:0;flex:1}.player-name{overflow:hidden;color:var(--ink);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.me-tag{margin-left:5px;padding:2px 5px;border-radius:99px;color:#317967;background:#e2f2e8;font-size:9px}.player-status{color:var(--muted);font-size:10px}.player-status.in-game{color:#a4783f}.invite-btn{padding:7px 12px;color:#fff;font:600 11px 'Noto Sans SC','Microsoft YaHei',sans-serif}.self-tag,.gaming-tag{color:var(--muted);font-size:10px}.gaming-tag{color:#a4783f}
.waiting-modal{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:20px}.modal-backdrop{position:absolute;inset:0;background:rgba(26,70,61,.3);backdrop-filter:blur(8px)}.modal-content{position:relative;z-index:1;width:min(500px,100%);padding:30px;text-align:center}.modal-title{position:relative;z-index:1;margin:8px 0;color:var(--ink);font:600 23px 'Noto Serif SC',serif}.cancel-btn{color:#9c604d;background:#fff2e9;border-color:#e8c0a6;box-shadow:none}.toast{position:fixed;left:50%;bottom:28px;z-index:300;padding:11px 18px;border-radius:99px;transform:translateX(-50%);color:#fff;background:#246f62;box-shadow:0 12px 30px rgba(25,76,66,.2);font-size:12px}.toast.success{background:#2e8d74}.toast.error{background:#ad6652}
@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:820px){.main-content{grid-template-columns:1fr}.players-card{min-height:320px}}@media(max-width:560px){.challenge-battle-online{padding:14px 10px 34px}.nav-header{align-items:flex-start}.nav-left{flex-direction:column;align-items:flex-start}.page-title{font-size:20px}.main-content{gap:14px}.player-item{align-items:flex-start;flex-wrap:wrap}.invite-btn{margin-left:auto}}
</style>
