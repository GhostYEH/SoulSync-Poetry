/**
 * 飞花令创作模式组件
 * 用户选择一个关键字，创作包含该字的诗词
 */
<template>
  <div class="feihua-mode">
    <!-- 面板标题 -->
    <div class="panel-header">
      <div class="header-icon">🌸</div>
      <div class="header-text">
        <h2>飞花令创作</h2>
        <p>选择一个关键字，创作包含该字的诗词</p>
      </div>
    </div>

    <!-- 关键字选择区 -->
    <div class="keyword-section" v-if="!currentKeyword">
      <div class="keyword-display">
        <div class="keyword-question">?</div>
      </div>

      <!-- 难度选择 -->
      <div class="difficulty-selector">
        <label class="difficulty-label">选择难度</label>
        <div class="difficulty-buttons">
          <button
            v-for="d in difficulties"
            :key="d.value"
            :class="['diff-btn', { active: selectedDifficulty === d.value }]"
            @click="selectedDifficulty = d.value"
          >
            <span class="diff-icon">{{ d.icon }}</span>
            <span class="diff-name">{{ d.label }}</span>
          </button>
        </div>
      </div>

      <!-- 随机关键字按钮 -->
      <button class="random-keyword-btn" @click="getRandomKeyword" :disabled="isLoading">
        <span v-if="isLoading" class="loading-spinner-small"></span>
        <span v-else>🎲</span>
        <span>{{ isLoading ? '获取中...' : '随机抽取关键字' }}</span>
      </button>

      <!-- 关键字提示 -->
    </div>

    <!-- 关键字已选择 -->
    <div class="keyword-selected" v-else>
      <div class="keyword-main">
        <div class="keyword-char">{{ currentKeyword }}</div>
        <button class="change-keyword-btn" @click="currentKeyword = ''">
          更换关键字
        </button>
      </div>

      <!-- 相关意象 -->
      <div class="related-words" v-if="relatedWords.length > 0">
        <span class="related-label">相关意象：</span>
        <div class="related-tags">
          <span v-for="w in relatedWords" :key="w" class="related-tag">{{ w }}</span>
        </div>
      </div>
    </div>

    <!-- 创作编辑器 -->
    <div class="creation-editor" v-if="currentKeyword">
      <!-- 标题输入 -->
      <div class="title-input-section">
        <input
          type="text"
          v-model="localTitle"
          placeholder="输入诗词标题（选填）"
          class="title-input"
          @input="$emit('update:title', localTitle)"
        />
      </div>

      <!-- 创作区域 -->
      <div class="editor-area">
        <div class="editor-hint">
          <span class="hint-icon">💡</span>
          <span>围绕「{{ currentKeyword }}」起意，自然融入诗句即可</span>
        </div>

        <textarea
          v-model="localContent"
          :placeholder="`在这里创作你的飞花令诗词...\n至少自然融入一次「${currentKeyword}」字`"
          class="poem-textarea"
          rows="8"
          @input="checkKeywordCount"
        ></textarea>

        <!-- 关键字计数 -->
        <div class="keyword-counter">
          <div class="counter-item">
            <span class="counter-label">关键字出现</span>
            <span class="counter-value" :class="{ highlight: keywordCount > 0 }">
              {{ keywordCount }} 次
            </span>
          </div>
          <div class="counter-item">
            <span class="counter-label">创作字数</span>
            <span class="counter-value">{{ contentCharCount }} 字</span>
          </div>
        </div>

        <!-- 本地硬性校验：关键字是否实际出现在作品中 -->
        <transition name="fade">
          <div class="keyword-check-result" v-if="keywordCheckResult">
            <div class="check-icon" :class="{ pass: keywordCheckResult.pass }">
              {{ keywordCheckResult.pass ? '✓' : '!' }}
            </div>
            <div class="check-text">
              <span class="check-title">{{ keywordCheckResult.pass ? '关键字校验通过' : '关键字校验提醒' }}</span>
              <span class="check-desc">{{ keywordCheckResult.message }}</span>
            </div>
          </div>
        </transition>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button class="clear-btn" @click="clearContent">
          <span>🗑️</span>
          <span>清空</span>
        </button>
        <button class="score-btn" @click="$emit('score')" :disabled="!localContent.trim()">
          <span>⭐</span>
          <span>提交评分</span>
        </button>
      </div>
    </div>

    <!-- 评分结果 -->
    <transition name="fade-up">
      <div class="score-panel" v-if="showScore">
        <PoemScorer
          :score="score"
          :show-close="false"
          :show-polish="true"
          :show-actions="false"
          :is-polishing="isPolishing"
          :polish-result="polishResult"
          @polish="handlePolish"
          @apply="handleApplyPolish"
        />
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import PoemScorer from './PoemScorer.vue';

export default {
  name: 'FeihuaMode',
  components: {
    PoemScorer
  },
  props: {
    isLoading: {
      type: Boolean,
      default: false
    },
    score: {
      type: Object,
      default: null
    },
    keyword: {
      type: String,
      default: ''
    },
    keywordInfo: {
      type: Object,
      default: null
    },
    isPolishing: {
      type: Boolean,
      default: false
    },
    polishResult: {
      type: Object,
      default: null
    }
  },
  emits: ['update:title', 'update:content', 'score', 'request-keyword', 'change:keyword', 'polish', 'apply'],
  setup(props, { emit }) {
    const currentKeyword = ref(props.keyword);
    const selectedDifficulty = ref('中等');
    const relatedWords = ref([]);
    const localTitle = ref('');
    const localContent = ref('');
    const keywordCount = ref(0);
    const keywordCheckResult = ref(null);
    const showScore = ref(false);

    const difficulties = [
        { value: '简单', label: '简单', icon: '🌱' },
        { value: '中等', label: '中等', icon: '🌳' },
        { value: '困难', label: '困难', icon: '🏔️' }
    ];

    // 字数统计
    const contentCharCount = computed(() => {
      return localContent.value.replace(/\s/g, '').length;
    });

    // 随机获取关键字
    const getRandomKeyword = () => {
      emit('request-keyword', selectedDifficulty.value);
    };

    // 检查关键字出现次数
    const checkKeywordCount = () => {
      keywordCount.value = (localContent.value.match(new RegExp(currentKeyword.value, 'g')) || []).length;

      // 更新检测结果
      if (keywordCount.value === 0) {
        keywordCheckResult.value = {
          pass: false,
          message: `请确保诗词中包含「${currentKeyword.value}」字`
        };
      } else if (keywordCount.value === 1) {
        keywordCheckResult.value = {
          pass: true,
          message: '检测通过，但建议每句都包含关键字'
        };
      } else {
        keywordCheckResult.value = {
          pass: true,
          message: `检测通过！关键字「${currentKeyword.value}」出现 ${keywordCount.value} 次`
        };
      }

      emit('update:content', localContent.value);
    };

    // 清空内容
    const clearContent = () => {
      localContent.value = '';
      localTitle.value = '';
      keywordCount.value = 0;
      keywordCheckResult.value = null;
      emit('update:title', '');
      emit('update:content', '');
    };

    // 润色处理
    const handlePolish = (type) => {
      emit('polish', type);
    };

    // 应用润色结果
    const handleApplyPolish = (result) => {
      if (result && result.poem) {
        localContent.value = result.poem;
        emit('update:content', result.poem);
      }
      showScore.value = false;
    };

    // 监听props变化
    watch(() => props.keyword, (newKeyword) => {
      if (newKeyword) {
        currentKeyword.value = newKeyword;
        relatedWords.value = [];
      }
    });

    watch(() => props.keywordInfo, (info) => {
      if (!info?.keyword) return;
      currentKeyword.value = info.keyword;
      relatedWords.value = Array.isArray(info.relatedWords) && info.relatedWords.length
        ? info.relatedWords
        : [];
      emit('change:keyword', info.keyword);
    }, { deep: true });

    watch(() => props.score, (newScore) => {
      showScore.value = !!newScore;
    });

    return {
      currentKeyword,
      selectedDifficulty,
      difficulties,
      relatedWords,
      localTitle,
      localContent,
      keywordCount,
      contentCharCount,
      keywordCheckResult,
      showScore,
      getRandomKeyword,
      checkKeywordCount,
      clearContent,
      handlePolish,
      handleApplyPolish
    };
  }
};
</script>

<style scoped>
.feihua-mode {
  padding: 24px;
}

/* 面板标题 */
.panel-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(139, 115, 85, 0.1);
}

.header-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(212, 165, 116, 0.15), rgba(139, 115, 85, 0.1));
  border-radius: 16px;
}

.header-text h2 {
  font-size: 22px;
  color: #5d4e37;
  margin: 0 0 4px 0;
  font-family: 'Noto Serif SC', serif;
}

.header-text p {
  font-size: 14px;
  color: #8b7355;
  margin: 0;
}

/* 关键字选择区 */
.keyword-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 20px;
  border: 2px dashed rgba(139, 115, 85, 0.2);
}

.keyword-display {
  text-align: center;
}

.keyword-question {
  font-size: 80px;
  color: #d4a574;
  font-family: 'Noto Serif SC', serif;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.05); opacity: 1; }
}

/* 难度选择 */
.difficulty-selector {
  text-align: center;
}

.difficulty-label {
  display: block;
  font-size: 14px;
  color: #8b7355;
  margin-bottom: 12px;
}

.difficulty-buttons {
  display: flex;
  gap: 12px;
}

.diff-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(139, 115, 85, 0.15);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.diff-btn:hover {
  border-color: #d4a574;
  background: rgba(212, 165, 116, 0.08);
}

.diff-btn.active {
  background: linear-gradient(135deg, rgba(139, 115, 85, 0.12), rgba(212, 165, 116, 0.15));
  border-color: #d4a574;
  box-shadow: 0 4px 16px rgba(139, 115, 85, 0.15);
}

.diff-icon {
  font-size: 24px;
}

.diff-name {
  font-size: 14px;
  color: #5d4e37;
  font-family: 'Noto Serif SC', serif;
}

/* 随机按钮 */
.random-keyword-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #d4a574, #8b7355);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Serif SC', serif;
}

.random-keyword-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(139, 115, 85, 0.35);
}

.random-keyword-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner-small {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 关键字提示 */
.keyword-tips {
  text-align: center;
}

.keyword-tips p {
  font-size: 13px;
  color: #8b7355;
  margin: 0;
}

.keyword-tips span {
  color: #5d4e37;
  font-weight: 500;
}

/* 关键字已选择 */
.keyword-selected {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 20px;
  text-align: center;
}

.keyword-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.keyword-char {
  font-size: 72px;
  color: #5d4e37;
  font-family: 'Noto Serif SC', serif;
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.1);
  animation: keywordFloat 3s ease-in-out infinite;
}

@keyframes keywordFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.change-keyword-btn {
  padding: 8px 20px;
  background: rgba(139, 115, 85, 0.1);
  border: 1px solid rgba(139, 115, 85, 0.2);
  border-radius: 20px;
  font-size: 13px;
  color: #8b7355;
  cursor: pointer;
  transition: all 0.3s ease;
}

.change-keyword-btn:hover {
  background: rgba(139, 115, 85, 0.15);
}

/* 相关意象 */
.related-words {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(139, 115, 85, 0.1);
}

.related-label {
  font-size: 13px;
  color: #8b7355;
}

.related-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.related-tag {
  padding: 4px 12px;
  background: rgba(212, 165, 116, 0.1);
  border-radius: 12px;
  font-size: 12px;
  color: #666;
}

/* 创作编辑器 */
.creation-editor {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  padding: 24px;
}

.title-input-section {
  margin-bottom: 16px;
}

.title-input {
  width: 100%;
  padding: 14px 18px;
  border: 2px solid rgba(139, 115, 85, 0.15);
  border-radius: 12px;
  font-size: 18px;
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  font-family: 'Noto Serif SC', serif;
  color: #5d4e37;
  transition: all 0.3s ease;
}

.title-input:focus {
  outline: none;
  border-color: #d4a574;
}

.title-input::placeholder {
  color: #b8a88a;
  font-style: italic;
}

.editor-area {
  position: relative;
}

.editor-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #8b7355;
}

.hint-icon {
  font-size: 16px;
}

.poem-textarea {
  width: 100%;
  padding: 16px;
  border: 2px solid rgba(139, 115, 85, 0.15);
  border-radius: 14px;
  font-size: 17px;
  font-family: 'Noto Serif SC', serif;
  line-height: 1.8;
  color: #5d4e37;
  background: rgba(255, 255, 255, 0.9);
  resize: vertical;
  min-height: 180px;
  transition: all 0.3s ease;
}

.poem-textarea:focus {
  outline: none;
  border-color: #d4a574;
  box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.1);
}

.poem-textarea::placeholder {
  color: #b8a88a;
}

/* 关键字计数 */
.keyword-counter {
  display: flex;
  justify-content: space-around;
  margin-top: 16px;
  padding: 14px;
  background: rgba(139, 115, 85, 0.05);
  border-radius: 12px;
}

.counter-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.counter-label {
  font-size: 12px;
  color: #8b7355;
}

.counter-value {
  font-size: 18px;
  font-weight: bold;
  color: #5d4e37;
  font-family: 'Noto Serif SC', serif;
}

.counter-value.highlight {
  color: #4caf50;
}

/* 关键字检测结果 */
.keyword-check-result {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 12px 16px;
  background: rgba(229, 115, 115, 0.08);
  border-radius: 10px;
}

.check-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(229, 115, 115, 0.15);
  color: #e57373;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
}

.check-icon.pass {
  background: rgba(129, 199, 132, 0.15);
  color: #81c784;
}

.check-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.check-title {
  font-size: 13px;
  color: #5d4e37;
  font-weight: 500;
}

.check-desc {
  font-size: 12px;
  color: #8b7355;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.clear-btn,
.score-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border-radius: 12px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Serif SC', serif;
}

.clear-btn {
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid rgba(139, 115, 85, 0.2);
  color: #8b7355;
}

.clear-btn:hover {
  background: rgba(139, 115, 85, 0.05);
}

.score-btn {
  background: linear-gradient(135deg, #d4a574, #8b7355);
  border: none;
  color: white;
}

.score-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(139, 115, 85, 0.3);
}

.score-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 评分面板 */
.score-panel {
  margin-top: 20px;
}

/* 动画 */
.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.4s ease;
}

.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .feihua-mode {
    padding: 16px;
  }

  .keyword-char {
    font-size: 56px;
  }

  .difficulty-buttons {
    flex-direction: column;
  }

  .diff-btn {
    flex-direction: row;
    justify-content: center;
  }
}
</style>
