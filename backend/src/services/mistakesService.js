const db = require('../utils/db');

let mistakes = {};

function initMistakes() {
  console.log('错题本服务初始化完成');
  return;
}

async function addMistake(userId, poemId, score, poemTitle, poemAuthor, originalText, inputText) {
  const row = await db.get('SELECT * FROM mistakes WHERE user_id = $1 AND poem_id = $2', [userId, poemId]);

  if (row) {
    const updatedAt = new Date().toISOString();
    await db.run(
      'UPDATE mistakes SET score = $1, updated_at = $2, original_text = $3, input_text = $4 WHERE id = $5 AND user_id = $6',
      [score, updatedAt, originalText, inputText, row.id, userId]
    );

    const updatedMistake = {
      id: row.id,
      user_id: row.user_id,
      poem_id: row.poem_id,
      mistake_content: row.mistake_content,
      mistake_type: row.mistake_type,
      created_at: row.created_at,
      score: score,
      updated_at: updatedAt,
      original_text: originalText,
      input_text: inputText
    };

    const cacheKey = String(userId) + ':' + String(poemId);
    mistakes[cacheKey] = updatedMistake;

    return updatedMistake;
  }

  const now = new Date().toISOString();
  let mistakeContent = '得分: ' + score + ', 原文: ' + originalText.substring(0, 50) + '...';
  const result = await db.run(
    'INSERT INTO mistakes (user_id, poem_id, mistake_content, mistake_type, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [userId, poemId, mistakeContent, '背诵错误', now]
  );

  const newMistake = {
    id: result.rows[0].id,
    user_id: userId,
    poem_id: poemId,
    score: score,
    created_at: now,
    updated_at: now,
    poem_title: poemTitle,
    poem_author: poemAuthor,
    original_text: originalText,
    input_text: inputText
  };

  const cacheKey = String(userId) + ':' + String(poemId);
  mistakes[cacheKey] = newMistake;

  return newMistake;
}

async function getMistakes(userId) {
  const rows = await db.all(
    'SELECT m.*, p.title as poem_title, p.author as poem_author FROM mistakes m JOIN poems p ON m.poem_id = p.id WHERE m.user_id = $1 ORDER BY m.created_at DESC',
    [userId]
  );

  for (let i = 0; i < rows.length; i++) {
    const mistake = rows[i];
    const cacheKey = String(userId) + ':' + String(mistake.poem_id);
    mistakes[cacheKey] = mistake;
  }

  return rows;
}

async function deleteMistake(userId, mistakeId) {
  const row = await db.get('SELECT * FROM mistakes WHERE id = $1 AND user_id = $2', [mistakeId, userId]);

  if (!row) {
    return false;
  }

  const result = await db.run('DELETE FROM mistakes WHERE id = $1 AND user_id = $2', [mistakeId, userId]);
  if (result.rowCount > 0) {
    const cacheKey = String(userId) + ':' + String(row.poem_id);
    delete mistakes[cacheKey];
    return true;
  } else {
    return false;
  }
}

async function checkAndHandleMistake(userId, poemId, score, poemTitle, poemAuthor, originalText, inputText) {
  if (score < 90) {
    return addMistake(userId, poemId, score, poemTitle, poemAuthor, originalText, inputText);
  }

  await db.run('DELETE FROM mistakes WHERE user_id = $1 AND poem_id = $2', [userId, poemId]);

  const cacheKey = String(userId) + ':' + String(poemId);
  delete mistakes[cacheKey];
  return null;
}

module.exports = {
  initMistakes: initMistakes,
  addMistake: addMistake,
  getMistakes: getMistakes,
  deleteMistake: deleteMistake,
  checkAndHandleMistake: checkAndHandleMistake
};
