<template>
  <div class="poem-detail">
    <!-- 划词选择弹窗 -->
    <div
      v-if="selectionPopup.show"
      class="selection-popup"
      :class="selectionPopup.placement === 'below' ? 'placement-below' : 'placement-above'"
      :style="{ top: selectionPopup.y + 'px', left: selectionPopup.x + 'px' }"
      @mousedown.stop
    >
      <button class="popup-btn translate" @click="handleTranslate">
        翻译这句话
      </button>
      <button class="popup-btn appreciate" @click="handleAppreciate">
        赏析这句话
      </button>
      <button class="popup-btn picture" @click="handleScenePicture" :disabled="sceneImageLoading">
        <span v-if="sceneImageLoading" class="popup-spinner"></span>
        {{ sceneImageLoading ? '意境渐生...' : '描绘画面' }}
      </button>
      <div class="selection-popup-placement" @mousedown.stop>
        <span class="placement-label">位置</span>
        <button
          type="button"
          class="placement-chip"
          :class="{ active: selectionPopup.placementMode === 'above' }"
          @click="setToolbarPlacement('above')"
        >贴上</button>
        <button
          type="button"
          class="placement-chip"
          :class="{ active: selectionPopup.placementMode === 'below' }"
          @click="setToolbarPlacement('below')"
        >贴下</button>
        <button
          type="button"
          class="placement-chip"
          :class="{ active: selectionPopup.placementMode === 'auto' }"
          @click="setToolbarPlacement('auto')"
        >自动</button>
      </div>
    </div>

    <!-- 诗句意境图（渐变应用为背景，无弹窗） -->

    <!-- 意境图提示 toast -->
    <transition name="toast-fade">
      <div v-if="sceneImageToast.show" class="scene-toast" :class="'scene-toast-' + sceneImageToast.type">
        <span v-if="sceneImageToast.type === 'success'" class="toast-icon">&#10003;</span>
        <span v-else-if="sceneImageToast.type === 'error'" class="toast-icon">&#10007;</span>
        <span v-else class="toast-icon">&#9432;</span>
        {{ sceneImageToast.message }}
      </div>
    </transition>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="!poem" class="empty">诗词不存在</div>
    
    <!-- 沉浸式学习模式背景 -->
    <div v-if="canRenderPoem" class="immersive-background" :class="{ 'has-generated-background': bgImageFadingIn }">
      <div class="background-container">
        <!-- 生成图加载完成后，默认背景直接移除，不再与生成图叠加。 -->
        <div v-if="!bgImageFadingIn" class="default-background">
          <div class="ancient-style-bg"></div>
        </div>
        <!-- AI 意境图：加载完成后完全替换默认背景。 -->
        <img
          v-if="backgroundImage"
          :src="backgroundImage"
          class="background-image"
          :class="{ 'fade-in': bgImageFadingIn }"
          alt=""
          aria-hidden="true"
          @load="onBgImageLoaded"
          @error="onBgImageError"
        />
        <div v-if="imageStatus === 'pending' && !backgroundImage" class="loading-overlay">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <p>诗中有画，画境渐生...</p>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="canRenderPoem" class="poem-glass-shell">
      <div class="first-screen-grid">
        <div class="main-study-column">
          <PoetryHero :poem="poem" :collected="isCollected" @back="goBack" @collect="toggleCollect" />
          <PoemContent
            :lines="poemLines"
            :speech-state="digitalHumanState"
            @play="readPoemWithDigitalHuman"
            @pause="pauseDigitalHuman"
            @resume="resumeDigitalHuman"
            @replay="replayDigitalHuman"
            @stop="stopDigitalHuman"
          />

          <section class="glass-card action-card accent-gold illustrated-card learning-map-card" :class="{ 'has-generated-content': tutorData || personalizedTutorLoading, 'is-generating': personalizedTutorLoading }">
            <div><h2><GraduationCap :size="24" weight="duotone" />个性化教学</h2><p>基于你的学习进度与练习表现，为你推荐专属学习路径。</p></div>
            <button class="gold-pill arrow-pill" type="button" :disabled="personalizedTutorLoading" @click="loadPersonalizedTutor"><span>{{ personalizedTutorLoading ? '分析学习状态…' : '获取个性化教学' }}</span><ArrowRight :size="15" /></button>
            <div v-if="personalizedTutorLoading && !tutorData" class="personalized-result personalized-loading" aria-live="polite">
              <strong>正在整理专属教学内容</strong>
              <span>学习进度、薄弱知识点与练习表现正在汇总中…</span>
            </div>
            <div v-if="tutorData" class="personalized-result">
              <div class="weak-tags"><span v-for="wp in tutorData.weakPoints || []" :key="wp.code">{{ wp.name }} · {{ wp.mastery }}%</span></div>
              <SafeMarkdown v-if="tutorData.teaching?.explanation" class="stream-markdown" :content="tutorData.teaching.explanation" />
              <p v-if="tutorData.teaching?.practiceAdvice"><strong>下一步：</strong>{{ tutorData.teaching.practiceAdvice }}</p>
            </div>
            <p v-if="tutorError" class="inline-error">{{ tutorError }}</p>
          </section>
        </div>

        <aside class="side-study-column">
          <section class="glass-card tutor-glass" id="ai-tutor">
            <div class="section-heading">
              <div class="tutor-title-copy"><Robot :size="25" weight="duotone" /><span><h2>AI 语文助教</h2><small>你的专属诗词学习伙伴</small></span></div>
              <label class="auto-switch"><input v-model="autoExplain" name="autoExplain" type="checkbox"><span></span> 自动讲解</label>
            </div>
            <div class="tutor-body">
              <DigitalHumanPanel :state="digitalHumanState" :auto-explain="autoExplain" />
              <div class="tutor-conversation">
                <div ref="chatMessagesContainer" class="chat-scroll">
                  <div v-if="tutorMessages.length < 3" class="suggested-questions" aria-label="推荐问题">
                    <span>你好！很高兴陪你一起学习这首诗。你想从哪里开始呢？</span>
                    <button type="button" @click="askSuggestion(`“${poem.title}”描绘了怎样的送别场景？`)">这首诗描绘了怎样的送别场景？</button>
                    <button type="button" @click="askSuggestion('诗中营造了怎样的氛围？')">诗中营造了怎样的氛围？</button>
                    <button type="button" @click="askSuggestion('这首诗最值得品味的名句是哪句？')">哪句最值得细细品味？</button>
                  </div>
                  <article v-for="(message,index) in tutorMessages" :key="index" class="chat-bubble" :class="[message.role, { 'is-streaming': tutorLoading && message.role === 'bot' && index === tutorMessages.length - 1 }]">
                    <SafeMarkdown class="stream-markdown" :content="message.content" />
                    <button v-if="message.role === 'bot' && message.content" type="button" class="speak-link" @click="speakWithDigitalHuman(message.content, 'explaining')">让数字人讲解</button>
                  </article>
                  <div v-if="tutorLoading" class="chat-bubble bot">正在组织讲解…</div>
                </div>
                <div class="chat-compose">
                  <input id="poem-tutor-question" v-model="tutorQuestion" name="tutorQuestion" type="text" aria-label="向 AI 语文助教提问" placeholder="输入你想问的问题…" @keyup.enter="sendTutorMessageAndMaybeSpeak">
                  <button class="primary-pill" type="button" :disabled="!tutorQuestion.trim() || tutorLoading" @click="sendTutorMessageAndMaybeSpeak"><PaperPlaneTilt :size="17" />发送</button>
                </div>
              </div>
            </div>
          </section>
          <section class="glass-card action-card accent-jade illustrated-card analysis-card" :class="{ 'has-generated-content': aiExplanations.markdown || allAiLoading, 'is-generating': allAiLoading }">
            <div class="analysis-intro"><h2><Sparkle :size="24" weight="duotone" />AI 赏析古诗文</h2><p>一键生成多维度赏析，帮你深入理解诗词的意境与情感。</p><button class="primary-pill" type="button" :disabled="allAiLoading" @click="getAIExplanation"><Sparkle :size="17" weight="fill" />{{ allAiLoading ? '生成赏析中…' : '生成赏析' }}</button></div>
            <div class="analysis-output">
              <SafeMarkdown v-if="aiExplanations.markdown" class="generated-copy stream-markdown" :class="{ 'is-streaming': allAiLoading }" :content="aiExplanations.markdown" />
              <div v-else class="analysis-placeholder"><span>赏析内容将显示在此处</span><small>点击生成赏析后，情感、意象与写作手法会在这里呈现</small></div>
            </div>
          </section>
        </aside>
      </div>

      <LearningOverview :poem="poem" :mastery="masteryScore" />

      <div class="learning-grid second-screen-grid">
        <div class="learning-main-stack">
          <section class="glass-card recitation-glass">
            <div class="section-heading">
              <div><Eye :size="25" weight="duotone" /><h2>遮挡背诵</h2></div>
              <div class="cloze-actions">
                <label class="auto-switch"><input v-model="recitationMode" name="recitationMode" type="checkbox"><span></span> 启用遮挡</label>
                <button class="soft-button" type="button" :disabled="!recitationMode" @click="refreshRecitation"><ArrowClockwise :size="17" />刷新题目</button>
              </div>
            </div>
            <div class="cloze-poem">
              <p v-for="(sentence,index) in splitSentences(poem.content)" :key="index">
                <template v-if="recitationMode && hiddenLineIndices.includes(index)">
                  <input
                    class="cloze-blank"
                    :class="clozeResultClass(index)"
                    type="text"
                    v-model="clozeAnswers[index]"
                    :placeholder="clozePlaceholder(sentence.length)"
                    :disabled="clozeSubmitted"
                    autocomplete="off"
                  >{{ index % 2 === 0 ? '，' : '。' }}
                </template>
                <template v-else>{{ sentence }}{{ index % 2 === 0 ? '，' : '。' }}</template>
              </p>
            </div>
            <footer>
              <span v-if="!recitationMode">开启遮挡后，随机一半诗句将变为横线，请补充后提交验证</span>
              <span v-else>已挖空 {{ hiddenLineIndices.length }}/{{ splitSentences(poem.content).length }} 句，补充后点击提交验证</span>
              <div class="cloze-footer-actions" v-if="recitationMode">
                <button class="soft-button" type="button" :disabled="clozeSubmitted || !clozeAllFilled" @click="submitCloze">提交验证</button>
                <button class="soft-button" type="button" v-if="clozeResult" @click="resetClozeAnswer">重做</button>
              </div>
            </footer>
            <div v-if="clozeResult" class="cloze-result">
              <strong>正确率 {{ clozeResult.score }}%</strong>
              <p v-if="clozeResult.score === 100">全部正确，背诵扎实！</p>
              <p v-else>共 {{ clozeResult.totalChars }} 字，正确 {{ clozeResult.correctChars }} 字，错 {{ clozeResult.wrongChars.length }} 句</p>
              <div class="cloze-error-detail" v-if="clozeResult.wrongChars.length">
                <span v-for="(item, i) in clozeResult.wrongChars" :key="i" class="cloze-error-item">
                  第{{ item.index + 1 }}句：<em>{{ item.input || '（空）' }}</em> → <em class="right">{{ item.original }}</em>
                </span>
              </div>
            </div>
          </section>

          <section class="glass-card recite-assessment">
            <div class="section-heading"><div><Robot :size="25" weight="duotone" /><h2>AI 背诵检测</h2></div></div>
            <p class="assessment-label">请默写全诗：</p>
            <textarea id="recite-assessment-input" v-model="reciteInput" name="reciteInput" rows="6" maxlength="500" aria-label="默写诗句" placeholder="在此输入你默写的诗句…"></textarea>
            <div class="assessment-footer"><span>{{ reciteInput.length }}/500</span><button class="primary-pill" type="button" :disabled="reciteLoading || !reciteInput.trim()" @click="checkRecite">{{ reciteLoading ? '检测中…' : '提交检测' }}</button></div>
            <div v-if="reciteResult" class="assessment-result">
              <strong>正确率 {{ reciteResult.score }}%</strong>
              <p>{{ reciteResult.aiAdvice }}</p>
              <div class="error-tags"><span v-for="(item,index) in reciteResult.wrongChars || []" :key="`wrong-${index}`">错字 {{ item.input }} → {{ item.original }}</span><span v-for="(item,index) in reciteResult.missing || []" :key="`miss-${index}`">漏字 {{ item.char }}</span><span v-for="(item,index) in reciteResult.extra || []" :key="`extra-${index}`">多字 {{ item.char }}</span></div>
              <button v-if="reciteResult.score !== 100" class="soft-button" type="button" :disabled="addingToWrongBook" @click="addReciteToWrongBook">{{ wrongBookAdded ? '已加入错题本' : '加入错题本' }}</button>
            </div>
          </section>
        </div>

        <aside class="learning-side-stack">
          <section class="glass-card poet-profile-glass">
            <div class="section-heading"><div><UserCircle :size="25" weight="duotone" /><h2>诗人简介</h2></div></div>
            <div class="poet-profile-body">
              <img v-if="authorAvatar" :src="authorAvatar" :alt="poem.author" @error="handleAvatarError">
              <div><h3>{{ poem.author }} · {{ poem.dynasty }}</h3><div class="weak-tags"><span>{{ poem.dynasty }}诗人</span><span>传统文学</span></div><p>{{ getAuthorBio(poem.author) }}</p></div>
            </div>
          </section>

          <section class="glass-card similar-glass">
            <div class="section-heading"><div><FlowerLotus :size="25" weight="duotone" /><h2>相似风格诗词</h2></div></div>
            <button v-for="(similar, similarIndex) in similarPoems" :key="similar.id" class="similar-row" :class="`similar-art-${similarIndex % 3}`" type="button" @click="navigateToPoem(similar.id)">
              <span><strong>{{ similar.title }}</strong><small>{{ similar.author }} · {{ similar.dynasty }}</small></span>
              <p>{{ similar.content?.split('\n')[0] }}</p><ChevronRight :size="20" />
            </button>
            <p v-if="!similarPoems.length" class="empty-copy">正在寻找意境相近的诗词…</p>
          </section>
        </aside>
      </div>

      <div class="story-card-grid">
        <section class="glass-card story-card creation-art" :class="{ 'has-generated-content': poemBackground }"><h2><BookOpenText :size="25" weight="duotone" />诗词创作背景</h2><SafeMarkdown v-if="poemBackground" class="generated-copy stream-markdown" :class="{ 'is-streaming': poemBackgroundLoading }" :content="poemBackground" /><p v-else>此诗作于诗人行旅途中。借节令、烟雨与行人写出含蓄悠长的诗意。</p><button class="primary-pill arrow-pill" type="button" :disabled="poemBackgroundLoading" @click="fetchPoemBackground"><span>{{ poemBackgroundLoading ? '生成中…' : poemBackground ? '重新梳理背景' : '了解创作背景' }}</span><ArrowRight :size="15" /></button></section>
        <section class="glass-card story-card story-art" :class="{ 'has-generated-content': poemStory }"><h2><MaskHappy :size="25" weight="duotone" />诗词趣味故事</h2><SafeMarkdown v-if="poemStory" class="generated-copy stream-markdown" :class="{ 'is-streaming': poemStoryLoading }" :content="poemStory" /><p v-else>相传诗人写下此诗后，曾将诗意告诉一位老农，留下了一段有趣佳话。</p><div class="card-button-row"><button class="primary-pill arrow-pill" type="button" :disabled="poemStoryLoading" @click="fetchPoemStory"><span>{{ poemStoryLoading ? '生成中…' : poemStory ? '换个故事' : '听诗人的故事' }}</span><ArrowRight :size="15" /></button><button v-if="poemStory" class="soft-button" type="button" @click="speakWithDigitalHuman(poemStory, 'explaining')">数字人讲述</button></div></section>
        <section class="glass-card story-card gold guide-art" :class="{ 'has-generated-content': recitationGuideMarkdown || recitationGuide }"><h2><MicrophoneStage :size="25" weight="duotone" />诵读技巧指南</h2><SafeMarkdown v-if="recitationGuideMarkdown || recitationGuide" class="generated-copy stream-markdown" :class="{ 'is-streaming': recitationGuideLoading }" :content="recitationGuideMarkdown || recitationGuide" /><p v-else>本诗情感含蓄，语调宜平缓沉郁。前两句重在营造氛围，后两句转折自然。</p><div class="card-button-row"><button class="gold-pill arrow-pill" type="button" :disabled="recitationGuideLoading" @click="fetchRecitationGuide"><span>{{ recitationGuideLoading ? '生成中…' : recitationGuide ? '更新技巧' : '获取诵读技巧' }}</span><ArrowRight :size="15" /></button><button v-if="recitationGuideMarkdown || recitationGuide" class="soft-button" type="button" @click="speakWithDigitalHuman(recitationGuideMarkdown || recitationGuide, 'reading')">数字人示范</button></div></section>
      </div>

      <KnowledgeSummary :poem="poem" @explain="focusTutor" />
    </div>

  </div>
</template>


<script>
import io from 'socket.io-client'
import { generateAttemptId } from '../utils/attemptId'
import { getToken, request, streamAI, TIMEOUTS } from '../services/api'
import { AUTHOR_PORTRAITS, DEFAULT_AUTHOR_PORTRAIT } from '../assets/poets/authorPortraits'
import PoetryHero from '../components/poem-detail/PoetryHero.vue'
import PoemContent from '../components/poem-detail/PoemContent.vue'
import DigitalHumanPanel from '../components/poem-detail/DigitalHumanPanel.vue'
import LearningOverview from '../components/poem-detail/LearningOverview.vue'
import KnowledgeSummary from '../components/poem-detail/KnowledgeSummary.vue'
import SafeMarkdown from '../components/SafeMarkdown.vue'
import { digitalHumanService } from '../services/digitalHumanService'
import { poemBackgroundService } from '../services/poemBackgroundService'
import { notify } from '../services/appFeedback'
import { PhArrowClockwise as ArrowClockwise, PhArrowRight as ArrowRight, PhBookOpenText as BookOpenText, PhCaretRight as ChevronRight, PhEye as Eye, PhFlowerLotus as FlowerLotus, PhGraduationCap as GraduationCap, PhMaskHappy as MaskHappy, PhMicrophoneStage as MicrophoneStage, PhPaperPlaneTilt as PaperPlaneTilt, PhRobot as Robot, PhSparkle as Sparkle, PhUserCircle as UserCircle } from '@phosphor-icons/vue'

const BUILTIN_AUTHOR_AVATARS = AUTHOR_PORTRAITS

export default {
  name: 'PoemDetail',
  components: { ArrowClockwise, ArrowRight, BookOpenText, ChevronRight, DigitalHumanPanel, Eye, FlowerLotus, GraduationCap, KnowledgeSummary, LearningOverview, MaskHappy, MicrophoneStage, PaperPlaneTilt, PoemContent, PoetryHero, Robot, SafeMarkdown, Sparkle, UserCircle },
  data() {
    return {
      poem: null,
      loading: true,
      error: '',
      // AI讲解相关状态
      aiExplanations: {
        markdown: null
      },
      allAiLoading: false,
      // API请求控制器，用于取消请求
      abortController: null,
      poemAbortController: null,
      isCollected: false,
      // 遮挡背诵功能相关
      recitationMode: false,
      hiddenLineIndices: [],
      clozeAnswers: {},
      clozeResult: null,
      clozeSubmitted: false,
      // 背诵检测功能相关
      reciteInput: '',
      reciteAttemptId: null,
      reciteLoading: false,
      reciteResult: null,
      reciteError: '',
      addingToWrongBook: false,
      wrongBookAdded: false,
      // 诗词创作背景
      poemBackground: null,
      poemBackgroundTips: null,
      poemBackgroundLoading: false,
      poemBackgroundError: '',
      // 诗词趣味故事
      poemStory: null,
      poemStoryLoading: false,
      poemStoryError: '',
      // 诵读技巧指南
      recitationGuide: null,
      recitationGuideMarkdown: null,
      recitationGuideLoading: false,
      recitationGuideError: '',
      // AI助教聊天相关
      tutorMessages: [],
      tutorQuestion: '',
      tutorLoading: false,
      // 防止请求竞态
      currentFetchId: 0,
      // 相似诗词
      similarPoems: [],
      // 诗人头像
      authorAvatar: null,
      // 学习时长相关
      studyStartTime: null,
      studyTimer: null,
      // 图像生成相关
      imageStatus: 'idle', // idle, pending, success, fail
      backgroundImage: null,
      bgImageFadingIn: false,   // 控制 AI 意境图淡入
      bgImageLoading: false,    // 标记图片正在加载中
      bgImageRetrying: false,    // 旧缓存失效时仅自动重取一次
      // Socket.io相关
      socket: null,
      // 划词选择弹窗
      selectionPopup: {
        show: false,
        x: 0,
        y: 0,
        selectedText: '',
        /** 实际贴靠：above | below（由 placementMode + 空间计算） */
        placement: 'above',
        /** 用户偏好：auto | above | below */
        placementMode: 'auto',
        /** 选区在视口内的矩形，用于 fixed 定位（勿混用 scrollY） */
        anchorRect: null,
        lineNumber: null,
        totalLines: null
      },
      // 意境图
      sceneImageLoading: false,
      sceneImageToast: {
        show: false,
        message: '',
        type: 'info' // info | success | error
      },
      // 个性化教学（RAG 驱动）
      tutorData: null,
      personalizedTutorLoading: false,
      tutorError: ''
      ,digitalHumanState: 'idle'
      ,autoExplain: false
      ,revealedCloze: []
      ,masteryScore: 72
      ,digitalHumanUnsubscribe: null
    }
  },
  // 路由离开前清理资源并记录学习时长
  beforeRouteLeave(to, from, next) {
    // 计算学习时长（分钟）
    if (this.studyStartTime) {
      const endTime = Date.now()
      const studyTime = Math.round((endTime - this.studyStartTime) / 60000)
      console.log('结束学习计时:', endTime)
      console.log('学习时长:', studyTime, '分钟')
      if (studyTime > 0 && this.poem) {
        console.log('记录学习时长:', studyTime, '分钟')
        this.recordStudyTime(studyTime)
      }
    }
    
    // 如果有正在进行的AI请求，立即终止
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
      console.log('导航离开，已终止AI讲解请求')
    }

    // 如果有正在进行的诗词详情请求，立即终止
    if (this.poemAbortController) {
      this.poemAbortController.abort()
      this.poemAbortController = null
    }
    
    // 重置加载状态，确保下次进入或缓存恢复时状态正常
    this.allAiLoading = false
    
    // 重置AI助教聊天记录
    this.tutorMessages = []
    this.tutorQuestion = ''
    this.tutorLoading = false
    digitalHumanService.reset()
    poemBackgroundService.cancel()
    
    next()
  },
  watch: {
    // 当诗词变化时，重置背诵相关数据和检查收藏状态
    poem: {
      handler() {
        this.refreshRecitation()
        this.checkCollectionStatus()
      }
    },
    // 监听路由参数变化，当id变化时重新获取诗词数据
    '$route.params.id'(id, previousId) {
      // KeepAlive 下组件离开详情路由后仍然存活。只在进入另一首有效诗词时刷新，
      // 避免离开详情页时 id 变为 undefined 又错误请求默认诗词。
      if (id && id !== previousId) this.fetchPoemDetail()
    }
  },
  computed: {
    canRenderPoem() {
      return !this.loading && Boolean(this.poem)
    },
    poemLines() {
      if (!this.poem || !this.poem.content) return []
      return this.poem.content.split('\n').filter(line => line.trim())
    },
  },
  mounted() {
    // 开始学习计时
    this.studyStartTime = Date.now()
    console.log('开始学习计时:', this.studyStartTime)
    
    // KeepAlive 的 activated 生命周期统一负责 Socket，避免初次挂载时重复连接。
    this.fetchPoemDetail()

    try {
      const saved = localStorage.getItem('poemDetail.toolbarPlacement')
      if (saved === 'above' || saved === 'below' || saved === 'auto') {
        this.selectionPopup.placementMode = saved
      }
    } catch (e) { /* ignore */ }
    
    // 初始化AI助教欢迎消息
    if (this.tutorMessages.length === 0) {
      this.$nextTick(() => {
        this.tutorMessages.push({
          role: 'bot',
          content: '你好！我是你的 AI 语文助教，可以解释诗句、分析情感与意象，也能给你背诵建议。选择左侧问题，或直接输入你想了解的内容吧。'
        });
        // 滚动到底部
        this.scrollToBottom();
      });
    }

    // 监听文本选择，用于划词功能
    document.addEventListener('mouseup', this.handleTextSelection);

    digitalHumanService.init()
    this.digitalHumanUnsubscribe = digitalHumanService.on('stateChanged', ({ state }) => {
      this.digitalHumanState = state
    })
  },
  activated() {
    this.studyStartTime = Date.now()
    document.addEventListener('mouseup', this.handleTextSelection)
    this.initSocket()
  },
  deactivated() {
    document.removeEventListener('mouseup', this.handleTextSelection)
    this.socket?.disconnect()
    poemBackgroundService.cancel()
    this.stopDigitalHuman()
  },
  beforeUnmount() {
    // 清理Socket连接
    if (this.socket) {
      this.socket.disconnect()
    }
    // 移除文本选择监听
    document.removeEventListener('mouseup', this.handleTextSelection);
    this.digitalHumanUnsubscribe?.()
    digitalHumanService.dispose()
    poemBackgroundService.dispose()
  },
  methods: {
    async loadPoemBackground(options = {}) {
      this.bgImageLoading = true
      const result = await poemBackgroundService.load(this.poem, options)
      if (result?.url) {
        this.applyBackgroundImage(result.url)
      } else if (result?.pending) {
        this.imageStatus = 'pending'
      } else {
        this.imageStatus = 'fail'
        this.bgImageLoading = false
      }
    },
    applyBackgroundImage(url, { remember = false } = {}) {
      if (!url) return
      this.imageStatus = 'success'
      if (remember) poemBackgroundService.remember(this.poem, url)
      if (this.backgroundImage === url) {
        this.bgImageFadingIn = true
        this.bgImageLoading = false
        return
      }
      this.bgImageFadingIn = false
      this.bgImageLoading = true
      this.backgroundImage = url
    },
    async speakWithDigitalHuman(text, mode = 'speaking') {
      const plainText = String(text || '').replace(/[#*_>`~-]/g, ' ').replace(/\s+/g, ' ').trim()
      if (!plainText) return
      await digitalHumanService.speak(plainText, { mode })
    },
    readPoemWithDigitalHuman() {
      return digitalHumanService.playPoem(this.poem)
    },
    pauseDigitalHuman() { digitalHumanService.pauseSpeaking() },
    resumeDigitalHuman() { digitalHumanService.resumeSpeaking() },
    stopDigitalHuman() { digitalHumanService.stopSpeaking() },
    replayDigitalHuman() { return digitalHumanService.speak(digitalHumanService.lastText || this.poem?.content, { mode: 'reading' }) },
    focusTutor() {
      document.querySelector('#ai-tutor input')?.focus()
      document.querySelector('#ai-tutor')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    askSuggestion(question) {
      this.tutorQuestion = question
      this.sendTutorMessageAndMaybeSpeak()
    },
    async sendTutorMessageAndMaybeSpeak() {
      const previousLength = this.tutorMessages.length
      await this.sendTutorMessage()
      const answer = this.tutorMessages.slice(previousLength).reverse().find((message) => message.role === 'bot' && message.content)
      if (this.autoExplain && answer) await this.speakWithDigitalHuman(answer.content, 'explaining')
    },
    toggleCloze(index) {
      this.revealedCloze = this.revealedCloze.includes(index)
        ? this.revealedCloze.filter((item) => item !== index)
        : [...this.revealedCloze, index]
    },
    // 加载个性化教学（RAG 驱动）
    async loadPersonalizedTutor() {
      if (this.personalizedTutorLoading || !this.poem) return
      this.personalizedTutorLoading = true
      this.tutorError = ''
      try {
        const data = await request('/ai/personalized-tutor', {
          method: 'POST',
          body: JSON.stringify({ poemId: this.poem.id }),
          timeout: TIMEOUTS.LONG
        })
        
        this.tutorData = data.data || data
      } catch (err) {
        console.error('[personalizedTutor] 获取失败:', err)
        this.tutorError = err.message || '个性化教学服务暂时不可用'
        this.tutorData = null
      } finally {
        this.personalizedTutorLoading = false
      }
    },
    // 背景图加载完成后触发淡入
    onBgImageLoaded() {
      this.bgImageFadingIn = true
      this.bgImageLoading = false
    },
    onBgImageError() {
      poemBackgroundService.forget(this.poem)
      this.backgroundImage = null
      this.bgImageFadingIn = false
      this.bgImageLoading = false
      this.imageStatus = 'fail'
      // localStorage 可能保留了旧的临时地址；清除后重取一次，避免一次
      // 过期缓存让当前诗词永久停留在 fallback 背景。
      if (!this.bgImageRetrying && this.poem) {
        this.bgImageRetrying = true
        void this.loadPoemBackground({ ignoreLocalCache: true }).finally(() => {
          this.bgImageRetrying = false
        })
        return
      }
      notify.warning('意境图加载失败，已切换为默认古风背景')
    },
    // 初始化Socket.io连接
    async initSocket() {
      try {
        if (this.socket) {
          if (!this.socket.connected) this.socket.connect()
          return
        }
        let socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
        if (window.electronAPI) {
          const port = await window.electronAPI.getBackendPort();
          socketUrl = `http://localhost:${port}`;
        }
        
        this.socket = io(socketUrl, {
          transports: ['websocket', 'polling']
        });
        
        this.socket.on('connect', () => {
          console.log('Socket连接成功')
          // 发送认证信息
          const token = getToken()
          if (token) this.socket.emit('authenticate', { token })
        })
        
        this.socket.on('disconnect', () => {
          console.log('Socket连接断开')
        })
        
        // 监听图像生成状态
        this.socket.on('image-generate-pending', (data) => {
          if (this.poem && String(data?.poemId) !== String(this.poem.id)) return
          console.log('图像生成中:', data)
          this.imageStatus = 'pending'
        })
        
        this.socket.on('image-generate-success', (data) => {
      if (this.poem && String(data?.poemId) !== String(this.poem.id)) return
      console.log('图像生成成功:', data)
      this.applyBackgroundImage(data.url, { remember: true })
    })
        
        this.socket.on('image-generate-fail', (data) => {
          if (this.poem && String(data?.poemId) !== String(this.poem.id)) return
          console.log('图像生成失败:', data)
          this.imageStatus = 'fail'
          this.bgImageLoading = false
          // 显示错误提示
          this.$message?.error(data.error || '背景图生成失败，将使用默认背景')
        })
      } catch (error) {
        console.error('Socket初始化失败:', error)
      }
    },
    async fetchPoemDetail() {
      // 如果有之前的请求，先取消
      if (this.poemAbortController) {
        this.poemAbortController.abort()
      }
      this.poemAbortController = new AbortController()

      // 生成当前请求ID
      this.currentFetchId++
      const fetchId = this.currentFetchId
      
      try {
        this.loading = true
        this.error = ''
        
        // 重置所有状态
        this.poem = null
        // 重置AI讲解相关状态
        this.aiExplanations = {
          markdown: null
        }
        this.allAiLoading = false
        // 重置背诵相关状态
        this.recitationMode = false
        this.clozeAnswers = {}
        this.clozeResult = null
        this.clozeSubmitted = false
        // 重置诗词创作背景状态
        this.poemBackground = null
        this.poemBackgroundTips = null
        this.poemBackgroundLoading = false
        this.poemBackgroundError = ''
        // 重置诗词趣味故事状态
        this.poemStory = null
        this.poemStoryLoading = false
        this.poemStoryError = ''
        // 重置诵读技巧指南状态
        this.recitationGuide = null
        this.recitationGuideMarkdown = null
        this.recitationGuideLoading = false
        this.recitationGuideError = ''
        // 重置AI助教聊天记录
        this.tutorMessages = []
        this.tutorQuestion = ''
        this.tutorLoading = false
        this.tutorData = null
        this.personalizedTutorLoading = false
        this.tutorError = ''
        // 重置背诵检测状态
        this.reciteInput = ''
        this.reciteAttemptId = null
        this.reciteResult = null
        this.reciteLoading = false
        this.wrongBookAdded = false
        
        let { id } = this.$route.params
        
        // 检查id是否存在，如果不存在，使用默认ID 1
        if (!id) {
          id = '1'
          console.log('诗词ID不存在，使用默认ID:', id)
        }
        
        const response = await fetch(`/api/poems/${id}`, {
          signal: this.poemAbortController.signal
        })
        
        // 如果不是最新请求，则忽略结果
        if (fetchId !== this.currentFetchId) return
        
        if (!response.ok) {
          throw new Error('获取诗词详情失败')
        }
        
        const data = await response.json()
        
        // 再次检查请求ID（因为await json()也需要时间）
        if (fetchId !== this.currentFetchId) return
        
        this.poem = data
        // 检查收藏状态
        this.checkCollectionStatus()
        // 记录学习历史
        this.recordLearning()
        // 获取相似风格诗词
        this.fetchSimilarPoems()
        // 获取诗人头像
        this.loadAuthorAvatar(data.author)
        // 重置旧诗的背景图状态，避免旧意境图残留
        this.backgroundImage = null
        this.bgImageFadingIn = false
        this.imageStatus = 'idle'
        // 预生成背景图
        // 图片生成不参与详情页主链路；失败时保留默认古风背景。
        void this.loadPoemBackground()
      } catch (err) {
        // 忽略取消请求的错误
        if (err.name === 'AbortError') {
          return
        }

        // 如果不是最新请求，则忽略错误
        if (fetchId !== this.currentFetchId) return
        
        this.error = err.message
        console.error('获取诗词详情失败:', err)
      } finally {
        // 清理 controller
        if (this.poemAbortController && this.poemAbortController.signal.aborted) {
          this.poemAbortController = null
        }

        // 如果是最新请求，才结束加载状态
        if (fetchId === this.currentFetchId) {
          this.loading = false
        }
      }
    },
    async getAIExplanation() {
      if (!this.poem || this.allAiLoading) return
      
      try {
        // 创建新的AbortController
        this.abortController = new AbortController()
        
        this.allAiLoading = true
        
        this.aiExplanations.markdown = ''
        await streamAI({
          type: 'explain',
          poem: this.poem.content,
          title: this.poem.title,
          author: this.poem.author
        }, {
          timeout: TIMEOUTS.LONG,
          onToken: (_token, fullText) => { this.aiExplanations.markdown = fullText }
        })
      } catch (err) {
        // 忽略取消请求的错误
        if (err.name === 'AbortError') {
          console.log('AI讲解请求已取消')
        } else {
          console.error('获取AI讲解失败:', err)
          notify('获取AI讲解失败，请稍后重试', 'error')
        }
      } finally {
        this.allAiLoading = false
      }
    },
    goBack() {
      // 取消当前的AI讲解请求
      if (this.abortController) {
        this.abortController.abort()
        this.abortController = null
      }
      this.$router.back()
    },
    async checkRecite() {
      if (!this.reciteInput.trim()) {
        notify('请输入默写内容', 'warning')
        return
      }
      
      // 检查是否登录
      const token = localStorage.getItem('token')
      if (!token) {
        // 未登录，存储当前路径并跳转到登录页
        localStorage.setItem('redirectPath', this.$route.fullPath)
        this.$router.push('/login')
        return
      }
      
      try {
        this.reciteLoading = true
        this.reciteError = ''
        if (!this.reciteAttemptId) this.reciteAttemptId = generateAttemptId()
        
        const data = await request('/ai/recite-check', {
          method: 'POST',
          body: JSON.stringify({
            original: this.poem.content,
            input: this.reciteInput,
            poem_id: this.poem.id,
            poem_title: this.poem.title,
            poem_author: this.poem.author,
            attemptId: this.reciteAttemptId
          }),
          timeout: TIMEOUTS.MEDIUM
        })
        
        this.reciteResult = data
        
        // 记录背诵行为和得分
        if (data.score !== undefined) {
          await this.recordLearning('recite', data.score)
        }
      } catch (err) {
        this.reciteError = err.message
        console.error('背诵检测失败:', err)
      } finally {
        this.reciteLoading = false
      }
    },
    // 按标点符号分割句子
    splitSentences(content) {
      // 按标点符号分割句子
      return content.split(/[，。！？；]/).filter(sentence => sentence.trim())
    },
    
    // 刷新背诵题目：随机挖空一半诗句
    refreshRecitation() {
      if (!this.poem || !this.poem.content) {
        this.hiddenLineIndices = []
        this.clozeAnswers = {}
        this.clozeResult = null
        this.clozeSubmitted = false
        return
      }

      const sentences = this.splitSentences(this.poem.content)
      if (sentences.length === 0) {
        this.hiddenLineIndices = []
        this.clozeAnswers = {}
        this.clozeResult = null
        this.clozeSubmitted = false
        return
      }

      // 随机挖空一半诗句（至少 1 句）
      const hiddenCount = Math.max(1, Math.floor(sentences.length / 2))
      const allIndices = Array.from({ length: sentences.length }, (_, i) => i)
      const shuffledIndices = allIndices.sort(() => Math.random() - 0.5)
      this.hiddenLineIndices = shuffledIndices.slice(0, hiddenCount)
      // 初始化答案对象
      this.clozeAnswers = {}
      this.hiddenLineIndices.forEach(i => { this.clozeAnswers[i] = '' })
      this.clozeResult = null
      this.clozeSubmitted = false
    },
    // 生成横线占位符
    clozePlaceholder(len) {
      return '＿'.repeat(Math.max(2, len))
    },
    // 根据验证结果给输入框加样式
    clozeResultClass(index) {
      if (!this.clozeResult || !this.clozeResult.detail) return ''
      const d = this.clozeResult.detail[index]
      if (!d) return ''
      return d.correct ? 'correct' : 'wrong'
    },
    // 是否所有横线都已填写
    clozeAllFilled() {
      return this.hiddenLineIndices.every(i => (this.clozeAnswers[i] || '').trim().length > 0)
    },
    // 提交验证：本地逐字比对并打分
    submitCloze() {
      if (!this.clozeAllFilled()) {
        notify('请先补充所有横线处', 'warning')
        return
      }
      const sentences = this.splitSentences(this.poem.content)
      let totalChars = 0
      let correctChars = 0
      const wrongChars = []
      const detail = {}

      this.hiddenLineIndices.forEach(i => {
        const original = sentences[i]
        const input = (this.clozeAnswers[i] || '').trim()
        // 逐字比对，统计正确字数
        const maxLen = Math.max(original.length, input.length)
        let sentenceCorrect = 0
        for (let k = 0; k < maxLen; k++) {
          const o = original[k] || ''
          const u = input[k] || ''
          if (o && u && o === u) {
            sentenceCorrect++
          }
        }
        totalChars += original.length
        correctChars += sentenceCorrect
        const isCorrect = (input === original)
        detail[i] = { correct: isCorrect, input, original }
        if (!isCorrect) {
          wrongChars.push({ index: i, input, original })
        }
      })

      const score = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 0
      this.clozeResult = { score, totalChars, correctChars, wrongChars, detail }
      this.clozeSubmitted = true

      // 记入学习行为
      this.recordLearning('recite', score).catch(() => {})
    },
    // 重做：清空答案但保留当前挖空位置
    resetClozeAnswer() {
      this.hiddenLineIndices.forEach(i => { this.clozeAnswers[i] = '' })
      this.clozeResult = null
      this.clozeSubmitted = false
    },
    // 切换收藏状态
    toggleCollect() {
      // 检查是否登录
      const token = localStorage.getItem('token')
      if (!token) {
        // 未登录，存储当前路径并跳转到登录页
        localStorage.setItem('redirectPath', this.$route.fullPath)
        this.$router.push('/login')
        return
      }
      
      // 已登录，执行收藏操作
      this.isCollected = !this.isCollected
      
      // 调用收藏API
      const url = this.isCollected ? '/collections' : `/collections/${this.poem.id}`
      const method = this.isCollected ? 'POST' : 'DELETE'
      
      request(url, {
        method: method,
        body: this.isCollected ? JSON.stringify({ poem_id: this.poem.id }) : undefined,
        timeout: TIMEOUTS.SHORT
      })
      .then(data => {
        console.log('收藏操作成功:', data)
      })
      .catch(err => {
        console.error('收藏操作失败:', err)
        // 恢复原状态
        this.isCollected = !this.isCollected
        notify('操作失败，请稍后重试', 'error')
      })
    },
    // 检查诗词是否已收藏
    checkCollectionStatus() {
      if (!this.poem) return
      
      // 检查是否登录
      const token = getToken()
      if (token) {
        // 已登录，从API获取收藏状态
        request(`/collections/check/${this.poem.id}`, {
          timeout: TIMEOUTS.SHORT
        })
        .then(data => {
          this.isCollected = data.success ? data.data.is_collected : false
        })
        .catch(error => {
          console.error('检查收藏状态失败:', error)
          this.isCollected = false
        })
      } else {
        // 未登录，默认为未收藏
        this.isCollected = false
      }
    },

    // 获取诗词创作背景
    async fetchPoemBackground() {
      if (!this.poem || this.poemBackgroundLoading) return
      this.poemBackgroundLoading = true
      this.poemBackgroundError = ''

      try {
        this.poemBackground = ''
        await streamAI({
          type: 'background', poem: this.poem.content, title: this.poem.title,
          author: this.poem.author, dynasty: this.poem.dynasty
        }, {
          timeout: TIMEOUTS.LONG,
          onToken: (_token, fullText) => { this.poemBackground = fullText }
        })
        this.poemBackgroundTips = '边读背景，边回看诗句，更容易把握诗人的情感。'
      } catch (error) {
        console.error('获取诗词背景失败:', error)
        this.poemBackground = this.getBuiltinBackground(this.poem.title, this.poem.author, this.poem.dynasty)
        this.poemBackgroundTips = '了解创作背景有助于理解诗词的情感和意境，更好地背诵和鉴赏。'
      } finally {
        this.poemBackgroundLoading = false
      }
    },

    // 获取内置诗词背景数据
    getBuiltinBackground(title, author, dynasty) {
      const backgrounds = {
        '静夜思': `《静夜思》是唐代诗人李白的名作，写于唐玄宗开元十四年（726年）。当时李白26岁，离开家乡四川赴扬州游历，在一个秋夜月明之时，诗人抬头望月，思念远方的故乡，写下了这首千古传诵的五言绝句。`,
        '春晓': `《春晓》是唐代诗人孟浩然的名作。这首诗描写了春天清晨的景象，诗人通过"春眠不觉晓，处处闻啼鸟"的亲身感受，表达了对春光易逝的珍惜之情。全诗语言平易浅近，情景交融。`,
        '登鹳雀楼': `《登鹳雀楼》由唐代诗人王之涣创作，写诗人登上鹳雀楼远眺的所见所感。此楼位于山西永济，因常有鹳雀栖息而得名。诗中既写了壮阔的山河景色，又表达了"欲穷千里目，更上一层楼"的哲理。`,
        '悯农': `《悯农》是唐代诗人李绅的作品，共两首，此为其二。诗中描写了农民在烈日下锄禾的艰辛，表达了诗人对劳动人民的深切同情，警示人们珍惜粮食，具有深刻的社会意义。`,
        '咏鹅': `《咏鹅》是唐代诗人骆宾王七岁时所作。相传诗人童年在义乌县城南一个小池塘边玩耍，看到白鹅在水中悠闲游弋，即景写下了这首咏物诗，成为中国诗歌史上最著名的儿童诗作之一。`
      }
      return backgrounds[title] || `《${title}》是${dynasty || '唐'}代诗人${author || '佚名'}的作品。这首诗以其独特的艺术魅力流传至今，表达了诗人对自然、生命或社会的深刻感悟。了解这首诗的创作背景，有助于我们更好地理解诗人的情感世界和诗歌的深层含义。`
    },

    // 获取诗词趣味故事
    async fetchPoemStory() {
      if (!this.poem || this.poemStoryLoading) return
      this.poemStoryLoading = true
      this.poemStoryError = ''

      try {
        this.poemStory = ''
        await streamAI({
          type: 'story', poem: this.poem.content, title: this.poem.title,
          author: this.poem.author
        }, {
          timeout: TIMEOUTS.LONG,
          onToken: (_token, fullText) => { this.poemStory = fullText }
        })
      } catch (error) {
        console.error('获取诗词故事失败:', error)
        this.poemStory = this.getBuiltinStory(this.poem.title, this.poem.author)
      } finally {
        this.poemStoryLoading = false
      }
    },

    // 获取内置诗词故事数据
    getBuiltinStory(title, author) {
      const stories = {
        '静夜思': `相传李白年轻时离开家乡漫游四方，一年秋天，他在扬州一家客栈中辗转难眠。推开窗户，一轮明月当空，洒下如霜的清辉。诗人想起远在千里之外的父母妻儿，思念之情涌上心头，于是挥笔写下了这首流传千古的《静夜思》。有趣的是，诗句中的"举头望明月"据记载最初写的是"举头望山月"，后人才改成了我们现在熟悉的版本。`,
        '春晓': `孟浩然是唐代著名的山水田园诗人，但他一生布衣，未曾入仕。一年春天，诗人隐居在鹿门山，一日清晨从睡梦中醒来，听到窗外鸟鸣声声，春雨过后的清晨格外清新。诗人惋惜昨夜的风雨不知打落了多少花瓣，于是写下了这首充满惜春之情的小诗。整首诗没有一个"喜"字，却处处透着对春光的爱惜。`,
        '登鹳雀楼': `王之涣是唐代著名的边塞诗人，但这首《登鹳雀楼》却是一首登临楼阁的即景抒怀之作。传说鹳雀楼建成后吸引了许多文人墨客前来题诗，王之涣与友人打赌说："我写的诗将来一定最受欢迎。"说罢挥笔写下此诗，果然成为千古绝唱。诗的后两句"欲穷千里目，更上一层楼"更是成为激励人们不断进取的千古名言。`
      }
      return stories[title] || `关于《${title}》的创作，背后还有一个鲜为人知的故事。据传${author || '诗人'}在创作此诗时，正值人生的一个重要转折点。诗人将对自然景物的细致观察与内心深处的情感完美融合，创作出了这首意境深远、情感真挚的作品。细细品读，我们仿佛能看到诗人当时创作时的神情，感受到那颗对生活充满热爱的心。`
    },

    // 获取诵读技巧指南
    async fetchRecitationGuide() {
      if (!this.poem || this.recitationGuideLoading) return
      this.recitationGuideLoading = true
      this.recitationGuideError = ''

      try {
        this.recitationGuideMarkdown = ''
        await streamAI({
          type: 'recitation-guide', poem: this.poem.content, title: this.poem.title,
          author: this.poem.author, dynasty: this.poem.dynasty
        }, {
          timeout: TIMEOUTS.LONG,
          onToken: (_token, fullText) => { this.recitationGuideMarkdown = fullText }
        })
      } catch (error) {
        console.error('获取诵读技巧失败:', error)
        const guide = this.getBuiltinRecitationGuide(this.poem.title, this.poem.content)
        this.recitationGuide = guide
        this.recitationGuideMarkdown = [
          '### 节奏停顿',
          guide.rhythm,
          '### 情感把控',
          guide.emotion,
          '### 练习技巧',
          ...guide.tips.map((tip) => `- ${tip}`)
        ].join('\n\n')
      } finally {
        this.recitationGuideLoading = false
      }
    },

    // 获取内置诵读技巧数据
    getBuiltinRecitationGuide(title, content) {
      const lines = (content || '').split('\n').filter(l => l.trim())
      const isFive = lines[0] && lines[0].length <= 7
      const poemType = isFive ? '五言' : '七言'

      return {
        rhythm: `这首${poemType}${poemType === '五言' ? '绝句' : '律诗'}的节奏一般为${isFive ? '221' : '2221'}式。例如第一句朗读时要注意在第二个字后稍作停顿，形成"${lines[0] ? lines[0].slice(0, 2) + '，' + lines[0].slice(2) : ''}"的节奏感。`,
        emotion: `朗诵时要注意"起承转合"的情感变化：起句要平缓引入，承句要自然承接，转句要情感递进，合句要收束有力。读的过程中要注意轻重缓急，不要一味平铺直叙。`,
        tips: [
          '先理解诗意，再带着情感朗读，效果会更好',
          '注意诗句的押韵字，朗读时适当延长韵脚的读音',
          '可以配合手势和表情，增强朗诵的感染力',
          '反复练习，注意每句最后一个字的声调变化'
        ]
      }
    },

    // 记录学习时长
    recordStudyTime(studyTime) {
      if (!this.poem) {
        console.error('记录学习时长失败: 诗词信息不存在')
        return
      }
      
      // 检查是否登录
      const token = getToken()
      if (token) {
        console.log('已登录，发送学习时长到后端:', studyTime, '分钟')
        // 已登录，发送学习时长到后端
        request('/learning/record', {
          method: 'POST',
          body: JSON.stringify({
            poem_id: this.poem.id,
            action: 'study_time',
            score: studyTime
          }),
          timeout: TIMEOUTS.SHORT
        })
        .then(data => {
          console.log('学习时长记录响应数据:', data)
          if (data.success) {
            console.log('学习时长记录成功:', studyTime, '分钟')
          } else {
            console.error('学习时长记录失败:', data.message)
          }
        })
        .catch(error => {
          console.error('学习时长记录失败:', error)
        })
      } else {
        console.log('未登录，不记录学习时长')
      }
    },
    // 记录学习历史
    async recordLearning(action = 'view', score = null) {
      if (!this.poem) {
        console.error('记录学习行为失败: 诗词信息不存在')
        return
      }
      
      console.log('记录学习行为:', action, score)
      
      // 检查是否登录
      const token = localStorage.getItem('token')
      if (token) {
        console.log('已登录，发送学习行为到后端')
        try {
          const data = await request('/learn/record', {
            method: 'POST',
            body: JSON.stringify({
              poem_id: this.poem.id,
              action,
              score
            }),
            timeout: TIMEOUTS.SHORT
          })
          console.log('学习行为记录响应数据:', data)
          if (data.success) {
            console.log('学习行为记录成功:', action, score)
          } else {
            console.error('学习行为记录失败:', data.message)
          }
        } catch (error) {
          // 网络请求失败，不抛出错误，避免影响用户体验
          console.error('学习行为记录失败:', error)
        }
      } else {
        console.log('未登录，不记录学习行为到后端')
      }
      
      // 同时保存到本地存储作为备份
      let learnedPoems = []
      try {
        const stored = JSON.parse(localStorage.getItem('learnedPoems') || '[]')
        learnedPoems = Array.isArray(stored) ? stored : []
      } catch (error) {
        console.warn('学习记录缓存格式无效，已重新初始化:', error)
      }
      const alreadyLearned = learnedPoems.some(record => record.id === this.poem.id)
      
      if (!alreadyLearned) {
        learnedPoems.push({
          id: this.poem.id,
          timestamp: new Date().toISOString()
        })
        localStorage.setItem('learnedPoems', JSON.stringify(learnedPoems))
        console.log('学习行为保存到本地存储')
      }
    },
    // 根据得分获取样式类
    getScoreClass(score) {
      if (score >= 90) return 'score-excellent';
      if (score >= 70) return 'score-good';
      if (score >= 50) return 'score-average';
      return 'score-poor';
    },
    // 根据得分获取消息
    getScoreMessage(score) {
      if (score >= 90) return '🎉 太棒了！';
      if (score >= 70) return '👍 做得不错！';
      if (score >= 50) return '💪 继续努力！';
      return '📚 加油！';
    },
    // 一键添加背诵错误到错题本
    async addReciteToWrongBook() {
      if (!this.reciteResult || this.reciteResult.score >= 100) return;

      const token = localStorage.getItem('token');
      if (!token) {
        this.$router.push('/login');
        return;
      }

      this.addingToWrongBook = true;

      try {
        // 构建错题描述（整合错字、漏字、多字）
        const wrongParts = [];
        if (this.reciteResult.wrongChars && this.reciteResult.wrongChars.length > 0) {
          wrongParts.push(`错字：${this.reciteResult.wrongChars.map(e => `"${e.input}"→"${e.original}"`).join('、')}`);
        }
        if (this.reciteResult.missing && this.reciteResult.missing.length > 0) {
          wrongParts.push(`漏字：${this.reciteResult.missing.map(e => `"${e.char}"`).join('、')}`);
        }
        if (this.reciteResult.extra && this.reciteResult.extra.length > 0) {
          wrongParts.push(`多字：${this.reciteResult.extra.map(e => `"${e.char}"`).join('、')}`);
        }
        const wrongDesc = wrongParts.join('；');

        await request('/wrong-questions/add', {
          method: 'POST',
          body: JSON.stringify({
            question: `【背诵检测】${this.poem.title}（${this.poem.author}）`,
            answer: this.poem.content,
            user_answer: this.reciteInput,
            full_poem: this.poem.content,
            author: this.poem.author,
            title: this.poem.title,
            poem_id: this.poem.id,
            extra_data: {
              score: this.reciteResult.score,
              wrongDesc: wrongDesc,
              aiAdvice: this.reciteResult.aiAdvice,
              reciteInput: this.reciteInput
            }
          }),
          timeout: TIMEOUTS.SHORT
        });
        this.wrongBookAdded = true;
        this.sceneImageToast = {
          show: true,
          message: '已加入错题本，记得复习哦！',
          type: 'success'
        };
        setTimeout(() => {
          this.sceneImageToast.show = false;
        }, 3000);
      } catch (error) {
        console.error('添加错题失败:', error);
        this.sceneImageToast = {
          show: true,
          message: '添加失败，请稍后重试',
          type: 'error'
        };
        setTimeout(() => {
          this.sceneImageToast.show = false;
        }, 3000);
      } finally {
        this.addingToWrongBook = false;
      }
    },
    // 滚动聊天窗口到底部
    scrollToBottom() {
      if (this.$refs.chatMessagesContainer) {
        const container = this.$refs.chatMessagesContainer;
        container.scrollTop = container.scrollHeight;
      }
    },
    // 发送AI助教消息
    async sendTutorMessage() {
      if (!this.tutorQuestion.trim() || this.tutorLoading) return;
      
      const question = this.tutorQuestion.trim();
      // 添加用户消息
      this.tutorMessages.push({
        role: 'user',
        content: question
      });
      this.tutorQuestion = '';
      this.tutorLoading = true;
      
      // 发送消息后滚动到底部
      this.$nextTick(() => {
        this.scrollToBottom();
      });
      
      try {
        // 准备历史消息
        const history = this.tutorMessages.slice(-6).map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        const botMessage = { role: 'bot', content: '' }
        this.tutorMessages.push(botMessage)
        await streamAI({
          type: 'tutor', poem: this.poem.content, title: this.poem.title,
          author: this.poem.author, question, history
        }, {
          timeout: TIMEOUTS.LONG,
          onToken: (_token, fullText) => { botMessage.content = fullText }
        })
      } catch (error) {
        console.error('发送AI助教消息失败:', error);
        // 添加错误消息
        this.tutorMessages.push({
          role: 'bot',
          content: '抱歉，我暂时无法回答你的问题，请稍后再试。'
        });
      } finally {
        this.tutorLoading = false;
        // 接收回复后滚动到底部
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    },
    
    // 开始背诵模式（输入框获得焦点时）
    startRecitationMode() {
      this.recitationMode = true;
    },
    
    // 停止背诵模式（输入框失去焦点时）
    stopRecitationMode() {
      if (!this.reciteInput.trim()) {
        this.recitationMode = false;
      }
    },
    
    // 处理头像加载失败
    handleAvatarError() {
      console.warn('诗人头像加载失败，使用默认头像');
      const author = this.poem?.author || '';
      this.authorAvatar = this.getDefaultAvatar(author);
      // 清除缓存，下次重新获取
      const CACHE_VERSION = 'v2';
      const cacheKey = `author_avatar_${CACHE_VERSION}_${author}`;
      localStorage.removeItem(cacheKey);
    },
    
    // 获取诗人头像：全部使用项目内静态资源，未知诗人使用统一兜底画像。
    async getAuthorAvatar(author) {
      return BUILTIN_AUTHOR_AVATARS[author] || this.getDefaultAvatar(author)
    },
    
    // 只清理一次旧版本的诗人头像缓存
    clearOldAuthorAvatarCacheOnce(currentVersion) {
      const CLEANUP_FLAG = `author_avatar_cleanup_${currentVersion}`;
      if (localStorage.getItem(CLEANUP_FLAG)) {
        return;
      }
      
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('author_avatar_') && !key.includes(`_${currentVersion}_`) && !key.includes('cleanup_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        if (keysToRemove.length > 0) {
          console.log('已清理旧版诗人头像缓存:', keysToRemove.length, '个');
        }
        localStorage.setItem(CLEANUP_FLAG, 'done');
      } catch (e) {
        console.warn('清理缓存失败:', e);
      }
    },
    
    // 获取默认头像
    getDefaultAvatar(author) {
      return DEFAULT_AUTHOR_PORTRAIT;
    },
    
    // 获取诗人简介
    getAuthorBio(author) {
      const authorBios = {
        '李白': '李白（701年—762年），字太白，号青莲居士，又号“谪仙人”，唐代伟大的浪漫主义诗人，被后人誉为“诗仙”，与杜甫并称为“李杜”。其诗风格豪放飘逸，想象丰富，语言流转自然，音律和谐多变。',
        '杜甫': '杜甫（712年—770年），字子美，自号少陵野老，唐代伟大的现实主义诗人，与李白合称“李杜”。被后人称为“诗圣”，他的诗被称为“诗史”。其诗风格沉郁顿挫，反映社会现实，关心民生疾苦。',
        '孟浩然': '孟浩然（689年—740年），字浩然，号孟山人，唐代著名的山水田园派诗人，世称“孟襄阳”。其诗风格清淡自然，多写山水田园风光和隐居生活。',
        '王维': '王维（701年—761年），字摩诘，号摩诘居士，唐代诗人、画家，以山水田园诗著称，有“诗佛”之称。其诗风格清新淡雅，意境深远，常融入禅意。',
        '杜牧': '杜牧（803年—852年），字牧之，号樊川居士，唐代杰出的诗人、散文家，与李商隐并称“小李杜”。其诗风格俊爽清丽，多写咏史、抒情之作。',
        '李商隐': '李商隐（约813年—约858年），字义山，号玉谿生，唐代著名诗人，与杜牧合称“小李杜”。其诗风格深情绵邈，意象朦胧，多写爱情、身世之感。',
        '王之涣': '王之涣（688年—742年），字季凌，唐代诗人，以边塞诗著称。其诗风格雄奇豪放，意境开阔，代表作有《登鹳雀楼》等。',
        '刘禹锡': '刘禹锡（772年—842年），字梦得，唐代文学家、哲学家，有“诗豪”之称。其诗风格雄健爽朗，多写时事、怀古之作。',
        '白居易': '白居易（772年—846年），字乐天，号香山居士，唐代现实主义诗人，与元稹共同倡导新乐府运动。其诗风格通俗晓畅，多反映民生疾苦。',
        '柳宗元': '柳宗元（773年—819年），字子厚，唐代文学家、哲学家、散文家和思想家，唐宋八大家之一。其诗风格清峭幽远，多写山水游记和寓言。',
        '高适': '高适（704年—765年），字达夫，唐代边塞诗人，与岑参并称“高岑”。其诗风格雄浑悲壮，多写边塞风光和军旅生活。',
        '王昌龄': '王昌龄（698年—757年），字少伯，唐代边塞诗人，有“七绝圣手”之称。其诗风格雄浑悲壮，多写边塞生活和闺怨。'
      };
      return authorBios[author] || `${author}是中国古代著名诗人，具体生平事迹待补充。`;
    },
    
    // 获取相似风格诗词
    async fetchSimilarPoems() {
      if (!this.poem) return;
      
      try {
        const allPoems = await request('/poems', {
          includeAuth: false,
          timeout: TIMEOUTS.SHORT
        });
        
        // 基于风格相似性获取诗词
        this.similarPoems = allPoems
          .filter(p => p.id !== this.poem.id)
          .map(poem => {
            let similarity = 0;
            
            // 朝代相同，增加相似度
            if (poem.dynasty === this.poem.dynasty) {
              similarity += 0.5;
            }
            
            // 标签相似，增加相似度
            if (poem.tags && this.poem.tags) {
              const poemTags = Array.isArray(poem.tags) ? poem.tags : poem.tags.split(',').map(tag => tag.trim());
              const currentTags = Array.isArray(this.poem.tags) ? this.poem.tags : this.poem.tags.split(',').map(tag => tag.trim());
              const commonTags = poemTags.filter(tag => currentTags.includes(tag));
              similarity += commonTags.length * 0.2;
            }
            
            return { ...poem, similarity };
          })
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 3);
      } catch (error) {
        console.error('获取相似诗词失败:', error);
        this.similarPoems = [];
      }
    },
    
    // 导航到诗词详情页
    navigateToPoem(poemId) {
      this.$router.push(`/poem/${poemId}`);
    },
    
    // 加载诗人头像
    async loadAuthorAvatar(author) {
      if (!author) return;
      this.authorAvatar = await this.getAuthorAvatar(author);
    },

    /** 从选区起点找到所在诗句行 DOM 与行号（1-based） */
    findSelectionLineMeta(range, poemTextArea) {
      let node = range.startContainer
      let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
      while (el && el !== poemTextArea && !(el.classList && el.classList.contains('poem-line'))) {
        el = el.parentElement
      }
      if (!el || !el.classList || !el.classList.contains('poem-line')) {
        return { lineNumber: null }
      }
      const lines = poemTextArea.querySelectorAll('p.poem-line')
      const idx = Array.prototype.indexOf.call(lines, el)
      const total = this.poemLines.length
      return {
        lineNumber: idx >= 0 ? idx + 1 : null,
        totalLines: total > 0 ? total : null
      }
    },

    /** 根据 anchorRect 与 placementMode 计算工具栏 fixed 坐标（视口坐标，不用 scrollY） */
    applySelectionPopupPosition() {
      const r = this.selectionPopup.anchorRect
      if (!r) return

      const vw = window.innerWidth
      const vh = window.innerHeight
      const popupWidth = 200
      const popupHeight = 200
      const gap = 10

      let placement = this.selectionPopup.placementMode
      if (placement === 'auto') {
        placement = r.top < popupHeight + gap + 16 ? 'below' : 'above'
      }

      let x = r.left + r.width / 2
      x = Math.max(popupWidth / 2 + 8, Math.min(x, vw - popupWidth / 2 - 8))

      let y
      if (placement === 'above') {
        y = r.top - gap
      } else {
        y = r.bottom + gap
      }

      if (placement === 'below' && y + popupHeight > vh - 8) {
        y = Math.max(gap, vh - popupHeight - 8)
      }
      if (placement === 'above' && y < popupHeight + 8) {
        y = popupHeight + gap + 8
      }

      this.selectionPopup.x = x
      this.selectionPopup.y = y
      this.selectionPopup.placement = placement
    },

    setToolbarPlacement(mode) {
      if (mode !== 'auto' && mode !== 'above' && mode !== 'below') return
      this.selectionPopup.placementMode = mode
      try {
        localStorage.setItem('poemDetail.toolbarPlacement', mode)
      } catch (e) { /* ignore */ }
      if (this.selectionPopup.show && this.selectionPopup.anchorRect) {
        this.applySelectionPopupPosition()
      }
    },

    // 划词选择处理
    handleTextSelection(e) {
      if (e.type === 'mouseup' && e.button !== 0) return

      setTimeout(() => {
        const selection = window.getSelection()
        const selectedText = selection.toString().trim()
        const poemTextArea = document.querySelector('#poem-text-area')
        if (!poemTextArea || !selectedText || selectedText.length < 2) {
          this.selectionPopup.show = false
          return
        }

        const anchorNode = selection.anchorNode
        if (!anchorNode) {
          this.selectionPopup.show = false
          return
        }

        const container = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode
        if (!container || !poemTextArea.contains(container)) {
          this.selectionPopup.show = false
          return
        }

        if (!/[\u4e00-\u9fa5]/.test(selectedText)) {
          this.selectionPopup.show = false
          return
        }

        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) {
          this.selectionPopup.show = false
          return
        }

        const { lineNumber, totalLines } = this.findSelectionLineMeta(range, poemTextArea)

        this.selectionPopup.anchorRect = {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        }
        this.selectionPopup.selectedText = selectedText
        this.selectionPopup.lineNumber = lineNumber
        this.selectionPopup.totalLines = totalLines
        this.selectionPopup.show = true
        this.applySelectionPopupPosition()
      }, 10)
    },

    // 翻译选中的诗句
    handleTranslate() {
      if (!this.selectionPopup.selectedText) return;
      const text = this.selectionPopup.selectedText;
      this.selectionPopup.show = false;
      window.getSelection().removeAllRanges();

      // 将选中的诗句发送给AI助教
      const question = `请翻译这句诗："${text}"，并简要说明其含义。`;
      this.tutorQuestion = question;
      this.sendTutorMessageWithText(question);
    },

    // 赏析选中的诗句
    handleAppreciate() {
      if (!this.selectionPopup.selectedText) return;
      const text = this.selectionPopup.selectedText;
      this.selectionPopup.show = false;
      window.getSelection().removeAllRanges();

      // 将选中的诗句发送给AI助教进行赏析
      const question = `请赏析这句诗："${text}"，从意境、修辞手法、思想感情等角度进行分析。`;
      this.tutorQuestion = question;
      this.sendTutorMessageWithText(question);
    },

    // 描绘选中诗句的画面（直接应用为背景，渐变切换）
    async handleScenePicture() {
      if (!this.selectionPopup.selectedText || this.sceneImageLoading) return;
      const text = this.selectionPopup.selectedText;

      this.selectionPopup.show = false;
      window.getSelection().removeAllRanges();
      this.sceneImageLoading = true;

      try {
        const data = await request('/ai/scene-image', {
          method: 'POST',
          body: JSON.stringify({
            poemLine: text,
            poemTitle: this.poem?.title || '古诗',
            poemAuthor: this.poem?.author || '佚名',
            lineNumber: this.selectionPopup.lineNumber,
            totalLines: this.selectionPopup.totalLines
          }),
          timeout: TIMEOUTS.LONG
        });

        if (data.success && data.url) {
          this.applyBackgroundImage(data.url);
          this.sceneImageToast = { show: true, message: '意境渐染，画面已更新', type: 'success' };
        } else {
          this.sceneImageToast = {
            show: true,
            message: data.message || '意境图生成失败，请稍后重试',
            type: 'error'
          };
        }
      } catch (error) {
        console.error('意境图生成失败:', error);
        this.sceneImageToast = { show: true, message: '意境图生成失败，请稍后重试', type: 'error' };
      } finally {
        this.sceneImageLoading = false;
        // 3秒后自动隐藏toast
        setTimeout(() => {
          this.sceneImageToast.show = false;
        }, 3000);
      }
    },

    // 发送带有文本的助教消息
    async sendTutorMessageWithText(question) {
      if (!question.trim() || this.tutorLoading) return;

      // 添加用户消息
      this.tutorMessages.push({
        role: 'user',
        content: question
      });
      this.tutorLoading = true;

      // 发送消息后滚动到底部
      this.$nextTick(() => {
        this.scrollToBottom();
      });

      try {
        const history = this.tutorMessages.slice(-8).map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        const botMessage = { role: 'bot', content: '' }
        this.tutorMessages.push(botMessage)
        await streamAI({
          type: 'tutor', poem: this.poem.content, title: this.poem.title,
          author: this.poem.author, question, history
        }, {
          timeout: TIMEOUTS.LONG,
          onToken: (_token, fullText) => { botMessage.content = fullText }
        })
      } catch (error) {
        console.error('发送AI助教消息失败:', error);
        this.tutorMessages.push({
          role: 'bot',
          content: '抱歉，我暂时无法回答你的问题，请稍后再试。'
        });
      } finally {
        this.tutorLoading = false;
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    }
  }
}
</script>


<style scoped>
/* Poetry typography and streamed Markdown layer. */
.poem-detail {
  --poetry-serif: 'Noto Serif SC', 'Source Han Serif SC', 'Source Han Serif CN', 'Songti SC', 'STSong', 'SimSun', serif;
  --poetry-sans: 'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', system-ui, sans-serif;
  --poetry-paper: rgba(255, 253, 245, .72);
  --poetry-rule: rgba(157, 118, 62, .22);
  font-family: var(--poetry-sans);
  font-optical-sizing: auto;
  text-rendering: optimizeLegibility;
}

.poem-detail .section-heading h2,
.poem-detail .action-card h2,
.poem-detail .story-card h2,
.poem-detail .poem-line,
.poem-detail .cloze-poem p,
.poem-detail .similar-row strong,
.poem-detail .poet-profile-body h3 {
  font-family: var(--poetry-serif) !important;
}

.poem-detail .poem-line {
  font-kerning: normal;
  text-wrap: balance;
}

.poem-detail .stream-markdown,
.poem-detail .generated-copy,
.poem-detail .personalized-result {
  color: #304d49 !important;
  font-family: var(--poetry-serif) !important;
  font-size: 14px !important;
  font-weight: 400;
  line-height: 1.88 !important;
  letter-spacing: .018em;
  overflow-wrap: anywhere;
}

.poem-detail .action-card.has-generated-content {
  height: auto !important;
  min-height: 270px !important;
}

.poem-detail .action-card.has-generated-content > * {
  max-width: min(76%, 760px) !important;
}

.poem-detail .action-card.has-generated-content .generated-copy,
.poem-detail .action-card.has-generated-content .personalized-result {
  width: 100%;
  max-height: 360px !important;
  padding: 18px 20px !important;
  border: 1px solid rgba(255, 255, 255, .68);
  background: linear-gradient(135deg, rgba(255, 254, 249, .72), rgba(240, 247, 243, .58)) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .8);
}

.poem-detail .story-card.has-generated-content {
  min-height: 310px !important;
}

.poem-detail .story-card.has-generated-content > * {
  max-width: 72% !important;
}

.poem-detail .story-card.has-generated-content .generated-copy {
  width: 100% !important;
  max-height: 190px !important;
  padding: 13px 15px !important;
  border: 1px solid rgba(255, 255, 255, .62);
  background: var(--poetry-paper) !important;
}

.poem-detail .chat-bubble {
  font-family: var(--poetry-serif) !important;
  font-size: 14px !important;
  line-height: 1.78 !important;
}

.poem-detail .chat-bubble.user {
  font-family: var(--poetry-sans) !important;
}

.poem-detail .stream-markdown :deep(h1),
.poem-detail .stream-markdown :deep(h2),
.poem-detail .stream-markdown :deep(h3),
.poem-detail .stream-markdown :deep(h4) {
  position: relative;
  margin: 1.25em 0 .55em;
  color: #173f3a;
  font-family: var(--poetry-serif);
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: .055em;
}

.poem-detail .stream-markdown :deep(h1:first-child),
.poem-detail .stream-markdown :deep(h2:first-child),
.poem-detail .stream-markdown :deep(h3:first-child),
.poem-detail .stream-markdown :deep(h4:first-child) {
  margin-top: 0;
}

.poem-detail .stream-markdown :deep(h1) { font-size: 1.35em; }
.poem-detail .stream-markdown :deep(h2) { font-size: 1.22em; }
.poem-detail .stream-markdown :deep(h3) { font-size: 1.12em; }
.poem-detail .stream-markdown :deep(h4) { font-size: 1.04em; }

.poem-detail .stream-markdown :deep(h2::before),
.poem-detail .stream-markdown :deep(h3::before) {
  content: '';
  display: inline-block;
  width: .3em;
  height: .9em;
  margin-right: .55em;
  border-radius: 999px;
  background: linear-gradient(180deg, #2b8175, #ba8645);
  vertical-align: -.05em;
}

.poem-detail .stream-markdown :deep(p) {
  margin: .55em 0;
}

.poem-detail .stream-markdown :deep(strong) {
  color: #1d6259;
  font-weight: 650;
}

.poem-detail .stream-markdown :deep(em) {
  color: #8b6334;
  font-style: normal;
}

.poem-detail .stream-markdown :deep(ul),
.poem-detail .stream-markdown :deep(ol) {
  margin: .65em 0 .8em;
  padding-left: 1.65em;
}

.poem-detail .stream-markdown :deep(li) {
  margin: .32em 0;
  padding-left: .18em;
}

.poem-detail .stream-markdown :deep(li::marker) {
  color: #a9783f;
  font-weight: 600;
}

.poem-detail .stream-markdown :deep(blockquote) {
  margin: .85em 0;
  padding: .7em 1em .75em 1.15em;
  border: 0;
  border-left: 3px solid rgba(178, 126, 62, .62);
  border-radius: 0 10px 10px 0;
  color: #586c67;
  background: linear-gradient(90deg, rgba(248, 239, 215, .72), rgba(248, 244, 229, .3));
}

.poem-detail .stream-markdown :deep(blockquote p) {
  margin: 0;
}

.poem-detail .stream-markdown :deep(hr) {
  height: 1px;
  margin: 1.1em 0;
  border: 0;
  background: linear-gradient(90deg, transparent, var(--poetry-rule) 18% 82%, transparent);
}

.poem-detail .stream-markdown :deep(a) {
  color: #1c756a;
  text-decoration-color: rgba(28, 117, 106, .35);
  text-underline-offset: .2em;
}

.poem-detail .stream-markdown :deep(code) {
  padding: .12em .38em;
  border: 1px solid rgba(157, 118, 62, .18);
  border-radius: 5px;
  color: #7c5730;
  background: rgba(249, 241, 221, .72);
  font-family: var(--poetry-sans);
  font-size: .88em;
}

.poem-detail .stream-markdown :deep(pre) {
  overflow: auto;
  padding: 12px 14px;
  border: 1px solid rgba(48, 91, 84, .14);
  border-radius: 10px;
  background: rgba(237, 244, 241, .82);
}

.poem-detail .stream-markdown :deep(pre code) {
  padding: 0;
  border: 0;
  background: transparent;
}

.poem-detail .stream-markdown :deep(table) {
  width: 100%;
  margin: .8em 0;
  border-collapse: collapse;
  font-family: var(--poetry-sans);
  font-size: .9em;
}

.poem-detail .stream-markdown :deep(th),
.poem-detail .stream-markdown :deep(td) {
  padding: .55em .7em;
  border-bottom: 1px solid rgba(45, 100, 92, .14);
  text-align: left;
}

.poem-detail .stream-markdown :deep(th) {
  color: #235f57;
  background: rgba(224, 239, 232, .58);
  font-weight: 600;
}

.poem-detail .is-streaming::after {
  content: '';
  display: inline-block;
  width: 2px;
  height: 1.05em;
  margin-left: 4px;
  border-radius: 2px;
  background: #b47b3a;
  vertical-align: -.12em;
  animation: poetry-stream-caret .85s steps(1, end) infinite;
}

.poem-detail .generated-copy,
.poem-detail .chat-scroll,
.poem-detail .personalized-result {
  scrollbar-width: thin;
  scrollbar-color: rgba(45, 112, 104, .28) transparent;
}

.poem-detail .generated-copy::-webkit-scrollbar,
.poem-detail .chat-scroll::-webkit-scrollbar,
.poem-detail .personalized-result::-webkit-scrollbar {
  width: 6px;
}

.poem-detail .generated-copy::-webkit-scrollbar-thumb,
.poem-detail .chat-scroll::-webkit-scrollbar-thumb,
.poem-detail .personalized-result::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(45, 112, 104, .24);
}

@keyframes poetry-stream-caret {
  0%, 48% { opacity: 1; }
  49%, 100% { opacity: .18; }
}

@media (max-width: 720px) {
  .poem-detail .stream-markdown,
  .poem-detail .generated-copy,
  .poem-detail .personalized-result,
  .poem-detail .chat-bubble {
    font-size: 14px !important;
    line-height: 1.82 !important;
  }

  .poem-detail .action-card.has-generated-content,
  .poem-detail .story-card.has-generated-content {
    min-height: 0 !important;
  }

  .poem-detail .action-card.has-generated-content > *,
  .poem-detail .story-card.has-generated-content > * {
    max-width: 100% !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .poem-detail .is-streaming::after { animation: none; }
}
</style>



<style scoped>
/* 详情页场景层：仅保留当前页面实际使用的背景与浮层样式。 */
.poem-detail {
  --ink: #173c3b;
  --paper: rgba(250, 248, 239, .74);
  --line: rgba(255, 255, 255, .64);
  position: relative;
  z-index: 0;
  min-height: 100dvh;
  margin: 0 auto;
  color: var(--ink);
  font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  isolation: isolate;
}

.poem-detail::before {
  content: '';
  position: absolute;
  top: 232px;
  left: -12%;
  width: 38%;
  height: 230px;
  pointer-events: none;
  opacity: .35;
  background: radial-gradient(ellipse, rgba(240, 194, 121, .38), transparent 68%);
  filter: blur(22px);
  z-index: -1;
}

.poem-detail::after {
  content: '山水有清音';
  position: absolute;
  right: -28px;
  top: 270px;
  color: rgba(236, 240, 226, .6);
  font-family: 'Noto Serif SC', 'Songti SC', serif;
  font-size: clamp(28px, 3vw, 52px);
  writing-mode: vertical-rl;
  letter-spacing: .35em;
  pointer-events: none;
  z-index: -1;
}

.immersive-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
  background: #aebeb4;
}

.background-container,
.background-container::before,
.background-container::after,
.default-background,
.ancient-style-bg,
.background-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.background-container::before {
  content: '';
  z-index: 3;
  background:
    linear-gradient(180deg, rgba(23, 59, 57, .2) 0%, rgba(245, 238, 218, .04) 42%, rgba(26, 61, 58, .18) 100%),
    linear-gradient(90deg, rgba(21, 54, 54, .18), transparent 42%, rgba(233, 190, 121, .1));
}

.background-container::after {
  content: '';
  z-index: 4;
  opacity: .32;
  background-image: radial-gradient(rgba(255, 255, 255, .28) .7px, transparent .7px);
  background-size: 4px 4px;
  mix-blend-mode: soft-light;
}

/* 生成图就绪后直接展示原图，不再叠加全屏洗色和颗粒层。 */
.immersive-background.has-generated-background .background-container::before,
.immersive-background.has-generated-background .background-container::after {
  display: none;
}

.default-background {
  z-index: 0;
  background: #b9c7bf;
}

.ancient-style-bg {
  opacity: 1;
  background:
    linear-gradient(120deg, rgba(37, 84, 78, .3), rgba(224, 237, 229, .1) 42%, rgba(224, 185, 117, .2)),
    url('../assets/poetry-landscape-scroll-v2.png') center 28% / cover no-repeat;
  filter: saturate(.72) contrast(.9) brightness(1.04);
}

.background-image {
  z-index: 1;
  object-fit: cover;
  opacity: 0;
  filter: saturate(.78) contrast(.93) brightness(.92);
  transform: scale(1.04);
  transition: opacity 1.2s ease, transform 8s ease;
  will-change: transform, opacity;
  backface-visibility: hidden;
}

.background-image.fade-in {
  opacity: 1;
  transform: scale(1);
}

.loading-overlay {
  z-index: 2;
  background: transparent;
}

.selection-popup {
  z-index: 100;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .76) !important;
  border-radius: 16px !important;
  background: rgba(244, 249, 243, .9) !important;
  box-shadow: 0 18px 38px rgba(22, 62, 56, .18) !important;
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}

.scene-toast {
  z-index: 120;
  border-radius: 999px !important;
  background: rgba(31, 82, 72, .88) !important;
  box-shadow: 0 12px 28px rgba(20, 59, 53, .2) !important;
}

@media (max-width: 620px) {
  .poem-detail::after { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .background-image {
    transition: opacity .2s ease;
    transform: none;
    animation: none !important;
  }
}
</style>


<style scoped>
/* Current poetry detail layout system. */
.poem-detail{
  --poetry-text-primary:#173432;
  --poetry-text-secondary:#49645f;
  --poetry-text-muted:#6f837f;
  --glass-bg:rgba(244,249,247,.58);
  --glass-bg-strong:rgba(250,252,250,.7);
  --glass-border:rgba(255,255,255,.74);
  --glass-shadow:0 15px 38px rgba(27,68,62,.12),inset 0 1px 0 rgba(255,255,255,.8);
  --radius-page-card:22px;
  --radius-inner-card:16px;
  --radius-button:999px;
  --accent-primary:#24786f;
  --accent-primary-hover:#1c675f;
  --accent-secondary:#b47b3a;
  --space-xs:6px;
  --space-sm:10px;
  --space-md:14px;
  --space-lg:22px;
  min-height:100dvh!important;
  padding:134px 0 150px!important;
  overflow-x:clip!important;
  color:var(--poetry-text-primary);
}
.poem-glass-shell{width:min(2000px,calc(100vw - 64px))!important;gap:14px!important;margin:0 auto!important}
.first-screen-grid{display:grid!important;grid-template-columns:minmax(0,1.265fr) minmax(0,1fr)!important;gap:14px!important;align-items:start!important}
.main-study-column,.side-study-column{display:grid!important;gap:14px!important;min-width:0}
.glass-card{border:1px solid var(--glass-border)!important;border-radius:var(--radius-page-card)!important;background:linear-gradient(135deg,rgba(250,252,250,.65),rgba(234,243,239,.48))!important;box-shadow:var(--glass-shadow)!important;backdrop-filter:blur(18px) saturate(118%)!important;-webkit-backdrop-filter:blur(18px) saturate(118%)!important}
.soft-button,.primary-pill,.gold-pill{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;width:auto!important;min-height:40px!important;padding:8px 20px!important;border-radius:var(--radius-button)!important;font-size:14px!important;font-weight:600!important;line-height:1!important;white-space:nowrap!important;transition:transform .2s ease,filter .2s ease,box-shadow .2s ease!important}
.soft-button{border:1px solid rgba(255,255,255,.76)!important;color:var(--poetry-text-primary)!important;background:rgba(249,252,250,.6)!important;box-shadow:0 7px 18px rgba(25,65,59,.08),inset 0 1px 0 rgba(255,255,255,.8)!important}
.primary-pill,.gold-pill{border:0!important;color:#fff!important;box-shadow:0 8px 18px rgba(29,90,81,.2)!important}
.primary-pill:disabled,.gold-pill:disabled{opacity:.82!important;cursor:not-allowed!important}
.primary-pill{background:linear-gradient(180deg,#2a8178,#216d65)!important}.gold-pill{background:linear-gradient(180deg,#bf8b4d,#a96e2d)!important;box-shadow:0 8px 18px rgba(157,103,39,.2)!important}
.soft-button:hover:not(:disabled),.primary-pill:hover:not(:disabled),.gold-pill:hover:not(:disabled){transform:translateY(-2px)!important;filter:brightness(1.05)}
.soft-button:active:not(:disabled),.primary-pill:active:not(:disabled),.gold-pill:active:not(:disabled){transform:translateY(0) scale(.98)!important}
.arrow-pill{padding-right:8px!important}.arrow-pill>svg{display:grid;width:25px;height:25px;padding:5px;border-radius:50%;background:rgba(255,255,255,.9);color:var(--accent-primary)}.gold-pill.arrow-pill>svg{color:var(--accent-secondary)}
.section-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.section-heading>div{display:flex;align-items:center;gap:10px;color:var(--accent-primary)}
.section-heading h2,.action-card h2,.story-card h2{margin:0!important;color:var(--poetry-text-primary)!important;font:600 21px/1.25 'Noto Serif SC','Songti SC',serif!important;letter-spacing:.04em!important}.action-card h2,.story-card h2{display:flex;align-items:center;gap:9px}
.section-kicker{display:none!important}

.tutor-glass{height:247px!important;padding:18px 28px!important;overflow:hidden!important}
.tutor-body{display:grid!important;grid-template-columns:30% minmax(0,1fr)!important;gap:24px!important;height:178px!important;margin-top:12px!important}
.suggested-questions{display:grid!important;align-content:start!important;gap:7px!important;margin:0!important;padding:0 24px 0 0!important;border-right:1px solid rgba(39,91,84,.14)!important}.suggested-questions>span{margin-bottom:2px!important;color:var(--poetry-text-secondary)!important;font-size:13px!important}.suggested-questions button{width:100%!important;min-height:30px!important;padding:6px 14px!important;border:1px solid rgba(255,255,255,.7)!important;border-radius:999px!important;background:rgba(250,252,251,.58)!important;color:var(--poetry-text-secondary)!important;font-size:12px!important;text-align:left!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.suggested-questions button:hover{background:rgba(225,241,236,.8)!important;color:var(--accent-primary)!important}
.tutor-conversation{position:relative!important;display:grid!important;grid-template-rows:minmax(0,1fr) auto!important;min-width:0!important;min-height:0!important;padding-left:54px!important}.tutor-avatar{position:absolute;left:0;top:3px;display:grid;width:42px;height:42px;place-items:center;border:1px solid rgba(255,255,255,.8);border-radius:50%;background:rgba(248,252,250,.78);color:var(--accent-primary);box-shadow:0 8px 18px rgba(30,78,70,.1)}.chat-scroll{align-content:start!important;max-height:none!important;min-height:0!important;overflow:auto!important;padding:0 3px 4px!important}.chat-bubble{max-width:96%!important;padding:12px 16px!important;border:1px solid rgba(255,255,255,.68)!important;border-radius:15px!important;background:rgba(250,252,251,.58)!important;color:var(--poetry-text-secondary)!important;font-size:13px!important;line-height:1.6!important}.chat-bubble.bot:first-child{max-height:92px!important;overflow:hidden!important}.chat-compose{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important;margin-top:8px!important}.chat-compose input{height:44px!important;padding:0 18px!important;border:1px solid rgba(255,255,255,.76)!important;border-radius:14px!important;background:rgba(250,252,251,.62)!important;color:var(--poetry-text-primary)!important;font-size:13px!important}.chat-compose .primary-pill{min-width:94px!important}

.action-card{position:relative!important;isolation:isolate!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;height:151px!important;padding:22px 28px!important;gap:12px!important;overflow:hidden!important}.learning-map-card{height:145px!important}.action-card>*{position:relative;z-index:2;max-width:72%!important}.action-card p{margin:7px 0 0!important;color:var(--poetry-text-secondary)!important;font-size:13px!important;line-height:1.5!important}.action-card>.primary-pill,.action-card>.gold-pill{margin-top:auto!important;min-width:160px!important}.action-card::after{content:'';position:absolute;z-index:0;inset:0 0 0 auto;width:38%;background-position:right center;background-size:contain;background-repeat:no-repeat;opacity:.88}.analysis-card::after{background-image:url('../assets/poem-detail/analysis-scroll-v3.png')!important;mask-image:linear-gradient(90deg,transparent,#000 32%);-webkit-mask-image:linear-gradient(90deg,transparent,#000 32%)}.learning-map-card::after{background-image:url('../assets/poem-detail/learning-map.png')}

.learning-overview{margin-top:0!important}
.learning-grid,.story-card-grid,.knowledge-summary{width:100%!important;margin-right:auto!important;margin-left:auto!important}
.learning-overview,.story-card-grid,.knowledge-summary{content-visibility:auto;contain-intrinsic-size:auto 420px}
.learning-grid{display:grid!important;grid-template-columns:minmax(0,1.22fr) minmax(0,1fr)!important;gap:14px!important;align-items:start!important;margin-top:0!important}.learning-main-stack,.learning-side-stack{display:grid!important;gap:14px!important}.recitation-glass{min-height:300px!important;padding:22px 28px!important}.poet-profile-glass{min-height:246px!important;padding:22px 28px!important}.recite-assessment{min-height:314px!important;padding:22px 28px!important}.similar-glass{min-height:368px!important;padding:22px 24px!important}
.recitation-glass,.poet-profile-glass,.recite-assessment,.similar-glass{grid-column:auto!important;grid-row:auto!important}
.cloze-actions{display:flex;align-items:center;gap:18px}.auto-switch{display:inline-flex!important;align-items:center!important;gap:9px!important;color:var(--poetry-text-secondary)!important;font-size:13px!important}.auto-switch input{position:absolute!important;opacity:0!important;pointer-events:none!important}.auto-switch>span{position:relative!important;width:36px!important;height:21px!important;border-radius:999px!important;background:rgba(90,122,116,.28)!important;box-shadow:inset 0 1px 3px rgba(30,70,64,.15)!important}.auto-switch>span::after{content:'';position:absolute;top:3px;left:3px;width:15px;height:15px;border-radius:50%;background:#fff;box-shadow:0 2px 5px rgba(20,60,54,.2);transition:transform .2s ease}.auto-switch input:checked+span{background:var(--accent-primary)!important}.auto-switch input:checked+span::after{transform:translateX(15px)}
.cloze-poem{display:grid!important;grid-template-columns:1fr 1fr!important;column-gap:0!important;row-gap:10px!important;margin-top:18px!important;padding:22px 36px!important;border:1px solid rgba(255,255,255,.7)!important;border-radius:16px!important;background:rgba(250,252,251,.42)!important}.cloze-poem p{margin:0!important;color:var(--poetry-text-primary)!important;font:500 clamp(20px,1.4vw,27px)/1.7 'Noto Serif SC','Songti SC',serif!important;letter-spacing:.22em!important;white-space:nowrap!important}.cloze-blank{min-width:168px!important;padding:3px 10px!important;border:0!important;border-bottom:1px dashed rgba(39,91,84,.3)!important;border-radius:8px!important;background:rgba(255,255,255,.3)!important;color:var(--poetry-text-primary)!important;font:inherit!important;letter-spacing:.18em!important}.recitation-glass footer{display:flex!important;justify-content:space-between!important;margin-top:12px!important;color:var(--poetry-text-muted)!important;font-size:12px!important}.recitation-glass footer strong{color:var(--poetry-text-secondary)!important}
.assessment-label{margin:14px 0 6px!important;color:var(--poetry-text-primary)!important;font:500 14px 'Noto Serif SC','Songti SC',serif!important}.recite-assessment textarea{width:100%!important;height:128px!important;margin:0!important;padding:16px 18px!important;resize:none!important;border:1px solid rgba(255,255,255,.76)!important;border-radius:16px!important;background:rgba(250,252,251,.5)!important;color:var(--poetry-text-primary)!important;font-size:14px!important;line-height:1.65!important;outline:0!important}.assessment-footer{position:relative!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:10px!important;margin-top:8px!important}.assessment-footer>span{position:absolute!important;right:10px!important;top:-34px!important;color:var(--poetry-text-muted)!important;font-size:12px!important}.assessment-footer .primary-pill{min-width:144px!important}.assessment-result{margin-top:10px!important;padding:12px!important;border-radius:14px!important;background:rgba(255,255,255,.42)!important}
.poet-profile-body{display:grid!important;grid-template-columns:132px minmax(0,1fr)!important;gap:22px!important;align-items:center!important;margin-top:16px!important}.poet-profile-body img{width:132px!important;height:132px!important;border:1px solid rgba(255,255,255,.78)!important;border-radius:50%!important;object-fit:cover!important;box-shadow:0 10px 24px rgba(28,69,63,.12)!important}.poet-profile-body h3{margin:0 0 10px!important;color:var(--poetry-text-primary)!important;font:600 20px 'Noto Serif SC','Songti SC',serif!important}.weak-tags{display:flex!important;flex-wrap:wrap!important;gap:7px!important}.weak-tags span{padding:5px 11px!important;border:1px solid rgba(46,96,89,.14)!important;border-radius:999px!important;background:rgba(248,251,249,.48)!important;color:var(--poetry-text-secondary)!important;font-size:12px!important}.poet-profile-body p{margin:10px 0 0!important;color:var(--poetry-text-secondary)!important;font-size:13px!important;line-height:1.65!important}
.similar-glass{display:grid!important;align-content:start!important;gap:10px!important}.similar-row{position:relative!important;isolation:isolate!important;display:grid!important;grid-template-columns:168px minmax(0,1fr) 24px!important;align-items:center!important;min-height:82px!important;padding:12px 18px!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.66)!important;border-radius:15px!important;background:rgba(248,251,249,.42)!important;color:var(--poetry-text-primary)!important;text-align:left!important}.similar-row::after{content:'';position:absolute;z-index:-1;inset:0 0 0 auto;width:48%;background-position:right center;background-size:cover;background-repeat:no-repeat;opacity:.56;mask-image:linear-gradient(90deg,transparent,#000);-webkit-mask-image:linear-gradient(90deg,transparent,#000)}.similar-art-0::after{background-image:url('../assets/poem-detail/similar-night.png')}.similar-art-1::after{background-image:url('../assets/poem-detail/similar-spring.png')}.similar-art-2::after{background-image:url('../assets/poem-detail/similar-waterfall.png')}.similar-row span{display:grid!important;gap:4px!important}.similar-row strong{color:var(--poetry-text-primary)!important;font:600 17px 'Noto Serif SC','Songti SC',serif!important}.similar-row small{color:var(--poetry-text-secondary)!important;font-size:12px!important}.similar-row p{position:relative;z-index:2;margin:0!important;color:var(--poetry-text-secondary)!important;font-size:12px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.similar-row>svg{justify-self:end;color:var(--accent-primary)}

.story-card-grid{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:14px!important}.story-card{position:relative!important;isolation:isolate!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;min-height:210px!important;padding:24px 28px!important;overflow:hidden!important}.story-card>*{position:relative;z-index:2;max-width:66%!important}.story-card::before{content:''!important;position:absolute!important;z-index:1!important;inset:0!important;background:linear-gradient(90deg,rgba(244,249,247,.94) 0 40%,rgba(244,249,247,.54) 68%,transparent)!important}.story-card::after{content:''!important;position:absolute!important;z-index:0!important;inset:0!important;background-position:right center!important;background-size:cover!important;background-repeat:no-repeat!important;opacity:.88!important}.creation-art::after{background-image:url('../assets/poem-detail/creation-background.png')!important}.story-art::after{background-image:url('../assets/poem-detail/poetry-story.png')!important}.guide-art::after{background-image:url('../assets/poem-detail/recitation-guide.png')!important;background-size:contain!important}.story-card>p{margin:12px 0!important;color:var(--poetry-text-secondary)!important;font-size:13px!important;line-height:1.7!important}.story-card>.primary-pill,.story-card>.gold-pill,.card-button-row{margin-top:auto!important}.card-button-row{display:flex!important;flex-wrap:wrap!important;gap:8px!important}.story-card .generated-copy{max-height:94px!important;margin:8px 0!important;overflow:auto!important;font-size:12px!important}
.knowledge-summary{height:142px!important;min-height:142px!important;margin-top:0!important}
.poem-glass-shell>.learning-overview{content-visibility:auto;contain-intrinsic-block-size:103px}
.second-screen-grid{content-visibility:auto;contain-intrinsic-block-size:620px}
.story-card-grid{content-visibility:auto;contain-intrinsic-block-size:210px}
.poem-glass-shell>.knowledge-summary{content-visibility:auto;contain-intrinsic-block-size:142px}
.floating-companion{position:fixed!important;z-index:20!important;right:38px!important;bottom:24px!important;display:grid!important;grid-template-columns:150px 120px!important;align-items:end!important;width:286px!important;height:126px!important;padding:16px 8px 10px 18px!important;overflow:hidden!important}.floating-companion>div{position:relative;z-index:2;display:grid;gap:4px;align-self:center}.floating-companion span,.floating-companion strong{color:var(--poetry-text-primary);font-size:13px}.floating-companion strong{font:600 14px 'Noto Serif SC','Songti SC',serif}.floating-companion button{min-height:34px!important;margin-top:4px!important;padding-left:15px!important;font-size:12px!important}.floating-companion img{position:absolute;right:-4px;bottom:-34px;width:132px;height:152px;object-fit:contain;filter:drop-shadow(0 8px 16px rgba(23,62,56,.16))}

@media(max-width:1450px){.poem-glass-shell{width:min(1360px,calc(100vw - 48px))!important}.learning-grid,.story-card-grid,.knowledge-summary{width:100%!important}.first-screen-grid{grid-template-columns:minmax(0,1.2fr) minmax(390px,.9fr)!important}.learning-overview{overflow-x:auto}.floating-companion{right:18px}}
@media(max-width:1050px){.poem-detail{padding-top:126px!important}.first-screen-grid,.learning-grid{grid-template-columns:1fr!important}.side-study-column{grid-template-columns:1fr 1fr!important}.side-study-column>:first-child{grid-column:1/-1!important}.story-card-grid{grid-template-columns:1fr!important}.learning-overview{overflow:visible}.tutor-glass{height:auto!important}.tutor-body{height:auto!important}.floating-companion{display:none!important}}
@media(max-width:720px){.poem-detail{padding-top:150px!important}.poem-glass-shell{width:calc(100vw - 20px)!important}.side-study-column{grid-template-columns:1fr!important}.side-study-column>:first-child{grid-column:auto!important}.tutor-body{grid-template-columns:1fr!important}.suggested-questions{grid-template-columns:1fr 1fr!important;padding:0 0 12px!important;border-right:0!important;border-bottom:1px solid rgba(39,91,84,.14)!important}.suggested-questions>span{grid-column:1/-1}.tutor-conversation{padding-left:0!important;padding-top:50px!important}.cloze-poem{grid-template-columns:1fr!important;padding:18px!important}.cloze-poem p{font-size:20px!important}.poet-profile-body{grid-template-columns:88px 1fr!important}.poet-profile-body img{width:88px!important;height:88px!important}.story-card>*{max-width:76%!important}}
@media(prefers-reduced-motion:reduce){.soft-button,.primary-pill,.gold-pill,.similar-row,.digital-human nav button{transition:none!important}}

/* 2026 detail-page composition: stable two-column learning workspace */
.first-screen-grid>.main-study-column{grid-template-rows:300px 236px auto!important}
.first-screen-grid>.side-study-column{grid-template-rows:536px auto!important}
.tutor-glass{display:flex!important;flex-direction:column!important;height:536px!important;padding:22px 26px 18px!important;overflow:hidden!important}
.tutor-title-copy{display:flex!important;align-items:center!important;gap:10px!important}.tutor-title-copy>span{display:grid!important;gap:3px!important}.tutor-title-copy h2{margin:0!important}.tutor-title-copy small{color:var(--poetry-text-muted)!important;font-size:12px!important;font-weight:400!important;letter-spacing:.02em!important}
.tutor-body{display:grid!important;grid-template-columns:190px minmax(0,1fr)!important;gap:18px!important;flex:1!important;height:auto!important;min-height:0!important;margin-top:15px!important}
.tutor-conversation{display:grid!important;grid-template-rows:minmax(0,1fr) auto!important;min-height:0!important;padding:0!important}
.chat-scroll{display:flex!important;flex-direction:column!important;gap:8px!important;height:100%!important;min-height:0!important;max-height:none!important;overflow-y:auto!important;overscroll-behavior:contain!important;padding:2px 8px 8px 2px!important;scrollbar-gutter:stable!important}
.suggested-questions{display:grid!important;gap:8px!important;margin:0 0 3px!important;padding:0!important;border:0!important}.suggested-questions>span{margin:0 0 2px!important;padding:11px 14px!important;border:1px solid rgba(255,255,255,.72)!important;border-radius:15px!important;background:rgba(249,252,251,.56)!important;color:var(--poetry-text-secondary)!important;font-size:12px!important;line-height:1.55!important}.suggested-questions button{width:100%!important;min-height:35px!important;padding:7px 13px!important;border:1px solid rgba(42,91,84,.12)!important;border-radius:999px!important;background:rgba(250,252,251,.58)!important;color:var(--poetry-text-secondary)!important;font-size:12px!important;text-align:left!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;transition:background .18s ease,color .18s ease,transform .18s ease!important}.suggested-questions button:hover{background:rgba(225,241,236,.86)!important;color:var(--accent-primary)!important;transform:translateX(2px)!important}
.chat-bubble{flex:0 0 auto!important;max-width:94%!important;max-height:none!important;overflow:visible!important}.chat-bubble.user{align-self:flex-end!important}.chat-bubble.bot:first-of-type{max-height:none!important;overflow:visible!important}.chat-compose{position:relative!important;z-index:2!important;margin-top:8px!important;padding-top:10px!important;border-top:1px solid rgba(39,91,84,.1)!important}.chat-compose input{height:44px!important}.chat-compose .primary-pill{min-width:92px!important}
.learning-map-card{display:grid!important;grid-template-columns:minmax(235px,.42fr) minmax(0,1.58fr)!important;grid-template-rows:auto auto!important;align-items:start!important;height:auto!important;min-height:145px!important;padding:20px 24px!important;gap:12px 22px!important;overflow:hidden!important}.learning-map-card>div:first-child{grid-column:1!important;grid-row:1!important;align-self:start!important;max-width:none!important}.learning-map-card>.gold-pill{grid-column:1!important;grid-row:2!important;align-self:end!important;justify-self:start!important;margin:0!important}.learning-map-card>.personalized-result{position:relative!important;z-index:3!important;grid-column:2!important;grid-row:1/3!important;inset:auto!important;width:100%!important;max-width:none!important;max-height:none!important;margin:0!important;padding:17px 20px!important;overflow:visible!important}.learning-map-card.has-generated-content{min-height:190px!important}.learning-map-card.has-generated-content::after{opacity:.12!important}.personalized-loading{display:flex!important;flex-direction:column!important;justify-content:center!important;min-height:112px!important;color:var(--poetry-text-secondary)!important}.personalized-loading strong{color:var(--poetry-text-primary)!important;font:600 14px/1.5 'Noto Serif SC','Songti SC',serif!important}.personalized-loading span{font-size:12px!important}
.analysis-card{display:grid!important;grid-template-columns:minmax(190px,.42fr) minmax(0,1.58fr)!important;align-items:start!important;height:auto!important;min-height:232px!important;padding:20px 20px 20px 24px!important;gap:18px!important;overflow:hidden!important}.analysis-card>*{max-width:none!important}.analysis-card::after{opacity:.1!important;width:34%!important}.analysis-intro{display:flex!important;flex-direction:column!important;align-items:flex-start!important;min-width:0!important;min-height:190px!important}.analysis-intro h2{display:flex!important;align-items:center!important;gap:9px!important;margin:0!important}.analysis-intro p{max-width:27ch!important;margin:9px 0 12px!important;font-size:13px!important;line-height:1.65!important}.analysis-intro .primary-pill{min-height:38px!important;margin-top:auto!important;padding:8px 18px!important;font-size:13px!important}.analysis-output{position:relative!important;z-index:2!important;min-width:0!important;min-height:190px!important;overflow:visible!important;border:1px solid rgba(47,98,91,.16)!important;border-radius:15px!important;background:rgba(250,252,251,.5)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.72)!important}.analysis-output .generated-copy{width:100%!important;height:auto!important;min-height:190px!important;max-height:none!important;margin:0!important;padding:18px 20px!important;overflow:visible!important;border-radius:15px!important;background:rgba(255,255,255,.26)!important;font-size:14px!important;line-height:1.86!important;letter-spacing:.02em!important}.analysis-placeholder{display:grid!important;min-height:190px!important;place-content:center!important;gap:7px!important;padding:18px!important;text-align:center!important}.analysis-placeholder span{color:var(--poetry-text-secondary)!important;font:600 15px 'Noto Serif SC','Songti SC',serif!important}.analysis-placeholder small{max-width:32ch;color:var(--poetry-text-muted)!important;font-size:12px!important;line-height:1.65!important}
.action-card.has-generated-content:not(.analysis-card){height:auto!important;min-height:190px!important}.action-card.has-generated-content:not(.analysis-card)>*{max-width:none!important}.analysis-card.has-generated-content{height:auto!important;min-height:232px!important}.analysis-card.has-generated-content>*{max-width:none!important}
.poem-detail .action-card.learning-map-card.has-generated-content{height:auto!important;min-height:190px!important}.poem-detail .action-card.learning-map-card.has-generated-content>*{max-width:none!important}.poem-detail .action-card.learning-map-card.has-generated-content>.personalized-result{width:100%!important;max-width:none!important;max-height:none!important;overflow:visible!important}
.poem-detail .action-card.analysis-card.has-generated-content{height:auto!important;min-height:270px!important}.poem-detail .action-card.analysis-card.has-generated-content>*{max-width:none!important}.poem-detail .action-card.analysis-card.has-generated-content .analysis-output .generated-copy{height:auto!important;max-height:none!important;overflow:visible!important}
@media(max-width:1450px){.first-screen-grid>.main-study-column{grid-template-rows:auto auto auto!important}.first-screen-grid>.side-study-column{grid-template-rows:516px auto!important}.tutor-glass{height:516px!important}.tutor-body{grid-template-columns:166px minmax(0,1fr)!important}.digital-human{width:166px!important;min-width:166px!important}.analysis-card{grid-template-columns:minmax(180px,.38fr) minmax(0,1.62fr)!important}.learning-map-card{grid-template-columns:minmax(220px,.38fr) minmax(0,1.62fr)!important}}
@media(max-width:1050px){.first-screen-grid>.main-study-column,.first-screen-grid>.side-study-column{grid-template-rows:auto!important}.tutor-glass{height:520px!important}.side-study-column{display:grid!important;grid-template-columns:1fr!important}.side-study-column>:first-child{grid-column:auto!important}.analysis-card,.learning-map-card{height:auto!important}}
@media(max-width:720px){.tutor-glass{height:560px!important;padding:18px!important}.tutor-body{grid-template-columns:142px minmax(0,1fr)!important;gap:10px!important}.auto-switch{font-size:0!important}.analysis-card,.learning-map-card{grid-template-columns:1fr!important;height:auto!important;padding:18px!important}.analysis-intro{min-height:auto!important}.analysis-intro .primary-pill{margin-top:6px!important}.analysis-output{min-height:120px!important}.analysis-output .generated-copy,.analysis-placeholder{min-height:120px!important}.learning-map-card>div:first-child,.learning-map-card>.gold-pill,.learning-map-card>.personalized-result{grid-column:1!important;grid-row:auto!important}.learning-map-card>.personalized-result{position:relative!important;inset:auto!important;width:100%!important;max-width:100%!important;max-height:none!important}}
</style>
