"use client"

import { MarketPost, VoteSide } from "@/lib/verity"

interface MarketHeroProps {
  category: string
  creator: string
  leadingPercent: number
  leadingSide: VoteSide
  market: MarketPost
  question: string
  time: string
  totalVotes: number
  onDevQualify?: () => Promise<void>
  devQualifyLoading?: boolean
}

export default function MarketHero({
  category,
  creator,
  leadingPercent,
  leadingSide,
  market,
  question,
  time,
  totalVotes,
  onDevQualify,
  devQualifyLoading = false,
}: MarketHeroProps) {
  const totalUsdc =
    Number(market.usdc_yes_amount) + Number(market.usdc_no_amount)
  const yesPercent =
    totalUsdc > 0 ? (Number(market.usdc_yes_amount) / totalUsdc) * 100 : 50
  const noPercent = 100 - yesPercent

  const targetVotes = market.qualificationThreshold ?? 50
  const votesProgress = Math.min(100, (totalVotes / targetVotes) * 100)
  const isDev = process.env.NEXT_PUBLIC_NODE_ENV !== "production"

  return (
    <section className="verity-card relative overflow-hidden p-5 mt-4">
      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-sunburst-yellow/30" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="relative min-w-0">
          <h1 className="text-[23px] font-semibold leading-[1.12] tracking-[-0.44px] text-midnight sm:text-[32px]">
            {question}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs text-ash">
            <span className="rounded-[6px] bg-parchment-card px-2.5 py-1 text-graphite shadow-subtle">
              {category}
            </span>
            <span>by {creator}</span>
            <span>{"\u00B7"}</span>
            <span>{time}</span>
          </div>
        </div>
        <span
          className={`verity-pill relative px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] ${
            market.status === "voided"
              ? "bg-stone-surface text-ash"
              : "bg-meadow-green/12 text-meadow-green"
          }`}
        >
          {market.status.replaceAll("_", " ")}
        </span>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-dashed border-stone-surface pt-3 font-mono text-xs text-ash items-center">
        <span>
          Leading outcome:{" "}
          <strong
            className={
              leadingSide === "YES" ? "text-meadow-green" : "text-ember-orange"
            }
          >
            {leadingSide} {leadingPercent.toFixed(1)}%
          </strong>
        </span>
        <span>{totalVotes} Upvote/Downvote signals</span>
        <span>
          Sentiment:{" "}
          <strong className="text-meadow-green">
            Yes {yesPercent.toFixed(1)}%
          </strong>
          {" / "}
          <strong className="text-ember-orange">
            No {noPercent.toFixed(1)}%
          </strong>
        </span>
      </div>

      {market.status === "open_for_votes" && (
        <div className="relative mt-4 border-t border-dashed border-stone-surface pt-3">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-ash">
            <span>
              Signals cast progress:{" "}
              <strong className="text-charcoal-primary">
                {totalVotes} / {targetVotes}
              </strong>
            </span>
            {isDev && onDevQualify && (
              <button
                className="text-[10px] font-bold uppercase tracking-[0.08em] text-meadow-green hover:underline focus:outline-none"
                disabled={devQualifyLoading}
                onClick={onDevQualify}
                type="button"
              >
                {devQualifyLoading
                  ? "Fast-tracking..."
                  : "[Skip signal review]"}
              </button>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-parchment-card shadow-subtle">
            <div
              className="h-full bg-meadow-green transition-all duration-500"
              style={{ width: `${votesProgress}%` }}
            />
          </div>
        </div>
      )}
    </section>
  )
}
