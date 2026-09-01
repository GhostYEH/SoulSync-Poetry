/**
 * 为 Studentdemo 注入可重复执行的诗词闯关测试夹具。
 * 账号：Studentdemo / 123456
 *
 * 夹具状态：第 1-3 关全部答对，第 4 关可挑战但尚未完成，并保留一条错题。
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { DatabaseSync } = require('node:sqlite');

const dbPath = process.env.DB_PATH
  ? path.resolve(__dirname, '..', process.env.DB_PATH)
  : path.resolve(__dirname, '..', 'db', 'poetry.db');
const levelsPath = path.resolve(__dirname, '..', '..', 'frontend', 'src', 'data', 'poetryLevels.json');
const levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
const db = new DatabaseSync(dbPath);
const now = new Date().toISOString();

function answerText(question) {
  return Number.isInteger(question.answer)
    ? String(question.options?.[question.answer] || '')
    : String(question.answer || '');
}

function ensureTestUser() {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('Studentdemo');
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(bcrypt.hashSync('123456', 10), now, existing.id);
    return Number(existing.id);
  }

  const result = db.prepare(
    `INSERT INTO users (username, email, password_hash, class_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run('Studentdemo', 'demo.student@example.com', bcrypt.hashSync('123456', 10), 1, now, now);
  return Number(result.lastInsertRowid);
}

function insertRecord(userId, level, question, userAnswer, correctAnswer, isCorrect, poem) {
  const result = db.prepare(
    `INSERT INTO user_challenge_records
     (user_id, level, question_content, user_answer, correct_answer, is_correct,
      used_ai_help, added_to_error_book, answered_at, poem_title, poem_author)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
  ).run(userId, level, question, userAnswer, correctAnswer, isCorrect ? 1 : 0,
    isCorrect ? 0 : 1, now, poem.title, poem.author);
  return Number(result.lastInsertRowid);
}

function seed() {
  const userId = ensureTestUser();
  db.exec('BEGIN');
  try {
    const recordIds = db.prepare('SELECT id FROM user_challenge_records WHERE user_id = ?').all(userId);
    for (const row of recordIds) {
      db.prepare('DELETE FROM user_error_book WHERE record_id = ?').run(row.id);
    }
    db.prepare('DELETE FROM user_error_book WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM user_challenge_records WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM user_challenge_progress WHERE user_id = ?').run(userId);

    for (const level of levels.filter(item => item.level <= 3)) {
      const poem = level.poems[0];
      for (const question of level.questions) {
        const correctAnswer = answerText(question);
        insertRecord(userId, level.level, question.question, correctAnswer, correctAnswer, true, poem);
      }
    }

    const level4 = levels.find(item => item.level === 4);
    const poem4 = level4.poems[0];
    const firstQuestion = level4.questions[0];
    const wrongAnswer = '这是测试用错误答案';
    const wrongRecordId = insertRecord(
      userId, 4, firstQuestion.question, wrongAnswer, answerText(firstQuestion), false, poem4
    );
    db.prepare(
      `INSERT INTO user_error_book
       (user_id, record_id, question_content, user_answer, correct_answer, explanation, added_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, wrongRecordId, firstQuestion.question, wrongAnswer, answerText(firstQuestion),
      firstQuestion.analysis || '测试夹具错题', now);

    db.prepare(
      `INSERT INTO user_challenge_progress
       (user_id, highest_level, current_challenge_level, last_challenge_time, total_ai_help_used, total_errors)
       VALUES (?, 3, 4, ?, 0, 1)`
    ).run(userId, now);

    db.exec('COMMIT');
    console.log(JSON.stringify({ userId, username: 'Studentdemo', highestLevel: 3, currentLevel: 4, seededLevels: [1, 2, 3], pendingLevel: 4 }, null, 2));
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

seed();
