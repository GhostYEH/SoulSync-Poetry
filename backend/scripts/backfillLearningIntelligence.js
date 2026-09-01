/**
 * 历史数据 Backfill 脚本
 * 从 wrong_questions / user_challenge_records / learning_records 生成历史 LearningEvent
 * 然后重建所有用户的 StudentKnowledgeState
 *
 * 运行: node scripts/backfillLearningIntelligence.js
 */
require('dotenv').config({ quiet: true });
const db = require('../src/utils/db');
const knowledgeModel = require('../src/services/knowledgeModelService');
const learningEventService = require('../src/services/learningEventService');
const masteryEngine = require('../src/services/masteryUpdateEngine');

async function backfill() {
  console.log('🚀 开始 Backfill 学习智能数据...\n');

  // 1. 初始化知识种子
  await knowledgeModel.seedKnowledgePoints();
  console.log('✅ 知识种子初始化\n');

  let eventCount = 0;
  let skipCount = 0;

  // 2. 从 user_challenge_records 生成答题事件（最可靠：有 is_correct 字段）
  console.log('📋 处理 user_challenge_records...');
  const challengeRecords = await db.all(
    `SELECT user_id, level, question_content, user_answer, correct_answer,
            is_correct, used_ai_help, answered_at, poem_title, poem_author
     FROM user_challenge_records ORDER BY answered_at ASC`
  );
  for (const r of challengeRecords) {
    if (!r.user_id || !r.question_content) { skipCount++; continue; }
    try {
      const result = await learningEventService.recordEvent({
        userId: r.user_id,
        eventType: r.is_correct === 1 ? learningEventService.EVENT_TYPES.CORRECT_ANSWER
                                       : learningEventService.EVENT_TYPES.WRONG_ANSWER,
        questionText: r.question_content,
        correct: r.is_correct === 1,
        difficulty: r.level || 3,
        hintCount: r.used_ai_help ? 1 : 0,
        eventKey: `backfill_cr:${r.user_id}:${r.level}:${r.question_content.slice(0, 50)}`,
        metadata: { source: 'backfill', userAnswer: r.user_answer, correctAnswer: r.correct_answer, poemTitle: r.poem_title },
      });
      if (!result.duplicated) eventCount++;
    } catch (e) { skipCount++; }
  }
  console.log(`  生成 ${eventCount} 条事件，跳过 ${skipCount} 条\n`);

  // 3. 从 learning_records 生成背诵事件（best_score 可作为正确性）
  console.log('📋 处理 learning_records (背诵)...');
  let reciteCount = 0;
  const learningRecords = await db.all(
    `SELECT user_id, poem_id, recite_attempts, best_score, last_view_time
     FROM learning_records WHERE recite_attempts > 0`
  );
  for (const r of learningRecords) {
    if (!r.user_id) continue;
    try {
      const correct = (r.best_score || 0) >= 80;
      const result = await learningEventService.recordEvent({
        userId: r.user_id,
        eventType: correct ? learningEventService.EVENT_TYPES.RECITE_POEM
                            : learningEventService.EVENT_TYPES.RECITATION_ERROR,
        poemId: r.poem_id,
        knowledgePoints: ['memorization'],
        correct,
        score: r.best_score || 0,
        difficulty: 3,
        eventKey: `backfill_lr:${r.user_id}:${r.poem_id}:recite`,
        metadata: { source: 'backfill', bestScore: r.best_score, attempts: r.recite_attempts },
      });
      if (!result.duplicated) reciteCount++;
    } catch (e) {}
  }
  console.log(`  生成 ${reciteCount} 条背诵事件\n`);

  // 4. 重建所有用户的知识状态
  console.log('🔄 重建 StudentKnowledgeState...');
  const users = await db.all('SELECT id FROM users');
  let rebuilt = 0;
  for (const u of users) {
    try {
      const result = await masteryEngine.rebuildStudentKnowledgeState(u.id);
      if (result.totalStates > 0) rebuilt++;
    } catch (e) {
      console.warn(`  用户 ${u.id} 重建失败:`, e.message);
    }
  }
  console.log(`  重建 ${rebuilt} 个用户的知识状态\n`);

  console.log(`🎉 Backfill 完成！`);
  console.log(`  总事件: ${eventCount + reciteCount}`);
  console.log(`  跳过: ${skipCount}`);
  console.log(`  重建用户: ${rebuilt}`);

  await db.close();
  process.exit(0);
}

backfill().catch(err => {
  console.error('❌ Backfill 失败:', err);
  process.exit(1);
});
