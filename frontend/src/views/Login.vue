<template>
  <main class="login-page" :class="{ 'is-ready': isReady, 'is-success': isSuccess }">
    <div class="scene-backdrop" aria-hidden="true">
      <div class="scene-image"></div>
      <div class="scene-wash"></div>
      <div class="scene-mist scene-mist-one"></div>
      <div class="scene-mist scene-mist-two"></div>
      <div class="scene-sun"></div>
      <div class="water-ripple ripple-one"></div>
      <div class="water-ripple ripple-two"></div>
      <div class="ink-speck speck-one">山</div>
      <div class="ink-speck speck-two">远</div>
    </div>

    <div class="petals" aria-hidden="true">
      <i class="petal petal-one"></i>
      <i class="petal petal-two"></i>
      <i class="petal petal-three"></i>
      <i class="petal petal-four"></i>
      <i class="petal petal-five"></i>
    </div>

    <header class="brand-lockup">
      <div class="brand-seal" aria-hidden="true"><span>智</span></div>
      <div>
        <div class="brand-title">《智韵 · 灵犀》</div>
        <div class="brand-note">基于大模型认知引导与多维行为分析的智能古诗词学习系统</div>
      </div>
    </header>

    <div class="scene-mark" aria-label="页面主题">
      <span class="scene-mark-dot"></span>
      <span>在诗句里，遇见更好的自己</span>
    </div>

    <section class="login-shell">
      <div class="book-column">
        <div class="book-caption">
          <span class="caption-kicker">A POETRY JOURNEY</span>
          <span class="caption-line"></span>
          <span class="caption-hint">点击诗集，继续读下一页</span>
        </div>

        <button
          class="book-stage"
          :class="{ 'is-turning': isTurning }"
          type="button"
          aria-label="翻到下一页"
          :aria-busy="isTurning"
          @click="turnPage"
        >
          <span class="book-shadow"></span>
          <span class="book-cover book-cover-back"></span>
          <span class="book-pages page-stack page-stack-left"></span>
          <span class="book-pages page-stack page-stack-right"></span>
          <span class="book-spine"></span>

          <span class="open-book">
            <span class="book-page page-left">
              <span class="page-paper-texture"></span>
              <span class="page-image landscape-page-image"></span>
              <span class="page-vignette"></span>
              <span class="page-number">{{ leftPageNumber }}</span>
              <span class="page-side-note">{{ leftPagePoem.sideNote }}</span>
              <span class="page-poem page-poem-left">
                <b :class="{ 'is-long-poem-title': leftPagePoem.title.length > 8 }">{{ leftPagePoem.title }}</b>
                <span v-for="line in leftPagePoem.lines" :key="line">{{ line }}</span>
                <small>{{ leftPagePoem.byline }}</small>
              </span>
            </span>

            <span class="book-page page-right">
              <span class="page-paper-texture"></span>
              <span class="page-branch" aria-hidden="true"></span>
              <span class="page-moon" aria-hidden="true"></span>
              <span class="page-number">{{ rightPageNumber }}</span>
              <span class="page-kicker">今日荐读 · {{ rightPagePoem.credit.split('·')[0] }}</span>
              <span class="page-poem page-poem-right">
                <b>{{ rightPagePoem.line }}</b>
                <small>{{ rightPagePoem.credit }}</small>
              </span>
              <span class="page-seal">灵犀</span>
            </span>

            <span
              v-if="activeTurn"
              :key="activeTurn.id"
              class="turning-page"
              :class="{ 'is-turning': isTurning }"
              aria-hidden="true"
              @animationend="handleTurnAnimationEnd"
            >
              <span class="turn-face turn-front">
                <span class="page-paper-texture"></span>
                <span class="page-branch" aria-hidden="true"></span>
                <span class="page-moon" aria-hidden="true"></span>
                <span class="page-number">{{ activeTurn.fromPageNumber }}</span>
                <span class="page-kicker">今日荐读 · {{ turnFromPoem.credit.split('·')[0] }}</span>
                <span class="page-poem page-poem-right">
                  <b>{{ turnFromPoem.line }}</b>
                  <small>{{ turnFromPoem.credit }}</small>
                </span>
                <span class="page-seal">灵犀</span>
              </span>
              <span class="turn-face turn-back">
                <span class="page-paper-texture"></span>
                <span class="page-image landscape-page-image"></span>
                <span class="page-vignette"></span>
                <span class="page-number">{{ activeTurn.fromPageNumber }}</span>
                <span class="page-side-note">{{ turnFromPoem.sideNote }}</span>
                <span class="page-poem page-poem-left turn-back-poem">
                  <b :class="{ 'is-long-poem-title': turnFromPoem.title.length > 8 }">{{ turnFromPoem.title }}</b>
                  <span v-for="line in turnFromPoem.lines" :key="line">{{ line }}</span>
                  <small>{{ turnFromPoem.byline }}</small>
                </span>
              </span>
            </span>
          </span>
        </button>

        <div class="book-footer">
          <span>卷一 · 山水与心</span>
          <span class="footer-rule"></span>
          <span>阅至 {{ String(pageIndex + 1).padStart(2, '0') }} / {{ String(BOOK_PAGE_COUNT).padStart(2, '0') }}</span>
        </div>
      </div>

      <aside class="login-panel" aria-label="登录面板">
        <div class="panel-glow"></div>
        <div class="login-panel-inner">
          <div class="panel-emblem" aria-hidden="true"><span>叶</span></div>
          <div class="panel-heading">
            <span class="eyebrow">WELCOME BACK</span>
            <h1>欢迎回来</h1>
            <p>开启您的诗意学习之旅</p>
          </div>

          <form class="login-form" @submit.prevent="handleLogin">
            <label class="field" :class="{ 'is-focused': focusedField === 'username', 'has-value': form.username }">
              <span class="field-mark">人</span>
              <span class="field-content">
                <span class="field-label">用户名 / 手机号 / 邮箱</span>
                <input
                  id="username"
                  v-model="form.username"
                  type="text"
                  autocomplete="username"
                  placeholder="请输入登录信息"
                  required
                  @focus="focusedField = 'username'"
                  @blur="focusedField = ''"
                >
              </span>
            </label>

            <label class="field" :class="{ 'is-focused': focusedField === 'password', 'has-value': form.password }">
              <span class="field-mark">锁</span>
              <span class="field-content">
                <span class="field-label">登录密码</span>
                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="请输入密码"
                  required
                  @focus="focusedField = 'password'"
                  @blur="focusedField = ''"
                >
              </span>
              <button class="password-toggle" type="button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword">
                {{ showPassword ? '隐' : '显' }}
              </button>
            </label>

            <div class="form-meta">
              <label class="remember-check">
                <input v-model="rememberMe" type="checkbox">
                <span class="check-box"></span>
                <span>记住我</span>
              </label>
              <button type="button" class="text-link" @click="showNotice('密码找回功能即将开放')">忘记密码？</button>
            </div>

            <transition name="ink-error">
              <p v-if="error" class="error-note" role="alert"><span>!</span>{{ error }}</p>
            </transition>

            <button class="login-button" :class="{ 'is-loading': loading }" type="submit" :disabled="loading">
              <span class="ink-sweep"></span>
              <span>{{ loading ? '正在入卷…' : '登 录' }}</span>
              <span class="button-arrow">→</span>
            </button>

            <button class="demo-button" type="button" :disabled="loading" @click="handleTestLogin">使用体验账号进入</button>
          </form>

          <p class="register-note">还没有账号？ <router-link to="/register">立即注册</router-link></p>
          <p v-if="notice" class="notice-line" aria-live="polite">{{ notice }}</p>
        </div>
      </aside>
    </section>

    <footer class="login-footer">© 2024 智韵 · 灵犀 <span></span> 让诗词学习更有温度</footer>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { LOGIN_POEMS } from '../data/loginPoems.js'
import { request } from '../services/api.js'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const notice = ref('')
const focusedField = ref('')
const showPassword = ref(false)
const rememberMe = ref(true)
const isReady = ref(false)
const isSuccess = ref(false)
const isReducedMotion = ref(false)
const pageIndex = ref(0)
const autoTurnTimer = ref(null)
const turnTimeout = ref(null)
const noticeTimer = ref(null)
const activeTurn = ref(null)
let readyTimer = null
let turnId = 0

function createBookPage(poem, sideNote = '诗心有回响') {
  const titleMatch = poem.credit.match(/《([^》]+)》/)
  const author = poem.credit.replace(/\s*·\s*《[^》]+》/, '')
  return {
    ...poem,
    title: titleMatch?.[1] || '诗笺',
    lines: poem.line.match(/[^，。！？；]+[，。！？；]?/gu) || [poem.line],
    byline: poem.dynasty ? `${author} · ${poem.dynasty}` : author,
    sideNote
  }
}

const INTRO_BOOK_PAGE = {
  title: '山行',
  line: '远上寒山石径斜，白云生处有人家。',
  lines: ['远上寒山石径斜，', '白云生处有人家。'],
  credit: '杜牧 · 唐',
  byline: '杜牧 · 唐',
  sideNote: '山水有清音'
}
const BOOK_PAGES = Object.freeze([
  INTRO_BOOK_PAGE,
  ...LOGIN_POEMS.map(poem => createBookPage(poem, poem.sideNote))
])
const BOOK_PAGE_COUNT = BOOK_PAGES.length
const PAGE_TURN_FALLBACK_MS = 1500
const AUTO_TURN_DELAY_MS = 6800
const form = ref({ username: '', password: '' })
const isTurning = computed(() => activeTurn.value !== null)
const leftPagePoem = computed(() => BOOK_PAGES[pageIndex.value % BOOK_PAGE_COUNT])
const currentPoem = computed(() => BOOK_PAGES[(pageIndex.value + 1) % BOOK_PAGE_COUNT])
const nextPoem = computed(() => BOOK_PAGES[(pageIndex.value + 2) % BOOK_PAGE_COUNT])
const rightPagePoem = computed(() => activeTurn.value?.toPoem || currentPoem.value)
const turnFromPoem = computed(() => activeTurn.value?.fromPoem || currentPoem.value)
const leftPageNumber = computed(() => String(pageIndex.value + 1).padStart(2, '0'))
const rightPageNumber = computed(() => {
  const offset = activeTurn.value ? 2 : 1
  return String(((pageIndex.value + offset) % BOOK_PAGE_COUNT) + 1).padStart(2, '0')
})

function scheduleAutoTurn() {
  window.clearTimeout(autoTurnTimer.value)
  autoTurnTimer.value = null
  if (isReducedMotion.value || isSuccess.value) return
  autoTurnTimer.value = window.setTimeout(attemptAutoTurn, AUTO_TURN_DELAY_MS)
}

function attemptAutoTurn() {
  // Do not start a compositor-heavy page turn while nobody is interacting.
  // The next activity resumes the normal timer; manual clicks remain immediate.
  if (document.documentElement.classList.contains('motion-idle') || document.hidden) {
    scheduleAutoTurn()
    return
  }
  turnPage()
}

function finishPageTurn() {
  const completedTurn = activeTurn.value
  if (!completedTurn) return

  // 先提交已经冻结的目标页，再移除旋转纸页。两者在同一次 Vue 更新中完成，
  // 旋转层不会弹回右侧，也不会在落页瞬间换字。
  pageIndex.value = completedTurn.nextIndex
  activeTurn.value = null
  window.clearTimeout(turnTimeout.value)
  turnTimeout.value = null
  scheduleAutoTurn()
}

function handleTurnAnimationEnd(event) {
  if (event.target !== event.currentTarget) return
  finishPageTurn()
}

function turnPage() {
  if (activeTurn.value) return
  window.clearTimeout(autoTurnTimer.value)
  autoTurnTimer.value = null

  const nextIndex = (pageIndex.value + 1) % BOOK_PAGE_COUNT
  if (isReducedMotion.value) {
    pageIndex.value = nextIndex
    return
  }

  // 旋转纸页使用一次性快照；动画期间任何响应式更新都不会改动纸面文字。
  activeTurn.value = Object.freeze({
    id: ++turnId,
    nextIndex,
    fromPageNumber: String(((pageIndex.value + 1) % BOOK_PAGE_COUNT) + 1).padStart(2, '0'),
    fromPoem: currentPoem.value,
    toPoem: nextPoem.value
  })
  window.clearTimeout(turnTimeout.value)
  // animationend is authoritative; this only recovers if the browser drops it.
  turnTimeout.value = window.setTimeout(finishPageTurn, PAGE_TURN_FALLBACK_MS)
}

function showNotice(message) {
  notice.value = message
  window.clearTimeout(noticeTimer.value)
  noticeTimer.value = window.setTimeout(() => { notice.value = '' }, 3200)
}

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(form.value),
      includeAuth: false,
      skipAuthRedirect: true,
    })
    if (data.success) {
      localStorage.setItem('token', data.data.token)
      localStorage.setItem('user', JSON.stringify(data.data.user))
      if (rememberMe.value) localStorage.setItem('rememberLogin', 'true')
      turnPage()
      isSuccess.value = true
      await new Promise(resolve => window.setTimeout(resolve, 720))
      const redirectPath = localStorage.getItem('redirectPath')
      const targetPath = redirectPath || '/'
      if (redirectPath) localStorage.removeItem('redirectPath')
      router.push(targetPath).then(() => window.location.reload())
    } else {
      error.value = data.message || '登录失败，请检查登录信息'
    }
  } catch (err) {
    error.value = '网络未连通，请稍后再试'
    console.error('登录失败:', err)
  } finally {
    loading.value = false
  }
}

const handleTestLogin = async () => {
  form.value.username = 'Studentdemo'
  form.value.password = '123456'
  await handleLogin()
}

onMounted(() => {
  isReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  readyTimer = window.setTimeout(() => { isReady.value = true }, 120)
  scheduleAutoTurn()
})

onBeforeUnmount(() => {
  window.clearTimeout(autoTurnTimer.value)
  window.clearTimeout(turnTimeout.value)
  window.clearTimeout(readyTimer)
  window.clearTimeout(noticeTimer.value)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&display=swap');
:global(body) { overflow: hidden; }
:global(#app > .navbar),
:global(#app > .footer) { display: none !important; }
:global(#app > main.container) { max-width: none !important; padding: 0 !important; margin: 0 !important; }

.login-page {
  --ink: #193f3b; --deep-ink: #102f2d; --jade: #2e7568; --gold: #b8894c;
  position: fixed; inset: 0; z-index: 100; overflow: hidden; color: var(--ink); background: #e7ebe1;
  font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif; isolation: isolate;
}
.scene-backdrop, .scene-image, .scene-wash { position: absolute; inset: 0; pointer-events: none; }
.scene-image { background: url('../assets/poetry-workbench-scene.png') center right/cover; filter: saturate(.7) contrast(.86); opacity: .68; transform: scale(1.04); animation: landscape-drift 26s ease-in-out infinite alternate; }
.scene-wash { background: linear-gradient(90deg, rgba(243,246,235,.88), rgba(244,244,232,.55) 37%, rgba(243,246,236,.22)), linear-gradient(180deg, rgba(248,248,239,.5), rgba(229,234,220,.18)); }
.scene-sun { position: absolute; width: 180px; height: 180px; right: 16%; top: 11%; border-radius: 50%; background: rgba(216,180,106,.14); animation: sun-breathe 9s ease-in-out infinite; }
.scene-mist { position: absolute; width: 58vw; height: 130px; border-radius: 50%; background: rgba(255,255,250,.44); filter: blur(18px); opacity: .55; transform: rotate(-4deg); animation: mist-drift 18s ease-in-out infinite alternate; }
.scene-mist-one { left: -12%; bottom: 20%; } .scene-mist-two { right: -16%; top: 35%; animation-delay: -7s; animation-duration: 23s; }
.water-ripple { position: absolute; width: 260px; height: 26px; border-top: 1px solid rgba(42,91,83,.2); border-radius: 50%; opacity: .42; animation: ripple 7s ease-in-out infinite; }
.ripple-one { left: 10%; bottom: 17%; } .ripple-two { right: 34%; bottom: 11%; animation-delay: -3.4s; transform: scale(.7); }
.ink-speck { position: absolute; color: rgba(34,79,70,.12); font: 500 34px 'Noto Serif SC',serif; writing-mode: vertical-rl; animation: ink-float 12s ease-in-out infinite; }
.speck-one { left: 5%; top: 33%; } .speck-two { right: 7%; top: 52%; animation-delay: -6s; }
.petals { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
.petal { position: absolute; width: 13px; height: 8px; border-radius: 90% 10% 90% 10%; background: #d88e7f; opacity: .56; animation: petal-fall 14s linear infinite; }
.petal-one { left: 36%; top: -4%; animation-delay: -2s; } .petal-two { left: 54%; top: 13%; transform: scale(.7); animation-delay: -8s; animation-duration: 18s; }
.petal-three { right: 17%; top: -3%; transform: scale(.62) rotate(30deg); animation-delay: -11s; animation-duration: 16s; }
.petal-four { left: 66%; top: 47%; transform: scale(.55); animation-delay: -5s; animation-duration: 19s; } .petal-five { left: 9%; top: 67%; transform: scale(.45); animation-delay: -13s; animation-duration: 15s; }

.brand-lockup { position: absolute; z-index: 4; top: 27px; left: 44px; display: flex; align-items: center; gap: 14px; animation: reveal-up .8s .25s both; }
.brand-seal, .panel-emblem { display: grid; place-items: center; border: 1px solid var(--gold); border-radius: 50%; color: #f5edda; background: var(--jade); box-shadow: inset 0 0 0 5px rgba(247,239,214,.14), 0 0 0 4px rgba(248,242,224,.7); font: 600 25px 'Noto Serif SC',serif; }
.brand-seal { width: 50px; height: 50px; } .brand-title { color: var(--deep-ink); font: 600 24px/1.15 'Noto Serif SC',serif; letter-spacing: .14em; }
.brand-note { margin-top: 7px; color: rgba(25,63,59,.62); font-size: 11px; letter-spacing: .05em; }
.scene-mark { position: absolute; z-index: 4; top: 35px; right: 44px; display: flex; align-items: center; gap: 9px; color: rgba(25,63,59,.66); font: 12px 'Noto Serif SC',serif; letter-spacing: .1em; }
.scene-mark-dot { width: 8px; height: 8px; border: 1px solid var(--gold); border-radius: 50%; background: rgba(46,117,104,.65); box-shadow: 0 0 0 4px rgba(184,137,76,.12); }

.login-shell { position: relative; z-index: 3; display: grid; grid-template-columns: minmax(520px,1fr) 386px; align-items: center; gap: clamp(44px,6vw,104px); width: min(1240px,calc(100vw - 88px)); height: min(690px,calc(100vh - 148px)); margin: 80px auto 52px; }
.book-column { min-width: 0; animation: reveal-up .9s .42s both; }
.book-caption { display: flex; align-items: center; gap: 11px; margin: 0 0 14px 3%; color: rgba(25,63,59,.6); font-size: 10px; letter-spacing: .16em; }
.caption-kicker { font-weight: 600; } .caption-line { width: 42px; height: 1px; background: rgba(184,137,76,.6); } .caption-hint { color: rgba(25,63,59,.4); font-family: 'Noto Serif SC',serif; letter-spacing: .08em; }
.book-stage { position: relative; display: block; width: 100%; height: min(575px,67vh); padding: 0; border: 0; background: transparent; cursor: pointer; perspective: 2200px; transform-style: preserve-3d; }
.book-stage:focus-visible { outline: 2px solid rgba(184,137,76,.8); outline-offset: 8px; border-radius: 16px; }
.book-shadow { position: absolute; z-index: -2; left: 7%; right: 5%; bottom: 2%; height: 13%; border-radius: 50%; background: rgba(19,47,42,.24); filter: blur(16px); transform: rotate(-2deg); }
.book-cover { position: absolute; left: 7%; right: 5%; bottom: 5%; height: 82%; border-radius: 8px 10px 16px 17px; background: linear-gradient(90deg,#204c46,#476e62 45%,#204c46); box-shadow: 0 14px 18px rgba(25,53,45,.2); transform: rotate(-1deg); }
.book-cover-back { bottom: 6%; transform: rotate(-1.4deg) translate(-7px,2px); opacity: .8; }
.book-pages { position: absolute; z-index: 0; bottom: 7%; height: 80%; width: 42%; background: repeating-linear-gradient(0deg,#e5d5b8 0 2px,#f3e9d3 2px 4px); box-shadow: 0 9px 12px rgba(64,57,39,.18); }
.page-stack-left { left: 8%; border-radius: 9px 0 0 9px; transform: skewY(1.8deg) rotate(-1deg); } .page-stack-right { right: 6%; border-radius: 0 9px 9px 0; transform: skewY(-1deg) rotate(-1deg); }
.book-spine { position: absolute; z-index: 4; left: 49%; bottom: 6%; width: 22px; height: 82%; transform: translateX(-50%) rotate(-1deg); border-radius: 50%; background: linear-gradient(90deg,rgba(85,62,39,.1),rgba(114,82,42,.42),rgba(255,255,255,.32),rgba(76,54,37,.12)); box-shadow: 0 0 8px rgba(98,73,37,.2); pointer-events: none; }
.open-book { position: absolute; inset: 6% 8% 8%; z-index: 2; display: flex; transform: rotate(-1deg); transform-style: preserve-3d; }
.book-page { position: relative; width: 50%; height: 100%; overflow: hidden; background: #f5edda; box-shadow: inset 0 0 20px rgba(117,91,52,.12); }
.page-left { border-radius: 9px 0 0 8px; transform: perspective(800px) rotateY(3deg); transform-origin: right center; } .page-right { border-radius: 0 9px 8px 0; transform: perspective(800px) rotateY(-3deg); transform-origin: left center; }
.page-paper-texture { position: absolute; inset: 0; pointer-events: none; opacity: .45; background: url('../assets/jade-paper-ambient.png') center/cover; mix-blend-mode: multiply; }
.page-image { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: .82; mix-blend-mode: multiply; } .landscape-page-image { background-image: url('../assets/poetry-workbench-scene.png'); background-position: 45% 72%; filter: saturate(.55) sepia(.15); }
.page-vignette { position: absolute; inset: 0; background: linear-gradient(90deg,rgba(244,232,206,.08),rgba(244,232,206,.5)),linear-gradient(0deg,rgba(70,54,30,.16),transparent 30%); }
.page-number { position: absolute; right: 13px; bottom: 14px; color: rgba(55,76,61,.45); font: 10px 'Noto Sans SC',sans-serif; letter-spacing: .08em; }
.page-side-note { position: absolute; top: 23px; right: 17px; color: rgba(28,70,62,.5); font: 11px 'Noto Serif SC',serif; writing-mode: vertical-rl; letter-spacing: .16em; }
.page-poem { position: absolute; z-index: 1; display: flex; flex-direction: column; color: #254840; font-family: 'Noto Serif SC',serif; }
.page-poem-left { top: 24%; right: 23%; align-items: center; gap: 12px; writing-mode: vertical-rl; } .page-poem-left b { font-size: clamp(23px,2.5vw,31px); font-weight: 600; letter-spacing: .18em; } .page-poem-left span { color: rgba(37,72,64,.78); font-size: clamp(14px,1.4vw,18px); line-height: 1.9; letter-spacing: .08em; } .page-poem-left small { margin-top: 13px; color: rgba(37,72,64,.6); font-size: 11px; }
.page-poem-left b.is-long-poem-title { font-size: clamp(17px,1.85vw,23px); letter-spacing: .1em; }
.page-branch { position: absolute; right: -12%; bottom: -2%; width: 74%; height: 66%; opacity: .52; transform: rotate(-12deg); background: radial-gradient(ellipse at 24% 22%,transparent 0 29%,rgba(39,72,58,.7) 30% 31%,transparent 32%),radial-gradient(ellipse at 60% 47%,transparent 0 25%,rgba(39,72,58,.5) 26% 27%,transparent 28%); border-left: 5px solid rgba(63,58,40,.52); border-radius: 48% 10% 50% 0; }
.page-branch::after { content: ''; position: absolute; inset: 12% -7% 0 18%; background: radial-gradient(ellipse at 20% 22%,rgba(209,126,106,.75) 0 5%,transparent 6%),radial-gradient(ellipse at 49% 40%,rgba(209,126,106,.66) 0 4%,transparent 5%),radial-gradient(ellipse at 68% 62%,rgba(209,126,106,.6) 0 5%,transparent 6%); }
.page-moon { position: absolute; top: 15%; right: 22%; width: 62px; height: 62px; border-radius: 50%; background: rgba(199,154,87,.13); box-shadow: 0 0 25px rgba(199,154,87,.12); }
.page-kicker { position: absolute; top: 25px; left: 28px; color: rgba(37,72,64,.52); font: 11px 'Noto Sans SC',sans-serif; letter-spacing: .14em; }
.page-poem-right { left: 22%; top: 30%; align-items: center; gap: 14px; writing-mode: vertical-rl; } .page-poem-right b { max-height: 220px; color: var(--deep-ink); font-size: clamp(21px,2.35vw,30px); font-weight: 600; line-height: 1.7; letter-spacing: .2em; } .page-poem-right small { color: rgba(37,72,64,.58); font-size: 11px; letter-spacing: .12em; }
.page-seal { position: absolute; right: 25px; bottom: 28px; display: grid; place-items: center; width: 34px; height: 42px; color: #f7eddb; background: #b56d58; font: 12px 'Noto Serif SC',serif; writing-mode: vertical-rl; letter-spacing: .1em; }
.turning-page { position: absolute; z-index: 5; left: 50%; top: 0; width: 50%; height: 100%; transform-origin: left center; transform-style: preserve-3d; will-change: transform; pointer-events: none; isolation: isolate; }
.turning-page.is-turning { animation: book-page-turn 1.12s cubic-bezier(.64,.04,.2,1) both; }
.turn-face { position: absolute; inset: 0; overflow: hidden; backface-visibility: hidden; -webkit-backface-visibility: hidden; transform-style: preserve-3d; border-radius: 0 9px 8px 0; background: #f5edda; box-shadow: inset 0 0 20px rgba(117,91,52,.12); -webkit-font-smoothing: antialiased; }
.turn-front { transform: rotateY(0deg) translateZ(.1px); }
.turn-back { transform: rotateY(180deg) translateZ(.1px); }
.turn-face .page-kicker, .turn-face .page-poem, .turn-face .page-seal { font-synthesis: none; }
.turn-back-poem { z-index: 2; }
.book-stage:hover .open-book { transform: rotate(-1deg) translateY(-3px); transition: transform .6s ease; }
.book-footer { display: flex; align-items: center; gap: 13px; width: 86%; margin: 6px auto 0; color: rgba(25,63,59,.54); font: 11px 'Noto Serif SC',serif; letter-spacing: .08em; } .footer-rule { flex: 1; height: 1px; background: linear-gradient(90deg,rgba(184,137,76,.65),transparent); }

.login-panel { position: relative; width: 386px; min-height: 520px; padding: 17px; border: 1px solid rgba(255,255,255,.65); border-radius: 23px; background: rgba(246,247,238,.54); box-shadow: 0 30px 68px rgba(31,66,59,.18),inset 0 1px rgba(255,255,255,.8); backdrop-filter: blur(12px) saturate(112%); -webkit-backdrop-filter: blur(12px) saturate(112%); animation: reveal-up .95s .68s both; }
.panel-glow { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient(circle at 50% 0%,rgba(255,255,255,.78),transparent 33%),linear-gradient(125deg,rgba(255,255,255,.34),transparent 45%); }
.login-panel-inner { position: relative; min-height: 486px; padding: 42px 25px 23px; border: 1px solid rgba(255,255,255,.72); border-radius: 16px; background: rgba(249,249,242,.75); box-shadow: inset 0 1px rgba(255,255,255,.75); }
.panel-emblem { position: absolute; top: -31px; left: 50%; width: 58px; height: 58px; transform: translateX(-50%); font-size: 21px; }
.panel-heading { text-align: center; } .eyebrow { color: rgba(46,117,104,.66); font: 600 9px 'Noto Sans SC',sans-serif; letter-spacing: .25em; } .panel-heading h1 { margin: 9px 0 5px; color: var(--deep-ink); font: 600 28px/1.2 'Noto Serif SC',serif; letter-spacing: .13em; } .panel-heading p { color: rgba(25,63,59,.55); font: 12px 'Noto Serif SC',serif; letter-spacing: .08em; }
.login-form { display: flex; flex-direction: column; gap: 12px; margin-top: 27px; }
.field { position: relative; display: flex; align-items: center; gap: 11px; min-height: 53px; padding: 7px 13px; border: 1px solid rgba(46,117,104,.17); border-radius: 10px; background: rgba(255,255,255,.48); transition: border-color .32s ease,box-shadow .32s ease,background .32s ease; }
.field::after { content: ''; position: absolute; right: 13px; bottom: -1px; left: 13px; height: 1px; background: var(--jade); transform: scaleX(0); transform-origin: left; transition: transform .35s ease; } .field.is-focused { border-color: rgba(46,117,104,.48); background: rgba(255,255,255,.76); box-shadow: 0 5px 17px rgba(46,117,104,.08); } .field.is-focused::after { transform: scaleX(1); }
.field-mark { display: grid; place-items: center; width: 19px; height: 19px; color: rgba(46,117,104,.55); font: 12px 'Noto Serif SC',serif; } .field-content { display: flex; flex: 1; flex-direction: column; gap: 2px; min-width: 0; } .field-label { color: rgba(25,63,59,.48); font-size: 10px; letter-spacing: .08em; } .field input { width: 100%; padding: 0; border: 0; outline: 0; color: var(--deep-ink); background: transparent; font: 14px 'Noto Sans SC',sans-serif; } .field input::placeholder { color: rgba(25,63,59,.3); }
.password-toggle { padding: 5px 0 4px 7px; border: 0; color: rgba(46,117,104,.6); background: transparent; cursor: pointer; font: 11px 'Noto Sans SC',sans-serif; } .password-toggle:hover { color: var(--deep-ink); }
.form-meta { display: flex; align-items: center; justify-content: space-between; margin: 1px 1px 5px; color: rgba(25,63,59,.55); font-size: 11px; } .remember-check { position: relative; display: flex; align-items: center; gap: 7px; cursor: pointer; } .remember-check input { position: absolute; opacity: 0; } .check-box { width: 13px; height: 13px; border: 1px solid rgba(46,117,104,.3); border-radius: 3px; background: rgba(255,255,255,.55); } .remember-check input:checked + .check-box { border-color: var(--jade); background: var(--jade); box-shadow: inset 0 0 0 3px rgba(255,255,255,.8); }
.text-link { padding: 0; border: 0; color: rgba(46,117,104,.75); background: transparent; cursor: pointer; font: inherit; } .text-link:hover { color: var(--deep-ink); }
.error-note { display: flex; align-items: center; gap: 7px; margin: -2px 0 0; color: #a45142; font: 11px 'Noto Sans SC',sans-serif; } .error-note span { display: grid; place-items: center; width: 15px; height: 15px; border: 1px solid #b86a59; border-radius: 50%; font-size: 10px; }
.ink-error-enter-active, .ink-error-leave-active { transition: opacity .25s ease,transform .25s ease; } .ink-error-enter-from, .ink-error-leave-to { opacity: 0; transform: translateY(-4px); }
.login-button { position: relative; display: flex; align-items: center; justify-content: center; gap: 17px; min-height: 52px; overflow: hidden; margin-top: 1px; border: 1px solid rgba(184,137,76,.45); border-radius: 10px; color: #fffaf0; background: linear-gradient(105deg,#b77e43,#d09a5a 46%,#ae7640); box-shadow: 0 10px 20px rgba(150,101,52,.2),inset 0 1px rgba(255,255,255,.3); cursor: pointer; font: 600 16px 'Noto Serif SC',serif; letter-spacing: .22em; transition: transform .25s ease,box-shadow .25s ease; }
.ink-sweep { position: absolute; inset: 0 auto 0 -100%; width: 75%; background: linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent); transform: skewX(-20deg); transition: left .75s ease; } .login-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 26px rgba(150,101,52,.28),inset 0 1px rgba(255,255,255,.35); } .login-button:hover:not(:disabled) .ink-sweep { left: 125%; } .login-button:active:not(:disabled) { transform: translateY(1px) scale(.99); } .login-button:disabled { cursor: wait; opacity: .72; }
.button-arrow { font-family: Georgia,serif; font-size: 22px; line-height: 1; letter-spacing: 0; transition: transform .25s ease; } .login-button:hover .button-arrow { transform: translateX(4px); }
.demo-button { align-self: center; padding: 2px 0; border: 0; border-bottom: 1px solid rgba(46,117,104,.25); color: rgba(46,117,104,.56); background: transparent; cursor: pointer; font: 11px 'Noto Sans SC',sans-serif; } .demo-button:hover:not(:disabled) { color: var(--deep-ink); border-bottom-color: var(--jade); }
.register-note { margin: 18px 0 0; color: rgba(25,63,59,.5); text-align: center; font: 11px 'Noto Sans SC',sans-serif; } .register-note a { color: #a86d3b; text-decoration: none; font-weight: 600; } .register-note a:hover { text-decoration: underline; } .notice-line { min-height: 15px; margin: 7px 0 -5px; color: rgba(46,117,104,.7); text-align: center; font-size: 10px; }
.login-footer { position: absolute; z-index: 4; left: 50%; bottom: 20px; transform: translateX(-50%); color: rgba(25,63,59,.45); font: 11px 'Noto Serif SC',serif; letter-spacing: .08em; white-space: nowrap; }
.login-footer span { display: inline-block; width: 3px; height: 3px; margin: 0 9px 2px; border-radius: 50%; background: rgba(184,137,76,.7); }

.is-success .book-stage { animation: book-success .75s ease-in-out both; } .is-success .login-panel { animation: panel-success .75s ease-in-out both; }
@keyframes reveal-up { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
@keyframes book-page-turn { from { transform: perspective(800px) rotateY(-3deg) skewY(0deg); } to { transform: perspective(800px) rotateY(-177deg) skewY(-2deg); } }
@keyframes landscape-drift { from { transform: scale(1.04) translate3d(-.5%,-.3%,0); } to { transform: scale(1.08) translate3d(.7%,.4%,0); } } @keyframes mist-drift { from { transform: translate3d(-2%,0,0) rotate(-4deg); opacity: .32; } to { transform: translate3d(4%,-8px,0) rotate(-2deg); opacity: .62; } } @keyframes sun-breathe { 0%,100% { transform: scale(.96); opacity: .65; } 50% { transform: scale(1.04); opacity: 1; } } @keyframes ripple { 0%,100% { transform: scaleX(.85); opacity: .18; } 50% { transform: scaleX(1.1); opacity: .44; } } @keyframes ink-float { 0%,100% { transform: translateY(0); opacity: .6; } 50% { transform: translateY(-15px); opacity: 1; } } @keyframes petal-fall { 0% { transform: translate3d(0,-10vh,0) rotate(0); opacity: 0; } 12% { opacity: .55; } 54% { transform: translate3d(5vw,48vh,0) rotate(180deg); } 100% { transform: translate3d(-4vw,112vh,0) rotate(390deg); opacity: 0; } } @keyframes book-success { 50% { transform: scale(1.025) rotate(-.5deg); } 100% { transform: translateX(-8vw) scale(.95) rotate(-2deg); opacity: .35; } } @keyframes panel-success { to { transform: translateX(9vw); opacity: 0; } }

@media (max-width: 1120px) { .login-shell { grid-template-columns: minmax(460px,1fr) 350px; gap: 36px; width: min(1000px,calc(100vw - 56px)); } .login-panel { width: 350px; } .brand-lockup { left: 28px; } .scene-mark { right: 28px; } }
@media (max-width: 820px) {
  :global(body) { overflow: auto; } .login-page { position: relative; min-height: 100svh; overflow-y: auto; } .brand-lockup { position: relative; top: auto; left: auto; padding: 22px 22px 0; } .brand-title { font-size: 19px; } .brand-note { max-width: 240px; font-size: 9px; line-height: 1.5; } .brand-seal { width: 42px; height: 42px; font-size: 20px; } .scene-mark { display: none; }
  .login-shell { display: flex; flex-direction: column; gap: 22px; width: 100%; height: auto; margin: 22px auto 70px; padding: 0 18px; } .book-column { width: min(650px,100%); } .book-caption { margin-left: 4%; } .book-stage { height: min(390px,64vw); } .book-footer { font-size: 9px; } .login-panel { width: min(430px,100%); min-height: 0; } .login-panel-inner { min-height: 0; } .login-footer { bottom: 18px; font-size: 9px; }
}
@media (max-width: 480px) {
  .brand-lockup { padding-left: 17px; } .brand-note { display: none; } .login-shell { margin-top: 18px; padding: 0 12px; } .book-stage { height: 290px; } .page-poem-left { right: 18%; } .page-poem-left span { font-size: 11px; } .page-poem-right { left: 17%; } .page-poem-right b { font-size: 18px; } .page-side-note { display: none; } .login-panel { padding: 11px; } .login-panel-inner { padding: 38px 18px 19px; } .panel-heading h1 { font-size: 24px; } .login-footer { position: relative; bottom: auto; margin: -48px 0 22px; text-align: center; }
}
@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; } .scene-image { transform: scale(1.04); } .turning-page.is-turning { transform: rotateY(-180deg); } }
</style>
