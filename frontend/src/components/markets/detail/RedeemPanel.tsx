"use client"

import { MarketPost, MarketPosition } from "@/lib/verity"

interface RedeemPanelProps {
  market: MarketPost
  positions: MarketPosition[]
  lpPositions: any[]
  onRedeem: (claimAmount?: number) => Promise<void>
  onClaimCreatorLP: (claimAmount?: number) => Promise<void>
  actionLoading: string | null
  profileId: string | undefined
}

export function RedeemPanel({
  market,
  positions,
  lpPositions,
  onRedeem,
  onClaimCreatorLP,
  actionLoading,
  profileId,
}: RedeemPanelProps) {
  const winningSide = market.resolvedOutcome
  const myPosition = positions.find((p) => p.shares > 0)
  const myLPPosition = lpPositions?.find((pos) => pos.isCreator)
  const hasCreatorLP = myLPPosition && myLPPosition.lpShares > 0

  if (!myPosition && !hasCreatorLP) return null

  const isWinner = myPosition && myPosition.side === winningSide
  const winningShares = isWinner ? myPosition.shares : 0

  return (
    <section className="verity-card p-4 sm:p-5">
      <h2 className="mb-1 text-[19px] font-semibold leading-[1.28] tracking-[-0.25px] text-charcoal-primary">
        Claim Winnings
      </h2>
      <p className="mb-4 text-sm tracking-[-0.18px] text-ash">
        Redeem your winning positions or claim your market creator liquidity
        payouts.
      </p>

      {myPosition && (
        <div className="mb-4 rounded-[12px] bg-parchment-card p-4 shadow-subtle">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase text-ash">
                My Outcome Position
              </span>
              <p className="mt-1 font-mono text-sm font-semibold text-charcoal-primary">
                {myPosition.shares.toFixed(2)} {myPosition.side} Shares
              </p>
            </div>
            <div>
              {isWinner ? (
                <span className="inline-flex items-center rounded-full bg-meadow-green/10 px-2 py-1 text-xs font-medium text-meadow-green shadow-subtle">
                  Winner
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-stone-surface px-2 py-1 text-xs font-medium text-ash">
                  Losing Outcome
                </span>
              )}
            </div>
          </div>

          {isWinner && (
            <div className="mt-4">
              <div className="mb-3 flex justify-between font-mono text-xs text-charcoal-primary">
                <span>Redeemable Value</span>
                <span className="font-semibold text-meadow-green">
                  {winningShares.toFixed(2)} USDC
                </span>
              </div>
              <button
                className="verity-pill flex h-10 w-full items-center justify-center bg-meadow-green font-mono text-xs font-semibold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={Boolean(actionLoading) || !profileId}
                onClick={() => onRedeem(winningShares)}
                type="button"
              >
                {actionLoading === "redeem"
                  ? "Redeeming..."
                  : "Redeem Winnings"}
              </button>
            </div>
          )}
        </div>
      )}

      {hasCreatorLP && (
        <div className="rounded-[12px] bg-parchment-card p-4 shadow-subtle">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase text-ash">
                Locked Creator Liquidity
              </span>
              <p className="mt-1 font-mono text-sm font-semibold text-charcoal-primary">
                {myLPPosition.lpShares.toFixed(4)} LP Shares
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-sky-blue/10 px-2 py-1 text-xs font-medium text-sky-blue shadow-subtle">
              Creator LP
            </span>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-ash">
            As the market creator, your initial launch liquidity can now be
            claimed and disbursed according to the final pool ratios.
          </p>
          <button
            className="verity-pill flex h-10 w-full items-center justify-center bg-inverse font-mono text-xs font-semibold uppercase tracking-[0.12em] text-inverse-text transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={Boolean(actionLoading) || !profileId}
            onClick={() => onClaimCreatorLP(myLPPosition.lpShares)}
            type="button"
          >
            {actionLoading === "claim_creator_lp"
              ? "Claiming..."
              : "Claim Creator LP"}
          </button>
        </div>
      )}
    </section>
  )
}

interface RefundPanelProps {
  market: MarketPost
  lpPositions: any[]
  onClaimRefund: (claimAmount?: number) => Promise<void>
  actionLoading: string | null
  profileId: string | undefined
}

export function RefundPanel({
  lpPositions,
  onClaimRefund,
  actionLoading,
  profileId,
}: RefundPanelProps) {
  const myLPPosition = lpPositions?.find((pos) => pos.userId === profileId)
  const hasDeposited = myLPPosition && myLPPosition.lpShares > 0

  if (!hasDeposited) return null

  return (
    <section className="verity-card p-4 sm:p-5">
      <h2 className="mb-1 text-[19px] font-semibold leading-[1.28] tracking-[-0.25px] text-charcoal-primary">
        Claim Refund
      </h2>
      <p className="mb-4 text-sm tracking-[-0.18px] text-ash">
        This market was voided. You can retrieve your committed pool funding.
      </p>

      <div className="rounded-[12px] bg-parchment-card p-4 shadow-subtle">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase text-ash">
              Your Pool Funding
            </span>
            <p className="mt-1 font-mono text-sm font-semibold text-charcoal-primary">
              {myLPPosition.lpShares.toFixed(2)} USDC
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-meadow-green/10 px-2 py-1 text-xs font-medium text-meadow-green shadow-subtle">
            Voided Market Refund
          </span>
        </div>
        <button
          className="verity-pill flex h-10 w-full items-center justify-center bg-meadow-green font-mono text-xs font-semibold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={Boolean(actionLoading) || !profileId}
          onClick={() => onClaimRefund(myLPPosition.lpShares)}
          type="button"
        >
          {actionLoading === "claim_refund"
            ? "Claiming Refund..."
            : "Claim USDC Refund"}
        </button>
      </div>
    </section>
  )
}
