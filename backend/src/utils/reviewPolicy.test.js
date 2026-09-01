const test = require('node:test');
const assert = require('node:assert/strict');
const { answersMatch, normalizeAnswer } = require('./answerUtils');
const { calculateReviewState } = require('./reviewPolicy');

test('answer normalization accepts harmless full-width, punctuation, and whitespace differences', () => {
  assert.equal(normalizeAnswer('Ａ。\u00a0长江'), 'A长江');
  assert.equal(answersMatch('Ａ。', 'A'), true);
  assert.equal(answersMatch(' 长江. ', '长江'), true);
  assert.equal(answersMatch('', ' '), false);
});

test('review policy doubles intervals and masters after five consecutive correct reviews', () => {
  const intervals = [];
  let state = { reviewCount: 0, correctStreak: 0, intervalDays: 1 };
  for (let index = 0; index < 5; index += 1) {
    state = calculateReviewState({ ...state, correct: true, today: '2026-09-01' });
    intervals.push(state.intervalDays);
  }
  assert.deepEqual(intervals, [2, 4, 8, 16, 32]);
  assert.equal(state.reviewCount, 5);
  assert.equal(state.correctStreak, 5);
  assert.equal(state.mastered, true);
  assert.equal(state.nextReview, '2026-10-03');
});

test('an incorrect review resets streak and returns the item to today', () => {
  const state = calculateReviewState({
    reviewCount: 4,
    correctStreak: 4,
    intervalDays: 16,
    correct: false,
    today: '2026-09-01',
  });
  assert.deepEqual(state, {
    reviewCount: 0,
    correctStreak: 0,
    intervalDays: 1,
    mastered: false,
    nextReview: '2026-09-01',
  });
});

test('a mastered item stays mastered when revisited from a direct review link', () => {
  const state = calculateReviewState({
    reviewCount: 0,
    correctStreak: 0,
    intervalDays: 1,
    mastered: true,
    correct: true,
    today: new Date(2026, 8, 2, 12),
  });

  assert.equal(state.mastered, true);
  assert.equal(state.reviewCount, 5);
  assert.equal(state.correctStreak, 5);
  assert.equal(state.nextReview, null);
});
