export const PERFECT_PVP_SCORE = 7

export type PvpResult = "win" | "loss" | "draw"

const RESULT_XP: Record<PvpResult, number> = {
  win: 100,
  loss: 30,
  draw: 50,
}

const PERFECT_SCORE_BONUS_XP = 20
const XP_BOOST_MULTIPLIER = 1.2

export function calculatePvpScore(
  picks: Array<{ isCorrect: boolean | null }>,
): number {
  return picks.filter((pick) => pick.isCorrect === true).length
}

export function calculatePvpResultXp(
  result: PvpResult,
  score: number,
  boostActive: boolean,
): number {
  const perfectBonus = score === PERFECT_PVP_SCORE ? PERFECT_SCORE_BONUS_XP : 0
  const resultXp = RESULT_XP[result] + perfectBonus

  return Math.round(resultXp * (boostActive ? XP_BOOST_MULTIPLIER : 1))
}
