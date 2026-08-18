/**
 * 教师路由共享模块 — 中间件、辅助函数、外部API客户端
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');
const db = require('../../utils/db');
const config = require('../../config/config');

const authenticateTeacher = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  jwt.verify(token, config.jwt.secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: '无效的认证令牌' });
    }
    if (decoded.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }
    req.teacher = decoded;
    next();
  });
};

function feihuaEndedAtUnixExpr(columnRef) {
  if (db.isPostgres()) {
    return `(CASE WHEN POSITION('-' IN ${columnRef})>0 OR POSITION('T' IN ${columnRef})>0 THEN EXTRACT(EPOCH FROM ${columnRef}::timestamp)::INTEGER ELSE CAST(${columnRef} AS INTEGER) / 1000 END)`;
  }
  return `(CASE WHEN INSTR(${columnRef},'-')>0 OR INSTR(${columnRef},'T')>0 THEN CAST(strftime('%s', ${columnRef}) AS INTEGER) ELSE CAST(${columnRef} AS INTEGER) / 1000 END)`;
}

function normalizeFeihuaEndedAtForClient(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (/^\d{10,}$/.test(s)) {
    const n = Number(s);
    const ms = n < 1e12 ? n * 1000 : n;
    return new Date(ms).toISOString();
  }
  return s;
}

const _sfApiKey = process.env.SILICONFLOW_API_KEY || '';
const siliconFlowApi = axios.create({
  baseURL: 'https://api.siliconflow.cn/v1',
  headers: {
    'Authorization': `Bearer ${_sfApiKey}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

siliconFlowApi.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 429 && !originalRequest._retry) {
      originalRequest._retry = true;
      await new Promise(resolve => setTimeout(resolve, 1000));
      return siliconFlowApi(originalRequest);
    }
    console.error('硅基流动 API 错误:', error.message);
    return Promise.reject(error);
  }
);

const initTeacherTables = async () => {
  const pk = db.serialPrimaryKey();
  await db.run(`
    CREATE TABLE IF NOT EXISTS teacher_notes (
      id ${pk},
      teacher_id INTEGER,
      student_id INTEGER,
      content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id),
      FOREIGN KEY (student_id) REFERENCES users(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS student_tags (
      id ${pk},
      student_id INTEGER,
      tag_name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id)
    )
  `);
};

module.exports = {
  authenticateTeacher,
  feihuaEndedAtUnixExpr,
  normalizeFeihuaEndedAtForClient,
  siliconFlowApi,
  initTeacherTables,
};