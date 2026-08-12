<template>
  <div class="teacher-layout">
    <!-- 顶部导航栏 -->
    <header class="teacher-header">
      <div class="header-container">
        <div class="header-left">
          <h1 class="logo">古诗词学习系统</h1>
          <span class="logo-sub">教师端</span>
        </div>
        <nav class="nav-menu">
          <router-link to="/teacher/dashboard" class="nav-item" :class="{ active: route.path === '/teacher/dashboard' }">
            <span class="nav-icon">📊</span>
            <span>数据看板</span>
          </router-link>
          <router-link to="/teacher/knowledge" class="nav-item" :class="{ active: route.path === '/teacher/knowledge' }">
            <span class="nav-icon">🧠</span>
            <span>认知诊断</span>
          </router-link>
          <router-link to="/teacher/classes" class="nav-item" :class="{ active: route.path.startsWith('/teacher/classes') }">
            <span class="nav-icon">🏫</span>
            <span>班级管理</span>
          </router-link>
          <router-link to="/teacher/students" class="nav-item" :class="{ active: route.path.startsWith('/teacher/students') }">
            <span class="nav-icon">👥</span>
            <span>学生管理</span>
          </router-link>
          <router-link to="/teacher/poems" class="nav-item" :class="{ active: route.path.startsWith('/teacher/poems') }">
            <span class="nav-icon">📚</span>
            <span>诗词库管理</span>
          </router-link>
          <router-link to="/teacher/game-data" class="nav-item" :class="{ active: route.path === '/teacher/game-data' }">
            <span class="nav-icon">🎮</span>
            <span>对战数据</span>
          </router-link>
        </nav>
        <div class="header-right">
          <div class="user-info">
            <span class="user-avatar">{{ teacherName.charAt(0) }}</span>
            <span class="user-name">{{ teacherName }}</span>
          </div>
          <button class="logout-btn" @click="handleLogout">
            <span>退出</span>
          </button>
        </div>
      </div>
    </header>

    <main class="teacher-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const teacherName = ref('教师')

const handleLogout = () => {
  localStorage.removeItem('teacherToken')
  localStorage.removeItem('teacher')
  localStorage.removeItem('teacherInfo')
  router.push('/teacher/login')
}

onMounted(() => {
  const teacher = localStorage.getItem('teacher')
  if (teacher) {
    try {
      const teacherData = JSON.parse(teacher)
      teacherName.value = teacherData.username || '教师'
    } catch (e) {
      console.error('解析教师信息失败', e)
    }
  }
})
</script>

<style scoped>
.teacher-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(205,133,63,0.05) 0%, rgba(139,69,19,0.1) 100%);
}

/* 顶部导航栏 */
.teacher-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: linear-gradient(135deg, #8b4513 0%, #a0522d 50%, #cd853f 100%);
  box-shadow: 0 4px 20px rgba(139, 69, 19, 0.3);
  z-index: 1000;
}

.header-container {
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 30px;
  gap: 30px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 200px;
}

.logo {
  font-family: 'SimSun', 'STSong', serif;
  font-size: 22px;
  color: #fff;
  margin: 0;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}

.logo-sub {
  font-size: 12px;
  color: rgba(255,255,255,0.8);
  background: rgba(255,255,255,0.15);
  padding: 3px 8px;
  border-radius: 10px;
}

/* 导航菜单 */
.nav-menu {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  justify-content: center;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 12px;
  color: rgba(255,255,255,0.85);
  text-decoration: none;
  font-size: 15px;
  transition: all 0.3s ease;
  position: relative;
}

.nav-item:hover {
  background: rgba(255,255,255,0.15);
  color: #fff;
}

.nav-item.active {
  background: rgba(255,255,255,0.25);
  color: #fff;
  font-weight: 600;
}

.nav-item.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 3px;
  background: #fff;
  border-radius: 2px;
}

.nav-icon {
  font-size: 18px;
}

/* 右侧用户信息 */
.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 200px;
  justify-content: flex-end;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
  font-weight: bold;
  border: 2px solid rgba(255,255,255,0.4);
}

.user-name {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.logout-btn {
  padding: 8px 18px;
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: rgba(255,255,255,0.25);
  border-color: rgba(255,255,255,0.6);
}

/* 主内容区 */
.teacher-main {
  padding-top: 90px;
  padding-bottom: 30px;
  min-height: 100vh;
}
</style>