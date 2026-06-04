"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, Swords, Timer, ChevronRight } from "lucide-react"
import { toast } from "react-hot-toast"
import { useCastFreeVoteMutation } from "@/store/verity/verityQueries"
import { calculateYesPercent, displayHandle } from "@/lib/verity"

function getPhaseTag(status: string) {
  switch (status) {
    case "open_for_votes":
      return {
        label: "Voting",
        color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      }
    case "qualified":
      return {
        label: "Qualified",
        color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      }
    case "funding_pool":
      return {
        label: "Funding",
        color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      }
    case "tradable":
      return {
        label: "Trading",
        color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
      }
    case "resolved":
      return {
        label: "Resolved",
        color: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
      }
    default:
      return {
        label: status.replace("_", " "),
        color: "bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/20",
      }
  }
}

interface StandardMarketsFeedProps {
  feedItems: any[]
  feedLoading: boolean
  reloadFeed: () => void
  profile: any
  setActiveTab: (tab: "general" | "pvp-arena") => void
  pvpEvents: any[]
  pvpEventsLoading: boolean
}

export default function StandardMarketsFeed({
  feedItems,
  feedLoading,
  reloadFeed,
  profile,
  setActiveTab,
  pvpEvents,
  pvpEventsLoading,
}: StandardMarketsFeedProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const castFreeVoteMutation = useCastFreeVoteMutation()

  // Filtered standard markets
  const filteredMarkets = useMemo(() => {
    if (!feedItems) return []
    return feedItems.filter((item) => {
      if (item.type !== "market" || !item.market) return false

      // Exclude resolved and voided markets
      if (
        item.market.status === "resolved" ||
        item.market.status === "voided"
      ) {
        return false
      }

      const matchesSearch = item.market.question
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesCategory =
        !selectedCategory || item.market.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [feedItems, searchQuery, selectedCategory])

  // Handle Free vote casting
  async function handleFreeVote(marketId: string, side: "YES" | "NO") {
    if (!profile) {
      toast.error("Connect your wallet to cast a vote.")
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
    } catch (err: any) {
      toast.error(err.message || "Failed to submit signal.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2 bg-white-surface dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-[10px] px-3 py-1.5 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-ash" />
          <input
            type="text"
            placeholder="Search prediction markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm w-full outline-none text-charcoal-primary dark:text-white placeholder:text-ash"
          />
        </div>

        {/* Category Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 font-mono text-xs">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full border transition-all ${
              selectedCategory === null
                ? "bg-inverse text-inverse-text border-inverse"
                : "bg-white-surface border-border text-graphite hover:border-ash dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400"
            }`}
          >
            All
          </button>
          {[
            "Crypto",
            "Culture",
            "Economics",
            "Politics",
            "Sports",
            "Miscellaneous",
          ].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full border transition-all ${
                selectedCategory === cat
                  ? "bg-inverse text-inverse-text border-inverse"
                  : "bg-white-surface border-border text-graphite hover:border-ash dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Markets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* PvP Matchup Cards (Displayed at the top of the grid) */}
        {!selectedCategory &&
          pvpEvents.map((event: any) => (
            <article
              key={event.id}
              onClick={() => setActiveTab("pvp-arena")}
              className="verity-card p-5 border border-indigo-200 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/20 via-transparent to-transparent hover:border-indigo-400 dark:hover:border-indigo-800 transition-all cursor-pointer group relative flex flex-col justify-between"
            >
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider shadow-subtle">
                <Swords className="h-3 w-3" />
                PvP Matchup
              </div>

              <div>
                <span className="font-mono text-[10px] font-bold text-ash uppercase tracking-wider">
                  World Cup Arena
                </span>
                <h3 className="text-xl font-bold tracking-tight text-charcoal-primary dark:text-white mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {event.question}
                </h3>
                <p className="text-xs text-graphite dark:text-zinc-400 mt-2 leading-relaxed">
                  Make 7 predictions on this matchup. Battle head-to-head
                  for ELO Rating, XP boosts, and bragging rights.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-dashed border-indigo-100 dark:border-indigo-950/60 pt-3">
                <div className="flex items-center gap-2 font-mono text-[10px] text-ash">
                  <Timer className="h-3.5 w-3.5" />
                  <span>
                    Closes: {new Date(event.deadline).toLocaleDateString()}
                  </span>
                </div>
                <span className="flex items-center gap-1 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Predict Now
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </article>
          ))}

        {/* Standard Prediction Markets */}
        {filteredMarkets.map((item) => {
          const market = item.market!
          const yesPercent = calculateYesPercent(market)
          const noPercent = 100 - yesPercent
          const isTradable = market.status === "tradable"
          const creatorLabel = displayHandle(item.author)
          const phase = getPhaseTag(market.status)

          const isPvp = market.category?.toLowerCase() === "pvp"
          const yesLabel = isPvp
            ? market.yesCondition || market.yes_condition || "YES"
            : "YES"
          const noLabel = isPvp
            ? market.noCondition || market.no_condition || "NO"
            : "NO"

          return (
            <article
              key={market.id}
              className="verity-card p-5 flex flex-col justify-between hover:shadow-md transition-shadow border border-border dark:border-zinc-800"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-2 font-mono text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-parchment-card text-charcoal-primary shadow-subtle uppercase tracking-wider font-semibold">
                      {market.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[9px] uppercase tracking-wider font-bold ${phase.color}`}
                    >
                      {phase.label}
                    </span>
                  </div>
                  <span className="text-ash uppercase">
                    by {creatorLabel}
                  </span>
                </div>

                <Link href={`/markets/${market.id}`}>
                  <h3 className="text-lg font-bold tracking-tight text-charcoal-primary dark:text-white leading-tight hover:underline cursor-pointer">
                    {market.question}
                  </h3>
                </Link>

                {/* LP State Display */}
                <div className="mt-2 text-[10px] font-mono text-ash flex justify-between items-center bg-stone-100/50 dark:bg-zinc-900/50 p-2 rounded-lg border border-border/40 dark:border-zinc-800/40">
                  <span>
                    LP: ${Number(market.liquidity ?? 0).toLocaleString()}{" "}
                    USDC
                  </span>
                  <span>
                    Pool: $
                    {(
                      Number(market.usdc_yes_amount || 0) +
                      Number(market.usdc_no_amount || 0)
                    ).toLocaleString()}{" "}
                    USDC
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {/* Signal / Outcome Stats */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs font-mono font-bold mb-1">
                      <span className="text-meadow-green">
                        {yesLabel} {yesPercent}%
                      </span>
                      <span className="text-ember-orange">
                        {noLabel} {noPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-stone-surface dark:bg-zinc-800 rounded-full overflow-hidden flex">
                      <div
                        className="bg-meadow-green h-full"
                        style={{ width: `${yesPercent}%` }}
                      />
                      <div
                        className="bg-ember-orange h-full"
                        style={{ width: `${noPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Conditional BUY YES/NO vs UPVOTE/DOWNVOTE signals */}
                <div className="flex items-center gap-2 border-t border-border dark:border-zinc-800/80 pt-3 mt-1">
                  {isTradable ? (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <Link
                        href={`/markets/${market.id}?action=BUY&side=YES`}
                        className="w-full"
                      >
                        <button className="w-full bg-meadow-green hover:bg-meadow-green/90 text-white font-bold py-2 rounded-[10px] text-[11px] uppercase tracking-wider font-mono shadow-subtle flex items-center justify-center gap-1 transition-colors font-sans">
                          BUY {yesLabel}
                        </button>
                      </Link>
                      <Link
                        href={`/markets/${market.id}?action=BUY&side=NO`}
                        className="w-full"
                      >
                        <button className="w-full bg-ember-orange hover:bg-ember-orange/90 text-white font-bold py-2 rounded-[10px] text-[11px] uppercase tracking-wider font-mono shadow-subtle flex items-center justify-center gap-1 transition-colors font-sans">
                          BUY {noLabel}
                        </button>
                      </Link>
                    </div>
                  ) : item.viewerVote !== null ? (
                    <div className="w-full flex items-center justify-center py-2.5 px-4 rounded-[10px] bg-stone-100/30 dark:bg-zinc-900/20 border border-border/40 text-[11px] font-mono text-center">
                      {item.viewerVote === "YES" ? (
                        <span className="text-meadow-green flex items-center gap-1.5 font-bold uppercase tracking-wider">
                          You upvoted this market
                        </span>
                      ) : (
                        <span className="text-ember-orange flex items-center gap-1.5 font-bold uppercase tracking-wider">
                          You downvoted this market
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <button
                        onClick={() => handleFreeVote(market.id, "YES")}
                        className="bg-meadow-green/10 hover:bg-meadow-green/15 text-meadow-green border border-meadow-green/20 dark:border-meadow-green/10 py-1.5 rounded-[8px] text-xs font-bold font-mono transition-colors shadow-subtle cursor-pointer"
                      >
                        UPVOTE
                      </button>
                      <button
                        onClick={() => handleFreeVote(market.id, "NO")}
                        className="bg-ember-orange/10 hover:bg-ember-orange/15 text-ember-orange border border-ember-orange/20 dark:border-ember-orange/10 py-1.5 rounded-[8px] text-xs font-bold font-mono transition-colors shadow-subtle cursor-pointer"
                      >
                        DOWNVOTE
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          )
        })}

        {filteredMarkets.length === 0 && feedItems.length > 0 && (
          <div className="col-span-full verity-card p-10 text-center text-sm text-ash">
            No standard markets match your filters.
          </div>
        )}

        {feedLoading && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <article
                key={i}
                className="verity-card p-5 flex flex-col justify-between border border-border dark:border-zinc-800 animate-pulse"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-16 bg-stone-surface dark:bg-zinc-800 rounded-full" />
                      <div className="h-5 w-16 bg-stone-surface dark:bg-zinc-800 rounded-full" />
                    </div>
                    <div className="h-3.5 w-20 bg-stone-surface dark:bg-zinc-800 rounded" />
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-4.5 w-5/6 bg-stone-surface dark:bg-zinc-800 rounded" />
                    <div className="h-4.5 w-3/4 bg-stone-surface dark:bg-zinc-800 rounded" />
                  </div>

                  {/* LP State Display Skeleton */}
                  <div className="mt-4 h-10 w-full bg-stone-surface/30 dark:bg-zinc-900/30 rounded-lg border border-border/40 dark:border-zinc-800/40" />
                </div>

                <div className="mt-6 flex flex-col gap-4">
                  {/* Signal / Stats Slider Skeleton */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 w-12 bg-stone-surface dark:bg-zinc-800 rounded" />
                      <div className="h-3 w-12 bg-stone-surface dark:bg-zinc-800 rounded" />
                    </div>
                    <div className="h-1.5 w-full bg-stone-surface dark:bg-zinc-800 rounded-full" />
                  </div>

                  {/* Buy Buttons Skeleton */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="h-9 bg-stone-surface dark:bg-zinc-800 rounded-lg" />
                    <div className="h-9 bg-stone-surface dark:bg-zinc-800 rounded-lg" />
                  </div>
                </div>
              </article>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
