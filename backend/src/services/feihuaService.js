const db = require('../utils/db');

async function saveFeihuaGame(userId, keyword, score, poemCount, history) {
  try {
    const now = new Date().toISOString();
    const historyJson = JSON.stringify(history);

    const result = await db.query(
      'INSERT INTO feihua_games (user_id, keyword, score, poem_count, history, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [userId, keyword, score, poemCount, historyJson, now]
    );

    const gameRecord = {
      id: result.rows[0].id,
      user_id: userId,
      keyword,
      score,
      poem_count: poemCount,
      history,
      created_at: now
    };

    return gameRecord;
  } catch (err) {
    console.error('保存飞花令游戏记录失败:', err);
    throw err;
  }
}

async function getUserFeihuaGames(userId) {
  try {
    const result = await db.query(
      'SELECT * FROM feihua_games WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const games = result.rows.map(row => ({
      ...row,
      history: JSON.parse(row.history)
    }));

    return games;
  } catch (err) {
    console.error('获取飞花令游戏记录失败:', err);
    throw err;
  }
}

async function getHighScore(userId) {
  try {
    const result = await db.query(
      'SELECT MAX(score) as high_score FROM feihua_games WHERE user_id = $1',
      [userId]
    );

    return result.rows[0]?.high_score || 0;
  } catch (err) {
    console.error('获取最高得分失败:', err);
    throw err;
  }
}

module.exports = {
  saveFeihuaGame,
  getUserFeihuaGames,
  getHighScore
};
