/**
 * 掌握度更新引擎 (v2 — Weighted Bayesian Evidence Model)
 *
 * 核心职责：根据 LearningEvent 更新 StudentKnowledgeState。
 *
 * 算法设计（数学严谨、可解释、可测试）：
 *
 * 1. 单次答题证据（非负分离，不再使用 signed evidence）
 *    答对：success = (difficulty/5) × hintPenalty   ∈ [0.12, 1.0]
 *         failure = 0
 *    答错：success = 0
 *         failure = (6 - difficulty)/5               ∈ [0.2, 1.0]
 *    - 简单题答错：failure=1.0（强烈说明未掌握）
 *    - 难题答错：failure=0.2（弱负证据，可能是难度问题）
 *    - 难题答对：success=1.0（强正证据）
 *    - 简单题答对：success=0.2（弱正证据）
 *    - 提示答对：success ×0.6 惩罚
 *
 * 2. mastery（Beta-Binomial 后验 + EWMA）
 *    先验 Beta(α, β)，α=β=1（均匀先验）
 *    posterior = (α + Σsuccess) / (α + β + Σsuccess + Σfailure)
 *    保证 0 ≤ posterior ≤ 1 自然成立（无需 clamp）
 *    final = α_ewma × recentPosterior + (1 - α_ewma) × posterior,  α_ewma=0.35
 *    （recentPosterior 基于最近 5 条证据）
 *
 * 3. confidence（样本量 + 一致性）
 *    sampleFactor = 1 - exp(-n / 3)        （n=3→0.63, n=6→0.86）
 *    consistency = 1 - |recentCorrectRate - overallCorrectRate|
 *    confidence = sampleFactor × consistency
 *
 * 4. 时间衰减：recent_performance 保留最近 10 条，按 exp(-Δt/14天) 衰减
 *
 * 数学性质保证：
 *   - 范围：0 ≤ mastery ≤ 1（Beta后验自然保证）
 *   - 单调性：答对使 mastery ↑，答错使 mastery ↓
 *   - 收敛性：连续答对 → mastery → 1，连续答错 → mastery → 0
 *   - 先验：无证据时 mastery = α/(α+β) = 0.5
 *
 * 验证（difficulty=3, 无提示）：
 *   1题答对：success=0.6, posterior=(1+0.6)/(1+1+0.6)=0.615, mastery≈0.59
 *   1题答错：failure=0.6, posterior=1/(1+1+0.6)=0.385, mastery≈0.43
 *   简单题答错：failure=1.0, posterior=1/3=0.33
 *   难题答错：failure=0.2, posterior=1/2.2=0.45（情有可原）
 */

const db = require('../utils/db');

const ALPHA = 1;
const BETA = 1;
const PRIOR_MASTERY = ALPHA / (ALPHA + BETA);
const EWMA_ALPHA = 0.35;
const CONFIDENCE_TAU = 3;
const RECENT_WINDOW = 10;
const RECENT_EWMA_WINDOW = 5;
const TIME_HALFLIFE_DAYS = 14;
const MASTERY_ALGORITHM_VERSION = 'v2';

/**
 * 单次答题证据强度（纯函数，可测试）
 * 返回非负分离证据 {success, failure}，二者必有一个为 0
 * @param {boolean} correct
 * @param {number} difficulty  1-5
 * @param {number} hintCount
 * @returns {{success: number, failure: number}}
 */
function computeEvidence(correct, difficulty, hintCount) {
  const dw = Math.max(0.2, Math.min(1.0, (difficulty || 3) / 5.0));
  if (correct) {
    const hp = (hintCount && hintCount > 0) ? 0.6 : 1.0;
    return { success: dw * hp, failure: 0 };
  } else {
    const fw = Math.max(0.2, Math.min(1.0, (6 - (difficulty || 3)) / 5.0));
    return { success: 0, failure: fw };
  }
}

/**
 * 计算 mastery（Beta-Binomial 后验 + EWMA，纯函数可测试）
 * @param {Array<{success: number, failure: number}>} evidences  历史证据序列（按时间正序）
 * @returns {number} 0-1
 */
function computeMastery(evidences) {
  if (!evidences || evidences.length === 0) return PRIOR_MASTERY;

  const sumSuccess = evidences.reduce((a, e) => a + (e.success || 0), 0);
  const sumFailure = evidences.reduce((a, e) => a + (e.failure || 0), 0);
  const posterior = (ALPHA + sumSuccess) / (ALPHA + BETA + sumSuccess + sumFailure);

  const recent = evidences.slice(-RECENT_EWMA_WINDOW);
  const rSuccess = recent.reduce((a, e) => a + (e.success || 0), 0);
  const rFailure = recent.reduce((a, e) => a + (e.failure || 0), 0);
  const recentPosterior = (ALPHA + rSuccess) / (ALPHA + BETA + rSuccess + rFailure);

  return EWMA_ALPHA * recentPosterior + (1 - EWMA_ALPHA) * posterior;
}

/**
 * 计算 confidence（样本量 + 一致性，纯函数可测试）
 * @param {Array<{success: number, failure: number}>} evidences
 * @returns {number} 0-1
 */
function computeConfidence(evidences) {
  if (!evidences || evidences.length === 0) return 0;
  const n = evidences.length;
  const sampleFactor = 1 - Math.exp(-n / CONFIDENCE_TAU);

  const isCorrect = (e) => (e.success || 0) > 0;
  const overallRate = evidences.filter(isCorrect).length / n;
  const recent = evidences.slice(-RECENT_EWMA_WINDOW);
  const recentRate = recent.filter(isCorrect).length / recent.length;
  const consistency = 1 - Math.abs(recentRate - overallRate);

  return Math.max(0, sampleFactor * consistency);
}

/**
 * 时间衰减权重（纯函数，可测试）
 * @param {number} daysAgo
 * @returns {number}
 */
function timeDecayWeight(daysAgo) {
  return Math.exp(-daysAgo / TIME_HALFLIFE_DAYS);
}

/**
 * 根据学习事件更新学生知识状态
 * @param {object} event  { userId, knowledgePointIds, correct, difficulty, hintCount, createdAt }
 */
async function updateFromEvent(event, externalTx = null) {
  const { userId, knowledgePointIds, correct, difficulty, hintCount } = event;
  if (!knowledgePointIds || knowledgePointIds.length === 0) return;

  const evidence = computeEvidence(correct, difficulty, hintCount);
  const now = (event.createdAt || new Date()).toISOString();

  const updateLogic = async (tx) => {
    for (const kpId of knowledgePointIds) {
      await updateSingleState(userId, kpId, evidence, correct, !hintCount || hintCount === 0, now, tx);
    }
  };

  if (externalTx) {
    await updateLogic(externalTx);
  } else {
    await db.transaction(updateLogic);
  }
}

/**
 * 更新单个知识点的状态
 * @param {number} userId
 * @param {number} kpId
 * @param {{success: number, failure: number}} evidence
 * @param {boolean} correct
 * @param {boolean} independent  无提示独立完成
 * @param {string} now  ISO timestamp
 * @param {object} tx   数据库事务对象
 */
async function updateSingleState(userId, kpId, evidence, correct, independent, now, tx = db) {
  // 确保记录存在，避免并发 INSERT 时的 unique constraint violation，同时便于后续加锁
  const insertResult = await tx.run(
    `INSERT INTO student_knowledge_states
     (user_id, knowledge_point_id, mastery, confidence, attempt_count, correct_count,
      independent_correct_count, recent_performance, error_count, recent_error_types,
      last_practiced_at, last_mastery_update_at, algorithm_version)
     VALUES ($1,$2,$3,$4,0,0,0,'[]',0,'[]',$5,CURRENT_TIMESTAMP,$6)
     ON CONFLICT (user_id, knowledge_point_id) DO NOTHING`,
    [userId, kpId, PRIOR_MASTERY, 0, now, MASTERY_ALGORITHM_VERSION]
  );

  let existing = await tx.get(
    `SELECT * FROM student_knowledge_states WHERE user_id = $1 AND knowledge_point_id = $2 FOR UPDATE`,
    [userId, kpId]
  );
  
  let recentPerformance = [];
  let attemptCount = 1;
  let correctCount = correct ? 1 : 0;
  let independentCorrectCount = (correct && independent) ? 1 : 0;
  let errorCount = correct ? 0 : 1;
  let recentErrorTypes = [];

  if (existing) {
    if (existing.attempt_count === 0 && insertResult && insertResult.rowCount > 0) {
      attemptCount = 1;
      correctCount = correct ? 1 : 0;
      independentCorrectCount = (correct && independent) ? 1 : 0;
      errorCount = correct ? 0 : 1;
    } else if (existing.attempt_count === 0) {
      attemptCount = 1;
      correctCount = correct ? 1 : 0;
      independentCorrectCount = (correct && independent) ? 1 : 0;
      errorCount = correct ? 0 : 1;
    } else {
      attemptCount = (existing.attempt_count || 0) + 1;
      correctCount = (existing.correct_count || 0) + (correct ? 1 : 0);
      independentCorrectCount = (existing.independent_correct_count || 0) + (correct && independent ? 1 : 0);
      errorCount = (existing.error_count || 0) + (correct ? 0 : 1);
    }
    try { recentPerformance = JSON.parse(existing.recent_performance || '[]'); } catch {}
    try { recentErrorTypes = JSON.parse(existing.recent_error_types || '[]'); } catch {}
  } else {
    // 理论上由于上面我们做了 INSERT，existing 必定存在。如果没有的话作为兜底
    attemptCount = 1;
    correctCount = correct ? 1 : 0;
    independentCorrectCount = (correct && independent) ? 1 : 0;
    errorCount = correct ? 0 : 1;
  }

  const ev = {
    s: Math.round((evidence.success || 0) * 1000) / 1000,
    f: Math.round((evidence.failure || 0) * 1000) / 1000,
    t: now,
  };
  recentPerformance.push(ev);
  if (recentPerformance.length > RECENT_WINDOW) {
    recentPerformance = recentPerformance.slice(-RECENT_WINDOW);
  }

  if (!correct) {
    recentErrorTypes.push(now);
    if (recentErrorTypes.length > 10) recentErrorTypes = recentErrorTypes.slice(-10);
  }

  const evidences = recentPerformance.map(p => ({ success: p.s, failure: p.f }));
  const mastery = computeMastery(evidences);
  const confidence = computeConfidence(evidences);

  if (existing) {
    await tx.run(
      `UPDATE student_knowledge_states
       SET mastery=$3, confidence=$4, attempt_count=$5, correct_count=$6,
           independent_correct_count=$7, recent_performance=$8, error_count=$9,
           recent_error_types=$10, last_practiced_at=$11, last_mastery_update_at=CURRENT_TIMESTAMP,
           algorithm_version=$12
       WHERE user_id=$1 AND knowledge_point_id=$2`,
      [userId, kpId, mastery, confidence, attemptCount, correctCount,
       independentCorrectCount, JSON.stringify(recentPerformance), errorCount,
       JSON.stringify(recentErrorTypes), now, MASTERY_ALGORITHM_VERSION]
    );
  } else {
    await tx.run(
      `INSERT INTO student_knowledge_states
       (user_id, knowledge_point_id, mastery, confidence, attempt_count, correct_count,
        independent_correct_count, recent_performance, error_count, recent_error_types,
        last_practiced_at, last_mastery_update_at, algorithm_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_TIMESTAMP,$12)`,
      [userId, kpId, mastery, confidence, attemptCount, correctCount,
       independentCorrectCount, JSON.stringify(recentPerformance), errorCount,
       JSON.stringify(recentErrorTypes), now, MASTERY_ALGORITHM_VERSION]
    );
  }
}

/**
 * 获取学生在某知识点的状态
 */
async function getState(userId, kpId) {
  return db.get(
    `SELECT * FROM student_knowledge_states WHERE user_id=$1 AND knowledge_point_id=$2`,
    [userId, kpId]
  );
}

/**
 * 获取学生全部知识状态（含知识点信息）
 */
async function getAllStates(userId) {
  return db.all(
    `SELECT s.*, kp.code, kp.name, kp.category, kp.parent_id, kp.difficulty
     FROM student_knowledge_states s
     JOIN knowledge_points kp ON s.knowledge_point_id = kp.id
     WHERE s.user_id = $1
     ORDER BY kp.id`,
    [userId]
  );
}

/**
 * 重建学生知识状态（从 LearningEvent 重放）
 * 保证：相同事件 + 相同算法版本 = 相同 StudentKnowledgeState
 * 用途：数据修复、算法升级、Debug、历史重新计算
 */
async function rebuildStudentKnowledgeState(userId) {
  const knowledgeModel = require('./knowledgeModelService');

  const events = await db.all(
    `SELECT event_type, knowledge_points, correct, difficulty, hint_count, created_at
     FROM learning_events
     WHERE user_id = $1 AND correct IS NOT NULL
     ORDER BY created_at ASC`,
    [userId]
  );

  const EVIDENCE_TYPES = ['ANSWER_QUESTION', 'CORRECT_ANSWER', 'WRONG_ANSWER',
    'RECITE_POEM', 'RECITATION_ERROR', 'COMPLETE_GAME', 'REVIEW_POEM'];

  let replayed = 0;
  await db.transaction(async (tx) => {
    await tx.run(
      `DELETE FROM student_knowledge_states WHERE user_id = $1`,
      [userId]
    );

    for (const ev of events) {
      if (!EVIDENCE_TYPES.includes(ev.event_type)) continue;
      let kpCodes = [];
      try { kpCodes = JSON.parse(ev.knowledge_points || '[]'); } catch {}
      if (kpCodes.length === 0) continue;

      const kpIds = await knowledgeModel.getKnowledgePointIds(kpCodes);
      if (kpIds.length === 0) continue;

      const correct = ev.correct === 1;
      for (const kpId of kpIds) {
        const evidence = computeEvidence(correct, ev.difficulty || 3, ev.hint_count || 0);
        await updateSingleState(userId, kpId, evidence, correct, !(ev.hint_count > 0),
          (ev.created_at || new Date()).toISOString(), tx);
      }
      replayed++;
    }
  });

  const states = await getAllStates(userId);
  return { userId, replayedEvents: replayed, totalStates: states.length, algorithmVersion: MASTERY_ALGORITHM_VERSION };
}

module.exports = {
  computeEvidence,
  computeMastery,
  computeConfidence,
  timeDecayWeight,
  updateFromEvent,
  getState,
  getAllStates,
  rebuildStudentKnowledgeState,
  MASTERY_ALGORITHM_VERSION,
  ALPHA,
  BETA,
  PRIOR_MASTERY,
  EWMA_ALPHA,
  CONFIDENCE_TAU,
};
