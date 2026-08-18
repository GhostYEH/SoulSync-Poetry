const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const abilityModelService = require('../services/abilityModelService');
const authenticateToken = require('../middleware/auth');

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM learning_records WHERE user_id = $1', [userId]).then(row => row?.count || 0).catch(() => 0),
      db.get('SELECT COUNT(*) as count FROM collections WHERE user_id = $1', [userId]).then(row => row?.count || 0).catch(() => 0),
      db.get('SELECT COUNT(*) as count FROM user_creations WHERE user_id = $1', [userId]).then(row => row?.count || 0).catch(() => 0),
      db.get('SELECT MAX(level) as max_level FROM user_challenge_records WHERE user_id = $1', [userId]).then(row => row?.max_level || 0).catch(() => 0),
      db.get('SELECT rating FROM feihua_ranking WHERE user_id = $1', [userId]).then(row => row?.rating || 1000).catch(() => 1000),
      db.get('SELECT COUNT(*) as count FROM wrong_questions WHERE user_id = $1', [userId]).then(row => row?.count || 0).catch(() => 0),
      (async () => {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const row = await db.get('SELECT COUNT(DISTINCT date) as count FROM daily_checkin WHERE user_id = $1 AND date >= $2', [userId, weekAgo.split('T')[0]]);
        return row?.count || 0;
      })().catch(() => 0),
      db.get('SELECT SUM(study_time) as total FROM learning_records WHERE user_id = $1', [userId]).then(row => Math.round((row?.total || 0) / 60)).catch(() => 0),
      db.get('SELECT AVG(CAST(is_correct AS REAL)) as avg FROM user_challenge_records WHERE user_id = $1', [userId]).then(row => Math.round((row?.avg || 0) * 100)).catch(() => 0),
    ]);

    const recentPoems = await db.all(`
      SELECT lr.poem_id, lr.best_score, lr.last_view_time,
             p.title, p.author, p.dynasty, p.content
      FROM learning_records lr
      LEFT JOIN poems p ON lr.poem_id = p.id
      WHERE lr.user_id = $1
      ORDER BY lr.last_view_time DESC
      LIMIT 5
    `, [userId]).catch(() => []);

    const collectedPoems = await db.all(`
      SELECT c.poem_id, c.created_at as collected_at,
             p.title, p.author, p.dynasty, p.content
      FROM collections c
      LEFT JOIN poems p ON c.poem_id = p.id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
      LIMIT 5
    `, [userId]).catch(() => []);

    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const activityData = await db.all(`
      SELECT ${db.dateOnly('last_view_time')} as date, COUNT(*) as count
      FROM learning_records
      WHERE user_id = $1 AND last_view_time >= $2
      GROUP BY ${db.dateOnly('last_view_time')}
      ORDER BY date ASC
    `, [userId, monthAgo]).catch(() => []);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weeklyStats = await db.get(`
      SELECT
        COUNT(DISTINCT poem_id) as poems_learned,
        COUNT(*) as total_sessions,
        SUM(study_time) as total_time
      FROM learning_records
      WHERE user_id = $1 AND last_view_time >= $2
    `, [userId, weekAgo]).then(row => ({
      poems_learned: row?.poems_learned || 0,
      total_sessions: row?.total_sessions || 0,
      total_time: row?.total_time || 0
    })).catch(() => ({ poems_learned: 0, total_sessions: 0, total_time: 0 }));

    const abilityModel = await abilityModelService.calculateAbilityModel(userId);

    const challengeStats = await db.all(`
      SELECT level, best_score, answered_at as completed_at
      FROM user_challenge_records
      WHERE user_id = $1
      ORDER BY level DESC
      LIMIT 10
    `, [userId]).catch(() => []);

    const payload = {
      userId,
      overview: {
        poemsStudied: stats[0],
        collections: stats[1],
        creations: stats[2],
        challengeLevel: stats[3],
        feihuaRating: stats[4],
        wrongQuestions: stats[5],
        weeklyCheckins: stats[6],
        totalStudyTime: stats[7],
        accuracy: stats[8]
      },
      recentPoems,
      collectedPoems,
      activityData,
      weeklyStats,
      challengeStats,
      abilityModel
    };


    return res.json({ success: true, data: payload, message: '查询成功' });
  } catch (error) {
    console.error('[profileRoutes] 获取个人中心统计异常:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const learningActivity = await db.all(`
      SELECT ${db.dateOnly('last_view_time')} as date, COUNT(*) as count
      FROM learning_records
      WHERE user_id = $1 AND last_view_time >= $2
      GROUP BY ${db.dateOnly('last_view_time')}
      ORDER BY date ASC
    `, [userId, monthAgo]).catch(() => []);

    const challengeActivity = await db.all(`
      SELECT ${db.dateOnly('answered_at')} as date, COUNT(*) as count, AVG(CAST(is_correct AS REAL)) as accuracy
      FROM user_challenge_records
      WHERE user_id = $1 AND answered_at >= $2
      GROUP BY ${db.dateOnly('answered_at')}
      ORDER BY date ASC
    `, [userId, monthAgo]).catch(() => []);

    const checkinActivity = await db.all(`
      SELECT date, COUNT(*) as count
      FROM daily_checkin
      WHERE user_id = $1 AND date >= $2
      GROUP BY date
      ORDER BY date ASC
    `, [userId, monthAgo]).catch(() => []);

    const creationActivity = await db.all(`
      SELECT ${db.dateOnly('created_at')} as date, COUNT(*) as count
      FROM user_creations
      WHERE user_id = $1 AND created_at >= $2
      GROUP BY ${db.dateOnly('created_at')}
      ORDER BY date ASC
    `, [userId, monthAgo]).catch(() => []);

    const dynastyDistribution = await db.all(`
      SELECT p.dynasty, COUNT(*) as count
      FROM learning_records lr
      JOIN poems p ON lr.poem_id = p.id
      WHERE lr.user_id = $1
      GROUP BY p.dynasty
      ORDER BY count DESC
    `, [userId]).catch(() => []);

    const authorDistribution = await db.all(`
      SELECT p.author, COUNT(*) as count
      FROM learning_records lr
      JOIN poems p ON lr.poem_id = p.id
      WHERE lr.user_id = $1
      GROUP BY p.author
      ORDER BY count DESC
      LIMIT 10
    `, [userId]).catch(() => []);

    const payload = {
      learningActivity,
      challengeActivity,
      checkinActivity,
      creationActivity,
      dynastyDistribution,
      authorDistribution
    };


    return res.json({ success: true, data: payload, message: '查询成功' });
  } catch (error) {
    console.error('[profileRoutes] 获取活动数据异常:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.get('/achievements', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const allAchievements = [
      { id: 'poem_10', name: '初学者', desc: '学习10首诗词', icon: '📖', type: 'poems' },
      { id: 'poem_50', name: '诗词爱好者', desc: '学习50首诗词', icon: '📚', type: 'poems' },
      { id: 'poem_100', name: '诗词达人', desc: '学习100首诗词', icon: '🏅', type: 'poems' },
      { id: 'poem_200', name: '诗词大师', desc: '学习200首诗词', icon: '🎓', type: 'poems' },
      { id: 'collect_10', name: '收藏家', desc: '收藏10首诗词', icon: '⭐', type: 'collections' },
      { id: 'collect_30', name: '藏书阁', desc: '收藏30首诗词', icon: '🏛', type: 'collections' },
      { id: 'create_5', name: '初露锋芒', desc: '创作5首诗词', icon: '✍️', type: 'creations' },
      { id: 'create_20', name: '诗才横溢', desc: '创作20首诗词', icon: '🖋', type: 'creations' },
      { id: 'challenge_10', name: '闯关新秀', desc: '通关10关', icon: '🗝', type: 'challenge' },
      { id: 'challenge_30', name: '闯关勇士', desc: '通关30关', icon: '⚔️', type: 'challenge' },
      { id: 'challenge_50', name: '闯关英雄', desc: '通关50关', icon: '👑', type: 'challenge' },
      { id: 'accuracy_80', name: '精准打击', desc: '准确率达到80%', icon: '🎯', type: 'accuracy' },
      { id: 'accuracy_90', name: '百发百中', desc: '准确率达到90%', icon: '💯', type: 'accuracy' },
      { id: 'streak_7', name: '连续7天', desc: '连续打卡7天', icon: '🔥', type: 'streak' },
      { id: 'streak_30', name: '坚持不懈', desc: '连续打卡30天', icon: '💪', type: 'streak' },
      { id: 'feihua_master', name: '飞花令高手', desc: '飞花令积分达到1500', icon: '🌸', type: 'feihua' },
      { id: 'feihua_legend', name: '飞花令传奇', desc: '飞花令积分达到2000', icon: '🌺', type: 'feihua' },
    ];

    const userStats = await db.get(`
      SELECT
        (SELECT COUNT(*) FROM learning_records WHERE user_id = $1) as poems_count,
        (SELECT COUNT(*) FROM collections WHERE user_id = $2) as collections_count,
        (SELECT COUNT(*) FROM user_creations WHERE user_id = $3) as creations_count,
        (SELECT MAX(level) FROM user_challenge_records WHERE user_id = $4) as max_level,
        (SELECT AVG(CAST(is_correct AS REAL)) FROM user_challenge_records WHERE user_id = $5) as avg_accuracy,
        (SELECT rating FROM feihua_ranking WHERE user_id = $6) as feihua_rating
    `, [userId, userId, userId, userId, userId, userId]).catch(() => ({
      poems_count: 0, collections_count: 0, creations_count: 0, max_level: 0, avg_accuracy: 0, feihua_rating: 1000
    }));

    const checkinRows = await db.all(`
      SELECT date
      FROM daily_checkin
      WHERE user_id = $1
      ORDER BY date DESC
    `, [userId]).catch(() => []);

    let checkinStreak = 0;
    if (checkinRows && checkinRows.length > 0) {
      let lastDate = null;
      const today = new Date().toISOString().split('T')[0];
      for (const row of checkinRows) {
        const date = row.date;
        if (!lastDate) {
          const diff = Math.floor((new Date(today) - new Date(date)) / (24 * 60 * 60 * 1000));
          if (diff <= 1) {
            checkinStreak = 1;
            lastDate = date;
          } else {
            break;
          }
        } else {
          const diff = Math.floor((new Date(lastDate) - new Date(date)) / (24 * 60 * 60 * 1000));
          if (diff === 1) {
            checkinStreak++;
            lastDate = date;
          } else {
            break;
          }
        }
      }
    }

    const achievements = allAchievements.map(a => {
      let progress = 0;
      let target = 0;
      switch (a.type) {
        case 'poems': target = parseInt(a.id.split('_')[1]); progress = userStats.poems_count; break;
        case 'collections': target = parseInt(a.id.split('_')[1]); progress = userStats.collections_count; break;
        case 'creations': target = parseInt(a.id.split('_')[1]); progress = userStats.creations_count; break;
        case 'challenge': target = parseInt(a.id.split('_')[1]); progress = userStats.max_level; break;
        case 'accuracy': target = parseInt(a.id.split('_')[1]); progress = Math.round((userStats.avg_accuracy || 0) * 100); break;
        case 'streak': target = parseInt(a.id.split('_')[1]); progress = checkinStreak; break;
        case 'feihua':
          target = a.id === 'feihua_master' ? 1500 : 2000;
          progress = userStats.feihua_rating || 1000;
          break;
      }
      const unlocked = progress >= target;
      return { ...a, progress, target, unlocked };
    });

    const unlockedCount = achievements.filter(a => a.unlocked).length;

    const payload = {
      achievements,
      summary: {
        total: achievements.length,
        unlocked: unlockedCount,
        totalProgress: Math.round((unlockedCount / achievements.length) * 100)
      },
      userStats: {
        poemsCount: userStats.poems_count,
        collectionsCount: userStats.collections_count,
        creationsCount: userStats.creations_count,
        maxLevel: userStats.max_level,
        avgAccuracy: Math.round((userStats.avg_accuracy || 0) * 100),
        feihuaRating: userStats.feihua_rating || 1000,
        checkinStreak
      }
    };


    return res.json({ success: true, data: payload, message: '查询成功' });
  } catch (error) {
    console.error('[profileRoutes] 获取成就异常:', error);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

module.exports = { router };
