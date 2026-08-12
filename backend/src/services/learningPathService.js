const db = require('../utils/db');
const cognitiveDiagnosis = require('./cognitiveDiagnosisService');
const masteryEngine = require('./masteryUpdateEngine');

async function getLearningPath(userId) {
  const row = await db.get(
    'SELECT * FROM learning_paths WHERE user_id = $1',
    [userId]
  );

  if (row) {
    return row;
  }

  const defaultPath = {
    user_id: userId,
    current_stage: 1,
    stage_name: '启蒙篇',
    completed_poems: 0,
    target_poems: 10,
    started_at: new Date().toISOString()
  };

  await db.run(
    `INSERT INTO learning_paths (user_id, current_stage, stage_name, completed_poems, target_poems, started_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, defaultPath.current_stage, defaultPath.stage_name, defaultPath.completed_poems, defaultPath.target_poems, defaultPath.started_at]
  );

  return defaultPath;
}

async function updateLearningPath(userId, stageData) {
  const existing = await db.get(
    'SELECT * FROM learning_paths WHERE user_id = $1',
    [userId]
  );

  if (existing) {
    await db.run(
      `UPDATE learning_paths
       SET current_stage = $1, stage_name = $2, completed_poems = $3, target_poems = $4
       WHERE user_id = $5`,
      [stageData.current_stage || existing.current_stage,
        stageData.stage_name || existing.stage_name,
        stageData.completed_poems !== undefined ? stageData.completed_poems : existing.completed_poems,
        stageData.target_poems || existing.target_poems,
        userId]
    );
  } else {
    await db.run(
      `INSERT INTO learning_paths (user_id, current_stage, stage_name, completed_poems, target_poems, started_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, stageData.current_stage || 1, stageData.stage_name || '启蒙篇',
        stageData.completed_poems || 0, stageData.target_poems || 10,
        new Date().toISOString()]
    );
  }
}

async function getStagePoems(stage) {
  const stageConfig = getStageConfig(stage);
  if (!stageConfig) {
    return [];
  }

  return db.all(
    `SELECT p.* FROM poems p
     JOIN stage_poems sp ON p.id = sp.poem_id
     WHERE sp.stage = $1
     ORDER BY sp.sort_order`,
    [stage]
  );
}

async function completeStagePoem(userId, poemId, stage) {
  await db.run(
    `INSERT INTO user_stage_progress (user_id, poem_id, stage, completed_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, poem_id, stage) DO NOTHING`,
    [userId, poemId, stage]
  );

  const path = await getLearningPath(userId);
  const completedPoems = await db.get(
    'SELECT COUNT(*) as count FROM user_stage_progress WHERE user_id = $1 AND stage = $2',
    [userId, stage]
  );

  if (completedPoems.count >= path.target_poems) {
    const nextStage = stage + 1;
    const nextConfig = getStageConfig(nextStage);
    if (nextConfig) {
      await updateLearningPath(userId, {
        current_stage: nextStage,
        stage_name: nextConfig.name,
        completed_poems: 0,
        target_poems: nextConfig.targetPoems
      });
      return { stageCompleted: true, nextStage, stageName: nextConfig.name };
    }
  }

  return { stageCompleted: false, completedCount: completedPoems.count };
}

function getStageConfig(stage) {
  const stages = [
    { stage: 1, name: '启蒙篇', targetPoems: 10, description: '入门诗词，感受韵律之美' },
    { stage: 2, name: '入门篇', targetPoems: 15, description: '经典名篇，打好基础' },
    { stage: 3, name: '进阶篇', targetPoems: 20, description: '深度理解，品味意境' },
    { stage: 4, name: '高级篇', targetPoems: 25, description: '名家名作，深入赏析' },
    { stage: 5, name: '大师篇', targetPoems: 30, description: '博古通今，融会贯通' }
  ];

  return stages.find(s => s.stage === stage);
}

async function getStageProgress(userId, stage) {
  const completedRows = await db.all(
    'SELECT poem_id FROM user_stage_progress WHERE user_id = $1 AND stage = $2',
    [userId, stage]
  );

  const stageConfig = getStageConfig(stage);
  const totalPoems = stageConfig ? stageConfig.targetPoems : 0;
  const completedCount = completedRows.length;

  return {
    stage,
    stageConfig,
    completedCount,
    totalPoems,
    progress: totalPoems > 0 ? Math.round((completedCount / totalPoems) * 100) : 0
  };
}

async function getAllStageProgress(userId) {
  const stages = [1, 2, 3, 4, 5];
  const progress = [];

  for (const stage of stages) {
    const stageProgress = await getStageProgress(userId, stage);
    progress.push(stageProgress);
  }

  return progress;
}

/**
 * 基于知识状态的自适应推荐
 * 读取认知诊断，针对高置信薄弱点推荐诗词，并给出可解释理由
 */
async function getAdaptiveRecommendation(userId, limit = 5) {
  const diagnosis = await cognitiveDiagnosis.diagnoseStudent(userId);
  const weakPoints = diagnosis.highConfidenceWeak;
  const lowEvidence = diagnosis.lowEvidence;

  const recommendations = [];

  // 1. 针对高置信薄弱点推荐
  for (const wp of weakPoints.slice(0, 3)) {
    const poems = await findPoemsForKnowledgePoint(wp, limit);
    for (const poem of poems) {
      recommendations.push({
        poem,
        reason: `你的「${wp.name}」掌握度为${wp.mastery}%（置信${wp.confidence}%），近期连续出错。`,
        targetKnowledgePoints: [wp.code],
        currentMastery: wp.mastery,
        expectedGoal: `通过学习《${poem.title}》巩固${wp.name}相关知识`,
        priority: 'high',
      });
    }
  }

  // 2. 证据不足的点：推荐测评题相关诗词
  for (const le of lowEvidence.slice(0, 2)) {
    const poems = await findPoemsForKnowledgePoint(le, 1);
    for (const poem of poems) {
      recommendations.push({
        poem,
        reason: `「${le.name}」练习次数不足（仅${le.attemptCount}次），需要更多测评以确认掌握状况。`,
        targetKnowledgePoints: [le.code],
        currentMastery: le.mastery,
        expectedGoal: `通过《${poem.title}》建立${le.name}初步认知`,
        priority: 'medium',
      });
    }
  }

  // 3. 若无薄弱点，推荐未学过的经典诗词
  if (recommendations.length === 0) {
    const learned = await db.all(
      'SELECT poem_id FROM learning_records WHERE user_id = $1', [userId]
    );
    const learnedIds = learned.map(l => l.poem_id);
    let sql = 'SELECT id, title, author, dynasty, content FROM poems';
    const params = [];
    if (learnedIds.length > 0) {
      sql += ` WHERE id NOT IN (${learnedIds.map((_, i) => `$${i+1}`).join(',')})`;
      params.push(...learnedIds);
    }
    sql += ' ORDER BY RANDOM() LIMIT $' + (params.length + 1);
    params.push(limit);
    const poems = await db.all(sql, params);
    for (const poem of poems) {
      recommendations.push({
        poem,
        reason: '当前知识掌握良好，推荐拓展学习新诗词。',
        targetKnowledgePoints: [],
        currentMastery: null,
        expectedGoal: '拓宽诗词储备',
        priority: 'low',
      });
    }
  }

  return {
    recommendations: recommendations.slice(0, limit),
    diagnosisSummary: {
      totalPoints: diagnosis.totalPoints,
      highConfidenceWeakCount: diagnosis.highConfidenceWeak.length,
      lowEvidenceCount: diagnosis.lowEvidence.length,
      strongCount: diagnosis.strong.length,
    },
  };
}

/**
 * 根据知识点关键词查找相关诗词
 */
async function findPoemsForKnowledgePoint(kp, limit) {
  const keywordMap = {
    imagery_moon: '月', imagery_willow: '柳', imagery_wildgoose: '雁',
    imagery_wine: '酒', imagery_sunset: '夕阳', imagery_pavilion: '亭',
    emotion_homesick: '乡', emotion_farewell: '送', emotion_ambition: '志',
    rhetoric_metaphor: '如', rhetoric_allusion: '典',
  };
  const keyword = keywordMap[kp.code];
  if (!keyword) {
    return db.all('SELECT id, title, author, dynasty, content FROM poems ORDER BY RANDOM() LIMIT $1', [limit]);
  }
  return db.all(
    `SELECT id, title, author, dynasty, content FROM poems
     WHERE content LIKE $1 ORDER BY RANDOM() LIMIT $2`,
    [`%${keyword}%`, limit]
  );
}

/**
 * 今日复习推荐（基于间隔重复思想）
 */
async function getTodayReview(userId) {
  // 找到掌握度中等(40-75)且最近练习超过1天的知识点对应诗词
  const states = await db.all(
    `SELECT s.*, kp.code, kp.name
     FROM student_knowledge_states s
     JOIN knowledge_points kp ON s.knowledge_point_id = kp.id
     WHERE s.user_id = $1 AND s.mastery >= 0.4 AND s.mastery < 0.8
       AND s.last_practiced_at IS NOT NULL
       AND s.last_practiced_at < CURRENT_DATE - INTERVAL '1 day'
     ORDER BY s.mastery ASC LIMIT 5`,
    [userId]
  );

  const reviews = [];
  for (const s of states) {
    const poems = await findPoemsForKnowledgePoint(s, 1);
    if (poems.length > 0) {
      reviews.push({
        poem: poems[0],
        knowledgePoint: s.name,
        currentMastery: Math.round((s.mastery || 0) * 100),
        daysSinceLast: Math.ceil((Date.now() - new Date(s.last_practiced_at).getTime()) / 86400000),
        reason: `「${s.name}」掌握度${Math.round((s.mastery||0)*100)}%，已${Math.ceil((Date.now()-new Date(s.last_practiced_at).getTime())/86400000)}天未复习，建议巩固。`,
      });
    }
  }
  return reviews;
}

/**
 * 生成学习路径（基于知识状态，G化推荐）
 * 修复：原函数缺失导致 /api/learning/path 和 /regenerate 报错
 */
async function generateLearningPath(userId) {
  const recommendation = await getAdaptiveRecommendation(userId, 5);
  const diag = await cognitiveDiagnosis.diagnoseStudent(userId);

  let level = '初级';
  const strongCount = diag.strong.length;
  const weakCount = diag.highConfidenceWeak.length;
  if (strongCount >= 5 && weakCount === 0) level = '高级';
  else if (strongCount >= 3) level = '中级';

  return {
    level,
    recommendations: recommendation.recommendations.map(r => ({
      poemId: r.poem && r.poem.id,
      title: r.poem && r.poem.title,
      author: r.poem && r.poem.author,
      reason: r.reason,
      targetKnowledgePoints: r.targetKnowledgePoints,
    })),
    diagnosisSummary: recommendation.diagnosisSummary,
  };
}

/**
 * 评估用户水平（基于知识状态）
 * 修复：原函数缺失导致 /api/learning/assessment 报错
 */
async function assessUserLevel(userId) {
  const diag = await cognitiveDiagnosis.diagnoseStudent(userId);
  const states = await masteryEngine.getAllStates(userId);

  let avgMastery = 0;
  let avgConfidence = 0;
  if (states.length > 0) {
    avgMastery = states.reduce((a, s) => a + (s.mastery || 0), 0) / states.length;
    avgConfidence = states.reduce((a, s) => a + (s.confidence || 0), 0) / states.length;
  }

  let level = '初级';
  if (avgMastery >= 0.75 && avgConfidence >= 0.5) level = '高级';
  else if (avgMastery >= 0.55) level = '中级';

  return {
    level,
    avgMastery: Math.round(avgMastery * 100),
    avgConfidence: Math.round(avgConfidence * 100),
    totalKnowledgePoints: diag.totalPoints,
    strongCount: diag.strong.length,
    weakCount: diag.highConfidenceWeak.length,
    lowEvidenceCount: diag.lowEvidence.length,
  };
}

module.exports = {
  getLearningPath,
  updateLearningPath,
  getStagePoems,
  completeStagePoem,
  getStageConfig,
  getStageProgress,
  getAllStageProgress,
  getAdaptiveRecommendation,
  getTodayReview,
  generateLearningPath,
  assessUserLevel,
};
