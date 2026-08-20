/**
 * SQLite Schema Migration — 幂等补全学习智能核心表与缺失字段
 *
 * 仅在 SQLite 模式下运行。安全可重复执行：
 *   - CREATE TABLE IF NOT EXISTS
 *   - ADD COLUMN 前先检查列是否存在
 *
 * 不删除、不覆盖任何现有数据。
 */

const path = require('path');

function getSqliteDb(dbPath) {
  const { DatabaseSync } = require('node:sqlite');
  return new DatabaseSync(dbPath);
}

function columnExists(db, table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === column);
}

function tableExists(db, table) {
  const row = db.prepare("SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name=?").get(table);
  return row.n > 0;
}

function addColumnIfMissing(db, table, column, definition) {
  if (!columnExists(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  [+] ${table}.${column} 已添加`);
  }
}

function createTableIfNotExists(db, table, sql) {
  if (!tableExists(db, table)) {
    db.exec(sql);
    console.log(`  [+] 表 ${table} 已创建`);
  } else {
    console.log(`  [=] 表 ${table} 已存在`);
  }
}

function migrate(dbPath) {
  const db = getSqliteDb(dbPath);
  console.log(`[sqlite-migration] 开始迁移: ${dbPath}`);

  try {
    db.exec('BEGIN');

    // 1. knowledge_points — 知识树
    createTableIfNotExists(db, 'knowledge_points', `
      CREATE TABLE knowledge_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        parent_id INTEGER,
        difficulty INTEGER DEFAULT 3,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // 2. question_knowledge_mappings — 题目-知识点映射
    createTableIfNotExists(db, 'question_knowledge_mappings', `
      CREATE TABLE question_knowledge_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id TEXT NOT NULL,
        knowledge_point_id INTEGER NOT NULL,
        weight REAL DEFAULT 1.0,
        source TEXT DEFAULT 'rule',
        confidence REAL DEFAULT 0.8,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(question_id, knowledge_point_id)
      )
    `);

    // 3. learning_events — 学习事件
    createTableIfNotExists(db, 'learning_events', `
      CREATE TABLE learning_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        poem_id INTEGER,
        question_id TEXT,
        game_id TEXT,
        knowledge_points TEXT,
        score REAL DEFAULT 0,
        correct INTEGER,
        difficulty INTEGER DEFAULT 3,
        duration INTEGER DEFAULT 0,
        attempt_count INTEGER DEFAULT 1,
        hint_count INTEGER DEFAULT 0,
        metadata TEXT,
        event_key TEXT UNIQUE,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.exec("CREATE INDEX IF NOT EXISTS idx_learning_events_user ON learning_events(user_id)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_learning_events_type ON learning_events(event_type)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_learning_events_created ON learning_events(created_at)");

    // 4. student_knowledge_states — 学生知识状态
    createTableIfNotExists(db, 'student_knowledge_states', `
      CREATE TABLE student_knowledge_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        knowledge_point_id INTEGER NOT NULL,
        mastery REAL DEFAULT 0.5,
        confidence REAL DEFAULT 0,
        attempt_count INTEGER DEFAULT 0,
        correct_count INTEGER DEFAULT 0,
        independent_correct_count INTEGER DEFAULT 0,
        recent_performance TEXT,
        error_count INTEGER DEFAULT 0,
        recent_error_types TEXT,
        last_practiced_at TEXT,
        last_mastery_update_at TEXT,
        algorithm_version TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, knowledge_point_id)
      )
    `);

    // 5. wrong_questions 补字段
    if (tableExists(db, 'wrong_questions')) {
      addColumnIfMissing(db, 'wrong_questions', 'added_at', 'TEXT');
      addColumnIfMissing(db, 'wrong_questions', 'last_reviewed_at', 'TEXT');
      addColumnIfMissing(db, 'wrong_questions', 'question_id', 'INTEGER');
      addColumnIfMissing(db, 'wrong_questions', 'source', "TEXT DEFAULT 'challenge'");
    }

    // 6. student_tags 表
    createTableIfNotExists(db, 'student_tags', `
      CREATE TABLE student_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        tag TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(student_id, tag)
      )
    `);

    // 7. 补充高频查询索引（仅在表存在时创建，兼容空数据库）
    function createIndexIfTableExists(indexSql, table) {
      if (tableExists(db, table)) {
        try { db.exec(indexSql); } catch (e) { console.warn('  [!] 索引跳过:', e.message); }
      }
    }
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_wrong_questions_user ON wrong_questions(user_id)", 'wrong_questions');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_wrong_questions_user_question ON wrong_questions(user_id, question)", 'wrong_questions');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_card_game_records_user ON card_game_records(user_id)", 'card_game_records');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_card_game_records_created ON card_game_records(created_at)", 'card_game_records');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_learning_records_user ON learning_records(user_id)", 'learning_records');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_learning_records_user_poem ON learning_records(user_id, poem_id)", 'learning_records');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_student_knowledge_states_user ON student_knowledge_states(user_id)", 'student_knowledge_states');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_student_knowledge_states_user_kp ON student_knowledge_states(user_id, knowledge_point_id)", 'student_knowledge_states');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_user_challenge_records_user ON user_challenge_records(user_id)", 'user_challenge_records');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_question_knowledge_mappings_qid ON question_knowledge_mappings(question_id)", 'question_knowledge_mappings');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_users_class ON users(class_id)", 'users');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_learning_events_user_created ON learning_events(user_id, created_at)", 'learning_events');

    db.exec('COMMIT');
    console.log('[sqlite-migration] 迁移完成');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('[sqlite-migration] 迁移失败:', err.message);
    throw err;
  } finally {
    db.close();
  }
}

module.exports = { migrate, tableExists, columnExists };

if (require.main === module) {
  const dbPath = process.env.DB_PATH
    ? path.resolve(__dirname, '..', process.env.DB_PATH)
    : path.join(__dirname, '..', 'db', 'poetry.db');
  migrate(dbPath);
}
