/**
 * RAG 个性化教学单元测试
 *
 * 测试范围：
 *   1. PersonalizedTutorService 纯函数（determineDepth, buildSystemPrompt, buildTutorPrompt, buildDegradedResponse）
 *   2. PoetryKnowledgeRetriever 模块结构 + KNOWLEDGE_KEYWORD_MAP
 *   3. Grounded LLM Prompt 事实注入正确性
 *   4. sources 严格来自 Retriever
 *   5. 降级返回不崩溃
 *
 * 数据库相关集成测试标 NOT RUN（本机无 PostgreSQL）
 *
 * 运行: node tests/ragTutor.test.js
 */
const assert = require('assert');

const { determineDepth, buildSystemPrompt, buildTutorPrompt, buildDegradedResponse } =
  require('../src/services/personalizedTutorService');
const retriever = require('../src/services/poetryKnowledgeRetriever');

let passed = 0, failed = 0, skipped = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${e.message}`); failed++; }
}
function skip(name, reason) {
  console.log(`  - ${name}  [NOT RUN: ${reason}]`); skipped++;
}

console.log('=== RAG 个性化教学测试 ===\n');

// ===== determineDepth =====
console.log('--- determineDepth 教学深度判定 ---');
test('mastery=0 → FOUNDATION', () => {
  assert.strictEqual(determineDepth(0), 'FOUNDATION');
});
test('mastery=0.39 → FOUNDATION', () => {
  assert.strictEqual(determineDepth(0.39), 'FOUNDATION');
});
test('mastery=0.4 → DEVELOPING', () => {
  assert.strictEqual(determineDepth(0.4), 'DEVELOPING');
});
test('mastery=0.69 → DEVELOPING', () => {
  assert.strictEqual(determineDepth(0.69), 'DEVELOPING');
});
test('mastery=0.7 → ADVANCED', () => {
  assert.strictEqual(determineDepth(0.7), 'ADVANCED');
});
test('mastery=1.0 → ADVANCED', () => {
  assert.strictEqual(determineDepth(1.0), 'ADVANCED');
});

// ===== buildSystemPrompt =====
console.log('\n--- buildSystemPrompt 系统提示 ---');
test('FOUNDATION 提示包含基础阶段', () => {
  const p = buildSystemPrompt('FOUNDATION');
  assert.ok(p.includes('基础阶段'));
  assert.ok(p.includes('字词释义'));
});
test('DEVELOPING 提示包含发展阶段', () => {
  const p = buildSystemPrompt('DEVELOPING');
  assert.ok(p.includes('发展阶段'));
  assert.ok(p.includes('意象分析'));
});
test('ADVANCED 提示包含进阶阶段', () => {
  const p = buildSystemPrompt('ADVANCED');
  assert.ok(p.includes('进阶阶段'));
  assert.ok(p.includes('迁移应用'));
});
test('未知 depth 回退到 DEVELOPING', () => {
  const p = buildSystemPrompt('UNKNOWN');
  assert.ok(p.includes('发展阶段'));
});

// ===== buildTutorPrompt =====
console.log('\n--- buildTutorPrompt Grounded Prompt 构建 ---');
test('包含目标诗词事实', () => {
  const prompt = buildTutorPrompt({
    targetPoem: { title: '静夜思', author: '李白', dynasty: '唐', content: '床前明月光' },
    weakPoints: [], relatedPoems: [], practiceQuestions: [], depth: 'FOUNDATION',
  });
  assert.ok(prompt.includes('静夜思'));
  assert.ok(prompt.includes('李白'));
  assert.ok(prompt.includes('唐'));
  assert.ok(prompt.includes('床前明月光'));
});
test('包含薄弱知识点信息', () => {
  const prompt = buildTutorPrompt({
    targetPoem: null,
    weakPoints: [{ name: '意象·月', code: 'imagery_moon', mastery: 30, confidence: 80, errorPattern: 'consecutive_errors' }],
    relatedPoems: [], practiceQuestions: [], depth: 'FOUNDATION',
  });
  assert.ok(prompt.includes('意象·月'));
  assert.ok(prompt.includes('30%'));
  assert.ok(prompt.includes('consecutive_errors'));
});
test('包含教学深度', () => {
  const prompt = buildTutorPrompt({
    targetPoem: null, weakPoints: [], relatedPoems: [], practiceQuestions: [], depth: 'ADVANCED',
  });
  assert.ok(prompt.includes('ADVANCED'));
});
test('包含已有练习题（非AI编造）', () => {
  const prompt = buildTutorPrompt({
    targetPoem: null, weakPoints: [], relatedPoems: [],
    practiceQuestions: [{ questionText: '月落乌啼霜满天出自哪首诗？', correctAnswer: '枫桥夜泊' }],
    depth: 'DEVELOPING',
  });
  assert.ok(prompt.includes('月落乌啼霜满天'));
  assert.ok(prompt.includes('来自题库'));
});
test('包含JSON格式要求', () => {
  const prompt = buildTutorPrompt({
    targetPoem: null, weakPoints: [], relatedPoems: [], practiceQuestions: [], depth: 'FOUNDATION',
  });
  assert.ok(prompt.includes('explanation'));
  assert.ok(prompt.includes('keyPoints'));
  assert.ok(prompt.includes('practiceAdvice'));
});
test('禁止编造事实提示存在', () => {
  const prompt = buildTutorPrompt({
    targetPoem: null, weakPoints: [], relatedPoems: [], practiceQuestions: [], depth: 'FOUNDATION',
  });
  assert.ok(prompt.includes('严禁编造'));
});

// ===== buildDegradedResponse =====
console.log('\n--- buildDegradedResponse 降级返回 ---');
test('降级返回包含诗词事实', () => {
  const resp = buildDegradedResponse(
    { targetPoem: { title: '春晓', author: '孟浩然', dynasty: '唐', content: '春眠不觉晓' } },
    [], 'FOUNDATION'
  );
  assert.ok(resp.explanation.includes('春晓'));
  assert.ok(resp.explanation.includes('孟浩然'));
  assert.ok(resp.degraded === true);
});
test('降级返回包含薄弱知识点', () => {
  const resp = buildDegradedResponse(
    { targetPoem: null },
    [{ name: '修辞·比喻', code: 'rhetoric_metaphor', mastery: 20 }],
    'DEVELOPING'
  );
  assert.ok(resp.explanation.includes('修辞·比喻'));
  assert.ok(resp.keyPoints.length > 0);
});
test('降级返回按深度给建议', () => {
  const f = buildDegradedResponse({ targetPoem: null }, [], 'FOUNDATION');
  const d = buildDegradedResponse({ targetPoem: null }, [], 'DEVELOPING');
  const a = buildDegradedResponse({ targetPoem: null }, [], 'ADVANCED');
  assert.ok(f.explanation.includes('字词理解'));
  assert.ok(d.explanation.includes('意象'));
  assert.ok(a.explanation.includes('迁移'));
});

// ===== Retriever 模块结构 =====
console.log('\n--- PoetryKnowledgeRetriever 模块结构 ---');
test('retriever 导出所有必要方法', () => {
  assert.strictEqual(typeof retriever.getPoemById, 'function');
  assert.strictEqual(typeof retriever.searchPoemsByKeyword, 'function');
  assert.strictEqual(typeof retriever.searchPoemsByAuthor, 'function');
  assert.strictEqual(typeof retriever.searchPoemsByDynasty, 'function');
  assert.strictEqual(typeof retriever.findPoemsForKnowledgePoint, 'function');
  assert.strictEqual(typeof retriever.getKnowledgePointInfo, 'function');
  assert.strictEqual(typeof retriever.getPracticeQuestionsForKnowledgePoint, 'function');
  assert.strictEqual(typeof retriever.retrieveContext, 'function');
});
test('KNOWLEDGE_KEYWORD_MAP 包含意象映射', () => {
  assert.strictEqual(retriever.KNOWLEDGE_KEYWORD_MAP.imagery_moon, '月');
  assert.strictEqual(retriever.KNOWLEDGE_KEYWORD_MAP.imagery_willow, '柳');
  assert.strictEqual(retriever.KNOWLEDGE_KEYWORD_MAP.imagery_wine, '酒');
});
test('KNOWLEDGE_KEYWORD_MAP 非意象知识点为 null', () => {
  assert.strictEqual(retriever.KNOWLEDGE_KEYWORD_MAP.memorization, null);
  assert.strictEqual(retriever.KNOWLEDGE_KEYWORD_MAP.author_dynasty, null);
});

// ===== DB 集成测试（跳过）=====
console.log('\n--- 数据库集成测试 ---');
skip('getPoemById 从 poems 表检索', '需要 PostgreSQL');
skip('searchPoemsByKeyword 模糊检索', '需要 PostgreSQL');
skip('retrieveContext 综合检索组装', '需要 PostgreSQL');
skip('getPersonalizedTutoring 端到端', '需要 PostgreSQL + AI API');

// ===== 汇总 =====
console.log(`\n=== 汇总 ===`);
console.log(`${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed > 0 ? 1 : 0);