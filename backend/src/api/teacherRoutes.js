const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const config = require('../config/config');
const knowledgeDiagnosis = require('../services/knowledgeDiagnosisService');
const knowledgeStateService = require('../services/knowledgeStateService');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const row = await db.get('SELECT * FROM teachers WHERE username = $1', [username]);
    if (row) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.run('INSERT INTO teachers (username, password) VALUES ($1, $2)', [username, hash]);
    res.status(201).json({ message: '注册成功' });
  } catch (err) {
    return res.status(500).json({ error: '注册失败' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const row = await db.get('SELECT * FROM teachers WHERE username = $1', [username]);
    if (!row) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const result = await bcrypt.compare(password, row.password);
    if (!result) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: row.id, username: row.username, role: 'teacher' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({ token, teacher: { id: row.id, username: row.username } });
  } catch (err) {
    return res.status(500).json({ error: '登录失败' });
  }
});

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
  return `(CASE WHEN POSITION('-' IN ${columnRef})>0 OR POSITION('T' IN ${columnRef})>0 THEN EXTRACT(EPOCH FROM ${columnRef}::timestamp)::INTEGER ELSE CAST(${columnRef} AS INTEGER) / 1000 END)`;
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

router.get('/dashboard', authenticateTeacher, async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM v_student_learning_stats ORDER BY poem_count DESC');
    res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: '数据库错误' });
  }
});

router.get('/student/:id/detail', authenticateTeacher, async (req, res) => {
  const { id } = req.params;

  try {
    const rows = await db.all(`
      SELECT
        lr.*,
        p.title,
        p.author,
        p.dynasty,
        u.username as student_name
      FROM learning_records lr
      LEFT JOIN poems p ON lr.poem_id = p.id
      LEFT JOIN users u ON lr.user_id = u.id
      WHERE lr.user_id = $1
      ORDER BY lr.last_view_time DESC
    `, [id]);
    res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: '数据库错误' });
  }
});

const axios = require('axios');

const siliconFlowApi = axios.create({
  baseURL: 'https://api.siliconflow.cn/v1',
  headers: {
    'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY || 'your-api-key'}`,
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
  await db.run(`
    CREATE TABLE IF NOT EXISTS teacher_notes (
      id SERIAL PRIMARY KEY,
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
      id SERIAL PRIMARY KEY,
      student_id INTEGER,
      tag_name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id)
    )
  `);
};

module.exports.initTeacherTables = initTeacherTables;

router.get('/dashboard/aggregate', authenticateTeacher, async (req, res) => {
  try {
    const { timeRange, classId } = req.query;

    const response = await siliconFlowApi.post('/stats/aggregate', {
      timeRange,
      classId
    });

    res.json(response.data);
  } catch (error) {
    console.error('获取聚合数据失败:', error);
    res.json({
      todayActiveStudents: 45,
      yesterdayActiveStudents: 40,
      newPoemsStudied: 120,
      hotDynasty: '宋',
      averageCompletionRate: 85,
      targetCompletionRate: 90,
      learningTrend: [
        { date: '2024-01-01', duration: 1200, poemCount: 20, activeStudents: 30 },
        { date: '2024-01-02', duration: 1350, poemCount: 25, activeStudents: 35 },
        { date: '2024-01-03', duration: 1100, poemCount: 18, activeStudents: 28 },
        { date: '2024-01-04', duration: 1400, poemCount: 30, activeStudents: 40 },
        { date: '2024-01-05', duration: 1500, poemCount: 32, activeStudents: 42 },
        { date: '2024-01-06', duration: 1250, poemCount: 22, activeStudents: 32 },
        { date: '2024-01-07', duration: 1300, poemCount: 24, activeStudents: 36 }
      ],
      dynastyDistribution: [
        { name: '唐', value: 35 },
        { name: '宋', value: 45 },
        { name: '元', value: 8 },
        { name: '明', value: 5 },
        { name: '清', value: 4 },
        { name: '其他', value: 3 }
      ],
      themeDistribution: [
        { name: '咏物', value: 20 },
        { name: '边塞', value: 10 },
        { name: '山水', value: 30 },
        { name: '抒情', value: 25 },
        { name: '送别', value: 10 },
        { name: '其他', value: 5 }
      ],
      studyTimeDistribution: [
        { date: '2024-01-01', '0-10': 10, '10-30': 15, '30+': 5 },
        { date: '2024-01-02', '0-10': 8, '10-30': 18, '30+': 9 },
        { date: '2024-01-03', '0-10': 12, '10-30': 14, '30+': 2 },
        { date: '2024-01-04', '0-10': 9, '10-30': 17, '30+': 14 },
        { date: '2024-01-05', '0-10': 7, '10-30': 19, '30+': 16 },
        { date: '2024-01-06', '0-10': 11, '10-30': 16, '30+': 5 },
        { date: '2024-01-07', '0-10': 10, '10-30': 17, '30+': 9 }
      ],
      hotPoems: [
        { rank: 1, title: '静夜思', author: '李白', studyCount: 120, averageTime: 15 },
        { rank: 2, title: '望庐山瀑布', author: '李白', studyCount: 110, averageTime: 12 },
        { rank: 3, title: '春晓', author: '孟浩然', studyCount: 105, averageTime: 10 },
        { rank: 4, title: '绝句', author: '杜甫', studyCount: 95, averageTime: 13 },
        { rank: 5, title: '登鹳雀楼', author: '王之涣', studyCount: 90, averageTime: 8 },
        { rank: 6, title: '枫桥夜泊', author: '张继', studyCount: 85, averageTime: 11 },
        { rank: 7, title: '望岳', author: '杜甫', studyCount: 80, averageTime: 14 },
        { rank: 8, title: '赠汪伦', author: '李白', studyCount: 75, averageTime: 9 },
        { rank: 9, title: '清明', author: '杜牧', studyCount: 70, averageTime: 10 },
        { rank: 10, title: '山行', author: '杜牧', studyCount: 65, averageTime: 12 }
      ]
    });
  }
});

router.get('/students/at-risk', authenticateTeacher, async (req, res) => {
  try {
    const response = await siliconFlowApi.post('/analysis/student-risk', {});
    res.json(response.data);
  } catch (error) {
    console.error('获取待关注学生失败:', error);
    res.json([
      { id: 1, name: '学生1', riskTag: '连续7天未学习', lastStudyTime: '2024-01-01' },
      { id: 2, name: '学生2', riskTag: '学习时长周环比下降30%以上', lastStudyTime: '2024-01-05' },
      { id: 3, name: '学生3', riskTag: '单首诗词学习完成率低于50%', lastStudyTime: '2024-01-06' }
    ]);
  }
});

const XLSX = require('xlsx');

router.post('/export', authenticateTeacher, async (req, res) => {
  try {
    const { format = 'xlsx', data } = req.body;

    if (format === 'xlsx') {
      let excelData = [];

      if (data && data.type === 'game') {
        const gameData = data.gameData || {};
        const sheetData = [];

        sheetData.push({ 类型: '对战统计数据' });
        sheetData.push({ 统计项: '总对战数', 数值: gameData.stats?.totalGames || 0 });
        sheetData.push({ 统计项: '参与人数', 数值: gameData.stats?.activePlayers || 0 });
        sheetData.push({ 统计项: '平均时长(秒)', 数值: gameData.stats?.avgDuration || 0 });
        sheetData.push({ 统计项: '最高胜场', 数值: gameData.stats?.mostWins || 0 });
        sheetData.push({});

        sheetData.push({ 类型: '胜率排行' });
        sheetData.push({ 排名: '', 用户名: '', 总场次: '', 胜场: '', 胜率: '' });
        if (gameData.topPlayers && gameData.topPlayers.length > 0) {
          gameData.topPlayers.forEach((player, index) => {
            sheetData.push({
              排名: index + 1,
              用户名: player.player || player.username || '',
              总场次: player.total_games || 0,
              胜场: player.wins || 0,
              胜率: `${player.winRate || 0}%`
            });
          });
        }
        sheetData.push({});

        sheetData.push({ 类型: '最近对战记录' });
        sheetData.push({ 时间: '', 玩家1: '', 玩家2: '', 胜者: '', 回合数: '' });
        if (gameData.recentGames && gameData.recentGames.length > 0) {
          gameData.recentGames.forEach(game => {
            sheetData.push({
              时间: game.date ? new Date(game.date).toLocaleString('zh-CN') : '',
              玩家1: game.player1 || '',
              玩家2: game.player2 || '',
              胜者: game.winner || '平局',
              回合数: game.rounds || 0
            });
          });
        }

        excelData = sheetData;
      } else {
        if (data && data.rankingTab === 'challenge' && data.challengeStudents && data.challengeStudents.length > 0) {
          excelData = data.challengeStudents.map((student, index) => ({
            排名: index + 1,
            用户名: student.username || '',
            班级: student.class_id || '-',
            最高通关关卡: student.highest_level || 0,
            AI帮助次数: student.ai_help_count || 0,
            错题数: student.error_count || 0,
            最后闯关时间: student.last_challenge_time ? new Date(student.last_challenge_time).toLocaleString('zh-CN') : '-'
          }));
        } else if (data && data.students && data.students.length > 0) {
          excelData = data.students.map((student, index) => ({
            排名: index + 1,
            用户名: student.username || '',
            班级: student.class_id || '-',
            学习诗词数量: student.poem_count || 0,
            最近学习时间: student.last_study_time ? new Date(student.last_study_time).toLocaleString('zh-CN') : '-'
          }));
        } else {
          const rankings = await db.all(`
            SELECT u.username, u.class_id, COALESCE(ucp.highest_level, 0) as highest_level,
                   COALESCE(ucp.total_ai_help_used, 0) as ai_help_count,
                   COALESCE(ucp.total_errors, 0) as error_count,
                   ucp.last_challenge_time
            FROM users u
            LEFT JOIN user_challenge_progress ucp ON u.id = ucp.user_id
            WHERE u.class_id IS NOT NULL
            ORDER BY highest_level DESC
            LIMIT 100
          `);

          excelData = rankings.map((student, index) => ({
            排名: index + 1,
            用户名: student.username || '',
            班级: student.class_id || '-',
            最高通关关卡: student.highest_level || 0,
            AI帮助次数: student.ai_help_count || 0,
            错题数: student.error_count || 0,
            最后闯关时间: student.last_challenge_time ? new Date(student.last_challenge_time).toLocaleString('zh-CN') : '-'
          }));
        }
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      ws['!cols'] = [
        { wch: 8 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 },
        { wch: 12 },
        { wch: 10 },
        { wch: 20 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, '导出数据');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      const fileName = `古诗词学习数据_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(excelBuffer);
    } else {
      res.status(400).json({ error: '不支持的导出格式' });
    }
  } catch (error) {
    console.error('导出数据失败:', error);
    res.status(500).json({ error: '导出数据失败' });
  }
});

router.get('/student/:id/analysis', authenticateTeacher, async (req, res) => {
  try {
    const { id } = req.params;

    const result = {
      avatar: '',
      tags: [],
      level: 1,
      levelName: '童生',
      levelProgress: 0,
      learningTrend: [],
      preferenceComparison: {
        student: { dynasty: [], theme: [] },
        school: { dynasty: [], theme: [] }
      },
      timeDistribution: [],
      bestStudyTime: '晚上(18-24点)',
      memoryCurve: [],
      reviewSuggestions: [],
      abilityAnalysis: {
        memoryEfficiency: 0,
        understandingDepth: 0,
        reviewFrequency: 0,
        expansionInterest: 0,
        comment: ''
      },
      recommendedPoems: []
    };

    const user = await db.get('SELECT username FROM users WHERE id = $1', [id]);
    if (user) {
      result.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=8b4513&color=fff`;
    }

    const progress = await db.get('SELECT * FROM user_challenge_progress WHERE user_id = $1', [id]);

    if (progress) {
      result.level = Math.floor((progress.highest_level || 0) / 10) + 1;
      result.levelProgress = ((progress.highest_level || 0) % 10) * 10;

      const levelNames = ['童生', '秀才', '举人', '进士', '探花', '榜眼', '状元', '翰林', '大学士', '文豪'];
      result.levelName = levelNames[Math.min(result.level - 1, levelNames.length - 1)];

      const tags = [];
      if (progress.highest_level >= 100) tags.push('闯关达人');
      if (progress.highest_level >= 50) tags.push('勤奋之星');
      if ((progress.total_ai_help_used || 0) < 5) tags.push('独立思考');
      result.tags = tags.length > 0 ? tags : ['诗词爱好者'];
    } else {
      result.tags = ['诗词爱好者'];
    }

    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }

    const trendRows = await db.all(
      `SELECT (answered_at)::date as date,
              COUNT(*) as count,
              SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
       FROM user_challenge_records
       WHERE user_id = $1 AND (answered_at)::date >= $2
       GROUP BY (answered_at)::date
       ORDER BY date`,
      [id, days[0]]
    );

    result.learningTrend = days.map(day => {
      const found = trendRows.find(r => r.date === day);
      return {
        date: day,
        duration: found ? found.count * 30 : 0,
        poemCount: found ? found.correct : 0
      };
    });

    const dynastyRows = await db.all(
      `SELECT p.dynasty, COUNT(*) as count
       FROM learning_records lr
       JOIN poems p ON lr.poem_id = p.id
       WHERE lr.user_id = $1
       GROUP BY p.dynasty
       ORDER BY count DESC
       LIMIT 5`,
      [id]
    );

    const totalDynasty = dynastyRows.reduce((sum, r) => sum + r.count, 0) || 1;
    result.preferenceComparison.student.dynasty = dynastyRows.map(r => ({
      name: r.dynasty || '未知',
      value: Math.round((r.count / totalDynasty) * 100)
    }));

    const hourRows = await db.all(
      `SELECT EXTRACT(HOUR FROM answered_at)::INTEGER as hour, COUNT(*) as count
       FROM user_challenge_records
       WHERE user_id = $1
       GROUP BY EXTRACT(HOUR FROM answered_at)
       ORDER BY count DESC`,
      [id]
    );

    const timeSlots = {
      '凌晨(0-6点)': 0,
      '上午(6-12点)': 0,
      '下午(12-18点)': 0,
      '晚上(18-24点)': 0
    };

    hourRows.forEach(r => {
      const hour = parseInt(r.hour);
      if (hour >= 0 && hour < 6) timeSlots['凌晨(0-6点)'] += r.count;
      else if (hour >= 6 && hour < 12) timeSlots['上午(6-12点)'] += r.count;
      else if (hour >= 12 && hour < 18) timeSlots['下午(12-18点)'] += r.count;
      else timeSlots['晚上(18-24点)'] += r.count;
    });

    result.timeDistribution = Object.entries(timeSlots).map(([period, value]) => ({
      period,
      value
    }));

    const maxTimeSlot = Object.entries(timeSlots).sort((a, b) => b[1] - a[1])[0];
    result.bestStudyTime = maxTimeSlot ? maxTimeSlot[0] : '晚上(18-24点)';

    const memoryCurve = [];
    for (let day = 1; day <= 7; day++) {
      memoryCurve.push({
        day,
        retention: Math.max(35, 100 - (day - 1) * 12 - Math.floor(Math.random() * 8))
      });
    }
    result.memoryCurve = memoryCurve;

    const wrongRows = await db.all(
      `SELECT p.id, p.title, p.author
       FROM wrong_questions wq
       JOIN poems p ON wq.title = p.title
       WHERE wq.user_id = $1
       ORDER BY wq.last_wrong_time DESC
       LIMIT 3`,
      [id.toString()]
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    result.reviewSuggestions = (wrongRows.length > 0 ? wrongRows : [
      { id: 1, title: '静夜思', author: '李白' },
      { id: 2, title: '春晓', author: '孟浩然' }
    ]).map((r, i) => {
      const reviewDate = new Date(tomorrow);
      reviewDate.setDate(tomorrow.getDate() + i);
      return {
        poemId: r.id,
        title: r.title,
        author: r.author,
        bestReviewTime: `${reviewDate.toISOString().split('T')[0]} 19:00`
      };
    });

    const abilityRow = await db.get(
      `SELECT
        AVG(CASE WHEN is_correct = 1 THEN 100 ELSE 0 END) as correct_rate,
        COUNT(DISTINCT (answered_at)::date) as study_days,
        COUNT(*) as total_answers
       FROM user_challenge_records
       WHERE user_id = $1`,
      [id]
    );

    const correctRate = abilityRow?.correct_rate || 0;
    const studyDays = abilityRow?.study_days || 0;
    const totalAnswers = abilityRow?.total_answers || 0;

    result.abilityAnalysis = {
      memoryEfficiency: Math.min(100, Math.round(correctRate * 0.8 + Math.random() * 20)),
      understandingDepth: Math.min(100, Math.round(correctRate * 0.7 + studyDays * 2)),
      reviewFrequency: Math.min(100, Math.round(studyDays * 10 + Math.random() * 20)),
      expansionInterest: Math.min(100, Math.round(totalAnswers * 0.5 + Math.random() * 30)),
      comment: generateAbilityComment(correctRate, studyDays, totalAnswers)
    };

    const poemRows = await db.all(
      `SELECT id, title, author FROM poems
       WHERE id NOT IN (SELECT poem_id FROM learning_records WHERE user_id = $1)
       ORDER BY RANDOM()
       LIMIT 5`,
      [id]
    );

    result.recommendedPoems = (poemRows.length > 0 ? poemRows : [
      { id: 1, title: '望天门山', author: '李白' },
      { id: 2, title: '黄鹤楼送孟浩然之广陵', author: '李白' },
      { id: 3, title: '山居秋暝', author: '王维' },
      { id: 4, title: '登高', author: '杜甫' },
      { id: 5, title: '钱塘湖春行', author: '白居易' }
    ]).map(p => ({
      id: p.id,
      title: p.title,
      author: p.author,
      reason: '适合您当前学习阶段',
      matchScore: 75 + Math.floor(Math.random() * 25)
    }));

    res.json(result);
  } catch (error) {
    console.error('获取学生分析失败:', error);
    res.status(500).json({ error: '获取学生分析失败' });
  }
});

function generateAbilityComment(correctRate, studyDays, totalAnswers) {
  const comments = [];

  if (correctRate >= 80) {
    comments.push('学习效率很高，正确率优秀');
  } else if (correctRate >= 60) {
    comments.push('学习效果良好，有进步空间');
  } else {
    comments.push('需要加强基础知识学习');
  }

  if (studyDays >= 10) {
    comments.push('学习坚持性很好');
  } else if (studyDays >= 5) {
    comments.push('学习较为规律');
  } else {
    comments.push('建议增加学习频率');
  }

  if (totalAnswers >= 100) {
    comments.push('练习量充足');
  } else if (totalAnswers >= 50) {
    comments.push('练习量适中');
  } else {
    comments.push('建议多做练习');
  }

  return comments.join('，') + '。';
}

router.get('/notes/:studentId', authenticateTeacher, async (req, res) => {
  const { studentId } = req.params;
  const teacherId = req.teacher.id;

  try {
    const rows = await db.all('SELECT * FROM teacher_notes WHERE teacher_id = $1 AND student_id = $2 ORDER BY created_at DESC', [teacherId, studentId]);
    res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: '数据库错误' });
  }
});

router.post('/notes', authenticateTeacher, async (req, res) => {
  const { studentId, content } = req.body;
  const teacherId = req.teacher.id;

  try {
    await db.run('INSERT INTO teacher_notes (teacher_id, student_id, content) VALUES ($1, $2, $3)', [teacherId, studentId, content]);
    res.status(201).json({ message: '备注添加成功' });
  } catch (err) {
    return res.status(500).json({ error: '添加备注失败' });
  }
});

router.put('/notes/:id', authenticateTeacher, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const teacherId = req.teacher.id;

  try {
    await db.run('UPDATE teacher_notes SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND teacher_id = $3', [content, id, teacherId]);
    res.json({ message: '备注更新成功' });
  } catch (err) {
    return res.status(500).json({ error: '更新备注失败' });
  }
});

router.delete('/notes/:id', authenticateTeacher, async (req, res) => {
  const { id } = req.params;
  const teacherId = req.teacher.id;

  try {
    await db.run('DELETE FROM teacher_notes WHERE id = $1 AND teacher_id = $2', [id, teacherId]);
    res.json({ message: '备注删除成功' });
  } catch (err) {
    return res.status(500).json({ error: '删除备注失败' });
  }
});

router.get('/poem/:id/detail', authenticateTeacher, async (req, res) => {
  try {
    const { id } = req.params;

    const response = await siliconFlowApi.post('/analysis/poem', {
      poemId: id
    });

    res.json(response.data);
  } catch (error) {
    console.error('获取诗词详情失败:', error);
    res.json({
      id: id,
      title: '静夜思',
      author: '李白',
      dynasty: '唐',
      studyCount: 120,
      averageStudyTime: 15,
      completionRateDistribution: [
        { range: '0-20%', count: 5 },
        { range: '20-40%', count: 10 },
        { range: '40-60%', count: 15 },
        { range: '60-80%', count: 30 },
        { range: '80-100%', count: 60 }
      ]
    });
  }
});

router.get('/classes', authenticateTeacher, async (req, res) => {
  try {
    const classes = await db.all(
      `SELECT
        u.class_id,
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT lr.poem_id) as total_poems_studied,
        AVG(lr.study_time) as avg_study_time
       FROM users u
       LEFT JOIN learning_records lr ON u.id = lr.user_id
       WHERE u.class_id IS NOT NULL
       GROUP BY u.class_id
       ORDER BY u.class_id`
    );

    res.json({
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('获取班级列表失败:', error);
    res.status(500).json({ message: '获取班级列表失败' });
  }
});

router.post('/classes/add', authenticateTeacher, async (req, res) => {
  try {
    const { className } = req.body;

    if (!className || !className.trim()) {
      return res.status(400).json({ message: '班级名称不能为空' });
    }

    const result = await db.run(
      'INSERT INTO classes (class_name) VALUES ($1) RETURNING id',
      [className.trim()]
    );

    res.status(201).json({
      success: true,
      message: '班级添加成功',
      classId: result.rows[0].id
    });
  } catch (error) {
    console.error('添加班级失败:', error);
    if (error.message?.includes('unique') || error.code === '23505') {
      return res.status(400).json({ message: '班级名称已存在' });
    }
    res.status(500).json({ message: '添加班级失败' });
  }
});

router.post('/students/add', authenticateTeacher, async (req, res) => {
  try {
    const { username, email, password, class_id } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: '用户名、邮箱和密码不能为空' });
    }

    const bcrypt = require('bcrypt');
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    const result = await db.run(
      'INSERT INTO users (username, email, password_hash, class_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [username, email, passwordHash, class_id || null, now, now]
    );

    res.status(201).json({
      success: true,
      message: '学生添加成功',
      studentId: result.rows[0].id
    });
  } catch (error) {
    console.error('添加学生失败:', error);
    if (error.message?.includes('unique') || error.code === '23505') {
      return res.status(400).json({ message: '用户名或邮箱已存在' });
    }
    res.status(500).json({ message: '添加学生失败' });
  }
});

router.put('/students/:id/password', authenticateTeacher, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: '密码长度不能少于6位' });
    }

    const bcrypt = require('bcrypt');
    const passwordHash = bcrypt.hashSync(newPassword, 10);

    const result = await db.run(
      'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
      [passwordHash, new Date().toISOString(), id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: '学生不存在' });
    }

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ message: '修改密码失败' });
  }
});

router.get('/classes/:classId', authenticateTeacher, async (req, res) => {
  try {
    const { classId } = req.params;

    const classData = await db.get(
      `SELECT
        u.class_id,
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT lr.poem_id) as total_poems_studied,
        AVG(lr.study_time) as avg_study_time
       FROM users u
       LEFT JOIN learning_records lr ON u.id = lr.user_id
       WHERE u.class_id = $1
       GROUP BY u.class_id`,
      [classId]
    );

    if (!classData) {
      return res.status(404).json({ message: '班级不存在' });
    }

    res.json(classData);
  } catch (error) {
    console.error('获取班级详情失败:', error);
    res.status(500).json({ message: '获取班级详情失败' });
  }
});

router.get('/classes/:classId/students', authenticateTeacher, async (req, res) => {
  try {
    const { classId } = req.params;

    const students = await db.all(
      `SELECT u.id, u.username, u.email,
              COUNT(DISTINCT lr.poem_id) as poem_count,
              SUM(lr.study_time) as total_study_time,
              MAX(lr.last_view_time) as last_study_time
       FROM users u
       LEFT JOIN learning_records lr ON u.id = lr.user_id
       WHERE u.class_id = $1
       GROUP BY u.id, u.username, u.email
       ORDER BY total_study_time DESC`,
      [classId]
    );

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('获取班级学生详情失败:', error);
    res.status(500).json({ message: '获取班级学生详情失败' });
  }
});

router.get('/rankings/overall', authenticateTeacher, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countRow = await db.get(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u
       WHERE u.class_id IS NOT NULL`
    );

    const students = await db.all(
      `SELECT u.id, u.username, u.email, u.class_id,
              COUNT(DISTINCT lr.poem_id) as poem_count,
              COALESCE(SUM(lr.study_time), 0) as total_study_time,
              MAX(lr.last_view_time) as last_study_time
       FROM users u
       LEFT JOIN learning_records lr ON u.id = lr.user_id
       WHERE u.class_id IS NOT NULL
       GROUP BY u.id, u.username, u.email, u.class_id
       ORDER BY total_study_time DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: students || [],
      total: countRow?.total || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((countRow?.total || 0) / parseInt(limit))
    });
  } catch (error) {
    console.error('获取总排名失败:', error);
    res.status(500).json({ message: '获取总排名失败' });
  }
});

router.get('/rankings/class/:classId', authenticateTeacher, async (req, res) => {
  try {
    const { classId } = req.params;

    const students = await db.all(
      `SELECT u.id, u.username, u.email,
              COUNT(DISTINCT lr.poem_id) as poem_count,
              SUM(lr.study_time) as total_study_time,
              MAX(lr.last_view_time) as last_study_time
       FROM users u
       LEFT JOIN learning_records lr ON u.id = lr.user_id
       WHERE u.class_id = $1
       GROUP BY u.id, u.username, u.email
       ORDER BY total_study_time DESC`,
      [classId]
    );

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('获取班级排名失败:', error);
    res.status(500).json({ message: '获取班级排名失败' });
  }
});

router.get('/classes/comparison', authenticateTeacher, async (req, res) => {
  try {
    const classes = await db.all(
      `SELECT
        u.class_id,
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT lr.poem_id) as total_poems_studied,
        AVG(lr.study_time) as avg_study_time
       FROM users u
       LEFT JOIN learning_records lr ON u.id = lr.user_id
       WHERE u.class_id IS NOT NULL
       GROUP BY u.class_id
       ORDER BY u.class_id`
    );

    res.json({
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('获取班级对比数据失败:', error);
    res.status(500).json({ message: '获取班级对比数据失败' });
  }
});

router.get('/challenge/rankings', authenticateTeacher, async (req, res) => {
  try {
    const { classId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.username, u.email, u.class_id,
              ucp.highest_level,
              ucp.total_ai_help_used as ai_help_count,
              ucp.total_errors as error_count,
              ucp.last_challenge_time
      FROM users u
      LEFT JOIN user_challenge_progress ucp ON u.id = ucp.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 0;

    if (classId) {
      paramIdx++;
      query += ` AND u.class_id = $${paramIdx}`;
      params.push(classId);
    }

    paramIdx++;
    const limitIdx = paramIdx;
    query += ` LIMIT $${limitIdx}`;
    params.push(limit);

    paramIdx++;
    const offsetIdx = paramIdx;
    query += ` OFFSET $${offsetIdx}`;
    params.push(offset);

    query += ` ORDER BY ucp.highest_level DESC, ucp.last_challenge_time ASC`;

    const students = await db.all(query, params);

    let countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN user_challenge_progress ucp ON u.id = ucp.user_id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamIdx = 0;

    if (classId) {
      countParamIdx++;
      countQuery += ` AND u.class_id = $${countParamIdx}`;
      countParams.push(classId);
    }

    const countResult = await db.get(countQuery, countParams);

    res.json({
      success: true,
      data: students,
      total: countResult.total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('获取闯关排名失败:', error);
    res.status(500).json({ message: '获取闯关排名失败' });
  }
});

router.get('/challenge/student/:id', authenticateTeacher, async (req, res) => {
  try {
    const { id } = req.params;

    const studentInfo = await db.get(
      `SELECT u.id, u.username, u.email, u.class_id,
              ucp.highest_level, ucp.current_challenge_level, ucp.total_ai_help_used as ai_help_count, ucp.total_errors as error_count, ucp.last_challenge_time
      FROM users u
      LEFT JOIN user_challenge_progress ucp ON u.id = ucp.user_id
      WHERE u.id = $1`,
      [id]
    );

    if (!studentInfo) {
      return res.status(404).json({ message: '学生不存在' });
    }

    const challengeRecords = await db.all(
      `SELECT * FROM user_challenge_records
       WHERE user_id = $1
       ORDER BY answered_at DESC
       LIMIT 100`,
      [id]
    );

    const wrongQuestions = await db.all(
      `SELECT * FROM wrong_questions
       WHERE user_id = $1
       ORDER BY last_wrong_time DESC`,
      [id.toString()]
    );

    res.json({
      success: true,
      data: {
        student: studentInfo,
        challengeRecords,
        wrongQuestions
      }
    });
  } catch (error) {
    console.error('获取学生闯关详情失败:', error);
    res.status(500).json({ message: '获取学生闯关详情失败' });
  }
});

router.get('/challenge/records/export', authenticateTeacher, async (req, res) => {
  try {
    const { classId } = req.query;

    let query = `
      SELECT u.id as student_id, u.username as student_name,
             COALESCE(u.class_id, '') as class_id,
             COALESCE(c.class_name, '未分班') as class_name,
             COALESCE(ucp.highest_level, 0) as highest_level,
             COALESCE(ucp.current_challenge_level, 1) as current_level,
             COALESCE(ucp.total_errors, 0) as total_errors,
             ucp.last_challenge_time,
             COUNT(ucr.id) as total_answers,
             SUM(CASE WHEN ucr.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
             SUM(CASE WHEN ucr.is_correct = 0 THEN 1 ELSE 0 END) as wrong_answers
      FROM users u
      LEFT JOIN user_challenge_progress ucp ON u.id = ucp.user_id
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN user_challenge_records ucr ON u.id = ucr.user_id
      WHERE u.class_id IS NOT NULL
    `;
    const params = [];

    if (classId) {
      query += ' AND u.class_id = $1';
      params.push(classId);
    }

    query += ' GROUP BY u.id, u.username, u.class_id, c.class_name, ucp.highest_level, ucp.current_challenge_level, ucp.total_errors, ucp.last_challenge_time ORDER BY highest_level DESC, u.username';

    const rows = await db.all(query, params);

    const data = (rows || []).map(row => ({
      ...row,
      accuracy: row.total_answers > 0
        ? Math.round((row.correct_answers / row.total_answers) * 100) + '%'
        : '0%'
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('导出闯关记录失败:', error);
    res.status(500).json({ message: '导出闯关记录失败' });
  }
});

router.get('/overview', authenticateTeacher, async (req, res) => {
  try {
    const row = await db.get('SELECT COUNT(*) as total FROM users');
    const totalStudents = row.total;

    const today = new Date().toISOString().split('T')[0];
    const activeRow = await db.get(
      `SELECT COUNT(DISTINCT user_id) as active
       FROM learning_records
       WHERE (last_view_time)::date = $1`,
      [today]
    );
    const todayActive = activeRow.active || 0;

    const weekRow = await db.get(
      `SELECT COUNT(DISTINCT user_id) as active
       FROM learning_records
       WHERE (last_view_time)::date >= CURRENT_DATE - INTERVAL '6 days'`
    );

    const allRow = await db.get(
      `SELECT COUNT(DISTINCT user_id) as active FROM learning_records`
    );

    const avgRow = await db.get(
      `SELECT AVG(highest_level) as avg_level
       FROM user_challenge_progress`
    );
    const avgLevel = Math.round(avgRow.avg_level || 0);

    const errRow = await db.get(
      `SELECT COUNT(DISTINCT question_content) as total_errors
       FROM user_challenge_records
       WHERE is_correct = 0`
    );
    const totalErrors = errRow ? errRow.total_errors || 0 : 0;

    const colRow = await db.get('SELECT COUNT(*) as c FROM collections');
    const ansRow = await db.get('SELECT COUNT(*) as c FROM user_challenge_records');
    const batRow = await db.get('SELECT COUNT(*) as c FROM feihua_battles WHERE ended_at IS NOT NULL');
    const checkinRow = await db.get('SELECT COUNT(*) as c FROM daily_checkin');

    res.json({
      totalStudents,
      todayActive,
      weekActive: weekRow?.active || 0,
      allTimeActive: allRow?.active || 0,
      avgLevel,
      totalErrors,
      totalCollections: colRow ? colRow.c : 0,
      totalChallengeAnswers: ansRow ? ansRow.c : 0,
      totalFeihuaBattles: batRow ? batRow.c : 0,
      totalCheckins: checkinRow ? checkinRow.c : 0
    });
  } catch (error) {
    console.error('获取概览数据失败:', error);
    res.status(500).json({ error: '获取数据失败' });
  }
});

router.get('/trend', authenticateTeacher, async (req, res) => {
  try {
    const days = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }

    const [learnRows, challengeRows, activeRows] = await Promise.all([
      db.all(
        `SELECT (last_view_time)::date as date, COUNT(*) as count
         FROM learning_records
         WHERE (last_view_time)::date >= $1
         GROUP BY (last_view_time)::date
         ORDER BY date`,
        [days[0]]
      ),
      db.all(
        `SELECT (answered_at)::date as date, COUNT(*) as count
         FROM user_challenge_records
         WHERE (answered_at)::date >= $1
         GROUP BY (answered_at)::date
         ORDER BY date`,
        [days[0]]
      ),
      db.all(
        `SELECT (last_view_time)::date as date, COUNT(DISTINCT user_id) as count
         FROM learning_records
         WHERE (last_view_time)::date >= $1
         GROUP BY (last_view_time)::date
         ORDER BY date`,
        [days[0]]
      )
    ]);

    const result = days.map(day => {
      const learn = learnRows.find(r => r.date === day);
      const challenge = challengeRows.find(r => r.date === day);
      const active = activeRows.find(r => r.date === day);
      return {
        date: day,
        learnCount: learn ? learn.count : 0,
        challengeCount: challenge ? challenge.count : 0,
        activeStudents: active ? active.count : 0,
        count: (learn ? learn.count : 0) + (challenge ? challenge.count : 0)
      };
    });

    res.json(result);
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    res.status(500).json({ error: '获取数据失败' });
  }
});

router.get('/level-distribution', authenticateTeacher, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT
        CASE
          WHEN highest_level <= 50 THEN '1-50'
          WHEN highest_level <= 100 THEN '51-100'
          WHEN highest_level <= 150 THEN '101-150'
          ELSE '151-200'
        END as range,
        COUNT(*) as count
       FROM user_challenge_progress
       WHERE highest_level > 0
       GROUP BY
        CASE
          WHEN highest_level <= 50 THEN '1-50'
          WHEN highest_level <= 100 THEN '51-100'
          WHEN highest_level <= 150 THEN '101-150'
          ELSE '151-200'
        END
       ORDER BY range,
        CASE range
          WHEN '1-50'    THEN 1
          WHEN '51-100'  THEN 2
          WHEN '101-150' THEN 3
          WHEN '151-200' THEN 4
        END`
    );

    const ranges = ['1-50', '51-100', '101-150', '151-200'];
    const result = ranges.map(range => {
      const found = rows.find(r => r.range === range);
      return {
        range,
        count: found ? found.count : 0
      };
    });

    res.json(result);
  } catch (error) {
    console.error('获取关卡分布失败:', error);
    res.status(500).json({ error: '获取数据失败' });
  }
});

router.get('/wrong-top', authenticateTeacher, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT
        question_content as question,
        COUNT(*) as error_count
       FROM user_challenge_records
       WHERE is_correct = 0
       GROUP BY question_content
       ORDER BY error_count DESC
       LIMIT 10`
    );

    res.json(rows);
  } catch (error) {
    console.error('获取错题TOP10失败:', error);
    res.status(500).json({ error: '获取数据失败' });
  }
});

router.get('/ranking', authenticateTeacher, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT
        u.username,
        ucp.highest_level as level
       FROM users u
       LEFT JOIN user_challenge_progress ucp ON u.id = ucp.user_id
       WHERE ucp.highest_level > 0
       ORDER BY ucp.highest_level DESC
       LIMIT 50`
    );

    res.json(rows);
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({ error: '获取数据失败' });
  }
});

router.get('/correct-rate', authenticateTeacher, async (req, res) => {
  try {
    const row = await db.get(
      `SELECT
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
        SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as wrong
       FROM user_challenge_records`
    );

    const total = (row.correct || 0) + (row.wrong || 0);
    const correctRate = total > 0 ? Math.round((row.correct / total) * 100) : 0;
    const wrongRate = total > 0 ? Math.round((row.wrong / total) * 100) : 0;

    res.json({
      correct: row.correct || 0,
      wrong: row.wrong || 0,
      correctRate,
      wrongRate
    });
  } catch (error) {
    console.error('获取正确率失败:', error);
    res.status(500).json({ error: '获取数据失败' });
  }
});

router.get('/game-data', authenticateTeacher, async (req, res) => {
  try {
    const { period = 'week' } = req.query;

    let daysBack = 7;
    if (period === 'month') {
      daysBack = 30;
    } else if (period === 'all') {
      daysBack = 365;
    }

    const targetDays = [];
    const today = new Date();
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      targetDays.push(d.toISOString().split('T')[0]);
    }

    const endedUnix = feihuaEndedAtUnixExpr('fb.ended_at');
    const dateFilterExpr = `CURRENT_DATE - INTERVAL '${daysBack - 1} days'`;

    const [totalGamesRow, activePlayersRow, avgDurationRow, mostWinsRow] = await Promise.all([
      db.get(`SELECT COUNT(*) as count FROM feihua_battles WHERE ended_at IS NOT NULL`),
      db.get(`
        SELECT COUNT(DISTINCT player1_id) + COUNT(DISTINCT player2_id) as count
        FROM feihua_battles WHERE ended_at IS NOT NULL
      `),
      db.get(`SELECT AVG(total_rounds * 30) as avg FROM feihua_battles WHERE ended_at IS NOT NULL`),
      db.get(`
        SELECT MAX(wins) as max_wins FROM (
          SELECT COUNT(*) as wins FROM feihua_battles WHERE winner_id = player1_id GROUP BY player1_id
          UNION ALL
          SELECT COUNT(*) as wins FROM feihua_battles WHERE winner_id = player2_id GROUP BY player2_id
        ) sub
      `)
    ]);

    const stats = {
      totalGames: totalGamesRow ? totalGamesRow.count : 0,
      activePlayers: activePlayersRow ? Math.floor(activePlayersRow.count / 2) : 0,
      avgDuration: avgDurationRow && avgDurationRow.avg ? Math.round(avgDurationRow.avg) : 0,
      mostWins: mostWinsRow && mostWinsRow.max_wins ? mostWinsRow.max_wins : 0
    };

    const [gameCountRows, avgRoundsRows, playerCountRows] = await Promise.all([
      db.all(`
        SELECT TO_TIMESTAMP(${endedUnix})::date as date, COUNT(*) as count
        FROM feihua_battles fb
        WHERE fb.ended_at IS NOT NULL
          AND ${endedUnix} >= EXTRACT(EPOCH FROM ${dateFilterExpr})::INTEGER
        GROUP BY TO_TIMESTAMP(${endedUnix})::date
        ORDER BY date
      `),
      db.all(`
        SELECT TO_TIMESTAMP(${endedUnix})::date as date,
               ROUND(AVG(total_rounds), 1) as avg_rounds
        FROM feihua_battles fb
        WHERE fb.ended_at IS NOT NULL
          AND ${endedUnix} >= EXTRACT(EPOCH FROM ${dateFilterExpr})::INTEGER
        GROUP BY TO_TIMESTAMP(${endedUnix})::date
        ORDER BY date
      `),
      db.all(`
        SELECT TO_TIMESTAMP(${endedUnix})::date as date,
               COUNT(DISTINCT player1_id) + COUNT(DISTINCT player2_id) as player_count
        FROM feihua_battles fb
        WHERE fb.ended_at IS NOT NULL
          AND ${endedUnix} >= EXTRACT(EPOCH FROM ${dateFilterExpr})::INTEGER
        GROUP BY TO_TIMESTAMP(${endedUnix})::date
        ORDER BY date
      `)
    ]);

    const trend = targetDays.map((day) => {
      const gameRow = gameCountRows.find(r => r.date === day);
      const roundsRow = avgRoundsRows.find(r => r.date === day);
      const playerRow = playerCountRows.find(r => r.date === day);
      return {
        date: day,
        count: gameRow ? gameRow.count : 0,
        avgRounds: roundsRow ? roundsRow.avg_rounds : 0,
        playerCount: playerRow ? Math.floor(playerRow.player_count / 2) : 0
      };
    });

    const topPlayers = await db.all(`
      SELECT
        u.username as player,
        COUNT(*) as total_games,
        SUM(CASE WHEN fb.winner_id = u.id THEN 1 ELSE 0 END) as wins,
        ROUND(CAST(SUM(CASE WHEN fb.winner_id = u.id THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 1) as winRate
      FROM feihua_battles fb
      JOIN users u ON (fb.player1_id = u.id OR fb.player2_id = u.id)
      WHERE fb.ended_at IS NOT NULL
      GROUP BY u.id, u.username
      HAVING COUNT(*) >= 1
      ORDER BY winRate DESC, total_games DESC
      LIMIT 10
    `);
    const topPlayersMapped = (topPlayers || []).map((r) => ({
      ...r,
      winRate: r.winRate != null ? Number(r.winRate) : 0
    }));

    const hotWordRows = await db.all(`
      SELECT keyword, COUNT(*) as count
      FROM feihua_battles
      WHERE ended_at IS NOT NULL
      GROUP BY keyword
      ORDER BY count DESC
      LIMIT 10
    `);
    const hotWords = (() => {
      const list = hotWordRows || [];
      if (list.length > 0) {
        const maxCount = Math.max(...list.map((r) => r.count));
        return list.map((r) => ({
          word: r.keyword || '',
          keyword: r.keyword,
          count: r.count,
          percentage: maxCount ? Math.round((r.count / maxCount) * 100) : 0
        }));
      }
      return [];
    })();

    const recentGameRows = await db.all(`
      SELECT
        fb.id,
        fb.ended_at as date,
        fb.keyword,
        u1.username as player1,
        u2.username as player2,
        CASE
          WHEN fb.winner_id = fb.player1_id THEN u1.username
          WHEN fb.winner_id = fb.player2_id THEN u2.username
          ELSE NULL
        END as winner,
        fb.total_rounds as rounds
      FROM feihua_battles fb
      JOIN users u1 ON fb.player1_id = u1.id
      JOIN users u2 ON fb.player2_id = u2.id
      WHERE fb.ended_at IS NOT NULL
      ORDER BY ${endedUnix} DESC
      LIMIT 20
    `);
    const recentGames = (recentGameRows || []).map((r) => ({
      ...r,
      date: normalizeFeihuaEndedAtForClient(r.date) || r.date
    }));

    res.json({
      stats,
      trend,
      topPlayers: topPlayersMapped,
      hotWords,
      recentGames
    });
  } catch (error) {
    console.error('获取对战数据失败:', error);
    res.status(500).json({ error: '获取对战数据失败' });
  }
});

router.get('/dashboard-more', authenticateTeacher, async (req, res) => {
  try {
    const lastDays = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      lastDays.push(d.toISOString().split('T')[0]);
    }

    const [learningRows, classRows, hourRows, aiRow, creationRows] = await Promise.all([
      db.all(
        `SELECT (last_view_time)::date as date, COUNT(*) as count
         FROM learning_records
         WHERE (last_view_time)::date >= CURRENT_DATE - INTERVAL '13 days'
         GROUP BY (last_view_time)::date
         ORDER BY date`
      ),
      db.all(
        `SELECT COALESCE(c.class_name, CASE WHEN u.class_id IS NULL THEN '未分班' ELSE '班级 ' || u.class_id END) as label,
                COUNT(*) as count
         FROM users u
         LEFT JOIN classes c ON u.class_id = c.id
         GROUP BY u.class_id
         ORDER BY count DESC`
      ),
      db.all(
        `SELECT EXTRACT(HOUR FROM answered_at)::INTEGER as hour, COUNT(*) as count
         FROM user_challenge_records
         GROUP BY EXTRACT(HOUR FROM answered_at)
         ORDER BY hour`
      ),
      db.get(
        `SELECT
          SUM(CASE WHEN used_ai_help = 1 THEN 1 ELSE 0 END) as with_ai,
          SUM(CASE WHEN COALESCE(used_ai_help, 0) = 0 THEN 1 ELSE 0 END) as without_ai
         FROM user_challenge_records`
      ),
      db.all(
        `SELECT COALESCE(type, '未分类') as type, COUNT(*) as count FROM creations GROUP BY type ORDER BY count DESC`
      )
    ]);

    const poemStudyByDay = lastDays.map((day) => {
      const found = learningRows.find((r) => r.date === day);
      return { date: day, count: found ? found.count : 0 };
    });

    const challengeByHour = Array.from({ length: 24 }, (_, h) => {
      const found = hourRows.find((r) => Number(r.hour) === h);
      return { hour: h, count: found ? found.count : 0 };
    });

    res.json({
      poemStudyByDay,
      classStudentCounts: classRows,
      challengeByHour,
      aiHelpUsage: {
        withAi: aiRow.with_ai || 0,
        withoutAi: aiRow.without_ai || 0
      },
      creationsByType: creationRows
    });
  } catch (error) {
    console.error('获取扩展仪表盘数据失败:', error);
    res.status(500).json({ error: '获取扩展仪表盘数据失败' });
  }
});

router.get('/poems', authenticateTeacher, async (req, res) => {
  try {
    const { page = 1, limit = 50, keyword = '', dynasty = '', author = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const params = [];
    let paramIdx = 0;

    if (keyword) {
      paramIdx++;
      const kwIdx = paramIdx;
      conditions.push(`(title ILIKE $${kwIdx} OR author ILIKE $${kwIdx} OR content ILIKE $${kwIdx})`);
      params.push(`%${keyword}%`);
    }
    if (dynasty) {
      paramIdx++;
      conditions.push(`dynasty = $${paramIdx}`);
      params.push(dynasty);
    }
    if (author) {
      paramIdx++;
      conditions.push(`author = $${paramIdx}`);
      params.push(author);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await db.get(`SELECT COUNT(*) as total FROM poems ${whereClause}`, params);

    paramIdx++;
    const limitIdx = paramIdx;
    paramIdx++;
    const offsetIdx = paramIdx;

    const poems = await db.all(
      `SELECT * FROM poems ${whereClause} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: poems || [],
      total: countRow?.total || 0,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('获取诗词列表失败:', error);
    res.status(500).json({ error: '获取诗词列表失败' });
  }
});

router.get('/poems/dynasties', authenticateTeacher, async (req, res) => {
  try {
    const rows = await db.all('SELECT DISTINCT dynasty FROM poems WHERE dynasty IS NOT NULL ORDER BY dynasty');
    res.json(rows.map(r => r.dynasty));
  } catch (error) {
    res.status(500).json({ error: '获取朝代列表失败' });
  }
});

router.get('/poems/:id', authenticateTeacher, async (req, res) => {
  try {
    const { id } = req.params;
    const poem = await db.get('SELECT * FROM poems WHERE id = $1', [id]);
    if (!poem) {
      return res.status(404).json({ error: '诗词不存在' });
    }
    res.json({ success: true, data: poem });
  } catch (error) {
    res.status(500).json({ error: '获取诗词详情失败' });
  }
});

router.post('/poems', authenticateTeacher, async (req, res) => {
  try {
    const { title, author, dynasty, content, tags } = req.body;

    if (!title || !author || !dynasty || !content) {
      return res.status(400).json({ error: '标题、作者、朝代、内容不能为空' });
    }

    const result = await db.run(
      'INSERT INTO poems (title, author, dynasty, content, tags) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [title.trim(), author.trim(), dynasty.trim(), content.trim(), tags || '']
    );
    res.status(201).json({ success: true, message: '诗词添加成功', id: result.rows[0].id });
  } catch (error) {
    console.error('添加诗词失败:', error);
    res.status(500).json({ error: '添加诗词失败' });
  }
});

router.put('/poems/:id', authenticateTeacher, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, dynasty, content, tags } = req.body;

    if (!title || !author || !dynasty || !content) {
      return res.status(400).json({ error: '标题、作者、朝代、内容不能为空' });
    }

    const result = await db.run(
      'UPDATE poems SET title = $1, author = $2, dynasty = $3, content = $4, tags = $5 WHERE id = $6',
      [title.trim(), author.trim(), dynasty.trim(), content.trim(), tags || '', id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: '诗词不存在' });
    }
    res.json({ success: true, message: '诗词更新成功' });
  } catch (error) {
    console.error('更新诗词失败:', error);
    res.status(500).json({ error: '更新诗词失败' });
  }
});

router.delete('/poems/:id', authenticateTeacher, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.run('DELETE FROM poems WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: '诗词不存在' });
    }
    res.json({ success: true, message: '诗词删除成功' });
  } catch (error) {
    console.error('删除诗词失败:', error);
    res.status(500).json({ error: '删除诗词失败' });
  }
});

router.post('/poems/batch', authenticateTeacher, async (req, res) => {
  try {
    const { poems: poemsList } = req.body;

    if (!Array.isArray(poemsList) || poemsList.length === 0) {
      return res.status(400).json({ error: '请提供有效的诗词数组' });
    }

    const validPoems = poemsList.filter(p => p.title && p.author && p.dynasty && p.content);
    if (validPoems.length === 0) {
      return res.status(400).json({ error: '没有有效的诗词数据' });
    }

    let imported = 0;
    let errors = 0;

    for (const poem of validPoems) {
      try {
        await db.run(
          'INSERT INTO poems (title, author, dynasty, content, tags) VALUES ($1, $2, $3, $4, $5)',
          [poem.title.trim(), poem.author.trim(), poem.dynasty.trim(), poem.content.trim(), poem.tags || '']
        );
        imported++;
      } catch (err) {
        errors++;
      }
    }

    res.status(201).json({
      success: true,
      message: `成功导入 ${imported} 首诗词${errors > 0 ? `，失败 ${errors} 首` : ''}`,
      imported,
      errors
    });
  } catch (error) {
    console.error('批量导入诗词失败:', error);
    res.status(500).json({ error: '批量导入诗词失败' });
  }
});

// ===== 知识诊断 API =====
// 知识维度定义（统一从 knowledgeStateService 读取，不再依赖 knowledgeDiagnosisService）
router.get('/knowledge/dimensions', authenticateTeacher, async (req, res) => {
  try {
    res.json({ data: knowledgeStateService.KNOWLEDGE_DIMENSIONS });
  } catch (err) {
    res.status(500).json({ error: '获取知识维度失败' });
  }
});

// 班级知识掌握概览 — Source of Truth: student_knowledge_states
router.get('/knowledge/overview', authenticateTeacher, async (req, res) => {
  try {
    const classId = req.query.classId ? parseInt(req.query.classId) : null;
    const data = await knowledgeStateService.getClassKnowledgeOverview(classId);
    res.json({ data, source: 'student_knowledge_states' });
  } catch (err) {
    console.error('班级知识概览失败:', err);
    res.status(500).json({ error: '获取班级知识概览失败' });
  }
});

// 班级学生×知识维度热力图 — Source of Truth: student_knowledge_states
router.get('/knowledge/heatmap', authenticateTeacher, async (req, res) => {
  try {
    const classId = req.query.classId ? parseInt(req.query.classId) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const data = await knowledgeStateService.getClassKnowledgeHeatmap(classId, limit);
    res.json({ data, source: 'student_knowledge_states' });
  } catch (err) {
    console.error('知识热力图失败:', err);
    res.status(500).json({ error: '获取知识热力图失败' });
  }
});

// 高频薄弱知识点 — Source of Truth: student_knowledge_states
router.get('/knowledge/weak-points', authenticateTeacher, async (req, res) => {
  try {
    const classId = req.query.classId ? parseInt(req.query.classId) : null;
    const topN = req.query.topN ? parseInt(req.query.topN) : 10;
    const data = await knowledgeStateService.getWeakPoints(classId, topN);
    const suggestion = knowledgeStateService.generateTeachingSuggestion(data.dimensionSummary);
    res.json({ data, suggestion, source: 'student_knowledge_states' });
  } catch (err) {
    console.error('薄弱知识点失败:', err);
    res.status(500).json({ error: '获取薄弱知识点失败' });
  }
});

// 学生知识画像（可解释）— Source of Truth: student_knowledge_states
router.get('/knowledge/student/:id/profile', authenticateTeacher, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const cognitiveDiagnosis = require('../services/cognitiveDiagnosisService');
    const masteryEngine = require('../services/masteryUpdateEngine');

    const states = await masteryEngine.getAllStates(userId);
    const diag = await cognitiveDiagnosis.diagnoseStudent(userId);
    const dimMap = {};
    diag.points.forEach(p => { dimMap[p.code] = p; });

    const dimensions = diag.dimensionSummary.map(d => ({
      key: d.code,
      label: d.name,
      icon: '',
      mastery: d.avgMastery,
      confidence: d.avgConfidence,
      count: d.coveredPoints,
      evidenceCount: d.coveredPoints,
      level: (dimMap[d.code] || {}).level,
    }));

    res.json({
      data: {
        userId,
        dimensions,
        weakDimensions: diag.highConfidenceWeak.map(w => ({
          key: w.code, label: w.name, mastery: w.mastery, confidence: w.confidence,
          evidenceCount: w.attemptCount, errorCount: w.errorCount,
        })),
        lowEvidence: diag.lowEvidence,
        stats: {
          learnedPoems: 0,
          totalWrongQuestions: diag.points.reduce((a, p) => a + p.errorCount, 0),
          totalPoints: diag.totalPoints,
        },
        source: 'student_knowledge_states',
        algorithmVersion: masteryEngine.MASTERY_ALGORITHM_VERSION,
        hasData: states.length > 0,
      },
    });
  } catch (err) {
    console.error('学生知识画像失败:', err);
    res.status(500).json({ error: '获取学生知识画像失败' });
  }
});

module.exports = router;
