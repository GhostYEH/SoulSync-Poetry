require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { crossOriginResourcePolicy: false }
}));

const _allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : ['*'];
app.use(cors({
  origin: _allowedOrigins.length === 1 && _allowedOrigins[0] === '*' ? '*' : _allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
}));

// --- Rate Limiters ---
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: '请求过于频繁，请稍后再试' } }
});

const aiLimiter = rateLimit({
  windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'AI请求过于频繁，请稍后再试' } }
});

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: '密码操作过于频繁，请稍后再试' } }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/ai', aiLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

// 请求ID + 慢请求检测中间件
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('X-Request-Id', req.requestId);
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000 && process.env.NODE_ENV !== 'test') {
      console.warn(`[SLOW] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms (reqId=${req.requestId})`);
    }
  });
  next();
});

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// --- Health Check ---
const _healthStartTime = Date.now();
app.get('/api/health', async (req, res) => {
  const db = require('./src/utils/db');
  let dbStatus = 'unknown';
  let dbType = 'unknown';
  try {
    await db.ensureDialect();
    dbType = db.isPostgres() ? 'PostgreSQL' : 'SQLite';
    await db.get('SELECT 1 as ok', []);
    dbStatus = 'ok';
  } catch (e) {
    dbStatus = 'error';
    console.warn('[health] DB check failed:', e.message);
  }
  res.json({
    service: 'SoulSync-Poetry',
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    database: dbStatus,
    databaseType: dbType,
    uptime: Math.floor((Date.now() - _healthStartTime) / 1000),
    timestamp: new Date().toISOString()
  });
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
  '/api/creation':    require('./src/api/creationRoutes'),
  '/api/challenge':   require('./src/api/challengeRoutes'),
  '/api/wrong-questions': require('./src/api/wrongQuestionRoutes'),
  '/api/card-game':   require('./src/api/cardGameRoutes'),
  '/api/learning':    require('./src/api/learningPathRoutes'),
  '/api/daily':       require('./src/api/dailyRoutes'),
  '/api/review':      require('./src/api/reviewRoutes'),
  '/api/feihua-ranking': require('./src/api/feihuaRankingRoutes'),
  '/api/poetry-challenge': require('./src/api/poetryChallengeRoutes'),
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
    const db = require('./src/utils/db');
    await db.ensureDialect ? db.ensureDialect() : Promise.resolve();
    if (db.isSqlite && db.isSqlite()) {
      const sqliteMigration = require('./src/utils/sqliteMigration');
      try {
        sqliteMigration.migrate(db.getSqlitePath());
      } catch (migErr) {
        console.warn('SQLite migration 跳过:', migErr.message);
      }
    }

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

    try {
      const learningEventService = require('./src/services/learningEventService');
      const backfill = await learningEventService.backfillPracticeQuestionCatalog();
      if (backfill.questions > 0 || backfill.mappings > 0) {
        console.log(`练习题目录回填完成: ${backfill.questions} 道题，${backfill.mappings} 条知识映射`);
      }
    } catch (backfillErr) {
      console.warn('练习题目录回填跳过:', backfillErr.message);
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

// --- Graceful Shutdown ---
let _shuttingDown = false;
async function gracefulShutdown(signal) {
  if (_shuttingDown) return;
  _shuttingDown = true;
  console.log(`\n收到 ${signal}，开始优雅关闭...`);
  server.close(() => {
    const db = require('./src/utils/db');
    db.close().then(() => {
      console.log('数据库连接已关闭，进程退出');
      process.exit(0);
    }).catch(() => process.exit(1));
  });
  setTimeout(() => {
    console.warn('优雅关闭超时，强制退出');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  gracefulShutdown('uncaughtException');
});
