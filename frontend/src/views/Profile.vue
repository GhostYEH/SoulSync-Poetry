<template>
  <div class="profile-page">
    <div class="profile-atmosphere" aria-hidden="true">
      <img :src="profileBackground" alt="" class="profile-background" />
      <div class="atmosphere-wash"></div>
      <div class="atmosphere-grain"></div>
      <span v-for="mark in inkMarks" :key="mark.id" class="ink-mark" :style="mark.style">{{ mark.text }}</span>
    </div>

    <div class="profile-shell">
      <header class="profile-hero">
        <div class="hero-copy">
          <div class="eyebrow">个人中心 · LEARNING JOURNAL</div>
          <h1>把每一次阅读，<em>留成自己的风景。</em></h1>
          <p>这里记录你与古诗词相遇的每一步。慢一点，也能走得很远。</p>
        </div>
        <div class="hero-quote"><span class="quote-mark">“</span><p>{{ quote.text }}</p><small>{{ quote.source }}</small></div>
      </header>

      <section class="profile-identity paper-card" aria-labelledby="identity-title">
        <div class="identity-main">
          <div class="avatar-frame">
            <img v-if="user.avatar" :src="user.avatar" :alt="`${user.username}的头像`" class="avatar-image" />
            <span v-else class="avatar-monogram">{{ user.username.slice(0, 1) }}</span>
            <span class="avatar-seal">{{ profileLevel }}</span>
          </div>
          <div class="identity-copy">
            <span class="identity-kicker">今日也在读</span>
            <h2 id="identity-title">{{ user.username }}</h2>
            <p>{{ user.email || '把喜欢的诗句，慢慢读成自己的话。' }}</p>
            <div class="identity-meta"><span><i class="meta-dot"></i>{{ currentStatus }}</span><span>加入于 {{ joinDate }}</span></div>
          </div>
        </div>
        <div class="identity-actions"><button class="quiet-button" type="button" @click="goTo('/daily')">继续今日学习 <span>↗</span></button><button class="logout-button" type="button" @click="handleLogout">退出登录</button></div>
      </section>

      <section class="overview-section" aria-labelledby="overview-title">
        <div class="section-heading"><div><span class="eyebrow">A SMALL RECORD OF TODAY</span><h2 id="overview-title">学习总览</h2></div><span class="section-note">数据来自你的学习记录</span></div>
        <div v-if="loading" class="overview-grid loading-grid" aria-label="正在加载学习数据"><div v-for="n in 4" :key="n" class="stat-card loading-card"></div></div>
        <div v-else class="overview-grid">
          <article v-for="(stat, index) in overviewCards" :key="stat.label" class="stat-card" :class="`stat-card-${index + 1}`">
            <div class="stat-topline"><span class="stat-symbol">{{ stat.symbol }}</span><span class="stat-caption">{{ stat.caption }}</span></div>
            <strong class="stat-value">{{ stat.value }}<small>{{ stat.unit }}</small></strong><span class="stat-label">{{ stat.label }}</span><span class="stat-rule"><i :style="{ width: `${stat.progress}%` }"></i></span>
          </article>
        </div>
      </section>

      <section class="journal-section" aria-labelledby="journal-title">
        <div class="section-heading"><div><span class="eyebrow">THE LAST 30 DAYS</span><h2 id="journal-title">学习脉络</h2></div><span class="section-note">每天一点，最后会连成一条路</span></div>
        <div class="journal-grid">
          <article class="paper-card activity-card">
            <div class="card-heading"><div><span class="card-index">01</span><h3>近 30 天活动</h3></div><div class="activity-legend"><span><i class="legend-learning"></i>阅读</span><span><i class="legend-challenge"></i>闯关</span></div></div>
            <div class="activity-summary"><div><strong>{{ activeDays }}</strong><span>活跃天数</span></div><div><strong>{{ activityTotal }}</strong><span>学习记录</span></div><div><strong>{{ currentStreak }}</strong><span>连续打卡</span></div></div>
            <div class="activity-chart" aria-label="近30天学习活动柱状图"><div v-for="day in activityDays" :key="day.date" class="activity-column" :title="`${day.label}：阅读 ${day.learning} 次，闯关 ${day.challenge} 次`"><div class="bar-stack"><i class="bar-learning" :style="{ height: `${barHeight(day.learning)}%` }"></i><i class="bar-challenge" :style="{ height: `${barHeight(day.challenge)}%` }"></i></div><span v-if="day.isLabel" class="activity-label">{{ day.shortLabel }}</span></div></div>
            <div class="activity-foot"><span>{{ activityRangeLabel }}</span><span>最近一次：{{ lastStudyLabel }}</span></div>
          </article>
          <article class="paper-card direction-card">
            <div class="card-heading"><div><span class="card-index">02</span><h3>下一步，读哪里</h3></div><span class="direction-spark">✦</span></div>
            <p class="direction-lead">{{ learningMessage }}</p><div class="direction-line"><span class="line-dot"></span><span></span><span class="line-dot line-dot-end"></span></div>
            <div class="direction-meta"><span>本周已学 {{ weeklyStats.poems_learned || 0 }} 首</span><strong>{{ weeklyProgress }}%<small>本周节奏</small></strong></div>
            <button class="ink-button" type="button" @click="goTo(recommendationPath)">{{ recommendationLabel }} <span>→</span></button>
          </article>
        </div>
      </section>

      <section class="insight-section" aria-labelledby="insight-title">
        <div class="section-heading"><div><span class="eyebrow">A QUIET LOOK AT YOUR PROGRESS</span><h2 id="insight-title">能力与成就</h2></div><span class="section-note">不追求满分，只看见正在发生的变化</span></div>
        <div class="insight-grid">
          <article class="paper-card ability-card"><div class="card-heading"><div><span class="card-index">03</span><h3>诗词能力画像</h3></div><span class="card-aside">综合评估</span></div><div class="ability-list"><div v-for="item in abilityItems" :key="item.key" class="ability-row"><div class="ability-label"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div><div class="ability-track"><i :style="{ width: `${item.value}%` }"></i></div></div></div><p class="ability-footnote">从记忆到创作，每一项能力都可以从下一首诗开始。</p></article>
          <article class="paper-card achievement-card"><div class="card-heading"><div><span class="card-index">04</span><h3>最近解锁</h3></div><span class="card-aside">{{ achievementSummary.unlocked || 0 }} / {{ achievementSummary.total || 0 }}</span></div><div v-if="achievementItems.length" class="achievement-list"><div v-for="achievement in achievementItems" :key="achievement.id" class="achievement-row" :class="{ locked: !achievement.unlocked }"><div class="achievement-seal">{{ achievement.unlocked ? achievement.icon : '·' }}</div><div class="achievement-copy"><strong>{{ achievement.name }}</strong><span>{{ achievement.desc }}</span></div><span class="achievement-state">{{ achievement.unlocked ? '已获得' : `${achievement.progress}/${achievement.target}` }}</span></div></div><div v-else class="empty-inline"><span>◇</span><p>下一枚徽章，等你来点亮。</p></div><button class="text-button" type="button" @click="goTo('/learning-path')">打开学习路径 <span>↗</span></button></article>
        </div>
      </section>

      <section class="records-section" aria-labelledby="records-title">
        <div class="section-heading"><div><span class="eyebrow">KEEP THE LINES YOU LOVE</span><h2 id="records-title">诗句留下的痕迹</h2></div><span class="section-note">最近读过，也收藏过</span></div>
        <div class="records-grid">
          <article class="paper-card record-card"><div class="card-heading"><div><span class="card-index">05</span><h3>最近学习</h3></div><span class="card-aside">{{ recentPoems.length }} 首</span></div><div v-if="recentPoems.length" class="poem-list"><button v-for="poem in recentPoems" :key="poem.poem_id" type="button" class="poem-row" @click="goTo(`/poem/${poem.poem_id}`)"><span class="poem-mark">阅</span><span class="poem-copy"><strong>{{ poem.title || poem.poem_title || '无题' }}</strong><small>{{ poem.author || poem.poem_author || '佚名' }} · {{ poem.dynasty || '古代' }}</small></span><span class="poem-arrow">↗</span></button></div><div v-else class="empty-state"><span>山水未落笔</span><p>从今日一诗开始，写下第一笔记录。</p><button type="button" class="text-button" @click="goTo('/daily')">去读一首 <span>→</span></button></div></article>
          <article class="paper-card record-card collection-card"><div class="card-heading"><div><span class="card-index">06</span><h3>收藏诗句</h3></div><span class="card-aside">{{ collectedPoems.length }} 首</span></div><div v-if="collectedPoems.length" class="poem-list"><div v-for="poem in collectedPoems" :key="poem.poem_id" class="poem-row poem-row-static"><button type="button" class="poem-open" @click="goTo(`/poem/${poem.poem_id}`)"><span class="poem-mark">藏</span><span class="poem-copy"><strong>{{ poem.title || poem.poem_title || '无题' }}</strong><small>{{ poem.author || poem.poem_author || '佚名' }}</small></span></button><button type="button" class="remove-button" title="取消收藏" @click="removeCollection(poem.poem_id)">×</button></div></div><div v-else class="empty-state"><span>还没有藏入诗句</span><p>遇到喜欢的句子，就把它留在这里。</p><button type="button" class="text-button" @click="goTo('/search')">去诗词库 <span>→</span></button></div></article>
        </div>
      </section>
      <p v-if="error" class="data-note">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api.js'
import profileBackground from '@/assets/profile-inkscape-v2.png'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const user = ref({ username: '诗词爱好者', email: '', avatar: '' })
const profileData = ref({ overview: {}, recentPoems: [], collectedPoems: [], weeklyStats: {}, abilityModel: {} })
const activityData = ref({ learningActivity: [], challengeActivity: [], checkinActivity: [] })
const achievementData = ref({ achievements: [], summary: {}, userStats: {} })
const quote = { text: '腹有诗书气自华', source: '苏轼《和董传留别》' }
const inkMarks = [{ id: 1, text: '山', style: { left: '6%', top: '22%', transform: 'rotate(-12deg)' } }, { id: 2, text: '水', style: { right: '7%', top: '42%', transform: 'rotate(9deg)' } }, { id: 3, text: '静', style: { left: '13%', bottom: '12%', transform: 'rotate(7deg)' } }]

const overview = computed(() => profileData.value.overview || {})
const weeklyStats = computed(() => profileData.value.weeklyStats || {})
const recentPoems = computed(() => profileData.value.recentPoems || [])
const collectedPoems = computed(() => profileData.value.collectedPoems || [])
const achievementSummary = computed(() => achievementData.value.summary || {})
const profileLevel = computed(() => `Lv.${calculateLevel(Number(overview.value.poemsStudied) || 0)}`)
const joinDate = computed(() => user.value.created_at ? formatDate(user.value.created_at, true) : '今日')
const currentStatus = computed(() => Number(overview.value.weeklyCheckins) > 0 ? '学习节奏正好' : '等你开始今天的阅读')
const weeklyProgress = computed(() => Math.min(100, Math.round((Number(overview.value.weeklyCheckins || 0) / 7) * 100)))
const recommendationPath = computed(() => Number(overview.value.poemsStudied) > 0 ? '/learning-path' : '/daily')
const recommendationLabel = computed(() => Number(overview.value.poemsStudied) > 0 ? '查看我的学习路径' : '从每日一诗开始')

const overviewCards = computed(() => [
  { symbol: '阅', label: '已学诗词', value: formatNumber(overview.value.poemsStudied), unit: '首', caption: '把读过的留住', progress: Math.min(100, Number(overview.value.poemsStudied || 0) / 2) },
  { symbol: '藏', label: '收藏诗句', value: formatNumber(overview.value.collections), unit: '首', caption: '值得再读一遍', progress: Math.min(100, Number(overview.value.collections || 0) * 3) },
  { symbol: '闯', label: '最高闯关', value: formatNumber(overview.value.challengeLevel), unit: '关', caption: '在挑战里前进', progress: Math.min(100, Number(overview.value.challengeLevel || 0) * 2) },
  { symbol: '令', label: '飞花令积分', value: formatNumber(overview.value.feihuaRating || 1000), unit: '分', caption: '诗意仍在增长', progress: Math.min(100, Math.max(0, (Number(overview.value.feihuaRating || 1000) - 800) / 12)) }
])

const abilityItems = computed(() => {
  const model = profileData.value.abilityModel || {}
  return [{ key: 'memory', label: '记忆', value: clampScore(model.memory) }, { key: 'understanding', label: '理解', value: clampScore(model.understanding) }, { key: 'application', label: '应用', value: clampScore(model.application) }, { key: 'creativity', label: '创作', value: clampScore(model.creativity) }]
})
const achievementItems = computed(() => [...(achievementData.value.achievements || [])].sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || (b.progress / Math.max(b.target, 1)) - (a.progress / Math.max(a.target, 1))).slice(0, 4))

const activityDays = computed(() => {
  const learningMap = new Map((activityData.value.learningActivity || []).map(item => [normalizeDate(item.date), Number(item.count) || 0]))
  const challengeMap = new Map((activityData.value.challengeActivity || []).map(item => [normalizeDate(item.date), Number(item.count) || 0]))
  const days = []; const today = new Date()
  for (let index = 29; index >= 0; index -= 1) { const date = new Date(today); date.setDate(today.getDate() - index); const dateKey = localDateKey(date); days.push({ date: dateKey, label: `${date.getMonth() + 1}月${date.getDate()}日`, shortLabel: `${date.getMonth() + 1}/${date.getDate()}`, learning: learningMap.get(dateKey) || 0, challenge: challengeMap.get(dateKey) || 0, isLabel: index === 29 || index === 15 || index === 0 }) }
  return days
})
const maxActivity = computed(() => Math.max(...activityDays.value.flatMap(day => [day.learning, day.challenge]), 1))
const activeDays = computed(() => activityDays.value.filter(day => day.learning > 0 || day.challenge > 0).length)
const activityTotal = computed(() => activityDays.value.reduce((total, day) => total + day.learning + day.challenge, 0))
const currentStreak = computed(() => Number(achievementData.value.userStats?.checkinStreak || 0) || calculateStreak(activityData.value.checkinActivity))
const activityRangeLabel = computed(() => activityDays.value.length ? `${activityDays.value[0].label} 至 ${activityDays.value[activityDays.value.length - 1].label}` : '最近 30 天')
const lastStudyLabel = computed(() => recentPoems.value[0]?.last_view_time ? formatDate(recentPoems.value[0].last_view_time) : '还没有记录')
const learningMessage = computed(() => { if (!Number(overview.value.poemsStudied)) return '一首诗，就是一条小小的起点。今天先读懂一句，再把它记在心里。'; if (Number(overview.value.weeklyCheckins) >= 3) return '你正在形成自己的节奏。把这份专注延续到下一首诗，答案会越来越清楚。'; return '最近的阅读已经留下了痕迹。今天再向前一步，让熟悉的句子变成真正的记忆。' })

function formatNumber(value) { return Number(value || 0).toLocaleString('zh-CN') }
function clampScore(value) { return Math.min(100, Math.max(0, Math.round(Number(value) || 0))) }
function calculateLevel(count) { if (count >= 100) return 5; if (count >= 60) return 4; if (count >= 30) return 3; if (count >= 10) return 2; return 1 }
function normalizeDate(value) { return value ? String(value).slice(0, 10) : '' }
function localDateKey(date) { const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 10) }
function calculateStreak(rows) { const dates = new Set((rows || []).filter(item => Number(item.count) > 0).map(item => normalizeDate(item.date))); let streak = 0; const today = new Date(); for (let index = 0; index < 30; index += 1) { const date = new Date(today); date.setDate(today.getDate() - index); if (!dates.has(localDateKey(date))) break; streak += 1 } return streak }
function barHeight(value) { return value ? Math.max(10, Math.round((value / maxActivity.value) * 100)) : 4 }
function formatDate(value, monthOnly = false) { if (!value) return '未记录'; const date = new Date(value); if (Number.isNaN(date.getTime())) return '未记录'; return monthOnly ? `${date.getFullYear()}年${date.getMonth() + 1}月` : `${date.getMonth() + 1}月${date.getDate()}日` }
function goTo(path) { router.push(path) }
async function removeCollection(poemId) { try { await api.collections.remove(poemId); profileData.value.collectedPoems = collectedPoems.value.filter(poem => poem.poem_id !== poemId) } catch (requestError) { error.value = requestError.message || '收藏更新失败，请稍后再试。' } }
function handleLogout() { localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('userInfo'); router.push('/login') }

async function loadProfile() {
  loading.value = true; error.value = ''; const savedUser = localStorage.getItem('user')
  if (savedUser) { try { user.value = { ...user.value, ...JSON.parse(savedUser) } } catch { /* keep fallback profile */ } }
  const [statsResult, activityResult, achievementsResult] = await Promise.allSettled([api.profile.getStats(), api.profile.getActivityData(), api.profile.getAchievements()])
  if (statsResult.status === 'fulfilled' && statsResult.value?.success) profileData.value = { ...profileData.value, ...(statsResult.value.data || {}) }
  if (activityResult.status === 'fulfilled' && activityResult.value?.success) activityData.value = { ...activityData.value, ...(activityResult.value.data || {}) }
  if (achievementsResult.status === 'fulfilled' && achievementsResult.value?.success) achievementData.value = achievementsResult.value.data || achievementData.value
  if (statsResult.status === 'rejected') error.value = '暂时无法读取最新学习数据，页面将保留已有记录。'
  loading.value = false
}
onMounted(loadProfile)
</script>

<style scoped>
:global(body) { background: #e7eee7; }
.profile-page { --ink:#173c37; --muted:#6c8179; --soft-ink:#9aad9f; --paper:rgba(247,249,240,.78); --line:rgba(23,60,55,.13); --jade:#2f8373; --jade-deep:#1d5f56; --gold:#b38649; position:relative; isolation:isolate; width:100vw; min-height:100vh; margin-left:calc(50% - 50vw); margin-right:calc(50% - 50vw); padding:0 clamp(18px,3vw,48px) 92px; overflow:hidden; color:var(--ink); font-family:'Noto Sans SC','Microsoft YaHei',sans-serif; }
.profile-atmosphere { position:absolute; inset:0; z-index:-1; overflow:hidden; background:#e7eee7; }.profile-background { position:absolute; inset:0; width:100%; height:100%; min-height:900px; object-fit:cover; object-position:center top; opacity:.75; filter:saturate(.82) contrast(.96); }.atmosphere-wash { position:absolute; inset:0; background:linear-gradient(180deg,rgba(238,245,237,.82) 0%,rgba(236,243,234,.45) 30%,rgba(225,237,229,.82) 100%); }.atmosphere-grain { position:absolute; inset:0; opacity:.18; background-image:radial-gradient(rgba(23,60,55,.14) .5px,transparent .5px); background-size:5px 5px; mix-blend-mode:multiply; }.ink-mark { position:absolute; color:rgba(29,95,86,.12); font:400 88px/1 'Ma Shan Zheng','Noto Serif SC',serif; pointer-events:none; }.profile-shell { position:relative; z-index:1; max-width:1240px; margin:0 auto; }
.profile-hero { display:grid; grid-template-columns:minmax(0,1fr) 310px; gap:70px; align-items:end; padding:82px 18px 42px; }.eyebrow { display:block; color:var(--jade); font:600 11px/1.2 'Noto Sans SC',sans-serif; letter-spacing:.2em; }.hero-copy h1 { max-width:660px; margin:17px 0 15px; color:var(--ink); font:600 clamp(34px,5vw,66px)/1.14 'Noto Serif SC','SimSun',serif; letter-spacing:-.055em; }.hero-copy h1 em { color:var(--jade-deep); font-style:normal; background:linear-gradient(transparent 70%,rgba(179,134,73,.23) 70%); }.hero-copy p { max-width:470px; margin:0; color:var(--muted); font-size:15px; line-height:1.9; }.hero-quote { position:relative; padding:22px 0 8px 24px; border-left:1px solid rgba(179,134,73,.6); }.quote-mark { position:absolute; top:-17px; left:11px; color:rgba(179,134,73,.62); font:400 48px/1 'Noto Serif SC',serif; }.hero-quote p { margin:0 0 10px; color:var(--ink); font:500 22px/1.55 'Noto Serif SC',serif; }.hero-quote small { color:var(--muted); font-size:12px; letter-spacing:.08em; }
.paper-card { position:relative; overflow:hidden; border:1px solid rgba(255,255,255,.62); background:linear-gradient(135deg,rgba(255,255,255,.56),rgba(238,246,237,.68)); box-shadow:0 18px 50px rgba(46,83,69,.08),inset 0 1px rgba(255,255,255,.72); backdrop-filter:blur(19px) saturate(110%); -webkit-backdrop-filter:blur(19px) saturate(110%); }.paper-card::before { content:''; position:absolute; inset:0; pointer-events:none; background:radial-gradient(circle at 8% 0%,rgba(255,255,255,.54),transparent 34%),linear-gradient(112deg,transparent 0 52%,rgba(255,255,255,.19) 72%,transparent 100%); }.profile-identity { display:flex; align-items:center; justify-content:space-between; gap:30px; padding:28px 34px; border-radius:24px; }.identity-main { display:flex; align-items:center; gap:20px; min-width:0; }.avatar-frame { position:relative; display:grid; place-items:center; flex:0 0 82px; width:82px; height:82px; border:1px solid rgba(179,134,73,.5); border-radius:50%; background:rgba(246,242,223,.74); box-shadow:0 0 0 7px rgba(255,255,255,.25),0 9px 26px rgba(38,85,70,.11); }.avatar-frame::after { content:''; position:absolute; inset:5px; border:1px solid rgba(47,131,115,.35); border-radius:50%; }.avatar-image { width:70px; height:70px; border-radius:50%; object-fit:cover; }.avatar-monogram { color:var(--jade-deep); font:600 34px/1 'Noto Serif SC',serif; }.avatar-seal { position:absolute; right:-7px; bottom:-1px; z-index:2; display:grid; place-items:center; width:32px; height:32px; border:2px solid #eff2df; border-radius:50%; color:#fff; background:var(--jade-deep); font:600 9px/1 'Noto Sans SC',sans-serif; }.identity-copy { min-width:0; }.identity-kicker { color:var(--gold); font-size:11px; letter-spacing:.14em; }.identity-copy h2 { margin:4px 0 2px; color:var(--ink); font:600 28px/1.25 'Noto Serif SC',serif; }.identity-copy p { max-width:440px; margin:0; overflow:hidden; color:var(--muted); font-size:13px; text-overflow:ellipsis; white-space:nowrap; }.identity-meta { display:flex; flex-wrap:wrap; gap:16px; margin-top:12px; color:var(--soft-ink); font-size:11px; }.meta-dot { display:inline-block; width:6px; height:6px; margin-right:6px; border-radius:50%; background:#67a991; box-shadow:0 0 0 4px rgba(103,169,145,.14); }.identity-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:10px; }button { font:inherit; cursor:pointer; }.quiet-button,.logout-button { border-radius:999px; padding:11px 16px; transition:transform .25s ease,background .25s ease,border-color .25s ease; }.quiet-button { border:1px solid rgba(47,131,115,.32); color:var(--jade-deep); background:rgba(255,255,255,.46); }.quiet-button:hover,.logout-button:hover { transform:translateY(-2px); }.quiet-button span,.ink-button span,.text-button span { margin-left:8px; }.logout-button { border:1px solid rgba(179,134,73,.35); color:#96713e; background:rgba(251,244,226,.3); font-size:12px; }
.overview-section,.journal-section,.insight-section,.records-section { padding-top:66px; }.section-heading { display:flex; align-items:end; justify-content:space-between; gap:24px; margin-bottom:20px; padding:0 4px; }.section-heading h2 { margin:9px 0 0; color:var(--ink); font:600 29px/1.25 'Noto Serif SC',serif; letter-spacing:-.03em; }.section-note { padding-bottom:4px; color:var(--muted); font-size:12px; }.overview-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }.stat-card { position:relative; min-height:170px; overflow:hidden; padding:22px 23px; border:1px solid rgba(255,255,255,.62); border-radius:18px; background:var(--paper); box-shadow:0 16px 35px rgba(38,85,70,.06); transition:transform .25s ease,box-shadow .25s ease; }.stat-card:hover { transform:translateY(-4px); box-shadow:0 20px 40px rgba(38,85,70,.12); }.stat-card::after { content:''; position:absolute; right:-23px; bottom:-38px; width:100px; height:100px; border:1px solid rgba(47,131,115,.14); border-radius:50%; box-shadow:0 0 0 12px rgba(47,131,115,.05),0 0 0 24px rgba(47,131,115,.04); }.stat-card-2::after { border-color:rgba(179,134,73,.18); box-shadow:0 0 0 12px rgba(179,134,73,.06),0 0 0 24px rgba(179,134,73,.04); }.stat-card-3::after { border-color:rgba(73,120,148,.16); }.stat-card-4::after { border-color:rgba(124,100,143,.16); }.stat-topline { display:flex; align-items:center; justify-content:space-between; color:var(--muted); font-size:11px; }.stat-symbol { display:grid; place-items:center; width:30px; height:30px; border:1px solid rgba(47,131,115,.24); border-radius:50%; color:var(--jade-deep); background:rgba(255,255,255,.48); font:600 12px 'Noto Serif SC',serif; }.stat-card-2 .stat-symbol { color:#9f7235; border-color:rgba(179,134,73,.28); }.stat-card-3 .stat-symbol { color:#416f84; border-color:rgba(73,120,148,.25); }.stat-card-4 .stat-symbol { color:#735d86; border-color:rgba(124,100,143,.25); }.stat-caption { letter-spacing:.04em; }.stat-value { display:block; margin-top:20px; color:var(--ink); font:600 36px/1 'Noto Serif SC',serif; }.stat-value small { margin-left:5px; color:var(--muted); font:400 12px 'Noto Sans SC',sans-serif; }.stat-label { display:block; margin-top:8px; color:var(--muted); font-size:12px; }.stat-rule { display:block; width:100%; height:3px; margin-top:19px; overflow:hidden; border-radius:99px; background:rgba(47,131,115,.11); }.stat-rule i { display:block; height:100%; border-radius:inherit; background:var(--jade); }.stat-card-2 .stat-rule i { background:var(--gold); }.stat-card-3 .stat-rule i { background:#5c8aa0; }.stat-card-4 .stat-rule i { background:#8c6a9a; }.loading-grid { min-height:170px; }.loading-card { animation:breathe 1.6s ease-in-out infinite; background:rgba(255,255,255,.42); }.loading-card:nth-child(2) { animation-delay:.2s; }.loading-card:nth-child(3) { animation-delay:.4s; }.loading-card:nth-child(4) { animation-delay:.6s; }@keyframes breathe { 0%,100% { opacity:.48; } 50% { opacity:.88; } }
.journal-grid,.insight-grid,.records-grid { display:grid; gap:14px; }.journal-grid { grid-template-columns:minmax(0,1.65fr) minmax(280px,.85fr); }.activity-card,.direction-card,.ability-card,.achievement-card,.record-card { border-radius:20px; }.activity-card { padding:25px 27px 20px; }.card-heading { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; gap:12px; }.card-heading>div { display:flex; align-items:center; gap:11px; }.card-index { color:var(--gold); font:600 11px/1 'Noto Sans SC',sans-serif; letter-spacing:.08em; }.card-heading h3 { margin:0; color:var(--ink); font:600 18px/1.3 'Noto Serif SC',serif; }.card-aside { color:var(--soft-ink); font-size:11px; }.direction-spark { color:var(--gold); font-size:22px; }.activity-legend { display:flex; gap:12px; color:var(--soft-ink); font-size:10px; }.activity-legend span { display:inline-flex; align-items:center; gap:5px; }.activity-legend i { width:7px; height:7px; border-radius:50%; }.legend-learning { background:var(--jade); }.legend-challenge { background:var(--gold); }.activity-summary { position:relative; z-index:1; display:flex; gap:32px; margin:28px 0 15px; }.activity-summary div { display:flex; align-items:baseline; gap:7px; }.activity-summary strong { color:var(--ink); font:600 25px/1 'Noto Serif SC',serif; }.activity-summary span { color:var(--muted); font-size:11px; }.activity-chart { display:flex; align-items:end; height:166px; gap:6px; padding:14px 3px 0; border-bottom:1px solid var(--line); }.activity-column { display:flex; flex:1; flex-direction:column; align-items:center; justify-content:end; height:100%; min-width:3px; }.bar-stack { display:flex; align-items:end; justify-content:center; width:100%; height:calc(100% - 16px); gap:2px; }.bar-stack i { display:block; width:min(7px,45%); min-height:3px; border-radius:5px 5px 1px 1px; transition:height .5s ease; }.bar-learning { background:linear-gradient(180deg,#4b9d86,#2b7768); }.bar-challenge { background:linear-gradient(180deg,#d1aa69,#af8249); }.activity-label { display:block; height:16px; margin-top:6px; color:var(--soft-ink); font-size:9px; white-space:nowrap; }.activity-foot { display:flex; justify-content:space-between; padding-top:11px; color:var(--soft-ink); font-size:10px; }
.direction-card { display:flex; flex-direction:column; min-height:300px; padding:25px 27px; background:linear-gradient(145deg,rgba(32,94,82,.88),rgba(44,110,92,.78)); color:#eef5e8; box-shadow:0 20px 45px rgba(29,95,86,.18); }.direction-card::before { background:radial-gradient(circle at 90% 10%,rgba(226,199,142,.28),transparent 30%),linear-gradient(112deg,transparent 0 52%,rgba(255,255,255,.07) 72%,transparent 100%); }.direction-card .card-index,.direction-card .card-heading h3,.direction-card .card-aside { color:#e5ebd7; }.direction-card .card-index { color:#e4c587; }.direction-lead { position:relative; z-index:1; max-width:270px; margin:34px 0 25px; color:rgba(246,249,235,.92); font:400 20px/1.72 'Noto Serif SC',serif; }.direction-line { position:relative; z-index:1; display:flex; align-items:center; gap:7px; margin-bottom:25px; }.direction-line span:nth-child(2) { flex:1; height:1px; background:rgba(228,197,135,.55); }.line-dot { width:7px; height:7px; border:1px solid #e4c587; border-radius:50%; background:#e4c587; }.line-dot-end { background:transparent; }.direction-meta { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; color:rgba(238,245,232,.68); font-size:11px; }.direction-meta strong { display:flex; align-items:baseline; gap:4px; color:#f0d49a; font:600 25px/1 'Noto Serif SC',serif; }.direction-meta small { color:rgba(238,245,232,.68); font:400 10px 'Noto Sans SC',sans-serif; }.ink-button { position:relative; z-index:1; align-self:flex-start; margin-top:auto; padding:10px 0 2px; border:0; border-bottom:1px solid rgba(228,197,135,.58); color:#f1d69a; background:transparent; font-size:12px; }
.insight-grid { grid-template-columns:1.06fr .94fr; }.ability-card,.achievement-card { padding:25px 27px; }.ability-list { position:relative; z-index:1; margin-top:34px; }.ability-row+.ability-row { margin-top:21px; }.ability-label { display:flex; justify-content:space-between; margin-bottom:8px; color:var(--muted); font-size:12px; }.ability-label strong { color:var(--jade-deep); font:600 13px 'Noto Serif SC',serif; }.ability-track { height:7px; overflow:hidden; border-radius:99px; background:rgba(47,131,115,.12); }.ability-track i { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#8bbfac,var(--jade-deep)); }.ability-row:nth-child(2) .ability-track i { background:linear-gradient(90deg,#c7b37a,var(--gold)); }.ability-row:nth-child(3) .ability-track i { background:linear-gradient(90deg,#91b7c1,#5c8aa0); }.ability-row:nth-child(4) .ability-track i { background:linear-gradient(90deg,#b89ac0,#8c6a9a); }.ability-footnote { position:relative; z-index:1; margin:27px 0 0; padding-top:17px; border-top:1px solid var(--line); color:var(--soft-ink); font-size:11px; line-height:1.7; }.achievement-list { position:relative; z-index:1; margin-top:21px; }.achievement-row { display:flex; align-items:center; gap:11px; padding:12px 0; border-bottom:1px solid rgba(23,60,55,.09); }.achievement-row:last-child { border-bottom:0; }.achievement-seal { display:grid; place-items:center; flex:0 0 30px; width:30px; height:30px; border:1px solid rgba(179,134,73,.45); border-radius:50%; color:#9f7235; background:rgba(249,242,218,.52); font-size:14px; }.achievement-copy { display:flex; flex:1; flex-direction:column; gap:3px; min-width:0; }.achievement-copy strong { color:var(--ink); font-size:12px; }.achievement-copy span { overflow:hidden; color:var(--muted); font-size:10px; text-overflow:ellipsis; white-space:nowrap; }.achievement-state { color:var(--jade); font-size:10px; white-space:nowrap; }.achievement-row.locked { opacity:.56; }.achievement-row.locked .achievement-seal { border-color:var(--line); color:var(--soft-ink); background:transparent; }.text-button { position:relative; z-index:1; margin-top:13px; padding:0; border:0; color:var(--jade-deep); background:transparent; font-size:11px; }.empty-inline { display:flex; align-items:center; gap:12px; margin-top:32px; color:var(--muted); }.empty-inline span { color:var(--gold); font-size:28px; }.empty-inline p { margin:0; font-size:12px; }
.records-grid { grid-template-columns:1fr 1fr; }.record-card { min-height:275px; padding:25px 27px; }.poem-list { position:relative; z-index:1; margin-top:17px; }.poem-row { display:flex; align-items:center; width:100%; gap:11px; padding:13px 0; border:0; border-bottom:1px solid rgba(23,60,55,.09); color:inherit; text-align:left; background:transparent; }.poem-row:last-child { border-bottom:0; }.poem-row:hover .poem-copy strong { color:var(--jade); }.poem-mark { display:grid; place-items:center; flex:0 0 28px; width:28px; height:28px; border:1px solid rgba(47,131,115,.24); border-radius:50%; color:var(--jade-deep); background:rgba(255,255,255,.4); font:600 11px 'Noto Serif SC',serif; }.poem-copy { display:flex; flex:1; flex-direction:column; gap:3px; min-width:0; }.poem-copy strong { overflow:hidden; color:var(--ink); font:500 14px 'Noto Serif SC',serif; text-overflow:ellipsis; white-space:nowrap; transition:color .2s ease; }.poem-copy small { color:var(--muted); font-size:10px; }.poem-arrow { color:var(--soft-ink); font-size:15px; }.poem-row-static { padding-right:0; }.poem-open { display:flex; align-items:center; flex:1; gap:11px; min-width:0; border:0; color:inherit; background:transparent; text-align:left; }.remove-button { border:0; color:var(--soft-ink); background:transparent; font-size:18px; line-height:1; }.remove-button:hover { color:#aa6e57; }.empty-state { position:relative; z-index:1; padding:45px 0 10px; }.empty-state>span { color:var(--gold); font:500 17px 'Noto Serif SC',serif; }.empty-state p { margin:9px 0 12px; color:var(--muted); font-size:11px; }.data-note { margin:25px 0 0; color:#a56e59; font-size:11px; text-align:center; }
@media (max-width:900px) { .profile-hero { grid-template-columns:1fr; gap:25px; padding-top:55px; }.hero-quote { max-width:320px; }.overview-grid { grid-template-columns:repeat(2,1fr); }.journal-grid,.insight-grid,.records-grid { grid-template-columns:1fr; }.direction-card { min-height:260px; } }
@media (max-width:620px) { .profile-page { margin:0 -12px; padding:0 12px 64px; }.profile-hero { padding:42px 8px 30px; }.hero-copy h1 { font-size:37px; }.hero-copy p { font-size:13px; }.hero-quote p { font-size:19px; }.profile-identity { align-items:flex-start; flex-direction:column; padding:22px 20px; }.identity-actions { justify-content:flex-start; width:100%; }.identity-actions button { flex:1; }.identity-copy h2 { font-size:24px; }.identity-copy p { max-width:250px; }.section-heading { align-items:flex-start; flex-direction:column; gap:7px; }.section-heading h2 { font-size:25px; }.overview-grid { gap:10px; }.stat-card { min-height:150px; padding:17px; }.stat-value { margin-top:15px; font-size:29px; }.stat-caption { display:none; }.activity-card,.direction-card,.ability-card,.achievement-card,.record-card { padding:21px 18px; }.activity-summary { gap:16px; }.activity-summary div { align-items:flex-start; flex-direction:column; gap:3px; }.activity-summary strong { font-size:22px; }.activity-chart { gap:3px; }.bar-stack { gap:1px; }.bar-stack i { width:45%; }.activity-label { font-size:8px; }.ink-mark { font-size:60px; } }
@media (prefers-reduced-motion:reduce) { *,*::before,*::after { scroll-behavior:auto !important; transition-duration:.01ms !important; animation-duration:.01ms !important; animation-iteration-count:1 !important; } }
</style>
