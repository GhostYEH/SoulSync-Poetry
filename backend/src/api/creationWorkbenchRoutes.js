/**
 * AI诗词创作工作台后端路由
 * 扩展创作辅助接口，支持灵感生成、结构引导、续写推荐、接龙创作等新功能
 */

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const aiService = require('../services/aiService');

// AI调用限流Map
const aiRateLimitMap = new Map();

/**
 * 清理过期的限流记录
 */
setInterval(() => {
  const now = Date.now();
  for (const [userId, records] of aiRateLimitMap.entries()) {
    const filteredRecords = records.filter(record => now - record < 60000);
    if (filteredRecords.length === 0) {
      aiRateLimitMap.delete(userId);
    } else {
      aiRateLimitMap.set(userId, filteredRecords);
    }
  }
}, 3600000);

/**
 * 检查AI调用限流
 */
function checkAIRateLimit(userId) {
  const now = Date.now();
  if (!aiRateLimitMap.has(userId)) {
    aiRateLimitMap.set(userId, []);
  }
  const records = aiRateLimitMap.get(userId);
  const filteredRecords = records.filter(record => now - record < 60000);
  aiRateLimitMap.set(userId, filteredRecords);
  if (filteredRecords.length >= 5) return false;
  filteredRecords.push(now);
  aiRateLimitMap.set(userId, filteredRecords);
  return true;
}

const authenticateToken = require('../middleware/auth');
const optionalAuthenticateToken = authenticateToken.optionalAuthenticateToken;

/**
 * 转义用户输入
 */
function escapeString(str) {
  if (!str) return '';
  return String(str).replace(/[<>'"]/g, '');
}

/**
 * 验证润色结果质量
 * 检查是否包含乱码、无意义字符或英文
 */
function isValidPolishResult(poem, originalPoem) {
  if (!poem || typeof poem !== 'string') return false;
  
  const lines = poem.split('\n').filter(line => line.trim());
  const originalLines = originalPoem.split('\n').filter(line => line.trim());
  
  if (lines.length !== originalLines.length) return false;
  
  const invalidPatterns = [
    /[a-zA-Z]/g,           
    /[^\u4e00-\u9fa5\u3000-\u303f\s，。！？、；：""''《》「」【】]/g,  
    /\b(kuk|xxx|aaa|bbb|ccc|www|com|http)\b/gi,  
    /\s{2,}/g              
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const originalLine = originalLines[i].trim();
    
    if (!line) return false;
    
    const lineChars = normalizePoemLineChars(line);
    const originalChars = normalizePoemLineChars(originalLine);
    
    if (lineChars.length !== originalChars.length) return false;
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(line)) {
        console.warn('[polish] 发现无效内容:', line, '匹配:', pattern);
        return false;
      }
    }
  }
  
  return true;
}

/** 诗句行规范化（去空格标点，便于数字数） */
function normalizePoemLineChars(s) {
  if (!s) return '';
  return String(s).replace(/[\s\u3000《》「」""''。，、；：！？·\r\n]/g, '');
}

function extractChainAiLine(result) {
  if (!result || typeof result !== 'object') return '';
  const v = result.aiLine ?? result.line ?? result.nextLine ?? result.text;
  if (typeof v !== 'string') return '';
  return v.trim();
}

/** 校验句长是否正确 */
function isValidLineLength(aiLine, lineLength) {
  return normalizePoemLineChars(aiLine).length === lineLength;
}

function genreRule(genre) {
  if (genre === '宋词') return { lines: 1, charactersPerLine: 0, rhymeScheme: '依词牌与句式' };
  return {
    lines: genre && genre.includes('律诗') ? 8 : 4,
    charactersPerLine: genre && genre.includes('七') ? 7 : 5,
    rhymeScheme: genre && genre.includes('律诗') ? '偶数句押韵，首句可入韵' : '通常二、四句押韵'
  };
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// ==================== 灵感生成接口 ====================

/**
 * 步骤1：灵感生成 - 生成关键词
 * POST /api/creation/inspiration/generate
 */
router.post('/inspiration/generate', optionalAuthenticateToken, async (req, res) => {
  try {
    let userId = req.user ? req.user.userId : null;
    const rateLimitKey = userId ? `user_${userId}` : `ip_${req.ip}`;
    const { theme, genre } = req.body;

    if (!checkAIRateLimit(rateLimitKey)) {
      return res.status(429).json({ success: false, message: '请求过于频繁，请稍后重试' });
    }

    if (!theme || !genre) {
      return res.status(400).json({ success: false, message: '缺少主题或体裁参数' });
    }

    const escapedTheme = escapeString(theme);
    const escapedGenre = escapeString(genre);

    const prompt = `为「${escapedTheme}」主题的${escapedGenre}生成创作灵感。

要求：
1. keywords：5-8个与主题相关的关键词
2. theme：主题描述（20字内）
3. mood：情感基调（如：清新、豪放、婉约等）
4. moodDescription：结合当前主题和体裁，解释这种情感基调适合如何落笔（20-35字，不能只是通用词典释义）
5. openingIdeas：3-4个起笔思路
6. avoid：2-3个避免事项
7. suggestions：2-3个创作建议

返回JSON：
{"keywords":["关键词1","关键词2"],"theme":"主题描述","mood":"情感基调","moodDescription":"结合本主题的情感解释与落笔方向","openingIdeas":["思路1","思路2"],"avoid":["避免1","避免2"],"suggestions":["建议1","建议2"]}`;

    const result = await aiService.callZhipuGenerateJSON(prompt,
      '你是古诗词专家，根据主题生成实际创作建议。',
      { temperature: 0.8, maxTokens: 500 }
    );

    if (result && Array.isArray(result.keywords) && result.keywords.length >= 3 && hasText(result.theme) && hasText(result.mood)
      && Array.isArray(result.openingIdeas) && result.openingIdeas.length >= 2
      && Array.isArray(result.avoid) && result.avoid.length >= 1
      && Array.isArray(result.suggestions) && result.suggestions.length >= 2) {
      const data = {
        keywords: Array.isArray(result.keywords) ? result.keywords : [],
        theme: result.theme || '',
        mood: result.mood || '',
        moodDescription: typeof result.moodDescription === 'string' ? result.moodDescription.trim() : '',
        openingIdeas: Array.isArray(result.openingIdeas) ? result.openingIdeas : [],
        avoid: Array.isArray(result.avoid) ? result.avoid : [],
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : []
      };
      return res.json({ success: true, data });
    }

    return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: 'AI服务暂时不可用，请稍后重试' });
  } catch (error) {
    console.error('[creationRoutes] 灵感生成失败:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// ==================== 结构引导接口 ====================

/**
 * 步骤2：结构引导 - 获取写作结构提示
 * POST /api/creation/structure/guide
 */
router.post('/structure/guide', optionalAuthenticateToken, async (req, res) => {
  try {
    const userId = req.user ? req.user.userId : null;
    const rateLimitKey = userId ? `user_${userId}` : `ip_${req.ip}`;
    const { genre, theme, keywords, mood } = req.body;

    if (!checkAIRateLimit(rateLimitKey)) {
      return res.status(429).json({ success: false, message: '请求过于频繁，请稍后重试' });
    }

    if (!genre) {
      return res.status(400).json({ success: false, message: '缺少体裁参数' });
    }

    const escapedGenre = escapeString(genre);
    const escapedTheme = escapeString(theme || '');
    const escapedKeywords = Array.isArray(keywords) ? keywords.join('、') : '';
    const escapedMood = escapeString(mood || '');

    const baseTemplate = genreRule(escapedGenre);

    const prompt = `请为主题「${escapedTheme}」的${escapedGenre}生成专属写作结构。已知意象：${escapedKeywords || '暂无'}；情感基调：${escapedMood || '请你判断'}。

结构必须包含${baseTemplate.lines || '与词牌对应的'}个句位。每个句位都要给出真实、完整、可阅读的参考诗句，参考范例可以引用公开古诗句或你生成的示例，但不能出现“示例1”“起句”“建议”等占位词，也不能留空。参考范例只用于说明写法，不要求用户照抄。

请具体说明每个句位在本主题中的作用、可使用的意象和情感推进，并给出关键词使用、写作技巧、韵律要求、韵脚示例和需要避免的问题。所有内容必须针对本次主题，不要输出通用占位文案。

只返回JSON，不要输出Markdown或解释文字。字段必须严格为：name、lines、charactersPerLine、rhymeScheme、introduction、structure、keywordSuggestions、tips、rhyme、rhymeExamples、avoid、advancedTips。
structure中的每项必须包含position、role、description、themeHint、example；keywordSuggestions中的每项必须包含keyword、usage。`;

    const result = await aiService.callZhipuGenerateJSON(prompt,
      '你是古诗词专家。直接返回JSON，不要输出任何分析过程。',
      { temperature: 0.7, maxTokens: 800 }
    );

    const structureTips = Array.isArray(result?.tips)
      ? result.tips.filter(Boolean).map(String)
      : hasText(result?.tips) ? result.tips.split(/[。；;\n]+/).map(item => item.trim()).filter(Boolean) : [];
    const structureAvoid = Array.isArray(result?.avoid)
      ? result.avoid.filter(Boolean).map(String)
      : hasText(result?.avoid) ? result.avoid.split(/[。；;\n]+/).map(item => item.trim()).filter(Boolean) : [];
    if (result && Array.isArray(result.structure) && result.structure.length >= baseTemplate.lines
      && result.structure.every(item => hasText(item?.description) && hasText(item?.example) && item.example.trim().length >= 2)
      && structureTips.length > 0) {
      return res.json({ success: true, data: { ...result, tips: structureTips, avoid: structureAvoid, structure: result.structure.slice(0, baseTemplate.lines || result.structure.length) } });
    }

    return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: 'AI服务暂时不可用，请稍后重试' });
  } catch (error) {
    console.error('[creationRoutes] 结构引导失败:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// ==================== 续写推荐接口 ====================

/**
 * AI续写推荐 - 用户输入一句，AI推荐下一句
 * POST /api/creation/recommend/next-line
 */
router.post('/recommend/next-line', optionalAuthenticateToken, async (req, res) => {
  try {
    let userId = req.user ? req.user.userId : null;
    const rateLimitKey = userId ? `user_${userId}` : `ip_${req.ip}`;
    const { currentLines, genre, theme, maxLength } = req.body;

    if (!checkAIRateLimit(rateLimitKey)) {
      return res.status(429).json({ success: false, message: '请求过于频繁，请稍后重试' });
    }

    if (!currentLines) {
      return res.status(400).json({ success: false, message: '缺少当前诗句' });
    }

    const escapedLines = escapeString(currentLines);
    const escapedGenre = escapeString(genre || '五言绝句');
    const escapedTheme = escapeString(theme || '一般主题');
    const lineLength = maxLength || (escapedGenre.includes('七') ? 7 : 5);

    // 分析已有诗句的韵脚和意境
    const lines = escapedLines.split('\n').filter(l => l.trim());
    const lastLine = lines[lines.length - 1] || '';
    const lineCount = lines.length;

    const prompt = `续写${escapedGenre}，主题"${escapedTheme}"，第${lineCount + 1}句需${lineLength}字。
已有诗句：${escapedLines}

返回JSON：
{"suggestions":[{"line":"诗句1","reason":"理由1","mood":"意境1"},{"line":"诗句2","reason":"理由2","mood":"意境2"}],"rhymeHint":"押韵提示","moodHint":"情感走向"}`;

    const result = await aiService.callZhipuGenerateJSON(prompt,
      '你是诗词续写专家。请严格按照JSON格式返回结果，不要返回其他任何内容。',
      { temperature: 0.8, maxTokens: 600 }
    );

    if (result && Array.isArray(result.suggestions) && result.suggestions.length) {
        const mapped = result.suggestions
        .map((s) => ({
          line: (s && s.line) ? String(s.line).trim() : '',
          reason: (s && s.reason) ? String(s.reason).trim() : '',
          mood: (s && s.mood) ? String(s.mood).trim() : ''
        }))
        .filter((s) => s.line && isValidLineLength(s.line, lineLength));
      return res.json({
        success: true,
        data: {
          suggestions: mapped,
          rhymeHint: result.rhymeHint || '',
          moodHint: result.moodHint || ''
        }
      });
    }

    return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: 'AI服务暂时不可用，请稍后重试' });
  } catch (error) {
    console.error('[creationRoutes] 续写推荐失败:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 实时续写提示（轻量级）
 * POST /api/creation/realtime/tips
 */
router.post('/realtime/tips', optionalAuthenticateToken, async (req, res) => {
  try {
    let userId = req.user ? req.user.userId : null;
    const rateLimitKey = userId ? `user_${userId}` : `ip_${req.ip}`;
    const { partialLine, genre } = req.body;

    if (!checkAIRateLimit(rateLimitKey)) {
      return res.status(429).json({ success: false, message: '请求过于频繁' });
    }

    const escapedLine = escapeString(partialLine || '');
    const escapedGenre = escapeString(genre || '五言绝句');
    const lineLength = escapedGenre.includes('七') ? 7 : 5;

    const prompt = `写诗提示：当前"${escapedLine}"，目标${lineLength}字。

请严格按照以下JSON格式返回结果，不要返回其他任何内容：
{"tips":["提示1","提示2"],"remainingChars":"剩余字数","rhymeReminder":"押韵提醒"}`;

    const result = await aiService.callZhipuGenerateJSON(prompt,
      '你是诗词专家。请严格按照JSON格式返回结果，不要返回其他任何内容。',
      { temperature: 0.5, maxTokens: 200 }
    );

    if (result && Array.isArray(result.tips) && result.tips.length) {
      return res.json({ success: true, data: result });
    }

    return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: 'AI服务暂时不可用，请稍后重试' });
  } catch (error) {
    console.error('[creationRoutes] 实时提示失败:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// ==================== 接龙创作接口 ====================

/**
 * 接龙创作 - 获取AI第一句
 * POST /api/creation/chain/start
 */
router.post('/chain/start', optionalAuthenticateToken, async (req, res) => {
  try {
    let userId = req.user ? req.user.userId : null;
    const rateLimitKey = userId ? `user_${userId}` : `ip_${req.ip}`;
    const { genre, theme } = req.body;

    if (!checkAIRateLimit(rateLimitKey)) {
      return res.status(429).json({ success: false, message: '请求过于频繁' });
    }

    const escapedGenre = escapeString(genre || '五言绝句');
    const escapedTheme = escapeString(theme || '自然风光');
    const lineLength = escapedGenre.includes('七') ? 7 : 5;

    const prompt = `为「${escapedTheme}」主题创作${escapedGenre}首句，${lineLength}字，无标点。

重要要求：
1. 必须是原创诗句，不能使用现有的古诗词
2. 要点题但不直白，以景起或以情起
3. 用典雅意象，避免大白话和现代词汇
4. 为后续诗句预留意境发展空间

返回JSON：{"aiLine":"诗句"}`;

    const result = await aiService.callZhipuGenerateJSON(prompt,
      '你是唐代诗人，精通格律诗创作。你的诗句意境深远、用词典雅、格律工整。起句讲究"兴"，以景引情，含蓄蕴藉。请只返回JSON格式结果。',
      { temperature: 0.8, maxTokens: 50 }
    );

    let aiLine = extractChainAiLine(result);

    if (!aiLine || !isValidLineLength(aiLine, lineLength)) {
      return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: 'AI服务暂时不可用或返回格式错误' });
    }

    return res.json({ success: true, data: { aiLine: normalizePoemLineChars(aiLine), mood: '', rhyme: '' } });
  } catch (error) {
    console.error('[creationRoutes] 接龙开始失败:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 接龙创作 - 获取AI下一句
 * POST /api/creation/chain/next
 */
router.post('/chain/next', optionalAuthenticateToken, async (req, res) => {
  try {
    const { genre, theme, userLine, allLines, lineNumber } = req.body;
    let userId = req.user ? req.user.userId : null;
    const rateLimitKey = userId ? `user_${userId}` : `ip_${req.ip}`;

    if (!checkAIRateLimit(rateLimitKey)) {
      return res.status(429).json({ success: false, message: '请求过于频繁' });
    }

    if (!userLine && (!allLines || allLines.length === 0)) {
      return res.status(400).json({ success: false, message: '缺少诗句内容' });
    }

    const escapedGenre = escapeString(genre || '五言绝句');
    const escapedTheme = escapeString(theme || '一般主题');
    const lineLength = escapedGenre.includes('七') ? 7 : 5;
    const currentLineNum = lineNumber || 1;

    let existingLinesText = '';
    let lastLine = '';
    if (allLines && Array.isArray(allLines) && allLines.length > 0) {
      existingLinesText = allLines.join('，');
      lastLine = allLines[allLines.length - 1];
    } else if (userLine) {
      existingLinesText = userLine;
      lastLine = userLine;
    }

    const totalLines = escapedGenre.includes('律诗') ? 8 : 4;
    const isLastLine = currentLineNum >= totalLines;
    const prevNorm = normalizePoemLineChars(lastLine);

    // 根据诗句位置确定起承转合
    const positionName = ['起句', '承句', '转句', '合句'][currentLineNum - 1] || '续句';
    const positionGuide = {
      '承句': '承接上文，深化意境，可展开描写或渲染氛围',
      '转句': '转折变化，另辟蹊径，引入新意象或情感转折',
      '合句': '收束全篇，点明主旨，余韵悠长，忌直白说理'
    };

    const prompt = `续写${escapedGenre}第${currentLineNum}句（${positionName}），${lineLength}字，无标点。
主题：${escapedTheme}
上句：${escapeString(prevNorm)}
已有：${existingLinesText}

重要要求：
1. 必须是原创诗句，不能使用现有的古诗词
2. ${positionGuide[positionName] || '承接上文意境'}
3. 注意押韵：${currentLineNum % 2 === 0 ? '偶数句需押韵' : '奇数句可不押韵'}
4. 意境连贯：与上句形成对仗或递进关系

返回JSON：{"aiLine":"诗句"}`;

    const result = await aiService.callZhipuGenerateJSON(prompt,
      '你是唐代诗人，精通格律诗创作。你深谙起承转合之法，承句要承接上文、深化意境，转句要另辟蹊径、引入变化，合句要点题收束、余韵悠长。请只返回JSON格式结果。',
      { temperature: 0.75, maxTokens: 50 }
    );

    let aiLine = extractChainAiLine(result);

    if (!aiLine || !isValidLineLength(aiLine, lineLength)) {
      return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: 'AI服务暂时不可用或返回格式错误' });
    }

    return res.json({
      success: true,
      data: {
        aiLine: normalizePoemLineChars(aiLine),
        rhymeHint: '',
        moodHint: ''
      }
    });
  } catch (error) {
    console.error('[creationRoutes] 接龙续写失败:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 韵脚分析辅助函数
function analyzeRhyme(line) {
  if (!line || line.length < 2) return '';
  
  const rhymeGroups = {
    'a韵': ['啊', '家', '花', '霞', '沙', '茶', '下', '华'],
    'o韵': ['波', '多', '河', '歌', '落', '过', '火', '坐'],
    'e韵': ['月', '雪', '叶', '夜', '色', '客', '侧', '瑟'],
    'i韵': ['衣', '西', '溪', '离', '期', '知', '时', '诗', '低', '依'],
    'u韵': ['书', '湖', '图', '路', '出', '入', '如', '苏', '孤'],
    'v韵': ['雨', '语', '去', '处', '许', '缕', '絮', '侣'],
    'ai韵': ['来', '开', '台', '白', '海', '外', '在', '载'],
    'ei韵': ['回', '飞', '水', '美', '谁', '泪', '杯', '眉'],
    'ao韵': ['高', '遥', '萧', '桥', '照', '少', '晓', '鸟'],
    'ou韵': ['楼', '秋', '流', '愁', '头', '游', '舟', '收'],
    'an韵': ['山', '天', '间', '关', '还', '颜', '寒', '残', '闲'],
    'en韵': ['人', '春', '深', '门', '心', '新', '身', '尘', '闻'],
    'ang韵': ['长', '香', '光', '方', '阳', '凉', '霜', '乡', '忙'],
    'eng韵': ['风', '声', '空', '中', '明', '清', '生', '行', '情']
  };
  
  const lastChar = line.slice(-1);
  for (const [group, chars] of Object.entries(rhymeGroups)) {
    if (chars.includes(lastChar)) {
      return `${group}(${lastChar})`;
    }
  }
  return '';
}

// ==================== 飞花令创作接口 ====================

/**
 * 飞花令创作 - 请求 AI 生成关键字
 * POST /api/creation/feihua/keyword
 */
router.post('/feihua/keyword', optionalAuthenticateToken, async (req, res) => {
  try {
    const { difficulty = '中等' } = req.body;

    const relatedPrompt = `请为飞花令生成一个${escapeString(difficulty)}难度的单字题目，并给出5个与这个字在古典诗词语境中自然相关的意象词。题目必须是一个常用汉字，不要使用生僻符号或多字词。

只返回JSON，不要输出任何解释：{"keyword":"单个汉字","relatedWords":["意象1","意象2","意象3","意象4","意象5"]}`;

    const aiResult = await aiService.callZhipuGenerateJSON(relatedPrompt,
      '你是古典诗词专家。直接返回JSON，不要输出任何分析过程。',
      { temperature: 0.5, maxTokens: 200 }
    );

    if (!aiResult || !hasText(aiResult.keyword) || Array.from(aiResult.keyword.trim()).length !== 1
      || !Array.isArray(aiResult.relatedWords) || aiResult.relatedWords.length < 3) {
      return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: 'AI 未返回有效飞花令题目，请稍后重试' });
    }
    return res.json({
      success: true,
      data: {
        keyword: aiResult.keyword.trim(),
        relatedWords: aiResult.relatedWords.filter(Boolean).map(String).slice(0, 5)
      }
    });
  } catch (error) {
    console.error('[creationRoutes] 飞花令关键字失败:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 飞花令创作 - 评分
 * POST /api/creation/feihua/score
 */
router.post('/feihua/score', optionalAuthenticateToken, async (req, res) => {
  try {
    const { poem, keyword, genre } = req.body;
    let userId = req.user ? req.user.userId : null;
    const rateLimitKey = userId ? `user_${userId}` : `ip_${req.ip}`;

    if (!checkAIRateLimit(rateLimitKey)) {
      return res.status(429).json({ success: false, message: '请求过于频繁' });
    }

    if (!poem) {
      return res.status(400).json({ success: false, message: '缺少诗词内容' });
    }

    const escapedPoem = escapeString(poem);
    const escapedKeyword = escapeString(keyword || '');
    const escapedGenre = escapeString(genre || '五言绝句');

    const prompt = `飞花令评分：
关键字："${escapedKeyword}"（必须在诗中出现）
体裁：${escapedGenre}
正文：${escapedPoem}

评分标准（0-100分）：
- keyword：关键字分
- content：内容分
- rhythm：韵律分
- mood：意境分
- creativity：创意分

总分=五项平均分。

返回JSON：
{"total":总分,"dimensions":{"keyword":分数,"content":分数,"rhythm":分数,"mood":分数,"creativity":分数},"suggestions":"【亮点】一句话\\n【不足】一句话\\n【建议】一句话"}`;

    const result = await aiService.callZhipuGenerateJSON(prompt,
      '你是严格的飞花令评审专家，评分要客观公正，关键字必须出现在诗中。请直接返回JSON格式的评分结果。',
      { temperature: 0.3, maxTokens: 600 }
    );

    if (result) {
      return res.json({ success: true, data: result });
    }

    return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: 'AI 服务暂时不可用，请稍后重试' });
  } catch (error) {
    console.error('[creationRoutes] 飞花令评分失败:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// ==================== AI生成完整诗词 ====================

/**
 * 步骤3：AI生成完整诗词
 * POST /api/creation/generate
 */
router.post('/generate', optionalAuthenticateToken, async (req, res) => {
  try {
    const userId = req.user ? req.user.userId : null;
    const rateLimitKey = userId ? `user_${userId}` : `ip_${req.ip}`;
    const { theme, genre, keywords, structure, existingLines } = req.body;

    if (!checkAIRateLimit(rateLimitKey)) {
      return res.status(429).json({ success: false, message: '请求过于频繁' });
    }

    if (!theme || !genre) {
      return res.status(400).json({ success: false, message: '缺少主题或体裁' });
    }

    const escapedTheme = escapeString(theme);
    const escapedGenre = escapeString(genre);
    const escapedKeywords = Array.isArray(keywords) ? keywords.join('、') : '';
    const escapedStructure = escapeString(structure || '');
    const escapedExistingLines = Array.isArray(existingLines)
      ? existingLines.map(escapeString).filter(Boolean).join('；')
      : '';

    const prompt = `创作${escapedGenre}，主题："${escapedTheme}"，关键词：${escapedKeywords || '无'}。
${escapedExistingLines ? `请保留并续写这些已完成诗句：${escapedExistingLines}。` : ''}

请严格按照以下JSON格式返回结果，不要返回其他任何内容：
{"poem":"每句一行","title":"标题","explanation":"简述"}`;

    const result = await aiService.callZhipuGenerateJSON(prompt,
      '你是诗词创作专家。请严格按照JSON格式返回结果，不要返回其他任何内容。',
      { temperature: 0.8, maxTokens: 600 }
    );

    const generatedLines = result?.poem ? String(result.poem).split(/\r?\n/).map(line => normalizePoemLineChars(line)).filter(Boolean) : [];
    const rule = genreRule(escapedGenre);
    const validPoem = generatedLines.length >= rule.lines
      && (rule.charactersPerLine === 0 || generatedLines.slice(0, rule.lines).every(line => line.length === rule.charactersPerLine));
    if (result && validPoem) {
      result.poem = generatedLines.slice(0, rule.lines).join('\n');
      return res.json({ success: true, data: result });
    }
    return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: 'AI 未返回符合体裁的诗稿，请重试' });
  } catch (error) {
    console.error('[creationRoutes] 诗词生成失败:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// ==================== AI润色接口 ====================

/**
 * AI润色诗词
 * POST /api/creation/polish
 */
router.post('/polish', optionalAuthenticateToken, async (req, res) => {
  try {
    const { poem, genre, theme, type } = req.body;
    let userId = req.user ? req.user.userId : null;
    const rateLimitKey = userId ? `user_${userId}` : `ip_${req.ip}`;

    if (!checkAIRateLimit(rateLimitKey)) {
      return res.status(429).json({ success: false, message: '请求过于频繁，请稍后重试' });
    }

    if (!poem) {
      return res.status(400).json({ success: false, message: '缺少诗词内容' });
    }

    const escapedPoem = escapeString(poem);
    const escapedGenre = escapeString(genre || '五言绝句');
    const escapedTheme = escapeString(theme || '一般主题');
    const polishType = type === 'rewrite' ? '重新创作' : '在原诗基础上优化';

    const prompt = `润色诗词：
体裁：${escapedGenre}
主题：${escapedTheme}
原诗：${escapedPoem}

要求：
  1. ${polishType}，保持原诗结构和行数，每行字数与原诗一致
2. 使用规范的古诗词词汇，避免网络用语、乱码、无意义字符
3. 优化用词，使词汇更典雅、更符合古诗词风格
4. 调整韵律节奏，提升整体意境
5. 严格保持中文，不出现任何英文或乱码字符

返回JSON：
{"poem":"润色后诗句（\\n换行）","explanation":"润色说明（30字内）","changes":[{"original":"原句","polished":"润色后","reason":"理由"}]}`;

    const result = await aiService.callZhipuGenerateJSON(prompt,
      '你是诗词润色专家。直接返回JSON。',
      { temperature: 0.7, maxTokens: 400 }
    );

    if (result && result.poem && result.poem.trim()) {
      if (isValidPolishResult(result.poem, escapedPoem)) {
        result.original = escapedPoem;
        return res.json({ success: true, data: result });
      } else {
        console.warn('[polish] 润色结果无效，拒绝返回');
      }
    }

    return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: 'AI 未返回有效润色结果，请重试' });
  } catch (error) {
    console.error('[creationRoutes] 润色失败:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

module.exports = router;
