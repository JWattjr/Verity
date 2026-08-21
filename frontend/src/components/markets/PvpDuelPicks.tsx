import { cleanOutcomeName } from "./PvpTicketBuilder"

interface PvpDuelPicksProps {
  pvpStatus: DuelStatusData
  onAddLiquidity?: (marketId: string) => void
}

interface DuelOption {
  id: string
  optionGroup?: string | null
  optionName?: string | null
  yesCondition?: string | null
  noCondition?: string | null
  status?: string | null
  resolvedOutcome?: string | null
}

interface DuelPick {
  marketId: string
  selection: string | null
  optionName?: string | null
  investedUsdc?: number | null
  status?: string | null
  resolvedOutcome?: string | null
  arenaCorrect?: boolean | null
  isCorrect?: boolean | null
}

interface DuelStatusData {
  status?: string | null
  event?: {
    question?: string | null
    options?: DuelOption[] | null
  } | null
  ticket?: { picks?: DuelPick[] | null } | null
  opponent?: { picks?: DuelPick[] | null } | null
}

export default function PvpDuelPicks({
  pvpStatus,
}: PvpDuelPicksProps) {
  const userPicks = pvpStatus.ticket?.picks || []
  const oppPicks = pvpStatus.opponent?.picks || []

  const allMarketIds = Array.from(
    new Set([
      ...userPicks.map((pick) => pick.marketId),
      ...oppPicks.map((pick) => pick.marketId),
    ]),
  ).filter(Boolean)

  const question = pvpStatus.event?.question || ""
  const parsedTeams = (() => {
    if (!question) return { teamA: "Team A", teamB: "Team B" }
    const vsMatch = question.match(/(.+?)\s+vs\.?\s+(.+)/i)
    if (vsMatch) return { teamA: vsMatch[1].trim(), teamB: vsMatch[2].trim() }
    const dashMatch = question.match(/(.+?)\s+-\s+(.+)/)
    if (dashMatch)
      return { teamA: dashMatch[1].trim(), teamB: dashMatch[2].trim() }
    return { teamA: "Team A", teamB: "Team B" }
  })()

  const formatPickSelection = (selection: string | null, opt?: DuelOption) => {
    if (!selection) return ""
    const group = opt?.optionGroup || ""
    if (group === "red_card" || group === "red_cards") {
      if (selection === "YES") return "Red card shown"
      if (selection === "NO") return "No red card"
    }
    const rawVal =
      selection === "YES"
        ? opt?.yesCondition || "YES"
        : selection === "NO"
          ? opt?.noCondition || "NO"
          : selection

    return cleanOutcomeName(rawVal, parsedTeams.teamA, parsedTeams.teamB)
  }

  return (
    <section className="border border-[#222226] bg-[#101012] text-[#f4f1ea]">
      <div className="flex min-h-12 items-center justify-between border-b border-[#222226] px-4">
        <div>
          <h3 className="font-heading text-lg font-black uppercase tracking-tight text-[#f4f1ea]">
            Card breakdown
          </h3>
          <p className="font-mono text-[8px] font-semibold uppercase tracking-wider text-[#8e8a85]">
            Your picks · Rival picks · Official outcomes
          </p>
        </div>
        <span className="bg-[#161619] border border-[#222226] px-3 py-1.5 font-mono text-[8px] font-bold uppercase tracking-wider text-[#aaa6a1]">
          Head to head
        </span>
      </div>

      {/* Per-pick rows */}
      <div className="grid grid-cols-1 border-l border-t border-[#222226] xl:grid-cols-2">
        {allMarketIds.map((marketId) => {
          const pick = userPicks.find((item) => item.marketId === marketId)
          const childOpt = pvpStatus.event?.options?.find(
            (option) => option.id === marketId,
          )
          const oppPick = oppPicks.find((item) => item.marketId === marketId)

          const isResolved =
            childOpt?.status === "resolved" ||
            (childOpt?.resolvedOutcome !== null &&
              childOpt?.resolvedOutcome !== undefined) ||
            pick?.status === "resolved" ||
            (pick?.resolvedOutcome !== null &&
              pick?.resolvedOutcome !== undefined) ||
            oppPick?.status === "resolved" ||
            (oppPick?.resolvedOutcome !== null &&
              oppPick?.resolvedOutcome !== undefined)

          const resolvedOutcome =
            childOpt?.resolvedOutcome ||
            pick?.resolvedOutcome ||
            oppPick?.resolvedOutcome ||
            null

          return (
            <div
              key={marketId}
              className="flex flex-col gap-3 border-b border-r border-[#222226] bg-[#101012] p-4 transition-colors hover:bg-[#141417]"
            >
              {/* Top row: Title */}
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold tracking-tight text-[#f4f1ea] uppercase truncate">
                  {(
                    childOpt?.optionName ||
                    pick?.optionName ||
                    oppPick?.optionName ||
                    "Pick"
                  ).toUpperCase()}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#8e8a85]">
                  {childOpt?.optionGroup?.replace(/_/g, " ") || "Proposition"}
                </span>
              </div>

              {/* Bottom row: Selections */}
              <div className="grid grid-cols-2 md:flex md:items-stretch gap-2">
                {/* Your Pick */}
                <div className="flex min-w-0 flex-1 flex-col items-start border border-[#222226] bg-[#161619] px-3 py-2 text-[#f4f1ea]">
                  <span className="font-mono text-[8px] uppercase tracking-wider text-[#8e8a85]">
                    You
                  </span>
                  <span className="max-w-full truncate text-xs font-bold mt-0.5">
                    {pick
                      ? formatPickSelection(pick.selection, childOpt) || "—"
                      : "—"}
                  </span>
                </div>

                {/* Opponent's Pick */}
                <div className="flex min-w-0 flex-1 flex-col items-start border border-[#222226] bg-[#161619] px-3 py-2 text-[#f4f1ea]">
                  <span className="font-mono text-[8px] uppercase tracking-wider text-[#8e8a85]">
                    Opponent
                  </span>
                  {pvpStatus.status === "queued" ? (
                    <span className="text-xs font-semibold text-[#8e8a85] italic animate-pulse mt-0.5">
                      Waiting...
                    </span>
                  ) : (
                    <span className="max-w-full truncate text-xs font-bold mt-0.5">
                      {oppPick
                        ? formatPickSelection(oppPick.selection, childOpt) ||
                          "—"
                        : "—"}
                    </span>
                  )}
                </div>

                {/* Outcome — only shown when resolved */}
                {isResolved && (
                  <div className="flex min-w-0 flex-1 flex-col items-start border border-[#ff3b30] bg-[#1e1212] px-3 py-2 text-[#f4f1ea]">
                    <span className="font-mono text-[8px] uppercase tracking-wider text-[#ff3b30]">
                      Outcome
                    </span>
                    <span className="max-w-full truncate text-xs font-bold mt-0.5">
                      {formatPickSelection(resolvedOutcome, childOpt) || ""}
                    </span>
                  </div>
                )}

                {/* Points — only shown when resolved */}
                {((pick && (pick.arenaCorrect ?? pick.isCorrect) !== null) ||
                  (oppPick &&
                    (oppPick.arenaCorrect ?? oppPick.isCorrect) !== null)) && (
                  <div className="flex shrink-0 flex-col items-center justify-center border border-[#222226] bg-[#161619] px-3 py-2">
                    <span className="font-mono text-[8px] uppercase tracking-wider text-[#8e8a85]">
                      Points
                    </span>
                    <span
                      className={`text-xs font-bold mt-0.5 ${(pick?.arenaCorrect ?? pick?.isCorrect) ? "text-[#00ca48]" : "text-[#8e8a85]"}`}
                    >
                      {(pick?.arenaCorrect ?? pick?.isCorrect)
                        ? "+1 pt"
                        : "0 pts"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
