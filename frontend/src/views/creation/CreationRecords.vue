<template>
  <div class="creation-records-container">
    <h1 class="page-title">我的创作记录</h1>
    
    <!-- 作品列表 -->
    <div class="works-list">
      <div v-for="work in works" :key="work.id" class="work-item">
        <div class="work-header">
          <h3 class="work-title">{{ work.title }}</h3>
          <div class="work-meta">
            <span class="work-genre">{{ work.genre }}</span>
            <span class="work-date">{{ formatDate(work.created_at) }}</span>
          </div>
        </div>
        <div class="work-content">
          <pre>{{ work.content }}</pre>
        </div>
        <div class="work-footer">
          <div v-if="work.score_data" class="work-score">
            <span class="score-label">评分：</span>
            <span class="score-value">{{ getTotalScore(work.score_data) }}</span>
          </div>
          <div class="work-actions">
            <button class="btn-secondary" @click="viewWorkDetail(work.id)">查看详情</button>
            <button class="btn-danger" @click="deleteWork(work.id)">删除</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 分页 -->
    <div v-if="pagination.total > pagination.pageSize" class="pagination">
      <button class="btn-secondary" @click="changePage(pagination.page - 1)" :disabled="pagination.page === 1">上一页</button>
      <span class="page-info">{{ pagination.page }} / {{ Math.ceil(pagination.total / pagination.pageSize) }}</span>
      <button class="btn-secondary" @click="changePage(pagination.page + 1)" :disabled="pagination.page * pagination.pageSize >= pagination.total">下一页</button>
    </div>
    
    <!-- 空状态 -->
    <div v-if="works.length === 0" class="empty-state">
      <p>暂无创作记录</p>
      <router-link to="/creation" class="btn-primary">开始创作</router-link>
    </div>
    
    <!-- 作品详情弹窗 -->
    <div v-if="selectedWork" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedWork.title }}</h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="work-detail-meta">
            <span class="work-detail-genre">{{ selectedWork.genre }}</span>
            <span class="work-detail-theme">{{ selectedWork.theme }}</span>
            <span class="work-detail-mode">{{ getModeLabel(selectedWork.creation_mode) }}</span>
            <span class="work-detail-date">{{ formatDate(selectedWork.created_at) }}</span>
          </div>
          <div class="work-detail-content">
            <pre>{{ selectedWork.content }}</pre>
          </div>
          <div v-if="selectedWork.ai_reference" class="work-detail-reference">
            <h4>AI参考</h4>
            <div v-if="parseAIReference(selectedWork.ai_reference).prompt_poem" class="reference-poem">
              <pre>{{ parseAIReference(selectedWork.ai_reference).prompt_poem }}</pre>
            </div>
            <div v-else-if="parseAIReference(selectedWork.ai_reference).poem" class="reference-poem">
              <pre>{{ parseAIReference(selectedWork.ai_reference).poem }}</pre>
            </div>
          </div>
          <div v-if="selectedWork.score_data" class="work-detail-score">
            <h4>评分结果</h4>
            <div class="score-card">
              <div class="total-score">{{ getTotalScore(selectedWork.score_data) }}</div>
              <div class="score-details">
                <div v-if="parseScoreData(selectedWork.score_data).analysis" class="score-item">
                  <span>内容契合度</span>
                  <span>{{ parseScoreData(selectedWork.score_data).analysis.content }}</span>
                </div>
                <div v-if="parseScoreData(selectedWork.score_data).analysis" class="score-item">
                  <span>韵律美感</span>
                  <span>{{ parseScoreData(selectedWork.score_data).analysis.rhythm }}</span>
                </div>
                <div v-if="parseScoreData(selectedWork.score_data).analysis" class="score-item">
                  <span>意境表达</span>
                  <span>{{ parseScoreData(selectedWork.score_data).analysis.意境 || parseScoreData(selectedWork.score_data).analysis.mood }}</span>
                </div>
                <div v-if="parseScoreData(selectedWork.score_data).dimensions" class="score-item">
                  <span>语言流畅度</span>
                  <span>{{ parseScoreData(selectedWork.score_data).dimensions.language }}</span>
                </div>
                <div v-if="parseScoreData(selectedWork.score_data).dimensions" class="score-item">
                  <span>创意性</span>
                  <span>{{ parseScoreData(selectedWork.score_data).dimensions.creativity }}</span>
                </div>
              </div>
              <div v-if="parseScoreData(selectedWork.score_data).suggestions" class="suggestions">
                {{ parseScoreData(selectedWork.score_data).suggestions }}
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CreationRecords',
  data() {
    return {
      works: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0
      },
      selectedWork: null
    }
  },
  mounted() {
    this.loadWorks();
  },
  methods: {
    async loadWorks() {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const response = await fetch(`${baseUrl}/creation/works/list?page=${this.pagination.page}&pageSize=${this.pagination.pageSize}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const data = await response.json();
        if (data.success && data.data) {
          this.works = data.data.works || [];
          this.pagination.total = data.data.pagination?.total ?? 0;
        } else {
          this.works = [];
          this.pagination.total = 0;
        }
      } catch (error) {
        console.error('加载作品列表失败:', error);
        alert('加载作品列表失败，请重试');
      }
    },
    
    changePage(page) {
      if (page >= 1 && page <= Math.ceil(this.pagination.total / this.pagination.pageSize)) {
        this.pagination.page = page;
        this.loadWorks();
      }
    },
    
    async viewWorkDetail(id) {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const response = await fetch(`${baseUrl}/creation/works/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const data = await response.json();
        if (data.success && data.data) {
          this.selectedWork = data.data;
        } else {
          alert(data.message || '加载作品详情失败');
        }
      } catch (error) {
        console.error('加载作品详情失败:', error);
        alert('加载作品详情失败，请重试');
      }
    },
    
    closeModal() {
      this.selectedWork = null;
    },
    
    async deleteWork(id) {
      if (confirm('确定要删除这篇作品吗？')) {
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
          const response = await fetch(`${baseUrl}/creation/works/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          const data = await response.json();
          if (data.success && data.message === '作品删除成功') {
            alert('作品删除成功');
            this.loadWorks();
          } else {
            alert('作品删除失败，请重试');
          }
        } catch (error) {
          console.error('删除作品失败:', error);
          alert('删除作品失败，请重试');
        }
      }
    },
    
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    getTotalScore(scoreData) {
      const data = JSON.parse(scoreData);
      return data.score || data.total || 0;
    },
    
    parseScoreData(scoreData) {
      try {
        return JSON.parse(scoreData);
      } catch (error) {
        return {};
      }
    },
    
    parseAIReference(aiReference) {
      try {
        return JSON.parse(aiReference);
      } catch (error) {
        return {};
      }
    },
    
    getModeLabel(mode) {
      const modeMap = {
        'novice': '新手填词',
        'theme': '主题创作',
        'feihua': '飞花令挑战'
      };
      return modeMap[mode] || mode;
    }
  }
}
</script>

<style scoped>
.creation-records-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.works-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.work-item {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.work-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.work-header {
  margin-bottom: 15px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
}

.work-title {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 18px;
}

.work-meta {
  display: flex;
  gap: 15px;
  font-size: 14px;
  color: #666;
}

.work-content {
  margin-bottom: 15px;
}

.work-content pre {
  white-space: pre-wrap;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  line-height: 1.6;
  margin: 0;
  color: #333;
}

.work-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #ddd;
  padding-top: 10px;
}

.work-score {
  font-size: 14px;
  color: #666;
}

.score-value {
  font-weight: bold;
  color: #007bff;
  margin-left: 5px;
}

.work-actions {
  display: flex;
  gap: 10px;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-danger:hover {
  background-color: #c82333;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 30px;
}

.page-info {
  font-size: 14px;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.empty-state p {
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  text-decoration: none;
  display: inline-block;
}

.btn-primary:hover {
  background-color: #0069d9;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #ddd;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.work-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #666;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.work-detail-content {
  margin-bottom: 20px;
}

.work-detail-content pre {
  white-space: pre-wrap;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 18px;
  line-height: 1.6;
  margin: 0;
  color: #333;
}

.work-detail-reference {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
}

.work-detail-reference h4 {
  margin-top: 0;
  color: #333;
  margin-bottom: 10px;
}

.reference-poem pre {
  white-space: pre-wrap;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  line-height: 1.6;
  margin: 0;
  color: #333;
}

.work-detail-score {
  margin-bottom: 20px;
}

.work-detail-score h4 {
  margin-top: 0;
  color: #333;
  margin-bottom: 15px;
}

.score-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 4px;
}

.total-score {
  font-size: 36px;
  font-weight: bold;
  color: #007bff;
  text-align: center;
  margin-bottom: 20px;
}

.score-details {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
}

.score-item {
  flex: 1;
  min-width: 120px;
  text-align: center;
}

.score-item span:first-child {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.score-item span:last-child {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.suggestions {
  background: white;
  padding: 15px;
  border-radius: 4px;
  color: #333;
  line-height: 1.6;
  font-size: 14px;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #ddd;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .work-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .work-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .score-details {
    flex-direction: column;
    gap: 10px;
  }
  
  .score-item {
    text-align: left;
    display: flex;
    justify-content: space-between;
  }
}
</style>