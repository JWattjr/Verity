"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, Swords, TrendingUp } from "lucide-react"
import { useFeed } from "@/hooks/useFeed"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import {
  useActivePvpEventsQuery,
  useCastFreeVoteMutation,
  useDailyVotesQuery,
  useToggleLikeMutation,
} from "@/store/verity/verityQueries"
import { type FeedPost, type MarketPost } from "@/lib/verity"
import MarketFeedCard from "@/components/markets/MarketFeedCard"
import { toast } from "@/lib/toast"

export default function MarketsHomeView() {
  const { profile } = useWalletProfile()
  const {
    items: feedItems,
    loading: feedLoading,
    reload: reloadFeed,
  } = useFeed(profile?.id, true)
  const { data: pvpEvents = [] } = useActivePvpEventsQuery()
  const { data: dailyVotesData } = useDailyVotesQuery(profile?.id || "")
  const castFreeVoteMutation = useCastFreeVoteMutation()
  const toggleLikeMutation = useToggleLikeMutation()

  const [searchQuery, setSearchQuery] = useState("")
  const dailyVotesRemaining = dailyVotesData?.votesRemaining ?? 10

  // Filter markets (excluding categories)
  const filteredMarkets = useMemo(() => {
    if (!feedItems) return []
    return feedItems.filter((item) => {
      if (item.type !== "market" || !item.market) return false

      const isResolved =
        item.market.status === "resolved" ||
        item.market.status === "voided" ||
        (item.market.category?.toLowerCase() === "pvp" &&
          (() => {
            const children =
              item.market.childMarkets || item.market.child_markets || []
            return (
              children.length > 0 &&
              children.every(
                (child: MarketPost) =>
                  child.status === "resolved" ||
                  child.status === "voided" ||
                  child.resolvedOutcome,
              )
            )
          })())

      if (isResolved) return false

      return item.market.question
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    })
  }, [feedItems, searchQuery])

  async function handleFreeVote(marketId: string, side: "YES" | "NO") {
    if (!profile) {
      toast.error("Please sign in to cast a signal.")
      return
    }
    try {
      await castFreeVoteMutation.mutateAsync({
        marketId,
        userId: profile.id,
        side,
      })
      toast.success(`Casted your ${side} signal!`)
      void reloadFeed()
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit signal.",
      )
    }
  }

  async function handleLike(postId: string, currentlyLiked: boolean) {
    if (!profile) {
      toast.error("Please sign in to like this market.")
      return
    }
    try {
      await toggleLikeMutation.mutateAsync({
        postId,
        profileId: profile.id,
        currentlyLiked,
      })
      void reloadFeed()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update like.")
    }
  }

  return (
    <div className="w-full py-8 font-sans sm:py-12">
      {/* Editorial Header */}
      <header className="mb-8 border-b border-border pb-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[0.88] tracking-[-0.02em] text-charcoal-primary">
              SPORTS & <span className="text-ember-orange">PREDICTION</span>{" "}
              MARKETS
            </h1>
            <p className="mt-4 max-w-[650px] text-sm leading-relaxed text-graphite sm:text-base">
              Follow real-time sports signals, place your predictions, and build
              your win record. Every proposition is verified against official
              league results.
            </p>
          </div>
        </div>
      </header>

      {/* Featured Arena Banner */}
      {pvpEvents.length > 0 && (
        <div className="mb-8 rounded-[6px] border border-ember-orange/30 bg-gradient-to-r from-ember-orange/10 via-surface to-surface p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] bg-ember-orange text-white shadow-md">
                <Swords className="h-6 w-6" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ember-orange/20 px-2 py-0.5 text-[10px] font-bold text-ember-orange uppercase tracking-wider">
                  Featured Mode
                </span>
                <h3 className="text-base sm:text-lg font-bold text-charcoal-primary">
                  1v1 PvP Duel Arena is Live
                </h3>
                <p className="text-xs text-graphite">
                  Pick your propositions across active matches and challenge
                  opponents for Arena XP.
                </p>
              </div>
            </div>
            <Link
              href="/arena"
              className="inline-flex items-center gap-2 rounded-[6px] bg-ember-orange px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-ember-orange/90 transition-all cursor-pointer shrink-0"
            >
              <span>Play PvP Duels</span>
              <Swords className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ash" />
          <input
            type="text"
            placeholder="Search prediction markets or match fixtures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-[6px] border border-border bg-surface pl-10 pr-4 text-sm text-charcoal-primary placeholder:text-ash focus:border-ember-orange focus:outline-none focus:ring-1 focus:ring-ember-orange transition-all"
          />
        </div>
      </div>

      {/* Markets Feed */}
      {feedLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-36 rounded-[6px] border border-border bg-surface animate-pulse"
            />
          ))}
        </div>
      ) : filteredMarkets.length === 0 ? (
        <div className="rounded-[6px] border border-border bg-surface p-12 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-ash mb-3" />
          <h3 className="text-base font-bold text-charcoal-primary">
            No Markets Found
          </h3>
          <p className="text-xs text-graphite mt-1">
            {searchQuery
              ? `No markets matching "${searchQuery}". Try clearing your search.`
              : "Check back shortly for new match propositions!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMarkets.map((item) => (
            <MarketFeedCard
              key={item.id}
              item={item}
              dailyVotesRemaining={dailyVotesRemaining}
              onLike={() => handleLike(item.id, item.hasLiked || false)}
              onVote={(_market, side) =>
                handleFreeVote(item.market?.id || "", side)
              }
              onOpenPvp={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  )
}
