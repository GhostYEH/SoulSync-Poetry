// 配置文件
require('dotenv').config();

module.exports = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key', // 优先使用环境变量
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // 认证配置
  auth: {
    defaultUserId: 1 // 无token/无效token时使用的默认用户ID，仅用于演示/开发环境
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
