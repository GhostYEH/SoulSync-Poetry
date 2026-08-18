// 配置文件
require('dotenv').config();

const _WEAK_SECRETS = ['your-secret-key', 'your-secret-key-change-in-production', 'secret', '123456', 'password', 'jwt-secret', ''];
let _jwtSecret = process.env.JWT_SECRET;

if (!_jwtSecret) {
  if (process.env.NODE_ENV === 'test') {
    _jwtSecret = 'test-secret-key';
  } else {
    console.error('[SECURITY] 未设置 JWT_SECRET，拒绝启动！请配置 JWT_SECRET 环境变量。');
    process.exit(1);
  }
}

if (process.env.NODE_ENV === 'production') {
  if (_WEAK_SECRETS.includes(_jwtSecret)) {
    console.error('[SECURITY] 生产环境 JWT_SECRET 未设置或为弱密钥，拒绝启动！');
    console.error('[SECURITY] 请设置 JWT_SECRET 环境变量为至少32字符的随机字符串。');
    process.exit(1);
  }
  if (_jwtSecret.length < 16) {
    console.error('[SECURITY] 生产环境 JWT_SECRET 长度不足16字符，拒绝启动！');
    process.exit(1);
  }
}

module.exports = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  
  // JWT配置
  jwt: {
    secret: _jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // 认证配置
  auth: {
    // defaultUserId 已删除，禁止无 token 降级
  },
  
  // AI模型配置 - SiliconFlow优先（对话/出题），阿里云兜底（文生图等）
  ai: {
    model: process.env.AI_MODEL || (
      process.env.SILICONFLOW_API_KEY
        ? 'Qwen/Qwen2.5-7B-Instruct'
        : 'qwen-flash'
    ),
    // URL：SiliconFlow key存在则走SiliconFlow，否则走DashScope
    apiUrl: process.env.AI_API_URL || (
      process.env.SILICONFLOW_API_KEY
        ? 'https://api.siliconflow.cn/v1/chat/completions'
        : 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    ),
    timeout: 90000, // 增加超时时间到90秒，适应API响应速度
    defaultTemperature: 0.7,
    defaultMaxTokens: 500,
    defaultTopP: 0.7,
    // Key：优先 SiliconFlow（对话类），其次阿里云（文生图等硬编码接口兜底）
    apiKey: process.env.SILICONFLOW_API_KEY
              || process.env.ALIYUN_BAILIAN_API_KEY
              || process.env.DASHSCOPE_API_KEY
  },
  
  // 智谱AI配置 - 诗词创作模块专用（已切换为硅基流动）
  zhipu: {
    apiKey: process.env.SILICONFLOW_API_KEY || process.env.ZHIPU_API_KEY,
    apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    timeout: 60000
  },
  
  // 缓存配置
  cache: {
    directory: './cache'
  },
  
  // 数据加载配置
  data: {
    loaderScript: '../loader/load_poems.py'
  },
  
  // 创作模块默认数据
  creation: {
  },

  // 统一配置校验方法
  validate: function() {
    console.log('[Config] 开始校验系统配置...');
    
    // 校验数据库配置
    if (!process.env.DATABASE_URL) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[Config] 缺少必需配置: DATABASE_URL');
        process.exit(1);
      }
    }

    // 校验 AI API Key
    if (!this.ai.apiKey && !this.zhipu.apiKey) {
      console.warn('[Config] 警告: 未配置任何 AI API Key (SILICONFLOW_API_KEY 等)，AI 相关功能将降级或不可用。');
    } else {
      console.log('[Config] AI API Key 已配置。');
    }
    
    console.log('[Config] 系统配置校验通过。');
  }
};
