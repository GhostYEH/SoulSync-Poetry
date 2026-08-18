<template>
  <div class="student-detail-container">
    <!-- 顶部导航栏 -->
    <div class="detail-header">
      <button class="btn-back" @click="goBack">返回看板</button>
      <h1>学生学习详情</h1>
      <button class="btn-logout" @click="handleLogout">退出登录</button>
    </div>

    <!-- 学生信息卡片 -->
    <div class="student-info-card">
      <div class="student-avatar">
        <img :src="studentAvatar" alt="学生头像" />
      </div>
      <h2>{{ studentName }}</h2>
      <div class="student-tags">
        <span v-for="tag in studentTags" :key="tag" class="student-tag">{{ tag }}</span>
      </div>
      <div class="student-level">
        <div class="level-info">
          <span class="level-name">{{ studentLevelName }}</span>
          <span class="level-number">Lv.{{ studentLevel }}</span>
        </div>
        <div class="level-progress">
          <div class="progress-bar" :style="{ width: studentLevelProgress + '%' }"></div>
        </div>
      </div>
      <div class="info-stats">
        <div class="info-item">
          <span class="info-label">学习诗词数</span>
          <span class="info-value">{{ learningRecords.length }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">总学习时长</span>
          <span class="info-value">{{ totalStudyTime }}分钟</span>
        </div>
        <div class="info-item">
          <span class="info-label">最近学习</span>
          <span class="info-value">{{ lastStudyTime }}</span>
        </div>
      </div>
    </div>

    <!-- 个人数据可视化区 -->
    <div class="student-analysis-section">
      <!-- 个人学习趋势 -->
      <div class="chart-section">
        <h2>个人学习趋势</h2>
        <TeacherChart 
          :type="'line'"
          :data="learningTrendChartData"
          :loading="loading"
        />
      </div>

      <!-- 学习偏好对比 -->
      <div class="chart-row">
        <div class="chart-half">
          <h3>学习偏好对比</h3>
          <TeacherChart 
            :type="'pie'"
            :data="preferenceComparisonChartData"
            :height="'300px'"
            :loading="loading"
          />
        </div>
        <div class="chart-half">
          <h3>学习时段分布</h3>
          <TeacherChart 
            :type="'pie'"
            :data="timeDistributionChartData"
            :height="'300px'"
            :loading="loading"
          />
          <div class="best-time">
            <span class="best-time-label">最佳学习时段：</span>
            <span class="best-time-value">{{ bestStudyTime }}</span>
          </div>
        </div>
      </div>

      <!-- 记忆遗忘曲线 -->
      <div class="chart-section">
        <h2>记忆遗忘曲线</h2>
        <TeacherChart 
          :type="'line'"
          :data="memoryCurveChartData"
          :loading="loading"
        />
        <div class="review-suggestions">
          <h3>建议复习时间</h3>
          <div class="review-list">
            <div v-for="(item, index) in reviewSuggestions" :key="index" class="review-item">
              <div class="review-poem">
                <span class="poem-title">{{ item.title }}</span>
                <span class="poem-author">{{ item.author }}</span>
              </div>
              <span class="review-time">{{ item.bestReviewTime }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 学习能力分析 -->
      <div class="chart-section">
        <h2>学习能力分析</h2>
        <div class="ability-analysis">
          <div class="ability-chart">
            <TeacherChart 
              :type="'radar'"
              :data="abilityAnalysisChartData"
              :height="'300px'"
              :loading="loading"
            />
          </div>
          <div class="ability-comment">
            <p>{{ abilityAnalysisComment }}</p>
          </div>
        </div>
      </div>

      <!-- 知识掌握画像（可解释认知诊断） -->
      <div class="chart-section">
        <StudentKnowledgeProfile :user-id="studentId" />
      </div>

      <!-- 个性化推荐诗词 -->
      <div class="chart-section">
        <h2>个性化推荐诗词</h2>
        <div class="recommended-poems">
          <div v-for="(poem, index) in recommendedPoems" :key="index" class="recommended-poem">
            <div class="poem-header">
              <h4>{{ poem.title }}</h4>
              <span class="match-score">{{ poem.matchScore }}%</span>
            </div>
            <p class="poem-author">{{ poem.author }}</p>
            <p class="recommendation-reason">{{ poem.reason }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 学习记录列表 -->
    <div class="learning-records-section">
      <div class="records-header">
        <h2>学习记录</h2>
        <div class="records-filters">
          <div class="filter-group">
            <label>按朝代筛选：</label>
            <select v-model="dynastyFilter" @change="filterRecords">
              <option value="">全部</option>
              <option value="唐">唐</option>
              <option value="宋">宋</option>
              <option value="元">元</option>
              <option value="明">明</option>
              <option value="清">清</option>
            </select>
          </div>
          <div class="filter-group">
            <label>搜索：</label>
            <input type="text" v-model="searchKeyword" @input="filterRecords" placeholder="诗词标题或作者" />
          </div>
        </div>
      </div>
      <div class="records-table">
        <table>
          <thead>
            <tr>
              <th>诗词标题</th>
              <th>作者</th>
              <th>朝代</th>
              <th>学习次数</th>
              <th>学习时长</th>
              <th>最近学习时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in filteredRecords" :key="record.id">
              <td>{{ record.title }}</td>
              <td>{{ record.author }}</td>
              <td>{{ record.dynasty }}</td>
              <td>{{ record.view_count }}</td>
              <td>{{ Math.round(record.study_time / 60) }}分钟</td>
              <td>{{ formatTime(record.last_view_time) }}</td>
              <td>
                <button class="expand-btn" @click="toggleRecordDetail(record.id)">
                  {{ expandedRecordId === record.id ? '收起' : '展开' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="filteredRecords.length === 0" class="no-records">
        暂无学习记录
      </div>

      <!-- 展开的记录详情 -->
      <div v-if="expandedRecordId" class="record-detail-expanded">
        <h3>学习详情</h3>
        <div class="detail-content">
          <div class="detail-item">
            <span class="detail-label">学习笔记：</span>
            <span class="detail-value">该学生在学习过程中记录了重点词句</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">难点标记：</span>
            <span class="detail-value">部分生僻字和典故</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">学习时长分布：</span>
            <span class="detail-value">朗读：10分钟，背诵：15分钟，复习：5分钟</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 教师备注模块 -->
    <div class="teacher-notes-section">
      <h2>教师备注</h2>
      <div class="notes-list">
        <div v-for="note in teacherNotes" :key="note.id" class="note-item">
          <div class="note-header">
            <span class="note-date">{{ formatTime(note.created_at) }}</span>
            <div class="note-actions">
              <button class="edit-note-btn" @click="editNote(note)">编辑</button>
              <button class="delete-note-btn" @click="deleteNote(note.id)">删除</button>
            </div>
          </div>
          <p class="note-content">{{ note.content }}</p>
        </div>
      </div>
      <div class="add-note">
        <textarea v-model="newNoteContent" placeholder="添加备注..." rows="3"></textarea>
        <button class="add-note-btn" @click="addNote">添加备注</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TeacherChart from '@/components/teacher/TeacherChart.vue'
import StudentKnowledgeProfile from './components/StudentKnowledgeProfile.vue'

const router = useRouter()
const route = useRoute()
const learningRecords = ref([])
const studentName = ref('')

// 新增数据属性
const loading = ref(false)
const studentId = ref('')
const studentAvatar = ref('')
const studentTags = ref([])
const studentLevel = ref(5)
const studentLevelName = ref('进士')
const studentLevelProgress = ref(75)
const bestStudyTime = ref('晚上(18-24点)')
const reviewSuggestions = ref([])
const recommendedPoems = ref([])
const abilityAnalysisComment = ref('')
const teacherNotes = ref([])
const newNoteContent = ref('')
const dynastyFilter = ref('')
const searchKeyword = ref('')
const expandedRecordId = ref(null)

// 计算总学习时长
const totalStudyTime = computed(() => {
  return Math.round(learningRecords.value.reduce((sum, record) => sum + (record.study_time || 0), 0) / 60)
})

// 计算最近学习时间
const lastStudyTime = computed(() => {
  if (learningRecords.value.length === 0) return '未学习'
  const latestRecord = learningRecords.value.reduce((latest, record) => {
    if (!latest || new Date(record.last_view_time) > new Date(latest.last_view_time)) {
      return record
    }
    return latest
  })
  return formatTime(latestRecord.last_view_time)
})

// 过滤后的学习记录
const filteredRecords = computed(() => {
  return learningRecords.value.filter(record => {
    const matchesDynasty = !dynastyFilter.value || record.dynasty === dynastyFilter.value
    const matchesSearch = !searchKeyword.value || 
      record.title.includes(searchKeyword.value) || 
      record.author.includes(searchKeyword.value)
    return matchesDynasty && matchesSearch
  })
})

// 个人学习趋势图表数据
const learningTrendChartData = computed(() => {
  const data = [
    { date: '2024-01-01', duration: 60, poemCount: 2 },
    { date: '2024-01-02', duration: 90, poemCount: 3 },
    { date: '2024-01-03', duration: 45, poemCount: 1 },
    { date: '2024-01-04', duration: 120, poemCount: 4 },
    { date: '2024-01-05', duration: 150, poemCount: 5 },
    { date: '2024-01-06', duration: 75, poemCount: 2 },
    { date: '2024-01-07', duration: 90, poemCount: 3 }
  ]
  
  return {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['学习时长', '学习诗词数量']
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.date)
    },
    yAxis: [
      {
        type: 'value',
        name: '学习时长（分钟）',
        position: 'left'
      },
      {
        type: 'value',
        name: '学习诗词数量',
        position: 'right'
      }
    ],
    series: [
      {
        name: '学习时长',
        type: 'line',
        data: data.map(item => item.duration),
        smooth: true
      },
      {
        name: '学习诗词数量',
        type: 'line',
        yAxisIndex: 1,
        data: data.map(item => item.poemCount),
        smooth: true
      }
    ]
  }
})

// 学习偏好对比图表数据
const preferenceComparisonChartData = computed(() => {
  const data = [
    { name: '唐', value: 40 },
    { name: '宋', value: 30 },
    { name: '其他', value: 30 }
  ]
  
  return {
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data: data
    }]
  }
})

// 学习时段分布图表数据
const timeDistributionChartData = computed(() => {
  const data = [
    { name: '凌晨(0-6点)', value: 5 },
    { name: '上午(6-12点)', value: 30 },
    { name: '下午(12-18点)', value: 25 },
    { name: '晚上(18-24点)', value: 40 }
  ]
  
  return {
    series: [{
      type: 'pie',
      radius: '60%',
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data: data
    }]
  }
})

// 记忆遗忘曲线图表数据
const memoryCurveChartData = computed(() => {
  const data = [
    { day: 1, retention: 100 },
    { day: 2, retention: 80 },
    { day: 3, retention: 65 },
    { day: 4, retention: 55 },
    { day: 5, retention: 45 },
    { day: 6, retention: 40 },
    { day: 7, retention: 35 }
  ]
  
  return {
    xAxis: {
      type: 'category',
      data: data.map(item => `第${item.day}天`)
    },
    yAxis: {
      type: 'value',
      name: '记忆留存率（%）',
      min: 0,
      max: 100
    },
    series: [{
      data: data.map(item => item.retention),
      type: 'line',
      smooth: true,
      areaStyle: {
        opacity: 0.3
      }
    }]
  }
})

// 学习能力分析图表数据
const abilityAnalysisChartData = computed(() => {
  return {
    radar: {
      indicator: [
        { name: '记忆效率', max: 100 },
        { name: '理解深度', max: 100 },
        { name: '复习频率', max: 100 },
        { name: '拓展兴趣', max: 100 }
      ]
    },
    series: [{
      type: 'radar',
      data: [{
        value: [85, 75, 65, 90],
        name: '学习能力'
      }]
    }]
  }
})

// 检查教师认证
const checkAuth = () => {
  const token = localStorage.getItem('teacherToken')
  if (!token) {
    router.push('/teacher/login')
  }
  return token
}

// 加载学生学习记录
const loadStudentRecords = async () => {
  const token = checkAuth()
  if (!token) return

  studentId.value = route.params.id
  if (!studentId.value) {
    router.push('/teacher/dashboard')
    return
  }

  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    const response = await fetch(`${baseUrl}/teacher/student/${studentId.value}/detail`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.status === 401) {
      // 认证失败，清除token并跳转到登录页
      localStorage.removeItem('teacherToken')
      localStorage.removeItem('teacher')
      localStorage.removeItem('teacherInfo')
      router.push('/teacher/login')
      return
    }

    if (!response.ok) {
      throw new Error(`获取数据失败: ${response.status}`)
    }

    const data = await response.json()
    
    // 检查返回的数据结构
    if (data.error) {
      throw new Error(data.error)
    }
    
    learningRecords.value = data
    
    if (data.length > 0) {
      studentName.value = data[0].student_name || `学生${studentId.value}`
    } else {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
        const userResponse = await fetch(`${baseUrl}/teacher/rankings/overall`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (userResponse.ok) {
          const userData = await userResponse.json()
          const student = userData.data?.find(s => s.id === parseInt(studentId.value))
          if (student) {
            studentName.value = student.username
          }
        }
      } catch (e) {
        console.error('获取学生姓名失败:', e)
      }
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    error.value = '加载数据失败，请稍后重试'
  }
}

// 加载学生个人分析
const loadStudentAnalysis = async () => {
  const token = checkAuth()
  if (!token || !studentId.value) return

  loading.value = true
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    const response = await fetch(`${baseUrl}/teacher/student/${studentId.value}/analysis`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.status === 401) {
      // 认证失败，清除token并跳转到登录页
      localStorage.removeItem('teacherToken')
      localStorage.removeItem('teacher')
      localStorage.removeItem('teacherInfo')
      router.push('/teacher/login')
      return
    }

    if (!response.ok) {
      throw new Error(`获取分析数据失败: ${response.status}`)
    }

    const data = await response.json()
    
    // 检查返回的数据结构
    if (data.error) {
      throw new Error(data.error)
    }
    
    // 更新数据
    studentAvatar.value = data.avatar || `https://api.siliconflow.cn/v1/avatar/generate?name=${studentName.value}`
    studentTags.value = data.tags || ['诗词达人', '勤奋之星', '山水诗爱好者']
    studentLevel.value = data.level || 5
    studentLevelName.value = data.levelName || '进士'
    studentLevelProgress.value = data.levelProgress || 75
    bestStudyTime.value = data.bestStudyTime || '晚上(18-24点)'
    reviewSuggestions.value = data.reviewSuggestions || [
      { poemId: 1, title: '静夜思', author: '李白', bestReviewTime: '2024-01-08 19:00' },
      { poemId: 2, title: '望庐山瀑布', author: '李白', bestReviewTime: '2024-01-09 20:00' }
    ]
    recommendedPoems.value = data.recommendedPoems || [
      { id: 1, title: '望天门山', author: '李白', reason: '与已学的《望庐山瀑布》风格相似', matchScore: 92 },
      { id: 2, title: '黄鹤楼送孟浩然之广陵', author: '李白', reason: '与已学的《赠汪伦》同为送别诗', matchScore: 88 },
      { id: 3, title: '山居秋暝', author: '王维', reason: '符合山水诗偏好', matchScore: 95 },
      { id: 4, title: '登高', author: '杜甫', reason: '经典唐诗', matchScore: 85 },
      { id: 5, title: '钱塘湖春行', author: '白居易', reason: '山水诗代表作', matchScore: 90 }
    ]
    abilityAnalysisComment.value = data.abilityAnalysis?.comment || '该学生学习能力较强，尤其在拓展兴趣方面表现突出，建议加强复习频率。'
  } catch (error) {
    console.error('加载分析数据失败:', error)
    // 使用默认数据
    studentAvatar.value = `https://api.siliconflow.cn/v1/avatar/generate?name=${studentName.value}`
    studentTags.value = ['诗词达人', '勤奋之星', '山水诗爱好者']
    reviewSuggestions.value = [
      { poemId: 1, title: '静夜思', author: '李白', bestReviewTime: '2024-01-08 19:00' },
      { poemId: 2, title: '望庐山瀑布', author: '李白', bestReviewTime: '2024-01-09 20:00' }
    ]
    recommendedPoems.value = [
      { id: 1, title: '望天门山', author: '李白', reason: '与已学的《望庐山瀑布》风格相似', matchScore: 92 },
      { id: 2, title: '黄鹤楼送孟浩然之广陵', author: '李白', reason: '与已学的《赠汪伦》同为送别诗', matchScore: 88 },
      { id: 3, title: '山居秋暝', author: '王维', reason: '符合山水诗偏好', matchScore: 95 },
      { id: 4, title: '登高', author: '杜甫', reason: '经典唐诗', matchScore: 85 },
      { id: 5, title: '钱塘湖春行', author: '白居易', reason: '山水诗代表作', matchScore: 90 }
    ]
    abilityAnalysisComment.value = '该学生学习能力较强，尤其在拓展兴趣方面表现突出，建议加强复习频率。'
  } finally {
    loading.value = false
  }
}

// 加载教师备注
const loadTeacherNotes = async () => {
  const token = checkAuth()
  if (!token || !studentId.value) return

  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    const response = await fetch(`${baseUrl}/teacher/notes/${studentId.value}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('获取备注失败')
    }

    const data = await response.json()
    teacherNotes.value = data
  } catch (error) {
    console.error('加载备注失败:', error)
    // 使用默认数据
    teacherNotes.value = [
      {
        id: 1,
        content: '该学生学习积极性高，建议多提供一些挑战性的诗词',
        created_at: new Date().toISOString()
      }
    ]
  }
}

// 添加备注
const addNote = async () => {
  if (!newNoteContent.value.trim()) return

  const token = checkAuth()
  if (!token || !studentId.value) return

  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    const response = await fetch(`${baseUrl}/teacher/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        studentId: studentId.value,
        content: newNoteContent.value
      })
    })

    if (!response.ok) {
      throw new Error('添加备注失败')
    }

    // 重新加载备注
    await loadTeacherNotes()
    newNoteContent.value = ''
  } catch (error) {
    console.error('添加备注失败:', error)
    alert('添加备注失败，请稍后重试')
  }
}

// 编辑备注
const editNote = (note) => {
  // 这里可以实现编辑备注的逻辑
  console.log('编辑备注:', note)
}

// 删除备注
const deleteNote = async (noteId) => {
  const token = checkAuth()
  if (!token) return

  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    const response = await fetch(`${baseUrl}/teacher/notes/${noteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('删除备注失败')
    }

    // 重新加载备注
    await loadTeacherNotes()
  } catch (error) {
    console.error('删除备注失败:', error)
    alert('删除备注失败，请稍后重试')
  }
}

// 切换记录详情
const toggleRecordDetail = (recordId) => {
  if (expandedRecordId.value === recordId) {
    expandedRecordId.value = null
  } else {
    expandedRecordId.value = recordId
  }
}

// 过滤记录
const filterRecords = () => {
  // 过滤逻辑已在 computed 属性中实现
}

// 返回看板
const goBack = () => {
  router.push('/teacher/dashboard')
}

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('teacherToken')
  localStorage.removeItem('teacher')
  router.push('/teacher/login')
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return '未学习'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN')
}

// 页面加载时获取数据
onMounted(async () => {
  await loadStudentRecords()
  await loadStudentAnalysis()
  await loadTeacherNotes()
})
</script>

<style scoped>
.student-detail-container {
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(205, 133, 63, 0.1) 0%, rgba(139, 69, 19, 0.2) 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* 装饰元素 */
.student-detail-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="50" y="50" font-family="SimSun" font-size="20" text-anchor="middle" fill="rgba(205, 133, 63, 0.1)">师</text></svg>') repeat;
  opacity: 0.5;
  z-index: 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
}

.btn-back {
  padding: 8px 16px;
  background: rgba(205, 133, 63, 0.2);
  color: #8b4513;
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'SimSun', 'STSong', serif;
}

.btn-back:hover {
  background: rgba(205, 133, 63, 0.3);
  border-color: rgba(205, 133, 63, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.2);
}

.detail-header h1 {
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 24px;
  font-weight: bold;
  margin: 0;
}

.btn-logout {
  padding: 8px 16px;
  background: rgba(205, 133, 63, 0.2);
  color: #8b4513;
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'SimSun', 'STSong', serif;
}

.btn-logout:hover {
  background: rgba(205, 133, 63, 0.3);
  border-color: rgba(205, 133, 63, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.2);
}

.student-info-card {
  background: rgba(255, 252, 240, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 30px;
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(139, 69, 19, 0.15);
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
  text-align: center;
}

.student-info-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(139, 69, 19, 0.2);
  border-color: rgba(205, 133, 63, 0.3);
}

.student-avatar {
  margin-bottom: 20px;
}

.student-avatar img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid rgba(205, 133, 63, 0.3);
  object-fit: cover;
  transition: all 0.3s ease;
}

.student-avatar img:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.2);
}

.student-info-card h2 {
  margin: 0 0 15px 0;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 24px;
  font-weight: bold;
}

.student-tags {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.student-tag {
  padding: 6px 12px;
  background: rgba(205, 133, 63, 0.1);
  color: #8b4513;
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 16px;
  font-size: 12px;
  font-family: 'SimSun', 'STSong', serif;
}

.student-level {
  margin-bottom: 20px;
}

.level-info {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
}

.level-name {
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  font-weight: bold;
}

.level-number {
  color: #cd853f;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  font-weight: bold;
}

.level-progress {
  width: 80%;
  height: 8px;
  background: rgba(205, 133, 63, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin: 0 auto;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #cd853f, #8b4513);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.info-stats {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 15px;
}

.info-item {
  text-align: center;
  flex: 1;
  min-width: 120px;
}

.info-label {
  display: block;
  color: #666;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  margin-bottom: 5px;
}

.info-value {
  display: block;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 18px;
  font-weight: bold;
}

/* 个人数据可视化区 */
.student-analysis-section {
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.chart-section {
  background: rgba(255, 252, 240, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 30px;
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(139, 69, 19, 0.15);
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.chart-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(139, 69, 19, 0.2);
  border-color: rgba(205, 133, 63, 0.3);
}

.chart-section h2 {
  margin: 0 0 20px 0;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  position: relative;
}

.chart-section h2::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 3px;
  background: linear-gradient(90deg, #cd853f, #8b4513);
  border-radius: 3px;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.chart-half {
  background: rgba(255, 252, 240, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 20px;
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(139, 69, 19, 0.15);
  transition: all 0.3s ease;
  position: relative;
}

.chart-half:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(139, 69, 19, 0.2);
  border-color: rgba(205, 133, 63, 0.3);
}

.chart-half h3 {
  margin: 0 0 15px 0;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  font-weight: bold;
  text-align: center;
}

.best-time {
  margin-top: 15px;
  text-align: center;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  color: #8b4513;
}

.best-time-label {
  font-weight: 500;
}

.best-time-value {
  font-weight: bold;
  color: #cd853f;
}

.review-suggestions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(205, 133, 63, 0.2);
}

.review-suggestions h3 {
  margin: 0 0 15px 0;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  font-weight: bold;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.review-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: rgba(205, 133, 63, 0.05);
  border: 1px solid rgba(205, 133, 63, 0.1);
  border-radius: 8px;
}

.review-poem {
  flex: 1;
}

.poem-title {
  font-weight: bold;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  margin-right: 10px;
}

.poem-author {
  color: #666;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
}

.review-time {
  color: #999;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
}

.ability-analysis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: center;
}

.ability-chart {
  height: 300px;
}

.ability-comment {
  padding: 20px;
  background: rgba(205, 133, 63, 0.05);
  border: 1px solid rgba(205, 133, 63, 0.1);
  border-radius: 12px;
}

.ability-comment p {
  margin: 0;
  color: #666;
  font-family: 'SimSun', 'STSong', serif;
  line-height: 1.6;
}

.recommended-poems {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.recommended-poem {
  padding: 15px;
  background: rgba(205, 133, 63, 0.05);
  border: 1px solid rgba(205, 133, 63, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.recommended-poem:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.1);
  border-color: rgba(205, 133, 63, 0.3);
}

.poem-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.poem-header h4 {
  margin: 0;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  font-weight: bold;
}

.match-score {
  padding: 2px 8px;
  background: rgba(205, 133, 63, 0.2);
  color: #8b4513;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  font-family: 'SimSun', 'STSong', serif;
}

.poem-author {
  margin: 0 0 10px 0;
  color: #666;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
}

.recommendation-reason {
  margin: 0;
  color: #999;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  line-height: 1.4;
}

/* 学习记录列表 */
.learning-records-section {
  background: rgba(255, 252, 240, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 30px;
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(139, 69, 19, 0.15);
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
}

.records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.records-header h2 {
  margin: 0;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 20px;
  font-weight: bold;
  position: relative;
}

.records-filters {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  font-weight: 500;
}

.filter-group select,
.filter-group input {
  padding: 6px 12px;
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
}

.records-table {
  overflow-x: auto;
  margin-bottom: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'SimSun', 'STSong', serif;
}

th, td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid rgba(205, 133, 63, 0.2);
}

th {
  background: rgba(205, 133, 63, 0.1);
  color: #8b4513;
  font-weight: bold;
  font-size: 14px;
}

tr:hover {
  background: rgba(205, 133, 63, 0.1);
}

.expand-btn {
  padding: 4px 8px;
  background: rgba(205, 133, 63, 0.1);
  color: #8b4513;
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'SimSun', 'STSong', serif;
}

.expand-btn:hover {
  background: rgba(205, 133, 63, 0.2);
  border-color: rgba(205, 133, 63, 0.5);
  transform: translateY(-1px);
}

.no-records {
  text-align: center;
  padding: 40px;
  color: #666;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
}

.record-detail-expanded {
  margin-top: 20px;
  padding: 20px;
  background: rgba(205, 133, 63, 0.05);
  border: 1px solid rgba(205, 133, 63, 0.1);
  border-radius: 12px;
}

.record-detail-expanded h3 {
  margin: 0 0 15px 0;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  font-weight: bold;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-item {
  display: flex;
  gap: 10px;
}

.detail-label {
  font-weight: 500;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  min-width: 100px;
}

.detail-value {
  color: #666;
  font-family: 'SimSun', 'STSong', serif;
  flex: 1;
}

/* 教师备注模块 */
.teacher-notes-section {
  background: rgba(255, 252, 240, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 30px;
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(139, 69, 19, 0.15);
  position: relative;
  z-index: 1;
}

.teacher-notes-section h2 {
  margin: 0 0 20px 0;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  position: relative;
}

.teacher-notes-section h2::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 3px;
  background: linear-gradient(90deg, #cd853f, #8b4513);
  border-radius: 3px;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.note-item {
  padding: 15px;
  background: rgba(205, 133, 63, 0.05);
  border: 1px solid rgba(205, 133, 63, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.note-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.1);
  border-color: rgba(205, 133, 63, 0.3);
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.note-date {
  color: #999;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 12px;
}

.note-actions {
  display: flex;
  gap: 8px;
}

.edit-note-btn,
.delete-note-btn {
  padding: 4px 8px;
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'SimSun', 'STSong', serif;
}

.edit-note-btn {
  background: rgba(205, 133, 63, 0.1);
  color: #8b4513;
}

.edit-note-btn:hover {
  background: rgba(205, 133, 63, 0.2);
  border-color: rgba(205, 133, 63, 0.5);
}

.delete-note-btn {
  background: rgba(205, 133, 63, 0.1);
  color: #8b4513;
}

.delete-note-btn:hover {
  background: rgba(205, 133, 63, 0.2);
  border-color: rgba(205, 133, 63, 0.5);
}

.note-content {
  margin: 0;
  color: #666;
  font-family: 'SimSun', 'STSong', serif;
  line-height: 1.5;
}

.add-note {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.add-note textarea {
  flex: 1;
  min-width: 300px;
  padding: 12px;
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  resize: vertical;
}

.add-note-btn {
  padding: 10px 20px;
  background: rgba(139, 69, 19, 0.8);
  color: #fff;
  border: 1px solid #8b4513;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'SimSun', 'STSong', serif;
  height: 40px;
}

.add-note-btn:hover {
  background: rgba(139, 69, 19, 1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.2);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .chart-row {
    grid-template-columns: 1fr;
  }
  
  .ability-analysis {
    grid-template-columns: 1fr;
  }
  
  .ability-chart {
    height: 400px;
  }
}

@media (max-width: 768px) {
  .student-detail-container {
    padding: 15px;
  }
  
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .detail-header h1 {
    font-size: 20px;
  }
  
  .student-info-card {
    padding: 20px;
  }
  
  .chart-section {
    padding: 20px;
  }
  
  .chart-section h2 {
    font-size: 18px;
  }
  
  .chart-half {
    padding: 15px;
  }
  
  .learning-records-section {
    padding: 20px;
  }
  
  .records-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .records-filters {
    width: 100%;
    flex-direction: column;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .filter-group select,
  .filter-group input {
    flex: 1;
  }
  
  th, td {
    padding: 8px 12px;
    font-size: 14px;
  }
  
  .add-note {
    flex-direction: column;
    align-items: stretch;
  }
  
  .add-note textarea {
    min-width: 100%;
  }
  
  .add-note-btn {
    height: auto;
  }
}

@media (max-width: 480px) {
  .info-stats {
    flex-direction: column;
    align-items: center;
  }
  
  .info-item {
    width: 100%;
  }
  
  .learning-records-section {
    padding: 15px;
  }
  
  table {
    font-size: 12px;
  }
  
  th, td {
    padding: 6px 8px;
  }
  
  .recommended-poems {
    grid-template-columns: 1fr;
  }
}
</style>