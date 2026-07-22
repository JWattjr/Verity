"use client"

import { useMemo, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { apiRequest } from "@/store/apiClient"
import { toast } from "@/lib/toast"
import { HelpCircle, ChevronRight, Check, Receipt, X } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"
import { useUsdcBalance } from "@/hooks/useUsdcBalance"
import ArenaCategory, { getCategoryMeta } from "./PvpArenaCategory"
import { getCountryFlag } from "./PvpMatchupCarousel"
import { DraggableFAB } from "@/components/ui/draggable-fab"

export const cleanOutcomeName = (
  name: string,
  teamA: string,
  teamB: string,
) => {
  const lowerName = name.toLowerCase().trim()
  const lowerA = teamA.toLowerCase().trim()
  const lowerB = teamB.toLowerCase().trim()

  if (
    lowerName.includes("wins on penalties") ||
    lowerName.includes("wins shootout")
  ) {
    if (lowerName.includes(lowerA)) return teamA
    if (lowerName.includes(lowerB)) return teamB
  }

  if (lowerName === "no penalties" || lowerName.includes("no penalties")) {
    return "No Penalty"
  }

  if (
    lowerName === "both teams to score - yes" ||
    lowerName === "both teams to score-yes" ||
    lowerName === "btts - yes" ||
    lowerName === "btts-yes"
  ) {
    return "YES"
  }

  if (
    lowerName === "both teams to score - no" ||
    lowerName === "both teams to score-no" ||
    lowerName === "btts - no" ||
    lowerName === "btts-no"
  ) {
    return "NO"
  }

  if (
    lowerName === "match ends in a draw" ||
    lowerName === "match ends with equal corners" ||
    lowerName === "match ends with equal yellow cards" ||
    lowerName === "match ends with equal fouls" ||
    lowerName === "draw"
  ) {
    return "Draw"
  }

  if (lowerName === "no goal in the match" || lowerName === "no goal") {
    return "No Goal"
  }

  if (lowerName.includes("has more corners")) {
    if (lowerName.includes(lowerA)) return teamA
    if (lowerName.includes(lowerB)) return teamB
  }
  if (lowerName.includes("has more yellow cards")) {
    if (lowerName.includes(lowerA)) return teamA
    if (lowerName.includes(lowerB)) return teamB
  }
  if (lowerName.includes("commits more fouls")) {
    if (lowerName.includes(lowerA)) return teamA
    if (lowerName.includes(lowerB)) return teamB
  }

  // Totals: extract line
  const overMatch = name.match(/over\s+(\d+(?:\.\d+)?)/i)
  if (overMatch) {
    return `Over ${overMatch[1]}`
  }

  const underMatch = name.match(/under\s+(\d+(?:\.\d+)?)/i)
  if (underMatch) {
    return `Under ${underMatch[1]}`
  }

  const cleaned = name
    .replace(/\s+wins\s+the\s+match/i, "")
    .replace(/\s+wins/i, "")
    .replace(/\s+scores\s+first\s+goal/i, "")
    .replace(/\s+scores\s+first/i, "")
    .replace(/\s+leads\s+at\s+halftime/i, "")
    .replace(/\s+keeps\s+a\s+clean\s+sheet/i, "")
    .replace(/\s+commits\s+more\s+fouls/i, "")
    .trim()

  return cleaned
}

interface PvpTicketBuilderProps {
  selectedPvpEvent: any
  pvpEvents: any[]
  pvpStatus: any
  pvpSelections: Record<string, string>
  betAmountPerSelection: number
  isSubmitting: boolean
  showTooltip: boolean
  referralsData: any
  parsedTeams: { teamA: string; teamB: string }
  groupedOptions: Record<string, any[]>
  onToggleSelection: (optId: string, selection: string) => void
  onSetBetAmount: (amount: number) => void
  onSetShowTooltip: (show: boolean) => void
  onSubmitTicket: (couponCode?: string) => void
  onProvideLiquidity: (amounts: Record<string, number>) => Promise<void>
  onAddLiquidity: (marketId: string) => void
}

export default function PvpTicketBuilder({
  selectedPvpEvent,
  pvpEvents,
  pvpStatus,
  pvpSelections,
  betAmountPerSelection,
  isSubmitting,
  showTooltip,
  referralsData,
  parsedTeams,
  groupedOptions,
  onToggleSelection,
  onSetBetAmount,
  onSetShowTooltip,
  onSubmitTicket,
  onProvideLiquidity,
  onAddLiquidity,
}: PvpTicketBuilderProps) {
  const selectionCount = Object.keys(pvpSelections).length
  const { rawBalance, formattedBalance } = useUsdcBalance()

  const activeBoostsList = referralsData?.activeBoosts || []
  const downtimeBoostRemaining = activeBoostsList
    .filter((b: any) => b.source === "downtime")
    .reduce((sum: number, b: any) => sum + (b.matchesRemaining || 0), 0)
  const missionBoostRemaining = activeBoostsList
    .filter((b: any) => b.source === "mission")
    .reduce((sum: number, b: any) => sum + (b.matchesRemaining || 0), 0)
  const doubleBoostRemaining = activeBoostsList
    .filter((b: any) => b.source === "referral")
    .reduce((sum: number, b: any) => sum + (b.matchesRemaining || 0), 0)

  // Coupon state
  const [couponCode, setCouponCode] = useState("")
  const [couponMultiplier, setCouponMultiplier] = useState<number | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"single" | "liquidity">("single")
  const [liquidityAmounts, setLiquidityAmounts] = useState<
    Record<string, string>
  >({})
  const [liquidityPerSelection, setLiquidityPerSelection] = useState<number>(0)

  useEffect(() => {
    if (liquidityPerSelection > 0) {
      setLiquidityAmounts((prev) => {
        const next = { ...prev }
        let changed = false
        Object.keys(pvpSelections).forEach((optId) => {
          if (!next[optId]) {
            next[optId] = liquidityPerSelection.toString()
            changed = true
          }
        })
        return changed ? next : prev
      })
    }
  }, [pvpSelections, liquidityPerSelection])

  useEffect(() => {
    const code = couponCode.trim()
    if (!code) {
      setCouponMultiplier(null)
      setCouponError(null)
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<{ success: boolean; multiplier: number }>(
          `/coupons/validate/${code}`,
        )
        setCouponMultiplier(res.multiplier)
        setCouponError(null)
      } catch (err: any) {
        setCouponMultiplier(null)
        setCouponError(err.message || "Invalid coupon")
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [couponCode])

  const totalVolume = useMemo(() => {
    if (!selectedPvpEvent?.options) return 0
    return selectedPvpEvent.options.reduce(
      (sum: number, opt: any) => sum + Number(opt.liquidity ?? 0),
      0,
    )
  }, [selectedPvpEvent])

  const formattedDate = useMemo(() => {
    const timeStr = selectedPvpEvent?.lockTime || selectedPvpEvent?.deadline
    if (!timeStr) return ""
    const date = new Date(timeStr)
    const month = date.toLocaleDateString(undefined, {
      month: "short",
    })
    const day = date.toLocaleDateString(undefined, {
      day: "numeric",
    })
    const time = date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    return `${month} ${day}, ${time}`
  }, [selectedPvpEvent])

  const progressPercent = Math.min((selectionCount / 3) * 100, 100)

  const handleLiquidityAmountChange = (optId: string, value: string) => {
    setLiquidityAmounts((prev) => ({
      ...prev,
      [optId]: value,
    }))
  }

  const handleProvideLiquiditySubmit = async () => {
    let totalLiquidity = 0
    const validAmounts: Record<string, number> = {}
    for (const [optId, amtStr] of Object.entries(liquidityAmounts)) {
      const amt = parseFloat(amtStr)
      if (!isNaN(amt) && amt > 0) {
        validAmounts[optId] = amt
        totalLiquidity += amt
      }
    }

    const rawTotalLiquidity = BigInt(Math.round(totalLiquidity * 1e6))

    setIsMobileDrawerOpen(false)

    if (rawTotalLiquidity > (rawBalance || BigInt(0))) {
      toast.error(
        `Insufficient USDC balance. You need at least ${totalLiquidity} USDC to submit this ticket, but your balance is ${(Number(rawBalance || 0) / 1e6).toFixed(2)} USDC.`,
      )
      return
    }
    try {
      await onProvideLiquidity(validAmounts)
      setLiquidityAmounts({})
    } catch (error) {
      // Allow user to manually re-open with their inputs intact on failure
    }
  }

  const renderTicketSlip = () => {
    const totalLiquidity = Object.values(liquidityAmounts).reduce(
      (sum, amtStr) => {
        const amt = parseFloat(amtStr)
        return sum + (isNaN(amt) ? 0 : amt)
      },
      0,
    )

    return (
      <div className="flex flex-col gap-0 w-full h-full min-h-0 max-h-full">
        {/* Custom Tabs */}
        <div className="flex items-center w-full p-1 mb-4 rounded-lg bg-[#111113] border border-[#202023] shrink-0">
          <button
            onClick={() => setActiveTab("single")}
            className={`flex-1 py-1.5 text-xs font-bold font-mono tracking-wider rounded-md transition-colors ${
              activeTab === "single"
                ? "bg-[#1a1a1d] text-white shadow-sm"
                : "text-ash hover:text-zinc-300 hover:bg-[#1a1a1d]/50"
            }`}
          >
            Review Picks
          </button>
          <button
            onClick={() => setActiveTab("liquidity")}
            className={`flex-1 py-1.5 text-xs font-bold font-mono tracking-wider rounded-md transition-colors ${
              activeTab === "liquidity"
                ? "bg-[#1a1a1d] text-white shadow-sm"
                : "text-ash hover:text-zinc-300 hover:bg-[#1a1a1d]/50"
            }`}
          >
            Fund Markets
          </button>
        </div>

        {/* Selection Summary */}
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0 pr-1 pb-4">
          {selectionCount === 0 && (
            <div className="text-center py-6 text-ash text-xs font-medium">
              No picks selected yet.
            </div>
          )}
          {Object.entries(pvpSelections).map(([optId, selection]) => {
            const opt = selectedPvpEvent?.options?.find(
              (o: any) => o.id === optId,
            )
            const isMultiOpt = opt?.outcomeCount && opt.outcomeCount > 2
            let displaySelection = isMultiOpt
              ? cleanOutcomeName(
                  selection,
                  parsedTeams.teamA,
                  parsedTeams.teamB,
                )
              : selection === "YES"
                ? cleanOutcomeName(
                    opt?.yesCondition || "Yes",
                    parsedTeams.teamA,
                    parsedTeams.teamB,
                  )
                : cleanOutcomeName(
                    opt?.noCondition || "No",
                    parsedTeams.teamA,
                    parsedTeams.teamB,
                  )
            if (
              opt &&
              (opt.optionGroup === "red_card" ||
                opt.optionGroup === "red_cards")
            ) {
              displaySelection =
                selection === "YES" ? "Red card shown" : "No red card"
            }

            return (
              <div
                key={optId}
                className="flex flex-col gap-2 p-3 bg-[#111113] rounded-xl border border-[#202023]"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => onToggleSelection(optId, selection)}
                    className="p-1 hover:bg-stone-200 dark:hover:bg-zinc-800 rounded text-ash hover:text-red-500 transition-colors mt-0.5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-1.5 text-sm font-bold text-charcoal-primary dark:text-white truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0">⚽</span>
                          <span className="truncate">{displaySelection}</span>
                        </div>
                        <div className="text-xs text-ash truncate">
                          {selectedPvpEvent?.question}
                        </div>
                        <div className="text-[10px] font-mono text-ash/70 uppercase tracking-wider">
                          {opt?.optionGroup?.replace(/_/g, " ") || "Option"}
                        </div>
                      </div>
                      <div className="">
                        {/* Odds representation */}
                        <div className="text-sm text-right font-mono font-bold text-ash/80">
                          {opt?.poolA && opt?.poolB
                            ? (
                                (opt.poolA + opt.poolB) /
                                (selection === "YES" ? opt.poolA : opt.poolB)
                              ).toFixed(2)
                            : "2.00"}
                        </div>

                        {activeTab === "liquidity" && (
                          <div className="mt-2 pt-2 flex justify-end">
                            <div className="flex items-center gap-2 w-32">
                              <Input
                                type="number"
                                min="1"
                                placeholder="USDC"
                                value={liquidityAmounts[optId] || ""}
                                onChange={(e) =>
                                  handleLiquidityAmountChange(
                                    optId,
                                    e.target.value,
                                  )
                                }
                                className="h-8 text-xs font-mono bg-[#111113] border-[#202023] text-right"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom Actions */}
        <div className="mt-4 pt-4 border-t border-stone-200 dark:border-zinc-800 bg-warm-canvas pb-2 shrink-0">
          {activeTab === "single" ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ash uppercase">
                  USDC per pick
                </span>
                <div className="flex items-center gap-2 w-32">
                  <span className="text-xs font-bold text-ash">USDC</span>
                  <Input
                    type="number"
                    min="1"
                    value={
                      betAmountPerSelection === 0 ? "" : betAmountPerSelection
                    }
                    disabled={isSubmitting}
                    onChange={(e) => {
                      const val = e.target.value
                      onSetBetAmount(val === "" ? 0 : Number(val))
                    }}
                    className="h-9 text-xs font-bold font-mono bg-[#111113] border-[#202023] text-right"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-charcoal-primary dark:text-white">
                  Total
                </span>
                <span className="text-sm font-bold font-mono text-charcoal-primary dark:text-white">
                  {betAmountPerSelection * selectionCount} USDC
                </span>
              </div>

              {/* Coupon input hidden to match cleaner UI, or could be placed under an advanced toggle */}

              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false)
                  onSubmitTicket()
                }}
                disabled={isSubmitting || selectionCount < 3}
                className="flex h-12 w-full items-center justify-center gap-2 border border-accent bg-accent text-sm font-bold uppercase tracking-wider text-black shadow-md transition-colors hover:bg-accent/90 disabled:border-[#202023] disabled:bg-[#161618] disabled:text-[#6f6b67] disabled:opacity-100"
              >
                {isSubmitting
                  ? "Submitting..."
                  : selectionCount < 3
                    ? `Select ${3 - selectionCount} More Categories`
                    : "Submit Picks"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ash uppercase">
                  Liquidity per market
                </span>
                <div className="flex items-center gap-2 w-32">
                  <span className="text-xs font-bold text-ash">USDC</span>
                  <Input
                    type="number"
                    min="1"
                    value={
                      liquidityPerSelection === 0 ? "" : liquidityPerSelection
                    }
                    disabled={isSubmitting}
                    onChange={(e) => {
                      const val = e.target.value
                      const num = parseFloat(val)
                      setLiquidityPerSelection(isNaN(num) ? 0 : num)

                      const newAmounts = { ...liquidityAmounts }
                      Object.keys(pvpSelections).forEach((optId) => {
                        newAmounts[optId] = val
                      })
                      setLiquidityAmounts(newAmounts)
                    }}
                    className="h-9 text-xs font-bold font-mono bg-[#111113] border-[#202023] text-right"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-charcoal-primary dark:text-white">
                  Total Liquidity
                </span>
                <span className="text-sm font-bold font-mono text-charcoal-primary dark:text-white">
                  {totalLiquidity} USDC
                </span>
              </div>
              <button
                onClick={handleProvideLiquiditySubmit}
                disabled={isSubmitting || totalLiquidity <= 0}
                className="flex h-12 w-full items-center justify-center gap-2 border border-accent bg-accent text-sm font-bold uppercase tracking-wider text-black shadow-md transition-colors hover:bg-accent/90 disabled:border-[#202023] disabled:bg-[#161618] disabled:text-[#6f6b67] disabled:opacity-100"
              >
                {isSubmitting ? "Providing Liquidity..." : "Provide Liquidity"}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex w-full flex-col gap-4 pb-12 lg:pb-24">
      {selectedPvpEvent && (
        <div className="overflow-hidden border border-[#292929] bg-[#0a0a0a] text-white">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-ash">
                <span className="h-2 w-2 bg-brand-accent" />
                Arena card · open for picks
              </div>
              <span className="border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                USDC backed
              </span>
            </div>

            <div className="flex items-center gap-3 text-white">
              <span className="select-none text-3xl sm:text-4xl">
                {getCountryFlag(parsedTeams.teamA)}
              </span>
              <h1 className="min-w-0 truncate font-heading text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl">
                {parsedTeams.teamA}
              </h1>
              <span className="shrink-0 font-mono text-[10px] font-bold uppercase text-ash">
                vs
              </span>
              <span className="select-none text-3xl sm:text-4xl">
                {getCountryFlag(parsedTeams.teamB)}
              </span>
              <h1 className="min-w-0 truncate font-heading text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl">
                {parsedTeams.teamB}
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-[#292929]">
            <MatchMeta label="Locks" value={formattedDate} />
            <MatchMeta
              label="Market volume"
              value={`$${totalVolume.toLocaleString()}`}
            />
            <MatchMeta
              label="Card progress"
              value={`${selectionCount} / 3 minimum`}
              accent={selectionCount >= 3}
            />
          </div>

          <div className="h-1 bg-[#1d1d1d]">
            <div
              className="h-full bg-brand-accent transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty state when no events */}
      {pvpEvents.length === 0 && (
        <div className="verity-card p-8 text-center text-sm text-ash font-medium">
          No active PvP Matchups available at this time.
        </div>
      )}

      {/* Category cards & form */}
      {pvpEvents.length > 0 && selectedPvpEvent && (
        <div className="flex flex-col gap-4">
          <div
            className="hidden items-start gap-4 sm:grid"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            }}
          >
            <div className="space-y-3">
              <div className="flex items-end justify-between px-1 pb-1">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-accent">
                    Step 1
                  </span>
                  <h2 className="mt-1 font-heading text-xl font-black uppercase text-charcoal-primary dark:text-white">
                    Make your calls
                  </h2>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-ash">
                  Pick across 3+ categories
                </span>
              </div>

              {Object.entries(groupedOptions).map(([groupKey, opts]) => (
                <CategoryCard
                  key={groupKey}
                  groupKey={groupKey}
                  opts={opts}
                  pvpSelections={pvpSelections}
                  parsedTeams={parsedTeams}
                  isSubmitting={isSubmitting}
                  onToggleSelection={onToggleSelection}
                  onAddLiquidity={() => onAddLiquidity(opts[0].id)}
                />
              ))}
            </div>

            <aside className="sticky top-24 overflow-hidden border border-[#202023] bg-[#0a0a0a] p-4 shadow-subtle">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3 dark:border-zinc-800">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-brand-accent">
                    Step 2
                  </span>
                  <h3 className="mt-1 font-heading text-lg font-black uppercase text-charcoal-primary dark:text-white">
                    Your arena card
                  </h3>
                </div>
                <span className="flex h-8 min-w-8 items-center justify-center bg-brand-primary px-2 font-mono text-xs font-bold text-white dark:bg-white dark:text-zinc-950">
                  {selectionCount}
                </span>
              </div>
              {renderTicketSlip()}
            </aside>
          </div>

          {/* Mobile Layout */}
          <div className="sm:hidden">
            {/* Category Cards */}
            <div className="space-y-3 mt-2">
              {Object.entries(groupedOptions).map(([groupKey, opts]) => (
                <CategoryCard
                  key={groupKey}
                  groupKey={groupKey}
                  opts={opts}
                  pvpSelections={pvpSelections}
                  parsedTeams={parsedTeams}
                  isSubmitting={isSubmitting}
                  onToggleSelection={onToggleSelection}
                  onAddLiquidity={() => onAddLiquidity(opts[0].id)}
                />
              ))}
            </div>

            {/* Bottom floating Continue button (Mobile) */}
            {selectionCount > 0 && (
              <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+88px)] left-4 right-4 z-50">
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(true)}
                  disabled={isSubmitting}
                  className="group flex h-[54px] w-full cursor-pointer items-center justify-between bg-brand-accent px-5 font-extrabold text-white shadow-xl transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-bold uppercase tracking-wider">
                      Continue
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white">
                      {selectionCount} picks
                    </span>
                    <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              </div>
            )}

            <Drawer
              open={isMobileDrawerOpen}
              onOpenChange={setIsMobileDrawerOpen}
            >
              <DrawerContent className="flex max-h-[92vh] flex-col rounded-t-2xl border-t-2 border-brand-accent bg-warm-canvas pb-4 outline-none">
                <DrawerHeader className="relative shrink-0 flex flex-row items-center justify-between border-b border-stone-surface pb-3 pt-2 mb-2 px-4 text-left">
                  <div>
                    <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-brand-accent">
                      Review and enter
                    </span>
                    <DrawerTitle className="m-0 mt-1 font-heading text-xl font-black uppercase text-charcoal-primary">
                      Your arena card
                    </DrawerTitle>
                  </div>
                  <DrawerClose className="rounded-full p-1.5 hover:bg-stone-surface text-ash hover:text-charcoal-primary transition-colors shrink-0">
                    <X className="h-4.5 w-4.5" />
                  </DrawerClose>
                </DrawerHeader>
                <div className="px-5 flex flex-col min-h-0 flex-1 pb-24 overflow-hidden">
                  {renderTicketSlip()}
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      )}
    </div>
  )
}

function MatchMeta({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="min-w-0 border-r border-[#292929] px-3 py-3 last:border-r-0 sm:px-4">
      <span className="block text-[8px] font-bold uppercase tracking-[0.16em] text-ash">
        {label}
      </span>
      <span
        className={`mt-1 block truncate font-mono text-[9px] font-bold uppercase sm:text-[10px] ${
          accent ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-200"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

/* ──────────────────────────────────────────────
   CategoryCard — renders a single option group
   ────────────────────────────────────────────── */
function CategoryCard({
  groupKey,
  opts,
  pvpSelections,
  parsedTeams,
  isSubmitting,
  onToggleSelection,
  onAddLiquidity,
}: {
  groupKey: string
  opts: any[]
  pvpSelections: Record<string, string>
  parsedTeams: { teamA: string; teamB: string }
  isSubmitting: boolean
  onToggleSelection: (optId: string, selection: string) => void
  onAddLiquidity: () => void
}) {
  const firstOpt = opts[0]
  const isMulti = firstOpt?.outcomeCount && firstOpt.outcomeCount > 2
  const groupVolume = opts.reduce(
    (s: number, o: any) => s + Number(o.liquidity ?? 0),
    0,
  )
  const catMeta = getCategoryMeta(groupKey)

  // Extract handicap line from outcomes if O/U
  let handicapLine: string | null = null
  if (!isMulti && opts.length === 1) {
    const yc = firstOpt.yesCondition || ""
    const numMatch = yc.match(/(\d+(?:\.\d+)?)/)
    if (numMatch) handicapLine = numMatch[1]
  }

  // Check if any option in this group has a selection
  const hasSelection = opts.some((o: any) => pvpSelections[o.id])

  // Determine highlight color
  let selectedOptionColor: string | null = null
  if (hasSelection) {
    if (isMulti) {
      const selection = pvpSelections[firstOpt.id]
      if (selection) {
        const isDrawOption =
          selection.toLowerCase().includes("draw") ||
          selection.toLowerCase().includes("no goal") ||
          selection.toLowerCase().includes("equal")
        const isMatchWinner =
          groupKey === "match_winner" || groupKey === "major"
        selectedOptionColor =
          isDrawOption && !isMatchWinner ? "amber" : "emerald"
      }
    } else {
      selectedOptionColor = "emerald"
    }
  }

  return (
    <ArenaCategory
      title={catMeta.title}
      subtitle={
        handicapLine ? `Over / Under ${handicapLine}` : catMeta.subtitle
      }
      icon={catMeta.icon}
      accentColor={selectedOptionColor || catMeta.accent}
      volume={groupVolume}
      hasSelection={hasSelection}
      onAddLiquidity={onAddLiquidity}
    >
      {isMulti ? (
        <MultiWayOutcomes
          firstOpt={firstOpt}
          pvpSelections={pvpSelections}
          parsedTeams={parsedTeams}
          isSubmitting={isSubmitting}
          onToggleSelection={onToggleSelection}
        />
      ) : (
        <BinaryOutcomes
          opt={firstOpt}
          pvpSelections={pvpSelections}
          parsedTeams={parsedTeams}
          isSubmitting={isSubmitting}
          catMeta={catMeta}
          onToggleSelection={onToggleSelection}
        />
      )}
    </ArenaCategory>
  )
}

/* ──────────────────────────────────────────────
   MultiWayOutcomes — 3+ way market buttons
   ────────────────────────────────────────────── */
function MultiWayOutcomes({
  firstOpt,
  pvpSelections,
  parsedTeams,
  isSubmitting,
  onToggleSelection,
}: {
  firstOpt: any
  pvpSelections: Record<string, string>
  parsedTeams: { teamA: string; teamB: string }
  isSubmitting: boolean
  onToggleSelection: (optId: string, selection: string) => void
}) {
  return (
    <div
      className={`grid gap-2 ${firstOpt.outcomeCount === 3 ? "grid-cols-3" : firstOpt.outcomeCount === 2 ? "grid-cols-2" : "grid-cols-3"}`}
    >
      {firstOpt.outcomes.map((outcomeName: string, idx: number) => {
        const price = firstOpt.outcomePrices?.[idx] ?? 1 / firstOpt.outcomeCount
        const priceCents = (price * 100).toFixed(1)
        const isSelected = pvpSelections[firstOpt.id] === outcomeName
        const displayName = cleanOutcomeName(
          outcomeName,
          parsedTeams.teamA,
          parsedTeams.teamB,
        )

        const isDrawOption =
          displayName.toLowerCase().includes("draw") ||
          displayName.toLowerCase().includes("no goal") ||
          displayName.toLowerCase().includes("equal")
        const btnColor = isSelected
          ? "bg-[#2a0a0a] border border-[#7f1d1d] text-white font-bold shadow-md relative"
          : "bg-[#161618] border border-[#202023] hover:bg-[#202023] text-[#aaa6a1] hover:text-[#f4f1ea] font-medium"

        return (
          <button
            key={outcomeName}
            type="button"
            disabled={isSubmitting}
            onClick={() => onToggleSelection(firstOpt.id, outcomeName)}
            className={`flex flex-col items-center justify-center gap-1 p-3.5 rounded-xl cursor-pointer transition-all ${btnColor} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="text-xs font-bold text-center leading-tight">
              {displayName}
            </span>
            <span
              className={`text-[9px] font-mono mt-1 opacity-70 ${isSelected ? "text-red-300" : "text-ash"}`}
            >
              {priceCents}¢
            </span>

            {/* Red Check Circle Badge */}
            {isSelected && (
              <div className="absolute -top-1 -right-1 bg-[#FF3E00] text-white h-4.5 w-4.5 rounded-full flex items-center justify-center shadow-md ring-2 ring-[#2a0a0a]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-2 w-2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ──────────────────────────────────────────────
   BinaryOutcomes — Over/Under market buttons
   ────────────────────────────────────────────── */
function BinaryOutcomes({
  opt,
  pvpSelections,
  parsedTeams,
  isSubmitting,
  catMeta,
  onToggleSelection,
}: {
  opt: any
  pvpSelections: Record<string, string>
  parsedTeams: { teamA: string; teamB: string }
  isSubmitting: boolean
  catMeta: { selectedBg: string; ring: string; unselectedBg: string }
  onToggleSelection: (optId: string, selection: string) => void
}) {
  // Compute probabilities in the component body — not in JSX
  const yesPool = Number(opt.usdcYesAmount ?? 0)
  const noPool = Number(opt.usdcNoAmount ?? 0)
  const totalPool = yesPool + noPool
  const yesProb = totalPool > 0 ? (yesPool / totalPool) * 100 : 50
  const noProb = 100 - yesProb

  let yesLabel = cleanOutcomeName(
    opt.yesCondition || "Yes",
    parsedTeams.teamA,
    parsedTeams.teamB,
  )
  let noLabel = cleanOutcomeName(
    opt.noCondition || "No",
    parsedTeams.teamA,
    parsedTeams.teamB,
  )

  if (opt.optionGroup === "red_card" || opt.optionGroup === "red_cards") {
    yesLabel = "Red card shown"
    noLabel = "No red card"
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onToggleSelection(opt.id, "YES")}
        disabled={isSubmitting}
        className={`flex flex-col items-center justify-center gap-1 p-3.5 rounded-xl cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed relative border ${
          pvpSelections[opt.id] === "YES"
            ? "bg-[#2a0a0a] border-[#7f1d1d] text-white font-bold shadow-md"
            : "bg-[#161618] border-[#202023] hover:bg-[#202023] text-[#aaa6a1] hover:text-[#f4f1ea] font-medium"
        }`}
      >
        <span className="text-xs font-bold">{yesLabel}</span>
        <span
          className={`text-[9px] font-mono mt-1 opacity-70 ${pvpSelections[opt.id] === "YES" ? "text-red-300" : "text-ash"}`}
        >
          {yesProb.toFixed(1)}¢
        </span>

        {/* Red Check Circle Badge */}
        {pvpSelections[opt.id] === "YES" && (
          <div className="absolute -top-1 -right-1 bg-[#FF3E00] text-white h-4.5 w-4.5 rounded-full flex items-center justify-center shadow-md ring-2 ring-[#2a0a0a]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-2 w-2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </button>
      <button
        type="button"
        onClick={() => onToggleSelection(opt.id, "NO")}
        disabled={isSubmitting}
        className={`flex flex-col items-center justify-center gap-1 p-3.5 rounded-xl cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed relative border ${
          pvpSelections[opt.id] === "NO"
            ? "bg-[#2a0a0a] border-[#7f1d1d] text-white font-bold shadow-md"
            : "bg-[#161618] border-[#202023] hover:bg-[#202023] text-[#aaa6a1] hover:text-[#f4f1ea] font-medium"
        }`}
      >
        <span className="text-xs font-bold">{noLabel}</span>
        <span
          className={`text-[9px] font-mono mt-1 opacity-70 ${pvpSelections[opt.id] === "NO" ? "text-red-300" : "text-ash"}`}
        >
          {noProb.toFixed(1)}¢
        </span>

        {/* Red Check Circle Badge */}
        {pvpSelections[opt.id] === "NO" && (
          <div className="absolute -top-1 -right-1 bg-[#FF3E00] text-white h-4.5 w-4.5 rounded-full flex items-center justify-center shadow-md ring-2 ring-[#2a0a0a]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-2 w-2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </button>
    </div>
  )
}
