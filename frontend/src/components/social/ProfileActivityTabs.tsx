"use client"

import React, { useState } from "react"
import Link from "next/link"
import MarketFeedCard from "@/components/markets/MarketFeedCard"
import {
  getMarketPrice,
  type FeedPost,
  type MarketPost,
  type Profile,
  type MarketPosition,
} from "@/lib/verity"
import { ArrowUpRight, ChevronRight, ChevronLeft } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useToggleLikeMutation,
} from "@/store/verity/verityQueries"
import { toast } from "@/lib/toast"

export type ProfileActivityTab = "predictions" | "markets"

interface ProfileActivityTabsProps {
  activeTab: ProfileActivityTab
  items?: FeedPost[]
  positions?: MarketPosition[]
  profile: Profile
  viewerProfile?: Profile | null
  onOpenMarket: (market: MarketPost) => void
  onOpenPvp?: (market: MarketPost) => void
  loading?: boolean
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-28 rounded-[2px] border border-border bg-surface animate-pulse"
        />
      ))}
    </div>
  )
}

export default function ProfileActivityTabs({
  activeTab,
  items = [],
  positions = [],
  profile,
  viewerProfile,
  onOpenMarket,
  onOpenPvp,
  loading = false,
}: ProfileActivityTabsProps) {
  const queryClient = useQueryClient()
  const toggleLikeMutation = useToggleLikeMutation()
  const [predictionFilter, setPredictionFilter] = useState<
    "all" | "unresolved" | "resolved" | "won" | "lost"
  >("all")
  const [predictionPage, setPredictionPage] = useState(1)
  const PREDICTIONS_PER_PAGE = 5

  async function handleLike(item: FeedPost) {
    if (!viewerProfile) {
      toast.error("Connect your wallet to like this market.")
      return
    }

    try {
      await toggleLikeMutation.mutateAsync({
        postId: item.id,
        profileId: viewerProfile.id,
        currentlyLiked: Boolean(item.viewerLiked),
      })
      void queryClient.invalidateQueries({
        queryKey: ["profile-activity", profile.id],
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update like.")
    }
  }

  if (loading) {
    return <ProfileSkeleton />
  }

  if (activeTab === "predictions") {
    const filteredPositions = positions.filter((pos) => {
      if (predictionFilter === "resolved") return pos.status === "resolved"
      if (predictionFilter === "unresolved") return pos.status !== "resolved"
      if (predictionFilter === "won")
        return pos.status === "resolved" && pos.resolved_outcome === pos.side
      if (predictionFilter === "lost")
        return (
          pos.status === "resolved" &&
          pos.resolved_outcome !== pos.side &&
          pos.resolved_outcome !== null
        )
      return true
    })

    const totalPages = Math.ceil(
      filteredPositions.length / PREDICTIONS_PER_PAGE,
    )
    const paginatedPositions = filteredPositions.slice(
      (predictionPage - 1) * PREDICTIONS_PER_PAGE,
      predictionPage * PREDICTIONS_PER_PAGE,
    )

    return (
      <section className="verity-profile-predictions">
        <div className="verity-profile-predictions__toolbar">
          <div className="verity-profile-predictions__summary">
            <span>Position history</span>
            <strong>{filteredPositions.length} RECORDS</strong>
          </div>
          <div
            aria-label="Filter prediction history"
            className="verity-profile-predictions__filters"
            role="group"
          >
            {(["all", "unresolved", "resolved", "won", "lost"] as const).map(
              (filter) => (
                <button
                  aria-pressed={predictionFilter === filter}
                  key={filter}
                  onClick={() => {
                    setPredictionFilter(filter)
                    setPredictionPage(1)
                  }}
                  className={predictionFilter === filter ? "is-active" : ""}
                  type="button"
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ),
            )}
          </div>
        </div>
        {paginatedPositions.length > 0 ? (
          <>
            <div className="verity-profile-predictions__list">
              {paginatedPositions.map((pos) => {
                const isYes = pos.side === "YES"
                const currentPrice =
                  pos.status === "resolved"
                    ? pos.resolved_outcome === pos.side
                      ? 1.0
                      : 0.0
                    : getMarketPrice(
                        {
                          usdc_yes_amount: pos.usdc_yes_amount ?? 0,
                          usdc_no_amount: pos.usdc_no_amount ?? 0,
                        },
                        pos.side,
                      )
                const currentValue = pos.shares * currentPrice
                const unrealizedPnL = currentValue - (pos.invested_usdc || 0)
                const positionState =
                  pos.status !== "resolved"
                    ? "OPEN"
                    : pos.resolved_outcome === pos.side
                      ? "WON"
                      : pos.resolved_outcome
                        ? "LOST"
                        : "RESOLVED"

                const isPvp = pos.category?.toLowerCase() === "pvp"
                const href = isPvp
                  ? "/arena"
                  : `/markets/${pos.market_id}`

                return (
                  <article
                    className="verity-profile-prediction"
                    key={pos.id}
                  >
                    <div className="verity-profile-prediction__title">
                      <div>
                        <span className={isYes ? "is-yes" : "is-no"}>
                          {pos.side}
                        </span>
                        <small className={`is-${positionState.toLowerCase()}`}>
                          {positionState}
                        </small>
                      </div>
                      <h3 title={pos.market_question || ""}>
                        {pos.market_question ||
                          `Market ID: ${pos.market_id.slice(0, 10)}`}
                      </h3>
                    </div>

                    <dl className="verity-profile-prediction__metrics">
                      <div>
                        <dt>Shares</dt>
                        <dd>{pos.shares.toFixed(2)}</dd>
                      </div>
                      <div>
                        <dt>Cost</dt>
                        <dd>${pos.invested_usdc.toFixed(2)}</dd>
                      </div>
                      <div>
                        <dt>P&amp;L</dt>
                        <dd className={unrealizedPnL >= 0 ? "is-positive" : "is-negative"}>
                          {unrealizedPnL >= 0 ? "+" : ""}
                          {unrealizedPnL.toFixed(2)}
                        </dd>
                      </div>
                    </dl>

                    <Link
                      aria-label={`Open ${pos.market_question || "market"}`}
                      href={href}
                    >
                      <span>OPEN MARKET</span>
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </article>
                )
              })}
            </div>
            {totalPages > 1 && (
              <nav
                aria-label="Prediction history pages"
                className="verity-profile-predictions__pagination"
              >
                <button
                  onClick={() => setPredictionPage((p) => Math.max(1, p - 1))}
                  disabled={predictionPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft aria-hidden="true" />
                  PREV
                </button>
                <span>
                  <small>PAGE</small>
                  <strong>{predictionPage}</strong>
                  <i>/</i>
                  <strong>{totalPages}</strong>
                </span>
                <button
                  onClick={() =>
                    setPredictionPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={predictionPage === totalPages}
                  aria-label="Next page"
                >
                  NEXT
                  <ChevronRight aria-hidden="true" />
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="verity-profile-predictions__empty">
            <span>NO SIGNAL</span>
            <strong>
              No {predictionFilter !== "all" ? predictionFilter : ""}{" "}
              predictions found.
            </strong>
          </div>
        )}
      </section>
    )
  }

  // Markets Tab
  const marketItems = items.filter((item) => item.market)

  return (
    <div className="flex flex-col gap-3">
      {marketItems.length === 0 ? (
        <div className="rounded-[2px] border border-border bg-surface p-12 text-center text-xs font-mono text-ash font-bold">
          No markets found for this user.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {marketItems.map((item) => (
            <MarketFeedCard
              key={item.id}
              item={item}
              onLike={() => handleLike(item)}
              onOpenPvp={onOpenPvp || onOpenMarket}
            />
          ))}
        </div>
      )}
    </div>
  )
}
