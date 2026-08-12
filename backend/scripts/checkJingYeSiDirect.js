const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库路径
const DB_PATH = path.join(__dirname, '../db/poetry.db');

// 创建数据库连接
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    return;
  }
  console.log('成功连接到SQLite数据库');
  
  // 查询《静夜思》数据
  db.get('SELECT * FROM poems WHERE title = ?', ['静夜思'], (err, row) => {
    if (err) {
      console.error('查询失败:', err.message);
    } else if (row) {
      console.log('《静夜思》数据:');
      console.log('ID:', row.id);
      console.log('标题:', row.title);
      console.log('作者:', row.author);
      console.log('朝代:', row.dynasty);
      console.log('内容:', row.content);
      console.log('标签:', row.tags);
      
      // 检查是否包含"举头望明月"
      if (row.content.includes('举头望明月')) {
        console.log('✓ 包含"举头望明月"');
      } else {
        console.log('✗ 不包含"举头望明月"');
        console.log('实际内容:', row.content);
        console.log('内容长度:', row.content.length);
      }
    } else {
      console.log('未找到《静夜思》');
    }
    
    // 关闭数据库连接
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接失败:', err.message);
      } else {
        console.log('数据库连接已关闭');
      }
    });
  });
});
