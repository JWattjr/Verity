"use client"

import { BarChart3 } from "lucide-react"

interface SentimentRowProps {
  label: string
  percent: number
  tone: "yes" | "no"
}

function SentimentRow({ label, percent, tone }: SentimentRowProps) {
  return (
    <div className="grid grid-cols-[34px_minmax(0,1fr)_52px] items-center gap-3">
      <span className="text-charcoal-primary">{label}</span>
      <span className="h-2 overflow-hidden bg-white-surface shadow-subtle">
        <span
          className={`block h-full ${tone === "yes" ? "bg-meadow-green" : "bg-ember-orange"}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="text-right">{percent.toFixed(1)}%</span>
    </div>
  )
}

interface SentimentPanelProps {
  noPercent: number
  hasOpinions: boolean
  yesPercent: number
}

export default function SentimentPanel({
  noPercent,
  hasOpinions,
  yesPercent,
}: SentimentPanelProps) {
  return (
    <section className="verity-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold tracking-[-0.18px] text-charcoal-primary">
            Market Sentiment
          </h2>
          <p className="mt-1 font-mono text-[11px] text-ash">
            USDC-backed opinions only
          </p>
        </div>
        <BarChart3 className="h-4 w-4 text-ash" />
      </div>

      <div className="bg-parchment-card p-4 shadow-subtle">
        {!hasOpinions && (
          <p className="mb-4 bg-white-surface p-3 text-sm text-ash shadow-subtle">
            No USDC-backed opinions yet.
          </p>
        )}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="bg-meadow-green/10 p-3 shadow-subtle">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-meadow-green">
              Yes
            </span>
            <p className="mt-1 font-mono text-lg font-semibold text-charcoal-primary">
              {yesPercent.toFixed(1)}%
            </p>
          </div>
          <div className="bg-ember-orange/10 p-3 shadow-subtle">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ember-orange">
              No
            </span>
            <p className="mt-1 font-mono text-lg font-semibold text-charcoal-primary">
              {noPercent.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="grid gap-3 font-mono text-xs">
          <SentimentRow label="Yes" percent={yesPercent} tone="yes" />
          <SentimentRow label="No" percent={noPercent} tone="no" />
        </div>
      </div>
    </section>
  )
}
