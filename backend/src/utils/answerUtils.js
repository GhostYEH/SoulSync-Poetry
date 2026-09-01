/**
 * Normalize answers used by every server-side review/judgement path.
 *
 * NFKC makes full-width and compatibility characters comparable, while
 * removing whitespace and punctuation keeps harmless formatting differences
 * from turning a correct poetry answer into a false negative.
 */
function normalizeAnswer(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\s\p{P}\p{S}]/gu, '');
}

function answersMatch(userAnswer, correctAnswer) {
  const normalizedUserAnswer = normalizeAnswer(userAnswer);
  const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);
  return normalizedUserAnswer.length > 0 && normalizedUserAnswer === normalizedCorrectAnswer;
}

module.exports = { normalizeAnswer, answersMatch };
