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

async function query(text, params = []) {
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
}

async function transaction(callback) {
  if (!pool) throw new Error('PostgreSQL pool is not initialized');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = {
      query: (text, params = []) => client.query(text, params),
      all: async (text, params = []) => (await client.query(text, params)).rows,
      get: async (text, params = []) => (await client.query(text, params)).rows[0] || null,
      run: (text, params = []) => client.query(text, params),
      client: client
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

const dialectHelpers = {
  getDialect: () => 'postgres',
  isPostgres: () => true,
  isSqlite: () => false,

  dateOnly(col) { return "(" + col + ")::date"; },
  extractHour(col) { return "EXTRACT(HOUR FROM " + col + ")::INTEGER"; },
  extractEpoch(col) { return "EXTRACT(EPOCH FROM " + col + "::timestamp)::INTEGER"; },
  dateDaysAgo(n) { return "CURRENT_DATE - INTERVAL '" + n + " days'"; },
  timestampDaysAgo(n) { return "CURRENT_TIMESTAMP - INTERVAL '" + n + " days'"; },
  greatest(a, b) { return "GREATEST(" + a + ", " + b + ")"; },
  ilike(column, param) { return column + " ILIKE " + param; },
  toTimestampDate(unixExpr) { return "TO_TIMESTAMP(" + unixExpr + ")::date"; },
  positionIn(needle, column) { return "POSITION('" + needle + "' IN " + column + ")"; },
  castText(col) { return "(" + col + ")::text"; },
  castInt(col) { return "(" + col + ")::INTEGER"; },
  anyIntArray(param) { return "ANY(" + param + "::int[])"; },
  inList(values) { return values.map((_, i) => "$" + (i + 1)).join(", "); },
  serialPrimaryKey() { return "SERIAL PRIMARY KEY"; },
  nowText() { return "now()::text"; },
};

module.exports = {
  pool,
  query,
  all,
  get,
  run,
  close,
  transaction,
  ...dialectHelpers,
};
