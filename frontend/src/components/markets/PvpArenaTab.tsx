"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/components/providers/AuthModals"
import { useMarketResolution } from "@/hooks/useMarketResolution"
import { arcUsdcAddress, FPMM_ADDRESS, publicClient } from "@/lib/arc"
import {
  useSubmitPvpTicketMutation,
  useCastFreeVoteMutation,
  useExecuteMarketTradeMutation,
} from "@/store/verity/verityQueries"
import { Swords, User, Bot, Zap, ChevronRight, Award } from "lucide-react"
import { toast } from "react-hot-toast"
import PvpLiquidityModal from "./PvpLiquidityModal"

function formatMarketId(marketId: string): `0x${string}` {
  const clean = marketId.replace(/^0x/, "")
  return `0x${clean.padEnd(64, "0")}` as `0x${string}`
}

interface PvpArenaTabProps {
  pvpEvents: any[]
  pvpEventsLoading: boolean
  pvpStatus: any
  pvpStatusLoading: boolean
  refetchPvpStatus: () => void
  profile: any
  referralsData: any
}

export default function PvpArenaTab({
  pvpEvents,
  pvpEventsLoading,
  pvpStatus,
  pvpStatusLoading,
  refetchPvpStatus,
  profile,
  referralsData,
}: PvpArenaTabProps) {
  const { user, executeTxBatch } = useAuth()
  const { redeemMultipleWinnings } = useMarketResolution()
  const submitTicketMutation = useSubmitPvpTicketMutation()
  const { mutateAsync: executeMarketTrade } = useExecuteMarketTradeMutation()

  // Local state for ticket builder
  const [showBuilderOverride, setShowBuilderOverride] = useState<boolean>(false)
  const [betAmountPerSelection, setBetAmountPerSelection] = useState<number>(5)
  const [selectedPvpEventId, setSelectedPvpEventId] = useState<string | null>(
    null,
  )
  const [pvpSelections, setPvpSelections] = useState<
    Record<string, "YES" | "NO">
  >({})

  // Local state for child market liquidity modal
  const [liquidityMarketId, setLiquidityMarketId] = useState<string | null>(
    null,
  )

  // Poll matchmaking status if queued
  useEffect(() => {
    let interval: NodeJS.Timeout
    const isQueued = pvpStatus?.status === "queued"

    if (isQueued) {
      interval = setInterval(() => {
        void refetchPvpStatus()
      }, 3000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [pvpStatus, refetchPvpStatus])

  // Get active PvP event
  const selectedPvpEvent = useMemo(() => {
    if (!pvpEvents || pvpEvents.length === 0) return null
    if (selectedPvpEventId) {
      return (
        pvpEvents.find((e: any) => e.id === selectedPvpEventId) || pvpEvents[0]
      )
    }
    return pvpEvents[0]
  }, [pvpEvents, selectedPvpEventId])

  // Reset selections when event changes
  useEffect(() => {
    if (selectedPvpEvent) {
      setSelectedPvpEventId(selectedPvpEvent.id)
      const initial: Record<string, "YES" | "NO"> = {}
      selectedPvpEvent.options.forEach((opt: any) => {
        initial[opt.id] = "YES" // Default to YES
      })
      setPvpSelections(initial)
    }
  }, [selectedPvpEvent])

  const runningScoreUser = useMemo(() => {
    if (!pvpStatus?.ticket?.picks) return 0
    return pvpStatus.ticket.picks.filter((p: any) => p.isCorrect === true)
      .length
  }, [pvpStatus])

  const runningScoreOpponent = useMemo(() => {
    if (!pvpStatus?.opponent?.picks) return 0
    return pvpStatus.opponent.picks.filter((p: any) => p.isCorrect === true)
      .length
  }, [pvpStatus])

  const optionForLP = useMemo(() => {
    if (!liquidityMarketId || !selectedPvpEvent) return null
    return selectedPvpEvent.options.find((o: any) => o.id === liquidityMarketId)
  }, [liquidityMarketId, selectedPvpEvent])

  // Submit PvP ticket transaction batch
  async function handleSubmitPvpTicket() {
    if (!profile || !user?.walletAddress) {
      toast.error("Connect your wallet to queue for the Arena.")
      return
    }
    if (!selectedPvpEvent) return

    const picks = Object.keys(pvpSelections).map((marketId) => ({
      marketId,
      selection: pvpSelections[marketId],
    }))

    if (picks.length !== 7) {
      toast.error("Please make a selection for all 7 options.")
      return
    }

    const totalAmount = betAmountPerSelection * 7
    const rawTotalAmount = BigInt(Math.round(totalAmount * 1e6))

    const toastId = toast.loading("Preparing ticket transaction batch...")
    try {
      // 1. Check current USDC allowance to FPMM_ADDRESS
      const allowance = await publicClient.readContract({
        abi: [
          {
            name: "allowance",
            type: "function",
            stateMutability: "view",
            inputs: [
              { name: "owner", type: "address" },
              { name: "spender", type: "address" },
            ],
            outputs: [{ name: "", type: "uint256" }],
          },
        ] as const,
        address: arcUsdcAddress,
        functionName: "allowance",
        args: [user.walletAddress as `0x${string}`, FPMM_ADDRESS],
      })

      const batchCalls: Array<{
        contractAddress: string
        abiFunctionSignature: string
        abiParameters: any[]
      }> = []

      // If allowance is too low, add approval call
      if (allowance < rawTotalAmount) {
        batchCalls.push({
          contractAddress: arcUsdcAddress,
          abiFunctionSignature: "approve(address,uint256)",
          abiParameters: [FPMM_ADDRESS, rawTotalAmount],
        })
      }

      // 2. Build 7 buy calls
      const rawAmountPerSelection = BigInt(
        Math.round(betAmountPerSelection * 1e6),
      )
      selectedPvpEvent.options.forEach((opt: any) => {
        const side = pvpSelections[opt.id]
        const isYes = side === "YES"
        batchCalls.push({
          contractAddress: FPMM_ADDRESS,
          abiFunctionSignature: "buy(bytes32,bool,uint256)",
          abiParameters: [formatMarketId(opt.id), isYes, rawAmountPerSelection],
        })
      })

      toast.dismiss(toastId)

      // 3. Execute batched on-chain buy calls
      const hash = await executeTxBatch(
        batchCalls,
        `Purchase 7-selection PvP ticket for ${totalAmount} USDC`,
        totalAmount,
      )

      // 4. Register trades on backend
      const finalizeToastId = toast.loading(
        "Finalizing on-chain trades on Verity...",
      )
      const tradePromises = Object.keys(pvpSelections).map((marketId) => {
        const side = pvpSelections[marketId]
        return executeMarketTrade({
          marketId,
          profileId: profile.id,
          side,
          action: "BUY",
          amount: betAmountPerSelection,
          txHash: hash,
        })
      })
      await Promise.all(tradePromises)
      toast.dismiss(finalizeToastId)

      // 5. Submit the ticket to queue
      const queueToastId = toast.loading("Queueing for PvP match...")
      await submitTicketMutation.mutateAsync({
        parentMarketId: selectedPvpEvent.id,
        picks,
      })
      toast.dismiss(queueToastId)

      toast.success(
        "Successfully purchased picks & submitted ticket! Queued for opponent...",
      )
      void refetchPvpStatus()
      setShowBuilderOverride(false)
    } catch (err: any) {
      toast.dismiss(toastId)
      if (!err.message?.includes("rejected")) {
        toast.error(err.message || "Failed to purchase tickets and queue.")
      }
    }
  }

  // PvP Arena Skeleton Loader
  if (pvpEventsLoading || pvpStatusLoading) {
    return (
      <div className="lg:col-span-2 flex flex-col gap-4 animate-pulse">
        <div className="verity-card p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-stone-surface dark:bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-4 w-48 bg-stone-surface dark:bg-zinc-800 rounded" />
              <div className="h-3 w-64 bg-stone-surface dark:bg-zinc-800 rounded" />
            </div>
          </div>
          <div className="h-10 w-32 bg-stone-surface dark:bg-zinc-800 rounded-lg" />
        </div>

        <div className="verity-card p-5 flex flex-col gap-4">
          <div className="border-b border-border dark:border-zinc-800 pb-3 space-y-2">
            <div className="h-5 w-52 bg-stone-surface dark:bg-zinc-800 rounded" />
            <div className="h-3 w-72 bg-stone-surface dark:bg-zinc-800 rounded" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-28 bg-stone-surface dark:bg-zinc-800 rounded" />
            <div className="h-11 w-full bg-stone-surface dark:bg-zinc-900 rounded-[10px]" />
          </div>
          <div className="space-y-3 mt-2">
            <div className="h-4 w-56 bg-stone-surface dark:bg-zinc-800 rounded" />
            <div className="space-y-2.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-border dark:border-zinc-800/85 bg-parchment-card dark:bg-zinc-900/40 gap-3"
                >
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 bg-stone-surface dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-1/3 bg-stone-surface dark:bg-zinc-800 rounded" />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <div className="h-8 w-16 bg-stone-surface dark:bg-zinc-800 rounded-lg" />
                    <div className="h-8 w-16 bg-stone-surface dark:bg-zinc-800 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const hasActiveDuel =
    pvpStatus?.status === "queued" ||
    pvpStatus?.status === "matched" ||
    pvpStatus?.status === "resolved"

  return (
    <div className="lg:col-span-2 flex flex-col gap-4">
      {hasActiveDuel && !showBuilderOverride && (
        <div className="flex flex-col gap-4">
          {/* H2H Status Banner */}
          {pvpStatus.status === "queued" ? (
            <div className="verity-card p-6 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden bg-gradient-to-br from-sky-blue/10 via-transparent to-transparent">
              <div className="absolute top-0 left-0 w-full h-1 bg-sky-blue animate-pulse" />

              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-full border border-sky-blue/20 flex items-center justify-center overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,144,255,0.06),transparent)]" />
                  <div className="absolute h-full w-0.5 bg-gradient-to-t from-sky-blue to-transparent top-0 left-1/2 origin-bottom rotate-animate" />
                  <Swords className="h-6 w-6 text-sky-blue relative z-10 animate-pulse" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-bold tracking-tight text-charcoal-primary dark:text-white">
                    Scanning for Opponent...
                  </h3>
                  <p className="text-xs text-ash mt-0.5">
                    Searching for a predictor with high selection divergence.
                  </p>
                </div>
              </div>

              <div className="bg-parchment-card dark:bg-zinc-950/40 px-3 py-2 rounded-[8px] border border-border dark:border-zinc-800 text-[10px] font-mono text-ash text-left space-y-0.5">
                <p className="flex items-center gap-1.5 font-semibold text-sky-blue">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-blue animate-ping" />
                  <span>Ticket Active</span>
                </p>
                <p>• Matchup: {pvpStatus.event?.question}</p>
              </div>
            </div>
          ) : pvpStatus.status === "resolved" ? (
            <div className="verity-card p-5 border border-sky-blue/30 dark:border-sky-blue/20 bg-gradient-to-br from-sky-blue/5 via-transparent to-transparent">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Left: You */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="h-10 w-10 rounded-full bg-sky-blue/10 dark:bg-sky-blue/20 flex items-center justify-center border border-sky-blue/20 shrink-0">
                    <User className="h-5 w-5 text-sky-blue" />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
                      Player 1
                    </span>
                    <h4 className="text-sm font-bold text-charcoal-primary dark:text-white leading-tight">
                      You
                    </h4>
                    <span className="text-[10px] font-mono text-sky-blue mt-0.5 block">
                      Score:{" "}
                      <strong className="text-sm font-bold">
                        {runningScoreUser} pts
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Middle: VS */}
                <div className="flex flex-col items-center shrink-0">
                  <span
                    className={`text-base font-extrabold uppercase tracking-widest ${
                      runningScoreUser > runningScoreOpponent
                        ? "text-meadow-green"
                        : runningScoreUser < runningScoreOpponent
                          ? "text-ember-orange"
                          : "text-ash"
                    }`}
                  >
                    {runningScoreUser > runningScoreOpponent
                      ? "YOU WON 🏆"
                      : runningScoreUser < runningScoreOpponent
                        ? "YOU LOST ❌"
                        : "DRAW 🤝"}
                  </span>
                  <span className="text-[9px] font-mono text-stone-400 dark:text-zinc-500 mt-1">
                    Divergence: {pvpStatus.match?.divergenceScore}/7
                  </span>
                </div>

                {/* Right: Opponent */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end text-right">
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
                      Player 2
                    </span>
                    <h4 className="text-sm font-bold text-charcoal-primary dark:text-white leading-tight">
                      @{pvpStatus.opponent?.username || "Opponent"}
                    </h4>
                    <span className="text-[10px] font-mono text-sky-blue mt-0.5 block">
                      Score:{" "}
                      <strong className="text-sm font-bold">
                        {runningScoreOpponent} pts
                      </strong>
                    </span>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-border dark:border-zinc-800 shrink-0">
                    <Bot className="h-5 w-5 text-ash" />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border dark:border-zinc-800 flex items-center justify-between">
                <p className="text-xs text-ash">
                  Duel is resolved. Arena XP has been awarded.
                </p>
                <button
                  onClick={() => setShowBuilderOverride(true)}
                  className="px-4 py-1.5 rounded-[8px] bg-sky-blue hover:bg-sky-blue/90 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Swords className="h-3.5 w-3.5" />
                  Play Again
                </button>
              </div>
            </div>
          ) : (
            <div className="verity-card p-5 border border-sky-blue/30 dark:border-sky-blue/20 bg-gradient-to-br from-sky-blue/5 via-transparent to-transparent">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Left: You */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="h-10 w-10 rounded-full bg-sky-blue/10 dark:bg-sky-blue/20 flex items-center justify-center border border-sky-blue/20 shrink-0">
                    <User className="h-5 w-5 text-sky-blue" />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
                      Player 1
                    </span>
                    <h4 className="text-sm font-bold text-charcoal-primary dark:text-white leading-tight">
                      You
                    </h4>
                    <span className="text-[10px] font-mono text-sky-blue mt-0.5 block">
                      Score:{" "}
                      <strong className="text-sm font-bold">
                        {runningScoreUser} pts
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Middle: VS */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="h-8 w-8 rounded-full border border-border dark:border-zinc-800 bg-white-surface dark:bg-zinc-950 flex items-center justify-center shadow-sm">
                    <Swords className="h-4 w-4 text-sky-blue" />
                  </div>
                  <span className="text-[9px] font-mono text-stone-400 dark:text-zinc-500 mt-1">
                    Divergence: {pvpStatus.match?.divergenceScore}/7
                  </span>
                </div>

                {/* Right: Opponent */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end text-right">
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
                      Player 2
                    </span>
                    <h4 className="text-sm font-bold text-charcoal-primary dark:text-white leading-tight">
                      @{pvpStatus.opponent?.username || "Opponent"}
                    </h4>
                    <span className="text-[10px] font-mono text-sky-blue mt-0.5 block">
                      Score:{" "}
                      <strong className="text-sm font-bold">
                        {runningScoreOpponent} pts
                      </strong>
                    </span>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-border dark:border-zinc-800 shrink-0">
                    <Bot className="h-5 w-5 text-ash" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Duelling Selections Detail */}
          <div className="verity-card p-5">
            <div className="border-b border-border dark:border-zinc-800 pb-3 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-charcoal-primary dark:text-white">
                  Your Predictions & Outcomes
                </h3>
                <p className="text-xs text-ash mt-0.5">
                  Track your selections, payouts, and opponent picks in
                  real-time.
                </p>
              </div>
            </div>

            {(() => {
              const claimablePicks =
                pvpStatus.ticket?.picks?.filter(
                  (p: any) => p.isCorrect === true && (p.shares ?? 0) > 0,
                ) || []

              if (claimablePicks.length === 0) return null

              const totalWinnings = claimablePicks.reduce(
                (acc: number, p: any) => acc + (p.shares ?? 0),
                0,
              )

              const handleClaimAll = async () => {
                try {
                  const marketIds = claimablePicks.map((p: any) => p.marketId)
                  await redeemMultipleWinnings(marketIds, totalWinnings)
                  void refetchPvpStatus()
                } catch (err) {
                  console.error("Failed to claim all winnings", err)
                }
              }

              return (
                <div className="mb-4 p-4 rounded-xl bg-meadow-green/10 border border-meadow-green/20 flex flex-col md:flex-row items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏆</span>
                    <div>
                      <h4 className="text-sm font-bold text-meadow-green">
                        You have unclaimed winnings!
                      </h4>
                      <p className="text-xs text-ash mt-0.5">
                        Claim {totalWinnings.toFixed(2)} USDC from{" "}
                        {claimablePicks.length} winning{" "}
                        {claimablePicks.length === 1
                          ? "proposition"
                          : "propositions"}
                        .
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClaimAll}
                    className="px-4 py-2 rounded-[8px] bg-meadow-green hover:bg-meadow-green/90 text-white text-xs font-bold transition-all shadow-sm shrink-0"
                  >
                    Claim All Winnings
                  </button>
                </div>
              )
            })()}

            <div className="space-y-3">
              {pvpStatus.ticket?.picks.map((pick: any) => {
                const childOpt = pvpStatus.event?.options.find(
                  (o: any) => o.id === pick.marketId,
                )
                const oppPick = pvpStatus.opponent?.picks.find(
                  (p: any) => p.marketId === pick.marketId,
                )

                const invested = pick.investedUsdc ?? 0

                return (
                  <div
                    key={pick.marketId}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-parchment-card dark:bg-zinc-900/40 border border-border dark:border-zinc-800/85 gap-3"
                  >
                    {/* Proposition Title */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-semibold tracking-tight text-charcoal-primary dark:text-zinc-200 uppercase">
                        {(
                          childOpt?.optionName ||
                          pick.optionName ||
                          "Pick"
                        ).toUpperCase()}
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-mono mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span>
                          Shares: <strong>{invested.toFixed(2)}</strong>
                        </span>
                      </span>
                    </div>

                    {/* Selections comparing */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      {/* Your Pick */}
                      <div className="flex flex-col items-start bg-white-surface dark:bg-zinc-950 px-3 py-1.5 rounded-[8px] border border-border dark:border-zinc-800">
                        <span className="text-[9px] font-mono text-ash uppercase">
                          You
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            pick.selection === "YES"
                              ? "text-meadow-green"
                              : "text-ember-orange"
                          }`}
                        >
                          {pick.selection === "YES"
                            ? childOpt?.yesCondition || "YES"
                            : childOpt?.noCondition || "NO"}
                        </span>
                      </div>

                      {/* Opponent's Pick */}
                      <div className="flex flex-col items-start bg-white-surface dark:bg-zinc-950 px-3 py-1.5 rounded-[8px] border border-border dark:border-zinc-800 min-w-[100px]">
                        <span className="text-[9px] font-mono text-ash uppercase">
                          Opponent
                        </span>
                        {pvpStatus.status === "queued" ? (
                          <span className="text-xs font-semibold text-ash font-mono italic animate-pulse">
                            Waiting...
                          </span>
                        ) : (
                          <span
                            className={`text-xs font-bold ${
                              oppPick?.selection === "YES"
                                ? "text-meadow-green"
                                : "text-ember-orange"
                            }`}
                          >
                            {oppPick?.selection === "YES"
                              ? childOpt?.yesCondition || "YES"
                              : childOpt?.noCondition || "NO"}
                          </span>
                        )}
                      </div>

                      {/* Outcome Points */}
                      <div className="flex flex-col items-center justify-center shrink-0 min-w-[70px]">
                        <span className="text-[9px] font-mono text-stone-400 dark:text-zinc-500 uppercase">
                          Points
                        </span>
                        {pick.isCorrect === null ? (
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-stone-100 dark:bg-zinc-900 text-stone-500 border border-stone-200 dark:border-zinc-800 mt-0.5">
                            Pending
                          </span>
                        ) : pick.isCorrect === true ? (
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-meadow-green/10 text-meadow-green border border-meadow-green/20 mt-0.5">
                            +1 pt
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-ember-orange/10 text-ember-orange border border-ember-orange/20 mt-0.5">
                            0 pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Ticket Builder Form */}
      {(!hasActiveDuel || showBuilderOverride) && (
        <div className="verity-card p-5 flex flex-col gap-4">
          <div className="border-b border-border dark:border-zinc-800 pb-3">
            <h3 className="text-lg font-bold tracking-tight text-charcoal-primary dark:text-white flex items-center gap-2">
              Arena ticket builder
            </h3>
            <p className="text-xs text-ash mt-0.5">
              Submit selections to queue for head-to-head matchup.
            </p>
          </div>

          <div className="rounded-[10px] border border-indigo-500/15 bg-indigo-500/5 px-3 py-2.5 text-[11px] leading-relaxed text-ash">
            Each correct pick scores 1 point. Win: 100 Result XP, draw: 50,
            loss: 30. A perfect 7/7 adds 20 XP, and an active boost applies 1.2x
            to the total.
          </div>

          {pvpEvents.length === 0 && (
            <div className="p-8 text-center text-sm text-ash border border-dashed border-border dark:border-zinc-800 rounded-[12px] bg-parchment-card dark:bg-zinc-950/20">
              No active PvP events right now. Check back soon for new matchups!
            </div>
          )}

          {pvpEvents.length > 0 && selectedPvpEvent && (
            <div className="flex flex-col gap-4">
              {/* Event Selector Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ash">
                  Select Matchup Event
                </label>
                <select
                  value={selectedPvpEventId || ""}
                  onChange={(e) => setSelectedPvpEventId(e.target.value)}
                  className="w-full h-11 px-3 border border-border dark:border-zinc-800 bg-white-surface dark:bg-zinc-900 text-sm rounded-[10px] text-charcoal-primary dark:text-white outline-none cursor-pointer focus:border-indigo-500 transition-colors"
                >
                  {pvpEvents.map((evt: any) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.question}
                    </option>
                  ))}
                </select>
              </div>

              {/* 7 child questions inputs */}
              <div className="space-y-3">
                <span className="block text-xs font-mono font-bold uppercase tracking-wider text-ash">
                  Propositions (Predict exactly 7 options)
                </span>

                <div className="space-y-2.5">
                  {selectedPvpEvent.options.map((opt: any, idx: number) => (
                    <div
                      key={opt.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-parchment-card dark:bg-zinc-900/40 border border-border dark:border-zinc-800/80 hover:border-ash dark:hover:border-zinc-800 transition-all gap-3"
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium tracking-tight text-charcoal-primary dark:text-zinc-200">
                          {idx + 1}. {opt.optionName}
                        </span>
                        <span className="text-[10px] text-ash mt-1.5 font-mono flex items-center gap-1.5 flex-wrap">
                          <span>
                            Pool:{" "}
                            <strong className="text-charcoal-primary dark:text-white">
                              ${Number(opt.liquidity ?? 40).toLocaleString()}{" "}
                              USDC
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            {opt.yesCondition || "YES"}:{" "}
                            <strong className="text-meadow-green">
                              {opt.yesCondition || "YES"}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            {opt.noCondition || "NO"}:{" "}
                            <strong className="text-ember-orange">
                              {opt.noCondition || "NO"}
                            </strong>
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                        {/* YES / NO Selection Buttons */}
                        <div className="flex bg-white-surface dark:bg-zinc-900 border border-border dark:border-zinc-800/80 rounded-[8px] p-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setPvpSelections((prev) => ({
                                ...prev,
                                [opt.id]: "YES",
                              }))
                            }
                            className={`px-3 py-1.5 rounded-[6px] text-xs font-bold font-mono transition-all ${
                              pvpSelections[opt.id] === "YES"
                                ? "bg-meadow-green text-white shadow-subtle"
                                : "text-ash hover:text-charcoal-primary dark:hover:text-white"
                            }`}
                          >
                            {opt.yesCondition || "YES"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPvpSelections((prev) => ({
                                ...prev,
                                [opt.id]: "NO",
                              }))
                            }
                            className={`px-3 py-1.5 rounded-[6px] text-xs font-bold font-mono transition-all ${
                              pvpSelections[opt.id] === "NO"
                                ? "bg-ember-orange text-white shadow-subtle"
                                : "text-ash hover:text-charcoal-primary dark:hover:text-white"
                            }`}
                          >
                            {opt.noCondition || "NO"}
                          </button>
                        </div>

                        {/* Add Liquidity button */}
                        <button
                          type="button"
                          onClick={() => {
                            setLiquidityMarketId(opt.id)
                          }}
                          className="px-2.5 py-1.5 rounded-[8px] text-[10px] font-bold font-mono transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0"
                        >
                          + LP
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bet amount settings */}
              <div className="flex flex-col gap-3 bg-stone-100/50 dark:bg-zinc-900/30 p-4 rounded-xl border border-border/60 dark:border-zinc-800/40 mt-4 mb-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-mono font-bold text-ash uppercase block">
                      Bet Amount per selection
                    </span>
                    <span className="text-[10px] text-ash">
                      Each of the 7 bets will be purchased for this amount.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={betAmountPerSelection}
                      onChange={(e) =>
                        setBetAmountPerSelection(
                          Math.max(1, Number(e.target.value)),
                        )
                      }
                      className="w-20 h-9 px-2 border border-border dark:border-zinc-800 bg-white-surface dark:bg-zinc-900 text-xs font-bold font-mono rounded-md text-charcoal-primary dark:text-white outline-none focus:border-indigo-500 text-right"
                    />
                    <span className="text-xs font-mono font-bold text-charcoal-primary dark:text-zinc-400">
                      USDC
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-border/60 dark:border-zinc-800/60 pt-2.5 mt-1">
                  <span className="text-xs font-mono text-ash font-bold uppercase">
                    Total Ticket Cost (7 Selections)
                  </span>
                  <strong className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {betAmountPerSelection * 7} USDC
                  </strong>
                </div>
              </div>

              {/* XP boost indicator and submit button */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-t border-border dark:border-zinc-800 pt-4 mt-2">
                <div className="flex items-center gap-2">
                  <Zap
                    className={`h-4.5 w-4.5 ${
                      referralsData && referralsData.doubleBoostRemaining > 0
                        ? "text-indigo-500 animate-pulse"
                        : "text-ash"
                    }`}
                  />
                  <span className="text-xs font-mono text-ash">
                    ⚡ Boosts Remaining:{" "}
                    <strong className="text-charcoal-primary dark:text-white">
                      {referralsData?.doubleBoostRemaining ?? 0}
                    </strong>
                    {referralsData &&
                      referralsData.doubleBoostRemaining > 0 &&
                      " (Auto-active 1.2x XP)"}
                  </span>
                </div>

                <button
                  onClick={handleSubmitPvpTicket}
                  disabled={submitTicketMutation.isPending}
                  className="verity-pill px-6 h-11 bg-indigo-600 text-white hover:bg-indigo-500 font-bold uppercase tracking-wider text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitTicketMutation.isPending
                    ? "Queuing..."
                    : "Submit ticket & Queue"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pvp Child Market Add Liquidity Modal */}
      <PvpLiquidityModal
        liquidityMarketId={liquidityMarketId}
        setLiquidityMarketId={setLiquidityMarketId}
        optionForLP={optionForLP}
        selectedPvpEvent={selectedPvpEvent}
        refetchPvpStatus={refetchPvpStatus}
        profile={profile}
      />
    </div>
  )
}
