<template>
  <div class="poem-detail" :class="{ 'immersive-mode': isImmersiveMode }">
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

    <button class="back-btn" @click="goBack">← 返回</button>
    
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="!poem" class="empty">诗词不存在</div>
    
    <!-- 初始状态：只显示开始学习按钮 -->
    <div v-else-if="!isImmersiveMode" class="initial-state">
      <button class="start-learning-btn" @click="enterImmersiveMode">
        开始学习
      </button>
      <div v-if="imageStatus === 'pending'" class="loading-indicator">
        <div class="loading-spinner"></div>
        <p>正在生成诗意图境...</p>
      </div>
    </div>
    
    <!-- 沉浸式学习模式背景 -->
    <div v-if="isImmersiveMode" class="immersive-background">
      <div class="background-container">
        <!-- 默认古风背景（始终存在，垫底） -->
        <div class="default-background">
          <div class="ancient-style-bg"></div>
        </div>
        <!-- AI 意境图：双层结构实现交叉淡入淡出 -->
        <img
          v-if="backgroundImage || bgImageLoading"
          :src="backgroundImage"
          class="background-image"
          :class="{ 'fade-in': bgImageFadingIn }"
          @load="onBgImageLoaded"
        />
        <div v-if="imageStatus === 'pending' && !backgroundImage" class="loading-overlay">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <p>诗中有画，画境渐生...</p>
          </div>
        </div>
      </div>
      <button class="exit-immersive-btn" @click="exitImmersiveMode">
        退出学习
      </button>
    </div>
    
    <div v-if="isImmersiveMode" class="poem-layout" :class="{ 'content-entering': contentEntering }">
      <!-- 左侧栏 -->
      <div class="left-column">
        <!-- 诗词基本信息 -->
        <div class="poem-header">
          <div class="title-container">
            <h1 class="poem-title">{{ poem.title }}</h1>
            <button 
              class="collect-btn" 
              @click="toggleCollect" 
              :class="{ collected: isCollected }"
            >
              {{ isCollected ? '❤️ 已收藏' : '🤍 收藏' }}
            </button>
          </div>
          <p class="poem-author">{{ poem.author }} · {{ poem.dynasty }}</p>
        </div>
        
        <!-- 诗词正文 -->
        <div class="poem-text" :class="{ 'blurred': recitationMode }" id="poem-text-area">
          <p v-for="(line, index) in poemLines" :key="index" class="poem-line">
            <template v-for="(char, charIndex) in line" :key="charIndex">
              <span v-if="char >= '\u4e00' && char <= '\u9fff'" class="poem-char">{{ char }}</span>
              <span v-else class="poem-punctuation">{{ char }}</span>
            </template>
          </p>
          <!-- 朗读按钮 -->
          <button 
            class="read-btn"
            @click="toggleRead"
          >
            {{ isReading ? '⏹ 停止' : '🔊 朗读' }}
          </button>
        </div>
        
        <!-- 遮挡背诵功能 -->
        <div class="recitation-section">
          <h2 class="section-title">遮挡背诵</h2>
          <div class="recitation-controls">
            <label class="switch">
              <input type="checkbox" v-model="recitationMode">
              <span class="slider"></span>
            </label>
            <span>启用遮挡背诵</span>
            <button 
              class="refresh-btn" 
              @click="refreshRecitation"
              :disabled="!recitationMode"
            >
              🔄 刷新题目
            </button>
          </div>
          <div class="recitation-content">
            <div v-if="recitationMode">
              <div v-for="(sentence, index) in splitSentences(poem.content)" :key="index" class="recitation-line">
                <div v-if="hiddenLineIndices.includes(index)" class="hidden-line">
                  <label class="sentence-label">第{{ index + 1 }}句：</label>
                  <input 
                    type="text" 
                    v-model="userInput[hiddenLineIndices.indexOf(index)]" 
                    placeholder="请输入诗句"
                    class="recitation-input"
                  >
                  <div
                    v-if="showResult[hiddenLineIndices.indexOf(index)]"
                    class="recitation-result"
                    :class="isCorrect[hiddenLineIndices.indexOf(index)] ? 'correct' : 'incorrect'"
                  >
                    {{ isCorrect[hiddenLineIndices.indexOf(index)] ? '✓ 正确' : '✗ 错误，正确答案：' + sentence }}
                  </div>
                </div>
                <div v-else class="visible-line">第{{ index + 1 }}句：{{ sentence }}</div>
              </div>
            </div>
            <div v-else>
              <div v-for="(line, index) in poemLines" :key="index" class="recitation-line">
                <div class="visible-line">{{ line }}</div>
              </div>
            </div>
            <button 
              v-if="recitationMode" 
              class="submit-btn" 
              @click="checkRecitation"
            >
              📝 提交核对
            </button>
          </div>
        </div>
        
        <!-- AI背诵检测功能 -->
        <div class="recite-check-card">
          <h2 class="section-title">📝 AI背诵检测</h2>
          <div class="recite-check-content">
            <div class="form-group">
              <label for="recite-input" class="form-label">请默写全诗：</label>
              <textarea 
                id="recite-input"
                v-model="reciteInput"
                placeholder="请输入您默写的内容..."
                class="recite-input"
                rows="6"
                @focus="startRecitationMode"
                @blur="stopRecitationMode"
              ></textarea>
            </div>
            <button 
              class="btn btn-primary recite-check-btn"
              @click="checkRecite"
              :disabled="reciteLoading"
            >
              <span v-if="reciteLoading" class="loading-spinner"></span>
              {{ reciteLoading ? '检测中...' : '🎯 提交检测' }}
            </button>
            
            <!-- 检测结果 -->
            <div v-if="reciteResult" class="recite-result-section">
              <!-- 正确率板块 -->
              <div class="result-section accuracy-section">
                <h3 class="result-title">📊 正确率</h3>
                <div class="accuracy-display">
                  <div class="accuracy-circle" :class="getScoreClass(reciteResult.score)">
                    <span class="accuracy-number">{{ reciteResult.score }}</span>
                    <span class="accuracy-unit">分</span>
                  </div>
                  <div class="accuracy-message">{{ getScoreMessage(reciteResult.score) }}</div>
                </div>
              </div>
              
              <!-- 问题板块 -->
              <div class="result-section problem-section">
                <h3 class="result-title">❌ 问题分析</h3>
                <div class="problem-list">
                  <div v-if="reciteResult.wrongChars.length > 0" class="problem-item">
                    <span class="problem-label">错字：</span>
                    <span class="problem-detail">
                      <span v-for="(error, index) in reciteResult.wrongChars" :key="index" class="error-tag">
                        "{{ error.input }}" → "{{ error.original }}"
                      </span>
                    </span>
                  </div>
                  
                  <div v-if="reciteResult.missing.length > 0" class="problem-item">
                    <span class="problem-label">漏字：</span>
                    <span class="problem-detail">
                      <span v-for="(error, index) in reciteResult.missing" :key="index" class="missing-tag">
                        "{{ error.char }}"
                      </span>
                    </span>
                  </div>
                  
                  <div v-if="reciteResult.extra.length > 0" class="problem-item">
                    <span class="problem-label">多字：</span>
                    <span class="problem-detail">
                      <span v-for="(error, index) in reciteResult.extra" :key="index" class="extra-tag">
                        "{{ error.char }}"
                      </span>
                    </span>
                  </div>
                  
                  <div v-if="reciteResult.wrongChars.length === 0 && reciteResult.missing.length === 0 && reciteResult.extra.length === 0" class="problem-item no-error">
                    <span class="no-error-text">✅ 完全正确，没有错误！</span>
                  </div>
                </div>
              </div>
              
              <!-- 建议板块 -->
              <div class="result-section advice-section">
                <h3 class="result-title">💡 学习建议</h3>
                <div class="advice-content">
                  <p class="advice-text">{{ reciteResult.aiAdvice }}</p>
                </div>
              </div>

              <!-- 一键添加进错题本按钮 -->
              <div v-if="reciteResult.score !== 100" class="add-to-wrongbook-row">
                <button
                  class="btn add-wrongbook-btn"
                  @click="addReciteToWrongBook"
                  :disabled="addingToWrongBook"
                >
                  <span v-if="addingToWrongBook" class="loading-spinner small-spinner"></span>
                  {{ addingToWrongBook ? '添加中...' : '📝 一键添加进错题本' }}
                </button>
                <span v-if="wrongBookAdded" class="wrongbook-added-tip">已添加 ✓</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 诗词创作背景卡片 -->
        <div class="poem-background-card">
          <h2 class="section-title">📜 诗词创作背景</h2>
          <div v-if="poemBackgroundLoading" class="card-loading">
            <div class="mini-spinner"></div>
            <span>加载中...</span>
          </div>
          <div v-else-if="poemBackground" class="poem-background-content">
            <div class="background-item">
              <div class="item-icon">🏛️</div>
              <div class="item-text">{{ poemBackground }}</div>
            </div>
            <div v-if="poemBackgroundTips" class="background-tips">
              <div class="tips-label">💡 学习提示</div>
              <p>{{ poemBackgroundTips }}</p>
            </div>
          </div>
          <button
            v-else
            class="ai-btn blue"
            @click="fetchPoemBackground"
            :disabled="poemBackgroundLoading"
          >
            <span v-if="poemBackgroundLoading" class="loading-spinner"></span>
            {{ poemBackgroundLoading ? '生成中...' : '📖 了解创作背景' }}
          </button>
        </div>

        <!-- 诗词趣味故事卡片 -->
        <div class="poem-story-card">
          <h2 class="section-title">🎭 诗词趣味故事</h2>
          <div v-if="poemStoryLoading" class="card-loading">
            <div class="mini-spinner"></div>
            <span>加载中...</span>
          </div>
          <div v-else-if="poemStory" class="poem-story-content">
            <div class="story-text">{{ poemStory }}</div>
          </div>
          <button
            v-else
            class="ai-btn purple"
            @click="fetchPoemStory"
            :disabled="poemStoryLoading"
          >
            <span v-if="poemStoryLoading" class="loading-spinner"></span>
            {{ poemStoryLoading ? '讲述中...' : '🎧 听诗人的故事' }}
          </button>
        </div>

        <!-- 诵读技巧指南卡片 -->
        <div class="recitation-guide-card">
          <h2 class="section-title">🎤 诵读技巧指南</h2>
          <div v-if="recitationGuideLoading" class="card-loading">
            <div class="mini-spinner"></div>
            <span>加载中...</span>
          </div>
          <div v-else-if="recitationGuide" class="recitation-guide-content">
            <div v-if="recitationGuide.rhythm" class="guide-section">
              <div class="guide-title">🎵 节奏韵律</div>
              <p>{{ recitationGuide.rhythm }}</p>
            </div>
            <div v-if="recitationGuide.emotion" class="guide-section">
              <div class="guide-title">💭 情感把控</div>
              <p>{{ recitationGuide.emotion }}</p>
            </div>
            <div v-if="recitationGuide.tips" class="guide-section">
              <div class="guide-title">🌟 诵读妙招</div>
              <ul class="guide-tips-list">
                <li v-for="(tip, i) in Array.isArray(recitationGuide.tips) ? recitationGuide.tips : recitationGuide.tips.split('\n').filter(t => t.trim())" :key="i">{{ tip }}</li>
              </ul>
            </div>
          </div>
          <button
            v-else
            class="ai-btn orange"
            @click="fetchRecitationGuide"
            :disabled="recitationGuideLoading"
          >
            <span v-if="recitationGuideLoading" class="loading-spinner"></span>
            {{ recitationGuideLoading ? '生成中...' : '🎤 获取诵读技巧' }}
          </button>
        </div>
      </div>

      <!-- 右侧栏 -->
      <div class="right-column">
        <!-- AI助教聊天窗口 -->
        <div class="tutor-chat-container">
          <h2 class="section-title">💬 AI语文助教</h2>
          <div class="tutor-chat-body">
            <div class="chat-messages" ref="chatMessagesContainer">
              <div 
                v-for="(message, index) in tutorMessages" 
                :key="index"
                :class="['chat-message', message.role]"
              >
                <div class="message-content">
                  {{ message.content }}
                </div>
              </div>
              <div v-if="tutorLoading" class="chat-message bot loading">
                <div class="loading-spinner"></div>
              </div>
            </div>
            <div class="chat-input-area">
              <input 
                type="text" 
                v-model="tutorQuestion"
                placeholder="围绕这首诗提问..."
                class="tutor-input"
                @keyup.enter="sendTutorMessage"
              />
              <button 
                class="send-btn"
                @click="sendTutorMessage"
                :disabled="!tutorQuestion.trim() || tutorLoading"
              >
                发送
              </button>
            </div>
          </div>
        </div>
        
        <!-- AI赏析古诗文卡片 -->
        <div class="ai-explanation">
          <h2 class="section-title">🎨 AI赏析古诗文</h2>
          <button 
            class="ai-btn green"
            @click="getAIExplanation"
            :disabled="allAiLoading || !poem"
          >
            <span v-if="allAiLoading" class="loading-spinner"></span>
            {{ allAiLoading ? '分析中...' : '📖 生成赏析' }}
          </button>
          
          <!-- 错误信息显示 -->
          <div v-if="Object.values(aiError).some(error => error)" class="error-message">
            <p>{{ Object.values(aiError).find(error => error) }}</p>
          </div>
          
          <!-- 日常生活场景化解读 -->
          <div v-if="aiExplanations.daily_life_explanation" class="explanation-content">
            <div class="explanation-section">
              <h3>🏠 日常生活场景化解读</h3>
              <p>{{ aiExplanations.daily_life_explanation }}</p>
            </div>
          </div>
          
          <!-- 关键字词分析 -->
          <div v-if="aiExplanations.keyword_analysis" class="explanation-content">
            <div class="explanation-section">
              <h3>🔍 关键字词分析</h3>
              <p>{{ aiExplanations.keyword_analysis }}</p>
            </div>
          </div>
          
          <!-- 艺术意境解析 -->
          <div v-if="aiExplanations.artistic_conception" class="explanation-content">
            <div class="explanation-section">
              <h3>✨ 艺术意境解析</h3>
              <p>{{ aiExplanations.artistic_conception }}</p>
            </div>
          </div>
          
          <!-- 引导性思考题 -->
          <div v-if="aiExplanations.thinking_questions" class="explanation-content">
            <div class="explanation-section">
              <h3>🤔 引导性思考题</h3>
              <ul class="questions-list">
                <li 
                  v-for="(question, index) in Array.isArray(aiExplanations.thinking_questions) ? aiExplanations.thinking_questions : aiExplanations.thinking_questions.split('\n').filter(q => q.trim())" 
                  :key="index"
                  class="question-item"
                >
                  {{ question }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <!-- 个性化教学卡片（RAG 驱动） -->
        <div class="personalized-tutor-section">
          <h2 class="section-title">🎓 个性化教学</h2>
          <p class="tutor-subtitle">基于你的学习诊断，针对性讲解薄弱知识点</p>
          <button 
            class="ai-btn purple"
            @click="loadPersonalizedTutor"
            :disabled="tutorLoading || !poem"
          >
            <span v-if="tutorLoading" class="loading-spinner"></span>
            {{ tutorLoading ? '诊断教学中...' : '🧠 获取个性化教学' }}
          </button>

          <div v-if="tutorError" class="error-message">
            <p>{{ tutorError }}</p>
          </div>

          <div v-if="tutorData" class="tutor-content">
            <div class="tutor-depth-badge" :class="tutorData.depth">
              {{ { FOUNDATION: '基础阶段', DEVELOPING: '发展阶段', ADVANCED: '进阶阶段' }[tutorData.depth] || tutorData.depth }}
            </div>

            <div v-if="tutorData.weakPoints && tutorData.weakPoints.length > 0" class="tutor-weak-points">
              <h4>📋 薄弱知识点</h4>
              <div class="weak-point-tags">
                <span 
                  v-for="wp in tutorData.weakPoints" 
                  :key="wp.code"
                  class="weak-point-tag"
                >
                  {{ wp.name }}（{{ wp.mastery }}%）
                </span>
              </div>
            </div>

            <div v-if="tutorData.teaching && tutorData.teaching.explanation" class="tutor-explanation">
              <h4>📖 个性化讲解</h4>
              <p class="teaching-text">{{ tutorData.teaching.explanation }}</p>
            </div>

            <div v-if="tutorData.teaching && tutorData.teaching.keyPoints && tutorData.teaching.keyPoints.length > 0" class="tutor-key-points">
              <h4>🔑 核心知识点</h4>
              <ul class="key-points-list">
                <li v-for="(kp, idx) in tutorData.teaching.keyPoints" :key="idx" class="key-point-item">
                  <strong>{{ kp.point }}</strong>：{{ kp.detail }}
                </li>
              </ul>
            </div>

            <div v-if="tutorData.teaching && tutorData.teaching.practiceAdvice" class="tutor-advice">
              <h4>✍️ 练习建议</h4>
              <p>{{ tutorData.teaching.practiceAdvice }}</p>
            </div>

            <div v-if="tutorData.practiceQuestions && tutorData.practiceQuestions.length > 0" class="tutor-practice">
              <h4>📝 推荐练习</h4>
              <div 
                v-for="q in tutorData.practiceQuestions" 
                :key="q.questionId"
                class="practice-item"
              >
                <p class="practice-question">{{ q.questionText }}</p>
                <p v-if="q.poem" class="practice-source">来源：《{{ q.poem.title }}》{{ q.poem.author }}</p>
              </div>
            </div>

            <div v-if="tutorData.relatedPoems && tutorData.relatedPoems.length > 0" class="tutor-related">
              <h4>📚 相关诗词</h4>
              <div class="related-poems-list">
                <span 
                  v-for="rp in tutorData.relatedPoems" 
                  :key="rp.id"
                  class="related-poem-tag"
                  @click="navigateToPoem(rp.id)"
                >
                  《{{ rp.title }}》{{ rp.author }}
                </span>
              </div>
            </div>

            <div v-if="tutorData.sources && tutorData.sources.length > 0" class="tutor-sources">
              <h4>📎 数据来源</h4>
              <ul class="sources-list">
                <li v-for="(src, idx) in tutorData.sources" :key="idx" class="source-item">
                  <span class="source-type">{{ { target_poem: '目标诗词', related_poem: '相关诗词', practice_question: '练习题' }[src.type] || src.type }}</span>
                  <span v-if="src.title">《{{ src.title }}》{{ src.author || '' }}</span>
                </li>
              </ul>
            </div>

            <div v-if="tutorData.degraded" class="tutor-degraded-notice">
              ⚠️ AI 讲解服务暂时不可用，以上为数据库基础信息
            </div>
          </div>
        </div>
        
        <!-- 诗人简介卡片 -->
        <div class="author-profile">
          <h2 class="section-title">👤 诗人简介</h2>
          <div class="author-content">
            <div class="author-avatar">
              <img 
                v-if="authorAvatar" 
                :src="authorAvatar" 
                :alt="poem.author" 
                class="avatar-image"
                @error="handleAvatarError"
              >
              <div v-else class="avatar-loading">加载中...</div>
            </div>
            <div class="author-info">
              <h3>{{ poem.author }}</h3>
              <p class="author-dynasty">{{ poem.dynasty }}</p>
              <p class="author-bio">{{ getAuthorBio(poem.author) }}</p>
            </div>
          </div>
        </div>
        
        <!-- 相似风格诗词卡片 -->
        <div class="similar-poems">
          <h2 class="section-title">📜 相似风格诗词</h2>
          <div class="similar-list">
            <div 
              v-for="(similarPoem, index) in similarPoems" 
              :key="index"
              class="similar-item"
              @click="navigateToPoem(similarPoem.id)"
            >
              <h4>{{ similarPoem.title }}</h4>
              <p class="similar-author">{{ similarPoem.author }} · {{ similarPoem.dynasty }}</p>
              <p class="similar-content">{{ similarPoem.content.substring(0, 50) }}...</p>
            </div>
            <div v-if="similarPoems.length === 0" class="empty">
              <p>暂无相似风格的诗词</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    

  </div>
</template>

<style scoped>
/* 沉浸式学习模式样式 */
.immersive-mode {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

/* 初始状态样式 */
.initial-state {
  position: relative;
  min-height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1;
  animation: page-fade-in 0.5s ease-out both;
  overflow: hidden;
  padding: 20px;
}

@keyframes page-fade-in {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.start-learning-btn {
  padding: 20px 40px;
  background: linear-gradient(135deg, #8b4513, #cd853f);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(139, 69, 19, 0.3);
  z-index: 1000;
  transition: all 0.3s ease;
  margin-bottom: 20px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  letter-spacing: 2px;
}

.start-learning-btn:hover {
  background: linear-gradient(135deg, #cd853f, #8b4513);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 69, 19, 0.4);
}

.loading-indicator {
  text-align: center;
  color: #333;
}

.loading-indicator .loading-spinner {
  margin: 0 auto 10px;
}

.loading-indicator p {
  font-size: 14px;
  margin: 0;
}

.immersive-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.background-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.background-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: slowZoom 25s ease-in-out infinite;
  opacity: 0;
  transition: opacity 1.2s ease-in-out;
}

.background-image.fade-in {
  opacity: 1;
}

@keyframes slowZoom {
  0% {
    transform: scale(1.0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1.0);
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-content {
  text-align: center;
  color: #333;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.default-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.ancient-style-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(circle at 20% 80%, rgba(255, 248, 220, 0.8) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(222, 184, 135, 0.6) 0%, transparent 50%),
    linear-gradient(135deg, #f5f5dc 0%, #e8e4c9 100%);
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.9;
}

.exit-immersive-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 10px 20px;
  background-color: rgba(255, 255, 255, 0.8);
  color: #333;
  border: none;
  border-radius: 25px;
  font-size: 14px;
  cursor: pointer;
  z-index: 1001;
  transition: all 0.3s ease;
}

.exit-immersive-btn:hover {
  background-color: rgba(255, 255, 255, 1);
  transform: translateY(-2px);
}



/* 响应式设计 */
@media (max-width: 768px) {
  .start-learning-btn {
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    font-size: 14px;
  }
}
</style>

<script>
import io from 'socket.io-client'
import { generateAttemptId } from '../utils/attemptId'

const API_BASE_URL = 'http://localhost:3000'

export default {
  name: 'PoemDetail',
  data() {
    return {
      poem: null,
      loading: true,
      error: '',
      // 语音朗读相关状态
      isReading: false,
      audio: null,
      // AI讲解相关状态
      aiExplanations: {
        daily_life_explanation: null,
        keyword_analysis: null,
        artistic_conception: null,
        thinking_questions: null
      },
      aiLoading: {
        daily_life_explanation: false,
        keyword_analysis: false,
        artistic_conception: false,
        thinking_questions: false
      },
      aiError: {
        daily_life_explanation: '',
        keyword_analysis: '',
        artistic_conception: '',
        thinking_questions: ''
      },
      allAiLoading: false,
      // API请求控制器，用于取消请求
      abortController: null,
      poemAbortController: null,
      isCollected: false,
      // 遮挡背诵功能相关
      recitationMode: false,
      hiddenLineIndices: [],
      userInput: [],
      showResult: [],
      isCorrect: [],
      // 元素飞舞效果相关
      floatingElements: [],
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
      recitationGuideLoading: false,
      recitationGuideError: '',
      // AI助教聊天相关
      showTutorChat: false,
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
      contentEntering: false,   // 内容区进入动画标记
      isImmersiveMode: false,
      isImageLoading: false,
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
      tutorLoading: false,
      tutorError: ''
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
    Object.keys(this.aiLoading).forEach(key => {
      this.aiLoading[key] = false
    })
    
    // 重置AI助教聊天记录
    this.tutorMessages = []
    this.tutorQuestion = ''
    this.tutorLoading = false
    
    next()
  },
  watch: {
    // 当诗词变化时，重置背诵相关数据和检查收藏状态
    poem: {
      handler() {
        this.resetRecitationData()
        this.checkCollectionStatus()
      },
      deep: true
    },
    // 监听路由参数变化，当id变化时重新获取诗词数据
    $route: {
      handler() {
        this.fetchPoemDetail()
      },
      deep: true
    }
  },
  computed: {
    poemLines() {
      if (!this.poem || !this.poem.content) return []
      return this.poem.content.split('\n').filter(line => line.trim())
    },
    sceneImageTitle() {
      const t = this.selectionPopup.selectedText || ''
      const n = this.selectionPopup.lineNumber
      const total = this.selectionPopup.totalLines
      const title = this.poem?.title || '古诗'
      if (n != null && total != null && total > 0) {
        return `《${title}》第${n}句 · 「${t}」 意境图`
      }
      return `「${t}」 意境图`
    }
  },
  mounted() {
    // 开始学习计时
    this.studyStartTime = Date.now()
    console.log('开始学习计时:', this.studyStartTime)
    
    this.fetchPoemDetail()

    try {
      const saved = localStorage.getItem('poemDetail.toolbarPlacement')
      if (saved === 'above' || saved === 'below' || saved === 'auto') {
        this.selectionPopup.placementMode = saved
      }
    } catch (e) { /* ignore */ }
    
    // 初始化Socket.io连接
    this.initSocket()
    
    // 初始化AI助教欢迎消息
    if (this.tutorMessages.length === 0) {
      this.$nextTick(() => {
        this.tutorMessages.push({
          role: 'bot',
          content: `你好！我是你的AI语文助教，专门为你解析这首诗词。
我们可以帮你：
1. 解释诗句含义和意境
2. 分析艺术特色和写作手法
3. 提供背诵技巧和学习建议
4. 回答关于作者和背景的问题
5. 选中文句后右键或点击悬浮按钮，了解诗句的翻译、赏析或生成意境图

你可以直接问我：
- "第一句是什么意思？"
- "这首诗表达了什么情感？"
- "如何更好地背诵这首诗？"
- 也可以选中诗句，点击悬浮按钮选择功能

请问你想了解关于这首诗的什么内容？`
        });
        // 滚动到底部
        this.scrollToBottom();
      });
    }

    // 监听文本选择，用于划词功能
    document.addEventListener('mouseup', this.handleTextSelection);
  },
  beforeUnmount() {
    // 清理Socket连接
    if (this.socket) {
      this.socket.disconnect()
    }
    // 清理轮播定时器
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval)
    }
    // 移除文本选择监听
    document.removeEventListener('mouseup', this.handleTextSelection);
  },
  methods: {
    // 加载个性化教学（RAG 驱动）
    async loadPersonalizedTutor() {
      if (this.tutorLoading || !this.poem) return
      this.tutorLoading = true
      this.tutorError = ''
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${API_BASE_URL}/api/ai/personalized-tutor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ poemId: this.poem.id })
        })
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('请登录后使用个性化学习')
          }
          throw new Error('个性化教学服务请求失败')
        }
        const res = await response.json()
        this.tutorData = res.data || res
      } catch (err) {
        console.error('[personalizedTutor] 获取失败:', err)
        this.tutorError = err.message || '个性化教学服务暂时不可用'
        this.tutorData = null
      } finally {
        this.tutorLoading = false
      }
    },
    // 背景图加载完成后触发淡入
    onBgImageLoaded() {
      this.bgImageFadingIn = true
      this.bgImageLoading = false
    },
    // 初始化Socket.io连接
    initSocket() {
      try {
        this.socket = io('http://localhost:3000')
        
        this.socket.on('connect', () => {
          console.log('Socket连接成功')
          // 发送认证信息
          this.socket.emit('authenticate', 'user_' + Date.now())
        })
        
        this.socket.on('disconnect', () => {
          console.log('Socket连接断开')
        })
        
        // 监听图像生成状态
        this.socket.on('image-generate-pending', (data) => {
          console.log('图像生成中:', data)
          this.imageStatus = 'pending'
        })
        
        this.socket.on('image-generate-success', (data) => {
      console.log('图像生成成功:', data)
      this.imageStatus = 'success'
      // 触发 AI 意境图淡入（先清空再设新图片，由 @load 触发 fade-in）
      this.bgImageFadingIn = false
      this.backgroundImage = data.url
    })
        
        this.socket.on('image-generate-fail', (data) => {
          console.log('图像生成失败:', data)
          this.imageStatus = 'fail'
          // 显示错误提示
          this.$message?.error(data.error || '背景图生成失败，将使用默认背景')
        })
      } catch (error) {
        console.error('Socket初始化失败:', error)
      }
    },
    // 预生成背景图
    pregenerateBackground() {
      if (!this.poem) return
      
      console.log('开始预生成背景图')
      this.imageStatus = 'pending'
      
      fetch(`${API_BASE_URL}/api/ai/image/pregenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          poemId: this.poem.id,
          title: this.poem.title,
          author: this.poem.author,
          content: this.poem.content
        })
      })
      .then(response => response.json())
      .then(data => {
        console.log('预生成请求已发送:', data)
      })
      .catch(error => {
        console.error('预生成失败:', error)
        this.imageStatus = 'fail'
      })
    },
    // 预加载图片
    preloadImage(url) {
      const img = new Image()
      img.src = url
      img.onload = () => {
        console.log('图片预加载完成:', url)
      }
      img.onerror = () => {
        console.error('图片加载失败:', url)
        this.imageStatus = 'fail'
      }
    },
    // 进入沉浸式学习模式
    enterImmersiveMode() {
      this.contentEntering = false
      this.$nextTick(() => {
        this.isImmersiveMode = true
        this.$nextTick(() => {
          // DOM 更新后触发渐入动画
          requestAnimationFrame(() => {
            this.contentEntering = true
          })
        })
      })
    },
    // 退出沉浸式学习模式
    exitImmersiveMode() {
      this.isImmersiveMode = false
      if (this.carouselInterval) {
        clearInterval(this.carouselInterval)
        this.carouselInterval = null
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
        // 重置沉浸式学习模式
        this.isImmersiveMode = false
        // 重置AI讲解相关状态
        this.aiExplanations = {
          daily_life_explanation: null,
          keyword_analysis: null,
          artistic_conception: null,
          thinking_questions: null
        }
        this.aiLoading = {
          daily_life_explanation: false,
          keyword_analysis: false,
          artistic_conception: false,
          thinking_questions: false
        }
        this.aiError = {
          daily_life_explanation: '',
          keyword_analysis: '',
          artistic_conception: '',
          thinking_questions: ''
        }
        this.allAiLoading = false
        // 重置背诵相关状态
        this.recitationMode = false
        this.userInput = []
        this.showResult = []
        this.isCorrect = []
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
        this.recitationGuideLoading = false
        this.recitationGuideError = ''
        // 重置AI助教聊天记录
        this.tutorMessages = []
        this.tutorQuestion = ''
        this.tutorLoading = false
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
        this.pregenerateBackground()
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
        
        // 设置所有加载状态为true
        this.allAiLoading = true
        Object.keys(this.aiLoading).forEach(key => {
          this.aiLoading[key] = true
          this.aiError[key] = ''
        })
        
        // 准备请求数据
        const requestData = {
          poem: this.poem.content,
          title: this.poem.title,
          author: this.poem.author
        }
        
        // 准备请求配置
        const requestConfig = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData),
          signal: this.abortController.signal
        }
        
        // 设置60秒超时（与后端超时一致）
        const timeoutId = setTimeout(() => this.abortController.abort(), 60000);
        
        try {
          // 使用批量API端点，只发送一个请求
          const response = await fetch(`${API_BASE_URL}/api/ai/explainPoem/batch`, requestConfig)
          
          // 清除超时
          clearTimeout(timeoutId);
          
          // 检查响应是否成功
          if (!response.ok) {
            throw new Error('获取AI讲解失败')
          }
          
          // 解析响应数据
          const batchData = await response.json()
          
          // 更新AI讲解数据
          this.aiExplanations.daily_life_explanation = batchData.daily_life_explanation
          this.aiExplanations.keyword_analysis = batchData.keyword_analysis
          this.aiExplanations.artistic_conception = batchData.artistic_conception
          this.aiExplanations.thinking_questions = batchData.thinking_questions
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        // 忽略取消请求的错误
        if (err.name === 'AbortError') {
          console.log('AI讲解请求已取消')
        } else {
          console.error('获取AI讲解失败:', err)
          // 设置所有错误状态
          Object.keys(this.aiError).forEach(key => {
            this.aiError[key] = '获取AI讲解失败'
          })
        }
      } finally {
        // 设置所有加载状态为false
        this.allAiLoading = false
        Object.keys(this.aiLoading).forEach(key => {
          this.aiLoading[key] = false
        })
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
        alert('请输入默写内容')
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
        
        const response = await fetch(`${API_BASE_URL}/api/ai/recite-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            original: this.poem.content,
            input: this.reciteInput,
            poem_id: this.poem.id,
            poem_title: this.poem.title,
            poem_author: this.poem.author,
            attemptId: this.reciteAttemptId
          })
        })
        
        if (!response.ok) {
          throw new Error('检测失败，请稍后重试')
        }
        
        const data = await response.json()
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
    // 归一化文本，只保留中文字符
    normalizeText(text) {
      if (!text) return ''
      let result = ''
      for (let i = 0; i < text.length; i++) {
        const char = text[i]
        // 检查是否是中文字符
        if (char >= '\u4e00' && char <= '\u9fff') {
          result += char
        }
      }
      return result
    },
    
    // 检查背诵结果
    async checkRecitation() {
      // 检查是否登录
      const token = localStorage.getItem('token')
      if (!token) {
        // 未登录，存储当前路径并跳转到登录页
        localStorage.setItem('redirectPath', this.$route.fullPath)
        this.$router.push('/login')
        return
      }
      
      try {
        this.showResult = this.hiddenLineIndices.map(() => true)
        
        // 准备原始诗句和用户输入
        const sentences = this.splitSentences(this.poem.content)
        const original = sentences.join('，')
        const userInputText = sentences.map((sentence, index) => {
          const inputIndex = this.hiddenLineIndices.indexOf(index)
          return inputIndex !== -1 ? this.userInput[inputIndex] : sentence
        }).join('，')
        
        // 调用AI背诵检测API
        if (!this.reciteAttemptId) this.reciteAttemptId = generateAttemptId()
        const response = await fetch(`${API_BASE_URL}/api/ai/recite-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            original: original,
            input: userInputText,
            poem_id: this.poem.id,
            poem_title: this.poem.title,
            poem_author: this.poem.author,
            attemptId: this.reciteAttemptId
          })
        })
        
        if (!response.ok) {
          throw new Error('检测失败，请稍后重试')
        }
        
        const data = await response.json()
        
        // 处理AI检测结果
        this.reciteResult = data
        
        // 标记用户输入是否正确
        this.isCorrect = this.hiddenLineIndices.map((index, i) => {
          const sentence = sentences[index]
          const userInput = this.userInput[i]
          const normalizedUserInput = this.normalizeText(userInput)
          const normalizedSentence = this.normalizeText(sentence)
          return normalizedUserInput === normalizedSentence
        })
        
        // 触发元素飞舞效果
        this.triggerFloatingElements()
      } catch (error) {
        console.error('背诵检测失败:', error)
        // 失败时使用本地检测
        this.showResult = this.hiddenLineIndices.map(() => true)
        this.isCorrect = this.hiddenLineIndices.map((index, i) => {
          const sentences = this.splitSentences(this.poem.content)
          const normalizedUserInput = this.normalizeText(this.userInput[i])
          const normalizedSentence = this.normalizeText(sentences[index])
          return normalizedUserInput === normalizedSentence
        })
        this.triggerFloatingElements()
      }
    },
    
    // 重置背诵相关数据
    resetRecitationData() {
      this.refreshRecitation()
      this.reciteResult = null
      this.reciteInput = ''
      this.reciteAttemptId = null
      this.wrongBookAdded = false
    },
    
    // 按标点符号分割句子
    splitSentences(content) {
      // 按标点符号分割句子
      return content.split(/[，。！？；]/).filter(sentence => sentence.trim())
    },
    
    // 刷新背诵题目
    refreshRecitation() {
      if (!this.poem || !this.poem.content) {
        this.hiddenLineIndices = []
        this.userInput = []
        this.showResult = []
        this.isCorrect = []
        return
      }
      
      // 按标点符号分割句子
      const sentences = this.splitSentences(this.poem.content)
      if (sentences.length === 0) {
        this.hiddenLineIndices = []
        this.userInput = []
        this.showResult = []
        this.isCorrect = []
        return
      }
      
      // 随机选择1-2个句子进行挖空
      const hiddenCount = Math.min(2, sentences.length)
      const allIndices = Array.from({ length: sentences.length }, (_, i) => i)
      
      // 随机打乱索引并选择前hiddenCount个
      const shuffledIndices = allIndices.sort(() => Math.random() - 0.5)
      this.hiddenLineIndices = shuffledIndices.slice(0, hiddenCount)
      
      // 初始化用户输入和结果数组
      this.userInput = new Array(hiddenCount).fill('')
      this.showResult = new Array(hiddenCount).fill(false)
      this.isCorrect = new Array(hiddenCount).fill(false)
    },
    
    // 触发元素飞舞效果
    triggerFloatingElements() {
      // 清空现有元素
      this.floatingElements = []
      
      // 生成新的飞舞元素
      const elements = ['春', '夏', '秋', '冬', '风', '花', '雪', '月', '山', '水', '云', '霞', '诗', '词', '歌', '赋']
      
      for (let i = 0; i < 12; i++) {
        this.floatingElements.push({
          text: elements[Math.floor(Math.random() * elements.length)],
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: 12 + Math.random() * 16,
          duration: 10 + Math.random() * 20,
          delay: Math.random() * 5,
          opacity: 0.3 + Math.random() * 0.7
        })
      }
      
      // 10秒后清除元素
      setTimeout(() => {
        this.floatingElements = []
      }, 10000)
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
      const fetchUrl = this.isCollected ? '/api/collections' : `/api/collections/${this.poem.id}`
      const method = this.isCollected ? 'POST' : 'DELETE'
      
      fetch(fetchUrl, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: this.isCollected ? JSON.stringify({ poem_id: this.poem.id }) : undefined
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('操作失败')
        }
        return response.json()
      })
      .then(data => {
        console.log('收藏操作成功:', data)
      })
      .catch(err => {
        console.error('收藏操作失败:', err)
        // 恢复原状态
        this.isCollected = !this.isCollected
        alert('操作失败，请稍后重试')
      })
    },
    // 检查诗词是否已收藏
    checkCollectionStatus() {
      if (!this.poem) return
      
      // 检查是否登录
      const token = localStorage.getItem('token')
      if (token) {
        // 已登录，从API获取收藏状态
        fetch(`/api/collections/check/${this.poem.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => {
          if (response.ok) {
            return response.json()
          }
          return { success: false, data: false }
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
        const token = localStorage.getItem('token')
        const response = await fetch(`${API_BASE_URL}/api/ai/poem/background`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: this.poem.title,
            author: this.poem.author,
            dynasty: this.poem.dynasty,
            content: this.poem.content
          })
        })

        if (response.ok) {
          const data = await response.json()
          this.poemBackground = data.background || ''
          this.poemBackgroundTips = data.tips || ''
        } else {
          // 后端不支持时，使用内置数据
          this.poemBackground = this.getBuiltinBackground(this.poem.title, this.poem.author, this.poem.dynasty)
          this.poemBackgroundTips = '了解创作背景有助于理解诗词的情感和意境，更好地背诵和鉴赏。'
        }
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
        const token = localStorage.getItem('token')
        const response = await fetch(`${API_BASE_URL}/api/ai/poem/story`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: this.poem.title,
            author: this.poem.author,
            content: this.poem.content
          })
        })

        if (response.ok) {
          const data = await response.json()
          this.poemStory = data.story || ''
        } else {
          this.poemStory = this.getBuiltinStory(this.poem.title, this.poem.author)
        }
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
        const token = localStorage.getItem('token')
        const response = await fetch(`${API_BASE_URL}/api/ai/poem/recitation-guide`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: this.poem.title,
            author: this.poem.author,
            content: this.poem.content,
            dynasty: this.poem.dynasty
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data && data.rhythm) {
            this.recitationGuide = data
          } else {
            this.recitationGuide = this.getBuiltinRecitationGuide(this.poem.title, this.poem.content)
          }
        } else {
          this.recitationGuide = this.getBuiltinRecitationGuide(this.poem.title, this.poem.content)
        }
      } catch (error) {
        console.error('获取诵读技巧失败:', error)
        this.recitationGuide = this.getBuiltinRecitationGuide(this.poem.title, this.poem.content)
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
      const token = localStorage.getItem('token')
      if (token) {
        console.log('已登录，发送学习时长到后端:', studyTime, '分钟')
        // 已登录，发送学习时长到后端
        fetch(`${API_BASE_URL}/api/learning/record`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            poem_id: this.poem.id,
            action: 'study_time',
            score: studyTime
          })
        })
        .then(response => {
          console.log('学习时长记录响应状态:', response.status)
          if (response.ok) {
            return response.json()
          }
          throw new Error('请求失败')
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
        // 已登录，发送学习行为到后端
        try {
          const response = await fetch(`${API_BASE_URL}/api/learn/record`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              poem_id: this.poem.id,
              action,
              score
            })
          })
          
          console.log('学习行为记录响应状态:', response.status)
          if (response.ok) {
            const data = await response.json()
            console.log('学习行为记录响应数据:', data)
            if (data.success) {
              console.log('学习行为记录成功:', action, score)
            } else {
              console.error('学习行为记录失败:', data.message)
            }
          } else {
            // 网络请求成功但返回错误状态，不抛出错误，避免影响用户体验
            console.error('学习行为记录失败: 服务器返回错误状态', response.status)
          }
        } catch (error) {
          // 网络请求失败，不抛出错误，避免影响用户体验
          console.error('学习行为记录失败:', error)
        }
      } else {
        console.log('未登录，不记录学习行为到后端')
      }
      
      // 同时保存到本地存储作为备份
      const learnedPoems = JSON.parse(localStorage.getItem('learnedPoems') || '[]')
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

        const response = await fetch(`${API_BASE_URL}/api/wrong-questions/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
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
          })
        });

        if (response.ok) {
          this.wrongBookAdded = true;
          this.sceneImageToast = {
            show: true,
            message: '已加入错题本，记得复习哦！',
            type: 'success'
          };
          setTimeout(() => {
            this.sceneImageToast.show = false;
          }, 3000);
        } else {
          throw new Error('添加失败');
        }
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
    // 切换朗读状态
    toggleRead() {
      if (this.isReading) {
        // 停止朗读
        this.stopReading();
      } else {
        // 开始朗读
        this.startReading();
      }
    },
    // 开始朗读诗词
    async startReading() {
      if (!this.poem || !this.poem.content) return;
      
      this.isReading = true;
      
      try {
        let text = this.poem.content;
        // 预处理：规范化标点，确保每句有停顿
        text = text.replace(/([。！？；])\s*/g, '$1，').replace(/\n/g, '。');
        
        // 调用后端语音合成API
        const response = await fetch(`${API_BASE_URL}/api/ai/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: text })
        });
        
        if (!response.ok) {
          throw new Error('语音合成失败');
        }
        
        // 获取音频数据
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // 创建音频对象并播放
        this.audio = new Audio(audioUrl);
        this.audio.onended = () => {
          this.isReading = false;
          URL.revokeObjectURL(audioUrl);
        };
        
        this.audio.play();
      } catch (error) {
        console.error('朗读失败:', error);
        this.isReading = false;
        alert('朗读失败，请稍后重试');
      }
    },
    // 停止朗读
    stopReading() {
      if (this.audio) {
        this.audio.pause();
        this.audio.currentTime = 0;
      }
      this.isReading = false;
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
        
        // 发送请求
        const response = await fetch(`${API_BASE_URL}/api/ai/tutor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            poem: this.poem.content,
            title: this.poem.title,
            author: this.poem.author,
            question: question,
            history: history
          })
        });
        
        if (!response.ok) {
          throw new Error('获取AI回答失败');
        }
        
        const data = await response.json();
        // 添加AI回答，确保长度不超过100字
        let answer = data.data.answer;
        if (answer.length > 100) {
          answer = answer.substring(0, 97) + '...';
        }
        this.tutorMessages.push({
          role: 'bot',
          content: answer
        });
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
    
    // 获取诗人头像（使用阿里云百炼文生图API生成）
    async getAuthorAvatar(author) {
      try {
        const CACHE_VERSION = 'v2';
        const cacheKey = `author_avatar_${CACHE_VERSION}_${author}`;
        
        const cachedAvatar = localStorage.getItem(cacheKey);
        if (cachedAvatar) {
          return cachedAvatar;
        }
        
        this.clearOldAuthorAvatarCacheOnce(CACHE_VERSION);
        
        const response = await fetch(`${API_BASE_URL}/api/ai/author-avatar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ author })
        });
        
        const data = await response.json();
        
        if (data.success && data.url) {
          localStorage.setItem(cacheKey, data.url);
          return data.url;
        }
        
        console.warn('诗人头像生成失败:', data.message);
        return this.getDefaultAvatar(author);
      } catch (error) {
        console.error('获取诗人头像失败:', error);
        return this.getDefaultAvatar(author);
      }
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
    
    // 获取默认头像（当AI生成失败时使用）
    getDefaultAvatar(author) {
      const seed = author.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=f5e6d3`;
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
        const response = await fetch(`${API_BASE_URL}/api/poems`);
        const allPoems = await response.json();
        
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
        const response = await fetch(`${API_BASE_URL}/api/ai/scene-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            poemLine: text,
            poemTitle: this.poem?.title || '古诗',
            poemAuthor: this.poem?.author || '佚名',
            lineNumber: this.selectionPopup.lineNumber,
            totalLines: this.selectionPopup.totalLines
          })
        });

        const data = await response.json();

        if (data.success && data.url) {
          this.bgImageFadingIn = false;
          this.backgroundImage = data.url;
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

        const response = await fetch(`${API_BASE_URL}/api/ai/tutor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            poem: this.poem.content,
            title: this.poem.title,
            author: this.poem.author,
            question: question,
            history: history
          })
        });

        if (!response.ok) {
          throw new Error('获取AI回答失败');
        }

        const data = await response.json();
        let answer = data.data.answer;
        if (answer.length > 150) {
          answer = answer.substring(0, 147) + '...';
        }
        this.tutorMessages.push({
          role: 'bot',
          content: answer
        });
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
.poem-detail {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  background: transparent;
}

/* 双栏布局 */
.poem-layout {
  display: flex;
  gap: 40px;
  margin-top: 20px;
  align-items: flex-start;
  position: relative;
  z-index: 10;
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 20px;
  box-shadow: var(--glass-shadow);
  /* 进入动画初始状态（隐藏） */
  opacity: 0;
  filter: blur(6px) scale(0.96);
  transition: opacity 0.7s ease, filter 0.7s ease, transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1),
              backdrop-filter 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}

.poem-layout.content-entering {
  opacity: 1;
  filter: blur(0) scale(1);
}

/* 正常显示时的悬停效果（动画完成后生效） */
.poem-layout.content-entering:hover {
  transform: translateY(-4px);
  backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  box-shadow: 0 12px 24px rgba(31, 38, 135, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.left-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.right-column {
  flex: 0 0 40%;
  min-width: 350px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .poem-layout {
    flex-direction: column;
  }
  
  .right-column {
    flex: 1;
    min-width: 100%;
  }
}

@media (max-width: 768px) {
  .poem-detail {
    padding: 15px;
  }

  .poem-layout {
    gap: 20px;
    padding: 15px;
  }

  .left-column,
  .right-column {
    gap: 20px;
  }

  .poem-background-card,
  .poem-story-card,
  .recitation-guide-card {
    padding: 18px;
  }

  .poem-background-card .section-title,
  .poem-story-card .section-title,
  .recitation-guide-card .section-title {
    font-size: 18px;
  }

  .ai-btn {
    padding: 8px 16px;
    font-size: 13px;
  }
}

.back-btn {
  padding: 8px 16px;
  font-size: 14px;
  background: rgba(33, 150, 243, 0.2);
  color: var(--secondary-color);
  border: 1px solid rgba(33, 150, 243, 0.3);
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 20px;
  transition: var(--transition);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(33, 150, 243, 0.15);
}

.back-btn:hover {
  background: rgba(33, 150, 243, 0.3);
  border-color: rgba(33, 150, 243, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(33, 150, 243, 0.25);
}

.poem-header {
  margin-bottom: 30px;
}

.title-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.collect-btn {
  padding: 10px 20px;
  font-size: 14px;
  background: rgba(244, 67, 54, 0.2);
  color: var(--danger-color);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(244, 67, 54, 0.15);
  white-space: nowrap;
  position: relative;
  overflow: hidden;
}

.collect-btn:hover {
  background: rgba(244, 67, 54, 0.3);
  border-color: rgba(244, 67, 54, 0.5);
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 8px 24px rgba(244, 67, 54, 0.25);
}

.collect-btn:active {
  transform: translateY(-1px) scale(0.98);
}

.collect-btn.collected {
  background: rgba(244, 67, 54, 0.8);
  color: white;
  border-color: rgba(244, 67, 54, 0.8);
  box-shadow: 0 8px 24px rgba(244, 67, 54, 0.4);
  animation: pulse 0.6s ease-in-out;
}

.collect-btn.collected:hover {
  background: rgba(244, 67, 54, 0.9);
  border-color: rgba(244, 67, 54, 0.9);
  box-shadow: 0 10px 28px rgba(244, 67, 54, 0.5);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}

.collect-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.collect-btn:hover::before {
  width: 300px;
  height: 300px;
}

.collect-btn:active::before {
  width: 400px;
  height: 400px;
  transition: width 0.2s, height 0.2s;
}

.poem-title {
  font-size: 28px;
  color: #333;
  margin-bottom: 12px;
  font-weight: bold;
}

.poem-author {
  font-size: 16px;
  color: #666;
}

.poem-text {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 40px;
  margin-bottom: 30px;
  font-family: 'SimSun', 'STSong', serif;
  box-shadow: var(--glass-shadow);
  transition: var(--transition);
  position: relative;
}

/* 朗读按钮样式 */
.read-btn {
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 10px 20px;
  font-size: 14px;
  background: rgba(205, 133, 63, 0.2);
  color: #8b4513;
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 20px;
  cursor: pointer;
  transition: var(--transition);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(139, 69, 19, 0.15);
  white-space: nowrap;
  z-index: 10;
}

.read-btn:hover {
  background: rgba(205, 133, 63, 0.3);
  border-color: rgba(205, 133, 63, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(139, 69, 19, 0.25);
}

.poem-text::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.poem-text:hover::before {
  transform: scaleX(1);
}

.poem-text:hover {
  transform: translateY(-4px);
  backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  box-shadow: 0 12px 24px rgba(31, 38, 135, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.poem-text.blurred {
  filter: blur(5px);
  animation: blurIn 0.5s ease-in-out;
}

@keyframes blurIn {
  from {
    filter: blur(0px);
  }
  to {
    filter: blur(5px);
  }
}

.poem-line {
  font-size: 20px;
  color: #333;
  line-height: 2.5;
  text-align: center;
  margin: 10px 0;
  letter-spacing: 1px;
}

.poem-char {
  padding: 0 2px;
}

.poem-punctuation {
  margin: 0 2px;
}

/* AI助教聊天容器样式 */
.tutor-chat-container {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: var(--glass-shadow);
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: var(--transition);
}

.tutor-chat-container:hover {
  transform: translateY(-4px);
  backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  box-shadow: 0 12px 24px rgba(31, 38, 135, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.tutor-chat-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 700px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 550px;
  padding: 16px;
  background: rgba(255, 252, 240, 0.2);
  border-radius: var(--border-radius);
  border: 1px solid var(--glass-border);
}

.chat-message {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 18px;
  position: relative;
}

.chat-message.user {
  align-self: flex-end;
  background: rgba(139, 69, 19, 0.1);
  border: 1px solid rgba(139, 69, 19, 0.2);
  border-radius: 18px 18px 4px 18px;
}

.chat-message.bot {
  align-self: flex-start;
  background: rgba(255, 252, 240, 0.8);
  border: 1px solid var(--glass-border);
  border-radius: 4px 18px 18px 18px;
}

.message-content {
  font-size: 14px;
  line-height: 1.4;
  color: #333;
}

.chat-input-area {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--glass-border);
}

.tutor-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  background: rgba(255, 252, 240, 0.3);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-size: 14px;
  transition: all 0.3s ease;
}

.tutor-input:focus {
  outline: none;
  border-color: rgba(76, 175, 80, 0.5);
  box-shadow: 0 8px 16px rgba(76, 175, 80, 0.15);
  transform: translateY(-2px);
  background: rgba(255, 252, 240, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.send-btn {
  padding: 12px 20px;
  background: rgba(76, 175, 80, 0.2);
  color: var(--primary-color);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: var(--transition);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.15);
}

.send-btn:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.3);
  border-color: rgba(76, 175, 80, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.25);
}

.send-btn:disabled {
  background: rgba(76, 175, 80, 0.1);
  color: var(--primary-color);
  border-color: rgba(76, 175, 80, 0.2);
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.1);
  opacity: 0.6;
}

/* 遮挡背诵功能样式 */
.recitation-section {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  margin-bottom: 30px;
  position: relative;
  box-shadow: var(--glass-shadow);
  transition: var(--transition);
}

.recitation-section:hover {
  transform: translateY(-4px);
  backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  box-shadow: 0 12px 24px rgba(31, 38, 135, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.recitation-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.refresh-btn {
  padding: 8px 16px;
  font-size: 14px;
  background: rgba(255, 152, 0, 0.2);
  color: var(--accent-color);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(255, 152, 0, 0.15);
  margin-left: auto;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(255, 152, 0, 0.3);
  border-color: rgba(255, 152, 0, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 152, 0, 0.25);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 16px rgba(255, 152, 0, 0.15);
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: rgba(255, 255, 255, 0.9);
  transition: .4s;
  border-radius: 50%;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

input:checked + .slider {
  background-color: #4CAF50;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.recitation-content {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: var(--glass-shadow);
  transition: var(--transition);
}

.recitation-content:hover {
  transform: translateY(-2px);
  backdrop-filter: blur(calc(var(--glass-blur) + 2px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 2px));
  box-shadow: 0 8px 16px rgba(31, 38, 135, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.recitation-pair {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  border-left: 4px solid #4CAF50;
  box-shadow: var(--glass-shadow);
  transition: var(--transition);
}

.recitation-pair:hover {
  transform: translateY(-2px);
  backdrop-filter: blur(calc(var(--glass-blur) + 2px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 2px));
  box-shadow: 0 8px 16px rgba(31, 38, 135, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.recitation-prompt {
  margin-bottom: 12px;
  padding: 12px;
  background: rgba(76, 175, 80, 0.1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(76, 175, 80, 0.2);
  border-radius: 8px;
  transition: var(--transition);
}

.recitation-prompt:hover {
  background: rgba(76, 175, 80, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-color: rgba(76, 175, 80, 0.3);
}

.prompt-label {
  font-weight: bold;
  color: #4CAF50;
  margin-right: 8px;
}

.prompt-text {
  font-size: 16px;
  color: #333;
  font-family: 'SimSun', 'STSong', serif;
  line-height: 1.6;
}

.recitation-line {
  margin-bottom: 15px;
}

.hidden-line {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recitation-input {
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.3s;
  font-family: 'SimSun', 'STSong', serif;
  width: 100%;
}

.recitation-input:focus {
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
}

.recitation-result {
  font-size: 14px;
  padding: 10px 16px;
  border-radius: 6px;
  margin-top: 4px;
}

.correct {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.incorrect {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.visible-content {
  padding: 16px;
}

.visible-line {
  font-size: 16px;
  color: #333;
  line-height: 1.8;
  font-family: 'SimSun', 'STSong', serif;
  margin-bottom: 12px;
}

.submit-btn {
  padding: 12px 24px;
  font-size: 16px;
  background: rgba(76, 175, 80, 0.2);
  color: var(--primary-color);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: var(--transition);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.15);
  margin-top: 16px;
  width: 100%;
  max-width: 200px;
  margin-left: auto;
  font-family: 'SimSun', 'STSong', serif;
  letter-spacing: 1px;
}

.submit-btn:hover {
  background: rgba(76, 175, 80, 0.3);
  border-color: rgba(76, 175, 80, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.25);
}

/* 元素飞舞效果样式 */
.floating-elements {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
  overflow: hidden;
}

.floating-element {
  position: absolute;
  color: #4CAF50;
  font-family: 'SimSun', 'STSong', serif;
  font-weight: bold;
  animation-timing-function: ease-in-out;
}

@keyframes float {
  0% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50vw + 50%), calc(-50vh + 50%)) rotate(360deg);
    opacity: 0;
  }
}

/* 诗词标题和作者样式优化 */
.poem-title {
  font-size: 32px;
  color: #2c3e50;
  margin-bottom: 16px;
  font-weight: bold;
  text-align: center;
  letter-spacing: 2px;
}

.poem-author {
  font-size: 18px;
  color: #7f8c8d;
  text-align: center;
  margin-bottom: 30px;
  letter-spacing: 1px;
}

.ai-explanation {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: var(--glass-shadow);
  transition: var(--transition);
}

.ai-explanation:hover {
  transform: translateY(-4px);
  backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  box-shadow: 0 12px 24px rgba(31, 38, 135, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.section-title {
  font-size: 20px;
  color: #333;
  margin-bottom: 20px;
  font-weight: bold;
}

.explanation-content {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 20px;
  box-shadow: var(--glass-shadow);
  transition: var(--transition);
  position: relative;
  overflow: hidden;
}

.explanation-content:hover {
  transform: translateY(-4px);
  backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  box-shadow: 0 12px 24px rgba(31, 38, 135, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.explanation-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.explanation-content:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(31, 38, 135, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

.explanation-content:hover::before {
  transform: scaleX(1);
}

.explanation-section {
  margin-bottom: 20px;
}

.explanation-section h3 {
  font-size: 16px;
  color: #4CAF50;
  margin-bottom: 8px;
  font-weight: bold;
}

.explanation-section p {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
}

/* 引导性思考题样式 */
.questions-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.question-item {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  margin-bottom: 10px;
  padding-left: 20px;
  position: relative;
}

.question-item:before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  width: 8px;
  height: 8px;
  background-color: #4CAF50;
  border-radius: 50%;
}

.ai-btn {
  padding: 12px 24px;
  font-size: 16px;
  background: rgba(76, 175, 80, 0.2);
  color: var(--primary-color);
  border: 1px solid rgba(76, 175, 80, 0.3);
}

/* 诗人简介样式 */
.author-profile {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: var(--glass-shadow);
  transition: var(--transition);
}

.author-profile:hover {
  transform: translateY(-4px);
  backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  box-shadow: 0 12px 24px rgba(31, 38, 135, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.author-content {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.author-avatar {
  flex: 0 0 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(139, 69, 19, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-loading {
  color: #666;
  font-size: 12px;
  text-align: center;
  padding: 20px;
  box-sizing: border-box;
}

.author-info {
  flex: 1;
}

.author-info h3 {
  font-size: 20px;
  color: #333;
  margin-bottom: 8px;
  font-weight: bold;
}

.author-dynasty {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.author-bio {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
}

/* 相似风格诗词样式 */
.similar-poems {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: var(--glass-shadow);
  transition: var(--transition);
}

.similar-poems:hover {
  transform: translateY(-4px);
  backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  box-shadow: 0 12px 24px rgba(31, 38, 135, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.similar-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.similar-item {
  background: rgba(255, 252, 240, 0.2);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: var(--transition);
}

.similar-item:hover {
  transform: translateY(-2px);
  background: rgba(255, 252, 240, 0.3);
  box-shadow: 0 8px 16px rgba(31, 38, 135, 0.1);
}

.similar-item h4 {
  font-size: 16px;
  color: #8b4513;
  margin-bottom: 8px;
  font-weight: bold;
}

.similar-author {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.similar-content {
  font-size: 14px;
  color: #555;
  line-height: 1.4;
  font-family: 'SimSun', 'STSong', serif;
}

.empty {
  text-align: center;
  padding: 40px;
  color: #999;
  font-style: italic;
}

.ai-btn:hover {
  background: rgba(76, 175, 80, 0.3);
  border-color: rgba(76, 175, 80, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.25);
}

.ai-btn.green {
  background: rgba(76, 175, 80, 0.2);
  color: var(--primary-color);
  border: 1px solid rgba(76, 175, 80, 0.3);
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.15);
  margin-bottom: 20px;
}

.ai-btn.green:hover {
  background: rgba(76, 175, 80, 0.3);
  border-color: rgba(76, 175, 80, 0.5);
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.25);
}

.error-message {
  color: #f44336;
  padding: 10px;
  margin: 10px 0;
  border-radius: var(--border-radius);
  background: rgba(244, 67, 54, 0.1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(244, 67, 54, 0.2);
  border-left: 4px solid #f44336;
  box-shadow: 0 4px 16px rgba(244, 67, 54, 0.1);
  transition: var(--transition);
}

.error-message:hover {
  background: rgba(244, 67, 54, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(244, 67, 54, 0.15);
  border-color: rgba(244, 67, 54, 0.3);
}

/* 加载动画 */
.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading, .error, .empty {
  text-align: center;
  padding: 40px;
  color: #666;
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  box-shadow: var(--glass-shadow);
  margin: 20px 0;
}

.error {
  color: #f44336;
  background: rgba(244, 67, 54, 0.1);
  border-color: rgba(244, 67, 54, 0.2);
}

/* 背诵检测功能样式 */
.recite-check-card {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  margin-bottom: 30px;
  box-shadow: var(--glass-shadow);
  position: relative;
  overflow: hidden;
  transition: var(--transition);
}

.recite-check-card:hover {
  transform: translateY(-4px);
  backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  box-shadow: 0 12px 24px rgba(31, 38, 135, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.recite-check-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #e74c3c, #f39c12);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.recite-check-card:hover::before {
  transform: scaleX(1);
}

/* 检测结果板块样式 */
.result-section {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.result-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(74, 144, 226, 0.2);
}

/* 正确率板块 */
.accuracy-section {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(80, 227, 194, 0.1));
}

.accuracy-display {
  display: flex;
  align-items: center;
  gap: 20px;
}

.accuracy-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4a90e2, #50e3c2);
  color: white;
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
}

.accuracy-circle.score-low {
  background: linear-gradient(135deg, #e74c3c, #f39c12);
}

.accuracy-circle.score-medium {
  background: linear-gradient(135deg, #f39c12, #f1c40f);
}

.accuracy-circle.score-high {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
}

.accuracy-number {
  font-size: 28px;
  font-weight: bold;
  line-height: 1;
}

.accuracy-unit {
  font-size: 12px;
  opacity: 0.9;
}

.accuracy-message {
  font-size: 14px;
  color: #555;
  font-weight: 500;
}

/* 问题板块 */
.problem-section {
  background: linear-gradient(135deg, rgba(231, 76, 60, 0.05), rgba(243, 156, 18, 0.05));
}

.problem-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.problem-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
}

.problem-label {
  font-weight: bold;
  color: #e74c3c;
  min-width: 50px;
}

.problem-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.error-tag {
  background: rgba(231, 76, 60, 0.15);
  color: #c0392b;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.missing-tag {
  background: rgba(52, 152, 219, 0.15);
  color: #2980b9;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid rgba(52, 152, 219, 0.3);
}

.extra-tag {
  background: rgba(241, 196, 15, 0.15);
  color: #d68910;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid rgba(241, 196, 15, 0.3);
}

.no-error-text {
  color: #27ae60;
  font-weight: 500;
}

/* 建议板块 */
.advice-section {
  background: linear-gradient(135deg, rgba(39, 174, 96, 0.05), rgba(46, 204, 113, 0.05));
}

.advice-content {
  background: rgba(39, 174, 96, 0.08);
  border-radius: 8px;
  padding: 12px 16px;
  border-left: 3px solid #27ae60;
}

.advice-text {
  font-size: 14px;
  color: #555;
  line-height: 1.7;
  margin: 0;
}

/* ===== 新增卡片通用样式 ===== */
.poem-background-card,
.poem-story-card,
.recitation-guide-card {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  box-shadow: var(--glass-shadow);
  position: relative;
  overflow: hidden;
  transition: var(--transition);
}

.poem-background-card:hover,
.poem-story-card:hover,
.recitation-guide-card:hover {
  transform: translateY(-4px);
  backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  box-shadow: 0 12px 24px rgba(31, 38, 135, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.poem-background-card::before,
.poem-story-card::before,
.recitation-guide-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.poem-background-card::before {
  background: linear-gradient(90deg, #4a90e2, #50e3c2);
}

.poem-story-card::before {
  background: linear-gradient(90deg, #9b59b6, #e91e63);
}

.recitation-guide-card::before {
  background: linear-gradient(90deg, #f5a623, #f8e71c);
}

.poem-background-card:hover::before,
.poem-story-card:hover::before,
.recitation-guide-card:hover::before {
  transform: scaleX(1);
}

/* 卡片加载状态 */
.card-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #666;
  font-size: 14px;
}

.mini-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(100, 149, 237, 0.15);
  border-top-color: #6495ed;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* ===== 创作背景卡片 ===== */
.poem-background-content {
  animation: fadeInUp 0.4s ease-out;
}

.background-item {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
}

.item-icon {
  font-size: 24px;
  flex-shrink: 0;
  margin-top: 2px;
}

.item-text {
  font-size: 14px;
  color: #555;
  line-height: 1.8;
  font-family: 'Noto Serif SC', 'SimSun', serif;
}

.background-tips {
  background: rgba(74, 144, 226, 0.08);
  border: 1px solid rgba(74, 144, 226, 0.2);
  border-radius: 12px;
  padding: 12px 16px;
}

.tips-label {
  font-size: 13px;
  font-weight: bold;
  color: #4a90e2;
  margin-bottom: 6px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
}

.background-tips p {
  font-size: 13px;
  color: #666;
  line-height: 1.7;
  margin: 0;
  font-family: 'Noto Serif SC', 'SimSun', serif;
}

/* ===== 趣味故事卡片 ===== */
.poem-story-content {
  animation: fadeInUp 0.4s ease-out;
}

.story-text {
  font-size: 14px;
  color: #555;
  line-height: 1.9;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  text-indent: 2em;
}

/* ===== 诵读指南卡片 ===== */
.recitation-guide-content {
  animation: fadeInUp 0.4s ease-out;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.guide-section {
  background: rgba(245, 166, 35, 0.05);
  border: 1px solid rgba(245, 166, 35, 0.15);
  border-radius: 12px;
  padding: 12px 16px;
}

.guide-title {
  font-size: 13px;
  font-weight: bold;
  color: #d4881a;
  margin-bottom: 6px;
  font-family: 'Noto Serif SC', 'SimSun', serif;
}

.guide-section p {
  font-size: 13px;
  color: #666;
  line-height: 1.7;
  margin: 0;
  font-family: 'Noto Serif SC', 'SimSun', serif;
}

.guide-tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.guide-tips-list li {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  padding-left: 16px;
  position: relative;
  font-family: 'Noto Serif SC', 'SimSun', serif;
}

.guide-tips-list li::before {
  content: '·';
  position: absolute;
  left: 4px;
  color: #f5a623;
  font-weight: bold;
}

/* ===== AI按钮 ===== */
.ai-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-family: 'Noto Serif SC', 'SimSun', serif;
}

.ai-btn.blue {
  background: linear-gradient(135deg, #4a90e2, #50e3c2);
  color: white;
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
}

.ai-btn.blue:hover:not(:disabled) {
  background: linear-gradient(135deg, #3a7fcf, #40c9a8);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(74, 144, 226, 0.4);
}

.ai-btn.purple {
  background: linear-gradient(135deg, #9b59b6, #e91e63);
  color: white;
  box-shadow: 0 4px 12px rgba(155, 89, 182, 0.3);
}

.ai-btn.purple:hover:not(:disabled) {
  background: linear-gradient(135deg, #8244a8, #d01555);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(155, 89, 182, 0.4);
}

.ai-btn.orange {
  background: linear-gradient(135deg, #f5a623, #f8e71c);
  color: #7a5200;
  box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);
}

.ai-btn.orange:hover:not(:disabled) {
  background: linear-gradient(135deg, #e09515, #f0db10);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(245, 166, 35, 0.4);
}

.ai-btn.green {
  background: linear-gradient(135deg, #4CAF50, #81C784);
  color: white;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.ai-btn.green:hover:not(:disabled) {
  background: linear-gradient(135deg, #3d8b40, #66bb6a);
  transform: translateY(-2px);
}

.ai-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.ai-btn .loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* ===== 个性化教学样式 ===== */
.personalized-tutor-section {
  background: linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 100%);
  border-radius: 16px;
  padding: 24px;
  margin: 20px 0;
  border: 1px solid #e0d4f5;
}
.tutor-subtitle {
  color: #666;
  font-size: 14px;
  margin: 4px 0 16px;
}
.tutor-content {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tutor-depth-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  width: fit-content;
}
.tutor-depth-badge.FOUNDATION { background: #e3f2fd; color: #1565c0; }
.tutor-depth-badge.DEVELOPING { background: #fff3e0; color: #e65100; }
.tutor-depth-badge.ADVANCED { background: #fce4ec; color: #c62828; }
.tutor-weak-points h4, .tutor-explanation h4, .tutor-key-points h4,
.tutor-advice h4, .tutor-practice h4, .tutor-related h4, .tutor-sources h4 {
  font-size: 15px;
  color: #333;
  margin-bottom: 8px;
}
.weak-point-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.weak-point-tag {
  background: #fff;
  border: 1px solid #d4c5f9;
  border-radius: 12px;
  padding: 4px 10px;
  font-size: 13px;
  color: #5e35b1;
}
.teaching-text {
  line-height: 1.8;
  color: #444;
  white-space: pre-wrap;
}
.key-points-list, .sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.key-point-item {
  padding: 6px 0;
  border-bottom: 1px dashed #e0d4f5;
  color: #444;
  font-size: 14px;
}
.key-point-item:last-child { border-bottom: none; }
.practice-item {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #e8e0f7;
}
.practice-question { font-weight: 500; color: #333; }
.practice-source { font-size: 12px; color: #888; margin-top: 4px; }
.related-poems-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.related-poem-tag {
  background: #fff;
  border: 1px solid #c5cae9;
  border-radius: 12px;
  padding: 4px 10px;
  font-size: 13px;
  color: #283593;
  cursor: pointer;
  transition: background 0.2s;
}
.related-poem-tag:hover { background: #e8eaf6; }
.source-item {
  font-size: 12px;
  color: #666;
  padding: 2px 0;
}
.source-type {
  display: inline-block;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 1px 6px;
  margin-right: 6px;
  font-weight: 500;
}
.tutor-degraded-notice {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #856404;
}

/* ===== 动画 ===== */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.recite-check-content {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 20px;
  box-shadow: var(--glass-shadow);
  transition: var(--transition);
}

.recite-check-content:hover {
  transform: translateY(-4px);
  backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  box-shadow: 0 12px 24px rgba(31, 38, 135, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
  font-weight: bold;
}

.recite-input {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  resize: vertical;
  font-family: 'SimSun', 'STSong', serif;
  line-height: 1.5;
  transition: all 0.3s ease;
  background: rgba(255, 252, 240, 0.3);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.recite-input:focus {
  border-color: rgba(76, 175, 80, 0.5);
  outline: none;
  box-shadow: 0 8px 16px rgba(76, 175, 80, 0.15);
  transform: translateY(-2px);
  background: rgba(255, 252, 240, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.recite-check-btn {
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  display: block;
  padding: 12px 24px;
  font-size: 16px;
  background: rgba(76, 175, 80, 0.2);
  color: var(--primary-color);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: var(--transition);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.15);
}

.recite-check-btn:hover {
  background: rgba(76, 175, 80, 0.3);
  border-color: rgba(76, 175, 80, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.25);
}

.recite-check-btn:disabled {
  background: rgba(76, 175, 80, 0.1);
  color: var(--primary-color);
  border-color: rgba(76, 175, 80, 0.2);
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.1);
  opacity: 0.6;
}

.recite-result-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.recite-score {
  text-align: center;
  margin-bottom: 30px;
}

.recite-score h3 {
  font-size: 18px;
  color: #333;
  margin-bottom: 16px;
}

.score-circle {
  display: inline-block;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.score-circle:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.score-excellent {
  background: linear-gradient(135deg, #4CAF50, #81C784);
  color: white;
}

.score-good {
  background: linear-gradient(135deg, #2196F3, #64B5F6);
  color: white;
}

.score-average {
  background: linear-gradient(135deg, #FFC107, #FFD54F);
  color: #333;
}

.score-poor {
  background: linear-gradient(135deg, #F44336, #E57373);
  color: white;
}

.score-number {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.score-label {
  font-size: 14px;
  opacity: 0.9;
}

.score-message {
  font-size: 12px;
  margin-top: 8px;
  font-weight: bold;
}

.recite-feedback {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feedback-item {
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.feedback-item h4 {
  font-size: 16px;
  margin-bottom: 12px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.feedback-item.error {
  background-color: #FFF3F3;
  border-left: 4px solid #F44336;
}

.feedback-item.advice {
  background-color: #F3F8FF;
  border-left: 4px solid #2196F3;
}

.error-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.error-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.error-item:last-child {
  border-bottom: none;
}

.error-position {
  font-weight: bold;
  color: #666;
  min-width: 80px;
}

.error-input {
  color: #F44336;
  font-weight: bold;
  text-decoration: line-through;
}

.error-arrow {
  color: #999;
}

.error-correct {
  color: #4CAF50;
  font-weight: bold;
}

.error-missing,
.error-extra {
  color: #F44336;
  font-weight: bold;
}

.ai-advice-container {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  padding: 16px;
  border-radius: var(--border-radius);
  box-shadow: var(--glass-shadow);
  transition: var(--transition);
}

.ai-advice-container:hover {
  transform: translateY(-2px);
  backdrop-filter: blur(calc(var(--glass-blur) + 2px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 2px));
  box-shadow: 0 8px 16px rgba(31, 38, 135, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.ai-advice {
  font-size: 14px;
  line-height: 1.6;
  color: #555;
  margin: 0;
}

/* 一键添加错题本 */
.add-to-wrongbook-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed #e0e0e0;
}

.add-wrongbook-btn {
  background: linear-gradient(135deg, #FF9800, #FF5722);
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
}

.add-wrongbook-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
  background: linear-gradient(135deg, #FFA726, #FF7043);
}

.add-wrongbook-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.wrongbook-added-tip {
  color: #4CAF50;
  font-size: 14px;
  font-weight: 500;
}

.small-spinner {
  width: 14px;
  height: 14px;
  border-width: 2px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .poem-detail {
    padding: 15px;
  }
  
  .poem-title {
    font-size: 24px;
  }
  
  .poem-text {
    padding: 20px;
  }
  
  .poem-line {
    font-size: 16px;
  }
  
  .ai-explanation {
    padding: 20px;
  }
  
  .recite-check-section {
    padding: 16px;
  }
  
  .recite-check-content {
    padding: 16px;
  }
  
  .score-circle {
    width: 100px;
    height: 100px;
  }
  
  .score-number {
    font-size: 20px;
  }
}
/* 古风风格增强 */
.recite-check-btn {
  font-family: 'SimSun', 'STSong', serif;
  letter-spacing: 1px;
}

.score-circle {
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.feedback-item {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  transition: all 0.3s;
  box-shadow: var(--glass-shadow);
}

.feedback-item:hover {
  box-shadow: 0 8px 16px rgba(31, 38, 135, 0.15);
  transform: translateY(-2px);
  backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 4px));
  border-color: rgba(255, 255, 255, 0.4);
}

/* AI助教聊天窗口样式 */
.tutor-chat-window {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 380px;
  max-height: 500px;
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  box-shadow: var(--glass-shadow);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.tutor-chat-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 252, 240, 0.2);
  border-radius: var(--border-radius) var(--border-radius) 0 0;
}

.tutor-chat-header h3 {
  margin: 0;
  font-size: 16px;
  color: #8b4513;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #8b4513;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: var(--transition);
}

.close-btn:hover {
  background: rgba(139, 69, 19, 0.1);
}

.tutor-chat-body {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 400px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
}

.chat-message {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 18px;
  position: relative;
}

.chat-message.user {
  align-self: flex-end;
  background: rgba(139, 69, 19, 0.1);
  border: 1px solid rgba(139, 69, 19, 0.2);
  border-radius: 18px 18px 4px 18px;
}

.chat-message.bot {
  align-self: flex-start;
  background: rgba(255, 252, 240, 0.8);
  border: 1px solid var(--glass-border);
  border-radius: 4px 18px 18px 18px;
}

.message-content {
  font-size: 14px;
  line-height: 1.4;
  color: #333;
}

.chat-input-area {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--glass-border);
}

.tutor-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-size: 14px;
  outline: none;
  transition: var(--transition);
}

.tutor-input:focus {
  border-color: #8b4513;
  box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.1);
}

.send-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 20px;
  background: #8b4513;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: var(--transition);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.send-btn:hover:not(:disabled) {
  background: #6b340f;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.2);
}

.send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.ai-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.ai-btn.blue {
  background: rgba(33, 150, 243, 0.2);
  color: var(--secondary-color);
  border: 1px solid rgba(33, 150, 243, 0.3);
  box-shadow: 0 4px 16px rgba(33, 150, 243, 0.15);
}

.ai-btn.blue:hover {
  background: rgba(33, 150, 243, 0.3);
  border-color: rgba(33, 150, 243, 0.5);
  box-shadow: 0 8px 24px rgba(33, 150, 243, 0.25);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tutor-chat-window {
    width: 90%;
    right: 5%;
    left: 5%;
    bottom: 20px;
  }
  
  .ai-buttons {
    flex-direction: column;
  }
  
  .ai-btn {
    width: 100%;
  }
}

/* 划词选择弹窗样式（position:fixed 须用视口坐标，勿加 scrollY） */
.selection-popup {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(255, 252, 240, 0.98);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(205, 133, 63, 0.35);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(139, 69, 19, 0.25);
  min-width: 160px;
}

.selection-popup.placement-above {
  transform: translateX(-50%) translateY(-100%);
  animation: popup-appear-above 0.2s ease;
}

.selection-popup.placement-below {
  transform: translateX(-50%);
  animation: popup-appear-below 0.2s ease;
}

.selection-popup::after {
  content: '';
  position: absolute;
  left: 50%;
  margin-left: -8px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
}

.selection-popup.placement-above::after {
  bottom: -8px;
  border-top: 10px solid rgba(255, 252, 240, 0.98);
}

.selection-popup.placement-below::after {
  top: -8px;
  border-bottom: 10px solid rgba(255, 252, 240, 0.98);
}

@keyframes popup-appear-above {
  from { opacity: 0; transform: translateX(-50%) translateY(calc(-100% + 6px)); }
  to { opacity: 1; transform: translateX(-50%) translateY(-100%); }
}

@keyframes popup-appear-below {
  from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.selection-popup-placement {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(205, 133, 63, 0.2);
}

.placement-label {
  font-size: 11px;
  color: #a0522d;
  margin-right: 2px;
}

.placement-chip {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 8px;
  border: 1px solid rgba(205, 133, 63, 0.35);
  background: rgba(255, 248, 220, 0.6);
  color: #8b4513;
  cursor: pointer;
  font-family: 'SimSun', 'STSong', serif;
}

.placement-chip.active {
  background: linear-gradient(135deg, rgba(205, 133, 63, 0.35), rgba(139, 69, 19, 0.25));
  border-color: rgba(139, 69, 19, 0.45);
  font-weight: bold;
}

.placement-chip:hover:not(.active) {
  background: rgba(255, 248, 220, 0.95);
}

.popup-btn {
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 10px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
}

.popup-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.popup-btn.translate {
  background: rgba(100, 149, 237, 0.15);
  color: #4169e1;
  border-color: rgba(100, 149, 237, 0.3);
}

.popup-btn.translate:hover:not(:disabled) {
  background: rgba(100, 149, 237, 0.25);
  border-color: rgba(100, 149, 237, 0.5);
}

.popup-btn.appreciate {
  background: rgba(50, 205, 50, 0.15);
  color: #228b22;
  border-color: rgba(50, 205, 50, 0.3);
}

.popup-btn.appreciate:hover:not(:disabled) {
  background: rgba(50, 205, 50, 0.25);
  border-color: rgba(50, 205, 50, 0.5);
}

.popup-btn.picture {
  background: rgba(205, 133, 63, 0.15);
  color: #8b4513;
  border-color: rgba(205, 133, 63, 0.3);
}

.popup-btn.picture:hover:not(:disabled) {
  background: rgba(205, 133, 63, 0.25);
  border-color: rgba(205, 133, 63, 0.5);
}

.popup-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(139, 69, 19, 0.3);
  border-top-color: #8b4513;
  border-radius: 50%;
  animation: popup-spin 0.8s linear infinite;
}

@keyframes popup-spin {
  to { transform: rotate(360deg); }
}

/* 意境图生成结果 toast 提示 */
.scene-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 24px;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 15px;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.scene-toast-success {
  background: rgba(76, 175, 80, 0.92);
  color: #fff;
}

.scene-toast-error {
  background: rgba(220, 53, 69, 0.92);
  color: #fff;
}

.scene-toast-info {
  background: rgba(33, 150, 243, 0.92);
  color: #fff;
}

.toast-icon {
  font-size: 16px;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.4s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>