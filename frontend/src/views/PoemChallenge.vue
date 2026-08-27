<template>
  <div class="challenge-map-page">
    <section class="challenge-head">
      <div class="title-block">
        <span class="title-rule"></span>
        <div>
          <span class="eyebrow">POETRY QUEST · 200 LEVELS</span>
          <h1>诗词闯关</h1>
          <p>以诗为径，步步闯关，解锁千年诗意之旅</p>
        </div>
      </div>

      <div class="progress-summary" aria-label="闯关学习摘要">
        <div v-for="item in summary" :key="item.label" class="summary-item">
          <span class="summary-icon" :class="item.tone"><component :is="item.icon" :size="20" weight="duotone" /></span>
          <div>
            <small>{{ item.label }}</small>
            <strong>{{ item.value }} <em>{{ item.suffix }}</em></strong>
          </div>
        </div>
      </div>

      <nav class="challenge-tools" aria-label="闯关工具">
        <router-link to="/challenge/rank"><PhChartBar :size="19" weight="duotone" />排行榜</router-link>
        <router-link to="/challenge/error-book"><PhBookOpenText :size="19" weight="duotone" />错题本</router-link>
        <router-link to="/challenge/review"><PhArrowClockwise :size="19" weight="duotone" />错题复习</router-link>
        <router-link to="/challenge/battle"><PhSword :size="19" weight="duotone" />闯关对战</router-link>
      </nav>
    </section>

    <section class="challenge-stage">
      <div class="map-panel" aria-label="诗词闯关山水地图">
        <img class="map-art" src="../assets/challenge-map-landscape.png" alt="水墨群山、亭台与长城组成的诗词闯关地图" draggable="false" />
        <div class="map-wash" aria-hidden="true"></div>
        <div class="map-copy">
          <span>当前诗境</span>
          <h2>{{ currentChapter.name }}</h2>
          <p>{{ currentChapter.description }}</p>
        </div>

        <div class="map-route" aria-hidden="true">
          <span v-for="step in 5" :key="step" :class="{ active: step <= currentChapterIndex + 1 }"></span>
        </div>

        <div class="chapter-stops" aria-label="章节选择">
          <button
            v-for="(chapter, index) in chapters"
            :key="chapter.id"
            class="chapter-stop"
            :class="{ active: index === currentChapterIndex, locked: chapter.start > unlockedThrough }"
            :style="{ '--stop-x': `${chapter.x}%`, '--stop-y': `${chapter.y}%` }"
            :aria-label="`${chapter.name}，第 ${chapter.start} 至 ${chapter.end} 关`"
            @click="selectChapter(index)"
          >
            <span class="stop-orbit"><component :is="chapter.icon" :size="18" weight="duotone" /></span>
            <strong>{{ chapter.name }}</strong>
            <small>{{ chapter.start }}－{{ chapter.end }}关</small>
          </button>
        </div>

        <div class="map-legend">
          <span><i class="legend-dot done"></i>已完成</span>
          <span><i class="legend-dot current"></i>可挑战</span>
          <span><i class="legend-dot locked"></i>未解锁</span>
        </div>
      </div>

      <aside class="quest-card" :class="{ locked: currentLevel.status === 'locked' }">
        <div class="quest-landscape">
          <div>
            <small>{{ currentLevel.status === 'locked' ? '尚未解锁' : '当前关卡' }}</small>
            <h2>第{{ currentLevel.level }}关 · {{ currentLevel.poemTitle }}</h2>
            <span>{{ currentLevel.difficultyLabel }}｜{{ currentLevel.description }}</span>
          </div>
          <span class="moon-number">{{ currentLevel.level }}</span>
        </div>

        <div v-if="currentLevel.status === 'locked'" class="locked-copy">
          <span><PhLockKey :size="25" weight="duotone" /></span>
          <div>
            <strong>前方诗境尚未开启</strong>
            <p>完成第 {{ currentLevel.level - 1 }} 关后即可继续前行。</p>
          </div>
        </div>

        <template v-else>
          <div class="quest-section mission-copy">
            <strong>本关目标</strong>
            <p>{{ currentLevel.goal }}</p>
          </div>

          <div class="quest-section verse-box">
            <strong>本关诗句</strong>
            <blockquote>{{ currentLevel.verse }}</blockquote>
            <cite>{{ currentLevel.poemAuthor }} · {{ currentLevel.poemTitle }}</cite>
          </div>

          <div class="quest-section quest-progress">
            <div><strong>答题进度</strong><span>{{ currentLevel.questionCount }} 道题</span></div>
            <div class="progress-track">
              <span v-for="step in 5" :key="step" :class="{ filled: step <= currentLevel.questionCount }"></span>
            </div>
          </div>
        </template>

        <div class="quest-actions">
          <button class="continue-button" :disabled="!nextPlayableLevel" @click="continueLast">
            继续上次进度 <PhArrowRight :size="18" weight="bold" />
          </button>
          <button class="start-button" :disabled="currentLevel.status === 'locked'" @click="startSelected">
            {{ currentLevel.status === 'done' ? '再次闯关' : '开始闯关' }}
          </button>
        </div>
      </aside>
    </section>

    <section class="level-browser" aria-labelledby="level-browser-title">
      <div class="browser-heading">
        <div>
          <span class="eyebrow">LEARNING PATH</span>
          <h2 id="level-browser-title">200 关学习路径</h2>
          <p>按章节浏览关卡，进入作答页后可专注完成本关题目。</p>
        </div>
        <label class="level-jump">
          <span>跳转关卡</span>
          <input v-model.number="jumpLevel" type="number" min="1" max="200" @keyup.enter="jumpToLevel" />
          <button type="button" @click="jumpToLevel"><PhArrowRight :size="16" /></button>
        </label>
      </div>

      <div class="chapter-tabs" role="tablist" aria-label="诗词章节">
        <button
          v-for="(chapter, index) in chapters"
          :key="chapter.id"
          type="button"
          role="tab"
          :aria-selected="index === currentChapterIndex"
          :class="{ active: index === currentChapterIndex }"
          @click="selectChapter(index)"
        >
          <span>{{ chapter.index }}</span>
          <strong>{{ chapter.name }}</strong>
          <small>{{ chapter.start }}－{{ chapter.end }}</small>
        </button>
      </div>

      <div class="level-grid">
        <button
          v-for="level in visibleLevels"
          :key="level.level"
          type="button"
          class="level-card"
          :class="[`is-${level.status}`, { selected: selectedLevel === level.level }]"
          :disabled="level.status === 'locked'"
          @click="selectLevel(level)"
        >
          <span class="level-number">
            <PhLockKey v-if="level.status === 'locked'" :size="15" weight="fill" />
            <PhCheck v-else-if="level.status === 'done'" :size="16" weight="bold" />
            <span v-else>{{ level.level }}</span>
          </span>
          <span class="level-info">
            <strong>{{ level.poemTitle }}</strong>
            <small>第 {{ level.level }} 关 · {{ level.difficultyLabel }}</small>
          </span>
          <span class="level-stars" :aria-label="`${level.stars} 星`">
            <PhStar v-for="star in 3" :key="star" :size="12" :weight="star <= level.stars ? 'fill' : 'regular'" />
          </span>
        </button>
      </div>
    </section>

    <section class="challenge-dock">
      <article class="leaderboard-block">
        <div class="dock-heading"><strong>好友排行榜 <PhInfo :size="14" /></strong><router-link to="/challenge/rank">查看全部排行 →</router-link></div>
        <div class="friend-row">
          <div v-for="(friend, index) in leaderboard" :key="friend.name" class="friend-item">
            <span class="rank-badge">{{ index + 1 }}</span>
            <span class="friend-seal" :class="`seal-${index + 1}`">{{ friend.name.slice(0, 1) }}</span>
            <div><strong>{{ friend.name }}</strong><small>{{ friend.score }} 分</small></div>
          </div>
        </div>
      </article>
      <article class="rewards-block">
        <div class="dock-heading"><strong>闯关奖励</strong><span>累计星级：<b>{{ totalStars }}</b> <PhStar :size="14" weight="fill" /></span></div>
        <div class="reward-road">
          <div v-for="reward in rewards" :key="reward.threshold" class="reward-item" :class="{ claimed: totalStars >= reward.threshold }">
            <span><component :is="reward.icon" :size="23" weight="duotone" /></span>
            <small>{{ reward.threshold }} 星可领</small>
          </div>
        </div>
      </article>
      <article class="tip-block">
        <PhQuotes :size="25" weight="fill" />
        <div><strong>学习小贴士</strong><p>多读多想多练，诗词之美在于理解与感悟。</p></div>
      </article>
    </section>

    <transition name="toast"><div v-if="toast" class="toast-message" role="status">{{ toast }}</div></transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  PhArrowClockwise,
  PhArrowRight,
  PhBookOpenText,
  PhChartBar,
  PhCheck,
  PhFire,
  PhFlagBanner,
  PhFlowerLotus,
  PhInfo,
  PhLockKey,
  PhMedal,
  PhQuotes,
  PhScroll,
  PhStar,
  PhSword,
  PhTree
} from '@phosphor-icons/vue'
import levelsData from '../data/poetryLevels.json'
import api from '../services/api'

const router = useRouter()
const TOTAL_LEVELS = 200
const completedThrough = ref(readStoredProgress())
const selectedLevel = ref(Math.min(completedThrough.value + 1, TOTAL_LEVELS))
const jumpLevel = ref(selectedLevel.value)
const toast = ref('')
let toastTimer

const chapterMetas = [
  ['初识诗词', '五言绝句入门', PhFlowerLotus],
  ['山水诗境', '山河与清景', PhTree],
  ['思乡怀人', '月色寄相思', PhScroll],
  ['咏物抒怀', '托物寓志', PhFlowerLotus],
  ['边塞长歌', '壮志与豪情', PhSword],
  ['田园清音', '归隐与闲适', PhTree],
  ['咏史怀古', '风云与兴亡', PhScroll],
  ['宋词风华', '长短句里的情怀', PhFlowerLotus],
  ['名家名篇', '诗心与人生', PhMedal],
  ['名句擂台', '巅峰对决', PhFlagBanner]
]

const normalizedLevels = levelsData.slice(0, TOTAL_LEVELS).map((level, index) => {
  const poem = level.poems?.[0]
  const firstQuestion = level.questions?.[0]
  return {
    ...level,
    level: Number(level.level || index + 1),
    poemTitle: poem?.title || level.title || '未命名诗篇',
    poemAuthor: poem?.author || '佚名',
    verse: poem?.content || firstQuestion?.question || '静心读诗，感受文字里的风景。',
    goal: level.description || '理解诗句大意，掌握诗词中的意象与情感。',
    questionCount: Math.max(level.questions?.length || 0, 1),
    difficultyLabel: getDifficultyLabel(level.difficulty)
  }
})

const chapters = computed(() => chapterMetas.map(([name, description, icon], index) => {
  const start = index * 20 + 1
  const end = Math.min(start + 19, TOTAL_LEVELS)
  return { id: index + 1, index: String(index + 1).padStart(2, '0'), name, description, icon, start, end, x: [10,21,33,45,57,68,77,84,90,95][index], y: [72,54,64,45,56,39,59,31,47,28][index] }
}))

const currentChapterIndex = computed(() => Math.floor((selectedLevel.value - 1) / 20))
const currentChapter = computed(() => chapters.value[currentChapterIndex.value] || chapters.value[0])
const unlockedThrough = computed(() => Math.min(completedThrough.value + 1, TOTAL_LEVELS))
const levels = computed(() => normalizedLevels.map(level => ({ ...level, status: level.level <= completedThrough.value ? 'done' : level.level <= unlockedThrough.value ? 'current' : 'locked', stars: level.level <= completedThrough.value ? 3 : 0 })))
const currentLevel = computed(() => levels.value.find(level => level.level === selectedLevel.value) || levels.value[0])
const visibleLevels = computed(() => levels.value.slice(currentChapter.value.start - 1, currentChapter.value.end))
const nextPlayableLevel = computed(() => levels.value.find(level => level.level === unlockedThrough.value))
const totalStars = computed(() => levels.value.reduce((total, level) => total + level.stars, 0))
const summary = computed(() => [
  { label: '已解锁关卡', value: unlockedThrough.value, suffix: '/ 200', icon: PhFlagBanner, tone: 'green' },
  { label: '当前段位', value: getRankName(completedThrough.value), suffix: '', icon: PhMedal, tone: 'gold' },
  { label: '本章进度', value: visibleLevels.value.filter(level => level.status === 'done').length, suffix: `/ ${visibleLevels.value.length} 关`, icon: PhScroll, tone: 'blue' },
  { label: '连续闯关天数', value: 7, suffix: '天', icon: PhFire, tone: 'green' }
])

const leaderboard = [{ name: '墨染清风', score: 1280 }, { name: '书山有路', score: 1160 }, { name: '云中客', score: 1040 }]
const rewards = [{ threshold: 5, icon: PhMedal }, { threshold: 15, icon: PhScroll }, { threshold: 30, icon: PhFlowerLotus }, { threshold: 50, icon: PhBookOpenText }]

function readStoredProgress() {
  const value = Number(localStorage.getItem('challengeHighestLevel'))
  return Number.isInteger(value) && value >= 0 ? Math.min(value, TOTAL_LEVELS) : 12
}
function getDifficultyLabel(difficulty) { return ({ easy: '启蒙', medium: '进阶', hard: '挑战', challenge: '擂台' })[difficulty] || '进阶' }
function getRankName(level) { return level >= 160 ? '青云大士' : level >= 80 ? '金榜学士' : level >= 30 ? '砚田秀才' : '青竹学士' }
function selectChapter(index) {
  const chapter = chapters.value[index]
  const firstAvailable = levels.value.slice(chapter.start - 1, chapter.end).find(level => level.status !== 'locked')
  selectedLevel.value = firstAvailable?.level || chapter.start
  jumpLevel.value = selectedLevel.value
  if (!firstAvailable) showToast(`第 ${chapter.start} 关起的诗境尚未解锁`)
}
function selectLevel(level) {
  if (level.status === 'locked') return showToast(`第 ${level.level} 关尚未解锁，先完成第 ${level.level - 1} 关吧`)
  selectedLevel.value = level.level
  jumpLevel.value = level.level
}
function jumpToLevel() {
  const value = Math.min(Math.max(Number(jumpLevel.value) || 1, 1), TOTAL_LEVELS)
  jumpLevel.value = value
  selectedLevel.value = value
  if (value > unlockedThrough.value) showToast(`第 ${value} 关尚未解锁，当前可挑战第 ${unlockedThrough.value} 关`)
}
function startSelected() {
  if (currentLevel.value.status !== 'locked') router.push({ name: 'ChallengeLevel', params: { level: currentLevel.value.level } })
}
function continueLast() {
  if (!nextPlayableLevel.value) return
  selectedLevel.value = nextPlayableLevel.value.level
  jumpLevel.value = selectedLevel.value
  startSelected()
}
async function loadProgress() {
  try {
    const response = await api.challenge.getProgress()
    const remoteProgress = Number(response?.data?.highest_level ?? response?.highest_level)
    if (Number.isInteger(remoteProgress) && remoteProgress >= 0) {
      completedThrough.value = Math.min(remoteProgress, TOTAL_LEVELS)
      selectedLevel.value = Math.min(completedThrough.value + 1, TOTAL_LEVELS)
      jumpLevel.value = selectedLevel.value
      localStorage.setItem('challengeHighestLevel', String(completedThrough.value))
    }
  } catch { /* 离线或演示模式沿用本地进度 */ }
}
function showToast(message) { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = '' }, 2800) }
onMounted(loadProgress)
</script>

<style scoped>
.challenge-map-page { --ink:#234f49; --jade:#238f7c; min-height:calc(100dvh - 84px); padding:28px clamp(22px,3.2vw,56px) 42px; overflow:hidden; color:var(--ink); font-family:'Noto Sans SC','Microsoft YaHei',sans-serif; background:linear-gradient(180deg,rgba(248,250,246,.82),rgba(239,247,242,.92)),url('../assets/jade-paper-ambient.png') center top/cover; }
.challenge-map-page * { box-sizing:border-box; } button,a { -webkit-tap-highlight-color:transparent; }
.eyebrow { display:block; margin-bottom:6px; color:#84a399; font-size:9px; letter-spacing:.18em; }
.challenge-head { display:grid; grid-template-columns:minmax(250px,.72fr) minmax(500px,1.32fr) minmax(380px,.84fr); align-items:center; gap:24px; width:min(100%,1580px); margin:0 auto 26px; }
.title-block { display:flex; align-items:center; gap:17px; }.title-rule { width:4px; height:56px; border-radius:4px; background:linear-gradient(180deg,#237e70,#a8c9bd); }.title-block h1 { margin:0 0 5px; color:var(--ink)!important; font:600 clamp(26px,2.1vw,36px)/1.1 'Noto Serif SC','Songti SC',serif; letter-spacing:.08em; }.title-block p { margin:0; color:#7f938d; font-size:12px; letter-spacing:.04em; }
.progress-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); min-height:70px; padding:12px 16px; border:1px solid rgba(89,134,123,.15); border-radius:17px; background:rgba(255,255,255,.68); box-shadow:0 9px 26px rgba(49,91,80,.05),inset 0 1px 0 rgba(255,255,255,.9); backdrop-filter:blur(10px); }.summary-item { display:flex; align-items:center; gap:10px; min-width:0; padding:0 10px; border-right:1px solid rgba(57,103,91,.09); }.summary-item:last-child { border-right:0; }.summary-icon { display:grid; place-items:center; flex:0 0 34px; width:34px; height:34px; border-radius:50%; }.summary-icon.green { color:#298e78; background:#e8f4ed; }.summary-icon.gold { color:#b9802f; background:#f7edd7; }.summary-icon.blue { color:#3e8e86; background:#e4f2f1; }.summary-item small { display:block; overflow:hidden; margin-bottom:2px; color:#879992; font-size:9px; white-space:nowrap; }.summary-item strong { display:block; overflow:hidden; color:#2b6860; font:600 16px 'Noto Serif SC',serif; text-overflow:ellipsis; white-space:nowrap; }.summary-item em { color:#8fa099; font:normal 10px 'Noto Sans SC',sans-serif; }
.challenge-tools { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }.challenge-tools a { display:flex; align-items:center; justify-content:center; gap:6px; min-height:48px; padding:0 8px; border:1px solid rgba(101,142,130,.1); border-radius:12px; color:#477a70; background:rgba(255,255,255,.58); text-decoration:none; font-size:12px; white-space:nowrap; transition:.22s ease; }.challenge-tools a:hover { border-color:rgba(48,145,124,.28); color:#176f61; background:rgba(244,251,247,.95); transform:translateY(-2px); }
.challenge-stage { display:grid; grid-template-columns:minmax(0,1fr) clamp(350px,27vw,430px); width:min(100%,1580px); min-height:552px; margin:0 auto; border:1px solid rgba(96,139,128,.18); border-radius:28px; background:rgba(245,248,242,.58); box-shadow:0 22px 58px rgba(42,84,73,.1); }.map-panel { position:relative; min-height:552px; overflow:hidden; border-radius:27px 0 0 27px; isolation:isolate; background:#dcebe1; user-select:none; }.map-art { position:absolute; inset:0; z-index:-3; width:100%; height:100%; object-fit:cover; object-position:50% 50%; filter:saturate(.9) contrast(.94) brightness(1.04); pointer-events:none; }.map-wash { position:absolute; inset:0; z-index:-2; pointer-events:none; background:linear-gradient(90deg,rgba(244,248,238,.1),rgba(255,250,238,.08) 60%,rgba(245,248,241,.45)),linear-gradient(180deg,rgba(255,255,255,.22),transparent 35%,rgba(248,244,225,.06)); }
.map-copy { position:absolute; top:30px; left:34px; z-index:2; padding:14px 17px; border-left:3px solid rgba(35,126,112,.68); border-radius:0 12px 12px 0; background:rgba(255,255,250,.64); backdrop-filter:blur(8px); }.map-copy span { color:#6e9085; font-size:10px; }.map-copy h2 { margin:4px 0 3px; color:#285e56; font:600 24px 'Noto Serif SC',serif; }.map-copy p { margin:0; color:#759087; font-size:11px; }
.chapter-stops { position:absolute; inset:0; z-index:3; }.chapter-stop { position:absolute; top:var(--stop-y); left:var(--stop-x); display:grid; justify-items:center; width:96px; padding:0; border:0; color:#416e64; background:transparent; cursor:pointer; transform:translate(-50%,-50%); transition:transform .2s ease; }.chapter-stop:hover,.chapter-stop.active { transform:translate(-50%,-50%) translateY(-4px); }.stop-orbit { display:grid; place-items:center; width:52px; height:52px; border:4px solid rgba(255,255,255,.87); border-radius:50%; color:#fff; background:linear-gradient(145deg,#68ae96,#2b8b75); box-shadow:0 0 0 1px rgba(47,127,104,.18),0 10px 22px rgba(35,88,71,.18); }.chapter-stop.active .stop-orbit { color:#9d6f2b; background:linear-gradient(145deg,#fff5cf,#e5bc61); box-shadow:0 0 0 8px rgba(255,246,196,.34),0 12px 28px rgba(94,78,34,.18); }.chapter-stop.locked .stop-orbit { color:#9d9d96; background:linear-gradient(145deg,#f0eee8,#cfcac0); }.chapter-stop strong { margin-top:7px; padding:4px 9px; border:1px solid rgba(255,255,255,.72); border-radius:8px; color:#54736a; background:rgba(250,249,240,.84); font:500 10px 'Noto Serif SC',serif; white-space:nowrap; }.chapter-stop small { margin-top:3px; color:#758b82; font-size:8px; }.map-route { position:absolute; right:9%; bottom:15%; left:12%; z-index:1; display:flex; align-items:center; justify-content:space-between; }.map-route::before { content:''; position:absolute; right:20px; left:20px; height:4px; border-radius:4px; background:rgba(255,255,255,.75); }.map-route span { position:relative; z-index:1; width:14px; height:14px; border:3px solid rgba(255,255,255,.82); border-radius:50%; background:#d3ded4; }.map-route span.active { background:#36947e; }.map-legend { position:absolute; right:24px; bottom:20px; z-index:4; display:flex; gap:12px; padding:8px 11px; border-radius:9px; color:#71867d; background:rgba(255,255,250,.7); font-size:9px; backdrop-filter:blur(7px); }.map-legend span { display:flex; align-items:center; gap:4px; }.legend-dot { width:7px; height:7px; border-radius:50%; background:#d3ded4; }.legend-dot.done { background:#4aa084; }.legend-dot.current { background:#d4a548; }
.quest-card { position:relative; z-index:6; display:flex; flex-direction:column; min-height:552px; overflow:hidden; border-left:1px solid rgba(87,132,119,.15); border-radius:0 27px 27px 0; background:rgba(252,253,249,.91); box-shadow:-14px 0 34px rgba(64,99,87,.07); backdrop-filter:blur(13px); }.quest-landscape { position:relative; display:flex; align-items:center; justify-content:space-between; min-height:125px; padding:23px 25px; overflow:hidden; border-bottom:1px solid rgba(95,135,123,.14); background:linear-gradient(90deg,rgba(252,253,249,.94),rgba(243,248,240,.7)),url('../assets/challenge-map-landscape.png') 87% 7%/160% auto; }.quest-landscape::after { content:''; position:absolute; inset:0; pointer-events:none; background:linear-gradient(90deg,rgba(252,253,249,.98) 18%,rgba(252,253,249,.42) 66%,rgba(255,250,223,.05)); }.quest-landscape > * { position:relative; z-index:1; }.quest-landscape small { display:block; margin-bottom:5px; color:#81948e; font-size:10px; }.quest-landscape h2 { margin:0 0 7px; color:var(--ink)!important; font:600 24px/1.2 'Noto Serif SC',serif; letter-spacing:.03em; }.quest-landscape div > span { display:inline-flex; max-width:215px; overflow:hidden; padding:3px 9px; border-radius:7px; color:#368775; background:#e4f2eb; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }.moon-number { display:grid; place-items:center; width:62px; height:62px; border-radius:50%; color:#a1702b; background:radial-gradient(circle at 36% 34%,#fff6c4,#f5d77f); box-shadow:0 0 0 9px rgba(255,237,167,.16); font:500 23px 'Noto Serif SC',serif; }.quest-section { padding-right:25px; padding-left:25px; }.mission-copy { padding-top:18px; }.mission-copy strong,.verse-box > strong,.quest-progress strong { color:#317767; font-size:11px; }.mission-copy p { margin:7px 0 0; color:#6f837d; font-size:11px; line-height:1.7; }.verse-box { margin:16px 25px 0; padding:13px 15px 12px; border:1px solid rgba(198,157,88,.27); border-radius:11px; background:linear-gradient(135deg,rgba(255,252,241,.9),rgba(251,248,235,.58)); }.verse-box blockquote { margin:8px 0 5px; color:#8f6631; font:500 14px/1.8 'Noto Serif SC',serif; }.verse-box cite { color:#a98b5e; font-size:9px; font-style:normal; }.quest-progress { padding-top:17px; }.quest-progress > div:first-child { display:flex; align-items:center; justify-content:space-between; }.quest-progress > div:first-child span { color:#86968f; font-size:10px; }.progress-track { position:relative; display:flex; align-items:center; justify-content:space-between; margin-top:12px; }.progress-track::before { content:''; position:absolute; right:5px; left:5px; height:3px; border-radius:3px; background:#e3dec9; }.progress-track span { position:relative; z-index:1; width:12px; height:12px; border:2px solid #d8e2dc; border-radius:50%; background:#f7f8f3; }.progress-track span.filled { border-color:#81bea9; background:#5ba88f; }.locked-copy { display:flex; align-items:center; gap:14px; margin:auto 25px; padding:22px; border:1px solid rgba(94,132,121,.15); border-radius:15px; color:#71867f; background:rgba(242,246,241,.7); }.locked-copy > span { display:grid; place-items:center; width:48px; height:48px; border-radius:50%; color:#7c918a; background:#e4ebe6; }.locked-copy strong { color:#57766d; font-size:13px; }.locked-copy p { margin:5px 0 0; color:#899993; font-size:10px; }.quest-actions { display:grid; gap:10px; margin-top:auto; padding:18px 25px 23px; }.quest-actions button { min-height:43px; border-radius:10px; cursor:pointer; font-size:13px; transition:.2s ease; }.continue-button { display:flex; align-items:center; justify-content:center; gap:9px; border:0; color:#fff; background:linear-gradient(100deg,#1d846f,#2a9d87); box-shadow:0 9px 20px rgba(33,135,113,.2); }.start-button { border:1px solid rgba(36,138,117,.38); color:#278471; background:rgba(255,255,255,.55); }.quest-actions button:hover:not(:disabled) { transform:translateY(-2px); }.quest-actions button:disabled { opacity:.48; cursor:not-allowed; }
.level-browser { width:min(100%,1580px); margin:22px auto 0; padding:28px; border:1px solid rgba(93,137,124,.15); border-radius:22px; background:rgba(255,255,255,.74); box-shadow:0 15px 40px rgba(42,84,73,.06); backdrop-filter:blur(12px); }.browser-heading { display:flex; align-items:end; justify-content:space-between; gap:24px; }.browser-heading h2 { margin:0 0 5px; color:#285e56!important; font:600 25px 'Noto Serif SC',serif; }.browser-heading p { margin:0; color:#80948c; font-size:11px; }.level-jump { display:flex; align-items:center; gap:7px; color:#789087; font-size:11px; }.level-jump input { width:66px; padding:8px 7px; border:1px solid #d8e5dd; border-radius:8px; color:#2d6b60; background:#fbfdf9; text-align:center; }.level-jump button { display:grid; place-items:center; width:32px; height:32px; border:0; border-radius:8px; color:#fff; background:#268c77; cursor:pointer; }.chapter-tabs { display:grid; grid-template-columns:repeat(10,minmax(0,1fr)); gap:8px; margin-top:24px; padding-bottom:13px; border-bottom:1px solid #e3ece6; }.chapter-tabs button { display:grid; justify-items:start; gap:3px; min-height:68px; padding:10px 11px; border:1px solid #e1ebe5; border-radius:11px; color:#739087; background:rgba(249,252,248,.72); cursor:pointer; text-align:left; transition:.2s ease; }.chapter-tabs button:hover,.chapter-tabs button.active { border-color:rgba(46,145,123,.42); color:#277c6c; background:#eaf5ee; transform:translateY(-2px); }.chapter-tabs span { color:#a8b8b0; font-size:9px; letter-spacing:.12em; }.chapter-tabs strong { color:inherit; font:500 12px 'Noto Serif SC',serif; }.chapter-tabs small { font-size:9px; }.level-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; padding-top:18px; }.level-card { display:grid; grid-template-columns:34px minmax(0,1fr) auto; align-items:center; gap:9px; min-height:58px; padding:8px 10px 8px 8px; border:1px solid #e1ebe5; border-radius:11px; color:#52746a; background:rgba(252,254,250,.86); cursor:pointer; text-align:left; transition:.2s ease; }.level-card:hover,.level-card.selected { border-color:rgba(43,145,121,.52); background:#eef8f2; transform:translateY(-2px); }.level-card.is-locked { color:#abb7b0; background:rgba(244,247,243,.76); cursor:not-allowed; }.level-number { display:grid; place-items:center; width:32px; height:32px; border-radius:50%; color:#fff; background:#68ae96; font-size:11px; }.is-done .level-number { color:#377968; background:#dcefe5; }.is-current .level-number { color:#996e2e; background:#f4d580; }.is-locked .level-number { color:#aab3ac; background:#e4e9e4; }.level-info { min-width:0; }.level-info strong,.level-info small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.level-info strong { color:inherit; font:500 12px 'Noto Serif SC',serif; }.level-info small { margin-top:3px; color:#93a49d; font-size:9px; }.level-stars { display:flex; gap:1px; color:#d9c8a3; }.is-done .level-stars { color:#bf9049; }
.challenge-dock { display:grid; grid-template-columns:1.05fr 1.15fr .9fr; width:min(100%,1480px); min-height:138px; margin:22px auto 0; border:1px solid rgba(93,137,124,.15); border-radius:18px; background:rgba(255,255,255,.74); box-shadow:0 15px 40px rgba(42,84,73,.06); backdrop-filter:blur(12px); }.challenge-dock article { padding:18px 24px; border-right:1px solid rgba(90,133,121,.13); }.challenge-dock article:last-child { border-right:0; }.dock-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }.dock-heading > strong { display:flex; align-items:center; gap:6px; color:#386e63; font-size:12px; }.dock-heading a { color:#569284; font-size:9px; text-decoration:none; }.dock-heading > span { display:flex; align-items:center; gap:3px; color:#85978f; font-size:9px; }.dock-heading b { color:#a77932; font-size:13px; }.friend-row { display:flex; align-items:center; gap:24px; margin-top:15px; }.friend-item { position:relative; display:grid; grid-template-columns:36px auto; align-items:center; gap:8px; }.rank-badge { position:absolute; top:-6px; left:-5px; z-index:1; display:grid; place-items:center; width:18px; height:18px; border-radius:50%; color:#fff; background:#bf8a37; font-size:9px; }.friend-seal { display:grid; place-items:center; width:36px; height:36px; border:2px solid #fff; border-radius:50%; color:#f1e4be; background:#436d63; font:500 14px 'Noto Serif SC',serif; }.seal-2 { color:#edf2dd; background:#668677; }.seal-3 { color:#f2dfd0; background:#82665d; }.friend-item div strong,.friend-item div small { display:block; white-space:nowrap; }.friend-item div strong { color:#5d756e; font-size:10px; }.friend-item div small { margin-top:2px; color:#92a099; font-size:9px; }.reward-road { position:relative; display:flex; justify-content:space-between; margin-top:18px; }.reward-road::before { content:''; position:absolute; top:20px; right:10%; left:10%; border-top:2px dotted #cbdcd4; }.reward-item { position:relative; z-index:1; display:grid; justify-items:center; gap:4px; color:#8a9d95; }.reward-item > span { display:grid; place-items:center; width:40px; height:40px; border:1px solid #d7dfda; border-radius:50%; color:#8fa199; background:#f4f6f2; }.reward-item.claimed > span { color:#b37e30; border-color:#e7ca91; background:#fbf1db; }.reward-item small { font-size:8px; }.tip-block { display:flex; align-items:center; gap:15px; background:linear-gradient(115deg,rgba(250,252,248,.74),rgba(231,242,236,.68)); }.tip-block > svg { flex:0 0 auto; color:#84a69a; }.tip-block strong { color:#58736b; font-size:11px; }.tip-block p { margin:7px 0 0; color:#81928b; font:11px/1.75 'Noto Serif SC',serif; }
.toast-message { position:fixed; z-index:80; left:50%; bottom:32px; padding:11px 18px; border:1px solid rgba(255,255,255,.55); border-radius:10px; color:#fff; background:rgba(26,83,72,.92); box-shadow:0 12px 30px rgba(25,76,66,.22); transform:translateX(-50%); font-size:12px; }.toast-enter-active,.toast-leave-active { transition:.22s ease; }.toast-enter-from,.toast-leave-to { opacity:0; transform:translate(-50%,8px); }
@media (max-width:1320px) { .challenge-head { grid-template-columns:minmax(230px,.6fr) minmax(500px,1fr); }.challenge-tools { grid-column:1 / -1; justify-self:end; width:min(620px,100%); }.challenge-stage { grid-template-columns:minmax(0,1fr) 370px; }.chapter-tabs { grid-template-columns:repeat(5,minmax(0,1fr)); }.friend-row { gap:14px; } }
@media (max-width:980px) { .challenge-map-page { padding-right:20px; padding-left:20px; }.challenge-head { grid-template-columns:1fr; }.progress-summary { order:3; }.challenge-tools { grid-column:auto; justify-self:stretch; width:100%; }.challenge-stage { grid-template-columns:1fr; }.map-panel { min-height:570px; border-radius:27px 27px 0 0; }.quest-card { min-height:auto; border-top:1px solid rgba(87,132,119,.15); border-left:0; border-radius:0 0 27px 27px; }.quest-actions { margin-top:12px; }.level-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }.challenge-dock { grid-template-columns:1fr 1fr; }.tip-block { grid-column:1 / -1; border-top:1px solid rgba(90,133,121,.13); } }
@media (max-width:680px) { .challenge-map-page { padding:20px 12px 30px; }.title-block h1 { font-size:28px; }.progress-summary { grid-template-columns:repeat(2,1fr); gap:10px 0; }.summary-item:nth-child(2) { border-right:0; }.challenge-tools { grid-template-columns:repeat(2,1fr); }.map-panel { min-height:520px; }.map-copy { top:20px; left:20px; }.chapter-stop { transform:translate(-50%,-50%) scale(.84); }.chapter-stop:hover,.chapter-stop.active { transform:translate(-50%,-50%) translateY(-4px) scale(.84); }.map-legend { right:12px; bottom:12px; }.quest-landscape { padding:20px 18px; }.quest-landscape h2 { font-size:21px; }.quest-section { padding-right:18px; padding-left:18px; }.verse-box { margin-right:18px; margin-left:18px; }.quest-actions { padding-right:18px; padding-left:18px; }.browser-heading { display:block; }.level-jump { margin-top:16px; }.level-browser { padding:20px 14px; }.chapter-tabs { grid-template-columns:repeat(2,minmax(0,1fr)); }.level-grid { grid-template-columns:1fr; }.challenge-dock { grid-template-columns:1fr; }.challenge-dock article { border-right:0; border-bottom:1px solid rgba(90,133,121,.13); }.challenge-dock article:last-child { border-bottom:0; }.tip-block { grid-column:auto; } }
@media (prefers-reduced-motion:reduce) { *,*::before,*::after { scroll-behavior:auto!important; transition-duration:.001ms!important; animation-duration:.001ms!important; } }
</style>

<style>
#app.challenge-shell main.container { min-height:calc(100dvh - 84px); padding:0!important; }
#app.challenge-shell main.container > .challenge-map-page { width:100%; max-width:none!important; margin:0!important; border:0!important; border-radius:0!important; background-color:#f2f7f2!important; box-shadow:none!important; backdrop-filter:none!important; }
#app.challenge-shell main.container > .challenge-map-page::before { display:none!important; }
#app.challenge-shell::before { display:none; }
#app.challenge-shell .dynamic-elements { opacity:.28; }
</style>
