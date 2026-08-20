const path = require('path');
const fs = require('fs');

let exitCode = 0;

try {
  const dbJsPath = path.join(__dirname, '../src/utils/db.js');
  const dbJsContent = fs.readFileSync(dbJsPath, 'utf8');
  
  const requiredKeywords = ['node:sqlite', 'sqliteQuery', 'ensureDialect', 'DB_TYPE'];
  const missing = requiredKeywords.filter(keyword => !dbJsContent.includes(keyword));

  if (missing.length) {
    missing.forEach(keyword => console.error(`❌ 测试失败: db.js 缺少 ${keyword}`));
    exitCode = 1;
  } else {
    console.log('✅ SQLite 数据库模式与方言探测逻辑存在');
  }
} catch (err) {
  console.error('❌ 读取 db.js 失败', err);
  exitCode = 1;
}

process.exit(exitCode);
