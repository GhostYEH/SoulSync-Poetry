const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// ============================================================================
// 数据库配置
// DB_TYPE: auto | postgres | sqlite
//   auto      - 优先 PostgreSQL，连接失败则进程级降级到 SQLite
//   postgres  - 仅 PostgreSQL，连接失败直接报错
//   sqlite    - 仅 SQLite，不尝试 PostgreSQL
// DB_PATH: SQLite 文件路径（相对路径基于 backend/ 解析）
// DATABASE_URL: PostgreSQL 连接串
// ============================================================================

const DB_TYPE = (process.env.DB_TYPE || 'auto').toLowerCase();
let SQLITE_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'db', 'poetry.db');
if (!path.isAbsolute(SQLITE_PATH)) {
  SQLITE_PATH = path.resolve(__dirname, '..', '..', SQLITE_PATH);
}

// ============================================================================
// PostgreSQL 连接池
// ============================================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  if (!isConnectionError(err)) {
    console.error('PostgreSQL 连接池发生未捕获的错误:', err);
  }
});

// ============================================================================
// 数据库模式探测（进程级，不来回切换）
// ============================================================================
let dialect = null;   // null=未探测, 'postgres', 'sqlite'

function getDialect() {
  if (dialect) return dialect;
  if (DB_TYPE === 'sqlite') {
    dialect = 'sqlite';
    console.log(`[db.js] DB_TYPE=sqlite，使用 SQLite: ${SQLITE_PATH}`);
    return dialect;
  }
  if (DB_TYPE === 'postgres') {
    dialect = 'postgres';
    return dialect;
  }
  // auto: 异步探测由 ensureDialect 完成
  return dialect;
}

function isPostgres() { return getDialect() === 'postgres'; }
function isSqlite() { return getDialect() === 'sqlite'; }

// ============================================================================
// SQLite 连接（惰性单例）
// ============================================================================
let sqliteDb = null;

function getSqliteDb() {
  if (!sqliteDb) {
    const { DatabaseSync } = require('node:sqlite');
    sqliteDb = new DatabaseSync(SQLITE_PATH);
    console.log(`[db.js] 已连接 SQLite: ${SQLITE_PATH}`);
  }
  return sqliteDb;
}

// ============================================================================
// SQL 兼容层
// ============================================================================

function convertPlaceholders(text) {
  return text.replace(/\$(\d+)/g, '?');
}

function isWriteSql(sql) {
  return /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|SET|REPLACE|BEGIN|COMMIT|ROLLBACK|TRUNCATE)\b/i.test(sql);
}

function hasReturning(sql) {
  return /\bRETURNING\b/i.test(sql);
}

function isConnectionError(err) {
  if (!err) return false;
  const code = err.code || '';
  if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH', 'ECONNRESET', 'EPIPE', 'EAI_AGAIN'].includes(code)) {
    return true;
  }
  if (err.name === 'AggregateError' && Array.isArray(err.errors)) {
    return err.errors.some(e => isConnectionError(e));
  }
  return false;
}

function sqliteQuery(text, params = []) {
  const sqlite = getSqliteDb();
  const sql = convertPlaceholders(text);
  const stmt = sqlite.prepare(sql);
  if (hasReturning(sql) || !isWriteSql(sql)) {
    const rows = stmt.all(...params);
    return { rows, rowCount: rows.length, command: '' };
  }
  const result = stmt.run(...params);
  return { rows: [], rowCount: result.changes, command: '', lastInsertRowid: result.lastInsertRowid };
}

// ============================================================================
// 进程级方言探测（auto 模式下首次查询时确定）
// ============================================================================
async function ensureDialect() {
  if (dialect) return dialect;
  if (DB_TYPE === 'sqlite') {
    dialect = 'sqlite';
    return dialect;
  }
  if (DB_TYPE === 'postgres') {
    dialect = 'postgres';
    return dialect;
  }
  // auto: 探测 PG
  try {
    await pool.query('SELECT 1');
    dialect = 'postgres';
    return dialect;
  } catch (err) {
    if (isConnectionError(err)) {
      console.warn(`[db.js] PostgreSQL 不可用 (${err.code || err.message})，进程级降级到 SQLite`);
      dialect = 'sqlite';
      return dialect;
    }
    throw err;
  }
}

// ============================================================================
// 核心 query 函数
// ============================================================================
async function query(text, params = []) {
  const d = await ensureDialect();
  if (d === 'sqlite') {
    return sqliteQuery(text, params);
  }
  return pool.query(text, params);
}

async function all(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

async function get(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

async function run(text, params = []) {
  return query(text, params);
}

async function close() {
  try { await pool.end(); } catch (e) { /* ignore */ }
  if (sqliteDb) {
    try { sqliteDb.close(); } catch (e) { /* ignore */ }
    sqliteDb = null;
  }
  dialect = null;
}

// ============================================================================
// 事务支持 — db.transaction(async (tx) => { ... })
// tx 对象拥有 query/all/get/run 方法，所有操作在同一事务内执行。
// 回调正常返回 → COMMIT；抛异常 → ROLLBACK 并重新抛出。
// ============================================================================
async function transaction(callback) {
  const d = await ensureDialect();

  if (d === 'sqlite') {
    const sqlite = getSqliteDb();
    sqlite.exec('BEGIN');
    try {
      const tx = {
        query: (text, params = []) => Promise.resolve(sqliteQuery(text, params)),
        all: async (text, params = []) => (await tx.query(text, params)).rows,
        get: async (text, params = []) => (await tx.query(text, params)).rows[0] || null,
        run: (text, params = []) => tx.query(text, params),
      };
      const result = await callback(tx);
      sqlite.exec('COMMIT');
      return result;
    } catch (err) {
      try { sqlite.exec('ROLLBACK'); } catch (_) { /* ignore */ }
      throw err;
    }
  }

  // PostgreSQL
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = {
      query: (text, params = []) => client.query(text, params),
      all: async (text, params = []) => (await client.query(text, params)).rows,
      get: async (text, params = []) => (await client.query(text, params)).rows[0] || null,
      run: (text, params = []) => client.query(text, params),
    };
    const result = await callback(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// Dialect helpers — 供业务层生成数据库无关 SQL
// ============================================================================

const dialectHelpers = {
  getDialect,
  isPostgres,
  isSqlite,

  dateOnly(col) {
    return isPostgres() ? `(${col})::date` : `DATE(${col})`;
  },

  extractHour(col) {
    return isPostgres() ? `EXTRACT(HOUR FROM ${col})::INTEGER` : `CAST(strftime('%H', ${col}) AS INTEGER)`;
  },

  extractEpoch(col) {
    return isPostgres() ? `EXTRACT(EPOCH FROM ${col}::timestamp)::INTEGER` : `CAST(strftime('%s', ${col}) AS INTEGER)`;
  },

  dateDaysAgo(n) {
    return isPostgres() ? `CURRENT_DATE - INTERVAL '${n} days'` : `DATE('now', '-${n} days')`;
  },

  timestampDaysAgo(n) {
    return isPostgres() ? `CURRENT_TIMESTAMP - INTERVAL '${n} days'` : `datetime('now', '-${n} days')`;
  },

  greatest(a, b) {
    return isPostgres() ? `GREATEST(${a}, ${b})` : `MAX(${a}, ${b})`;
  },

  ilike(column, param) {
    return isPostgres() ? `${column} ILIKE ${param}` : `${column} LIKE ${param}`;
  },

  toTimestampDate(unixExpr) {
    return isPostgres() ? `TO_TIMESTAMP(${unixExpr})::date` : `DATE(${unixExpr}, 'unixepoch')`;
  },

  positionIn(needle, column) {
    return isPostgres() ? `POSITION('${needle}' IN ${column})` : `INSTR(${column}, '${needle}')`;
  },

  castText(col) {
    return isPostgres() ? `(${col})::text` : `CAST(${col} AS TEXT)`;
  },

  castInt(col) {
    return isPostgres() ? `(${col})::INTEGER` : `CAST(${col} AS INTEGER)`;
  },

  anyIntArray(param) {
    return isPostgres() ? `ANY(${param}::int[])` : null;
  },

  inList(values) {
    return values.map(() => '?').join(', ');
  },

  serialPrimaryKey() {
    return isPostgres() ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  },

  nowText() {
    return isPostgres() ? `now()::text` : `datetime('now')`;
  },
};

module.exports = {
  pool,
  query,
  all,
  get,
  run,
  close,
  transaction,
  ensureDialect,
  isPostgres,
  isSqlite,
  getDialect,
  ...dialectHelpers,
};
