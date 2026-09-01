require('dotenv').config({ quiet: true });
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(__dirname, '..', process.env.DB_PATH)
  : path.join(__dirname, '..', 'db', 'poetry.db');

const DEFAULT_POEMS = [
  { title: '静夜思', author: '李白', dynasty: '唐', content: '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。' },
  { title: '春晓', author: '孟浩然', dynasty: '唐', content: '春眠不觉晓，处处闻啼鸟。\n夜来风雨声，花落知多少。' },
  { title: '望庐山瀑布', author: '李白', dynasty: '唐', content: '日照香炉生紫烟，遥看瀑布挂前川。\n飞流直下三千尺，疑是银河落九天。' },
  { title: '黄鹤楼送孟浩然之广陵', author: '李白', dynasty: '唐', content: '故人西辞黄鹤楼，烟花三月下扬州。\n孤帆远影碧空尽，唯见长江天际流。' },
  { title: '江雪', author: '柳宗元', dynasty: '唐', content: '千山鸟飞绝，万径人踪灭。\n孤舟蓑笠翁，独钓寒江雪。' },
  { title: '望岳', author: '杜甫', dynasty: '唐', content: '岱宗夫如何？齐鲁青未了。\n造化钟神秀，阴阳割昏晓。\n荡胸生曾云，决眦入归鸟。\n会当凌绝顶，一览众山小。' },
  { title: '春望', author: '杜甫', dynasty: '唐', content: '国破山河在，城春草木深。\n感时花溅泪，恨别鸟惊心。\n烽火连三月，家书抵万金。\n白头搔更短，浑欲不胜簪。' },
  { title: '赋得古原草送别', author: '白居易', dynasty: '唐', content: '离离原上草，一岁一枯荣。\n野火烧不尽，春风吹又生。\n远芳侵古道，晴翠接荒城。\n又送王孙去，萋萋满别情。' },
  { title: '钱塘湖春行', author: '白居易', dynasty: '唐', content: '孤山寺北贾亭西，水面初平云脚低。\n几处早莺争暖树，谁家新燕啄春泥。\n乱花渐欲迷人眼，浅草才能没马蹄。\n最爱湖东行不足，绿杨阴里白沙堤。' },
  { title: '凉州词', author: '王之涣', dynasty: '唐', content: '黄河远上白云间，一片孤城万仞山。\n羌笛何须怨杨柳，春风不度玉门关。' },
  { title: '登鹳雀楼', author: '王之涣', dynasty: '唐', content: '白日依山尽，黄河入海流。\n欲穷千里目，更上一层楼。' },
  { title: '清明', author: '杜牧', dynasty: '唐', content: '清明时节雨纷纷，路上行人欲断魂。\n借问酒家何处有？牧童遥指杏花村。' },
  { title: '山行', author: '杜牧', dynasty: '唐', content: '远上寒山石径斜，白云生处有人家。\n停车坐爱枫林晚，霜叶红于二月花。' },
  { title: '泊秦淮', author: '杜牧', dynasty: '唐', content: '烟笼寒水月笼沙，夜泊秦淮近酒家。\n商女不知亡国恨，隔江犹唱后庭花。' },
  { title: '夜雨寄北', author: '李商隐', dynasty: '唐', content: '君问归期未有期，巴山夜雨涨秋池。\n何当共剪西窗烛，却话巴山夜雨时。' },
  { title: '锦瑟', author: '李商隐', dynasty: '唐', content: '锦瑟无端五十弦，一弦一柱思华年。\n庄生晓梦迷蝴蝶，望帝春心托杜鹃。\n沧海月明珠有泪，蓝田日暖玉生烟。\n此情可待成追忆？只是当时已惘然。' },
  { title: '送元二使安西', author: '王维', dynasty: '唐', content: '渭城朝雨浥轻尘，客舍青青柳色新。\n劝君更尽一杯酒，西出阳关无故人。' },
  { title: '九月九日忆山东兄弟', author: '王维', dynasty: '唐', content: '独在异乡为异客，每逢佳节倍思亲。\n遥知兄弟登高处，遍插茱萸少一人。' },
  { title: '山居秋暝', author: '王维', dynasty: '唐', content: '空山新雨后，天气晚来秋。\n明月松间照，清泉石上流。\n竹喧归浣女，莲动下渔舟。\n随意春芳歇，王孙自可留。' },
  { title: '鹿柴', author: '王维', dynasty: '唐', content: '空山不见人，但闻人语响。\n返景入深林，复照青苔上。' },
  { title: '相思', author: '王维', dynasty: '唐', content: '红豆生南国，春来发几枝。\n愿君多采撷，此物最相思。' },
  { title: '望天门山', author: '李白', dynasty: '唐', content: '天门中断楚江开，碧水东流至此回。\n两岸青山相对出，孤帆一片日边来。' },
  { title: '早发白帝城', author: '李白', dynasty: '唐', content: '朝辞白帝彩云间，千里江陵一日还。\n两岸猿声啼不住，轻舟已过万重山。' },
  { title: '独坐敬亭山', author: '李白', dynasty: '唐', content: '众鸟高飞尽，孤云独去闲。\n相看两不厌，只有敬亭山。' },
  { title: '秋浦歌', author: '李白', dynasty: '唐', content: '白发三千丈，缘愁似个长。\n不知明镜里，何处得秋霜。' },
  { title: '水调歌头', author: '苏轼', dynasty: '宋', content: '明月几时有？把酒问青天。\n不知天上宫阙，今夕是何年。\n我欲乘风归去，又恐琼楼玉宇，高处不胜寒。\n起舞弄清影，何似在人间。\n转朱阁，低绮户，照无眠。\n不应有恨，何事长向别时圆？\n人有悲欢离合，月有阴晴圆缺，此事古难全。\n但愿人长久，千里共婵娟。' },
  { title: '念奴娇·赤壁怀古', author: '苏轼', dynasty: '宋', content: '大江东去，浪淘尽，千古风流人物。\n故垒西边，人道是，三国周郎赤壁。\n乱石穿空，惊涛拍岸，卷起千堆雪。\n江山如画，一时多少豪杰。\n遥想公瑾当年，小乔初嫁了，雄姿英发。\n羽扇纶巾，谈笑间，樯橹灰飞烟灭。\n故国神游，多情应笑我，早生华发。\n人生如梦，一尊还酹江月。' },
  { title: '江城子·密州出猎', author: '苏轼', dynasty: '宋', content: '老夫聊发少年狂，左牵黄，右擎苍，锦帽貂裘，千骑卷平冈。\n为报倾城随太守，亲射虎，看孙郎。\n酒酣胸胆尚开张，鬓微霜，又何妨！\n持节云中，何日遣冯唐？\n会挽雕弓如满月，西北望，射天狼。' },
  { title: '声声慢', author: '李清照', dynasty: '宋', content: '寻寻觅觅，冷冷清清，凄凄惨惨戚戚。\n乍暖还寒时候，最难将息。\n三杯两盏淡酒，怎敌他、晚来风急！\n雁过也，正伤心，却是旧时相识。\n满地黄花堆积，憔悴损，如今有谁堪摘？\n守着窗儿，独自怎生得黑！\n梧桐更兼细雨，到黄昏、点点滴滴。\n这次第，怎一个愁字了得！' },
  { title: '如梦令', author: '李清照', dynasty: '宋', content: '常记溪亭日暮，沉醉不知归路。\n兴尽晚回舟，误入藕花深处。\n争渡，争渡，惊起一滩鸥鹭。' }
];

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_name TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS class_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER UNIQUE,
  total_students INTEGER DEFAULT 0,
  total_poems_studied INTEGER DEFAULT 0,
  avg_study_time INTEGER DEFAULT 0,
  avg_completion_rate REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  class_id INTEGER DEFAULT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS poems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  dynasty TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS learning_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  poem_id INTEGER NOT NULL,
  view_count INTEGER DEFAULT 0,
  ai_explain_count INTEGER DEFAULT 0,
  recite_attempts INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  study_time INTEGER DEFAULT 0,
  last_view_time TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (poem_id) REFERENCES poems(id)
);

CREATE TABLE IF NOT EXISTS mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  poem_id INTEGER NOT NULL,
  mistake_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (poem_id) REFERENCES poems(id)
);

CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  poem_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (poem_id) REFERENCES poems(id),
  UNIQUE(user_id, poem_id)
);

CREATE TABLE IF NOT EXISTS creations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS fight_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player1 TEXT NOT NULL,
  player2 TEXT NOT NULL,
  winner TEXT NOT NULL,
  date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wrong_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  question_id INTEGER,
  question TEXT,
  answer TEXT,
  user_answer TEXT,
  level INTEGER,
  wrong_count INTEGER DEFAULT 1,
  last_wrong_time TEXT DEFAULT (datetime('now')),
  correct_streak INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  interval_days INTEGER DEFAULT 1,
  next_review TEXT DEFAULT (date('now')),
  mastered INTEGER DEFAULT 0,
  full_poem TEXT,
  author TEXT,
  title TEXT,
  added_at TEXT
);

CREATE TABLE IF NOT EXISTS user_creations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
);

CREATE TABLE IF NOT EXISTS creation_stats (
  user_id INTEGER PRIMARY KEY,
  total_creations INTEGER DEFAULT 0,
  qualified_works INTEGER DEFAULT 0,
  average_score REAL DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  last_creation_time TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_challenge_progress (
  user_id INTEGER PRIMARY KEY,
  highest_level INTEGER DEFAULT 0,
  current_challenge_level INTEGER DEFAULT 1,
  last_challenge_time TEXT,
  total_ai_help_used INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_challenge_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
);

CREATE TABLE IF NOT EXISTS user_error_book (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  record_id INTEGER NOT NULL,
  question_content TEXT NOT NULL,
  user_answer TEXT,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  added_at TEXT NOT NULL,
  is_reviewed INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 1,
  review_streak INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  interval_days INTEGER DEFAULT 1,
  next_review TEXT DEFAULT (date('now')),
  last_reviewed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (record_id) REFERENCES user_challenge_records(id)
);

CREATE TABLE IF NOT EXISTS feihua_battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
);

CREATE TABLE IF NOT EXISTS feihua_high_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  keyword TEXT NOT NULL,
  max_rounds INTEGER DEFAULT 0,
  total_battles INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, keyword)
);

CREATE TABLE IF NOT EXISTS ability_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  memory_score INTEGER DEFAULT 0,
  understanding_score INTEGER DEFAULT 0,
  application_score INTEGER DEFAULT 0,
  creativity_score INTEGER DEFAULT 0,
  last_updated TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS learning_paths (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  level TEXT DEFAULT '初级',
  recommendations TEXT,
  current_focus TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS daily_checkin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  poem_id INTEGER,
  checked_in_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS daily_poems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poem_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  theme TEXT,
  FOREIGN KEY (poem_id) REFERENCES poems(id),
  UNIQUE(date)
);

CREATE TABLE IF NOT EXISTS review_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  poem_id INTEGER NOT NULL,
  scheduled_date TEXT NOT NULL,
  review_count INTEGER DEFAULT 0,
  next_review TEXT,
  interval_days INTEGER DEFAULT 1,
  mastered INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (poem_id) REFERENCES poems(id)
);

CREATE TABLE IF NOT EXISTS feihua_rankings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
);

CREATE TABLE IF NOT EXISTS challenge_battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
);

CREATE TABLE IF NOT EXISTS challenge_duel_seen_titles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  poem_title TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  UNIQUE(user_id, poem_title),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS poetry_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  theme TEXT NOT NULL,
  keyword TEXT,
  generated_poem TEXT,
  user_score INTEGER DEFAULT 0,
  ai_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'generated',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS wrong_question_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  category TEXT DEFAULT '记忆错误',
  note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES wrong_questions(id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  activity_type TEXT NOT NULL,
  activity_data TEXT,
  duration_seconds INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS card_game_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 1,
  score INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  missed_count INTEGER NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 0,
  difficulty_level INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS card_game_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  ai_reason TEXT,
  ai_explanation TEXT,
  ai_memory_tip TEXT,
  added_to_review INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (record_id) REFERENCES card_game_records(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS card_game_review (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 1,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  user_answer TEXT,
  is_correct INTEGER NOT NULL DEFAULT 0,
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS knowledge_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  parent_id INTEGER,
  difficulty INTEGER DEFAULT 3,
  prerequisites TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES knowledge_points(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS question_knowledge_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT NOT NULL,
  knowledge_point_id INTEGER NOT NULL,
  weight REAL DEFAULT 1.0,
  source TEXT DEFAULT 'rule',
  confidence REAL DEFAULT 0.8,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id) ON DELETE CASCADE,
  UNIQUE(question_id, knowledge_point_id)
);

CREATE TABLE IF NOT EXISTS challenge_questions (
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
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (poem_id) REFERENCES poems(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS learning_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  poem_id INTEGER,
  question_id TEXT,
  game_id TEXT,
  knowledge_points TEXT DEFAULT '[]',
  score REAL DEFAULT 0,
  correct INTEGER,
  difficulty INTEGER DEFAULT 3,
  duration INTEGER DEFAULT 0,
  attempt_count INTEGER DEFAULT 1,
  hint_count INTEGER DEFAULT 0,
  metadata TEXT DEFAULT '{}',
  event_key TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_knowledge_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  knowledge_point_id INTEGER NOT NULL,
  mastery REAL DEFAULT 0,
  confidence REAL DEFAULT 0,
  attempt_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  independent_correct_count INTEGER DEFAULT 0,
  recent_performance TEXT DEFAULT '[]',
  error_count INTEGER DEFAULT 0,
  recent_error_types TEXT,
  last_practiced_at TEXT,
  last_mastery_update_at TEXT,
  algorithm_version TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, knowledge_point_id)
);

CREATE TABLE IF NOT EXISTS student_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(student_id, tag)
);

`;

function init() {
  console.log(`[initSqlite] 初始化 SQLite 数据库: ${DB_PATH}`);
  const db = new DatabaseSync(DB_PATH);

  try {
    db.exec('BEGIN');
    console.log('[initSqlite] 创建表结构...');
    db.exec(SCHEMA_SQL);

    const poemCount = db.prepare('SELECT COUNT(*) AS n FROM poems').get();
    if (poemCount.n === 0) {
      console.log('[initSqlite] 导入默认诗词数据...');
      const stmt = db.prepare('INSERT INTO poems (title, author, dynasty, content) VALUES (?, ?, ?, ?)');
      for (const poem of DEFAULT_POEMS) {
        stmt.run(poem.title, poem.author, poem.dynasty, poem.content);
      }
      console.log(`[initSqlite] 已导入 ${DEFAULT_POEMS.length} 首诗词`);
    } else {
      console.log(`[initSqlite] poems 表已有 ${poemCount.n} 条数据，跳过`);
    }

    db.exec('COMMIT');
    console.log('[initSqlite] 初始化完成');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('[initSqlite] 初始化失败:', err.message);
    throw err;
  } finally {
    db.close();
  }
}

if (require.main === module) {
  init();
}

module.exports = { init, DEFAULT_POEMS, SCHEMA_SQL };
