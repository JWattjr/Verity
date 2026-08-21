"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Trophy, Flame, Zap, Shield, Swords, History } from "lucide-react"
import TeamBadge from "@/components/common/TeamBadge"
import { parseEventTeams } from "./PvpMatchupCarousel"

interface ArenaPlayerStatsHeaderProps {
  profile: any
  pvpEvents: any[]
  selectedPvpEventId: string | null
  setSelectedPvpEventId: (id: string | null) => void
}

export default function ArenaPlayerStatsHeader({
  profile,
  pvpEvents,
  selectedPvpEventId,
  setSelectedPvpEventId,
}: ArenaPlayerStatsHeaderProps) {
  const [fixtureFilter, setFixtureFilter] = useState<"all" | "open" | "settled">("all")

  const arenaXp = Number(profile?.arenaXp ?? 0)
  const won = Number(profile?.pvpMatchesWonCount ?? 0)
  const lost = Number(profile?.pvpMatchesLostCount ?? 0)
  const drawn = Number(profile?.pvpMatchesDrawnCount ?? 0)
  const totalMatches = won + lost + drawn

  const winRate =
    totalMatches > 0 ? ((won / totalMatches) * 100).toFixed(1) + "%" : "—"

  const activeBoostsList = profile?.activeBoosts ?? []
  const activeBoostsCount = activeBoostsList.reduce(
    (sum: number, b: any) => sum + (b.matchesRemaining ?? 0),
    0,
  )
  const maxMultiplier = activeBoostsList.length > 0
    ? Math.max(...activeBoostsList.map((b: any) => b.multiplier || 1))
    : 1

  const displayName = profile?.displayName || profile?.username || "Arena Player"
  const username = profile?.username
    ? `@${profile.username}`
    : profile?.walletAddress
      ? `${profile.walletAddress.slice(0, 6)}...${profile.walletAddress.slice(-4)}`
      : "Guest Duelist"

  const { openEvents, settledEvents } = useMemo(() => {
    const open: any[] = []
    const settled: any[] = []
    const now = Date.now()

    for (const evt of pvpEvents || []) {
      const lockTime = new Date(evt.lockTime || evt.deadline || 0).getTime()
      const isResolved = evt.status === "resolved"
      const isClosed = isResolved || evt.status === "closed" || (lockTime > 0 && lockTime <= now)

      if (isResolved) {
        settled.push(evt)
      } else if (!isClosed) {
        open.push(evt)
      } else {
        settled.push(evt)
      }
    }
    return { openEvents: open, settledEvents: settled }
  }, [pvpEvents])

  const displayedEvents = useMemo(() => {
    if (fixtureFilter === "open") return openEvents
    if (fixtureFilter === "settled") return settledEvents
    return pvpEvents || []
  }, [fixtureFilter, openEvents, settledEvents, pvpEvents])

  return (
    <div className="border border-[#222226] bg-[#101012] text-[#f4f1ea]">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Top row: Profile & Tier */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#222226] pb-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#2e2e34] bg-[#17171a]">
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-heading text-base font-black uppercase text-[#ff3b30]">
                  {displayName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Name & Title */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-heading text-lg font-black uppercase tracking-tight text-[#f4f1ea]">
                  {displayName}
                </h2>
                <span className="inline-flex items-center gap-1 border border-[#ff3b30]/40 bg-[#ff3b30]/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#ff3b30]">
                  <Swords className="h-2.5 w-2.5" />
                  Duelist
                </span>
              </div>
              <span className="font-mono text-xs text-[#8e8a85] truncate">
                {username}
              </span>
            </div>
          </div>

          {/* Top Actions: Duel History & Tier */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/arena/history"
              className="flex items-center gap-1.5 border border-[#ff3b30]/30 bg-[#ff3b30]/10 hover:bg-[#ff3b30]/20 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#ff3b30] transition-colors"
            >
              <History className="h-3.5 w-3.5" />
              <span>Duel History</span>
            </Link>

            <div className="flex items-center gap-2 border border-[#28282e] bg-[#161619] px-3 py-1.5">
              <Trophy className="h-3.5 w-3.5 text-[#ff3b30]" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#aaa6a1]">
                Tier:{" "}
                <strong className="text-[#f4f1ea]">
                  {arenaXp >= 2000 ? "Gold" : arenaXp >= 800 ? "Silver" : "Bronze"}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
          {/* Stat 1: Arena XP */}
          <div className="flex flex-col justify-between border border-[#222226] bg-[#161619] p-3 transition-colors hover:border-[#333338]">
            <div className="flex items-center justify-between text-[#8e8a85]">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider">
                Arena XP
              </span>
              <Flame className="h-3.5 w-3.5 text-[#ff3b30]" />
            </div>
            <span className="mt-2 font-heading text-xl sm:text-2xl font-black tracking-tight text-[#f4f1ea]">
              {arenaXp.toLocaleString()}
            </span>
          </div>

          {/* Stat 2: Duel Record */}
          <div className="flex flex-col justify-between border border-[#222226] bg-[#161619] p-3 transition-colors hover:border-[#333338]">
            <div className="flex items-center justify-between text-[#8e8a85]">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider">
                Duel Record
              </span>
              <Swords className="h-3.5 w-3.5 text-[#aaa6a1]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-heading text-xl sm:text-2xl font-black tracking-tight text-[#f4f1ea]">
                {won}W
              </span>
              <span className="font-mono text-xs text-[#8e8a85]">·</span>
              <span className="font-heading text-lg font-bold tracking-tight text-[#8e8a85]">
                {lost}L
              </span>
              <span className="font-mono text-xs text-[#8e8a85]">·</span>
              <span className="font-heading text-lg font-bold tracking-tight text-[#8e8a85]">
                {drawn}D
              </span>
            </div>
          </div>

          {/* Stat 3: Win Rate */}
          <div className="flex flex-col justify-between border border-[#222226] bg-[#161619] p-3 transition-colors hover:border-[#333338]">
            <div className="flex items-center justify-between text-[#8e8a85]">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider">
                Win Rate
              </span>
              <Shield className="h-3.5 w-3.5 text-[#aaa6a1]" />
            </div>
            <span className="mt-2 font-heading text-xl sm:text-2xl font-black tracking-tight text-[#f4f1ea]">
              {winRate}
            </span>
          </div>

          {/* Stat 4: Boost Multiplier */}
          <div className="flex flex-col justify-between border border-[#222226] bg-[#161619] p-3 transition-colors hover:border-[#333338]">
            <div className="flex items-center justify-between text-[#8e8a85]">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider">
                Boost Status
              </span>
              <Zap className="h-3.5 w-3.5 text-[#ff3b30]" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-heading text-xl sm:text-2xl font-black tracking-tight text-[#f4f1ea]">
                {maxMultiplier > 1 ? `${maxMultiplier}x` : "1.0x"}
              </span>
              {activeBoostsCount > 0 && (
                <span className="font-mono text-[10px] text-[#8e8a85]">
                  ({activeBoostsCount} left)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Match Slate Selector Pills */}
        {pvpEvents && pvpEvents.length > 0 && (
          <div className="flex flex-col gap-2.5 border-t border-[#222226] pt-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#8e8a85]">
                Match Slate ({pvpEvents.length})
              </span>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1">
                {(
                  [
                    { key: "all", label: "All", count: pvpEvents.length },
                    { key: "open", label: "Open", count: openEvents.length },
                    { key: "settled", label: "Settled", count: settledEvents.length },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFixtureFilter(tab.key)}
                    className={`px-2 py-0.5 rounded-[2px] font-mono text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      fixtureFilter === tab.key
                        ? "bg-[#ff3b30] text-white"
                        : "bg-[#161619] text-[#8e8a85] hover:text-[#f4f1ea] border border-[#222226]"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {displayedEvents.map((evt) => {
                const { teamA, teamB } = parseEventTeams(evt.question || evt.title || "")
                const isSelected = evt.id === selectedPvpEventId
                const isResolved = evt.status === "resolved"
                const lockTime = new Date(evt.lockTime || evt.deadline || 0).getTime()
                const isClosed =
                  isResolved ||
                  evt.status === "closed" ||
                  (lockTime > 0 && lockTime <= Date.now())

                return (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => setSelectedPvpEventId(evt.id)}
                    className={`flex items-center gap-2.5 shrink-0 px-3 py-2 border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#ff3b30] bg-[#1e1212] text-[#f4f1ea] font-bold shadow-[0_0_8px_rgba(255,59,48,0.25)]"
                        : "border-[#222226] bg-[#161619] hover:border-[#333338] text-[#aaa6a1] hover:text-[#f4f1ea]"
                    }`}
                  >
                    <div className="flex items-center -space-x-1.5">
                      <TeamBadge team={teamA} className="h-4.5 w-4.5" />
                      <TeamBadge team={teamB} className="h-4.5 w-4.5" />
                    </div>
                    <span className="font-heading text-xs uppercase tracking-tight">
                      {teamA} vs {teamB}
                    </span>
                    {isResolved ? (
                      <span className="font-mono text-[8px] uppercase tracking-wider text-[#ff9500] bg-[#ff9500]/10 border border-[#ff9500]/30 px-1.5 py-0.5">
                        Settled
                      </span>
                    ) : isClosed ? (
                      <span className="font-mono text-[8px] uppercase tracking-wider text-[#8e8a85] bg-[#222226] px-1.5 py-0.5">
                        Closed
                      </span>
                    ) : (
                      <span className="font-mono text-[8px] uppercase tracking-wider text-[#00ca48] bg-[#00ca48]/10 border border-[#00ca48]/30 px-1.5 py-0.5">
                        Open
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
