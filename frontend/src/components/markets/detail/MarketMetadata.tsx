"use client"

import { ReactNode } from "react"
import {
  ArrowDown,
  ArrowUp,
  MessageCircle,
  Repeat2,
  Share,
  ShieldCheck,
} from "lucide-react"
import { MarketPost, VoteSide, formatTradingFee } from "@/lib/verity"

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
    <section className="verity-card p-5">
      <h2 className="mb-4 font-semibold tracking-[-0.18px] text-charcoal-primary">
        Rules
      </h2>
      <div className="grid gap-3 text-sm leading-relaxed tracking-[-0.18px] text-graphite">
        <p>{postContent}</p>
        <div className="rounded-[10px] bg-meadow-green/10 p-3 shadow-subtle">
          <span className="font-mono text-xs font-semibold text-meadow-green">
            YES
          </span>
          <p className="mt-1">{yesCondition}</p>
        </div>
        <div className="rounded-[10px] bg-ember-orange/10 p-3 shadow-subtle">
          <span className="font-mono text-xs font-semibold text-ember-orange">
            NO
          </span>
          <p className="mt-1">{noCondition}</p>
        </div>
        <p className="font-mono text-xs text-ash">
          Resolution source: {resolutionSource}
        </p>
      </div>
    </section>
  )
}

export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-dashed border-stone-surface py-2 text-sm">
      <span className="text-ash">{label}</span>
      <span className="text-right font-mono text-xs font-semibold text-charcoal-primary">
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
    <section className="verity-card p-4">
      <h2 className="mb-4 font-semibold tracking-[-0.18px] text-charcoal-primary">
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
    <section className="verity-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-meadow-green" />
        <h2 className="font-semibold tracking-[-0.18px] text-charcoal-primary">
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
      <p className="mt-3 font-mono text-[11px] text-meadow-green">
        Wallet-created market
      </p>
    </section>
  )
}

interface IconActionProps {
  active?: boolean
  disabled?: boolean
  icon: ReactNode
  label?: number
  onClick: () => void
  tone?: "yes" | "no"
}

function IconAction({
  active = false,
  disabled = false,
  icon,
  label,
  onClick,
  tone = "yes",
}: IconActionProps) {
  return (
    <button
      className={`flex items-center gap-2 transition-colors hover:text-charcoal-primary ${
        active
          ? tone === "yes"
            ? "text-meadow-green"
            : "text-ember-orange"
          : ""
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="rounded-full p-2 transition-colors hover:bg-stone-surface">
        {icon}
      </span>
      {typeof label === "number" && <span className="text-xs">{label}</span>}
    </button>
  )
}

interface SocialActionsProps {
  comments: number
  dailyVotesRemaining: number
  freeNoVotes: number
  freeYesVotes: number
  marketStatus: string
  onComment: () => void
  onReshare: () => void
  onShare: () => void
  onVote: (side: VoteSide) => void
  reshares: number
  reshared: boolean
  viewerVote: VoteSide | null
}

export function SocialActions({
  comments,
  dailyVotesRemaining,
  freeNoVotes,
  freeYesVotes,
  marketStatus,
  onComment,
  onReshare,
  onShare,
  onVote,
  reshares,
  reshared,
  viewerVote,
}: SocialActionsProps) {
  const votingDisabled =
    !["open_for_votes", "qualified", "funding_pool", "tradable"].includes(
      marketStatus,
    ) ||
    Boolean(viewerVote) ||
    dailyVotesRemaining <= 0

  return (
    <section className="verity-card p-4">
      <div className="flex items-center justify-between text-ash">
        <IconAction
          icon={<MessageCircle className="h-4 w-4" />}
          label={comments}
          onClick={onComment}
        />
        <IconAction
          active={reshared}
          icon={<Repeat2 className="h-4 w-4" />}
          label={reshares}
          onClick={onReshare}
        />
        <IconAction
          active={viewerVote === "YES"}
          disabled={votingDisabled}
          icon={<ArrowUp className="h-4 w-4" />}
          label={freeYesVotes}
          onClick={() => onVote("YES")}
        />
        <IconAction
          active={viewerVote === "NO"}
          disabled={votingDisabled}
          icon={<ArrowDown className="h-4 w-4" />}
          label={freeNoVotes}
          onClick={() => onVote("NO")}
          tone="no"
        />
        <IconAction icon={<Share className="h-4 w-4" />} onClick={onShare} />
      </div>
    </section>
  )
}
