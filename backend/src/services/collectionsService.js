const db = require('../utils/db');

let collections = {};

async function addCollection(userId, poemId) {
  const cacheKey = `${userId}:${poemId}`;

  const row = await db.get('SELECT * FROM collections WHERE user_id = $1 AND poem_id = $2', [userId, poemId]);

  if (row) {
    return row;
  }

  const now = new Date().toISOString();
  const result = await db.run(
    'INSERT INTO collections (user_id, poem_id, created_at) VALUES ($1, $2, $3) RETURNING id',
    [userId, poemId, now]
  );

  const newCollection = {
    id: result.rows[0].id,
    user_id: userId,
    poem_id: poemId,
    created_at: now
  };

  collections[cacheKey] = newCollection;

  return newCollection;
}

async function removeCollection(userId, poemId) {
  const cacheKey = `${userId}:${poemId}`;

  const result = await db.run('DELETE FROM collections WHERE user_id = $1 AND poem_id = $2', [userId, poemId]);

  if (result.rowCount > 0) {
    delete collections[cacheKey];
    return true;
  } else {
    return false;
  }
}

async function getUserCollections(userId) {
  const rows = await db.all(
    `SELECT c.*, p.title as poem_title, p.author as poem_author, p.content as poem_content 
    FROM collections c
    JOIN poems p ON c.poem_id = p.id
    WHERE c.user_id = $1
    ORDER BY c.created_at DESC`,
    [userId]
  );

  rows.forEach(collection => {
    const cacheKey = `${userId}:${collection.poem_id}`;
    collections[cacheKey] = collection;
  });

  return rows;
}

async function checkCollection(userId, poemId) {
  const cacheKey = `${userId}:${poemId}`;

  if (collections[cacheKey]) {
    return true;
  }

  const row = await db.get('SELECT * FROM collections WHERE user_id = $1 AND poem_id = $2', [userId, poemId]);

  const isCollected = !!row;
  if (isCollected) {
    collections[cacheKey] = row;
  }

  return isCollected;
}

module.exports = {
  addCollection,
  removeCollection,
  getUserCollections,
  checkCollection
};
