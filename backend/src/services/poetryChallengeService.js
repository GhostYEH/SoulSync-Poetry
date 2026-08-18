const db = require('../utils/db');

async function startChallenge(userId, challengeType = 'random', options = {}) {
  const { count = 10, difficulty } = options;

  let questions;

  switch (challengeType) {
    case 'fill_blank':
      questions = await generateFillBlankQuestions(count, difficulty);
      break;
    case 'author_match':
      questions = await generateAuthorMatchQuestions(count);
      break;
    case 'next_sentence':
      questions = await generateNextSentenceQuestions(count);
      break;
    default:
      questions = await generateRandomQuestions(count);
  }

  const result = await db.transaction(async (tx) => {
    const insResult = await tx.run(
      `INSERT INTO poetry_challenges (user_id, challenge_type, total_questions, started_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id`,
      [userId, challengeType, questions.length]
    );

    const challengeId = insResult.rows[0].id;

    for (let i = 0; i < questions.length; i++) {
      await tx.run(
        `INSERT INTO challenge_questions (challenge_id, question_index, poem_id, question_type, question_text, correct_answer, options)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [challengeId, i, questions[i].poem_id, questions[i].type,
          questions[i].question, questions[i].answer,
          questions[i].options ? JSON.stringify(questions[i].options) : null]
      );
    }

    return challengeId;
  });

  const challengeId = result;

  return {
    challengeId,
    challengeType,
    totalQuestions: questions.length,
    questions: questions.map((q, i) => ({
      index: i,
      type: q.type,
      question: q.question,
      options: q.options || null,
      poem_id: q.poem_id
    }))
  };
}

async function submitChallengeAnswer(userId, challengeId, questionIndex, userAnswer) {
  const question = await db.get(
    'SELECT * FROM challenge_questions WHERE challenge_id = $1 AND question_index = $2',
    [challengeId, questionIndex]
  );

  if (!question) {
    throw new Error('题目不存在');
  }

  const isCorrect = checkAnswer(userAnswer, question.correct_answer);

  await db.run(
    `UPDATE challenge_questions
     SET user_answer = $1, is_correct = $2, answered_at = CURRENT_TIMESTAMP
     WHERE challenge_id = $3 AND question_index = $4`,
    [userAnswer, isCorrect, challengeId, questionIndex]
  );

  return {
    isCorrect,
    correctAnswer: question.correct_answer,
    questionIndex
  };
}

function checkAnswer(userAnswer, correctAnswer) {
  if (!userAnswer || !correctAnswer) return false;
  const normalize = (str) => str.replace(/[\s，。、；：""''！？,.!?;:'"]/g, '').trim();
  return normalize(userAnswer) === normalize(correctAnswer);
}

async function completeChallenge(userId, challengeId) {
  const questions = await db.all(
    'SELECT * FROM challenge_questions WHERE challenge_id = $1',
    [challengeId]
  );

  const correctCount = questions.filter(q => q.is_correct).length;
  const totalQuestions = questions.length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  await db.run(
    `UPDATE poetry_challenges
     SET score = $1, correct_count = $2, completed_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [score, correctCount, challengeId]
  );

  return {
    challengeId,
    score,
    correctCount,
    totalQuestions,
    details: questions.map(q => ({
      question: q.question_text,
      userAnswer: q.user_answer,
      correctAnswer: q.correct_answer,
      isCorrect: q.is_correct
    }))
  };
}

async function getChallengeHistory(userId, limit = 20) {
  return db.all(
    `SELECT pc.*, 
       (SELECT COUNT(*) FROM challenge_questions WHERE challenge_id = pc.id AND is_correct = true) as correct_count
     FROM poetry_challenges pc
     WHERE pc.user_id = $1
     ORDER BY pc.started_at DESC
     LIMIT $2`,
    [userId, limit]
  );
}

async function getChallengeStats(userId) {
  const row = await db.get(
    `SELECT
       COUNT(*) as total_challenges,
       AVG(score) as avg_score,
       MAX(score) as best_score,
       SUM(correct_count) as total_correct,
       SUM(total_questions) as total_questions
     FROM poetry_challenges
     WHERE user_id = $1 AND completed_at IS NOT NULL`,
    [userId]
  );

  return {
    totalChallenges: row?.total_challenges || 0,
    averageScore: Math.round(row?.avg_score || 0),
    bestScore: row?.best_score || 0,
    totalCorrect: row?.total_correct || 0,
    totalQuestions: row?.total_questions || 0,
    accuracy: row?.total_questions > 0
      ? Math.round((row.total_correct / row.total_questions) * 100)
      : 0
  };
}

async function generateFillBlankQuestions(count, difficulty) {
  let rows;
  if (difficulty) {
    rows = await db.all(
      'SELECT * FROM poems WHERE difficulty = $1 ORDER BY RANDOM() LIMIT $2',
      [difficulty, count]
    );
  } else {
    rows = await db.all(
      'SELECT * FROM poems ORDER BY RANDOM() LIMIT $1',
      [count]
    );
  }

  return rows.map(poem => {
    const content = poem.content;
    const lines = content.split(/[，。；]/).filter(l => l.trim());
    if (lines.length === 0) {
      return {
        poem_id: poem.id,
        type: 'fill_blank',
        question: `请补全《${poem.title}》中的诗句`,
        answer: content
      };
    }
    const targetLine = lines[Math.floor(Math.random() * lines.length)];
    const blankIndex = content.indexOf(targetLine);
    const displayContent = content.substring(0, blankIndex) + '____' + content.substring(blankIndex + targetLine.length);
    return {
      poem_id: poem.id,
      type: 'fill_blank',
      question: `请补全《${poem.title}》（${poem.author}）中的空白：${displayContent}`,
      answer: targetLine
    };
  });
}

async function generateAuthorMatchQuestions(count) {
  const poems = await db.all(
    'SELECT * FROM poems ORDER BY RANDOM() LIMIT $1',
    [count * 4]
  );

  const questions = [];
  const used = new Set();

  for (const poem of poems) {
    if (questions.length >= count) break;
    if (used.has(poem.id)) continue;

    const options = [poem.author];
    const otherPoems = poems.filter(p => p.author !== poem.author && !used.has(p.id));
    for (let i = 0; i < Math.min(3, otherPoems.length); i++) {
      options.push(otherPoems[i].author);
    }

    if (options.length < 2) continue;

    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    used.add(poem.id);
    questions.push({
      poem_id: poem.id,
      type: 'author_match',
      question: `《${poem.title}》的作者是谁？`,
      answer: poem.author,
      options
    });
  }

  return questions;
}

async function generateNextSentenceQuestions(count) {
  const rows = await db.all(
    'SELECT * FROM poems ORDER BY RANDOM() LIMIT $1',
    [count]
  );

  return rows.map(poem => {
    const content = poem.content;
    const lines = content.split(/[，。；]/).filter(l => l.trim());
    if (lines.length < 2) {
      return {
        poem_id: poem.id,
        type: 'next_sentence',
        question: `请接出《${poem.title}》的下一句：${lines[0] || content}`,
        answer: lines[1] || ''
      };
    }
    const randomIdx = Math.floor(Math.random() * (lines.length - 1));
    return {
      poem_id: poem.id,
      type: 'next_sentence',
      question: `请接出《${poem.title}》（${poem.author}）的下一句：${lines[randomIdx]}`,
      answer: lines[randomIdx + 1]
    };
  });
}

async function generateRandomQuestions(count) {
  const types = ['fill_blank', 'author_match', 'next_sentence'];
  const questions = [];
  const perType = Math.ceil(count / types.length);

  for (const type of types) {
    let typeQuestions;
    switch (type) {
      case 'fill_blank':
        typeQuestions = await generateFillBlankQuestions(perType);
        break;
      case 'author_match':
        typeQuestions = await generateAuthorMatchQuestions(perType);
        break;
      case 'next_sentence':
        typeQuestions = await generateNextSentenceQuestions(perType);
        break;
    }
    questions.push(...typeQuestions);
  }

  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return questions.slice(0, count);
}

module.exports = {
  startChallenge,
  submitChallengeAnswer,
  completeChallenge,
  getChallengeHistory,
  getChallengeStats
};
