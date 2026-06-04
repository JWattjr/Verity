"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { toast } from "react-hot-toast"
import { useMarketLiquidity } from "@/hooks/useMarketLiquidity"
import { useUsdcBalance } from "@/hooks/useUsdcBalance"

interface PvpLiquidityModalProps {
  liquidityMarketId: string | null
  setLiquidityMarketId: (id: string | null) => void
  optionForLP: any
  selectedPvpEvent: any
  refetchPvpStatus: () => void
  profile: any
}

export default function PvpLiquidityModal({
  liquidityMarketId,
  setLiquidityMarketId,
  optionForLP,
  selectedPvpEvent,
  refetchPvpStatus,
  profile,
}: PvpLiquidityModalProps) {
  const { addPoolLiquidity } = useMarketLiquidity()
  const { rawBalance } = useUsdcBalance()
  const [liquidityAmount, setLiquidityAmount] = useState<string>("10")
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false)

  if (!liquidityMarketId || !optionForLP) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/35 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="absolute inset-0"
        onClick={() => setLiquidityMarketId(null)}
      />
      <section className="verity-card relative z-10 w-full max-w-[420px] bg-white dark:bg-zinc-950 p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150 rounded-2xl border border-border dark:border-zinc-800">
        <div className="flex items-center justify-between pb-3 border-b border-dashed border-border dark:border-zinc-800">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-ash">
            Add Pool Liquidity
          </span>
          <button
            onClick={() => setLiquidityMarketId(null)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-parchment-card hover:bg-stone-surface dark:bg-zinc-900 text-charcoal-primary dark:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-ash uppercase block">
              CHILD MARKET
            </span>
            <h4 className="text-sm font-bold text-charcoal-primary dark:text-white mt-1 leading-normal">
              {optionForLP.optionName}
            </h4>
            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">
              Parent: {selectedPvpEvent?.question}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-ash uppercase">
              <span>Amount to Deposit (USDC)</span>
              <span>
                Balance: {(Number(rawBalance) / 1e6).toLocaleString()} USDC
              </span>
            </div>
            <div className="flex h-11 items-center rounded-[10px] border border-border dark:border-zinc-800 bg-white-surface dark:bg-zinc-900 px-3">
              <input
                type="number"
                min="1"
                value={liquidityAmount}
                onChange={(e) => setLiquidityAmount(e.target.value)}
                className="w-full bg-transparent text-sm text-charcoal-primary dark:text-white outline-none"
              />
              <button
                onClick={() =>
                  setLiquidityAmount((Number(rawBalance) / 1e6).toString())
                }
                className="text-[10px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded hover:bg-indigo-500/20"
              >
                MAX
              </button>
            </div>
          </div>

          <p className="text-[10px] font-mono text-ash leading-normal bg-stone-50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-border/40 dark:border-zinc-800/40">
            • Deposits USDC liquidity into the child market pool to
            facilitate trading.
            <br />
            • Earn LP shares and trading fees from all BUY/SELL token
            trades in this market.
          </p>

          <button
            onClick={async () => {
              const amt = Number(liquidityAmount)
              if (isNaN(amt) || amt <= 0) {
                toast.error("Please enter a valid deposit amount.")
                return
              }
              if (amt > Number(rawBalance) / 1e6) {
                toast.error("Insufficient USDC balance in wallet.")
                return
              }
              setIsAddingLiquidity(true)
              try {
                await addPoolLiquidity(optionForLP.id, profile!.id, amt)
                setLiquidityMarketId(null)
                void refetchPvpStatus()
              } catch (err: any) {
                // error is toasted in addPoolLiquidity hook
              } finally {
                setIsAddingLiquidity(false)
              }
            }}
            disabled={isAddingLiquidity}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-wider text-xs shadow-md transition-all rounded-[10px] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAddingLiquidity ? "Depositing..." : "Deposit Liquidity"}
          </button>
        </div>
      </section>
    </div>
  )
}
