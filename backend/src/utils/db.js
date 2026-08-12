const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL 连接池发生未捕获的错误:', err);
});

/**
 * 执行参数化 SQL 查询，返回所有匹配行。
 * @param {string} text  - SQL 语句，使用 $1, $2 … 占位符
 * @param {any[]}  [params] - 参数数组
 * @returns {Promise<any[]>} 行数组
 */
async function all(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows;
}

/**
 * 执行参数化 SQL 查询，仅返回第一行。
 * @param {string} text
 * @param {any[]}  [params]
 * @returns {Promise<any|null>}
 */
async function get(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}

/**
 * 执行写操作（INSERT / UPDATE / DELETE / DDL）。
 * @param {string} text
 * @param {any[]}  [params]
 * @returns {Promise<{rowCount: number, rows: any[]}>}
 */
async function run(text, params = []) {
  return pool.query(text, params);
}

/**
 * 关闭连接池（通常在进程退出时调用）。
 */
async function close() {
  await pool.end();
}

module.exports = { pool, query: pool.query.bind(pool), all, get, run, close };
