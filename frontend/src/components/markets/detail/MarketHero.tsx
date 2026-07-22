"use client"

import { MarketPost } from "@/lib/verity"

interface MarketHeroProps {
  category: string
  creator: string
  market: MarketPost
  question: string
  time: string
  yesPercent: number
  noPercent: number
  onDevQualify?: () => Promise<void>
  devQualifyLoading?: boolean
}

export default function MarketHero({
  category,
  creator,
  market,
  question,
  time,
  yesPercent,
  noPercent,
}: MarketHeroProps) {
  const statusLabel = (market.status || "market")
    .replaceAll("_", " ")
    .toUpperCase()

  return (
    <section className="mt-4 overflow-hidden border border-[#29292d] bg-[#0b0b0c] text-white">
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-[#29292d] px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 bg-accent" />
          <span className="truncate font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white/70 sm:text-[10px]">
            {category?.toLowerCase() === "pvp" ? "PvP" : category}
          </span>
        </div>
        <span className="shrink-0 border border-accent px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-accent sm:text-[9px]">
          {statusLabel}
        </span>
      </div>

      <div className="px-4 py-7 sm:px-5 sm:py-9">
        <h1 className="max-w-4xl font-heading text-[34px] font-black uppercase leading-[0.94] tracking-[-0.025em] text-white sm:text-[50px] lg:text-[60px]">
          {question}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-white/55 sm:text-[10px]">
          <span className="text-white/85">BY {creator}</span>
          <span aria-hidden="true" className="h-3 w-px bg-white/20" />
          <span>{time}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-[#29292d]">
        <div className="flex items-end justify-between gap-3 border-r border-[#29292d] px-4 py-3 sm:px-5 sm:py-4">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-white/50">
            Yes
          </span>
          <strong className="font-heading text-2xl font-black leading-none text-accent sm:text-3xl">
            {yesPercent.toFixed(1)}%
          </strong>
        </div>
        <div className="flex items-end justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-white/50">
            No
          </span>
          <strong className="font-heading text-2xl font-black leading-none text-white sm:text-3xl">
            {noPercent.toFixed(1)}%
          </strong>
        </div>
      </div>
    </section>
  )
}
