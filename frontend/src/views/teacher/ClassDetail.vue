<template>
  <div class="class-detail-container">
    <!-- 顶部导航栏 -->
    <div class="dashboard-header">
      <h1>{{ className }} 班级详情</h1>
      <button class="btn-back" @click="goBack">返回</button>
    </div>

    <!-- 班级信息卡片 -->
    <div class="class-info-card">
      <div class="class-info-item">
        <h3>班级号</h3>
        <p class="class-info-value">{{ classId }}</p>
      </div>
      <div class="class-info-item">
        <h3>总人数</h3>
        <p class="class-info-value">{{ classData.total_students || 0 }}人</p>
      </div>
      <div class="class-info-item">
        <h3>班级排名</h3>
        <p class="class-info-value">{{ classRank || '暂无' }}</p>
      </div>
      <div class="class-info-item">
        <h3>平均学习诗词数</h3>
        <p class="class-info-value">{{ Math.round((classData.total_poems_studied || 0) / (classData.total_students || 1)) }}首</p>
      </div>
      <div class="class-info-item">
        <h3>平均学习时长</h3>
        <p class="class-info-value">{{ Math.round((classData.avg_study_time || 0) / 60) }}分钟</p>
      </div>
      <div class="class-info-item">
        <h3>学习诗词总数</h3>
        <p class="class-info-value">{{ classData.total_poems_studied || 0 }}首</p>
      </div>
    </div>

    <!-- 图表区 -->
    <div class="chart-section">
      <h2>班级学习趋势</h2>
      <TeacherChart 
        :type="'line'"
        :data="learningTrendChartData"
        :loading="loading"
      />
    </div>

    <div class="chart-row">
      <div class="chart-half">
        <h3>平均能力分布</h3>
        <TeacherChart 
          :type="'radar'"
          :data="studentAbilityChartData"
          :height="'300px'"
          :loading="loading"
        />
      </div>
      <div class="chart-half">
        <h3>学生学习时长分布</h3>
        <TeacherChart 
          :type="'pie'"
          :data="studyTimeDistributionChartData"
          :height="'300px'"
          :loading="loading"
        />
      </div>
    </div>

    <!-- 班级学生排行榜 -->
    <div class="students-ranking">
      <h2>班级学生排行榜</h2>
      <div class="ranking-table">
        <table>
          <thead>
            <tr>
              <th>排名</th>
              <th>用户名</th>
              <th>学习诗词数量</th>
              <th>总学习时长</th>
              <th>最近学习时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(student, index) in students" 
              :key="student.user_id"
              class="student-row"
              @click="viewStudentDetail(student.user_id)"
            >
              <td>{{ index + 1 }}</td>
              <td>{{ student.username }}</td>
              <td>{{ student.poem_count }}</td>
              <td>{{ Math.round((student.total_study_time || 0) / 60) }}分钟</td>
              <td>{{ formatTime(student.last_study_time) }}</td>
              <td>
                <button class="quick-view-btn" @click.stop="showQuickView(student)">
                  快速查看
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 快速查看弹窗 -->
    <div v-if="showQuickViewModal" class="quick-view-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ quickViewStudent?.username }} - 核心数据</h3>
          <button class="close-btn" @click="showQuickViewModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="quick-view-stats">
            <div class="quick-stat-item">
              <span class="stat-label">学习诗词数</span>
              <span class="stat-value">{{ quickViewStudent?.poem_count || 0 }}</span>
            </div>
            <div class="quick-stat-item">
              <span class="stat-label">总学习时长</span>
              <span class="stat-value">{{ Math.round((quickViewStudent?.total_study_time || 0) / 60) }}分钟</span>
            </div>
            <div class="quick-stat-item">
              <span class="stat-label">最近学习</span>
              <span class="stat-value">{{ formatTime(quickViewStudent?.last_study_time) }}</span>
            </div>
            <div class="quick-stat-item">
              <span class="stat-label">学习诗词</span>
              <span class="stat-value">{{ quickViewStudent?.poem_count || 0 }}首</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TeacherChart from '@/components/teacher/TeacherChart.vue'

const router = useRouter()
const route = useRoute()
const classId = ref(route.params.classId)
const className = computed(() => `第${classId.value}班`)
const classData = ref({})
const classRank = ref(0)
const students = ref([])
const loading = ref(true)
const showQuickViewModal = ref(false)
const quickViewStudent = ref(null)

// 检查教师认证
const checkAuth = () => {
  const token = localStorage.getItem('teacherToken')
  if (!token) {
    router.push('/teacher/login')
  }
  return token
}

// 加载班级数据
const loadClassData = async () => {
  const token = checkAuth()
  if (!token) return

  loading.value = true
  try {
    // 加载班级详情
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    const classResponse = await fetch(`${baseUrl}/teacher/classes/${classId.value}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (classResponse.ok) {
      const data = await classResponse.json()
      classData.value = data
    }

    // 加载班级学生
    const studentsResponse = await fetch(`${baseUrl}/teacher/classes/${classId.value}/students`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (studentsResponse.ok) {
      const data = await studentsResponse.json()
      students.value = data.data || data
    }

    // 模拟班级排名
    classRank.value = Math.floor(Math.random() * 10) + 1
  } catch (error) {
    console.error('加载班级数据失败:', error)
    // 使用模拟数据
    classData.value = {
      class_id: classId.value,
      total_students: 3,
      total_poems_studied: 150,
      avg_study_time: 2100
    }
    
    students.value = [
      { user_id: 1, username: '张三', poem_count: 60, total_study_time: 1800, last_study_time: '2026-03-23' },
      { user_id: 2, username: '李四', poem_count: 50, total_study_time: 1500, last_study_time: '2026-03-22' },
      { user_id: 3, username: '王五', poem_count: 40, total_study_time: 1200, last_study_time: '2026-03-21' }
    ]
  } finally {
    loading.value = false
  }
}

// 学习趋势图表数据
const learningTrendChartData = computed(() => {
  // 生成近7天的数据
  const data = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    data.push({
      date: dateStr,
      poems: Math.floor(Math.random() * 20) + 10,
      duration: Math.floor(Math.random() * 300) + 200
    })
  }
  
  return {
    title: {
      text: '',
      left: 'center'
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.date)
    },
    yAxis: [
      {
        type: 'value',
        name: '学习诗词数',
        position: 'left'
      },
      {
        type: 'value',
        name: '学习时长（分钟）',
        position: 'right'
      }
    ],
    series: [
      {
        name: '学习诗词数',
        type: 'line',
        data: data.map(item => item.poems),
        smooth: true,
        areaStyle: {
          opacity: 0.3
        }
      },
      {
        name: '学习时长',
        type: 'line',
        yAxisIndex: 1,
        data: data.map(item => item.duration),
        smooth: true
      }
    ]
  }
})

// 班级平均能力分布雷达图数据
const studentAbilityChartData = computed(() => {
  const studentCount = students.value.length || 1
  
  const avgPoemCount = students.value.reduce((sum, s) => sum + (s.poem_count || 0), 0) / studentCount
  const avgStudyTime = students.value.reduce((sum, s) => sum + (s.total_study_time || 0), 0) / studentCount
  const avgPoemRate = avgPoemCount / 10 * 100
  
  const avgAbility = {
    poemCount: Math.min(Math.round(avgPoemCount * 0.8), 100),
    studyTime: Math.min(Math.round(avgStudyTime / 30), 100),
    frequency: Math.min(Math.round(avgPoemRate), 100),
    activity: Math.min(Math.round(60 + (avgPoemCount / 100) * 30), 100)
  }
  
  return {
    radar: {
      indicator: [
        { name: '诗词数量', max: 100 },
        { name: '学习时长', max: 100 },
        { name: '学习频率', max: 100 },
        { name: '活跃度', max: 100 }
      ],
      shape: 'circle',
      splitNumber: 5,
      axisName: {
        color: '#8b4513',
        fontFamily: 'SimSun, STSong, serif',
        fontSize: 13
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(205, 133, 63, 0.2)'
        }
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(205, 133, 63, 0.05)', 'rgba(205, 133, 63, 0.1)', 'rgba(205, 133, 63, 0.15)', 'rgba(205, 133, 63, 0.2)', 'rgba(205, 133, 63, 0.25)']
        }
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(205, 133, 63, 0.3)'
        }
      }
    },
    series: [
      {
        name: '班级平均能力',
        type: 'radar',
        data: [
          {
            value: [
              avgAbility.poemCount,
              avgAbility.studyTime,
              avgAbility.frequency,
              avgAbility.activity
            ],
            name: '班级平均',
            areaStyle: {
              color: 'rgba(205, 133, 63, 0.3)'
            },
            lineStyle: {
              color: '#cd853f',
              width: 2
            },
            itemStyle: {
              color: '#8b4513'
            }
          }
        ],
        animationDuration: 1000,
        animationEasing: 'ease-out'
      }
    ]
  }
})

// 学习时长分布饼图数据
const studyTimeDistributionChartData = computed(() => {
  const timeRanges = {
    '0-30分钟': 0,
    '30-60分钟': 0,
    '60-120分钟': 0,
    '120+分钟': 0
  }
  
  students.value.forEach(student => {
    const minutes = Math.round((student.total_study_time || 0) / 60)
    if (minutes < 30) {
      timeRanges['0-30分钟']++
    } else if (minutes < 60) {
      timeRanges['30-60分钟']++
    } else if (minutes < 120) {
      timeRanges['60-120分钟']++
    } else {
      timeRanges['120+分钟']++
    }
  })
  
  const data = Object.entries(timeRanges).map(([name, value]) => ({
    name,
    value
  }))
  
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

// 查看学生详情
const viewStudentDetail = (userId) => {
  router.push(`/teacher/student/${userId}/detail`)
}

// 快速查看
const showQuickView = (student) => {
  quickViewStudent.value = student
  showQuickViewModal.value = true
}

// 返回
const goBack = () => {
  router.push('/teacher/dashboard')
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return '未学习'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN')
}

// 页面加载时获取数据
onMounted(() => {
  loadClassData()
})
</script>

<style scoped>
.class-detail-container {
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(205, 133, 63, 0.1) 0%, rgba(139, 69, 19, 0.2) 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* 装饰元素 */
.class-detail-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="50" y="50" font-family="SimSun" font-size="20" text-anchor="middle" fill="rgba(205, 133, 63, 0.1)">班</text></svg>') repeat;
  opacity: 0.5;
  z-index: 0;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
}

.dashboard-header h1 {
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 28px;
  font-weight: bold;
  margin: 0;
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

/* 班级信息卡片 */
.class-info-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.class-info-item {
  background: rgba(255, 252, 240, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 20px;
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(139, 69, 19, 0.15);
  transition: all 0.3s ease;
  text-align: center;
}

.class-info-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(139, 69, 19, 0.2);
  border-color: rgba(205, 133, 63, 0.3);
  background: linear-gradient(135deg, rgba(255, 252, 240, 0.9) 0%, rgba(255, 248, 230, 0.9) 100%);
}

.class-info-item h3 {
  margin: 0 0 10px 0;
  color: #666;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  font-weight: 500;
}

.class-info-value {
  margin: 0;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 24px;
  font-weight: bold;
}

/* 图表区 */
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
  position: relative;
  z-index: 1;
}

.chart-section:hover {
  transform: translateY(-4px);
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
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
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

/* 班级学生排行榜 */
.students-ranking {
  background: rgba(255, 252, 240, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 30px;
  border: 1px solid rgba(205, 133, 63, 0.2);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(139, 69, 19, 0.15);
  margin-bottom: 40px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.students-ranking:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(139, 69, 19, 0.2);
  border-color: rgba(205, 133, 63, 0.3);
}

.students-ranking h2 {
  margin: 0 0 20px 0;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  position: relative;
}

.students-ranking h2::after {
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

.ranking-table {
  overflow-x: auto;
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

.student-row {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.student-row:hover {
  background: rgba(205, 133, 63, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.1);
}

.student-row:nth-child(1) {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 252, 240, 0.05) 100%);
  font-weight: bold;
  height: 50px;
}

.student-row:nth-child(2) {
  background: linear-gradient(135deg, rgba(192, 192, 192, 0.1) 0%, rgba(255, 252, 240, 0.05) 100%);
  font-weight: bold;
  height: 50px;
}

.student-row:nth-child(3) {
  background: linear-gradient(135deg, rgba(205, 127, 50, 0.1) 0%, rgba(255, 252, 240, 0.05) 100%);
  font-weight: bold;
  height: 50px;
}

.quick-view-btn {
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
  position: relative;
  overflow: hidden;
}

.quick-view-btn:hover {
  background: rgba(205, 133, 63, 0.2);
  border-color: rgba(205, 133, 63, 0.5);
  transform: scale(1.05);
}

.quick-view-btn:active {
  transform: scale(0.98);
}

/* 快速查看弹窗 */
.quick-view-modal {
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
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: rgba(255, 252, 240, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 30px;
  border: 1px solid rgba(205, 133, 63, 0.3);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(139, 69, 19, 0.2);
  max-width: 400px;
  width: 90%;
  animation: slideIn 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(205, 133, 63, 0.2);
}

.modal-header h3 {
  margin: 0;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 18px;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #8b4513;
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-btn:hover {
  transform: scale(1.2);
  color: #cd853f;
}

.quick-view-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.quick-stat-item {
  text-align: center;
  padding: 15px;
  background: rgba(205, 133, 63, 0.05);
  border: 1px solid rgba(205, 133, 63, 0.1);
  border-radius: 12px;
}

.stat-label {
  display: block;
  color: #666;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 14px;
  margin-bottom: 5px;
}

.stat-value {
  display: block;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 20px;
  font-weight: bold;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .chart-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .class-detail-container {
    padding: 15px;
  }
  
  .dashboard-header h1 {
    font-size: 24px;
  }
  
  .class-info-card {
    grid-template-columns: 1fr;
  }
  
  .chart-section {
    padding: 20px;
  }
  
  .chart-section h2 {
    font-size: 18px;
  }
  
  .students-ranking {
    padding: 20px;
  }
  
  .students-ranking h2 {
    font-size: 18px;
  }
  
  th, td {
    padding: 8px 12px;
    font-size: 14px;
  }
  
  .quick-view-stats {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .modal-content {
    padding: 20px;
  }
}
</style>