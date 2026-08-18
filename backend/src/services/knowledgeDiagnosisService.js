/**
 * @deprecated 已废弃 — 请使用 knowledgeStateService + masteryUpdateEngine
 *
 * 古诗词知识诊断服务（旧版，基于 wrong_questions 的第二套 mastery 算法）
 *
 * ⚠️ 本服务包含独立的掌握度计算逻辑（加权正确率 + EWMA），
 *    与 masteryUpdateEngine 的 Weighted Bayesian Evidence Model v2 冲突。
 *    系统只能有一套 Source of Truth: student_knowledge_states。
 *
 *    teacherRoutes.js 已移除所有 fallback 到本服务的逻辑。
 *    保留本文件仅供历史参考，不应被生产路由调用。
 *
 * 设计理念：
 *   系统不只统计学生做了多少题，而是把每一道错题/每一次学习行为
 *   归因到具体的古诗词知识维度，再聚合为可解释的掌握度。
 *
 * 知识维度定义（依据古诗词教学大纲常见分解）：
 *   1. memorization        原文记忆（默写、填空、上下句）
 *   2. author_dynasty      作者朝代识别
 *   3. word_meaning        字词理解
 *   4. imagery             意象把握
 *   5. emotion_theme       情感与主题
 *   6. rhetoric            修辞手法
 *   7. allusion_background 典故与背景
 *   8. application         迁移与比较应用
 *
 * 掌握度算法（可解释加权正确率 + EWMA 时序衰减）：
 *   对某学生在某维度下的全部答题记录：
 *     mastery = Σ(w_i * c_i) / Σ(w_i) * 100
 *   其中 w_i = difficulty_i（题目 level，越高权重越大）
 *        c_i = 正确性（mastered=1 或 correct_streak/(correct_streak+wrong_count)）
 *   再按时间做 EWMA 衰减，最近表现权重更高：
 *     final = α * recent + (1-α) * overall，α=0.4
 *   原文记忆维度额外融合 learning_records.best_score：
 *     memorization = 0.6 * question_mastery + 0.4 * avg(best_score)
 *
 * 所有分数都有明确来源，前端可展示"为什么是这个分"。
 */

const db = require('../utils/db');

// 知识维度元数据
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

// 题目文本 → 知识维度 关键词映射（按优先级匹配）
const DIMENSION_KEYWORDS = [
  { dim: 'author_dynasty',      words: ['作者', '谁写', '诗人', '朝代', '年代', '哪朝', '出自'] },
  { dim: 'word_meaning',        words: ['意思', '解释', '含义', '字词', '加点字', '注音', '读音', '词义'] },
  { dim: 'imagery',             words: ['意象', '象征', '代表', '寄托', '物象', '描绘了'] },
  { dim: 'emotion_theme',       words: ['情感', '感情', '思想', '主题', '中心', '表达了', '抒发', '心情'] },
  { dim: 'rhetoric',            words: ['修辞', '比喻', '拟人', '夸张', '对偶', '借代', '反问', '设问', '排比'] },
  { dim: 'allusion_background', words: ['典故', '背景', '出处', '历史', '写作背景', '创作背景'] },
  { dim: 'application',         words: ['类似', '相同', '比较', '迁移', '类比', '共同', '相似', '不同于'] },
  { dim: 'memorization',        words: ['默写', '填空', '背诵', '原文', '上句', '下句', '补全', '完整'] },
];

/**
 * 根据题目文本推断知识维度
 * @param {string} questionText
 * @returns {string} 维度 key
 */
function inferDimension(questionText) {
  if (!questionText) return 'memorization';
  const text = String(questionText);
  for (const { dim, words } of DIMENSION_KEYWORDS) {
    for (const w of words) {
      if (text.includes(w)) return dim;
    }
  }
  return 'memorization';
}

/**
 * 计算单条答题记录的正确性估计
 * wrong_questions 表字段：wrong_count, correct_streak, mastered
 */
function estimateCorrectness(row) {
  if (row.mastered === 1) return 1;
  const wrong = row.wrong_count || 0;
  const streak = row.correct_streak || 0;
  if (wrong === 0 && streak === 0) return 0;
  return streak / (streak + wrong);
}

/**
 * EWMA 融合：最近表现与整体表现
 */
function ewmaBlend(overall, recent, alpha = 0.4) {
  if (recent === null || recent === undefined || isNaN(recent)) return overall;
  return alpha * recent + (1 - alpha) * overall;
}

/**
 * 获取全部知识维度定义
 */
function getDimensions() {
  return KNOWLEDGE_DIMENSIONS;
}

/**
 * 计算某学生在某维度下的掌握度（基于 wrong_questions）
 * 返回 { mastery, count, evidence }
 */
async function computeStudentDimensionMastery(userId, dimension) {
  const rows = await db.all(
    `SELECT question, answer, user_answer, level, wrong_count, correct_streak,
            mastered, last_wrong_time
     FROM wrong_questions
     WHERE (CAST(user_id AS TEXT) = $1 OR CAST(user_id AS TEXT) = $1)
     ORDER BY last_wrong_time ASC`,
    [String(userId)]
  );

  const matched = rows.filter(r => inferDimension(r.question) === dimension);
  if (matched.length === 0) {
    return { mastery: null, count: 0, evidence: [] };
  }

  // 加权正确率
  let weightedSum = 0;
  let weightedTotal = 0;
  const evidence = [];
  for (const r of matched) {
    const difficulty = Math.max(1, r.level || 1);
    const correctness = estimateCorrectness(r);
    weightedSum += difficulty * correctness;
    weightedTotal += difficulty;
    evidence.push({
      question: (r.question || '').slice(0, 60),
      correctness: Math.round(correctness * 100) / 100,
      difficulty,
      mastered: r.mastered === 1,
      wrongCount: r.wrong_count || 0,
      correctStreak: r.correct_streak || 0,
    });
  }
  const overall = weightedTotal > 0 ? (weightedSum / weightedTotal) * 100 : 0;

  // 最近 5 条的表现
  const recentRows = matched.slice(-5);
  let rSum = 0, rTotal = 0;
  for (const r of recentRows) {
    const d = Math.max(1, r.level || 1);
    rSum += d * estimateCorrectness(r);
    rTotal += d;
  }
  const recent = rTotal > 0 ? (rSum / rTotal) * 100 : null;

  const mastery = Math.round(ewmaBlend(overall, recent, 0.4));
  return { mastery, count: matched.length, evidence };
}

/**
 * 学生完整知识画像
 * @param {number} userId
 * @returns {Promise<Object>}
 */
async function getStudentKnowledgeProfile(userId) {
  // 各维度掌握度
  const dimensions = [];
  for (const dim of KNOWLEDGE_DIMENSIONS) {
    const { mastery, count, evidence } = await computeStudentDimensionMastery(userId, dim.key);

    // 原文记忆维度融合 learning_records.best_score
    let reciteAvg = null;
    if (dim.key === 'memorization') {
      const rec = await db.get(
        `SELECT AVG(best_score) as avg_score, COUNT(*) as cnt
         FROM learning_records
         WHERE user_id = $1 AND recite_attempts > 0`,
        [userId]
      );
      if (rec && rec.cnt > 0) {
        reciteAvg = Math.round(rec.avg_score || 0);
        if (mastery !== null) {
          const blended = Math.round(0.6 * mastery + 0.4 * reciteAvg);
          dimensions.push({ ...dim, mastery: blended, count, evidence, reciteAvg, formula: '0.6×答题掌握 + 0.4×背诵均分' });
          continue;
        }
      }
    }
    dimensions.push({ ...dim, mastery, count, evidence, reciteAvg });
  }

  // 薄弱维度（有数据且 < 60）
  const weak = dimensions
    .filter(d => d.mastery !== null && d.mastery < 60)
    .sort((a, b) => a.mastery - b.mastery);

  // 学习行为统计（用于可解释性）
  const stats = await db.get(
    `SELECT
       COUNT(*) as learned_poems,
       AVG(best_score) as avg_recite_score,
       SUM(recite_attempts) as total_recites,
       SUM(view_count) as total_views,
       SUM(ai_explain_count) as total_ai_uses,
       SUM(study_time) as total_study_time
     FROM learning_records WHERE user_id = $1`,
    [userId]
  );

  const wrongCount = await db.get(
    `SELECT COUNT(*) as cnt FROM wrong_questions
     WHERE CAST(user_id AS TEXT) = $1 OR CAST(user_id AS TEXT) = $1`,
    [String(userId)]
  );

  return {
    userId,
    dimensions,
    weakDimensions: weak,
    stats: {
      learnedPoems: stats?.learned_poems || 0,
      avgReciteScore: stats?.avg_recite_score ? Math.round(stats.avg_recite_score) : null,
      totalRecites: stats?.total_recites || 0,
      totalViews: stats?.total_views || 0,
      totalAiUses: stats?.total_ai_uses || 0,
      totalStudyTime: stats?.total_study_time || 0,
      totalWrongQuestions: wrongCount?.cnt || 0,
    },
  };
}

/**
 * 班级知识掌握概览（各维度平均掌握度）
 * @param {number} classId  若为 null 则统计全部学生
 */
async function getClassKnowledgeOverview(classId = null) {
  // 获取学生列表
  let students;
  if (classId) {
    students = await db.all(
      `SELECT u.id, u.username FROM users u
       JOIN class_members cm ON u.id = cm.user_id AND cm.class_id = $1
       WHERE cm.role = 'student'`,
      [classId]
    );
  } else {
    students = await db.all(`SELECT id, username FROM users ORDER BY id`);
  }

  // 聚合各维度
  const dimAgg = KNOWLEDGE_DIMENSIONS.map(d => ({ ...d, sum: 0, count: 0, students: 0 }));

  for (const s of students) {
    for (let i = 0; i < KNOWLEDGE_DIMENSIONS.length; i++) {
      const { mastery, count } = await computeStudentDimensionMastery(s.id, KNOWLEDGE_DIMENSIONS[i].key);
      if (mastery !== null) {
        dimAgg[i].sum += mastery;
        dimAgg[i].count += count;
        dimAgg[i].students += 1;
      }
    }
  }

  return dimAgg.map(d => ({
    key: d.key,
    label: d.label,
    icon: d.icon,
    desc: d.desc,
    avgMastery: d.students > 0 ? Math.round(d.sum / d.students) : null,
    totalQuestions: d.count,
    coveredStudents: d.students,
  }));
}

/**
 * 班级学生×知识维度 热力图数据
 * @param {number} classId
 * @param {number} limit  最多取多少学生
 */
async function getClassKnowledgeHeatmap(classId = null, limit = 50) {
  let students;
  if (classId) {
    students = await db.all(
      `SELECT u.id, u.username FROM users u
       JOIN class_members cm ON u.id = cm.user_id AND cm.class_id = $1
       WHERE cm.role = 'student'
       LIMIT $2`,
      [classId, limit]
    );
  } else {
    students = await db.all(`SELECT id, username FROM users ORDER BY id LIMIT $1`, [limit]);
  }

  const heatmap = [];
  for (const s of students) {
    const row = { userId: s.id, username: s.username, dimensions: {} };
    for (const dim of KNOWLEDGE_DIMENSIONS) {
      const { mastery, count } = await computeStudentDimensionMastery(s.id, dim.key);
      row.dimensions[dim.key] = { mastery, count };
    }
    heatmap.push(row);
  }
  return { dimensions: KNOWLEDGE_DIMENSIONS, students: heatmap };
}

/**
 * 高频薄弱知识点（班级层面）
 * 返回各维度下错误最集中的题目
 */
async function getWeakPoints(classId = null, topN = 10) {
  let studentFilter = '';
  let params = [];
  if (classId) {
    studentFilter = `AND (CAST(wq.user_id AS INTEGER) IN (
      SELECT u.id FROM users u
      JOIN class_members cm ON u.id = cm.user_id AND cm.class_id = $1
      WHERE cm.role = 'student'
    ))`;
    params = [classId];
  }

  const rows = await db.all(
    `SELECT wq.question, wq.answer, wq.title, wq.author, wq.level,
            wq.wrong_count, wq.correct_streak, wq.mastered,
            COUNT(*) as error_freq
     FROM wrong_questions wq
     WHERE 1=1 ${studentFilter}
     GROUP BY wq.question, wq.answer, wq.title, wq.author, wq.level,
              wq.wrong_count, wq.correct_streak, wq.mastered
     ORDER BY error_freq DESC, wq.wrong_count DESC
     LIMIT $${params.length + 1}`,
    [...params, topN]
  );

  // 按维度分组
  const byDimension = {};
  for (const d of KNOWLEDGE_DIMENSIONS) byDimension[d.key] = [];
  for (const r of rows) {
    const dim = inferDimension(r.question);
    byDimension[dim].push({
      question: (r.question || '').slice(0, 80),
      answer: r.answer,
      title: r.title,
      author: r.author,
      level: r.level,
      errorFreq: r.error_freq,
      wrongCount: r.wrong_count || 0,
      mastered: r.mastered === 1,
    });
  }

  // 各维度错误总数
  const dimensionSummary = KNOWLEDGE_DIMENSIONS.map(d => ({
    ...d,
    errorCount: byDimension[d.key].reduce((s, x) => s + x.errorFreq, 0),
    topQuestions: byDimension[d.key].slice(0, 3),
  })).sort((a, b) => b.errorCount - a.errorCount);

  return { byDimension, dimensionSummary };
}

/**
 * 生成教学建议（基于薄弱维度）
 */
function generateTeachingSuggestion(weakDimensions) {
  if (!weakDimensions || weakDimensions.length === 0) {
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
    level: weakDimensions[0].avgMastery < 40 ? 'urgent' : 'attention',
    focusDimension: top.key,
    focusLabel: top.label,
    message: suggestions[top.key] || '建议针对薄弱维度加强专项练习。',
  };
}

module.exports = {
  getDimensions,
  inferDimension,
  getStudentKnowledgeProfile,
  getClassKnowledgeOverview,
  getClassKnowledgeHeatmap,
  getWeakPoints,
  generateTeachingSuggestion,
};