const db = require('../utils/db');

async function getDailyPoem(userId) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const todayStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  const existing = await db.get(
    'SELECT dp.*, p.title, p.author, p.content, p.dynasty FROM daily_poems dp JOIN poems p ON dp.poem_id = p.id WHERE dp.date = $1',
    [todayStr]
  );

  if (existing) {
    let isCollected = false;
    if (userId) {
      const row = await db.get(
        'SELECT * FROM collections WHERE user_id = $1 AND poem_id = $2',
        [userId, existing.poem_id]
      );
      isCollected = !!row;
    }
    return { ...existing, isCollected };
  }

  const poem = await db.get(
    'SELECT * FROM poems ORDER BY RANDOM() LIMIT 1'
  );

  if (!poem) {
    return null;
  }

  await db.run(
    'INSERT INTO daily_poems (date, poem_id) VALUES ($1, $2) ON CONFLICT (date) DO NOTHING',
    [todayStr, poem.id]
  );

  const dailyPoem = {
    date: todayStr,
    poem_id: poem.id,
    title: poem.title,
    author: poem.author,
    content: poem.content,
    dynasty: poem.dynasty
  };

  let isCollected = false;
  if (userId) {
    const row = await db.get(
      'SELECT * FROM collections WHERE user_id = $1 AND poem_id = $2',
      [userId, poem.id]
    );
    isCollected = !!row;
  }

  return { ...dailyPoem, isCollected };
}

async function saveDailyPoem(poemId, dateStr) {
  await db.run(
    'INSERT INTO daily_poems (date, poem_id) VALUES ($1, $2) ON CONFLICT (date) DO NOTHING',
    [dateStr, poemId]
  );
}

async function getDailyPoemHistory(days = 7) {
  const dateFilter = db.isPostgres() ? `CURRENT_DATE - $1::int` : `DATE('now', '-' || ? || ' days')`;
  return db.all(
    `SELECT dp.*, p.title, p.author, p.content FROM daily_poems dp JOIN poems p ON dp.poem_id = p.id WHERE dp.date >= ${dateFilter} ORDER BY dp.date DESC`,
    [days]
  );
}

async function getRecommendPoems(userId) {
  const learned = await db.all(
    'SELECT poem_id FROM learning_records WHERE user_id = $1',
    [userId]
  );
  const learnedIds = learned.map(r => r.poem_id);

  let rows;
  if (learnedIds.length > 0) {
    const placeholders = learnedIds.map((_, i) => `$${i + 2}`).join(',');
    rows = await db.all(
      `SELECT * FROM poems WHERE id NOT IN (${placeholders}) ORDER BY RANDOM() LIMIT 5`,
      [userId, ...learnedIds]
    );
  } else {
    rows = await db.all(
      'SELECT * FROM poems ORDER BY RANDOM() LIMIT 5'
    );
  }

  return rows;
}

async function getPoemDetail(poemId, userId) {
  const poem = await db.get('SELECT * FROM poems WHERE id = $1', [poemId]);

  if (!poem) {
    return null;
  }

  let isCollected = false;
  if (userId) {
    const row = await db.get(
      'SELECT * FROM collections WHERE user_id = $1 AND poem_id = $2',
      [userId, poemId]
    );
    isCollected = !!row;
  }

  const stats = await db.get(
    'SELECT view_count, recite_attempts, best_score FROM learning_records WHERE user_id = $1 AND poem_id = $2',
    [userId, poemId]
  );

  return {
    ...poem,
    isCollected,
    learningStats: stats || { view_count: 0, recite_attempts: 0, best_score: 0 }
  };
}

async function searchPoems(keyword) {
  return db.all(
    "SELECT * FROM poems WHERE title LIKE $1 OR author LIKE $1 OR content LIKE $1 LIMIT 20",
    [`%${keyword}%`]
  );
}

async function getPoemsByAuthor(author) {
  return db.all(
    'SELECT * FROM poems WHERE author = $1',
    [author]
  );
}

module.exports = {
  getDailyPoem,
  saveDailyPoem,
  getDailyPoemHistory,
  getRecommendPoems,
  getPoemDetail,
  searchPoems,
  getPoemsByAuthor
};
