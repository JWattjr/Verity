"use client"

import { useState } from "react"
import { History, X, Swords, Award, ChevronRight } from "lucide-react"
import { parseEventTeams } from "./PvpMatchupCarousel"
import TeamBadge from "@/components/common/TeamBadge"
import { usePvpMatchHistoryQuery } from "@/store/verity/verityQueries"

export default function DuelHistory() {
  const { data: matchHistory = [], isLoading } = usePvpMatchHistoryQuery()
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null)

  return (
    <div className="border border-[#222226] bg-[#101012] text-[#f4f1ea]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#222226] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[#ff3b30]" />
          <h3 className="font-heading text-sm sm:text-base font-black uppercase tracking-wider text-[#f4f1ea]">
            Duel History
          </h3>
        </div>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8e8a85]">
          {matchHistory.length} Resolved
        </span>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs font-mono text-[#8e8a85] animate-pulse">
          Loading duel history...
        </div>
      ) : matchHistory.length === 0 ? (
        <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
          <Swords className="h-6 w-6 text-[#44444c]" />
          <p className="text-xs font-mono text-[#8e8a85]">
            No duels resolved yet. Submit a duel card above to start battling!
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[#222226] max-h-[380px] overflow-y-auto">
          {matchHistory.map((item: any) => {
            const { teamA, teamB } = parseEventTeams(item.eventQuestion)
            const isWin = item.outcome === "WIN"
            const isLoss = item.outcome === "LOSS"

            return (
              <div
                key={item.matchId}
                onClick={() => setSelectedMatch(item)}
                className="flex items-center justify-between p-3.5 sm:p-4 bg-[#101012] hover:bg-[#161619] transition-colors cursor-pointer text-left group"
              >
                {/* Left Column: Match Details */}
                <div className="space-y-1.5 min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center -space-x-1.5 shrink-0">
                      <TeamBadge team={teamA} className="h-4.5 w-4.5" />
                      <TeamBadge team={teamB} className="h-4.5 w-4.5" />
                    </div>
                    <h4 className="text-xs font-heading font-black uppercase tracking-tight text-[#f4f1ea] truncate group-hover:text-white transition-colors">
                      {teamA} vs {teamB}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-[#8e8a85]">
                    <span className="truncate max-w-[110px]">
                      vs @{item.opponent?.username || "opponent"}
                    </span>
                    <span>·</span>
                    <span className="text-[#aaa6a1] font-bold">
                      Score {item.myScore} – {item.oppScore}
                    </span>
                  </div>
                </div>

                {/* Right Column: Status & XP */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-[2px] text-[9px] font-black font-mono uppercase tracking-wider ${
                        isWin
                          ? "bg-[#00ca48]/15 text-[#00ca48] border border-[#00ca48]/30"
                          : isLoss
                            ? "bg-[#ff3b30]/15 text-[#ff3b30] border border-[#ff3b30]/30"
                            : "bg-[#28282e] text-[#aaa6a1] border border-[#333338]"
                      }`}
                    >
                      {item.outcome}
                    </span>
                    <span className="text-[10px] font-bold font-mono text-[#00ca48]">
                      +{item.xpEarned} XP
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#5a5651] group-hover:text-[#f4f1ea] transition-colors" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Duel Details Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101012] border border-[#28282e] rounded-[2px] max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#222226] flex items-center justify-between bg-[#161619]">
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-[#ff3b30]" />
                <span className="font-heading text-xs font-black uppercase tracking-wider text-[#f4f1ea]">
                  Duel Match Breakdown
                </span>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="p-1 rounded-[2px] hover:bg-[#222226] transition-colors cursor-pointer text-[#8e8a85] hover:text-[#f4f1ea]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5 text-[#f4f1ea]">
              {/* Event Header */}
              <div>
                <span className="font-mono text-[9px] font-bold text-[#8e8a85] uppercase tracking-wider block">
                  Match Event
                </span>
                <h4 className="text-base font-heading font-black uppercase tracking-tight text-[#f4f1ea] leading-snug mt-1">
                  {selectedMatch.eventQuestion}
                </h4>
                <span className="text-[10px] font-mono text-[#8e8a85] mt-1 block">
                  Resolved: {new Date(selectedMatch.resolvedAt).toLocaleString()}
                </span>
              </div>

              {/* Outcome Banner & Stats */}
              <div className="p-4 rounded-[2px] border border-[#222226] flex flex-col md:flex-row items-center justify-between gap-4 bg-[#161619]">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div
                    className={`h-11 w-11 rounded-[2px] flex items-center justify-center shrink-0 border ${
                      selectedMatch.outcome === "WIN"
                        ? "bg-[#00ca48]/10 border-[#00ca48]/30 text-[#00ca48]"
                        : selectedMatch.outcome === "LOSS"
                          ? "bg-[#ff3b30]/10 border-[#ff3b30]/30 text-[#ff3b30]"
                          : "bg-[#28282e] border-[#333338] text-[#8e8a85]"
                    }`}
                  >
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-bold text-[#8e8a85] uppercase tracking-wider block">
                      Outcome
                    </span>
                    <span
                      className={`text-base font-heading font-black uppercase tracking-tight ${
                        selectedMatch.outcome === "WIN"
                          ? "text-[#00ca48]"
                          : selectedMatch.outcome === "LOSS"
                            ? "text-[#ff3b30]"
                            : "text-[#aaa6a1]"
                      }`}
                    >
                      {selectedMatch.outcome === "WIN"
                        ? "YOU WON"
                        : selectedMatch.outcome === "LOSS"
                          ? "YOU LOST"
                          : "DRAW"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full md:w-auto flex-1 md:justify-end">
                  <div className="bg-[#101012] p-2.5 rounded-[2px] border border-[#222226] text-center">
                    <span className="text-[9px] font-mono text-[#8e8a85] block">
                      Score
                    </span>
                    <strong className="text-sm font-black font-heading text-[#f4f1ea] mt-0.5 block">
                      {selectedMatch.myScore} - {selectedMatch.oppScore}
                    </strong>
                  </div>
                  <div className="bg-[#101012] p-2.5 rounded-[2px] border border-[#222226] text-center">
                    <span className="text-[9px] font-mono text-[#8e8a85] block">
                      XP Earned
                    </span>
                    <strong className="text-sm font-black font-heading text-[#00ca48] mt-0.5 block">
                      +{selectedMatch.xpEarned} XP
                    </strong>
                  </div>
                  <div className="bg-[#101012] p-2.5 rounded-[2px] border border-[#222226] text-center">
                    <span className="text-[9px] font-mono text-[#8e8a85] block">
                      Status
                    </span>
                    <strong className="text-sm font-black font-heading text-[#f4f1ea] mt-0.5 block">
                      Resolved
                    </strong>
                  </div>
                </div>
              </div>

              {/* Picks list comparison */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#222226] pb-2">
                  <span className="text-xs font-mono font-bold text-[#8e8a85] uppercase tracking-wider">
                    Predictions Comparison
                  </span>
                  <span className="text-[10px] text-[#8e8a85] font-mono font-medium">
                    Opponent: @{selectedMatch.opponent?.username || "Opponent"}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {selectedMatch.myPicks?.map((pick: any) => {
                    const oppPick = selectedMatch.oppPicks?.find(
                      (p: any) => p.marketId === pick.marketId,
                    )
                    const isCorrect = (pick.arenaCorrect ?? pick.isCorrect) === true
                    const isWrong = (pick.arenaCorrect ?? pick.isCorrect) === false

                    const resolvedLabel =
                      pick.resolvedOutcome === "YES"
                        ? pick.yesCondition || "YES"
                        : pick.resolvedOutcome === "NO"
                          ? pick.noCondition || "NO"
                          : pick.resolvedOutcome || "Pending"

                    return (
                      <div
                        key={pick.marketId}
                        className="p-3 rounded-[2px] bg-[#161619] border border-[#222226] flex flex-col gap-2"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-bold font-heading text-[#f4f1ea] uppercase tracking-tight">
                            {pick.optionName}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-[2px] text-[8px] font-mono font-bold ${
                              isCorrect
                                ? "bg-[#00ca48]/15 text-[#00ca48] border border-[#00ca48]/30"
                                : isWrong
                                  ? "bg-[#ff3b30]/15 text-[#ff3b30] border border-[#ff3b30]/30"
                                  : "bg-[#28282e] text-[#8e8a85]"
                            }`}
                          >
                            {isCorrect
                              ? "CORRECT"
                              : isWrong
                                ? "WRONG"
                                : "PENDING"}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-1">
                          <div className="bg-[#101012] p-2 rounded-[2px] border border-[#222226]">
                            <span className="text-[8px] font-mono text-[#8e8a85] uppercase block">
                              You Picked
                            </span>
                            <span
                              className={`text-xs font-bold mt-0.5 block ${
                                pick.selection === "YES"
                                  ? "text-[#00ca48]"
                                  : pick.selection === "NO"
                                    ? "text-[#ff3b30]"
                                    : "text-[#f4f1ea]"
                              }`}
                            >
                              {pick.selection === "YES"
                                ? pick.yesCondition || "YES"
                                : pick.selection === "NO"
                                  ? pick.noCondition || "NO"
                                  : pick.selection}
                            </span>
                          </div>

                          <div className="bg-[#101012] p-2 rounded-[2px] border border-[#222226]">
                            <span className="text-[8px] font-mono text-[#8e8a85] uppercase block">
                              Opponent Picked
                            </span>
                            <span
                              className={`text-xs font-bold mt-0.5 block ${
                                oppPick?.selection === "YES"
                                  ? "text-[#00ca48]"
                                  : oppPick?.selection === "NO"
                                    ? "text-[#ff3b30]"
                                    : "text-[#f4f1ea]"
                              }`}
                            >
                              {oppPick
                                ? oppPick.selection === "YES"
                                  ? pick.yesCondition || "YES"
                                  : oppPick.selection === "NO"
                                    ? pick.noCondition || "NO"
                                    : oppPick.selection
                                : "N/A"}
                            </span>
                          </div>

                          <div className="bg-[#101012] p-2 rounded-[2px] border border-[#222226]">
                            <span className="text-[8px] font-mono text-[#8e8a85] uppercase block">
                              Outcome
                            </span>
                            <span className="text-xs font-bold text-[#f4f1ea] mt-0.5 block truncate">
                              {resolvedLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#222226] flex justify-end bg-[#161619]">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-4 py-2 rounded-[2px] bg-[#ff3b30] hover:bg-[#e0342a] text-white text-xs font-heading font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
