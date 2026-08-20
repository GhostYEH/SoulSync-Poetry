const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('db/poetry.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
for (const t of tables) {
  const info = db.prepare(`PRAGMA table_info(${t.name})`).all();
  console.log(`\n== ${t.name} ==`);
  info.forEach(c => console.log(`  ${c.name} ${c.type} ${c.notnull?'NOT NULL':''} ${c.pk?'PK':''}`));
}
db.close();