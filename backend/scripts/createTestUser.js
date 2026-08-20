require('dotenv').config();
const bcrypt = require('bcrypt');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'db', 'poetry.db');
const db = new DatabaseSync(dbPath);
const hash = bcrypt.hashSync('123456', 10);
const now = new Date().toISOString();

try {
  db.exec('BEGIN');
  db.prepare('INSERT OR IGNORE INTO classes (id, class_name) VALUES (1, ?)').run('一年级一班');
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('Studentdemo');
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, 'Studentdemo');
    console.log('Studentdemo 已存在，已更新密码');
  } else {
    db.prepare('INSERT INTO users (username, email, password_hash, class_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run('Studentdemo', 's@s.com', hash, 1, now, now);
    console.log('Studentdemo 已创建');
  }
  db.exec('COMMIT');

  const u = db.prepare('SELECT id, username, email, class_id FROM users WHERE username = ?').get('Studentdemo');
  console.log('用户信息:', JSON.stringify(u));
  const pwd = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('Studentdemo');
  console.log('密码验证:', bcrypt.compareSync('123456', pwd.password_hash));

} catch (e) {
  db.exec('ROLLBACK');
  console.error('失败:', e.message);
} finally {
  db.close();
}
