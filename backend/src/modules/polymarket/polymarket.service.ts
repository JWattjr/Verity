import { BadRequestException, Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PolymarketClient } from "./polymarket.client"
import {
  PolymarketFeeSchedule,
  ListSportsEventsOptions,
  PolymarketOutcome,
  PolymarketPage,
  PolymarketSport,
  PolymarketSportsEvent,
  PolymarketSportsMarket,
} from "./polymarket.types"

type UnknownRecord = Record<string, unknown>

interface CacheEntry<T> {
  expiresAt: number
  value: T
}

@Injectable()
export class PolymarketService {
  private readonly cache = new Map<string, CacheEntry<unknown>>()
  private readonly cacheTtlMs: number

  constructor(
    private readonly client: PolymarketClient,
    configService: ConfigService,
  ) {
    this.cacheTtlMs = this.positiveInteger(
      configService.get<string>("POLYMARKET_PUBLIC_CACHE_TTL_MS"),
      15000,
    )
  }

  async listSports(): Promise<PolymarketSport[]> {
    return this.cached("sports", async () => {
      const response = await this.client.get<unknown>("/sports")
      if (!Array.isArray(response)) return []
      return response.map((item) => this.normalizeSport(item))
    })
  }

  async listSportsMarketTypes(): Promise<string[]> {
    return this.cached("sports-market-types", async () => {
      const response = await this.client.get<UnknownRecord>(
        "/sports/market-types",
      )
      return this.stringArray(response.marketTypes)
    })
  }

  async listSportsEvents(
    options: ListSportsEventsOptions,
  ): Promise<PolymarketPage<PolymarketSportsEvent>> {
    const tagId = options.tagId || (await this.resolveSportTag(options.sport))
    if (!tagId) {
      throw new BadRequestException(
        "Provide either a Polymarket sport or sports tagId.",
      )
    }
    const query = new URLSearchParams({
      closed: "false",
      limit: String(options.limit),
    })

    query.set("tag_id", tagId)
    if (options.cursor) query.set("after_cursor", options.cursor)

    const cacheKey = `events:${query.toString()}:${options.marketType || "all"}`
    return this.cached(cacheKey, async () => {
      const response = await this.client.get<UnknownRecord>(
        "/events/keyset",
        query,
      )
      const events = Array.isArray(response.events) ? response.events : []
      const nextCursor = this.nullableString(response.next_cursor)
      const normalizedEvents = events
        .map((event) => this.normalizeEvent(event))
        .map((event) => ({
          ...event,
          markets: event.markets.filter(
            (market) =>
              market.active && !market.closed && market.acceptingOrders,
          ),
        }))
      const items = options.marketType
        ? normalizedEvents
            .map((event) => ({
              ...event,
              markets: event.markets.filter(
                (market) => market.sportsMarketType === options.marketType,
              ),
            }))
            .filter((event) => event.markets.length > 0)
        : normalizedEvents.filter((event) => event.markets.length > 0)

      return {
        items,
        nextCursor,
        hasMore: Boolean(nextCursor),
      }
    })
  }

  private async resolveSportTag(sport?: string): Promise<string | undefined> {
    if (!sport) return undefined

    const normalizedSport = sport.trim().toLowerCase()
    const sports = await this.listSports()
    const match = sports.find(
      (item) => item.sport.toLowerCase() === normalizedSport,
    )

    if (!match) {
      throw new BadRequestException(`Unsupported Polymarket sport: ${sport}.`)
    }
    if (!match.primaryTagId) {
      throw new BadRequestException(
        `Polymarket did not provide a usable tag for sport: ${sport}.`,
      )
    }

    return match.primaryTagId
  }

  private normalizeSport(value: unknown): PolymarketSport {
    const raw = this.record(value)
    const tagIds = this.csvStrings(raw.tags)
    const declaredPrimaryTagId = this.nullableString(raw.primaryTagId)
    return {
      id: this.string(raw.id),
      sport: this.string(raw.sport),
      name: this.nullableString(raw.name),
      image: this.nullableString(raw.image),
      resolutionSource: this.nullableString(raw.resolution),
      ordering: this.nullableString(raw.ordering),
      tagIds,
      primaryTagId:
        declaredPrimaryTagId && tagIds.includes(declaredPrimaryTagId)
          ? declaredPrimaryTagId
          : tagIds.find((tag) => tag !== "1") || tagIds[0] || null,
      seriesId: this.nullableString(raw.series),
    }
  }

  private normalizeEvent(value: unknown): PolymarketSportsEvent {
    const raw = this.record(value)
    const sports = this.record(raw.sports)
    const markets = Array.isArray(raw.markets) ? raw.markets : []
    const tags = Array.isArray(raw.tags) ? raw.tags : []

    return {
      id: this.string(raw.id),
      slug: this.nullableString(raw.slug),
      title: this.nullableString(raw.title),
      image: this.nullableString(raw.image ?? raw.icon),
      description: this.nullableString(raw.description),
      gameId: this.nullableString(sports.gameId ?? raw.gameId),
      sport: this.nullableString(sports.sport ?? raw.sport),
      startTime: this.nullableString(
        sports.startTime ?? raw.startTime ?? raw.startDate,
      ),
      endTime: this.nullableString(raw.endDate),
      live: this.boolean(sports.live ?? raw.live),
      ended: this.boolean(sports.ended ?? raw.ended),
      score: this.nullableString(sports.score ?? raw.score),
      restricted: this.boolean(raw.restricted),
      negativeRisk: this.boolean(raw.negRisk),
      liquidity: this.nullableString(raw.liquidity),
      volume: this.nullableString(raw.volume),
      openInterest: this.nullableString(raw.openInterest),
      tags: tags.map((tag) => {
        const normalizedTag = this.record(tag)
        return {
          id: this.string(normalizedTag.id),
          label: this.nullableString(normalizedTag.label),
          slug: this.nullableString(normalizedTag.slug),
        }
      }),
      markets: markets.map((market) => this.normalizeMarket(market)),
    }
  }

  private normalizeMarket(value: unknown): PolymarketSportsMarket {
    const raw = this.record(value)
    const labels = this.jsonStringArray(raw.outcomes)
    const prices = this.jsonStringArray(raw.outcomePrices)
    const tokenIds = this.jsonStringArray(raw.clobTokenIds)
    const feeSchedule = this.normalizeFeeSchedule(raw.feeSchedule)
    const length = Math.max(labels.length, prices.length, tokenIds.length)
    const outcomes: PolymarketOutcome[] = Array.from(
      { length },
      (_, index) => ({
        label: labels[index] || `Outcome ${index + 1}`,
        price: prices[index] || null,
        tokenId: tokenIds[index] || null,
      }),
    )

    return {
      id: this.string(raw.id),
      slug: this.nullableString(raw.slug),
      question: this.nullableString(raw.question),
      conditionId: this.nullableString(raw.conditionId ?? raw.condition_id),
      sportsMarketType: this.nullableString(raw.sportsMarketType),
      image: this.nullableString(raw.image ?? raw.icon),
      description: this.nullableString(raw.description),
      groupItemTitle: this.nullableString(raw.groupItemTitle),
      outcomes,
      active: this.boolean(raw.active),
      closed: this.boolean(raw.closed),
      acceptingOrders: this.boolean(raw.acceptingOrders),
      restricted: this.boolean(raw.restricted),
      negativeRisk: this.boolean(raw.negRisk),
      startDate: this.nullableString(raw.startDate),
      endDate: this.nullableString(raw.endDate),
      minimumTickSize: this.nullableString(
        raw.minimumTickSize ?? raw.orderPriceMinTickSize,
      ),
      minimumOrderSize: this.nullableString(
        raw.minimumOrderSize ?? raw.orderMinSize,
      ),
      bestBid: this.nullableString(raw.bestBid),
      bestAsk: this.nullableString(raw.bestAsk),
      lastTradePrice: this.nullableString(raw.lastTradePrice),
      spread: this.nullableString(raw.spread),
      liquidity: this.nullableString(raw.liquidity),
      volume: this.nullableString(raw.volume),
      feeType: this.nullableString(raw.feeType),
      feeSchedule,
    }
  }

  private normalizeFeeSchedule(value: unknown): PolymarketFeeSchedule | null {
    const raw = this.record(value)
    if (Object.keys(raw).length === 0) return null

    return {
      exponent: this.nullableString(raw.exponent),
      rate: this.nullableString(raw.rate),
      takerOnly: this.boolean(raw.takerOnly),
      rebateRate: this.nullableString(raw.rebateRate),
    }
  }

  private async cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    if (entry && entry.expiresAt > Date.now()) return entry.value

    const value = await loader()
    this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs })
    return value
  }

  private record(value: unknown): UnknownRecord {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as UnknownRecord)
      : {}
  }

  private string(value: unknown): string {
    if (typeof value === "string") return value
    if (typeof value === "number" || typeof value === "bigint") {
      return String(value)
    }
    return ""
  }

  private nullableString(value: unknown): string | null {
    if (typeof value === "string") return value || null
    if (typeof value === "number") return String(value)
    return null
  }

  private boolean(value: unknown): boolean {
    return value === true || value === "true" || value === 1
  }

  private csvStrings(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((item) => this.string(item))
    if (typeof value !== "string") return []
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map((item) => this.string(item)) : []
  }

  private jsonStringArray(value: unknown): string[] {
    if (Array.isArray(value)) return this.stringArray(value)
    if (typeof value !== "string") return []

    try {
      return this.stringArray(JSON.parse(value))
    } catch {
      return []
    }
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
  }
}
