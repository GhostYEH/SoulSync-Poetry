/**
 * 实际数据示例：一个学生在"意象-柳"知识点上的4个连续事件
 * 展示 mastery/confidence 的真实变化（由代码计算，非手工编造）
 *
 * 运行: node tests/exampleStudentJourney.js
 */
const { computeEvidence, computeMastery, computeConfidence, MASTERY_ALGORITHM_VERSION } =
  require('../src/services/masteryUpdateEngine');

console.log('========================================');
console.log('  学生知识状态变化实例（算法 ' + MASTERY_ALGORITHM_VERSION + '）');
console.log('  知识点：意象-柳（imagery_willow）');
console.log('========================================\n');

const evidences = [];
const events = [
  { label: '事件1：简单题答错（难度1）', correct: false, difficulty: 1, hint: 0 },
  { label: '事件2：中等题答对（难度3）', correct: true, difficulty: 3, hint: 0 },
  { label: '事件3：使用提示后答对（难度3）', correct: true, difficulty: 3, hint: 1 },
  { label: '事件4：高难度题独立答对（难度5）', correct: true, difficulty: 5, hint: 0 },
];

console.log('初始状态（无证据）：');
console.log(`  mastery   = 0.50（先验）`);
console.log(`  confidence= 0.00\n`);

for (const ev of events) {
  const evidence = computeEvidence(ev.correct, ev.difficulty, ev.hint);
  evidences.push(evidence);
  const mastery = computeMastery([...evidences]);
  const confidence = computeConfidence([...evidences]);

  console.log(ev.label + ':');
  console.log(`  evidence  = ${evidence.toFixed(4)}  ${evidence > 0 ? '（正证据）' : '（负证据）'}`);
  console.log(`  mastery   = ${mastery.toFixed(4)}  → ${(mastery * 100).toFixed(1)}%`);
  console.log(`  confidence= ${confidence.toFixed(4)}  → ${(confidence * 100).toFixed(1)}%`);

  const masteryTrend = evidences.length > 1
    ? mastery - computeMastery(evidences.slice(0, -1)) : 0;
  const confTrend = evidences.length > 1
    ? confidence - computeConfidence(evidences.slice(0, -1)) : 0;
  if (evidences.length > 1) {
    console.log(`  变化      : mastery ${masteryTrend >= 0 ? '+' : ''}${(masteryTrend * 100).toFixed(1)}%, confidence ${confTrend >= 0 ? '+' : ''}${(confTrend * 100).toFixed(1)}%`);
  }
  console.log('');
}

console.log('========================================');
console.log('  结论');
console.log('========================================');
console.log(`  4个事件后：mastery=${(computeMastery(evidences)*100).toFixed(1)}%, confidence=${(computeConfidence(evidences)*100).toFixed(1)}%`);
console.log('  - 事件1答错使mastery下降（简单题答错负证据强）');
console.log('  - 事件2答对使mastery回升');
console.log('  - 事件3提示答对贡献较弱（0.6倍惩罚）');
console.log('  - 事件4高难度独立答对贡献最强');
console.log('  - confidence随事件增多持续上升');