require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;
const CACHE_DIR = path.join(__dirname, 'cache');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// --- Middleware ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// --- Routes ---
const routeModules = {
  '/api':             require('./src/api/poemRoutes').router,
  '/api/ai':          require('./src/api/aiRoutes'),
  '/api/learn':       require('./src/api/learningRoutes').router,
  '/api/mistakes':    require('./src/api/mistakesRoutes').router,
  '/api/recommend':   require('./src/api/recommendRoutes').router,
  '/api/auth':        require('./src/api/authRoutes'),
  '/api/collections': require('./src/api/collectionsRoutes'),
  '/api/feihua':      require('./src/api/feihuaRoutes'),
  '/api/teacher':     require('./src/api/teacherRoutes'),
  '/api/creation':    require('./src/api/creationRoutes'),
  '/api/challenge':   require('./src/api/challengeRoutes'),
  '/api/wrong-questions': require('./src/api/wrongQuestionRoutes'),
  '/api/card-game':   require('./src/api/cardGameRoutes'),
  '/api/learning':    require('./src/api/learningPathRoutes'),
  '/api/daily':       require('./src/api/dailyRoutes'),
  '/api/review':      require('./src/api/reviewRoutes'),
  '/api/feihua-ranking': require('./src/api/feihuaRankingRoutes'),
  '/api/poetry-challenge': require('./src/api/poetryChallengeRoutes'),
  '/api/analytics':   require('./src/api/teacherAnalyticsRoutes'),
  '/api/home':        require('./src/api/homeRoutes').router,
  '/api/profile':     require('./src/api/profileRoutes').router,
  '/api/personalized': require('./src/routes/personalizedRoutes'),
  '/api/li':          require('./src/api/learningIntelligenceRoutes'),
};

// 创作工作台路由挂载到 /api/creation（与 creationRoutes 共享前缀）
app.use('/api/creation', require('./src/api/creationWorkbenchRoutes'));

for (const [prefix, router] of Object.entries(routeModules)) {
  app.use(prefix, router);
}

app.get('/', (req, res) => res.send('古诗词学习系统 API'));

const errorHandler = require('./src/middleware/errorHandler');
app.use(errorHandler);

// --- WebSocket ---
const setupSocket = require('./src/socket');
setupSocket(io);

const { init: initSocket } = require('./src/utils/socket');
initSocket(io);

// --- 启动 ---
const dataLoader = require('./src/utils/dataLoader');
const poemRoutesModule = require('./src/api/poemRoutes');
const learningRoutesModule = require('./src/api/learningRoutes');
const mistakesRoutesModule = require('./src/api/mistakesRoutes');
const recommendRoutesModule = require('./src/api/recommendRoutes');

async function bootstrap() {
  try {
    const poems = await dataLoader.loadPoems();
    poemRoutesModule.setPoems(poems);
    learningRoutesModule.initLearningRecords(poems);
    mistakesRoutesModule.initMistakes();
    recommendRoutesModule.setPoems(poems);
    console.log(`诗词数据加载完成，共 ${poems.length} 首`);

    try {
      const knowledgeModel = require('./src/services/knowledgeModelService');
      await knowledgeModel.seedKnowledgePoints();
      console.log('知识模型种子初始化完成');
    } catch (seedErr) {
      console.warn('知识模型种子初始化跳过:', seedErr.message);
    }
  } catch (err) {
    console.error('数据加载失败:', err);
    const fallback = dataLoader.useDefaultPoems();
    poemRoutesModule.setPoems(fallback);
  }
}

bootstrap().then(() => {
  server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
});
