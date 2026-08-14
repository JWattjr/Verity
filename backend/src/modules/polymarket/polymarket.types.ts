export type PolymarketId = string
export type PolymarketConditionId = string
export type PolymarketTokenId = string

export interface PolymarketSport {
  id: PolymarketId
  sport: string
  name: string | null
  image: string | null
  resolutionSource: string | null
  ordering: string | null
  tagIds: string[]
  primaryTagId: string | null
  seriesId: string | null
}

export interface PolymarketTag {
  id: string
  label: string | null
  slug: string | null
}

export interface PolymarketFeeSchedule {
  exponent: string | null
  rate: string | null
  takerOnly: boolean
  rebateRate: string | null
}

export interface PolymarketOutcome {
  label: string
  price: string | null
  tokenId: PolymarketTokenId | null
}

export interface PolymarketSportsMarket {
  id: PolymarketId
  slug: string | null
  question: string | null
  conditionId: PolymarketConditionId | null
  sportsMarketType: string | null
  image: string | null
  description: string | null
  groupItemTitle: string | null
  outcomes: PolymarketOutcome[]
  active: boolean
  closed: boolean
  acceptingOrders: boolean
  restricted: boolean
  negativeRisk: boolean
  startDate: string | null
  endDate: string | null
  minimumTickSize: string | null
  minimumOrderSize: string | null
  bestBid: string | null
  bestAsk: string | null
  lastTradePrice: string | null
  spread: string | null
  liquidity: string | null
  volume: string | null
  feeType: string | null
  feeSchedule: PolymarketFeeSchedule | null
}

export interface PolymarketSportsEvent {
  id: PolymarketId
  slug: string | null
  title: string | null
  image: string | null
  description: string | null
  gameId: string | null
  sport: string | null
  startTime: string | null
  endTime: string | null
  live: boolean
  ended: boolean
  score: string | null
  restricted: boolean
  negativeRisk: boolean
  liquidity: string | null
  volume: string | null
  openInterest: string | null
  tags: PolymarketTag[]
  markets: PolymarketSportsMarket[]
}

export interface PolymarketPage<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface ListSportsEventsOptions {
  sport?: string
  tagId?: string
  marketType?: string
  cursor?: string
  limit: number
}
