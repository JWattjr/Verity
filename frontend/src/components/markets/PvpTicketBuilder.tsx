"use client"

import { useMemo, useState } from "react"
import { ChevronRight, Receipt, X, Swords } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"
import ArenaCategory, { getCategoryMeta } from "./PvpArenaCategory"
import TeamBadge from "@/components/common/TeamBadge"

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
  pvpStatus?: any
  pvpSelections: Record<string, string>
  betAmountPerSelection?: number
  isSubmitting: boolean
  showTooltip?: boolean
  referralsData?: any
  parsedTeams: { teamA: string; teamB: string }
  groupedOptions: Record<string, any[]>
  onToggleSelection: (optId: string, selection: string) => void
  onSetBetAmount?: (amount: number) => void
  onSetShowTooltip?: (show: boolean) => void
  onSubmitTicket: (couponCode?: string) => void
  onProvideLiquidity?: (amounts: Record<string, number>) => Promise<void>
  onAddLiquidity?: (marketId: string) => void
}

export default function PvpTicketBuilder({
  selectedPvpEvent,
  pvpEvents,
  pvpSelections,
  isSubmitting,
  parsedTeams,
  groupedOptions,
  onToggleSelection,
  onSubmitTicket,
}: PvpTicketBuilderProps) {
  const selectionCount = Object.keys(pvpSelections).length
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)

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

  const renderTicketSlip = () => {
    return (
      <div className="flex flex-col gap-0 w-full h-full min-h-0 max-h-full">
        {/* Selection Summary */}
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0 pr-1 pb-4">
          {selectionCount === 0 && (
            <div className="text-center py-10 text-[#8e8a85] text-xs font-medium border border-dashed border-[#222226] p-6 flex flex-col items-center gap-2">
              <Swords className="h-5 w-5 text-[#8e8a85]/60 mb-1" />
              <p className="font-bold text-[#f4f1ea]">No picks selected yet</p>
              <p className="text-[11px] text-[#8e8a85] max-w-[220px]">
                Choose at least 3 propositions across different categories to build your duel card.
              </p>
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
                className="flex items-center justify-between gap-3 p-3 bg-[#141417] border border-[#222226]"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="text-xs shrink-0 text-[#ff3b30]">●</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[#f4f1ea] truncate">
                      {displaySelection}
                    </span>
                    <span className="text-[10px] font-mono text-[#8e8a85] truncate uppercase tracking-wider">
                      {opt?.optionGroup?.replace(/_/g, " ") || "Proposition"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleSelection(optId, selection)}
                  className="p-1 hover:bg-[#202024] text-[#8e8a85] hover:text-[#ff3b30] transition-colors shrink-0 cursor-pointer"
                  title="Remove pick"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>

        {/* Bottom Actions */}
        <div className="mt-4 pt-4 border-t border-[#222226] bg-[#101012] pb-2 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#8e8a85] uppercase tracking-wider font-mono text-[10px]">
              Duel Card
            </span>
            <span className="font-mono font-bold text-[#f4f1ea]">
              {selectionCount} of 3 minimum
            </span>
          </div>

          <button
            onClick={() => {
              setIsMobileDrawerOpen(false)
              onSubmitTicket()
            }}
            disabled={isSubmitting || selectionCount < 3}
            type="button"
            className="flex h-12 w-full items-center justify-center gap-2 bg-[#ff3b30] text-xs font-black uppercase tracking-wider text-black transition-all hover:bg-[#ff3b30]/90 cursor-pointer disabled:border-[#222226] disabled:bg-[#161619] disabled:text-[#8e8a85] disabled:cursor-not-allowed disabled:opacity-100"
          >
            {isSubmitting
              ? "Entering Queue..."
              : selectionCount < 3
                ? `Select ${3 - selectionCount} More ${3 - selectionCount === 1 ? "Category" : "Categories"}`
                : "Submit Picks"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex w-full flex-col gap-4 pb-12 lg:pb-24">
      {selectedPvpEvent && (
        <div className="border border-[#222226] bg-[#101012] text-[#f4f1ea]">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8e8a85]">
                <span className="h-2 w-2 bg-[#ff3b30]" />
                Arena card · open for picks
              </div>
              <span className="border border-[#ff3b30]/40 bg-[#ff3b30]/10 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#ff3b30]">
                Arena Duel
              </span>
            </div>

            <div className="flex items-center gap-3.5 text-[#f4f1ea]">
              <TeamBadge
                team={parsedTeams.teamA}
                className="h-9 w-9 sm:h-11 sm:w-11"
              />
              <h1 className="min-w-0 truncate font-heading text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl">
                {parsedTeams.teamA}
              </h1>
              <span className="shrink-0 font-mono text-[10px] font-bold uppercase text-[#8e8a85]">
                vs
              </span>
              <TeamBadge
                team={parsedTeams.teamB}
                className="h-9 w-9 sm:h-11 sm:w-11"
              />
              <h1 className="min-w-0 truncate font-heading text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl">
                {parsedTeams.teamB}
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-[#222226]">
            <MatchMeta label="Locks" value={formattedDate} />
            <MatchMeta
              label="Propositions"
              value={`${selectedPvpEvent?.options?.length || 9} available`}
            />
            <MatchMeta
              label="Card progress"
              value={`${selectionCount} / 3 minimum`}
              accent={selectionCount >= 3}
            />
          </div>

          <div className="h-1 bg-[#18181b]">
            <div
              className="h-full bg-[#ff3b30] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty state when no events */}
      {pvpEvents.length === 0 && (
        <div className="border border-[#222226] bg-[#101012] p-8 text-center text-sm text-[#8e8a85] font-medium">
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
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ff3b30]">
                    Step 1
                  </span>
                  <h2 className="mt-1 font-heading text-xl font-black uppercase text-[#f4f1ea]">
                    Make your calls
                  </h2>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#8e8a85]">
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
                />
              ))}
            </div>

            <aside className="sticky top-24 overflow-hidden border border-[#222226] bg-[#101012] p-4">
              <div className="mb-4 flex items-center justify-between border-b border-[#222226] pb-3">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#ff3b30]">
                    Step 2
                  </span>
                  <h3 className="mt-1 font-heading text-lg font-black uppercase text-[#f4f1ea]">
                    Your arena card
                  </h3>
                </div>
                <span className="flex h-7 min-w-7 items-center justify-center bg-[#161619] border border-[#222226] px-2 font-mono text-xs font-bold text-[#f4f1ea]">
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
                  className="flex h-[52px] w-full cursor-pointer items-center justify-between bg-[#ff3b30] px-5 font-black text-black shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-bold uppercase tracking-wider">
                      Review Card
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-black/20 px-2 py-0.5 text-xs font-bold text-black font-mono">
                      {selectionCount} picks
                    </span>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </button>
              </div>
            )}

            <Drawer
              open={isMobileDrawerOpen}
              onOpenChange={setIsMobileDrawerOpen}
            >
              <DrawerContent className="flex max-h-[92vh] flex-col border-t border-[#222226] bg-[#101012] text-[#f4f1ea] pb-4 outline-none">
                <DrawerHeader className="relative shrink-0 flex flex-row items-center justify-between border-b border-[#222226] pb-3 pt-2 mb-2 px-4 text-left">
                  <div>
                    <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#ff3b30]">
                      Review and enter
                    </span>
                    <DrawerTitle className="m-0 mt-1 font-heading text-xl font-black uppercase text-[#f4f1ea]">
                      Your arena card
                    </DrawerTitle>
                  </div>
                  <DrawerClose className="p-1.5 hover:bg-[#18181b] text-[#8e8a85] hover:text-[#f4f1ea] transition-colors shrink-0">
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
    <div className="min-w-0 border-r border-[#222226] px-3 py-3 last:border-r-0 sm:px-4">
      <span className="block text-[8px] font-bold uppercase tracking-[0.16em] text-[#8e8a85]">
        {label}
      </span>
      <span
        className={`mt-1 block truncate font-mono text-[9px] font-bold uppercase sm:text-[10px] ${
          accent ? "text-[#00ca48]" : "text-[#f4f1ea]"
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
}: {
  groupKey: string
  opts: any[]
  pvpSelections: Record<string, string>
  parsedTeams: { teamA: string; teamB: string }
  isSubmitting: boolean
  onToggleSelection: (optId: string, selection: string) => void
}) {
  const firstOpt = opts[0]
  const isMulti = firstOpt?.outcomeCount && firstOpt.outcomeCount > 2
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

  return (
    <ArenaCategory
      title={catMeta.title}
      subtitle={
        handicapLine ? `Over / Under ${handicapLine}` : catMeta.subtitle
      }
      icon={catMeta.icon}
      hasSelection={hasSelection}
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
      {firstOpt.outcomes.map((outcomeName: string) => {
        const isSelected = pvpSelections[firstOpt.id] === outcomeName
        const displayName = cleanOutcomeName(
          outcomeName,
          parsedTeams.teamA,
          parsedTeams.teamB,
        )

        const btnStyle = isSelected
          ? "bg-[#1e1212] border-[#ff3b30] text-[#f4f1ea] font-bold"
          : "bg-[#161619] border-[#222226] hover:border-[#333338] text-[#aaa6a1] hover:text-[#f4f1ea] font-medium"

        return (
          <button
            key={outcomeName}
            type="button"
            disabled={isSubmitting}
            onClick={() => onToggleSelection(firstOpt.id, outcomeName)}
            className={`relative flex items-center justify-center p-3.5 border cursor-pointer transition-all ${btnStyle} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="text-xs font-bold text-center leading-tight">
              {displayName}
            </span>

            {/* Red Indicator Badge */}
            {isSelected && (
              <div className="absolute top-1 right-1 bg-[#ff3b30] text-black h-3.5 w-3.5 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
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
  onToggleSelection,
}: {
  opt: any
  pvpSelections: Record<string, string>
  parsedTeams: { teamA: string; teamB: string }
  isSubmitting: boolean
  onToggleSelection: (optId: string, selection: string) => void
}) {
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

  const isYesSelected = pvpSelections[opt.id] === "YES"
  const isNoSelected = pvpSelections[opt.id] === "NO"

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onToggleSelection(opt.id, "YES")}
        disabled={isSubmitting}
        className={`relative flex items-center justify-center p-3.5 border cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          isYesSelected
            ? "bg-[#1e1212] border-[#ff3b30] text-[#f4f1ea] font-bold"
            : "bg-[#161619] border-[#222226] hover:border-[#333338] text-[#aaa6a1] hover:text-[#f4f1ea] font-medium"
        }`}
      >
        <span className="text-xs font-bold text-center leading-tight">{yesLabel}</span>

        {/* Red Indicator Badge */}
        {isYesSelected && (
          <div className="absolute top-1 right-1 bg-[#ff3b30] text-black h-3.5 w-3.5 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="square"
              strokeLinejoin="miter"
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
        className={`relative flex items-center justify-center p-3.5 border cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          isNoSelected
            ? "bg-[#1e1212] border-[#ff3b30] text-[#f4f1ea] font-bold"
            : "bg-[#161619] border-[#222226] hover:border-[#333338] text-[#aaa6a1] hover:text-[#f4f1ea] font-medium"
        }`}
      >
        <span className="text-xs font-bold text-center leading-tight">{noLabel}</span>

        {/* Red Indicator Badge */}
        {isNoSelected && (
          <div className="absolute top-1 right-1 bg-[#ff3b30] text-black h-3.5 w-3.5 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="square"
              strokeLinejoin="miter"
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
