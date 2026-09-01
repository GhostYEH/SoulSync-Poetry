// API服务层，统一处理API请求和认证

// 同步获取 API 基础 URL（用于不需要等待的场景）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Socket 连接 URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

// 公共 fetch 辅助函数（用于不需要认证的请求）
const publicFetch = async (url) => {
  return request(url, { includeAuth: false });
};

// 获取token
export const getToken = () => {
  return localStorage.getItem('token');
};

// 构建请求头
const getHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

let isRedirecting = false;

// Timeout分级配置
export const TIMEOUTS = {
  SHORT: 15000,
  MEDIUM: 75000,
  LONG: 120000
};

// 通用请求方法
export const request = async (url, options = {}) => {
  const timeout = options.timeout || TIMEOUTS.SHORT;
  const skipAuthRedirect = options.skipAuthRedirect || false;
  
  try {
    const baseUrl = API_BASE_URL;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers: {
        ...getHeaders(options.includeAuth !== false),
        ...options.headers
      },
      signal: controller.signal
    });
    
    clearTimeout(timer);

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      // 处理认证错误
      if (response.status === 401 && !skipAuthRedirect) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!isRedirecting && window.location.pathname !== '/login') {
          isRedirecting = true;
          window.location.href = '/login';
        }
        throw new Error('认证令牌已过期，请重新登录');
      }
      
      const err = new Error(data.message || data.error || '请求失败');
      if (data.code) err.code = data.code;
      err.status = response.status;
      throw err;
    }
    
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`请求超时: ${url}`);
    }
    console.error('API请求失败:', error);
    throw error;
  }
};

// 读取后端 SSE 文本流，onToken 会在每个增量片段到达时触发。
export const streamAI = async (payload, { onToken, onDone, timeout = TIMEOUTS.LONG } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let fullText = '';
  let pendingToken = '';
  let tokenFrame = null;

  // SSE 可能一秒推送数十个碎片。合并到浏览器帧后再更新 Vue，
  // 文本仍然逐步出现，但不会为每个字都触发整页响应式渲染。
  const flushToken = () => {
    if (tokenFrame !== null) cancelAnimationFrame(tokenFrame);
    tokenFrame = null;
    if (!pendingToken) return;
    const token = pendingToken;
    pendingToken = '';
    onToken?.(token, fullText);
  };
  const scheduleToken = (content) => {
    pendingToken += content;
    if (tokenFrame === null) tokenFrame = requestAnimationFrame(flushToken);
  };

  try {
    const response = await fetch(`${API_BASE_URL}/ai/stream`, {
      method: 'POST',
      headers: getHeaders(true, false),
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || data.error || 'AI流式请求失败');
    }
    if (!response.body) throw new Error('浏览器不支持流式响应');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    const consume = (line) => {
      if (!line.startsWith('data:')) return;
      const raw = line.slice(5).trim();
      if (!raw) return;
      const event = JSON.parse(raw);
      if (event.type === 'token' && event.content) {
        fullText += event.content;
        scheduleToken(event.content);
      } else if (event.type === 'error') {
        throw new Error(event.message || 'AI流式请求失败');
      } else if (event.type === 'done') {
        flushToken();
        onDone?.(fullText);
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      lines.forEach(consume);
      if (done) break;
    }
    if (buffer.trim()) consume(buffer.trim());
    flushToken();
    return fullText;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('AI流式请求超时');
    throw error;
  } finally {
    if (tokenFrame !== null) cancelAnimationFrame(tokenFrame);
    clearTimeout(timer);
  }
};

// API方法
export const api = {
  // 认证相关
  auth: {
    login: (credentials) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      includeAuth: false,
      skipAuthRedirect: true
    }),
    register: (userData) => request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      includeAuth: false,
      skipAuthRedirect: true
    }),
    verify: () => request('/auth/verify')
  },
  
  // 诗词相关
  poems: {
    getAll: () => request('/poems'),
    getById: (id) => request(`/poems/${id}`)
  },
  
  // 学习记录相关
  learn: {
    record: (data) => request('/learn/record', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    stats: () => request('/learn/stats'),
    getRecord: (poemId) => request(`/learn/record/${poemId}`),
    dashboard: () => request('/learn/dashboard'),
    aiSuggestions: () =>
      request('/learn/ai-suggestions', {
        method: 'POST',
        body: JSON.stringify({}),
        timeout: 90000
      })
  },
  
  // 错题相关
  mistakes: {
    getAll: () => request('/mistakes'),
    delete: (id) => request(`/mistakes/${id}`, {
      method: 'DELETE'
    })
  },
  
  // 收藏相关
  collections: {
    add: (poemId) => request('/collections', {
      method: 'POST',
      body: JSON.stringify({ poem_id: poemId })
    }),
    remove: (poemId) => request(`/collections/${poemId}`, {
      method: 'DELETE'
    }),
    getAll: () => request('/collections'),
    check: (poemId) => request(`/collections/check/${poemId}`)
  },
  
  // 推荐相关
  recommend: {
    getRecommended: () => request('/recommend')
  },
  
  // AI相关
  ai: {
    stream: (payload, options) => streamAI(payload, options),
    explain: (data) => request('/ai/explain', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    reciteCheck: (data) => request('/ai/recite-check', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    personalizedTutor: (data) => request('/ai/personalized-tutor', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    tts: async (text) => {
      const baseUrl = API_BASE_URL;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUTS.MEDIUM);
      
      try {
        const response = await fetch(`${baseUrl}/ai/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text }),
          signal: controller.signal
        });
        
        clearTimeout(timer);
        
        if (!response.ok) {
          throw new Error('语音合成失败');
        }
        
        return response.blob();
      } catch (error) {
        clearTimeout(timer);
        if (error.name === 'AbortError') {
          throw new Error('语音合成超时');
        }
        throw error;
      }
    }
  },
  
  // 闯关相关
  challenge: {
    getProgress: () => request('/challenge/progress'),
    getLevelProgress: (level) => request(`/challenge/progress/${level}`),
    updateProgress: (level) => request('/challenge/progress/update', {
      method: 'POST',
      body: JSON.stringify({ level })
    }),
    generateQuestions: (startLevel, count = 20) => request('/challenge/questions/generate', {
      method: 'POST',
      body: JSON.stringify({ startLevel, count })
    }),
    submitAnswer: (data) => request('/challenge/answer/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    addToErrorBook: (data) => request('/challenge/error-book/add', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getErrorBook: () => request('/challenge/error-book'),
    reviewErrorBook: (id, userAnswer) => request(`/challenge/error-book/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ userAnswer })
    }),
    markErrorBookReviewed: (id) => request(`/challenge/error-book/${id}/master`, {
      method: 'POST'
    }),
    removeFromErrorBook: (id) => request(`/challenge/error-book/${id}`, {
      method: 'DELETE'
    }),
    getLeaderboard: () => request('/challenge/leaderboard', { includeAuth: false })
  },

  // 错题复习相关
  wrongQuestions: {
    getStats: () => request('/wrong-questions/stats'),
    getQuestions: (limit = 20) => request(`/wrong-questions/questions?limit=${limit}`),
    add: (data) => request('/wrong-questions/add', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    submitAnswer: (questionId, userAnswer) => request('/wrong-questions/answer', {
      method: 'POST',
      body: JSON.stringify({ questionId, userAnswer })
    }),
    markAsMastered: (id) => request(`/wrong-questions/master/${id}`, {
      method: 'POST'
    }),
    delete: (id) => request(`/wrong-questions/${id}`, {
      method: 'DELETE'
    }),
    // 后端可能调用硅基流动生成提示，默认 10s 易超时导致前端误用简陋兜底文案
    getHints: (data) => request('/wrong-questions/hints', {
      method: 'POST',
      body: JSON.stringify(data),
      timeout: 55000
    })
  },

  // 学习路径相关
  learning: {
    getPath: () => request('/learning/path'),
    regeneratePath: () => request('/learning/regenerate', { method: 'POST' }),
    getAbility: () => request('/learning/ability'),
    refreshAbility: () => request('/learning/ability/refresh', { method: 'POST' }),
    getAssessment: () => request('/learning/assessment')
  },

  // 每日打卡相关
  daily: {
    getDailyPoem: () => request('/daily/daily-poem'),
    getDailyPoemPublic: () => publicFetch('/daily/daily-poem/public'),
    checkin: (poemId) => request('/daily/checkin', {
      method: 'POST',
      body: JSON.stringify({ poemId })
    }),
    getCheckinStatus: () => request('/daily/checkin/status'),
    getCheckinStats: () => request('/daily/checkin/stats'),
    getActivity: (days = 30) => request(`/daily/activity?days=${days}`)
  },

  // 复习计划相关
  review: {
    getTodayTasks: () => request('/review/today'),
    getStats: () => request('/review/stats'),
    getPlan: (days = 7) => request(`/review/plan?days=${days}`),
    complete: (poemId, correct) => request('/review/complete', {
      method: 'POST',
      body: JSON.stringify({ poemId, correct })
    }),
    categorize: (questionId, category) => request('/review/categorize', {
      method: 'POST',
      body: JSON.stringify({ questionId, category })
    }),
    getCategories: () => request('/review/categories')
  },

  // 飞花令排位相关
  feihuaRanking: {
    getMe: () => request('/feihua-ranking/me'),
    getLeaderboard: (limit = 50, page = 1) => publicFetch(`/feihua-ranking/leaderboard?limit=${limit}&page=${page}`),
    getStats: () => publicFetch('/feihua-ranking/stats'),
    getLevels: () => publicFetch('/feihua-ranking/levels'),
    getUserRank: (userId) => request(`/feihua-ranking/user/${userId}`)
  },

  // 飞花令游戏保存（幂等：gameSessionId 保证 retry 不重复）
  feihua: {
    hint: (data) => request('/feihua/hint', {
      method: 'POST',
      body: JSON.stringify(data),
      timeout: 90000
    }),
    save: (data) => request('/feihua/save', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getGames: () => request('/feihua/games'),
    getHighScore: () => request('/feihua/high-score')
  },

  // 诗词创作挑战相关
  poetryChallenge: {
    getThemes: () => publicFetch('/poetry-challenge/themes'),
    generate: (theme, keyword) => request('/poetry-challenge/generate', {
      method: 'POST',
      body: JSON.stringify({ theme, keyword })
    }),
    rate: (challengeId, score) => request('/poetry-challenge/rate', {
      method: 'POST',
      body: JSON.stringify({ challengeId, score })
    }),
    getHistory: (limit = 20) => request(`/poetry-challenge/history?limit=${limit}`),
    getStats: () => request('/poetry-challenge/stats')
  },

  // 诗词创作工作台相关
  creationWorkbench: {
    // 灵感生成 - 生成关键词 (AI生成需要约60秒)
    generateInspiration: (theme, genre) => request('/creation/inspiration/generate', {
      method: 'POST',
      body: JSON.stringify({ theme, genre }),
      timeout: 120000
    }),
    // 结构引导 - 获取写作结构提示 (AI生成需要约60秒)
    getStructureGuide: (params) => request('/creation/structure/guide', {
      method: 'POST',
      body: JSON.stringify(params),
      timeout: 120000
    }),
    // AI生成完整诗词 (AI生成需要约60秒)
    generatePoem: (params) => request('/creation/generate', {
      method: 'POST',
      body: JSON.stringify(params),
      timeout: 120000
    }),
    // AI续写推荐 (AI生成需要约60秒)
    recommendNextLine: (params) => request('/creation/recommend/next-line', {
      method: 'POST',
      body: JSON.stringify(params),
      timeout: 120000
    }),
    // 实时续写提示
    getRealtimeTips: (partialLine, genre) => request('/creation/realtime/tips', {
      method: 'POST',
      body: JSON.stringify({ partialLine, genre }),
      timeout: 60000
    }),
    // 接龙创作 - 开始 (AI生成需要约60秒)
    startChainPoem: (genre, theme) => request('/creation/chain/start', {
      method: 'POST',
      body: JSON.stringify({ genre, theme }),
      timeout: 120000
    }),
    // 接龙创作 - 下一句 (AI生成需要约60秒)
    getChainNextLine: (params) => request('/creation/chain/next', {
      method: 'POST',
      body: JSON.stringify(params),
      timeout: 120000
    }),
    // 飞花令 - 获取关键字
    getFeihuaKeyword: (difficulty) => request('/creation/feihua/keyword', {
      method: 'POST',
      body: JSON.stringify({ difficulty }),
      timeout: 60000
    }),
    // 飞花令评分 (AI生成需要约60秒)
    scoreFeihuaPoem: (params) => request('/creation/feihua/score', {
      method: 'POST',
      body: JSON.stringify(params),
      timeout: 120000
    }),
    // 核心评分接口 (AI生成需要约60秒)
    scorePoem: (params) => request('/creation/assist/score', {
      method: 'POST',
      body: JSON.stringify(params),
      timeout: 120000
    }),
    // 保存作品
    saveWork: (workData) => request('/creation/works/save', {
      method: 'POST',
      body: JSON.stringify(workData)
    }),
    // 创作成长统计（学习仪表盘）
    getStats: () => request('/creation/stats'),
    // 生成意境图
    generateImage: (params) => request('/creation/assist/generate-image', {
      method: 'POST',
      body: JSON.stringify(params),
      timeout: 90000
    }),
    // AI润色诗词 (AI生成需要约60秒)
    polishPoem: (params) => request('/creation/polish', {
      method: 'POST',
      body: JSON.stringify(params),
      timeout: 120000
    })
  },

  // 首页相关
  home: {
    getLeaderboard: (tab) => publicFetch(`/home/leaderboard/${tab}`),
    getLearningStats: () => request('/home/learning-stats')
  },

  // 个性化推荐相关
  personalized: {
    getData: () => request('/personalized', { timeout: 60000 }),
    getReviewRecommendations: () => request('/personalized/review', { timeout: 20000 }),
    getLearnRecommendations: () => request('/personalized/learn', { timeout: 20000 }),
    getAISuggestionDashboard: (forceRefresh = false) => request('/personalized/advice', {
      method: 'POST',
      body: JSON.stringify({ forceRefresh }),
      timeout: TIMEOUTS.MEDIUM
    }),
    getAIAnalysis: (forceRefresh = false) => request(`/personalized/analysis${forceRefresh ? '?forceRefresh=true' : ''}`, { timeout: 60000 })
  },

  // 个人中心相关
  profile: {
    getBackground: () => request('/profile/background'),
    getStats: () => request('/profile/stats'),
    getActivityData: () => request('/profile/activity'),
    getAchievements: () => request('/profile/achievements')
  },

  // 飞花令·问鼎天下游戏相关
  feihualingGame: {
    // 获取游戏数据
    getGameData: () => request('/feihualing-game/game-data'),
    // 获取地图
    getMap: (params) => request(`/feihualing-game/map?position=${params?.position || 0}&difficulty=${params?.difficulty || 1}`),
    // 掷骰子
    rollDice: (data) => request('/feihualing-game/roll-dice', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    // 开始对战
    startBattle: (data) => request('/feihualing-game/battle/start', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    // 提交对战结果
    submitBattle: (data) => request('/feihualing-game/battle/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    // 获取声望等级
    getPrestigeLevels: () => request('/feihualing-game/prestige-levels'),
    // 获取成就
    getAchievements: () => request('/feihualing-game/achievements'),
    // 获取对战历史
    getBattleHistory: (limit) => request(`/feihualing-game/battle-history?limit=${limit || 10}`),
    // 获取统计
    getStats: () => request('/feihualing-game/stats'),
    // 获取角色列表
    getCharacters: () => request('/feihualing-game/characters'),
    // 获取诗句库
    getPoems: (difficulty) => request(`/feihualing-game/poems?difficulty=${difficulty || 1}`),
    // 获取收藏诗句
    getCollectedPoems: () => request('/feihualing-game/collected-poems')
  }
};

export { API_BASE_URL, SOCKET_URL };
export default api;
