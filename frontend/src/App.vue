<template>
  <div id="app" @mousemove="createMapleLeaf">

    <!-- 自定义标题栏 (Electron环境) -->
    <TitleBar v-if="isElectron" />

    <!-- 演示模式组件 -->
    <DemoMode ref="demoMode" />

    <!-- 动态元素容器 -->
    <div class="dynamic-elements" ref="dynamicElements"></div>

    <!-- 导航栏 -->
    <nav class="navbar ios26-navbar">
      <div class="nav-liquid-border"></div>
      <div class="nav-liquid-shine"></div>
      <div class="container navbar-container">
        <!-- 品牌 logo/标题 -->
        <router-link :to="isTeacher ? '/teacher/dashboard' : '/'" class="navbar-brand">
          <div class="brand-title">
            <div class="main-title">《智韵·灵犀》</div>
            <div class="sub-title">——基于大模型认知引擎与多维行为分析的智能化古诗词学习系统</div>
          </div>
        </router-link>
        
        <!-- 学生端导航 -->
        <ul v-if="!isTeacher" class="navbar-menu">
          <li class="navbar-item">
            <router-link to="/" class="glass-nav-button" active-class="glass-nav-active">首页</router-link>
          </li>
          <li class="navbar-item">
            <router-link to="/search" class="glass-nav-button" active-class="glass-nav-active">搜索</router-link>
          </li>
          <li class="navbar-item">
            <router-link to="/dashboard" class="glass-nav-button" active-class="glass-nav-active">学习仪表盘</router-link>
          </li>
          <li class="navbar-item">
            <router-link to="/feihualing/single" class="glass-nav-button" active-class="glass-nav-active">飞花令</router-link>
          </li>
          <li class="navbar-item">
            <router-link to="/challenge" class="glass-nav-button" active-class="glass-nav-active">诗词闯关</router-link>
          </li>
          <li class="navbar-item">
            <router-link to="/creation" class="glass-nav-button" active-class="glass-nav-active">诗词创作</router-link>
          </li>
          <li class="navbar-item">
            <router-link to="/error-book" class="glass-nav-button" active-class="glass-nav-active">错题本</router-link>
          </li>
          <li class="navbar-item">
            <router-link to="/profile" class="glass-nav-button" active-class="glass-nav-active">个人中心</router-link>
          </li>
          <li class="navbar-item">
            <button class="glass-nav-button switch-teacher-btn" @click="switchToTeacher">切换教师端</button>
          </li>
        </ul>
        
        <!-- 教师端导航 -->
        <div v-else class="teacher-nav">
          <!-- 桌面端导航 -->
          <ul class="navbar-menu teacher-navbar-menu">
            <li class="navbar-item">
              <router-link to="/teacher/dashboard" class="glass-nav-button" active-class="glass-nav-active">管理看板</router-link>
            </li>
            <li class="navbar-item">
              <router-link to="/teacher/classes" class="glass-nav-button" active-class="glass-nav-active">班级管理</router-link>
            </li>
            <li class="navbar-item">
              <router-link to="/teacher/students" class="glass-nav-button" active-class="glass-nav-active">学生管理</router-link>
            </li>
            <li class="navbar-item">
              <router-link to="/teacher/poems" class="glass-nav-button" active-class="glass-nav-active">诗词库管理</router-link>
            </li>
            <li class="navbar-item">
              <router-link to="/teacher/game-data" class="glass-nav-button" active-class="glass-nav-active">对战数据</router-link>
            </li>
            <li class="navbar-item">
              <button class="glass-nav-button switch-teacher-btn" @click="switchToStudent">切换学生端</button>
            </li>
            <li class="navbar-item">
              <button class="glass-nav-button logout-btn" @click="handleLogout">退出登录</button>
            </li>
          </ul>
          
          <!-- 移动端汉堡菜单 -->
          <div class="mobile-menu-toggle" @click="toggleMobileMenu">
            <div class="menu-icon"></div>
          </div>
          <div v-if="mobileMenuOpen" class="mobile-menu">
            <ul class="mobile-menu-list">
              <li class="mobile-menu-item">
                <router-link to="/teacher/dashboard" class="mobile-menu-link" @click="toggleMobileMenu">管理看板</router-link>
              </li>
              <li class="mobile-menu-item">
                <router-link to="/teacher/classes" class="mobile-menu-link" @click="toggleMobileMenu">班级管理</router-link>
              </li>
              <li class="mobile-menu-item">
                <router-link to="/teacher/students" class="mobile-menu-link" @click="toggleMobileMenu">学生管理</router-link>
              </li>
              <li class="mobile-menu-item">
                <router-link to="/teacher/poems" class="mobile-menu-link" @click="toggleMobileMenu">诗词库管理</router-link>
              </li>
              <li class="mobile-menu-item">
                <router-link to="/teacher/game-data" class="mobile-menu-link" @click="toggleMobileMenu">对战数据</router-link>
              </li>
              <li class="mobile-menu-item">
                <button class="mobile-menu-link switch-student-btn" @click="switchToStudent">切换学生端</button>
              </li>
              <li class="mobile-menu-item">
                <button class="mobile-menu-link logout-btn" @click="handleLogout">退出登录</button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>

    <!-- 主内容区 -->
    <main class="container">
      <router-view v-slot="{ Component }">
        <transition :name="transitionName" mode="out-in">
          <keep-alive :include="keepAliveIncludes">
            <component :is="Component" />
          </keep-alive>
        </transition>
      </router-view>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="container footer-container">
        <p class="footer-text">© 2026 《智韵·灵犀》——基于大模型认知引擎与多维行为分析的智能化古诗词学习系统</p>
        <p class="footer-text">基于 AI 技术的智能学习平台</p>
      </div>
    </footer>
  </div>
</template>

<script>
import TitleBar from './components/TitleBar.vue'
import DemoMode from './views/DemoMode.vue'

export default {
  name: 'App',
  components: {
    TitleBar,
    DemoMode
  },
  data() {
    return {
      dynamicElements: [],
      lastMapleLeafTime: 0,
      poemWords: ['春', '夏', '秋', '冬', '风', '花', '雪', '月', '山', '水', '云', '霞', '诗', '词', '歌', '赋', '人', '生', '梦', '想', '情', '意', '心', '境', '远', '近', '高', '低', '东', '西', '南', '北', '天', '地', '日', '月', '星', '辰'],
      collectionCount: 0,
      mobileMenuOpen: false,
      isElectron: false,
      isTeacher: false,
      transitionName: 'page-forward',
      lastPath: '/',
      keepAliveIncludes: ['PoemDetail'],
      appReady: false // 全局就绪状态，防止页面一直转圈
    }
  },


  mounted() {
    // 检测是否在Electron环境中
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;
    this.refreshIsTeacher();

    // 检测URL参数，启动演示模式
    const params = new URLSearchParams(window.location.search)
    if (params.get('demo') === 'true' && this.$refs.demoMode) {
      this.$refs.demoMode.startDemo()
    }

    // 监听页面切换方向事件
    window.addEventListener('page-transition', ((e) => {
      this.transitionName = `page-${e.detail.direction}`
    }))

    this.createDynamicElements()
    this.startCreatingDynamicElements()

    // 初始化收藏数量
    this.updateCollectionCount()

    // 添加点击和触摸事件监听器以创建涟漪效果
    this.clickHandler = this.createRipple.bind(this)
    document.addEventListener('click', this.clickHandler)
    document.addEventListener('touchstart', this.clickHandler)

    // 监听本地存储变化，实时更新收藏数量
    window.addEventListener('storage', this.handleStorageChange)

    // 监听Electron导航事件
    if (this.isElectron) {
      window.electronAPI.onNavigateTo((route) => {
        this.$router.push(route);
      });
    }

    // 设置导航栏鼠标跟踪效果
    this.setupNavbarHoverEffects();

    // 确保页面一定能正常显示（防止后端无响应导致无限loading）
    setTimeout(() => {
      this.appReady = true;
    }, 2000);
  },
  beforeUnmount() {
    this.stopCreatingDynamicElements()

    // 移除事件监听器
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler)
      document.removeEventListener('touchstart', this.clickHandler)
    }

    window.removeEventListener('page-transition', this.handlePageTransition)

    // 移除本地存储监听器
    window.removeEventListener('storage', this.handleStorageChange)

    // 移除Electron导航监听器
    if (this.isElectron) {
      window.electronAPI.removeNavigateListener();
    }

    // 清理导航栏鼠标跟踪效果
    this.cleanupNavbarHoverEffects();
  },
  methods: {
    handlePageTransition(e) {
      this.transitionName = `page-${e.detail.direction}`
    },
    // 刷新教师身份判定（替代 $forceUpdate，避免整个 App 重渲染）
    refreshIsTeacher() {
      const teacherToken = localStorage.getItem('teacherToken');
      const currentLoginType = localStorage.getItem('currentLoginType');
      this.isTeacher = !!(teacherToken || currentLoginType === 'teacher');
    },
    // 导航栏鼠标跟踪效果
    handleNavbarMouseMove(e) {
      const navbar = e.currentTarget;
      const rect = navbar.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      navbar.style.setProperty('--mouse-x', `${x}%`);
      navbar.style.setProperty('--mouse-y', `${y}%`);
    },
    // 导航按钮鼠标跟踪效果
    handleBtnMouseMove(e) {
      const btn = e.currentTarget;
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      btn.style.setProperty('--btn-mouse-x', `${x}%`);
      btn.style.setProperty('--btn-mouse-y', `${y}%`);
    },
    setupNavbarHoverEffects() {
      const navbar = document.querySelector('.ios26-navbar');
      if (navbar) {
        navbar.addEventListener('mousemove', this.handleNavbarMouseMove);
      }
      const navButtons = document.querySelectorAll('.glass-nav-button');
      navButtons.forEach(btn => {
        btn.addEventListener('mousemove', this.handleBtnMouseMove);
      });
    },
    cleanupNavbarHoverEffects() {
      const navbar = document.querySelector('.ios26-navbar');
      if (navbar) {
        navbar.removeEventListener('mousemove', this.handleNavbarMouseMove);
      }
      const navButtons = document.querySelectorAll('.glass-nav-button');
      navButtons.forEach(btn => {
        btn.removeEventListener('mousemove', this.handleBtnMouseMove);
      });
    },
    // 更新收藏数量
    updateCollectionCount() {
      try {
        const collectedPoems = JSON.parse(localStorage.getItem('collectedPoems') || '[]')
        this.collectionCount = collectedPoems.length
      } catch (error) {
        console.error('更新收藏数量失败:', error)
        this.collectionCount = 0
      }
    },
    // 处理本地存储变化
    handleStorageChange(event) {
      if (event.key === 'collectedPoems') {
        this.updateCollectionCount()
      }
      // 监听身份相关数据变化，仅刷新教师判定而非整个 App
      if (['token', 'teacherToken', 'user', 'teacher', 'userInfo', 'teacherInfo', 'studentId', 'teacherId', 'userRole', 'teacherRole', 'currentLoginType'].includes(event.key)) {
        this.refreshIsTeacher()
      }
    },
    createDynamicElements() {
      // 初始创建一些动态元素
      for (let i = 0; i < 10; i++) {
        this.createPetal()
        if (i % 2 === 0) {
          this.createFloatingText()
        }
      }
    },
    startCreatingDynamicElements() {
      // 定时创建新的动态元素
      this.petalInterval = setInterval(() => {
        this.createPetal()
      }, 5000)
      
      this.textInterval = setInterval(() => {
        this.createFloatingText()
      }, 8000)
    },
    stopCreatingDynamicElements() {
      if (this.petalInterval) {
        clearInterval(this.petalInterval)
      }
      if (this.textInterval) {
        clearInterval(this.textInterval)
      }
      // 清除所有动态元素
      this.dynamicElements.forEach(element => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element)
        }
      })
      this.dynamicElements = []
    },
    createPetal() {
      const petal = document.createElement('div')
      petal.className = 'petal'
      
      // 随机位置和动画时间
      const left = Math.random() * 100
      const duration = 10 + Math.random() * 20
      const delay = Math.random() * 5
      const size = 15 + Math.random() * 10
      
      petal.style.left = `${left}%`
      petal.style.animationDuration = `${duration}s`
      petal.style.animationDelay = `${delay}s`
      petal.style.width = `${size}px`
      petal.style.height = `${size}px`
      
      // 添加到容器
      if (this.$refs.dynamicElements) {
        this.$refs.dynamicElements.appendChild(petal)
        this.dynamicElements.push(petal)
        
        // 动画结束后移除元素
        setTimeout(() => {
          if (petal.parentNode) {
            petal.parentNode.removeChild(petal)
            const index = this.dynamicElements.indexOf(petal)
            if (index > -1) {
              this.dynamicElements.splice(index, 1)
            }
          }
        }, (duration + delay) * 1000)
      }
    },
    createFloatingText() {
      const text = document.createElement('div')
      text.className = 'floating-text'
      
      // 随机文字
      const randomWord = this.poemWords[Math.floor(Math.random() * this.poemWords.length)]
      text.textContent = randomWord
      
      // 随机位置和动画时间
      const left = Math.random() * 100
      const duration = 15 + Math.random() * 25
      const delay = Math.random() * 5
      const fontSize = 12 + Math.random() * 6
      
      text.style.left = `${left}%`
      text.style.animationDuration = `${duration}s`
      text.style.animationDelay = `${delay}s`
      text.style.fontSize = `${fontSize}px`
      
      // 添加到容器
      if (this.$refs.dynamicElements) {
        this.$refs.dynamicElements.appendChild(text)
        this.dynamicElements.push(text)
        
        // 动画结束后移除元素
        setTimeout(() => {
          if (text.parentNode) {
            text.parentNode.removeChild(text)
            const index = this.dynamicElements.indexOf(text)
            if (index > -1) {
              this.dynamicElements.splice(index, 1)
            }
          }
        }, (duration + delay) * 1000)
      }
    },
    createMapleLeaf(event) {
      // 限制枫叶生成频率，每300毫秒最多生成一个
      if (this.lastMapleLeafTime && Date.now() - this.lastMapleLeafTime < 300) {
        return
      }
      this.lastMapleLeafTime = Date.now()
      
      const mapleLeaf = document.createElement('div')
      mapleLeaf.className = 'maple-leaf'
      
      // 设置枫叶位置为鼠标当前位置
      mapleLeaf.style.left = `${event.clientX}px`
      mapleLeaf.style.top = `${event.clientY}px`
      
      // 随机大小和旋转角度
      const size = 15 + Math.random() * 10
      const rotate = Math.random() * 360
      const duration = 2
      
      mapleLeaf.style.width = `${size}px`
      mapleLeaf.style.height = `${size}px`
      mapleLeaf.style.transform = `rotate(${rotate}deg)`
      mapleLeaf.style.animationDuration = `${duration}s`
      
      // 添加到容器
      if (this.$refs.dynamicElements) {
        this.$refs.dynamicElements.appendChild(mapleLeaf)
        this.dynamicElements.push(mapleLeaf)
        
        // 动画结束后移除元素
        setTimeout(() => {
          if (mapleLeaf.parentNode) {
            mapleLeaf.parentNode.removeChild(mapleLeaf)
            const index = this.dynamicElements.indexOf(mapleLeaf)
            if (index > -1) {
              this.dynamicElements.splice(index, 1)
            }
          }
        }, duration * 1000)
      }
    },
    createRipple(event) {
      // 获取点击或触摸的坐标
      const clientX = event.touches ? event.touches[0].clientX : event.clientX
      const clientY = event.touches ? event.touches[0].clientY : event.clientY
      
      // 创建涟漪元素
      const ripple = document.createElement('div')
      ripple.className = 'ripple'
      
      // 设置涟漪位置为点击坐标
      ripple.style.left = `${clientX}px`
      ripple.style.top = `${clientY}px`
      
      // 添加到容器
      if (this.$refs.dynamicElements) {
        this.$refs.dynamicElements.appendChild(ripple)
        this.dynamicElements.push(ripple)
        
        // 动画结束后移除元素
        const animationDuration = 0.6 // 涟漪动画持续时间
        setTimeout(() => {
          if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple)
            const index = this.dynamicElements.indexOf(ripple)
            if (index > -1) {
              this.dynamicElements.splice(index, 1)
            }
          }
        }, animationDuration * 1000)
      }
    },
    // 切换移动端菜单
    toggleMobileMenu() {
      this.mobileMenuOpen = !this.mobileMenuOpen
    },
    // 教师退出登录
    handleLogout() {
      // 保存当前登录类型
      const currentLoginType = localStorage.getItem('currentLoginType') || 'teacher';
      // 清除身份数据但保留登录类型
      this.clearAuthData()
      // 跳转到教师登录页
      this.$router.push('/teacher/login')
      this.refreshIsTeacher()
    },
    // 清除身份数据但保留登录类型
    clearAuthData() {
      // 学生端相关数据
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('userInfo')
      localStorage.removeItem('studentId')
      localStorage.removeItem('userRole')
      // 教师端相关数据
      localStorage.removeItem('teacherToken')
      localStorage.removeItem('teacher')
      localStorage.removeItem('teacherInfo')
      localStorage.removeItem('teacherId')
      localStorage.removeItem('teacherRole')
      // 其他可能的身份相关数据
      localStorage.removeItem('redirectPath')
      localStorage.removeItem('authToken')
      // 注意：不清除 currentLoginType
    },
    // 完全清除所有数据（用于切换登录类型时）
    clearAllData() {
      // 清除所有数据，包括登录类型
      localStorage.clear()
    },
    // 切换到教师端
    switchToTeacher() {
      // 保存当前登录类型为教师
      localStorage.setItem('currentLoginType', 'teacher')
      // 清除学生端相关数据
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('userInfo')
      localStorage.removeItem('studentId')
      localStorage.removeItem('userRole')
      // 跳转到教师登录页
      this.$router.push('/teacher/login')
      this.refreshIsTeacher()
    },
    // 切换到学生端
    switchToStudent() {
      // 保存当前登录类型为学生
      localStorage.setItem('currentLoginType', 'student')
      // 清除教师端相关数据
      localStorage.removeItem('teacherToken')
      localStorage.removeItem('teacher')
      localStorage.removeItem('teacherInfo')
      localStorage.removeItem('teacherId')
      localStorage.removeItem('teacherRole')
      // 跳转到学生登录页
      this.$router.push('/login')
      this.refreshIsTeacher()
    }
  }
}
</script>

<style>
/* 全局样式 */
#app {
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* ===== 古风卷轴页面过渡 ===== */
/* 前进：旧页向下滑出，新页从上方滑入 */
.page-forward-enter-active,
.page-forward-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.page-forward-enter-from {
  opacity: 0;
  transform: translateY(-16px);
}
.page-forward-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
.page-forward-enter-to,
.page-forward-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* 后退：旧页向上滑出，新页从下方滑入 */
.page-back-enter-active,
.page-back-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.page-back-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.page-back-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}
.page-back-enter-to,
.page-back-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* 旧 fade 保持兼容 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 动态元素容器 */
.dynamic-elements {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 999;
  overflow: hidden;
}

/* 涟漪效果样式 */
:root {
  --ripple-color: rgba(205, 133, 63, 0.6);
  --ripple-size: 100px;
  --ripple-duration: 0.6s;
}

.ripple {
  position: fixed;
  width: 10px;
  height: 10px;
  background: var(--ripple-color);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  animation: ripple-animation var(--ripple-duration) ease-out forwards;
  pointer-events: none;
  z-index: 9999;
}

/* 涟漪动画 */
@keyframes ripple-animation {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(10);
    opacity: 0;
  }
}

/* 飘动的花瓣 */
.petal {
  position: absolute;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #ffb3ba, #ffc0cb);
  border-radius: 10px 0 10px 0;
  animation: petal-float linear forwards;
  opacity: 0.7;
}

.petal::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, #ffb3ba, #ffc0cb);
  border-radius: 50%;
}

.petal:nth-child(even) {
  background: linear-gradient(135deg, #baffc9, #98fb98);
}

.petal:nth-child(even)::before {
  background: linear-gradient(135deg, #baffc9, #98fb98);
}

.petal:nth-child(3n) {
  background: linear-gradient(135deg, #bae1ff, #add8e6);
}

.petal:nth-child(3n)::before {
  background: linear-gradient(135deg, #bae1ff, #add8e6);
}

/* 飘动的文字 */
.floating-text {
  position: absolute;
  font-size: 14px;
  font-family: 'SimSun', 'STSong', serif;
  color: var(--text-secondary);
  animation: text-float linear forwards;
  opacity: 0.6;
  white-space: nowrap;
}

/* 枫叶样式 */
.maple-leaf {
  position: fixed;
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  border-radius: 50% 0 50% 0;
  pointer-events: none;
  z-index: 9999;
  animation: maple-leaf-float ease-in-out forwards;
  opacity: 0.8;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.maple-leaf::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  border-radius: 50%;
}

/* 花瓣飘动动画 */
@keyframes petal-float {
  0% {
    transform: translateY(-100px) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(360deg);
    opacity: 0;
  }
}

/* 文字飘动动画 */
@keyframes text-float {
  0% {
    transform: translateY(-100px) scale(0.5);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) scale(1.2);
    opacity: 0;
  }
}

/* 枫叶飘落动画 */
@keyframes maple-leaf-float {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    opacity: 1;
  }
  25% {
    transform: translate(10px, 20px) rotate(90deg) scale(1.1);
    opacity: 0.9;
  }
  50% {
    transform: translate(20px, 40px) rotate(180deg) scale(1);
    opacity: 0.8;
  }
  75% {
    transform: translate(10px, 60px) rotate(270deg) scale(0.9);
    opacity: 0.7;
  }
  100% {
    transform: translate(0, 80px) rotate(360deg) scale(0.8);
    opacity: 0;
  }
}

/* 收藏数量徽章样式 */
.collection-badge {
  display: inline-block;
  background: var(--danger-color);
  color: white;
  font-size: 12px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 12px;
  margin-left: 6px;
  animation: badge-pulse 0.6s ease-in-out;
}

@keyframes badge-pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* 教师导航栏样式 */
.teacher-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.teacher-navbar-menu {
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 0;
  padding: 0;
  list-style: none;
  flex-wrap: nowrap;
}

.logout-btn {
  background: rgba(205, 133, 63, 0.2) !important;
  color: #8b4513 !important;
  border-color: rgba(205, 133, 63, 0.4) !important;
}

.logout-btn:hover {
  background: rgba(205, 133, 63, 0.3) !important;
  transform: translateY(-4px) !important;
}

/* 移动端菜单样式 */
.mobile-menu-toggle {
  display: none;
  cursor: pointer;
  padding: 10px;
}

.menu-icon {
  width: 30px;
  height: 24px;
  position: relative;
  cursor: pointer;
}

.menu-icon::before,
.menu-icon::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 3px;
  background: #8b4513;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.menu-icon::before {
  top: 0;
}

.menu-icon::after {
  bottom: 0;
}

.menu-icon::before {
  transform: translateY(10.5px);
}

.mobile-menu {
  position: absolute;
  top: 100%;
  right: 0;
  width: 200px;
  background: white;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  border-radius: 0 0 8px 8px;
  z-index: 1000;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mobile-menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.mobile-menu-item {
  border-bottom: 1px solid #f0f0f0;
}

.mobile-menu-item:last-child {
  border-bottom: none;
}

.mobile-menu-link {
  display: block;
  padding: 15px 20px;
  text-decoration: none;
  color: #8b4513;
  font-family: 'SimSun', 'STSong', serif;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.mobile-menu-link:hover {
  background-color: rgba(205, 133, 63, 0.1);
}

.mobile-menu-link.logout-btn {
  background: rgba(205, 133, 63, 0.2);
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.mobile-menu-link.logout-btn:hover {
  background: rgba(205, 133, 63, 0.3);
}

/* 品牌标题样式 */
.brand-title {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.main-title {
  font-size: 24px;
  font-weight: bold;
  color: #8b4513;
  margin: 0;
  font-family: 'SimSun', 'STSong', serif;
}

.sub-title {
  font-size: 12px;
  color: #8b4513;
  margin: 3px 0 0 0;
  font-family: 'SimSun', 'STSong', serif;
  line-height: 1.3;
}

/* 导航栏品牌链接样式 */
.navbar-brand {
  display: flex;
  align-items: center;
  text-decoration: none;
  padding: 10px 0;
}

/* 切换教师端按钮样式 */
.switch-teacher-btn {
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.15), rgba(205, 133, 63, 0.15)) !important;
  color: #8b4513 !important;
  border: 1px solid rgba(139, 69, 19, 0.3) !important;
  padding: 8px 16px !important;
  font-size: 14px !important;
  cursor: pointer;
  transition: all 0.3s ease !important;
  font-family: 'SimSun', 'STSong', serif;
}

.switch-teacher-btn:hover {
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.25), rgba(205, 133, 63, 0.25)) !important;
  transform: translateY(-4px) !important;
  box-shadow: 0 4px 12px rgba(139, 69, 19, 0.2) !important;
  border-color: rgba(139, 69, 19, 0.5) !important;
}

.switch-student-btn {
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.15), rgba(205, 133, 63, 0.15)) !important;
  color: #8b4513 !important;
  border: 1px solid rgba(139, 69, 19, 0.3) !important;
  padding: 8px 16px !important;
  font-size: 14px !important;
  cursor: pointer;
  transition: all 0.3s ease !important;
  font-family: 'SimSun', 'STSong', serif;
  width: 100%;
  text-align: left;
}

.switch-student-btn:hover {
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.25), rgba(205, 133, 63, 0.25)) !important;
  border-color: rgba(139, 69, 19, 0.5) !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .teacher-navbar-menu {
    display: none;
  }
  
  .mobile-menu-toggle {
    display: block;
  }
  
  .navbar-menu {
    display: none;
  }
  
  .navbar-container {
    position: relative;
  }
  
  .main-title {
    font-size: 18px;
  }
  
  .sub-title {
    font-size: 10px;
  }
}
</style>
