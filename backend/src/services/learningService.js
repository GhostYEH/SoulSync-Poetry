require('dotenv').config({ quiet: true });
const axios = require('axios');
const db = require('../utils/db');

function buildLearningTrends(learnedPoems) {
  const trends = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();

    let monthStr = String(m + 1);
    if (monthStr.length === 1) {
      monthStr = '0' + monthStr;
    }
    let dayStr = String(d);
    if (dayStr.length === 1) {
      dayStr = '0' + dayStr;
    }
    const dateStr = monthStr + '-' + dayStr;

    const onDay = [];
    for (let j = 0; j < learnedPoems.length; j++) {
      const r = learnedPoems[j];
      if (!r.last_view_time) {
        continue;
      }
      const t = new Date(r.last_view_time);
      if (t.getFullYear() === y && t.getMonth() === m && t.getDate() === d) {
        onDay.push(r);
      }
    }

    let score = 0;
    if (onDay.length > 0) {
      const recited = [];
      for (let j = 0; j < onDay.length; j++) {
        if (onDay[j].recite_attempts > 0) {
          recited.push(onDay[j]);
        }
      }

      if (recited.length > 0) {
        let totalScore = 0;
        for (let j = 0; j < recited.length; j++) {
          let bestScore = recited[j].best_score || 0;
          totalScore = totalScore + bestScore;
        }
        score = Math.round(totalScore / recited.length);
      } else {
        let engagement = 0;
        for (let j = 0; j < onDay.length; j++) {
          let viewCount = onDay[j].view_count || 0;
          let aiCount = onDay[j].ai_explain_count || 0;
          engagement = engagement + viewCount + aiCount * 2;
        }
        let tempScore = 30 + engagement * 4;
        if (tempScore > 100) {
          tempScore = 100;
        }
        score = Math.round(tempScore);
      }
    } else {
      score = 0;
    }

    trends.push({ date: dateStr, score: score, activePoems: onDay.length });
  }

  return trends;
}

let learningRecords = {};

function initLearningRecords(poems) {
  // PostgreSQL不需要serialize，已移除
}

async function recordLearningAction(userId, poemId, action, score) {
  if (score === undefined) {
    score = null;
  }

  const cacheKey = String(userId) + ':' + String(poemId);

  let recordObj = {};
  recordObj.id = null;
  recordObj.user_id = userId;
  recordObj.poem_id = poemId;
  recordObj.view_count = 0;
  recordObj.ai_explain_count = 0;
  recordObj.recite_attempts = 0;
  recordObj.best_score = 0;
  recordObj.total_score = 0;
  recordObj.study_time = 0;
  recordObj.last_view_time = null;

  if (action === 'view') {
    recordObj.view_count = 1;
    recordObj.last_view_time = new Date().toISOString();
  } else if (action === 'ai_explain') {
    recordObj.ai_explain_count = 1;
  } else if (action === 'recite') {
    recordObj.recite_attempts = 1;
    if (score !== null) {
      recordObj.total_score = score;
      recordObj.best_score = score;
    }
  } else if (action === 'study_time') {
    if (score !== null && score > 0) {
      recordObj.study_time = score;
    }
  }

  const row = await db.get('SELECT * FROM learning_records WHERE user_id = $1 AND poem_id = $2', [userId, poemId]);

  if (row) {
    let newViewCount = row.view_count + recordObj.view_count;
    let newAiCount = row.ai_explain_count + recordObj.ai_explain_count;
    let newReciteAttempts = row.recite_attempts + recordObj.recite_attempts;
    let newTotalScore = row.total_score;
    let newBestScore = row.best_score;
    let newStudyTime = row.study_time;
    let newLastViewTime = row.last_view_time;

    if (recordObj.recite_attempts > 0 && score !== null) {
      newTotalScore = row.total_score + score;
      if (score > row.best_score) {
        newBestScore = score;
      }
    }

    if (recordObj.study_time > 0) {
      newStudyTime = row.study_time + recordObj.study_time;
    }

    if (recordObj.view_count > 0) {
      newViewCount = row.view_count + 1;
      newLastViewTime = new Date().toISOString();
    }

    await db.run(
      'UPDATE learning_records SET view_count = $1, ai_explain_count = $2, recite_attempts = $3, best_score = $4, total_score = $5, study_time = $6, last_view_time = $7 WHERE user_id = $8 AND poem_id = $9',
      [newViewCount, newAiCount, newReciteAttempts, newBestScore, newTotalScore, newStudyTime, newLastViewTime, userId, poemId]
    );
    recordObj = {
      ...row,
      view_count: newViewCount,
      ai_explain_count: newAiCount,
      recite_attempts: newReciteAttempts,
      best_score: newBestScore,
      total_score: newTotalScore,
      study_time: newStudyTime,
      last_view_time: newLastViewTime,
    };
  } else {
    const result = await db.run(
      'INSERT INTO learning_records (user_id, poem_id, view_count, ai_explain_count, recite_attempts, best_score, total_score, study_time, last_view_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
      [userId, poemId, recordObj.view_count, recordObj.ai_explain_count, recordObj.recite_attempts, recordObj.best_score, recordObj.total_score, recordObj.study_time, recordObj.last_view_time]
    );
    recordObj.id = result.rows[0].id;
  }

  learningRecords[cacheKey] = recordObj;

  return recordObj;
}

async function getLearningStats(userId) {
  return db.all(
    'SELECT lr.*, p.title as poem_title, p.author as poem_author FROM learning_records lr JOIN poems p ON lr.poem_id = p.id WHERE lr.user_id = $1 AND (lr.view_count > 0 OR lr.ai_explain_count > 0 OR lr.recite_attempts > 0)',
    [userId]
  );
}

async function getLearningRecord(userId, poemId) {
  const row = await db.get(
    'SELECT lr.*, p.title as poem_title, p.author as poem_author FROM learning_records lr JOIN poems p ON lr.poem_id = p.id WHERE lr.user_id = $1 AND lr.poem_id = $2',
    [userId, poemId]
  );
  return row || null;
}

async function getLearningDashboard(userId) {
  const learnedPoems = await db.all(
    'SELECT lr.*, p.title as poem_title, p.author as poem_author FROM learning_records lr JOIN poems p ON lr.poem_id = p.id WHERE lr.user_id = $1 AND (lr.view_count > 0 OR lr.ai_explain_count > 0 OR lr.recite_attempts > 0)',
    [userId]
  );

  const totalLearned = learnedPoems.length;

  const recitedPoems = [];
  for (let i = 0; i < learnedPoems.length; i++) {
    if (learnedPoems[i].recite_attempts > 0) {
      recitedPoems.push(learnedPoems[i]);
    }
  }

  let totalScoreSum = 0;
  let totalAttempts = 0;
  for (let i = 0; i < recitedPoems.length; i++) {
    totalScoreSum = totalScoreSum + (recitedPoems[i].total_score || 0);
    totalAttempts = totalAttempts + recitedPoems[i].recite_attempts;
  }
  let averageScore = 0;
  if (totalAttempts > 0) {
    averageScore = Math.round(totalScoreSum / totalAttempts);
  }

  let mistakeCount = 0;
  for (let i = 0; i < recitedPoems.length; i++) {
    if (recitedPoems[i].best_score < 100) {
      mistakeCount = mistakeCount + 1;
    }
  }

  let totalStudyTime = 0;
  for (let i = 0; i < learnedPoems.length; i++) {
    totalStudyTime = totalStudyTime + (learnedPoems[i].study_time || 0);
  }

  const recentLearnings = [];
  for (let i = 0; i < learnedPoems.length; i++) {
    if (learnedPoems[i].last_view_time) {
      recentLearnings.push(learnedPoems[i]);
    }
  }
  for (let i = 0; i < recentLearnings.length; i++) {
    for (let j = i + 1; j < recentLearnings.length; j++) {
      const a = new Date(recentLearnings[i].last_view_time);
      const b = new Date(recentLearnings[j].last_view_time);
      if (a < b) {
        const temp = recentLearnings[i];
        recentLearnings[i] = recentLearnings[j];
        recentLearnings[j] = temp;
      }
    }
  }
  const recentLearningsResult = [];
  const recentCount = recentLearnings.length > 5 ? 5 : recentLearnings.length;
  for (let i = 0; i < recentCount; i++) {
    recentLearningsResult.push(recentLearnings[i]);
  }

  let masteredCount = 0;
  for (let i = 0; i < recitedPoems.length; i++) {
    if (recitedPoems[i].best_score === 100) {
      masteredCount = masteredCount + 1;
    }
  }
  let masteryRate = 0;
  if (recitedPoems.length > 0) {
    masteryRate = Math.round((masteredCount / recitedPoems.length) * 100);
  }

  const result = {};
  result.totalLearned = totalLearned;
  result.averageScore = averageScore;
  result.mistakeCount = mistakeCount;
  result.recentLearnings = recentLearningsResult;
  result.masteryRate = masteryRate;
  result.totalStudyTime = totalStudyTime;
  result.learningTrends = buildLearningTrends(learnedPoems);

  return result;
}

async function generateAiLearningAdvice(userId) {
  const config = require('../config/config');
  const { callZhipuGenerateJSON } = require('./aiService');

  const apiKey = config.zhipu.apiKey;

  if (!apiKey) {
    const err = new Error('AI 服务未配置');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const rows = await getLearningStats(userId);

  const sorted = [];
  for (let i = 0; i < rows.length; i++) {
    sorted.push(rows[i]);
  }
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      let aTime = sorted[i].last_view_time;
      let bTime = sorted[j].last_view_time;
      let aIsEmpty = !aTime;
      let bIsEmpty = !bTime;
      let swap = false;
      if (aIsEmpty && !bIsEmpty) {
        swap = true;
      } else if (!aIsEmpty && !bIsEmpty) {
        const a = new Date(aTime);
        const b = new Date(bTime);
        if (a < b) {
          swap = true;
        }
      }
      if (swap) {
        const temp = sorted[i];
        sorted[i] = sorted[j];
        sorted[j] = temp;
      }
    }
  }

  const recited = [];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].recite_attempts > 0) {
      recited.push(sorted[i]);
    }
  }

  let totalScoreSum = 0;
  let totalAttempts = 0;
  for (let i = 0; i < recited.length; i++) {
    totalScoreSum = totalScoreSum + (recited[i].total_score || 0);
    totalAttempts = totalAttempts + recited[i].recite_attempts;
  }
  let averageRecite = 0;
  if (totalAttempts > 0) {
    averageRecite = Math.round(totalScoreSum / totalAttempts);
  }

  let mistakeCount = 0;
  for (let i = 0; i < recited.length; i++) {
    if (recited[i].best_score < 100) {
      mistakeCount = mistakeCount + 1;
    }
  }

  let masteredCount = 0;
  for (let i = 0; i < recited.length; i++) {
    if (recited[i].best_score === 100) {
      masteredCount = masteredCount + 1;
    }
  }

  let masteryRate = 0;
  if (recited.length > 0) {
    masteryRate = Math.round((masteredCount / recited.length) * 100);
  }

  let totalStudyTime = 0;
  for (let i = 0; i < sorted.length; i++) {
    totalStudyTime = totalStudyTime + (sorted[i].study_time || 0);
  }

  const strongPoems = [];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].recite_attempts > 0 && sorted[i].best_score >= 90) {
      strongPoems.push(sorted[i]);
      if (strongPoems.length >= 5) {
        break;
      }
    }
  }

  const weakPoems = [];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].recite_attempts > 0 && sorted[i].best_score < 80) {
      weakPoems.push(sorted[i]);
      if (weakPoems.length >= 5) {
        break;
      }
    }
  }

  const unrecitedPoems = [];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].recite_attempts === 0) {
      unrecitedPoems.push(sorted[i]);
      if (unrecitedPoems.length >= 5) {
        break;
      }
    }
  }

  const recentPoems = [];
  const recentCount = sorted.length > 5 ? 5 : sorted.length;
  for (let i = 0; i < recentCount; i++) {
    recentPoems.push(sorted[i]);
  }

  const strongPoemsList = [];
  for (let i = 0; i < strongPoems.length; i++) {
    const p = strongPoems[i];
    const item = {};
    item.title = p.poem_title;
    item.author = p.poem_author;
    item.best_score = p.best_score;
    item.attempts = p.recite_attempts;
    item.view_count = p.view_count;
    item.ai_explain_count = p.ai_explain_count;
    strongPoemsList.push(item);
  }

  const weakPoemsList = [];
  for (let i = 0; i < weakPoems.length; i++) {
    const p = weakPoems[i];
    const item = {};
    item.title = p.poem_title;
    item.author = p.poem_author;
    item.best_score = p.best_score;
    item.attempts = p.recite_attempts;
    weakPoemsList.push(item);
  }

  const unrecitedPoemsList = [];
  for (let i = 0; i < unrecitedPoems.length; i++) {
    const p = unrecitedPoems[i];
    const item = {};
    item.title = p.poem_title;
    item.author = p.poem_author;
    item.view_count = p.view_count;
    unrecitedPoemsList.push(item);
  }

  const recentPoemsList = [];
  for (let i = 0; i < recentPoems.length; i++) {
    const p = recentPoems[i];
    const item = {};
    item.title = p.poem_title;
    item.author = p.poem_author;
    item.last_view_time = p.last_view_time;
    recentPoemsList.push(item);
  }

  const summary = {};
  summary.total_learned_poems = sorted.length;
  summary.average_recite_score_percent = averageRecite;
  summary.imperfect_recite_poems = mistakeCount;
  summary.mastery_rate_percent = masteryRate;
  summary.total_study_time_minutes = totalStudyTime;
  summary.strong_poems = strongPoemsList;
  summary.weak_poems = weakPoemsList;
  summary.unrecited_poems = unrecitedPoemsList;
  summary.recent_poems = recentPoemsList;

  let strongPoemsText = '暂无';
  if (strongPoemsList.length > 0) {
    strongPoemsText = '';
    for (let i = 0; i < strongPoemsList.length; i++) {
      const p = strongPoemsList[i];
      let line = '- 《' + p.title + '》';
      if (p.author) {
        line = line + '（' + p.author + '）';
      }
      line = line + '：最高' + p.best_score + '分，背诵' + p.attempts + '次';
      strongPoemsText = strongPoemsText + line + '\n';
    }
  }

  let weakPoemsText = '暂无';
  if (weakPoemsList.length > 0) {
    weakPoemsText = '';
    for (let i = 0; i < weakPoemsList.length; i++) {
      const p = weakPoemsList[i];
      let line = '- 《' + p.title + '》';
      if (p.author) {
        line = line + '（' + p.author + '）';
      }
      line = line + '：最高' + p.best_score + '分，背诵' + p.attempts + '次';
      weakPoemsText = weakPoemsText + line + '\n';
    }
  }

  let unrecitedPoemsText = '暂无';
  if (unrecitedPoemsList.length > 0) {
    unrecitedPoemsText = '';
    for (let i = 0; i < unrecitedPoemsList.length; i++) {
      const p = unrecitedPoemsList[i];
      let line = '- 《' + p.title + '》';
      if (p.author) {
        line = line + '（' + p.author + '）';
      }
      line = line + '：查看' + p.view_count + '次';
      unrecitedPoemsText = unrecitedPoemsText + line + '\n';
    }
  }

  let recentPoemsText = '暂无';
  if (recentPoemsList.length > 0) {
    recentPoemsText = '';
    for (let i = 0; i < recentPoemsList.length; i++) {
      const p = recentPoemsList[i];
      let line = '- 《' + p.title + '》';
      if (p.author) {
        line = line + '（' + p.author + '）';
      }
      recentPoemsText = recentPoemsText + line + '\n';
    }
  }

  const prompt = `请根据以下学习数据，为学生生成个性化的学习建议：

【学习概况】
- 已学习诗词：${summary.total_learned_poems} 首
- 平均背诵得分：${summary.average_recite_score_percent}%
- 掌握率（满分诗词占比）：${summary.mastery_rate_percent}%
- 累计学习时长：${summary.total_study_time_minutes} 分钟
- 有背诵记录的诗词：${recited.length} 首

【掌握较好的诗词】（得分≥90分）
${strongPoemsText}
【需要加强的诗词】（得分<80分）
${weakPoemsText}
【已查看但未背诵的诗词】
${unrecitedPoemsText}
【最近学习的诗词】
${recentPoemsText}

请直接返回实际的JSON结果（不要返回模板）：
{"summary":"学习概况总结，概述学生的学习状态和整体表现","strength":"优势亮点，指出学生做得好的地方","weakness":"薄弱环节，客观指出需要改进的地方","suggestion":"改进建议，给出具体可操作的学习方法","plan":["任务1","任务2","任务3"],"encourage":"激励寄语，用温暖的话语鼓励学生"}`;

  try {
    const result = await callZhipuGenerateJSON(
      prompt,
      '你是经验丰富、温暖亲切的古诗词学习导师。请根据学生数据生成个性化学习建议，直接返回JSON结果。',
      { temperature: 0.7, maxTokens: 2000 }
    );

    if (result) {
      return {
        summary: result.summary || '',
        strength: result.strength || '',
        weakness: result.weakness || '',
        suggestion: result.suggestion || '',
        plan: Array.isArray(result.plan) ? result.plan : [],
        encourage: result.encourage || ''
      };
    }

    throw new Error('AI返回空结果');
  } catch (err) {
    console.error('[learningService] AI学习建议生成失败:', err.message);
    if (err.code === 'NO_API_KEY') {
      throw err;
    }
    console.log('[learningService] 使用降级方案生成学习建议');
    return generateFallbackLearningAdvice(summary);
  }
}

function generateFallbackLearningAdvice(summary) {
  const plans = [];
  
  if (summary.mastery_rate_percent < 50) {
    plans.push('优先复习已学诗词，巩固基础');
    plans.push('每天背诵1首已学诗词');
  } else if (summary.mastery_rate_percent < 80) {
    plans.push('加强薄弱诗词的复习');
    plans.push('尝试飞花令游戏巩固记忆');
  } else {
    plans.push('挑战更高难度的诗词');
    plans.push('尝试创作自己的诗词');
  }
  
  if (summary.total_study_time_minutes < 30) {
    plans.push('每天增加学习时间');
  }
  
  if (summary.weak_poems && summary.weak_poems.length > 0) {
    plans.push('重点复习《' + summary.weak_poems[0].title + '》');
  }
  
  return {
    summary: `你已学习${summary.total_learned_poems}首诗词，掌握率${summary.mastery_rate_percent}%，继续加油！`,
    strength: summary.strong_poems && summary.strong_poems.length > 0 
      ? `《${summary.strong_poems[0].title}》等诗词掌握得很好！`
      : '学习态度积极，继续保持！',
    weakness: summary.weak_poems && summary.weak_poems.length > 0
      ? `《${summary.weak_poems[0].title}》等诗词需要加强复习`
      : '暂无明显薄弱环节',
    suggestion: summary.mastery_rate_percent < 80
      ? '建议多进行背诵练习，巩固记忆效果'
      : '建议尝试诗词创作，提升文学素养',
    plan: plans.slice(0, 3),
    encourage: '坚持就是胜利，每一次学习都会让你更加优秀！'
  };
}

module.exports = {
  initLearningRecords: initLearningRecords,
  recordLearningAction: recordLearningAction,
  getLearningStats: getLearningStats,
  getLearningRecord: getLearningRecord,
  getLearningDashboard: getLearningDashboard,
  generateAiLearningAdvice: generateAiLearningAdvice
};
