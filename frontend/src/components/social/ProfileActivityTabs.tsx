"use client"

import React, { useState } from "react"
import Link from "next/link"
import UserHoverCard from "@/components/social/UserHoverCard"
import MarketFeedCard from "@/components/markets/MarketFeedCard"
import { FeedSkeleton } from "@/components/feed/FeedShell"
import {
  displayHandle,
  displayName,
  relativeTime,
  getMarketPrice,
  type FeedPost,
  type MarketPost,
  type Profile,
  type MarketPosition,
} from "@/lib/verity"
import { ArrowUpRight, ChevronRight, ChevronLeft } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useCastFreeVoteMutation,
  useDailyVotesQuery,
  useToggleLikeMutation,
} from "@/store/verity/verityQueries"
import { toast } from "@/lib/toast"

export type ProfileActivityTab = "predictions" | "markets" | "activity"

interface ProfileActivityTabsProps {
  activeTab: ProfileActivityTab
  items?: FeedPost[]
  positions?: MarketPosition[]
  profile: Profile
  viewerProfile?: Profile | null
  onOpenMarket: (market: MarketPost) => void
  onOpenPvp?: (market: MarketPost) => void
  onOpenPost?: (post: FeedPost) => void
  loading?: boolean
}

export default function ProfileActivityTabs({
  activeTab,
  items = [],
  positions = [],
  profile,
  viewerProfile,
  onOpenMarket,
  onOpenPvp,
  onOpenPost,
  loading = false,
}: ProfileActivityTabsProps) {
  const queryClient = useQueryClient()
  const castFreeVoteMutation = useCastFreeVoteMutation()
  const toggleLikeMutation = useToggleLikeMutation()
  const { data: dailyVotesData } = useDailyVotesQuery(viewerProfile?.id || "")
  const dailyVotesRemaining = dailyVotesData?.votesRemaining ?? 10
  const [predictionFilter, setPredictionFilter] = useState<
    "all" | "unresolved" | "resolved" | "won" | "lost"
  >("all")
  const [predictionPage, setPredictionPage] = useState(1)
  const PREDICTIONS_PER_PAGE = 5

  async function handleFreeVote(market: MarketPost, side: "YES" | "NO") {
    if (!viewerProfile) {
      toast.error("Connect your wallet to cast a vote.")
      return
    }

    try {
      await castFreeVoteMutation.mutateAsync({
        marketId: market.id,
        userId: viewerProfile.id,
        side,
      })
      toast.success(`Casted your ${side} signal!`)
      void queryClient.invalidateQueries({
        queryKey: ["profile-activity", profile.id],
      })
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit signal.",
      )
    }
  }

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
    return <FeedSkeleton />
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
                  ? "/markets?tab=pvp-arena"
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

  if (activeTab === "activity") {
    const rows = items
    return (
      <section className="flex flex-col gap-3">
        {rows.length > 0 ? (
          rows.map((item) => (
            <CommentActivityRow
              item={item}
              key={item.id}
              onOpenMarket={onOpenMarket}
              onOpenPost={onOpenPost}
            />
          ))
        ) : (
          <div className="verity-card p-8 text-center text-sm tracking-[-0.18px] text-ash">
            No activity comments or replies recorded yet.
          </div>
        )}
      </section>
    )
  }

  // Default is "markets" tab (custom created markets by user)
  const rows = items
  return (
    <section className="grid grid-cols-1 border-l border-t border-border xl:grid-cols-2">
      {rows.length > 0 ? (
        rows.map((item) => (
          <MarketFeedCard
            dailyVotesRemaining={dailyVotesRemaining}
            item={item}
            key={item.id}
            likePending={toggleLikeMutation.isPending}
            onLike={handleLike}
            onOpenPvp={onOpenPvp ?? onOpenMarket}
            onVote={handleFreeVote}
            votePending={castFreeVoteMutation.isPending}
          />
        ))
      ) : (
        <div className="col-span-full flex min-h-52 items-center justify-center border-b border-r border-border bg-surface p-10 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ash">
          No created markets yet.
        </div>
      )}
    </section>
  )
}

function CommentActivityRow({
  item,
  onOpenMarket,
  onOpenPost,
}: {
  item: FeedPost
  onOpenMarket: (market: MarketPost) => void
  onOpenPost?: (post: FeedPost) => void
}) {
  const profileHref = `/profile/${encodeURIComponent(item.author.id)}`
  const avatarColor = "bg-sunburst-yellow"

  return (
    <article className="verity-card flex gap-3 p-4 sm:gap-4 sm:p-5">
      <div className="shrink-0">
        {profileHref ? (
          <UserHoverCard href={profileHref} profile={item.author}>
            <Link
              className={`clickable verity-blob h-10 w-10 ${avatarColor}`}
              href={profileHref}
              onClick={(event) => event.stopPropagation()}
            >
              <span className="verity-blob-smile" />
            </Link>
          </UserHoverCard>
        ) : (
          <div className={`verity-blob h-10 w-10 ${avatarColor}`}>
            <span className="verity-blob-smile" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1.5 text-sm">
          {profileHref ? (
            <UserHoverCard href={profileHref} profile={item.author}>
              <Link
                className="clickable-link truncate font-semibold tracking-[-0.18px] text-charcoal-primary"
                href={profileHref}
                onClick={(event) => event.stopPropagation()}
              >
                {displayName(item.author)}
              </Link>
            </UserHoverCard>
          ) : (
            <span className="truncate font-semibold tracking-[-0.18px] text-charcoal-primary hover:underline">
              {displayName(item.author)}
            </span>
          )}
          {profileHref ? (
            <Link
              className="clickable-link truncate font-mono text-xs text-ash"
              href={profileHref}
              onClick={(event) => event.stopPropagation()}
            >
              {displayHandle(item.author)}
            </Link>
          ) : (
            <span className="truncate font-mono text-xs text-ash">
              {displayHandle(item.author)}
            </span>
          )}
          <span className="text-ash">{"\u00B7"}</span>
          <span className="font-mono text-xs text-ash hover:underline">
            {relativeTime(item.created_at)}
          </span>
        </div>

        {item.parentPost?.author && (
          <div className="mb-2 text-xs font-mono text-ash">
            Replying to{" "}
            <span className="text-graphite font-semibold">
              @{displayHandle(item.parentPost.author)}
            </span>
          </div>
        )}

        <p className="mb-4 whitespace-pre-wrap text-[15px] leading-[1.47] tracking-[-0.2px] text-graphite">
          {item.content}
        </p>

        {item.parentPost && (
          <div
            className="border border-stone-surface rounded-xl overflow-hidden hover:bg-stone-surface/30 transition-colors duration-200 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              if (item.parentPost?.market) {
                onOpenMarket(item.parentPost.market)
              } else if (item.parentPost) {
                onOpenPost?.(item.parentPost)
              }
            }}
          >
            <div className="p-3.5 sm:p-4">
              <div className="flex items-center gap-1.5 text-xs mb-1.5">
                <span className="font-semibold text-charcoal-primary">
                  {displayName(item.parentPost.author)}
                </span>
                <span className="font-mono text-ash">
                  {displayHandle(item.parentPost.author)}
                </span>
              </div>
              {item.parentPost.market ? (
                <div>
                  <span className="font-mono text-[10px] font-bold text-meadow-green uppercase tracking-wider block mb-1">
                    Market
                  </span>
                  <h4 className="text-[14px] font-semibold text-charcoal-primary leading-[1.3] mb-1">
                    {item.parentPost.market.question}
                  </h4>
                  <p className="text-xs text-ash line-clamp-2">
                    {item.parentPost.content}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-graphite line-clamp-3 leading-[1.4]">
                  {item.parentPost.content}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
