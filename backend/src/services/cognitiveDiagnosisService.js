/**
 * 认知诊断引擎
 *
 * 在 StudentKnowledgeState 基础上分析学生认知状况。
 *
 * 核心区分：
 *   - high_confidence_weak  高置信薄弱：mastery<0.6 且 confidence>0.6 → 需重点教学
 *   - low_evidence          证据不足：attemptCount<3 或 confidence<0.3 → 需更多测评
 *   - strong                掌握良好：mastery>=0.8 且 confidence>0.5
 *   - developing            发展中：其余
 *
 * 错误模式分析：
 *   - consecutive_errors    连续错误（recentPerformance 末尾连续 evidence=0）
 *   - stable_error          稳定错误（多次尝试仍低 mastery）
 */

const db = require('../utils/db');
const masteryEngine = require('./masteryUpdateEngine');

const MASTERY_THRESHOLD = 0.6;
const CONFIDENCE_HIGH = 0.6;
const CONFIDENCE_LOW = 0.3;
const MIN_EVIDENCE_ATTEMPTS = 3;

/**
 * 诊断单个知识点
 * @param {object} state  student_knowledge_states 行（含 code/name）
 */
function diagnosePoint(state) {
  const mastery = state.mastery || 0;
  const confidence = state.confidence || 0;
  const attemptCount = state.attempt_count || 0;

  let level;
  if (mastery < MASTERY_THRESHOLD && confidence > CONFIDENCE_HIGH) {
    level = 'high_confidence_weak';
  } else if (attemptCount < MIN_EVIDENCE_ATTEMPTS || confidence < CONFIDENCE_LOW) {
    level = 'low_evidence';
  } else if (mastery >= 0.8 && confidence > 0.5) {
    level = 'strong';
  } else {
    level = 'developing';
  }

  // 错误模式
  let errorPattern = null;
  let recentPerformance = [];
  try { recentPerformance = JSON.parse(state.recent_performance || '[]'); } catch {}
  // v2 格式 {s, f, t}：f>0 表示答错；v1 格式 {e, t}：e<=0 表示答错
  const isWrong = (p) => (p.f !== undefined) ? (p.f > 0) : (p.e <= 0);
  const lastN = recentPerformance.slice(-3);
  if (lastN.length >= 2 && lastN.every(isWrong)) {
    errorPattern = 'consecutive_errors';
  } else if (attemptCount >= 4 && mastery < 0.4) {
    errorPattern = 'stable_error';
  }

  return {
    knowledgePointId: state.knowledge_point_id,
    code: state.code,
    name: state.name,
    category: state.category,
    parentId: state.parent_id,
    mastery: Math.round(mastery * 100),
    confidence: Math.round(confidence * 100),
    attemptCount,
    correctCount: state.correct_count || 0,
    errorCount: state.error_count || 0,
    level,
    errorPattern,
    lastPracticedAt: state.last_practiced_at,
  };
}

/**
 * 学生完整认知诊断
 * @param {number} userId
 */
async function diagnoseStudent(userId) {
  const states = await masteryEngine.getAllStates(userId);
  const points = states.map(diagnosePoint);

  const highConfidenceWeak = points.filter(p => p.level === 'high_confidence_weak');
  const lowEvidence = points.filter(p => p.level === 'low_evidence');
  const strong = points.filter(p => p.level === 'strong');
  const developing = points.filter(p => p.level === 'developing');

  // 按一级维度聚合
  const dimensionSummary = await aggregateByRootDimension(userId, states);

  return {
    userId,
    totalPoints: points.length,
    points,
    highConfidenceWeak: highConfidenceWeak.sort((a, b) => a.mastery - b.mastery),
    lowEvidence,
    strong,
    developing,
    dimensionSummary,
    suggestion: generateSuggestion(highConfidenceWeak, lowEvidence),
  };
}

/**
 * 按一级维度聚合掌握度
 */
async function aggregateByRootDimension(userId, states) {
  const roots = await db.all(
    `SELECT id, code, name FROM knowledge_points WHERE parent_id IS NULL ORDER BY id`
  );
  const rootMap = {};
  roots.forEach(r => { rootMap[r.id] = { ...r, masterySum: 0, confidenceSum: 0, count: 0 }; });

  // 构建 parent 链：state 可能是二级点，需找到其一级祖先
  const allKp = await db.all('SELECT id, parent_id FROM knowledge_points');
  const kpMap = {};
  allKp.forEach(k => { kpMap[k.id] = k; });

  for (const s of states) {
    let rootId = s.knowledge_point_id;
    let node = kpMap[rootId];
    while (node && node.parent_id) {
      rootId = node.parent_id;
      node = kpMap[rootId];
    }
    if (rootMap[rootId]) {
      rootMap[rootId].masterySum += (s.mastery || 0);
      rootMap[rootId].confidenceSum += (s.confidence || 0);
      rootMap[rootId].count += 1;
    }
  }

  return Object.values(rootMap).map(r => ({
    code: r.code,
    name: r.name,
    avgMastery: r.count > 0 ? Math.round((r.masterySum / r.count) * 100) : null,
    avgConfidence: r.count > 0 ? Math.round((r.confidenceSum / r.count) * 100) : null,
    coveredPoints: r.count,
  }));
}

/**
 * 生成诊断建议
 */
function generateSuggestion(highConfidenceWeak, lowEvidence) {
  if (highConfidenceWeak.length === 0 && lowEvidence.length === 0) {
    return { level: 'good', message: '知识掌握状况良好，建议保持学习节奏并挑战迁移应用类内容。' };
  }
  if (highConfidenceWeak.length > 0) {
    const top = highConfidenceWeak[0];
    return {
      level: 'urgent',
      focusPoint: top.code,
      focusName: top.name,
      message: `「${top.name}」为高置信薄弱点（掌握${top.mastery}%，置信${top.confidence}%），建议优先安排针对性讲解与专项练习。`,
    };
  }
  const top = lowEvidence[0];
  return {
    level: 'attention',
    focusPoint: top.code,
    focusName: top.name,
    message: `「${top.name}」当前证据不足（仅${top.attemptCount}次练习），建议先安排测评题以确认掌握状况。`,
  };
}

/**
 * 班级认知诊断概览
 */
async function diagnoseClass(classId = null) {
  let students;
  if (classId) {
    students = await db.all(
      `SELECT u.id, u.username FROM users u
       JOIN class_members cm ON u.id = cm.user_id AND cm.class_id = $1
       WHERE cm.role = 'student'`,
      [classId]
    );
  } else {
    students = await db.all('SELECT id, username FROM users');
  }

  const overview = [];
  for (const s of students) {
    const diag = await diagnoseStudent(s.id);
    overview.push({
      userId: s.id,
      username: s.username,
      totalPoints: diag.totalPoints,
      highConfidenceWeakCount: diag.highConfidenceWeak.length,
      lowEvidenceCount: diag.lowEvidence.length,
      strongCount: diag.strong.length,
      dimensionSummary: diag.dimensionSummary,
    });
  }
  return overview;
}

module.exports = {
  diagnosePoint,
  diagnoseStudent,
  diagnoseClass,
  aggregateByRootDimension,
};