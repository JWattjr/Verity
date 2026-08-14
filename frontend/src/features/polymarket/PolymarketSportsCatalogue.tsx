"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowDown,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react"
import {
  usePolymarketSportsEventsQuery,
  usePolymarketSportsQuery,
} from "./queries"
import type {
  PolymarketOutcome,
  PolymarketSport,
  PolymarketSportsEvent,
  PolymarketSportsMarket,
} from "./types"

interface SelectionIds {
  eventId: string
  marketId: string
  tokenId: string
}

const PRIORITY_SPORTS = ["epl", "nfl", "nba", "mlb", "nhl", "ucl", "ufc"]
const POLYMARKET_IMAGE_HOST = "polymarket-upload.s3.us-east-2.amazonaws.com"

function safeHttpUrl(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null
  } catch {
    return null
  }
}

function safeImageUrl(value: string | null) {
  const safeUrl = safeHttpUrl(value)
  if (!safeUrl) return null
  const url = new URL(safeUrl)
  return url.protocol === "https:" && url.hostname === POLYMARKET_IMAGE_HOST
    ? safeUrl
    : null
}

function decimal(value: string | null, maximumFractionDigits = 0) {
  if (!value) return "—"
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return "—"
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    notation: parsed >= 1_000_000 ? "compact" : "standard",
  }).format(parsed)
}

function price(value: string | null) {
  if (!value) return "—"
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${(parsed * 100).toFixed(1)}¢` : "—"
}

function dateTime(value: string | null) {
  if (!value) return "TIME TBC"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "TIME TBC"
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZoneName: "short",
  })
    .format(parsed)
    .toUpperCase()
}

function sportName(sport: PolymarketSport) {
  return sport.name || sport.sport.toUpperCase()
}

export default function PolymarketSportsCatalogue() {
  const sportsQuery = usePolymarketSportsQuery()
  const [selectedSport, setSelectedSport] = useState("")
  const [leagueSearch, setLeagueSearch] = useState("")
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [selectionIds, setSelectionIds] = useState<SelectionIds | null>(null)
  const sports = useMemo(() => {
    const items = sportsQuery.data || []
    return [...items].sort((left, right) => {
      const leftPriority = PRIORITY_SPORTS.indexOf(left.sport)
      const rightPriority = PRIORITY_SPORTS.indexOf(right.sport)
      if (leftPriority !== -1 || rightPriority !== -1) {
        if (leftPriority === -1) return 1
        if (rightPriority === -1) return -1
        return leftPriority - rightPriority
      }
      return sportName(left).localeCompare(sportName(right))
    })
  }, [sportsQuery.data])
  const activeSport =
    selectedSport ||
    sports.find((sport) => sport.sport === "epl")?.sport ||
    sports[0]?.sport ||
    ""
  const eventsQuery = usePolymarketSportsEventsQuery(activeSport)

  const visibleSports = useMemo(() => {
    const needle = leagueSearch.trim().toLowerCase()
    if (!needle) return sports
    return sports.filter(
      (sport) =>
        sport.sport.toLowerCase().includes(needle) ||
        sportName(sport).toLowerCase().includes(needle),
    )
  }, [leagueSearch, sports])

  const events = useMemo(
    () => eventsQuery.data?.pages.flatMap((page) => page.items) || [],
    [eventsQuery.data],
  )
  const marketCount = events.reduce(
    (total, event) => total + event.markets.length,
    0,
  )
  const activeLeague = sports.find((sport) => sport.sport === activeSport)
  const selection = useMemo(() => {
    if (!selectionIds) return null
    const event = events.find((item) => item.id === selectionIds.eventId)
    const market = event?.markets.find(
      (item) => item.id === selectionIds.marketId,
    )
    const outcome = market?.outcomes.find(
      (item) => item.tokenId === selectionIds.tokenId,
    )
    return event && market && outcome ? { event, market, outcome } : null
  }, [events, selectionIds])
  const hasEventData = Boolean(eventsQuery.data?.pages.length)
  const updatedAt = eventsQuery.dataUpdatedAt || 0
  const updatedLabel = updatedAt
    ? `UPDATED ${new Date(updatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "AWAITING DATA"
  const resolutionSource = safeHttpUrl(activeLeague?.resolutionSource || null)

  function chooseSport(sport: string) {
    setSelectedSport(sport)
    setExpandedEventId(null)
    setSelectionIds(null)
  }

  function chooseOutcome(
    event: PolymarketSportsEvent,
    market: PolymarketSportsMarket,
    outcome: PolymarketOutcome,
  ) {
    if (!outcome.tokenId) return
    setSelectionIds({
      eventId: event.id,
      marketId: market.id,
      tokenId: outcome.tokenId,
    })
  }

  async function refreshCatalogue() {
    await Promise.all([sportsQuery.refetch(), eventsQuery.refetch()])
  }

  if (sportsQuery.isLoading) {
    return (
      <section
        className="sports-catalogue"
        aria-label="Polymarket sports markets"
      >
        <CatalogueGateway
          icon={<Loader2 className="animate-spin" />}
          status="status"
          title="LOADING SPORTS CATALOGUE"
        >
          Fetching the current league directory from Polymarket.
        </CatalogueGateway>
      </section>
    )
  }

  if (sportsQuery.isError) {
    return (
      <section
        className="sports-catalogue"
        aria-label="Polymarket sports markets"
      >
        <CatalogueGateway
          action={() => void sportsQuery.refetch()}
          actionLabel="TRY AGAIN"
          icon={<AlertTriangle />}
          status="alert"
          title="SPORTS CATALOGUE UNAVAILABLE"
        >
          Verity could not load Polymarket&apos;s league directory. Check the
          connection and retry.
        </CatalogueGateway>
      </section>
    )
  }

  if (sports.length === 0) {
    return (
      <section
        className="sports-catalogue"
        aria-label="Polymarket sports markets"
      >
        <CatalogueGateway
          icon={<Clock3 />}
          status="status"
          title="NO LEAGUES AVAILABLE"
        >
          Polymarket returned no sports leagues. Refresh the catalogue later.
        </CatalogueGateway>
      </section>
    )
  }

  return (
    <section
      className="sports-catalogue"
      aria-label="Polymarket sports markets"
    >
      <p className="verity-visually-hidden" aria-live="polite" role="status">
        {selection
          ? `${selection.outcome.label} selected at ${price(selection.outcome.price)}.`
          : selectionIds
            ? "The selected outcome is no longer available."
            : ""}
      </p>
      <div className="sports-catalogue__status">
        <div>
          <span className="sports-catalogue__pulse" aria-hidden="true" />
          POLYMARKET CATALOGUE
        </div>
        <span>
          {!hasEventData && eventsQuery.isError
            ? "EVENTS UNAVAILABLE"
            : !hasEventData && eventsQuery.isLoading
              ? "EVENTS LOADING"
              : updatedLabel}
        </span>
        {hasEventData ? <span>{events.length} EVENTS</span> : null}
        {hasEventData ? <span>{marketCount} OPEN MARKETS</span> : null}
        <span>POLYGON · pUSD</span>
        <button
          aria-label="Refresh sports markets"
          disabled={sportsQuery.isFetching || eventsQuery.isFetching}
          onClick={() => void refreshCatalogue()}
          type="button"
        >
          <RefreshCw
            aria-hidden="true"
            className={
              sportsQuery.isFetching || eventsQuery.isFetching
                ? "animate-spin"
                : ""
            }
          />
          REFRESH
        </button>
      </div>

      <div className="sports-catalogue__mobile-league">
        <label htmlFor="sports-league">League</label>
        <div>
          <select
            id="sports-league"
            onChange={(event) => chooseSport(event.target.value)}
            value={activeSport}
          >
            {sports.map((sport) => (
              <option key={`${sport.id}-${sport.sport}`} value={sport.sport}>
                {sportName(sport)}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" />
        </div>
      </div>

      <div className="sports-catalogue__grid">
        <aside className="sports-leagues" aria-label="Sports leagues">
          <div className="sports-leagues__heading">
            <h2>LEAGUES</h2>
            <span>{sports.length}</span>
          </div>
          <label className="sports-leagues__search">
            <span className="verity-visually-hidden">Search leagues</span>
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setLeagueSearch(event.target.value)}
              placeholder="SEARCH"
              type="search"
              value={leagueSearch}
            />
          </label>
          <div className="sports-leagues__list">
            {sportsQuery.isLoading ? (
              <CatalogueMessage
                compact
                icon={<Loader2 className="animate-spin" />}
              >
                Loading leagues…
              </CatalogueMessage>
            ) : null}
            {sportsQuery.isError ? (
              <CatalogueMessage compact icon={<AlertTriangle />}>
                League data unavailable.
              </CatalogueMessage>
            ) : null}
            {!sportsQuery.isLoading && visibleSports.length === 0 ? (
              <CatalogueMessage compact>No matching leagues.</CatalogueMessage>
            ) : null}
            {visibleSports.map((sport) => (
              <button
                aria-pressed={activeSport === sport.sport}
                key={`${sport.id}-${sport.sport}`}
                onClick={() => chooseSport(sport.sport)}
                type="button"
              >
                <span className="sports-leagues__mark">
                  <SafeImage
                    fallback={sport.sport.slice(0, 2).toUpperCase()}
                    sizes="32px"
                    src={sport.image}
                  />
                </span>
                <span>
                  <strong>{sportName(sport)}</strong>
                  <small>{sport.sport.toUpperCase()}</small>
                </span>
                <ArrowDown aria-hidden="true" />
              </button>
            ))}
          </div>
        </aside>

        <SelectionDocket
          className="is-mobile"
          onClear={() => setSelectionIds(null)}
          selection={selection}
          selectionExpired={Boolean(selectionIds && !selection)}
        />

        <div className="sports-events">
          <header className="sports-events__heading">
            <div>
              <h2>
                {activeLeague ? sportName(activeLeague) : "SPORTS MARKETS"}
              </h2>
              <p>
                Select an event, then choose a priced outcome. This catalogue is
                read-only and cannot create or execute an order.
              </p>
            </div>
            {resolutionSource ? (
              <a
                href={resolutionSource}
                rel="noopener noreferrer"
                target="_blank"
              >
                RESOLUTION SOURCE
              </a>
            ) : null}
          </header>

          {eventsQuery.isLoading ? (
            <div
              className="sports-events__skeleton"
              aria-label="Loading events"
              aria-live="polite"
              role="status"
            >
              <span className="verity-visually-hidden">Loading events…</span>
              {[0, 1, 2].map((item) => (
                <i aria-hidden="true" key={item} />
              ))}
            </div>
          ) : null}

          {eventsQuery.isError ? (
            <CatalogueMessage icon={<AlertTriangle />} status="alert">
              <strong>MARKETS COULD NOT BE LOADED</strong>
              <span>Check the connection and try this league again.</span>
              <button onClick={() => void eventsQuery.refetch()} type="button">
                TRY AGAIN
              </button>
            </CatalogueMessage>
          ) : null}

          {!eventsQuery.isLoading &&
          !eventsQuery.isError &&
          events.length === 0 ? (
            <CatalogueMessage icon={<Clock3 />} status="status">
              <strong>NO OPEN MARKETS</strong>
              <span>
                This league has no markets accepting orders right now.
              </span>
            </CatalogueMessage>
          ) : null}

          <div className="sports-events__list">
            {events.map((event) => {
              const expanded = expandedEventId === event.id
              return (
                <article
                  className={expanded ? "is-expanded" : ""}
                  key={event.id}
                >
                  <button
                    aria-controls={`sports-event-markets-${event.id}`}
                    aria-expanded={expanded}
                    className="sports-event__summary"
                    onClick={() =>
                      setExpandedEventId(expanded ? null : event.id)
                    }
                    type="button"
                  >
                    <span className="sports-event__image">
                      <SafeImage
                        fallback={<CircleDollarSign aria-hidden="true" />}
                        sizes="64px"
                        src={event.image}
                      />
                    </span>
                    <span className="sports-event__identity">
                      <small>
                        {event.live ? "LIVE NOW" : dateTime(event.startTime)}
                      </small>
                      <strong>{event.title || "Untitled sports event"}</strong>
                      <span>
                        {event.markets.length} market
                        {event.markets.length === 1 ? "" : "s"}
                        {event.score ? ` · ${event.score}` : ""}
                        {event.restricted ? " · AVAILABILITY LIMITED" : ""}
                      </span>
                    </span>
                    <span className="sports-event__liquidity">
                      <small>LIQUIDITY</small>
                      <strong>${decimal(event.liquidity)}</strong>
                    </span>
                    <ChevronDown aria-hidden="true" />
                  </button>

                  {expanded ? (
                    <div
                      className="sports-event__markets"
                      id={`sports-event-markets-${event.id}`}
                    >
                      {event.markets.map((market) => (
                        <div className="sports-market" key={market.id}>
                          <div className="sports-market__question">
                            <span>
                              {market.sportsMarketType ||
                                market.groupItemTitle ||
                                "MARKET"}
                            </span>
                            <h3>{market.question || event.title}</h3>
                            <p>
                              MIN {market.minimumOrderSize || "—"} SHARES · TICK{" "}
                              {market.minimumTickSize || "—"}
                            </p>
                          </div>
                          <div className="sports-market__outcomes">
                            {event.restricted || market.restricted ? (
                              <p className="sports-market__eligibility">
                                Eligibility check required before trading.
                              </p>
                            ) : null}
                            {market.outcomes.length === 0 ? (
                              <p className="sports-market__unavailable">
                                No priced outcomes are currently available.
                              </p>
                            ) : null}
                            {market.outcomes.map((outcome) => {
                              const unavailableReason = !outcome.tokenId
                                ? "Token unavailable"
                                : !outcome.price
                                  ? "Price unavailable"
                                  : null
                              const chosen =
                                selectionIds?.marketId === market.id &&
                                selectionIds.tokenId === outcome.tokenId
                              return (
                                <button
                                  aria-label={`${outcome.label}, ${price(outcome.price)}${unavailableReason ? `, ${unavailableReason}` : ""}`}
                                  aria-pressed={chosen}
                                  disabled={Boolean(unavailableReason)}
                                  key={`${market.id}-${outcome.label}`}
                                  onClick={() =>
                                    chooseOutcome(event, market, outcome)
                                  }
                                  type="button"
                                >
                                  <span>{outcome.label}</span>
                                  <strong>{price(outcome.price)}</strong>
                                  {unavailableReason ? (
                                    <small>{unavailableReason}</small>
                                  ) : null}
                                  {chosen ? <Check aria-hidden="true" /> : null}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>

          {eventsQuery.hasNextPage ? (
            <button
              className="sports-events__more"
              disabled={eventsQuery.isFetchingNextPage}
              onClick={() => void eventsQuery.fetchNextPage()}
              type="button"
            >
              {eventsQuery.isFetchingNextPage ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <ArrowDown aria-hidden="true" />
              )}
              {eventsQuery.isFetchingNextPage ? "LOADING…" : "LOAD MORE EVENTS"}
            </button>
          ) : null}
        </div>

        <SelectionDocket
          className="is-desktop"
          onClear={() => setSelectionIds(null)}
          selection={selection}
          selectionExpired={Boolean(selectionIds && !selection)}
        />
      </div>
    </section>
  )
}

function CatalogueMessage({
  children,
  compact = false,
  icon,
  status,
}: {
  children: React.ReactNode
  compact?: boolean
  icon?: React.ReactNode
  status?: "alert" | "status"
}) {
  return (
    <div
      className={compact ? "catalogue-message is-compact" : "catalogue-message"}
      role={status}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <div>{children}</div>
    </div>
  )
}

function CatalogueGateway({
  action,
  actionLabel,
  children,
  icon,
  status,
  title,
}: {
  action?: () => void
  actionLabel?: string
  children: React.ReactNode
  icon: React.ReactNode
  status: "alert" | "status"
  title: string
}) {
  return (
    <div className="catalogue-gateway" role={status}>
      <span aria-hidden="true">{icon}</span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action && actionLabel ? (
        <button onClick={action} type="button">
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

function SelectionDocket({
  className,
  onClear,
  selection,
  selectionExpired,
}: {
  className: string
  onClear: () => void
  selection: {
    event: PolymarketSportsEvent
    market: PolymarketSportsMarket
    outcome: PolymarketOutcome
  } | null
  selectionExpired: boolean
}) {
  return (
    <aside
      className={`sports-selection ${className}`}
      aria-label="Selected outcome"
    >
      <div className="sports-selection__heading">
        <h2>SELECTION</h2>
        <span>READ ONLY</span>
      </div>
      {selection ? (
        <div className="sports-selection__content">
          <span>{selection.event.title}</span>
          <h3>{selection.market.question}</h3>
          <div className="sports-selection__price">
            <span>{selection.outcome.label}</span>
            <strong>{price(selection.outcome.price)}</strong>
          </div>
          <dl>
            <div>
              <dt>Minimum</dt>
              <dd>{selection.market.minimumOrderSize || "—"} shares</dd>
            </div>
            <div>
              <dt>Best bid</dt>
              <dd>{price(selection.market.bestBid)}</dd>
            </div>
            <div>
              <dt>Best ask</dt>
              <dd>{price(selection.market.bestAsk)}</dd>
            </div>
          </dl>
          <div className="sports-selection__notice">
            <ShieldCheck aria-hidden="true" />
            <p>
              Selection only. No order has been created and no funds will move
              from your wallet.
            </p>
          </div>
          <button onClick={onClear} type="button">
            CLEAR SELECTION
          </button>
        </div>
      ) : (
        <div className="sports-selection__empty">
          {selectionExpired ? (
            <AlertTriangle aria-hidden="true" />
          ) : (
            <ArrowDown aria-hidden="true" />
          )}
          <h3>
            {selectionExpired
              ? "SELECTION NO LONGER AVAILABLE"
              : "CHOOSE A PRICE"}
          </h3>
          <p>
            {selectionExpired
              ? "The refreshed catalogue no longer contains that priced outcome."
              : "Open an event and select an outcome to inspect its current market terms."}
          </p>
          {selectionExpired ? (
            <button onClick={onClear} type="button">
              CLEAR SELECTION
            </button>
          ) : null}
        </div>
      )}
    </aside>
  )
}

function SafeImage({
  fallback,
  sizes,
  src,
}: {
  fallback: React.ReactNode
  sizes: string
  src: string | null
}) {
  const [failed, setFailed] = useState(false)
  const safeSrc = safeImageUrl(src)
  if (!safeSrc || failed) return fallback

  return (
    <Image
      alt=""
      fill
      onError={() => setFailed(true)}
      sizes={sizes}
      src={safeSrc}
    />
  )
}
