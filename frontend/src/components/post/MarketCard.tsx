'use client'

import { useState, type MouseEvent } from 'react'
import { ArrowDown, ArrowUp, MessageCircle, Repeat2, Share } from 'lucide-react'
import type { VoteSide } from '@/lib/verity'

export interface MarketCardProps {
  variant?: 'compact' | 'detail'
  name: string
  handle: string
  time: string
  postContent?: string
  question: string
  category: string
  deadline: string
  resolutionSource?: string
  yesCondition?: string
  noCondition?: string
  status?: string
  yesPercent: number
  usdcYes: number
  usdcNo: number
  marketCreationFeeUsdc?: number
  tradingFeeBps?: number
  freeYesVotes?: number
  freeNoVotes?: number
  totalFreeVotes?: number
  uniqueVotersCount?: number
  qualificationThreshold?: number
  uniqueVoterThreshold?: number
  dailyVotesRemaining?: number
  votingDisabledMessage?: string | null
  comments: number
  reshares: number
  viewerVote?: VoteSide | null
  reshared?: boolean
  onVote?: (side: VoteSide) => void
  onUsdcVote?: (side: VoteSide, amount: number) => void
  onOpenDetails?: () => void
  onComment?: () => void
  onReshare?: () => void
  onShare?: () => void
  avatarColor?: string
  liquidity?: number
  actionLoading?: boolean
  actionLoadingStatus?: string | null
  isConnected?: boolean
  onAddLP?: (amount: number) => Promise<void>
}

export default function MarketCard({
  variant = 'compact',
  name,
  handle,
  time,
  postContent,
  question,
  category,
  deadline,
  resolutionSource,
  yesCondition,
  noCondition,
  status = 'open',
  yesPercent,
  usdcYes,
  usdcNo,
  marketCreationFeeUsdc = 1,
  freeYesVotes = 0,
  freeNoVotes = 0,
  totalFreeVotes,
  qualificationThreshold = 50,
  dailyVotesRemaining = 10,
  votingDisabledMessage,
  comments,
  reshares,
  viewerVote,
  reshared = false,
  onVote,
  onOpenDetails,
  onComment,
  onReshare,
  onUsdcVote,
  liquidity = 0,
  actionLoading = false,
  actionLoadingStatus = null,
  isConnected = false,
  onAddLP,
}: MarketCardProps) {
  const [lpAmount, setLpAmount] = useState('10')
  const [tradeAmount, setTradeAmount] = useState('10')
  const totalUsdc = usdcYes + usdcNo
  const hasBackedSentiment = totalUsdc > 0
  const totalVotes = totalFreeVotes ?? freeYesVotes + freeNoVotes
  const freeYesPercent = totalVotes > 0 ? (freeYesVotes / totalVotes) * 100 : 50
  const displayYesPercent = hasBackedSentiment ? yesPercent : freeYesPercent
  const noPercent =
    totalVotes > 0 || hasBackedSentiment ? 100 - displayYesPercent : 50
  const isOpenForVotes = status === 'open_for_votes'
  const isQualified = status === 'qualified'
  const isTradable = status === 'tradable'
  const isClosed = ['closed', 'resolving', 'resolved', 'voided'].includes(
    status,
  )
  const canFreeVote = isOpenForVotes || isQualified
  const hasViewerVoted = Boolean(viewerVote)
  const voteDisabled =
    !canFreeVote || hasViewerVoted || dailyVotesRemaining <= 0
  const voteThresholdMet = totalVotes >= qualificationThreshold
  const votesToReview = Math.max(0, qualificationThreshold - totalVotes)
  const qualificationProgress = Math.min(
    100,
    (totalVotes / qualificationThreshold) * 100,
  )
  const isDetail = variant === 'detail'
  const creatorLabel = handle === '@unknown' ? name : handle
  const openDetails = () => {
    if (!isDetail) onOpenDetails?.()
  }
  const stopClick = (event: MouseEvent) => event.stopPropagation()

  return (
    <article
      className={`rounded-[10px] border border-border bg-surface p-4 shadow-sm transition-colors hover:bg-surface-solid ${
        isDetail ? '' : 'cursor-pointer'
      }`}
      onClick={openDetails}
      onKeyDown={(event) => {
        if (!isDetail && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          openDetails()
        }
      }}
      role={isDetail ? undefined : 'link'}
      tabIndex={isDetail ? undefined : 0}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[17px] font-bold leading-snug text-foreground sm:text-lg">
            {question}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span>by</span>
            <span className="font-mono text-foreground">{creatorLabel}</span>
            <span className="font-mono text-muted">{'\u00B7'}</span>
            <span className="font-mono">{time}</span>
          </div>
        </div>

        <span
          className={`shrink-0 pt-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${isClosed ? 'text-muted' : 'text-brand-secondary'}`}
        >
          {status.replaceAll('_', ' ')}
        </span>
      </div>

      {postContent && postContent !== question && (
        <p className="mb-3 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
          {postContent}
        </p>
      )}

      <div className="mb-2 flex flex-wrap gap-2">
        <span className="rounded-[3px] border border-border bg-surface-solid px-2 py-0.5 font-mono text-[11px] text-muted">
          {category}
        </span>
      </div>

      <div
        className="mb-3 rounded-[10px] bg-surface-muted p-3.5 border border-border/80 shadow-inner"
        onClick={stopClick}
      >
        <div className="mb-2 flex items-center justify-between font-mono text-[11px] font-bold uppercase text-foreground">
          {isTradable ? (
            <>
              <span className="tracking-wider">Active Pool Liquidity</span>
              <span className="text-brand-secondary font-black text-xs">
                {liquidity.toFixed(2)} USDC
              </span>
            </>
          ) : (
            <>
              <span className="tracking-wider">Escrow Funding Progress</span>
              <span className="text-brand-secondary font-black text-xs">
                {liquidity.toFixed(2)} / 40.00 USDC
              </span>
            </>
          )}
        </div>

        {!isTradable && (
          <div className="mb-3">
            <div className="h-2 overflow-hidden rounded-full bg-surface-solid ring-1 ring-border">
              <div
                className="h-full bg-brand-secondary transition-all duration-500 shadow-[0_0_8px_rgba(var(--brand-secondary-rgb),0.5)]"
                style={{ width: `${Math.min(100, (liquidity / 40) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {!isClosed && (
          isTradable ? null : (status === 'funding_pool' || (status === 'qualified' && liquidity >= 40)) ? (
            <div className="flex flex-col items-center justify-center py-3 text-center">
              <svg
                className="animate-spin h-7 w-7 text-brand-secondary mb-2"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="font-mono text-xs font-bold text-foreground">
                All conditions met
              </span>
              <span className="text-[10px] text-muted mt-0.5">
                Deploying market on-chain...
              </span>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  className="h-9 w-full rounded-[6px] border border-border bg-surface-solid pl-2 pr-10 font-mono text-xs text-foreground outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary"
                  min="1"
                  onChange={(e) => setLpAmount(e.target.value)}
                  placeholder="Amount"
                  step="1"
                  type="number"
                  value={lpAmount}
                />
                <span className="absolute right-2 top-2 font-mono text-[9px] font-bold uppercase text-muted">
                  USDC
                </span>
              </div>
              <button
                className="flex h-9 items-center justify-center rounded-[6px] bg-inverse px-4 font-mono text-xs font-black uppercase tracking-[0.08em] text-inverse-text transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={actionLoading || !isConnected || Number(lpAmount) <= 0}
                onClick={() => onAddLP?.(Number(lpAmount))}
                type="button"
              >
                {actionLoadingStatus === 'deposit' ? 'Saving...' : 'Deposit Escrow'}
              </button>
            </div>
          )
        )}
      </div>

      <div className="mb-3 rounded-[7px] border border-dashed border-border bg-surface-muted p-3 font-mono text-[11px] text-muted">
        <div className="mb-2 flex flex-wrap justify-between gap-2">
          <span>{totalVotes} votes cast</span>
          <span>
            {voteThresholdMet
              ? 'Review threshold met'
              : `${votesToReview} to review`}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-solid">
          <div
            className="h-full bg-brand-secondary"
            style={{ width: `${qualificationProgress}%` }}
          />
        </div>
        <div className="mt-2">
          <span>Votes left today: {dailyVotesRemaining}</span>
        </div>
      </div>

      {isTradable ? (
        <div className="mb-3" onClick={stopClick}>
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <input
                className="h-9 w-full rounded-[6px] border border-border bg-surface-solid pl-2 pr-10 font-mono text-xs text-foreground outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary"
                min="1"
                onChange={(e) => setTradeAmount(e.target.value)}
                placeholder="Trade amount"
                step="1"
                type="number"
                value={tradeAmount}
              />
              <span className="absolute right-2 top-2 font-mono text-[9px] font-bold uppercase text-muted">
                USDC
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex h-9 items-center justify-center gap-1 rounded-[6px] border border-brand-secondary bg-brand-secondary/10 hover:bg-brand-secondary/20 text-sm font-bold text-foreground transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={actionLoading || !isConnected || Number(tradeAmount) <= 0}
              onClick={() => onUsdcVote?.('YES', Number(tradeAmount))}
              type="button"
            >
              {actionLoadingStatus === 'buy_yes' ? 'Buying...' : 'BUY YES'}
            </button>
            <button
              className="flex h-9 items-center justify-center gap-1 rounded-[6px] border border-brand-accent bg-brand-accent/10 hover:bg-brand-accent/20 text-sm font-bold text-foreground transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={actionLoading || !isConnected || Number(tradeAmount) <= 0}
              onClick={() => onUsdcVote?.('NO', Number(tradeAmount))}
              type="button"
            >
              {actionLoadingStatus === 'buy_no' ? 'Buying...' : 'BUY NO'}
            </button>
          </div>
        </div>
      ) : canFreeVote ? (
        <div className="mb-3" onClick={stopClick}>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <button
              className="flex h-8 items-center justify-center gap-1 rounded-[5px] border border-brand-secondary bg-brand-secondary/10 text-sm font-medium text-foreground transition-colors hover:bg-brand-secondary/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={voteDisabled}
              onClick={() => onVote?.('YES')}
              title={yesCondition}
              type="button"
            >
              Upvote
            </button>
            <button
              className="flex h-8 items-center justify-center gap-1 rounded-[5px] border border-brand-accent bg-brand-accent/10 text-sm font-medium text-foreground transition-colors hover:bg-brand-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={voteDisabled}
              onClick={() => onVote?.('NO')}
              title={noCondition}
              type="button"
            >
              Downvote
            </button>
          </div>
          {votingDisabledMessage && (
            <p className="font-mono text-[11px] text-brand-accent">
              {votingDisabledMessage}
            </p>
          )}
        </div>
      ) : (
        <p className="mb-3 rounded-[7px] border border-border bg-surface-muted p-3 text-sm font-semibold text-muted">
          This market is not open for free voting.
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
        {isTradable && (
          <span>
            Liquidity $
            {totalUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        )}
        <span>Closes {deadline}</span>
        {isDetail && (
          <span>
            Create fee {Number(marketCreationFeeUsdc).toFixed(2)} USDC
          </span>
        )}
        {isDetail && resolutionSource && (
          <span className="min-w-0 truncate">Source: {resolutionSource}</span>
        )}
      </div>

      {isDetail && (
        <div className="mb-3 grid gap-2 rounded-[7px] border border-dashed border-border bg-surface-muted p-3 font-mono text-[11px] text-muted">
          {yesCondition && (
            <span className="text-brand-secondary">YES: {yesCondition}</span>
          )}
          {noCondition && (
            <span className="text-brand-accent">NO: {noCondition}</span>
          )}
        </div>
      )}

      <div
        className="flex max-w-[425px] items-center justify-between border-t border-dashed border-border pt-1.5 text-muted"
        onClick={stopClick}
      >
        <button
          aria-label={`Comment on ${question}`}
          className="group flex items-center gap-2 transition-colors hover:text-foreground"
          onClick={onComment}
          type="button"
        >
          <span className="rounded-full p-2 transition-colors group-hover:bg-surface-hover">
            <MessageCircle className="h-4 w-4" />
          </span>
          <span className="text-xs">{comments}</span>
        </button>

        <button
          aria-label={`Reshare ${question}`}
          aria-pressed={reshared}
          className={`group flex items-center gap-2 transition-colors hover:text-foreground ${reshared ? 'text-brand-secondary' : ''}`}
          onClick={onReshare}
          type="button"
        >
          <span className="rounded-full p-2 transition-colors group-hover:bg-surface-hover">
            <Repeat2 className="h-4 w-4" />
          </span>
          <span className="text-xs">{reshares}</span>
        </button>

        <button
          aria-label={`Upvote ${question}`}
          aria-pressed={viewerVote === 'YES'}
          className={`group flex items-center gap-2 transition-colors hover:text-brand-secondary ${
            viewerVote === 'YES' ? 'text-brand-secondary' : ''
          }`}
          disabled={voteDisabled}
          onClick={() => onVote?.('YES')}
          type="button"
        >
          <span className="rounded-full p-2 transition-colors group-hover:bg-brand-secondary/10">
            <ArrowUp className="h-4 w-4" />
          </span>
          <span className="text-xs">{freeYesVotes}</span>
        </button>

        <button
          aria-label={`Downvote ${question}`}
          aria-pressed={viewerVote === 'NO'}
          className={`group flex items-center gap-2 transition-colors hover:text-brand-accent ${
            viewerVote === 'NO' ? 'text-brand-accent' : ''
          }`}
          disabled={voteDisabled}
          onClick={() => onVote?.('NO')}
          type="button"
        >
          <span className="rounded-full p-2 transition-colors group-hover:bg-brand-accent/10">
            <ArrowDown className="h-4 w-4" />
          </span>
          <span className="text-xs">{freeNoVotes}</span>
        </button>

        <button
          aria-label={`Share ${question}`}
          className="group flex items-center gap-2 transition-colors hover:text-foreground"
          type="button"
        >
          <span className="rounded-full p-2 transition-colors group-hover:bg-surface-hover">
            <Share className="h-4 w-4" />
          </span>
        </button>
      </div>
    </article>
  )
}
