"use client"

import Link from "next/link"
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Heart,
  MessageCircle,
  Share,
  Swords,
  Timer,
} from "lucide-react"
import {
  calculateYesPercent,
  type FeedPost,
  type MarketPost,
} from "@/lib/verity"
import { toast } from "@/lib/toast"

interface MarketFeedCardProps {
  item: FeedPost
  dailyVotesRemaining: number
  likePending?: boolean
  votePending?: boolean
  onLike: (item: FeedPost) => void
  onVote: (market: MarketPost, side: "YES" | "NO") => void
  onOpenPvp: (market: MarketPost) => void
}

export default function MarketFeedCard({
  item,
  dailyVotesRemaining,
  likePending = false,
  votePending = false,
  onLike,
  onVote,
  onOpenPvp,
}: MarketFeedCardProps) {
  const market = item.market
  if (!market) return null

  const isPvp = market.category?.toLowerCase() === "pvp"

  if (isPvp) {
    return (
      <article className="group relative flex min-h-[238px] flex-col border-b border-r border-border bg-surface transition-colors hover:bg-surface-muted">
        <div className="flex items-center justify-between border-b border-border font-mono text-[9px] font-bold uppercase tracking-[0.16em]">
          <span className="flex items-center gap-2 bg-accent px-3 py-2 text-white">
            <Swords className="h-3.5 w-3.5" />
            PVP arena
          </span>
          <span className="flex items-center gap-2 px-3 py-2 text-ash">
            <span className="h-1.5 w-1.5 bg-accent" />
            Open
          </span>
        </div>

        <button
          onClick={() => onOpenPvp(market)}
          className="flex flex-1 flex-col p-5 text-left"
          type="button"
        >
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-ash">
            Verity Arena · Head-to-head card
          </span>
          <h3 className="mt-3 max-w-xl font-heading text-[27px] font-black uppercase leading-[0.98] tracking-[0.02em] text-charcoal-primary transition-colors group-hover:text-accent sm:text-[31px]">
            {market.question}
          </h3>
          <p className="mt-3 max-w-lg text-xs leading-5 text-graphite">
            Pick at least three propositions and compete for Arena XP, boosts,
            and leaderboard position.
          </p>
        </button>

        <button
          onClick={() => onOpenPvp(market)}
          className="flex min-h-11 items-center justify-between border-t border-border px-4 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ash transition-colors hover:bg-accent hover:text-white"
          type="button"
        >
          <span className="flex items-center gap-2">
            <Timer className="h-3.5 w-3.5" />
            Closes {new Date(market.deadline).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            Build picks
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </article>
    )
  }

  const yesPercent = calculateYesPercent(market)
  const noPercent = 100 - yesPercent
  const isTradable = market.status === "tradable"
  const totalPool =
    Number(market.usdc_yes_amount || 0) + Number(market.usdc_no_amount || 0)

  return (
    <article className="group flex min-h-[300px] flex-col border-b border-r border-border bg-surface transition-colors hover:bg-surface-muted">
      <div className="flex min-h-9 items-stretch justify-between border-b border-border font-mono text-[9px] font-bold uppercase tracking-[0.14em]">
        <span className="flex items-center border-r border-border px-3 text-charcoal-primary">
          {market.category || "General"}
        </span>
        <span className="flex items-center gap-2 px-3 text-ash">
          <span className="h-1.5 w-1.5 bg-accent" />
          {isTradable ? "Live market" : market.status}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <Link
          href={`/markets/${market.id}`}
          className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <h3 className="font-heading text-[26px] font-black uppercase leading-[1] tracking-[0.02em] text-charcoal-primary transition-colors group-hover:text-accent sm:text-[30px]">
            {market.question}
          </h3>
        </Link>

        <dl className="mt-5 grid grid-cols-2 border-y border-border sm:grid-cols-3">
          <div className="border-r border-border px-3 py-2.5">
            <dt className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-ash">
              Liquidity
            </dt>
            <dd className="mt-1 font-heading text-lg font-extrabold uppercase text-charcoal-primary">
              ${Number(market.liquidity ?? 0).toLocaleString()}
            </dd>
          </div>
          <div className="px-3 py-2.5 sm:border-r sm:border-border">
            <dt className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-ash">
              Pool
            </dt>
            <dd className="mt-1 font-heading text-lg font-extrabold uppercase text-charcoal-primary">
              ${totalPool.toLocaleString()}
            </dd>
          </div>
          <div className="col-span-2 border-t border-border px-3 py-2.5 sm:col-span-1 sm:border-t-0">
            <dt className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-ash">
              Leading signal
            </dt>
            <dd className="mt-1 font-heading text-lg font-extrabold uppercase text-accent">
              {yesPercent >= noPercent ? "Yes" : "No"}{" "}
              {Math.max(yesPercent, noPercent)}%
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.08em]">
            <span className="text-accent">Yes {yesPercent}%</span>
            <span className="text-charcoal-primary">No {noPercent}%</span>
          </div>
          <div
            className="flex h-1.5 w-full overflow-hidden bg-black"
            aria-label={`Yes ${yesPercent} percent, No ${noPercent} percent`}
            role="img"
          >
            <span
              className="h-full bg-accent"
              style={{ width: `${yesPercent}%` }}
            />
          </div>
        </div>

        {isTradable && (
          <div className="mt-4 grid grid-cols-2 border border-border">
            <Link
              href={`/markets/${market.id}?action=BUY&side=YES`}
              className="flex min-h-10 items-center justify-between bg-accent px-3 font-sans text-[10px] font-extrabold uppercase tracking-[0.1em] text-white transition-colors hover:bg-black"
            >
              <span>Buy yes</span>
              <span className="font-mono">{yesPercent}¢</span>
            </Link>
            <Link
              href={`/markets/${market.id}?action=BUY&side=NO`}
              className="flex min-h-10 items-center justify-between border-l border-border bg-black px-3 font-sans text-[10px] font-extrabold uppercase tracking-[0.1em] text-white transition-colors hover:bg-accent"
            >
              <span>Buy no</span>
              <span className="font-mono">{noPercent}¢</span>
            </Link>
          </div>
        )}
      </div>

      <div className="grid min-h-11 grid-cols-[auto_auto_auto_auto_1fr_auto] border-t border-border font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-ash">
        <button
          aria-label={`${item.viewerLiked ? "Unlike" : "Like"} ${market.question}`}
          aria-pressed={Boolean(item.viewerLiked)}
          className={`flex items-center gap-1.5 border-r border-border px-3 transition-colors hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${
            item.viewerLiked ? "bg-accent text-white" : "text-ash"
          }`}
          disabled={likePending}
          onClick={() => onLike(item)}
          type="button"
        >
          <Heart
            className={`h-3.5 w-3.5 ${item.viewerLiked ? "fill-current" : ""}`}
          />
          <span>{item.likesCount ?? 0}</span>
        </button>

        <Link
          href={`/markets/${market.id}#comments`}
          aria-label={`${item.commentsCount ?? 0} comments on ${market.question}`}
          className="flex items-center gap-1.5 border-r border-border px-3 transition-colors hover:bg-black hover:text-white"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          <span>{item.commentsCount ?? 0}</span>
          <span className="hidden sm:inline">Comments</span>
        </Link>

        <button
          aria-label={`Upvote ${market.question}`}
          aria-pressed={item.viewerVote === "YES"}
          className={`flex items-center gap-1.5 border-r border-border px-3 transition-colors hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${
            item.viewerVote === "YES" ? "bg-accent text-white" : "text-ash"
          }`}
          disabled={
            Boolean(item.viewerVote) || dailyVotesRemaining <= 0 || votePending
          }
          onClick={() => onVote(market, "YES")}
          type="button"
        >
          <ArrowUp className="h-3.5 w-3.5" />
          <span>{market.free_yes_votes ?? 0}</span>
        </button>

        <button
          aria-label={`Downvote ${market.question}`}
          aria-pressed={item.viewerVote === "NO"}
          className={`flex items-center gap-1.5 border-r border-border px-3 transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${
            item.viewerVote === "NO" ? "bg-black text-white" : "text-ash"
          }`}
          disabled={
            Boolean(item.viewerVote) || dailyVotesRemaining <= 0 || votePending
          }
          onClick={() => onVote(market, "NO")}
          type="button"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          <span>{market.free_no_votes ?? 0}</span>
        </button>

        <span className="hidden items-center justify-end px-3 text-[8px] tracking-[0.12em] sm:flex">
          Open market
        </span>

        <button
          aria-label={`Share ${market.question}`}
          className="flex items-center border-l border-border px-3 transition-colors hover:bg-black hover:text-white"
          onClick={() => {
            const url = `${window.location.origin}/markets/${market.id}`
            void navigator.clipboard.writeText(url)
            toast.success("Market link copied to clipboard!")
          }}
          type="button"
        >
          <Share className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}
