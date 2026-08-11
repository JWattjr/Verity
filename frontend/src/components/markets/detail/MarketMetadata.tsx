"use client"

import { ReactNode } from "react"
import {
  ArrowDown,
  ArrowUp,
  Heart,
  MessageCircle,
  Share,
  ShieldCheck,
} from "lucide-react"
import { VoteSide, formatTradingFee } from "@/lib/verity"

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
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-accent" />
        <h2 className="font-heading text-xl font-extrabold uppercase tracking-[0.04em] text-charcoal-primary">
          Creator Stats
        </h2>
      </div>
      <StatRow label="Creator" value={creatorName} />
      <StatRow label="Handle" value={creator} />
      <StatRow
        label="Markets created"
        value={marketsCreated.toLocaleString()}
      />
      <StatRow
        label="Visible volume"
        value={`${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`}
      />
      <p className="mt-3 border-l-2 border-accent pl-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-accent">
        Wallet-created market
      </p>
    </section>
  )
}

interface IconActionProps {
  active?: boolean
  ariaLabel: string
  disabled?: boolean
  icon: ReactNode
  label?: number
  onClick: () => void
  tone?: "yes" | "no" | "like"
}

function IconAction({
  active = false,
  ariaLabel,
  disabled = false,
  icon,
  label,
  onClick,
  tone = "yes",
}: IconActionProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={`flex min-h-12 items-center justify-center gap-1.5 px-2 font-mono text-[10px] font-bold transition-colors hover:bg-surface-muted hover:text-charcoal-primary disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? tone === "no"
            ? "bg-charcoal-primary text-white"
            : "bg-accent/10 text-accent"
          : "text-ash"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span>{icon}</span>
      {typeof label === "number" && <span className="text-xs">{label}</span>}
    </button>
  )
}

interface SocialActionsProps {
  comments: number
  dailyVotesRemaining: number
  freeNoVotes: number
  freeYesVotes: number
  likes: number
  marketStatus: string
  onComment: () => void
  onLike: () => void
  onShare: () => void
  onVote: (side: VoteSide) => void
  viewerLiked: boolean
  viewerVote: VoteSide | null
}

export function SocialActions({
  comments,
  dailyVotesRemaining,
  freeNoVotes,
  freeYesVotes,
  likes,
  marketStatus,
  onComment,
  onLike,
  onShare,
  onVote,
  viewerLiked,
  viewerVote,
}: SocialActionsProps) {
  const votingDisabled =
    !["open_for_votes", "qualified", "funding_pool", "tradable"].includes(
      marketStatus,
    ) ||
    Boolean(viewerVote) ||
    dailyVotesRemaining <= 0

  return (
    <section
      aria-label="Market community actions"
      className="border border-border bg-surface"
    >
      <div className="grid grid-cols-5 divide-x divide-border">
        <IconAction
          ariaLabel={`Open ${comments} comments`}
          icon={<MessageCircle className="h-4 w-4" />}
          label={comments}
          onClick={onComment}
        />
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
          active={viewerVote === "YES"}
          ariaLabel={`Signal yes, ${freeYesVotes} votes`}
          disabled={votingDisabled}
          icon={<ArrowUp className="h-4 w-4" />}
          label={freeYesVotes}
          onClick={() => onVote("YES")}
        />
        <IconAction
          active={viewerVote === "NO"}
          ariaLabel={`Signal no, ${freeNoVotes} votes`}
          disabled={votingDisabled}
          icon={<ArrowDown className="h-4 w-4" />}
          label={freeNoVotes}
          onClick={() => onVote("NO")}
          tone="no"
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
