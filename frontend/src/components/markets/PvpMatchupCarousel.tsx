"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { ArrowRight, Lock, Search, Swords } from "lucide-react"

// Country flag helper
export function getCountryFlag(name: string): string {
  const clean = name.toLowerCase().trim()
  const map: Record<string, string> = {
    // 2026 FIFA World Cup Hosts & Qualified Teams
    algeria: "🇩🇿",
    argentina: "🇦🇷",
    australia: "🇦🇺",
    austria: "🇦🇹",
    belgium: "🇧🇪",
    "bosnia and herzegovina": "🇧🇦",
    "bosnia & herzegovina": "🇧🇦",
    bosnia: "🇧🇦",
    brazil: "🇧🇷",
    "cape verde": "🇨🇻",
    canada: "🇨🇦",
    colombia: "🇨🇴",
    "congo dr": "🇨🇩",
    "dr congo": "🇨🇩",
    "ivory coast": "🇨🇮",
    croatia: "🇭🇷",
    curaçao: "🇨🇼",
    curacao: "🇨🇼",
    czechia: "🇨🇿",
    ecuador: "🇪🇨",
    egypt: "🇪🇬",
    england: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    france: "🇫🇷",
    germany: "🇩🇪",
    ghana: "🇬🇭",
    haiti: "🇭🇹",
    iran: "🇮🇷",
    iraq: "🇮🇶",
    japan: "🇯🇵",
    jordan: "🇯🇴",
    "south korea": "🇰🇷",
    "south-korea": "🇰🇷",
    mexico: "🇲🇽",
    morocco: "🇲🇦",
    netherlands: "🇳🇱",
    "new zealand": "🇳🇿",
    norway: "🇳🇴",
    panama: "🇵🇦",
    paraguay: "🇵🇾",
    portugal: "🇵🇹",
    qatar: "🇶🇦",
    "saudi arabia": "🇸🇦",
    scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    senegal: "🇸🇳",
    "south africa": "🇿🇦",
    spain: "🇪🇸",
    sweden: "🇸🇪",
    switzerland: "🇨🇭",
    tunisia: "🇹🇳",
    türkiye: "🇹🇷",
    usa: "🇺🇸",
    uruguay: "🇺🇾",
    uzbekistan: "🇺🇿",

    // Existing / non-2026 World Cup mappings for completeness
    denmark: "🇩🇰",
    poland: "🇵🇱",
    wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    honduras: "🇭🇳",
    italy: "🇮🇹",
    cameroon: "🇨🇲",
    serbia: "🇷🇸",
    "costa rica": "🇨🇷",
  }
  return map[clean] || "🏳️"
}

// Helper to parse question into team names
export function parseEventTeams(question: string) {
  const vsMatch = question.match(/(.+?)\s+vs\.?\s+(.+)/i)
  if (vsMatch) return { teamA: vsMatch[1].trim(), teamB: vsMatch[2].trim() }
  const dashMatch = question.match(/(.+?)\s+-\s+(.+)/)
  if (dashMatch)
    return { teamA: dashMatch[1].trim(), teamB: dashMatch[2].trim() }
  return { teamA: "Team A", teamB: "Team B" }
}

interface PvpMatchupCarouselProps {
  pvpEvents: any[]
  selectedPvpEventId: string | null
  setSelectedPvpEventId: (id: string | null) => void
}

export default function PvpMatchupCarousel({
  pvpEvents,
  selectedPvpEventId,
  setSelectedPvpEventId,
}: PvpMatchupCarouselProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [eventFilter, setEventFilter] = useState<"open" | "settled" | "all">(
    "open",
  )

  // Calculate live/remaining time label
  const getCardTimeStatus = (evt: any) => {
    const lockTimeStr = evt.lockTime || evt.deadline
    if (!lockTimeStr) return { isClosed: true, label: "CLOSED" }

    const target = new Date(lockTimeStr)
    if (isNaN(target.getTime())) return { isClosed: true, label: "CLOSED" }

    const diff = target.getTime() - Date.now()
    const isClosed =
      diff <= 0 || evt.status === "resolved" || evt.status === "closed"

    if (isClosed) {
      return { isClosed: true, label: "CLOSED" }
    }

    const diffHrs = Math.floor(diff / (1000 * 60 * 60))
    const diffMins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const diffDays = Math.floor(diffHrs / 24)

    if (diffDays > 0) {
      const remainingHrs = diffHrs % 24
      return { isClosed: false, label: `LIVE · ${diffDays}D ${remainingHrs}H` }
    }
    return { isClosed: false, label: `LIVE · ${diffHrs}H ${diffMins}M` }
  }

  // Calculate volume
  const getEventVolume = (evt: any) => {
    if (!evt?.options) return 0
    return evt.options.reduce(
      (sum: number, opt: any) => sum + Number(opt.liquidity ?? 0),
      0,
    )
  }

  // Format date/time
  const formatEventDate = (evt: any) => {
    const timeStr = evt.lockTime || evt.deadline
    if (!timeStr) return ""
    const date = new Date(timeStr)
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const selectedRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll selected card into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      })
    }
  }, [selectedPvpEventId])

  const eventSummary = useMemo(() => {
    const summary = pvpEvents.reduce(
      (acc, event) => {
        const lockTime = event.lockTime || event.deadline
        const isClosed =
          !lockTime ||
          new Date(lockTime).getTime() <= Date.now() ||
          event.status === "resolved" ||
          event.status === "closed"

        if (isClosed) acc.settled += 1
        else acc.open += 1

        acc.volume += getEventVolume(event)
        return acc
      },
      { open: 0, settled: 0, volume: 0 },
    )

    return summary
  }, [pvpEvents])

  // Filter and limit events (max 7 past matchups)
  const filteredEvents = useMemo(() => {
    if (!pvpEvents) return []

    const queried = pvpEvents.filter((evt) => {
      const query = searchQuery.toLowerCase().trim()
      if (!query) return true
      return evt.question.toLowerCase().includes(query)
    })

    const live: any[] = []
    const closed: any[] = []

    queried.forEach((evt) => {
      const lockTimeStr = evt.lockTime || evt.deadline
      let isClosed = true
      if (lockTimeStr) {
        const target = new Date(lockTimeStr)
        if (!isNaN(target.getTime())) {
          const diff = target.getTime() - Date.now()
          isClosed =
            diff <= 0 || evt.status === "resolved" || evt.status === "closed"
        }
      }

      if (isClosed) {
        closed.push(evt)
      } else {
        live.push(evt)
      }
    })

    // Sort closed ascending (oldest first), then take the 7 most recent closed ones
    closed.sort((a, b) => {
      const timeA = new Date(a.lockTime || a.deadline || 0).getTime()
      const timeB = new Date(b.lockTime || b.deadline || 0).getTime()
      return timeA - timeB
    })
    const limitedClosed = closed.slice(-7)

    // Ensure the selected matchup is always included in the carousel list even if it is an older closed matchup
    if (selectedPvpEventId) {
      const isSelectedClosed = closed.find((e) => e.id === selectedPvpEventId)
      if (
        isSelectedClosed &&
        !limitedClosed.some((e) => e.id === selectedPvpEventId)
      ) {
        limitedClosed.push(isSelectedClosed)
        limitedClosed.sort((a, b) => {
          const timeA = new Date(a.lockTime || a.deadline || 0).getTime()
          const timeB = new Date(b.lockTime || b.deadline || 0).getTime()
          return timeA - timeB
        })
      }
    }

    // Sort live ascending
    live.sort((a, b) => {
      const timeA = new Date(a.lockTime || a.deadline || 0).getTime()
      const timeB = new Date(b.lockTime || b.deadline || 0).getTime()
      return timeA - timeB
    })

    if (eventFilter === "open") return live
    if (eventFilter === "settled") return limitedClosed.reverse()
    return [...live, ...limitedClosed.reverse()]
  }, [eventFilter, pvpEvents, searchQuery, selectedPvpEventId])

  return (
    <section className="overflow-hidden rounded-2xl border border-[#252525] bg-[#080808] text-white shadow-subtle">
      <div className="relative overflow-hidden bg-[#080808] px-5 py-5 text-white sm:px-6 sm:py-6">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/10" />
        <div className="absolute -right-5 top-5 h-28 w-28 rounded-full border border-white/10" />

        <div className="relative flex flex-col gap-5">
          <div className="max-w-xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">
              <Swords className="h-3.5 w-3.5 text-brand-accent" />
              World Cup 2026 · PvP pick&apos;em
            </div>
            <h2 className="font-heading text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">
              Build your arena card
            </h2>
            <p className="mt-3 max-w-lg text-xs leading-relaxed text-zinc-400 sm:text-sm">
              Choose a fixture, call at least three markets, and enter a
              head-to-head duel backed by USDC.
            </p>
          </div>

          <div className="grid w-full grid-cols-3 border border-white/10">
            <ArenaStat label="Open" value={eventSummary.open} accent />
            <ArenaStat label="Settled" value={eventSummary.settled} />
            <ArenaStat
              label="Volume"
              value={formatCompactCurrency(eventSummary.volume)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-[#252525] bg-[#0b0b0b] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-1" aria-label="Matchup filters">
          {(
            [
              ["open", "Open", eventSummary.open],
              ["settled", "Results", eventSummary.settled],
              ["all", "All", pvpEvents.length],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setEventFilter(value)}
              aria-pressed={eventFilter === value}
              className={`relative px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
                eventFilter === value
                  ? "text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {label} <span className="opacity-50">{count}</span>
              {eventFilter === value && (
                <span className="absolute inset-x-3 -bottom-3 h-0.5 bg-brand-accent" />
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-60">
          <input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full border border-[#2a2a2a] bg-[#121212] pl-3 pr-9 text-xs text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-brand-accent"
          />
          <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ash" />
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto p-4 no-scrollbar sm:p-5">
        {filteredEvents.length === 0 ? (
          <div className="w-full border border-dashed border-[#2a2a2a] py-8 text-center font-mono text-xs uppercase tracking-wider text-zinc-500">
            No matchups in this slate.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const isSelected = selectedPvpEventId
              ? evt.id === selectedPvpEventId
              : pvpEvents[0]?.id === evt.id

            const { isClosed, label: statusLabel } = getCardTimeStatus(evt)
            const vol = getEventVolume(evt)
            const formattedDate = formatEventDate(evt)
            const { teamA, teamB } = parseEventTeams(evt.question)

            return (
              <div
                key={evt.id}
                ref={isSelected ? selectedRef : undefined}
                onClick={() => setSelectedPvpEventId(evt.id)}
                className={`group relative flex h-40 w-70 flex-none cursor-pointer select-none flex-col justify-between overflow-hidden border p-4 transition-all ${
                  isSelected
                    ? "border-brand-accent bg-[#151515] text-white shadow-lg"
                    : "border-[#282828] bg-[#111111] text-white hover:border-brand-accent"
                } ${isClosed && !isSelected ? "opacity-75" : ""}`}
              >
                <span
                  className={`absolute inset-y-0 left-0 w-1 ${
                    isSelected ? "bg-brand-accent" : "bg-transparent"
                  }`}
                />
                {/* Top Badge Row */}
                <div className="flex items-center justify-between">
                  <div
                    className={`flex items-center gap-1 text-[9px] font-bold font-mono tracking-[0.14em] ${
                      isClosed
                        ? "text-zinc-500"
                        : isSelected
                          ? "text-zinc-300"
                          : "text-emerald-400"
                    }`}
                  >
                    {isClosed ? (
                      <>
                        <Lock className="h-2.5 w-2.5" />
                        {statusLabel}
                      </>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 bg-emerald-500 animate-pulse" />
                        {statusLabel}
                      </>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold ${isSelected ? "text-zinc-400" : "text-zinc-500"}`}
                  >
                    ${vol.toLocaleString()}
                  </span>
                </div>

                {/* Teams/Flags Content */}
                <div className="my-2 flex items-center justify-between gap-2">
                  <div className="flex flex-col items-center flex-1 text-center min-w-0">
                    <span className="text-2xl" title={teamA}>
                      {getCountryFlag(teamA)}
                    </span>
                    <span className="mt-1.5 w-full truncate font-heading text-sm font-black uppercase leading-snug">
                      {teamA}
                    </span>
                  </div>

                  <span className="shrink-0 px-1 font-mono text-[9px] font-semibold uppercase opacity-40">
                    vs
                  </span>

                  <div className="flex flex-col items-center flex-1 text-center min-w-0">
                    <span className="text-2xl" title={teamB}>
                      {getCountryFlag(teamB)}
                    </span>
                    <span className="mt-1.5 w-full truncate font-heading text-sm font-black uppercase leading-snug">
                      {teamB}
                    </span>
                  </div>
                </div>

                {/* Footer Details */}
                <div className="flex shrink-0 items-center justify-between border-t border-dashed border-zinc-800/80 pt-2 font-mono text-[9px]">
                  <span
                    className={isSelected ? "text-zinc-400" : "text-zinc-500"}
                  >
                    {formattedDate}
                  </span>
                  <span
                    className={`flex items-center gap-1 font-bold uppercase ${
                      isSelected
                        ? "text-brand-accent"
                        : "text-zinc-300 group-hover:text-brand-accent"
                    }`}
                  >
                    {isClosed ? "View result" : "Build card"}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>

                {/* Selected Check Badge Badge */}
                {isSelected && (
                  <div className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center bg-brand-accent text-white shadow-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-2.5 w-2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

function ArenaStat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className="min-w-20 border-r border-white/10 px-3 py-2.5 last:border-r-0 sm:min-w-24 sm:px-4">
      <span
        className={`block font-heading text-xl font-black sm:text-2xl ${
          accent ? "text-brand-accent" : ""
        }`}
      >
        {value}
      </span>
      <span className="block text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </span>
    </div>
  )
}

function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${Math.round(value)}`
}
