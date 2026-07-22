"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, Sparkles, TrendingUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import PagePanel from "@/components/layout/PagePanel"
import { useFeed } from "@/hooks/useFeed"

const TOPICS = [
  "All",
  "AI/Tech",
  "Crypto",
  "Culture",
  "Economics",
  "Politics",
  "Sports",
] as const

type Topic = (typeof TOPICS)[number]

export default function ExplorePage() {
  const [query, setQuery] = useState("")
  const [activeTopic, setActiveTopic] = useState<Topic>("All")
  const [loadedAt] = useState(() => Date.now())
  const { items, loading, error, reload } = useFeed(undefined, true)

  const markets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return items
      .filter((item) => item.market)
      .filter((item) => {
        const market = item.market
        if (!market || !isMarketOpen(market, loadedAt)) return false

        const category = market.category || "Markets"
        const matchesSearch =
          !normalizedQuery ||
          market.question.toLowerCase().includes(normalizedQuery) ||
          category.toLowerCase().includes(normalizedQuery)

        return matchesSearch && matchesTopic(category, activeTopic)
      })
      .slice(0, 18)
  }, [activeTopic, items, loadedAt, query])

  return (
    <PagePanel
      description="Search Verity's live, USDC-backed markets and open PvP Arena cards. Every result below comes from the live market feed."
      eyebrow="Live discovery"
      title="Explore markets"
    >
      <section className="verity-card p-4">
        <label className="relative block">
          <span className="sr-only">Search live markets</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ash" />
          <Input
            className="h-12 w-full border-border bg-surface pl-12 pr-4 text-[15px] text-charcoal-primary focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-0"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search live markets..."
            type="search"
            value={query}
          />
        </label>
      </section>

      <section className="verity-card p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold uppercase tracking-[0.06em] text-charcoal-primary">
          <Sparkles className="h-4 w-4 text-accent" />
          Categories
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {TOPICS.map((topic) => (
            <button
              aria-pressed={activeTopic === topic}
              className={`border px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                activeTopic === topic
                  ? "border-accent bg-accent text-black"
                  : "border-border bg-surface text-ash hover:border-accent hover:text-charcoal-primary"
              }`}
              key={topic}
              onClick={() => setActiveTopic(topic)}
              type="button"
            >
              {topic}
            </button>
          ))}
        </div>
      </section>

      <section className="verity-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold uppercase tracking-[0.06em] text-charcoal-primary">
            <TrendingUp className="h-4 w-4 text-accent" />
            Live markets
          </h2>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-ash">
            {markets.length} shown
          </span>
        </div>

        {loading ? (
          <div className="grid gap-px bg-border sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div className="h-40 animate-pulse bg-surface" key={item} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ash">
              The live market feed is temporarily unavailable.
            </p>
            <button
              className="border border-accent px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-accent transition-colors hover:bg-accent hover:text-black"
              onClick={() => void reload()}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : markets.length > 0 ? (
          <div className="grid gap-px bg-border sm:grid-cols-2">
            {markets.map((item) => {
              const market = item.market!
              const yesAmount = Number(
                market.usdcYesAmount ?? market.usdc_yes_amount ?? 0,
              )
              const noAmount = Number(
                market.usdcNoAmount ?? market.usdc_no_amount ?? 0,
              )
              const volume = yesAmount + noAmount
              const yesPercent = calculateYesPercent(yesAmount, noAmount)
              const isPvp = market.category?.toLowerCase() === "pvp"
              const href = isPvp
                ? `/markets?tab=pvp-arena&id=${encodeURIComponent(market.id)}`
                : `/markets/${encodeURIComponent(market.id)}`

              return (
                <Link
                  className="group flex min-h-40 flex-col justify-between bg-surface p-5 transition-colors hover:bg-surface-muted"
                  href={href}
                  key={item.id}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-ash">
                      <span>{isPvp ? "PvP Arena" : market.category}</span>
                      <span className="text-accent">Live</span>
                    </div>
                    <h3 className="mt-3 font-heading text-2xl font-black uppercase leading-[1.02] text-charcoal-primary transition-colors group-hover:text-accent">
                      {market.question}
                    </h3>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-3 font-mono text-[10px]">
                    <span className="font-bold text-accent">
                      {yesPercent.toFixed(0)}% YES
                    </span>
                    <span className="text-ash">
                      {volume.toLocaleString()} USDC
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ash">
            No live markets match this search.
          </div>
        )}
      </section>
    </PagePanel>
  )
}

function matchesTopic(category: string, topic: Topic) {
  if (topic === "All") return true

  const normalizedCategory = category.toLowerCase()
  if (topic === "AI/Tech") {
    return (
      normalizedCategory.includes("ai") || normalizedCategory.includes("tech")
    )
  }

  return normalizedCategory.includes(topic.toLowerCase())
}

function calculateYesPercent(yes: number, no: number) {
  const total = yes + no
  if (total <= 0) return 50
  return (yes / total) * 100
}

function isMarketOpen(
  market: {
    deadline?: string | null
    lockTime?: string | null
    lock_time?: string | null
    status?: string | null
  },
  now: number,
) {
  if (["closed", "resolved", "voided"].includes(market.status || "")) {
    return false
  }

  const lockTime = Date.parse(
    market.lockTime || market.lock_time || market.deadline || "",
  )
  return !Number.isFinite(lockTime) || lockTime > now
}
