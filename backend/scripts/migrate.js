require('dotenv').config();
const db = require('../src/utils/db');

const tables = [
  {
    name: 'classes',
    sql: `CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      class_name TEXT UNIQUE NOT NULL,
      teacher_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'class_stats',
    sql: `CREATE TABLE IF NOT EXISTS class_stats (
      id SERIAL PRIMARY KEY,
      class_id INTEGER UNIQUE,
      total_students INTEGER DEFAULT 0,
      total_poems_studied INTEGER DEFAULT 0,
      avg_study_time INTEGER DEFAULT 0,
      avg_completion_rate FLOAT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'users',
    sql: `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      class_id INTEGER DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
    )`
  },
  {
    name: 'teachers',
    sql: `CREATE TABLE IF NOT EXISTS teachers (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'poems',
    sql: `CREATE TABLE IF NOT EXISTS poems (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      dynasty TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'learning_records',
    sql: `CREATE TABLE IF NOT EXISTS learning_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      poem_id INTEGER NOT NULL,
      view_count INTEGER DEFAULT 0,
      ai_explain_count INTEGER DEFAULT 0,
      recite_attempts INTEGER DEFAULT 0,
      best_score INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      study_time INTEGER DEFAULT 0,
      last_view_time TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (poem_id) REFERENCES poems(id)
    )`
  },
  {
    name: 'feihua_games',
    sql: `CREATE TABLE IF NOT EXISTS feihua_games (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      keyword TEXT,
      score INTEGER,
      poem_count INTEGER,
      history TEXT,
      created_at TEXT
    )`
  },
  {
    name: 'mistakes',
    sql: `CREATE TABLE IF NOT EXISTS mistakes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      poem_id INTEGER NOT NULL,
      mistake_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (poem_id) REFERENCES poems(id)
    )`
  },
  {
    name: 'collections',
    sql: `CREATE TABLE IF NOT EXISTS collections (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      poem_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (poem_id) REFERENCES poems(id),
      UNIQUE(user_id, poem_id)
    )`
  },
  {
    name: 'creations',
    sql: `CREATE TABLE IF NOT EXISTS creations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  },
  {
    name: 'fight_history',
    sql: `CREATE TABLE IF NOT EXISTS fight_history (
      id SERIAL PRIMARY KEY,
      player1 TEXT NOT NULL,
      player2 TEXT NOT NULL,
      winner TEXT NOT NULL,
      date TEXT NOT NULL
    )`
  },
  {
    name: 'wrong_questions',
    sql: `CREATE TABLE IF NOT EXISTS wrong_questions (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      question_id INTEGER,
      question TEXT,
      answer TEXT,
      user_answer TEXT,
      level INTEGER,
      wrong_count INTEGER DEFAULT 1,
      last_wrong_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      correct_streak INTEGER DEFAULT 0,
      mastered INTEGER DEFAULT 0,
      full_poem TEXT,
      author TEXT,
      title TEXT
    )`
  },
  {
    name: 'user_creations',
    sql: `CREATE TABLE IF NOT EXISTS user_creations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      genre TEXT NOT NULL,
      theme TEXT NOT NULL,
      creation_mode TEXT NOT NULL,
      ai_reference TEXT,
      score_data TEXT,
      modification_suggestions TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  },
  {
    name: 'creation_stats',
    sql: `CREATE TABLE IF NOT EXISTS creation_stats (
      user_id INTEGER PRIMARY KEY,
      total_creations INTEGER DEFAULT 0,
      qualified_works INTEGER DEFAULT 0,
      average_score REAL DEFAULT 0,
      highest_score INTEGER DEFAULT 0,
      last_creation_time TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  },
  {
    name: 'user_challenge_progress',
    sql: `CREATE TABLE IF NOT EXISTS user_challenge_progress (
      user_id INTEGER PRIMARY KEY,
      highest_level INTEGER DEFAULT 0,
      current_challenge_level INTEGER DEFAULT 1,
      last_challenge_time TEXT,
      total_ai_help_used INTEGER DEFAULT 0,
      total_errors INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  },
  {
    name: 'user_challenge_records',
    sql: `CREATE TABLE IF NOT EXISTS user_challenge_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      level INTEGER NOT NULL,
      question_content TEXT NOT NULL,
      user_answer TEXT,
      correct_answer TEXT NOT NULL,
      is_correct INTEGER DEFAULT 0,
      used_ai_help INTEGER DEFAULT 0,
      added_to_error_book INTEGER DEFAULT 0,
      answered_at TEXT NOT NULL,
      poem_title TEXT,
      poem_author TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  },
  {
    name: 'user_error_book',
    sql: `CREATE TABLE IF NOT EXISTS user_error_book (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      record_id INTEGER NOT NULL,
      question_content TEXT NOT NULL,
      user_answer TEXT,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      added_at TEXT NOT NULL,
      is_reviewed INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (record_id) REFERENCES user_challenge_records(id)
    )`
  },
  {
    name: 'feihua_battles',
    sql: `CREATE TABLE IF NOT EXISTS feihua_battles (
      id SERIAL PRIMARY KEY,
      player1_id INTEGER NOT NULL,
      player2_id INTEGER NOT NULL,
      keyword TEXT NOT NULL,
      winner_id INTEGER,
      loser_id INTEGER,
      total_rounds INTEGER DEFAULT 0,
      player1_throw_count INTEGER DEFAULT 0,
      player2_throw_count INTEGER DEFAULT 0,
      battle_history TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      FOREIGN KEY (player1_id) REFERENCES users(id),
      FOREIGN KEY (player2_id) REFERENCES users(id),
      FOREIGN KEY (winner_id) REFERENCES users(id),
      FOREIGN KEY (loser_id) REFERENCES users(id)
    )`
  },
  {
    name: 'feihua_high_records',
    sql: `CREATE TABLE IF NOT EXISTS feihua_high_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      keyword TEXT NOT NULL,
      max_rounds INTEGER DEFAULT 0,
      total_battles INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, keyword)
    )`
  },
  {
    name: 'ability_assessments',
    sql: `CREATE TABLE IF NOT EXISTS ability_assessments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL,
      memory_score INTEGER DEFAULT 0,
      understanding_score INTEGER DEFAULT 0,
      application_score INTEGER DEFAULT 0,
      creativity_score INTEGER DEFAULT 0,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  },
  {
    name: 'learning_paths',
    sql: `CREATE TABLE IF NOT EXISTS learning_paths (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      level TEXT DEFAULT '初级',
      recommendations TEXT,
      current_focus TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id)
    )`
  },
  {
    name: 'daily_checkin',
    sql: `CREATE TABLE IF NOT EXISTS daily_checkin (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      poem_id INTEGER,
      checked_in_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date)
    )`
  },
  {
    name: 'daily_poems',
    sql: `CREATE TABLE IF NOT EXISTS daily_poems (
      id SERIAL PRIMARY KEY,
      poem_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      theme TEXT,
      FOREIGN KEY (poem_id) REFERENCES poems(id),
      UNIQUE(date)
    )`
  },
  {
    name: 'review_schedules',
    sql: `CREATE TABLE IF NOT EXISTS review_schedules (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      poem_id INTEGER NOT NULL,
      scheduled_date TEXT NOT NULL,
      review_count INTEGER DEFAULT 0,
      next_review TEXT,
      interval_days INTEGER DEFAULT 1,
      mastered INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (poem_id) REFERENCES poems(id)
    )`
  },
  {
    name: 'teacher_tasks',
    sql: `CREATE TABLE IF NOT EXISTS teacher_tasks (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER NOT NULL,
      class_id INTEGER,
      target_user_id INTEGER,
      title TEXT NOT NULL,
      content TEXT,
      task_type TEXT,
      level_start INTEGER,
      level_end INTEGER,
      deadline TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id),
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (target_user_id) REFERENCES users(id)
    )`
  },
  {
    name: 'feihua_rankings',
    sql: `CREATE TABLE IF NOT EXISTS feihua_rankings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL,
      rank_level TEXT DEFAULT '青铜',
      rating INTEGER DEFAULT 1000,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      total_battles INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      last_battle_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  },
  {
    name: 'challenge_battles',
    sql: `CREATE TABLE IF NOT EXISTS challenge_battles (
      id SERIAL PRIMARY KEY,
      player1_id INTEGER NOT NULL,
      player2_id INTEGER NOT NULL,
      winner_id INTEGER,
      loser_id INTEGER,
      total_questions INTEGER DEFAULT 0,
      player1_correct INTEGER DEFAULT 0,
      player2_correct INTEGER DEFAULT 0,
      total_rounds INTEGER DEFAULT 0,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      FOREIGN KEY (player1_id) REFERENCES users(id),
      FOREIGN KEY (player2_id) REFERENCES users(id),
      FOREIGN KEY (winner_id) REFERENCES users(id),
      FOREIGN KEY (loser_id) REFERENCES users(id)
    )`
  },
  {
    name: 'challenge_duel_seen_titles',
    sql: `CREATE TABLE IF NOT EXISTS challenge_duel_seen_titles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      poem_title TEXT NOT NULL,
      first_seen_at TEXT NOT NULL,
      UNIQUE(user_id, poem_title),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  },
  {
    name: 'poetry_challenges',
    sql: `CREATE TABLE IF NOT EXISTS poetry_challenges (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      theme TEXT NOT NULL,
      keyword TEXT,
      generated_poem TEXT,
      user_score INTEGER DEFAULT 0,
      ai_score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'generated',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  },
  {
    name: 'wrong_question_categories',
    sql: `CREATE TABLE IF NOT EXISTS wrong_question_categories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      category TEXT DEFAULT '记忆错误',
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES wrong_questions(id)
    )`
  },
  {
    name: 'activity_logs',
    sql: `CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      activity_data TEXT,
      duration_seconds INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  },
  {
    name: 'card_game_records',
    sql: `CREATE TABLE IF NOT EXISTS card_game_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER DEFAULT 1,
      score INTEGER NOT NULL DEFAULT 0,
      wrong_count INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      missed_count INTEGER NOT NULL DEFAULT 0,
      duration INTEGER NOT NULL DEFAULT 0,
      difficulty_level INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (now()::text),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`
  },
  {
    name: 'card_game_errors',
    sql: `CREATE TABLE IF NOT EXISTS card_game_errors (
      id SERIAL PRIMARY KEY,
      record_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      user_answer TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      ai_reason TEXT,
      ai_explanation TEXT,
      ai_memory_tip TEXT,
      added_to_review INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (now()::text),
      FOREIGN KEY (record_id) REFERENCES card_game_records(id) ON DELETE CASCADE
    )`
  },
  {
    name: 'card_game_review',
    sql: `CREATE TABLE IF NOT EXISTS card_game_review (
      id SERIAL PRIMARY KEY,
      user_id INTEGER DEFAULT 1,
      question_text TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      user_answer TEXT,
      is_correct INTEGER NOT NULL DEFAULT 0,
      reviewed_at TEXT NOT NULL DEFAULT (now()::text),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`
  },
  // ===== 学习智能核心表 =====
  {
    name: 'knowledge_points',
    sql: `CREATE TABLE IF NOT EXISTS knowledge_points (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      parent_id INTEGER,
      difficulty INTEGER DEFAULT 3,
      prerequisites TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES knowledge_points(id) ON DELETE SET NULL
    )`
  },
  {
    name: 'question_knowledge_mappings',
    sql: `CREATE TABLE IF NOT EXISTS question_knowledge_mappings (
      id SERIAL PRIMARY KEY,
      question_id TEXT NOT NULL,
      knowledge_point_id INTEGER NOT NULL,
      weight FLOAT DEFAULT 1.0,
      source TEXT DEFAULT 'inferred',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id) ON DELETE CASCADE,
      UNIQUE(question_id, knowledge_point_id)
    )`
  },
  {
    name: 'learning_events',
    sql: `CREATE TABLE IF NOT EXISTS learning_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      poem_id INTEGER,
      question_id TEXT,
      game_id TEXT,
      knowledge_points JSONB DEFAULT '[]',
      score FLOAT DEFAULT 0,
      correct INTEGER,
      difficulty INTEGER DEFAULT 3,
      duration INTEGER DEFAULT 0,
      attempt_count INTEGER DEFAULT 1,
      hint_count INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  },
  {
    name: 'student_knowledge_states',
    sql: `CREATE TABLE IF NOT EXISTS student_knowledge_states (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      knowledge_point_id INTEGER NOT NULL,
      mastery FLOAT DEFAULT 0,
      confidence FLOAT DEFAULT 0,
      attempt_count INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      independent_correct_count INTEGER DEFAULT 0,
      recent_performance JSONB DEFAULT '[]',
      error_count INTEGER DEFAULT 0,
      recent_error_types JSONB DEFAULT '[]',
      last_practiced_at TIMESTAMP,
      last_mastery_update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id) ON DELETE CASCADE,
      UNIQUE(user_id, knowledge_point_id)
    )`
  }
];

const view = {
  name: 'v_student_learning_stats',
  sql: `CREATE OR REPLACE VIEW v_student_learning_stats AS
    SELECT
      u.id AS user_id,
      u.username,
      u.class_id,
      COUNT(DISTINCT lr.poem_id) AS poem_count,
      SUM(lr.study_time) AS total_study_time,
      MAX(lr.last_view_time) AS last_study_time
    FROM users u
    LEFT JOIN learning_records lr ON u.id = lr.user_id
    GROUP BY u.id, u.username`
};

const indexes = [
  { name: 'idx_fight_player1', sql: 'CREATE INDEX IF NOT EXISTS idx_fight_player1 ON fight_history(player1)' },
  { name: 'idx_fight_player2', sql: 'CREATE INDEX IF NOT EXISTS idx_fight_player2 ON fight_history(player2)' },
  { name: 'idx_fight_date', sql: 'CREATE INDEX IF NOT EXISTS idx_fight_date ON fight_history(date)' },
  { name: 'idx_wrong_user', sql: 'CREATE INDEX IF NOT EXISTS idx_wrong_user ON wrong_questions(user_id)' },
  { name: 'idx_wrong_mastered', sql: 'CREATE INDEX IF NOT EXISTS idx_wrong_mastered ON wrong_questions(mastered)' },
  { name: 'idx_feihua_battles_player1', sql: 'CREATE INDEX IF NOT EXISTS idx_feihua_battles_player1 ON feihua_battles(player1_id)' },
  { name: 'idx_feihua_battles_player2', sql: 'CREATE INDEX IF NOT EXISTS idx_feihua_battles_player2 ON feihua_battles(player2_id)' },
  { name: 'idx_feihua_high_records_user', sql: 'CREATE INDEX IF NOT EXISTS idx_feihua_high_records_user ON feihua_high_records(user_id)' },
  { name: 'idx_challenge_battles_p1', sql: 'CREATE INDEX IF NOT EXISTS idx_challenge_battles_p1 ON challenge_battles(player1_id)' },
  { name: 'idx_challenge_battles_p2', sql: 'CREATE INDEX IF NOT EXISTS idx_challenge_battles_p2 ON challenge_battles(player2_id)' },
  { name: 'idx_duel_seen_user', sql: 'CREATE INDEX IF NOT EXISTS idx_duel_seen_user ON challenge_duel_seen_titles(user_id)' },
  { name: 'idx_activity_user', sql: 'CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id)' },
  { name: 'idx_activity_type', sql: 'CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_logs(activity_type)' },
  { name: 'idx_activity_created', sql: 'CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at)' },
  // 学习智能核心索引
  { name: 'idx_kp_code', sql: 'CREATE INDEX IF NOT EXISTS idx_kp_code ON knowledge_points(code)' },
  { name: 'idx_kp_parent', sql: 'CREATE INDEX IF NOT EXISTS idx_kp_parent ON knowledge_points(parent_id)' },
  { name: 'idx_qkm_question', sql: 'CREATE INDEX IF NOT EXISTS idx_qkm_question ON question_knowledge_mappings(question_id)' },
  { name: 'idx_qkm_kp', sql: 'CREATE INDEX IF NOT EXISTS idx_qkm_kp ON question_knowledge_mappings(knowledge_point_id)' },
  { name: 'idx_le_user', sql: 'CREATE INDEX IF NOT EXISTS idx_le_user ON learning_events(user_id)' },
  { name: 'idx_le_type', sql: 'CREATE INDEX IF NOT EXISTS idx_le_type ON learning_events(event_type)' },
  { name: 'idx_le_created', sql: 'CREATE INDEX IF NOT EXISTS idx_le_created ON learning_events(created_at)' },
  { name: 'idx_le_poem', sql: 'CREATE INDEX IF NOT EXISTS idx_le_poem ON learning_events(poem_id)' },
  { name: 'idx_le_question', sql: 'CREATE INDEX IF NOT EXISTS idx_le_question ON learning_events(question_id)' },
  { name: 'idx_sks_user', sql: 'CREATE INDEX IF NOT EXISTS idx_sks_user ON student_knowledge_states(user_id)' },
  { name: 'idx_sks_kp', sql: 'CREATE INDEX IF NOT EXISTS idx_sks_kp ON student_knowledge_states(knowledge_point_id)' },
  { name: 'idx_sks_user_kp', sql: 'CREATE INDEX IF NOT EXISTS idx_sks_user_kp ON student_knowledge_states(user_id, knowledge_point_id)' }
];

// 已有表新增字段（幂等）
const alterColumns = [
  { name: 'sks_algorithm_version', sql: `ALTER TABLE student_knowledge_states ADD COLUMN IF NOT EXISTS algorithm_version TEXT DEFAULT 'v1'` },
  { name: 'le_event_key', sql: `ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS event_key TEXT` },
  { name: 'le_event_key_unique', sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_le_event_key_unique ON learning_events(event_key) WHERE event_key IS NOT NULL` },
  { name: 'qkm_confidence', sql: `ALTER TABLE question_knowledge_mappings ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 0.8` },
  { name: 'qkm_source_default', sql: `ALTER TABLE question_knowledge_mappings ALTER COLUMN source SET DEFAULT 'rule'` },
];

async function migrate() {
  console.log('🚀 开始 PostgreSQL 数据库迁移...\n');

  try {
    // 创建表
    for (const table of tables) {
      process.stdout.write(`  创建表 ${table.name} ... `);
      await db.run(table.sql);
      console.log('✅');
    }

    // 新增字段（幂等）
    for (const ac of alterColumns) {
      process.stdout.write(`  迁移字段 ${ac.name} ... `);
      await db.run(ac.sql);
      console.log('✅');
    }

    // 创建视图
    process.stdout.write(`  创建视图 ${view.name} ... `);
    await db.run(view.sql);
    console.log('✅');

    // 创建索引
    for (const idx of indexes) {
      process.stdout.write(`  创建索引 ${idx.name} ... `);
      await db.run(idx.sql);
      console.log('✅');
    }

    console.log(`\n🎉 迁移完成！共创建 ${tables.length} 张表、1 个视图、${indexes.length} 个索引。`);
    await db.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ 迁移失败:', err.message);
    console.error(err);
    await db.close().catch(() => {});
    process.exit(1);
  }
}

migrate();
