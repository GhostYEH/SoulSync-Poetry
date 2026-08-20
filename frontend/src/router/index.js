import { createRouter, createWebHashHistory } from 'vue-router'

// 导入视图组件 - 使用动态导入实现懒加载
const Home = () => import('../views/Home.vue')
const PoemDetail = () => import('../views/PoemDetail.vue')
const Search = () => import('../views/Search.vue')
const Profile = () => import('../views/Profile.vue')
const LearningDashboard = () => import('../views/LearningDashboard.vue')
const Collection = () => import('../views/Collection.vue')
const FeiHuaLingSingle = () => import('../views/FeiHuaLingSingle.vue')
const Login = () => import('../views/Login.vue')
const Register = () => import('../views/Register.vue')
const PoetryParkour = () => import('../views/PoetryParkour.vue')
const PoetryCardCatch = () => import('../views/PoetryCardCatch.vue')

// 路由配置
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: '首页 - 古诗词学习系统'
    }
  },
  {
    path: '/poem/:id',
    name: 'PoemDetail',
    component: PoemDetail,
    meta: {
      title: '诗词详情 - 古诗词学习系统'
    }
  },
  {
    path: '/search',
    name: 'Search',
    component: Search,
    meta: {
      title: '搜索 - 古诗词学习系统'
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: {
      title: '个人中心 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  {
    path: '/dashboard',
    name: 'LearningDashboard',
    component: LearningDashboard,
    meta: {
      title: '学习仪表盘 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  {
    path: '/feihualing/single',
    name: 'FeiHuaLingSingle',
    component: FeiHuaLingSingle,
    meta: {
      title: '飞花令 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  {
    path: '/feihualing/online',
    name: 'FeiHuaLingOnline',
    // 旧在线入口复用统一雅集工作台，避免从深链接进入另一套旧视觉。
    component: FeiHuaLingSingle,
    meta: {
      title: '在线飞花令 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  {
    path: '/collection',
    name: 'Collection',
    component: Collection,
    meta: {
      title: '我的收藏 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: '登录 - 古诗词学习系统'
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: {
      title: '注册 - 古诗词学习系统'
    }
  },
  // 404 路由
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  },
  // 创作模块路由
  {
    path: '/creation',
    name: 'PoetryWorkbench',
    component: () => import('../views/creation/PoetryWorkbench.vue'),
    meta: {
      title: 'AI诗词创作工作台 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  {
    path: '/creation/records',
    name: 'CreationRecords',
    component: () => import('../views/creation/CreationRecords.vue'),
    meta: {
      title: '我的创作记录 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  // 闯关模块路由
  {
    path: '/challenge',
    name: 'PoemChallenge',
    component: () => import('../views/PoemChallenge.vue'),
    meta: {
      title: '诗词闯关 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  {
    path: '/challenge/battle',
    name: 'ChallengeBattle',
    component: () => import('../views/ChallengeBattle.vue'),
    meta: {
      title: '闯关对战 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  {
    path: '/challenge/rank',
    name: 'ChallengeRank',
    component: () => import('../views/ChallengeRank.vue'),
    meta: {
      title: '闯关排名 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  {
    path: '/challenge/battle-online',
    name: 'ChallengeBattleOnline',
    component: () => import('../views/ChallengeBattleOnline.vue'),
    meta: {
      title: '闯关对战邀请 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  { path: '/challenge/error-book',
    name: 'ErrorBook',
    component: () => import('../views/ErrorBook.vue'),
    meta: {
      title: '错题本 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  {
    path: '/error-book',
    redirect: '/challenge/error-book'
  },
  {
    path: '/challenge/review',
    name: 'WrongQuestionReview',
    component: () => import('../views/WrongQuestionReview.vue'),
    meta: {
      title: '错题复习 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  {
    path: '/learning-path',
    name: 'LearningPath',
    component: () => import('../views/LearningPath.vue'),
    meta: {
      title: '学习路径 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  {
    path: '/daily',
    name: 'DailyPoem',
    component: () => import('../views/DailyPoem.vue'),
    meta: {
      title: '每日一诗 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  {
    path: '/poetry-challenge',
    name: 'PoetryChallenge',
    component: () => import('../views/PoetryChallenge.vue'),
    meta: {
      title: '诗词创作挑战 - 古诗词学习系统',
      requiresAuth: true
    }
  },
  {
    path: '/parkour',
    name: 'PoetryParkour',
    component: PoetryParkour,
    meta: {
      title: '诗词跑酷 - 古诗词学习系统'
    }
  },
  {
    path: '/card-catch',
    name: 'PoetryCardCatch',
    component: PoetryCardCatch,
    meta: {
      title: '诗词大富翁 - 古诗词学习系统'
    }
  },
  {
    path: '/feihua-ranking',
    name: 'FeiHuaRanking',
    component: () => import('../views/FeiHuaRanking.vue'),
    meta: {
      title: '飞花令排位 - 古诗词学习系统',
      requiresAuth: true
    }
  },

  {
    path: '/voice-recitation',
    name: 'VoiceRecitation',
    component: () => import('../views/VoiceRecitation.vue'),
    meta: {
      title: '语音背诵 - 古诗词学习系统',
      requiresAuth: true
    }
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return { ...savedPosition, behavior: 'instant' }
    } else {
      return { top: 0, behavior: 'instant' }
    }
  }
})

// 主导航栏顺序，用于判定页面切换方向（替代路径深度，解决同级切换方向恒 forward 的问题）
const navOrder = [
  '/',
  '/search',
  '/dashboard',
  '/feihualing/single',
  '/challenge',
  '/creation',
  '/challenge/error-book',
  '/profile'
]

// 导航守卫：自动判断页面切换方向并通知 App.vue
router.beforeEach((to, from, next) => {
  const toIdx = navOrder.indexOf(to.path)
  const fromIdx = navOrder.indexOf(from.path)
  let direction
  if (toIdx !== -1 && fromIdx !== -1) {
    // 两个都是主导航项：按导航栏顺序判定
    direction = toIdx >= fromIdx ? 'forward' : 'back'
  } else if (toIdx !== -1) {
    // 从详情/子页回到主导航：视为后退
    direction = 'back'
  } else {
    // 进入详情或子页：视为前进
    direction = 'forward'
  }
  // 通过自定义事件通知 App.vue 更新过渡名称
  window.dispatchEvent(new CustomEvent('page-transition', { detail: { direction } }))

  // 预加载个人中心背景图，避免进入页面时背景闪烁
  if (to.path === '/profile' && !window.__profileBgPreloaded) {
    window.__profileBgPreloaded = true
    const bgList = ['./profile-bg/1.jpg', './profile-bg/2.jpg', './profile-bg/3.jpg', './profile-bg/4.jpg']
    bgList.forEach(src => {
      const img = new Image()
      img.src = src
    })
  }

  next()
})

function isTokenExpired(token) {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!payload.exp) return false
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

router.beforeEach(async (to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
  
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token')
    
    if (!token) {
      localStorage.setItem('redirectPath', to.fullPath)
      next('/login')
      return
    }
    
    if (isTokenExpired(token)) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('userInfo')
      localStorage.setItem('redirectPath', to.fullPath)
      next('/login')
      return
    }
    
    next()
  } else {
    next()
  }
})

export default router
