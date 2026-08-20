const db = require('./db');
const { DEFAULT_POEMS } = require('../../scripts/initSqlite');

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
  console.log(`成功加载数据库中 ${poems.length} 首诗词`);
  return poems;
}

async function loadPoemsSync() {
  return await loadPoems();
}

function useDefaultPoems() {
  const poems = DEFAULT_POEMS.map((p, i) => ({
    id: i + 1,
    title: p.title,
    author: p.author,
    dynasty: p.dynasty,
    content: p.content,
    tags: []
  }));
  console.log(`使用默认诗词数据 ${poems.length} 首`);
  return poems;
}

module.exports = {
  loadPoems,
  loadPoemsSync,
  useDefaultPoems
};
