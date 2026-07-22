"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Trophy } from "lucide-react"
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

type ArenaLeader = {
  id: string
  username?: string | null
  displayName?: string | null
  arenaXp?: number | null
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

export default function PickemsExperience() {
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
        const lockAt = event.lockTime || event.deadline || ""
        const lockDate = new Date(lockAt)
        const lockTime = lockDate.getTime()
        const options: PvpOption[] = Array.isArray(event.options)
          ? event.options
          : []
        const final =
          event.status === "resolved" ||
          event.status === "voided" ||
          (options.length > 0 &&
            options.every((option) =>
              ["resolved", "voided"].includes(option.status || ""),
            ))
        const locked = !Number.isFinite(lockTime) || lockTime <= nowTime
        const status: SlateEvent["status"] = final
          ? "final"
          : locked
            ? "locked"
            : "open"

        let tab: SlateTab = "upcoming"
        if (final || locked) tab = "results"
        else if (isSameLocalDay(lockDate, now)) tab = "today"

        return {
          id: event.id,
          question,
          teamA,
          teamB,
          lockAt,
          stage: event.tournament || event.league || "Verity PvP Arena",
          tab,
          status,
          optionCount: options.length,
        }
      })
      .sort((left: SlateEvent, right: SlateEvent) => {
        const leftTime = new Date(left.lockAt).getTime() || 0
        const rightTime = new Date(right.lockAt).getTime() || 0
        return left.tab === "results"
          ? rightTime - leftTime
          : leftTime - rightTime
      })
  }, [rawEvents])

  const counts = useMemo(
    () => ({
      today: matches.filter((match) => match.tab === "today").length,
      upcoming: matches.filter((match) => match.tab === "upcoming").length,
      results: matches.filter((match) => match.tab === "results").length,
    }),
    [matches],
  )

  const visibleTab: SlateTab =
    counts[activeTab] > 0
      ? activeTab
      : counts.today > 0
        ? "today"
        : counts.upcoming > 0
          ? "upcoming"
          : "results"

  const visibleMatches = matches
    .filter((match) => match.tab === visibleTab)
    .slice(0, visibleTab === "results" ? 6 : 8)
  const openEventCount = counts.today + counts.upcoming
  const arenaXp = profile?.arenaXp ?? leaderboardData?.currentUserXp ?? 0
  const arenaRecord = profile
    ? `${profile.pvpMatchesWonCount ?? 0}-${profile.pvpMatchesLostCount ?? 0}-${profile.pvpMatchesDrawnCount ?? 0}`
    : "—"
  const boostsRemaining = profile?.activeBoosts?.reduce(
    (total, boost) => total + Math.max(0, boost.matchesRemaining || 0),
    0,
  )
  const leaders = (leaderboardData?.xp || []).slice(0, 3) as ArenaLeader[]

  function openArena(eventId?: string) {
    const destination = eventId
      ? `/markets?tab=pvp-arena&id=${encodeURIComponent(eventId)}`
      : "/markets?tab=pvp-arena"

    if (!authenticated) {
      login()
      return
    }

    router.push(destination)
  }

  return (
    <div className="pickems-page">
      <header className="pickems-hero">
        <p className="pickems-eyebrow">
          <span aria-hidden="true" /> Verity PvP Arena · {openEventCount} open
          {openEventCount === 1 ? " card" : " cards"}
        </p>
        <div className="pickems-hero-copy">
          <h1>
            PVP <em>ARENA</em>
          </h1>
          <p>
            Build a card of at least three market calls before lock, then face
            an opponent. Every correct call scores one duel point; the higher
            score wins.
          </p>
        </div>
      </header>

      <section aria-label="Your Arena stats" className="pickems-mobile-stats">
        <Stat
          label="Rank"
          value={
            leaderboardData?.currentUserXpRank
              ? `#${leaderboardData.currentUserXpRank}`
              : "—"
          }
        />
        <Stat label="Arena XP" value={authenticated ? String(arenaXp) : "—"} />
        <Stat label="W-L-D" value={arenaRecord} />
        <Stat
          label="Boosts"
          value={authenticated ? String(boostsRemaining ?? 0) : "—"}
        />
      </section>

      <div className="pickems-layout">
        <section className="pickems-slate" aria-label="Arena events">
          <div className="pickems-tabs-row">
            <div
              className="pickems-tabs"
              role="tablist"
              aria-label="Event status"
            >
              {(
                [
                  ["today", "Today"],
                  ["upcoming", "Upcoming"],
                  ["results", "Results"],
                ] as const
              ).map(([id, label]) => (
                <button
                  aria-selected={visibleTab === id}
                  className={visibleTab === id ? "is-active" : ""}
                  key={id}
                  onClick={() => setActiveTab(id)}
                  role="tab"
                  type="button"
                >
                  {label}
                  <sup>{counts[id]}</sup>
                </button>
              ))}
            </div>
            <span>
              {visibleMatches.length} SHOWN · {openEventCount} OPEN
            </span>
          </div>

          <div className="pickems-match-list">
            {eventsLoading && (
              <div className="pickems-empty-state">Loading Arena cards…</div>
            )}
            {!eventsLoading && eventsFailed && (
              <div className="pickems-empty-state">
                Arena cards could not be loaded. Try again shortly.
              </div>
            )}
            {!eventsLoading && !eventsFailed && visibleMatches.length === 0 && (
              <div className="pickems-empty-state">
                No {visibleTab} Arena cards right now.
              </div>
            )}
            {visibleMatches.map((match) => (
              <article className="pickems-match-card" key={match.id}>
                <div className="pickems-match-meta">
                  <span>{formatKickoff(match.lockAt)}</span>
                  <span>{match.stage}</span>
                  <strong className={match.status === "open" ? "is-open" : ""}>
                    {match.status.toUpperCase()}
                  </strong>
                </div>

                <div className="pickems-versus" title={match.question}>
                  <div className="pickems-team">
                    <b>{teamCode(match.teamA)}</b>
                    <span>{match.teamA}</span>
                    <small>ARENA SIDE A</small>
                  </div>
                  <i>VS</i>
                  <div className="pickems-team">
                    <b>{teamCode(match.teamB)}</b>
                    <span>{match.teamB}</span>
                    <small>ARENA SIDE B</small>
                  </div>
                </div>

                <div className="pickems-score-row">
                  <span>
                    {match.optionCount} propositions · choose at least 3
                  </span>
                  <div>
                    <button onClick={() => openArena(match.id)} type="button">
                      {match.status === "open" ? "Build card" : "View card"}
                      <ArrowRight aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <button
                  className="pickems-mobile-call"
                  onClick={() => openArena(match.id)}
                  type="button"
                >
                  <span>
                    {match.optionCount} propositions · 3 picks minimum
                  </span>
                  <strong>
                    {match.status === "open" ? "BUILD CARD" : "VIEW CARD"}
                    <ArrowRight aria-hidden="true" />
                  </strong>
                </button>
              </article>
            ))}
          </div>

          <div className="pickems-submit-bar">
            <div>
              <strong>WIN 100 XP · DRAW 50 XP · LOSS 30 XP</strong>
              <span>
                EVERY CORRECT PROPOSITION = 1 DUEL POINT · PERFECT CARD +20 XP
              </span>
            </div>
            <button onClick={() => openArena()} type="button">
              {authenticated ? "OPEN PVP ARENA" : "SIGN IN TO ENTER"}{" "}
              <ArrowRight aria-hidden="true" />
            </button>
          </div>

          <button
            className="pickems-week-link"
            onClick={() => openArena()}
            type="button"
          >
            <span>
              {openEventCount} OPEN {openEventCount === 1 ? "CARD" : "CARDS"} ·
              REAL VERITY EVENTS
            </span>
            <strong>
              Browse every card in the Verity Arena{" "}
              <ArrowRight aria-hidden="true" />
            </strong>
          </button>
        </section>

        <aside className="pickems-rail">
          <section
            className="pickems-desktop-stats"
            aria-label="Your Arena stats"
          >
            <Stat
              label="Your rank"
              value={
                leaderboardData?.currentUserXpRank
                  ? `#${leaderboardData.currentUserXpRank}`
                  : "—"
              }
            />
            <Stat
              label="Arena XP"
              value={authenticated ? String(arenaXp) : "—"}
            />
            <Stat label="W-L-D" value={arenaRecord} />
            <Stat
              label="Boosts"
              value={authenticated ? String(boostsRemaining ?? 0) : "—"}
            />
          </section>

          <section className="pickems-info-card">
            <h2>HOW ARENA XP WORKS</h2>
            <dl>
              <div>
                <dt>Win the duel</dt>
                <dd className="is-accent">+100</dd>
              </div>
              <div>
                <dt>Draw</dt>
                <dd>+50</dd>
              </div>
              <div>
                <dt>Loss</dt>
                <dd>+30</dd>
              </div>
              <div>
                <dt>Perfect card bonus</dt>
                <dd>+20</dd>
              </div>
            </dl>
          </section>

          <section className="pickems-info-card pickems-leaders">
            <div className="pickems-info-heading">
              <h2>TOP ARENA PLAYERS</h2>
              <button onClick={() => router.push("/leaderboard")} type="button">
                Full board →
              </button>
            </div>
            <ol>
              {leaders.length > 0 ? (
                leaders.map((leader, index) => (
                  <li key={leader.id}>
                    <span>{index + 1}</span>
                    <b>
                      {leader.displayName ||
                        leader.username ||
                        `Player ${index + 1}`}
                    </b>
                    <strong>{Number(leader.arenaXp ?? 0)} XP</strong>
                  </li>
                ))
              ) : (
                <li>
                  <span>—</span>
                  <b>No ranked players yet</b>
                  <strong>—</strong>
                </li>
              )}
            </ol>
          </section>

          <section className="pickems-more-card">
            <Trophy aria-hidden="true" />
            <div>
              <strong>RESULT XP, NOT PICK POINTS</strong>
              <p>
                Eligible boosts multiply your total result XP after settlement.
                Arena ranks are cumulative across resolved duels.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
