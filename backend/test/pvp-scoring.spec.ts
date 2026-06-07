import {
  calculatePvpResultXp,
  calculatePvpScore,
} from "../src/modules/pvp/pvp-scoring"

describe("PvP scoring", () => {
  it("awards one match point for each correct pick", () => {
    const picks = [
      { isCorrect: true },
      { isCorrect: false },
      { isCorrect: true },
      { isCorrect: null },
      { isCorrect: false },
      { isCorrect: true },
      { isCorrect: false },
    ]

    expect(calculatePvpScore(picks)).toBe(3)
  })

  it("awards fixed XP based on the match result", () => {
    expect(calculatePvpResultXp("win", 4, false)).toBe(100)
    expect(calculatePvpResultXp("loss", 3, false)).toBe(30)
    expect(calculatePvpResultXp("draw", 5, false)).toBe(50)
  })

  it("adds 20 XP for a perfect score", () => {
    expect(calculatePvpResultXp("win", 7, false)).toBe(120)
    expect(calculatePvpResultXp("draw", 7, false)).toBe(70)
  })

  it("applies the 1.2x boost after the perfect-score bonus", () => {
    expect(calculatePvpResultXp("win", 4, true)).toBe(120)
    expect(calculatePvpResultXp("loss", 3, true)).toBe(36)
    expect(calculatePvpResultXp("draw", 5, true)).toBe(60)
    expect(calculatePvpResultXp("win", 7, true)).toBe(144)
    expect(calculatePvpResultXp("draw", 7, true)).toBe(84)
  })
})
