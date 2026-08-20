import { ConfigService } from "@nestjs/config"
import { ServiceUnavailableException } from "@nestjs/common"
import {
  MatchStatistics,
  SportsOracleService,
} from "../src/modules/agent/sports-oracle.service"

describe("SportsOracleService", () => {
  const config = {
    get: jest.fn((key: string) =>
      key === "API_FOOTBALL_KEY" ? "test-api-key" : null,
    ),
  } as unknown as ConfigService
  let service: SportsOracleService

  const stats = (
    overrides: Partial<MatchStatistics> = {},
  ): MatchStatistics => ({
    fixtureId: 123,
    homeTeam: "Arsenal",
    awayTeam: "Liverpool",
    status: "FT",
    homeGoals: 1,
    awayGoals: 2,
    homeCorners: 4,
    awayCorners: 6,
    homeYellowCards: 2,
    awayYellowCards: 1,
    homeRedCards: 0,
    awayRedCards: 0,
    homeOffsides: 1,
    awayOffsides: 2,
    homeFouls: 8,
    awayFouls: 10,
    firstTeamToScore: "Arsenal",
    firstGoalMinute: 12,
    availableStatistics: [
      "corners",
      "yellow_cards",
      "red_cards",
      "offsides",
      "fouls",
    ],
    eventsAvailable: true,
    sourceUrl: "https://example.test/fixture/123",
    ...overrides,
  })

  beforeEach(() => {
    jest.restoreAllMocks()
    service = new SportsOracleService(config)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("returns the exact stored match-winner outcome and index", () => {
    const result = service.evaluateProposition(
      {
        question: "Arsenal vs Liverpool - Match Winner",
        optionGroup: "major",
        outcomes: [
          "Arsenal wins the match",
          "Match ends in a draw",
          "Liverpool wins the match",
        ],
      },
      stats(),
    )

    expect(result.outcome).toBe("Liverpool wins the match")
    expect(result.outcomeIndex).toBe(2)
    expect(result.isConfident).toBe(true)
  })

  it("maps totals to the exact under outcome without adding display text", () => {
    const result = service.evaluateProposition(
      {
        question: "Arsenal vs Liverpool - Total Goals",
        optionGroup: "goals",
        handicap: 3.5,
        outcomes: ["Total Goals Over 3.5", "Total Goals Under 3.5"],
      },
      stats(),
    )

    expect(result.outcome).toBe("Total Goals Under 3.5")
    expect(result.outcomeIndex).toBe(1)
  })

  it.each([
    [
      "corners",
      ["Total Corners Over 9.5", "Total Corners Under 9.5"],
      "Total Corners Over 9.5",
    ],
    [
      "yellow_cards",
      ["Total Yellow Cards Over 3.5", "Total Yellow Cards Under 3.5"],
      "Total Yellow Cards Over 3.5",
    ],
    [
      "offsides",
      ["Total Offsides Over 3.5", "Total Offsides Under 3.5"],
      "Total Offsides Under 3.5",
    ],
  ])(
    "resolves the verified fixture's %s market to an exact stored outcome",
    (optionGroup, outcomes, expectedOutcome) => {
      const result = service.evaluateProposition(
        {
          question: `Sporting Kansas City vs St. Louis City - ${optionGroup}`,
          optionGroup,
          handicap: optionGroup === "corners" ? 9.5 : 3.5,
          outcomes,
        },
        stats({
          homeTeam: "Sporting Kansas City",
          awayTeam: "St. Louis City",
          homeGoals: 3,
          awayGoals: 1,
          homeCorners: 9,
          awayCorners: 2,
          homeYellowCards: 2,
          awayYellowCards: 2,
          homeOffsides: 0,
          awayOffsides: 1,
        }),
      )

      expect(result.outcome).toBe(expectedOutcome)
      expect(result.isConfident).toBe(true)
    },
  )

  it.each([
    [
      undefined,
      "Total Corners",
      ["Total Corners Over 9.5", "Total Corners Under 9.5"],
      9.5,
      "Total Corners Over 9.5",
    ],
    [
      "totals",
      "Total Yellow Cards",
      ["Total Yellow Cards Over 3.5", "Total Yellow Cards Under 3.5"],
      3.5,
      "Total Yellow Cards Over 3.5",
    ],
    [
      "unique_total_offsides",
      "Total Offsides",
      ["Total Offsides Over 3.5", "Total Offsides Under 3.5"],
      3.5,
      "Total Offsides Under 3.5",
    ],
  ])(
    "infers a statistic market when its stored group is missing or incorrect (%s)",
    (optionGroup, label, outcomes, handicap, expectedOutcome) => {
      const result = service.evaluateProposition(
        {
          question: `Sporting Kansas City vs St. Louis City - ${label}`,
          optionGroup,
          handicap,
          outcomes,
        },
        stats({
          homeTeam: "Sporting Kansas City",
          awayTeam: "St. Louis City",
          homeCorners: 9,
          awayCorners: 2,
          homeYellowCards: 2,
          awayYellowCards: 2,
          homeOffsides: 0,
          awayOffsides: 1,
        }),
      )

      expect(result.outcome).toBe(expectedOutcome)
      expect(result.isConfident).toBe(true)
    },
  )

  it("refuses to evaluate a fixture that is still live", () => {
    const result = service.evaluateProposition(
      {
        question: "Arsenal vs Liverpool - Match Winner",
        optionGroup: "major",
        outcomes: [
          "Arsenal wins the match",
          "Match ends in a draw",
          "Liverpool wins the match",
        ],
      },
      stats({ status: "2H" }),
    )

    expect(result.outcome).toBe("INVALID")
    expect(result.isConfident).toBe(false)
  })

  it("refuses a statistics proposition when provider coverage is missing", () => {
    const result = service.evaluateProposition(
      {
        question: "Arsenal vs Liverpool - Total Corners",
        optionGroup: "corners",
        handicap: 9.5,
        outcomes: ["Total Corners Over 9.5", "Total Corners Under 9.5"],
      },
      stats({ availableStatistics: [] }),
    )

    expect(result.outcome).toBe("INVALID")
    expect(result.reasoning).toContain("unavailable")
  })

  it("resolves yellow cards from fixture events when team statistics are absent", () => {
    const result = service.evaluateProposition(
      {
        question: "Corpus Christi vs NY Cosmos - Total Yellow Cards",
        optionGroup: "yellow_cards",
        handicap: 3.5,
        outcomes: [
          "Total Yellow Cards Over 3.5",
          "Total Yellow Cards Under 3.5",
        ],
      },
      stats({
        homeTeam: "Corpus Christi",
        awayTeam: "NY Cosmos",
        homeYellowCards: 3,
        awayYellowCards: 4,
        availableStatistics: [],
        eventsAvailable: true,
      }),
    )

    expect(result.outcome).toBe("Total Yellow Cards Over 3.5")
    expect(result.outcomeIndex).toBe(0)
    expect(result.isConfident).toBe(true)
  })

  it("loads the dedicated statistics endpoint when fixture statistics are omitted", async () => {
    jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes("/fixtures/statistics?fixture=1493950")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            errors: [],
            response: [
              {
                team: { name: "Corpus Christi" },
                statistics: [
                  { type: "Corner Kicks", value: 4 },
                  { type: "Offsides", value: 1 },
                ],
              },
              {
                team: { name: "NY Cosmos" },
                statistics: [
                  { type: "Corner Kicks", value: 6 },
                  { type: "Offsides", value: 2 },
                ],
              },
            ],
          }),
        } as Response
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          errors: [],
          response: [
            {
              fixture: { id: 1493950, status: { short: "FT" } },
              teams: {
                home: { name: "Corpus Christi" },
                away: { name: "NY Cosmos" },
              },
              goals: { home: 0, away: 2 },
              events: [],
              statistics: [],
            },
          ],
        }),
      } as Response
    })

    const result = await service.queryApiFootballById(1493950, [
      "corners",
      "offsides",
    ])

    expect(result?.homeCorners).toBe(4)
    expect(result?.awayCorners).toBe(6)
    expect(result?.homeOffsides).toBe(1)
    expect(result?.awayOffsides).toBe(2)
    expect(result?.availableStatistics).toEqual(
      expect.arrayContaining(["corners", "offsides"]),
    )
  })

  it("does not spend a statistics request when no detailed market requires it", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        errors: [],
        response: [
          {
            fixture: { id: 1493950, status: { short: "FT" } },
            teams: {
              home: { name: "Corpus Christi" },
              away: { name: "NY Cosmos" },
            },
            goals: { home: 0, away: 2 },
            events: [],
            statistics: [],
          },
        ],
      }),
    } as Response)

    await service.queryApiFootballById(1493950)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://v3.football.api-sports.io/fixtures?id=1493950",
      expect.any(Object),
    )
  })

  it("stops issuing requests after API-Football reports exhausted daily quota", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        errors: {
          requests:
            "You have reached the request limit for the day, upgrade your plan.",
        },
        response: [],
      }),
    } as Response)

    await expect(
      service.fetchMatchStats(
        "Corpus Christi vs NY Cosmos",
        undefined,
        1493950,
      ),
    ).rejects.toThrow("daily quota is exhausted")
    await expect(
      service.fetchMatchStats(
        "Corpus Christi vs NY Cosmos",
        undefined,
        1493951,
      ),
    ).rejects.toThrow("daily quota is exhausted")

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("caches empty schedule responses", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ errors: [], response: [] }),
    } as Response)

    await service.fetchApiFootballFixtures("upcoming")
    await service.fetchApiFootballFixtures("upcoming")

    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it("reuses a persisted finished fixture after a service restart", async () => {
    let storedEntry: any = null
    const cacheModel = {
      findOne: jest.fn(() => ({
        lean: () => ({ exec: async () => storedEntry }),
      })),
      updateOne: jest.fn(async ({ key }, update) => {
        storedEntry = { key, ...update.$set }
      }),
    }
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        errors: [],
        response: [
          {
            fixture: { id: 1493950, status: { short: "FT" } },
            teams: {
              home: { name: "Corpus Christi" },
              away: { name: "NY Cosmos" },
            },
            goals: { home: 0, away: 2 },
            events: [],
            statistics: [],
          },
        ],
      }),
    } as Response)
    const firstService = new SportsOracleService(config, cacheModel as any)
    const restartedService = new SportsOracleService(config, cacheModel as any)

    await firstService.fetchMatchStats(
      "Corpus Christi vs NY Cosmos",
      undefined,
      1493950,
    )
    const restored = await restartedService.fetchMatchStats(
      "Corpus Christi vs NY Cosmos",
      undefined,
      1493950,
    )

    expect(restored.status).toBe("FT")
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(cacheModel.updateOne).toHaveBeenCalledWith(
      { key: "fixture:1493950" },
      expect.objectContaining({ $set: expect.any(Object) }),
      { upsert: true },
    )
  })

  it("refuses an integer-line push when no push outcome exists", () => {
    const result = service.evaluateProposition(
      {
        question: "Arsenal vs Liverpool - Total Goals",
        optionGroup: "goals",
        handicap: 3,
        outcomes: ["Total Goals Over 3", "Total Goals Under 3"],
      },
      stats(),
    )

    expect(result.outcome).toBe("INVALID")
    expect(result.reasoning).toContain("no push outcome")
  })

  it("requires a genuine fixture ID instead of generating fallback stats", async () => {
    await expect(
      service.fetchMatchStats("Arsenal vs Liverpool"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
  })

  it("returns accessible dates when the free plan restricts the rest of the week", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-20T09:00:00Z"))
    jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = new URL(String(input))
      const date = url.searchParams.get("date")
      if (date === "2026-08-20") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ errors: [], response: [] }),
        } as Response
      }
      if (date === "2026-08-21") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            errors: [],
            response: [
              {
                fixture: {
                  id: 999,
                  date: "2026-08-21T18:00:00Z",
                  status: { short: "NS" },
                },
                league: { name: "Test League", round: "Round 1" },
                teams: {
                  home: { name: "Home FC" },
                  away: { name: "Away FC" },
                },
                goals: { home: null, away: null },
              },
            ],
          }),
        } as Response
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          errors: {
            plan: "Free plans do not have access to this date, try from 2026-08-19 to 2026-08-21.",
          },
          response: [],
        }),
      } as Response
    })

    const fixtures = await service.fetchApiFootballFixtures("upcoming")

    expect(fixtures).toHaveLength(1)
    expect(fixtures[0].id).toBe(999)
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it("ignores missed penalties when determining the first scoring team", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        errors: [],
        response: [
          {
            fixture: {
              id: 123,
              date: "2026-08-20T18:00:00Z",
              status: { short: "FT" },
            },
            teams: { home: { name: "Arsenal" }, away: { name: "Liverpool" } },
            goals: { home: 1, away: 1 },
            score: {
              extratime: { home: null, away: null },
              penalty: { home: null, away: null },
            },
            events: [
              {
                time: { elapsed: 10 },
                team: { name: "Arsenal" },
                type: "Goal",
                detail: "Missed Penalty",
              },
              {
                time: { elapsed: 25 },
                team: { name: "Liverpool" },
                type: "Goal",
                detail: "Normal Goal",
              },
              {
                time: { elapsed: 70 },
                team: { name: "Arsenal" },
                type: "Goal",
                detail: "Normal Goal",
              },
            ],
            statistics: [],
          },
        ],
      }),
    } as Response)

    const matchStats = await service.fetchMatchStats(
      "Arsenal vs Liverpool",
      undefined,
      123,
    )

    expect(matchStats.firstTeamToScore).toBe("Liverpool")
    expect(matchStats.firstGoalMinute).toBe(25)
  })
})
