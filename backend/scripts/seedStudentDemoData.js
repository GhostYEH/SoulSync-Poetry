/**
 * SQLite 学生端演示数据种子。
 *
 * 只写入合成学生账号和学习行为，脚本可重复执行，不会清空已有数据。
 * 统一体验账号：Studentdemo / 123456
 */
const path = require('path');
const bcrypt = require('bcrypt');
const { DatabaseSync } = require('node:sqlite');

const dbPath = process.env.DB_PATH
  ? path.resolve(__dirname, '..', process.env.DB_PATH)
  : path.resolve(__dirname, '..', 'db', 'poetry.db');

const db = new DatabaseSync(dbPath);
const passwordHash = bcrypt.hashSync('123456', 10);
const now = new Date();

const syntheticNames = [
  '沈知夏', '顾清和', '林晚舟', '许南枝', '周砚青', '苏念安', '叶听澜', '程星河',
  '江映月', '陆景行', '唐书瑶', '宋清越', '谢临川', '温以宁', '陈知远', '裴语嫣',
  '叶青禾', '季云深', '许清欢', '顾言蹊', '沈星眠', '林书砚', '周予安', '苏晚晴',
  '陆知微', '程初阳', '江南音', '唐予墨', '宋知意', '谢听风', '温书宁', '陈星野',
  '裴若曦', '叶知秋', '季明川', '许云舒', '顾长安', '沈若棠', '林嘉木', '周清妍',
  '苏景明', '陆语桐', '程安歌', '江远山', '唐诗语', '宋云帆', '谢安然', '温景初',
  '陈月白', '裴昭昭', '叶南星', '季清辞', '许言笑', '顾星辰', '沈听雨', '林知遥',
  '周静姝', '苏行简', '陆思远', '程锦书', '江晚吟', '唐望舒', '宋初晴', '谢怀瑾'
];

const genres = ['五言绝句', '七言绝句', '五言律诗', '七言律诗', '词'];
const themes = ['山水', '田园', '送别', '思乡', '咏物', '四时', '抒情', '成长'];
const activityTypes = ['view', 'recite', 'challenge', 'feihua', 'ai_explain', 'checkin', 'creation'];
const keywords = ['月', '花', '春', '风', '山', '水', '云', '雨', '雪', '柳'];

function int(min, max, seed = Math.random()) {
  return Math.floor(seed * (max - min + 1)) + min;
}

function dateAgo(days, hour = 19) {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(hour, (days * 17) % 60, (days * 11) % 60, 0);
  return date.toISOString();
}

function dateOnlyAgo(days) {
  return dateAgo(days).slice(0, 10);
}

function ensureClass(id, name) {
  db.prepare('INSERT OR IGNORE INTO classes (id, class_name) VALUES (?, ?)').run(id, name);
  const existing = db.prepare('SELECT id FROM class_stats WHERE class_id = ?').get(id);
  if (!existing) db.prepare('INSERT INTO class_stats (class_id) VALUES (?)').run(id);
}

function ensureUser(username, email, classId, daysAgo) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ?, class_id = ?, updated_at = ? WHERE id = ?')
      .run(passwordHash, classId, now.toISOString(), existing.id);
    return existing.id;
  }
  const result = db.prepare(
    `INSERT INTO users (username, email, password_hash, class_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(username, email, passwordHash, classId, dateAgo(daysAgo, 9), now.toISOString());
  return Number(result.lastInsertRowid);
}

function addLearningRecords(userId, poemIds, userIndex) {
  const target = Math.min(poemIds.length, 12 + (userIndex % 9));
  const upsert = db.prepare(
    `UPDATE learning_records
     SET view_count = ?, ai_explain_count = ?, recite_attempts = ?, best_score = ?,
         total_score = ?, study_time = ?, last_view_time = ?
     WHERE user_id = ? AND poem_id = ?`
  );
  const insert = db.prepare(
    `INSERT INTO learning_records
     (user_id, poem_id, view_count, ai_explain_count, recite_attempts, best_score, total_score, study_time, last_view_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (let i = 0; i < target; i++) {
    const poemId = poemIds[(i + userIndex * 3) % poemIds.length];
    const viewCount = 3 + ((userIndex + i) % 12);
    const explainCount = (userIndex + i) % 4;
    const reciteAttempts = 2 + ((userIndex * 2 + i) % 8);
    const bestScore = 68 + ((userIndex * 7 + i * 3) % 31);
    const values = [viewCount, explainCount, reciteAttempts, bestScore, bestScore * reciteAttempts,
      180 + ((userIndex * 47 + i * 31) % 720), dateAgo((userIndex + i) % 28), userId, poemId];
    const result = upsert.run(...values);
    if (!result.changes) insert.run(userId, poemId, viewCount, explainCount, reciteAttempts, bestScore,
      bestScore * reciteAttempts, values[5], values[6]);
  }
}

function addLearningEvents(userId, poemIds, userIndex) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO learning_events
     (user_id, event_type, poem_id, knowledge_points, score, correct, difficulty, duration,
      attempt_count, hint_count, metadata, event_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (let i = 0; i < 10; i++) {
    const correct = (userIndex + i) % 5 === 0 ? 0 : 1;
    insert.run(userId, ['view_poem', 'recite', 'answer_question', 'daily_checkin'][i % 4],
      poemIds[(i + userIndex) % poemIds.length], JSON.stringify(['诗句记忆', '意象理解']),
      correct ? 72 + ((userIndex + i) % 28) : 48 + ((userIndex + i) % 20), correct,
      1 + ((userIndex + i) % 5), 45 + ((userIndex * 13 + i * 7) % 240),
      1 + ((userIndex + i) % 3), correct ? 0 : 1, JSON.stringify({ seed: 'student-demo', source: 'synthetic' }),
      `student-demo:${userId}:${i}`, dateAgo((userIndex + i) % 30));
  }
}

function addActivityLogs(userId, userIndex) {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM activity_logs WHERE user_id = ?').get(userId).n;
  const target = 28 + (userIndex % 18);
  const insert = db.prepare(
    'INSERT INTO activity_logs (user_id, activity_type, activity_data, duration_seconds, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  for (let i = existing; i < target; i++) {
    insert.run(userId, activityTypes[(i + userIndex) % activityTypes.length],
      JSON.stringify({ source: 'student-demo', sequence: i + 1 }),
      45 + ((userIndex * 19 + i * 23) % 520), dateAgo((userIndex + i) % 30));
  }
}

function addChallengeRecords(userId, userIndex) {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM user_challenge_records WHERE user_id = ?').get(userId).n;
  const target = 24 + (userIndex % 22);
  const insert = db.prepare(
    `INSERT INTO user_challenge_records
     (user_id, level, question_content, user_answer, correct_answer, is_correct, used_ai_help,
      added_to_error_book, answered_at, poem_title, poem_author)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (let i = existing; i < target; i++) {
    const correct = (i + userIndex) % 4 !== 0;
    const answer = correct ? '更上一层楼' : '再上一层楼';
    insert.run(userId, 1 + ((userIndex * 3 + i) % 150), '欲穷千里目，______。', answer,
      '更上一层楼', correct ? 1 : 0, (i + userIndex) % 7 === 0 ? 1 : 0, correct ? 0 : 1,
      dateAgo((userIndex + i) % 30), '登鹳雀楼', '王之涣');
  }
}

function addCollectionsAndCheckins(userId, poemIds, userIndex) {
  const collectionInsert = db.prepare(
    'INSERT OR IGNORE INTO collections (user_id, poem_id, created_at) VALUES (?, ?, ?)'
  );
  for (let i = 0; i < 5 + (userIndex % 5); i++) {
    collectionInsert.run(userId, poemIds[(i * 2 + userIndex) % poemIds.length], dateAgo((i + userIndex) % 30));
  }

  const checkinInsert = db.prepare(
    'INSERT OR IGNORE INTO daily_checkin (user_id, date, poem_id, checked_in_at) VALUES (?, ?, ?, ?)'
  );
  for (let i = 0; i < 7 + (userIndex % 14); i++) {
    checkinInsert.run(userId, dateOnlyAgo(i + (userIndex % 3)), poemIds[(i + userIndex) % poemIds.length], dateAgo(i));
  }
}

function addCreations(userId, userIndex) {
  const existing = db.prepare("SELECT COUNT(*) AS n FROM user_creations WHERE user_id = ? AND title LIKE '春日习作%'").get(userId).n;
  const target = 3 + (userIndex % 5);
  const insert = db.prepare(
    `INSERT INTO user_creations
     (user_id, title, content, genre, theme, creation_mode, ai_reference, score_data,
      modification_suggestions, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const lines = [
    '晓风入小院，花影上帘钩。',
    '一卷清词伴晚钟，半窗灯火照春风。',
    '云开山色远，雨过石泉清。',
    '少年当有凌云志，且向书山拾锦章。',
    '月落星河静，诗成夜未央。'
  ];
  for (let i = existing; i < target; i++) {
    const score = 72 + ((userIndex * 5 + i * 7) % 24);
    const createdAt = dateAgo((userIndex * 2 + i * 3) % 35);
    insert.run(userId, `春日习作${i + 1}`, lines[(userIndex + i) % lines.length],
      genres[(userIndex + i) % genres.length], themes[(userIndex + i) % themes.length],
      i % 2 ? 'ai_assisted' : 'guided', JSON.stringify({ source: 'student-demo' }),
      JSON.stringify({ total: score, rhythm: score - 2, imagery: score + 1, emotion: score }),
      JSON.stringify(['可再加强对仗节奏', '意象选择很有画面感']), createdAt, createdAt);
  }
  const stats = db.prepare('SELECT COUNT(*) AS total, AVG(json_extract(score_data, \'$.total\')) AS avg, MAX(json_extract(score_data, \'$.total\')) AS highest FROM user_creations WHERE user_id = ?').get(userId);
  db.prepare(
    `INSERT INTO creation_stats (user_id, total_creations, qualified_works, average_score, highest_score, last_creation_time)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET total_creations=excluded.total_creations,
       qualified_works=excluded.qualified_works, average_score=excluded.average_score,
       highest_score=excluded.highest_score, last_creation_time=excluded.last_creation_time`
  ).run(userId, stats.total, Math.floor(stats.total * 0.7), Math.round(stats.avg || 0), stats.highest || 0,
    db.prepare('SELECT MAX(created_at) AS latest FROM user_creations WHERE user_id = ?').get(userId).latest);
}

function addKnowledgeStates(userId, knowledgePointIds, userIndex) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO student_knowledge_states
     (user_id, knowledge_point_id, mastery, confidence, attempt_count, correct_count,
      independent_correct_count, recent_performance, error_count, recent_error_types,
      last_practiced_at, last_mastery_update_at, algorithm_version, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (let i = 0; i < Math.min(8, knowledgePointIds.length); i++) {
    const mastery = Math.round((0.62 + ((userIndex + i) % 30) / 100) * 100) / 100;
    insert.run(userId, knowledgePointIds[(userIndex + i) % knowledgePointIds.length], mastery,
      Math.min(0.96, mastery + 0.05), 8 + ((userIndex + i) % 18), 5 + ((userIndex + i) % 15),
      4 + ((userIndex + i) % 12), JSON.stringify([0.55, mastery - 0.04, mastery]),
      (userIndex + i) % 5 === 0 ? 2 : 0, JSON.stringify((userIndex + i) % 5 === 0 ? ['记忆提取'] : []),
      dateAgo((userIndex + i) % 20), dateAgo((userIndex + i) % 20), 'student-demo-v1', dateAgo(35));
  }
}

function addReviewSchedules(userId, poemIds, userIndex) {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM review_schedules WHERE user_id = ?').get(userId).n;
  if (existing >= 5) return;
  const insert = db.prepare(
    `INSERT INTO review_schedules
     (user_id, poem_id, scheduled_date, review_count, next_review, interval_days, mastered)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (let i = existing; i < 5; i++) {
    insert.run(userId, poemIds[(i + userIndex) % poemIds.length], dateOnlyAgo(i - 2),
      1 + ((userIndex + i) % 4), dateOnlyAgo(i - 2), 2 + i * 2, i === 4 ? 1 : 0);
  }
}

function addWrongQuestions(userId, userIndex) {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM wrong_questions WHERE user_id = ?').get(userId).n;
  const target = 3 + (userIndex % 4);
  if (existing >= target) return;
  const insert = db.prepare(
    `INSERT INTO wrong_questions
     (user_id, question, answer, user_answer, level, wrong_count, last_wrong_time, correct_streak,
      mastered, full_poem, author, title, added_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (let i = existing; i < target; i++) {
    insert.run(String(userId), '孤帆远影碧空尽，唯见______天际流。', '长江', '大江',
      5 + i, 1 + ((userIndex + i) % 3), dateAgo((userIndex + i) % 18), 0, 0,
      '故人西辞黄鹤楼，烟花三月下扬州。\n孤帆远影碧空尽，唯见长江天际流。', '李白',
      '黄鹤楼送孟浩然之广陵', dateAgo((userIndex + i) % 18));
  }
}

function run() {
  db.exec('BEGIN');
  try {
    for (let i = 1; i <= 8; i++) ensureClass(i, `${i <= 3 ? '初中' : '高中'}诗词${i}班`);

    const poemIds = db.prepare('SELECT id FROM poems ORDER BY id').all().map(row => row.id);
    if (!poemIds.length) throw new Error('poems 表为空，请先运行诗词种子脚本');
    const knowledgePointIds = db.prepare('SELECT id FROM knowledge_points ORDER BY id').all().map(row => row.id);
    const users = [{ id: ensureUser('Studentdemo', 'demo.student@example.com', 1, 45), index: 0 }];

    syntheticNames.forEach((name, index) => {
      users.push({
        id: ensureUser(`demo_${name}_${String(index + 1).padStart(2, '0')}`,
          `demo.student.${String(index + 1).padStart(3, '0')}@example.com`, 1 + (index % 8), 10 + (index % 42)),
        index: index + 1
      });
    });

    for (const user of users) {
      addLearningRecords(user.id, poemIds, user.index);
      addLearningEvents(user.id, poemIds, user.index);
      addActivityLogs(user.id, user.index);
      addChallengeRecords(user.id, user.index);
      addCollectionsAndCheckins(user.id, poemIds, user.index);
      addCreations(user.id, user.index);
      addWrongQuestions(user.id, user.index);
      addReviewSchedules(user.id, poemIds, user.index);
      if (knowledgePointIds.length) addKnowledgeStates(user.id, knowledgePointIds, user.index);

      const highestLevel = 20 + ((user.index * 13) % 120);
      db.prepare(
        `INSERT INTO user_challenge_progress
         (user_id, highest_level, current_challenge_level, last_challenge_time, total_ai_help_used, total_errors)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET highest_level=excluded.highest_level,
           current_challenge_level=excluded.current_challenge_level,
           last_challenge_time=excluded.last_challenge_time,
           total_ai_help_used=excluded.total_ai_help_used, total_errors=excluded.total_errors`
      ).run(user.id, highestLevel, Math.min(highestLevel + 1, 150), dateAgo(user.index % 7),
        user.index % 9, 2 + (user.index % 16));
    }

    for (let classId = 1; classId <= 8; classId++) {
      const totalStudents = db.prepare('SELECT COUNT(*) AS n FROM users WHERE class_id = ?').get(classId).n;
      const totalPoems = db.prepare('SELECT COUNT(*) AS n FROM learning_records lr JOIN users u ON u.id = lr.user_id WHERE u.class_id = ?').get(classId).n;
      const avgTime = db.prepare('SELECT COALESCE(AVG(lr.study_time), 0) AS n FROM learning_records lr JOIN users u ON u.id = lr.user_id WHERE u.class_id = ?').get(classId).n;
      db.prepare('UPDATE class_stats SET total_students = ?, total_poems_studied = ?, avg_study_time = ?, avg_completion_rate = ? WHERE class_id = ?')
        .run(totalStudents, totalPoems, Math.round(avgTime), Math.min(0.98, 0.68 + totalStudents / 100), classId);
    }

    db.exec('COMMIT');
    const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
    const learning = db.prepare('SELECT COUNT(*) AS n FROM learning_records').get().n;
    const creations = db.prepare('SELECT COUNT(*) AS n FROM user_creations').get().n;
    console.log(`学生演示数据完成：${count} 个用户，${learning} 条学习记录，${creations} 条创作记录`);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

run();
