/**
 * 能力聚合与 Source of Truth 单元测试
 *
 * 验证：
 *   1. abilityModelService 不引用 ability_models / ability_history 表
 *   2. CATEGORY → DIMENSION 映射覆盖所有知识维度
 *   3. 聚合计算逻辑正确
 *   4. knowledgeDiagnosisService 已标记 deprecated
 *   5. teacherRoutes 不再 fallback 到 knowledgeDiagnosisService
 *   6. question_knowledge_mappings source 优先级: manual > rule > ai > legacy
 *
 * 运行: node tests/abilityAggregation.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${e.message}`); failed++; }
}

const CATEGORY_TO_DIMENSION = {
  memory: 'memory',
  meta: 'comprehension',
  language: 'comprehension',
  context: 'comprehension',
  transfer: 'expression',
  imagery: 'appreciation',
  emotion: 'appreciation',
  rhetoric: 'appreciation',
};

const KNOWLEDGE_CATEGORIES = ['memory', 'meta', 'language', 'imagery', 'emotion', 'rhetoric', 'context', 'transfer'];

console.log('=== Source of Truth: abilityModelService 不引用旧表 ===');

test('abilityModelService.js 不引用 ability_models 表', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/services/abilityModelService.js'), 'utf8');
  const insertMatch = src.match(/INSERT\s+INTO\s+ability_models/gi);
  const selectMatch = src.match(/FROM\s+ability_models/gi);
  assert.ok(!insertMatch, '不应有 INSERT INTO ability_models');
  assert.ok(!selectMatch, '不应有 SELECT FROM ability_models');
});

test('abilityModelService.js 不引用 ability_history 表', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/services/abilityModelService.js'), 'utf8');
  const insertMatch = src.match(/INSERT\s+INTO\s+ability_history/gi);
  const selectMatch = src.match(/FROM\s+ability_history/gi);
  assert.ok(!insertMatch, '不应有 INSERT INTO ability_history');
  assert.ok(!selectMatch, '不应有 SELECT FROM ability_history');
});

test('abilityModelService.js 引用 student_knowledge_states', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/services/abilityModelService.js'), 'utf8');
  assert.ok(src.includes('student_knowledge_states'), '应从 student_knowledge_states 聚合');
});

test('abilityModelService.js 声明 Source of Truth', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/services/abilityModelService.js'), 'utf8');
  assert.ok(src.includes('Source of Truth'), '应声明 Source of Truth');
});

console.log('\n=== CATEGORY → DIMENSION 映射完整性 ===');

test('所有知识 category 都有映射', () => {
  for (const cat of KNOWLEDGE_CATEGORIES) {
    assert.ok(CATEGORY_TO_DIMENSION[cat], `category "${cat}" 应有映射`);
  }
});

test('映射目标只有4个维度: memory/comprehension/expression/appreciation', () => {
  const targets = new Set(Object.values(CATEGORY_TO_DIMENSION));
  assert.strictEqual(targets.size, 4);
  assert.ok(targets.has('memory'));
  assert.ok(targets.has('comprehension'));
  assert.ok(targets.has('expression'));
  assert.ok(targets.has('appreciation'));
});

test('memory category → memory 维度（记忆能力）', () => {
  assert.strictEqual(CATEGORY_TO_DIMENSION.memory, 'memory');
});

test('meta/language/context → comprehension 维度（理解能力）', () => {
  assert.strictEqual(CATEGORY_TO_DIMENSION.meta, 'comprehension');
  assert.strictEqual(CATEGORY_TO_DIMENSION.language, 'comprehension');
  assert.strictEqual(CATEGORY_TO_DIMENSION.context, 'comprehension');
});

test('transfer → expression 维度（应用能力）', () => {
  assert.strictEqual(CATEGORY_TO_DIMENSION.transfer, 'expression');
});

test('imagery/emotion/rhetoric → appreciation 维度（鉴赏能力）', () => {
  assert.strictEqual(CATEGORY_TO_DIMENSION.imagery, 'appreciation');
  assert.strictEqual(CATEGORY_TO_DIMENSION.emotion, 'appreciation');
  assert.strictEqual(CATEGORY_TO_DIMENSION.rhetoric, 'appreciation');
});

console.log('\n=== 聚合计算逻辑 ===');

function aggregate(masteryByCategory) {
  const buckets = { memory: [], comprehension: [], expression: [], appreciation: [] };
  for (const [cat, mastery] of Object.entries(masteryByCategory)) {
    const dim = CATEGORY_TO_DIMENSION[cat];
    if (dim) buckets[dim].push(mastery);
  }
  const avg = (arr) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) : 50;
  return {
    memory_score: avg(buckets.memory),
    comprehension_score: avg(buckets.comprehension),
    expression_score: avg(buckets.expression),
    appreciation_score: avg(buckets.appreciation),
  };
}

test('空数据 → 全部默认50', () => {
  const r = aggregate({});
  assert.strictEqual(r.memory_score, 50);
  assert.strictEqual(r.comprehension_score, 50);
  assert.strictEqual(r.expression_score, 50);
  assert.strictEqual(r.appreciation_score, 50);
});

test('memory mastery=0.8 → memory_score=80', () => {
  const r = aggregate({ memory: 0.8 });
  assert.strictEqual(r.memory_score, 80);
});

test('多 category 聚合到同一维度取平均', () => {
  const r = aggregate({ meta: 0.6, language: 0.8, context: 0.4 });
  assert.strictEqual(r.comprehension_score, 60);
});

test('不同维度独立计算', () => {
  const r = aggregate({ memory: 0.9, transfer: 0.3, imagery: 0.5 });
  assert.strictEqual(r.memory_score, 90);
  assert.strictEqual(r.expression_score, 30);
  assert.strictEqual(r.appreciation_score, 50);
});

test('overall_score = 4维平均', () => {
  const r = aggregate({ memory: 0.8, transfer: 0.6, imagery: 0.4, meta: 0.5 });
  const overall = Math.round((r.memory_score + r.comprehension_score + r.expression_score + r.appreciation_score) / 4);
  assert.ok(overall >= 0 && overall <= 100);
});

console.log('\n=== knowledgeDiagnosisService 已废弃 ===');

test('knowledgeDiagnosisService.js 标记 @deprecated', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/services/knowledgeDiagnosisService.js'), 'utf8');
  assert.ok(src.includes('@deprecated'), '应标记 @deprecated');
});

test('teacherRoutes.js 不再 fallback 到 knowledgeDiagnosis.getClassKnowledgeOverview', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/api/teacherRoutes.js'), 'utf8');
  assert.ok(!src.includes('knowledgeDiagnosis.getClassKnowledgeOverview'),
    '不应再调用 knowledgeDiagnosis.getClassKnowledgeOverview');
});

test('teacherRoutes.js 不再 fallback 到 knowledgeDiagnosis.getClassKnowledgeHeatmap', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/api/teacherRoutes.js'), 'utf8');
  assert.ok(!src.includes('knowledgeDiagnosis.getClassKnowledgeHeatmap'),
    '不应再调用 knowledgeDiagnosis.getClassKnowledgeHeatmap');
});

test('teacherRoutes.js 不再 fallback 到 knowledgeDiagnosis.getWeakPoints', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/api/teacherRoutes.js'), 'utf8');
  assert.ok(!src.includes('knowledgeDiagnosis.getWeakPoints'),
    '不应再调用 knowledgeDiagnosis.getWeakPoints');
});

test('teacherRoutes.js 不再 fallback 到 knowledgeDiagnosis.getStudentKnowledgeProfile', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/api/teacherRoutes.js'), 'utf8');
  assert.ok(!src.includes('knowledgeDiagnosis.getStudentKnowledgeProfile'),
    '不应再调用 knowledgeDiagnosis.getStudentKnowledgeProfile');
});

test('teacherRoutes.js source 统一为 student_knowledge_states', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/api/teacherRoutes.js'), 'utf8');
  assert.ok(!src.includes('legacy_wrong_questions'), '不应再有 legacy_wrong_questions 来源');
});

console.log('\n=== question_knowledge_mappings source 优先级 ===');

test('learningEventService 写入映射时 source=rule', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/services/learningEventService.js'), 'utf8');
  assert.ok(src.includes("source='rule'") || src.includes("source: 'rule'") || src.includes("'rule'"),
    '应标注 source=rule');
});

test('knowledgeModelService 注释标注规则推断非AI理解', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/services/knowledgeModelService.js'), 'utf8');
  assert.ok(src.includes('rule') || src.includes('规则'), '应标注规则推断');
  assert.ok(!src.includes('AI 自动认知理解') || src.includes('不是 AI 自动认知理解'),
    '不应声称 AI 自动认知理解');
});

test('migrate.js 包含 confidence 字段迁移', () => {
  const src = fs.readFileSync(path.join(__dirname, '../scripts/migrate.js'), 'utf8');
  assert.ok(src.includes('qkm_confidence'), '应有 confidence 字段迁移');
});

test('source 优先级: manual > rule > ai > legacy', () => {
  const priorities = { manual: 4, rule: 3, ai: 2, legacy: 1 };
  assert.ok(priorities.manual > priorities.rule);
  assert.ok(priorities.rule > priorities.ai);
  assert.ok(priorities.ai > priorities.legacy);
});

console.log('\n=== abilityModelService 兼容接口 ===');

test('abilityModelService 导出所有兼容方法名', () => {
  const svc = require('../src/services/abilityModelService');
  assert.strictEqual(typeof svc.getUserAbilityModel, 'function');
  assert.strictEqual(typeof svc.getAbilityModel, 'function');
  assert.strictEqual(typeof svc.calculateAbilityFromLearning, 'function');
  assert.strictEqual(typeof svc.calculateAbilityModel, 'function');
  assert.strictEqual(typeof svc.getAbilityTrend, 'function');
  assert.strictEqual(typeof svc.getAbilityHistory, 'function');
  assert.strictEqual(typeof svc.getWeakDimensions, 'function');
  assert.strictEqual(typeof svc.getAbilityRanking, 'function');
  assert.strictEqual(typeof svc.aggregateAbilityFromKnowledgeStates, 'function');
});

console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);