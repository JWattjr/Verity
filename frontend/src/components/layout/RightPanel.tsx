"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, TrendingUp, Trophy } from "lucide-react"
import { useFeed } from "@/hooks/useFeed"
import { useRightPanelSlot } from "@/hooks/useRightPanelSlot"
import { displayHandle, displayName } from "@/lib/verity"
import type { MarketPost } from "@/lib/verity"
import { useTopPredictorsQuery } from "@/store/verity/verityQueries"

export default function RightPanel() {
  const [loadedAt] = useState(() => Date.now())
  const { items, loading, error, reload } = useFeed(undefined, true)
  const marketItems = items.filter(
    (item) => item.market && isMarketOpen(item.market, loadedAt),
  )
  const liveMarkets = marketItems.slice(0, 3)
  const {
    data: topPredictors = [],
    isLoading: isPredictorsLoading,
    isError: predictorsFailed,
    refetch: reloadPredictors,
  } = useTopPredictorsQuery()
  const predictors = topPredictors.slice(0, 3)
  const slotContent = useRightPanelSlot()

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto no-scrollbar pb-8">
      <Link className="group relative block" href="/explore">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          <Search className="h-5 w-5 text-ash transition-colors group-focus-within:text-charcoal-primary" />
        </div>
        <span className="verity-card flex h-11 w-full items-center border-border bg-surface pl-12 pr-4 text-sm text-ash transition-colors group-hover:text-charcoal-primary">
          Browse live markets...
        </span>
      </Link>

      {/* Dynamic slot content injected by child pages (e.g. MarketDetail) */}
      {slotContent}

      <div className="verity-card flex flex-col overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold uppercase tracking-[0.06em] text-charcoal-primary">
            <TrendingUp className="h-4 w-4 text-accent" />
            Live Markets
          </h2>
        </div>

        <div className="flex flex-col">
          {loading ? (
            <div className="flex flex-col animate-pulse">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 border-b border-dashed border-stone-surface p-4"
                >
                  <div className="h-3 w-20 rounded bg-stone-surface" />
                  <div className="h-4 w-5/6 rounded bg-stone-surface animate-pulse" />
                  <div className="flex justify-between items-center mt-1">
                    <div className="h-3.5 w-12 rounded bg-stone-surface" />
                    <div className="h-3.5 w-16 rounded bg-stone-surface" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-2 p-4 text-sm text-ash">
              <span>Live markets are temporarily unavailable.</span>
              <button
                className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-accent"
                onClick={() => void reload()}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : liveMarkets.length > 0 ? (
            liveMarkets.map((item) => {
              const market = item.market
              const yes = market
                ? calculateYesPercent(
                    Number(market.usdc_yes_amount),
                    Number(market.usdc_no_amount),
                  )
                : 50
              const volume = market
                ? Number(market.usdc_yes_amount) + Number(market.usdc_no_amount)
                : 0

              return (
                <Link
                  className="flex cursor-pointer flex-col gap-2 border-b border-border p-4 transition-colors hover:bg-surface-muted"
                  href={`/markets/${market?.id}`}
                  key={item.id}
                >
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ash">
                    Live in{" "}
                    {market?.category?.toLowerCase() === "pvp"
                      ? "PvP"
                      : market?.category || "Markets"}
                  </span>
                  <p className="line-clamp-2 text-sm font-semibold leading-snug tracking-[-0.18px] text-charcoal-primary">
                    {market?.question}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-accent">
                      {yes.toFixed(0)}% YES
                    </span>
                    <span className="font-mono text-xs text-ash">
                      {volume.toLocaleString()} USDC
                    </span>
                  </div>
                </Link>
              )
            })
          ) : (
            <div className="p-4 text-sm text-ash">No live markets yet.</div>
          )}
        </div>

        <Link
          className="p-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-charcoal-primary transition-colors hover:bg-surface-muted"
          href="/markets"
        >
          Show more
        </Link>
      </div>

      {!slotContent && (
        <div className="verity-card flex flex-col overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold uppercase tracking-[0.06em] text-charcoal-primary">
              <Trophy className="h-4 w-4 text-accent" />
              Top Predictors
            </h2>
          </div>

          <div className="flex flex-col">
            {isPredictorsLoading ? (
              <div className="flex flex-col animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-stone-surface shrink-0" />
                      <div className="flex flex-col gap-1.5">
                        <div className="h-3.5 w-24 rounded bg-stone-surface" />
                        <div className="h-3 w-16 rounded bg-stone-surface" />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="h-3 w-8 rounded bg-stone-surface" />
                      <div className="h-3 w-12 rounded bg-stone-surface" />
                    </div>
                  </div>
                ))}
              </div>
            ) : predictorsFailed ? (
              <div className="flex flex-col items-start gap-2 p-4 text-sm text-ash">
                <span>Predictor rankings are temporarily unavailable.</span>
                <button
                  className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-accent"
                  onClick={() => void reloadPredictors()}
                  type="button"
                >
                  Try again
                </button>
              </div>
            ) : predictors.length > 0 ? (
              predictors.map((user) => {
                const accuracy = Math.round(
                  Number((user as { accuracy?: number }).accuracy ?? 0),
                )

                return (
                  <Link
                    className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-parchment-card"
                    href={`/profile/${encodeURIComponent(user.id)}`}
                    key={user.id}
                  >
                    <div className="flex items-center gap-3">
                      <div className="verity-blob h-10 w-10 bg-sky-blue">
                        <span className="verity-blob-smile" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold leading-none tracking-[-0.18px] text-charcoal-primary hover:underline">
                          {displayName(user)}
                        </span>
                        <span className="mt-1 font-mono text-xs text-ash">
                          {displayHandle(user)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-accent">
                        {accuracy}%
                      </span>
                      <span className="font-mono text-[10px] uppercase text-ash">
                        Accuracy
                      </span>
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="p-4 text-sm text-ash">No predictors yet.</div>
            )}
          </div>
        </div>
      )}

      <div className="px-4 font-mono text-[11px] text-ash">
        Transparent, USDC-backed markets · {"\u00A9"} 2026 Verity
      </div>
    </div>
  )
}

function calculateYesPercent(yes: number, no: number) {
  const total = yes + no
  if (total === 0) return 50
  return (yes / total) * 100
}

function isMarketOpen(market: MarketPost, now: number) {
  if (["closed", "resolved", "voided"].includes(market.status || "")) {
    return false
  }

  const lockTime = Date.parse(
    market.lockTime || market.lock_time || market.deadline || "",
  )
  return !Number.isFinite(lockTime) || lockTime > now
}
