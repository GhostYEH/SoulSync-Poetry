const db = require('./db');

async function loadPoems() {
  const result = await db.query('SELECT * FROM poems');
  const poems = result.rows.map(row => ({
    id: row.id,
    title: row.title,
    author: row.author,
    dynasty: row.dynasty,
    content: row.content,
    tags: row.tags ? row.tags.split(',') : []
  }));
  console.log(`成功从 PostgreSQL 加载 ${poems.length} 首诗词`);
  return poems;
}

async function loadPoemsSync() {
  return await loadPoems();
}

module.exports = {
  loadPoems,
  loadPoemsSync
};
