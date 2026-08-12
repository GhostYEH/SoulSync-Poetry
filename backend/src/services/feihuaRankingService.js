const db = require('../utils/db');

const RANK_LEVELS = [
  { name: '青铜', min: 0, max: 1099, color: '#cd7f32', icon: '🥉' },
  { name: '白银', min: 1100, max: 1299, color: '#c0c0c0', icon: '🥈' },
  { name: '黄金', min: 1300, max: 1499, color: '#ffd700', icon: '🥇' },
  { name: '铂金', min: 1500, max: 1699, color: '#e5e4e2', icon: '💎' },
  { name: '钻石', min: 1700, max: 1899, color: '#b9f2ff', icon: '💠' },
  { name: '大师', min: 1900, max: 2099, color: '#9932cc', icon: '🏆' },
  { name: '宗师', min: 2100, max: 2299, color: '#ff4500', icon: '👑' },
  { name: '王者', min: 2300, max: 9999, color: '#ff0000', icon: '🌟' }
];

async function getRankingInfo(userId) {
  const row = await db.get(
    'SELECT * FROM feihua_rankings WHERE user_id = $1',
    [userId]
  );

  if (!row) {
    const defaultRank = {
      rank_level: '青铜',
      rating: 1000,
      wins: 0,
      losses: 0,
      total_battles: 0,
      current_streak: 0,
      best_streak: 0
    };

    await db.run(
      `INSERT INTO feihua_rankings (user_id, rank_level, rating, wins, losses, total_battles, current_streak, best_streak)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, defaultRank.rank_level, defaultRank.rating, defaultRank.wins, defaultRank.losses,
        defaultRank.total_battles, defaultRank.current_streak, defaultRank.best_streak]
    );
    return { ...defaultRank, user_id: userId };
  }

  const level = getRankLevel(row.rating);
  if (row.rank_level !== level.name) {
    await db.run('UPDATE feihua_rankings SET rank_level = $1 WHERE user_id = $2',
      [level.name, userId]);
    row.rank_level = level.name;
  }
  return row;
}

function getRankLevel(rating) {
  for (const level of RANK_LEVELS) {
    if (rating >= level.min && rating <= level.max) {
      return level;
    }
  }
  return RANK_LEVELS[0];
}

function getRankLevelInfo(levelName) {
  return RANK_LEVELS.find(l => l.name === levelName) || RANK_LEVELS[0];
}

async function updateRankingAfterBattle(winnerId, loserId, isDraw = false) {
  const winnerInfo = await getRankingInfo(winnerId);
  const loserInfo = await getRankingInfo(loserId);

  const K = 32;
  const expectedWinner = 1 / (1 + Math.pow(10, (loserInfo.rating - winnerInfo.rating) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerInfo.rating - loserInfo.rating) / 400));

  let winnerDelta, loserDelta;
  if (isDraw) {
    winnerDelta = Math.round(K * (0.5 - expectedWinner));
    loserDelta = Math.round(K * (0.5 - expectedLoser));
  } else {
    winnerDelta = Math.round(K * (1 - expectedWinner));
    loserDelta = Math.round(K * (0 - expectedLoser));
  }

  const newWinnerRating = Math.max(0, winnerInfo.rating + winnerDelta);
  const newLoserRating = Math.max(0, loserInfo.rating + loserDelta);
  const newWinnerLevel = getRankLevel(newWinnerRating);
  const newLoserLevel = getRankLevel(newLoserRating);

  const newWinnerStreak = winnerInfo.current_streak + 1;
  const newBestStreak = Math.max(winnerInfo.best_streak, newWinnerStreak);

  await db.run(
    `UPDATE feihua_rankings
     SET rating = $1,
         rank_level = $2,
         wins = wins + 1,
         total_battles = total_battles + 1,
         current_streak = $3,
         best_streak = $4,
         last_battle_at = CURRENT_TIMESTAMP
     WHERE user_id = $5`,
    [newWinnerRating, newWinnerLevel.name, newWinnerStreak, newBestStreak, winnerId]
  );

  await db.run(
    `UPDATE feihua_rankings
     SET rating = $1,
         rank_level = $2,
         losses = losses + 1,
         total_battles = total_battles + 1,
         current_streak = 0,
         last_battle_at = CURRENT_TIMESTAMP
     WHERE user_id = $3`,
    [newLoserRating, newLoserLevel.name, loserId]
  );

  return {
    winner: {
      id: winnerId,
      oldRating: winnerInfo.rating,
      newRating: newWinnerRating,
      delta: winnerDelta,
      newLevel: newWinnerLevel
    },
    loser: {
      id: loserId,
      oldRating: loserInfo.rating,
      newRating: newLoserRating,
      delta: loserDelta,
      newLevel: newLoserLevel
    }
  };
}

async function getLeaderboard(limit = 50, page = 1) {
  const offset = (page - 1) * limit;

  const rows = await db.all(
    `SELECT 
      fr.*,
      u.username,
      ROW_NUMBER() OVER (ORDER BY fr.rating DESC, fr.wins DESC) as rank
    FROM feihua_rankings fr
    JOIN users u ON fr.user_id = u.id
    WHERE fr.total_battles > 0
    ORDER BY fr.rating DESC, fr.wins DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return rows.map(row => {
    const level = getRankLevel(row.rating);
    return {
      ...row,
      rank_level: level.name,
      rank_level_info: level
    };
  });
}

async function getUserRank(userId) {
  const row = await db.get(
    `SELECT rank
    FROM (
      SELECT 
        user_id,
        ROW_NUMBER() OVER (ORDER BY rating DESC, wins DESC) as rank
      FROM feihua_rankings
      WHERE total_battles > 0
    ) sub
    WHERE user_id = $1`,
    [userId]
  );
  return { rank: row?.rank || null };
}

async function getRankingStats() {
  const row = await db.get(
    `SELECT 
      COUNT(*) as total_players,
      SUM(total_battles) as total_battles,
      SUM(wins) as total_wins,
      AVG(rating) as avg_rating,
      MAX(rating) as max_rating,
      MIN(rating) as min_rating
    FROM feihua_rankings
    WHERE total_battles > 0`
  );

  const levelStats = await db.all(
    `SELECT rank_level, COUNT(*) as count
    FROM feihua_rankings
    WHERE total_battles > 0
    GROUP BY rank_level
    ORDER BY 
      CASE rank_level
        WHEN '青铜' THEN 1
        WHEN '白银' THEN 2
        WHEN '黄金' THEN 3
        WHEN '铂金' THEN 4
        WHEN '钻石' THEN 5
        WHEN '大师' THEN 6
        WHEN '宗师' THEN 7
        WHEN '王者' THEN 8
      END`
  );

  return {
    ...row,
    levelDistribution: levelStats
  };
}

module.exports = {
  RANK_LEVELS,
  getRankingInfo,
  getRankLevel,
  getRankLevelInfo,
  updateRankingAfterBattle,
  getLeaderboard,
  getUserRank,
  getRankingStats
};
