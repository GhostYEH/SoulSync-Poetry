<template>
  <div class="voice-recitation-page">
    <div class="recitation-header">
      <h1>🎤 AI智能背诵检测</h1>
      <p class="subtitle">朗读诗词，AI智能评测你的发音和背诵</p>
    </div>

    <!-- 诗词选择 -->
    <div class="poem-select-section" v-if="!selectedPoem">
      <h2>选择要背诵的诗词</h2>
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="搜索诗词标题或作者..."
        class="search-input"
      />
      <div class="poem-grid">
        <div
          v-for="poem in filteredPoems"
          :key="poem.id"
          class="poem-card"
          @click="selectPoem(poem)"
        >
          <div class="poem-card-content">
            <h3>{{ poem.title }}</h3>
            <p class="poem-author">{{ poem.author }} · {{ poem.dynasty }}</p>
            <p class="poem-preview">{{ getPreview(poem.content) }}</p>
          </div>
          <div class="poem-card-arrow">→</div>
        </div>
      </div>
      <div class="no-poems" v-if="filteredPoems.length === 0 && searchKeyword">
        <p>未找到匹配的诗词</p>
      </div>
    </div>

    <!-- 背诵区域 -->
    <div class="recitation-area" v-if="selectedPoem">
      <button class="btn-back" @click="goBack">
        <span>←</span> 返回选择
      </button>

      <!-- 诗词展示 -->
      <div class="poem-display">
        <div class="poem-header">
          <h2>{{ selectedPoem.title }}</h2>
          <p class="poem-author">{{ selectedPoem.author }} · {{ selectedPoem.dynasty }}</p>
        </div>
        <div class="poem-content">
          <p v-for="(line, i) in poemLines" :key="i" :class="{ highlight: isHighlightLine(i) }">
            {{ line }}
          </p>
        </div>
      </div>

      <!-- 录音控制面板 -->
      <div class="record-panel">
        <div class="record-status">
          <div
            class="record-indicator"
            :class="{
              recording: isRecording,
              processing: isProcessing,
              success: !isRecording && !isProcessing && transcript
            }"
          >
            <div class="pulse-ring" v-if="isRecording"></div>
            <div class="indicator-icon">
              <template v-if="isRecording">🔴</template>
              <template v-else-if="isProcessing">⏳</template>
              <template v-else-if="transcript">✅</template>
              <template v-else>🎤</template>
            </div>
          </div>
          <p class="status-text">{{ statusText }}</p>
        </div>

        <div class="record-buttons">
          <button
            class="btn-record"
            :class="{ recording: isRecording, disabled: isProcessing }"
            @click="toggleRecording"
            :disabled="isProcessing"
          >
            <span class="btn-icon">{{ isRecording ? '⏹️' : '🎤' }}</span>
            <span class="btn-text">{{ isRecording ? '停止录制' : '开始背诵' }}</span>
          </button>

          <button
            class="btn-review"
            @click="showCompare = true"
            v-if="transcript && !isProcessing"
          >
            📊 对比结果
          </button>
        </div>

        <!-- 波形动画（录制中） -->
        <div class="waveform" v-if="isRecording">
          <div class="wave-bar" v-for="i in 8" :key="i" :style="{ animationDelay: `${i * 0.1}s` }"></div>
        </div>
      </div>

      <!-- 识别结果 -->
      <div class="transcript-section" v-if="transcript">
        <div class="transcript-header">
          <h3>📝 识别结果</h3>
          <button class="btn-retry" @click="clearTranscript" v-if="!isProcessing">
            🔄 重新录制
          </button>
        </div>
        <div class="transcript-text">{{ transcript }}</div>
        <div class="transcript-actions">
          <button class="btn-evaluate" @click="checkRecitation" :disabled="isProcessing">
            <template v-if="isProcessing">
              <span class="spinner"></span>
              AI评测中...
            </template>
            <template v-else>
              🔍 AI智能评测
            </template>
          </button>
        </div>
      </div>

      <!-- 评测结果 -->
      <div class="score-result" v-if="scoreResult">
        <!-- 得分圆环 -->
        <div class="score-circle-container">
          <div class="score-circle">
            <svg viewBox="0 0 100 100">
              <circle class="bg" cx="50" cy="50" r="45" />
              <circle
                class="progress"
                cx="50"
                cy="50"
                r="45"
                :stroke="getScoreColor(scoreResult.score)"
                :style="{ strokeDashoffset: 283 - (283 * scoreResult.score) / 100 }"
              />
            </svg>
            <div class="score-text">
              <span class="score-num">{{ scoreResult.score }}</span>
              <span class="score-label">分</span>
            </div>
          </div>
          <div class="score-grade" :class="getGradeClass(scoreResult.score)">
            {{ getGradeText(scoreResult.score) }}
          </div>
        </div>

        <!-- 错误分析 -->
        <div class="error-analysis">
          <h3>📋 错误分析</h3>
          <div class="error-list">
            <div class="error-item wrong" v-if="scoreResult.wrongChars?.length > 0">
              <span class="error-icon">❌</span>
              <span class="error-label">错别字：</span>
              <span class="error-value">
                <span v-for="(item, i) in scoreResult.wrongChars" :key="i" class="char-tag error">
                  {{ item.input }}→{{ item.original }}
                </span>
              </span>
            </div>
            <div class="error-item missing" v-if="scoreResult.missing?.length > 0">
              <span class="error-icon">➖</span>
              <span class="error-label">漏字：</span>
              <span class="error-value">
                <span v-for="(item, i) in scoreResult.missing" :key="i" class="char-tag missing">
                  {{ item.char }}
                </span>
              </span>
            </div>
            <div class="error-item extra" v-if="scoreResult.extra?.length > 0">
              <span class="error-icon">➕</span>
              <span class="error-label">多字：</span>
              <span class="error-value">
                <span v-for="(item, i) in scoreResult.extra" :key="i" class="char-tag extra">
                  {{ item.char }}
                </span>
              </span>
            </div>
            <div class="no-errors" v-if="!hasErrors">
              <span class="perfect-icon">🌟</span>
              <span>太棒了！没有发现错误！</span>
            </div>
          </div>
        </div>

        <!-- AI学习建议 -->
        <div class="ai-advice-section">
          <h3>💡 AI学习建议</h3>
          <div class="advice-card">
            <p>{{ scoreResult.aiAdvice }}</p>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="result-actions">
          <button class="btn-retry-evaluation" @click="retryRecitation">
            🔄 再试一次
          </button>
          <button class="btn-try-other" @click="goBack">
            尝试其他诗词
          </button>
        </div>
      </div>
    </div>

    <!-- 对比弹窗 -->
    <Transition name="modal">
      <div class="compare-modal" v-if="showCompare && transcript" @click.self="showCompare = false">
        <div class="compare-content">
          <div class="modal-header">
            <h2>原文 vs 背诵对比</h2>
            <button class="modal-close" @click="showCompare = false">×</button>
          </div>
          <div class="compare-grid">
            <div class="compare-box original">
              <h3>📜 原文</h3>
              <p class="compare-text">{{ selectedPoem.content }}</p>
            </div>
            <div class="compare-box recited">
              <h3>🎤 背诵</h3>
              <p class="compare-text">{{ transcript }}</p>
            </div>
          </div>
          <div class="compare-summary" v-if="scoreResult">
            <p>得分：<strong>{{ scoreResult.score }}分</strong></p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 加载动画 -->
    <div class="loading-overlay" v-if="isLoadingPoems">
      <div class="loading-spinner"></div>
      <p>加载诗词列表...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import api from '../services/api'
import { notify } from '../services/appFeedback'

// 状态
const searchKeyword = ref('')
const selectedPoem = ref(null)
const poems = ref([])
const isLoadingPoems = ref(true)
const isRecording = ref(false)
const isProcessing = ref(false)
const transcript = ref('')
const showCompare = ref(false)
const scoreResult = ref(null)
let recognition = null
let finalTranscript = ''

// 计算属性
const poemLines = computed(() => {
  if (!selectedPoem.value?.content) return []
  return selectedPoem.value.content.split(/[，。！？、；]/)
    .filter(l => l.trim())
    .map(l => l.trim())
})

const filteredPoems = computed(() => {
  if (!searchKeyword.value) return poems.value.slice(0, 30)
  const kw = searchKeyword.value.toLowerCase()
  return poems.value.filter(p =>
    p.title.toLowerCase().includes(kw) ||
    p.author.toLowerCase().includes(kw) ||
    (p.dynasty && p.dynasty.toLowerCase().includes(kw))
  ).slice(0, 30)
})

const statusText = computed(() => {
  if (isProcessing.value) return 'AI正在分析中，请稍候...'
  if (isRecording.value) return '正在录制，请开始背诵诗词...'
  if (transcript.value && !scoreResult.value) return '录制完成，点击下方按钮进行评测'
  if (scoreResult.value) return '评测完成'
  return '点击下方按钮开始背诵'
})

const hasErrors = computed(() => {
  if (!scoreResult.value) return false
  return (scoreResult.value.wrongChars?.length > 0) ||
         (scoreResult.value.missing?.length > 0) ||
         (scoreResult.value.extra?.length > 0)
})

// 方法
const getPreview = (content) => {
  if (!content) return ''
  const lines = content.split(/[，。！？]/).filter(l => l.trim())
  return lines.slice(0, 2).join('，') + '...'
}

const isHighlightLine = (index) => {
  return false
}

const getScoreColor = (score) => {
  if (score >= 90) return '#52c41a'
  if (score >= 70) return '#faad14'
  if (score >= 50) return '#fa8c16'
  return '#f5222d'
}

const getGradeClass = (score) => {
  if (score >= 90) return 'grade-excellent'
  if (score >= 70) return 'grade-good'
  if (score >= 50) return 'grade-fair'
  return 'grade-poor'
}

const getGradeText = (score) => {
  if (score >= 95) return '完美'
  if (score >= 90) return '优秀'
  if (score >= 80) return '良好'
  if (score >= 70) return '不错'
  if (score >= 60) return '及格'
  if (score >= 50) return '仍需努力'
  return '继续加油'
}

const loadPoems = async () => {
  isLoadingPoems.value = true
  try {
    const res = await api.poems.getAll()
    poems.value = res.data || res || []
  } catch (error) {
    console.error('加载诗词列表失败:', error)
    poems.value = []
  } finally {
    isLoadingPoems.value = false
  }
}

const selectPoem = (poem) => {
  selectedPoem.value = poem
  transcript.value = ''
  scoreResult.value = null
  showCompare.value = false
}

const goBack = () => {
  selectedPoem.value = null
  transcript.value = ''
  scoreResult.value = null
  showCompare.value = false
}

const clearTranscript = () => {
  transcript.value = ''
  scoreResult.value = null
}

const retryRecitation = () => {
  transcript.value = ''
  scoreResult.value = null
}

const toggleRecording = () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

const startRecording = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  
  if (!SpeechRecognition) {
    notify('抱歉，您的浏览器不支持语音识别。请使用 Chrome、Edge 或 Safari 浏览器。', 'warning')
    return
  }

  recognition = new SpeechRecognition()
  recognition.lang = 'zh-CN'
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 1

  recognition.onstart = () => {
    isRecording.value = true
    finalTranscript = ''
    transcript.value = ''
  }

  recognition.onresult = (event) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript_piece = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += transcript_piece
      } else {
        interim += transcript_piece
      }
    }
    transcript.value = finalTranscript + interim
  }

  recognition.onerror = (event) => {
    console.error('语音识别错误:', event.error)
    isRecording.value = false
    if (event.error !== 'no-speech') {
      notify('语音识别出错：' + event.error, 'error')
    }
  }

  recognition.onend = () => {
    isRecording.value = false
    transcript.value = finalTranscript
  }

  try {
    recognition.start()
    isRecording.value = true
  } catch (e) {
    console.error('启动语音识别失败:', e)
    notify('启动语音识别失败，请刷新页面重试', 'error')
  }
}

const stopRecording = () => {
  if (recognition) {
    recognition.stop()
  }
  isRecording.value = false
}

const checkRecitation = async () => {
  if (!transcript.value || !selectedPoem.value) return

  isProcessing.value = true
  scoreResult.value = null
  
  try {
    const res = await api.ai.reciteCheck({
      original: selectedPoem.value.content,
      input: transcript.value,
      poem_id: selectedPoem.value.id,
      poem_title: selectedPoem.value.title,
      poem_author: selectedPoem.value.author
    })
    
    if (res) {
      scoreResult.value = res
    } else {
      notify('评测结果解析失败，请重试', 'error')
    }
  } catch (error) {
    console.error('评测失败:', error)
    notify('评测失败，请重试：' + (error.message || '未知错误'), 'error')
  } finally {
    isProcessing.value = false
  }
}

onMounted(() => {
  loadPoems()
})

onUnmounted(() => {
  if (recognition) {
    recognition.abort()
  }
})
</script>

<style scoped>
.voice-recitation-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
}

.recitation-header {
  text-align: center;
  margin-bottom: 32px;
}

.recitation-header h1 {
  font-size: 28px;
  color: #8b4513;
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  font-size: 14px;
}

/* 搜索和诗词列表 */
.poem-select-section h2 {
  font-size: 18px;
  color: #8b4513;
  margin-bottom: 16px;
  text-align: center;
}

.search-input {
  width: 100%;
  padding: 14px 20px;
  border: 2px solid rgba(139, 69, 19, 0.2);
  border-radius: 12px;
  font-size: 16px;
  margin-bottom: 24px;
  box-sizing: border-box;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #8b4513;
}

.poem-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.poem-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(139, 69, 19, 0.15);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.poem-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(139, 69, 19, 0.15);
  border-color: #8b4513;
}

.poem-card-content {
  flex: 1;
}

.poem-card-content h3 {
  font-size: 16px;
  color: #8b4513;
  margin-bottom: 4px;
}

.poem-author {
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}

.poem-preview {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.poem-card-arrow {
  font-size: 20px;
  color: #ccc;
  transition: color 0.2s;
}

.poem-card:hover .poem-card-arrow {
  color: #8b4513;
}

.no-poems {
  text-align: center;
  padding: 40px;
  color: #999;
}

/* 背诵区域 */
.recitation-area {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(139, 69, 19, 0.08);
  border: none;
  border-radius: 8px;
  color: #8b4513;
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 20px;
  transition: background 0.2s;
}

.btn-back:hover {
  background: rgba(139, 69, 19, 0.15);
}

/* 诗词展示 */
.poem-display {
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.05), rgba(139, 69, 19, 0.02));
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  margin-bottom: 24px;
}

.poem-header h2 {
  font-size: 24px;
  color: #8b4513;
  margin-bottom: 6px;
}

.poem-author {
  font-size: 14px;
  color: #888;
  margin-bottom: 16px;
}

.poem-content p {
  font-size: 20px;
  color: #333;
  line-height: 2.2;
  margin: 6px 0;
}

.poem-content p.highlight {
  background: linear-gradient(120deg, #ffeaa7 0%, #ffeaa7 100%);
  background-repeat: no-repeat;
  background-size: 100% 40%;
  background-position: 0 90%;
}

/* 录音面板 */
.record-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: rgba(139, 69, 19, 0.03);
  border-radius: 16px;
  margin-bottom: 24px;
}

.record-status {
  text-align: center;
}

.record-indicator {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: rgba(139, 69, 19, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  position: relative;
  transition: all 0.3s;
}

.record-indicator.recording {
  background: rgba(231, 76, 60, 0.12);
}

.record-indicator.processing {
  background: rgba(241, 196, 15, 0.12);
}

.record-indicator.success {
  background: rgba(82, 196, 26, 0.12);
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid #e74c3c;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.35); opacity: 0; }
}

.indicator-icon {
  font-size: 36px;
}

.status-text {
  font-size: 14px;
  color: #666;
  max-width: 280px;
}

.record-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-record {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 36px;
  background: linear-gradient(135deg, #cd853f, #8b4513);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
}

.btn-record:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(139, 69, 19, 0.4);
}

.btn-record.recording {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
}

.btn-record.disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-review {
  padding: 14px 24px;
  background: rgba(139, 69, 19, 0.1);
  border: none;
  border-radius: 12px;
  color: #8b4513;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-review:hover {
  background: rgba(139, 69, 19, 0.18);
}

/* 波形动画 */
.waveform {
  display: flex;
  gap: 4px;
  height: 30px;
  align-items: center;
}

.wave-bar {
  width: 4px;
  height: 100%;
  background: #e74c3c;
  border-radius: 2px;
  animation: wave 0.6s ease-in-out infinite alternate;
}

@keyframes wave {
  0% { height: 8px; }
  100% { height: 28px; }
}

/* 识别结果 */
.transcript-section {
  background: rgba(139, 69, 19, 0.04);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.transcript-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.transcript-header h3 {
  font-size: 16px;
  color: #8b4513;
  margin: 0;
}

.btn-retry {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #8b4513;
  border-radius: 6px;
  color: #8b4513;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry:hover {
  background: rgba(139, 69, 19, 0.1);
}

.transcript-text {
  font-size: 18px;
  color: #333;
  line-height: 1.8;
  padding: 16px;
  background: white;
  border-radius: 10px;
  margin-bottom: 16px;
  border: 1px solid rgba(139, 69, 19, 0.1);
  min-height: 60px;
}

.transcript-actions {
  display: flex;
  justify-content: center;
}

.btn-evaluate {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  background: linear-gradient(135deg, #52c41a, #389e0d);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
}

.btn-evaluate:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(82, 196, 26, 0.4);
}

.btn-evaluate:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 评测结果 */
.score-result {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 24px;
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(139, 69, 19, 0.1);
}

.score-circle-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.score-circle {
  position: relative;
  width: 140px;
  height: 140px;
}

.score-circle svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-circle circle.bg {
  fill: none;
  stroke: rgba(139, 69, 19, 0.08);
  stroke-width: 10;
}

.score-circle circle.progress {
  fill: none;
  stroke-width: 10;
  stroke-linecap: round;
  stroke-dasharray: 283;
  stroke-dashoffset: 283;
  transition: stroke-dashoffset 1.2s ease;
}

.score-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-num {
  font-size: 42px;
  font-weight: bold;
  color: #8b4513;
  display: block;
  line-height: 1;
}

.score-label {
  font-size: 14px;
  color: #888;
}

.score-grade {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
}

.grade-excellent { background: #f6ffed; color: #52c41a; }
.grade-good { background: #fffbe6; color: #faad14; }
.grade-fair { background: #fff7e6; color: #fa8c16; }
.grade-poor { background: #fff1f0; color: #f5222d; }

/* 错误分析 */
.error-analysis {
  grid-column: 2;
}

.error-analysis h3,
.ai-advice-section h3 {
  font-size: 16px;
  color: #8b4513;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.error-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.error-item.wrong { background: rgba(245, 34, 45, 0.05); }
.error-item.missing { background: rgba(250, 173, 20, 0.05); }
.error-item.extra { background: rgba(82, 196, 26, 0.05); }

.error-icon {
  font-size: 16px;
}

.error-label {
  color: #666;
  min-width: 56px;
}

.error-value {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.char-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.char-tag.error { background: rgba(245, 34, 45, 0.15); color: #cf1322; }
.char-tag.missing { background: rgba(250, 173, 20, 0.15); color: #d46b08; }
.char-tag.extra { background: rgba(82, 196, 26, 0.15); color: #389e0d; }

.no-errors {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #52c41a;
  font-size: 14px;
  padding: 12px;
}

.perfect-icon {
  font-size: 20px;
}

/* AI建议 */
.ai-advice-section {
  grid-column: 1 / -1;
  margin-top: 8px;
}

.advice-card {
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.04), rgba(139, 69, 19, 0.02));
  border-radius: 12px;
  padding: 16px 20px;
  border-left: 4px solid #8b4513;
}

.advice-card p {
  font-size: 15px;
  color: #444;
  line-height: 1.9;
  margin: 0;
}

/* 结果操作按钮 */
.result-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 12px;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid rgba(139, 69, 19, 0.1);
}

.btn-retry-evaluation,
.btn-try-other {
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry-evaluation {
  background: linear-gradient(135deg, #cd853f, #8b4513);
  color: white;
  border: none;
}

.btn-retry-evaluation:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
}

.btn-try-other {
  background: transparent;
  border: 1px solid #8b4513;
  color: #8b4513;
}

.btn-try-other:hover {
  background: rgba(139, 69, 19, 0.08);
}

/* 对比弹窗 */
.compare-modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.compare-content {
  background: white;
  border-radius: 20px;
  padding: 28px;
  width: 100%;
  max-width: 680px;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 {
  font-size: 20px;
  color: #8b4513;
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  transition: all 0.2s;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #666;
}

.compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.compare-box {
  background: rgba(139, 69, 19, 0.04);
  border-radius: 12px;
  padding: 16px;
}

.compare-box h3 {
  font-size: 14px;
  color: #8b4513;
  margin-bottom: 12px;
}

.compare-text {
  font-size: 15px;
  color: #333;
  line-height: 2;
  margin: 0;
  word-break: break-all;
}

.compare-summary {
  text-align: center;
  padding: 12px;
  background: rgba(139, 69, 19, 0.04);
  border-radius: 10px;
  font-size: 14px;
  color: #666;
}

.compare-summary strong {
  color: #8b4513;
  font-size: 18px;
}

/* 加载动画 */
.loading-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(139, 69, 19, 0.15);
  border-top-color: #8b4513;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

.loading-overlay p {
  color: #8b4513;
  font-size: 14px;
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .compare-content {
  animation: slideUp 0.25s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* 响应式 */
@media (max-width: 640px) {
  .voice-recitation-page {
    padding: 16px;
  }
  
  .poem-grid {
    grid-template-columns: 1fr;
  }
  
  .score-result {
    grid-template-columns: 1fr;
  }
  
  .score-circle-container {
    flex-direction: row;
    justify-content: center;
  }
  
  .error-analysis,
  .ai-advice-section {
    grid-column: 1;
  }
  
  .compare-grid {
    grid-template-columns: 1fr;
  }
}
</style>
