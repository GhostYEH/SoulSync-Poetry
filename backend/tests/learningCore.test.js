/**
 * 学习智能核心单元测试 (v2 — Weighted Bayesian Evidence Model)
 * 运行: node tests/learningCore.test.js
 * 详细: node tests/learningCore.test.js --verbose
 */
const assert = require('assert');
const { computeEvidence, computeMastery, computeConfidence, timeDecayWeight,
        MASTERY_ALGORITHM_VERSION, ALPHA, BETA, PRIOR_MASTERY } = require('../src/services/masteryUpdateEngine');
const { inferKnowledgePoints } = require('../src/services/knowledgeModelService');
const { diagnosePoint } = require('../src/services/cognitiveDiagnosisService');

const verbose = process.argv[2] === '--verbose';
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); if (verbose) console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${e.message}`); failed++; }
}
function approx(a, b, eps = 0.01) { return Math.abs(a - b) < eps; }
function show(label, val) { if (verbose) console.log(`    ${label} = ${val}`); }

console.log('=== 算法版本 ===');
test('版本为 v2', () => assert.strictEqual(MASTERY_ALGORITHM_VERSION, 'v2'));
test('先验 mastery = α/(α+β) = 0.5', () => assert.ok(approx(PRIOR_MASTERY, 0.5)));
test('α = β = 1 (均匀先验)', () => {
  assert.strictEqual(ALPHA, 1);
  assert.strictEqual(BETA, 1);
});

console.log('\n=== computeEvidence（非负分离证据）===');
test('正确-难度1 → success=0.2, failure=0', () => {
  const e = computeEvidence(true, 1, 0); show('evidence', JSON.stringify(e));
  assert.ok(approx(e.success, 0.2));
  assert.strictEqual(e.failure, 0);
});
test('正确-难度3 → success=0.6, failure=0', () => {
  const e = computeEvidence(true, 3, 0);
  assert.ok(approx(e.success, 0.6));
  assert.strictEqual(e.failure, 0);
});
test('正确-难度5 → success=1.0, failure=0', () => {
  const e = computeEvidence(true, 5, 0);
  assert.ok(approx(e.success, 1.0));
  assert.strictEqual(e.failure, 0);
});
test('错误-难度1 → success=0, failure=1.0（简单题答错最严重）', () => {
  const e = computeEvidence(false, 1, 0); show('evidence', JSON.stringify(e));
  assert.strictEqual(e.success, 0);
  assert.ok(approx(e.failure, 1.0));
});
test('错误-难度3 → success=0, failure=0.6', () => {
  const e = computeEvidence(false, 3, 0);
  assert.strictEqual(e.success, 0);
  assert.ok(approx(e.failure, 0.6));
});
test('错误-难度5 → success=0, failure=0.2（难题答错情有可原）', () => {
  const e = computeEvidence(false, 5, 0);
  assert.strictEqual(e.success, 0);
  assert.ok(approx(e.failure, 0.2));
});
test('简单题答错 failure > 难题答错 failure', () => {
  const easy = computeEvidence(false, 1, 0);
  const hard = computeEvidence(false, 5, 0);
  assert.ok(easy.failure > hard.failure);
});
test('提示答对 → success ×0.6', () => {
  const noHint = computeEvidence(true, 3, 0);
  const withHint = computeEvidence(true, 3, 1);
  assert.ok(approx(withHint.success, noHint.success * 0.6));
});
test('证据非负：success ≥ 0 且 failure ≥ 0', () => {
  for (let d = 1; d <= 5; d++) {
    const ec = computeEvidence(true, d, 0);
    const ew = computeEvidence(false, d, 0);
    assert.ok(ec.success >= 0 && ec.failure >= 0);
    assert.ok(ew.success >= 0 && ew.failure >= 0);
  }
});
test('证据互斥：success>0 时 failure=0，反之亦然', () => {
  for (let d = 1; d <= 5; d++) {
    const ec = computeEvidence(true, d, 0);
    const ew = computeEvidence(false, d, 0);
    assert.ok(ec.success > 0 && ec.failure === 0);
    assert.ok(ew.success === 0 && ew.failure > 0);
  }
});

console.log('\n=== computeMastery（Beta-Binomial 后验）===');
test('1题答对(难度3) → mastery≈0.59, 不会满分', () => {
  const e = computeEvidence(true, 3, 0);
  const m = computeMastery([e]); show('mastery', m);
  assert.ok(m < 0.7 && m > 0.5);
});
test('1题答错(难度3) → mastery≈0.43, 不会0分', () => {
  const e = computeEvidence(false, 3, 0);
  const m = computeMastery([e]); show('mastery', m);
  assert.ok(m < 0.5 && m > 0.35);
});
test('简单题答错 < 难题答错（mastery）', () => {
  const mEasy = computeMastery([computeEvidence(false, 1, 0)]);
  const mHard = computeMastery([computeEvidence(false, 5, 0)]);
  show('简单题答错', mEasy); show('难题答错', mHard);
  assert.ok(mEasy < mHard);
});
test('难题答对 > 简单题答对（mastery）', () => {
  const mHard = computeMastery([computeEvidence(true, 5, 0)]);
  const mEasy = computeMastery([computeEvidence(true, 1, 0)]);
  assert.ok(mHard > mEasy);
});
test('连续10题答对 → mastery>0.84', () => {
  const ev = Array(10).fill(computeEvidence(true, 3, 0));
  assert.ok(computeMastery(ev) > 0.84);
});
test('连续10题答错 → mastery<0.17', () => {
  const ev = Array(10).fill(computeEvidence(false, 3, 0));
  const m = computeMastery(ev); show('mastery', m);
  assert.ok(m < 0.17);
});
test('空证据 → 先验0.5', () => {
  assert.ok(approx(computeMastery([]), PRIOR_MASTERY));
});
test('先对后错 → mastery下降', () => {
  const m1 = computeMastery([{success:1,failure:0},{success:1,failure:0},{success:1,failure:0}]);
  const m2 = computeMastery([{success:1,failure:0},{success:1,failure:0},{success:1,failure:0},
    {success:0,failure:0.6},{success:0,failure:0.6}]);
  assert.ok(m2 < m1);
});
test('最近5次改善 → mastery>0.5', () => {
  const ev = [{success:0,failure:0.6},{success:0,failure:0.6},{success:0,failure:0.6},
    {success:0.6,failure:0},{success:0.6,failure:0},{success:0.6,failure:0},
    {success:0.6,failure:0},{success:0.6,failure:0}];
  assert.ok(computeMastery(ev) > 0.5);
});

console.log('\n=== computeConfidence（样本量+一致性）===');
test('1题 → confidence<0.4', () => {
  const c = computeConfidence([computeEvidence(true, 3, 0)]); show('confidence', c);
  assert.ok(c < 0.4);
});
test('10题一致 → confidence>0.7', () => {
  assert.ok(computeConfidence(Array(10).fill(computeEvidence(true, 3, 0))) > 0.7);
});
test('20题稳定 → confidence>0.85', () => {
  assert.ok(computeConfidence(Array(20).fill(computeEvidence(true, 3, 0))) > 0.85);
});
test('空 → confidence=0', () => assert.ok(approx(computeConfidence([]), 0)));
test('不一致 → confidence降低', () => {
  const consistent = computeConfidence(Array(6).fill({success:0.6,failure:0}));
  const inconsistent = computeConfidence([
    {success:0.6,failure:0},{success:0,failure:0.6},{success:0.6,failure:0},
    {success:0,failure:0.6},{success:0.6,failure:0},{success:0,failure:0.6}]);
  assert.ok(inconsistent < consistent);
});

console.log('\n=== mastery vs confidence 严格分离 ===');
test('1题答对：mastery偏高但confidence低', () => {
  const ev = [computeEvidence(true, 3, 0)];
  const m = computeMastery(ev); const c = computeConfidence(ev);
  show('mastery', m); show('confidence', c);
  assert.ok(m > 0.5 && c < 0.4);
});
test('10题稳定答对：mastery和confidence都高', () => {
  const ev = Array(10).fill(computeEvidence(true, 3, 0));
  const m = computeMastery(ev); const c = computeConfidence(ev);
  assert.ok(m > 0.8 && c > 0.7);
});

console.log('\n=== 数学性质：范围 [0, 1] ===');
test('mastery 始终在 [0, 1] 内（随机测试）', () => {
  for (let trial = 0; trial < 200; trial++) {
    const n = 1 + Math.floor(Math.random() * 20);
    const ev = [];
    for (let i = 0; i < n; i++) {
      const d = 1 + Math.floor(Math.random() * 5);
      ev.push(computeEvidence(Math.random() > 0.5, d, Math.random() > 0.7 ? 1 : 0));
    }
    const m = computeMastery(ev);
    assert.ok(m >= 0 && m <= 1, `mastery=${m} 越界`);
  }
});
test('confidence 始终在 [0, 1] 内（随机测试）', () => {
  for (let trial = 0; trial < 200; trial++) {
    const n = 1 + Math.floor(Math.random() * 20);
    const ev = [];
    for (let i = 0; i < n; i++) {
      const d = 1 + Math.floor(Math.random() * 5);
      ev.push(computeEvidence(Math.random() > 0.5, d, 0));
    }
    const c = computeConfidence(ev);
    assert.ok(c >= 0 && c <= 1, `confidence=${c} 越界`);
  }
});

console.log('\n=== 数学性质：单调性 ===');
test('答对使 mastery 上升', () => {
  const before = computeMastery([{success:0.6,failure:0},{success:0,failure:0.6}]);
  const after = computeMastery([{success:0.6,failure:0},{success:0,failure:0.6},{success:0.6,failure:0}]);
  assert.ok(after > before, `before=${before} after=${after}`);
});
test('答错使 mastery 下降', () => {
  const before = computeMastery([{success:0.6,failure:0},{success:0.6,failure:0}]);
  const after = computeMastery([{success:0.6,failure:0},{success:0.6,failure:0},{success:0,failure:0.6}]);
  assert.ok(after < before, `before=${before} after=${after}`);
});

console.log('\n=== 数学性质：收敛性 ===');
test('连续答对50题 → mastery → 1 (>0.9)', () => {
  const ev = Array(50).fill(computeEvidence(true, 3, 0));
  const m = computeMastery(ev); show('mastery', m);
  assert.ok(m > 0.9);
});
test('连续答错50题 → mastery → 0 (<0.1)', () => {
  const ev = Array(50).fill(computeEvidence(false, 3, 0));
  const m = computeMastery(ev); show('mastery', m);
  assert.ok(m < 0.1);
});
test('收敛单调：答对序列 mastery 递增', () => {
  let prev = PRIOR_MASTERY;
  for (let n = 1; n <= 20; n++) {
    const m = computeMastery(Array(n).fill(computeEvidence(true, 3, 0)));
    assert.ok(m >= prev - 0.001, `n=${n} m=${m} prev=${prev} 非递增`);
    prev = m;
  }
});
test('收敛单调：答错序列 mastery 递减', () => {
  let prev = PRIOR_MASTERY;
  for (let n = 1; n <= 20; n++) {
    const m = computeMastery(Array(n).fill(computeEvidence(false, 3, 0)));
    assert.ok(m <= prev + 0.001, `n=${n} m=${m} prev=${prev} 非递减`);
    prev = m;
  }
});

console.log('\n=== 数学性质：先验与对称性 ===');
test('无证据 → 先验 0.5', () => assert.ok(approx(computeMastery([]), 0.5)));
test('1答对+1答错(同难度) → mastery 接近先验', () => {
  const m = computeMastery([computeEvidence(true, 3, 0), computeEvidence(false, 3, 0)]);
  show('mastery', m);
  assert.ok(approx(m, 0.5, 0.05));
});

console.log('\n=== timeDecayWeight ===');
test('今天→1.0', () => assert.ok(approx(timeDecayWeight(0), 1.0)));
test('14天→~0.37', () => assert.ok(approx(timeDecayWeight(14), Math.exp(-1), 0.05)));
test('越久越低', () => {
  assert.ok(timeDecayWeight(1) > timeDecayWeight(7));
  assert.ok(timeDecayWeight(7) > timeDecayWeight(30));
});

console.log('\n=== inferKnowledgePoints（一题多知识点）===');
test('含"柳"和"送别" → 多知识点', () => {
  const pts = inferKnowledgePoints('下列诗句中"柳"象征什么？此诗属于送别诗吗？');
  assert.ok(pts.includes('imagery_willow'));
  assert.ok(pts.includes('emotion_farewell'));
});
test('含"夸张" → rhetoric_exaggeration + rhetoric', () => {
  const pts = inferKnowledgePoints('"飞流直下三千尺"运用了夸张的修辞手法');
  assert.ok(pts.includes('rhetoric_exaggeration'));
  assert.ok(pts.includes('rhetoric'));
});
test('默写题 → memorization', () => {
  assert.ok(inferKnowledgePoints('请默写《静夜思》全诗').includes('memorization'));
});
test('作者题 → author_identify + author_dynasty', () => {
  const pts = inferKnowledgePoints('《春晓》的作者是谁？');
  assert.ok(pts.includes('author_identify'));
  assert.ok(pts.includes('author_dynasty'));
});

console.log('\n=== diagnosePoint（高置信 vs 低置信薄弱）===');
test('低mastery+高confidence → high_confidence_weak', () => {
  const r = diagnosePoint({
    mastery: 0.43, confidence: 0.86, attempt_count: 8,
    correct_count: 3, error_count: 5, recent_performance: '[]',
    knowledge_point_id: 1, code: 'imagery_willow', name: '柳', category: 'imagery', parent_id: 4,
  });
  assert.strictEqual(r.level, 'high_confidence_weak');
  assert.strictEqual(r.attemptCount, 8);
});
test('低mastery+低confidence → low_evidence', () => {
  const r = diagnosePoint({
    mastery: 0.45, confidence: 0.22, attempt_count: 1,
    correct_count: 0, error_count: 1, recent_performance: '[]',
    knowledge_point_id: 2, code: 'rhetoric_allusion', name: '用典', category: 'rhetoric', parent_id: 7,
  });
  assert.strictEqual(r.level, 'low_evidence');
  assert.strictEqual(r.attemptCount, 1);
});
test('高mastery+中confidence → strong', () => {
  const r = diagnosePoint({
    mastery: 0.9, confidence: 0.6, attempt_count: 10,
    correct_count: 9, error_count: 1, recent_performance: '[]',
    knowledge_point_id: 3, code: 'memorization', name: '原文记忆', category: 'memory', parent_id: null,
  });
  assert.strictEqual(r.level, 'strong');
});
test('连续错误 → consecutive_errors', () => {
  const r = diagnosePoint({
    mastery: 0.3, confidence: 0.7, attempt_count: 5,
    correct_count: 1, error_count: 4,
    recent_performance: JSON.stringify([{s:0.6,f:0,t:'2026-01-01'},{s:0,f:0.6,t:'2026-01-02'},{s:0,f:0.6,t:'2026-01-03'},{s:0,f:0.6,t:'2026-01-04'}]),
    knowledge_point_id: 4, code: 'imagery_moon', name: '月', category: 'imagery', parent_id: 4,
  });
  assert.strictEqual(r.errorPattern, 'consecutive_errors');
});

console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);
