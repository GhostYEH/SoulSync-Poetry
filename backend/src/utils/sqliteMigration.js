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
    addColumnIfMissing(db, 'question_knowledge_mappings', 'confidence', 'REAL DEFAULT 0.8');

    // 3. challenge_questions — 可复用练习题目录
    // question_id 是跨题目来源的稳定 ID；其余 challenge_* 字段保留给旧挑战服务兼容使用。
    createTableIfNotExists(db, 'challenge_questions', `
      CREATE TABLE challenge_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id TEXT UNIQUE,
        challenge_id INTEGER,
        question_index INTEGER,
        poem_id INTEGER,
        question_type TEXT,
        question_text TEXT,
        correct_answer TEXT,
        options TEXT,
        user_answer TEXT,
        is_correct INTEGER,
        answered_at TEXT,
        source TEXT DEFAULT 'learning_event',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    addColumnIfMissing(db, 'challenge_questions', 'question_id', 'TEXT');
    addColumnIfMissing(db, 'challenge_questions', 'challenge_id', 'INTEGER');
    addColumnIfMissing(db, 'challenge_questions', 'question_index', 'INTEGER');
    addColumnIfMissing(db, 'challenge_questions', 'poem_id', 'INTEGER');
    addColumnIfMissing(db, 'challenge_questions', 'question_type', 'TEXT');
    addColumnIfMissing(db, 'challenge_questions', 'question_text', 'TEXT');
    addColumnIfMissing(db, 'challenge_questions', 'correct_answer', 'TEXT');
    addColumnIfMissing(db, 'challenge_questions', 'options', 'TEXT');
    addColumnIfMissing(db, 'challenge_questions', 'user_answer', 'TEXT');
    addColumnIfMissing(db, 'challenge_questions', 'is_correct', 'INTEGER');
    addColumnIfMissing(db, 'challenge_questions', 'answered_at', 'TEXT');
    addColumnIfMissing(db, 'challenge_questions', 'source', "TEXT DEFAULT 'learning_event'");
    addColumnIfMissing(db, 'challenge_questions', 'created_at', 'TEXT');
    addColumnIfMissing(db, 'challenge_questions', 'updated_at', 'TEXT');
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_challenge_questions_question_id
      ON challenge_questions(question_id)
    `);

    // 4. learning_events — 学习事件
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

    // 5. student_knowledge_states — 学生知识状态
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

    // 6. wrong_questions 补字段
    if (tableExists(db, 'wrong_questions')) {
      addColumnIfMissing(db, 'wrong_questions', 'added_at', 'TEXT');
      addColumnIfMissing(db, 'wrong_questions', 'last_reviewed_at', 'TEXT');
      addColumnIfMissing(db, 'wrong_questions', 'question_id', 'INTEGER');
      addColumnIfMissing(db, 'wrong_questions', 'source', "TEXT DEFAULT 'challenge'");
      addColumnIfMissing(db, 'wrong_questions', 'review_count', 'INTEGER DEFAULT 0');
      addColumnIfMissing(db, 'wrong_questions', 'interval_days', 'INTEGER DEFAULT 1');
      // SQLite does not allow a non-constant default in ALTER TABLE.
      addColumnIfMissing(db, 'wrong_questions', 'next_review', 'TEXT');
      db.exec("UPDATE wrong_questions SET next_review = DATE('now') WHERE next_review IS NULL");
    }

    // 6.1 user_error_book — 统一错题复习状态与间隔字段
    if (tableExists(db, 'user_error_book')) {
      addColumnIfMissing(db, 'user_error_book', 'wrong_count', 'INTEGER DEFAULT 1');
      addColumnIfMissing(db, 'user_error_book', 'review_streak', 'INTEGER DEFAULT 0');
      addColumnIfMissing(db, 'user_error_book', 'review_count', 'INTEGER DEFAULT 0');
      addColumnIfMissing(db, 'user_error_book', 'interval_days', 'INTEGER DEFAULT 1');
      addColumnIfMissing(db, 'user_error_book', 'next_review', 'TEXT');
      addColumnIfMissing(db, 'user_error_book', 'last_reviewed_at', 'TEXT');
      db.exec("UPDATE user_error_book SET next_review = DATE('now') WHERE next_review IS NULL");
    }

    // 7. student_tags 表
    createTableIfNotExists(db, 'student_tags', `
      CREATE TABLE student_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        tag TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(student_id, tag)
      )
    `);

    // 8. 复习会话 — 复习服务的会话接口依赖这两张表。
    createTableIfNotExists(db, 'review_sessions', `
      CREATE TABLE review_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        started_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        total_poems INTEGER DEFAULT 0
      )
    `);
    createTableIfNotExists(db, 'review_session_items', `
      CREATE TABLE review_session_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        poem_id INTEGER NOT NULL,
        score INTEGER,
        reviewed_at TEXT
      )
    `);

    // 9. 补充高频查询索引（仅在表存在时创建，兼容空数据库）
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
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_question_knowledge_mappings_kp ON question_knowledge_mappings(knowledge_point_id)", 'question_knowledge_mappings');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_challenge_questions_poem ON challenge_questions(poem_id)", 'challenge_questions');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_users_class ON users(class_id)", 'users');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_learning_events_user_created ON learning_events(user_id, created_at)", 'learning_events');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_review_sessions_user_started ON review_sessions(user_id, started_at)", 'review_sessions');
    createIndexIfTableExists("CREATE INDEX IF NOT EXISTS idx_review_session_items_session ON review_session_items(session_id)", 'review_session_items');

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
