import {
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { SportsOracleCache } from "./sports-oracle-cache.model"

export interface MatchStatistics {
  fixtureId?: number
  homeTeam: string
  awayTeam: string
  status: string
  homeGoals: number
  awayGoals: number
  homeCorners: number
  awayCorners: number
  homeYellowCards: number
  awayYellowCards: number
  homeRedCards: number
  awayRedCards: number
  homeOffsides: number
  awayOffsides: number
  homeFouls: number
  awayFouls: number
  firstTeamToScore?: string // Home team name, Away team name, or "No Goal"
  firstGoalMinute?: number | null
  availableStatistics: string[]
  eventsAvailable: boolean
  detailedStatisticsChecked?: boolean
  completedAt?: Date
  sourceUrl?: string
}

export interface PropositionResolutionResult {
  marketId?: string
  outcome: string // Exact stored market outcome, or INVALID when settlement must stop.
  outcomeIndex?: number
  reasoning: string
  citations: string[]
  isConfident: boolean
}

interface PropositionMarket {
  question: string
  yesCondition?: string | null
  noCondition?: string | null
  optionName?: string | null
  optionGroup?: string | null
  handicap?: number | null
  outcomes?: string[] | null
}

class ApiFootballPlanRestrictionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ApiFootballPlanRestrictionError"
  }
}

class ApiFootballQuotaExceededError extends ServiceUnavailableException {
  constructor(message: string) {
    super(message)
  }
}

export interface ApiFootballFixtureItem {
  id: number
  gameweek?: number
  homeTeam: string
  awayTeam: string
  homeTeamShort: string
  awayTeamShort: string
  homeTeamLogo?: string
  awayTeamLogo?: string
  question: string
  score?: string | null
  status: string
  kickoffTime: string
  lockTime: string
  deadline: string
  resolutionSource: string
  leagueName: string
}

@Injectable()
export class SportsOracleService {
  private readonly logger = new Logger(SportsOracleService.name)

  // In-memory caching according to API-Sports optimization guidelines
  // Finished matches (FT) are cached permanently. Live / upcoming matches are cached with short TTL.
  private readonly fixtureStatsCache = new Map<
    string | number,
    { stats: MatchStatistics; cachedAt: number }
  >()
  private readonly scheduleCache = new Map<
    string,
    { data: ApiFootballFixtureItem[]; cachedAt: number }
  >()
  private readonly fixtureRequests = new Map<string, Promise<MatchStatistics>>()
  private readonly fixtureRetryState = new Map<
    number,
    { failures: number; retryAt: number }
  >()
  private quotaBlockedUntil = 0

  constructor(
    private configService: ConfigService,
    @Optional()
    @InjectModel(SportsOracleCache.name)
    private readonly cacheModel?: Model<SportsOracleCache>,
  ) {}

  private scheduleTtl(type: "upcoming" | "finished" | "live"): number {
    if (type === "live") return 2 * 60 * 1000
    if (type === "finished") return 6 * 60 * 60 * 1000
    return 2 * 60 * 60 * 1000
  }

  private scheduleWindowDays(): number {
    const configured = Number(
      this.configService.get<string>("API_FOOTBALL_SCHEDULE_DAYS") || 3,
    )
    if (!Number.isFinite(configured)) return 3
    return Math.min(7, Math.max(1, Math.floor(configured)))
  }

  private async readPersistentCache<T>(key: string): Promise<T | null> {
    if (!this.cacheModel) return null
    try {
      const entry = await this.cacheModel.findOne({ key }).lean().exec()
      if (!entry) return null
      if (
        entry.expiresAt &&
        new Date(entry.expiresAt).getTime() <= Date.now()
      ) {
        return null
      }
      return entry.data as T
    } catch (error) {
      this.logger.warn(
        `Unable to read persistent sports cache ${key}: ${error.message}`,
      )
      return null
    }
  }

  private async writePersistentCache(
    key: string,
    data: unknown,
    expiresAt: Date | null,
  ): Promise<void> {
    if (!this.cacheModel) return
    try {
      await this.cacheModel.updateOne(
        { key },
        { $set: { data, expiresAt } },
        { upsert: true },
      )
    } catch (error) {
      this.logger.warn(
        `Unable to write persistent sports cache ${key}: ${error.message}`,
      )
    }
  }

  private nextUtcDay(): number {
    const now = new Date()
    return Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      5,
    )
  }

  private assertQuotaAvailable(): void {
    if (Date.now() < this.quotaBlockedUntil) {
      throw new ApiFootballQuotaExceededError(
        `API-Football daily quota is exhausted; requests are paused until ${new Date(this.quotaBlockedUntil).toISOString()}`,
      )
    }
  }

  private cachedStatsSatisfy(
    stats: MatchStatistics,
    requiredStatistics: string[],
  ): boolean {
    if (requiredStatistics.length === 0) return true
    if (
      requiredStatistics.every((stat) =>
        stats.availableStatistics.includes(stat),
      )
    ) {
      return true
    }
    return stats.detailedStatisticsChecked === true
  }

  private getApiKey(): string | null {
    return (
      this.configService.get<string>("API_FOOTBALL_KEY") ||
      this.configService.get<string>("SPORTS_API_KEY") ||
      null
    )
  }

  /**
   * Parse home and away teams from a standard fixture question.
   */
  parseTeams(fixtureTitle: string): { homeTeam: string; awayTeam: string } {
    const clean = fixtureTitle.split(/\s+-\s+/)[0].trim()
    const vsMatch = clean.match(/^(.+?)\s+(?:vs\.?|v)\s+(.+?)$/i)
    if (vsMatch) {
      return {
        homeTeam: vsMatch[1].trim(),
        awayTeam: vsMatch[2].trim(),
      }
    }
    return { homeTeam: "Team A", awayTeam: "Team B" }
  }

  /**
   * Fetch fixtures schedule from API-Football.
   * Queries a configurable rolling date window so development can use genuine
   * recent or upcoming fixtures without exhausting the provider quota.
   */
  async fetchApiFootballFixtures(
    type: "upcoming" | "finished" | "live" = "upcoming",
    league?: number,
    season = new Date().getUTCFullYear(),
  ): Promise<ApiFootballFixtureItem[]> {
    const cacheKey = `${league || "all"}_${season}_${type}`
    const persistentCacheKey = `schedule:${cacheKey}`
    const cached = this.scheduleCache.get(cacheKey)
    const now = Date.now()
    const ttl = this.scheduleTtl(type)

    if (cached && now - cached.cachedAt < ttl) {
      this.logger.log(
        `Serving API-Football ${type} schedule from cache (${cacheKey})`,
      )
      return cached.data
    }

    const persisted =
      await this.readPersistentCache<ApiFootballFixtureItem[]>(
        persistentCacheKey,
      )
    if (persisted) {
      this.scheduleCache.set(cacheKey, { data: persisted, cachedAt: now })
      this.logger.log(
        `Serving API-Football ${type} schedule from persistent cache (${cacheKey})`,
      )
      return persisted
    }

    const apiKey = this.requireApiKey()

    let rawFixtures: any[] = []

    const scheduleDays = this.scheduleWindowDays()
    const dayOffsets =
      type === "live"
        ? [0]
        : type === "finished"
          ? Array.from({ length: scheduleDays }, (_, index) => -index)
          : Array.from({ length: scheduleDays }, (_, index) => index)

    const responses = await Promise.allSettled(
      dayOffsets.map(async (offset) => {
        const date = new Date(Date.now() + offset * 86400000)
        const dateString = date.toISOString().split("T")[0]
        const params = new URLSearchParams({
          date: dateString,
          timezone: "UTC",
        })
        if (league) {
          params.set("league", String(league))
          params.set("season", String(season))
        }
        const url = `https://v3.football.api-sports.io/fixtures?${params.toString()}`
        return this.fetchApiFootball(url, apiKey)
      }),
    )
    let restrictedDates = 0
    for (const response of responses) {
      if (response.status === "fulfilled") {
        rawFixtures.push(...response.value.response)
      } else if (response.reason instanceof ApiFootballPlanRestrictionError) {
        restrictedDates++
      } else {
        throw response.reason
      }
    }
    if (restrictedDates > 0) {
      this.logger.warn(
        `API-Football plan restricted ${restrictedDates} requested schedule date${restrictedDates === 1 ? "" : "s"}; returning fixtures from accessible dates only.`,
      )
    }

    rawFixtures = [
      ...new Map(
        rawFixtures
          .filter((fixture) => Number.isInteger(fixture.fixture?.id))
          .map((fixture) => [fixture.fixture.id, fixture]),
      ).values(),
    ]

    // Filter fixtures based on requested type
    let filtered = rawFixtures
    if (type === "finished") {
      filtered = rawFixtures
        .filter((f: any) =>
          ["FT", "AET", "PEN"].includes(f.fixture?.status?.short),
        )
        .sort(
          (a: any, b: any) =>
            new Date(b.fixture?.date || 0).getTime() -
            new Date(a.fixture?.date || 0).getTime(),
        )
    } else if (type === "live") {
      filtered = rawFixtures.filter((f: any) =>
        ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"].includes(
          f.fixture?.status?.short,
        ),
      )
    } else {
      // Upcoming
      filtered = rawFixtures
        .filter((f: any) => ["NS", "TBD"].includes(f.fixture?.status?.short))
        .sort(
          (a: any, b: any) =>
            new Date(a.fixture?.date || 0).getTime() -
            new Date(b.fixture?.date || 0).getTime(),
        )
    }

    // Take top 30 matches
    const items: ApiFootballFixtureItem[] = filtered
      .slice(0, 30)
      .map((f: any) => {
        const homeTeam = f.teams?.home?.name || "Team A"
        const awayTeam = f.teams?.away?.name || "Team B"
        const kickoff = new Date(f.fixture?.date || Date.now())
        const deadline = new Date(kickoff.getTime() + 2 * 60 * 60 * 1000)
        const score =
          f.goals?.home != null ? `${f.goals.home} - ${f.goals.away}` : null

        const roundMatch = (f.league?.round || "").match(/(\d+)/)
        const gameweek = roundMatch ? parseInt(roundMatch[1], 10) : 1

        return {
          id: f.fixture?.id,
          gameweek,
          homeTeam,
          awayTeam,
          homeTeamShort: homeTeam.slice(0, 3).toUpperCase(),
          awayTeamShort: awayTeam.slice(0, 3).toUpperCase(),
          homeTeamLogo: f.teams?.home?.logo,
          awayTeamLogo: f.teams?.away?.logo,
          question: `${homeTeam} vs ${awayTeam}`,
          score,
          status: f.fixture?.status?.short || "NS",
          kickoffTime: kickoff.toISOString(),
          lockTime: kickoff.toISOString(),
          deadline: deadline.toISOString(),
          resolutionSource: "API-Football / Official Match Statistics",
          leagueName: f.league?.name || "Unknown competition",
        }
      })

    // Cache successful and empty schedules so unavailable dates are not queried
    // again whenever the creation drawer is opened.
    this.scheduleCache.set(cacheKey, { data: items, cachedAt: now })
    await this.writePersistentCache(
      persistentCacheKey,
      items,
      new Date(now + ttl),
    )
    return items
  }

  /**
   * Fetch official match statistics by fixture ID or Title.
   * Leverages caching: FT results cached permanently.
   */
  async fetchMatchStats(
    fixtureTitle: string,
    _fallbackDate?: Date,
    fixtureId?: number,
    requiredStatistics: string[] = [],
  ): Promise<MatchStatistics> {
    const { homeTeam, awayTeam } = this.parseTeams(fixtureTitle)
    const cacheKey =
      fixtureId || `${homeTeam.toLowerCase()}__${awayTeam.toLowerCase()}`
    const cached = this.fixtureStatsCache.get(cacheKey)
    const now = Date.now()

    // If cached and finished (FT), return permanently cached copy (Zero API calls wasted)
    if (
      cached &&
      (this.isTerminalStatus(cached.stats.status) ||
        now - cached.cachedAt < 60 * 1000) &&
      this.cachedStatsSatisfy(cached.stats, requiredStatistics)
    ) {
      this.logger.log(`Serving match stats from memory cache: ${cacheKey}`)
      return cached.stats
    }

    if (!fixtureId) {
      throw new ServiceUnavailableException(
        "A genuine API-Football fixture ID is required for oracle resolution",
      )
    }

    const persistentStats = await this.readPersistentCache<MatchStatistics>(
      `fixture:${fixtureId}`,
    )
    if (
      persistentStats &&
      this.isTerminalStatus(persistentStats.status) &&
      this.cachedStatsSatisfy(persistentStats, requiredStatistics)
    ) {
      this.assertFixtureIdentity(homeTeam, awayTeam, persistentStats)
      this.fixtureStatsCache.set(cacheKey, {
        stats: persistentStats,
        cachedAt: now,
      })
      this.fixtureStatsCache.set(fixtureId, {
        stats: persistentStats,
        cachedAt: now,
      })
      this.logger.log(
        `Serving finished match stats from persistent cache: ${fixtureId}`,
      )
      return persistentStats
    }

    const retryState = this.fixtureRetryState.get(fixtureId)
    if (retryState && now < retryState.retryAt) {
      throw new ServiceUnavailableException(
        `API-Football retry for fixture ${fixtureId} is paused until ${new Date(retryState.retryAt).toISOString()}`,
      )
    }

    const requestKey = `${fixtureId}:${[...new Set(requiredStatistics)].sort().join(",")}`
    const existingRequest = this.fixtureRequests.get(requestKey)
    if (existingRequest) return existingRequest

    const request = (async () => {
      try {
        const liveStats = await this.queryApiFootballById(
          fixtureId,
          requiredStatistics,
        )
        if (!liveStats) {
          throw new ServiceUnavailableException(
            `API-Football returned no fixture for ID ${fixtureId}`,
          )
        }
        this.assertFixtureIdentity(homeTeam, awayTeam, liveStats)
        this.fixtureRetryState.delete(fixtureId)
        this.fixtureStatsCache.set(cacheKey, {
          stats: liveStats,
          cachedAt: now,
        })
        this.fixtureStatsCache.set(fixtureId, {
          stats: liveStats,
          cachedAt: now,
        })
        if (this.isTerminalStatus(liveStats.status)) {
          await this.writePersistentCache(
            `fixture:${fixtureId}`,
            liveStats,
            null,
          )
        }
        return liveStats
      } catch (error) {
        const previousFailures =
          this.fixtureRetryState.get(fixtureId)?.failures || 0
        const failures = previousFailures + 1
        const backoffMs = [60_000, 300_000, 900_000, 3_600_000][
          Math.min(failures - 1, 3)
        ]
        this.fixtureRetryState.set(fixtureId, {
          failures,
          retryAt: Date.now() + backoffMs,
        })
        throw error
      } finally {
        this.fixtureRequests.delete(requestKey)
      }
    })()

    this.fixtureRequests.set(requestKey, request)
    return request
  }

  /**
   * Query API-Football by exact Fixture ID (Supported on free tier, returns complete stats)
   */
  async queryApiFootballById(
    fixtureId: number,
    requiredStatistics: string[] = [],
  ): Promise<MatchStatistics | null> {
    if (!Number.isInteger(fixtureId) || fixtureId <= 0) {
      throw new ServiceUnavailableException("Invalid API-Football fixture ID")
    }
    const apiKey = this.requireApiKey()

    const url = `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`
    this.logger.log(`Fetching match stats by ID from API-Football: ${url}`)

    const data = await this.fetchApiFootball(url, apiKey)
    const match = data.response?.[0]
    if (!match) return null

    // Some competitions omit statistics from the combined fixture response even
    // when they are available through API-Football's dedicated endpoint.
    if (
      requiredStatistics.length > 0 &&
      (!Array.isArray(match.statistics) || match.statistics.length === 0)
    ) {
      const statisticsUrl = `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`
      const statisticsData = await this.fetchApiFootball(statisticsUrl, apiKey)
      if (statisticsData.response.length > 0) {
        match.statistics = statisticsData.response
      }
      match.detailedStatisticsChecked = true
    }

    return this.parseApiFootballMatchPayload(match)
  }

  private requireApiKey(): string {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "API_FOOTBALL_KEY is not configured",
      )
    }
    return apiKey
  }

  private async fetchApiFootball(url: string, apiKey: string): Promise<any> {
    this.assertQuotaAvailable()
    const res = await fetch(url, { headers: { "x-apisports-key": apiKey } })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      if (res.status === 429) {
        const retryAfterSeconds = Number(
          res.headers?.get?.("retry-after") || 60,
        )
        this.quotaBlockedUntil = Math.max(
          this.quotaBlockedUntil,
          Date.now() +
            (Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 60) *
              1000,
        )
        throw new ApiFootballQuotaExceededError(
          `API-Football rate limit reached; requests are paused until ${new Date(this.quotaBlockedUntil).toISOString()}`,
        )
      }
      throw new ServiceUnavailableException(
        `API-Football request failed with HTTP ${res.status}`,
      )
    }
    const errors = data?.errors
    if (errors && Object.keys(errors).length > 0) {
      if (
        typeof errors.requests === "string" &&
        /request limit|quota|requests.*reached/i.test(errors.requests)
      ) {
        this.quotaBlockedUntil = this.nextUtcDay()
        throw new ApiFootballQuotaExceededError(
          `API-Football daily quota is exhausted; requests are paused until ${new Date(this.quotaBlockedUntil).toISOString()}`,
        )
      }
      if (typeof errors.plan === "string") {
        throw new ApiFootballPlanRestrictionError(errors.plan)
      }
      throw new ServiceUnavailableException(
        `API-Football rejected the request: ${JSON.stringify(errors)}`,
      )
    }
    if (!Array.isArray(data?.response)) {
      throw new ServiceUnavailableException(
        "API-Football returned an invalid response",
      )
    }
    const remaining = res.headers?.get?.("x-ratelimit-requests-remaining")
    if (remaining === "0") {
      this.quotaBlockedUntil = this.nextUtcDay()
      this.logger.warn(
        `API-Football reports zero daily requests remaining; pausing requests until ${new Date(this.quotaBlockedUntil).toISOString()}.`,
      )
    }
    return data
  }

  private normalizeTeamName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "")
  }

  private assertFixtureIdentity(
    expectedHome: string,
    expectedAway: string,
    stats: MatchStatistics,
  ): void {
    const expectedHomeName = this.normalizeTeamName(expectedHome)
    const expectedAwayName = this.normalizeTeamName(expectedAway)
    const actualHomeName = this.normalizeTeamName(stats.homeTeam)
    const actualAwayName = this.normalizeTeamName(stats.awayTeam)
    if (
      !expectedHomeName ||
      !expectedAwayName ||
      expectedHomeName !== actualHomeName ||
      expectedAwayName !== actualAwayName
    ) {
      throw new ServiceUnavailableException(
        `Fixture ID ${stats.fixtureId} does not match ${expectedHome} vs ${expectedAway}`,
      )
    }
  }

  /**
   * Parse full API-Football JSON match payload into MatchStatistics
   */
  private parseApiFootballMatchPayload(match: any): MatchStatistics {
    const homeTeam = match.teams?.home?.name || "Team A"
    const awayTeam = match.teams?.away?.name || "Team B"
    const homeGoals = Number(match.goals?.home ?? 0)
    const awayGoals = Number(match.goals?.away ?? 0)
    const statisticCoverage = new Map<string, number>()
    const markStatisticAvailable = (name: string) =>
      statisticCoverage.set(name, (statisticCoverage.get(name) || 0) + 1)
    const eventsAvailable = Array.isArray(match.events)

    let homeCorners = 0,
      awayCorners = 0,
      homeYellows = 0,
      awayYellows = 0,
      homeReds = 0,
      awayReds = 0,
      homeOffsides = 0,
      awayOffsides = 0,
      homeFouls = 0,
      awayFouls = 0

    // 1. Parse events array directly for cards, goals, and disciplinary events
    let firstTeamToScore: string | undefined =
      homeGoals === 0 && awayGoals === 0 ? "No Goal" : undefined
    let firstGoalMinute: number | null = null

    if (match.events && Array.isArray(match.events)) {
      // Sort events chronologically by minute
      const sortedEvents = [...match.events].sort(
        (a: any, b: any) => (a.time?.elapsed || 0) - (b.time?.elapsed || 0),
      )

      for (const ev of sortedEvents) {
        const isHome = (ev.team?.name || "")
          .toLowerCase()
          .includes(homeTeam.toLowerCase())
        const evType = (ev.type || "").toLowerCase()
        const detail = (ev.detail || "").toLowerCase()

        // Card events
        if (evType === "card") {
          if (detail.includes("red") || detail.includes("second yellow")) {
            if (isHome) homeReds++
            else awayReds++
          } else if (detail.includes("yellow")) {
            if (isHome) homeYellows++
            else awayYellows++
          }
        }

        // Goal events
        if (
          evType === "goal" &&
          !detail.includes("missed penalty") &&
          !detail.includes("cancelled") &&
          firstGoalMinute === null
        ) {
          firstTeamToScore = ev.team?.name || (isHome ? homeTeam : awayTeam)
          firstGoalMinute = ev.time?.elapsed || null
        }
      }
    } else {
      if (homeGoals > 0 && awayGoals === 0) firstTeamToScore = homeTeam
      else if (awayGoals > 0 && homeGoals === 0) firstTeamToScore = awayTeam
    }

    // 2. Parse statistics array if present (corners, fouls, offsides, cards)
    if (match.statistics && Array.isArray(match.statistics)) {
      for (const teamStats of match.statistics) {
        const isHome = (teamStats.team?.name || "")
          .toLowerCase()
          .includes(homeTeam.toLowerCase())
        for (const stat of teamStats.statistics || []) {
          if (stat.value == null) continue
          const statType = String(stat.type || "")
            .toLowerCase()
            .trim()
          const val = Number(stat.value)
          if (!Number.isFinite(val)) continue
          if (["corner kicks", "corners"].includes(statType)) {
            markStatisticAvailable("corners")
            if (isHome) homeCorners = val
            else awayCorners = val
          } else if (["yellow cards", "yellow card"].includes(statType)) {
            markStatisticAvailable("yellow_cards")
            if (isHome) homeYellows = Math.max(homeYellows, val)
            else awayYellows = Math.max(awayYellows, val)
          } else if (["red cards", "red card"].includes(statType)) {
            markStatisticAvailable("red_cards")
            if (isHome) homeReds = Math.max(homeReds, val)
            else awayReds = Math.max(awayReds, val)
          } else if (["offsides", "offside"].includes(statType)) {
            markStatisticAvailable("offsides")
            if (isHome) homeOffsides = val
            else awayOffsides = val
          } else if (["fouls", "fouls committed"].includes(statType)) {
            markStatisticAvailable("fouls")
            if (isHome) homeFouls = val
            else awayFouls = val
          }
        }
      }
    }

    return {
      fixtureId: match.fixture?.id,
      homeTeam,
      awayTeam,
      status: match.fixture?.status?.short || "UNKNOWN",
      homeGoals,
      awayGoals,
      homeCorners,
      awayCorners,
      homeYellowCards: homeYellows,
      awayYellowCards: awayYellows,
      homeRedCards: homeReds,
      awayRedCards: awayReds,
      homeOffsides,
      awayOffsides,
      homeFouls,
      awayFouls,
      firstTeamToScore,
      firstGoalMinute,
      availableStatistics: [...statisticCoverage.entries()]
        .filter(([, count]) => count >= 2)
        .map(([name]) => name),
      eventsAvailable,
      detailedStatisticsChecked:
        match.detailedStatisticsChecked === true ||
        (Array.isArray(match.statistics) && match.statistics.length > 0),
      sourceUrl: `https://www.api-football.com/match/${match.fixture?.id || ""}`,
    }
  }

  isTerminalStatus(status: string): boolean {
    return ["FT", "AET", "PEN"].includes(status)
  }

  private invalidResolution(
    reason: string,
    stats: MatchStatistics,
  ): PropositionResolutionResult {
    return {
      outcome: "INVALID",
      reasoning: reason,
      citations: [stats.sourceUrl || "API-Football"],
      isConfident: false,
    }
  }

  private exactOutcome(
    market: PropositionMarket,
    stats: MatchStatistics,
    predicate: (normalizedOutcome: string) => boolean,
    reasoning: string,
  ): PropositionResolutionResult {
    const outcomes = market.outcomes || []
    const outcomeIndex = outcomes.findIndex((outcome) =>
      predicate(outcome.toLowerCase().trim()),
    )
    if (outcomeIndex < 0) {
      return this.invalidResolution(
        `The verified result could not be mapped to an exact stored market outcome. ${reasoning}`,
        stats,
      )
    }
    return {
      outcome: outcomes[outcomeIndex],
      outcomeIndex,
      reasoning,
      citations: [stats.sourceUrl || "API-Football"],
      isConfident: true,
    }
  }

  private marketThreshold(market: PropositionMarket): number | null {
    if (
      typeof market.handicap === "number" &&
      Number.isFinite(market.handicap)
    ) {
      return market.handicap
    }
    for (const outcome of market.outcomes || []) {
      const match = outcome.match(/(?:over|under)\s+([0-9]+(?:\.[0-9]+)?)/i)
      if (match) return Number(match[1])
    }
    return null
  }

  private inferPropositionGroup(market: PropositionMarket): string {
    const text = [
      market.question,
      market.optionName,
      market.yesCondition,
      market.noCondition,
      ...(market.outcomes || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    if (text.includes("both teams to score") || text.includes("btts")) {
      return "btts"
    }
    if (text.includes("first team to score") || text.includes("first goal")) {
      return "first_goal"
    }
    if (text.includes("red card")) return "red_card"
    if (text.includes("yellow card")) return "yellow_cards"
    if (/\bcorners?\b/.test(text)) return "corners"
    if (/\boffsides?\b/.test(text)) return "offsides"
    if (text.includes("total goals")) return "goals"
    if (
      text.includes("match winner") ||
      text.includes("wins the match") ||
      text.includes("ends in a draw")
    ) {
      return "major"
    }
    return (market.optionGroup || "").toLowerCase()
  }

  requiredStatisticsForMarkets(markets: PropositionMarket[]): string[] {
    const required = new Set<string>()
    for (const market of markets) {
      const group = this.inferPropositionGroup(market)
      if (group === "corners" || group === "offsides") {
        required.add(group)
      }
    }
    return [...required]
  }

  evaluateProposition(
    market: PropositionMarket,
    stats: MatchStatistics,
  ): PropositionResolutionResult {
    if (!this.isTerminalStatus(stats.status)) {
      return this.invalidResolution(
        `Fixture ${stats.fixtureId || ""} is not final (status ${stats.status}).`,
        stats,
      )
    }
    if (!market.outcomes || market.outcomes.length < 2) {
      return this.invalidResolution(
        "Market has no complete outcome set.",
        stats,
      )
    }

    const group = this.inferPropositionGroup(market)
    const searchable =
      `${market.question} ${market.optionName || ""} ${market.yesCondition || ""}`.toLowerCase()
    const scoreline = `${stats.homeTeam} ${stats.homeGoals}-${stats.awayGoals} ${stats.awayTeam}`
    const includesTeam = (outcome: string, team: string) =>
      this.normalizeTeamName(outcome).includes(this.normalizeTeamName(team))
    const hasToken = (outcome: string, token: string) =>
      new RegExp(`(?:^|\\b)${token}(?:\\b|$)`, "i").test(outcome)

    if (group === "major" || searchable.includes("match winner")) {
      if (stats.homeGoals === stats.awayGoals) {
        return this.exactOutcome(
          market,
          stats,
          (outcome) => outcome.includes("draw"),
          `The match finished level: ${scoreline}.`,
        )
      }
      const winner =
        stats.homeGoals > stats.awayGoals ? stats.homeTeam : stats.awayTeam
      return this.exactOutcome(
        market,
        stats,
        (outcome) =>
          includesTeam(outcome, winner) &&
          (outcome.includes("win") || outcome === winner.toLowerCase()),
        `${winner} won the match: ${scoreline}.`,
      )
    }

    if (group === "first_goal" || searchable.includes("first team to score")) {
      if (stats.homeGoals + stats.awayGoals === 0) {
        return this.exactOutcome(
          market,
          stats,
          (outcome) => outcome.includes("no goal"),
          `The match finished 0-0.`,
        )
      }
      if (!stats.eventsAvailable || !stats.firstTeamToScore) {
        return this.invalidResolution(
          "API-Football did not provide enough event data to identify the first scoring team.",
          stats,
        )
      }
      const firstTeam = stats.firstTeamToScore
      return this.exactOutcome(
        market,
        stats,
        (outcome) =>
          includesTeam(outcome, firstTeam) &&
          (outcome.includes("first") || outcome.includes("score")),
        `${firstTeam} scored the first valid goal${stats.firstGoalMinute ? ` in minute ${stats.firstGoalMinute}` : ""}.`,
      )
    }

    if (group === "btts" || searchable.includes("both teams to score")) {
      const yes = stats.homeGoals > 0 && stats.awayGoals > 0
      return this.exactOutcome(
        market,
        stats,
        (outcome) => hasToken(outcome, yes ? "yes" : "no"),
        `Both teams to score: ${yes ? "yes" : "no"}. Final score: ${scoreline}.`,
      )
    }

    if (group === "red_card" || searchable.includes("red card")) {
      if (
        !stats.availableStatistics.includes("red_cards") &&
        !stats.eventsAvailable
      ) {
        return this.invalidResolution(
          "Red-card data is unavailable for this fixture.",
          stats,
        )
      }
      const shown = stats.homeRedCards + stats.awayRedCards > 0
      return this.exactOutcome(
        market,
        stats,
        (outcome) => hasToken(outcome, shown ? "yes" : "no"),
        `Red cards shown: ${stats.homeRedCards + stats.awayRedCards}.`,
      )
    }

    const totals: Record<
      string,
      { stat: string; value: number; label: string }
    > = {
      goals: {
        stat: "score",
        value: stats.homeGoals + stats.awayGoals,
        label: "goals",
      },
      corners: {
        stat: "corners",
        value: stats.homeCorners + stats.awayCorners,
        label: "corners",
      },
      yellow_cards: {
        stat: "yellow_cards",
        value: stats.homeYellowCards + stats.awayYellowCards,
        label: "yellow cards",
      },
      offsides: {
        stat: "offsides",
        value: stats.homeOffsides + stats.awayOffsides,
        label: "offsides",
      },
    }
    const total = totals[group]
    if (total) {
      if (
        total.stat !== "score" &&
        !stats.availableStatistics.includes(total.stat) &&
        // The fixture event feed is an authoritative source for cards. It can
        // provide the yellow-card total even when team statistics are omitted.
        !(total.stat === "yellow_cards" && stats.eventsAvailable)
      ) {
        return this.invalidResolution(
          `${total.label} statistics are unavailable for this fixture.`,
          stats,
        )
      }
      const threshold = this.marketThreshold(market)
      if (threshold == null) {
        return this.invalidResolution(
          `No ${total.label} threshold is stored for this market.`,
          stats,
        )
      }
      if (total.value === threshold) {
        return this.invalidResolution(
          `Total ${total.label} equals the settlement line ${threshold}; this market has no push outcome.`,
          stats,
        )
      }
      const direction = total.value > threshold ? "over" : "under"
      return this.exactOutcome(
        market,
        stats,
        (outcome) => hasToken(outcome, direction),
        `Total ${total.label}: ${total.value}; settlement line: ${threshold}.`,
      )
    }

    return this.invalidResolution(
      `Unsupported proposition group: ${group || "unknown"}.`,
      stats,
    )
  }
}
