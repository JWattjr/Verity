"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Trophy, Swords, Zap, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/components/providers/AuthModals"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import {
  useActivePvpEventsQuery,
  usePvpLeaderboardQuery,
} from "@/store/verity/verityQueries"

type SlateTab = "today" | "upcoming" | "results"

type SlateEvent = {
  id: string
  question: string
  teamA: string
  teamB: string
  lockAt: string
  stage: string
  tab: SlateTab
  status: "open" | "locked" | "final"
  optionCount: number
}

type PvpOption = {
  status?: string | null
}

type PvpEvent = {
  id: string
  question?: string | null
  title?: string | null
  lockTime?: string | null
  deadline?: string | null
  status?: string | null
  tournament?: string | null
  league?: string | null
  options?: PvpOption[] | null
}

function splitTeams(question: string) {
  const versus = question.split(/\s+vs\.?\s+/i)
  if (versus.length > 1) {
    return {
      teamA: versus[0]?.trim() || "Side A",
      teamB: versus.slice(1).join(" vs ").trim() || "Side B",
    }
  }

  const dash = question.split(/\s+[–—-]\s+/)
  return {
    teamA: dash[0]?.trim() || question || "Side A",
    teamB: dash.length > 1 ? dash.slice(1).join(" – ").trim() : "Open card",
  }
}

function formatKickoff(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "LOCK TIME PENDING"

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    timeZoneName: "short",
    weekday: "short",
  })
    .format(date)
    .replace(",", " ·")
    .toUpperCase()
}

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function teamCode(team: string) {
  return (
    team
      .replace(/[^a-z]/gi, "")
      .slice(0, 3)
      .toUpperCase() || "—"
  )
}

export default function ArenaExperience() {
  const router = useRouter()
  const { authenticated, login } = useAuth()
  const { profile } = useWalletProfile()
  const {
    data: rawEvents = [],
    isLoading: eventsLoading,
    isError: eventsFailed,
  } = useActivePvpEventsQuery()
  const { data: leaderboardData } = usePvpLeaderboardQuery(profile?.id)
  const [activeTab, setActiveTab] = useState<SlateTab>("today")

  const matches = useMemo<SlateEvent[]>(() => {
    const now = new Date()
    const nowTime = now.getTime()

    return (rawEvents as PvpEvent[])
      .map((event) => {
        const question = event.question || event.title || "Verity Arena event"
        const { teamA, teamB } = splitTeams(question)
        const lockValue =
          event.lockTime ||
          event.deadline ||
          new Date(nowTime + 2 * 60 * 60 * 1000).toISOString()
        const lockDate = new Date(lockValue)
        const isLockValid = !Number.isNaN(lockDate.getTime())

        const explicitStatus = (event.status || "").toLowerCase()
        const isFinal =
          explicitStatus === "resolved" ||
          explicitStatus === "voided" ||
          (event.options &&
            event.options.length > 0 &&
            event.options.every(
              (opt: PvpOption) =>
                opt.status === "resolved" || opt.status === "voided",
            ))

        const isLocked =
          !isFinal && isLockValid && lockDate.getTime() <= nowTime
        const isOpen = !isFinal && !isLocked

        let status: SlateEvent["status"] = "open"
        if (isFinal) status = "final"
        else if (isLocked) status = "locked"

        let tab: SlateTab = "upcoming"
        if (status === "final") {
          tab = "results"
        } else if (isLockValid && isSameLocalDay(lockDate, now)) {
          tab = "today"
        } else if (isLockValid && lockDate.getTime() > nowTime) {
          tab = "upcoming"
        } else {
          tab = "today"
        }

        const stage =
          event.tournament ||
          event.league ||
          (status === "final"
            ? "FINAL"
            : status === "locked"
              ? "IN PLAY"
              : "ARENA MATCH")

        return {
          id: event.id,
          question,
          teamA,
          teamB,
          lockAt: lockValue,
          stage,
          tab,
          status,
          optionCount: event.options?.length || 5,
        }
      })
      .sort((a, b) => {
        const dateA = new Date(a.lockAt).getTime()
        const dateB = new Date(b.lockAt).getTime()
        return dateA - dateB
      })
  }, [rawEvents])

  const counts = useMemo(() => {
    return {
      today: matches.filter((m) => m.tab === "today").length,
      upcoming: matches.filter((m) => m.tab === "upcoming").length,
      results: matches.filter((m) => m.tab === "results").length,
    }
  }, [matches])

  const visibleTab: SlateTab = useMemo(() => {
    if (counts[activeTab] > 0) return activeTab
    if (counts.today > 0) return "today"
    if (counts.upcoming > 0) return "upcoming"
    if (counts.results > 0) return "results"
    return "today"
  }, [activeTab, counts])

  const visibleMatches = useMemo(() => {
    return matches.filter((m) => m.tab === visibleTab)
  }, [matches, visibleTab])

  const openEventCount = useMemo(() => {
    return matches.filter((m) => m.status === "open").length
  }, [matches])

  const arenaXp = Number(profile?.arenaXp ?? 0)
  const arenaRecord = `${profile?.pvpMatchesWonCount ?? 0}-${profile?.pvpMatchesLostCount ?? 0}-${profile?.pvpMatchesDrawnCount ?? 0}`
  const boostsRemaining = (profile?.activeBoosts ?? []).reduce(
    (acc: number, b: any) => acc + (b.matchesRemaining ?? 0),
    0,
  )

  const openArena = (eventId?: string) => {
    const target = eventId
      ? `/arena?id=${encodeURIComponent(eventId)}`
      : `/arena`
    router.push(target)
  }

  return (
    <div className="w-full py-8 font-sans sm:py-12">
      {/* Header */}
      <header className="mb-8 border-b border-border pb-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[0.88] tracking-[-0.02em] text-charcoal-primary">
              PVP DUEL <span className="text-ember-orange">ARENA</span>
            </h1>
            <p className="mt-4 max-w-[700px] text-sm leading-relaxed text-graphite sm:text-base">
              Select proposition sides across live fixtures, challenge opponents
              in head-to-head duels, and battle for Arena XP on the global
              leaderboard.
            </p>
          </div>

          {/* Player stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-[6px] border border-border bg-surface p-3 shadow-sm">
            <div className="px-3 py-1 text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ash">
                Rank
              </span>
              <p className="font-heading text-xl font-extrabold text-charcoal-primary">
                {leaderboardData?.currentUserXpRank
                  ? `#${leaderboardData.currentUserXpRank}`
                  : "—"}
              </p>
            </div>
            <div className="px-3 py-1 border-l border-border text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ash">
                Arena XP
              </span>
              <p className="font-heading text-xl font-extrabold text-ember-orange">
                {authenticated ? arenaXp.toLocaleString() : "—"}
              </p>
            </div>
            <div className="px-3 py-1 border-t sm:border-t-0 sm:border-l border-border text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ash">
                W-L-D
              </span>
              <p className="font-heading text-xl font-extrabold text-charcoal-primary">
                {arenaRecord}
              </p>
            </div>
            <div className="px-3 py-1 border-t sm:border-t-0 sm:border-l border-border text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ash">
                Boosts
              </span>
              <p className="font-heading text-xl font-extrabold text-emerald-400">
                {authenticated ? String(boostsRemaining) : "—"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Full-Width Arena Cards Section */}
      <section className="w-full" aria-label="Arena match fixtures">
        {/* Status Tabs */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2 sm:gap-6">
            {(
              [
                ["today", "Today"],
                ["upcoming", "Upcoming"],
                ["results", "Results"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative px-3 py-2 font-heading text-base sm:text-lg font-extrabold tracking-wide uppercase transition-colors cursor-pointer ${
                  visibleTab === id
                    ? "text-ember-orange border-b-2 border-ember-orange"
                    : "text-ash hover:text-charcoal-primary"
                }`}
              >
                {label}{" "}
                <sup className="text-xs font-mono font-bold ml-0.5">
                  {counts[id]}
                </sup>
              </button>
            ))}
          </div>

          <span className="font-mono text-xs text-ash font-bold">
            {visibleMatches.length} SHOWN · {openEventCount} OPEN DUEL CARDS
          </span>
        </div>

        {/* Loading / Empty states */}
        {eventsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-48 rounded-[6px] border border-border bg-surface animate-pulse"
              />
            ))}
          </div>
        )}

        {!eventsLoading && eventsFailed && (
          <div className="rounded-[6px] border border-border bg-surface p-12 text-center">
            <p className="text-sm font-mono text-ash font-bold">
              Arena cards could not be loaded. Please try again shortly.
            </p>
          </div>
        )}

        {!eventsLoading && !eventsFailed && visibleMatches.length === 0 && (
          <div className="rounded-[6px] border border-border bg-surface p-12 text-center">
            <Swords className="mx-auto h-8 w-8 text-ash mb-3" />
            <h3 className="text-base font-bold text-charcoal-primary">
              No {visibleTab} Arena Cards
            </h3>
            <p className="text-xs text-graphite mt-1">
              Check upcoming fixtures or check back when new matches are
              scheduled.
            </p>
          </div>
        )}

        {/* Full-width Responsive Match Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleMatches.map((match) => (
            <article
              key={match.id}
              className="group flex flex-col justify-between rounded-[6px] border border-border bg-surface p-5 transition-all hover:border-ember-orange/40 hover:bg-surface-hover shadow-sm"
            >
              {/* Match Header */}
              <div className="flex items-center justify-between border-b border-border/80 pb-3 font-mono text-[10px] font-bold uppercase tracking-wider text-ash">
                <span>{formatKickoff(match.lockAt)}</span>
                <span className="text-graphite">{match.stage}</span>
                <span
                  className={`rounded-[4px] px-2 py-0.5 text-[10px] font-extrabold ${
                    match.status === "open"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-stone-surface text-ash"
                  }`}
                >
                  {match.status.toUpperCase()}
                </span>
              </div>

              {/* Versus Teams */}
              <div className="my-5 flex items-center justify-between gap-4">
                <div className="flex-1 text-center sm:text-left">
                  <span className="font-heading text-2xl sm:text-3xl font-extrabold text-charcoal-primary block">
                    {teamCode(match.teamA)}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-graphite truncate block max-w-[140px]">
                    {match.teamA}
                  </span>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-surface font-heading text-sm font-extrabold text-ash border border-border">
                  VS
                </div>

                <div className="flex-1 text-center sm:text-right">
                  <span className="font-heading text-2xl sm:text-3xl font-extrabold text-charcoal-primary block">
                    {teamCode(match.teamB)}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-graphite truncate block max-w-[140px] ml-auto">
                    {match.teamB}
                  </span>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between border-t border-border/80 pt-3">
                <span className="text-xs text-ash font-medium">
                  {match.optionCount} propositions available
                </span>
                <button
                  onClick={() => openArena(match.id)}
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-[6px] bg-stone-surface hover:bg-ember-orange hover:text-white px-3.5 py-2 text-xs font-bold text-charcoal-primary transition-all border border-border cursor-pointer group-hover:border-ember-orange/50"
                >
                  <span>
                    {match.status === "open" ? "Build Duel Card" : "View Card"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
