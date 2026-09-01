<template>
  <div
    id="app"
    ref="appShell"
    :class="{
    'home-shell': $route.path === '/',
      'challenge-shell': $route.path === '/challenge' || $route.path.startsWith('/challenge/level/'),
      'poem-shell': $route.path.startsWith('/poem/')
    }"
  >

    <!-- Shared optical map used by automatically enhanced Vue surfaces. -->
    <svg class="liquid-glass-filter-bank" aria-hidden="true" focusable="false">
      <defs>
        <filter id="liquid-glass-global-refraction" x="-18%" y="-18%" width="136%" height="136%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.009 0.024" numOctaves="2" seed="11" result="liquidNoise" />
          <feGaussianBlur in="liquidNoise" stdDeviation="1.1" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="24" xChannelSelector="R" yChannelSelector="B" />
        </filter>
      </defs>
    </svg>

    <!-- 自定义标题栏 (Electron环境) -->
    <TitleBar v-if="isElectron" />

    <!-- 演示模式组件 -->
    <DemoMode ref="demoMode" />

    <!-- 全局非阻塞消息与确认框，避免原生弹窗抢占浏览器焦点 -->
    <AppFeedback />

    <!-- 全局实时邀请：不依赖当前所在页面，登录后始终保持连接 -->
    <GlobalInvitationCenter />

    <!-- 动态元素容器 -->
    <div class="dynamic-elements" ref="dynamicElements"></div>

    <!-- 导航栏 -->
    <LiquidGlass
      as="nav"
      class="navbar ios26-navbar"
      :corner-radius="0"
      padding="0"
      :displacement-scale="34"
      :aberration-intensity="1.9"
      :elasticity="0.04"
      @pointerover="prefetchNavigation"
      @focusin="prefetchNavigation"
    >
      <div class="nav-liquid-border"></div>
      <div class="nav-liquid-shine"></div>
      <div class="container navbar-container">
        <!-- 品牌 logo/标题 -->
        <router-link to="/" class="navbar-brand">
          <Leaf class="brand-mark" :size="42" weight="duotone" />
          <div class="brand-title">
            <div class="main-title">《智韵·灵犀》</div>
            <div class="sub-title">——基于大模型认知引擎与多维行为分析的智能化古诗词学习系统</div>
          </div>
        </router-link>
        
        <ul class="navbar-menu">
          <li class="navbar-item">
            <router-link to="/" class="glass-nav-button" active-class="glass-nav-active"><House class="nav-icon" :size="21" />首页</router-link>
          </li>
          <li class="navbar-item">
            <router-link to="/search" class="glass-nav-button" active-class="glass-nav-active"><MagnifyingGlass class="nav-icon" :size="21" />诗库</router-link>
          </li>
          <li class="navbar-item">
            <router-link to="/dashboard" class="glass-nav-button" active-class="glass-nav-active"><Books class="nav-icon" :size="21" />学习仪表盘</router-link>
          </li>
          <li class="navbar-item">
            <router-link to="/feihualing/single" class="glass-nav-button" active-class="glass-nav-active"><FlagBanner class="nav-icon" :size="21" />飞花令</router-link>
          </li>
          <li class="navbar-item">
            <router-link to="/challenge" class="glass-nav-button" active-class="glass-nav-active"><CirclesThreePlus class="nav-icon" :size="21" />诗词闯关</router-link>
          </li>
          <li class="navbar-item">
            <router-link to="/creation" class="glass-nav-button" active-class="glass-nav-active"><PenNib class="nav-icon" :size="21" />诗词创作</router-link>
          </li>
          <li class="navbar-item">
            <router-link to="/error-book" class="glass-nav-button" active-class="glass-nav-active"><Notebook class="nav-icon" :size="21" />错题本</router-link>
          </li>
          <li class="navbar-item">
            <router-link to="/profile" class="glass-nav-button" active-class="glass-nav-active"><UserCircle class="nav-icon" :size="21" />个人中心</router-link>
          </li>
        </ul>
      </div>
    </LiquidGlass>

    <!-- 主内容区 -->
    <main class="container route-stage">
      <router-view v-slot="{ Component }">
        <transition
          :css="false"
          @enter="enterRoute"
          @leave="leaveRoute"
          @enter-cancelled="cancelRouteTransition"
          @leave-cancelled="cancelRouteTransition"
        >
          <keep-alive :include="keepAliveIncludes">
            <component :is="Component" class="route-view" />
          </keep-alive>
        </transition>
      </router-view>
    </main>

    <!-- 页脚 -->
    <footer v-if="$route.path !== '/challenge' && !$route.path.startsWith('/challenge/level/')" class="footer">
      <div class="container footer-container">
        <p class="footer-text">© 2026 《智韵·灵犀》——基于大模型认知引擎与多维行为分析的智能化古诗词学习系统</p>
        <p class="footer-text">基于 AI 技术的智能学习平台</p>
      </div>
    </footer>
  </div>
</template>

<script>
import TitleBar from './components/TitleBar.vue'
import AppFeedback from './components/AppFeedback.vue'
import GlobalInvitationCenter from './components/GlobalInvitationCenter.vue'
import DemoMode from './views/DemoMode.vue'
import { prefetchRoute } from './router'
import { gsap } from './utils/gsapMotion'
import { PhBooks as Books, PhCirclesThreePlus as CirclesThreePlus, PhFlagBanner as FlagBanner, PhHouse as House, PhLeaf as Leaf, PhMagnifyingGlass as MagnifyingGlass, PhNotebook as Notebook, PhPenNib as PenNib, PhUserCircle as UserCircle } from '@phosphor-icons/vue'

const POEM_WORDS = Object.freeze([
  '春', '夏', '秋', '冬', '风', '花', '雪', '月', '山', '水', '云', '霞', '诗', '词', '歌', '赋',
  '人', '生', '梦', '想', '情', '意', '心', '境', '远', '近', '高', '低', '东', '西', '南', '北',
  '天', '地', '日', '月', '星', '辰'
])

function getRouteTransitionOffset(transitionName, isEntering) {
  if (transitionName === 'page-back') return isEntering ? -14 : 9
  return isEntering ? 18 : -9
}

export default {
  name: 'App',
  components: {
    AppFeedback,
    GlobalInvitationCenter,
    TitleBar,
    DemoMode,
    Books,
    CirclesThreePlus,
    FlagBanner,
    House,
    Leaf,
    MagnifyingGlass,
    Notebook,
    PenNib,
    UserCircle
  },
  data() {
    return {
      collectionCount: 0,
      isElectron: false,
      transitionName: 'page-forward',
      lastPath: '/',
      // 首页保活后，返回时异步内容高度和横向滚动状态都不会重新初始化；
      // 页面纵向位置由 router 的 scrollBehavior 精确恢复。
      keepAliveIncludes: ['Home', 'PoemDetail'],
      appReady: false // 全局就绪状态，防止页面一直转圈
    }
  },

  mounted() {
    // 这些集合不参与视图渲染，不放进响应式 data，避免装饰元素增删时触发
    // 无意义的组件更新。
    this.dynamicElementNodes = new Set()
    this.dynamicElementAnimations = new Map()
    this.activeRouteAnimations = new Map()
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || window.matchMedia('(update: slow)').matches
    this.hoverPointerStates = new Map()
    // 检测是否在Electron环境中
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;

    // 检测URL参数，启动演示模式
    const params = new URLSearchParams(window.location.search)
    if (params.get('demo') === 'true' && this.$refs.demoMode) {
      this.$refs.demoMode.startDemo()
    }

    // 监听页面切换方向事件
    this.pageTransitionHandler = this.handlePageTransition.bind(this)
    window.addEventListener('page-transition', this.pageTransitionHandler)

    this.visibilityHandler = this.handleVisibilityChange.bind(this)
    document.addEventListener('visibilitychange', this.visibilityHandler)
    this.handleVisibilityChange()

    // 初始化收藏数量
    this.updateCollectionCount()

    // Pointer Events 同时覆盖鼠标、触控笔和触摸，避免 touchstart 后再触发 click
    // 造成双重涟漪与重复 DOM 写入。
    this.clickHandler = this.createRipple.bind(this)
    document.addEventListener('pointerdown', this.clickHandler, { passive: true })

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
    this.setupAppMotion()

    // 确保页面一定能正常显示（防止后端无响应导致无限loading）
    setTimeout(() => {
      this.appReady = true;
    }, 2000);
  },
  beforeUnmount() {
    document.removeEventListener('visibilitychange', this.visibilityHandler)
    this.stopCreatingDynamicElements()

    // 移除事件监听器
    if (this.clickHandler) {
      document.removeEventListener('pointerdown', this.clickHandler)
    }

    window.removeEventListener('page-transition', this.pageTransitionHandler)

    // 移除本地存储监听器
    window.removeEventListener('storage', this.handleStorageChange)

    // 移除Electron导航监听器
    if (this.isElectron) {
      window.electronAPI.removeNavigateListener();
    }

    // 清理导航栏鼠标跟踪效果
    this.cleanupNavbarHoverEffects();
    this.appMotion?.revert()
    this.activeRouteAnimations?.forEach((animation) => animation.kill())
    this.activeRouteAnimations?.clear()
  },
  methods: {
    setupAppMotion() {
      if (this.prefersReducedMotion || !this.$refs.appShell) return
      this.appMotion = gsap.context(() => {
        const nav = gsap.timeline({ defaults: { ease: 'power3.out' } })
        nav
          .from('.navbar-brand', { x: -18, autoAlpha: 0, duration: 0.58 })
          .from('.navbar-item', { y: -10, autoAlpha: 0, duration: 0.34, stagger: 0.045 }, '-=0.32')
      }, this.$refs.appShell)
    },
    enterRoute(element, done) {
      if (this.prefersReducedMotion) return done()
      this.cancelRouteTransition(element)
      const animation = gsap.fromTo(element,
        { autoAlpha: 0, y: getRouteTransitionOffset(this.transitionName, true), scale: 0.992 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.28,
          ease: 'power3.out',
          clearProps: 'visibility',
          overwrite: 'auto',
          onComplete: () => {
            this.activeRouteAnimations.delete(element)
            done()
          }
        }
      )
      this.activeRouteAnimations.set(element, animation)
    },
    leaveRoute(element, done) {
      if (this.prefersReducedMotion) return done()
      this.cancelRouteTransition(element)
      element.classList.add('route-view--leaving')
      const animation = gsap.to(element, {
        autoAlpha: 0,
        y: getRouteTransitionOffset(this.transitionName, false),
        scale: 0.996,
        duration: 0.16,
        ease: 'power2.in',
        overwrite: 'auto',
        onComplete: () => {
          element.classList.remove('route-view--leaving')
          this.activeRouteAnimations.delete(element)
          done()
        }
      })
      this.activeRouteAnimations.set(element, animation)
    },
    cancelRouteTransition(element) {
      this.activeRouteAnimations?.get(element)?.kill()
      this.activeRouteAnimations?.delete(element)
      element.classList.remove('route-view--leaving')
    },
    handlePageTransition(e) {
      this.transitionName = `page-${e.detail.direction}`
    },
    prefetchNavigation(event) {
      const link = event.target.closest?.('a[href]')
      if (!link || !event.currentTarget.contains(link)) return

      const path = link.hash?.replace(/^#/, '')
      if (path?.startsWith('/')) prefetchRoute(path).catch(() => {})
    },
    // 导航栏鼠标跟踪效果：同一帧只读取一次布局，避免高刷新率鼠标造成连续回流。
    handleNavbarMouseMove(e) {
      this.queuePointerGradient(e.currentTarget, e.clientX, e.clientY, '--mouse-x', '--mouse-y')
    },
    // 导航按钮鼠标跟踪效果
    handleBtnMouseMove(e) {
      this.queuePointerGradient(e.currentTarget, e.clientX, e.clientY, '--btn-mouse-x', '--btn-mouse-y')
    },
    queuePointerGradient(element, clientX, clientY, xVariable, yVariable) {
      const state = this.hoverPointerStates.get(element) || {}
      state.clientX = clientX
      state.clientY = clientY
      state.xVariable = xVariable
      state.yVariable = yVariable

      if (!state.frameId) {
        state.frameId = window.requestAnimationFrame(() => {
          // Geometry is stable for the duration of a hover. Reusing it avoids a
          // synchronous layout read on every frame on high-refresh displays.
          const rect = state.rect || element.getBoundingClientRect()
          state.rect = rect
          element.style.setProperty(state.xVariable, `${((state.clientX - rect.left) / rect.width) * 100}%`)
          element.style.setProperty(state.yVariable, `${((state.clientY - rect.top) / rect.height) * 100}%`)
          state.frameId = null
        })
      }

      this.hoverPointerStates.set(element, state)
    },
    cachePointerTargetRect(e) {
      const state = this.hoverPointerStates.get(e.currentTarget) || {}
      state.rect = e.currentTarget.getBoundingClientRect()
      this.hoverPointerStates.set(e.currentTarget, state)
    },
    releasePointerTargetRect(e) {
      const state = this.hoverPointerStates.get(e.currentTarget)
      if (!state) return
      if (state.frameId) window.cancelAnimationFrame(state.frameId)
      this.hoverPointerStates.delete(e.currentTarget)
    },
    setupNavbarHoverEffects() {
      const navbar = document.querySelector('.ios26-navbar');
      if (navbar) {
        navbar.addEventListener('mousemove', this.handleNavbarMouseMove);
        navbar.addEventListener('mouseenter', this.cachePointerTargetRect);
        navbar.addEventListener('mouseleave', this.releasePointerTargetRect);
      }
      const navButtons = document.querySelectorAll('.glass-nav-button');
      navButtons.forEach(btn => {
        btn.addEventListener('mousemove', this.handleBtnMouseMove);
        btn.addEventListener('mouseenter', this.cachePointerTargetRect);
        btn.addEventListener('mouseleave', this.releasePointerTargetRect);
      });
    },
    cleanupNavbarHoverEffects() {
      const navbar = document.querySelector('.ios26-navbar');
      if (navbar) {
        navbar.removeEventListener('mousemove', this.handleNavbarMouseMove);
        navbar.removeEventListener('mouseenter', this.cachePointerTargetRect);
        navbar.removeEventListener('mouseleave', this.releasePointerTargetRect);
      }
      const navButtons = document.querySelectorAll('.glass-nav-button');
      navButtons.forEach(btn => {
        btn.removeEventListener('mousemove', this.handleBtnMouseMove);
        btn.removeEventListener('mouseenter', this.cachePointerTargetRect);
        btn.removeEventListener('mouseleave', this.releasePointerTargetRect);
      });
      this.hoverPointerStates?.forEach((state) => {
        if (state.frameId) window.cancelAnimationFrame(state.frameId)
      })
      this.hoverPointerStates?.clear()
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
      if (document.hidden || this.prefersReducedMotion) return
      // 定时创建新的动态元素
      if (!this.petalInterval) {
        this.petalInterval = setInterval(() => {
          this.createPetal()
        }, 5000)
      }
      
      if (!this.textInterval) {
        this.textInterval = setInterval(() => {
          this.createFloatingText()
        }, 8000)
      }
    },
    pauseCreatingDynamicElements() {
      if (this.petalInterval) clearInterval(this.petalInterval)
      if (this.textInterval) clearInterval(this.textInterval)
      this.petalInterval = null
      this.textInterval = null
    },
    handleVisibilityChange() {
      if (document.hidden || this.prefersReducedMotion) {
        this.pauseCreatingDynamicElements()
        return
      }
      if (!this.dynamicElementNodes?.size) this.createDynamicElements()
      this.startCreatingDynamicElements()
    },
    stopCreatingDynamicElements() {
      this.pauseCreatingDynamicElements()
      this.dynamicElementAnimations?.forEach((animation) => animation.kill())
      this.dynamicElementAnimations?.clear()
      // 清除所有动态元素
      this.dynamicElementNodes?.forEach(element => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element)
        }
      })
      this.dynamicElementNodes?.clear()
    },
    addDynamicElement(element) {
      if (!this.$refs.dynamicElements) return
      this.$refs.dynamicElements.appendChild(element)
      this.dynamicElementNodes.add(element)
    },
    removeDynamicElement(element) {
      this.dynamicElementAnimations?.get(element)?.kill()
      this.dynamicElementAnimations?.delete(element)
      if (element.parentNode) element.parentNode.removeChild(element)
      this.dynamicElementNodes?.delete(element)
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
      petal.style.width = `${size}px`
      petal.style.height = `${size}px`
      
      // 添加到容器
      if (this.$refs.dynamicElements) {
        this.addDynamicElement(petal)
        const animation = gsap.timeline({ delay, onComplete: () => this.removeDynamicElement(petal) })
          .fromTo(petal, { y: -80, x: 0, rotation: -20, autoAlpha: 0 }, { autoAlpha: 0.72, duration: duration * 0.1, ease: 'power1.out' })
          .to(petal, { y: window.innerHeight + 110, x: () => (Math.random() - 0.5) * 180, rotation: 280 + Math.random() * 160, autoAlpha: 0, duration: duration * 0.9, ease: 'none' })
        this.dynamicElementAnimations.set(petal, animation)
      }
    },
    createFloatingText() {
      const text = document.createElement('div')
      text.className = 'floating-text'
      
      // 随机文字
      const randomWord = POEM_WORDS[Math.floor(Math.random() * POEM_WORDS.length)]
      text.textContent = randomWord
      
      // 随机位置和动画时间
      const left = Math.random() * 100
      const duration = 15 + Math.random() * 25
      const delay = Math.random() * 5
      const fontSize = 12 + Math.random() * 6
      
      text.style.left = `${left}%`
      text.style.fontSize = `${fontSize}px`
      
      // 添加到容器
      if (this.$refs.dynamicElements) {
        this.addDynamicElement(text)
        const animation = gsap.timeline({ delay, onComplete: () => this.removeDynamicElement(text) })
          .fromTo(text, { y: -70, x: 0, scale: 0.7, autoAlpha: 0 }, { autoAlpha: 0.5, duration: duration * 0.11, ease: 'power1.out' })
          .to(text, { y: window.innerHeight + 90, x: () => (Math.random() - 0.5) * 90, scale: 1.12, autoAlpha: 0, duration: duration * 0.89, ease: 'none' })
        this.dynamicElementAnimations.set(text, animation)
      }
    },
    createRipple(event) {
      if (this.prefersReducedMotion || event.isPrimary === false || event.button > 0) return

      // 只为真正可交互的控件反馈，避免在页面任意位置点击都创建装饰节点。
      const control = event.target.closest?.('button, a[href], [role="button"], input, textarea, select')
      if (!control || control.matches(':disabled, [aria-disabled="true"]')) return

      const { clientX, clientY } = event
      
      // 创建涟漪元素
      const ripple = document.createElement('div')
      ripple.className = 'ripple'
      
      // 设置涟漪位置为点击坐标
      ripple.style.left = `${clientX}px`
      ripple.style.top = `${clientY}px`
      
      // 添加到容器
      if (this.$refs.dynamicElements) {
        this.addDynamicElement(ripple)
        const animation = gsap.fromTo(ripple,
          { xPercent: -50, yPercent: -50, scale: 0, autoAlpha: 0.72 },
          { scale: 9, autoAlpha: 0, duration: 0.56, ease: 'power2.out', onComplete: () => this.removeDynamicElement(ripple) }
        )
        this.dynamicElementAnimations.set(ripple, animation)
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
  animation: none !important;
  will-change: opacity, transform;
  transition: opacity var(--motion-base, 220ms) var(--motion-ease-out, cubic-bezier(0.22, 1, 0.36, 1)),
              transform var(--motion-base, 220ms) var(--motion-ease-out, cubic-bezier(0.22, 1, 0.36, 1));
}

/* Keep the incoming route in normal flow while the old screen fades above it.
 * This removes the blank out-in gap without letting two page layouts stack. */
.route-stage {
  position: relative;
  isolation: isolate;
}

.route-view--leaving {
  position: absolute !important;
  inset: 0;
  width: 100%;
  pointer-events: none;
  will-change: transform, opacity;
}
.page-forward-enter-from {
  opacity: 0;
  transform: translate3d(0, 10px, 0) scale(0.995);
}
.page-forward-leave-to {
  opacity: 0;
  transform: translate3d(0, -6px, 0) scale(0.998);
}
.page-forward-enter-to,
.page-forward-leave-from {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
}

/* 后退：旧页向上滑出，新页从下方滑入 */
.page-back-enter-active,
.page-back-leave-active {
  animation: none !important;
  will-change: opacity, transform;
  transition: opacity var(--motion-base, 200ms) var(--motion-ease-out, cubic-bezier(0.22, 1, 0.36, 1)),
              transform var(--motion-base, 200ms) var(--motion-ease-out, cubic-bezier(0.22, 1, 0.36, 1));
}
.page-back-enter-from {
  opacity: 0;
  transform: translate3d(0, -8px, 0) scale(0.997);
}
.page-back-leave-to {
  opacity: 0;
  transform: translate3d(0, 6px, 0) scale(0.998);
}
.page-back-enter-to,
.page-back-leave-from {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
}

.page-forward-enter-active,
.page-back-enter-active {
  transform-origin: 50% 12%;
}

@media (prefers-reduced-motion: reduce) {
  .page-forward-enter-active,
  .page-forward-leave-active,
  .page-back-enter-active,
  .page-back-leave-active {
    transition-duration: 0.01ms !important;
  }
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
  contain: layout style paint;
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
  will-change: transform, opacity;
  pointer-events: none;
  z-index: 9999;
}

/* 飘动的花瓣 */
.petal {
  position: absolute;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #ffb3ba, #ffc0cb);
  border-radius: 10px 0 10px 0;
  opacity: 0.7;
  will-change: transform, opacity;
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
  opacity: 0.6;
  white-space: nowrap;
  will-change: transform, opacity;
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
