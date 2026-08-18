const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const config = require('../config/config');
const { validate } = require('../utils/validation');
const { ApiError, success, fail } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.post('/register', asyncHandler(async (req, res) => {
  const { username, email, password, classId } = req.body;

  validate(req.body, {
    username: 'required|string|minLen:2|maxLen:50',
    email: 'required|email',
    password: 'required|string|minLen:6|maxLen:100',
  });

  if (!classId) {
    throw ApiError.validation('班级号不能为空');
  }
  const classIdNum = parseInt(classId);
  if (isNaN(classIdNum) || classIdNum <= 0) {
    throw ApiError.validation('班级号必须是正整数');
  }

  const existingClass = await db.get('SELECT 1 FROM class_stats WHERE class_id = $1', [classIdNum]);
  if (!existingClass) {
    await db.run('INSERT INTO class_stats (class_id) VALUES ($1)', [classIdNum]);
  }

  const existingUser = await db.get('SELECT 1 FROM users WHERE username = $1', [username]);
  if (existingUser) {
    throw ApiError.conflict('用户名已存在');
  }

  const existingEmail = await db.get('SELECT 1 FROM users WHERE email = $1', [email]);
  if (existingEmail) {
    throw ApiError.conflict('邮箱已存在');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const result = await db.run(
    `INSERT INTO users (username, email, password_hash, class_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [username.trim(), email.trim(), passwordHash, classIdNum, now, now]
  );
  const userId = result.rows[0].id;

  await db.run('UPDATE class_stats SET total_students = total_students + 1 WHERE class_id = $1', [classIdNum]);

  const token = jwt.sign(
    { userId, username, role: 'student' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  success(res, { token, user: { id: userId, username, email, classId: classIdNum } }, '注册成功');
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  validate(req.body, {
    username: 'required|string|minLen:1|maxLen:50',
    password: 'required|string|minLen:1|maxLen:100',
  });

  const user = await db.get('SELECT * FROM users WHERE username = $1', [username.trim()]);
  if (!user) {
    throw ApiError.unauthorized('用户名或密码错误');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw ApiError.unauthorized('用户名或密码错误');
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: 'student' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  success(res, { token, user: { id: user.id, username: user.username, email: user.email, classId: user.class_id } }, '登录成功');
}));

router.post('/logout', (req, res) => {
  res.json({ success: true, message: '登出成功' });
});

router.get('/verify', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    throw ApiError.unauthorized('未提供令牌');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('令牌已过期');
    }
    throw ApiError.unauthorized('令牌无效');
  }

  const user = await db.get('SELECT id, username, email, class_id FROM users WHERE id = $1', [decoded.userId]);
  if (!user) {
    throw ApiError.unauthorized('用户不存在');
  }

  success(res, { user: { id: user.id, username: user.username, email: user.email, classId: user.class_id } });
}));

module.exports = router;
