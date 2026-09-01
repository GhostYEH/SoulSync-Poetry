<template>
  <div class="quiz-page">
    <header class="quiz-header">
      <router-link to="/challenge" class="back-link"><PhArrowLeft :size="18" />返回关卡地图</router-link>
      <div class="quiz-location"><span>第 {{ levelNumber }} 关</span><strong>{{ level?.poemTitle }}</strong></div>
      <div class="quiz-counter">题目 {{ questionIndex + 1 }} <span>/ {{ questions.length }}</span></div>
    </header>

    <main v-if="accessReady && level && !levelFinished && !levelLocked" class="quiz-layout">
      <aside class="quiz-aside">
        <div class="aside-kicker">当前诗境</div>
        <h1>{{ level.poemTitle }}</h1>
        <p class="aside-author">{{ level.poemAuthor }} · {{ level.difficultyLabel }}</p>
        <div class="poem-card">
          <span>本关诗句</span>
          <p>{{ level.poems?.[0]?.content || level.questions?.[0]?.question }}</p>
        </div>
        <div class="question-road">
          <div v-for="(item, index) in questions" :key="index" :class="['question-step', { active: index === questionIndex, done: answeredQuestions[index] }]">
            <span>{{ answeredQuestions[index] ? '✓' : index + 1 }}</span>
            <div><strong>第 {{ index + 1 }} 题</strong><small>{{ getQuestionType(item) }}</small></div>
          </div>
        </div>
        <router-link to="/challenge" class="aside-map-link"><PhMapTrifold :size="17" />查看完整关卡路径</router-link>
      </aside>

      <section class="quiz-content">
        <div class="content-heading">
          <span class="question-badge">{{ getQuestionType(currentQuestion) }}</span>
          <span class="content-hint">答题后会立即给出解析</span>
        </div>
        <h2>读一读，选出或写下正确答案</h2>
        <div class="question-panel">
          <p class="question-text">{{ currentQuestion.question }}</p>

          <div v-if="currentQuestion.options?.length" class="answer-options">
            <button
              v-for="(option, index) in currentQuestion.options"
              :key="`${option}-${index}`"
              type="button"
              :class="{ selected: answer === option, correct: submitted && option === correctAnswer, wrong: submitted && answer === option && !isCorrect }"
              :disabled="submitted"
              @click="answer = option"
            >
              <span>{{ String.fromCharCode(65 + index) }}</span>{{ option }}
              <PhCheck v-if="submitted && option === correctAnswer" :size="18" weight="bold" />
              <PhX v-else-if="submitted && answer === option && !isCorrect" :size="18" weight="bold" />
            </button>
          </div>

          <label v-else class="fill-answer">
            <span>你的答案</span>
            <input v-model="answer" :disabled="submitted" type="text" placeholder="写下诗句后提交" @keyup.enter="submitAnswer" />
          </label>

          <div v-if="submitted" class="answer-feedback" :class="isCorrect ? 'right' : 'wrong'">
            <div class="feedback-icon"><PhCheck v-if="isCorrect" :size="20" weight="bold" /><PhX v-else :size="20" weight="bold" /></div>
            <div>
              <strong>{{ isCorrect ? '答对了，诗意又向前一步。' : '再想一想，正确答案是：' + correctAnswer }}</strong>
              <p>{{ currentQuestion.analysis || '把答案放回诗句中朗读一遍，更容易记住它。' }}</p>
            </div>
          </div>
        </div>
        <p v-if="submitError" class="quiz-error" role="alert">{{ submitError }}</p>

        <div class="quiz-actions">
          <button v-if="!submitted" type="button" class="primary-action" :disabled="!answer.trim()" @click="submitAnswer">确认答案 <PhArrowRight :size="18" /></button>
          <button v-else type="button" class="primary-action" @click="goNext">{{ questionIndex === questions.length - 1 ? (allQuestionsCorrect ? '完成本关' : '重答错题') : '下一题' }} <PhArrowRight :size="18" /></button>
          <button v-if="!submitted && currentQuestion.hint" type="button" class="hint-action" @click="showHint = !showHint"><PhLightbulb :size="17" />{{ showHint ? '收起提示' : '查看提示' }}</button>
        </div>
        <div v-if="showHint && currentQuestion.hint" class="hint-box"><PhLightbulb :size="18" weight="duotone" /><span>{{ currentQuestion.hint }}</span></div>
      </section>
    </main>

    <main v-else-if="accessReady && levelLocked" class="quiz-finished">
      <div class="finish-mark"><PhLightbulb :size="38" weight="bold" /></div>
      <span class="eyebrow">LEVEL LOCKED</span>
      <h1>第 {{ levelNumber }} 关尚未解锁</h1>
      <p>请先完成第 {{ Math.max(levelNumber - 1, 1) }} 关，再继续前行。</p>
      <div class="finish-actions">
        <router-link to="/challenge" class="primary-action">返回关卡地图</router-link>
      </div>
    </main>

    <main v-else-if="accessReady && levelFinished" class="quiz-finished">
      <div class="finish-mark"><PhCheck :size="38" weight="bold" /></div>
      <span class="eyebrow">LEVEL COMPLETE</span>
      <h1>第 {{ levelNumber }} 关完成</h1>
      <p>你已经走过「{{ level?.poemTitle }}」这一处诗境，下一章的风景正在前方。</p>
      <div class="finish-actions">
        <router-link to="/challenge" class="secondary-action">返回关卡地图</router-link>
        <router-link v-if="levelNumber < 200" :to="`/challenge/level/${levelNumber + 1}`" class="primary-action">继续下一关 <PhArrowRight :size="18" /></router-link>
      </div>
    </main>

    <main v-else class="quiz-finished">
      <span class="eyebrow">LOADING LEVEL</span>
      <h1>正在打开诗境</h1>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { PhArrowLeft, PhArrowRight, PhCheck, PhLightbulb, PhMapTrifold, PhX } from '@phosphor-icons/vue'
import levelsData from '../data/poetryLevels.json'
import api from '../services/api'
import generateAttemptId from '../utils/attemptId'

const route = useRoute()
const levelNumber = computed(() => Math.min(Math.max(Number(route.params.level) || 1, 1), 200))
const level = computed(() => {
  const source = levelsData.find(item => Number(item.level) === levelNumber.value) || levelsData[0]
  const poem = source.poems?.[0]
  return { ...source, poemTitle: poem?.title || source.title, poemAuthor: poem?.author || '佚名', difficultyLabel: getDifficultyLabel(source.difficulty) }
})
const questions = computed(() => level.value?.questions?.length ? level.value.questions : [{ question: '请默写本关诗句。', answer: level.value?.poems?.[0]?.content || '' }])
const questionIndex = ref(0)
const answer = ref('')
const submitted = ref(false)
const result = ref(false)
const showHint = ref(false)
const answeredQuestions = ref([])
const questionResults = ref([])
const levelFinished = ref(false)
const accessReady = ref(false)
const levelLocked = ref(false)
const submitError = ref('')
const currentQuestion = computed(() => questions.value[questionIndex.value] || questions.value[0])
const correctAnswer = computed(() => {
  const value = currentQuestion.value?.answer
  return typeof value === 'number' ? currentQuestion.value.options?.[value] || '' : String(value || '')
})
const isCorrect = computed(() => result.value)
const allQuestionsCorrect = computed(() => questions.value.length > 0 && questions.value.every((_, index) => questionResults.value[index] === true))

watch(() => route.params.level, () => {
  questionIndex.value = 0
  answer.value = ''
  submitted.value = false
  result.value = false
  showHint.value = false
  answeredQuestions.value = []
  questionResults.value = []
  levelFinished.value = false
  submitError.value = ''
  loadAccess()
})

function getDifficultyLabel(value) { return ({ easy: '启蒙', medium: '进阶', hard: '挑战', challenge: '擂台' })[value] || '进阶' }
function getQuestionType(question) { return question?.options?.length ? '名句选择' : '名句填空' }
function normalize(value) { return String(value ?? '').normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu, '') }
function readStoredProgress() {
  const value = Number(localStorage.getItem('challengeHighestLevel'))
  return Number.isInteger(value) && value >= 0 ? Math.min(value, 200) : 0
}

async function loadAccess() {
  accessReady.value = false
  let highestLevel = readStoredProgress()
  try {
    const response = await api.challenge.getProgress()
    const remoteProgress = Number(response?.highest_level ?? response?.data?.highest_level)
    if (Number.isInteger(remoteProgress) && remoteProgress >= 0) {
      highestLevel = Math.min(remoteProgress, 200)
      localStorage.setItem('challengeHighestLevel', String(highestLevel))
    }
  } catch { /* 服务端不可用时使用本地已缓存进度，提交时仍由服务端再次校验 */ }
  levelLocked.value = levelNumber.value > Math.min(highestLevel + 1, 200)
  if (!levelLocked.value) {
    try {
      const response = await api.challenge.getLevelProgress(levelNumber.value)
      const correctQuestions = new Set(response?.correctQuestions || response?.data?.correctQuestions || [])
      questionResults.value = questions.value.map(question => correctQuestions.has(question.question) ? true : undefined)
      answeredQuestions.value = questions.value.map(question => correctQuestions.has(question.question))
      const nextQuestion = questionResults.value.findIndex(value => value !== true)
      if (nextQuestion >= 0) questionIndex.value = nextQuestion
    } catch { /* 无历史答题记录时从第一题开始 */ }
  }
  accessReady.value = true
}

async function submitAnswer() {
  if (!answer.value.trim() || submitted.value) return
  submitError.value = ''
  try {
    const serverResult = await api.challenge.submitAnswer({
      level: levelNumber.value,
      question: currentQuestion.value.question,
      userAnswer: answer.value,
      // 仅用于兼容旧接口；后端不会使用客户端答案判定。
      correctAnswer: correctAnswer.value,
      poemTitle: level.value.poemTitle,
      poemAuthor: level.value.poemAuthor,
      clientAttemptId: generateAttemptId()
    })
    result.value = Boolean(serverResult?.correct)
    questionResults.value[questionIndex.value] = result.value
    answeredQuestions.value[questionIndex.value] = true
    submitted.value = true
  } catch (error) {
    submitError.value = error.message || '提交失败，请检查网络后重试'
  }
}

function goNext() {
  if (questionIndex.value < questions.value.length - 1) {
    questionIndex.value += 1
    answer.value = ''
    submitted.value = false
    result.value = false
    showHint.value = false
    return
  }
  if (!allQuestionsCorrect.value) {
    const firstWrong = questionResults.value.findIndex(value => value !== true)
    questionIndex.value = firstWrong >= 0 ? firstWrong : 0
    answer.value = ''
    submitted.value = false
    result.value = false
    showHint.value = false
    submitError.value = '本关还有题目未答对，请重新作答后才能完成关卡。'
    return
  }
  finishLevel()
}

async function finishLevel() {
  if (!allQuestionsCorrect.value) return
  const current = Number(localStorage.getItem('challengeHighestLevel') || 0)
  try {
    await api.challenge.updateProgress(levelNumber.value)
    const next = Math.max(current, levelNumber.value)
    localStorage.setItem('challengeHighestLevel', String(next))
    levelFinished.value = true
  } catch (error) {
    submitError.value = error.message || '关卡结算失败，请稍后重试'
  }
}

onMounted(loadAccess)
</script>

<style scoped>
.quiz-page { --ink:#234f49; --muted:#789087; --jade:#238f7c; min-height:calc(100dvh - 84px); padding:24px clamp(22px,4vw,64px) 56px; color:var(--ink); background:linear-gradient(180deg,#f4f8f3,#eaf4ed); font-family:'Noto Sans SC','Microsoft YaHei',sans-serif; }.quiz-page * { box-sizing:border-box; }.quiz-header { display:flex; align-items:center; justify-content:space-between; width:min(100%,1280px); margin:0 auto 34px; }.back-link { display:inline-flex; align-items:center; gap:8px; color:#538277; font-size:12px; text-decoration:none; }.back-link:hover { color:#1d7565; }.quiz-location { display:flex; align-items:baseline; gap:12px; }.quiz-location span { color:#91a49c; font-size:11px; }.quiz-location strong { font:600 19px 'Noto Serif SC',serif; }.quiz-counter { padding:8px 13px; border:1px solid #d8e6dc; border-radius:9px; color:#3c7d6e; background:rgba(255,255,255,.62); font-size:11px; }.quiz-counter span { color:#9aaba4; }.quiz-layout { display:grid; grid-template-columns:300px minmax(0,720px); gap:54px; align-items:start; width:min(100%,1074px); margin:0 auto; }.quiz-aside { padding:28px 24px 22px; border:1px solid rgba(102,145,130,.16); border-radius:20px; background:rgba(255,255,255,.58); box-shadow:0 14px 40px rgba(48,100,81,.06); }.aside-kicker { color:#8aa59a; font-size:10px; letter-spacing:.16em; }.quiz-aside h1 { margin:9px 0 4px; font:600 28px 'Noto Serif SC',serif; }.aside-author { margin:0; color:#89a097; font-size:11px; }.poem-card { margin-top:23px; padding:15px 16px; border:1px solid rgba(198,157,88,.26); border-radius:12px; background:#fffaf0; }.poem-card span { color:#ac8249; font-size:10px; }.poem-card p { margin:8px 0 0; color:#8b6938; font:14px/1.9 'Noto Serif SC',serif; }.question-road { display:grid; gap:9px; margin-top:25px; }.question-step { display:flex; align-items:center; gap:10px; color:#99aaa3; }.question-step > span { display:grid; place-items:center; width:25px; height:25px; border:1px solid #d5e3db; border-radius:50%; background:#f6faf6; font-size:10px; }.question-step.active { color:#317d6d; }.question-step.active > span { border-color:#72b39d; color:#fff; background:#4a9b83; }.question-step.done > span { border-color:#a6ceb9; color:#347a68; background:#e1f1e7; }.question-step strong,.question-step small { display:block; }.question-step strong { font-size:11px; font-weight:500; }.question-step small { margin-top:2px; color:#a2b0aa; font-size:9px; }.aside-map-link { display:inline-flex; align-items:center; gap:7px; margin-top:26px; color:#4b897a; font-size:10px; text-decoration:none; }.quiz-content { min-width:0; padding-top:18px; }.content-heading { display:flex; align-items:center; justify-content:space-between; }.question-badge { padding:5px 10px; border-radius:7px; color:#3d8877; background:#e1f1e8; font-size:10px; }.content-hint { color:#9aaea5; font-size:10px; }.quiz-content h2 { margin:18px 0 20px; color:#285e56; font:600 clamp(25px,3vw,34px)/1.35 'Noto Serif SC',serif; }.question-panel { padding:29px; border:1px solid rgba(99,144,128,.17); border-radius:18px; background:rgba(255,255,255,.8); box-shadow:0 16px 40px rgba(48,100,81,.07); }.question-text { margin:0 0 25px; padding:17px 20px; border-left:4px solid #c89a4f; border-radius:0 10px 10px 0; color:#855f31; background:#fff8e9; font:18px/1.8 'Noto Serif SC',serif; }.answer-options { display:grid; gap:10px; }.answer-options button { display:flex; align-items:center; gap:12px; width:100%; padding:14px 15px; border:1px solid #d8e6dd; border-radius:10px; color:#51766b; background:#fff; cursor:pointer; text-align:left; font:14px 'Noto Sans SC',sans-serif; transition:.2s ease; }.answer-options button:hover:not(:disabled),.answer-options button.selected { border-color:#66a991; color:#317967; background:#edf8f1; }.answer-options button > span { display:grid; place-items:center; flex:0 0 25px; width:25px; height:25px; border-radius:50%; color:#4c8d7c; background:#e6f3eb; font-size:10px; }.answer-options button svg { margin-left:auto; }.answer-options button.correct { border-color:#65ae8d; color:#347860; background:#e4f5ea; }.answer-options button.wrong { border-color:#d9a37c; color:#a36a43; background:#fff0e5; }.fill-answer { display:grid; gap:9px; color:#5f7c73; font-size:11px; }.fill-answer input { width:100%; padding:15px 16px; border:1px solid #d8e6dd; border-radius:10px; outline:0; color:#315f55; background:#fff; font:16px 'Noto Serif SC',serif; }.fill-answer input:focus { border-color:#65a991; box-shadow:0 0 0 3px rgba(101,169,145,.13); }.answer-feedback { display:flex; gap:12px; margin-top:18px; padding:14px 15px; border-radius:11px; }.answer-feedback.right { color:#397b67; background:#e6f5eb; }.answer-feedback.wrong { color:#9b6742; background:#fff0e3; }.feedback-icon { display:grid; place-items:center; flex:0 0 30px; width:30px; height:30px; border-radius:50%; background:rgba(255,255,255,.65); }.answer-feedback strong { display:block; font-size:12px; }.answer-feedback p { margin:5px 0 0; color:inherit; opacity:.8; font-size:11px; line-height:1.6; }.quiz-actions { display:flex; flex-direction:row-reverse; align-items:center; justify-content:space-between; gap:12px; margin-top:17px; }.primary-action,.secondary-action { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:44px; padding:0 19px; border-radius:10px; font-size:12px; text-decoration:none; cursor:pointer; }.primary-action { border:0; color:#fff; background:linear-gradient(100deg,#1d846f,#2a9d87); box-shadow:0 9px 20px rgba(33,135,113,.18); }.primary-action:disabled { opacity:.42; cursor:not-allowed; }.secondary-action { border:1px solid #b7d5c7; color:#317967; background:rgba(255,255,255,.68); }.hint-action { display:inline-flex; align-items:center; gap:6px; padding:8px 0; border:0; color:#6d9387; background:transparent; cursor:pointer; font-size:11px; }.hint-box { display:flex; align-items:center; gap:8px; margin-top:12px; padding:11px 14px; border-radius:9px; color:#7b704f; background:#fff8e6; font-size:11px; }.quiz-finished { display:grid; justify-items:center; width:min(100%,680px); margin:10vh auto 0; padding:56px 38px; border:1px solid rgba(99,144,128,.17); border-radius:22px; background:rgba(255,255,255,.76); box-shadow:0 20px 60px rgba(48,100,81,.08); text-align:center; }.finish-mark { display:grid; place-items:center; width:76px; height:76px; margin-bottom:22px; border-radius:50%; color:#fff; background:#4b9a81; box-shadow:0 0 0 10px #e2f2e8; }.quiz-finished .eyebrow { margin-bottom:8px; }.quiz-finished h1 { margin:0; font:600 32px 'Noto Serif SC',serif; }.quiz-finished p { max-width:420px; margin:12px 0 26px; color:#7f978e; font-size:12px; line-height:1.8; }.finish-actions { display:flex; gap:10px; }
.quiz-error { margin:12px 0 0; color:#a35f45; font-size:11px; line-height:1.6; }
@media (max-width:900px) { .quiz-layout { grid-template-columns:1fr; gap:22px; width:min(100%,720px); }.quiz-aside { padding:22px; }.poem-card { display:none; }.question-road { display:flex; gap:12px; margin-top:20px; }.question-step div { display:none; }.aside-map-link { float:right; margin-top:-25px; }.quiz-content { padding-top:0; } }
@media (max-width:600px) { .quiz-page { padding:18px 14px 34px; }.quiz-header { flex-wrap:wrap; gap:12px; margin-bottom:22px; }.quiz-location { order:3; width:100%; }.quiz-location strong { font-size:17px; }.question-panel { padding:20px 16px; }.question-text { padding:13px 14px; font-size:16px; }.quiz-actions { flex-direction:column; align-items:stretch; }.primary-action { width:100%; }.hint-action { justify-content:center; }.quiz-finished { margin-top:5vh; padding:42px 22px; }.finish-actions { flex-direction:column; width:100%; } }
@media (prefers-reduced-motion:reduce) { *,*::before,*::after { transition-duration:.001ms!important; animation-duration:.001ms!important; } }
</style>

<style>
#app.challenge-shell main.container > .quiz-page { width:100%; max-width:none; margin:0; border:0; border-radius:0; background:linear-gradient(180deg,#f4f8f3,#eaf4ed); box-shadow:none; }
</style>
