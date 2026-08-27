<template>
  <div class="review-page">
    <!-- 页眉 -->
    <div class="review-page-header">
      <div class="header-left">
        <router-link to="/challenge" class="back-btn">
          <span class="back-icon">←</span>
          <span>返回闯关</span>
        </router-link>
      </div>
      <div class="header-center">
        <div class="page-title-wrap">
          <span class="title-icon">习</span>
          <h1 class="page-title">错题复习</h1>
        </div>
        <p class="page-subtitle">一题一题，把掌握写回记忆</p>
      </div>
      <div class="header-right">
        <router-link to="/challenge/error-book" class="error-book-link-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
          </svg>
          错题本
        </router-link>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-section">
      <div class="loading-cards">
        <div v-for="i in 3" :key="i" class="skeleton-card">
          <div class="skeleton-line wide"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line narrow"></div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="questions.length === 0" class="empty-state">
      <div class="empty-illustration">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="55" fill="rgba(107,142,35,0.08)" stroke="rgba(107,142,35,0.2)" stroke-width="2"></circle>
          <path d="M30 60L50 80L90 40" stroke="#6b8e23" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      </div>
      <h3>暂无待复习错题</h3>
      <p>太棒了！继续保持，诗词之路一帆风顺</p>
      <router-link to="/challenge" class="action-link-btn">
        去闯关练兵
      </router-link>
    </div>

    <!-- 复习主体 -->
    <div v-else class="review-body">

      <!-- 顶部进度条 -->
      <div class="progress-header glass-card">
        <div class="progress-stats">
          <div class="stat-pill total">
            <span class="pill-num">{{ questions.length }}</span>
            <span class="pill-label">总题数</span>
          </div>
          <div class="stat-pill remaining">
            <span class="pill-num">{{ questions.length - currentIndex }}</span>
            <span class="pill-label">剩余</span>
          </div>
          <div class="stat-pill mastered">
            <span class="pill-num">{{ masteredCount }}</span>
            <span class="pill-label">已掌握</span>
          </div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <span class="progress-text">{{ currentIndex + 1 }} / {{ questions.length }}</span>
        </div>
      </div>

      <!-- 题目卡片 -->
      <div class="question-area glass-card" :key="currentQuestion?.id">

        <!-- 诗词信息 -->
        <div class="poem-context" v-if="currentQuestion?.title">
          <div class="poem-info-row">
            <span class="poem-title">{{ currentQuestion.title }}</span>
            <span class="poem-author">{{ currentQuestion.author || '佚名' }}</span>
          </div>
          <div class="poem-full-text" v-if="currentQuestion.full_poem">
            <pre class="poem-pre">{{ currentQuestion.full_poem }}</pre>
          </div>
        </div>

        <!-- 题目 -->
        <div class="question-display">
          <div class="question-label-row">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
            </svg>
            <span>请回答</span>
          </div>
          <div class="question-main-text">{{ currentQuestion?.question }}</div>
          <div class="question-meta">
            <span class="meta-tag" v-if="currentQuestion.level">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
              Lv.{{ currentQuestion.level }}
            </span>
            <span class="meta-tag wrong-times">
              错误 {{ currentQuestion.wrong_count || currentQuestion.wrongTimes || 1 }} 次
            </span>
            <span class="meta-tag mastered-tag" v-if="currentQuestion.mastered === 1 || currentQuestion.mastered === true">
              已掌握
            </span>
          </div>
        </div>

        <!-- 答题输入区 -->
        <div class="answer-section" v-if="!answerResult">
          <div class="input-wrap">
            <input
              ref="answerInputRef"
              v-model="answerInput"
              type="text"
              class="answer-input-field"
              :placeholder="answerInputPlaceholder"
              @keyup.enter="submitAnswer"
              :disabled="answerSubmitting"
            />
          </div>
          <div class="action-row">
            <button class="hint-toggle-btn" @click="toggleHints" :class="{ active: showHints }">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
              </svg>
              AI提示
            </button>
            <button
              class="submit-btn"
              @click="submitAnswer"
              :disabled="!answerInput.trim() || answerSubmitting"
            >
              <span v-if="answerSubmitting">
                <span class="btn-spinner"></span>
                提交中...
              </span>
              <span v-else>提交答案</span>
            </button>
          </div>

          <!-- AI提示区 -->
          <Transition name="slide">
            <div class="hints-area" v-if="showHints">
              <div class="hints-area-header">
                <span class="hints-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                  </svg>
                  AI智能提示
                </span>
                <button
                  v-if="hints.every(h => h === null) && !hintsLoading"
                  class="generate-hints-btn"
                  @click="fetchHints"
                >
                  生成提示
                </button>
                <span v-if="hintsLoading" class="hints-loading-text">生成中...</span>
              </div>

              <div class="hints-loading-state" v-if="hintsLoading && hints.every(h => h === null)">
                <div class="mini-spinner"></div>
                <span>AI正在生成3条提示...</span>
              </div>

              <div class="hints-list" v-else-if="hints.some(h => h !== null)">
                <div
                  v-for="(hint, idx) in hints"
                  :key="idx"
                  class="hint-card"
                  :class="{ revealed: hintRevealed[idx] }"
                  @click="revealHint(idx)"
                >
                  <span class="hint-num">{{ idx + 1 }}</span>
                  <span class="hint-body" v-if="hint !== null && hintRevealed[idx]">{{ hint }}</span>
                  <span class="hint-mask" v-else-if="hint === null">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                    </svg>
                    生成中...
                  </span>
                  <span class="hint-mask" v-else>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                    </svg>
                    点击查看提示
                  </span>
                </div>
              </div>

              <div class="hints-empty" v-else>
                点击"生成提示"获取AI帮助
              </div>
            </div>
          </Transition>
        </div>

        <!-- 答题结果区 -->
        <div class="result-section" v-if="answerResult">
          <div class="result-card" :class="{ correct: answerResult.correct, wrong: !answerResult.correct }">
            <div class="result-icon-wrap">
              <svg v-if="answerResult.correct" width="52" height="52" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
              <svg v-else width="52" height="52" viewBox="0 0 24 24" fill="none">
                <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
              </svg>
            </div>

            <div class="result-content">
              <h3 class="result-heading">{{ answerResult.correct ? '回答正确！太棒了！' : '回答错误，别气馁！' }}</h3>

              <div class="answer-display">
                <div class="answer-line" v-if="!answerResult.correct">
                  <span class="answer-line-label">你的答案</span>
                  <span class="answer-line-text wrong-answer-text">{{ answerResult.userAnswer }}</span>
                </div>
                <div class="answer-line">
                  <span class="answer-line-label">正确答案</span>
                  <span class="answer-line-text correct-answer-text">{{ currentQuestion?.answer || currentQuestion?.correct_answer }}</span>
                </div>
              </div>

              <!-- AI解析 -->
              <div class="ai-explanation" v-if="aiExplanation">
                <div class="ai-exp-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                  </svg>
                  AI智能解析
                </div>
                <div class="ai-exp-text">{{ aiExplanation }}</div>
              </div>

              <!-- 掌握提示 -->
              <div class="mastered-banner" v-if="answerResult.mastered || alreadyMastered">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.874L17 11l-2.714 3.874L17 19l2.286-6.874L22 11l-2.286 6.874L17 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
                恭喜！此题已标记为已掌握！
              </div>
            </div>
          </div>

          <!-- 结果操作 -->
          <div class="result-actions">
            <button
              class="result-action-btn secondary"
              @click="deleteCurrentQuestion"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
              删除此题
            </button>

            <button
              class="result-action-btn secondary"
              @click="markMastered"
              v-if="!alreadyMastered && !answerResult.mastered"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
              标记已掌握
            </button>

            <button class="result-action-btn primary" @click="nextQuestion">
              {{ isLastQuestion ? '完成复习' : '下一题' }}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../services/api';
import { askConfirm } from '../services/appFeedback';

export default {
  name: 'WrongQuestionReview',
  setup() {
    const router = useRouter();
    const route = useRoute();

    // ---- 状态 ----
    const loading = ref(true);
    const questions = ref([]);
    const currentIndex = ref(0);
    const answerInput = ref('');
    const answerSubmitting = ref(false);
    const answerResult = ref(null);
    const alreadyMastered = ref(false);

    // 提示相关
    const showHints = ref(false);
    const hints = ref([null, null, null]);
    const hintRevealed = ref([false, false, false]);
    const hintsLoading = ref(false);
    const aiExplanation = ref('');

    const answerInputRef = ref(null);

    // ---- 计算属性 ----
    const currentQuestion = computed(() => questions.value[currentIndex.value] || null);
    const isLastQuestion = computed(() => currentIndex.value >= questions.value.length - 1);
    const progressPercent = computed(() => {
      if (questions.value.length === 0) return 0;
      return Math.round((currentIndex.value / questions.value.length) * 100);
    });
    const masteredCount = computed(() => {
      return questions.value.filter(q => q.mastered === 1 || q.mastered === true).length;
    });

    const answerInputPlaceholder = computed(() => {
      const q = currentQuestion.value;
      if (!q) return '请输入答案...';
      if (q.question && (q.question.includes('作者') || q.question.includes('谁写的') || q.question.includes('出自'))) {
        return '例如：李白、杜甫、白居易...';
      }
      if (q.question && (q.question.includes('哪一句') || q.question.includes('哪个字') || q.question.includes('填空'))) {
        return '请输入诗句或文字...';
      }
      return '请输入答案后回车提交...';
    });

    // ---- 数据加载 ----
    const loadQuestions = async () => {
      try {
        loading.value = true;
        const [questionsData, errorBookData] = await Promise.all([
          api.wrongQuestions.getQuestions(50).catch(() => []),
          api.challenge.getErrorBook().catch(() => [])
        ]);

        // 优先使用 wrongQuestions 数据，否则用 errorBook
        if (questionsData && questionsData.length > 0) {
          questions.value = questionsData;
        } else if (errorBookData && errorBookData.length > 0) {
          questions.value = errorBookData.map(item => ({
            id: item.id,
            question_id: item.question_id || item.id,
            question: item.question_content || item.question || item.q,
            answer: item.correct_answer || item.correctAnswer || item.answer,
            correct_answer: item.correct_answer || item.correctAnswer || item.answer,
            user_answer: item.user_answer || item.userAnswer,
            full_poem: item.full_poem,
            author: item.author,
            title: item.title,
            dynasty: item.dynasty,
            level: item.level,
            explanation: item.explanation,
            wrong_count: item.wrong_count || item.wrongTimes || 1,
            mastered: item.mastered
          }));
        }
      } catch (error) {
        console.error('加载错题失败:', error);
        questions.value = [];
      } finally {
        loading.value = false;
        // 如果URL有questionId参数，跳转到对应题目
        const questionId = route.query.questionId;
        if (questionId) {
          const idx = questions.value.findIndex(q => (q.id || q.question_id) === Number(questionId));
          if (idx !== -1) {
            currentIndex.value = idx;
          }
        }
        nextTick(() => answerInputRef.value?.focus());
      }
    };

    // ---- 答题 ----
    const submitAnswer = async () => {
      if (!answerInput.value.trim() || !currentQuestion.value) return;

      answerSubmitting.value = true;
      try {
        const questionId = currentQuestion.value.question_id || currentQuestion.value.id;
        const result = await api.wrongQuestions.submitAnswer(questionId, answerInput.value);

        answerResult.value = {
          ...result,
          userAnswer: answerInput.value
        };

        alreadyMastered.value = currentQuestion.value.mastered === 1 || currentQuestion.value.mastered === true;

        // 获取AI解析
        fetchAIExplanation();
      } catch (error) {
        // fallback: 简单字符串比较
        const correctAns = currentQuestion.value.answer || currentQuestion.value.correct_answer;
        const correct = answerInput.value.trim() === correctAns;
        answerResult.value = { correct, userAnswer: answerInput.value };
        alreadyMastered.value = currentQuestion.value.mastered === 1 || currentQuestion.value.mastered === true;
        fetchAIExplanation();
      } finally {
        answerSubmitting.value = false;
      }
    };

    const fetchAIExplanation = async () => {
      if (!currentQuestion.value) return;
      try {
        const result = await api.wrongQuestions.getHints({
          question: currentQuestion.value.question,
          answer: currentQuestion.value.answer || currentQuestion.value.correct_answer,
          full_poem: currentQuestion.value.full_poem,
          author: currentQuestion.value.author,
          title: currentQuestion.value.title
        });
        aiExplanation.value = result.hint1 || result.explanation || '';
      } catch (err) {
        console.warn('获取AI解析失败:', err.message);
        aiExplanation.value = '';
      }
    };

    // ---- 提示 ----
    const toggleHints = () => {
      showHints.value = !showHints.value;
      if (showHints.value && hints.value.every(h => h === null)) {
        fetchHints();
      }
    };

    const fetchHints = async () => {
      if (!currentQuestion.value) return;
      hintsLoading.value = true;
      hints.value = [null, null, null];
      hintRevealed.value = [false, false, false];

      try {
        const result = await api.wrongQuestions.getHints({
          question: currentQuestion.value.question,
          answer: currentQuestion.value.answer || currentQuestion.value.correct_answer,
          full_poem: currentQuestion.value.full_poem,
          author: currentQuestion.value.author,
          title: currentQuestion.value.title
        });
        hints.value = [result.hint1 || null, result.hint2 || null, result.hint3 || null];
        // 如果全部为null，说明API不可用，降级为默认提示
        if (hints.value.every(h => h === null)) {
          throw new Error('AI提示不可用');
        }
        hintRevealed.value = [false, false, false];
      } catch (error) {
        console.warn('获取AI提示失败，使用本地兜底提示:', error.message);
        const ans = (currentQuestion.value.answer || currentQuestion.value.correct_answer || '').trim();
        const author = (currentQuestion.value.author || '').trim();
        const ttl = (currentQuestion.value.title || '').trim();
        const poem = (currentQuestion.value.full_poem || '').trim();
        const firstLine = poem.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0] || '';
        const qText = (currentQuestion.value.question || '').trim();
        hints.value = [
          author
            ? (ttl
                ? `本题出自《${ttl}》，作者 ${author}；可先回忆该篇的常见考点（意象、典故、主旨）。`
                : `本题与诗人 ${author} 相关，可先联想其常见题材、格律与代表意象。`)
            : (firstLine
                ? `可先抓住首句意象：「${firstLine.length > 28 ? `${firstLine.slice(0, 28)}…` : firstLine}」，再对照题干问的是哪一类信息。`
                : (qText
                    ? `题干关键词：「${qText.length > 36 ? `${qText.slice(0, 36)}…` : qText}」——先明确题目在问「作者、句序、字义」中的哪一类。`
                    : '先通读题目，区分是在考作者、诗句位置、字词填空还是诗意理解。')),
          firstLine
            ? `结合全诗结构：注意各联之间如何承接；若问某字某句，优先看对仗句与押韵位置是否给出线索。`
            : '若题干提到上下句或对仗，可从词性对应、意象呼应入手缩小范围。',
          ans
            ? (ans.length <= 3
                ? `标答较短（${ans.length} 字），可逐一核对候选字在诗中的语义是否贯通。`
                : `答案首字为「${ans.charAt(0)}」，共 ${ans.length} 字；可据此在记忆中检索含该起笔的诗句。`)
            : '回忆与题干直接对应的原文表述，注意异体字与标点不影响语义时通常等价。'
        ];
        // 失败时直接显示默认提示，无需再点击
        hintRevealed.value = [true, true, true];
      } finally {
        hintsLoading.value = false;
      }
    };

    const revealHint = (idx) => {
      const newRevealed = [...hintRevealed.value];
      newRevealed[idx] = true;
      hintRevealed.value = newRevealed;
    };

    // ---- 操作 ----
    const markMastered = async () => {
      if (!currentQuestion.value) return;
      const questionId = currentQuestion.value.question_id || currentQuestion.value.id;
      try {
        await api.wrongQuestions.markAsMastered(questionId);
        alreadyMastered.value = true;
        const q = questions.value.find(q => (q.question_id || q.id) === questionId);
        if (q) q.mastered = 1;
        if (answerResult.value) {
          answerResult.value = { ...answerResult.value, mastered: true };
        }
      } catch (error) {
        console.error('标记已掌握失败:', error);
      }
    };

    const deleteCurrentQuestion = async () => {
      if (!currentQuestion.value || !await askConfirm('确定要删除这道错题吗？', { title: '删除错题', confirmText: '删除', danger: true })) return;
      const questionId = currentQuestion.value.question_id || currentQuestion.value.id;
      const itemId = currentQuestion.value.id;

      try {
        // 尝试从两个API删除
        await Promise.all([
          api.wrongQuestions.delete(questionId).catch(() => {}),
          api.challenge.removeFromErrorBook(itemId).catch(() => {})
        ]);

        questions.value.splice(currentIndex.value, 1);

        if (currentIndex.value >= questions.value.length && questions.value.length > 0) {
          currentIndex.value = questions.value.length - 1;
        }

        resetState();

        if (questions.value.length === 0) {
          // 空了，跳转到错题本
        }
      } catch (error) {
        console.error('删除错题失败:', error);
      }
    };

    const nextQuestion = async () => {
      if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++;
        resetState();
        nextTick(() => answerInputRef.value?.focus());
      } else {
        if (await askConfirm('已完成所有错题复习！继续加油！', { title: '复习完成', confirmText: '返回挑战', cancelText: '留在本页' })) {
          router.push('/challenge');
        }
      }
    };

    const resetState = () => {
      answerInput.value = '';
      answerResult.value = null;
      showHints.value = false;
      hints.value = [null, null, null];
      hintRevealed.value = [false, false, false];
      aiExplanation.value = '';
      alreadyMastered.value = currentQuestion.value?.mastered === 1 || currentQuestion.value?.mastered === true;
    };

    // ---- 生命周期 ----
    onMounted(() => {
      loadQuestions();
    });

    // 监听路由变化，支持从错题本跳转单个题目
    watch(() => route.query.questionId, (newId) => {
      if (newId && !loading.value) {
        const idx = questions.value.findIndex(q => (q.id || q.question_id) === Number(newId));
        if (idx !== -1) {
          currentIndex.value = idx;
          resetState();
        }
      }
    });

    return {
      loading, questions, currentIndex, currentQuestion, isLastQuestion,
      progressPercent, masteredCount,
      answerInput, answerSubmitting, answerResult, alreadyMastered,
      showHints, hints, hintRevealed, hintsLoading, aiExplanation,
      answerInputRef, answerInputPlaceholder,
      submitAnswer, toggleHints, fetchHints, revealHint,
      markMastered, deleteCurrentQuestion, nextQuestion
    };
  }
};
</script>

<style scoped>
/* ===== 页面基础 ===== */
.review-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px 60px;
  min-height: 100vh;
  background: linear-gradient(180deg, rgba(107,142,35,0.04) 0%, rgba(85,107,47,0.06) 100%);
}

/* ===== 页眉 ===== */
.review-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 0 20px;
  position: sticky;
  top: 0;
  background: linear-gradient(180deg, rgba(255,252,240,0.97) 0%, rgba(255,252,240,0) 100%);
  z-index: 100;
  backdrop-filter: blur(8px);
}

.header-left, .header-right { min-width: 140px; }

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  color: #8b4513;
  text-decoration: none;
  font-size: 14px;
  font-family: 'SimSun', 'STSong', serif;
  background: rgba(255,252,240,0.9);
  border: 1px solid rgba(205,133,63,0.3);
  border-radius: 20px;
  transition: all 0.25s ease;
  backdrop-filter: blur(8px);
}
.back-btn:hover {
  background: rgba(255,252,240,1);
  border-color: rgba(205,133,63,0.5);
  transform: translateY(-1px);
}

.header-center { text-align: center; }
.page-title-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, rgba(107,142,35,0.2), rgba(85,107,47,0.15));
  border: 1px solid rgba(107,142,35,0.3);
  border-radius: 8px;
  font-family: 'SimSun', serif;
  font-size: 18px;
  color: #6b8e23;
}
.page-title {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 24px;
  color: #8b4513;
  margin: 0;
  font-weight: bold;
}
.page-subtitle {
  font-family: 'SimSun', 'STSong', serif;
  color: #a0522d;
  font-size: 13px;
  margin: 4px 0 0;
}

.error-book-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  color: #6b8e23;
  background: rgba(107,142,35,0.1);
  border: 1px solid rgba(107,142,35,0.3);
  border-radius: 20px;
  text-decoration: none;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  margin-left: auto;
}
.error-book-link-btn:hover {
  background: rgba(107,142,35,0.2);
  transform: translateY(-1px);
}

/* ===== Glass卡片通用 ===== */
.glass-card {
  background: rgba(255,252,240,0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(205,133,63,0.25);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(139,69,19,0.08);
  position: relative;
  overflow: hidden;
}
.glass-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
}

/* ===== 加载状态 ===== */
.loading-section { padding-top: 20px; }
.loading-cards { display: flex; flex-direction: column; gap: 16px; }
.skeleton-card {
  padding: 24px;
  background: rgba(255,252,240,0.7);
  border-radius: 16px;
  border: 1px solid rgba(205,133,63,0.15);
}
.skeleton-line {
  background: linear-gradient(90deg, rgba(240,230,210,0.8) 25%, rgba(224,210,185,0.8) 50%, rgba(240,230,210,0.8) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 6px;
  margin-bottom: 14px;
}
.skeleton-line.wide { height: 24px; width: 80%; }
.skeleton-line.medium { height: 18px; width: 60%; }
.skeleton-line.narrow { height: 18px; width: 40%; margin-bottom: 0; }
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.mini-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(100,149,237,0.15);
  border-top-color: #6495ed;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 空状态 ===== */
.empty-state {
  text-align: center;
  padding: 80px 20px;
}
.empty-illustration { margin-bottom: 20px; }
.empty-state h3 {
  font-family: 'SimSun', 'STSong', serif;
  color: #8b4513;
  font-size: 22px;
  margin: 0 0 10px;
}
.empty-state p {
  font-family: 'SimSun', 'STSong', serif;
  color: #a0522d;
  margin: 0 0 30px;
  font-size: 15px;
}
.action-link-btn {
  display: inline-block;
  padding: 12px 36px;
  color: #fff;
  background: linear-gradient(135deg, rgba(107,142,35,0.8), rgba(85,107,47,0.7));
  border-radius: 20px;
  text-decoration: none;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 15px;
  transition: all 0.25s ease;
}
.action-link-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(107,142,35,0.3);
}

/* ===== 复习主体 ===== */
.review-body { display: flex; flex-direction: column; gap: 16px; }

/* ===== 进度条 ===== */
.progress-header { padding: 16px 24px; }
.progress-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
  justify-content: center;
}
.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 18px;
  border-radius: 12px;
  min-width: 80px;
}
.stat-pill.total { background: rgba(205,133,63,0.12); }
.stat-pill.remaining { background: rgba(220,20,60,0.1); }
.stat-pill.mastered { background: rgba(107,142,35,0.12); }

.pill-num {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 22px;
  font-weight: bold;
  line-height: 1.2;
}
.total .pill-num { color: #cd853f; }
.remaining .pill-num { color: #dc143c; }
.mastered .pill-num { color: #6b8e23; }
.pill-label {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 11px;
  color: #a0522d;
  margin-top: 2px;
}

.progress-bar-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}
.progress-bar-bg {
  flex: 1;
  height: 8px;
  background: rgba(205,133,63,0.12);
  border-radius: 4px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #cd853f, #6b8e23);
  border-radius: 4px;
  transition: width 0.4s ease;
}
.progress-text {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  color: #a0522d;
  white-space: nowrap;
}

/* ===== 题目卡片 ===== */
.question-area { padding: 28px; }

/* 诗词上下文 */
.poem-context {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(205,133,63,0.15);
}
.poem-info-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
}
.poem-title {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 20px;
  font-weight: bold;
  color: #8b4513;
}
.poem-author {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  color: #a0522d;
}
.poem-full-text {
  background: linear-gradient(135deg, rgba(255,248,220,0.5), rgba(255,252,240,0.3));
  border: 1px solid rgba(205,133,63,0.15);
  border-radius: 12px;
  padding: 14px 18px;
}
.poem-pre {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 15px;
  color: #8b4513;
  line-height: 2;
  white-space: pre-wrap;
  margin: 0;
  text-align: center;
}

/* 题目展示 */
.question-display { margin-bottom: 24px; }
.question-label-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  font-weight: bold;
  color: #a0522d;
  margin-bottom: 12px;
}
.question-main-text {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 24px;
  color: #8b4513;
  text-align: center;
  padding: 28px 20px;
  background: linear-gradient(135deg, rgba(255,248,220,0.6), rgba(255,252,240,0.3));
  border: 1px solid rgba(205,133,63,0.2);
  border-radius: 16px;
  line-height: 1.7;
}
.question-meta {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 12px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 12px;
}
.meta-tag:not(.wrong-times):not(.mastered-tag) {
  background: rgba(205,133,63,0.12);
  color: #cd853f;
}
.meta-tag.wrong-times {
  background: rgba(220,20,60,0.1);
  color: #dc143c;
}
.meta-tag.mastered-tag {
  background: rgba(107,142,35,0.12);
  color: #6b8e23;
}

/* 答题区 */
.answer-section {}
.input-wrap { margin-bottom: 12px; }
.answer-input-field {
  width: 100%;
  padding: 16px 20px;
  border: 2px solid rgba(205,133,63,0.3);
  border-radius: 16px;
  background: rgba(255,252,240,0.9);
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 18px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.answer-input-field:focus {
  border-color: #cd853f;
  box-shadow: 0 0 0 3px rgba(205,133,63,0.1);
}
.answer-input-field::placeholder { color: rgba(139,69,19,0.4); }
.answer-input-field:disabled { opacity: 0.6; }

.action-row {
  display: flex;
  gap: 10px;
  justify-content: space-between;
}
.hint-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 14px;
  background: rgba(100,149,237,0.1);
  border: 1px solid rgba(100,149,237,0.3);
  color: #6495ed;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.hint-toggle-btn:hover, .hint-toggle-btn.active {
  background: rgba(100,149,237,0.2);
}

.submit-btn {
  flex: 1;
  max-width: 200px;
  padding: 12px 24px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(107,142,35,0.85), rgba(85,107,47,0.75));
  border: none;
  color: #fff;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107,142,35,0.3);
}
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* AI提示区 */
.hints-area {
  margin-top: 16px;
  background: rgba(100,149,237,0.05);
  border: 1px solid rgba(100,149,237,0.2);
  border-radius: 14px;
  padding: 16px;
}
.hints-area-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.hints-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  font-weight: bold;
  color: #6495ed;
}
.generate-hints-btn {
  padding: 5px 14px;
  border-radius: 10px;
  background: rgba(100,149,237,0.15);
  border: 1px solid rgba(100,149,237,0.3);
  color: #6495ed;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.generate-hints-btn:hover:not(:disabled) { background: rgba(100,149,237,0.25); }
.generate-hints-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.hints-loading-text {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 12px;
  color: #6495ed;
  opacity: 0.7;
}

.hints-list { display: flex; flex-direction: column; gap: 8px; }
.hint-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(100,149,237,0.08);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.hint-card:hover { background: rgba(100,149,237,0.15); }
.hint-card.revealed { background: rgba(100,149,237,0.15); }
.hint-num {
  width: 22px;
  height: 22px;
  background: rgba(100,149,237,0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 12px;
  color: #6495ed;
  flex-shrink: 0;
}
.hint-body {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  color: #6495ed;
  line-height: 1.6;
}
.hint-mask {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  color: #6495ed;
  opacity: 0.5;
}
.hints-loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  color: #6495ed;
}
.hints-empty {
  text-align: center;
  padding: 12px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  color: #6495ed;
  opacity: 0.6;
}

/* 提示展开动画 */
.slide-enter-active, .slide-leave-active { transition: all 0.3s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-10px); }

/* ===== 结果区 ===== */
.result-section {}
.result-card {
  display: flex;
  gap: 20px;
  padding: 24px;
  border-radius: 16px;
  margin-bottom: 20px;
}
.result-card.correct {
  background: rgba(50,205,50,0.07);
  border: 1px solid rgba(50,205,50,0.2);
}
.result-card.wrong {
  background: rgba(220,20,60,0.07);
  border: 1px solid rgba(220,20,60,0.2);
}

.result-icon-wrap { flex-shrink: 0; }
.result-card.correct .result-icon-wrap { color: #32cd32; }
.result-card.wrong .result-icon-wrap { color: #dc143c; }

.result-content { flex: 1; }
.result-heading {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 20px;
  font-weight: bold;
  color: #8b4513;
  margin: 0 0 16px;
}

.answer-display {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}
.answer-line { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.answer-line-label {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  font-weight: bold;
  color: #a0522d;
  min-width: 70px;
}
.answer-line-text {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  padding: 6px 16px;
  border-radius: 8px;
  line-height: 1.5;
}
.wrong-answer-text {
  background: rgba(220,20,60,0.1);
  color: #dc143c;
  text-decoration: line-through;
}
.correct-answer-text {
  background: rgba(50,205,50,0.1);
  color: #32cd32;
}

.ai-explanation {
  background: linear-gradient(135deg, rgba(100,149,237,0.07), rgba(70,130,180,0.05));
  border: 1px solid rgba(100,149,237,0.2);
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 16px;
}
.ai-exp-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 13px;
  font-weight: bold;
  color: #6495ed;
  margin-bottom: 8px;
}
.ai-exp-text {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  color: #8b4513;
  line-height: 1.8;
}

.mastered-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255,215,0,0.15);
  border: 1px solid rgba(255,215,0,0.3);
  border-radius: 10px;
  color: #daa520;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  font-weight: bold;
}

/* 结果操作按钮 */
.result-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.result-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 11px 22px;
  border-radius: 14px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
}
.result-action-btn.primary {
  background: linear-gradient(135deg, rgba(107,142,35,0.85), rgba(85,107,47,0.75));
  color: #fff;
  border-color: rgba(107,142,35,0.4);
}
.result-action-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107,142,35,0.3);
}
.result-action-btn.secondary {
  background: rgba(205,133,63,0.1);
  color: #8b4513;
  border-color: rgba(205,133,63,0.3);
}
.result-action-btn.secondary:hover {
  background: rgba(205,133,63,0.2);
}

/* ===== 响应式 ===== */
@media (max-width: 640px) {
  .review-page-header { flex-direction: column; gap: 12px; align-items: stretch; }
  .header-left, .header-right { min-width: 0; }
  .back-btn { width: fit-content; }
  .error-book-link-btn { width: 100%; justify-content: center; }
  .header-center { text-align: left; }
  .question-main-text { font-size: 19px; padding: 20px 14px; }
  .result-card { flex-direction: column; gap: 12px; }
  .result-icon-wrap { text-align: center; }
  .result-heading { text-align: center; }
  .answer-display { gap: 8px; }
  .action-row { flex-direction: column; }
  .submit-btn { max-width: 100%; }
  .result-actions { flex-direction: column; }
  .result-action-btn { justify-content: center; width: 100%; }
  .progress-stats { gap: 8px; }
  .stat-pill { min-width: 70px; padding: 8px 12px; }
  .pill-num { font-size: 20px; }
}

/* ===== 首页同源重构：错题复习书页舞台 ===== */
.review-page {
  --review-cinnabar: #b7695f;
  --review-cinnabar-soft: rgba(183, 105, 95, .11);
  max-width: none;
  min-height: calc(100dvh - 70px);
  padding: 18px clamp(18px, 3vw, 52px) 72px;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 0 !important;
  border-radius: 28px !important;
  background: linear-gradient(112deg, rgba(247, 252, 249, .98) 0%, rgba(247, 252, 249, .9) 54%, rgba(247, 252, 249, .74) 100%) !important;
  box-shadow: none !important;
}
.review-page::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(circle at 12% 70%, rgba(47, 157, 138, .08), transparent 28%);
}
.review-page::after {
  content: '';
  position: absolute;
  inset: 0 0 0 auto;
  z-index: 0;
  width: 68%;
  pointer-events: none;
  background: url('../assets/review-inkwash.png') center right / cover no-repeat;
  opacity: .22;
  mix-blend-mode: multiply;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, .35) 22%, #000 58%, #000 100%);
  mask-image: linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, .35) 22%, #000 58%, #000 100%);
}
.review-page > * { position: relative; z-index: 1; }
.review-page .review-page-header {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 16px 0 26px;
  display: grid;
  grid-template-columns: minmax(160px, 1fr) auto minmax(160px, 1fr);
  align-items: center;
  gap: 18px;
  position: relative;
  top: auto;
  background: rgba(255, 255, 255, .52) !important;
  border: 0 !important;
  border-bottom: 1px solid rgba(74, 133, 121, .16) !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
}
.review-page .header-left,
.review-page .header-right { min-width: 0; }
.review-page .header-right { display: flex; justify-content: flex-end; }
.review-page .header-center { position: relative; }
.review-page .page-title-wrap { gap: 12px; }
.review-page .title-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  color: var(--jade-accent-strong) !important;
  background: rgba(47, 157, 138, .12) !important;
  border-color: rgba(47, 157, 138, .2) !important;
  font-family: var(--font-calligraphy);
}
.review-page .page-title {
  margin: 0;
  color: var(--jade-ink) !important;
  font-family: var(--font-ancient);
  font-size: clamp(22px, 2.2vw, 30px);
  letter-spacing: .08em;
}
.review-page .page-subtitle { margin: 6px 0 0; color: var(--jade-muted) !important; font-family: var(--font-sans); font-size: 12px; letter-spacing: .16em; }
.review-page .back-btn,
.review-page .error-book-link-btn { border-radius: 10px; font-family: var(--font-sans); box-shadow: none; }
.review-page .back-btn { padding: 9px 14px; color: var(--jade-accent-strong) !important; background: rgba(255, 255, 255, .62) !important; border-color: rgba(47, 157, 138, .24) !important; }
.review-page .error-book-link-btn { padding: 10px 15px; color: var(--jade-accent-strong) !important; background: rgba(255, 255, 255, .64) !important; border-color: rgba(47, 157, 138, .24) !important; }

.review-page .review-body { width: 100%; max-width: 980px; margin: 22px auto 0; gap: 18px; }
.review-page .progress-header,
.review-page .question-area {
  border-radius: 20px;
  background: rgba(255, 255, 255, .74) !important;
  border-color: rgba(74, 133, 121, .18) !important;
  box-shadow: 0 14px 34px rgba(30, 82, 73, .08) !important;
}
.review-page .progress-header { display: grid; grid-template-columns: auto minmax(250px, 1fr); align-items: center; gap: 30px; padding: 18px 24px; }
.review-page .progress-stats { justify-content: flex-start; margin: 0; gap: 10px; }
.review-page .stat-pill { min-width: 76px; padding: 8px 13px; border-radius: 12px; }
.review-page .stat-pill.total { background: rgba(47, 157, 138, .1); }
.review-page .stat-pill.remaining { background: var(--review-cinnabar-soft); }
.review-page .stat-pill.mastered { background: rgba(95, 133, 111, .12); }
.review-page .pill-num { font-family: var(--font-sans); }
.review-page .total .pill-num { color: var(--jade-accent-strong); }
.review-page .remaining .pill-num { color: var(--review-cinnabar); }
.review-page .mastered .pill-num { color: #5f856f; }
.review-page .pill-label,
.review-page .progress-text { color: var(--jade-muted) !important; font-family: var(--font-sans); }
.review-page .progress-bar-bg { height: 7px; background: rgba(47, 157, 138, .1); }
.review-page .progress-bar-fill { background: var(--jade-accent-strong); }

.review-page .question-area { padding: clamp(24px, 4vw, 46px) clamp(20px, 5vw, 58px); }
.review-page .poem-context { margin-bottom: 26px; padding-bottom: 24px; border-color: rgba(74, 133, 121, .14); }
.review-page .poem-title { color: var(--jade-ink) !important; font-family: var(--font-ancient); font-size: 22px; letter-spacing: .06em; }
.review-page .poem-author { color: var(--jade-muted) !important; font-family: var(--font-sans); }
.review-page .poem-full-text { background: rgba(239, 248, 244, .7) !important; border-color: rgba(74, 133, 121, .15) !important; border-radius: 14px; }
.review-page .poem-pre { color: #3c625b !important; font-family: var(--font-ancient); }
.review-page .question-display { margin-bottom: 26px; }
.review-page .question-label-row { color: var(--jade-accent-strong) !important; font-family: var(--font-sans); letter-spacing: .12em; }
.review-page .question-label-row svg { color: var(--jade-accent); }
.review-page .question-main-text { padding: 20px 10px 25px; color: var(--jade-ink) !important; background: transparent !important; border: 0 !important; border-bottom: 1px solid rgba(74, 133, 121, .14) !important; border-radius: 0; font-family: var(--font-ancient); font-size: clamp(24px, 3vw, 34px); line-height: 1.65; letter-spacing: .05em; }
.review-page .question-meta { justify-content: flex-start; margin-top: 14px; }
.review-page .meta-tag { font-family: var(--font-sans); }
.review-page .meta-tag:not(.wrong-times):not(.mastered-tag) { color: var(--jade-accent-strong); background: rgba(47, 157, 138, .1); }
.review-page .meta-tag.wrong-times { color: var(--review-cinnabar); background: var(--review-cinnabar-soft); }
.review-page .meta-tag.mastered-tag { color: #5f856f; background: rgba(95, 133, 111, .12); }
.review-page .answer-input-field { border: 1px solid rgba(74, 133, 121, .28); border-radius: 13px; color: var(--jade-ink) !important; background: rgba(255, 255, 255, .88) !important; font-family: var(--font-sans); }
.review-page .answer-input-field:focus { border-color: var(--jade-accent) !important; box-shadow: 0 0 0 4px rgba(47, 157, 138, .12) !important; }
.review-page .action-row { align-items: center; }
.review-page .hint-toggle-btn { border-radius: 10px; color: var(--jade-accent-strong); background: rgba(47, 157, 138, .1); border-color: rgba(47, 157, 138, .22); font-family: var(--font-sans); }
.review-page .submit-btn { border-radius: 10px; background: var(--jade-accent-strong) !important; font-family: var(--font-sans); box-shadow: 0 8px 18px rgba(25, 118, 102, .17); }
.review-page .hints-area { background: rgba(239, 248, 244, .76); border-color: rgba(74, 133, 121, .17); border-radius: 14px; }
.review-page .hints-title,
.review-page .hint-body,
.review-page .hint-mask,
.review-page .hints-loading-text,
.review-page .hints-empty { color: var(--jade-accent-strong); font-family: var(--font-sans); }
.review-page .hint-card { background: rgba(47, 157, 138, .08); }
.review-page .hint-card:hover,
.review-page .hint-card.revealed { background: rgba(47, 157, 138, .13); }
.review-page .hint-num { color: var(--jade-accent-strong); background: rgba(47, 157, 138, .13); }

.review-page .result-card { border-radius: 16px; }
.review-page .result-card.correct { background: rgba(79, 138, 114, .08); border-color: rgba(79, 138, 114, .22); }
.review-page .result-card.wrong { background: var(--review-cinnabar-soft); border-color: rgba(183, 105, 95, .22); }
.review-page .result-card.correct .result-icon-wrap { color: #4f8a72; }
.review-page .result-card.wrong .result-icon-wrap { color: var(--review-cinnabar); }
.review-page .result-heading,
.review-page .ai-exp-text { color: var(--jade-ink) !important; font-family: var(--font-ancient); }
.review-page .answer-line-label { color: var(--jade-muted); font-family: var(--font-sans); }
.review-page .wrong-answer-text { color: var(--review-cinnabar); background: var(--review-cinnabar-soft); }
.review-page .correct-answer-text { color: #4f8a72; background: rgba(79, 138, 114, .11); }
.review-page .ai-explanation { background: rgba(239, 248, 244, .78); border-color: rgba(74, 133, 121, .17); }
.review-page .ai-exp-header { color: var(--jade-accent-strong); font-family: var(--font-sans); }
.review-page .mastered-banner { color: #5f856f; background: rgba(95, 133, 111, .12); border-color: rgba(95, 133, 111, .22); font-family: var(--font-sans); }
.review-page .result-action-btn { border-radius: 10px; font-family: var(--font-sans); }
.review-page .result-action-btn.primary { background: var(--jade-accent-strong) !important; border-color: transparent; }
.review-page .result-action-btn.secondary { color: var(--jade-accent-strong); background: rgba(255, 255, 255, .64); border-color: rgba(47, 157, 138, .22); }

@media (max-width: 760px) {
  .review-page { padding: 10px 12px 48px; }
  .review-page::after { width: 92%; opacity: .16; }
  .review-page .review-page-header { grid-template-columns: 1fr; gap: 12px; padding-bottom: 18px; }
  .review-page .header-center { order: -1; text-align: left; }
  .review-page .header-right { justify-content: stretch; }
  .review-page .error-book-link-btn { width: 100%; justify-content: center; }
  .review-page .progress-header { grid-template-columns: 1fr; gap: 14px; }
  .review-page .progress-stats { justify-content: space-between; }
  .review-page .question-main-text { font-size: 22px; }
}
</style>
