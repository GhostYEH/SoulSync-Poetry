<template>
  <div v-if="currentInvitation" class="global-invitation-layer" role="presentation">
    <section class="global-invitation-card" role="dialog" aria-modal="true" aria-labelledby="global-invite-title">
      <span class="global-invitation-kicker">诗友来信 · {{ currentInvitation.kind === 'feihua' ? '飞花令' : '诗词闯关' }}</span>
      <div class="global-invitation-seal">{{ inviterName.slice(0, 1) }}</div>
      <h2 id="global-invite-title">{{ inviterName }} 邀请你对战</h2>
      <p v-if="currentInvitation.kind === 'feihua'">
        对方想以「{{ currentInvitation.data.keyword || '花' }}」为令，与你进行一局飞花令。
      </p>
      <p v-else>对方邀请你进行诗词闯关对战，接受后将立即进入同一房间。</p>
      <div class="global-invitation-meta" v-if="currentInvitation.kind === 'feihua'">
        <span>令字 <strong>{{ currentInvitation.data.keyword || '花' }}</strong></span>
        <span>节奏 <strong>{{ difficultyName }}</strong></span>
      </div>
      <div class="global-invitation-actions">
        <button type="button" class="global-invitation-reject" :disabled="processing" @click="reject">暂不应邀</button>
        <button type="button" class="global-invitation-accept" :disabled="processing" @click="accept">
          {{ processing ? '处理中…' : '接受邀请 →' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import feihualingSocket from '../services/feihualingSocket'

const router = useRouter()
const invitations = ref([])
const processing = ref(false)
let channel = null
let acceptingKind = null

const currentInvitation = computed(() => invitations.value[0] || null)
const inviterName = computed(() => {
  const invitation = currentInvitation.value
  if (!invitation) return '在线诗友'
  if (invitation.kind === 'feihua') {
    return invitation.data.from?.username || invitation.data.from?.name || '在线诗友'
  }
  return invitation.data.from || '在线诗友'
})
const difficultyName = computed(() => ({ easy: '入门', medium: '进阶', hard: '专业', ranking: '排位赛' }[
  currentInvitation.value?.data?.difficulty
] || '进阶'))

function enqueue(kind, data) {
  if (!data) return
  const id = data.inviteId || `${kind}-${data.fromId || data.from?.userId || Date.now()}`
  if (invitations.value.some(item => item.id === id)) return
  invitations.value.push({ id, kind, data })
}

function removeCurrent() {
  invitations.value.shift()
  processing.value = false
}

function accept() {
  const invitation = currentInvitation.value
  if (!invitation || processing.value) return
  processing.value = true
  acceptingKind = invitation.kind
  if (invitation.kind === 'feihua') {
    feihualingSocket.acceptInvitation(
      invitation.data.inviteId,
      invitation.data.from?.userId,
      invitation.data.keyword,
      invitation.data.difficulty
    )
  } else {
    const user = readUser()
    feihualingSocket.challengeAcceptInvitation(
      invitation.data.inviteId,
      invitation.data.fromId,
      user.username
    )
  }
  removeCurrent()
}

function reject() {
  const invitation = currentInvitation.value
  if (!invitation || processing.value) return
  if (invitation.kind === 'feihua') {
    feihualingSocket.rejectInvitation(invitation.data.inviteId, invitation.data.from?.userId)
  } else {
    feihualingSocket.challengeRejectInvitation(invitation.data.inviteId, invitation.data.fromId)
  }
  removeCurrent()
}

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || localStorage.getItem('userInfo') || '{}')
  } catch {
    return {}
  }
}

function handleAuthenticated() {
  // connect() 在 App 启动时可能早于组件挂载；这里只确保登录后连接存在。
  if (localStorage.getItem('token')) feihualingSocket.connect(localStorage.getItem('token'))
}

function handleFeihuaStart(data) {
  if (acceptingKind !== 'feihua' || !data?.room) return
  localStorage.setItem('pendingFeihuaGame', JSON.stringify(data))
  acceptingKind = null
  if (!router.currentRoute.value.path.startsWith('/feihualing/')) router.push('/feihualing/single')
}

function handleChallengeStart(data) {
  if (!data?.id) return
  // 在线邀请页面并不承载实际答题，统一把房间快照交给闯关页消费。
  if (router.currentRoute.value.path === '/challenge/battle') {
    // ChallengeBattle.vue 会直接消费同一个事件；不要同时写入持久状态，
    // 否则页面重新挂载时会把已开始/已结束的房间再次恢复。
    localStorage.removeItem('pendingDualGame')
    acceptingKind = null
    return
  }
  localStorage.setItem('pendingDualGame', JSON.stringify(data))
  acceptingKind = null
  router.push('/challenge/battle')
}

function handleSocketError() {
  processing.value = false
  acceptingKind = null
}

function handleFeihuaCancelled() {
  const index = invitations.value.findIndex(item => item.kind === 'feihua')
  if (index >= 0) invitations.value.splice(index, 1)
}

function handleChallengeCancelled() {
  const index = invitations.value.findIndex(item => item.kind === 'challenge')
  if (index >= 0) invitations.value.splice(index, 1)
}

onMounted(() => {
  channel = feihualingSocket.channel()
  channel.on('receive-invitation', data => enqueue('feihua', data))
  channel.on('challenge-invitation', data => enqueue('challenge', data))
  channel.on('authenticated', handleAuthenticated)
  channel.on('game-start', handleFeihuaStart)
  channel.on('challenge-dual-started', handleChallengeStart)
  channel.on('invitation-cancelled', handleFeihuaCancelled)
  channel.on('challenge-invitation-cancelled', handleChallengeCancelled)
  channel.on('error', handleSocketError)

  const token = localStorage.getItem('token')
  if (token) {
    feihualingSocket.connect(token)
    feihualingSocket.refreshPendingInvitations()
  }
})

onUnmounted(() => channel?.dispose())
</script>

<style scoped>
.global-invitation-layer { position: fixed; inset: 0; z-index: 3000; display: grid; place-items: center; padding: 24px; background: rgba(16, 38, 34, .34); backdrop-filter: blur(8px); }
.global-invitation-card { width: min(440px, 100%); padding: 34px 32px 28px; border: 1px solid rgba(255, 255, 255, .82); border-radius: 24px; color: #173f39; background: linear-gradient(145deg, rgba(250, 253, 246, .98), rgba(229, 242, 232, .96)); box-shadow: 0 26px 80px rgba(12, 47, 40, .28); text-align: center; }
.global-invitation-kicker { color: #b38a4a; font: 700 10px/1.2 monospace; letter-spacing: .18em; }
.global-invitation-seal { display: grid; place-items: center; width: 64px; height: 64px; margin: 18px auto 12px; border: 1px solid rgba(180, 91, 78, .48); border-radius: 50%; color: #b45b4e; background: #f8eee1; font: 32px 'Noto Serif SC', serif; }
.global-invitation-card h2 { margin: 0; font: 700 25px/1.35 'Noto Serif SC', serif; }
.global-invitation-card p { margin: 12px 0 18px; color: #57786e; font-size: 14px; line-height: 1.8; }
.global-invitation-meta { display: flex; justify-content: center; gap: 28px; margin-bottom: 20px; color: #57786e; font-size: 12px; }
.global-invitation-meta strong { margin-left: 5px; color: #1d6258; }
.global-invitation-actions { display: flex; justify-content: center; gap: 10px; }
.global-invitation-actions button { min-height: 42px; padding: 0 20px; border-radius: 10px; font: 600 14px 'Noto Serif SC', serif; cursor: pointer; }
.global-invitation-actions button:disabled { cursor: wait; opacity: .6; }
.global-invitation-reject { border: 1px solid rgba(23, 63, 57, .18); color: #57786e; background: rgba(255, 255, 255, .6); }
.global-invitation-accept { border: 1px solid #2f8a78; color: #fff; background: #2f8a78; box-shadow: 0 8px 18px rgba(47, 138, 120, .22); }
</style>
