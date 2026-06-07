"use client"

import { useTxStore } from "@/store/txStore"
import { X, Loader2 } from "lucide-react"

export default function TxConfirmModal() {
  const txConfirmState = useTxStore((s) => s.txConfirmState)
  const isExecutingTx = useTxStore((s) => s.isExecutingTx)
  const txError = useTxStore((s) => s.txError)

  const handleConfirmTx = useTxStore((s) => s.handleConfirmTx)
  const handleCancelTx = useTxStore((s) => s.handleCancelTx)

  if (!txConfirmState.isOpen) return null

  const isRedeemOrClaim = txConfirmState.claimAmountUsdc !== undefined

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-midnight/40 backdrop-blur-md px-4 py-6 animate-fade-in">
      <div className="w-full max-w-[460px] overflow-hidden rounded-[12px] border border-border bg-surface-solid p-6 shadow-2xl transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-surface pb-4 mb-5">
          <h3 className="text-lg font-bold text-charcoal-primary">
            Confirm Action
          </h3>
          {!isExecutingTx && (
            <button
              onClick={handleCancelTx}
              className="rounded-lg p-1.5 text-ash hover:bg-stone-surface hover:text-midnight transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="space-y-5">
          <div className="rounded-[10px] border border-stone-surface bg-white-surface p-4 space-y-3">
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-ash">
              Action Detail
            </p>
            <p className="text-base font-semibold text-charcoal-primary leading-snug">
              {txConfirmState.description}
            </p>
          </div>

          {/* Cost Summary Table */}
          <div className="rounded-[10px] border border-stone-surface bg-parchment-card p-4 space-y-3.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ash">
                {isRedeemOrClaim ? "Total USDC Claimed" : "Total USDC Value"}
              </span>
              <span className="font-mono font-semibold text-charcoal-primary">
                {(isRedeemOrClaim
                  ? (txConfirmState.claimAmountUsdc ?? 0)
                  : txConfirmState.estimatedCostUsdc
                ).toFixed(2)}{" "}
                USDC
              </span>
            </div>
            {!isRedeemOrClaim && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ash">Network Gas Fee</span>
                  <span className="font-mono text-graphite font-semibold flex items-center gap-1">
                    Paid by Wallet (ARC)
                  </span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-midnight font-medium">
                    Estimated Total Cost
                  </span>
                  <span className="font-mono font-bold text-charcoal-primary text-base">
                    {txConfirmState.estimatedCostUsdc.toFixed(2)} USDC + Gas
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancelTx}
              disabled={isExecutingTx}
              className="flex-1 h-11 rounded-[10px] border border-border bg-transparent text-graphite text-sm font-semibold hover:bg-stone-surface transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmTx}
              disabled={isExecutingTx}
              className="flex-1 h-11 rounded-[10px] bg-meadow-green hover:bg-meadow-green/90 text-inverse-text text-sm font-semibold transition-colors shadow-lg shadow-emerald-950/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isExecutingTx ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                "Confirm & Execute"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
