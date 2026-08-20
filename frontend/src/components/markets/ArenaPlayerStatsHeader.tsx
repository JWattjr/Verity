"use client"

import { Trophy, Flame, Zap, Shield, Swords } from "lucide-react"
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

          {/* Quick Rank / Tier */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
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
              {drawn > 0 && (
                <>
                  <span className="font-mono text-xs text-[#8e8a85]">·</span>
                  <span className="font-heading text-lg font-bold tracking-tight text-[#8e8a85]">
                    {drawn}D
                  </span>
                </>
              )}
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
        {pvpEvents && pvpEvents.length > 1 && (
          <div className="flex flex-col gap-2 border-t border-[#222226] pt-3">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#8e8a85]">
              Select Fixture
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {pvpEvents.map((evt) => {
                const { teamA, teamB } = parseEventTeams(evt.question || evt.title || "")
                const isSelected = evt.id === selectedPvpEventId
                const isClosed =
                  new Date() >= new Date(evt.lockTime || evt.deadline) ||
                  evt.status === "resolved" ||
                  evt.status === "closed"

                return (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => setSelectedPvpEventId(evt.id)}
                    className={`flex items-center gap-2.5 shrink-0 px-3 py-2 border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#ff3b30] bg-[#1e1212] text-[#f4f1ea] font-bold"
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
                    {isClosed ? (
                      <span className="font-mono text-[8px] uppercase tracking-wider text-[#8e8a85] bg-[#222226] px-1.5 py-0.5">
                        Closed
                      </span>
                    ) : (
                      <span className="font-mono text-[8px] uppercase tracking-wider text-[#00ca48] bg-[#00ca48]/10 px-1.5 py-0.5">
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
