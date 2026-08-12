<template>
  <div class="poem-challenge">
    <div class="challenge-header">
      <h1 class="challenge-title">古诗词闯关</h1>
      <div class="header-actions">
        <router-link to="/challenge/rank" class="glass-nav-button">排行榜</router-link>
        <router-link to="/challenge/error-book" class="glass-nav-button">错题本</router-link>
        <router-link to="/challenge/review" class="glass-nav-button review-btn">错题复习</router-link>
        <router-link to="/challenge/battle" class="glass-nav-button battle-btn">闯关对战</router-link>
      </div>
    </div>

    <div v-if="!isLoggedIn" class="login-prompt">
      <div class="glass-card">
        <h3>请先登录</h3>
        <p>登录后即可开始闯关挑战！</p>
        <button class="glass-button" @click="showLoginModal">立即登录</button>
      </div>
    </div>

    <div v-else>
      <div class="level-selector">
        <div class="level-scroll">
          <div
            v-for="level in 200"
            :key="level"
            :class="['level-item', {
              'current': level === currentLevel,
              'locked': level > highestLevel + 1,
              'completed': level <= highestLevel
            }]"
            @click="selectLevel(level)"
          >
            {{ level }}
          </div>
        </div>
      </div>

      <div v-if="loading" class="question-area">
        <div class="skeleton-question">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-content"></div>
          <div class="skeleton-line skeleton-content"></div>
          <div class="skeleton-input skeleton-input-field"></div>
          <div class="skeleton-button skeleton-btn"></div>
        </div>
      </div>

      <div v-else-if="currentQuestion" class="question-area glass-card">
        <div class="question-header">
          <span class="level-badge">第 {{ currentLevel }} 关</span>
            <span class="difficulty-badge" :class="getDifficultyClass(currentQuestion.difficulty)">
              {{ getDifficultyText(currentQuestion.difficulty) }} | {{ currentQuestion.description }}
            </span>
        </div>

        <div class="poem-info">
          <h3 class="poem-title">{{ currentQuestion.title }}</h3>
          <p class="poem-author">作者：{{ currentQuestion.author }}</p>
        </div>

        <div class="question-text">
          <span v-if="currentQuestion.type === 'fill'">{{ currentQuestion.question }}</span>
          <span v-else-if="currentQuestion.type === 'choice'">{{ currentQuestion.question }}</span>
          <span v-else>{{ currentQuestion.question }}</span>
          <!-- 显示选项（如果是选择题） -->
          <div v-if="currentQuestion.type === 'choice' && !answered" class="options-area">
            <div
              v-for="(option, index) in currentQuestion.options"
              :key="index"
              :class="['option-item', { 'selected': selectedOption === index }]"
              @click="selectOption(index)"
            >
              {{ String.fromCharCode(65 + index) }}. {{ option }}
            </div>
          </div>
        </div>

        <div v-if="!answered" class="answer-input-area">
          <template v-if="currentQuestion.type === 'choice'">
            <button class="glass-button submit-btn" @click="submitAnswer" :disabled="selectedOption === null">
              提交答案
            </button>
          </template>
          <template v-else>
            <input
              v-model="userAnswer"
              type="text"
              class="answer-input"
              placeholder="请输入答案"
              @keyup.enter="submitAnswer"
            />
            <button class="glass-button submit-btn" @click="submitAnswer">提交答案</button>
          </template>
        </div>

        <div v-else class="result-area">
          <div v-if="isCorrect" class="correct-answer">
            <div class="success-icon">✓</div>
            <p>回答正确！</p>
            <p class="full-poem">{{ currentQuestion.full_poem }}</p>
            <p class="analysis">{{ currentQuestion.analysis }}</p>
            <button class="glass-button next-btn" @click="nextLevel">挑战下一关</button>
          </div>
          <div v-else class="wrong-answer">
            <div class="error-icon">✗</div>
            <p>回答错误</p>
            <p class="correct-answer-text">正确答案：{{ currentQuestion.answer }}</p>
            <p class="full-poem">{{ currentQuestion.full_poem }}</p>
            <div class="wrong-actions">
              <button class="glass-button ai-hint-btn" @click="showAIHint">AI提示</button>
              <button class="glass-button add-error-btn" @click="addToErrorBook">加入错题本</button>
            </div>
          </div>
          <button class="glass-button retry-btn" @click="retry" :disabled="retryLoading">
            {{ retryLoading ? '刷新中...' : '重试' }}
          </button>
        </div>
      </div>

      <div class="leaderboard-section">
        <h3 class="section-title">排行榜</h3>
        <div v-if="loadingLeaderboard" class="skeleton-leaderboard">
          <div v-for="i in 5" :key="i" class="skeleton-leader-item">
            <div class="skeleton-line skeleton-leader-rank"></div>
            <div class="skeleton-line skeleton-leader-name"></div>
            <div class="skeleton-line skeleton-leader-level"></div>
          </div>
        </div>
        <div v-else class="leaderboard-list glass-card">
          <div v-for="(item, index) in leaderboard" :key="index" class="leader-item">
            <span class="leader-rank">{{ index + 1 }}</span>
            <span class="leader-name">{{ item.username }}</span>
            <span class="leader-level">第 {{ item.highest_level }} 关</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import poetryLevels from '../data/poetryLevels.json';
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../services/api';
import { generateAttemptId } from '../utils/attemptId';

export default {
  name: 'PoemChallenge',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const isLoggedIn = ref(false);
    const loading = ref(true);
    const loadingLeaderboard = ref(true);
    const retryLoading = ref(false);
    const currentLevel = ref(1);
    const highestLevel = ref(0);
    const currentQuestion = ref(null);
    const clientAttemptId = ref(null);
    const userAnswer = ref('');
    const answered = ref(false);
    const isCorrect = ref(false);
    const questions = ref([]);
    const currentRecordId = ref(null);
    const addedToErrorBook = ref(false);
    const leaderboard = ref([]);
    const localQuestionsKey = 'poem_challenge_questions';
    const selectedOption = ref(null);

    const getDifficultyText = (difficulty) => {
      const map = {
        'easy': '简单',
        'medium': '中等',
        'hard': '困难',
        'challenge': '挑战'
      };
      return map[difficulty] || '简单';
    };

    const getDifficultyClass = (difficulty) => {
      return difficulty || 'easy';
    };

    const loadProgress = async () => {
      try {
        const progress = await api.challenge.getProgress();
        highestLevel.value = progress.highest_level || 0;
        currentLevel.value = progress.current_challenge_level || 1;
      } catch (error) {
        console.error('加载进度失败:', error);
      }
    };

    const loadQuestions = async (startLevel, count = 20) => {
      try {
        const needed = [];
        for (let i = startLevel; i < startLevel + count && i <= 200; i++) {
          if (!questions.value.find(q => q.level === i)) {
            needed.push(i);
          }
        }

        if (needed.length > 0) {
          const newQuestions = needed.map(level => {
            const levelData = poetryLevels.find(l => l.level === level);
            if (levelData) {
              // 随机选择该关卡的一道题目
              const randomIndex = Math.floor(Math.random() * levelData.questions.length);
              const q = levelData.questions[randomIndex];
              const poem = levelData.poems[0];

              return {
                level: levelData.level,
                title: poem.title,
                author: poem.author,
                dynasty: poem.dynasty,
                question: q.question,
                answer: q.answer,
                hint: q.hint,
                analysis: q.analysis,
                type: q.type,
                options: q.options || [],
                full_poem: poem.content,
                difficulty: levelData.difficulty,
                description: levelData.description
              };
            }
            return null;
          }).filter(q => q !== null);

          questions.value = [...questions.value, ...newQuestions];
          saveLocalQuestions(questions.value);
        }
      } catch (error) {
        console.error('加载题目失败:', error);
      }
    };

    // 根据关卡获取难度
    const getDifficultyByLevel = (level) => {
      if (level <= 50) return 'easy';
      if (level <= 100) return 'medium';
      if (level <= 150) return 'hard';
      return 'challenge';
    };

    const getLocalQuestions = () => {
      try {
        const data = localStorage.getItem(localQuestionsKey);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    };

    const saveLocalQuestions = (qs) => {
      try {
        localStorage.setItem(localQuestionsKey, JSON.stringify(qs));
      } catch (error) {
        console.error('缓存失败:', error);
      }
    };

    const loadCurrentQuestion = () => {
      const q = questions.value.find(q => q.level === currentLevel.value);
      if (q) {
        currentQuestion.value = q;
        clientAttemptId.value = generateAttemptId();
        loading.value = false;
      } else {
        const levelData = poetryLevels.find(l => l.level === currentLevel.value);
        if (levelData && levelData.questions.length > 0) {
          const randomIndex = Math.floor(Math.random() * levelData.questions.length);
          const questionData = levelData.questions[randomIndex];
          const poem = levelData.poems[0];
          
          const newQ = {
            level: levelData.level,
            title: poem.title,
            author: poem.author,
            dynasty: poem.dynasty,
            question: questionData.question,
            answer: questionData.answer,
            hint: questionData.hint,
            analysis: questionData.analysis,
            type: questionData.type,
            options: questionData.options || [],
            full_poem: poem.content,
            difficulty: levelData.difficulty,
            description: levelData.description
          };
          
          questions.value.push(newQ);
          saveLocalQuestions(questions.value);
          currentQuestion.value = newQ;
          clientAttemptId.value = generateAttemptId();
        }
        loading.value = false;
      }
    };

    const selectLevel = (level) => {
      if (level > highestLevel.value + 1) return;
      currentLevel.value = level;
      answered.value = false;
      isCorrect.value = false;
      userAnswer.value = '';
      addedToErrorBook.value = false;
      selectedOption.value = null;
      loadCurrentQuestion();
      scrollToCurrentLevel();
      if (level + 20 > highestLevel.value) {
        loadQuestions(level, 20);
      }
    };

    const selectOption = (index) => {
      if (!answered.value) {
        selectedOption.value = index;
      }
    };

    // 规范化答案用于比对
    const normalize = (str) => {
      if (!str) return '';
      return str
        .replace(/\s/g, '')
        .replace(/[，。！？；：""''（）【】、,.!?;:"'()\[\]\\/]/g, '')
        .split('')
        .map(ch => {
          const code = ch.charCodeAt(0);
          if (code >= 65281 && code <= 65374) return String.fromCharCode(code - 65248);
          return ch;
        })
        .join('');
    };

    const submitAnswer = async () => {
      if (!currentQuestion.value) return;

      // 如果是选择题，检查是否已选择
      if (currentQuestion.value.type === 'choice' && selectedOption.value === null) {
        alert('请先选择一个选项');
        return;
      }

      // 如果是填空题，检查是否已输入
      if (currentQuestion.value.type !== 'choice' && !userAnswer.value.trim()) {
        alert('请输入答案');
        return;
      }

      let correctAnswer;
      let userAnswerText;

      if (currentQuestion.value.type === 'choice') {
        // 兼容两种数据格式：answer 可能是文本，也可能是索引
        const answerData = currentQuestion.value.answer;
        if (typeof answerData === 'number') {
          correctAnswer = currentQuestion.value.options[answerData];
          userAnswerText = currentQuestion.value.options[selectedOption.value];
          isCorrect.value = selectedOption.value === answerData;
        } else {
          // answer 是文本字符串，直接比较文本
          correctAnswer = answerData;
          userAnswerText = currentQuestion.value.options[selectedOption.value];
          isCorrect.value = normalize(userAnswerText) === normalize(correctAnswer);
        }
      } else {
        correctAnswer = currentQuestion.value.answer;
        userAnswerText = userAnswer.value;
        isCorrect.value = normalize(userAnswer.value) === normalize(correctAnswer);
      }

      answered.value = true;

      try {
        const result = await api.challenge.submitAnswer({
          level: currentLevel.value,
          question: currentQuestion.value.question,
          userAnswer: userAnswerText,
          isCorrect: isCorrect.value,
          correctAnswer: correctAnswer,
          poemTitle: currentQuestion.value.title,
          poemAuthor: currentQuestion.value.author,
          clientAttemptId: clientAttemptId.value
        });

        currentRecordId.value = result.recordId;
        // 用服务器返回的最新进度更新本地状态
        if (result.highestLevel !== undefined) {
          highestLevel.value = result.highestLevel;
        }
        if (result.currentLevel !== undefined) {
          currentLevel.value = result.currentLevel;
        }

        if (result.correct) {
          // 答对：正确数已由后端更新进度
        } else {
          try {
            await api.wrongQuestions.add({
              question_id: currentQuestion.value.id,
              question: currentQuestion.value.question,
              answer: correctAnswer,
              user_answer: userAnswerText,
              level: currentLevel.value,
              full_poem: currentQuestion.value.full_poem,
              author: currentQuestion.value.author,
              title: currentQuestion.value.title
            });
            console.log('已自动添加到错题复习');
          } catch (addError) {
            console.error('添加到错题复习失败:', addError);
          }
        }
      } catch (error) {
        console.error('提交答案失败:', error);
      }
    };

    const nextLevel = () => {
      if (currentLevel.value >= 200) {
        alert('恭喜你通关！已完成全部200关！');
        return;
      }
      currentLevel.value++;
      answered.value = false;
      isCorrect.value = false;
      userAnswer.value = '';
      addedToErrorBook.value = false;
      loadCurrentQuestion();
      scrollToCurrentLevel();
    };

    const retry = async () => {
      answered.value = false;
      isCorrect.value = false;
      userAnswer.value = '';
      addedToErrorBook.value = false;
      selectedOption.value = null;

      retryLoading.value = true;
      try {
        const levelData = poetryLevels.find(l => l.level === currentLevel.value);
        if (levelData && levelData.questions.length > 0) {
          const randomIndex = Math.floor(Math.random() * levelData.questions.length);
          const q = levelData.questions[randomIndex];
          const poem = levelData.poems[0];

          const newQ = {
            level: levelData.level,
            title: poem.title,
            author: poem.author,
            dynasty: poem.dynasty,
            question: q.question,
            answer: q.answer,
            hint: q.hint,
            analysis: q.analysis,
            type: q.type,
            options: q.options || [],
            full_poem: poem.content,
            difficulty: levelData.difficulty,
            description: levelData.description
          };

          const existingIndex = questions.value.findIndex(q => q.level === currentLevel.value);
          if (existingIndex !== -1) {
            questions.value[existingIndex] = newQ;
          } else {
            questions.value.push(newQ);
          }
          saveLocalQuestions(questions.value);
          currentQuestion.value = newQ;
          clientAttemptId.value = generateAttemptId();
        }
      } catch (error) {
        console.error('刷新题目失败:', error);
      } finally {
        retryLoading.value = false;
      }
    };

    const showAIHint = () => {
        alert('AI提示：这首诗描绘了' + (currentQuestion.value?.analysis || '优美的意境'));
      };

    const addToErrorBook = async () => {
      if (!currentRecordId.value || addedToErrorBook.value) return;
      try {
        await api.challenge.addToErrorBook({
          recordId: currentRecordId.value,
          question: currentQuestion.value.question,
          userAnswer: userAnswer.value,
          correctAnswer: currentQuestion.value.answer,
          explanation: currentQuestion.value.analysis
        });
        addedToErrorBook.value = true;
        alert('已加入错题本');
      } catch (error) {
        console.error('加入错题本失败:', error);
      }
    };

    const loadLeaderboard = async () => {
      try {
        loadingLeaderboard.value = true;
        const data = await api.challenge.getLeaderboard();
        leaderboard.value = data;
      } catch (error) {
        console.error('加载排行榜失败:', error);
      } finally {
        loadingLeaderboard.value = false;
      }
    };

    const showLoginModal = () => {
      localStorage.setItem('redirectPath', '/challenge');
      router.push('/login');
    };

    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      isLoggedIn.value = !!token;
      return isLoggedIn.value;
    };

    const scrollToCurrentLevel = () => {
      setTimeout(() => {
        const levelScroll = document.querySelector('.level-scroll');
        const currentLevelItem = document.querySelector('.level-item.current');
        if (levelScroll && currentLevelItem) {
          const scrollLeft = currentLevelItem.offsetLeft - levelScroll.clientWidth / 2 + currentLevelItem.clientWidth / 2;
          levelScroll.scrollTo({
            left: Math.max(0, scrollLeft),
            behavior: 'smooth'
          });
        }
      }, 100);
    };

    const initializeData = async () => {
      if (checkLoginStatus()) {
        loading.value = true;
        try {
          await loadProgress();
          await loadQuestions(currentLevel.value, 20);
          loadCurrentQuestion();
          loadLeaderboard();
          scrollToCurrentLevel();
        } catch (error) {
          console.error('初始化数据失败:', error);
        } finally {
          loading.value = false;
        }
      }
    };

    onMounted(async () => {
      await initializeData();
    });

    watch(() => route.path, async (newPath) => {
      if (newPath === '/challenge') {
        await initializeData();
      }
    });

    return {
      isLoggedIn,
      loading,
      loadingLeaderboard,
      retryLoading,
      currentLevel,
      highestLevel,
      currentQuestion,
      userAnswer,
      answered,
      isCorrect,
      leaderboard,
      selectedOption,
      getDifficultyText,
      getDifficultyClass,
      selectLevel,
      selectOption,
      submitAnswer,
      nextLevel,
      retry,
      showAIHint,
      addToErrorBook,
      showLoginModal
    };
  }
};
</script>

<style scoped>
.poem-challenge {
  max-width: 1000px;
  margin: 0 auto;
  padding: 30px 20px;
  background: linear-gradient(135deg, rgba(205, 133, 63, 0.05) 0%, rgba(139, 69, 19, 0.1) 100%);
  min-height: 100vh;
  position: relative;
}

.poem-challenge::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="50" y="50" font-family="SimSun" font-size="20" text-anchor="middle" fill="rgba(205, 133, 63, 0.08)">诗</text></svg>') repeat;
  opacity: 0.6;
  pointer-events: none;
  z-index: 0;
}

.challenge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.challenge-title {
  font-family: 'SimSun', 'STSong', serif;
  color: #8b4513;
  margin: 0;
  font-size: 32px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(139, 69, 19, 0.1);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.glass-nav-button {
  padding: 10px 20px;
  background: rgba(255, 252, 240, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 20px;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(139, 69, 19, 0.15);
}

.glass-nav-button:hover {
  background: rgba(255, 252, 240, 0.95);
  border-color: rgba(205, 133, 63, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(139, 69, 19, 0.25);
}

.review-btn {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.2), rgba(233, 30, 99, 0.15));
  border-color: rgba(255, 152, 0, 0.4);
  color: #ff5722;
  font-weight: bold;
}

.review-btn:hover {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.3), rgba(233, 30, 99, 0.25));
  border-color: rgba(255, 152, 0, 0.6);
}

.battle-btn {
  background: linear-gradient(135deg, rgba(220, 20, 60, 0.15), rgba(255, 69, 0, 0.1));
  border-color: rgba(220, 20, 60, 0.3);
  color: #dc143c;
  font-weight: bold;
}

.battle-btn:hover {
  background: linear-gradient(135deg, rgba(220, 20, 60, 0.25), rgba(255, 69, 0, 0.2));
  border-color: rgba(220, 20, 60, 0.5);
}

.login-prompt {
  text-align: center;
  padding: 80px 20px;
  position: relative;
  z-index: 1;
}

.glass-card {
  background: rgba(255, 252, 240, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(205, 133, 63, 0.25);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(139, 69, 19, 0.15);
  position: relative;
  z-index: 1;
}

.glass-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
  border-radius: 24px;
}

.level-selector {
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.level-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 15px 5px;
  scrollbar-width: thin;
  scrollbar-color: rgba(205, 133, 63, 0.4) transparent;
}

.level-scroll::-webkit-scrollbar {
  height: 8px;
}

.level-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.level-scroll::-webkit-scrollbar-thumb {
  background: rgba(205, 133, 63, 0.4);
  border-radius: 4px;
}

.level-item {
  min-width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 252, 240, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 2px solid rgba(205, 133, 63, 0.3);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  font-size: 16px;
  font-family: 'SimSun', 'STSong', serif;
  color: #8b4513;
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.1);
  flex-shrink: 0;
}

.level-item:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 8px 24px rgba(139, 69, 19, 0.2);
  border-color: rgba(205, 133, 63, 0.5);
  background: rgba(255, 252, 240, 0.95);
}

.level-item.current {
  background: linear-gradient(135deg, #ffd700, #ffb347);
  border-color: #ffa500;
  color: #8b4513;
  box-shadow: 0 6px 20px rgba(255, 165, 0, 0.3);
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 6px 20px rgba(255, 165, 0, 0.3);
  }
  50% {
    box-shadow: 0 6px 30px rgba(255, 165, 0, 0.5);
  }
}

.level-item.completed {
  background: linear-gradient(135deg, rgba(144, 238, 144, 0.9), rgba(50, 205, 50, 0.8));
  border-color: #32cd32;
  color: #228b22;
  box-shadow: 0 4px 16px rgba(50, 205, 50, 0.2);
}

.level-item.locked {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(200, 200, 200, 0.6);
  border-color: rgba(150, 150, 150, 0.4);
}

.level-item.locked:hover {
  transform: none;
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.1);
}

.question-area {
  margin-bottom: 40px;
  position: relative;
  z-index: 1001;
}

.question-header {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.level-badge {
  background: linear-gradient(135deg, #8b4513, #a0522d);
  color: white;
  padding: 8px 20px;
  border-radius: 24px;
  font-weight: bold;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  box-shadow: 0 4px 16px rgba(139, 69, 19, 0.3);
}

.difficulty-badge {
  padding: 8px 20px;
  border-radius: 24px;
  font-weight: bold;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.15);
}

.difficulty-badge.easy {
  background: linear-gradient(135deg, rgba(144, 238, 144, 0.95), rgba(50, 205, 50, 0.85));
  color: #228b22;
  border: 1px solid rgba(50, 205, 50, 0.4);
}

.difficulty-badge.medium {
  background: linear-gradient(135deg, rgba(255, 255, 153, 0.95), rgba(255, 215, 0, 0.85));
  color: #b8860b;
  border: 1px solid rgba(255, 215, 0, 0.4);
}

.difficulty-badge.hard {
  background: linear-gradient(135deg, rgba(255, 165, 0, 0.95), rgba(255, 140, 0, 0.85));
  color: #8b4513;
  border: 1px solid rgba(255, 165, 0, 0.4);
}

.difficulty-badge.challenge {
  background: linear-gradient(135deg, rgba(255, 99, 71, 0.95), rgba(220, 20, 60, 0.85));
  color: white;
  border: 1px solid rgba(255, 99, 71, 0.4);
}

.poem-info {
  text-align: center;
  margin-bottom: 24px;
}

.poem-title {
  font-family: 'SimSun', 'STSong', serif;
  color: #8b4513;
  margin: 0 0 12px 0;
  font-size: 28px;
  font-weight: bold;
}

.poem-author {
  color: #a0522d;
  margin: 0;
  font-size: 18px;
  font-family: 'SimSun', 'STSong', serif;
}

.question-text {
  font-size: 26px;
  font-family: 'SimSun', 'STSong', serif;
  text-align: center;
  color: #8b4513;
  padding: 40px 30px;
  background: linear-gradient(135deg, rgba(255, 248, 220, 0.6), rgba(255, 252, 240, 0.4));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 20px;
  margin-bottom: 24px;
  line-height: 1.9;
  box-shadow: 0 8px 32px rgba(139, 69, 19, 0.1);
  position: relative;
  overflow: hidden;
}

.options-area {
  margin-top: 24px;
  text-align: left;
}

.option-item {
  background: rgba(255, 252, 240, 0.85);
  border: 2px solid rgba(205, 133, 63, 0.3);
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 12px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'SimSun', 'STSong', serif;
}

.option-item:hover {
  background: rgba(255, 248, 220, 0.95);
  border-color: rgba(205, 133, 63, 0.5);
  transform: translateX(4px);
}

.option-item.selected {
  background: rgba(255, 215, 0, 0.2);
  border-color: rgba(205, 133, 63, 0.5);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.15);
}

.question-text::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
}

.answer-input-area {
  display: flex;
  gap: 12px;
}

.answer-input {
  flex: 1;
  padding: 16px 20px;
  border: 2px solid rgba(205, 133, 63, 0.35);
  border-radius: 16px;
  font-size: 18px;
  font-family: 'SimSun', 'STSong', serif;
  background: rgba(255, 252, 240, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all 0.3s ease;
  outline: none;
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.1);
}

.answer-input:focus {
  border-color: #cd853f;
  box-shadow: 0 0 0 3px rgba(205, 133, 63, 0.15), 0 8px 24px rgba(139, 69, 19, 0.15);
  background: rgba(255, 252, 240, 0.95);
}

.glass-button {
  padding: 12px 28px;
  background: rgba(205, 133, 63, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(205, 133, 63, 0.35);
  border-radius: 16px;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(139, 69, 19, 0.15);
  white-space: nowrap;
}

.glass-button:hover:not(:disabled) {
  background: rgba(205, 133, 63, 0.3);
  border-color: rgba(205, 133, 63, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(139, 69, 19, 0.25);
}

.glass-button:active:not(:disabled) {
  transform: translateY(0);
}

.glass-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.submit-btn {
  white-space: nowrap;
  background: linear-gradient(135deg, rgba(205, 133, 63, 0.3), rgba(139, 69, 19, 0.25));
}

.result-area {
  text-align: center;
}

.success-icon {
  color: #32cd32;
  font-size: 64px;
  margin-bottom: 16px;
  animation: success-bounce 0.6s ease-out;
}

@keyframes success-bounce {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.error-icon {
  color: #dc143c;
  font-size: 64px;
  margin-bottom: 16px;
  animation: error-shake 0.5s ease-out;
}

@keyframes error-shake {
  0%, 100% {
    transform: translateX(0);
  }
  20%, 60% {
    transform: translateX(-10px);
  }
  40%, 80% {
    transform: translateX(10px);
  }
}

.correct-answer-text {
  color: #32cd32;
  font-weight: bold;
  font-size: 22px;
  font-family: 'SimSun', 'STSong', serif;
}

.full-poem {
  font-family: 'SimSun', 'STSong', serif;
  color: #8b4513;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(255, 248, 220, 0.6), rgba(255, 252, 240, 0.4));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 16px;
  margin: 20px 0;
  line-height: 1.9;
  box-shadow: 0 4px 16px rgba(139, 69, 19, 0.1);
  position: relative;
}

.analysis {
  color: #a0522d;
  margin-bottom: 24px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  line-height: 1.7;
}

.next-btn {
  background: linear-gradient(135deg, rgba(50, 205, 50, 0.35), rgba(34, 139, 34, 0.3));
  color: #228b22;
  border-color: rgba(50, 205, 50, 0.4);
  font-weight: bold;
}

.wrong-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.ai-hint-btn {
  background: linear-gradient(135deg, rgba(100, 149, 237, 0.35), rgba(65, 105, 225, 0.3));
  color: #4169e1;
  border-color: rgba(100, 149, 237, 0.4);
}

.add-error-btn {
  background: linear-gradient(135deg, rgba(255, 165, 0, 0.35), rgba(255, 140, 0, 0.3));
  color: #ff8c00;
  border-color: rgba(255, 165, 0, 0.4);
}

.retry-btn {
  margin-top: 12px;
}

.leaderboard-section {
  margin-top: 50px;
  position: relative;
  z-index: 1;
}

.section-title {
  font-family: 'SimSun', 'STSong', serif;
  color: #8b4513;
  margin-bottom: 24px;
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 3px;
  background: linear-gradient(90deg, #cd853f, #8b4513);
  border-radius: 2px;
}

.leaderboard-list {
  max-height: 420px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(205, 133, 63, 0.4) transparent;
}

.leaderboard-list::-webkit-scrollbar {
  width: 8px;
}

.leaderboard-list::-webkit-scrollbar-track {
  background: transparent;
}

.leaderboard-list::-webkit-scrollbar-thumb {
  background: rgba(205, 133, 63, 0.4);
  border-radius: 4px;
}

.leader-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(245, 222, 179, 0.6);
  transition: all 0.3s ease;
  position: relative;
}

.leader-item:hover {
  background: rgba(255, 252, 240, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.1);
}

.leader-item:first-child {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 252, 240, 0.05));
  border-radius: 16px 16px 0 0;
}

.leader-item:nth-child(2) {
  background: linear-gradient(135deg, rgba(192, 192, 192, 0.15), rgba(255, 252, 240, 0.05));
}

.leader-item:nth-child(3) {
  background: linear-gradient(135deg, rgba(205, 127, 50, 0.15), rgba(255, 252, 240, 0.05));
}

.leader-item:last-child {
  border-bottom: none;
  border-radius: 0 0 16px 16px;
}

.leader-rank {
  width: 44px;
  font-weight: bold;
  color: #8b4513;
  font-size: 18px;
  font-family: 'SimSun', 'STSong', serif;
}

.leader-item:first-child .leader-rank {
  color: #ffd700;
  font-size: 22px;
}

.leader-item:nth-child(2) .leader-rank {
  color: #c0c0c0;
  font-size: 20px;
}

.leader-item:nth-child(3) .leader-rank {
  color: #cd7f32;
  font-size: 20px;
}

.leader-name {
  flex: 1;
  text-align: left;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  color: #333;
}

.leader-level {
  font-weight: bold;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
}

.skeleton-question,
.skeleton-leaderboard {
  padding: 30px;
}

.skeleton-line {
  background: linear-gradient(90deg, rgba(240, 240, 240, 0.8) 25%, rgba(224, 224, 224, 0.8) 50%, rgba(240, 240, 240, 0.8) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 8px;
}

.skeleton-title {
  height: 32px;
  width: 160px;
  margin-bottom: 20px;
}

.skeleton-content {
  height: 26px;
  margin-bottom: 15px;
}

.skeleton-content:nth-child(2) {
  width: 85%;
}

.skeleton-content:nth-child(3) {
  width: 65%;
}

.skeleton-input-field {
  height: 54px;
  margin: 24px 0;
}

.skeleton-btn {
  height: 50px;
  width: 130px;
}

.skeleton-leader-item {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
  align-items: center;
}

.skeleton-leader-rank {
  width: 44px;
  height: 24px;
  border-radius: 6px;
}

.skeleton-leader-name {
  flex: 1;
  height: 24px;
  border-radius: 6px;
}

.skeleton-leader-level {
  width: 110px;
  height: 24px;
  border-radius: 6px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
