/**
 * 能力模型服务（聚合视图）
 *
 * Source of Truth: student_knowledge_states
 *
 * 高层 Ability 是底层 KnowledgeState 的聚合视图，不再独立计算或存储。
 * 系统只有一套 mastery 算法（Weighted Bayesian Evidence Model v2），
 * 本服务仅做读侧聚合，不产生第二套分数。
 *
 * 聚合映射（knowledge_points.category → 高层 Ability）：
 *   memory_score        ← category='memory'                        (memorization)
 *   comprehension_score ← category in ('meta','language','context') (author_dynasty, word_meaning, allusion_background)
 *   expression_score    ← category='transfer'                       (application)
 *   appreciation_score  ← category in ('imagery','emotion','rhetoric') (imagery, emotion_theme, rhetoric)
 *
 * 兼容接口：
 *   getUserAbilityModel / getAbilityModel / calculateAbilityModel / calculateAbilityFromLearning
 *   getAbilityTrend / getAbilityHistory / getWeakDimensions / getAbilityRanking
 */

const db = require('../utils/db');

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

const DIMENSION_FIELDS = {
  memory: 'memory_score',
  comprehension: 'comprehension_score',
  expression: 'expression_score',
  appreciation: 'appreciation_score',
};

const DEFAULT_MODEL = {
  memory_score: 50,
  comprehension_score: 50,
  expression_score: 50,
  appreciation_score: 50,
  overall_score: 50,
};

/**
 * 从 student_knowledge_states 聚合高层能力分数
 * @param {number} userId
 * @returns {Promise<object>} { memory_score, comprehension_score, expression_score, appreciation_score, overall_score, ... }
 */
async function aggregateAbilityFromKnowledgeStates(userId) {
  const rows = await db.all(
    `SELECT s.mastery, s.confidence, s.attempt_count, kp.category
     FROM student_knowledge_states s
     JOIN knowledge_points kp ON s.knowledge_point_id = kp.id
     WHERE s.user_id = $1 AND s.attempt_count > 0`,
    [userId]
  );

  if (!rows || rows.length === 0) {
    return {
      ...DEFAULT_MODEL,
      user_id: userId,
      updated_at: new Date().toISOString(),
      source: 'student_knowledge_states',
      has_data: false,
    };
  }

  const buckets = {
    memory: [],
    comprehension: [],
    expression: [],
    appreciation: [],
  };

  for (const r of rows) {
    const dim = CATEGORY_TO_DIMENSION[r.category];
    if (dim && buckets[dim]) {
      buckets[dim].push(r.mastery || 0);
    }
  }

  const avg = (arr) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) : 50;

  const memory_score = avg(buckets.memory);
  const comprehension_score = avg(buckets.comprehension);
  const expression_score = avg(buckets.expression);
  const appreciation_score = avg(buckets.appreciation);
  const overall_score = Math.round((memory_score + comprehension_score + expression_score + appreciation_score) / 4);

  return {
    user_id: userId,
    memory_score,
    comprehension_score,
    expression_score,
    appreciation_score,
    overall_score,
    updated_at: new Date().toISOString(),
    source: 'student_knowledge_states',
    has_data: true,
    dimension_counts: {
      memory: buckets.memory.length,
      comprehension: buckets.comprehension.length,
      expression: buckets.expression.length,
      appreciation: buckets.appreciation.length,
    },
  };
}

/**
 * 获取用户能力模型（聚合视图，兼容旧接口名）
 */
async function getUserAbilityModel(userId) {
  return aggregateAbilityFromKnowledgeStates(userId);
}

async function getAbilityModel(userId) {
  return aggregateAbilityFromKnowledgeStates(userId);
}

/**
 * 从学习数据计算能力（兼容旧接口名，实际仍从 KnowledgeState 聚合）
 */
async function calculateAbilityFromLearning(userId) {
  return aggregateAbilityFromKnowledgeStates(userId);
}

async function calculateAbilityModel(userId) {
  return aggregateAbilityFromKnowledgeStates(userId);
}

/**
 * 初始化用户能力模型（不再需要建表，返回默认值）
 */
async function initializeUserAbilityModel(userId) {
  return {
    ...DEFAULT_MODEL,
    user_id: userId,
    updated_at: new Date().toISOString(),
    source: 'student_knowledge_states',
    has_data: false,
  };
}

/**
 * 更新能力模型（不再支持独立写入，返回聚合结果）
 */
async function updateAbilityModel(userId) {
  return aggregateAbilityFromKnowledgeStates(userId);
}

/**
 * 能力历史（从 learning_events 按天聚合，不再依赖 ability_history 表）
 */
async function getAbilityHistory(userId, days = 30) {
  const dateCol = db.dateOnly('created_at');
  const dateFilter = db.isPostgres() ? `CURRENT_DATE - $2::int` : `DATE('now', '-' || ? || ' days')`;
  return db.all(
    `SELECT ${dateCol} as date,
       COUNT(*) as event_count,
       SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END) as correct_count
     FROM learning_events
     WHERE user_id = $1 AND created_at >= ${dateFilter}
     GROUP BY ${dateCol}
     ORDER BY date ASC`,
    [userId, days]
  ).catch(() => []);
}

/**
 * 记录能力快照（不再需要，保留空实现兼容调用方）
 */
async function recordAbilitySnapshot(userId) {
  return { skipped: true, reason: 'ability_history table removed; use student_knowledge_states directly' };
}

/**
 * 能力趋势（从 activity_logs 按天聚合活动量）
 */
async function getAbilityTrend(userId, days = 7) {
  const dateCol = db.dateOnly('created_at');
  const dateFilter = db.isPostgres() ? `CURRENT_DATE - $2::int` : `DATE('now', '-' || ? || ' days')`;
  const rows = await db.all(
    `SELECT
      ${dateCol} as date,
      COUNT(*) as activity_count
    FROM activity_logs
    WHERE user_id = $1 AND created_at >= ${dateFilter}
    GROUP BY ${dateCol}
    ORDER BY date`,
    [userId, days]
  ).catch(() => []);

  return rows;
}

/**
 * 薄弱能力维度（从聚合结果计算，score < 60）
 */
async function getWeakDimensions(userId) {
  const model = await aggregateAbilityFromKnowledgeStates(userId);

  const dimensions = [
    { name: 'memory', label: '记忆能力', score: model.memory_score },
    { name: 'comprehension', label: '理解能力', score: model.comprehension_score },
    { name: 'expression', label: '应用能力', score: model.expression_score },
    { name: 'appreciation', label: '鉴赏能力', score: model.appreciation_score },
  ];

  dimensions.sort((a, b) => a.score - b.score);

  return dimensions.filter(d => d.score < 60);
}

/**
 * 能力排名（从所有用户的 overall_score 排名）
 */
async function getAbilityRanking(userId) {
  const allUsers = await db.all(
    `SELECT DISTINCT user_id FROM student_knowledge_states WHERE attempt_count > 0`
  ).catch(() => []);

  if (allUsers.length === 0) {
    return { rank: 1, total: 1 };
  }

  const scores = [];
  for (const u of allUsers) {
    const model = await aggregateAbilityFromKnowledgeStates(u.user_id);
    scores.push({ userId: u.user_id, overall: model.overall_score });
  }

  scores.sort((a, b) => b.overall - a.overall);

  const rank = scores.findIndex(s => s.userId === userId) + 1;
  return { rank: rank || scores.length, total: scores.length };
}

module.exports = {
  getUserAbilityModel,
  getAbilityModel,
  calculateAbilityFromLearning,
  calculateAbilityModel,
  initializeUserAbilityModel,
  updateAbilityModel,
  getAbilityHistory,
  recordAbilitySnapshot,
  getAbilityTrend,
  getWeakDimensions,
  getAbilityRanking,
  aggregateAbilityFromKnowledgeStates,
};
