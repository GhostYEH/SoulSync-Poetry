const path = require('path');
const fs = require('fs');

let exitCode = 0;

try {
  const dbJsPath = path.join(__dirname, '../src/utils/db.js');
  const dbJsContent = fs.readFileSync(dbJsPath, 'utf8');
  
  const forbiddenKeywords = ['node:sqlite', 'sqliteQuery', 'sqliteTxQueue'];
  let foundForbidden = false;

  forbiddenKeywords.forEach(keyword => {
    if (dbJsContent.includes(keyword)) {
      console.error(`❌ 测试失败: db.js 中仍然包含 ${keyword}`);
      foundForbidden = true;
    }
  });

  if (foundForbidden) {
    exitCode = 1;
  } else {
    console.log('✅ SQLite fallback 及相关逻辑已被彻底移除');
  }
} catch (err) {
  console.error('❌ 读取 db.js 失败', err);
  exitCode = 1;
}

process.exit(exitCode);