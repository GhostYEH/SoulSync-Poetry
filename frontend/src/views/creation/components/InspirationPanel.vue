/**
 * 灵感生成面板组件
 * Step 1: 灵感生成 - 用户输入主题，AI生成关键词、情感基调等
 */
<template>
  <div class="inspiration-panel">
    <!-- 面板标题 -->
    <div class="panel-header">
      <div class="header-icon">✨</div>
      <div class="header-text">
        <h2>灵感生成</h2>
        <p>输入创作主题，让AI为你发散创意</p>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-section">
      <!-- 主题输入 -->
      <div class="input-group">
        <label class="input-label">
          <span class="label-icon">🌸</span>
          创作主题
        </label>
        <input
          type="text"
          v-model="localTheme"
          placeholder="如：思乡、春日、离别、山水..."
          class="theme-input"
          @input="onThemeInput"
          @keyup.enter="generate"
        />
        <div class="input-hints">
          <span class="hint-item">试试：春日</span>
          <span class="hint-item">思乡</span>
          <span class="hint-item">离别</span>
        </div>
      </div>

      <!-- 体裁选择 -->
      <div class="input-group">
        <label class="input-label">
          <span class="label-icon">📜</span>
          选择体裁
        </label>
        <div class="genre-grid">
          <button
            v-for="genre in genres"
            :key="genre.value"
            :class="['genre-btn', { active: localGenre === genre.value }]"
            @click="selectGenre(genre.value)"
          >
            <span class="genre-name">{{ genre.name }}</span>
            <span class="genre-desc">{{ genre.desc }}</span>
          </button>
        </div>
      </div>

      <!-- 生成按钮 -->
      <button
        class="generate-btn"
        @click="generate"
        :disabled="isLoading || !localTheme.trim()"
      >
        <span class="btn-content">
          <span class="btn-icon" v-if="!isLoading">✦</span>
          <span class="loading-spinner" v-else></span>
          <span class="btn-text">{{ isLoading ? 'AI正在构思中...' : '生成灵感' }}</span>
        </span>
        <span class="btn-glow" v-if="!isLoading && localTheme.trim()"></span>
      </button>

      <!-- AI加载提示 -->
      <div v-if="isLoading" class="ai-loading-tip">
        <span class="tip-icon">⏳</span>
        <span class="tip-text">AI正在根据「{{ localTheme }}」主题构思创意...</span>
        <span class="tip-note">预计需要10-60秒，请稍候</span>
      </div>
    </div>

    <!-- 灵感结果展示 -->
    <transition name="fade-up">
      <div v-if="result" class="result-section">
        <!-- 创意关键词 -->
        <div class="result-card keywords-card">
          <div class="card-header">
            <span class="card-icon">💫</span>
            <h3>创意关键词</h3>
          </div>
          <div class="keywords-cloud">
            <span
              v-for="kw in result.keywords"
              :key="kw"
              class="keyword-tag"
              :class="{ selected: selectedKeywords.includes(kw) }"
              @click="toggleKeyword(kw)"
            >
              {{ kw }}
            </span>
          </div>
          <div class="selected-info" v-if="selectedKeywords.length > 0">
            已选择 {{ selectedKeywords.length }} 个关键词
          </div>
        </div>

        <!-- 情感基调 -->
        <div class="result-card mood-card">
          <div class="card-header">
            <span class="card-icon">🎭</span>
            <h3>情感基调</h3>
          </div>
          <div class="mood-display">
            <span class="mood-tag" :style="{ background: getMoodColor(result.mood) }">
              {{ result.mood }}
            </span>
            <span class="mood-desc">{{ getMoodDescription(result.mood) }}</span>
          </div>
        </div>

        <!-- 创作建议 -->
        <div class="result-card suggestions-card">
          <div class="card-header">
            <span class="card-icon">💡</span>
            <h3>创作建议</h3>
          </div>
          <ul class="suggestions-list">
            <li v-for="(s, i) in result.suggestions" :key="i">
              <span class="suggestion-bullet">{{ i + 1 }}</span>
              <span class="suggestion-text">{{ s }}</span>
            </li>
          </ul>
        </div>

        <!-- 主题诗意化表达 -->
        <div class="result-card theme-card">
          <div class="card-header">
            <span class="card-icon">✨</span>
            <h3>主题诗意化表达</h3>
          </div>
          <p class="thematic-expression">{{ result.theme }}</p>
        </div>

        <!-- 进入下一步按钮 -->
        <button class="next-step-btn" @click="goToNext">
          <span class="btn-text">进入结构引导</span>
          <span class="btn-arrow">→</span>
        </button>
      </div>
    </transition>

    <!-- 打字机效果覆盖层 -->
    <transition name="fade">
      <div v-if="showTypewriter" class="typewriter-overlay">
        <div class="typewriter-content">
          <div class="typewriter-icon">🖌️</div>
          <div class="typewriter-text">{{ typewriterText }}</div>
          <div class="typewriter-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, reactive, computed, watch } from 'vue';

export default {
  name: 'InspirationPanel',
  props: {
    theme: {
      type: String,
      default: ''
    },
    genre: {
      type: String,
      default: '五言绝句'
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:theme', 'update:genre', 'generate', 'next'],
  setup(props, { emit }) {
    const localTheme = ref(props.theme);
    const localGenre = ref(props.genre);
    const result = ref(null);
    const selectedKeywords = ref([]);
    const showTypewriter = ref(false);
    const typewriterText = ref('');

    const genres = [
      { value: '五言绝句', name: '五言绝句', desc: '4句 × 5字' },
      { value: '七言绝句', name: '七言绝句', desc: '4句 × 7字' },
      { value: '五言律诗', name: '五言律诗', desc: '8句 × 5字' },
      { value: '七言律诗', name: '七言律诗', desc: '8句 × 7字' },
      { value: '宋词', name: '宋词', desc: '词牌格律' }
    ];

    const moodColors = {
      '清新': 'linear-gradient(135deg, #81c784, #4caf50)',
      '豪放': 'linear-gradient(135deg, #ff7043, #f4511e)',
      '婉约': 'linear-gradient(135deg, #f48fb1, #f06292)',
      '忧郁': 'linear-gradient(135deg, #7986cb, #5c6bc0)',
      '欢快': 'linear-gradient(135deg, #fff176, #ffee58)',
      '宁静': 'linear-gradient(135deg, #90caf9, #64b5f6)',
      '苍凉': 'linear-gradient(135deg, #b0bec5, #78909c)',
      '壮美': 'linear-gradient(135deg, #ff8a65, #ff5722)'
    };

    const moodDescriptions = {
      '清新': '如晨露般明亮清澈，适合描写自然景物',
      '豪放': '气势磅礴，胸怀开阔，常用夸张手法',
      '婉约': '细腻柔美，情感内敛，意境深远',
      '忧郁': '情感低沉，思绪万千，略带感伤',
      '欢快': '轻松愉悦，心情舒畅，充满生机',
      '宁静': '平和安静，心如止水，超然物外',
      '苍凉': '萧瑟悲壮，意境深远，历史感强',
      '壮美': '雄伟壮观，气势恢宏，令人振奋'
    };

    const onThemeInput = () => {
      emit('update:theme', localTheme.value);
    };

    const selectGenre = (genre) => {
      localGenre.value = genre;
      emit('update:genre', genre);
    };

    const toggleKeyword = (keyword) => {
      const index = selectedKeywords.value.indexOf(keyword);
      if (index > -1) {
        selectedKeywords.value.splice(index, 1);
      } else {
        selectedKeywords.value.push(keyword);
      }
    };

    const getMoodColor = (mood) => {
      return moodColors[mood] || moodColors['清新'];
    };

    const getMoodDescription = (mood) => {
      return moodDescriptions[mood] || '';
    };

    const generate = () => {
      if (!localTheme.value.trim()) return;

      // 显示打字机效果
      typewriterText.value = '正在构思创意关键词...';
      showTypewriter.value = true;

      emit('generate', {
        theme: localTheme.value,
        genre: localGenre.value
      });
    };

    const setResult = (data) => {
      result.value = data;
      selectedKeywords.value = [];
      showTypewriter.value = false;
    };

    const setLoading = (loading) => {
      if (loading) {
        typewriterText.value = '正在构思创意关键词...';
        showTypewriter.value = true;
      } else {
        showTypewriter.value = false;
      }
    };

    // 监听isLoading变化
    watch(
      () => props.isLoading,
      (newValue) => {
        setLoading(newValue);
      },
      { immediate: true }
    );

    const goToNext = () => {
      emit('next', {
        theme: localTheme.value,
        genre: localGenre.value,
        keywords: selectedKeywords.value,
        mood: result.value?.mood,
        suggestions: result.value?.suggestions
      });
    };

    return {
      localTheme,
      localGenre,
      genres,
      result,
      selectedKeywords,
      showTypewriter,
      typewriterText,
      onThemeInput,
      selectGenre,
      toggleKeyword,
      getMoodColor,
      getMoodDescription,
      generate,
      setResult,
      setLoading,
      goToNext
    };
  }
};
</script>

<style scoped>
.inspiration-panel {
  padding: 24px;
  position: relative;
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

/* 输入区域 */
.input-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #5d4e37;
  font-weight: 500;
  font-family: 'Noto Serif SC', serif;
}

.label-icon {
  font-size: 18px;
}

.theme-input {
  width: 100%;
  padding: 16px 20px;
  border: 2px solid rgba(139, 115, 85, 0.2);
  border-radius: 14px;
  font-size: 17px;
  background: rgba(255, 255, 255, 0.9);
  font-family: 'Noto Serif SC', serif;
  color: #5d4e37;
  transition: all 0.3s ease;
}

.theme-input:focus {
  outline: none;
  border-color: #d4a574;
  box-shadow: 0 0 0 4px rgba(212, 165, 116, 0.15);
}

.theme-input::placeholder {
  color: #b8a88a;
}

.input-hints {
  display: flex;
  gap: 10px;
}

.hint-item {
  padding: 6px 14px;
  background: rgba(139, 115, 85, 0.08);
  border-radius: 20px;
  font-size: 13px;
  color: #8b7355;
  cursor: pointer;
  transition: all 0.3s ease;
}

.hint-item:hover {
  background: rgba(212, 165, 116, 0.2);
  color: #5d4e37;
}

/* 体裁选择 */
.genre-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.genre-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(139, 115, 85, 0.15);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.genre-btn:hover {
  border-color: #d4a574;
  background: rgba(212, 165, 116, 0.08);
}

.genre-btn.active {
  background: linear-gradient(135deg, rgba(139, 115, 85, 0.12), rgba(212, 165, 116, 0.15));
  border-color: #d4a574;
  box-shadow: 0 4px 16px rgba(139, 115, 85, 0.15);
}

.genre-name {
  font-size: 15px;
  color: #5d4e37;
  font-weight: 500;
  font-family: 'Noto Serif SC', serif;
}

.genre-desc {
  font-size: 12px;
  color: #8b7355;
}

/* 生成按钮 */
.generate-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 32px;
  background: linear-gradient(135deg, #8b7355, #a08060);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 17px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.4s ease;
  font-family: 'Noto Serif SC', serif;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(139, 115, 85, 0.35);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.btn-icon {
  font-size: 20px;
}

.btn-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 70%
  );
  animation: glow 1.5s infinite;
}

@keyframes glow {
  from { transform: translateX(-100%) rotate(45deg); }
  to { transform: translateX(100%) rotate(45deg); }
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 结果区域 */
.result-section {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(139, 115, 85, 0.12);
  border-radius: 18px;
  padding: 22px;
  animation: fadeInUp 0.6s ease-out;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.card-icon {
  font-size: 20px;
}

.card-header h3 {
  font-size: 16px;
  color: #5d4e37;
  margin: 0;
  font-family: 'Noto Serif SC', serif;
}

/* 关键词云 */
.keywords-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.keyword-tag {
  padding: 10px 18px;
  background: linear-gradient(135deg, rgba(212, 165, 116, 0.12), rgba(139, 115, 85, 0.08));
  border: 1px solid rgba(139, 115, 85, 0.18);
  border-radius: 24px;
  font-size: 15px;
  color: #5d4e37;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Serif SC', serif;
}

.keyword-tag:hover {
  background: linear-gradient(135deg, #d4a574, #8b7355);
  color: white;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(139, 115, 85, 0.25);
}

.keyword-tag.selected {
  background: linear-gradient(135deg, #d4a574, #8b7355);
  color: white;
  border-color: #d4a574;
}

.selected-info {
  margin-top: 14px;
  font-size: 13px;
  color: #8b7355;
  text-align: center;
}

/* 情感基调 */
.mood-display {
  display: flex;
  align-items: center;
  gap: 14px;
}

.mood-tag {
  padding: 10px 22px;
  border-radius: 24px;
  font-size: 16px;
  color: white;
  font-weight: 500;
  font-family: 'Noto Serif SC', serif;
}

.mood-desc {
  font-size: 14px;
  color: #8b7355;
  line-height: 1.5;
}

/* 创作建议 */
.suggestions-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestions-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(212, 165, 116, 0.06);
  border-radius: 10px;
}

.suggestion-bullet {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #d4a574, #8b7355);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.suggestion-text {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

/* 主题诗意化表达 */
.thematic-expression {
  font-size: 18px;
  color: #5d4e37;
  font-family: 'Noto Serif SC', serif;
  font-style: italic;
  line-height: 1.8;
  margin: 0;
  padding: 16px;
  background: rgba(245, 239, 230, 0.6);
  border-radius: 10px;
  border-left: 4px solid #d4a574;
}

/* 下一步按钮 */
.next-step-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #d4a574, #8b7355);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 8px;
  font-family: 'Noto Serif SC', serif;
}

.next-step-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(139, 115, 85, 0.3);
}

.btn-arrow {
  transition: transform 0.3s ease;
}

.next-step-btn:hover .btn-arrow {
  transform: translateX(5px);
}

/* 打字机效果 */
.typewriter-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  z-index: 10;
}

.typewriter-content {
  text-align: center;
}

.typewriter-icon {
  font-size: 40px;
  margin-bottom: 16px;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.typewriter-text {
  font-size: 18px;
  color: #5d4e37;
  font-family: 'Noto Serif SC', serif;
  margin-bottom: 16px;
}

.typewriter-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.typewriter-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #d4a574;
  animation: typing 1.4s ease-in-out infinite;
}

.typewriter-dots span:nth-child(2) { animation-delay: 0.2s; }
.typewriter-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* 动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-up-enter-active {
  transition: all 0.5s ease-out;
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
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
  .inspiration-panel {
    padding: 16px;
  }

  .genre-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .theme-input {
    font-size: 16px;
    padding: 14px 16px;
  }
}
</style>
