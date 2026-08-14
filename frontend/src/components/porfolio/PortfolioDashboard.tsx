"use client"

import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import {
  ArrowDownLeft,
  BriefcaseBusiness,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react"
import { useAuth } from "@/components/providers/AuthModals"
import PolymarketFundingPanel from "@/features/polymarket/PolymarketFundingPanel"
import {
  usePolymarketAccountQuery,
  usePolymarketFundingQuery,
} from "@/features/polymarket/queries"
import { useDailyVotes } from "@/hooks/useDailyVotes"
import { useMarketResolution } from "@/hooks/useMarketResolution"
import { useUserPortfolio } from "@/hooks/useUserPortfolio"
import toast from "@/lib/toast"
import { apiRequest } from "@/store/apiClient"
import {
  useAccruedLpFeesQuery,
  useClaimLpFeesMutation,
  useUserTradesQuery,
} from "@/store/verity/verityQueries"
import PortfolioTokenTable, {
  type PortfolioTokenRow,
} from "./PortfolioTokenTable"

type PortfolioTab = "overview" | "tokens" | "wins" | "activity"

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export default function PortfolioDashboard() {
  const { login } = useAuth()
  const {
    positions,
    isLoading: isPortfolioLoading,
    stats,
    usdcBalance,
    profile,
    refetch,
  } = useUserPortfolio()
  const userId = profile?.id ?? ""
  const polymarketAccount = usePolymarketAccountQuery(userId)
  const polymarketFunding = usePolymarketFundingQuery(
    userId,
    polymarketAccount.data?.status === "ready",
  )
  const { data: trades = [], isLoading: isTradesLoading } =
    useUserTradesQuery(userId)
  const { data: accruedData } = useAccruedLpFeesQuery(userId)
  const { mutateAsync: claimLpFees, isPending: isClaimingFees } =
    useClaimLpFeesMutation()
  const { redeemMultipleWinnings } = useMarketResolution()
  const { dailyVotes, isLoading: isDailyVotesLoading } = useDailyVotes(userId)

  const [activeTab, setActiveTab] = useState<PortfolioTab>("overview")
  const [isFundingOpen, setIsFundingOpen] = useState(false)
  const fundingButtonRef = useRef<HTMLButtonElement>(null)
  const [isClaimingAll, setIsClaimingAll] = useState(false)

  const accruedLpFees = accruedData?.accruedFeesUsdc ?? 0
  const openPositions = useMemo(
    () => positions.filter((position) => position.status !== "resolved"),
    [positions],
  )
  const winningPositions = useMemo(
    () =>
      positions.filter(
        (position) =>
          position.status === "resolved" &&
          position.resolved_outcome?.toUpperCase() ===
            position.side?.toUpperCase() &&
          position.shares > 0,
      ),
    [positions],
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
        pnl:
          position.status === "resolved"
            ? position.realizedPnL
            : position.unrealizedPnL,
      })),
    [positions],
  )

  async function handleClaimLpFees() {
    try {
      const result = await claimLpFees()
      toast.success(
        `${result.amountClaimed.toFixed(4)} USDC in LP fees claimed.`,
      )
      await refetch()
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to claim LP fees."))
    }
  }

  async function handleClaimAll() {
    if (winningPositions.length === 0) return

    const marketIds = winningPositions.map((position) => position.market_id)
    setIsClaimingAll(true)
    try {
      await redeemMultipleWinnings(marketIds)
      await Promise.all(
        marketIds.map((marketId) =>
          apiRequest(`/markets/${marketId}/positions?profileId=${userId}`),
        ),
      )
      await refetch()
      toast.success("All available winnings claimed.")
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to claim winnings."))
    } finally {
      setIsClaimingAll(false)
    }
  }

  function closeFundingPanel() {
    setIsFundingOpen(false)
    window.requestAnimationFrame(() => fundingButtonRef.current?.focus())
  }

  const tradingBalance = polymarketAccount.isLoading
    ? "—"
    : polymarketAccount.isError
      ? "UNAVAILABLE"
      : polymarketAccount.data?.status !== "ready"
        ? "SETUP REQUIRED"
        : polymarketFunding.isError
          ? "UNAVAILABLE"
          : polymarketFunding.isLoading
            ? "—"
            : `$${polymarketFunding.data?.pusdBalance || "0"}`

  if (!profile) {
    return (
      <section className="verity-access-gate">
        <span className="verity-access-gate__icon" aria-hidden="true">
          <BriefcaseBusiness />
        </span>
        <p>Your Verity account</p>
        <h1>PORTFOLIO</h1>
        <span>
          Sign in to monitor positions, P&amp;L, winnings, and your USDC
          balance.
        </span>
        <button onClick={login} type="button">
          SIGN IN TO CONTINUE
        </button>
      </section>
    )
  }

  if (isPortfolioLoading || isTradesLoading) {
    return (
      <div className="verity-product-page">
        <div className="verity-product-skeleton is-hero" />
        <div className="verity-product-skeleton" />
        <div className="verity-product-skeleton" />
      </div>
    )
  }

  return (
    <div className="verity-product-page verity-portfolio-page">
      <header className="verity-product-hero verity-portfolio-hero">
        <div>
          <h1>
            PORTFOLIO<span>.</span>
          </h1>
          <p className="verity-product-copy">
            One record for every position, payout, and transaction you make on
            Verity.
          </p>
        </div>

        <div className="verity-portfolio-balance" aria-live="polite">
          <span>Available to trade</span>
          <strong>{tradingBalance}</strong>
          <small>
            {polymarketFunding.isLoading
              ? "Refreshing Polygon balance…"
              : isDailyVotesLoading
                ? "Loading daily signals…"
                : `pUSD · ${dailyVotes.votesRemaining}/${dailyVotes.votesLimit} daily signals remaining`}
          </small>
        </div>
      </header>

      <section
        className="verity-portfolio-stats"
        aria-label="Portfolio summary"
      >
        <PortfolioStat
          label="Legacy USDC balance"
          value={`$${usdcBalance.toFixed(2)}`}
        />
        <PortfolioStat
          label="Open positions"
          value={`$${stats.holdingsValue.toFixed(2)}`}
        />
        <PortfolioStat
          accent={stats.unrealizedPnL >= 0}
          label="Unrealized P&L"
          negative={stats.unrealizedPnL < 0}
          value={`${stats.unrealizedPnL >= 0 ? "+" : ""}$${stats.unrealizedPnL.toFixed(2)}`}
        />
        <div className="verity-portfolio-stat verity-fee-stat">
          <span>Accrued LP fees</span>
          <strong>${accruedLpFees.toFixed(4)}</strong>
          {accruedLpFees > 0 ? (
            <button
              disabled={isClaimingFees}
              onClick={() => void handleClaimLpFees()}
              type="button"
            >
              {isClaimingFees ? "CLAIMING" : "CLAIM"}
            </button>
          ) : null}
        </div>
      </section>

      <section
        className="verity-portfolio-actions"
        aria-label="Portfolio actions"
      >
        <button
          aria-controls="polymarket-funding-panel"
          aria-expanded={isFundingOpen}
          onClick={() => setIsFundingOpen(true)}
          ref={fundingButtonRef}
          type="button"
        >
          <ArrowDownLeft aria-hidden="true" />
          <span>FUND TRADING</span>
        </button>
        <button
          disabled={
            polymarketAccount.data?.status !== "ready" ||
            polymarketFunding.isFetching
          }
          onClick={() => void polymarketFunding.refetch()}
          type="button"
        >
          <RefreshCw
            aria-hidden="true"
            className={polymarketFunding.isFetching ? "animate-spin" : ""}
          />
          <span>REFRESH BALANCE</span>
        </button>
        {polymarketAccount.data?.depositWalletAddress ? (
          <Link
            href={`https://polygonscan.com/address/${polymarketAccount.data.depositWalletAddress}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <WalletCards aria-hidden="true" />
            <span>VIEW DEPOSIT WALLET</span>
          </Link>
        ) : (
          <button disabled type="button">
            <WalletCards aria-hidden="true" />
            <span>VIEW DEPOSIT WALLET</span>
          </button>
        )}
        {polymarketAccount.data?.circleWalletAddress ? (
          <Link
            href={`https://polygonscan.com/address/${polymarketAccount.data.circleWalletAddress}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" />
            <span>POLYGON SIGNER</span>
          </Link>
        ) : (
          <button disabled type="button">
            <ShieldCheck aria-hidden="true" />
            <span>POLYGON SIGNER</span>
          </button>
        )}
      </section>

      {isFundingOpen ? (
        <PolymarketFundingPanel onClose={closeFundingPanel} userId={userId} />
      ) : null}

      <div className="verity-section-heading verity-portfolio-heading">
        <div>
          <span>Account record</span>
          <h2>YOUR ACTIVITY</h2>
        </div>
        <div
          aria-label="Portfolio sections"
          className="verity-segmented-tabs"
          role="tablist"
        >
          {(
            [
              ["overview", "Overview"],
              ["tokens", `Tokens ${positions.length}`],
              ["wins", `Wins ${winningPositions.length}`],
              ["activity", "Activity"],
            ] as const
          ).map(([tab, label]) => (
            <button
              aria-selected={activeTab === tab}
              className={activeTab === tab ? "is-active" : ""}
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="verity-portfolio-record" aria-live="polite">
        {activeTab === "overview" ? (
          <div className="verity-portfolio-overview-grid">
            <section className="verity-portfolio-overview-panel">
              <header>
                <div>
                  <span>Portfolio now</span>
                  <h3>ACTIVE POSITIONS</h3>
                </div>
                <button onClick={() => setActiveTab("tokens")} type="button">
                  VIEW ALL
                </button>
              </header>
              {openPositions.length > 0 ? (
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
                            position.unrealizedPnL < 0
                              ? "is-negative"
                              : "is-positive"
                          }
                        >
                          {position.unrealizedPnL >= 0 ? "+" : ""}$
                          {position.unrealizedPnL.toFixed(2)}
                        </em>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="verity-overview-empty">No active positions.</p>
              )}
            </section>

            <section className="verity-portfolio-overview-panel">
              <header>
                <div>
                  <span>Latest transactions</span>
                  <h3>RECENT ACTIVITY</h3>
                </div>
                <button onClick={() => setActiveTab("activity")} type="button">
                  VIEW ALL
                </button>
              </header>
              {trades.length > 0 ? (
                <div className="verity-overview-trade-list">
                  {trades.slice(0, 5).map((trade) => (
                    <Link href={`/markets/${trade.market_id}`} key={trade.id}>
                      <span
                        className={trade.action === "SELL" ? "is-sell" : ""}
                      >
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
              ) : (
                <p className="verity-overview-empty">No trade activity yet.</p>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === "tokens" ? (
          tokenRows.length > 0 ? (
            <PortfolioTokenTable rows={tokenRows} />
          ) : (
            <PortfolioEmpty
              action="BROWSE MARKETS"
              description="Your outcome-token positions will appear here."
              href="/markets"
              title="NO TOKEN POSITIONS"
            />
          )
        ) : null}

        {activeTab === "wins" ? (
          winningPositions.length > 0 ? (
            <>
              <div className="verity-winnings-bar">
                <div>
                  <span>Available payouts</span>
                  <strong>
                    $
                    {winningPositions
                      .reduce((sum, item) => sum + item.shares, 0)
                      .toFixed(2)}
                  </strong>
                </div>
                <button
                  disabled={isClaimingAll}
                  onClick={() => void handleClaimAll()}
                  type="button"
                >
                  {isClaimingAll ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : null}
                  CLAIM ALL
                </button>
              </div>
              <div className="verity-position-list">
                {winningPositions.map((position) => (
                  <article
                    className="verity-position-card is-win"
                    key={position.id}
                  >
                    <div className="verity-position-card__title">
                      <span>WINNING POSITION</span>
                      <h3>
                        {position.market_question || "Resolved Verity market"}
                      </h3>
                      <small>Resolved {position.resolved_outcome}</small>
                    </div>
                    <div className="verity-position-card__metrics">
                      <PositionMetric
                        label="Your call"
                        value={position.side}
                        accent
                      />
                      <PositionMetric
                        label="Payout"
                        value={`$${position.shares.toFixed(2)}`}
                      />
                    </div>
                    <Link href={`/markets/${position.market_id}`}>
                      VIEW RESULT
                    </Link>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <PortfolioEmpty
              action="VIEW MARKETS"
              description="Resolved winning positions that can be claimed will appear here."
              href="/markets"
              title="NO WINNINGS TO CLAIM"
            />
          )
        ) : null}

        {activeTab === "activity" ? (
          trades.length > 0 ? (
            <div className="verity-trade-list">
              {trades.map((trade) => (
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
                    <PositionMetric
                      label="Shares"
                      value={`${trade.shares.toFixed(2)} ${trade.side}`}
                    />
                    <PositionMetric
                      label="Price"
                      value={`$${trade.price.toFixed(2)}`}
                    />
                    <PositionMetric
                      label="Total amount"
                      value={`${trade.action === "BUY" ? "−" : "+"}$${trade.amount_usdc.toFixed(2)}`}
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
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <PortfolioEmpty
              action="MAKE A PREDICTION"
              description="Your buys, sells, and settlements will build this activity record."
              href="/markets"
              title="NO ACTIVITY YET"
            />
          )
        ) : null}
      </section>
    </div>
  )
}

function PortfolioStat({
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
    <div className="verity-portfolio-stat">
      <span>{label}</span>
      <strong
        className={negative ? "is-negative" : accent ? "is-positive" : ""}
      >
        {value}
      </strong>
    </div>
  )
}

function PositionMetric({
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

function PortfolioEmpty({
  action,
  description,
  href,
  title,
}: {
  action: string
  description: string
  href: string
  title: string
}) {
  return (
    <div className="verity-product-empty">
      <BriefcaseBusiness aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      <Link href={href}>{action}</Link>
    </div>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
