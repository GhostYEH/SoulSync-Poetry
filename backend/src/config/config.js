// 配置文件
// 本地 backend/.env 是开发环境的单一配置源，避免系统残留的旧 Key 覆盖项目配置。
require('dotenv').config({ quiet: true, override: true });

const _WEAK_SECRETS = ['your-secret-key', 'your-secret-key-change-in-production', 'secret', '123456', 'password', 'jwt-secret', ''];
const _jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

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
} else {
  if (_WEAK_SECRETS.includes(_jwtSecret)) {
    console.warn('[SECURITY] 开发环境使用默认 JWT 密钥，请勿用于生产！');
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
    defaultUserId: 1 // 无token/无效token时使用的默认用户ID，仅用于演示/开发环境
  },
  
  // 普通文本模型统一使用智谱；文生图、语音等独立能力继续使用各自的配置。
  ai: {
    model: process.env.AI_MODEL || process.env.ZHIPU_MODEL || 'GLM-4-Flash-250414',
    apiUrl: process.env.AI_API_URL || process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    timeout: 90000, // 增加超时时间到90秒，适应API响应速度
    defaultTemperature: 0.7,
    defaultMaxTokens: 500,
    defaultTopP: 0.7,
    apiKey: process.env.ZHIPU_API_KEY
  },
  
  // 智谱 AI 配置（OpenAI 兼容 Chat Completions）
  zhipu: {
    apiKey: process.env.ZHIPU_API_KEY,
    apiUrl: process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: process.env.ZHIPU_MODEL || process.env.AI_MODEL || 'GLM-4-Flash-250414',
    timeout: 60000
  },

  // 阿里云百炼文生图（Z-Image Turbo）。密钥仅从环境变量读取，绝不写入源码。
  imageGeneration: {
    // DASHSCOPE_API_KEY 为当前推荐名称；旧变量仅作为兼容兜底，避免旧失效 Key 覆盖新配置。
    apiKey: process.env.DASHSCOPE_API_KEY || process.env.ALIYUN_BAILIAN_API_KEY || '',
    baseUrl: process.env.DASHSCOPE_IMAGE_API_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    model: process.env.DASHSCOPE_IMAGE_MODEL || 'z-image-turbo',
    promptVersion: process.env.IMAGE_GENERATION_PROMPT_VERSION || 'z-image-turbo-scene-v13',
    timeout: Number(process.env.IMAGE_GENERATION_TIMEOUT_MS) || 120000
  },

  // 智谱失败时的备用普通文本模型：讯飞星火 Spark Lite HTTP 接口。
  // HTTP 接口使用控制台提供的 APIPassword（不是 WebSocket 的签名 URL）。
  spark: {
    apiPassword: process.env.SPARK_API_PASSWORD || '',
    apiUrl: process.env.SPARK_API_URL || 'https://spark-api-open.xf-yun.com/v1/chat/completions',
    model: process.env.SPARK_MODEL || 'lite',
    timeout: 60000
  },

  // Xiaomi MiMo TTS（OpenAI 兼容 Chat Completions）
  mimo: {
    apiKey: process.env.MIMO_API_KEY || '',
    apiUrl: (process.env.MIMO_BASE_URL || 'https://api.xiaomimimo.com/v1').replace(/\/+$/, '') + '/chat/completions',
    model: process.env.MIMO_TTS_MODEL || 'mimo-v2.5-tts',
    voice: process.env.MIMO_TTS_VOICE || '茉莉',
    style: process.env.MIMO_TTS_STYLE || '普通话，温柔自然，吐字清晰，语速舒缓，适合朗读古诗词。',
    timeout: Number(process.env.MIMO_TTS_TIMEOUT_MS) || 60000
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
    defaultData: {
      // 新手引导诗默认数据
      noviceGenerate: (theme, genre) => {
        // 根据主题和体裁返回不同的模拟数据
        if (theme.includes('春')) {
          if (genre.includes('五言')) {
            return {
              prompt_poem: '春眠不觉晓，处处闻啼鸟。夜来___声，花落知多少。',
              reference_poem: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。',
              explanation: '这是一首描写春天的诗，主题紧扣春天的生机与变化。空缺处应填入描述夜晚声音的词语，如"风雨"、"鸟鸣"等，保持与春天主题的一致性。'
            };
          } else {
            return {
              prompt_poem: '碧玉妆成一树高，万条垂下绿___绦。不知细叶谁裁出，二月春风似剪刀。',
              reference_poem: '碧玉妆成一树高，万条垂下绿丝绦。不知细叶谁裁出，二月春风似剪刀。',
              explanation: '这是一首描写春天的诗，主题紧扣春天的生机与美丽。空缺处应填入描述柳条颜色的词语，如"丝"、"翠"等，保持与春天主题的一致性。'
            };
          }
        } else if (theme.includes('秋')) {
          if (genre.includes('七言')) {
            return {
              prompt_poem: '月落乌啼霜满天，江枫渔火对___眠。姑苏城外寒山寺，夜半钟声到客船。',
              reference_poem: '月落乌啼霜满天，江枫渔火对愁眠。姑苏城外寒山寺，夜半钟声到客船。',
              explanation: '这是一首描写秋天的诗，主题紧扣秋夜的孤寂与思乡。空缺处应填入表达情感的词语，如"愁"、"孤"等，保持与秋天主题的一致性。'
            };
          } else {
            return {
              prompt_poem: '空山新雨后，天气晚来秋。明月松间照，清泉石___流。',
              reference_poem: '空山新雨后，天气晚来秋。明月松间照，清泉石上流。',
              explanation: '这是一首描写秋天的诗，主题紧扣秋天的清新与宁静。空缺处应填入描述水流状态的词语，如"上"、"间"等，保持与秋天主题的一致性。'
            };
          }
        } else if (theme.includes('思乡') || theme.includes('故乡')) {
          return {
            prompt_poem: '床前明月光，疑是地上霜。举头望___月，低头思故乡。',
            reference_poem: '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
            explanation: '这是一首思乡诗，主题紧扣对故乡的思念之情。空缺处应填入描述月亮的词语，如"明"、"圆"等，保持与思乡主题的一致性。'
          };
        } else if (theme.includes('山水')) {
          if (genre.includes('五言')) {
            return {
              prompt_poem: '白日依山尽，黄河入海流。欲穷千里目，更上一层___。',
              reference_poem: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。',
              explanation: '这是一首描写山水的诗，主题紧扣自然景观的壮丽。空缺处应填入表示建筑物的词语，如"楼"、"台"等，保持与山水主题的一致性。'
            };
          } else {
            return {
              prompt_poem: '朝辞白帝彩云间，千里江陵一日还。两岸猿声啼不住，轻舟已过万___山。',
              reference_poem: '朝辞白帝彩云间，千里江陵一日还。两岸猿声啼不住，轻舟已过万重山。',
              explanation: '这是一首描写山水的诗，主题紧扣自然景观的壮丽与行舟的畅快。空缺处应填入表示数量或程度的词语，如"重"、"座"等，保持与山水主题的一致性。'
            };
          }
        } else {
          // 通用模拟数据，根据主题动态调整
          return {
            prompt_poem: '___风萧瑟天气凉，草木摇落露为霜。群燕辞归鹄南翔，念君客游思断肠。',
            reference_poem: '秋风萧瑟天气凉，草木摇落露为霜。群燕辞归鹄南翔，念君客游思断肠。',
            explanation: `这是一首围绕"${theme}"主题的诗，空缺处应填入与主题相关的季节或景象描述，如"春"、"秋"、"晓"等，保持与主题的一致性。`
          };
        }
      },
      
      // 参考诗词默认数据
      assistGenerateReference: (theme, genre) => {
        if (theme.includes('春') && genre.includes('五言')) {
          return {
            poem: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。',
            analysis: '这是一首描写春天的诗，通过对春天早晨景象的描绘，表达了诗人对春天的喜爱之情。'
          };
        } else if (theme.includes('秋') && genre.includes('七言')) {
          return {
            poem: '月落乌啼霜满天，江枫渔火对愁眠。姑苏城外寒山寺，夜半钟声到客船。',
            analysis: '这是一首描写秋天的诗，通过对秋夜景色的描绘，表达了诗人的羁旅之愁。'
          };
        } else {
          return {
            poem: '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
            analysis: '这是一首思乡诗，通过对明月的描写，表达了诗人对故乡的思念之情。'
          };
        }
      },
      
      // 评分默认数据（降权，不再给虚高默认分）
      assistScore: {
        total: 0,
        dimensions: { content: 0, rhythm: 0, mood: 0, language: 0, creativity: 0 },
        suggestions: 'AI服务暂时不可用，请稍后重试。'
      },
      
      // 新手校验默认数据
      noviceCheck: {
        score: 0,
        analysis: { content: 0, rhythm: 0, mood: 0 },
        suggestions: '【亮点】AI服务暂不可用\n【不足】请检查网络后重新提交\n【建议】稍后重试评分'
      },
    }
  }
};
