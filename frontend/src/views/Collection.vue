<template>
  <div class="collection">
    <h1 class="page-title">我的收藏</h1>
    
    <!-- 收藏统计信息 -->
    <div class="collection-stats" v-if="collectedPoems.length > 0">
      <p>共收藏了 {{ collectedPoems.length }} 首诗词</p>
      <div class="stats-actions">
        <button 
          class="batch-action-btn"
          @click="toggleSelectAll"
        >
          {{ selectAll ? '取消全选' : '全选' }}
        </button>
        <button 
          class="batch-action-btn delete"
          @click="batchDelete"
          :disabled="selectedPoems.length === 0"
        >
          删除选中 ({{ selectedPoems.length }})
        </button>
        <button 
          class="batch-action-btn"
          @click="sortByDate"
        >
          按收藏时间排序
        </button>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-collection">
      <div class="empty-icon">❤️</div>
      <h2>暂无收藏</h2>
      <p>收藏的诗词会显示在这里</p>
      <button class="back-btn" @click="goHome">去浏览诗词</button>
    </div>
    
    <!-- 收藏诗词列表 -->
    <div class="poem-list" v-if="collectedPoems.length > 0">
      <div 
        v-for="poem in collectedPoems" 
        :key="poem.id"
        class="poem-item"
      >
        <div class="poem-checkbox">
          <input 
            type="checkbox" 
            :id="`poem-${poem.id}`"
            :checked="selectedPoems.includes(poem.id)"
            @change="toggleSelect(poem.id)"
          />
          <label :for="`poem-${poem.id}`"></label>
        </div>
        <div class="poem-content" @click="navigateToDetail(poem.id)">
          <h3 class="poem-title">{{ poem.title }}</h3>
          <p class="poem-author">{{ poem.author }} · {{ poem.dynasty }}</p>
          <p class="poem-text">{{ getShortContent(poem.content) }}</p>
          <div class="poem-meta">
            <span class="collect-time">{{ formatCollectTime(poem.collectTime) }}</span>
          </div>
        </div>
        <button 
          class="remove-btn"
          @click="removeFromCollection(poem.id)"
        >
          🗑
        </button>
      </div>
    </div>
    
    <!-- 加载中状态 -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
    
    <!-- 错误状态 -->
    <div v-if="error" class="error">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="loadCollectedPoems">重试</button>
    </div>
  </div>
</template>

<script>
import { askConfirm } from '../services/appFeedback'

export default {
  name: 'Collection',
  data() {
    return {
      collectedPoems: [],
      loading: false,
      error: '',
      selectedPoems: [],
      selectAll: false
    }
  },
  mounted() {
    this.loadCollectedPoems()
  },
  methods: {
    // 加载收藏的诗词
    async loadCollectedPoems() {
      this.loading = true
      this.error = ''
      
      try {
        // 获取本地存储中的收藏数据
        const collectedData = JSON.parse(localStorage.getItem('collectedPoems') || '[]')
        
        if (collectedData.length === 0) {
          this.collectedPoems = []
          return
        }
        
        // 确保数据格式是对象数组
        const collectedIds = Array.isArray(collectedData) ? 
          collectedData.map(item => typeof item === 'string' ? { id: item } : item) : []
        
        // 批量获取诗词详情
        const poems = []
        for (const item of collectedIds) {
          const response = await fetch(`/api/poems/${item.id}`)
          if (response.ok) {
            const poem = await response.json()
            // 添加收藏时间
            poem.collectTime = item.collectTime || item.timestamp || new Date().toISOString()
            poems.push(poem)
          }
        }
        
        // 按收藏时间排序（默认最新的在前面）
        poems.sort((a, b) => new Date(b.collectTime) - new Date(a.collectTime))
        
        this.collectedPoems = poems
      } catch (err) {
        this.error = '加载收藏失败，请重试'
        console.error('加载收藏失败:', err)
      } finally {
        this.loading = false
      }
    },
    
    // 格式化收藏时间
    formatCollectTime(timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    // 获取诗词简短内容
    getShortContent(content) {
      if (!content) return ''
      const cleanContent = content.replace(/\s+/g, ' ').trim()
      return cleanContent.length > 60 ? cleanContent.substring(0, 60) + '...' : cleanContent
    },
    
    // 导航到诗词详情
    navigateToDetail(id) {
      this.$router.push(`/poem/${id}`)
    },
    
    // 回到首页
    goHome() {
      this.$router.push('/')
    },
    
    // 从收藏中移除
    async removeFromCollection(id) {
      if (await askConfirm('确定要移除这首诗词吗？', { title: '移出收藏', confirmText: '移除', danger: true })) {
        // 获取本地存储中的收藏数据
        const collectedData = JSON.parse(localStorage.getItem('collectedPoems') || '[]')
        
        // 过滤掉要移除的诗词
        const updatedData = collectedData.filter(item => 
          typeof item === 'string' ? item !== id : item.id !== id
        )
        
        // 保存到本地存储
        localStorage.setItem('collectedPoems', JSON.stringify(updatedData))
        
        // 更新本地数据
        this.collectedPoems = this.collectedPoems.filter(poem => poem.id !== id)
        this.selectedPoems = this.selectedPoems.filter(poemId => poemId !== id)
      }
    },
    
    // 批量删除
    async batchDelete() {
      if (this.selectedPoems.length === 0) return
      
      if (await askConfirm(`确定要删除选中的 ${this.selectedPoems.length} 首诗词吗？`, { title: '批量移出收藏', confirmText: '全部移除', danger: true })) {
        // 获取本地存储中的收藏数据
        const collectedData = JSON.parse(localStorage.getItem('collectedPoems') || '[]')
        
        // 过滤掉选中的诗词
        const updatedData = collectedData.filter(item => 
          typeof item === 'string' ? !this.selectedPoems.includes(item) : !this.selectedPoems.includes(item.id)
        )
        
        // 保存到本地存储
        localStorage.setItem('collectedPoems', JSON.stringify(updatedData))
        
        // 更新本地数据
        this.collectedPoems = this.collectedPoems.filter(poem => !this.selectedPoems.includes(poem.id))
        this.selectedPoems = []
        this.selectAll = false
      }
    },
    
    // 切换全选
    toggleSelectAll() {
      this.selectAll = !this.selectAll
      if (this.selectAll) {
        this.selectedPoems = this.collectedPoems.map(poem => poem.id)
      } else {
        this.selectedPoems = []
      }
    },
    
    // 切换选中状态
    toggleSelect(id) {
      const index = this.selectedPoems.indexOf(id)
      if (index > -1) {
        this.selectedPoems.splice(index, 1)
      } else {
        this.selectedPoems.push(id)
      }
      
      // 更新全选状态
      this.selectAll = this.selectedPoems.length === this.collectedPoems.length
    },
    
    // 按收藏时间排序
    sortByDate() {
      this.collectedPoems.sort((a, b) => new Date(b.collectTime) - new Date(a.collectTime))
    }
  }
}
</script>

<style scoped>
.collection {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 32px;
  color: #2c3e50;
  text-align: center;
  margin-bottom: 30px;
  font-weight: bold;
}

.collection-stats {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: var(--glass-shadow);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.stats-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.batch-action-btn {
  padding: 8px 16px;
  font-size: 14px;
  background: rgba(205, 133, 63, 0.2);
  color: #8b4513;
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(139, 69, 19, 0.15);
}

.batch-action-btn:hover {
  background: rgba(205, 133, 63, 0.3);
  border-color: rgba(255, 152, 0, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 152, 0, 0.2);
}

.batch-action-btn.delete {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border-color: rgba(244, 67, 54, 0.3);
}

.batch-action-btn.delete:hover {
  background: rgba(244, 67, 54, 0.3);
  border-color: rgba(244, 67, 54, 0.5);
  box-shadow: 0 8px 24px rgba(244, 67, 54, 0.2);
}

.batch-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 16px rgba(139, 69, 19, 0.15);
}

.poem-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 30px;
}

.poem-item {
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
  display: flex;
  gap: 16px;
  box-shadow: var(--glass-shadow);
  transition: var(--transition);
  position: relative;
  overflow: hidden;
}

.poem-item:hover {
  transform: scale(1.02) translateY(-4px);
  background: rgba(255, 252, 240, 0.9);
  box-shadow: 0 4px 16px rgba(255, 152, 0, 0.2);
  border-color: rgba(255, 152, 0, 0.3);
}

.poem-checkbox {
  display: flex;
  align-items: flex-start;
  padding-top: 8px;
}

.poem-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.poem-content {
  flex: 1;
  cursor: pointer;
}

.poem-title {
  font-size: 20px;
  color: #2c3e50;
  margin-bottom: 8px;
  font-weight: bold;
}

.poem-author {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 12px;
}

.poem-text {
  font-size: 16px;
  color: #444;
  line-height: 1.6;
  margin-bottom: 16px;
  font-family: 'SimSun', 'STSong', serif;
}

.poem-meta {
  font-size: 12px;
  color: #999;
}

.collect-time {
  display: block;
}

.remove-btn {
  padding: 8px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  align-self: flex-start;
}

.remove-btn:hover {
  background: rgba(244, 67, 54, 0.2);
  transform: scale(1.1);
}

.empty-collection {
  text-align: center;
  padding: 80px 20px;
  background: var(--glass-background);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  box-shadow: var(--glass-shadow);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-collection h2 {
  font-size: 24px;
  color: #666;
  margin-bottom: 10px;
}

.empty-collection p {
  font-size: 16px;
  color: #999;
  margin-bottom: 30px;
}

.back-btn {
  padding: 12px 32px;
  font-size: 16px;
  background: rgba(205, 133, 63, 0.2);
  color: #8b4513;
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: var(--transition);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(139, 69, 19, 0.15);
}

.back-btn:hover {
  background: rgba(205, 133, 63, 0.3);
  border-color: rgba(255, 152, 0, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 152, 0, 0.2);
}

.loading {
  text-align: center;
  padding: 60px 20px;
}

.loading-spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 3px solid rgba(205, 133, 63, 0.3);
  border-radius: 50%;
  border-top-color: #cd853f;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  text-align: center;
  padding: 40px 20px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.2);
  border-radius: var(--border-radius);
  color: #f44336;
}

.retry-btn {
  margin-top: 20px;
  padding: 8px 24px;
  font-size: 14px;
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: var(--transition);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.retry-btn:hover {
  background: rgba(244, 67, 54, 0.3);
  border-color: rgba(244, 67, 54, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(244, 67, 54, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .collection {
    padding: 15px;
  }
  
  .poem-list {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .poem-item {
    padding: 20px;
  }
  
  .collection-stats {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .stats-actions {
    justify-content: center;
  }
}
</style>
