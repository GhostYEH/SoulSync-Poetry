/**
 * 个性化教学服务（RAG 的 Generation + 编排层）
 *
 * 流程：
 *   1. 读取 StudentKnowledgeState → CognitiveDiagnosis 确定薄弱知识点
 *   2. PoetryKnowledgeRetriever 检索相关诗词 + 练习题
 *   3. 按 mastery 三档确定教学深度：FOUNDATION / DEVELOPING / ADVANCED
 *   4. Grounded LLM 生成教学讲解（事实来自 DB，AI 解释来自 LLM）
 *   5. sources 严格来自 Retriever，禁止 LLM 自造引用
 *   6. AI 失败时降级返回数据库事实，不让页面崩溃
 */

const cognitiveDiagnosisService = require('./cognitiveDiagnosisService');
const masteryEngine = require('./masteryUpdateEngine');
const retriever = require('./poetryKnowledgeRetriever');
const aiService = require('./aiService');

const DEPTH_THRESHOLDS = {
  FOUNDATION: 0.4,
  DEVELOPING: 0.7,
};

/**
 * 根据 mastery 值确定教学深度
 */
function determineDepth(mastery) {
  if (mastery < DEPTH_THRESHOLDS.FOUNDATION) return 'FOUNDATION';
  if (mastery < DEPTH_THRESHOLDS.DEVELOPING) return 'DEVELOPING';
  return 'ADVANCED';
}

/**
 * 按教学深度构建系统提示
 */
function buildSystemPrompt(depth) {
  const base = '你是一位资深古诗词教学专家，擅长根据学生的认知水平进行个性化教学。';
  const depthGuides = {
    FOUNDATION: '当前学生处于基础阶段（掌握度<40%），教学重点：字词释义、原文记忆、基本含义。语言通俗，循序渐进，避免过度深入。',
    DEVELOPING: '当前学生处于发展阶段（掌握度40-70%），教学重点：意象分析、情感主题、修辞手法。适度深入，引导思考。',
    ADVANCED: '当前学生处于进阶阶段（掌握度>70%），教学重点：迁移应用、比较鉴赏、创作背景、深层内涵。可以深入探讨，激发批判性思维。',
  };
  return `${base}\n${depthGuides[depth] || depthGuides.DEVELOPING}`;
}

/**
 * 构建 Grounded LLM Prompt
 * 事实性数据从 DB 注入，LLM 只负责生成讲解和分析
 */
function buildTutorPrompt(params) {
  const { targetPoem, weakPoints, relatedPoems, practiceQuestions, depth, focusKnowledgePoint } = params;

  let prompt = '请根据以下数据库检索到的诗词事实和学生学习状态，生成个性化教学内容。\n\n';

  prompt += '## 数据库事实（可信来源，直接引用）\n';
  if (targetPoem) {
    prompt += `### 目标诗词\n`;
    prompt += `标题：${targetPoem.title}\n`;
    prompt += `作者：${targetPoem.author}\n`;
    prompt += `朝代：${targetPoem.dynasty}\n`;
    prompt += `原文：${targetPoem.content}\n`;
    if (targetPoem.tags) prompt += `标签：${targetPoem.tags}\n`;
    prompt += '\n';
  }

  if (relatedPoems.length > 0) {
    prompt += '### 相关诗词（用于对比和拓展）\n';
    for (const p of relatedPoems.slice(0, 3)) {
      prompt += `- 《${p.title}》${p.author}（${p.dynasty}）：${p.content.substring(0, 50)}...\n`;
    }
    prompt += '\n';
  }

  if (weakPoints.length > 0) {
    prompt += '## 学生薄弱知识点（来自认知诊断）\n';
    for (const wp of weakPoints) {
      prompt += `- ${wp.name}（${wp.code}）：掌握度${wp.mastery}%，置信度${wp.confidence}%`;
      if (wp.errorPattern) prompt += `，错误模式：${wp.errorPattern}`;
      prompt += '\n';
    }
    prompt += '\n';
  }

  if (focusKnowledgePoint) {
    prompt += `## 重点教学知识点\n${focusKnowledgePoint.name}：${focusKnowledgePoint.description || ''}\n\n`;
  }

  prompt += `## 教学深度：${depth}\n\n`;

  if (practiceQuestions.length > 0) {
    prompt += '### 已有练习题（来自题库，非AI编造）\n';
    for (const q of practiceQuestions.slice(0, 2)) {
      prompt += `- 题目：${q.questionText}\n`;
      if (q.correctAnswer) prompt += `  正确答案：${q.correctAnswer}\n`;
    }
    prompt += '\n';
  }

  prompt += '## 生成要求\n';
  prompt += '1. explanation：针对学生薄弱点的个性化讲解，结合目标诗词的具体内容\n';
  prompt += '2. keyPoints：3-5个核心知识点（数组），每个含 point（知识点名）和 detail（简述）\n';
  prompt += '3. practiceAdvice：练习建议，指导学生如何巩固\n';
  prompt += '4. 严禁编造诗词原文、作者、朝代等事实性信息\n';
  prompt += '5. 所有事实引用必须来自上方"数据库事实"部分\n\n';

  prompt += '请严格返回以下JSON格式：\n';
  prompt += '{\n';
  prompt += '  "explanation": "个性化讲解文本",\n';
  prompt += '  "keyPoints": [{"point": "知识点", "detail": "简述"}],\n';
  prompt += '  "practiceAdvice": "练习建议"\n';
  prompt += '}';

  return prompt;
}

/**
 * 降级返回（AI 不可用时）
 */
function buildDegradedResponse(context, weakPoints, depth) {
  const targetPoem = context.targetPoem;
  const explanationParts = [];

  if (targetPoem) {
    explanationParts.push(`《${targetPoem.title}》由${targetPoem.dynasty}代诗人${targetPoem.author}所作。`);
    explanationParts.push(`原文：${targetPoem.content}`);
  }

  if (weakPoints.length > 0) {
    explanationParts.push(`你的薄弱知识点：${weakPoints.map(w => w.name).join('、')}。`);
    explanationParts.push(`建议针对${weakPoints[0].name}进行专项练习。`);
  }

  if (depth === 'FOUNDATION') {
    explanationParts.push('建议先从字词理解和原文背诵开始。');
  } else if (depth === 'DEVELOPING') {
    explanationParts.push('建议深入分析意象和修辞手法。');
  } else {
    explanationParts.push('建议尝试迁移应用和比较鉴赏。');
  }

  return {
    explanation: explanationParts.join('\n'),
    keyPoints: weakPoints.slice(0, 3).map(wp => ({
      point: wp.name,
      detail: `掌握度${wp.mastery}%，需要加强`,
    })),
    practiceAdvice: 'AI讲解服务暂时不可用，以上为数据库基础信息。请稍后重试获取个性化讲解。',
    _degraded: true,
  };
}

/**
 * 个性化教学主入口
 *
 * @param {number} userId
 * @param {object} options
 * @param {number} options.poemId              - 目标诗词 ID（可选）
 * @param {string} options.focusKnowledgePoint - 指定教学知识点 code（可选）
 * @returns {object} { depth, targetPoem, weakPoints, teaching, practiceQuestions, sources, degraded }
 */
async function getPersonalizedTutoring(userId, options = {}) {
  const { poemId, focusKnowledgePoint } = options;

  const diagnosis = await cognitiveDiagnosisService.diagnoseStudent(userId);

  let weakPoints = diagnosis.highConfidenceWeak;
  if (focusKnowledgePoint) {
    const focused = diagnosis.points.find(p => p.code === focusKnowledgePoint);
    if (focused) {
      weakPoints = [focused, ...weakPoints.filter(w => w.code !== focusKnowledgePoint)];
    }
  }

  if (weakPoints.length === 0 && diagnosis.lowEvidence.length > 0) {
    weakPoints = diagnosis.lowEvidence;
  }

  const weakCodes = weakPoints.map(w => w.code);
  const focusKpInfo = focusKnowledgePoint
    ? await retriever.getKnowledgePointInfo(focusKnowledgePoint)
    : null;

  const context = await retriever.retrieveContext({
    poemId,
    weakPoints: weakCodes,
    focusKeyword: focusKpInfo ? null : (weakCodes[0] || null),
    limit: 5,
  });

  const avgMastery = weakPoints.length > 0
    ? weakPoints.reduce((sum, w) => sum + w.mastery, 0) / weakPoints.length / 100
    : 0.7;
  const depth = determineDepth(avgMastery);

  const prompt = buildTutorPrompt({
    targetPoem: context.targetPoem,
    weakPoints,
    relatedPoems: context.relatedPoems,
    practiceQuestions: context.practiceQuestions,
    depth,
    focusKnowledgePoint: focusKpInfo,
  });
  const systemContent = buildSystemPrompt(depth);

  let teaching;
  try {
    const aiResult = await aiService.callAIGenerateJSON(prompt, systemContent, {
      temperature: 0.5,
      max_tokens: 800,
    });

    if (aiResult && aiResult.explanation) {
      teaching = {
        explanation: aiResult.explanation,
        keyPoints: Array.isArray(aiResult.keyPoints) ? aiResult.keyPoints : [],
        practiceAdvice: aiResult.practiceAdvice || '',
      };
    } else {
      teaching = buildDegradedResponse(context, weakPoints, depth);
    }
  } catch (err) {
    console.error('[personalizedTutor] AI 调用失败，降级返回:', err.message);
    teaching = buildDegradedResponse(context, weakPoints, depth);
  }

  return {
    depth,
    targetPoem: context.targetPoem,
    weakPoints: weakPoints.map(w => ({
      code: w.code, name: w.name, mastery: w.mastery,
      confidence: w.confidence, level: w.level,
    })),
    knowledgePoints: context.knowledgePoints,
    teaching,
    practiceQuestions: context.practiceQuestions.map(q => ({
      questionId: q.questionId,
      questionText: q.questionText,
      poem: q.poem,
    })),
    relatedPoems: context.relatedPoems.map(p => ({
      id: p.id, title: p.title, author: p.author, dynasty: p.dynasty,
    })),
    sources: context.sources,
    degraded: !!teaching._degraded,
  };
}

module.exports = {
  getPersonalizedTutoring,
  determineDepth,
  buildSystemPrompt,
  buildTutorPrompt,
  buildDegradedResponse,
};