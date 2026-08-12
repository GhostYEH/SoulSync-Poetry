/**
 * 修复 Studentdemo 账号的收藏和学习记录
 * node backend/src/utils/fixStudentdemo.js
 */
const db = require('./db');

async function main() {
  const client = await db.pool.connect();
  try {
    console.log('开始修复 Studentdemo 账号的收藏和学习记录...\n');
    await client.query('BEGIN');

    const { rows: [user] } = await client.query('SELECT id, username FROM users WHERE username=$1', ['Studentdemo']);
    if (!user) {
      console.log('未找到 Studentdemo 用户');
      throw new Error('用户不存在');
    }
    const uid = user.id;
    console.log('找到用户: ' + user.username + ' (ID: ' + uid + ')');

    const { rows: poems } = await client.query('SELECT id, title, author, dynasty FROM poems');
    console.log('数据库中共有 ' + poems.length + ' 首诗词');

    const { rows: existingCollections } = await client.query('SELECT c.*, p.title FROM collections c LEFT JOIN poems p ON c.poem_id = p.id WHERE c.user_id=$1', [uid]);
    console.log('\n当前收藏记录: ' + existingCollections.length + ' 条');
    existingCollections.forEach(c => {
      console.log('  - poem_id: ' + c.poem_id + ', title: ' + (c.title || '无题'));
    });

    const { rows: existingLearning } = await client.query('SELECT lr.*, p.title FROM learning_records lr LEFT JOIN poems p ON lr.poem_id = p.id WHERE lr.user_id=$1', [uid]);
    console.log('\n当前学习记录: ' + existingLearning.length + ' 条');
    existingLearning.forEach(l => {
      console.log('  - poem_id: ' + l.poem_id + ', title: ' + (l.title || '无题'));
    });

    console.log('\n正在删除旧的收藏和学习记录...');
    await client.query('DELETE FROM collections WHERE user_id=$1', [uid]);
    await client.query('DELETE FROM learning_records WHERE user_id=$1', [uid]);
    console.log('删除完成');

    const tang = poems.filter(p => p.dynasty === '唐').slice(0, 8);
    const song = poems.filter(p => p.dynasty === '宋').slice(0, 5);
    const qing = poems.filter(p => p.dynasty === '清').slice(0, 3);
    const modern = poems.filter(p => p.dynasty === '近代').slice(0, 2);
    const learnPoems = [...tang, ...song, ...qing, ...modern];

    console.log('\n准备添加的学习诗词:');
    learnPoems.forEach(p => {
      console.log('  - [' + p.dynasty + '] ' + p.title + ' (' + p.author + ')');
    });

    const now = new Date();
    function recentTime(maxDays) {
      const d = new Date();
      d.setDate(d.getDate() - Math.floor(Math.random() * (maxDays + 1)));
      d.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
      return d.toISOString();
    }

    console.log('\n正在添加学习记录...');
    for (const poem of learnPoems) {
      const viewCount = Math.floor(Math.random() * 15) + 3;
      const aiCount = Math.floor(Math.random() * 5);
      const reciteAttempts = Math.floor(Math.random() * 8) + 2;
      const bestScore = Math.floor(Math.random() * 35) + 65;
      const studyTime = Math.floor(Math.random() * 600) + 100;
      const lastView = recentTime(7);

      await client.query(
        'INSERT INTO learning_records (user_id, poem_id, view_count, ai_explain_count, recite_attempts, best_score, total_score, study_time, last_view_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [uid, poem.id, viewCount, aiCount, reciteAttempts, bestScore, bestScore * reciteAttempts, studyTime, lastView]
      );
    }
    console.log('学习记录添加完成: ' + learnPoems.length + ' 条');

    console.log('\n正在添加收藏记录...');
    const collectPoems = learnPoems.slice(0, 10);
    for (const poem of collectPoems) {
      await client.query(
        'INSERT INTO collections (user_id, poem_id, created_at) VALUES ($1,$2,$3)',
        [uid, poem.id, recentTime(10)]
      );
    }
    console.log('收藏记录添加完成: ' + collectPoems.length + ' 条');

    const { rows: newCollections } = await client.query(
      'SELECT c.*, p.title, p.author FROM collections c JOIN poems p ON c.poem_id = p.id WHERE c.user_id=$1',
      [uid]
    );
    console.log('\n验证收藏记录:');
    newCollections.forEach(c => {
      console.log('  - ' + c.title + ' (' + c.author + ')');
    });

    const { rows: newLearning } = await client.query(
      'SELECT lr.*, p.title, p.author FROM learning_records lr JOIN poems p ON lr.poem_id = p.id WHERE lr.user_id=$1',
      [uid]
    );
    console.log('\n验证学习记录:');
    newLearning.forEach(l => {
      console.log('  - ' + l.title + ' (' + l.author + ') - 查看次数: ' + l.view_count);
    });

    await client.query('COMMIT');
    console.log('\n========================================');
    console.log('  Studentdemo 数据修复完成！');
    console.log('  账号: Studentdemo');
    console.log('  收藏: ' + newCollections.length + ' 首');
    console.log('  学习记录: ' + newLearning.length + ' 条');
    console.log('========================================');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
