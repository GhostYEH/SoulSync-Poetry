const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const config = require('../config/config');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, classId } = req.body;

    if (!username || !email || !password || !classId) {
      return res.status(400).json({ message: '缺少必要参数' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: '密码长度至少6位' });
    }

    const classIdNum = parseInt(classId);
    if (isNaN(classIdNum) || classIdNum <= 0) {
      return res.status(400).json({ message: '班级号必须是正整数' });
    }

    const existingClass = await db.get('SELECT 1 FROM class_stats WHERE class_id = $1', [classIdNum]);
    if (!existingClass) {
      await db.run('INSERT INTO class_stats (class_id) VALUES ($1)', [classIdNum]);
    }

    const existingUser = await db.get('SELECT 1 FROM users WHERE username = $1', [username]);
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    const existingEmail = await db.get('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existingEmail) {
      return res.status(400).json({ message: '邮箱已存在' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const result = await db.run(
      `INSERT INTO users (username, email, password_hash, class_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [username, email, passwordHash, classIdNum, now, now]
    );
    const userId = result.rows[0].id;

    await db.run('UPDATE class_stats SET total_students = total_students + 1 WHERE class_id = $1', [classIdNum]);

    const token = jwt.sign(
      { userId, username, role: 'student' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      success: true,
      message: '注册成功',
      data: { token, user: { id: userId, username, email, classId: classIdNum } }
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ message: '注册失败' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    const user = await db.get('SELECT * FROM users WHERE username = $1', [username]);
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: 'student' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: { token, user: { id: user.id, username: user.username, email: user.email, classId: user.class_id } }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ message: '登录失败' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true, message: '登出成功' });
});

router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '未提供令牌' });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await db.get('SELECT id, username, email, class_id FROM users WHERE id = $1', [decoded.userId]);
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    res.json({
      success: true,
      data: { user: { id: user.id, username: user.username, email: user.email, classId: user.class_id } }
    });
  } catch (error) {
    console.error('验证失败:', error);
    res.status(500).json({ message: '验证失败' });
  }
});

module.exports = router;
