"use client"

import { History } from "lucide-react"

interface DuelHistoryProps {
  matchHistory: any[]
}

export default function DuelHistory({ matchHistory }: DuelHistoryProps) {
  return (
    <div className="verity-card overflow-hidden">
      <div className="p-4 border-b border-border dark:border-zinc-800 bg-white-surface/40 dark:bg-zinc-900/40 flex items-center gap-2">
        <History className="h-4.5 w-4.5 text-indigo-500" />
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-charcoal-primary dark:text-white">
          Duel History
        </h3>
      </div>

      {matchHistory.length === 0 ? (
        <div className="p-6 text-center text-xs text-ash font-mono">
          No pvp matches resolved yet.
        </div>
      ) : (
        <div className="divide-y divide-border dark:divide-zinc-800 max-h-[360px] overflow-y-auto">
          {matchHistory.map((item: any) => (
            <div
              key={item.matchId}
              className="p-3.5 hover:bg-white-surface/20 dark:hover:bg-zinc-900/20 transition-colors"
            >
              <div className="flex justify-between items-start gap-2">
                <h4 className="text-xs font-semibold tracking-tight text-charcoal-primary dark:text-white line-clamp-1 flex-1">
                  {item.eventQuestion}
                </h4>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider shrink-0 ${
                    item.outcome === "WIN"
                      ? "bg-meadow-green/10 text-meadow-green border border-meadow-green/20"
                      : item.outcome === "LOSS"
                        ? "bg-ember-orange/10 text-ember-orange border border-ember-orange/20"
                        : "bg-zinc-500/10 text-zinc-500"
                  }`}
                >
                  {item.outcome}
                </span>
              </div>

              <div className="flex items-center justify-between mt-2 text-[9px] font-mono text-ash">
                <span className="truncate max-w-[80px]">
                  @{item.opponent?.username || "Unknown"}
                </span>
                <span>
                  Score: {item.myScore} - {item.oppScore}
                </span>
                <span className="font-semibold text-charcoal-primary dark:text-zinc-300">
                  +{item.xpEarned} XP
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
