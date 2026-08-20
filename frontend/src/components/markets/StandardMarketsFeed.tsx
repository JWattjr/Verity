"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import MarketFeedCard from "@/components/markets/MarketFeedCard"
import { toast } from "@/lib/toast"
import {
  useGetCategoriesQuery,
  useToggleLikeMutation,
} from "@/store/verity/verityQueries"
import { type FeedPost, type MarketPost, type Profile } from "@/lib/verity"

interface StandardMarketsFeedProps {
  feedItems: FeedPost[]
  feedLoading: boolean
  reloadFeed: () => void
  profile: Profile | null | undefined
  setActiveTab: (tab: "general" | "pvp-arena") => void
  pvpEvents: unknown[]
  pvpEventsLoading: boolean
  setSelectedPvpEventId?: (id: string | null) => void
}

export default function StandardMarketsFeed({
  feedItems,
  feedLoading,
  reloadFeed,
  profile,
  setActiveTab,
  setSelectedPvpEventId,
}: StandardMarketsFeedProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const toggleLikeMutation = useToggleLikeMutation()
  const { data: categoriesData } = useGetCategoriesQuery()

  // Filtered standard markets
  const filteredMarkets = useMemo(() => {
    if (!feedItems) return []
    return feedItems.filter((item) => {
      if (item.type !== "market" || !item.market) return false

      // Exclude resolved and voided markets
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

      if (isResolved) {
        return false
      }

      const matchesSearch = item.market.question
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesCategory =
        !selectedCategory ||
        item.market.category?.toLowerCase() === selectedCategory.toLowerCase()
      return matchesSearch && matchesCategory
    })
  }, [feedItems, searchQuery, selectedCategory])

  async function handleLike(postId: string, currentlyLiked: boolean) {
    if (!profile) {
      toast.error("Connect your wallet to like this market.")
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col border-y border-border bg-surface lg:flex-row lg:items-stretch">
        <label className="flex min-h-12 flex-1 items-center gap-3 border-x border-b border-border px-4 lg:max-w-sm lg:border-b-0 lg:border-r-0">
          <Search className="h-4 w-4 shrink-0 text-accent" />
          <span className="sr-only">Search markets</span>
          <Input
            type="search"
            placeholder="SEARCH MARKETS"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-full w-full border-0 bg-transparent px-0 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-primary shadow-none placeholder:text-ash focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </label>

        <div className="no-scrollbar flex min-h-12 flex-1 items-stretch overflow-x-auto border-x border-border font-sans text-[11px] font-bold uppercase tracking-[0.08em]">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 border-r border-border px-5 transition-colors ${
              selectedCategory === null
                ? "bg-accent text-white"
                : "bg-surface text-ash hover:bg-surface-muted hover:text-charcoal-primary"
            }`}
            type="button"
          >
            All categories
          </button>
          {(categoriesData && categoriesData.length > 0
            ? categoriesData
            : [
                { slug: "crypto", displayName: "Crypto" },
                { slug: "culture", displayName: "Culture" },
                { slug: "economics", displayName: "Economics" },
                { slug: "politics", displayName: "Politics" },
                { slug: "sports", displayName: "Sports" },
                { slug: "miscellaneous", displayName: "Miscellaneous" },
              ]
          ).map((cat) => {
            const isSelected =
              selectedCategory?.toLowerCase() === cat.slug.toLowerCase()
            return (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`shrink-0 border-r border-border px-5 transition-colors ${
                  isSelected
                    ? "bg-accent text-white"
                    : "bg-surface text-ash hover:bg-surface-muted hover:text-charcoal-primary"
                }`}
                type="button"
              >
                {cat.displayName}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-border pb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-ash">
        <span>{filteredMarkets.length} open markets</span>
        <span>Verified live propositions</span>
      </div>

      <section className="grid grid-cols-1 border-l border-t border-border xl:grid-cols-2">
        {filteredMarkets.map((item) => (
          <MarketFeedCard
            item={item}
            key={item.id}
            likePending={toggleLikeMutation.isPending}
            onLike={(marketItem) =>
              handleLike(marketItem.id, Boolean(marketItem.viewerLiked))
            }
            onOpenPvp={(market) => {
              if (setSelectedPvpEventId) {
                setSelectedPvpEventId(market.id)
              } else {
                setActiveTab("pvp-arena")
              }
            }}
          />
        ))}
      </section>
    </div>
  )
}
