/**
 * 接龙创作模式组件
 * 用户与AI轮流创作，形成循环
 */
<template>
  <div class="chain-mode">
    <!-- 面板标题 -->
    <div class="panel-header">
      <div class="header-icon">🔗</div>
      <div class="header-text">
        <h2>接龙创作</h2>
        <p>与AI轮流创作，句句相扣，意境连贯</p>
      </div>
    </div>

    <!-- 初始设置 -->
    <div class="setup-section" v-if="!chainStarted">
      <!-- 创作主题 -->
      <div class="setup-card">
        <div class="setup-header">
          <span class="setup-icon">📝</span>
          <h3>创作主题</h3>
        </div>
        <input
          type="text"
          v-model="chainTheme"
          placeholder="输入创作主题，如：思乡、离别、山水..."
          class="setup-input"
        />
      </div>

      <!-- 体裁选择 -->
      <div class="setup-card">
        <div class="setup-header">
          <span class="setup-icon">📜</span>
          <h3>选择体裁</h3>
        </div>
        <div class="genre-selector">
          <button
            v-for="genre in genres"
            :key="genre"
            :class="['genre-btn', { active: selectedGenre === genre }]"
            @click="selectedGenre = genre"
          >
            {{ genre }}
          </button>
        </div>
      </div>

      <!-- 创作顺序 -->
      <div class="setup-card">
        <div class="setup-header">
          <span class="setup-icon">🎭</span>
          <h3>创作顺序</h3>
        </div>
        <div class="order-options">
          <label :class="['order-option', { active: startMode === 'ai' }]">
            <input type="radio" v-model="startMode" value="ai" />
            <span class="option-icon">🤖</span>
            <span class="option-text">AI先写</span>
            <span class="option-desc">AI抛出开场</span>
          </label>
          <label :class="['order-option', { active: startMode === 'user' }]">
            <input type="radio" v-model="startMode" value="user" />
            <span class="option-icon">✍️</span>
            <span class="option-text">你先写</span>
            <span class="option-desc">你来开场</span>
          </label>
        </div>
      </div>

      <!-- 开始按钮 -->
      <button
        class="start-chain-btn"
        @click="startChain"
        :disabled="isLoading || !chainTheme.trim()"
      >
        <span v-if="isLoading" class="loading-spinner-small"></span>
        <span v-else>🚀</span>
        <span>{{ isLoading ? '启动中...' : '开始接龙' }}</span>
      </button>
    </div>

    <!-- 接龙进行中 -->
    <div class="chain-active" v-else>
      <!-- 状态栏 -->
      <div class="chain-status-bar">
        <div class="status-info">
          <span class="turn-indicator" :class="{ user: isUserTurn, ai: !isUserTurn }">
            {{ isUserTurn ? '✍️ 你的回合' : '🤖 AI回合' }}
          </span>
          <span class="line-counter">第 {{ currentLineNumber }} 句</span>
        </div>
        <div class="progress-info">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <span class="progress-text">{{ chainLines.length }}/{{ targetLines }}</span>
        </div>
      </div>

      <!-- 对话区域 -->
      <div class="chain-dialogue">
        <transition-group name="line-slide" tag="div" class="lines-container">
          <div
            v-for="(line, index) in chainLines"
            :key="index"
            :class="['chain-line', line.from]"
          >
            <div class="line-avatar">
              {{ line.from === 'user' ? '✍️' : '🤖' }}
            </div>
            <div class="line-content">
              <div class="line-header">
                <span class="line-author">{{ line.from === 'user' ? '你' : 'AI' }}</span>
                <span class="line-number-badge">第{{ index + 1 }}句</span>
              </div>
              <div class="line-text">{{ line.text }}</div>
            </div>
          </div>
        </transition-group>

        <!-- AI思考中 -->
        <div class="ai-thinking" v-if="!isUserTurn && isAIThinking">
          <div class="thinking-bubble">
            <div class="thinking-dots">
              <span></span><span></span><span></span>
            </div>
            <span class="thinking-text">AI正在构思...</span>
          </div>
        </div>
      </div>

      <!-- 提示区域 -->
      <div class="hints-section" v-if="currentHint">
        <span class="hint-icon">💡</span>
        <span class="hint-text">{{ currentHint }}</span>
      </div>

      <!-- 用户输入 -->
      <div class="user-input-area" v-if="isUserTurn">
        <div class="input-wrapper">
          <textarea
            v-model="userInput"
            :placeholder="`输入第 ${currentLineNumber} 句...`"
            class="user-input"
            rows="2"
            @keydown.enter.ctrl="submitLine"
          ></textarea>
          <div class="input-meta">
            <span class="char-count">{{ userInput.length }}/{{ expectedChars }}字</span>
            <span class="input-hint">Ctrl+Enter 快捷提交</span>
          </div>
        </div>
        <button
          class="submit-btn"
          @click="submitLine"
          :disabled="!userInput.trim() || userInput.length !== expectedChars"
        >
          <span>提交</span>
          <span class="arrow">→</span>
        </button>
      </div>

      <!-- 结束按钮 -->
      <div class="end-section">
        <button class="end-btn" @click="endChain">
          结束创作
        </button>
      </div>
    </div>

    <!-- 完成弹窗 -->
    <transition name="fade">
      <div class="completion-overlay" v-if="showCompletion" @click.self="showCompletion = false">
        <div class="completion-modal">
          <div class="modal-icon">🎉</div>
          <h3>创作完成！</h3>
          <div class="final-poem">
            <h4 v-if="poemTitle">{{ poemTitle }}</h4>
            <pre>{{ finalPoem }}</pre>
          </div>
          <div class="modal-actions">
            <button class="modal-btn secondary" @click="startNewChain">
              继续创作
            </button>
            <button class="modal-btn primary" @click="goToEdit">
              去编辑
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';

export default {
  name: 'ChainMode',
  props: {
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['start', 'submit', 'end', 'update:theme', 'update:genre'],
  setup(props, { emit }) {
    const chainStarted = ref(false);
    const chainTheme = ref('');
    const selectedGenre = ref('五言绝句');
    const startMode = ref('ai');
    const chainLines = ref([]);
    const isUserTurn = ref(true);
    const isAIThinking = ref(false);
    const userInput = ref('');
    const currentHint = ref('');
    const showCompletion = ref(false);
    const poemTitle = ref('');

    const genres = ['五言绝句', '七言绝句', '五言律诗', '七言律诗'];

    const expectedChars = computed(() => {
      return selectedGenre.value.includes('七') ? 7 : 5;
    });

    const expectedLines = computed(() => {
      return selectedGenre.value.includes('律诗') ? 8 : 4;
    });

    const targetLines = computed(() => expectedLines.value);

    const currentLineNumber = computed(() => chainLines.value.length + 1);

    const progressPercent = computed(() => {
      return (chainLines.value.length / targetLines.value) * 100;
    });

    const finalPoem = computed(() => {
      return chainLines.value.map(l => l.text).join('\n');
    });

    const startChain = () => {
      if (!chainTheme.value.trim()) return;

      chainStarted.value = true;
      isUserTurn.value = startMode.value === 'user';

      emit('start', {
        theme: chainTheme.value,
        genre: selectedGenre.value,
        startMode: startMode.value
      });

      // 如果是AI先写
      if (startMode.value === 'ai') {
        isAIThinking.value = true;
        requestAILine();
      } else {
        updateHint();
      }
    };

    const requestAILine = () => {
      const lastLine = chainLines.value.length > 0
        ? chainLines.value[chainLines.value.length - 1].text
        : '';

      const allLinesText = chainLines.value.map(l => l.text);

      const payload = {
        userLine: lastLine,
        genre: selectedGenre.value,
        theme: chainTheme.value,
        lineNumber: currentLineNumber.value
      };

      // 只有在有历史行时才传 allLines，避免空数组导致后端验证失败
      if (allLinesText.length > 0) {
        payload.allLines = allLinesText;
      }

      emit('submit', payload);
    };

    const submitLine = () => {
      if (!userInput.value.trim()) return;

      chainLines.value.push({
        text: userInput.value.trim(),
        from: 'user'
      });

      userInput.value = '';

      // 检查是否完成
      if (chainLines.value.length >= targetLines.value) {
        completeChain();
        return;
      }

      // 切换到AI回合
      isUserTurn.value = false;
      isAIThinking.value = true;
      currentHint.value = '';

      requestAILine();
    };

    const handleAILine = (aiLine) => {
      isAIThinking.value = false;

      if (aiLine) {
        chainLines.value.push({
          text: aiLine,
          from: 'ai'
        });

        // 检查是否完成
        if (chainLines.value.length >= targetLines.value) {
          completeChain();
          return;
        }
      }

      // 切换到用户回合
      isUserTurn.value = true;
      updateHint();
    };

    const updateHint = () => {
      const hints = [
        '语义自然衔接上句，让诗意如流水般顺畅',
        '情感层次要分明，起承转合各有侧重',
        '韵脚要和谐统一，让全诗读起来更流畅',
        '律诗注重对仗之美，颔联颈联尤为关键',
        '意象选择要贴合主题，避免杂乱无章',
        '语言要凝练含蓄，留有想象空间',
        '节奏要抑扬顿挫，富有音乐美感',
        '意境要深远悠长，引人回味'
      ];

      if (chainLines.value.length === 0) {
        currentHint.value = '起句要新颖别致，为全诗定下基调';
      } else if (chainLines.value.length === expectedLines.value - 1) {
        currentHint.value = '收句要余韵悠长，点明主旨升华意境';
      } else {
        currentHint.value = hints[Math.floor(Math.random() * hints.length)];
      }
    };

    const completeChain = () => {
      showCompletion.value = true;
      poemTitle.value = `接龙作品 - ${chainTheme.value}`;
    };

    const endChain = () => {
      chainStarted.value = false;
      chainLines.value = [];
      userInput.value = '';
      currentHint.value = '';
      showCompletion.value = false;

      emit('end', {
        lines: chainLines.value.map(l => l.text),
        title: poemTitle.value,
        genre: selectedGenre.value,
        theme: chainTheme.value
      });
    };

    const startNewChain = () => {
      chainLines.value = [];
      userInput.value = '';
      showCompletion.value = false;
      isUserTurn.value = startMode.value === 'user';

      if (startMode.value === 'ai') {
        isAIThinking.value = true;
        requestAILine();
      } else {
        updateHint();
      }
    };

    const goToEdit = () => {
      emit('end', {
        lines: chainLines.value.map(l => l.text),
        title: poemTitle.value,
        genre: selectedGenre.value,
        theme: chainTheme.value,
        goToEdit: true
      });
    };

    // 暴露方法给父组件
    const setAILine = (aiLine) => {
      handleAILine(aiLine);
    };

    return {
      chainStarted,
      chainTheme,
      selectedGenre,
      genres,
      startMode,
      chainLines,
      isUserTurn,
      isAIThinking,
      userInput,
      currentHint,
      showCompletion,
      poemTitle,
      expectedChars,
      targetLines,
      currentLineNumber,
      progressPercent,
      finalPoem,
      startChain,
      submitLine,
      endChain,
      startNewChain,
      goToEdit,
      setAILine
    };
  }
};
</script>

<style scoped>
.chain-mode {
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

/* 设置区域 */
.setup-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setup-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(139, 115, 85, 0.1);
}

.setup-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.setup-icon {
  font-size: 20px;
}

.setup-header h3 {
  font-size: 15px;
  color: #5d4e37;
  margin: 0;
  font-family: 'Noto Serif SC', serif;
}

.setup-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid rgba(139, 115, 85, 0.15);
  border-radius: 12px;
  font-size: 16px;
  font-family: 'Noto Serif SC', serif;
  background: rgba(255, 255, 255, 0.9);
  color: #5d4e37;
  transition: all 0.3s ease;
}

.setup-input:focus {
  outline: none;
  border-color: #d4a574;
}

.setup-input::placeholder {
  color: #b8a88a;
}

/* 体裁选择 */
.genre-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.genre-btn {
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(139, 115, 85, 0.15);
  border-radius: 20px;
  font-size: 14px;
  color: #8b7355;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Serif SC', serif;
}

.genre-btn:hover {
  border-color: #d4a574;
}

.genre-btn.active {
  background: linear-gradient(135deg, #8b7355, #d4a574);
  color: white;
  border-color: #d4a574;
}

/* 创作顺序 */
.order-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.order-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(139, 115, 85, 0.15);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.order-option:hover {
  border-color: #d4a574;
}

.order-option.active {
  background: rgba(212, 165, 116, 0.1);
  border-color: #d4a574;
}

.order-option input {
  display: none;
}

.option-icon {
  font-size: 28px;
}

.option-text {
  font-size: 15px;
  color: #5d4e37;
  font-weight: 500;
  font-family: 'Noto Serif SC', serif;
}

.option-desc {
  font-size: 12px;
  color: #8b7355;
}

/* 开始按钮 */
.start-chain-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px 32px;
  background: linear-gradient(135deg, #8b7355, #a08060);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 17px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Serif SC', serif;
}

.start-chain-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(139, 115, 85, 0.35);
}

.start-chain-btn:disabled {
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

/* 接龙进行中 */
.chain-active {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 状态栏 */
.chain-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 14px;
  border: 1px solid rgba(139, 115, 85, 0.1);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.turn-indicator {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.turn-indicator.user {
  background: rgba(212, 165, 116, 0.15);
  color: #8b7355;
}

.turn-indicator.ai {
  background: rgba(139, 115, 85, 0.1);
  color: #666;
}

.line-counter {
  font-size: 13px;
  color: #8b7355;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  width: 80px;
  height: 6px;
  background: rgba(139, 115, 85, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #d4a574, #8b7355);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.progress-text {
  font-size: 12px;
  color: #8b7355;
}

/* 对话区域 */
.chain-dialogue {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.lines-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chain-line {
  display: flex;
  gap: 12px;
  animation: fadeIn 0.4s ease;
}

.chain-line.user {
  flex-direction: row-reverse;
}

.line-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 115, 85, 0.1);
  border-radius: 50%;
  font-size: 18px;
  flex-shrink: 0;
}

.chain-line.user .line-avatar {
  background: rgba(212, 165, 116, 0.15);
}

.line-content {
  flex: 1;
  max-width: 85%;
}

.chain-line.user .line-content {
  text-align: right;
}

.line-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.chain-line.user .line-header {
  flex-direction: row-reverse;
}

.line-author {
  font-size: 12px;
  color: #8b7355;
}

.line-number-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(139, 115, 85, 0.08);
  border-radius: 8px;
  color: #666;
}

.line-text {
  padding: 12px 16px;
  background: rgba(139, 115, 85, 0.06);
  border-radius: 12px;
  font-size: 17px;
  color: #5d4e37;
  font-family: 'Noto Serif SC', serif;
  line-height: 1.6;
  display: inline-block;
}

.chain-line.user .line-text {
  background: rgba(212, 165, 116, 0.12);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* AI思考中 */
.ai-thinking {
  display: flex;
  justify-content: flex-start;
  padding: 8px 0;
}

.thinking-bubble {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(139, 115, 85, 0.08);
  border-radius: 14px;
}

.thinking-dots {
  display: flex;
  gap: 4px;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d4a574;
  animation: thinking 1.4s ease-in-out infinite;
}

.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes thinking {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.thinking-text {
  font-size: 13px;
  color: #8b7355;
}

/* 提示区域 */
.hints-section {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(212, 165, 116, 0.08);
  border-radius: 12px;
}

.hint-icon {
  font-size: 16px;
}

.hint-text {
  font-size: 13px;
  color: #666;
}

/* 用户输入 */
.user-input-area {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(139, 115, 85, 0.1);
}

.input-wrapper {
  margin-bottom: 12px;
}

.user-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid rgba(139, 115, 85, 0.15);
  border-radius: 12px;
  font-size: 17px;
  font-family: 'Noto Serif SC', serif;
  line-height: 1.6;
  color: #5d4e37;
  resize: none;
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.3s ease;
}

.user-input:focus {
  outline: none;
  border-color: #d4a574;
}

.user-input::placeholder {
  color: #b8a88a;
}

.input-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.char-count {
  font-size: 12px;
  color: #8b7355;
}

.input-hint {
  font-size: 11px;
  color: #b8a88a;
}

.submit-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  background: linear-gradient(135deg, #d4a574, #8b7355);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Serif SC', serif;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 115, 85, 0.3);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.arrow {
  transition: transform 0.3s ease;
}

.submit-btn:hover .arrow {
  transform: translateX(4px);
}

/* 结束区域 */
.end-section {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.end-btn {
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(139, 115, 85, 0.2);
  border-radius: 20px;
  font-size: 14px;
  color: #8b7355;
  cursor: pointer;
  transition: all 0.3s ease;
}

.end-btn:hover {
  background: rgba(139, 115, 85, 0.1);
}

/* 完成弹窗 */
.completion-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.completion-modal {
  background: white;
  border-radius: 24px;
  padding: 32px;
  max-width: 480px;
  width: 100%;
  text-align: center;
  animation: modalIn 0.4s ease;
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.modal-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.completion-modal h3 {
  font-size: 24px;
  color: #5d4e37;
  margin: 0 0 20px 0;
  font-family: 'Noto Serif SC', serif;
}

.final-poem {
  background: rgba(245, 239, 230, 0.6);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 24px;
}

.final-poem h4 {
  font-size: 16px;
  color: #8b7355;
  margin: 0 0 12px 0;
}

.final-poem pre {
  font-size: 17px;
  color: #5d4e37;
  font-family: 'Noto Serif SC', serif;
  line-height: 1.8;
  margin: 0;
  white-space: pre-wrap;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-btn {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Noto Serif SC', serif;
}

.modal-btn.secondary {
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid rgba(139, 115, 85, 0.2);
  color: #8b7355;
}

.modal-btn.secondary:hover {
  background: rgba(139, 115, 85, 0.05);
}

.modal-btn.primary {
  background: linear-gradient(135deg, #d4a574, #8b7355);
  border: none;
  color: white;
}

.modal-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 115, 85, 0.3);
}

/* 动画 */
.line-slide-enter-active,
.line-slide-leave-active {
  transition: all 0.4s ease;
}

.line-slide-enter-from,
.line-slide-leave-to {
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
  .chain-mode {
    padding: 16px;
  }

  .order-options {
    grid-template-columns: 1fr;
  }
}
</style>
