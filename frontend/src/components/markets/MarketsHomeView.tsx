"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, TrendingUp } from "lucide-react"
import { useFeed } from "@/hooks/useFeed"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import {
  useToggleLikeMutation,
} from "@/store/verity/verityQueries"
import { type MarketPost } from "@/lib/verity"
import MarketFeedCard from "@/components/markets/MarketFeedCard"
import { toast } from "@/lib/toast"

export default function MarketsHomeView() {
  const router = useRouter()
  const { profile } = useWalletProfile()
  const {
    items: feedItems,
    loading: feedLoading,
    reload: reloadFeed,
  } = useFeed(profile?.id, true)
  const toggleLikeMutation = useToggleLikeMutation()

  const [searchQuery, setSearchQuery] = useState("")

  const handleOpenMarket = (market: any) => {
    const targetId =
      market.parentMarketId || market.parent_market_id || market.id
    router.push(`/arena?id=${encodeURIComponent(targetId)}`)
  }

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
    <div className="w-full pt-6 pb-24 font-sans sm:py-12">
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

      {/* Search Input */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ash" />
          <input
            type="text"
            placeholder="Search prediction markets or match fixtures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-[2px] border border-border bg-surface pl-10 pr-4 text-sm text-charcoal-primary placeholder:text-ash focus:border-ember-orange focus:outline-none focus:ring-1 focus:ring-ember-orange transition-all"
          />
        </div>
      </div>

      {/* Markets Feed */}
      {feedLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-36 rounded-[2px] border border-border bg-surface animate-pulse"
            />
          ))}
        </div>
      ) : filteredMarkets.length === 0 ? (
        <div className="rounded-[2px] border border-border bg-surface p-12 text-center">
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
              onLike={() => handleLike(item.id, item.hasLiked || false)}
              onOpenPvp={handleOpenMarket}
            />
          ))}
        </div>
      )}
    </div>
  )
}
