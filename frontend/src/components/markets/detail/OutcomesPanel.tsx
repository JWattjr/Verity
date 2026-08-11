"use client"

import { Check } from "lucide-react"
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
  const statusLabel = marketStatus
    ? marketStatus.replaceAll("_", " ").toUpperCase()
    : "SELECT AN OUTCOME"

  return (
    <section className="border border-border bg-surface">
      <div className="flex items-end justify-between gap-3 border-b border-border bg-[#0b0b0c] px-4 py-3.5 text-white sm:px-5">
        <div>
          <p className="mb-1 font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-accent sm:text-[9px]">
            {statusLabel}
          </p>
          <h2 className="font-heading text-2xl font-black uppercase leading-none tracking-[0.02em] text-white sm:text-[28px]">
            Outcomes &amp; Options
          </h2>
        </div>
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">
          {childMarkets.length}{" "}
          {childMarkets.length === 1 ? "Option" : "Options"}
        </span>
      </div>

      <div className="grid gap-px bg-border sm:grid-cols-2">
        {childMarkets.map((child) => {
          const isSelected = child.id === selectedChildId
          const isChildPreMarket = [
            "open_for_votes",
            "qualified",
            "funding_pool",
          ].includes(child.status || "")

          if (isChildPreMarket) {
            const currentFunding = child.liquidity ?? 0
            const minFunding =
              child.minimumPoolBalance || child.minimum_pool_balance || 20
            const progress = Math.min(100, (currentFunding / minFunding) * 100)

            return (
              <div
                aria-pressed={isSelected}
                key={child.id}
                onClick={() => onSelectOptionAndSide(child.id, "YES")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onSelectOptionAndSide(child.id, "YES")
                  }
                }}
                role="button"
                tabIndex={0}
                className={`relative flex cursor-pointer flex-col p-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:p-5 ${
                  isSelected
                    ? "bg-accent/[0.06]"
                    : "bg-surface text-charcoal-primary hover:bg-surface-muted"
                }`}
              >
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1 bg-accent"
                  />
                )}
                <div className="flex w-full items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${
                      isSelected
                        ? "border-accent bg-accent text-black"
                        : "border-border-strong bg-transparent text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 font-heading text-lg font-extrabold uppercase leading-[1.05] tracking-[0.01em] text-charcoal-primary sm:text-xl">
                        {child.optionName || child.question}
                      </span>
                      <span className="shrink-0 border border-accent px-1.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-accent">
                        Funding
                      </span>
                    </div>

                    <div className="mt-4 flex w-full flex-col">
                      <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-ash sm:text-[9px]">
                        <span>Pool progress</span>
                        <span className="text-right text-charcoal-primary">
                          {currentFunding} / {minFunding} USDC
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden bg-stone-surface">
                        <div
                          className="h-full bg-accent transition-[width] duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          const isMulti =
            child.outcomeCount !== undefined && child.outcomeCount > 2
          const outcomes = child.outcomes || []
          const outcomePrices = child.outcomePrices || []

          const yesPrice = !isMulti ? getMarketPrice(child, "YES") : 0
          const noPrice = !isMulti ? getMarketPrice(child, "NO") : 0

          const isPvp = child.category?.toLowerCase() === "pvp"
          const yesLabel = isPvp
            ? child.yesCondition || child.yes_condition || "YES"
            : "YES"
          const noLabel = isPvp
            ? child.noCondition || child.no_condition || "NO"
            : "NO"

          const isYesSelected = !isMulti && isSelected && selectedSide === "YES"
          const isNoSelected = !isMulti && isSelected && selectedSide === "NO"

          const handleCardClick = () => {
            onSelectOptionAndSide(
              child.id,
              isMulti ? outcomes[0] || "YES" : selectedSide || "YES",
            )
          }

          return (
            <div
              aria-pressed={isSelected}
              key={child.id}
              onClick={handleCardClick}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  handleCardClick()
                }
              }}
              role="button"
              tabIndex={0}
              className={`relative flex cursor-pointer flex-col p-4 text-charcoal-primary outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:p-5 ${
                isSelected
                  ? "bg-accent/[0.06]"
                  : "bg-surface hover:bg-surface-muted"
              }`}
            >
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 bg-accent"
                />
              )}
              <div className="flex w-full items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${
                    isSelected
                      ? "border-accent bg-accent text-black"
                      : "border-border-strong bg-transparent text-transparent"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between w-full gap-2">
                    <span className="line-clamp-2 font-heading text-lg font-extrabold uppercase leading-[1.05] tracking-[0.01em] text-charcoal-primary sm:text-xl">
                      {child.optionName || child.question}
                    </span>
                    <span className="mt-0.5 shrink-0 text-right font-mono text-[8px] font-bold uppercase tracking-[0.06em] text-ash sm:text-[9px]">
                      Pool
                      <br />
                      {isMulti
                        ? (child.liquidity ?? 0).toFixed(0)
                        : (
                            Number(child.usdc_yes_amount || 0) +
                            Number(child.usdc_no_amount || 0)
                          ).toFixed(0)}{" "}
                      USDC
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {isMulti ? (
                      outcomes.map((outcomeName, idx) => {
                        const price =
                          outcomePrices[idx] ?? 1 / child.outcomeCount!
                        const priceCents = Math.round(price * 100)
                        const isThisSelected =
                          isSelected && selectedSide === outcomeName

                        return (
                          <button
                            key={outcomeName}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectOptionAndSide(child.id, outcomeName)
                            }}
                            aria-pressed={isThisSelected}
                            className={`border px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.04em] transition-colors sm:text-[10px] ${
                              isThisSelected
                                ? "border-accent bg-accent text-black"
                                : "border-border-strong bg-transparent text-ash hover:border-accent hover:text-accent"
                            }`}
                          >
                            {outcomeName}: {priceCents}¢
                          </button>
                        )
                      })
                    ) : (
                      <>
                        <span
                          className={`border px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.06em] transition-colors sm:text-[10px] ${
                            isYesSelected
                              ? "border-accent bg-accent text-black"
                              : "border-accent/35 bg-accent/[0.04] text-accent"
                          }`}
                        >
                          {yesLabel}: {(yesPrice * 100).toFixed(0)}¢
                        </span>
                        <span
                          className={`border px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.06em] transition-colors sm:text-[10px] ${
                            isNoSelected
                              ? "border-[#0b0b0c] bg-[#0b0b0c] text-white dark:border-white dark:bg-white dark:text-black"
                              : "border-border-strong bg-transparent text-charcoal-primary"
                          }`}
                        >
                          {noLabel}: {(noPrice * 100).toFixed(0)}¢
                        </span>
                      </>
                    )}
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
