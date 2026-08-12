const db = require('../utils/db');
const { getUserAbilityModel } = require('./abilityModelService');
const { getLearningStats } = require('./learningService');

async function getPersonalizedRecommendations(userId) {
  const abilityModel = await getUserAbilityModel(userId);
  const learningStats = await getLearningStats(userId);

  const learnedPoemIds = learningStats.map(r => r.poem_id);

  const weakDimensions = [];
  if (abilityModel.memory_score < 60) weakDimensions.push('memory');
  if (abilityModel.comprehension_score < 60) weakDimensions.push('comprehension');
  if (abilityModel.expression_score < 60) weakDimensions.push('expression');
  if (abilityModel.appreciation_score < 60) weakDimensions.push('appreciation');

  let difficultyLevel = 'beginner';
  if (abilityModel.overall_score >= 80) {
    difficultyLevel = 'advanced';
  } else if (abilityModel.overall_score >= 60) {
    difficultyLevel = 'intermediate';
  }

  const unlearnedPoems = await getUnlearnedPoems(learnedPoemIds, difficultyLevel);

  const reviewPoems = await getReviewRecommendations(userId);

  const challengeRecommendations = getChallengeRecommendations(weakDimensions);

  return {
    difficultyLevel,
    weakDimensions,
    newPoems: unlearnedPoems.slice(0, 5),
    reviewPoems,
    challenges: challengeRecommendations,
    abilityProfile: abilityModel
  };
}

async function getUnlearnedPoems(learnedPoemIds, difficultyLevel) {
  let sql = 'SELECT * FROM poems';
  const params = [];
  let paramIdx = 1;

  if (learnedPoemIds.length > 0) {
    const placeholders = learnedPoemIds.map(() => {
      const idx = `$${paramIdx}`;
      paramIdx++;
      return idx;
    }).join(',');
    sql += ` WHERE id NOT IN (${placeholders})`;
    params.push(...learnedPoemIds);
  }

  if (difficultyLevel === 'beginner') {
    sql += learnedPoemIds.length > 0
      ? ` AND (difficulty IS NULL OR difficulty = $${paramIdx})`
      : ` WHERE (difficulty IS NULL OR difficulty = $${paramIdx})`;
    params.push('easy');
  } else if (difficultyLevel === 'intermediate') {
    sql += learnedPoemIds.length > 0
      ? ` AND (difficulty IS NULL OR difficulty IN ($${paramIdx}, $${paramIdx + 1}))`
      : ` WHERE (difficulty IS NULL OR difficulty IN ($${paramIdx}, $${paramIdx + 1}))`;
    params.push('easy', 'medium');
  }

  sql += ` ORDER BY RANDOM() LIMIT 10`;

  return db.all(sql, params);
}

async function getReviewRecommendations(userId) {
  return db.all(
    `SELECT lr.*, p.title as poem_title, p.author as poem_author, p.content as poem_content
     FROM learning_records lr
     JOIN poems p ON lr.poem_id = p.id
     WHERE lr.user_id = $1
       AND lr.recite_attempts > 0
       AND lr.best_score < 100
     ORDER BY lr.best_score ASC, lr.last_view_time ASC
     LIMIT 5`,
    [userId]
  );
}

function getChallengeRecommendations(weakDimensions) {
  const recommendations = [];

  if (weakDimensions.includes('memory')) {
    recommendations.push({
      type: 'fill_blank',
      title: '填空练习',
      description: '通过填空练习增强诗词记忆能力',
      priority: 'high'
    });
    recommendations.push({
      type: 'next_sentence',
      title: '接龙练习',
      description: '通过接龙游戏巩固诗词背诵',
      priority: 'high'
    });
  }

  if (weakDimensions.includes('comprehension')) {
    recommendations.push({
      type: 'appreciation',
      title: '诗词鉴赏',
      description: '通过鉴赏练习提升理解能力',
      priority: 'medium'
    });
  }

  if (weakDimensions.includes('expression')) {
    recommendations.push({
      type: 'recite',
      title: '背诵挑战',
      description: '通过背诵练习提升表达能力',
      priority: 'medium'
    });
  }

  if (weakDimensions.includes('appreciation')) {
    recommendations.push({
      type: 'author_match',
      title: '作者匹配',
      description: '通过作者匹配游戏增强鉴赏能力',
      priority: 'low'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'random',
      title: '综合挑战',
      description: '综合练习，全面提升诗词能力',
      priority: 'normal'
    });
  }

  return recommendations;
}

async function getAdaptiveLearningPlan(userId) {
  const abilityModel = await getUserAbilityModel(userId);
  const learningStats = await getLearningStats(userId);

  const plan = {
    dailyGoal: calculateDailyGoal(abilityModel),
    weeklyTarget: calculateWeeklyTarget(abilityModel, learningStats),
    focusAreas: [],
    schedule: generateSchedule(abilityModel)
  };

  if (abilityModel.memory_score < 60) {
    plan.focusAreas.push({ area: '记忆', activities: ['背诵练习', '填空练习', '接龙游戏'] });
  }
  if (abilityModel.comprehension_score < 60) {
    plan.focusAreas.push({ area: '理解', activities: ['AI讲解', '诗词鉴赏', '背景学习'] });
  }
  if (abilityModel.expression_score < 60) {
    plan.focusAreas.push({ area: '表达', activities: ['默写练习', '创作尝试', '分享交流'] });
  }
  if (abilityModel.appreciation_score < 60) {
    plan.focusAreas.push({ area: '鉴赏', activities: ['名句赏析', '风格对比', '意境理解'] });
  }

  return plan;
}

function calculateDailyGoal(abilityModel) {
  const score = abilityModel.overall_score || 50;
  if (score < 40) return { poems: 1, reciteTime: 15, reviewCount: 3 };
  if (score < 60) return { poems: 2, reciteTime: 20, reviewCount: 5 };
  if (score < 80) return { poems: 3, reciteTime: 30, reviewCount: 5 };
  return { poems: 3, reciteTime: 30, reviewCount: 3 };
}

function calculateWeeklyTarget(abilityModel, learningStats) {
  const score = abilityModel.overall_score || 50;
  if (score < 40) return { newPoems: 5, reviewSessions: 3 };
  if (score < 60) return { newPoems: 10, reviewSessions: 4 };
  if (score < 80) return { newPoems: 15, reviewSessions: 5 };
  return { newPoems: 10, reviewSessions: 3 };
}

function generateSchedule(abilityModel) {
  const schedule = [];
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  for (let i = 0; i < days.length; i++) {
    const daySchedule = {
      day: days[i],
      activities: []
    };

    if (abilityModel.memory_score < 60) {
      daySchedule.activities.push({ type: 'recite', duration: 15 });
    }
    if (abilityModel.comprehension_score < 60 && i % 2 === 0) {
      daySchedule.activities.push({ type: 'appreciate', duration: 10 });
    }
    if (abilityModel.expression_score < 60 && i % 3 === 0) {
      daySchedule.activities.push({ type: 'write', duration: 10 });
    }

    daySchedule.activities.push({ type: 'review', duration: 10 });
    daySchedule.activities.push({ type: 'new_poem', duration: 10 });

    schedule.push(daySchedule);
  }

  return schedule;
}

module.exports = {
  getPersonalizedRecommendations,
  getAdaptiveLearningPlan
};
