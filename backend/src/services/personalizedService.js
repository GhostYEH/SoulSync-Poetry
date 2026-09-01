const db = require('../utils/db');
const { getUserAbilityModel } = require('./abilityModelService');
const { getLearningStats } = require('./learningService');
const { getWrongQuestions: getWrongQuestionRows } = require('./wrongQuestionService');
const learningEventService = require('./learningEventService');
const { callZhipuGenerateJSON } = require('./aiService');
const config = require('../config/config');

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
  const rows = await db.all(
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

  return rows.map(row => ({
    ...row,
    title: row.poem_title,
    author: row.poem_author,
    content: row.poem_content,
    reason: `上次背诵得分 ${row.best_score || 0} 分，建议及时复习`,
    tag: '复习'
  }));
}

/**
 * 获取新的学习推荐。
 * 这个接口只推荐当前用户还没有产生学习记录的诗词，避免和复习推荐重复。
 */
async function getLearnRecommendations(userId) {
  const learnedRows = await getLearningStats(userId);
  const learnedPoemIds = learnedRows.map(row => row.poem_id).filter(Boolean);

  let sql = 'SELECT id, title, author, dynasty, content, tags FROM poems';
  const params = [];

  if (learnedPoemIds.length > 0) {
    const placeholders = learnedPoemIds.map((_, index) => `$${index + 1}`).join(', ');
    sql += ` WHERE id NOT IN (${placeholders})`;
    params.push(...learnedPoemIds);
  }

  sql += ' ORDER BY RANDOM() LIMIT 5';

  const rows = await db.all(sql, params);
  return rows.map(row => ({
    ...row,
    poem_id: row.id,
    reason: '这首诗词还没有学习记录，适合作为下一步学习内容',
    tag: '新读'
  }));
}

/** 获取挑战答题记录，表不存在时返回空数组以兼容旧数据库。 */
async function getChallengeRecords(userId) {
  return db.all(
    `SELECT * FROM user_challenge_records
     WHERE user_id = $1
     ORDER BY answered_at DESC`,
    [userId]
  ).catch(() => []);
}

/** 获取飞花令学习记录，优先使用当前数据库中的高分记录表。 */
async function getFeihuaRecords(userId) {
  return db.all(
    `SELECT * FROM feihua_high_records
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  ).catch(() => []);
}

/** 学习记录兼容别名，供个性化分析接口使用。 */
async function getLearningRecords(userId) {
  return getLearningStats(userId);
}

/**
 * 生成个性化分析报告。
 * 当前项目没有 generateAIAnalysisReport 实现，因此使用已有学习数据生成稳定的本地报告，
 * 即使没有 AI Key，前端也能正常显示分析结果。
 */
async function generateAIAnalysisReport(userId, wrongQuestions = [], challengeRecords = [], feihuaRecords = [], learningRecords = []) {
  const recitedRecords = learningRecords.filter(row => Number(row.recite_attempts) > 0);
  const totalReciteAttempts = recitedRecords.reduce(
    (sum, row) => sum + nonNegativeInteger(row.recite_attempts),
    0
  );
  const totalScore = recitedRecords.reduce(
    (sum, row) => {
      const attempts = nonNegativeInteger(row.recite_attempts);
      return sum + Math.min(nonNegativeNumber(row.total_score), attempts * 100);
    },
    0
  );
  const averageScore = totalReciteAttempts > 0
    ? Math.round(totalScore / totalReciteAttempts)
    : 0;
  const masteredCount = recitedRecords.filter(row => Number(row.best_score || 0) >= 100).length;
  const masteryRate = recitedRecords.length > 0
    ? Math.round((masteredCount / recitedRecords.length) * 100)
    : 0;

  const challengeCorrectCount = challengeRecords.reduce(
    (sum, row) => sum + (Number(row.is_correct) === 1 ? 1 : 0),
    0
  );
  const challengeTotalCount = challengeRecords.length;

  const totalStudyTime = learningRecords.reduce(
    (sum, row) => sum + nonNegativeNumber(row.study_time),
    0
  );
  const totalViews = learningRecords.reduce(
    (sum, row) => sum + nonNegativeNumber(row.view_count),
    0
  );
  const totalAIExplains = learningRecords.reduce(
    (sum, row) => sum + nonNegativeNumber(row.ai_explain_count),
    0
  );

  const feihuaStats = summariseFeihuaRecords(feihuaRecords);

  const dynastyRows = await db.all(
    `SELECT p.dynasty, COUNT(*) AS count
     FROM learning_records lr
     JOIN poems p ON lr.poem_id = p.id
     WHERE lr.user_id = $1
     GROUP BY p.dynasty
     ORDER BY count DESC`,
    [userId]
  ).catch(() => []);
  const dynastyRow = dynastyRows[0];
  const dynastyDistribution = dynastyRows.reduce((distribution, row) => {
    if (row.dynasty) distribution[row.dynasty] = Number(row.count || 0);
    return distribution;
  }, {});

  const strength = [];
  const weakness = [];
  const suggestion = [];

  if (learningRecords.length === 0) {
    strength.push('学习记录还不多，但你已经开始建立自己的诗词学习轨迹');
    weakness.push('暂无足够的学习数据判断薄弱环节');
    suggestion.push('先学习一首新诗词，再完成一次背诵练习');
  } else {
    if (averageScore >= 80) strength.push(`平均背诵得分为 ${averageScore} 分，记忆基础较好`);
    if (masteryRate >= 60) strength.push(`已有 ${masteryRate}% 的背诵诗词达到满分`);
    if (challengeCorrectCount > 0) strength.push(`挑战答题已答对 ${challengeCorrectCount} 题`);
    if (strength.length === 0) strength.push('已经形成了持续学习的记录，继续保持每天练习');

    if (wrongQuestions.length > 0) weakness.push(`错题本中还有 ${wrongQuestions.length} 道题需要复习`);
    if (averageScore < 80 && recitedRecords.length > 0) weakness.push('部分诗词背诵得分偏低，需要加强巩固');
    if (recitedRecords.length === 0) weakness.push('已有阅读记录，但还缺少背诵练习');
    if (weakness.length === 0) weakness.push('暂未发现明显薄弱环节，适合继续拓展新诗词');

    if (wrongQuestions.length > 0) suggestion.push('优先复习错题本中最近出错的题目');
    if (averageScore < 80 || recitedRecords.length === 0) suggestion.push('每天完成一次短时背诵，逐步提高熟练度');
    suggestion.push('学习新诗词后，隔天再进行一次回顾');
  }

  const summary = learningRecords.length === 0
    ? '欢迎来到古诗词学习系统，完成几次阅读和练习后，我会给出更准确的建议。'
    : `你已学习 ${learningRecords.length} 首诗词，平均背诵得分 ${averageScore} 分，继续保持稳定练习。`;

  return {
    strength,
    weakness,
    suggestion,
    summary,
    stats: {
      user_id: userId,
      total_learned: learningRecords.length,
      average_score: averageScore,
      mastery_rate: masteryRate,
      wrong_count: wrongQuestions.length,
      total_recite_attempts: totalReciteAttempts,
      total_study_time: totalStudyTime,
      total_views: totalViews,
      total_ai_explains: totalAIExplains,
      top_dynasty: dynastyRow?.dynasty || '未知',
      dynasty_distribution: dynastyDistribution,
      typical_wrong_questions: wrongQuestions.slice(0, 5),
      challenge_correct_count: challengeCorrectCount,
      challenge_total_count: challengeTotalCount,
      feihua_record_count: feihuaRecords.length
    }
  };
}

function toDayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function nonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function nonNegativeInteger(value) {
  return Math.floor(nonNegativeNumber(value));
}

function summariseFeihuaRecords(records = []) {
  return records.reduce((stats, row) => ({
    battles: stats.battles + nonNegativeNumber(row.total_battles),
    wins: stats.wins + nonNegativeNumber(row.wins),
    losses: stats.losses + nonNegativeNumber(row.losses),
  }), { battles: 0, wins: 0, losses: 0 });
}

function clampScore(value, fallback = 50) {
  const score = Number(value);
  if (!Number.isFinite(score)) return fallback;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildTrend(events = [], learningRecords = []) {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(now.getDate() - (6 - index));
    const key = toDayKey(date);
    return {
      date: key,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      activity: 0,
      scores: [],
    };
  });
  const byDate = new Map(days.map(day => [day.date, day]));

  events.forEach(event => {
    const day = byDate.get(toDayKey(event.created_at));
    if (!day) return;
    day.activity += 1;
    if (Number(event.score) > 0) day.scores.push(clampScore(event.score, 0));
  });

  // 兼容统一学习事件上线前的历史数据，避免老用户被误判为近 7 日没有学习。
  const hasRecentEvents = events.some(event => byDate.has(toDayKey(event.created_at)));
  if (!hasRecentEvents) {
    learningRecords.forEach(record => {
      const day = byDate.get(toDayKey(record.last_view_time));
      if (!day) return;
      day.activity += Math.max(1, nonNegativeInteger(record.view_count) + nonNegativeInteger(record.ai_explain_count) + nonNegativeInteger(record.recite_attempts));
      if (Number(record.recite_attempts) > 0) {
        const average = Math.min(100, nonNegativeNumber(record.total_score) / nonNegativeInteger(record.recite_attempts || 1));
        if (Number.isFinite(average)) day.scores.push(clampScore(average, 0));
      }
    });
  }

  return days.map(day => ({
    date: day.date,
    label: day.label,
    activity: day.activity,
    score: day.scores.length ? Math.round(day.scores.reduce((sum, item) => sum + item, 0) / day.scores.length) : null,
  }));
}

function makeFallbackAdvice(profile) {
  const focus = profile.focus;
  const weakPoem = profile.weakPoems[0];
  const route = [
    {
      phase: '今天',
      title: `先补强${focus.label}`,
      objective: focus.score < 60 ? '用短练习建立稳定的正确反馈。' : '把已有基础变成更稳的掌握。',
      tasks: [
        weakPoem ? `复习《${weakPoem.title}》，再完成一次背诵或默写。` : '从已学诗词中选择一首，完成一次背诵练习。',
        '把错题本中最早的一道题重新做一遍。',
      ],
    },
    {
      phase: '未来 3 天',
      title: '巩固与迁移',
      objective: '隔天回顾，避免只会当下、不够牢固。',
      tasks: ['每天 15 分钟：一首复习、一首新读。', '完成一次诗词闯关，检查理解和记忆。'],
    },
    {
      phase: '本周',
      title: '形成自己的节奏',
      objective: `本周至少完成 ${Math.max(3, profile.weeklyActiveDays + 1)} 天学习记录。`,
      tasks: ['周末回看本周错题，写下一个容易混淆的知识点。', '选择一首喜欢的诗，尝试用自己的话说出它的意境。'],
    },
  ];

  return {
    headline: `把注意力放在「${focus.label}」上，下一次练习会更有收获。`,
    observation: profile.totalLearned
      ? `你已留下 ${profile.totalLearned} 首诗词的学习记录，最近 7 天有 ${profile.weeklyActiveDays} 天在学习。`
      : '先完成一次阅读和练习，我会用真实记录为你持续校准路线。',
    focusTitle: `${focus.label}是当前优先项`,
    focusDetail: focus.score < 60 ? `当前能力画像为 ${focus.score} 分，建议先用短回合练习积累正确反馈。` : `当前能力画像为 ${focus.score} 分，适合从巩固走向更深入的理解。`,
    quickActions: [
      { title: weakPoem ? `复习《${weakPoem.title}》` : '完成一首今日学习', detail: weakPoem ? `上次最高 ${weakPoem.best_score || 0} 分，先补这一处。` : '完成后，AI 才能给出更准确的建议。', path: weakPoem ? `/poem/${weakPoem.poem_id}` : '/', cta: '现在开始' },
      { title: '整理一题错题', detail: profile.wrongCount ? `错题本还有 ${profile.wrongCount} 道待回顾。` : '用一次闯关检查刚学内容。', path: profile.wrongCount ? '/challenge/review' : '/challenge', cta: profile.wrongCount ? '去复习' : '去练习' },
    ],
    roadmap: route,
    encouragement: '不求一次学很多，让每一次回顾都比上一次更笃定。',
  };
}

function normaliseAdvice(result, fallback) {
  if (!result || typeof result !== 'object') return fallback;
  const text = (value, backup) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 160) : backup;
  const route = Array.isArray(result.roadmap) && result.roadmap.length
    ? result.roadmap.slice(0, 3).map((item, index) => ({
      phase: text(item?.phase, ['今天', '未来 3 天', '本周'][index]),
      title: text(item?.title, fallback.roadmap[index].title),
      objective: text(item?.objective, fallback.roadmap[index].objective),
      tasks: Array.isArray(item?.tasks) && item.tasks.length
        ? item.tasks.slice(0, 3).map(task => text(task, '')).filter(Boolean)
        : fallback.roadmap[index].tasks,
    }))
    : fallback.roadmap;
  return {
    ...fallback,
    headline: text(result.headline, fallback.headline),
    observation: text(result.observation, fallback.observation),
    focusTitle: text(result.focusTitle, fallback.focusTitle),
    focusDetail: text(result.focusDetail, fallback.focusDetail),
    encouragement: text(result.encouragement, fallback.encouragement),
    roadmap: route,
  };
}

/**
 * 为 AI 建议区块构造隐私最小化的学习画像，并通过大模型返回可执行路线。
 * 没有模型密钥或模型暂不可用时，保留同一数据口径的本地路线，不让页面降级为空白。
 */
async function getAISuggestionDashboard(userId) {
  const trendStart = new Date();
  trendStart.setHours(0, 0, 0, 0);
  trendStart.setDate(trendStart.getDate() - 6);
  const [learningRecords, wrongQuestions, challengeRecords, feihuaRecords, ability, events] = await Promise.all([
    getLearningStats(userId),
    getWrongQuestionRows(userId).catch(() => []),
    getChallengeRecords(userId),
    getFeihuaRecords(userId),
    getUserAbilityModel(userId),
    // 使用日期字符串兼容 SQLite 的 "YYYY-MM-DD HH:mm:ss" 和 PostgreSQL 时间戳格式。
    learningEventService.getUserEvents(userId, { limit: null, startDate: toDayKey(trendStart) }).catch(() => []),
  ]);
  const recited = learningRecords.filter(row => Number(row.recite_attempts) > 0);
  const totalAttempts = recited.reduce((sum, row) => sum + nonNegativeInteger(row.recite_attempts), 0);
  const averageScore = totalAttempts
    ? clampScore(Math.round(recited.reduce((sum, row) => {
      const attempts = nonNegativeInteger(row.recite_attempts);
      return sum + Math.min(nonNegativeNumber(row.total_score), attempts * 100);
    }, 0) / totalAttempts), 0)
    : 0;
  const mastered = recited.filter(row => clampScore(row.best_score, 0) >= 100).length;
  const trend = buildTrend(events, learningRecords);
  const feihuaStats = summariseFeihuaRecords(feihuaRecords);
  const dimensions = [
    { key: 'memory', label: '记忆', score: clampScore(ability.memory_score) },
    { key: 'comprehension', label: '理解', score: clampScore(ability.comprehension_score) },
    { key: 'expression', label: '表达', score: clampScore(ability.expression_score) },
    { key: 'appreciation', label: '鉴赏', score: clampScore(ability.appreciation_score) },
  ].sort((a, b) => a.score - b.score);
  const weakPoems = recited
    .filter(row => clampScore(row.best_score, 0) < 80)
    .sort((a, b) => clampScore(a.best_score, 0) - clampScore(b.best_score, 0))
    .slice(0, 3)
    .map(row => ({ poem_id: row.poem_id, title: row.poem_title || row.title, author: row.poem_author || row.author, best_score: clampScore(row.best_score, 0) }));
  const profile = {
    totalLearned: learningRecords.length,
    averageScore,
    masteryRate: recited.length ? Math.round((mastered / recited.length) * 100) : 0,
    totalAttempts,
    wrongCount: wrongQuestions.length,
    weeklyActiveDays: trend.filter(day => day.activity > 0).length,
    trend,
    dimensions: [...dimensions].sort((a, b) => b.score - a.score),
    focus: dimensions[0],
    weakPoems,
    challengeAccuracy: challengeRecords.length ? Math.round((challengeRecords.filter(row => Number(row.is_correct) === 1).length / challengeRecords.length) * 100) : 0,
    feihuaSessions: feihuaRecords.length,
    feihuaBattles: feihuaStats.battles,
    feihuaWins: feihuaStats.wins,
    feihuaLosses: feihuaStats.losses,
    dataCoverage: {
      learningRecords: learningRecords.length,
      recitationRecords: recited.length,
      wrongQuestions: wrongQuestions.length,
      challengeRecords: challengeRecords.length,
      feihuaSessions: feihuaRecords.length,
      trendSource: events.some(event => trend.some(day => day.date === toDayKey(event.created_at))) ? 'learning_events' : 'learning_records_fallback',
    },
  };
  const fallback = makeFallbackAdvice(profile);
  let advice = fallback;
  let source = 'rule';

  if (config.zhipu.apiKey) {
    try {
      const aiResult = await callZhipuGenerateJSON(
        `学习画像（只用于生成建议，不要复述全部数字）：\n${JSON.stringify(profile)}\n\n请输出 JSON：{\"headline\":\"一句当前判断\",\"observation\":\"结合趋势的观察\",\"focusTitle\":\"薄弱项标题\",\"focusDetail\":\"不超过45字的原因\",\"roadmap\":[{\"phase\":\"今天\",\"title\":\"阶段标题\",\"objective\":\"阶段目标\",\"tasks\":[\"任务1\",\"任务2\"]},{\"phase\":\"未来3天\",\"title\":\"阶段标题\",\"objective\":\"阶段目标\",\"tasks\":[\"任务1\",\"任务2\"]},{\"phase\":\"本周\",\"title\":\"阶段标题\",\"objective\":\"阶段目标\",\"tasks\":[\"任务1\",\"任务2\"]}],\"encouragement\":\"温暖寄语\"}`,
        '你是一位专业、克制且温暖的古诗词学习教练。依据真实学习数据给出具体、短句、可执行的建议。不要编造学习事实，不要使用空泛鼓励，不要输出 markdown。',
        { temperature: 0.35, maxTokens: 1200, timeout: 35000 }
      );
      advice = normaliseAdvice(aiResult, fallback);
      source = 'llm';
    } catch (error) {
      console.warn('[personalizedService] AI 建议生成失败，使用规则路线:', error.message);
    }
  }

  return { profile, advice, source, generatedAt: new Date().toISOString() };
}

/** 获取完整的个性化数据。 */
async function getPersonalizedData(userId) {
  const [review, learn, wrongQuestions, challengeRecords, feihuaRecords, learningRecords] = await Promise.all([
    getReviewRecommendations(userId),
    getLearnRecommendations(userId),
    getWrongQuestionRows(userId).catch(() => []),
    getChallengeRecords(userId),
    getFeihuaRecords(userId),
    getLearningRecords(userId)
  ]);

  const analysis = await generateAIAnalysisReport(
    userId,
    wrongQuestions,
    challengeRecords,
    feihuaRecords,
    learningRecords
  );

  return {
    review,
    learn,
    analysis,
    _meta: {
      total_learned: learningRecords.length,
      wrong_count: wrongQuestions.length,
      has_data: learningRecords.length > 0
    }
  };
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
  getPersonalizedData,
  getPersonalizedRecommendations,
  getReviewRecommendations,
  getLearnRecommendations,
  getChallengeRecords,
  getFeihuaRecords,
  getLearningRecords,
  generateAIAnalysisReport,
  getAdaptiveLearningPlan,
  getAISuggestionDashboard
};
