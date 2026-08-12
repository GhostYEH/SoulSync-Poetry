/**
 * 诗词知识检索器（RAG 的 R）
 *
 * 所有事实性数据（作者、朝代、原文、标签）均从数据库 poems 表检索，
 * 不依赖 LLM 生成。sources 字段记录每条数据的来源，供前端展示可信引用。
 *
 * 检索策略：
 *   1. 结构化检索：按 id / author / dynasty / tags 精确匹配
 *   2. 关键词检索：content LIKE '%keyword%' 模糊匹配
 *   3. 知识点关联：通过 knowledge_point code → 关键词 → 诗词
 *   4. 练习题检索：从 question_knowledge_mappings 找已有题库
 */

const db = require('../utils/db');

const KNOWLEDGE_KEYWORD_MAP = {
  imagery_moon: '月', imagery_willow: '柳', imagery_wildgoose: '雁',
  imagery_wine: '酒', imagery_sunset: '夕阳', imagery_pavilion: '亭',
  emotion_homesick: '乡', emotion_farewell: '送', emotion_ambition: '志',
  rhetoric_metaphor: '如', rhetoric_allusion: '典',
  memorization: null, author_dynasty: null, word_meaning: null,
  emotion_theme: null, rhetoric: null, allusion_background: null, application: null,
};

/**
 * 按 ID 获取诗词完整事实
 */
async function getPoemById(id) {
  const poem = await db.get(
    'SELECT id, title, author, dynasty, content, tags FROM poems WHERE id = $1',
    [id]
  );
  if (!poem) return null;
  return { ...poem, source: 'poems_table' };
}

/**
 * 按关键词检索诗词内容
 */
async function searchPoemsByKeyword(keyword, limit = 5) {
  if (!keyword) return [];
  const poems = await db.all(
    `SELECT id, title, author, dynasty, content, tags FROM poems
     WHERE content LIKE $1 ORDER BY id LIMIT $2`,
    [`%${keyword}%`, limit]
  );
  return poems.map(p => ({ ...p, source: 'poems_table:keyword_search' }));
}

/**
 * 按作者检索
 */
async function searchPoemsByAuthor(author, limit = 5) {
  if (!author) return [];
  const poems = await db.all(
    `SELECT id, title, author, dynasty, content, tags FROM poems
     WHERE author LIKE $1 ORDER BY id LIMIT $2`,
    [`%${author}%`, limit]
  );
  return poems.map(p => ({ ...p, source: 'poems_table:author_search' }));
}

/**
 * 按朝代检索
 */
async function searchPoemsByDynasty(dynasty, limit = 5) {
  if (!dynasty) return [];
  const poems = await db.all(
    `SELECT id, title, author, dynasty, content, tags FROM poems
     WHERE dynasty = $1 ORDER BY id LIMIT $2`,
    [dynasty, limit]
  );
  return poems.map(p => ({ ...p, source: 'poems_table:dynasty_search' }));
}

/**
 * 按标签检索
 */
async function searchPoemsByTags(tags, limit = 5) {
  if (!tags || tags.length === 0) return [];
  const conditions = tags.map((_, i) => `tags LIKE $${i + 1}`).join(' OR ');
  const params = tags.map(t => `%${t}%`);
  params.push(limit);
  const poems = await db.all(
    `SELECT id, title, author, dynasty, content, tags FROM poems
     WHERE ${conditions} ORDER BY id LIMIT $${params.length}`,
    params
  );
  return poems.map(p => ({ ...p, source: 'poems_table:tag_search' }));
}

/**
 * 根据知识点 code 检索相关诗词
 *
 * 可解释性原则：若无可靠关键词映射，返回空数组而非随机诗词。
 * 随机诗词会被包装成"知识点相关来源"，误导学生和教师。
 * 教学上下文仍可依赖 targetPoem（若提供 poemId）和 practiceQuestions（题库关联）。
 */
async function findPoemsForKnowledgePoint(kpCode, limit = 5) {
  const keyword = KNOWLEDGE_KEYWORD_MAP[kpCode];
  if (!keyword) {
    return [];
  }
  const poems = await db.all(
    `SELECT id, title, author, dynasty, content, tags FROM poems
     WHERE content LIKE $1 ORDER BY id LIMIT $2`,
    [`%${keyword}%`, limit]
  );
  return poems.map(p => ({ ...p, source: `poems_table:kp_${kpCode}` }));
}

/**
 * 获取知识点信息
 */
async function getKnowledgePointInfo(kpCode) {
  const kp = await db.get(
    'SELECT id, code, name, category, description, difficulty FROM knowledge_points WHERE code = $1',
    [kpCode]
  );
  return kp;
}

/**
 * 从已有题库中检索练习题（不让 LLM 编题）
 * 通过 question_knowledge_mappings 关联到 challenge_questions
 */
async function getPracticeQuestionsForKnowledgePoint(kpCode, limit = 3) {
  const kp = await getKnowledgePointInfo(kpCode);
  if (!kp) return [];

  const questions = await db.all(
    `SELECT cq.question_id, cq.question_text, cq.correct_answer, cq.options,
            cq.poem_id, p.title, p.author, p.dynasty, p.content
     FROM question_knowledge_mappings qkm
     JOIN challenge_questions cq ON cq.question_id = qkm.question_id
     LEFT JOIN poems p ON cq.poem_id = p.id
     WHERE qkm.knowledge_point_id = $1
     ORDER BY qkm.weight DESC
     LIMIT $2`,
    [kp.id, limit]
  );

  return questions.map(q => ({
    questionId: q.question_id,
    questionText: q.question_text,
    correctAnswer: q.correct_answer,
    options: q.options,
    poem: q.poem_id ? {
      id: q.poem_id, title: q.title, author: q.author,
      dynasty: q.dynasty, content: q.content
    } : null,
    source: 'question_knowledge_mappings',
  }));
}

/**
 * 综合检索：为个性化教学组装上下文
 *
 * @param {object} params
 * @param {number} params.poemId       - 目标诗词 ID（可选）
 * @param {string[]} params.weakPoints - 薄弱知识点 code 列表
 * @param {string} params.focusKeyword - 额外关注关键词（可选）
 * @param {number} params.limit        - 每类检索上限
 * @returns {object} 检索结果 { targetPoem, relatedPoems, practiceQuestions, knowledgePoints, sources }
 */
async function retrieveContext(params = {}) {
  const { poemId, weakPoints = [], focusKeyword, limit = 5 } = params;
  const sources = [];
  const result = {
    targetPoem: null,
    relatedPoems: [],
    practiceQuestions: [],
    knowledgePoints: [],
    sources,
  };

  if (poemId) {
    const poem = await getPoemById(poemId);
    if (poem) {
      result.targetPoem = poem;
      sources.push({ type: 'target_poem', id: poem.id, title: poem.title, author: poem.author });
    }
  }

  for (const code of weakPoints.slice(0, 3)) {
    const kpInfo = await getKnowledgePointInfo(code);
    if (kpInfo) {
      result.knowledgePoints.push({
        code: kpInfo.code, name: kpInfo.name,
        category: kpInfo.category, description: kpInfo.description,
        difficulty: kpInfo.difficulty,
        source: 'knowledge_points_table',
      });
    }

    const poems = await findPoemsForKnowledgePoint(code, 2);
    result.relatedPoems.push(...poems);

    const questions = await getPracticeQuestionsForKnowledgePoint(code, 2);
    result.practiceQuestions.push(...questions);
  }

  if (focusKeyword) {
    const poems = await searchPoemsByKeyword(focusKeyword, 2);
    result.relatedPoems.push(...poems);
  }

  const seen = new Set();
  result.relatedPoems = result.relatedPoems.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  }).slice(0, limit);

  for (const p of result.relatedPoems) {
    sources.push({ type: 'related_poem', id: p.id, title: p.title, author: p.author });
  }
  for (const q of result.practiceQuestions) {
    sources.push({ type: 'practice_question', questionId: q.questionId });
  }

  return result;
}

module.exports = {
  getPoemById,
  searchPoemsByKeyword,
  searchPoemsByAuthor,
  searchPoemsByDynasty,
  searchPoemsByTags,
  findPoemsForKnowledgePoint,
  getKnowledgePointInfo,
  getPracticeQuestionsForKnowledgePoint,
  retrieveContext,
  KNOWLEDGE_KEYWORD_MAP,
};