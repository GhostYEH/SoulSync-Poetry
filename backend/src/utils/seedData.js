const db = require('./db');
const bcrypt = require('bcrypt');

const SAMPLE_POEMS = [
  { title: '静夜思', author: '李白', dynasty: '唐' },
  { title: '春晓', author: '孟浩然', dynasty: '唐' },
  { title: '望庐山瀑布', author: '李白', dynasty: '唐' },
  { title: '黄鹤楼送孟浩然之广陵', author: '李白', dynasty: '唐' },
  { title: '江雪', author: '柳宗元', dynasty: '唐' },
  { title: '望岳', author: '杜甫', dynasty: '唐' },
  { title: '春望', author: '杜甫', dynasty: '唐' },
  { title: '赋得古原草送别', author: '白居易', dynasty: '唐' },
  { title: '钱塘湖春行', author: '白居易', dynasty: '唐' },
  { title: '凉州词', author: '王之涣', dynasty: '唐' },
  { title: '登鹳雀楼', author: '王之涣', dynasty: '唐' },
  { title: '清明', author: '杜牧', dynasty: '唐' },
  { title: '山行', author: '杜牧', dynasty: '唐' },
  { title: '泊秦淮', author: '杜牧', dynasty: '唐' },
  { title: '夜雨寄北', author: '李商隐', dynasty: '唐' },
  { title: '锦瑟', author: '李商隐', dynasty: '唐' },
  { title: '送元二使安西', author: '王维', dynasty: '唐' },
  { title: '九月九日忆山东兄弟', author: '王维', dynasty: '唐' },
  { title: '山居秋暝', author: '王维', dynasty: '唐' },
  { title: '鹿柴', author: '王维', dynasty: '唐' },
  { title: '相思', author: '王维', dynasty: '唐' },
  { title: '望天门山', author: '李白', dynasty: '唐' },
  { title: '早发白帝城', author: '李白', dynasty: '唐' },
  { title: '独坐敬亭山', author: '李白', dynasty: '唐' },
  { title: '秋浦歌', author: '李白', dynasty: '唐' },
  { title: '水调歌头', author: '苏轼', dynasty: '宋' },
  { title: '念奴娇·赤壁怀古', author: '苏轼', dynasty: '宋' },
  { title: '江城子·密州出猎', author: '苏轼', dynasty: '宋' },
  { title: '声声慢', author: '李清照', dynasty: '宋' },
  { title: '如梦令', author: '李清照', dynasty: '宋' }
];

const SAMPLE_QUESTIONS = [
  { question: '床前明月光，疑是地上霜。举头望明月，______。', answer: '低头思故乡', title: '静夜思', author: '李白' },
  { question: '春眠不觉晓，______闻啼鸟。', answer: '处处', title: '春晓', author: '孟浩然' },
  { question: '飞流直下三千尺，疑是______落九天。', answer: '银河', title: '望庐山瀑布', author: '李白' },
  { question: '孤帆远影碧空尽，唯见______天际流。', answer: '长江', title: '黄鹤楼送孟浩然之广陵', author: '李白' },
  { question: '千山鸟飞绝，______人踪灭。', answer: '万径', title: '江雪', author: '柳宗元' },
  { question: '会当凌绝顶，______众山小。', answer: '一览', title: '望岳', author: '杜甫' },
  { question: '国破山河在，城春______。', answer: '草木深', title: '春望', author: '杜甫' },
  { question: '野火烧不尽，______吹又生。', answer: '春风', title: '赋得古原草送别', author: '白居易' },
  { question: '欲穷千里目，______。', answer: '更上一层楼', title: '登鹳雀楼', author: '王之涣' },
  { question: '清明时节雨纷纷，路上行人______。', answer: '欲断魂', title: '清明', author: '杜牧' },
  { question: '停车坐爱枫林晚，霜叶______二月花。', answer: '红于', title: '山行', author: '杜牧' },
  { question: '商女不知亡国恨，______犹唱后庭花。', answer: '隔江', title: '泊秦淮', author: '杜牧' },
  { question: '君问归期未有期，______涨秋池。', answer: '巴山夜雨', title: '夜雨寄北', author: '李商隐' },
  { question: '劝君更尽一杯酒，西出阳关______。', answer: '无故人', title: '送元二使安西', author: '王维' },
  { question: '独在异乡为异客，每逢佳节______。', answer: '倍思亲', title: '九月九日忆山东兄弟', author: '王维' },
  { question: '空山新雨后，天气晚来______。', answer: '秋', title: '山居秋暝', author: '王维' },
  { question: '红豆生南国，春来发______。', answer: '几枝', title: '相思', author: '王维' },
  { question: '两岸青山相对出，______日边来。', answer: '孤帆一片', title: '望天门山', author: '李白' },
  { question: '两岸猿声啼不住，______已过万重山。', answer: '轻舟', title: '早发白帝城', author: '李白' },
  { question: '众鸟高飞尽，______独去闲。', answer: '孤云', title: '独坐敬亭山', author: '李白' }
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(getRandomInt(8, 22), getRandomInt(0, 59), getRandomInt(0, 59));
  return date.toISOString();
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedDatabase() {
  const client = await db.pool.connect();
  try {
    console.log('开始填充模拟数据...');
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash('123456', 10);
    const now = new Date().toISOString();

    const studentNames = [
      '张三', '李四', '王五', '赵六', '钱七',
      '孙八', '周九', '吴十', '郑十一', '王小明',
      '李小红', '张小华', '刘小芳', '陈小强', '杨小丽',
      '黄小军', '周小燕', '吴小鹏', '马小云', '朱小琳'
    ];

    const classes = [
      { id: 1, name: '一年级一班' },
      { id: 2, name: '一年级二班' },
      { id: 3, name: '二年级一班' }
    ];

    for (const cls of classes) {
      await client.query(
        'INSERT INTO classes (id, class_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [cls.id, cls.name]
      );
    }
    console.log('✓ 班级数据已填充');

    const studentIds = [];
    for (let i = 0; i < studentNames.length; i++) {
      const name = studentNames[i];
      const classId = classes[i % classes.length].id;
      const email = `student${i + 1}@example.com`;

      const result = await client.query(
        'INSERT INTO users (username, email, password_hash, class_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (username) DO UPDATE SET email=$2 RETURNING id',
        [name, email, passwordHash, classId, now, now]
      );
      const id = result.rows[0].id;
      studentIds.push({ id, name, classId });
    }
    console.log('✓ 学生数据已填充');

    const poemIds = [];
    const { rows: poemRows } = await client.query('SELECT id, title FROM poems');
    poemRows.forEach(row => poemIds.push(row.id));

    for (const student of studentIds) {
      const poemCount = getRandomInt(5, 15);
      const selectedPoems = [...poemIds].sort(() => Math.random() - 0.5).slice(0, poemCount);

      for (const poemId of selectedPoems) {
        const viewCount = getRandomInt(1, 10);
        const studyTime = getRandomInt(60, 600);
        const lastViewTime = getRandomDate(getRandomInt(0, 7));
        const bestScore = getRandomInt(60, 100);

        await client.query(
          'INSERT INTO learning_records (user_id, poem_id, view_count, study_time, last_view_time, best_score, total_score) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [student.id, poemId, viewCount, studyTime, lastViewTime, bestScore, bestScore * viewCount]
        );
      }
    }
    console.log('✓ 学习记录数据已填充');

    for (const student of studentIds) {
      const highestLevel = getRandomInt(10, 150);
      const currentLevel = Math.min(highestLevel + 1, 200);

      await client.query(
        'INSERT INTO user_challenge_progress (user_id, highest_level, current_challenge_level, last_challenge_time, total_ai_help_used, total_errors) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id) DO UPDATE SET highest_level=$2, current_challenge_level=$3, last_challenge_time=$4, total_ai_help_used=$5, total_errors=$6',
        [student.id, highestLevel, currentLevel, getRandomDate(getRandomInt(0, 3)), getRandomInt(0, 20), getRandomInt(0, 30)]
      );
    }
    console.log('✓ 闯关进度数据已填充');

    for (const student of studentIds) {
      const recordCount = getRandomInt(20, 100);

      for (let i = 0; i < recordCount; i++) {
        const question = getRandomElement(SAMPLE_QUESTIONS);
        const isCorrect = Math.random() > 0.3;
        const usedAiHelp = Math.random() > 0.7 ? 1 : 0;
        const answeredAt = getRandomDate(getRandomInt(0, 14));
        const level = getRandomInt(1, 150);

        await client.query(
          'INSERT INTO user_challenge_records (user_id, level, question_content, user_answer, correct_answer, is_correct, used_ai_help, answered_at, poem_title, poem_author) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [student.id, level, question.question, isCorrect ? question.answer : '错误答案', question.answer, isCorrect ? 1 : 0, usedAiHelp, answeredAt, question.title, question.author]
        );
      }
    }
    console.log('✓ 答题记录数据已填充');

    for (const student of studentIds) {
      const errorCount = getRandomInt(0, 10);

      for (let i = 0; i < errorCount; i++) {
        const question = getRandomElement(SAMPLE_QUESTIONS);
        const addedAt = getRandomDate(getRandomInt(0, 7));

        await client.query(
          'INSERT INTO wrong_questions (user_id, question, answer, user_answer, level, full_poem, author, title, wrong_count, last_wrong_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [student.id.toString(), question.question, question.answer, '错误答案', getRandomInt(1, 100), '完整诗句内容', question.author, question.title, getRandomInt(1, 3), addedAt]
        );
      }
    }
    console.log('✓ 错题本数据已填充');

    for (const student of studentIds) {
      const battleCount = getRandomInt(0, 20);

      for (let i = 0; i < battleCount; i++) {
        const opponent = studentIds[getRandomInt(0, studentIds.length - 1)];
        if (opponent.id === student.id) continue;

        const isWinner = Math.random() > 0.5;
        const totalRounds = getRandomInt(3, 15);
        const startedAt = getRandomDate(getRandomInt(0, 14));
        const endedAt = new Date(new Date(startedAt).getTime() + getRandomInt(60000, 600000)).toISOString();
        const keywords = ['月', '花', '春', '风', '山', '水', '云', '雨', '雪', '柳'];

        await client.query(
          'INSERT INTO feihua_battles (player1_id, player2_id, keyword, winner_id, loser_id, total_rounds, player1_throw_count, player2_throw_count, started_at, ended_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [student.id, opponent.id, getRandomElement(keywords), isWinner ? student.id : opponent.id, isWinner ? opponent.id : student.id, totalRounds, getRandomInt(2, totalRounds), getRandomInt(2, totalRounds), startedAt, endedAt]
        );
      }
    }
    console.log('✓ 飞花令对战数据已填充');

    for (const student of studentIds) {
      const checkinDays = getRandomInt(3, 14);

      for (let i = 0; i < checkinDays; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        await client.query(
          'INSERT INTO daily_checkin (user_id, date, checked_in_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [student.id, dateStr, date.toISOString()]
        );
      }
    }
    console.log('✓ 打卡数据已填充');

    for (const student of studentIds) {
      const activityCount = getRandomInt(10, 50);
      const activityTypes = ['view', 'recite', 'challenge', 'feihua', 'ai_explain', 'checkin'];

      for (let i = 0; i < activityCount; i++) {
        const activityType = getRandomElement(activityTypes);
        const createdAt = getRandomDate(getRandomInt(0, 14));
        const duration = getRandomInt(30, 600);

        await client.query(
          'INSERT INTO activity_logs (user_id, activity_type, duration_seconds, created_at) VALUES ($1, $2, $3, $4)',
          [student.id, activityType, duration, createdAt]
        );
      }
    }
    console.log('✓ 活动日志数据已填充');

    for (const student of studentIds) {
      const collectionCount = getRandomInt(2, 8);
      const selectedPoems = [...poemIds].sort(() => Math.random() - 0.5).slice(0, collectionCount);

      for (const poemId of selectedPoems) {
        await client.query(
          'INSERT INTO collections (user_id, poem_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [student.id, poemId, getRandomDate(getRandomInt(0, 14))]
        );
      }
    }
    console.log('✓ 收藏数据已填充');

    for (const student of studentIds) {
      const creationCount = getRandomInt(0, 5);
      const genres = ['五言绝句', '七言绝句', '五言律诗', '七言律诗', '词'];
      const themes = ['山水', '田园', '送别', '思乡', '咏物', '抒情'];

      for (let i = 0; i < creationCount; i++) {
        await client.query(
          'INSERT INTO creations (user_id, title, content, type, score, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [student.id, `创作${i + 1}`, '这是一首创作的诗词内容...', getRandomElement(genres), getRandomInt(60, 95), getRandomDate(getRandomInt(0, 14))]
        );
      }
    }
    console.log('✓ 创作数据已填充');

    await client.query('COMMIT');
    console.log('✅ 模拟数据填充完成！');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('填充数据失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { seedDatabase };
