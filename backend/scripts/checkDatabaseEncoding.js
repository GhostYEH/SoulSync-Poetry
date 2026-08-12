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
  
  // 检查数据库编码
  db.get('PRAGMA encoding;', (err, row) => {
    if (err) {
      console.error('查询编码失败:', err.message);
    } else {
      console.log('数据库编码:', row.encoding);
    }
    
    // 尝试直接插入一条新的《静夜思》记录
    const insertQuery = `
      INSERT INTO poems (title, author, dynasty, content, tags) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const params = [
      '静夜思',
      '李白',
      '唐',
      '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
      '思乡,月亮'
    ];
    
    db.run(insertQuery, params, function(err) {
      if (err) {
        console.error('插入失败:', err.message);
      } else {
        console.log(`成功插入新记录，ID: ${this.lastID}`);
        
        // 验证插入结果
        db.get('SELECT * FROM poems WHERE id = ?', [this.lastID], (err, row) => {
          if (err) {
            console.error('查询失败:', err.message);
          } else if (row) {
            console.log('插入的《静夜思》数据:');
            console.log('ID:', row.id);
            console.log('标题:', row.title);
            console.log('作者:', row.author);
            console.log('朝代:', row.dynasty);
            console.log('内容:', row.content);
            console.log('标签:', row.tags);
          } else {
            console.log('未找到插入的记录');
          }
        });
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
});
