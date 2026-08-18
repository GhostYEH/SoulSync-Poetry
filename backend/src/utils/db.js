const { Pool } = require('pg');

let pool = null;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '5000', 10),
    statement_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '10000', 10)
  });

  pool.on('error', (err) => {
    console.error('PostgreSQL 连接池发生错误:', err);
  });
} catch (e) {
  console.error('PostgreSQL 初始化失败:', e);
}

// ============================================================================
// SQL 兼容层
// ============================================================================

function getDialect() {
  if (process.env.DB_TYPE === 'sqlite') return 'sqlite';
  return (process.env.DB_TYPE || 'auto').toLowerCase() === 'sqlite' ? 'sqlite' : 'postgres';
}
function isPostgres() { return getDialect() === 'postgres'; }
function isSqlite() { return getDialect() === 'sqlite'; }

let sqliteDb = null;
function getSqliteDb() {
  if (!sqliteDb) {
    const { DatabaseSync } = require('node:sqlite');
    sqliteDb = new DatabaseSync(process.env.DB_PATH || ':memory:');
  }
  return sqliteDb;
}

function convertPlaceholders(text) {
  let result = text.replace(/\$(\d+)/g, '?');
  if (result.includes('RETURNING') && isSqlite()) {
      result = result.replace(/RETURNING\s+\w+/i, '');
  }
  return result;
}

function isWriteSql(sql) {
  return /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|SET|REPLACE|BEGIN|COMMIT|ROLLBACK|TRUNCATE)\b/i.test(sql);
}

function hasReturning(sql) {
  return /\bRETURNING\b/i.test(sql);
}

function sqliteQuery(text, params = []) {
  const sqlite = getSqliteDb();
  
  const reorderedParams = [];
  let sql = text.replace(/\$(\d+)/g, (match, n) => {
    reorderedParams.push(params[parseInt(n, 10) - 1]);
    return '?';
  });
  
  let hasReturningFlag = false;
  if (/RETURNING\s+\w+/i.test(sql)) {
      sql = sql.replace(/RETURNING\s+\w+/i, '');
      hasReturningFlag = true;
  }
  
  if (/ON CONFLICT/i.test(sql) && /DO NOTHING/i.test(sql)) {
      const stmt = sqlite.prepare(sql);
      
      let result;
      try {
        result = stmt.run(...reorderedParams);
      } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
           return { rows: [], rowCount: 0, command: '', lastInsertRowid: null, _fromConflictDoNothing: true };
        }
        throw e;
      }
      
      if (result.changes > 0) {
        if (hasReturningFlag) {
          if (text.includes('learning_events')) {
            const keyParam = params[params.length - 1]; 
            if (keyParam) {
              const checkStmt = sqlite.prepare(`SELECT id FROM learning_events WHERE event_key = ?`);
              const row = checkStmt.get(keyParam);
              if (row) return { rows: [row], rowCount: 1, command: '', lastInsertRowid: row.id, _fromConflictDoNothing: false };
            }
          }
          return { rows: [{ id: result.lastInsertRowid }], rowCount: result.changes, command: '', lastInsertRowid: result.lastInsertRowid, _fromConflictDoNothing: false };
        }
        return { rows: [], rowCount: result.changes, command: '', lastInsertRowid: result.lastInsertRowid, _fromConflictDoNothing: false };
      } else {
        if (hasReturningFlag && text.includes('learning_events')) {
          const keyParam = params[params.length - 1]; 
          if (keyParam) {
            const checkStmt = sqlite.prepare(`SELECT id FROM learning_events WHERE event_key = ?`);
            const row = checkStmt.get(keyParam);
            if (row) return { rows: [row], rowCount: 0, command: '', lastInsertRowid: row.id, _fromConflictDoNothing: true };
          }
        }
        return { rows: [], rowCount: 0, command: '', lastInsertRowid: null, _fromConflictDoNothing: true };
      }
  }
  
  if (/FOR UPDATE/i.test(sql)) {
    const cleanSql = sql.replace(/FOR UPDATE/i, '');
    const stmt = sqlite.prepare(cleanSql);
    const rows = stmt.all(...reorderedParams);
    return { rows, rowCount: rows.length, command: '' };
  }

  const stmt = sqlite.prepare(sql);
  
  if (isWriteSql(sql)) {
     let result;
     try {
       result = stmt.run(...reorderedParams);
     } catch (e) {
       if (e.message.includes('UNIQUE constraint failed')) {
           return { rows: [], rowCount: 0, command: '', lastInsertRowid: null, _fromConflictDoNothing: true };
       }
       throw e;
     }

     if (result.changes > 0) {
        if (hasReturningFlag) {
          if (text.includes('learning_events')) {
            const keyParam = params[params.length - 1]; 
            if (keyParam) {
              const checkStmt = sqlite.prepare(`SELECT id FROM learning_events WHERE event_key = ?`);
              const row = checkStmt.get(keyParam);
              if (row) return { rows: [row], rowCount: 1, command: '', lastInsertRowid: row.id, _fromConflictDoNothing: false };
            }
          }
          return { rows: [{ id: result.lastInsertRowid }], rowCount: result.changes, command: '', lastInsertRowid: result.lastInsertRowid, _fromConflictDoNothing: false };
        }
        
        if (text.includes('learning_events')) {
          const keyParam = params[params.length - 1]; 
          if (keyParam) {
            const checkStmt = sqlite.prepare(`SELECT id FROM learning_events WHERE event_key = ?`);
            const row = checkStmt.get(keyParam);
            if (row) return { rows: [row], rowCount: 1, command: '', lastInsertRowid: row.id, _fromConflictDoNothing: false };
          }
        }
        return { rows: [], rowCount: result.changes, command: '', lastInsertRowid: result.lastInsertRowid, _fromConflictDoNothing: false };
      } else {
        if (text.includes('learning_events')) {
          const keyParam = params[params.length - 1]; 
          if (keyParam) {
            const checkStmt = sqlite.prepare(`SELECT id FROM learning_events WHERE event_key = ?`);
            const row = checkStmt.get(keyParam);
            if (row) return { rows: [row], rowCount: 0, command: '', lastInsertRowid: row.id, _fromConflictDoNothing: true };
          }
        }
        return { rows: [], rowCount: 0, command: '', lastInsertRowid: null, _fromConflictDoNothing: true };
      }
     
     if (text.includes('ON CONFLICT') && text.includes('DO NOTHING')) {
       return { rows: [], rowCount: 0, command: '', lastInsertRowid: null, _fromConflictDoNothing: true };
     }
     return { rows: [], rowCount: 0, command: '', lastInsertRowid: null };
  }

  const rows = stmt.all(...reorderedParams);
  return { rows, rowCount: rows.length, command: '' };
}

// ============================================================================
// 核心 query 函数
// ============================================================================
async function query(text, params = []) {
  if (isSqlite()) return Promise.resolve(sqliteQuery(text, params));
  if (!pool) throw new Error('PostgreSQL pool is not initialized');
  return pool.query(text, params);
}

const dbAll = async (text, params = []) => (await query(text, params)).rows;
const dbGet = async (text, params = []) => (await query(text, params)).rows[0] || null;
const dbRun = async (text, params = []) => query(text, params);

async function all(text, params = []) { return dbAll(text, params); }
async function get(text, params = []) { return dbGet(text, params); }
async function run(text, params = []) { return dbRun(text, params); }

async function close() {
  try { if (pool) await pool.end(); } catch (e) { /* ignore */ }
  if (sqliteDb) {
    try { sqliteDb.close(); } catch (e) { /* ignore */ }
    sqliteDb = null;
  }
}

// ============================================================================
// 事务支持
// ============================================================================
async function transaction(callback) {
  if (isSqlite()) {
    if (!global.sqliteTxQueue) {
       global.sqliteTxQueue = Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        global.sqliteTxQueue = global.sqliteTxQueue.then(async () => {
            const sqlite = getSqliteDb();
            sqlite.exec('BEGIN');
            try {
              const tx = {
                query: (text, params = []) => Promise.resolve(sqliteQuery(text, params)),
                all: async (text, params = []) => (await sqliteQuery(text, params)).rows,
                get: async (text, params = []) => {
                    const result = sqliteQuery(text, params);
                    return result.rows[0] || null;
                },
                run: async (text, params = []) => Promise.resolve(sqliteQuery(text, params)),
              };
              const result = await callback(tx);
              sqlite.exec('COMMIT');
              resolve(result);
            } catch (err) {
              try { sqlite.exec('ROLLBACK'); } catch (_) { /* ignore */ }
              reject(err);
            }
        });
    });
  }

  if (!pool) throw new Error('PostgreSQL pool is not initialized');
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
// Dialect helpers — 只保留 PG 语法
// ============================================================================
const dialectHelpers = {
  getDialect,
  isPostgres,
  isSqlite,

  dateOnly(col) { return `(${col})::date`; },
  extractHour(col) { return `EXTRACT(HOUR FROM ${col})::INTEGER`; },
  extractEpoch(col) { return `EXTRACT(EPOCH FROM ${col}::timestamp)::INTEGER`; },
  dateDaysAgo(n) { return `CURRENT_DATE - INTERVAL '${n} days'`; },
  timestampDaysAgo(n) { return `CURRENT_TIMESTAMP - INTERVAL '${n} days'`; },
  greatest(a, b) { return `GREATEST(${a}, ${b})`; },
  ilike(column, param) { return `${column} ILIKE ${param}`; },
  toTimestampDate(unixExpr) { return `TO_TIMESTAMP(${unixExpr})::date`; },
  positionIn(needle, column) { return `POSITION('${needle}' IN ${column})`; },
  castText(col) { return `(${col})::text`; },
  castInt(col) { return `(${col})::INTEGER`; },
  anyIntArray(param) { return `ANY(${param}::int[])`; },
  inList(values) { return values.map((_, i) => `$${i + 1}`).join(', '); },
  serialPrimaryKey() { return 'SERIAL PRIMARY KEY'; },
  nowText() { return `now()::text`; },
};

module.exports = {
  pool,
  query,
  all,
  get,
  run,
  close,
  transaction,
  isSqlite,
  ...dialectHelpers,
};
