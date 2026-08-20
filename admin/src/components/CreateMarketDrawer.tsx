"use client"

import { useState, useMemo, useEffect } from "react"
import { apiRequest } from "@/store/apiClient"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Swords,
  Flag,
  Trophy,
  Target,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Minus,
  Calendar,
  RefreshCw,
  Sparkles,
  ChevronRight,
} from "lucide-react"

interface CategoryState {
  enabled: boolean
  line?: number
}

interface EplFixture {
  id: number
  gameweek: number
  homeTeam: string
  awayTeam: string
  homeTeamShort: string
  awayTeamShort: string
  homeTeamLogo?: string
  awayTeamLogo?: string
  question: string
  score?: string | null
  status?: string
  kickoffTime: string
  lockTime: string
  deadline: string
  resolutionSource: string
  leagueName?: string
}

interface CreateMarketDrawerProps {
  isOpen: boolean
  onClose: () => void
  fetchMarkets: () => void
  fetchAdminStatus: () => void
  fetchMetricsData: () => void
}

const CORNER_LINES = [6.5, 7.5, 8.5, 9.5, 10.5]
const GOAL_LINES = [0.5, 1.5, 2.5, 3.5, 4.5]
const CARD_LINES = [2.5, 3.5, 4.5, 5.5, 6.5]
const OFFSIDE_LINES = [0.5, 1.5, 2.5, 3.5, 4.5]

function parseTeams(question: string): { teamA: string; teamB: string } {
  const vsMatch = question.match(/(.+?)\s+vs\.?\s+(.+)/i)
  if (vsMatch) return { teamA: vsMatch[1].trim(), teamB: vsMatch[2].trim() }
  const dashMatch = question.match(/(.+?)\s+-\s+(.+)/)
  if (dashMatch)
    return { teamA: dashMatch[1].trim(), teamB: dashMatch[2].trim() }
  return { teamA: "Team A", teamB: "Team B" }
}

function toLocalDatetimeInputString(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function CreateMarketDrawer({
  isOpen,
  onClose,
  fetchMarkets,
  fetchAdminStatus,
  fetchMetricsData,
}: CreateMarketDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [pvpQuestion, setPvpQuestion] = useState("")
  const [pvpDeadline, setPvpDeadline] = useState("")
  const [pvpLockTime, setPvpLockTime] = useState("")
  const [pvpResolutionSource, setPvpResolutionSource] = useState(
    "Premier League Official / BBC Sport",
  )

  // EPL Schedule state
  const [scheduleType, setScheduleType] = useState<"upcoming" | "finished">(
    "upcoming",
  )
  const [fixtures, setFixtures] = useState<EplFixture[]>([])
  const [fixturesLoading, setFixturesLoading] = useState(false)
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(
    null,
  )

  // 9 Category-based proposition builder state
  const [categories, setCategories] = useState<Record<string, CategoryState>>({
    winner: { enabled: true },
    firstScore: { enabled: true },
    redCard: { enabled: true },
    corners: { enabled: false, line: 9.5 },
    goals: { enabled: true, line: 2.5 },
    cards: { enabled: true, line: 3.5 },
    btts: { enabled: true },
    offsides: { enabled: false, line: 3.5 },
  })

  // Custom propositions
  const [customOptions, setCustomOptions] = useState<string[]>([])
  const [customOptionText, setCustomOptionText] = useState("")

  // Fetch EPL schedule when drawer opens or type changes
  async function loadEplSchedule(type: "upcoming" | "finished" = scheduleType) {
    setFixturesLoading(true)
    try {
      const data = await apiRequest<{
        league: string
        count: number
        fixtures: EplFixture[]
      }>(`/pvp/schedule/premier-league?type=${type}`)
      setFixtures(data.fixtures || [])
    } catch (err: any) {
      toast.error(err.message || "Failed to load the API-Football schedule.")
    } finally {
      setFixturesLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      void loadEplSchedule(scheduleType)
    }
  }, [isOpen, scheduleType])

  // Select fixture from live schedule
  function handleSelectFixture(fixture: EplFixture) {
    setSelectedFixtureId(fixture.id)
    setPvpQuestion(fixture.question)
    setPvpLockTime(toLocalDatetimeInputString(fixture.lockTime))
    setPvpDeadline(toLocalDatetimeInputString(fixture.deadline))
    setPvpResolutionSource(
      fixture.resolutionSource || "Premier League Official / BBC Sport",
    )
    setCategories({
      winner: { enabled: true },
      firstScore: { enabled: true },
      redCard: { enabled: true },
      corners: { enabled: false, line: 9.5 },
      goals: { enabled: true, line: 2.5 },
      cards: { enabled: true, line: 3.5 },
      btts: { enabled: true },
      offsides: { enabled: false, line: 3.5 },
    })
    toast.success(`Selected ${fixture.question}! Match options pre-configured.`)
  }

  // Group fixtures by gameweek
  const groupedFixtures = useMemo(() => {
    const groups: Record<number, EplFixture[]> = {}
    for (const f of fixtures) {
      const gw = f.gameweek || 1
      if (!groups[gw]) groups[gw] = []
      groups[gw].push(f)
    }
    return groups
  }, [fixtures])

  // Parse team names from question
  const { teamA, teamB } = useMemo(() => parseTeams(pvpQuestion), [pvpQuestion])
  const hasTeams = pvpQuestion.trim().length > 0

  // Build propositions from enabled categories (9 standard categories)
  const generatedOptions = useMemo(() => {
    const opts: string[] = []
    const a = hasTeams ? teamA : "Team A"
    const b = hasTeams ? teamB : "Team B"

    // 1. Match Winner (3 options)
    if (categories.winner?.enabled) {
      opts.push(`${a} wins the match`)
      opts.push(`Match ends in a draw`)
      opts.push(`${b} wins the match`)
    }

    // 3. First Team to Score (3 options)
    if (categories.firstScore?.enabled) {
      opts.push(`${a} scores first goal`)
      opts.push(`No goal in the match`)
      opts.push(`${b} scores first goal`)
    }

    // 4. Red Card (2 options)
    if (categories.redCard?.enabled) {
      opts.push(`Red Card in Match - Yes`)
      opts.push(`Red Card in Match - No`)
    }

    // 5. Corners (2 options)
    if (categories.corners?.enabled) {
      const line = categories.corners.line ?? 9.5
      opts.push(`Total Corners Over ${line}`)
      opts.push(`Total Corners Under ${line}`)
    }

    // 6. Goals (2 options)
    if (categories.goals?.enabled) {
      const line = categories.goals.line ?? 2.5
      opts.push(`Total Goals Over ${line}`)
      opts.push(`Total Goals Under ${line}`)
    }

    // 7. Yellow Cards (2 options)
    if (categories.cards?.enabled) {
      const line = categories.cards.line ?? 3.5
      opts.push(`Total Yellow Cards Over ${line}`)
      opts.push(`Total Yellow Cards Under ${line}`)
    }

    // 8. Both Teams to Score (2 options)
    if (categories.btts?.enabled) {
      opts.push(`Both Teams To Score - Yes`)
      opts.push(`Both Teams To Score - No`)
    }

    // 9. Offsides (2 options)
    if (categories.offsides?.enabled) {
      const line = categories.offsides.line ?? 3.5
      opts.push(`Total Offsides Over ${line}`)
      opts.push(`Total Offsides Under ${line}`)
    }

    return [...opts, ...customOptions]
  }, [categories, customOptions, teamA, teamB, hasTeams])

  const actualMarketsCount = useMemo(() => {
    let count = 0
    if (categories.winner?.enabled) count += 1
    if (categories.firstScore?.enabled) count += 1
    if (categories.redCard?.enabled) count += 1
    if (categories.corners?.enabled) count += 1
    if (categories.goals?.enabled) count += 1
    if (categories.cards?.enabled) count += 1
    if (categories.btts?.enabled) count += 1
    if (categories.offsides?.enabled) count += 1
    count += customOptions.length
    return count
  }, [categories, customOptions])

  function toggleCategory(catKey: string) {
    setCategories((prev) => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        enabled: !prev[catKey]?.enabled,
      },
    }))
  }

  function setCategoryLine(catKey: string, line: number) {
    setCategories((prev) => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        line,
      },
    }))
  }

  function handleAddCustomOption() {
    if (!customOptionText.trim()) return
    setCustomOptions([...customOptions, customOptionText.trim()])
    setCustomOptionText("")
  }

  function handleRemoveCustomOption(index: number) {
    setCustomOptions(customOptions.filter((_, i) => i !== index))
  }

  async function handleDeployPvpEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!pvpQuestion.trim() || !pvpDeadline || !pvpResolutionSource.trim()) {
      toast.error("Please fill all required match fields.")
      return
    }

    if (
      generatedOptions.length < 3 ||
      generatedOptions.some((opt) => !opt.trim())
    ) {
      toast.error("You must enable options for at least 3 propositions.")
      return
    }

    setLoading(true)
    try {
      await apiRequest("/pvp/events", {
        method: "POST",
        body: JSON.stringify({
          question: pvpQuestion.trim(),
          deadline: new Date(pvpDeadline).toISOString(),
          lockTime: pvpLockTime
            ? new Date(pvpLockTime).toISOString()
            : undefined,
          resolutionSource: pvpResolutionSource.trim(),
          apiFootballFixtureId: selectedFixtureId || undefined,
          options: generatedOptions.map((opt) => opt.trim()),
        }),
      })
      toast.success(
        `Successfully deployed PvP Duel Event: ${pvpQuestion} with ${actualMarketsCount} propositions!`,
      )
      setPvpQuestion("")
      setPvpDeadline("")
      setPvpLockTime("")
      setSelectedFixtureId(null)
      setCustomOptions([])
      onClose()
      void fetchMarkets()
      void fetchAdminStatus()
      void fetchMetricsData()
    } catch (err: any) {
      toast.error(err.message || "Failed to deploy event.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer
      direction="right"
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
    >
      <DrawerContent className="fixed inset-y-0 right-0 z-50 flex h-full flex-col bg-white border-l border-stone-200 shadow-2xl overflow-y-auto w-full sm:w-[750px] sm:min-w-[700px] p-6 rounded-none">
        <DrawerHeader className="px-0 pt-0 pb-4 border-b border-stone-150">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Swords className="h-5 w-5 text-indigo-600" />
                Create Football Duel Match
              </DrawerTitle>
              <DrawerDescription className="text-xs text-stone-500 mt-1">
                Select a genuine API-Football fixture from the available date
                window or enter custom details.
              </DrawerDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadEplSchedule(scheduleType)}
              disabled={fixturesLoading}
              className="h-8 px-2.5 rounded text-xs border border-stone-200 cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${fixturesLoading ? "animate-spin" : ""}`}
              />
              Refresh Schedule
            </Button>
          </div>
        </DrawerHeader>

        <form
          onSubmit={handleDeployPvpEvent}
          className="flex flex-col gap-5 py-4"
        >
          {/* Live Premier League Schedule Selector */}
          <div className="flex flex-col gap-2.5 p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                API-Football Fixture Schedule Feed
              </span>

              {/* Feed Type Switcher */}
              <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded border border-indigo-200">
                <button
                  type="button"
                  onClick={() => setScheduleType("upcoming")}
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer ${
                    scheduleType === "upcoming"
                      ? "bg-indigo-600 text-white shadow-2xs font-black"
                      : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  Upcoming (7 Days)
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType("finished")}
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer ${
                    scheduleType === "finished"
                      ? "bg-emerald-600 text-white shadow-2xs font-black"
                      : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  Finished (Instant Oracle Test)
                </button>
              </div>
            </div>

            {fixturesLoading && fixtures.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400 font-medium animate-pulse font-mono">
                Loading fixtures from API-Football feed...
              </div>
            ) : fixtures.length === 0 ? (
              <div className="py-4 text-center text-xs text-stone-500">
                No fixtures found in this category. Click refresh or enter match
                details manually below.
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 max-h-60 overflow-y-auto pr-1">
                {Object.entries(groupedFixtures).map(([gw, gwFixtures]) => (
                  <div key={gw} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 px-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                        {scheduleType === "finished"
                          ? `Finished · Round ${gw}`
                          : `Round ${gw}`}
                      </span>
                      <div className="h-px bg-indigo-100 flex-1" />
                      <span className="text-[10px] text-stone-400 font-mono">
                        {gwFixtures.length}{" "}
                        {gwFixtures.length === 1 ? "match" : "matches"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {gwFixtures.map((f) => {
                        const isSelected = selectedFixtureId === f.id
                        const kickDate = new Date(f.kickoffTime)
                        const timeFormatted = kickDate.toLocaleDateString(
                          undefined,
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )

                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => handleSelectFixture(f)}
                            className={`p-2.5 text-left rounded border transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                                : "bg-white border-stone-200 hover:border-indigo-300 hover:bg-white text-stone-800"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 font-bold text-xs">
                                <span className="truncate">{f.homeTeam}</span>
                                <span
                                  className={
                                    isSelected
                                      ? "text-indigo-200 text-[10px]"
                                      : "text-stone-400 text-[10px]"
                                  }
                                >
                                  vs
                                </span>
                                <span className="truncate">{f.awayTeam}</span>
                                {f.score && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black ${isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}
                                  >
                                    {f.score}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={`max-w-28 truncate text-[10px] font-semibold ${
                                    isSelected
                                      ? "text-indigo-100"
                                      : "text-stone-500"
                                  }`}
                                >
                                  {f.leagueName || "Competition"}
                                </span>
                                <span
                                  className={`text-[10px] font-mono ${isSelected ? "text-indigo-100" : "text-stone-400"}`}
                                >
                                  {timeFormatted}
                                </span>
                                <span
                                  className={`text-[9px] font-mono px-1 rounded ${isSelected ? "bg-white/10 text-white" : "bg-stone-100 text-stone-500"}`}
                                >
                                  ID #{f.id}
                                </span>
                              </div>
                            </div>
                            <ChevronRight
                              className={`h-4 w-4 shrink-0 ${isSelected ? "text-white" : "text-stone-300"}`}
                            />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Core Event Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Match Title (Team A vs Team B) *
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Arsenal vs Chelsea"
                value={pvpQuestion}
                onChange={(e) => setPvpQuestion(e.target.value)}
                className="w-full h-10 px-3 border border-stone-200 bg-white text-sm font-semibold rounded outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Kickoff & Lock Time (Betting closes) *
              </label>
              <input
                required
                type="datetime-local"
                value={pvpLockTime}
                onChange={(e) => setPvpLockTime(e.target.value)}
                className="w-full h-10 px-3 border border-stone-200 bg-white text-xs rounded outline-none focus:border-indigo-500 transition-colors font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Match End / Resolution Deadline *
              </label>
              <input
                required
                type="datetime-local"
                value={pvpDeadline}
                onChange={(e) => setPvpDeadline(e.target.value)}
                className="w-full h-10 px-3 border border-stone-200 bg-white text-xs rounded outline-none focus:border-indigo-500 transition-colors font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Resolution Oracle Source *
              </label>
              <input
                required
                type="text"
                value={pvpResolutionSource}
                onChange={(e) => setPvpResolutionSource(e.target.value)}
                className="w-full h-10 px-3 border border-stone-200 bg-white text-xs rounded outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Proposition Options Builder */}
          <div className="space-y-3 pt-2 border-t border-stone-150">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                  Duel Proposition Markets
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Toggle the proposition lines to generate for this match.
                </p>
              </div>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                {actualMarketsCount} Markets Configured (
                {generatedOptions.length} Options)
              </span>
            </div>

            {/* 1. Match Winner */}
            <CategoryCard
              title="Match Winner"
              subtitle="Win / Draw / Win"
              icon={<Trophy className="h-4 w-4" />}
              enabled={categories.winner.enabled}
              onToggle={() => toggleCategory("winner")}
              accentColor="indigo"
            >
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-indigo-50/30 border border-indigo-100">
                  <span className="text-[9px] font-bold uppercase text-stone-400">
                    Home
                  </span>
                  <span className="text-xs font-bold text-indigo-700 text-center truncate w-full">
                    {hasTeams ? teamA : "Team A"}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="text-[9px] font-bold uppercase text-stone-400">
                    Draw
                  </span>
                  <span className="text-xs font-bold text-stone-600 text-center">
                    Draw
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-indigo-50/30 border border-indigo-100">
                  <span className="text-[9px] font-bold uppercase text-stone-400">
                    Away
                  </span>
                  <span className="text-xs font-bold text-indigo-700 text-center truncate w-full">
                    {hasTeams ? teamB : "Team B"}
                  </span>
                </div>
              </div>
            </CategoryCard>

            {/* 3. First Team to Score */}
            <CategoryCard
              title="First Team to Score"
              subtitle="Team A / No Goal / Team B"
              icon={<Target className="h-4 w-4" />}
              enabled={categories.firstScore.enabled}
              onToggle={() => toggleCategory("firstScore")}
              accentColor="indigo"
            >
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-indigo-50/30 border border-indigo-100">
                  <span className="text-[9px] font-bold uppercase text-stone-400">
                    First Goal
                  </span>
                  <span className="text-xs font-bold text-indigo-700 text-center truncate w-full">
                    {hasTeams ? teamA : "Team A"}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="text-[9px] font-bold uppercase text-stone-400">
                    None
                  </span>
                  <span className="text-xs font-bold text-stone-600 text-center">
                    No Goal
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-indigo-50/30 border border-indigo-100">
                  <span className="text-[9px] font-bold uppercase text-stone-400">
                    First Goal
                  </span>
                  <span className="text-xs font-bold text-indigo-700 text-center truncate w-full">
                    {hasTeams ? teamB : "Team B"}
                  </span>
                </div>
              </div>
            </CategoryCard>

            {/* 4. Red Card */}
            <CategoryCard
              title="Red Card"
              subtitle="Red card shown in match"
              icon={<ShieldAlert className="h-4 w-4" />}
              enabled={categories.redCard.enabled}
              onToggle={() => toggleCategory("redCard")}
              accentColor="yellow"
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-yellow-50/30 border border-yellow-100">
                  <span className="text-[9px] font-bold uppercase text-stone-400">
                    Yes
                  </span>
                  <span className="text-xs font-bold text-yellow-700 text-center leading-tight">
                    Red card shown
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="text-[9px] font-bold uppercase text-stone-400">
                    No
                  </span>
                  <span className="text-xs font-bold text-stone-600 text-center leading-tight">
                    No red cards
                  </span>
                </div>
              </div>
            </CategoryCard>

            {/* 5. Corners */}
            <CategoryCard
              title="Corners"
              subtitle={`Over / Under ${categories.corners.line}`}
              icon={<Flag className="h-4 w-4" />}
              enabled={categories.corners.enabled}
              onToggle={() => toggleCategory("corners")}
              accentColor="emerald"
            >
              <div className="space-y-2">
                <span className="block text-[9px] font-bold uppercase text-stone-400">
                  Select line
                </span>
                <div className="flex gap-1.5">
                  {CORNER_LINES.map((line) => (
                    <button
                      key={line}
                      type="button"
                      onClick={() => setCategoryLine("corners", line)}
                      className={`flex-1 h-8 rounded text-xs font-bold transition-all border ${
                        categories.corners.line === line
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white border-stone-200 text-stone-600 hover:border-emerald-400 hover:text-emerald-600 cursor-pointer"
                      }`}
                    >
                      {line}
                    </button>
                  ))}
                </div>
              </div>
            </CategoryCard>

            {/* 6. Goals */}
            <CategoryCard
              title="Goals"
              subtitle={`Over / Under ${categories.goals.line}`}
              icon={<Target className="h-4 w-4" />}
              enabled={categories.goals.enabled}
              onToggle={() => toggleCategory("goals")}
              accentColor="amber"
            >
              <div className="space-y-2">
                <span className="block text-[9px] font-bold uppercase text-stone-400">
                  Select line
                </span>
                <div className="flex gap-1.5">
                  {GOAL_LINES.map((line) => (
                    <button
                      key={line}
                      type="button"
                      onClick={() => setCategoryLine("goals", line)}
                      className={`flex-1 h-8 rounded text-xs font-bold transition-all border ${
                        categories.goals.line === line
                          ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                          : "bg-white border-stone-200 text-stone-600 hover:border-amber-400 hover:text-amber-600 cursor-pointer"
                      }`}
                    >
                      {line}
                    </button>
                  ))}
                </div>
              </div>
            </CategoryCard>

            {/* 7. Yellow Cards */}
            <CategoryCard
              title="Yellow Cards"
              subtitle={`Over / Under ${categories.cards.line}`}
              icon={<AlertTriangle className="h-4 w-4" />}
              enabled={categories.cards.enabled}
              onToggle={() => toggleCategory("cards")}
              accentColor="yellow"
            >
              <div className="space-y-2">
                <span className="block text-[9px] font-bold uppercase text-stone-400">
                  Select line
                </span>
                <div className="flex gap-1.5">
                  {CARD_LINES.map((line) => (
                    <button
                      key={line}
                      type="button"
                      onClick={() => setCategoryLine("cards", line)}
                      className={`flex-1 h-8 rounded text-xs font-bold transition-all border ${
                        categories.cards.line === line
                          ? "bg-yellow-500 text-white border-yellow-500 shadow-xs"
                          : "bg-white border-stone-200 text-stone-600 hover:border-yellow-400 hover:text-yellow-600 cursor-pointer"
                      }`}
                    >
                      {line}
                    </button>
                  ))}
                </div>
              </div>
            </CategoryCard>

            {/* 8. Both Teams to Score */}
            <CategoryCard
              title="Both Teams to Score"
              subtitle="Both Teams to Score - Yes / No"
              icon={<Target className="h-4 w-4" />}
              enabled={categories.btts?.enabled}
              onToggle={() => toggleCategory("btts")}
              accentColor="indigo"
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-indigo-50/30 border border-indigo-100">
                  <span className="text-[9px] font-bold uppercase text-stone-400">
                    Yes
                  </span>
                  <span className="text-xs font-bold text-indigo-700 text-center leading-tight">
                    Yes (BTTS)
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="text-[9px] font-bold uppercase text-stone-400">
                    No
                  </span>
                  <span className="text-xs font-bold text-stone-600 text-center leading-tight">
                    No (BTTS)
                  </span>
                </div>
              </div>
            </CategoryCard>

            {/* 9. Offsides */}
            <CategoryCard
              title="Offsides"
              subtitle={`Over / Under ${categories.offsides?.line}`}
              icon={<Flag className="h-4 w-4" />}
              enabled={categories.offsides?.enabled}
              onToggle={() => toggleCategory("offsides")}
              accentColor="emerald"
            >
              <div className="space-y-2">
                <span className="block text-[9px] font-bold uppercase text-stone-400">
                  Select line
                </span>
                <div className="flex gap-1.5">
                  {OFFSIDE_LINES.map((line) => (
                    <button
                      key={line}
                      type="button"
                      onClick={() => setCategoryLine("offsides", line)}
                      className={`flex-1 h-8 rounded text-xs font-bold transition-all border ${
                        categories.offsides?.line === line
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white border-stone-200 text-stone-600 hover:border-emerald-400 hover:text-emerald-600 cursor-pointer"
                      }`}
                    >
                      {line}
                    </button>
                  ))}
                </div>
              </div>
            </CategoryCard>
          </div>

          {/* Custom Proposition Inputs */}
          <div className="space-y-2 pt-2 border-t border-stone-150">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Add Custom Proposition Option (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Over 5.5 Yellow Cards"
                value={customOptionText}
                onChange={(e) => setCustomOptionText(e.target.value)}
                className="flex-1 h-9 px-3 border border-stone-200 bg-white text-xs rounded outline-none focus:border-indigo-500 transition-colors"
              />
              <Button
                type="button"
                onClick={handleAddCustomOption}
                className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {customOptions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {customOptions.map((opt, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 text-stone-800 text-xs font-semibold rounded border border-stone-200"
                  >
                    {opt}
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomOption(i)}
                      className="text-stone-400 hover:text-red-600 cursor-pointer"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Deploy Preview Card */}
          {generatedOptions.length > 0 && (
            <div className="rounded bg-indigo-50/50 border border-indigo-100 p-3 text-[11px] text-indigo-950 flex flex-col gap-1">
              <span className="font-bold uppercase text-[9px] text-indigo-700 tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Match Deployment Summary
              </span>
              <div>
                Will create{" "}
                <strong>{actualMarketsCount} duel propositions</strong> (
                {generatedOptions.length} total betting outcomes) ready for
                predictors.
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-stone-150 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 border border-stone-200 text-stone-700 text-xs font-semibold uppercase tracking-wider rounded cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || generatedOptions.length < 3}
              className="flex-2 h-11 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {loading
                ? "Deploying Match..."
                : `Deploy Match (${actualMarketsCount} Propositions)`}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}

/* CategoryCard inline helper with original toggle switch */
interface CategoryCardProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  enabled: boolean
  onToggle: () => void
  accentColor: string
  children: React.ReactNode
}

function CategoryCard({
  title,
  subtitle,
  icon,
  enabled,
  onToggle,
  accentColor,
  children,
}: CategoryCardProps) {
  const colorMap: Record<
    string,
    { bg: string; border: string; text: string; toggle: string }
  > = {
    indigo: {
      bg: "bg-indigo-50/50",
      border: "border-indigo-200",
      text: "text-indigo-600",
      toggle: "bg-indigo-600",
    },
    emerald: {
      bg: "bg-emerald-50/50",
      border: "border-emerald-200",
      text: "text-emerald-600",
      toggle: "bg-emerald-600",
    },
    amber: {
      bg: "bg-amber-50/50",
      border: "border-amber-200",
      text: "text-amber-600",
      toggle: "bg-amber-500",
    },
    yellow: {
      bg: "bg-yellow-50/50",
      border: "border-yellow-200",
      text: "text-yellow-600",
      toggle: "bg-yellow-500",
    },
  }

  const colors = colorMap[accentColor] || colorMap.indigo

  return (
    <div
      className={`rounded border transition-all overflow-hidden ${
        enabled ? `${colors.bg} ${colors.border}` : "border-stone-200 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 gap-3 cursor-pointer group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`h-8 w-8 rounded flex items-center justify-center shrink-0 transition-colors ${
              enabled
                ? `${colors.toggle} text-white shadow-xs`
                : "bg-stone-100 text-stone-400 group-hover:text-stone-600"
            }`}
          >
            {icon}
          </div>
          <div className="text-left min-w-0">
            <span className="block text-sm font-bold text-stone-900 leading-tight">
              {title}
            </span>
            <span className="block text-[10px] text-stone-400 font-mono truncate mt-0.5">
              {subtitle}
            </span>
          </div>
        </div>

        <div
          className={`relative h-6 w-11 rounded-full shrink-0 transition-colors ${
            enabled ? colors.toggle : "bg-stone-200"
          }`}
        >
          <div
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </div>
      </button>

      <div
        className={`transition-all overflow-hidden ${
          enabled ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-3 pb-3">{children}</div>
      </div>
    </div>
  )
}
