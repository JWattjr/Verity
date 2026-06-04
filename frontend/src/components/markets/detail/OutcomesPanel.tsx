"use client"

import { Circle, CircleDot } from "lucide-react"
import { MarketPost, VoteSide, getMarketPrice } from "@/lib/verity"

interface OutcomesPanelProps {
  childMarkets: MarketPost[]
  selectedChildId: string | null
  selectedSide: VoteSide
  onSelectOptionAndSide: (id: string, side: VoteSide) => void
  marketStatus?: string
}

export default function OutcomesPanel({
  childMarkets,
  selectedChildId,
  selectedSide,
  onSelectOptionAndSide,
  marketStatus,
}: OutcomesPanelProps) {
  return (
    <section className="verity-card p-5 border border-border bg-surface-solid shadow-subtle">
      <h2 className="mb-4 font-semibold tracking-[-0.18px] text-charcoal-primary flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>Outcomes & Options</span>
        </div>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {childMarkets.map((child) => {
          const isSelected = child.id === selectedChildId
          const isChildPreMarket = [
            "open_for_votes",
            "qualified",
            "funding_pool",
          ].includes(child.status || "")

          if (isChildPreMarket) {
            const currentFunding = child.liquidity ?? 0
            const minFunding = 40
            const progress = Math.min(100, (currentFunding / minFunding) * 100)

            return (
              <div
                key={child.id}
                onClick={() => onSelectOptionAndSide(child.id, "YES")}
                className={`flex flex-col p-4 rounded-xl border transition-all duration-200 cursor-pointer relative ${
                  isSelected
                    ? "border-sky-blue bg-sky-blue/[0.02] dark:bg-sky-blue/[0.04] shadow-sm"
                    : "border-border bg-surface-muted/50 text-charcoal-primary hover:border-sky-blue/40"
                }`}
              >
                <div className="flex items-start gap-2.5 w-full">
                  <div className="mt-0.5 shrink-0">
                    {isSelected ? (
                      <CircleDot className="h-4.5 w-4.5 text-sky-blue" />
                    ) : (
                      <Circle className="h-4.5 w-4.5 text-ash/40 dark:text-ash/20 transition-colors" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-charcoal-primary text-sm line-clamp-2">
                        {child.optionName || child.question}
                      </span>
                      <span className="text-[9px] font-mono text-sky-blue border border-sky-blue/20 bg-sky-blue/5 px-1.5 py-0.5 rounded shrink-0 font-medium">
                        Separate Pool
                      </span>
                    </div>

                    <div className="mt-3 flex flex-col w-full">
                      <div className="flex items-center justify-between font-mono text-[10px] text-ash mb-1">
                        <span>Pool Funding Progress</span>
                        <span className="font-semibold text-charcoal-primary">
                          {currentFunding} / {minFunding} USDC
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white-surface dark:bg-zinc-900 shadow-subtle border border-stone-surface dark:border-zinc-800">
                        <div
                          className="h-full bg-sky-blue transition-all duration-500 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          const yesPrice = getMarketPrice(child, "YES")
          const noPrice = getMarketPrice(child, "NO")

          const isPvp = child.category?.toLowerCase() === "pvp"
          const yesLabel = isPvp ? child.yesCondition || child.yes_condition || "YES" : "YES"
          const noLabel = isPvp ? child.noCondition || child.no_condition || "NO" : "NO"

          const isYesSelected = isSelected && selectedSide === "YES"
          const isNoSelected = isSelected && selectedSide === "NO"

          let borderClass =
            "border-border bg-surface-muted/50 text-charcoal-primary hover:border-border-strong"
          let radioColor = "text-ash/40 dark:text-ash/20"

          if (isYesSelected) {
            borderClass =
              "border-meadow-green bg-meadow-green/[0.03] dark:bg-meadow-green/[0.06] shadow-sm"
            radioColor = "text-meadow-green"
          } else if (isNoSelected) {
            borderClass =
              "border-ember-orange bg-ember-orange/[0.03] dark:bg-ember-orange/[0.06] shadow-sm"
            radioColor = "text-ember-orange"
          }

          const handleCardClick = () => {
            onSelectOptionAndSide(child.id, selectedSide || "YES")
          }

          return (
            <div
              key={child.id}
              onClick={handleCardClick}
              className={`flex flex-col p-4 rounded-xl border transition-all duration-200 cursor-pointer relative ${borderClass}`}
            >
              <div className="flex items-start gap-2.5 w-full">
                <div className="mt-0.5 shrink-0">
                  {isSelected ? (
                    <CircleDot className={`h-4.5 w-4.5 ${radioColor}`} />
                  ) : (
                    <Circle className="h-4.5 w-4.5 text-ash/40 dark:text-ash/20 transition-colors" />
                  )}
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-start justify-between w-full gap-2">
                    <span className="font-semibold text-charcoal-primary text-sm line-clamp-2">
                      {child.optionName || child.question}
                    </span>
                    <span className="text-[10px] font-mono text-ash shrink-0 mt-0.5">
                      Pool:{" "}
                      {(
                        Number(child.usdc_yes_amount || 0) +
                        Number(child.usdc_no_amount || 0)
                      ).toFixed(0)}{" "}
                      USDC
                    </span>
                  </div>

                  <div className="mt-3.5 flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-[6px] font-mono text-xs font-bold border transition-colors ${
                      isYesSelected
                        ? "bg-meadow-green/10 text-meadow-green border-meadow-green/20"
                        : "bg-stone-surface text-ash border-border"
                    }`}>
                      {yesLabel}: {(yesPrice * 100).toFixed(0)}¢
                    </span>
                    <span className={`px-2.5 py-1 rounded-[6px] font-mono text-xs font-bold border transition-colors ${
                      isNoSelected
                        ? "bg-ember-orange/10 text-ember-orange border-ember-orange/20"
                        : "bg-stone-surface text-ash border-border"
                    }`}>
                      {noLabel}: {(noPrice * 100).toFixed(0)}¢
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
