/**
 * 知识状态聚合服务（Source of Truth: student_knowledge_states）
 *
 * 替代 knowledgeDiagnosisService 中基于 wrong_questions 的班级聚合。
 * 所有班级级知识概览/热力图/薄弱点均从 student_knowledge_states 读取，
 * 保证与学生学习画像（/knowledge/student/:id/profile）数据来源一致。
 */

const db = require('../utils/db');

const KNOWLEDGE_DIMENSIONS = [
  { key: 'memorization',        label: '原文记忆', icon: '📖', desc: '默写、填空、上下句补全' },
  { key: 'author_dynasty',      label: '作者朝代', icon: '👤', desc: '识别作者与所属朝代' },
  { key: 'word_meaning',        label: '字词理解', icon: '🔍', desc: '关键字词的含义与注音' },
  { key: 'imagery',             label: '意象把握', icon: '🌙', desc: '意象识别与象征义' },
  { key: 'emotion_theme',       label: '情感主题', icon: '💗', desc: '情感基调与中心主旨' },
  { key: 'rhetoric',            label: '修辞手法', icon: '✍️', desc: '比喻、拟人、对偶等修辞' },
  { key: 'allusion_background', label: '典故背景', icon: '📜', desc: '用典与创作背景' },
  { key: 'application',         label: '迁移应用', icon: '🔗', desc: '跨诗比较与迁移' },
];

/**
 * 构建 knowledge_point_id → root_code 映射
 * 返回 { pointId: rootCode, ... } 以及 { rootCode: rootRow, ... }
 */
async function buildRootMap() {
  const allKp = await db.all('SELECT id, code, parent_id FROM knowledge_points');
  const byId = {};
  allKp.forEach(k => { byId[k.id] = k; });

  const pointToRoot = {};
  for (const kp of allKp) {
    let cur = kp;
    while (cur && cur.parent_id) {
      cur = byId[cur.parent_id];
    }
    pointToRoot[kp.id] = cur ? cur.code : null;
  }
  return pointToRoot;
}

/**
 * 获取学生列表（按班级或全部）
 */
async function getStudents(classId, limit) {
  if (classId) {
    return db.all(
      `SELECT u.id, u.username FROM users u
       JOIN class_members cm ON u.id = cm.user_id AND cm.class_id = $1
       WHERE cm.role = 'student'
       ORDER BY u.id${limit ? ' LIMIT $2' : ''}`,
      limit ? [classId, limit] : [classId]
    );
  }
  return db.all(
    `SELECT id, username FROM users ORDER BY id${limit ? ' LIMIT $1' : ''}`,
    limit ? [limit] : []
  );
}

/**
 * 班级知识掌握概览（从 student_knowledge_states 聚合到一级维度）
 * 返回结构与 knowledgeDiagnosisService.getClassKnowledgeOverview 兼容
 */
async function getClassKnowledgeOverview(classId = null) {
  const students = await getStudents(classId);
  if (students.length === 0) {
    return KNOWLEDGE_DIMENSIONS.map(d => ({
      key: d.key, label: d.label, icon: d.icon, desc: d.desc,
      avgMastery: null, totalQuestions: 0, coveredStudents: 0,
    }));
  }

  const pointToRoot = await buildRootMap();
  const studentIds = students.map(s => s.id);

  const states = await db.all(
    `SELECT s.user_id, s.knowledge_point_id, s.mastery, s.confidence, s.attempt_count
     FROM student_knowledge_states s
     WHERE s.user_id = ANY($1::int[])`,
    [studentIds]
  );

  const dimAgg = {};
  KNOWLEDGE_DIMENSIONS.forEach(d => {
    dimAgg[d.key] = { ...d, masterySum: 0, attemptSum: 0, students: new Set() };
  });

  for (const st of states) {
    const rootCode = pointToRoot[st.knowledge_point_id];
    if (!rootCode || !dimAgg[rootCode]) continue;
    dimAgg[rootCode].masterySum += (st.mastery || 0) * 100;
    dimAgg[rootCode].attemptSum += (st.attempt_count || 0);
    dimAgg[rootCode].students.add(st.user_id);
  }

  return KNOWLEDGE_DIMENSIONS.map(d => {
    const agg = dimAgg[d.key];
    const covered = agg.students.size;
    return {
      key: d.key, label: d.label, icon: d.icon, desc: d.desc,
      avgMastery: covered > 0 ? Math.round(agg.masterySum / covered) : null,
      totalQuestions: agg.attemptSum,
      coveredStudents: covered,
    };
  });
}

/**
 * 班级学生×知识维度 热力图（从 student_knowledge_states）
 */
async function getClassKnowledgeHeatmap(classId = null, limit = 50) {
  const students = await getStudents(classId, limit);
  if (students.length === 0) return { dimensions: KNOWLEDGE_DIMENSIONS, students: [] };

  const pointToRoot = await buildRootMap();
  const studentIds = students.map(s => s.id);

  const states = await db.all(
    `SELECT s.user_id, s.knowledge_point_id, s.mastery, s.attempt_count
     FROM student_knowledge_states s
     WHERE s.user_id = ANY($1::int[])`,
    [studentIds]
  );

  const byUser = {};
  states.forEach(st => {
    const rootCode = pointToRoot[st.knowledge_point_id];
    if (!rootCode) return;
    if (!byUser[st.user_id]) byUser[st.user_id] = {};
    if (!byUser[st.user_id][rootCode]) {
      byUser[st.user_id][rootCode] = { masterySum: 0, count: 0 };
    }
    byUser[st.user_id][rootCode].masterySum += (st.mastery || 0) * 100;
    byUser[st.user_id][rootCode].count += 1;
  });

  const heatmap = students.map(s => {
    const row = { userId: s.id, username: s.username, dimensions: {} };
    for (const dim of KNOWLEDGE_DIMENSIONS) {
      const agg = (byUser[s.id] || {})[dim.key];
      row.dimensions[dim.key] = agg
        ? { mastery: Math.round(agg.masterySum / agg.count), count: agg.count }
        : { mastery: null, count: 0 };
    }
    return row;
  });

  return { dimensions: KNOWLEDGE_DIMENSIONS, students: heatmap };
}

/**
 * 高频薄弱知识点（从 student_knowledge_states）
 * 返回低 mastery + 高 confidence 的知识点，按维度分组
 */
async function getWeakPoints(classId = null, topN = 10) {
  const students = await getStudents(classId);
  if (students.length === 0) {
    return { byDimension: {}, dimensionSummary: KNOWLEDGE_DIMENSIONS.map(d => ({ ...d, errorCount: 0, topQuestions: [] })) };
  }

  const pointToRoot = await buildRootMap();
  const studentIds = students.map(s => s.id);

  const weakStates = await db.all(
    `SELECT s.user_id, s.knowledge_point_id, s.mastery, s.confidence,
            s.attempt_count, s.error_count, s.correct_count,
            kp.code, kp.name, kp.category, kp.parent_id, kp.difficulty
     FROM student_knowledge_states s
     JOIN knowledge_points kp ON s.knowledge_point_id = kp.id
     WHERE s.user_id = ANY($1::int[])
       AND s.mastery < 0.5
       AND s.attempt_count >= 2
     ORDER BY s.mastery ASC
     LIMIT $2`,
    [studentIds, topN * 4]
  );

  const byDimension = {};
  KNOWLEDGE_DIMENSIONS.forEach(d => { byDimension[d.key] = []; });

  for (const st of weakStates) {
    const rootCode = pointToRoot[st.knowledge_point_id];
    if (!rootCode || !byDimension[rootCode]) continue;
    byDimension[rootCode].push({
      code: st.code,
      name: st.name,
      mastery: Math.round((st.mastery || 0) * 100),
      confidence: Math.round((st.confidence || 0) * 100),
      attemptCount: st.attempt_count,
      errorCount: st.error_count,
      correctCount: st.correct_count,
      difficulty: st.difficulty,
    });
  }

  const dimensionSummary = KNOWLEDGE_DIMENSIONS.map(d => ({
    ...d,
    errorCount: byDimension[d.key].length,
    avgMastery: byDimension[d.key].length > 0
      ? Math.round(byDimension[d.key].reduce((s, x) => s + x.mastery, 0) / byDimension[d.key].length)
      : null,
    topQuestions: byDimension[d.key].slice(0, 3),
  })).sort((a, b) => b.errorCount - a.errorCount);

  return { byDimension, dimensionSummary };
}

/**
 * 生成教学建议（与 legacy 版兼容）
 */
function generateTeachingSuggestion(weakDimensions) {
  if (!weakDimensions || weakDimensions.length === 0 || weakDimensions[0].errorCount === 0) {
    return { level: 'good', message: '班级整体知识掌握良好，建议维持现有教学节奏，适当增加迁移应用类练习。' };
  }
  const top = weakDimensions[0];
  const suggestions = {
    memorization: '建议增加课堂默写与上下句接龙，利用间隔复习巩固原文记忆。',
    author_dynasty: '建议梳理诗人朝代时间轴，结合作品做作者-朝代配对练习。',
    word_meaning: '建议对高频错字词做专项讲解，配合字义辨析卡片。',
    imagery: '建议专题讲解核心意象（月、柳、雁、梅等）的文化含义，建立意象-情感映射。',
    emotion_theme: '建议引导学生从意象切入归纳情感，多做"意象→情感"推导训练。',
    rhetoric: '建议系统介绍常见修辞及判定方法，配合修辞辨析练习。',
    allusion_background: '建议补充创作背景与典故故事，帮助理解用典意图。',
    application: '建议增加同主题跨作者比较阅读，训练迁移与类比能力。',
  };
  return {
    level: (top.avgMastery !== null && top.avgMastery < 40) ? 'urgent' : 'attention',
    focusDimension: top.key,
    focusLabel: top.label,
    message: suggestions[top.key] || '建议针对薄弱维度加强专项练习。',
  };
}

module.exports = {
  KNOWLEDGE_DIMENSIONS,
  getClassKnowledgeOverview,
  getClassKnowledgeHeatmap,
  getWeakPoints,
  generateTeachingSuggestion,
};