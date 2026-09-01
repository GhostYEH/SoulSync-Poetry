// AI服务模块
const { spawn } = require('child_process');
const config = require('../config/config');
const { getCacheFilePath, readCache, writeCache } = require('../utils/cache');
const crypto = require('crypto');
const fetch = require('node-fetch');
const { AIClient, AIError, AI_ERRORS, robustJSONParse } = require('../utils/aiClient');

const PROMPT_VERSION = 'v1.0';
const CACHE_VERSION = 'v1.0';

const zhipuAIClient = new AIClient({
  apiKey: config.zhipu.apiKey,
  apiUrl: config.zhipu.apiUrl,
  model: config.zhipu.model,
  timeout: 30000,
  name: 'ZhipuAI'
});

const sparkAIClient = new AIClient({
  apiKey: config.spark.apiPassword,
  apiUrl: config.spark.apiUrl,
  model: config.spark.model,
  timeout: config.spark.timeout || 60000,
  name: 'SparkLiteFallback'
});

function withFallbackModel(payload, options = {}) {
  const primaryPayload = { ...payload, model: payload.model || config.zhipu.model };
  const fallbackPayload = { ...payload, model: config.spark.model };
  const primaryOptions = {
    ...options,
    taskName: options.taskName || 'AI_Primary',
    isJsonResponse: options.isJsonResponse !== false
  };
  const fallbackOptions = {
    ...options,
    taskName: `${options.taskName || 'AI'}:SparkLiteFallback`,
    isJsonResponse: options.isJsonResponse !== false
  };

  return zhipuAIClient.request(primaryPayload, primaryOptions).catch(async primaryError => {
    if (!config.spark.apiPassword) throw primaryError;
    console.warn('[aiService] 智谱调用失败，切换讯飞星火 Spark Lite:', {
      code: primaryError.code,
      status: primaryError.status,
      message: primaryError.message
    });
    return sparkAIClient.request(fallbackPayload, fallbackOptions);
  });
}

function withFallbackStream(payload, options = {}) {
  const primaryPayload = { ...payload, model: payload.model || config.zhipu.model };
  const fallbackPayload = { ...payload, model: config.spark.model };
  return zhipuAIClient.stream(primaryPayload, options).catch(async primaryError => {
    if (!config.spark.apiPassword) throw primaryError;
    console.warn('[aiService] 智谱流式调用失败，切换讯飞星火 Spark Lite:', {
      code: primaryError.code,
      status: primaryError.status,
      message: primaryError.message
    });
    return sparkAIClient.stream(fallbackPayload, {
      ...options,
      taskName: `${options.taskName || 'AI_Stream'}:SparkLiteFallback`
    });
  });
}

// 兼容历史上仍直接使用 fetch 的文本任务，统一补上智谱 -> 星火降级。
async function fetchChatWithFallback(payload, { signal, taskName = 'AI_DirectFetch' } = {}) {
  const primaryPayload = { ...payload, model: payload.model || config.zhipu.model };
  const fallbackPayload = { ...payload, model: config.spark.model };
  const requestController = signal ? null : new AbortController();
  const requestSignal = signal || requestController.signal;
  const timeoutId = requestController ? setTimeout(() => requestController.abort(), config.zhipu.timeout || 60000) : null;
  const post = (url, apiKey, body) => fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
    signal: requestSignal
  });

  try {
    const response = await post(config.zhipu.apiUrl, config.zhipu.apiKey, primaryPayload);
    if (response.ok) return response;
    const message = await response.text().catch(() => '');
    const code = response.status === 401 || response.status === 403
      ? AI_ERRORS.AUTH_FAILED
      : response.status === 429
        ? AI_ERRORS.RATE_LIMITED
        : response.status >= 500
          ? AI_ERRORS.UNAVAILABLE
          : AI_ERRORS.BAD_REQUEST;
    throw new AIError(code, `Primary AI request failed with status ${response.status}`, message, response.status);
  } catch (primaryError) {
    if (!config.spark.apiPassword) throw primaryError;
    console.warn('[aiService] 直接文本调用失败，切换讯飞星火 Spark Lite:', {
      task: taskName,
      code: primaryError.code,
      status: primaryError.status,
      message: primaryError.message
    });
    return post(config.spark.apiUrl, config.spark.apiPassword, fallbackPayload);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// 生成统一的缓存 Key
function generateAdvancedCacheKey(poemId, content, taskType, model, promptVersion = PROMPT_VERSION) {
  const hash = crypto.createHash('md5').update(content || '').digest('hex');
  return `ai_${CACHE_VERSION}_${taskType}_${poemId || 'none'}_${hash}_${model}_${promptVersion}`;
}

// 统一 JSON 提取逻辑
function extractJSON(text) {
  return robustJSONParse(text);
}

// 调用AI生成JSON
async function callAIGenerateJSON(prompt, systemContent, options = {}) {
  if (!config.zhipu.apiKey && !config.spark.apiPassword) {
    console.log('[aiService] 未配置可用的文本AI密钥，返回null');
    return null;
  }

  const payload = {
    model: config.ai.model,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: prompt }
    ],
    temperature: options.temperature || config.ai.defaultTemperature || 0.7,
    max_tokens: options.maxTokens || options.max_tokens || config.ai.defaultMaxTokens || 500,
    top_p: options.top_p || config.ai.defaultTopP || 0.7,
    stream: options.stream || false,
    response_format: { type: "json_object" }
  };

  return await withFallbackModel(payload, {
    timeout: options.timeout || 35000,
    maxRetries: 2,
    taskName: 'callAIGenerateJSON',
    isJsonResponse: true
  });
}

module.exports.callAIGenerateJSON = callAIGenerateJSON;

// 调用智谱生成 JSON（诗词创作模块专用）
async function callZhipuGenerateJSON(prompt, systemContent, options = {}) {
  if (!config.zhipu.apiKey && !config.spark.apiPassword) {
    console.log('[aiService] 未配置可用的文本AI密钥，返回null');
    return null;
  }

  const payload = {
    model: config.zhipu.model,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: prompt }
    ],
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens || options.max_tokens || 500,
    top_p: options.top_p || 0.7,
    stream: options.stream || false,
    response_format: { type: "json_object" }
  };

  return await withFallbackModel(payload, {
    timeout: options.timeout || 35000,
    maxRetries: 2,
    taskName: 'callZhipuGenerateJSON',
    isJsonResponse: true
  });
}

module.exports.callZhipuGenerateJSON = callZhipuGenerateJSON;

// 构建AI讲解提示词
function buildPrompt(poem, title, author, explanationType) {
  if (explanationType === "daily_life_explanation") {
    return `请从生活化角度赏析以下古诗文，将意境转化为现代生活场景，让读者易懂。

标题：${title}
作者：${author}
内容：${poem}

要求：具体分析，语言简洁，50-100字，JSON格式返回。

{"daily_life_explanation": "..."}`;
  } else if (explanationType === "keyword_analysis") {
    return `请从关键词角度赏析以下古诗文，解析核心意象、典故和修辞手法。

标题：${title}
作者：${author}
内容：${poem}

要求：具体分析，语言简洁，50-100字，JSON格式返回。

{"keyword_analysis": "..."}`;
  } else if (explanationType === "artistic_conception") {
    return `请从意境角度赏析以下古诗文，分析营造的意境和表达的情感思想。

标题：${title}
作者：${author}
内容：${poem}

要求：具体分析，语言简洁，50-100字，JSON格式返回。

{"artistic_conception": "..."}`;
  } else if (explanationType === "thinking_questions") {
    return `请为以下古诗文设计3个引导性思考题，促进深度学习与思考。

标题：${title}
作者：${author}
内容：${poem}

要求：问题具体，结合内容，每个问题20-30字，JSON数组格式返回。

{"thinking_questions": ["...", "...", "..."]}`;
  } else {
    return `请从四个方面赏析以下古诗文：
1. 生活化解释：转化为现代场景
2. 关键词解析：分析意象、典故、修辞
3. 意境赏析：分析意境和情感
4. 引导性问题：设计3个思考问题

标题：${title}
作者：${author}
内容：${poem}

要求：具体分析，语言简洁，前三点50-100字，问题20-30字，JSON格式返回。

{"daily_life_explanation": "...", "keyword_analysis": "...", "artistic_conception": "...", "thinking_questions": ["...", "...", "..."]}`;
  }
}

// AI背诵检测（使用智谱 GLM-4-Flash-250414）
async function getAIRecitationCheck(original, input, poemTitle, poemAuthor, learningRecord) {
  try {
    const apiKey = config.zhipu.apiKey;
    if (!apiKey) {
      console.error('[aiService] 缺少智谱API密钥');
      return {
        score: 0,
        wrongChars: [],
        missing: [],
        extra: [],
        aiAdvice: 'AI服务暂时不可用，请稍后重试。'
      };
    }

    // 先进行程序化检测，获取错误信息
    const programResult = checkRecitation(original, input);
    
    // 构建错误摘要，不发送原文内容
    let errorSummary = '';
    if (programResult.wrongChars.length > 0) {
      errorSummary += `错字：${programResult.wrongChars.map(item => `"${item.input}"应为"${item.original}"`).join('、')}。`;
    }
    if (programResult.missing.length > 0) {
      errorSummary += `漏字：${programResult.missing.map(item => `"${item.char}"`).join('、')}。`;
    }
    if (programResult.extra.length > 0) {
      errorSummary += `多字：${programResult.extra.map(item => `"${item.char}"`).join('、')}。`;
    }
    
    // 检查是否有特殊请求
    const hasSpecialRequest = input.includes('满分') || input.includes('给我满分') || input.includes('请给我满分');
    
    // 根据分数和错误情况生成不同的提示词
    let prompt = '';
    if (hasSpecialRequest) {
      prompt = `学生背诵检测：
题目：《${poemTitle || '未知'}》
作者：${poemAuthor || '未知'}
得分：${programResult.score}分
学生请求：学生请求给满分

作为语文老师，请用亲切、鼓励的语气回应学生的请求，告诉他背诵的真正意义，并给出学习建议（不超过50字）。`;
    } else if (programResult.score >= 90) {
      prompt = `学生背诵检测：
题目：《${poemTitle || '未知'}》
作者：${poemAuthor || '未知'}
得分：${programResult.score}分
错误：${errorSummary || '无'}

学生背诵得非常好，作为语文老师，请给予表扬和鼓励（不超过50字）。`;
    } else if (programResult.score >= 70) {
      prompt = `学生背诵检测：
题目：《${poemTitle || '未知'}》
作者：${poemAuthor || '未知'}
得分：${programResult.score}分
错误：${errorSummary}

学生背诵还不错，作为语文老师，请指出问题并给出改进建议（不超过50字）。`;
    } else {
      prompt = `学生背诵检测：
题目：《${poemTitle || '未知'}》
作者：${poemAuthor || '未知'}
得分：${programResult.score}分
错误：${errorSummary}

学生背诵需要加强，作为语文老师，请给予鼓励并给出具体的学习建议（不超过50字）。`;
    }

    const systemContent = "你是一位亲切、有耐心的语文老师，善于鼓励学生并给出针对性的学习建议。";

    console.log('[aiService] 发送AI背诵检测请求:', {
      poemTitle,
      poemAuthor,
      score: programResult.score,
      errorCount: programResult.wrongChars.length + programResult.missing.length + programResult.extra.length,
      hasSpecialRequest
    });

    // 使用更短的maxTokens以保证速度
    const result = await callZhipuGenerateJSON(prompt, systemContent, { temperature: 0.7, maxTokens: 100 });

    const aiAdvice = result?.advice || result?.suggestion || result?.message || '继续努力，多读多背！';

    console.log('[aiService] AI背诵检测成功:', { score: programResult.score });
    
    return {
      score: programResult.score,
      wrongChars: programResult.wrongChars,
      missing: programResult.missing,
      extra: programResult.extra,
      aiAdvice: aiAdvice
    };
  } catch (error) {
    console.error('[aiService] AI背诵检测失败:', error.message);
    // 如果AI失败，仍然返回程序化检测结果
    const programResult = checkRecitation(original, input);
    
    // 根据分数生成默认建议
    let defaultAdvice = '';
    if (programResult.score >= 90) {
      defaultAdvice = '太棒了！你背诵得非常准确，继续保持！';
    } else if (programResult.score >= 70) {
      defaultAdvice = '不错哦！注意纠正错误，继续加油！';
    } else {
      defaultAdvice = '继续努力！建议分段背诵，理解诗意后再记忆。';
    }
    
    return {
      score: programResult.score,
      wrongChars: programResult.wrongChars,
      missing: programResult.missing,
      extra: programResult.extra,
      aiAdvice: defaultAdvice
    };
  }
}


// 获取AI讲解（使用智谱 GLM-4-Flash-250414）
async function getAIExplanation(poem, title, author, explanationType) {
  try {
    const cacheKey = generateAdvancedCacheKey(null, poem, `explanation_${explanationType || 'full'}`, config.zhipu.model);
    // 先检查缓存
    const cachedData = readCache(title, author, cacheKey);
    if (cachedData) {
      console.log(`[aiService] 命中缓存: ${title} - ${explanationType || 'full'}`);
      cachedData.from_cache = true;
      return cachedData;
    }
    
    if (!config.zhipu.apiKey && !config.spark.apiPassword) {
      throw new AIError(AI_ERRORS.AUTH_FAILED, '未配置可用的文本AI密钥');
    }
    
    console.log('[aiService] 发送AI讲解请求（智谱）:', {
      title: title || '无标题',
      explanationType: explanationType,
      hasApiKey: Boolean(config.zhipu.apiKey || config.spark.apiPassword)
    });

    const systemContent = "你是一位精通中国古典文学的专家，善于简洁明了地分析古诗文。你的分析应该具体、简洁，控制在50-100字之间，避免冗长和模板化语言。请严格按照JSON格式返回结果。";
    const userPrompt = buildPrompt(poem, title, author, explanationType);

    const result = await callZhipuGenerateJSON(userPrompt, systemContent, { 
      temperature: 0.3, 
      maxTokens: 500,
      timeout: 25000 // 简单评分和分析 25s 左右
    });

    if (!result) {
      console.error('[aiService] 智谱AI讲解返回null');
      return { degraded: true, error: 'AI服务暂时不可用' };
    }

    let finalResponseData = {};
    if (explanationType === 'daily_life_explanation') {
      finalResponseData = { daily_life_explanation: result.daily_life_explanation || '暂无生活化解释' };
    } else if (explanationType === 'keyword_analysis') {
      finalResponseData = { keyword_analysis: result.keyword_analysis || '暂无关键词解析' };
    } else if (explanationType === 'artistic_conception') {
      finalResponseData = { artistic_conception: result.artistic_conception || '暂无意境赏析' };
    } else if (explanationType === 'thinking_questions') {
      finalResponseData = { thinking_questions: result.thinking_questions || ['请思考这首诗表达了怎样的情感？', '诗中的哪些意象给你留下了深刻印象？', '你认为这首诗在艺术上有什么特色？'] };
    } else {
      finalResponseData = result;
    }
    
    writeCache(title, author, cacheKey, finalResponseData);
    
    return finalResponseData;
  } catch (error) {
    console.error('获取AI讲解失败:', error.message);
    throw error;
  }
}


// 背诵检测
function checkRecitation(original, input) {
  console.log('原始输入 - original:', original);
  console.log('原始输入 - input:', input);
  
  function normalize(text) {
    if (!text) return '';
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char >= '\u4e00' && char <= '\u9fff') {
        result += char;
      }
    }
    console.log('归一化结果:', result);
    return result;
  }
  
  const normalizedOriginal = normalize(original);
  const normalizedInput = normalize(input);
  
  console.log('归一化后 - original:', normalizedOriginal);
  console.log('归一化后 - input:', normalizedInput);
  
  const wrongChars = [];
  const missing = [];
  const extra = [];
  
  const maxLength = Math.max(normalizedOriginal.length, normalizedInput.length);
  console.log('最大长度:', maxLength);
  
  for (let i = 0; i < maxLength; i++) {
    const origChar = normalizedOriginal[i];
    const inputChar = normalizedInput[i];
    
    console.log('位置', i, '- 原字符:', origChar, '- 输入字符:', inputChar);
    
    if (!origChar) {
      extra.push({
        position: i,
        char: inputChar
      });
      console.log('发现多余字符:', inputChar);
    } else if (!inputChar) {
      missing.push({
        position: i,
        char: origChar
      });
      console.log('发现缺失字符:', origChar);
    } else if (origChar !== inputChar) {
      wrongChars.push({
        position: i,
        original: origChar,
        input: inputChar
      });
      console.log('发现错字:', inputChar, '→', origChar);
    }
  }
  
  console.log('错字:', wrongChars);
  console.log('缺失:', missing);
  console.log('多余:', extra);
  
  let score = 0;
  if (normalizedOriginal.length > 0) {
    const correctCount = normalizedOriginal.length - wrongChars.length - missing.length;
    const totalCount = normalizedOriginal.length;
    score = Math.round((Math.max(0, correctCount) / totalCount) * 100);
  }
  
  console.log('正确数:', normalizedOriginal.length - wrongChars.length - missing.length);
  console.log('总数:', normalizedOriginal.length);
  console.log('得分:', score);
  
  const result = {
    score,
    wrongChars,
    missing,
    extra,
    aiAdvice: ''
  };
  
  console.log('最终结果:', result);
  return result;
}

// 处理AI讲解请求
async function handleAIExplanation(req, res, explanationType) {
  console.log('接收到AI讲解请求:', {
    explanationType,
    hasPoem: !!req.body.poem,
    hasTitle: !!req.body.title,
    hasAuthor: !!req.body.author
  });
  
  const { poem, title, author } = req.body;
  
  if (!poem) {
    console.log('缺少诗词内容');
    return res.status(400).json({ message: '缺少诗词内容' });
  }

  if (!config.zhipu.apiKey && !config.spark.apiPassword) {
    return res.status(503).json({
      success: false,
      code: 'AI_UNAVAILABLE',
      message: 'AI讲解服务暂不可用'
    });
  }
  
  console.log('开始处理AI讲解请求:', {
    title: title || '无标题',
    author: author || '无作者',
    poemLength: poem.length
  });

  const cachedData = readCache(title, author, explanationType);
  if (cachedData) {
    console.log(`命中缓存: ${title} - ${explanationType || 'full'}`);
    cachedData.from_cache = true;
    return res.json(cachedData);
  }
  
  console.log('直接调用API获取AI讲解');
  
  const aiResult = await getAIExplanation(poem, title, author, explanationType);
  res.json(aiResult);
}

// 构建助教提示词
function buildTutorPrompt(poem, title, author, question, history = []) {
  const recentHistory = history.slice(-3);
  
  const historyText = recentHistory.length > 0 
    ? `最近的对话历史：\n${recentHistory.map(h => `${h.role === 'user' ? '学生：' : '老师：'}${h.content}`).join('\n')}\n\n` 
    : ''; 
  
  const poemLines = poem.split('\n').filter(line => line.trim());
  const lineInfo = poemLines.length > 0 
    ? `\n\n诗句解析：\n${poemLines.map((line, index) => `${index + 1}. ${line}`).join('\n')}` 
    : '';
  
  return `
    你是一位中学语文老师，现在需要围绕以下古诗词回答学生的问题：
    
    古诗词信息：
    标题：${title || '未知'}
    作者：${author || '未知'}
    内容：${poem}${lineInfo}
    
    ${historyText}
    学生当前问题：
    ${question}
    
    核心规则：
    1. 只能讨论这首诗，不允许跑题
    2. 不回答与这首诗无关的问题
    3. 回答必须基于这首诗的标题、作者、正文内容
    4. 必须引用具体诗句来支持你的回答
    5. 教学风格，亲切自然，符合中学语文老师身份
    6. 回答简洁明了，控制在80-140字
    7. 用解释语气，有结构，不学术论文口吻，不闲聊口吻
    8. 直接回答问题，不要使用任何引言或开场白
    9. 保持上下文连贯，记住之前的对话内容
    10. 当学生提到"第一句"、"第二句"等诗句序号时，要明确对应到具体的诗句内容
    
    示例回答风格：
    这首诗通过"明月""长风"等意象，
    营造出辽阔孤高的边塞意境，
    表达了诗人胸怀壮志却远离中原的情感。
    `;
}

// 获取助教回答（使用智谱 GLM-4-Flash-250414）
async function getAIResponse(poem, title, author, question, history = []) {
  try {
    console.log('[aiService] 处理AI助教请求:', {
      title: title || '未知',
      author: author || '未知',
      question: question.substring(0, 50)
    });
    
    const apiKey = config.zhipu.apiKey;
    if (!apiKey) {
      console.error('[aiService] 缺少智谱API密钥');
      return {
        answer: `针对你关于这首诗的问题，我需要更多信息来为你解答。请具体说明你想了解的方面，比如诗句含义、作者背景、艺术特色等，我会为你详细分析。`
      };
    }
    
    // 这里增加 promptVersion 和 model 信息避免污染
    const tutorCacheKey = generateAdvancedCacheKey(null, poem + '|' + question, 'tutor', config.zhipu.model);
    
    const cachedData = readCache(title, author, tutorCacheKey);
    if (cachedData) {
      console.log('[aiService] 命中AI助教缓存');
      return cachedData;
    }
    console.log('[aiService] 未命中缓存，调用API');
    
    const systemContent = "你是一位中学语文老师，专门讲解中国古典诗词。你的职责是：1. 只讨论当前指定的古诗词；2. 以教学风格回答，简洁明了，不超过100字；3. 引用具体诗句支持回答；4. 保持上下文连贯，记住之前的对话；5. 不回答与当前诗词无关的问题；6. 用解释语气，有结构，不学术论文口吻，不闲聊口吻。";
    const userPrompt = buildTutorPrompt(poem, title, author, question, history);

    const result = await callZhipuGenerateJSON(userPrompt, systemContent, {
      temperature: 0.1,
      maxTokens: 150,
      top_p: 0.5,
      timeout: 25000
    });

    if (result && (result.answer || result.explanation || result.message)) {
      let answer = result.answer || result.explanation || result.message;
      if (answer.length > 120) {
        answer = answer.substring(0, 117) + '...';
      }
      const finalRes = { answer };
      writeCache(title, author, tutorCacheKey, finalRes);
      return finalRes;
    }

    // fallback to generic message if parsing failed completely
    return {
      degraded: true,
      answer: `AI服务暂时不可用，请参考数据库基础信息或稍后重试。`
    };
  } catch (error) {
    console.error('[aiService] 获取AI助教回答失败:', error.message);
    throw error;
  }
}

// 构建改写提示词
function buildRewritePrompt(poem, title, author) {
  return `
    请将以下古诗改写为现代白话文解释，保持原意的同时，使用通俗易懂的现代语言表达，让读者更容易理解诗中的意境和情感。
    
    古诗信息：
    标题：${title}
    作者：${author}
    内容：${poem}
    
    要求：
    1. 语言要流畅，自然，符合现代口语表达习惯
    2. 保持诗歌的意境和情感，不要遗漏重要内容
    3. 回答长度控制在200字以内
    4. 请直接输出改写后的内容，不要添加任何引言或开场白
    `;
}

// 构建维度提示词
function buildDimensionPrompt(poem, title, author, dimension) {
  const dimensionMap = {
    '情感': '分析这首诗表达的情感，引用具体诗句说明',
    '意象': '分析诗中的核心意象及其象征意义',
    '写法': '分析诗的写作手法和艺术特色',
    '结构': '分析诗的结构安排和层次',
    '考点': '分析这首诗的重要考点和考试重点',
    '背诵技巧': '提供背诵这首诗的有效技巧和方法'
  };
  
  const dimensionPrompt = dimensionMap[dimension] || '分析这首诗的内容和艺术特色';
  
  return `
    你是一位中学语文老师，现在需要从以下维度分析古诗词：
    
    古诗词信息：
    标题：${title || '未知'}
    作者：${author || '未知'}
    内容：${poem}
    
    分析维度：${dimension}
    分析要求：${dimensionPrompt}
    
    回答规则：
    1. 只能讨论这首诗，不允许跑题
    2. 以教学风格回答，简洁明了，不超过150字
    3. 引用具体诗句支持你的分析
    4. 用解释语气，有结构，不学术论文口吻，不闲聊口吻
    5. 直接回答，不要使用任何引言或开场白
    `;
}

// 构建学习建议提示词
function buildLearningAdvicePrompt(poem, title, author) {
  return `
    你是一位中学语文老师，现在需要为学生提供学习以下古诗词的建议：
    
    古诗词信息：
    标题：${title || '未知'}
    作者：${author || '未知'}
    内容：${poem}
    
    建议内容：
    1. 指出诗中的重点句子和考试常考句
    2. 提供背诵和理解的建议
    3. 推荐相关的学习资源或方法
    
    回答规则：
    1. 只能讨论这首诗，不允许跑题
    2. 以教学风格回答，简洁明了，不超过150字
    3. 引用具体诗句支持你的建议
    4. 用解释语气，有结构，不学术论文口吻，不闲聊口吻
    5. 直接回答，不要使用任何引言或开场白
    `;
}

// 构建简化提示词
function buildSimplifiedExplanationPrompt(poem, title, author, originalExplanation) {
  return `
    你是一位中学语文老师，现在需要将以下古诗词的解释简化，用更简单的语言表达：
    
    古诗词信息：
    标题：${title || '未知'}
    作者：${author || '未知'}
    内容：${poem}
    
    原解释：
    ${originalExplanation}
    
    简化要求：
    1. 使用更简单、更口语化的语言
    2. 保持原解释的核心内容和情感
    3. 回答长度控制在150字以内
    4. 直接回答，不要使用任何引言或开场白
    `;
}

// 改写诗意
async function getAIrewritePoem(poem, title, author) {
  try {


    const apiKey = config.ai.apiKey;
    if (!apiKey) {
      console.error('[aiService] 缺少API密钥');
      return {
        degraded: true,
        rewrite: `AI服务暂时不可用，暂无现代白话文改写。`
      };
    }
    
    const requestData = {
      model: config.ai.model,
      messages: [
        {
          role: "system",
          content: "你是一位精通中国古典文学的专家，擅长将古诗词转化为通俗易懂的现代白话文。"
        },
        {
          role: "user",
          content: buildRewritePrompt(poem, title, author)
        }
      ],
      temperature: 0.3,
      max_tokens: 250,
      top_p: 0.7,
      stream: false
    };
    
    const response = await fetchChatWithFallback(requestData, { taskName: 'getAIrewritePoem' });
    
    if (!response.ok) {
      throw new AIError(response.status === 429 ? AI_ERRORS.RATE_LIMITED : AI_ERRORS.UNAVAILABLE, `API请求失败: ${response.status}`);
    }
    
    const responseData = await response.json();
    const rewrite = responseData.choices[0].message.content;
    
    return {
      rewrite: rewrite.trim()
    };
  } catch (error) {
    console.error('获取AI改写诗意失败:', error.message);
    throw error;
  }
}

// 维度解释
async function getDimensionExplanation(poem, title, author, dimension) {
  try {
    const apiKey = config.ai.apiKey;
    if (!apiKey) {
      console.error('[aiService] 缺少API密钥');
      return {
        degraded: true,
        explanation: `AI服务暂时不可用，暂无从${dimension}维度的深入分析。`
      };
    }
    
    const requestData = {
      model: config.ai.model,
      messages: [
        {
          role: "system",
          content: "你是一位中学语文老师，擅长从不同维度分析中国古典诗词。"
        },
        {
          role: "user",
          content: buildDimensionPrompt(poem, title, author, dimension)
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
      top_p: 0.7,
      stream: false
    };
    
    const response = await fetchChatWithFallback(requestData, { taskName: 'getDimensionExplanation' });
    
    if (!response.ok) {
      throw new AIError(response.status === 429 ? AI_ERRORS.RATE_LIMITED : AI_ERRORS.UNAVAILABLE, `API请求失败: ${response.status}`);
    }
    
    const responseData = await response.json();
    let explanation = responseData.choices[0].message.content;
    
    if (explanation.length > 150) {
      explanation = explanation.substring(0, 147) + '...';
    }
    
    return {
      explanation: explanation.trim()
    };
  } catch (error) {
    console.error('获取按维度解释失败:', error.message);
    throw error;
  }
}

// 学习建议
async function getLearningAdvice(poem, title, author) {
  try {
    const apiKey = config.ai.apiKey;
    if (!apiKey) {
      console.error('[aiService] 缺少API密钥');
      return {
        degraded: true,
        advice: `AI服务暂时不可用，建议您重点理解诗的意境和情感，多读多背。`
      };
    }
    
    const requestData = {
      model: config.ai.model,
      messages: [
        {
          role: "system",
          content: "你是一位中学语文老师，擅长为学生提供古诗词的学习建议。"
        },
        {
          role: "user",
          content: buildLearningAdvicePrompt(poem, title, author)
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
      top_p: 0.7,
      stream: false
    };
    
    const response = await fetchChatWithFallback(requestData, { taskName: 'getLearningAdvice' });
    
    if (!response.ok) {
      throw new AIError(response.status === 429 ? AI_ERRORS.RATE_LIMITED : AI_ERRORS.UNAVAILABLE, `API请求失败: ${response.status}`);
    }
    
    const responseData = await response.json();
    let advice = responseData.choices[0].message.content;
    
    if (advice.length > 150) {
      advice = advice.substring(0, 147) + '...';
    }
    
    return {
      advice: advice.trim()
    };
  } catch (error) {
    console.error('获取学习建议失败:', error.message);
    throw error;
  }
}

// 简化解释
async function getSimplifiedExplanation(poem, title, author, originalExplanation) {
  try {
    const apiKey = config.ai.apiKey;
    if (!apiKey) {
      console.error('[aiService] 缺少API密钥');
      return {
        degraded: true,
        simplified: `AI服务暂时不可用，暂无简白讲解。`
      };
    }
    
    const requestData = {
      model: config.ai.model,
      messages: [
        {
          role: "system",
          content: "你是一位中学语文老师，擅长用简单易懂的语言解释古诗词。"
        },
        {
          role: "user",
          content: buildSimplifiedExplanationPrompt(poem, title, author, originalExplanation)
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
      top_p: 0.7,
      stream: false
    };
    
    const response = await fetchChatWithFallback(requestData, { taskName: 'getSimplifiedExplanation' });
    
    if (!response.ok) {
      throw new AIError(response.status === 429 ? AI_ERRORS.RATE_LIMITED : AI_ERRORS.UNAVAILABLE, `API请求失败: ${response.status}`);
    }
    
    const responseData = await response.json();
    let simplified = responseData.choices[0].message.content;
    
    if (simplified.length > 150) {
      simplified = simplified.substring(0, 147) + '...';
    }
    
    return {
      simplified: simplified.trim()
    };
  } catch (error) {
    console.error('获取简化解释失败:', error.message);
    throw error;
  }
}

// 字符信息
async function getCharInfo(prompt) {
  try {
    if (!config.zhipu.apiKey && !config.spark.apiPassword) {
      throw new AIError(AI_ERRORS.AUTH_FAILED, '未配置可用的文本AI密钥');
    }
    
    const requestData = {
      model: config.ai.model,
      messages: [
        {
          role: "system",
          content: "你是一位中学语文老师，擅长分析汉字的读音和释义。请严格按照JSON格式返回结果。"
        },
        {
          role: "user",
          content: `请分析以下prompt中指定汉字的读音和释义：\n${prompt}\n\n要求：\n1. 明确给出汉字的标准读音\n2. 解释该汉字在该诗句中的具体含义\n3. 语言简洁明了\n4. 请严格按照以下JSON格式返回结果：\n{"phonetic": "[拼音]", "meaning": "[解释]"}`
        }
      ],
      temperature: 0.1,
      max_tokens: 50,
      top_p: 0.5,
      stream: false,
      response_format: { type: "json_object" }
    };
    
    const response = await fetchChatWithFallback(requestData, { taskName: 'getCharInfo' });
    
    if (!response || !response.ok) {
      throw new AIError(response?.status === 429 ? AI_ERRORS.RATE_LIMITED : AI_ERRORS.UNAVAILABLE, `API请求失败: ${response?.status || '未知错误'}`);
    }
    
    const responseData = await response.json();
    const content = responseData.choices[0].message.content;
    
    return content.trim();
  } catch (error) {
    console.error('获取字符信息失败:', error.message);
    throw error;
  }
}

// 生成闯关题目
async function generateChallengeQuestion(level, difficulty, questionType, userId) {
  try {
    if (!config.zhipu.apiKey && !config.spark.apiPassword) {
      throw new AIError(AI_ERRORS.AUTH_FAILED, '未配置可用的文本AI密钥');
    }

    const prompt = `
      为诗词闯关模块生成第 ${level} 关的题目（共300关），难度为 ${difficulty}，题型为 ${questionType}，要求：
      1. 题目对应的诗词需符合该难度梯度
      2. 避免使用该用户（ID：${userId}）历史闯关记录中已出现的诗词
      3. 题目格式要求：上下句接句题、诗人/朝代匹配题、意境理解题、字词释义题
      4. 附带正确答案、解析、难度系数
      5. 确保题目唯一性，不同用户/重闯同关时诗词不同但难度一致
      
      请严格按照以下JSON格式返回：
      {
        "question": "题目内容",
        "correctAnswer": "正确答案",
        "options": ["选项1", "选项2", "选项3", "选项4"],
        "explanation": "题目解析",
        "difficulty": 难度系数（1-5）,
        "poemTitle": "诗词标题",
        "poemAuthor": "诗词作者",
        "poemContent": "完整诗词内容"
      }
    `;

    const systemContent = "你是一位精通中国古典诗词的专家，擅长设计各种难度和类型的诗词题目。";

    const result = await callAIGenerateJSON(prompt, systemContent, { temperature: 0.7, max_tokens: 1000 });
    return result;
  } catch (error) {
    console.error('[aiService] 生成闯关题目失败:', error.message);
    throw error;
  }
}

// 验证闯关答案
async function verifyChallengeAnswer(question, userAnswer, correctAnswer, difficulty) {
  try {
    const apiKey = config.ai.apiKey;
    if (!apiKey) {
      throw new AIError(AI_ERRORS.AUTH_FAILED, 'API密钥缺失');
    }

    const prompt = `
      校验以下诗词闯关题目答案是否正确：
      题目：${question}
      用户答案：${userAnswer}
      正确答案：${correctAnswer}
      
      要求：
      1. 判断是否正确，若为近似正确（如同义释义、通假字）需标注
      2. 给出简洁解析
      3. 解析语言通俗易懂
      
      请严格按照以下JSON格式返回：
      {
        "isCorrect": true/false,
        "isApproximate": true/false,
        "explanation": "解析内容",
        "score": 得分（0-100）
      }
    `;

    const systemContent = "你是一位专业的古诗词教育专家。";

    const result = await callAIGenerateJSON(prompt, systemContent, { temperature: 0.3, max_tokens: 500 });
    return result;
  } catch (error) {
    console.error('[aiService] 验证闯关答案失败:', error.message);
    throw error;
  }
}

// 生成AI帮助提示
async function generateAIHelp(question, difficulty) {
  try {
    const apiKey = config.ai.apiKey;
    if (!apiKey) {
      throw new AIError(AI_ERRORS.AUTH_FAILED, 'API密钥缺失');
    }

    const prompt = `
      为以下诗词闯关题目生成阶梯式帮助提示：
      题目：${question}
      难度：${difficulty}
      
      要求：
      1. 分3步提示，第一步提示考点，第二步提示关键线索，第三步给出答案
      2. 提示语言简洁，引导用户思考
      
      请严格按照以下JSON格式返回：
      {
        "step1": "第一步提示",
        "step2": "第二步提示",
        "step3": "第三步提示"
      }
    `;

    const systemContent = "你是一位耐心的古诗词老师。";

    const result = await callAIGenerateJSON(prompt, systemContent, { temperature: 0.5, max_tokens: 500 });
    return result;
  } catch (error) {
    console.error('[aiService] 生成AI帮助提示失败:', error.message);
    throw error;
  }
}

async function getAIGeneratedQuestions(prompt) {
  try {
    const apiKey = config.ai.apiKey;
    if (!apiKey) {
      throw new AIError(AI_ERRORS.AUTH_FAILED, 'API密钥缺失');
    }

    const systemContent = "你是一个古诗词教育专家。";

    const result = await callAIGenerateJSON(prompt, systemContent, { 
      temperature: 0.7, 
      max_tokens: 3000,
      timeout: 60000
    });

    if (result && Array.isArray(result)) {
      return result;
    }
    if (result && result.questions && Array.isArray(result.questions)) {
      return result.questions;
    }
    if (result && result.data && Array.isArray(result.data)) {
      return result.data;
    }
    if (result && result.items && Array.isArray(result.items)) {
      return result.items;
    }

    return null;
  } catch (error) {
    console.error('[aiService] 生成题目失败:', error.message);
    throw error;
  }
}

// 生成意境图
async function generatePoemImage(poem, title, author) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      console.log('[aiService] 缺少智谱API密钥，无法生成图片');
      return null;
    }

    const imagePrompt = `中国传统水墨画风格，描绘诗词《${title}》的意境。${poem}。画面要体现诗中的意象和情感，淡雅古朴，意境深远，高清细腻，无文字，无水印。`;

    console.log('[aiService] 生成诗词意境图:', { title, author, promptLength: imagePrompt.length });

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'cogview-3-flash',
        prompt: imagePrompt,
        size: '1024x1024'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[aiService] 图片生成失败:', response.status, response.statusText, errorData);
      return null;
    }

    const responseData = await response.json();
    console.log('[aiService] 图片生成成功:', responseData);

    const imageUrl = responseData
      && Array.isArray(responseData.data)
      && responseData.data[0]
      && responseData.data[0].url;

    if (imageUrl) {
      return {
        success: true,
        imageUrl: imageUrl,
        prompt: imagePrompt,
        message: '图片生成成功'
      };
    }

    return null;
  } catch (error) {
    console.error('[aiService] 生成诗词意境图失败:', error);
    return null;
  }
}

// 飞花令评判（使用智谱模型）
async function evaluateFeihuaPoem(poem, keyword, difficulty = 'medium', usedPoems = []) {
  try {
    const apiKey = config.zhipu.apiKey;
    if (!apiKey) {
      throw new AIError(AI_ERRORS.AUTH_FAILED, 'API密钥缺失');
    }

    // 简洁的提示词，确保速度和严格性
    const prompt = `判断飞花令诗句：
诗句：${poem}
令字：${keyword}

严格判断：1. 是否包含令字？2. 是否是真实的中国古典诗词？

只返回JSON：{"isValid": true或false, "reason": "简要原因"}`;

    const systemContent = "你是严格的飞花令验证专家，只返回正确或错误，判断要严格。";

    // 优化参数以提高速度
    const result = await callZhipuGenerateJSON(prompt, systemContent, {
      temperature: 0.01, // 更低的temperature确保判断严格
      maxTokens: 100, // 减少返回内容以提高速度
      timeout: 10000 // 设置超时时间以避免长时间等待
    });

    if (!result || typeof result.isValid !== 'boolean') {
      console.error('[aiService] 飞花令评判AI返回格式错误');
      return {
        isValid: false,
        score: 0,
        reason: 'AI服务暂时不可用或返回格式错误',
        poemInfo: { title: null, author: null }
      };
    }

    console.log('[aiService] 飞花令AI评判:', result);

    return {
      isValid: result.isValid,
      score: result.isValid ? 100 : 0,
      reason: result.reason || (result.isValid ? '诗句有效' : '诗句无效'),
      poemInfo: { title: null, author: null }
    };
  } catch (error) {
    console.error('[aiService] 飞花令评判失败:', error.message);
    throw error;
  }
}



// 验证飞花令诗句
async function evaluateFeihua(poem, keyword) {
  try {
    const db = require('../utils/db');
    // Normalize input
    const normalizedInput = poem.replace(/[，。！？、；：""''（）【】《》\s]/g, '');
    if (!normalizedInput.includes(keyword)) {
      return {
        valid: false,
        message: `输入诗句未包含令字「${keyword}」`,
        verificationStatus: 'rejected_by_rule',
        poem: null,
        analysis: `输入未包含令字`
      };
    }

    // Attempt DB match first
    try {
      const dbMatches = await db.query(
        "SELECT * FROM poems WHERE REPLACE(content, '，', '') LIKE $1 OR REPLACE(content, '。', '') LIKE $1 LIMIT 1",
        [`%${normalizedInput}%`]
      );
      if (dbMatches.rows && dbMatches.rows.length > 0) {
        const poemData = dbMatches.rows[0];
        return {
          valid: true,
          message: '匹配到题库真实诗句',
          verificationStatus: 'verified_by_db',
          poem: {
            title: poemData.title,
            author: poemData.author,
            content: poemData.content,
            dynasty: poemData.dynasty
          },
          analysis: `出自${poemData.author}的《${poemData.title}》`
        };
      }
    } catch (dbErr) {
      console.error('[aiService] DB 查询匹配失败:', dbErr.message);
    }

    if (!config.zhipu.apiKey && !config.spark.apiPassword) {
      throw new AIError(AI_ERRORS.AUTH_FAILED, '未配置可用的文本AI密钥');
    }

    const prompt = `你是一位飞花令诗句验证专家。请严格验证以下诗句。

令字：${keyword}
待验证诗句：${poem}

验证要求：
1. 诗句中必须包含「${keyword}」字
2. 诗句必须是真实存在于中华诗词传统中的经典诗句，不可是自创、改编或虚构的
3. 诗句符合基本格律，语义通顺

直接返回JSON：
{
  "valid": true或false,
  "message": "简短说明",
  "poem": { "poem": "完整诗句", "keyword": "${keyword}", "title": "标题", "author": "作者" },
  "analysis": "简要分析"
}

重要提示：如果你不确定某诗句是否真实存在，请务必返回 valid: false。

`;

    const feihuaModel = config.zhipu.model;
    const requestData = {
      model: feihuaModel,
      messages: [
        {
          role: "system",
          content: "你是一位严格的飞花令诗句验证专家。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
      stream: false,
      response_format: { type: "json_object" }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.ai.timeout || 30000);

    try {
      const response = await fetchChatWithFallback(requestData, { signal: controller.signal, taskName: 'evaluateFeihuaPoem' });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new AIError(response.status === 429 ? AI_ERRORS.RATE_LIMITED : AI_ERRORS.UNAVAILABLE, `API请求失败: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new AIError(AI_ERRORS.INVALID_RESPONSE, 'API返回内容为空');
      }

      const result = JSON.parse(content);
      return {
        valid: result.valid === true,
        message: result.message || (result.valid ? '诗句正确' : '诗句不正确'),
        poem: result.poem || { poem, keyword, title: null, author: null },
        analysis: result.analysis || ''
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[aiService] AI验证请求超时');
      } else {
        console.error('[aiService] AI验证请求失败:', fetchError.message);
      }
      return {
        valid: null,
        message: 'AI服务暂时不可用，无法验证',
        poem: null,
        analysis: '服务异常，请稍后再试'
      };
    }
  } catch (error) {
    console.error('[aiService] validateFeihuaPoem 错误:', error.message);
    throw error;
  }
}

// 半句归一化
function normalizeHalfRaw(s) {
  if (!s) return '';
  return String(s)
    .replace(/\s/g, '')
    .replace(/[。！？…；、""''（）《》\s]/g, '');
}

// 提取偶句
function extractCommaCouplets(fullPoem) {
  const poem = String(fullPoem || '').replace(/\s/g, '');
  const chunks = poem.split(/[。！？；]+/).filter(Boolean);
  const pairs = [];
  for (const chunk of chunks) {
    const parts = chunk.split(/[，]/);
    for (let i = 0; i < parts.length - 1; i++) {
      const left = parts[i].trim();
      const right = parts[i + 1].trim();
      if (left && right) pairs.push({ left, right });
    }
  }
  return pairs;
}

// 推导答案
function deriveAdjacentAnswerFromPoem(question, fullPoem) {
  const pairs = extractCommaCouplets(fullPoem);
  if (!pairs.length) return { ok: false, answer: null };

  const qStr = String(question || '').replace(/\s/g, '');
  const blankPat = '(?:_{3,}|＿{3,}|…{2,}|……)';

  const mBlankFirst = qStr.match(new RegExp(blankPat + '\\s*，\\s*([^，_' + '…' + ']+?)(?:[。！？…；]|$)'));
  if (mBlankFirst) {
    const anchorRaw = mBlankFirst[1].replace(/[。！？…；]+$/g, '').trim();
    if (!anchorRaw || /^_+$/.test(anchorRaw)) return { ok: false, answer: null };
    const na = normalizeHalfRaw(anchorRaw);
    const hit = pairs.find((p) => normalizeHalfRaw(p.right) === na);
    if (hit) return { ok: true, answer: hit.left };
    return { ok: false, answer: null };
  }

  const mBlankSecond = qStr.match(new RegExp('^(.+?)，\\s*' + blankPat + '(?:[。！？…；]|$)'));
  if (mBlankSecond) {
    const anchorRaw = mBlankSecond[1].replace(/^[。！？…，；]+/g, '').replace(/[。！？…；]+$/g, '').trim();
    if (!anchorRaw || anchorRaw.includes('_') || /^…+$/.test(anchorRaw)) return { ok: false, answer: null };
    const na = normalizeHalfRaw(anchorRaw);
    const hit = pairs.find((p) => normalizeHalfRaw(p.left) === na);
    if (hit) return { ok: true, answer: hit.right };
    return { ok: false, answer: null };
  }

  return { ok: false, answer: null };
}

// 校验题目
function repairDuelQuestionFromFullPoem(item) {
  if (!item || !item.question || !item.full_poem) return null;
  const { ok, answer } = deriveAdjacentAnswerFromPoem(item.question, item.full_poem);
  if (!ok || !answer) {
    console.warn('[aiService] 接句题与全文偶句无法对齐，已丢弃:', {
      title: item.title,
      question: item.question,
      aiAnswer: item.answer
    });
    return null;
  }
  const prev = normalizeHalfRaw(item.answer);
  const next = normalizeHalfRaw(answer);
  if (prev !== next) {
    console.warn('[aiService] 接句题答案已按偶句表修正:', {
      title: item.title,
      question: item.question,
      was: item.answer,
      now: answer
    });
  }
  return { ...item, answer };
}

// 闯关对战出题
async function generateDuelQuestions(count = 1, excludeTitles = [], attempt = 0) {
  const MAX_API_ATTEMPTS = 4;
  try {
    const apiKey = config.ai.apiKey;
    if (!apiKey) {
      throw new AIError(AI_ERRORS.AUTH_FAILED, 'API密钥缺失');
    }

    const excludeText = excludeTitles.length > 0
      ? `\n以下诗词的标题不要使用（已被使用过）：\n${excludeTitles.map(t => `- ${t}`).join('\n')}`
      : '';

    const batchSize = Math.min(14, Math.max(count + 8, 6));

    const prompt = `你是一个古诗词教育专家，请生成高质量的诗词接句题目，供双人闯关对战使用。

硬性规则：
1. full_poem 必须是该诗词完整正文，句读齐全
2. 题型只能是：上句填下句 或 下句填上句
3. question、answer、full_poem 三者必须自洽
4. 生成 ${batchSize} 道，标题不重复，不使用：${excludeTitles.length > 0 ? excludeTitles.join('、') : '无'}${excludeText}

请严格按照以下JSON格式返回：
{
  "questions": [
    {
      "question": "床前明月光，____。",
      "answer": "疑是地上霜",
      "full_poem": "床前明月光，疑是地上霜。举头望明月，低头思故乡。",
      "title": "静夜思",
      "author": "李白",
      "type": "上句填下句",
      "analysis": "此句出自李白《静夜思》，描写了诗人在寂静夜晚对故乡的思念"
    }
  ]
}`;

    const requestData = {
      model: config.ai.model,
      messages: [
        {
          role: "system",
          content: "你是一位严格专业的古诗词专家，只返回JSON格式的题目，不返回任何其他文字。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.82,
      max_tokens: 2800,
      top_p: 0.55,
      stream: false,
      response_format: { type: "json_object" }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.ai.timeout || 30000);

    try {
      const response = await fetchChatWithFallback(requestData, { signal: controller.signal, taskName: 'generateDuelQuestions' });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('[aiService] 闯关对战出题API失败:', response.status);
        if (attempt + 1 < MAX_API_ATTEMPTS) {
          return generateDuelQuestions(count, excludeTitles, attempt + 1);
        }
        throw new AIError(AI_ERRORS.UNAVAILABLE, '生成对战题目失败');
      }

      const responseData = await response.json();
      const content = responseData.choices[0].message.content;
      console.log('[aiService] 闯关对战AI出题原始输出:', content);

      let aiResult;
      try {
        aiResult = JSON.parse(content);
      } catch (parseError) {
        console.error('[aiService] 闯关对战出题JSON解析失败:', parseError);
        if (attempt + 1 < MAX_API_ATTEMPTS) {
          return generateDuelQuestions(count, excludeTitles, attempt + 1);
        }
        throw new AIError(AI_ERRORS.INVALID_RESPONSE, '解析对战题目失败');
      }

      if (!aiResult.questions || !Array.isArray(aiResult.questions)) {
        if (attempt + 1 < MAX_API_ATTEMPTS) {
          return generateDuelQuestions(count, excludeTitles, attempt + 1);
        }
        throw new AIError(AI_ERRORS.INVALID_RESPONSE, '生成的题目格式不正确');
      }

      const excludeSet = new Set(excludeTitles || []);
      const repaired = aiResult.questions
        .map(repairDuelQuestionFromFullPoem)
        .filter(Boolean)
        .filter((q) => q.title && !excludeSet.has(q.title));

      if (repaired.length >= count) {
        return { questions: repaired.slice(0, count) };
      }
      if (attempt + 1 < MAX_API_ATTEMPTS) {
        console.warn('[aiService] 对战有效题不足，重试出题:', { need: count, got: repaired.length, attempt });
        return generateDuelQuestions(count, excludeTitles, attempt + 1);
      }
      return { questions: repaired };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('[aiService] 闯关对战出题失败:', error.message);
    if (attempt + 1 < MAX_API_ATTEMPTS) {
      return generateDuelQuestions(count, excludeTitles, attempt + 1);
    }
    throw error;
  }
}


// 情感/题材映射
const EMOTION_THEME_MAP = {
  '思乡': { label: '思乡', keywords: ['乡', '思乡', '故乡', '归', '家', '归家', '归乡', '家乡', '故里', '客居', '羁旅'], weight: 30 },
  '离别': { label: '离别', keywords: ['送别', '离别', '分手', '相送', '赠', '饯', '别离', '辞别', '作别', '握别', '洒泪', '折柳', '长亭'], weight: 30 },
  '思念': { label: '思念', keywords: ['思', '念', '想', '思君', '思人', '想念', '思慕', '牵挂', '忆', '怀', '追忆', '相忆', '入梦'], weight: 25 },
  '怀人': { label: '怀人', keywords: ['怀人', '寄友', '赠友', '寄远', '怀旧', '故人', '旧友', '知音', '故交', '思友'], weight: 25 },
  '闲适': { label: '闲适', keywords: ['闲', '悠然', '隐居', '隐', '归隐', '隐者', '山林', '林泉', '田园', '茅舍', '溪', '垂钓'], weight: 25 },
  '孤独': { label: '孤独', keywords: ['孤', '独', '寂', '愁', '惆怅', '凄', '冷', '寒', '寂寞', '孤灯', '孤影', '无眠', '辗转'], weight: 20 },
  '豪放': { label: '豪放', keywords: ['豪', '壮', '万丈', '胸怀', '壮志', '豪情', '慷慨', '壮阔', '磅礴', '大气', '冲天'], weight: 20 },
  '婉约': { label: '婉约', keywords: ['婉', '柔', '细腻', '含蓄', '低回', '缠绵', '婉转', '柔情'], weight: 20 },
  '爱国': { label: '爱国', keywords: ['忠', '报国', '杀敌', '边塞', '从军', '出征', '收复', '中原', '山河', '家国', '社稷', '忧国', '报君'], weight: 25 },
  '感伤': { label: '感伤', keywords: ['伤', '悲', '叹', '惜', '哀', '怜', '可怜', '惘然', '怅', '惋惜', '长叹', '泪', '泣'], weight: 15 },
  '旷达': { label: '旷达', keywords: ['旷', '达', '豁达', '释然', '放下', '无求', '随缘', '自在', '逍遥', '飘逸'], weight: 20 },
  '山水': { label: '山水', keywords: ['山', '水', '江', '河', '湖', '海', '峰', '岭', '瀑', '溪', '潭', '泉', '舟', '帆', '渡口'], weight: 20 },
  '田园': { label: '田园', keywords: ['田', '亩', '桑', '麻', '稻', '麦', '耕', '农', '村', '农家', '牧', '童', '锄', '桑麻', '鸡犬', '猪'], weight: 20 },
  '边塞': { label: '边塞', keywords: ['塞', '关', '羌', '胡', '敌', '胡马', '烽火', '长城', '大漠', '沙', '征', '戍', '将军', '士卒', '金鼓', '铁衣'], weight: 25 },
  '送别': { label: '送别', keywords: ['送', '别', '离', '远', '之', '赴', '行', '去', '辞', '赠', '留别', '奉送', '祖饯', '长亭', '灞桥'], weight: 25 },
  '咏物': { label: '咏物', keywords: ['咏', '赞', '颂', '品', '吟'], weight: 15 },
  '怀古': { label: '怀古', keywords: ['古', '遗迹', '故', '旧', '前朝', '当年', '曾', '忆往', '过', '凭吊', '怀古'], weight: 20 },
  '节序': { label: '节序', keywords: ['春', '夏', '秋', '冬', '元', '除夕', '端午', '中秋', '重阳', '清明', '寒食', '七夕', '元宵', '除夜'], weight: 20 },
  '闺怨': { label: '闺怨', keywords: ['闺', '妾', '思妇', '征妇', '闺中', '玉阶', '罗幕', '春闺', '闺怨'], weight: 20 },
  '羁旅': { label: '羁旅', keywords: ['客', '旅', '游', '宦', '漂', '逆旅', '客舍', '羁旅', '落魄', '飘零', '孤旅', '羁愁'], weight: 25 },
  '月': { label: '月', keywords: ['月', '明月', '月光', '月色', '圆月', '月圆', '皎洁'], weight: 15 },
  '酒': { label: '酒', keywords: ['酒', '醉', '杯', '酌', '饮', '酣', '壶', '瓮', '醪', '浊酒', '清酒', '劝酒'], weight: 15 },
  '花': { label: '花', keywords: ['花', '落花', '花瓣', '花开', '花落', '春花', '残花', '花飞'], weight: 15 },
  '雁': { label: '雁', keywords: ['雁', '鸿雁', '归雁', '飞雁', '雁声', '雁行'], weight: 15 },
  '柳': { label: '柳', keywords: ['柳', '杨柳', '柳枝', '柳色', '垂柳', '折柳', '柳绵'], weight: 15 },
  '雨': { label: '雨', keywords: ['雨', '春雨', '细雨', '夜雨', '雨声', '雨滴', '雨落'], weight: 15 },
  '雪': { label: '雪', keywords: ['雪', '白雪', '雪飞', '雪落', '飞雪', '瑞雪'], weight: 15 },
  '风': { label: '风', keywords: ['风', '春风', '秋风', '西风', '东风', '风起', '风来'], weight: 12 },
};

// 检测情感
function detectSearchEmotion(query) {
  const q = query.toLowerCase().trim();
  if (!q) return { intent: 'general', emotion: null, emotionScore: 0, matchedTheme: null };

  let bestMatch = { theme: null, score: 0, keywords: [] };

  for (const [theme, config] of Object.entries(EMOTION_THEME_MAP)) {
    for (const kw of config.keywords) {
      if (q.includes(kw) || kw.includes(q)) {
        const isExact = q === kw;
        const isStartsWith = q.startsWith(kw) || kw.startsWith(q);
        const score = isExact ? config.weight + 20 : isStartsWith ? config.weight + 10 : config.weight;
        if (score > bestMatch.score) {
          bestMatch = { theme, score, keywords: [kw] };
        } else if (kw === bestMatch.keywords[0] && score === bestMatch.score) {
          bestMatch.keywords.push(kw);
        }
      }
    }
  }

  if (bestMatch.score === 0) return { intent: 'general', emotion: null, emotionScore: 0, matchedTheme: null };

  const emotionLabel = EMOTION_THEME_MAP[bestMatch.theme]?.label || bestMatch.theme;
  let intent = 'general';

  const emotionKeywords = ['思乡', '离别', '思念', '怀人', '孤独', '感伤', '旷达', '豪放', '婉约', '爱国'];
  const themeKeywords = ['山水', '田园', '边塞', '咏物', '怀古', '节序', '闺怨', '羁旅'];
  const intentKeywords = ['意象', '月', '酒', '花', '雁', '柳', '雨', '雪', '风'];

  if (emotionKeywords.includes(bestMatch.theme)) intent = 'emotion';
  else if (themeKeywords.includes(bestMatch.theme)) intent = 'theme';
  else if (intentKeywords.includes(bestMatch.theme)) intent = 'imagery';

  return {
    intent,
    emotion: emotionLabel,
    emotionScore: Math.min(bestMatch.score / 50, 1.0),
    matchedTheme: bestMatch.theme,
  };
}

// 情感过滤
function scorePoemsByEmotion(matchedTheme, poems) {
  if (!matchedTheme || !EMOTION_THEME_MAP[matchedTheme]) return [];

  const config = EMOTION_THEME_MAP[matchedTheme];
  const keywords = config.keywords;

  return poems
    .map(p => {
      let score = 0;
      const content = (p.content || '').toLowerCase();
      const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : (p.tags || '').toLowerCase();
      const combined = content + ' ' + tags;

      for (const kw of keywords) {
        const count = (combined.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (count > 0) score += count * 5;
      }

      if (p.tags && Array.isArray(p.tags)) {
        if (p.tags.some(t => t === config.label || t.includes(config.label))) {
          score += 30;
        }
      }

      return { poem: p, emotionScore: score };
    })
    .filter(item => item.emotionScore > 0)
    .sort((a, b) => b.emotionScore - a.emotionScore);
}

// 语义搜索
// 诗词库内存缓存，避免每次搜索都全量加载
let _poemsCache = null;
let _poemsCacheTime = 0;
const _POEMS_CACHE_TTL = 5 * 60 * 1000; // 5分钟刷新

async function _loadPoemsWithCache() {
  const now = Date.now();
  if (_poemsCache && (now - _poemsCacheTime) < _POEMS_CACHE_TTL) {
    return _poemsCache;
  }
  const db = require('../utils/db');
  const result = await db.query('SELECT * FROM poems ORDER BY id');
  _poemsCache = result.rows || [];
  _poemsCacheTime = now;
  return _poemsCache;
}

async function aiPoemSearch(query, limit = 50) {
  const apiKey = config.ai.apiKey;

  let poems = [];
  try {
    poems = await _loadPoemsWithCache();
  } catch (err) {
    console.warn('[aiService] 读取诗词库失败:', err.message);
    return { poems: [], didYouMean: null, intent: 'general', emotion: null };
  }

  if (poems.length === 0) return { poems: [], didYouMean: null, intent: 'general', emotion: null };

  const emotionResult = detectSearchEmotion(query);

  if (apiKey) {
    try {
      const rankedPoems = await rankPoemsWithAI(query, poems, apiKey, emotionResult);
      return {
        poems: rankedPoems.slice(0, limit),
        didYouMean: rankedPoems.didYouMean || null,
        intent: emotionResult.intent,
        emotion: emotionResult.emotion,
      };
    } catch (err) {
      console.warn('[aiService] AI语义排序失败:', err.message);
    }
  }

  const fbResult = fallbackSearch(query, poems, limit);
  return { ...fbResult, intent: emotionResult.intent, emotion: emotionResult.emotion, degraded: true };
}

// AI排序
async function rankPoemsWithAI(query, poems, apiKey, emotionResult) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.ai.timeout || 30000);

  const poemSamples = poems.slice(0, 50).map(p => ({
    id: p.id,
    title: p.title,
    author: p.author || '佚名',
    dynasty: p.dynasty || '未知',
    content: (p.content || '').substring(0, 100),
  }));

  const emotionContext = emotionResult && emotionResult.matchedTheme
    ? `\n重要提示：用户搜索词 "${query}" 被识别为【${emotionResult.emotion}】主题，请优先返回与该主题/情感高度相关的诗词。`
    : '';

  const prompt = `你是一个古诗词搜索引擎的智能排序器。用户输入了搜索关键词"${query}"，请从以下诗词列表中，找出与关键词最相关的诗词，并按相关度从高到低排序。
${emotionContext}

返回格式（严格JSON）：
{
  "ranking": [poem_id_1, poem_id_2, ...],
  "didYouMean": "更优的搜索词"或null
}

诗词列表：
${JSON.stringify(poemSamples, null, 2)}

只输出JSON，不要解释，不要markdown代码块。`;

  try {
    const response = await fetchChatWithFallback({
      model: config.ai.model,
      messages: [
        { role: 'system', content: '你是一个专业的古诗词搜索引擎排序助手。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 800,
      top_p: 0.8,
      stream: false,
    }, { signal: controller.signal, taskName: 'rankPoemsWithAI' });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[aiService] rankPoemsWithAI失败:', response.status, errText);
      throw new AIError(response.status === 429 ? AI_ERRORS.RATE_LIMITED : AI_ERRORS.UNAVAILABLE, 'AI排序请求失败');
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';
    if (!raw) throw new AIError(AI_ERRORS.INVALID_RESPONSE, 'AI返回内容为空');

    let jsonStr = raw;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    else {
      const braceStart = raw.indexOf('{');
      const braceEnd = raw.lastIndexOf('}');
      if (braceStart !== -1 && braceEnd !== -1) jsonStr = raw.substring(braceStart, braceEnd + 1);
    }

    const parsed = JSON.parse(jsonStr);
    const ranking = parsed.ranking || [];
    const didYouMean = parsed.didYouMean || null;

    const poemMap = new Map(poems.map(p => [p.id, p]));
    const ranked = ranking
      .map(id => poemMap.get(id))
      .filter(Boolean);

    const rankedIds = new Set(ranking);
    poems.forEach(p => { if (!rankedIds.has(p.id)) ranked.push(p); });

    ranked.didYouMean = didYouMean;
    return ranked;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[aiService] rankPoemsWithAI异常:', error.message);
    throw error;
  }
}

// 关键词搜索兜底
function fallbackSearch(query, poems, limit) {
  const q = query.toLowerCase().trim();

  const emotionResult = detectSearchEmotion(query);
  const matchedTheme = emotionResult?.matchedTheme;

  const scored = poems.map(p => {
    let score = 0;
    const title = (p.title || '').toLowerCase();
    const author = (p.author || '').toLowerCase();
    const content = (p.content || '').toLowerCase();
    const dynasty = (p.dynasty || '').toLowerCase();
    const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : (p.tags || '').toLowerCase();

    if (q.length > 0) {
      if (title === q) score += 100;
      else if (title.includes(q)) score += 60;
      if (author === q) score += 50;
      else if (author.includes(q)) score += 30;
      if (content.includes(q)) score += 20;
      if (dynasty.includes(q)) score += 10;
    }

    const keywords = q.split(/\s+/).filter(k => k.length > 0);
    keywords.forEach(kw => {
      const isSingleChar = kw.length === 1;
      const titleWeight = isSingleChar ? 20 : 40;
      const authorWeight = isSingleChar ? 15 : 25;
      const contentWeight = isSingleChar ? 8 : 15;
      if (title.includes(kw)) score += titleWeight;
      if (author.includes(kw)) score += authorWeight;
      if (content.includes(kw)) score += contentWeight;
    });

    if (matchedTheme && EMOTION_THEME_MAP[matchedTheme]) {
      const config = EMOTION_THEME_MAP[matchedTheme];
      const combined = content + ' ' + tags;
      for (const kw of config.keywords) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const count = (combined.match(new RegExp(escaped, 'g')) || []).length;
        if (count > 0) score += count * 8;
      }
      if (p.tags && Array.isArray(p.tags)) {
        if (p.tags.some(t => t === config.label || t.includes(config.label))) {
          score += 30;
        }
      }
    }

    return { poem: p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const keywordResults = scored.filter(s => s.score > 0).slice(0, limit).map(s => s.poem);
  if (keywordResults.length === 0 && matchedTheme) {
    const emotionScored = scorePoemsByEmotion(matchedTheme, poems);
    if (emotionScored.length > 0) {
      return {
        poems: emotionScored.slice(0, limit).map(s => s.poem),
        didYouMean: null,
        intent: emotionResult.intent,
        emotion: emotionResult.emotion,
        emotionOnly: true,
      };
    }
  }

  return {
    poems: keywordResults.length > 0 ? keywordResults : scored.slice(0, limit).map(s => s.poem),
    didYouMean: null,
  };
}

// 分析搜索结果
async function analyzeSearchResults(query, poems, emotionResult) {
  const apiKey = config.ai.apiKey;
  if (!apiKey) return generateFallbackAnalysis(query, poems, emotionResult);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.ai.timeout || 30000);

  const poemList = poems.slice(0, 8).map(p =>
    `《${p.title || '未知'}》${p.author || '佚名'}（${p.dynasty || '未知'}）：${(p.content || '').substring(0, 80)}`
  ).join('\n');

  const emotionContext = emotionResult && emotionResult.emotion
    ? `\n用户此次搜索被系统识别为【${emotionResult.emotion}】主题，请在解读中重点围绕这一主题展开。`
    : '';

  const prompt = `你是一位古诗词研究专家。用户搜索了关键词"${query}"，以下是与该词最相关的诗词列表：
${emotionContext}

${poemList}

请分析这些诗词，生成一份简洁的解读：
{
  "summary": "一段50-80字的中文总结",
  "tags": ["朝代标签", "题材标签", ...],
  "suggestions": ["相关搜索词1", "相关搜索词2", ...]
}

要求：
- summary要生动有趣
- tags用简短的词语概括
- suggestions要有引导性
- 只输出JSON，不要任何其他内容`;

  try {
    const response = await fetchChatWithFallback({
      model: config.ai.model,
      messages: [
        { role: 'system', content: '你是一位古诗词研究专家。回答必须是JSON格式。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
      top_p: 0.8,
      stream: false,
    }, { signal: controller.signal, taskName: 'analyzeSearchResults' });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[aiService] analyzeSearchResults失败:', response.status, errText);
      return generateFallbackAnalysis(query, poems, emotionResult);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';
    if (!raw) return generateFallbackAnalysis(query, poems, emotionResult);

    let jsonStr = raw;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    else {
      const braceStart = raw.indexOf('{');
      const braceEnd = raw.lastIndexOf('}');
      if (braceStart !== -1 && braceEnd !== -1) jsonStr = raw.substring(braceStart, braceEnd + 1);
    }

    try {
      const result = JSON.parse(jsonStr);
      if (!result.summary) return generateFallbackAnalysis(query, poems, emotionResult);
      return result;
    } catch (parseErr) {
      console.warn('[aiService] analyzeSearchResults JSON解析失败:', parseErr.message);
      return generateFallbackAnalysis(query, poems, emotionResult);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[aiService] analyzeSearchResults异常:', error.message);
    return generateFallbackAnalysis(query, poems, emotionResult);
  }
}

// 兜底分析
function generateFallbackAnalysis(query, poems, emotionResult) {
  const dynasties = {};
  const authors = {};
  poems.forEach(p => {
    if (p.dynasty) dynasties[p.dynasty] = (dynasties[p.dynasty] || 0) + 1;
    if (p.author) authors[p.author] = (authors[p.author] || 0) + 1;
  });

  const topDynasty = Object.entries(dynasties).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  const topAuthor = Object.entries(authors).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  const emotion = emotionResult?.emotion || '';
  const intent = emotionResult?.intent || 'general';

  const suggestions = [];
  const q = query.toLowerCase();
  const emotionRelated = {
    '思乡': ['送别', '月', '归', '家'],
    '离别': ['思念', '酒', '柳', '长亭'],
    '思念': ['怀人', '月', '雁', '书'],
    '山水': ['田园', '隐居', '隐', '渔樵'],
    '边塞': ['爱国', '从军', '沙场', '金鼓'],
    '闺怨': ['春怨', '红颜', '独守', '玉阶'],
    '羁旅': ['孤独', '无眠', '客路', '漂泊'],
    '闲适': ['田园', '悠然', '归隐', '溪'],
    '孤独': ['感伤', '无眠', '夜', '寂'],
  };

  if (emotion && emotionRelated[emotion]) {
    emotionRelated[emotion].forEach(s => { if (!q.includes(s.toLowerCase())) suggestions.push(s); });
  } else {
    if (!q.includes('送别')) suggestions.push('送别');
    if (!q.includes('思乡')) suggestions.push('思乡');
    if (!q.includes('月')) suggestions.push('月');
    if (!q.includes('春')) suggestions.push('春');
    if (!q.includes('李白')) suggestions.push('李白');
    if (!q.includes('杜甫')) suggestions.push('杜甫');
  }

  let summary = '';
  if (emotion && poems.length > 0) {
    const intentText = intent === 'emotion' ? '情感' : intent === 'theme' ? '题材' : '意象';
    summary = `为您找到 ${poems.length} 首与"${emotion}"相关的诗词，${intentText}鲜明，多为${topDynasty || '各代'}${topAuthor ? '·' + topAuthor : ''}所作，富有感染力。`;
  } else {
    summary = `为您找到 ${poems.length} 首与"${query}"相关的诗词，涵盖${topDynasty || '各代'}时期，以${topAuthor || '佚名'}的诗作最为丰富。`;
  }

  return {
    summary,
    tags: [emotion, topDynasty, topAuthor].filter(Boolean).slice(0, 4),
    suggestions: suggestions.slice(0, 4),
  };
}

// 获取创作背景
async function getPoemBackground(title, author, dynasty, content) {
  const apiKey = config.ai.apiKey;
  if (!apiKey) {
      throw new AIError(AI_ERRORS.AUTH_FAILED, 'API密钥缺失');
    }

  const prompt = `为《${title || '未知'}》写150字创作背景，包含：创作场景、缘由、核心情感。文风优美亲切。`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.ai.timeout || 30000);

  try {
    const response = await fetchChatWithFallback({
      model: config.ai.model,
      messages: [
        { role: 'system', content: '你是一位博学儒雅的古代文学学者，擅长用简洁优美的语言讲述诗词背后的故事。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 400,
      top_p: 0.85,
      stream: false
    }, { signal: controller.signal, taskName: 'getPoemBackground' });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[aiService] getPoemBackground 失败:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const backgroundContent = data.choices?.[0]?.message?.content?.trim() || '';
    if (!backgroundContent) return null;

    const tips = `闭上眼睛，想象自己穿越到了${author || '诗人'}身边，站在他身旁感受那一刻的氛围。当你理解了诗人当时的心境，这首诗就不再只是文字，而是一幅流动的画卷、一段鲜活的人生。`;

    return { background: backgroundContent, tips };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[aiService] getPoemBackground 异常:', error.message);
    throw error;
  }
}

// 获取趣味故事
async function getPoemStory(title, author, content) {
  const apiKey = config.zhipu.apiKey;
  if (!apiKey) {
      throw new AIError(AI_ERRORS.AUTH_FAILED, 'API密钥缺失');
    }

  const prompt = `用100字讲一个关于《${title || '未知'}》的趣味故事，可以是诗人趣事或诗词典故。`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.zhipu.timeout || 30000);

  try {
    const response = await fetchChatWithFallback({
      model: config.zhipu.model,
      messages: [
        { role: 'system', content: '你是一位风趣幽默的故事大王，擅长将诗词背后的故事讲得生动有趣。' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.8
    }, { signal: controller.signal, taskName: 'getPoemStory' });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[aiService] getPoemStory 失败:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const storyContent = data.choices?.[0]?.message?.content?.trim() || '';
    return storyContent || null;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[aiService] getPoemStory 异常:', error.message);
    throw error;
  }
}

// 获取诵读指南
async function getRecitationGuide(title, author, content, dynasty) {
  const apiKey = config.ai.apiKey;
  if (!apiKey) {
      throw new AIError(AI_ERRORS.AUTH_FAILED, 'API密钥缺失');
    }

  const lines = content.split('\n').filter(l => l.trim());
  const isSevenChar = lines[0] && lines[0].replace(/[，。！？；：、""''（）【】]/g, '').length === 7;
  const charType = isSevenChar ? '七言' : '五言';
  const poemType = lines.length === 4 ? '绝句' : lines.length === 8 ? '律诗' : '古体诗';

  const prompt = `为《${title || '未知'}》写诵读指南JSON：{"rhythm":"节奏停顿说明","emotion":"情感把控要点","tips":["技巧1","技巧2","技巧3"]}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.ai.timeout || 30000);

  try {
    const response = await fetchChatWithFallback({
      model: config.ai.model,
      messages: [
        { role: 'system', content: '你是一位专业资深的朗诵艺术指导老师。你的回答必须是标准JSON格式。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 800,
      top_p: 0.85,
      stream: false
    }, { signal: controller.signal, taskName: 'getRecitationGuide' });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[aiService] getRecitationGuide 失败:', response.status, errText);
      return getBuiltinRecitationGuide(title, content);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';

    if (!raw) return getBuiltinRecitationGuide(title, content);

    let jsonStr = raw;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    else {
      const braceStart = raw.indexOf('{');
      const braceEnd = raw.lastIndexOf('}');
      if (braceStart !== -1 && braceEnd !== -1) {
        jsonStr = raw.substring(braceStart, braceEnd + 1);
      }
    }

    try {
      const guide = JSON.parse(jsonStr);
      if (typeof guide.tips === 'string') {
        guide.tips = guide.tips.split(/[、，,；;\\n]+/).filter(t => t.trim()).slice(0, 4);
      }
      if (!Array.isArray(guide.tips) || guide.tips.length === 0) {
        guide.tips = ['先理解诗意，再带着情感朗读', '注意诗句的押韵字', '配合手势和表情', '反复练习'];
      }
      return guide;
    } catch (parseErr) {
      console.warn('[aiService] getRecitationGuide JSON解析失败:', parseErr.message, 'raw:', raw);
      return getBuiltinRecitationGuide(title, content);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[aiService] getRecitationGuide 异常:', error.message);
    throw error;
  }
}

// 内置诵读指南兜底数据
function getBuiltinRecitationGuide(title, content) {
  const lines = (content || '').split('\n').filter(l => l.trim());
  const isFive = lines[0] && lines[0].length <= 7;
  const poemType = isFive ? '五言' : '七言';

  return {
    rhythm: `这首${poemType}${poemType === '五言' ? '绝句' : '律诗'}的节奏一般为${isFive ? '221' : '2221'}式。例如第一句朗读时要注意在第二个字后稍作停顿，形成"${lines[0] ? lines[0].slice(0, 2) + '，' + lines[0].slice(2) : ''}"的节奏感。`,
    emotion: `朗诵时要注意"起承转合"的情感变化：起句要平缓引入，承句要自然承接，转句要情感递进，合句要收束有力。读的过程中要注意轻重缓急，不要一味平铺直叙。`,
    tips: [
      '先理解诗意，再带着情感朗读，效果会更好',
      '注意诗句的押韵字，朗读时适当延长韵脚的读音',
      '可以配合手势和表情，增强朗诵的感染力',
      '反复练习，注意每句最后一个字的声调变化'
    ]
  };
}

// 面向前端的纯文本流式接口。结构化 JSON 业务继续使用上面的 JSON 调用，
// 需要即时展示的讲解/助教内容统一通过智谱 SSE 输出 Markdown 文本。
async function streamAIText({
  type = 'tutor',
  poem = '',
  title = '',
  author = '',
  question = '',
  history = [],
  explanationType = '',
  dynasty = '',
  onToken
} = {}) {
  if (!config.zhipu.apiKey) {
    throw new AIError(AI_ERRORS.AUTH_FAILED, '智谱 API 密钥缺失');
  }

  const systemContent = `你是一位亲切、严谨的中文古诗词老师。
质量要求：
1. 只能依据用户提供的诗文、题目和作者回答，不要编造诗句、典故、年代或作者经历；不确定的背景要明确说“资料有不同说法”或“无法仅凭诗文确定”。
2. 必须引用用户提供的原句来支撑分析，引用时保持原字，不得改写成似是而非的诗句。
3. 先给结论，再给依据；避免“这首诗表达了深刻情感”等空泛套话。
4. 输出有效、简洁的 Markdown，合理使用小标题、加粗和列表；不要输出 JSON、HTML 或“以下是答案”等套话。
5. 绝对不要使用三个反引号代码围栏包裹 Markdown，也不要把正文写成代码块。`;
  let userPrompt = '';

  if (type === 'tutor') {
    userPrompt = buildTutorPrompt(poem, title, author, question, history)
      + '\n请先直接回答学生的问题，再用1-2处原诗句解释依据；总长度控制在80-140字，使用 Markdown 段落或短列表。';
  } else if (type === 'explain') {
    userPrompt = `请赏析古诗《${title || '未知'}》（${author || '佚名'}）：\n\n${poem}\n\n`
      + (explanationType ? `请重点从“${explanationType}”角度分析。` : '请依次输出“白话理解”“关键词与手法”“意境与情感”“思考问题”四个小节。')
      + '\n每个小节都必须结合原诗中的具体字词；思考问题列出2-3个开放问题；总长度控制在350字以内。';
  } else if (type === 'background') {
    userPrompt = `请用 Markdown 写《${title || '未知'}》（${author || '佚名'}）的创作背景，使用“时代与背景”“创作场景”“情感落点”等清晰小标题，结合${dynasty || '其时代'}、可能的创作场景、缘由和核心情感，控制在120-180字。只写有可靠依据的作者与时代信息；不要为了凑背景添加具体历史事件、地点、隐居经历或“某年某地创作”等未经确认的细节。史实不确定时请标注“传说”或“资料有不同说法”；无法确认时直接写“具体情况无法仅凭现有资料确定”，再改为分析诗文可见的场景与情感。不要把诗句中的推断补写成真实史实。`;
  } else if (type === 'story') {
    userPrompt = `请用 Markdown 讲一个关于《${title || '未知'}》（${author || '佚名'}）的100字以内趣味故事，可以是诗词典故或有可靠依据的诗人轶事。无法确认真伪的内容必须标注“传说”，不要杜撰具体历史细节。`;
  } else if (type === 'recitation-guide') {
    userPrompt = `请为《${title || '未知'}》（${author || '佚名'}）制定诵读指南。诗文如下：\n${poem}\n\n请直接输出 Markdown 正文，不要使用三个反引号代码围栏。输出“节奏停顿”“情感把控”“练习技巧”三个小节。停顿必须根据实际句式，不要机械套用五言/七言模板；技巧列出3条可操作建议。`;
  } else if (type === 'rewrite') {
    userPrompt = `请将《${title || '未知'}》（${author || '佚名'}）改写成通俗、优美的现代白话文。原诗：\n${poem}\n\n逐句保留原诗的意象、动作和情感，不新增原诗没有的情节；使用 Markdown 输出，150字以内。`;
  } else if (type === 'dimension') {
    userPrompt = `请从“${question || '艺术特色'}”维度赏析《${title || '未知'}》（${author || '佚名'}）：\n${poem}\n\n至少引用一处原句说明；使用 Markdown 输出，150字以内。`;
  } else if (type === 'advice') {
    userPrompt = `请为正在学习《${title || '未知'}》（${author || '佚名'}）的学生提供3条具体、可执行的学习建议。诗文：\n${poem}\n\n建议必须与这首诗的内容相关，使用 Markdown 列表输出，150字以内。`;
  } else {
    throw new AIError(AI_ERRORS.BAD_REQUEST, `Unsupported stream type: ${type}`);
  }

  return withFallbackStream({
    model: config.zhipu.model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 800
  }, {
    timeout: 90000,
    taskName: `streamAIText:${type}`,
    onToken
  });
}

module.exports = {
  getAIExplanation,
  checkRecitation,
  handleAIExplanation,
  getAIResponse,
  getAIrewritePoem,
  getDimensionExplanation,
  getLearningAdvice,
  getSimplifiedExplanation,
  getAIRecitationCheck,
  getCharInfo,
  callAIGenerateJSON,
  callZhipuGenerateJSON,
  generateChallengeQuestion,
  verifyChallengeAnswer,
  generateAIHelp,
  getAIGeneratedQuestions,
  generatePoemImage,
  evaluateFeihuaPoem,
  evaluateFeihua,
  generateDuelQuestions,
  repairDuelQuestionFromFullPoem,
  generatePoemSceneImage,
  spawn,
  getPoemBackground,
  getPoemStory,
  getRecitationGuide,
  aiPoemSearch,
  analyzeSearchResults,
  detectSearchEmotion,
  generateAuthorAvatar,
  generateTTS,
  streamAIText
};

// 生成诗句意境图
async function generatePoemSceneImage(poemLine, poemTitle, poemAuthor, lineNumber = null, totalLines = null) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      console.error('[aiService] 缺少智谱API密钥');
      throw new AIError(AI_ERRORS.AUTH_FAILED, 'AI生图服务未配置API密钥');
    }

    const lineHint =
      lineNumber != null && totalLines != null && totalLines > 0
        ? `全诗共${totalLines}句，当前要画的是其中第${lineNumber}句。`
        : '';

    const prompt = `你正在为古诗《${poemTitle}》（作者：${poemAuthor}）生成一幅「单句诗意图」配图。${lineHint}
【必须表现的诗句】「${poemLine}」

画面要求：
1. 紧扣这一句诗里出现的具体意象（如烟霞、香炉峰、飞瀑、明月、孤舟、杨柳等），画出中国古典诗词应有的意境美与诗意氛围
2. 采用中国传统审美：水墨晕染、青绿山水、工笔意境或淡彩写意均可，整体典雅含蓄、留白有度、富有诗意
3. 不要出现现代建筑、轮船铁塔、公路汽车等与古诗意境不符的元素
4. 高清、构图疏朗，光影柔和，画面中不要出现任何文字、水印、logo`;

    console.log('[aiService] 文生图请求:', { title: poemTitle, promptLength: prompt.length });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'cogview-3-flash',
          prompt: prompt,
          size: '1024x1024'
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[aiService] 文生图失败:', response.status, errorData);
        return { success: false, url: null, message: '图像生成请求失败' };
      }

      const data = await response.json();
      const imageUrl = data
        && Array.isArray(data.data)
        && data.data[0]
        && data.data[0].url;

      if (!imageUrl) {
        console.error('[aiService] 文生图API返回格式错误:', JSON.stringify(data).slice(0, 500));
        return { success: false, url: null, message: 'API返回格式错误' };
      }

      console.log('[aiService] 文生图成功:', imageUrl);
      return {
        success: true,
        url: imageUrl,
        model: 'cogview-3-flash'
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('[aiService] 文生图失败:', error);
    return { success: false, url: null, message: '文生图请求失败' };
  }
}



async function generateAuthorAvatar(author) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      console.error('[aiService] 缺少智谱API密钥');
      return { success: false, url: null, message: 'API密钥未配置' };
    }

    const prompt = `一位中国古代诗人${author}的肖像画，中国传统水墨画风格，文人雅士形象，身着古代服饰，气质儒雅，背景淡雅，工笔细腻，高清画质，无文字无水印，正面半身像`;

    console.log('[aiService] 生成诗人头像:', { author, promptLength: prompt.length });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'cogview-3-flash',
          prompt: prompt,
          size: '1024x1024'
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[aiService] 生成头像失败:', response.status, errorData);
        return { success: false, url: null, message: '图像生成请求失败' };
      }

      const data = await response.json();
      const imageUrl = data
        && Array.isArray(data.data)
        && data.data[0]
        && data.data[0].url;

      if (!imageUrl) {
        console.error('[aiService] 头像API返回格式错误:', JSON.stringify(data).slice(0, 500));
        return { success: false, url: null, message: 'API返回格式错误' };
      }

      console.log('[aiService] 诗人头像生成成功:', imageUrl);
      return {
        success: true,
        url: imageUrl,
        model: 'cogview-3-flash'
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('[aiService] 生成诗人头像失败:', error);
    return { success: false, url: null, message: '生成失败，请稍后重试' };
  }
}

// 语音合成：MiMo 的 TTS 接口遵循 OpenAI Chat Completions 格式，
// 目标播报文本必须放在 assistant 消息中，user 消息用于描述演绎风格。
async function generateTTS(text) {
  const { apiKey, apiUrl, model, voice, style, timeout } = config.mimo;

  if (!apiKey) {
    console.error('[aiService] MiMo API 密钥未配置');
    throw new AIError(AI_ERRORS.AUTH_FAILED, 'MiMo 语音合成未配置 API 密钥');
  }

  if (typeof text !== 'string' || !text.trim()) {
    throw new AIError(AI_ERRORS.INVALID_RESPONSE, '语音合成文本不能为空');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    console.log('[aiService] 开始 MiMo 语音合成, model:', model, 'voice:', voice, '文本长度:', text.length);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: style },
          { role: 'assistant', content: text }
        ],
        audio: {
          format: 'wav',
          voice
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[aiService] MiMo 语音合成失败:', response.status, errorText.slice(0, 500));
      throw new AIError(
        response.status === 429 ? AI_ERRORS.RATE_LIMITED : AI_ERRORS.UNAVAILABLE,
        `MiMo 语音合成请求失败: ${response.status}`
      );
    }

    const data = await response.json().catch(() => null);
    const audioData = data?.choices?.[0]?.message?.audio?.data;
    if (typeof audioData !== 'string' || !audioData) {
      console.error('[aiService] MiMo 返回格式错误:', JSON.stringify(data).slice(0, 500));
      throw new AIError(AI_ERRORS.INVALID_RESPONSE, 'MiMo 返回格式错误，未找到音频数据');
    }

    // 兼容纯 Base64 和意外带 data URL 前缀的返回值。
    const base64Audio = audioData.includes(',') ? audioData.split(',').pop() : audioData;
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    if (!audioBuffer.length) {
      throw new AIError(AI_ERRORS.INVALID_RESPONSE, 'MiMo 返回的音频数据为空');
    }

    return audioBuffer;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new AIError(AI_ERRORS.TIMEOUT, 'MiMo 语音合成请求超时');
    }
    console.error('[aiService] MiMo 语音合成错误:', error.message);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  callZhipuGenerateJSON,
  callAIGenerateJSON,
  checkRecitation,
  handleAIExplanation,
  getAIExplanation,
  getAIResponse,
  getAIrewritePoem,
  getDimensionExplanation,
  getLearningAdvice,
  getSimplifiedExplanation,
  getAIRecitationCheck,
  getCharInfo,
  generateDuelQuestions,
  generateChallengeQuestion,
  verifyChallengeAnswer,
  generateAIHelp,
  getAIGeneratedQuestions,
  aiPoemSearch,
  generatePoemImage,
  evaluateFeihuaPoem,
  evaluateFeihua,
  repairDuelQuestionFromFullPoem,
  generateAuthorAvatar,
  generatePoemSceneImage,
  getPoemBackground,
  getPoemStory,
  getRecitationGuide,
  analyzeSearchResults,
  detectSearchEmotion,
  generateTTS,
  streamAIText
};
