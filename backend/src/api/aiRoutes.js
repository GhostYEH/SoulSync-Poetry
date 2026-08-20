const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const { getIO } = require('../utils/socket');
const crypto = require('crypto');
const axios = require('axios');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const authenticateToken = require('../middleware/auth');
const optionalAuthenticateToken = authenticateToken.optionalAuthenticateToken;

require('dotenv').config();

// 在所有的 AI 路由之前，统一尝试解析 token，以便后续限流器能获取到 req.user
router.use(optionalAuthenticateToken);

// 普通文本 AI 的统一 SSE 接口。前端收到 token 后即可实时渲染 Markdown；
// 文生图、TTS 等二进制/异步任务仍走原有接口。
router.post('/stream', aiRateLimiter, async (req, res, next) => {
  const { type, poem, title, author, question, history, explanationType, dynasty } = req.body || {};
  if (!type || !['tutor', 'explain', 'background', 'story', 'recitation-guide', 'rewrite', 'dimension', 'advice'].includes(type)) {
    return res.status(400).json({ message: '缺少或不支持的流式 AI 类型' });
  }
  if (['tutor', 'explain', 'background', 'story', 'recitation-guide', 'rewrite', 'dimension', 'advice'].includes(type) && !poem) {
    return res.status(400).json({ message: '缺少诗词内容' });
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    await aiService.streamAIText({
      type,
      poem,
      title,
      author,
      question,
      history: Array.isArray(history) ? history : [],
      explanationType,
      dynasty,
      onToken: (content) => {
        if (!res.writableEnded) res.write(`data: ${JSON.stringify({ type: 'token', content })}\n\n`);
      }
    });
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    }
  } catch (error) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'AI流式请求失败' })}\n\n`);
      res.end();
    } else {
      next(error);
    }
  }
});

const imageCache = new Map();
const generationTasks = new Map();
const userRateLimits = new Map();
const MAX_REQUESTS_PER_MINUTE = 5;

const charInfoCache = new Map();

function generateCacheKey(prompt) {
  return crypto.createHash('md5').update(prompt).digest('hex');
}

function getCache(key) {
  return charInfoCache.get(key);
}

function setCache(key, value) {
  charInfoCache.set(key, value);
  if (charInfoCache.size > 1000) {
    const firstKey = charInfoCache.keys().next().value;
    charInfoCache.delete(firstKey);
  }
}

// AI 诗词讲解接口 - 生活化诗意解释
router.post('/explainPoem/daily_life_explanation', aiRateLimiter, async function(req, res, next) {
  try {
    await aiService.handleAIExplanation(req, res, 'daily_life_explanation');
  } catch(e) {
    next(e);
  }
});

// AI 诗词讲解接口 - 关键词深度解析
router.post('/explainPoem/keyword_analysis', aiRateLimiter, async function(req, res, next) {
  try {
    await aiService.handleAIExplanation(req, res, 'keyword_analysis');
  } catch(e) {
    next(e);
  }
});

// AI 诗词讲解接口 - 意境赏析
router.post('/explainPoem/artistic_conception', aiRateLimiter, async function(req, res, next) {
  try {
    await aiService.handleAIExplanation(req, res, 'artistic_conception');
  } catch(e) {
    next(e);
  }
});

// AI 诗词讲解接口 - 引导性思考题
router.post('/explainPoem/thinking_questions', aiRateLimiter, async function(req, res, next) {
  try {
    await aiService.handleAIExplanation(req, res, 'thinking_questions');
  } catch(e) {
    next(e);
  }
});

// AI 诗词讲解接口 - 完整讲解
router.post('/explainPoem', aiRateLimiter, async function(req, res, next) {
  try {
    await aiService.handleAIExplanation(req, res, '');
  } catch(e) {
    next(e);
  }
});

// AI 诗词讲解接口 - 批量获取所有讲解类型
router.post('/explainPoem/batch', aiRateLimiter, async function(req, res, next) {
  try {
    const poem = req.body.poem;
    const title = req.body.title;
    const author = req.body.author;

    if (!poem) {
      res.status(400).json({ message: '缺少诗词内容' });
      return;
    }

    console.log('接收到批量AI讲解请求:', {
      title: title || '无标题',
      author: author || '无作者',
      poemLength: poem.length
    });

    // 优先考虑一次 AI 请求返回结构化 4 字段 (传入 falsy 的 explanationType 会触发 full 生成)
    const result = await aiService.getAIExplanation(poem, title, author, '');
    
    // 或者，如果是需要并发，可以使用 Promise.allSettled
    // 这里使用了一次请求获取全部字段的实现，降低 AI 成本和延迟
    
    const batchResult = {
      daily_life_explanation: result.daily_life_explanation || '暂无数据',
      keyword_analysis: result.keyword_analysis || '暂无数据',
      artistic_conception: result.artistic_conception || '暂无数据',
      thinking_questions: result.thinking_questions || []
    };

    res.json(batchResult);
  } catch (error) {
    next(error);
  }
});

// AI 诗词创作背景
router.post('/poem/background', aiRateLimiter, async function(req, res, next) {
  try {
    const title = req.body.title;
    const author = req.body.author;
    const dynasty = req.body.dynasty;
    const content = req.body.content;

    if (!content) {
      res.status(400).json({ message: '缺少诗词内容' });
      return;
    }

    const result = await aiService.getPoemBackground(title, author, dynasty, content);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// AI 诗词趣味故事
router.post('/poem/story', aiRateLimiter, async function(req, res, next) {
  try {
    const title = req.body.title;
    const author = req.body.author;
    const content = req.body.content;

    if (!content) {
      res.status(400).json({ message: '缺少诗词内容' });
      return;
    }

    const result = await aiService.getPoemStory(title, author, content);
    res.json({ story: result });
  } catch (error) {
    next(error);
  }
});

// AI 诵读技巧指南
router.post('/poem/recitation-guide', aiRateLimiter, async function(req, res, next) {
  try {
    const title = req.body.title;
    const author = req.body.author;
    const content = req.body.content;
    const dynasty = req.body.dynasty;

    if (!content) {
      res.status(400).json({ message: '缺少诗词内容' });
      return;
    }

    const result = await aiService.getRecitationGuide(title, author, content, dynasty);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// AI 智能语义搜索
router.post('/search', aiRateLimiter, async function(req, res, next) {
  try {
    const query = req.body.query;
    let limit = req.body.limit;
    if (!limit) {
      limit = 50;
    }

    if (!query) {
      res.status(400).json({ message: '缺少搜索关键词' });
      return;
    }

    const result = await aiService.aiPoemSearch(query, limit);
    const poems = result.poems;
    let poemsArray = [];
    if (poems) {
      poemsArray = poems;
    }

    let analysis = {};
    analysis.summary = '';
    analysis.tags = [];
    analysis.suggestions = [];

    if (poemsArray.length > 0) {
      try {
        let emotionResult = null;
        if (result.emotion) {
          emotionResult = {};
          emotionResult.emotion = result.emotion;
          emotionResult.intent = result.intent;
        }
        analysis = await aiService.analyzeSearchResults(query, poemsArray, emotionResult);
      } catch (e) {
        analysis = {};
        analysis.summary = '';
        analysis.tags = [];
        analysis.suggestions = [];
      }
    }

    const response = {};
    for (const key in result) {
      response[key] = result[key];
    }
    response.analysis = analysis;

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// AI 搜索结果分析
router.post('/search-analysis', aiRateLimiter, async function(req, res, next) {
  try {
    const query = req.body.query;
    const poems = req.body.poems;
    const emotion = req.body.emotion;

    if (!query || !poems || poems.length === 0) {
      res.json({ summary: '', tags: [], suggestions: [] });
      return;
    }

    let emotionResult = null;
    if (emotion) {
      emotionResult = {};
      emotionResult.emotion = emotion;
      emotionResult.intent = 'general';
    } else {
      try {
        emotionResult = aiService.detectSearchEmotion(query);
      } catch (e) {
        emotionResult = {};
        emotionResult.emotion = null;
        emotionResult.intent = 'general';
      }
    }

    const result = await aiService.analyzeSearchResults(query, poems, emotionResult);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// AI 背诵检测接口
router.post('/recite-check', aiRateLimiter, async function(req, res, next) {
  try {
    const original = req.body.original;
    const input = req.body.input;
    const poem_id = req.body.poem_id;
    const poem_title = req.body.poem_title;
    const poem_author = req.body.poem_author;
    const attemptId = req.body.attemptId;

    console.log('接收到背诵检测请求:', {
      poem_id: poem_id,
      poem_title: poem_title,
      attemptId: attemptId
    });

    if (!original || !input) {
      res.status(400).json({ message: '缺少必要参数' });
      return;
    }

    if (poem_id && req.user && !attemptId) {
      res.status(400).json({ message: '缺少幂等标识 attemptId，无法保证数据一致性' });
      return;
    }

    // 使用智谱模型检测
    const result = await aiService.getAIRecitationCheck(original, input, poem_title, poem_author, null);

    if (poem_id && result.score < 90) {
      const mistakesService = require('../services/mistakesService');
      let title = '未知';
      if (poem_title) {
        title = poem_title;
      }
      let author = '未知';
      if (poem_author) {
        author = poem_author;
      }
      mistakesService.addMistake(
        poem_id,
        result.score,
        title,
        author,
        original,
        input
      );
    }

    if (poem_id && req.user) {
      const learningService = require('../services/learningService');
      const userId = req.user.userId;
      learningService.recordLearningAction(userId, poem_id, 'recite', result.score);

      // 接入学习事件闭环：背诵考察原文记忆
      // 幂等设计：attemptId 由前端在背诵开始时生成 UUID，HTTP 重试复用同一值
      // 同一次背诵的 retry → 相同 eventKey → LearningEvent 不重复
      // 不同时间重新背诵 → 不同 attemptId → 新 LearningEvent
      const learningEventService = require('../services/learningEventService');
      const reciteCorrect = result.score >= 80;
      
      // 等待数据库事务完成，不再 fire-and-forget
      await learningEventService.recordEvent({
        userId,
        eventType: reciteCorrect ? learningEventService.EVENT_TYPES.RECITE_POEM
                                  : learningEventService.EVENT_TYPES.RECITATION_ERROR,
        poemId: poem_id,
        knowledgePoints: ['memorization'],
        correct: reciteCorrect,
        score: result.score,
        difficulty: 3,
        metadata: { poem_title, poem_author, score: result.score, errors: result.errors || [], attemptId },
        eventKey: `recite:${userId}:${attemptId}`,
        questionText: `背诵《${poem_title || ''}》`,
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// AI 对话式助教接口
router.post('/tutor', aiRateLimiter, async function(req, res, next) {
  try {
    const poem = req.body.poem;
    const title = req.body.title;
    const author = req.body.author;
    const question = req.body.question;
    let history = req.body.history;
    if (!history) {
      history = [];
    }

    console.log('接收到AI助教请求:', {
      hasPoem: !!poem,
      hasTitle: !!title,
      hasAuthor: !!author,
      hasQuestion: !!question,
      historyLength: history.length
    });

    if (!poem || !question) {
      res.status(400).json({ message: '缺少诗词内容或问题' });
      return;
    }

    const response = await aiService.getAIResponse(poem, title, author, question, history);

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
});

// AI 按维度解释接口
router.post('/explain/dimension', aiRateLimiter, async function(req, res, next) {
  try {
    const poem = req.body.poem;
    const title = req.body.title;
    const author = req.body.author;
    const dimension = req.body.dimension;

    console.log('接收到按维度解释请求:', {
      hasPoem: !!poem,
      hasTitle: !!title,
      hasAuthor: !!author,
      dimension: dimension
    });

    if (!poem || !dimension) {
      res.status(400).json({ message: '缺少诗词内容或维度' });
      return;
    }

    const validDimensions = ['情感', '意象', '写法', '结构', '考点', '背诵技巧'];
    let isValid = false;
    for (let i = 0; i < validDimensions.length; i++) {
      if (validDimensions[i] === dimension) {
        isValid = true;
        break;
      }
    }

    if (!isValid) {
      res.status(400).json({ message: '无效的维度' });
      return;
    }

    const response = await aiService.getDimensionExplanation(poem, title, author, dimension);

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
});

// AI 学习建议接口
router.post('/advice', aiRateLimiter, async function(req, res, next) {
  try {
    const poem = req.body.poem;
    const title = req.body.title;
    const author = req.body.author;

    console.log('接收到学习建议请求:', {
      hasPoem: !!poem,
      hasTitle: !!title,
      hasAuthor: !!author
    });

    if (!poem) {
      res.status(400).json({ message: '缺少诗词内容' });
      return;
    }

    const response = await aiService.getLearningAdvice(poem, title, author);

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
});

// AI 简化解释接口
router.post('/simplify', aiRateLimiter, async function(req, res, next) {
  try {
    const poem = req.body.poem;
    const title = req.body.title;
    const author = req.body.author;
    const originalExplanation = req.body.originalExplanation;

    console.log('接收到简化解释请求:', {
      hasPoem: !!poem,
      hasTitle: !!title,
      hasAuthor: !!author,
      hasOriginalExplanation: !!originalExplanation
    });

    if (!poem || !originalExplanation) {
      res.status(400).json({ message: '缺少诗词内容或原解释' });
      return;
    }

    const response = await aiService.getSimplifiedExplanation(poem, title, author, originalExplanation);

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
});

// AI 改写诗意接口
router.post('/rewrite', aiRateLimiter, async function(req, res, next) {
  try {
    const poem = req.body.poem;
    const title = req.body.title;
    const author = req.body.author;

    if (!poem) {
      res.status(400).json({ message: '缺少诗词内容' });
      return;
    }

    console.log('接收到AI改写诗意请求:', {
      title: title || '无标题',
      author: author || '无作者',
      poemLength: poem.length
    });

    const result = await aiService.getAIrewritePoem(poem, title, author);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// AI 字符信息接口
router.post('/char-info', aiRateLimiter, async function(req, res, next) {
  try {
    const prompt = req.body.prompt;

    if (!prompt) {
      res.status(400).json({ message: '缺少prompt参数' });
      return;
    }

    const cacheKey = generateCacheKey(prompt);

    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      console.log('字符信息请求命中缓存');
      res.json({ content: cachedData });
      return;
    }

    console.log('接收到字符信息请求:', { prompt: prompt });

    const response = await aiService.getCharInfo(prompt);

    await setCache(cacheKey, response);

    res.json({ content: response });
  } catch (error) {
    next(error);
  }
});

// AI 字符信息批量接口
router.post('/char-info/batch', aiRateLimiter, async function(req, res, next) {
  try {
    const poem = req.body.poem;
    const title = req.body.title;
    const author = req.body.author;

    if (!poem || !title || !author) {
      res.status(400).json({ message: '缺少必要参数' });
      return;
    }

    console.log('接收到字符信息批量请求:', { title: title, author: author, poemLength: poem.length });

    // 提取诗词中的所有不重复汉字
    const chars = new Set();
    const linesArray = poem.split('\n');
    for (let i = 0; i < linesArray.length; i++) {
      const line = linesArray[i];
      if (!line.trim()) {
        continue;
      }
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char >= '\u4e00' && char <= '\u9fff') {
          chars.add(char);
        }
      }
    }

    const charArray = [];
    chars.forEach(function(char) {
      charArray.push(char);
    });

    console.log('提取到的汉字数量:', charArray.length);

    const results = {};
    const batchSize = 5;

    for (let i = 0; i < charArray.length; i += batchSize) {
      const batchChars = charArray.slice(i, i + batchSize);
      const batchPromises = [];

      for (let j = 0; j < batchChars.length; j++) {
        const char = batchChars[j];
        const promise = (async function(c) {
          let currentLine = '';
          for (let k = 0; k < linesArray.length; k++) {
            const line = linesArray[k];
            if (line.indexOf(c) !== -1) {
              currentLine = line;
              break;
            }
          }
          const promptText = title + '中的"' + currentLine + '"句中的"' + c + '"字的读音和释义';

          const cacheKey = generateCacheKey(promptText);

          let cachedData = await getCache(cacheKey);

          if (!cachedData) {
            cachedData = await aiService.getCharInfo(promptText);
            await setCache(cacheKey, cachedData);
          }

          results[c] = cachedData;
        })(char);

        batchPromises.push(promise);
      }

      await Promise.all(batchPromises);
    }

    res.json({ results: results });
  } catch (error) {
    next(error);
  }
});

// 检查速率限制
function checkRateLimit(userId) {
  const now = Date.now();
  let userLimit = userRateLimits.get(userId);
  if (!userLimit) {
    userLimit = {};
    userLimit.count = 0;
    userLimit.lastReset = now;
  }

  if (now - userLimit.lastReset > 60000) {
    userLimit = {};
    userLimit.count = 1;
    userLimit.lastReset = now;
    userRateLimits.set(userId, userLimit);
    return true;
  }

  if (userLimit.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  userLimit.count = userLimit.count + 1;
  userRateLimits.set(userId, userLimit);
  return true;
}

function generateImageCacheKey(poemId, title, author) {
  const text = String(poemId) + '_' + String(title) + '_' + String(author);
  return crypto.createHash('md5').update(text).digest('hex');
}

async function generateImage(poemId, title, author, content, socket) {
  const cacheKey = generateImageCacheKey(poemId, title, author);

  if (imageCache.has(cacheKey)) {
    const cached = imageCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 30 * 24 * 60 * 60 * 1000) {
      socket.emit('image-generate-success', {
        poemId: poemId,
        url: cached.url
      });
      return cached.url;
    }
  }

  if (generationTasks.has(cacheKey)) {
    socket.emit('image-generate-pending', {
      poemId: poemId
    });
    return null;
  }

  generationTasks.set(cacheKey, true);
  socket.emit('image-generate-pending', {
    poemId: poemId
  });

  try {
    const SILICON_FLOW_API_KEY = process.env.SILICONFLOW_API_KEY;

    if (!SILICON_FLOW_API_KEY || SILICON_FLOW_API_KEY === 'your-siliconflow-api-key-here') {
      console.error('硅基流动API密钥未配置，请在backend/.env文件中设置SILICONFLOW_API_KEY');
      socket.emit('image-generate-fail', {
        poemId: poemId,
        error: 'API密钥未配置，请联系管理员配置SILICONFLOW_API_KEY'
      });
      return null;
    }

    const promptText = '根据古诗词《' + title + '》（作者：' + author + '）的内容生成一幅中国风图像，画面要准确描绘诗中所描述的场景和意境，' + content + '，中国传统风格，高清细腻，氛围感强，无任何文字、无水印、无logo，画面干净统一，适合做网页背景图';

    console.log('生成图像的prompt:', promptText);
    console.log('使用硅基流动API密钥: 已配置');

    const response = await axios.post('https://api.siliconflow.cn/v1/images/generations', {
      model: 'Kwai-Kolors/Kolors',
      prompt: promptText,
      image_size: '1440x720',
      batch_size: 1,
      num_inference_steps: 20,
      guidance_scale: 7.5
    }, {
      headers: {
        'Authorization': 'Bearer ' + SILICON_FLOW_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('API响应:', response.data);

    if (response.data && response.data.images && response.data.images[0]) {
      let imageData = response.data.images[0];
      let imageUrl = '';

      if (typeof imageData === 'object' && imageData !== null) {
        console.log('API返回对象结构:', JSON.stringify(imageData));

        if (imageData.url) {
          imageUrl = imageData.url;
          console.log('使用API返回的URL:', imageUrl);
        } else if (imageData.data) {
          imageUrl = 'data:image/png;base64,' + imageData.data;
          console.log('使用API返回的Base64数据');
        } else if (imageData.base64) {
          imageUrl = 'data:image/png;base64,' + imageData.base64;
          console.log('使用API返回的Base64数据');
        } else {
          console.error('无法识别的图片数据格式:', imageData);
          throw new Error('API返回的图片数据格式不正确');
        }
      } else if (typeof imageData === 'string') {
        if (imageData.indexOf('http://') === 0 || imageData.indexOf('https://') === 0) {
          imageUrl = imageData;
          console.log('使用API返回的URL:', imageUrl);
        } else {
          imageUrl = 'data:image/png;base64,' + imageData;
          console.log('使用API返回的Base64数据');
        }
      } else {
        console.error('无法识别的图片数据类型:', typeof imageData);
        throw new Error('API返回的图片数据类型不正确');
      }

      const cacheEntry = {};
      cacheEntry.url = imageUrl;
      cacheEntry.timestamp = Date.now();
      imageCache.set(cacheKey, cacheEntry);

      socket.emit('image-generate-success', {
        poemId: poemId,
        url: imageUrl
      });

      return imageUrl;
    } else {
      throw new Error('API返回格式错误');
    }
  } catch (error) {
    // 不要直接打印 AxiosError：其中的 config.headers 会包含完整 Authorization 密钥。
    const providerMessage = error && error.response && error.response.data && error.response.data.message;
    console.error('图像生成失败:', {
      status: error && error.response ? error.response.status : undefined,
      message: providerMessage || (error && error.message) || '未知错误'
    });
    socket.emit('image-generate-fail', {
      poemId: poemId,
      error: error.message
    });
    return null;
  } finally {
    generationTasks.delete(cacheKey);
  }
}

// 预生成图像接口
router.post('/image/pregenerate', aiRateLimiter, async function(req, res) {
  try {
    const poemId = req.body.poemId;
    const title = req.body.title;
    const author = req.body.author;
    const content = req.body.content;
    let userId = req.user ? req.user.userId : null;
    
    // 如果没有登录，使用 IP 作为限流依据
    const rateLimitKey = userId ? `user_${userId}` : `ip_${req.ip}`;

    if (!poemId || !title || !author || !content) {
      res.status(400).json({ message: '缺少必要参数' });
      return;
    }

    if (!checkRateLimit(rateLimitKey)) {
      res.status(429).json({ message: '请求过于频繁，请稍后再试' });
      return;
    }

    const socket = getIO();
    if (!socket) {
      res.status(500).json({ message: 'Socket连接未初始化' });
      return;
    }

    generateImage(poemId, title, author, content, socket);

    res.json({ success: true, message: '预生成任务已启动' });
  } catch (error) {
    console.error('预生成图像失败:', error);
    res.status(500).json({ message: '预生成失败' });
  }
});

// 获取缓存图像接口
router.post('/image/get', aiRateLimiter, async function(req, res) {
  try {
    const poemId = req.body.poemId;
    const title = req.body.title;
    const author = req.body.author;

    if (!poemId || !title || !author) {
      res.status(400).json({ message: '缺少必要参数' });
      return;
    }

    const cacheKey = generateImageCacheKey(poemId, title, author);

    if (imageCache.has(cacheKey)) {
      const cached = imageCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 30 * 24 * 60 * 60 * 1000) {
        res.json({ success: true, url: cached.url });
        return;
      }
    }

    res.json({ success: false, message: '缓存未命中' });
  } catch (error) {
    console.error('获取缓存图像失败:', error);
    res.status(500).json({ message: '获取失败' });
  }
});

// 轮播图生成接口
router.post('/image/carousel', aiRateLimiter, async function(req, res) {
  try {
    const poemId = req.body.poemId;
    const title = req.body.title;
    const author = req.body.author;
    const content = req.body.content;
    let userId = req.user ? req.user.userId : null;
    
    const rateLimitKey = userId ? `user_${userId}` : `ip_${req.ip}`;

    if (!poemId || !title || !author || !content) {
      res.status(400).json({ message: '缺少必要参数' });
      return;
    }

    if (!checkRateLimit(rateLimitKey)) {
      res.status(429).json({ message: '请求过于频繁，请稍后再试' });
      return;
    }

    const socket = getIO();
    if (!socket) {
      res.status(500).json({ message: 'Socket连接未初始化' });
      return;
    }

    const styleVariations = [
      '水墨画风格',
      '工笔画风格',
      '青绿山水画风格',
      '浅绛山水画风格'
    ];

    const randomIndex = Math.floor(Math.random() * styleVariations.length);
    const randomStyle = styleVariations[randomIndex];

    const promptText = '根据古诗词《' + title + '》（作者：' + author + '）的内容生成一幅' + randomStyle + '的中国风图像，画面要准确描绘诗中所描述的场景和意境，' + content + '，中国传统风格，高清细腻，氛围感强，无任何文字、无水印、无logo，画面干净统一，适合做网页背景图';

    let SILICON_FLOW_API_KEY = process.env.SILICONFLOW_API_KEY;
    if (!SILICON_FLOW_API_KEY) {
      SILICON_FLOW_API_KEY = 'YOUR-API-KEY';
    }

    console.log('轮播图生成的prompt:', promptText);

    const response = await axios.post('https://api.siliconflow.cn/v1/images/generations', {
      model: 'Kwai-Kolors/Kolors',
      prompt: promptText,
      image_size: '1440x720',
      batch_size: 1,
      num_inference_steps: 20,
      guidance_scale: 7.5
    }, {
      headers: {
        'Authorization': 'Bearer ' + SILICON_FLOW_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('轮播图API响应:', response.data);

    if (response.data && response.data.images && response.data.images[0]) {
      let base64Image = response.data.images[0];

      if (typeof base64Image === 'object' && base64Image !== null) {
        if (base64Image.data) {
          base64Image = base64Image.data;
        } else if (base64Image.base64) {
          base64Image = base64Image.base64;
        } else {
          console.log('base64Image对象结构:', JSON.stringify(base64Image));
          throw new Error('API返回的图片数据格式不正确');
        }
      }

      if (typeof base64Image !== 'string') {
        console.error('base64Image不是字符串:', typeof base64Image);
        throw new Error('API返回的图片数据不是字符串');
      }

      const imageUrl = 'data:image/png;base64,' + base64Image;

      socket.emit('image-generate-success', {
        poemId: poemId,
        url: imageUrl,
        isCarousel: true
      });

      res.json({ success: true, url: imageUrl });
    } else {
      throw new Error('API返回格式错误');
    }
  } catch (error) {
    console.error('轮播图生成失败:', error);
    res.status(500).json({ message: '生成失败' });
  }
});

// 智谱AI文生图 - 为选中的诗句生成意境画面
router.post('/scene-image', aiRateLimiter, async function(req, res) {
  try {
    const poemLine = req.body.poemLine;
    const poemTitle = req.body.poemTitle;
    const poemAuthor = req.body.poemAuthor;
    const lineNumber = req.body.lineNumber;
    const totalLines = req.body.totalLines;

    if (!poemLine) {
      res.status(400).json({ message: '缺少诗句内容' });
      return;
    }

    let titleText = '古诗';
    if (poemTitle) {
      titleText = poemTitle;
    }

    let authorText = '佚名';
    if (poemAuthor) {
      authorText = poemAuthor;
    }

    let lineNum = null;
    if (typeof lineNumber === 'number') {
      lineNum = lineNumber;
    }

    let totalNum = null;
    if (typeof totalLines === 'number') {
      totalNum = totalLines;
    }

    const result = await aiService.generatePoemSceneImage(
      poemLine,
      titleText,
      authorText,
      lineNum,
      totalNum
    );

    if (result.success) {
      res.json({ success: true, url: result.url, model: result.model });
    } else {
      res.json({ success: false, message: result.message || '生成失败' });
    }
  } catch (error) {
    console.error('诗句意境图生成失败:', error);
    res.status(500).json({ message: '生成失败，请稍后重试' });
  }
});

// 诗人头像生成接口
router.post('/author-avatar', aiRateLimiter, async function(req, res) {
  try {
    const author = req.body.author;

    if (!author) {
      res.status(400).json({ message: '缺少诗人姓名' });
      return;
    }

    const result = await aiService.generateAuthorAvatar(author);

    if (result.success) {
      res.json({ success: true, url: result.url });
    } else {
      res.json({ success: false, message: result.message || '生成失败' });
    }
  } catch (error) {
    console.error('诗人头像生成失败:', error);
    res.status(500).json({ message: '生成失败，请稍后重试' });
  }
});

// 飞花令诗句AI验证接口
router.post('/feihua-validate', aiRateLimiter, async function(req, res) {
  try {
    const poem = req.body.poem;
    const keyword = req.body.keyword;

    if (!poem || !keyword) {
      res.status(400).json({ message: '缺少必要参数' });
      return;
    }

    const normalizedPoem = poem.replace(/[，。！？；：、""''（）【】]/g, '').trim();
    const feihuaPoems = require('../data/feihuaPoems');
    const poems = feihuaPoems[keyword];
    let poemsArray = [];
    if (poems) {
      poemsArray = poems;
    }

    let found = null;
    for (let i = 0; i < poemsArray.length; i++) {
      const p = poemsArray[i];
      const pNorm = p.poem.replace(/[，。！？；：、""''（）【】]/g, '');
      if (pNorm === normalizedPoem || pNorm.indexOf(normalizedPoem) !== -1 || normalizedPoem.indexOf(pNorm) !== -1) {
        found = p;
        break;
      }
    }

    if (found) {
      res.json({
        valid: true,
        message: '诗句正确',
        poem: found,
        source: 'database'
      });
      return;
    }

    const result = await aiService.validateFeihuaPoem(normalizedPoem, keyword);

    if (result.valid && result.poem) {
      res.json({
        valid: true,
        message: '诗句正确（AI验证）',
        poem: result.poem,
        analysis: result.analysis,
        source: 'ai'
      });
    } else {
      res.json({
        valid: false,
        message: result.message || '诗句不正确或不在诗词库中',
        source: 'ai'
      });
    }
  } catch (error) {
    console.error('飞花令验证失败:', error);
    res.status(500).json({ message: '验证失败，请稍后重试' });
  }
});

// 语音合成
router.post('/tts', aiRateLimiter, async function(req, res) {
  try {
    const { text } = req.body;
    
    if (!text) {
      res.status(400).json({ message: '缺少文本内容' });
      return;
    }

    const audioData = await aiService.generateTTS(text);
    res.set('Content-Type', 'audio/mp3');
    res.send(audioData);
  } catch (error) {
    console.error('语音合成失败:', error);
    res.status(500).json({ success: false, message: '语音合成失败' });
  }
});

const personalizedTutorService = require('../services/personalizedTutorService');

router.post('/personalized-tutor', authenticateToken, aiRateLimiter, async function(req, res) {
  try {
    const { poemId, focusKnowledgePoint } = req.body;
    const userId = req.user.userId;

    const result = await personalizedTutorService.getPersonalizedTutoring(userId, {
      poemId: poemId || null,
      focusKnowledgePoint: focusKnowledgePoint || null,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[aiRoutes] 个性化教学失败:', error);
    res.status(500).json({
      success: false,
      message: '个性化教学服务暂时不可用',
      data: {
        depth: 'DEVELOPING',
        targetPoem: null,
        weakPoints: [],
        teaching: {
          explanation: '教学服务暂时不可用，请稍后重试。',
          keyPoints: [],
          practiceAdvice: '',
        },
        sources: [],
        degraded: true,
      },
    });
  }
});

module.exports = router;
