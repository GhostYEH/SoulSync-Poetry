const MASTER_REVIEW_COUNT = 5;
const MAX_INTERVAL_DAYS = 60;

function toLocalDate(date = new Date()) {
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  }
  return new Date(date);
}

function dateKey(date = new Date()) {
  const value = toLocalDate(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function addDays(date, days) {
  const value = toLocalDate(date);
  value.setHours(12, 0, 0, 0);
  value.setDate(value.getDate() + Number(days || 0));
  return dateKey(value);
}

function parseCorrect(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

/**
 * One policy for question-level and poem-level reviews:
 * - a correct answer advances the successful-review streak;
 * - an incorrect answer resets it and keeps the item due today;
 * - intervals double from the initial 1-day interval, capped at 60 days;
 * - five successful reviews mark the item mastered.
 */
function calculateReviewState({ reviewCount = 0, correctStreak = 0, intervalDays = 1, correct, mastered = false, today = new Date() }) {
  const previousSuccesses = Math.max(Number(reviewCount) || 0, Number(correctStreak) || 0);
  if (correct && mastered) {
    return {
      reviewCount: Math.max(previousSuccesses, MASTER_REVIEW_COUNT),
      correctStreak: Math.max(previousSuccesses, MASTER_REVIEW_COUNT),
      intervalDays: Math.min(MAX_INTERVAL_DAYS, Math.max(1, Number(intervalDays) || 1)),
      mastered: true,
      nextReview: null,
    };
  }
  const nextReviewCount = correct ? previousSuccesses + 1 : 0;
  const nextIntervalDays = correct
    ? Math.min(MAX_INTERVAL_DAYS, Math.max(2, (Number(intervalDays) || 1) * 2))
    : 1;

  return {
    reviewCount: nextReviewCount,
    correctStreak: nextReviewCount,
    intervalDays: nextIntervalDays,
    mastered: correct && nextReviewCount >= MASTER_REVIEW_COUNT,
    nextReview: correct ? addDays(today, nextIntervalDays) : dateKey(today),
  };
}

module.exports = {
  MASTER_REVIEW_COUNT,
  MAX_INTERVAL_DAYS,
  dateKey,
  addDays,
  parseCorrect,
  calculateReviewState,
};
