const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const aiService = require('../services/aiService');
const { parsePagination } = require('../utils/validation');
const authenticateToken = require('../middleware/auth');

const aiRateLimitMap = new Map();

function parseCreationScoreData(score_data) {
  if (score_data == null || score_data === '') return null;
  try {
    const d = typeof score_data === 'string' ? JSON.parse(score_data) : score_data;
    const raw = d.score ?? d.total;
    if (raw === undefined || raw === null) return null;
    const v = Number(raw);
    return Number.isFinite(v) ? v : null;
  } catch (e) {
    return null;
  }
}

const CREATION_QUALIFIED_MIN_SCORE = 60;

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
  console.log('[creationRoutes] 清理过期限流记录完成');
}, 3600000);

function checkAIRateLimit(req) {
  const userId = req.user.userId;
  const now = Date.now();

  if (!aiRateLimitMap.has(userId)) {
    aiRateLimitMap.set(userId, []);
  }

  const records = aiRateLimitMap.get(userId);
  const filteredRecords = records.filter(record => now - record < 60000);
  aiRateLimitMap.set(userId, filteredRecords);

  if (filteredRecords.length >= 5) {
    return false;
  }

  filteredRecords.push(now);
  aiRateLimitMap.set(userId, filteredRecords);
  return true;
}

router.post('/novice/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { theme, genre } = req.body;

    if (!checkAIRateLimit(req)) {
      console.error('[creationRoutes] 生成引导诗 失败', { userId, error: '请求过于频繁，请稍后重试' });
      return res.status(429).json({ success: false, message: '请求过于频繁，请稍后重试' });
    }

    console.log('[creationRoutes] 生成引导诗 信息', { userId, params: { theme, genre } });

    if (!theme || !genre) {
      console.error('[creationRoutes] 生成引导诗 失败', { userId, error: '缺少主题或体裁参数' });
      return res.status(400).json({ success: false, message: '缺少主题或体裁参数' });
    }

    const escapedTheme = theme;
    const escapedGenre = genre;

    const prompt = `请为"${escapedTheme}"主题生成一首${escapedGenre}，在适当位置设置2-3个空缺供用户填词。

要求：
1. 格律严谨：必须符合${escapedGenre}的格律要求，字数准确，押韵工整
2. 主题鲜明：全诗意象必须紧扣"${escapedTheme}"这一主题，每句都直接或间接服务主题
3. 空缺设计合理：
   - 空缺仅在实词位置（名词、动词、形容词），虚词（助词、量词）不设空缺
   - 每个空缺字数明确（1-2字），字数要一致（通常差1字）
   - 空缺处填入的词必须与主题直接相关，填错则全诗意境割裂
   - 每个空缺用"___"表示，数量精确
4. 参考版本提供：完整的、无空缺的正确版本
5. 解释必须包含：
   - 整首诗如何层层推进、紧扣"${escapedTheme}"主题
   - 每个空缺的韵脚要求（标出平仄和韵部）
   - 每个空缺的情感方向指引（描述此处应表达什么情感）
   - 填词时如何通过词语选择保持主题连贯

严格返回JSON（不要任何额外文字）：
{"prompt_poem":"带空缺的诗词","reference_poem":"完整正确版本","explanation":"【主题】...（20-40字）\n【结构】...（20-40字）\n【空缺1】位置：第X句第X-X字，韵部：XX，平仄：X，情感方向：...（10-20字）\n【空缺2】位置：...（同理）\n【空缺3】位置：...（若有则写）"}`;

    const systemContent = `你是一位精通中国古典诗词格律的专家，尤其擅长唐代五言、七言绝句。你的格律知识极其扎实，平仄押韵要求一丝不苟。`;

    const result = await aiService.callAIGenerateJSON(prompt, systemContent);

    if (result) {
      console.log('[creationRoutes] 生成引导诗 成功', { userId, theme: escapedTheme, genre: escapedGenre });
      return res.json({ success: true, data: result, message: '生成成功' });
    } else {
      console.error('[creationRoutes] 生成引导诗 AI未返回结果', { userId, theme: escapedTheme, genre: escapedGenre });
      return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: 'AI 服务暂时不可用，请稍后重试' });
    }
  } catch (error) {
    console.error('[creationRoutes] 生成引导诗 失败', { userId: req.user.userId, params: req.body, error: error.stack || error.message });
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.post('/novice/check', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { userPoem, referencePoem, title, author } = req.body;

    if (!checkAIRateLimit(req)) {
      console.error('[creationRoutes] 校验填词结果 失败', { userId, error: '请求过于频繁，请稍后重试' });
      return res.status(429).json({ success: false, message: '请求过于频繁，请稍后重试' });
    }

    console.log('[creationRoutes] 校验填词结果 信息', { userId, params: { title, author } });

    if (!userPoem || !referencePoem) {
      console.error('[creationRoutes] 校验填词结果 失败', { userId, error: '缺少用户填词或参考诗词' });
      return res.status(400).json({ success: false, message: '缺少用户填词或参考诗词' });
    }

    const escapedUserPoem = JSON.stringify(userPoem).slice(1, -1);
    const escapedReferencePoem = JSON.stringify(referencePoem).slice(1, -1);
    const escapedTitle = title ? JSON.stringify(title).slice(1, -1) : '';
    const escapedAuthor = author ? JSON.stringify(author).slice(1, -1) : '';

    const prompt = `请对用户在引导诗空缺处的填词进行严格评审，并与参考版本对比评分。

【参考版本】
${escapedReferencePoem}

【用户版本】
${escapedUserPoem}

【填词任务描述】
标题：${escapedTitle}
作者：${escapedAuthor}

【评分维度及标准】

一、内容契合度（content）
- 85-100：填入词语与主题完全契合，意象精准，意境浑然一体
- 70-84：填入词语与主题较为契合，有一定意境
- 55-69：填入词语与主题有偏差，略显游离
- 40-54：填入词语与主题貌合神离，意象混乱
- 0-39：填入词语与主题严重不符

二、韵律美感（rhythm）
- 85-100：平仄完全正确，与前后句衔接自然，韵脚和谐
- 70-84：平仄基本正确，韵脚较和谐
- 55-69：平仄有误，韵脚生硬
- 40-54：平仄错误明显，节奏割裂
- 0-39：韵律全错

三、意境表达（mood）
- 85-100：填词处与全诗意境高度统一，能深化主题，令人回味
- 70-84：填词处与全诗意较为统一，能维持意境
- 55-69：填词处与全诗意有割裂感
- 40-54：填词处破坏全诗意境
- 0-39：填词处令全诗意境崩塌

【总分】三维度之和÷3，保留一位小数。

【修改建议】（必须包含以下内容，格式严格）
1. 亮点：用户填词中真正闪光的地方（不超过20字）
2. 问题：严厉指出核心问题，具体指出是哪个字/哪个词有什么问题（30-60字）
3. 建议：给出修改方向（不超过25字）

严格JSON格式：
{"score":总分数值,"analysis":{"content":分数,"rhythm":分数,"mood":分数},"suggestions":"【亮点】...（≤20字）\n【不足】...（30-60字）\n【建议】...（≤25字）"}`;

    const systemContent = `你是一位极其严格的古诗词评审专家。你以唐诗名篇为最高标准，审视每一个字的平仄、押韵、意象、情感。对空缺处填词的评判极其细致——一字之差，境界天壤之别。`;

    const result = await aiService.callAIGenerateJSON(prompt, systemContent, { temperature: 0.3 });

    if (result) {
      console.log('[creationRoutes] 校验填词结果 成功', { userId });
      return res.json({ success: true, data: result, message: '校验成功' });
    } else {
      console.error('[creationRoutes] 校验填词结果 AI未返回结果', { userId });
      return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: 'AI 服务暂时不可用，请稍后重试' });
    }
  } catch (error) {
    console.error('[creationRoutes] 校验填词结果 失败', { userId: req.user.userId, params: req.body, error: error.stack || error.message });
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.post('/assist/generate-reference', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { theme, genre } = req.body;

    if (!checkAIRateLimit(req)) {
      console.error('[creationRoutes] 生成参考诗词 失败', { userId, error: '请求过于频繁，请稍后重试' });
      return res.status(429).json({ success: false, message: '请求过于频繁，请稍后重试' });
    }

    console.log('[creationRoutes] 生成参考诗词 信息', { userId, params: { theme, genre } });

    if (!theme || !genre) {
      console.error('[creationRoutes] 生成参考诗词 失败', { userId, error: '缺少主题或体裁参数' });
      return res.status(400).json({ success: false, message: '缺少主题或体裁参数' });
    }

    const escapedTheme = JSON.stringify(theme).slice(1, -1);
    const escapedGenre = JSON.stringify(genre).slice(1, -1);

    const prompt = `
      请生成一首${escapedGenre}，主题为"${escapedTheme}"，作为用户创作的参考。

      要求：
      1. 诗词结构完整，符合${escapedGenre}的格律要求
      2. 意境优美，与主题相关
      3. 语言流畅，易于理解
      4. 请严格按照以下JSON格式返回，不要添加任何其他文字，包括Markdown标记、引号外的解释、换行等
      - poem: 生成的参考诗词
      - analysis: 诗词解析

      示例JSON格式：
      {"poem": "...", "analysis": "..."}
    `;

    const systemContent = "你是一位精通中国古典诗词的专家，擅长创作各种体裁的诗词。";

    const result = await aiService.callAIGenerateJSON(prompt, systemContent);

    if (result) {
      console.log('[creationRoutes] 生成参考诗词 成功', { userId, theme: escapedTheme, genre: escapedGenre });
      return res.json({ success: true, data: result, message: '生成成功' });
    } else {
      console.error('[creationRoutes] 生成参考诗词 AI未返回结果', { userId, theme: escapedTheme, genre: escapedGenre });
      return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: 'AI 服务暂时不可用，请稍后重试' });
    }
  } catch (error) {
    console.error('[creationRoutes] 生成参考诗词 失败', { userId: req.user.userId, params: req.body, error: error.stack || error.message });
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.post('/assist/score', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { poem, title, author, genre, theme } = req.body;

    if (!checkAIRateLimit(req)) {
      console.error('[creationRoutes] 评分 失败', { userId, error: '请求过于频繁，请稍后重试' });
      return res.status(429).json({ success: false, message: '请求过于频繁，请稍后重试' });
    }

    console.log('[creationRoutes] 评分 信息', { userId, params: { title, author, genre, theme } });

    if (!poem) {
      console.error('[creationRoutes] 评分 失败', { userId, error: '缺少诗词内容' });
      return res.status(400).json({ success: false, message: '缺少诗词内容' });
    }

    const escapedPoem = JSON.stringify(poem).slice(1, -1);
    const escapedTitle = title ? JSON.stringify(title).slice(1, -1) : '无标题';
    const escapedAuthor = author ? JSON.stringify(author).slice(1, -1) : '用户';
    const escapedGenre = genre ? JSON.stringify(genre).slice(1, -1) : '未知';
    const escapedTheme = theme ? JSON.stringify(theme).slice(1, -1) : '未知';

    const systemContent = `你是古诗词评审专家，快速评分，简洁建议。`;

    const prompt = `评分诗词：
标题：${escapedTitle}
体裁：${escapedGenre}
主题：${escapedTheme}
正文：
${escapedPoem}

评分标准（0-100分）：
- content：内容契合度
- rhythm：韵律美感
- mood：意境表达
- language：语言流畅度
- creativity：创意性

总分=五维度平均分。

建议要求：简洁明了，每部分不超过20字。

返回JSON：
{"total":分数,"dimensions":{"content":分数,"rhythm":分数,"mood":分数,"language":分数,"creativity":分数},"suggestions":"【亮点】优点\\n【不足】问题\\n【建议】改进"}`;

    const [scoreResult, imageResult] = await Promise.all([
      aiService.callZhipuGenerateJSON(prompt, systemContent, { temperature: 0.1, maxTokens: 800 }),
      aiService.generatePoemImage(escapedPoem, escapedTitle, escapedAuthor).catch(imageError => {
        console.warn('[creationRoutes] 意境图生成失败，不影响评分:', imageError.message);
        return null;
      })
    ]);

    const dimensions = scoreResult?.dimensions || {};
    const dimensionKeys = ['content', 'rhythm', 'mood', 'language', 'creativity'];
    const validDimensions = dimensionKeys.every(key => Number.isFinite(Number(dimensions[key])) && Number(dimensions[key]) >= 0 && Number(dimensions[key]) <= 100);
    if (scoreResult && validDimensions) {
      if (typeof scoreResult.total !== 'number' || scoreResult.total < 0 || scoreResult.total > 100) {
        const dims = scoreResult.dimensions || {};
        const vals = Object.values(dims).filter(v => typeof v === 'number');
        scoreResult.total = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : 0;
      }
      const responseData = { ...scoreResult, image: imageResult };
      console.log('[creationRoutes] 评分 成功', { userId, total: scoreResult.total });
      return res.json({ success: true, data: responseData, message: '评分成功' + (imageResult ? '，已生成意境图' : '') });
    } else {
      console.error('[creationRoutes] 评分 AI未返回有效结果', { userId });
      return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: 'AI 未返回有效评分，请稍后重试' });
    }
  } catch (error) {
    console.error('[creationRoutes] 评分 失败', { userId: req.user.userId, params: req.body, error: error.stack || error.message });
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.post('/assist/generate-image', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { poem, title, author } = req.body;

    console.log('[creationRoutes] 生成意境图 信息', { userId, params: { title, author } });

    if (!poem) {
      console.error('[creationRoutes] 生成意境图 失败', { userId, error: '缺少诗词内容' });
      return res.status(400).json({ success: false, message: '缺少诗词内容' });
    }

    const escapedPoem = poem;
    const escapedTitle = title || '无标题';
    const escapedAuthor = author || '用户';

    const imageResult = await aiService.generatePoemImage(escapedPoem, escapedTitle, escapedAuthor);

    if (imageResult) {
      console.log('[creationRoutes] 生成意境图 成功', { userId });
      return res.json({
        success: true,
        data: imageResult,
        message: '意境图生成成功'
      });
    } else {
      console.error('[creationRoutes] 生成意境图 失败', { userId });
      return res.json({ success: false, message: '意境图生成失败，请稍后重试' });
    }
  } catch (error) {
    console.error('[creationRoutes] 生成意境图 失败', { userId: req.user.userId, params: req.body, error: error.stack || error.message });
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.post('/works/save', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, content, genre, theme, creation_mode, ai_reference, score_data, modification_suggestions } = req.body;

    console.log('[creationRoutes] 保存作品 信息', { userId, params: { title, genre, theme, creation_mode } });

    if (!title || !content || !genre || !theme || !creation_mode) {
      console.error('[creationRoutes] 保存作品 失败', { userId, error: '缺少必要参数' });
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const now = new Date().toISOString();

    const result = await db.run(
      `INSERT INTO user_creations (user_id, title, content, genre, theme, creation_mode, ai_reference, score_data, modification_suggestions, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [userId, title, content, genre, theme, creation_mode, ai_reference, score_data, modification_suggestions, now, now]
    );

    console.log('[creationRoutes] 保存作品 成功', { userId, workId: result.rows[0].id });
    res.json({ success: true, data: { id: result.rows[0].id }, message: '作品保存成功' });
  } catch (error) {
    console.error('[creationRoutes] 保存作品 失败', { userId: req.user.userId, params: req.body, error: error.stack || error.message });
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.delete('/works/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log('[creationRoutes] 删除作品 信息', { userId, params: { id } });

    const row = await db.get('SELECT id FROM user_creations WHERE id = $1 AND user_id = $2', [id, userId]);

    if (!row) {
      console.error('[creationRoutes] 删除作品 失败', { userId, error: '作品不存在或不属于当前用户' });
      return res.status(404).json({ success: false, message: '作品不存在或不属于当前用户' });
    }

    await db.run('DELETE FROM user_creations WHERE id = $1', [id]);

    console.log('[creationRoutes] 删除作品 成功', { userId, workId: id });
    res.json({ success: true, message: '作品删除成功' });
  } catch (error) {
    console.error('[creationRoutes] 删除作品 失败', { userId: req.user.userId, params: req.params, error: error.stack || error.message });
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.get('/works/list', authenticateToken, async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req, 10);
    const userId = req.user.userId;

    console.log('[creationRoutes] 查询作品列表 信息', { userId, params: { page, pageSize } });

    const works = await db.all(
      'SELECT id, title, content, genre, theme, creation_mode, score_data, created_at FROM user_creations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, pageSize, offset]
    );

    const count = await db.get('SELECT COUNT(*) as total FROM user_creations WHERE user_id = $1', [userId]);

    console.log('[creationRoutes] 查询作品列表 成功', { userId, count: works.length, total: count.total });
    res.json({
      success: true,
      data: {
        works,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: count.total
        }
      },
      message: '查询成功'
    });
  } catch (error) {
    console.error('[creationRoutes] 查询作品列表 失败', { userId: req.user.userId, params: req.query, error: error.stack || error.message });
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.get('/works/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log('[creationRoutes] 查询作品详情 信息', { userId, params: { id } });

    const work = await db.get(
      'SELECT * FROM user_creations WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!work) {
      console.error('[creationRoutes] 查询作品详情 失败', { userId, error: '作品不存在或不属于当前用户' });
      return res.status(404).json({ success: false, message: '作品不存在或不属于当前用户' });
    }

    console.log('[creationRoutes] 查询作品详情 成功', { userId, workId: id });
    res.json({ success: true, data: work, message: '查询成功' });
  } catch (error) {
    console.error('[creationRoutes] 查询作品详情 失败', { userId: req.user.userId, params: req.params, error: error.stack || error.message });
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('[creationRoutes] 查询创作成长数据 信息', { userId });

    const rows = await db.all(
      'SELECT score_data, created_at FROM user_creations WHERE user_id = $1',
      [userId]
    );

    const total_creations = rows.length;
    const scores = [];
    let last_creation_time = null;

    for (const row of rows) {
      const s = parseCreationScoreData(row.score_data);
      if (s !== null) scores.push(s);
      if (row.created_at && (!last_creation_time || row.created_at > last_creation_time)) {
        last_creation_time = row.created_at;
      }
    }

    const qualified_works = scores.filter((s) => s >= CREATION_QUALIFIED_MIN_SCORE).length;
    let average_score = 0;
    if (scores.length) {
      const sum = scores.reduce((a, b) => a + b, 0);
      average_score = Math.round((sum / scores.length) * 10) / 10;
    }
    const highest_score = scores.length ? Math.round(Math.max(...scores)) : 0;

    const payload = {
      user_id: userId,
      total_creations,
      qualified_works,
      average_score,
      highest_score,
      last_creation_time
    };

    console.log('[creationRoutes] 查询创作成长数据 成功', { userId, total_creations });
    res.json({ success: true, data: payload, message: '查询成功' });
  } catch (error) {
    console.error('[creationRoutes] 查询创作成长数据 失败', { userId: req.user.userId, error: error.stack || error.message });
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

module.exports = router;
