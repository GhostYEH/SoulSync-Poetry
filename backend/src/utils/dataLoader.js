const path = require('path');
const db = require('./db');

const SQLITE_PATH = path.join(__dirname, '..', '..', 'db', 'poetry.db');

async function loadPoems() {
  try {
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
  } catch (err) {
    console.warn(`PostgreSQL 不可用 (${err.code || err.message})，尝试从本地 SQLite 加载诗词...`);
    return loadPoemsFromSqlite();
  }
}

function loadPoemsFromSqlite() {
  const { DatabaseSync } = require('node:sqlite');
  const sqliteDb = new DatabaseSync(SQLITE_PATH, { readOnly: true });
  try {
    const rows = sqliteDb.prepare('SELECT id, title, author, dynasty, content, tags FROM poems').all();
    const poems = rows.map(row => ({
      id: row.id,
      title: row.title,
      author: row.author,
      dynasty: row.dynasty,
      content: row.content,
      tags: row.tags ? row.tags.split(',') : []
    }));
    console.log(`成功从本地 SQLite 加载 ${poems.length} 首诗词 (${SQLITE_PATH})`);
    return poems;
  } finally {
    sqliteDb.close();
  }
}

async function loadPoemsSync() {
  return await loadPoems();
}

// 使用默认诗词数据（备用）
function useDefaultPoems() {
  const defaultPoems = [
    {
      id: 1,
      title: "静夜思",
      author: "李白",
      dynasty: "唐",
      content: "床前明月光，疑是地上霜。举头望明月，低头思故乡。",
      tags: ["思乡", "月亮"]
    },
    {
      id: 2,
      title: "春晓",
      author: "孟浩然",
      dynasty: "唐",
      content: "春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。",
      tags: ["春天", "自然"]
    },
    {
      id: 3,
      title: "望庐山瀑布",
      author: "李白",
      dynasty: "唐",
      content: "日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。",
      tags: ["山水", "壮观"]
    },
    {
      id: 4,
      title: "黄鹤楼送孟浩然之广陵",
      author: "李白",
      dynasty: "唐",
      content: "故人西辞黄鹤楼，烟花三月下扬州。孤帆远影碧空尽，唯见长江天际流。",
      tags: ["送别", "友情"]
    },
    {
      id: 5,
      title: "江雪",
      author: "柳宗元",
      dynasty: "唐",
      content: "千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。",
      tags: ["山水", "孤独"]
    }
  ];
  console.log('使用默认诗词数据');
  return defaultPoems;
}

module.exports = {
  loadPoems,
  loadPoemsSync,
  useDefaultPoems,
  loadPoemsFromSqlite
};
