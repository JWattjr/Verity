"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trophy,
  Swords,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react"

export interface ChildMarket {
  id: string
  question: string
  optionName?: string
  category: string
  status: string
  deadline: string
  yesCondition?: string
  noCondition?: string
  outcomes?: string[]
  outcomeCount?: number
  resolvedOutcome?: string | null
  liquidity: number
}

export interface FixtureMarket {
  id: string
  question: string
  category: string
  deadline: string
  status: string
  resolutionSource?: string
  yesCondition?: string
  noCondition?: string
  outcomes?: string[]
  outcomeCount?: number
  resolvedOutcome?: string | null
  liquidity: number
  propositionsCount: number
  resolvedPropositionsCount: number
  marketType: "parent" | "binary" | "child"
  childMarkets?: ChildMarket[]
}

interface MarketsTableProps {
  marketsLoading: boolean
  markets: FixtureMarket[]
  searchQuery: string
  setSearchQuery: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  sortBy: string
  setSortBy: (val: string) => void
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  itemsPerPage: number
  fetchMarkets: () => void
  handleApproveTrading: (id: string) => void
  handleOpenBatchResolve: (fixtureId: string) => void
  handleOpenSingleResolve?: (marketId: string) => void
}

function parseFixtureTeams(question: string): { teamA: string; teamB: string } {
  const clean = question.split("-")[0].split(":")[0].trim()
  const vsMatch = clean.match(/^(.+?)\s+(?:vs\.?|v)\s+(.+?)$/i)
  if (vsMatch) {
    return {
      teamA: vsMatch[1].trim(),
      teamB: vsMatch[2].trim(),
    }
  }
  return { teamA: "Team A", teamB: "Team B" }
}

export default function MarketsTable({
  marketsLoading,
  markets,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  fetchMarkets,
  handleApproveTrading,
  handleOpenBatchResolve,
}: MarketsTableProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Filter and sort grouped fixture markets
  const filteredAndSortedMarkets = useMemo(() => {
    let result = [...markets]

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (m) =>
          m.question.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.childMarkets &&
            m.childMarkets.some(
              (c) =>
                c.question.toLowerCase().includes(q) ||
                (c.optionName && c.optionName.toLowerCase().includes(q)),
            )),
      )
    }

    // Status filtering
    if (statusFilter !== "all") {
      result = result.filter((m) => m.status === statusFilter)
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return b.id.localeCompare(a.id)
      } else if (sortBy === "oldest") {
        return a.id.localeCompare(b.id)
      } else if (sortBy === "deadline-soon") {
        const timeA = new Date(a.deadline).getTime()
        const timeB = new Date(b.deadline).getTime()
        return timeA - timeB
      } else if (sortBy === "deadline-far") {
        const timeA = new Date(a.deadline).getTime()
        const timeB = new Date(b.deadline).getTime()
        return timeB - timeA
      }
      return 0
    })

    return result
  }, [markets, searchQuery, statusFilter, sortBy])

  // Paginated subset
  const paginatedMarkets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedMarkets.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedMarkets, currentPage, itemsPerPage])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedMarkets.length / itemsPerPage),
  )

  return (
    <div className="verity-card bg-white border border-stone-200 shadow-xs overflow-hidden flex flex-col rounded-[2px]">
      {/* Header with Search and Filter panel */}
      <div className="p-5 border-b border-stone-200 bg-stone-50/50 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Game Fixtures & Proposition Moderation
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              All child propositions (Match Winner, Over/Under, BTTS, Corners, Cards) grouped per match fixture.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto self-stretch md:self-auto justify-end">
            <button
              onClick={fetchMarkets}
              disabled={marketsLoading}
              className="h-9 w-9 rounded-[2px] hover:bg-stone-100 bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-950 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw
                className={`h-4 w-4 ${marketsLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search query input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search fixtures, teams, propositions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 border border-stone-200 bg-white text-xs rounded-[2px] outline-none focus:border-indigo-500 transition-colors placeholder:text-stone-400"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 bg-white border border-stone-200 px-2.5 rounded-[2px] h-9">
            <Filter className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 bg-transparent text-xs outline-none text-stone-700 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="tradable">Tradable / Active</option>
              <option value="qualified">Qualified / Pre-Market</option>
              <option value="closed">Closed / Live</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2 bg-white border border-stone-200 px-2.5 rounded-[2px] h-9">
            <ArrowUpDown className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 bg-transparent text-xs outline-none text-stone-700 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="deadline-soon">Kickoff (Soonest)</option>
              <option value="deadline-far">Kickoff (Furthest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grouped Fixtures Table / List */}
      {marketsLoading && markets.length === 0 ? (
        <div className="p-16 text-center text-sm text-stone-500 animate-pulse font-medium">
          Loading game fixtures...
        </div>
      ) : filteredAndSortedMarkets.length === 0 ? (
        <div className="p-16 text-center text-sm text-stone-400 font-medium">
          No matching match fixtures found.
        </div>
      ) : (
        <div className="flex-1 divide-y divide-stone-200">
          {paginatedMarkets.map((fixture) => {
            const isExpanded = Boolean(expandedIds[fixture.id])
            const { teamA, teamB } = parseFixtureTeams(fixture.question)
            const children = fixture.childMarkets || []
            const isPvp = fixture.category?.toLowerCase() === "pvp" || fixture.marketType === "parent"

            return (
              <div key={fixture.id} className="transition-colors bg-white hover:bg-stone-50/40">
                {/* Master Game Row */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Match Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-[2px] border border-stone-200 bg-stone-100 flex items-center justify-center text-stone-700">
                      {isPvp ? (
                        <Swords className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <Trophy className="h-5 w-5 text-amber-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-[2px]">
                          {fixture.category || "Premier League"}
                        </span>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase ${
                            fixture.status === "tradable"
                              ? "bg-emerald-100 text-emerald-800"
                              : fixture.status === "qualified"
                                ? "bg-blue-100 text-blue-800"
                                : fixture.status === "closed"
                                  ? "bg-amber-100 text-amber-800"
                                  : fixture.status === "resolved"
                                    ? "bg-stone-200 text-stone-700"
                                    : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {fixture.status}
                        </span>
                        {fixture.resolvedOutcome && (
                          <span className="font-mono text-[9px] font-bold uppercase bg-stone-100 text-stone-700 px-2 py-0.5 rounded-[2px]">
                            Winner: {fixture.resolvedOutcome}
                          </span>
                        )}
                      </div>

                      <h4 className="font-heading text-base font-bold text-stone-900 leading-snug truncate">
                        {fixture.question}
                      </h4>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Kickoff: {new Date(fixture.deadline).toLocaleString()}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-indigo-600 font-semibold">
                          <Layers className="h-3 w-3" />
                          {children.length} Propositions (
                          {children.filter((c) => c.status === "resolved").length}/
                          {children.length} Resolved)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Master Action Bar */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    {children.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpand(fixture.id)}
                        className="gap-1.5 font-mono text-xs rounded-[2px] border-stone-200 bg-white cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Hide Propositions
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            View Propositions ({children.length})
                          </>
                        )}
                      </Button>
                    )}

                    {fixture.status === "qualified" && (
                      <Button
                        onClick={() => handleApproveTrading(fixture.id)}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-[2px] text-xs cursor-pointer shadow-xs"
                      >
                        Approve Trading
                      </Button>
                    )}

                    {fixture.status !== "resolved" && (
                      <Button
                        onClick={() => handleOpenBatchResolve(fixture.id)}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs gap-1.5 rounded-[2px] shadow-xs cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                        Resolve Match
                      </Button>
                    )}

                    {fixture.status === "resolved" && (
                      <span className="font-mono text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-[2px] border border-emerald-100">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Settled
                      </span>
                    )}
                  </div>
                </div>

                {/* Expandable Sub-Propositions Drawer List */}
                {isExpanded && children.length > 0 && (
                  <div className="bg-stone-50 border-t border-stone-200 p-4 space-y-2">
                    <div className="flex items-center justify-between pb-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        Nested Sub-Propositions ({children.length})
                      </span>
                      <span className="text-[11px] text-stone-500 font-mono">
                        Auto-resolved simultaneously via Match Resolution Hub
                      </span>
                    </div>

                    <div className="rounded-[2px] border border-stone-200 bg-white divide-y divide-stone-100 overflow-hidden">
                      {children.map((child, idx) => (
                        <div
                          key={child.id}
                          className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-stone-50/50"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-[9px] font-bold uppercase text-stone-400 bg-stone-100 px-2 py-0.5 rounded-[2px] shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-stone-800 truncate">
                              {child.optionName || child.question}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 font-mono text-[9px] font-bold uppercase rounded-[2px] ${
                                child.status === "resolved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {child.status === "resolved"
                                ? `Resolved: ${child.resolvedOutcome}`
                                : child.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {filteredAndSortedMarkets.length > 0 && (
        <div className="p-4 border-t border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span className="text-stone-500">
            Showing{" "}
            <strong>
              {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(
                currentPage * itemsPerPage,
                filteredAndSortedMarkets.length,
              )}
            </strong>{" "}
            of <strong>{filteredAndSortedMarkets.length}</strong> game fixtures
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="h-8 px-2 rounded-[2px] text-xs cursor-pointer border border-stone-200 bg-white"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
            </Button>

            <span className="px-3 py-1 font-mono font-semibold text-stone-700">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              className="h-8 px-2 rounded-[2px] text-xs cursor-pointer border border-stone-200 bg-white"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
