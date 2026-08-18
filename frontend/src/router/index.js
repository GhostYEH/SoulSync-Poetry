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
// 导入教师端视图组件
const TeacherLogin = () => import('../views/teacher/TeacherLogin.vue')
const TeacherRegister = () => import('../views/teacher/TeacherRegister.vue')
const TeacherLayout = () => import('../views/teacher/TeacherLayout.vue')
const TeacherDashboard = () => import('../views/teacher/Dashboard.vue')
const KnowledgeDiagnosisView = () => import('../views/teacher/KnowledgeDiagnosisView.vue')
const StudentDetail = () => import('../views/teacher/StudentDetail.vue')
const ClassDetail = () => import('../views/teacher/ClassDetail.vue')
const ClassManagement = () => import('../views/teacher/ClassManagement.vue')
const StudentManagement = () => import('../views/teacher/StudentManagement.vue')
const PoemManagement = () => import('../views/teacher/PoemManagement.vue')
const GameData = () => import('../views/teacher/GameData.vue')
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
    component: () => import('../views/FeiHuaLingOnline.vue'),
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
  // 教师端路由
  {
    path: '/teacher/login',
    name: 'TeacherLogin',
    component: TeacherLogin,
    meta: {
      title: '教师登录 - 古诗词学习系统'
    }
  },
  {
    path: '/teacher/register',
    name: 'TeacherRegister',
    component: TeacherRegister,
    meta: {
      title: '教师注册 - 古诗词学习系统'
    }
  },
  {
    path: '/teacher',
    component: TeacherLayout,
    meta: { requiresTeacherAuth: true },
    children: [
      {
        path: '',
        redirect: '/teacher/dashboard'
      },
      {
        path: 'dashboard',
        name: 'TeacherDashboard',
        component: TeacherDashboard,
        meta: {
          title: '教师看板 - 古诗词学习系统',
          requiresTeacherAuth: true
        }
      },
      {
        path: 'knowledge',
        name: 'TeacherKnowledgeDiagnosis',
        component: KnowledgeDiagnosisView,
        meta: {
          title: '认知诊断 - 古诗词学习系统',
          requiresTeacherAuth: true
        }
      },
      {
        path: 'student/:id/detail',
        name: 'StudentDetail',
        component: StudentDetail,
        meta: {
          title: '学生详情 - 古诗词学习系统',
          requiresTeacherAuth: true
        }
      },
      {
        path: 'class/:classId',
        name: 'ClassDetail',
        component: ClassDetail,
        meta: {
          title: '班级详情 - 古诗词学习系统',
          requiresTeacherAuth: true
        }
      },
      {
        path: 'classes',
        name: 'TeacherClasses',
        component: ClassManagement,
        meta: {
          title: '班级管理 - 古诗词学习系统',
          requiresTeacherAuth: true
        }
      },
      {
        path: 'students',
        name: 'TeacherStudents',
        component: StudentManagement,
        meta: {
          title: '学生管理 - 古诗词学习系统',
          requiresTeacherAuth: true
        }
      },
      {
        path: 'poems',
        name: 'TeacherPoems',
        component: PoemManagement,
        meta: {
          title: '诗词库管理 - 古诗词学习系统',
          requiresTeacherAuth: true
        }
      },
      {
        path: 'game-data',
        name: 'TeacherGameData',
        component: GameData,
        meta: {
          title: '对战数据 - 古诗词学习系统',
          requiresTeacherAuth: true
        }
      }
    ]
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
    // 进入详情/子页/教师端：视为前进
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

import { API_BASE_URL } from '../services/api'

async function verifyToken(token, type) {
  if (!token || isTokenExpired(token)) {
    return false
  }
  
  try {
    const endpoint = type === 'teacher' 
      ? `${API_BASE_URL}/teacher/dashboard`
      : `${API_BASE_URL}/auth/verify`
    
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    return response.ok
  } catch {
    return false
  }
}

router.beforeEach(async (to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
  
  const token = localStorage.getItem('token')
  const teacherToken = localStorage.getItem('teacherToken')
  
  if (token && teacherToken) {
    if (to.path.startsWith('/teacher/')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('userInfo')
      localStorage.removeItem('studentId')
      localStorage.removeItem('userRole')
    } else {
      localStorage.removeItem('teacherToken')
      localStorage.removeItem('teacher')
      localStorage.removeItem('teacherInfo')
    }
  }
  
  if (to.meta.requiresTeacherAuth) {
    const teacherToken = localStorage.getItem('teacherToken')
    
    if (!teacherToken) {
      localStorage.setItem('teacherRedirectPath', to.fullPath)
      next('/teacher/login')
      return
    }
    
    if (isTokenExpired(teacherToken)) {
      localStorage.removeItem('teacherToken')
      localStorage.removeItem('teacher')
      localStorage.removeItem('teacherInfo')
      localStorage.setItem('teacherRedirectPath', to.fullPath)
      next('/teacher/login')
      return
    }
    
    next()
  } 
  else if (to.meta.requiresAuth) {
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
