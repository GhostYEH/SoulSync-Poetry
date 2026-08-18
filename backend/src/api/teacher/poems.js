/**
 * 教师路由 — 诗词库管理
 */

const express = require('express');
const router = express.Router();
const db = require('../../utils/db');
const { authenticateTeacher } = require('./shared');
const { parsePagination } = require('../../utils/validation');

router.get('/', authenticateTeacher, async (req, res) => {
  try {
    const { page, pageSize: limit, offset } = parsePagination(req, 50);
    const { keyword = '', dynasty = '', author = '' } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 0;

    if (keyword) {
      paramIdx++;
      const kwIdx = paramIdx;
      const likeOp = db.isPostgres() ? 'ILIKE' : 'LIKE';
      conditions.push(`(title ${likeOp} $${kwIdx} OR author ${likeOp} $${kwIdx} OR content ${likeOp} $${kwIdx})`);
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

router.get('/dynasties', authenticateTeacher, async (req, res) => {
  try {
    const rows = await db.all('SELECT DISTINCT dynasty FROM poems WHERE dynasty IS NOT NULL ORDER BY dynasty');
    res.json(rows.map(r => r.dynasty));
  } catch (error) {
    res.status(500).json({ error: '获取朝代列表失败' });
  }
});

router.get('/:id', authenticateTeacher, async (req, res) => {
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

router.post('/', authenticateTeacher, async (req, res) => {
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

router.put('/:id', authenticateTeacher, async (req, res) => {
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

router.delete('/:id', authenticateTeacher, async (req, res) => {
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

router.post('/batch', authenticateTeacher, async (req, res) => {
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

module.exports = router;