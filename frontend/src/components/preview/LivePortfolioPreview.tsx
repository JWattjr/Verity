"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  ExternalLink,
  Sparkles,
} from "lucide-react"
import PortfolioTokenTable, {
  type PortfolioTokenRow,
} from "@/components/porfolio/PortfolioTokenTable"
import {
  getMarketPrice,
  type MarketPosition,
  type MarketTrade,
} from "@/lib/verity"
import {
  useUserPortfolioQuery,
  useUserProfileQuery,
  useUserTradesQuery,
} from "@/store/verity/verityQueries"

const PREVIEW_PROFILE_ID = "6a2bdccdadc3689375bf51ba"
type PreviewTab = "overview" | "tokens" | "winnings" | "activity"

const FALLBACK_POSITIONS: MarketPosition[] = [
  previewPosition(
    "portfolio-1",
    "France vs Morocco - Offsides",
    "NO",
    150,
    42,
    "open",
    null,
  ),
  previewPosition(
    "portfolio-2",
    "France vs Morocco - BTTS",
    "YES",
    161.54,
    42,
    "open",
    null,
  ),
  previewPosition(
    "portfolio-3",
    "England vs Argentina - Major",
    "England wins the match",
    140,
    70,
    "resolved",
    "England wins the match",
  ),
  previewPosition(
    "portfolio-4",
    "France vs Morocco - Extra Time / Penalties",
    "No penalties",
    41.23,
    20,
    "resolved",
    "No penalties",
  ),
  previewPosition(
    "portfolio-5",
    "England vs Argentina - Corners",
    "NO",
    237.24,
    70,
    "resolved",
    "YES",
  ),
]

const FALLBACK_TRADES: MarketTrade[] = [
  previewTrade(
    "trade-1",
    "England vs Argentina - Major",
    "England wins the match",
    140,
    0.5,
    70,
  ),
  previewTrade(
    "trade-2",
    "England vs Argentina - Goals",
    "NO",
    160.56,
    0.44,
    70,
  ),
  previewTrade("trade-3", "France vs Morocco - Offsides", "NO", 150, 0.28, 42),
  previewTrade("trade-4", "France vs Morocco - BTTS", "YES", 161.54, 0.26, 42),
]

export default function LivePortfolioPreview() {
  const [tab, setTab] = useState<PreviewTab>("overview")
  const { data: profile } = useUserProfileQuery(PREVIEW_PROFILE_ID)
  const { data: rawPositions = [], isLoading: positionsLoading } =
    useUserPortfolioQuery(PREVIEW_PROFILE_ID)
  const { data: trades = [], isLoading: tradesLoading } =
    useUserTradesQuery(PREVIEW_PROFILE_ID)
  const positionRecords =
    rawPositions.length > 0 ? rawPositions : FALLBACK_POSITIONS
  const visibleTrades = trades.length > 0 ? trades : FALLBACK_TRADES

  const positions = useMemo(
    () =>
      positionRecords
        .filter((position) => position.market_id && position.market_question)
        .map((position) => {
          const resolved = position.status === "resolved"
          const won =
            resolved &&
            position.resolved_outcome?.toUpperCase() ===
              position.side.toUpperCase()
          const currentPrice = resolved
            ? won
              ? 1
              : 0
            : getMarketPrice(
                {
                  usdc_yes_amount: position.usdc_yes_amount ?? 0,
                  usdc_no_amount: position.usdc_no_amount ?? 0,
                },
                position.side,
              )

          return {
            ...position,
            currentPrice,
            currentValue: position.shares * currentPrice,
            pnl: resolved
              ? position.realized_pnl
              : position.shares * currentPrice - position.invested_usdc,
            won,
          }
        }),
    [positionRecords],
  )
  const tokenRows = useMemo<PortfolioTokenRow[]>(
    () =>
      positions.map((position) => ({
        id: position.id,
        marketId: position.market_id,
        question: position.market_question || "Verity market",
        side: position.side,
        shares: position.shares,
        avgPrice: position.avg_price,
        currentPrice: position.currentPrice,
        stakedCost: position.invested_usdc,
        currentValue: position.currentValue,
        pnl: position.pnl,
      })),
    [positions],
  )

  const openPositions = positions.filter(
    (position) => position.status !== "resolved",
  )
  const winnings = positions.filter(
    (position) => position.won && position.shares > 0,
  )
  const totalInvested = positions.reduce(
    (total, position) => total + position.invested_usdc,
    0,
  )
  const openValue = openPositions.reduce(
    (total, position) => total + position.currentValue,
    0,
  )
  const totalPayouts = winnings.reduce(
    (total, position) => total + position.shares,
    0,
  )
  const isLoading =
    (positionsLoading && rawPositions.length > 0) ||
    (tradesLoading && trades.length > 0)

  return (
    <div className="verity-product-page verity-portfolio-page">
      <header className="verity-product-hero verity-portfolio-hero">
        <div>
          <p className="verity-product-eyebrow">
            <i aria-hidden="true" /> Public account · Live market positions
          </p>
          <h1>
            PORTFOLIO<span>.</span>
          </h1>
        </div>
        <div className="verity-portfolio-balance">
          <span>Public position value</span>
          <strong>${openValue.toFixed(2)}</strong>
          <small>{openPositions.length} positions currently open</small>
        </div>
      </header>

      <section
        className="verity-portfolio-stats"
        aria-label="Portfolio summary"
      >
        <PreviewStat
          label="Total invested"
          value={`$${totalInvested.toFixed(2)}`}
        />
        <PreviewStat
          label="Open positions"
          value={String(openPositions.length)}
        />
        <PreviewStat
          label="Winning records"
          value={String(winnings.length)}
          accent
        />
        <PreviewStat
          label="Recorded trades"
          value={String(visibleTrades.length)}
        />
      </section>

      <section
        aria-label="Portfolio actions"
        className="verity-portfolio-actions verity-preview-portfolio-actions"
      >
        <button disabled title="Sign in to send USDC" type="button">
          <ArrowUpRight aria-hidden="true" />
          <span>SEND</span>
        </button>
        <button
          disabled
          title="Sign in to view your receive address"
          type="button"
        >
          <ArrowDownLeft aria-hidden="true" />
          <span>RECEIVE</span>
        </button>
        <Link
          href="https://faucet.circle.com/"
          rel="noopener noreferrer"
          target="_blank"
        >
          <Sparkles aria-hidden="true" />
          <span>FAUCET</span>
        </Link>
        <Link
          href={
            profile?.walletAddress
              ? `https://explorer.testnet.arc.network/address/${profile.walletAddress}`
              : "https://explorer.testnet.arc.network"
          }
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLink aria-hidden="true" />
          <span>EXPLORER</span>
        </Link>
      </section>

      <div className="verity-section-heading verity-portfolio-heading">
        <div>
          <span>Portfolio activity</span>
          <h2>
            {profile?.display_name || profile?.username || "PUBLIC ACCOUNT"}
          </h2>
        </div>
        <div
          className="verity-segmented-tabs"
          role="tablist"
          aria-label="Portfolio sections"
        >
          {(
            [
              ["overview", "Overview"],
              ["tokens", `Tokens ${positions.length}`],
              ["winnings", `Wins ${winnings.length}`],
              ["activity", `Activity ${visibleTrades.length}`],
            ] as const
          ).map(([value, label]) => (
            <button
              aria-selected={tab === value}
              className={tab === value ? "is-active" : ""}
              key={value}
              onClick={() => setTab(value)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="verity-portfolio-record" aria-live="polite">
        {isLoading ? (
          [1, 2, 3].map((item) => (
            <div className="verity-product-skeleton" key={item} />
          ))
        ) : tab === "overview" ? (
          <div className="verity-portfolio-overview-grid">
            <section className="verity-portfolio-overview-panel">
              <header>
                <div>
                  <span>Public portfolio now</span>
                  <h3>ACTIVE POSITIONS</h3>
                </div>
                <button onClick={() => setTab("tokens")} type="button">
                  VIEW ALL
                </button>
              </header>
              <div className="verity-overview-position-list">
                {openPositions.slice(0, 4).map((position) => (
                  <Link
                    href={`/markets/${position.market_id}`}
                    key={position.id}
                  >
                    <div>
                      <span>{position.side}</span>
                      <strong>
                        {position.market_question || "Verity market"}
                      </strong>
                    </div>
                    <div>
                      <small>Value</small>
                      <strong>${position.currentValue.toFixed(2)}</strong>
                      <em
                        className={
                          position.pnl < 0 ? "is-negative" : "is-positive"
                        }
                      >
                        {position.pnl >= 0 ? "+" : ""}${position.pnl.toFixed(2)}
                      </em>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
            <section className="verity-portfolio-overview-panel">
              <header>
                <div>
                  <span>Public transactions</span>
                  <h3>RECENT ACTIVITY</h3>
                </div>
                <button onClick={() => setTab("activity")} type="button">
                  VIEW ALL
                </button>
              </header>
              <div className="verity-overview-trade-list">
                {visibleTrades.slice(0, 5).map((trade) => (
                  <Link href={`/markets/${trade.market_id}`} key={trade.id}>
                    <span className={trade.action === "SELL" ? "is-sell" : ""}>
                      {trade.action}
                    </span>
                    <div>
                      <strong>
                        {trade.market_question || "Verity market"}
                      </strong>
                      <small>{formatDate(trade.created_at)}</small>
                    </div>
                    <em>
                      {trade.action === "BUY" ? "−" : "+"}$
                      {trade.amount_usdc.toFixed(2)}
                    </em>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ) : tab === "tokens" ? (
          <PortfolioTokenTable rows={tokenRows.slice(0, 40)} />
        ) : tab === "winnings" ? (
          <>
            <div className="verity-winnings-bar">
              <div>
                <span>Historical winning payout</span>
                <strong>${totalPayouts.toFixed(2)}</strong>
              </div>
              <span className="verity-preview-disabled-action">
                PREVIEW ONLY
              </span>
            </div>
            <PreviewPositionList positions={winnings.slice(0, 10)} winnings />
          </>
        ) : visibleTrades.length > 0 ? (
          <div className="verity-trade-list">
            {visibleTrades.slice(0, 12).map((trade) => (
              <article className="verity-trade-row" key={trade.id}>
                <div>
                  <span
                    className={trade.action === "BUY" ? "is-buy" : "is-sell"}
                  >
                    {trade.action}
                  </span>
                  <h3>{trade.market_question || "Verity market"}</h3>
                  <small>{formatDate(trade.created_at)}</small>
                </div>
                <div className="verity-trade-row__numbers">
                  <PreviewMetric
                    label="Shares"
                    value={`${trade.shares.toFixed(2)} ${trade.side}`}
                  />
                  <PreviewMetric
                    label="Price"
                    value={`$${trade.price.toFixed(2)}`}
                  />
                  <PreviewMetric
                    label="Total amount"
                    value={`$${trade.amount_usdc.toFixed(2)}`}
                  />
                  {trade.tx_hash ? (
                    <Link
                      aria-label="View transaction"
                      href={`https://explorer.testnet.arc.network/tx/${trade.tx_hash}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <ExternalLink aria-hidden="true" />
                    </Link>
                  ) : (
                    <span />
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <PreviewEmpty title="NO PUBLIC ACTIVITY" />
        )}
      </section>
    </div>
  )
}

type PreviewPosition = {
  id: string
  market_id: string
  market_question?: string | null
  category?: string | null
  side: string
  shares: number
  avg_price: number
  invested_usdc: number
  created_at: string
  resolved_outcome?: string | null
  currentValue: number
  currentPrice: number
  pnl: number
}

function PreviewPositionList({
  positions,
  winnings = false,
}: {
  positions: PreviewPosition[]
  winnings?: boolean
}) {
  if (positions.length === 0) {
    return (
      <PreviewEmpty
        title={winnings ? "NO PUBLIC WINNINGS" : "NO OPEN POSITIONS"}
      />
    )
  }

  return (
    <div className="verity-position-list">
      {positions.map((position) => (
        <article
          className={`verity-position-card ${winnings ? "is-win" : ""}`}
          key={position.id}
        >
          <div className="verity-position-card__title">
            <span>
              {winnings ? "WINNING POSITION" : position.category || "MARKET"}
            </span>
            <h3>{position.market_question || "Verity market"}</h3>
            <small>{formatDate(position.created_at)}</small>
          </div>
          <div className="verity-position-card__metrics">
            <PreviewMetric label="Side" value={position.side} accent />
            <PreviewMetric label="Shares" value={position.shares.toFixed(2)} />
            <PreviewMetric
              label={winnings ? "Payout" : "Value"}
              value={`$${(winnings ? position.shares : position.currentValue).toFixed(2)}`}
            />
            <PreviewMetric
              label={winnings ? "Outcome" : "P&L"}
              negative={!winnings && position.pnl < 0}
              value={
                winnings
                  ? position.resolved_outcome || "Resolved"
                  : `$${position.pnl.toFixed(2)}`
              }
            />
          </div>
          <Link href={`/markets/${position.market_id}`}>OPEN MARKET</Link>
        </article>
      ))}
    </div>
  )
}

function PreviewStat({
  accent = false,
  label,
  value,
}: {
  accent?: boolean
  label: string
  value: string
}) {
  return (
    <div className="verity-portfolio-stat">
      <span>{label}</span>
      <strong className={accent ? "is-positive" : ""}>{value}</strong>
    </div>
  )
}

function PreviewMetric({
  accent = false,
  label,
  negative = false,
  value,
}: {
  accent?: boolean
  label: string
  negative?: boolean
  value: string
}) {
  return (
    <div>
      <span>{label}</span>
      <strong className={negative ? "is-negative" : accent ? "is-accent" : ""}>
        {value}
      </strong>
    </div>
  )
}

function PreviewEmpty({ title }: { title: string }) {
  return (
    <div className="verity-product-empty">
      <BriefcaseBusiness aria-hidden="true" />
      <h3>{title}</h3>
      <p>
        This preview reflects the account&apos;s current public Verity record.
      </p>
    </div>
  )
}

function previewPosition(
  id: string,
  question: string,
  side: string,
  shares: number,
  invested: number,
  status: string,
  outcome: string | null,
): MarketPosition {
  return {
    id,
    market_id: id,
    user_id: PREVIEW_PROFILE_ID,
    side,
    shares,
    avg_price: invested / shares,
    invested_usdc: invested,
    realized_pnl: outcome === side ? shares - invested : -invested,
    created_at: "2026-07-15T07:34:00.000Z",
    updated_at: "2026-07-17T10:00:00.000Z",
    market_question: question,
    usdc_yes_amount: 58,
    usdc_no_amount: 42,
    status,
    resolved_outcome: outcome,
  }
}

function previewTrade(
  id: string,
  question: string,
  side: string,
  shares: number,
  price: number,
  amount: number,
): MarketTrade {
  return {
    id,
    market_id: id.replace("trade", "portfolio"),
    user_id: PREVIEW_PROFILE_ID,
    side,
    action: "BUY",
    shares,
    price,
    amount_usdc: amount,
    fee_usdc: 0,
    gross_usdc: amount,
    tx_hash: null,
    created_at: "2026-07-15T07:34:00.000Z",
    market_question: question,
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
