<template>
  <div id="app" :class="{ 'home-shell': $route.path === '/' }" @mousemove="createMapleLeaf">

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
        <router-link to="/" class="navbar-brand">
          <div class="brand-title">
            <div class="main-title">《智韵·灵犀》</div>
            <div class="sub-title">——基于大模型认知引擎与多维行为分析的智能化古诗词学习系统</div>
          </div>
        </router-link>
        
        <ul class="navbar-menu">
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
        </ul>
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
      isElectron: false,
      transitionName: 'page-forward',
      lastPath: '/',
      keepAliveIncludes: ['PoemDetail'],
      appReady: false // 全局就绪状态，防止页面一直转圈
    }
  },

  mounted() {
    // 检测是否在Electron环境中
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;

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
    clearAuthData() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('userInfo')
      localStorage.removeItem('studentId')
      localStorage.removeItem('userRole')
      localStorage.removeItem('redirectPath')
      localStorage.removeItem('authToken')
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

/* 响应式设计 */
@media (max-width: 768px) {
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

<style>
/* 首页导航的视觉层级 */
.home-shell .ios26-navbar {
  --nav-glass-bg: rgba(255, 255, 255, .88);
  --nav-glass-bg-hover: rgba(255, 255, 255, .94);
  --nav-glass-border: #dce9e5;
  --nav-glass-border-hover: #b9ddd4;
  --nav-glass-shadow: 0 10px 28px rgba(28, 89, 81, .07);
  --nav-glass-shadow-hover: 0 14px 34px rgba(28, 89, 81, .1);
  border-width: 0 0 1px;
  border-radius: 0;
  box-shadow: var(--nav-glass-shadow);
}

.home-shell .nav-liquid-border,
.home-shell .nav-liquid-shine,
.home-shell .ios26-navbar::before,
.home-shell .ios26-navbar::after { display: none; }

.home-shell .navbar-container { min-height: 68px; gap: 26px; }
.home-shell .navbar-brand {
  flex: 0 0 auto;
  padding: 7px 14px;
  border: 1px solid #dce9e5 !important;
  border-radius: 13px;
  color: #218c7c !important;
  background: #f4fbf8 !important;
  box-shadow: none !important;
  text-shadow: none !important;
  letter-spacing: 0;
}
.home-shell .navbar-brand::before,
.home-shell .navbar-brand::after { display: none; }
.home-shell .navbar-brand:hover { border-color: #a9dacf !important; background: #ecf8f3 !important; box-shadow: none !important; transform: translateY(-1px) !important; }
.home-shell .main-title { color: #218c7c !important; font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif; font-size: 17px; letter-spacing: .02em; }
.home-shell .sub-title { max-width: 300px; overflow: hidden; color: #8ba39d !important; font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif; font-size: 9px; letter-spacing: 0; text-overflow: ellipsis; white-space: nowrap; }
.home-shell .navbar-menu { gap: 5px; }
.home-shell .glass-nav-button { padding: 8px 11px; border: 1px solid transparent; border-radius: 9px; color: #718984; background: transparent; box-shadow: none; font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif; font-size: 12px; }
.home-shell .glass-nav-button:hover { border-color: #dce9e5; color: #218c7c; background: #f3faf7; box-shadow: none; transform: translateY(-1px); }
.home-shell .glass-nav-active { border-color: #c5e5dc !important; color: #218c7c !important; background: #eaf6f2 !important; box-shadow: none !important; transform: none !important; }
@media (max-width: 1100px) {
  .home-shell .navbar-menu { gap: 1px; }
  .home-shell .glass-nav-button { padding-right: 8px; padding-left: 8px; }
  .home-shell .sub-title { max-width: 220px; }
}
</style>
