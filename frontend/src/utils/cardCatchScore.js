/**
 * 诗词大富翁的计分规则。
 *
 * - 接对：基础 +1，可叠加既有连击奖励
 * - 接错：-1，但不会低于 0
 * - 未接：分数不变
 */
export function applyCardCatchScore(currentScore, outcome, comboBonus = 0) {
  const score = Math.max(0, Number(currentScore) || 0)

  if (outcome === 'correct') {
    return score + 1 + Math.max(0, Number(comboBonus) || 0)
  }

  if (outcome === 'wrong') {
    return Math.max(0, score - 1)
  }

  return score
}

export default applyCardCatchScore
