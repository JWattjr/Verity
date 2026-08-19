"use client"

import { ReactNode } from "react"
import {
  Heart,
  Share,
  ShieldCheck,
} from "lucide-react"
import { formatTradingFee } from "@/lib/verity"

interface RulesPanelProps {
  noCondition: string
  postContent: string
  resolutionSource: string
  yesCondition: string
}

export function RulesPanel({
  noCondition,
  postContent,
  resolutionSource,
  yesCondition,
}: RulesPanelProps) {
  return (
    <section className="border border-border bg-surface p-5">
      <h2 className="mb-4 font-heading text-xl font-extrabold uppercase tracking-[0.04em] text-charcoal-primary">
        Rules
      </h2>
      <div className="grid gap-3 text-sm leading-relaxed tracking-[-0.18px] text-graphite">
        <p>{postContent}</p>
        <div className="border-l-4 border-accent bg-surface-muted p-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
            YES
          </span>
          <p className="mt-1">{yesCondition}</p>
        </div>
        <div className="border-l-4 border-charcoal-primary bg-surface-muted p-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal-primary">
            NO
          </span>
          <p className="mt-1">{noCondition}</p>
        </div>
        <p className="border-t border-border pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-ash">
          Resolution source: {resolutionSource}
        </p>
      </div>
    </section>
  )
}

export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-border py-2.5 text-sm">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ash">
        {label}
      </span>
      <span className="text-right font-mono text-[11px] font-semibold text-charcoal-primary">
        {value}
      </span>
    </div>
  )
}

interface MarketStatsPanelProps {
  closesAt: Date | null
  createdAt: Date | null
  feeBps?: number
  liquidity: number
  settlesAt: Date | null
  volume: number
}

export function MarketStatsPanel({
  closesAt,
  createdAt,
  feeBps,
  liquidity,
  settlesAt,
  volume,
}: MarketStatsPanelProps) {
  return (
    <section className="border border-border bg-surface p-4">
      <h2 className="mb-4 font-heading text-xl font-extrabold uppercase tracking-[0.04em] text-charcoal-primary">
        Market Stats
      </h2>
      <StatRow label="Trading fee" value={formatTradingFee(feeBps)} />
      <StatRow
        label="Liquidity"
        value={`${liquidity.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`}
      />
      <StatRow
        label="Volume"
        value={`${volume.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`}
      />
      <StatRow
        label="Created"
        value={createdAt ? createdAt.toLocaleString() : "Unknown"}
      />
      <StatRow
        label="Closes"
        value={closesAt ? closesAt.toLocaleString() : "Unknown"}
      />
      <StatRow
        label="Settles by"
        value={settlesAt ? settlesAt.toLocaleString() : "TBD"}
      />
    </section>
  )
}

interface CreatorPanelProps {
  creator: string
  creatorName: string
  marketsCreated: number
  totalVolume: number
}

export function CreatorPanel({
  creator,
  creatorName,
  marketsCreated,
  totalVolume,
}: CreatorPanelProps) {
  return (
    <section className="border border-border bg-surface p-4">
      <h2 className="mb-4 font-heading text-xl font-extrabold uppercase tracking-[0.04em] text-charcoal-primary">
        Creator
      </h2>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center border border-border bg-black font-heading text-base font-black text-white">
          {creatorName.charAt(0).toUpperCase()}
        </div>
        <div>
          <span className="block font-heading text-base font-extrabold uppercase text-charcoal-primary">
            {creatorName}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ash">
            {creator.slice(0, 6)}...{creator.slice(-4)}
          </span>
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-3">
        <StatRow
          label="Markets created"
          value={marketsCreated.toLocaleString()}
        />
        <StatRow
          label="Total volume"
          value={`${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`}
        />
      </div>
    </section>
  )
}

export function ResolutionDetailsPanel({
  disputePeriodHours,
  oracleAddress,
  resolverAddress,
}: {
  disputePeriodHours?: number
  oracleAddress?: string
  resolverAddress?: string
}) {
  return (
    <section className="border border-border bg-surface p-4">
      <h2 className="mb-4 font-heading text-xl font-extrabold uppercase tracking-[0.04em] text-charcoal-primary">
        Resolution Details
      </h2>
      <StatRow
        label="Resolver"
        value={
          resolverAddress
            ? `${resolverAddress.slice(0, 6)}...${resolverAddress.slice(-4)}`
            : "Platform Default"
        }
      />
      <StatRow
        label="Oracle"
        value={
          oracleAddress
            ? `${oracleAddress.slice(0, 6)}...${oracleAddress.slice(-4)}`
            : "UMA Optimistic Oracle"
        }
      />
      <StatRow
        label="Dispute window"
        value={`${disputePeriodHours ?? 2} hours`}
      />
      <div className="mt-3 border-t border-border pt-3">
        <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-ash">
          <ShieldCheck className="h-4 w-4 text-meadow-green" />
          <span>Secured by optimistic dispute bonds</span>
        </div>
      </div>
    </section>
  )
}

function IconAction({
  active = false,
  ariaLabel,
  disabled = false,
  icon,
  label,
  onClick,
  tone = "default",
}: {
  active?: boolean
  ariaLabel: string
  disabled?: boolean
  icon: ReactNode
  label?: number | string
  onClick?: () => void
  tone?: "default" | "like" | "no"
}) {
  const activeClass =
    tone === "like"
      ? "bg-accent text-white"
      : tone === "no"
        ? "bg-black text-white"
        : "bg-accent text-white"

  return (
    <button
      aria-label={ariaLabel}
      className={`flex min-h-12 items-center justify-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${
        active ? activeClass : "text-ash"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label !== undefined && <span>{label}</span>}
    </button>
  )
}

interface MarketActionsProps {
  likes: number
  onLike: () => void
  onShare: () => void
  viewerLiked: boolean
}

export function SocialActions({
  likes,
  onLike,
  onShare,
  viewerLiked,
}: MarketActionsProps) {
  return (
    <section
      aria-label="Market actions"
      className="border border-border bg-surface"
    >
      <div className="grid grid-cols-2 divide-x divide-border">
        <IconAction
          active={viewerLiked}
          ariaLabel={
            viewerLiked
              ? `Unlike market, ${likes} likes`
              : `Like market, ${likes} likes`
          }
          icon={
            <Heart className={`h-4 w-4 ${viewerLiked ? "fill-current" : ""}`} />
          }
          label={likes}
          onClick={onLike}
          tone="like"
        />
        <IconAction
          ariaLabel="Share market"
          icon={<Share className="h-4 w-4" />}
          onClick={onShare}
        />
      </div>
    </section>
  )
}
