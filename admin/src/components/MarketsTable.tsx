"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface Market {
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
  proposalReasoning?: string | null
  proposalCitations?: string[] | null
  proposalProposer?: string | null
  proposalDisputer?: string | null
  disputed?: boolean
  proposedOutcome?: boolean | null
  proposedAt?: string | null
  disputeWindowSeconds?: number
  resolvedOutcome?: string | null
}

interface MarketsTableProps {
  marketsLoading: boolean
  markets: Market[]
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
  handleOpenArbitrateResolve: (market: Market) => void
}

function formatResolvedOutcome(market: Market): string {
  if (!market.resolvedOutcome) return "None"
  const outcome = market.resolvedOutcome.trim()
  if (outcome !== "YES" && outcome !== "NO") {
    return outcome
  }

  const condition = outcome === "YES" ? market.yesCondition : market.noCondition
  if (!condition) return outcome

  const overMatch = condition.match(/over\s+(\d+(?:\.\d+)?)/i)
  if (overMatch) {
    return `Over ${overMatch[1]}`
  }

  const underMatch = condition.match(/under\s+(\d+(?:\.\d+)?)/i)
  if (underMatch) {
    return `Under ${underMatch[1]}`
  }

  const lowerCond = condition.toLowerCase()
  if (lowerCond.includes("red card")) {
    if (lowerCond.includes("at least one") || lowerCond.includes("yes")) {
      return "Red card shown"
    }
    if (lowerCond.includes("no red card") || lowerCond.includes("no red cards")) {
      return "No red card"
    }
  }

  if (lowerCond.includes("both teams to score") || lowerCond.includes("btts")) {
    if (lowerCond.endsWith("yes") || lowerCond.includes("- yes") || lowerCond.includes(" - yes")) {
      return "BTTS - Yes"
    }
    if (lowerCond.endsWith("no") || lowerCond.includes("- no") || lowerCond.includes(" - no")) {
      return "BTTS - No"
    }
  }

  return condition
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
  handleOpenArbitrateResolve,
}: MarketsTableProps) {
  // Filter and sort markets
  const filteredAndSortedMarkets = useMemo(() => {
    let result = [...markets]

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (m) =>
          m.question.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.resolutionSource && m.resolutionSource.toLowerCase().includes(q)),
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
              Prediction & Duel Moderation
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Moderate active prediction markets, monitor live matches, and settle outcomes.
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
              placeholder="Search markets question or ID..."
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
              <option value="open_for_votes">Open For Votes</option>
              <option value="resolving">Resolving</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
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
              <option value="deadline-soon">Deadline (Soonest)</option>
              <option value="deadline-far">Deadline (Furthest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Markets table content */}
      {marketsLoading && markets.length === 0 ? (
        <div className="p-16 text-center text-sm text-stone-500 animate-pulse font-medium">
          Loading markets...
        </div>
      ) : filteredAndSortedMarkets.length === 0 ? (
        <div className="p-16 text-center text-sm text-stone-400 font-medium">
          No matching markets found. Try updating your filters.
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Market Details</th>
                <th className="p-4">Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Oracle Source</th>
                <th className="p-4">Deadline</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedMarkets.map((market) => (
                <tr
                  key={market.id}
                  className="hover:bg-stone-50/50 transition-colors"
                >
                  <td className="p-4 max-w-sm">
                    <span className="block font-semibold text-stone-900 text-sm leading-snug">
                      {market.question}
                    </span>
                    <span className="text-[10px] text-stone-400 block mt-1 font-mono uppercase">
                      ID: {market.id}
                    </span>
                  </td>
                  <td className="p-4 align-middle">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase ${
                        market.category === "pvp"
                          ? "bg-purple-50 text-purple-700 border border-purple-100"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      }`}
                    >
                      {market.category === "pvp" ? "PvP Duel" : "Standard"}
                    </span>
                  </td>
                  <td className="p-4 align-middle">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase ${
                        market.status === "tradable"
                          ? "bg-emerald-100 text-emerald-800"
                          : market.status === "open_for_votes"
                            ? "bg-blue-100 text-blue-800"
                            : market.status === "resolving"
                              ? "bg-rose-100 text-rose-800"
                              : market.status === "resolved"
                                ? "bg-stone-200 text-stone-700"
                                : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {market.status}
                    </span>
                  </td>
                  <td className="p-4 align-middle text-stone-600 text-xs max-w-[150px] truncate">
                    {market.resolutionSource || "Oracle"}
                  </td>
                  <td className="p-4 align-middle text-stone-600 text-xs">
                    {new Date(market.deadline).toLocaleString()}
                  </td>
                  <td className="p-4 text-right align-middle">
                    <div className="flex items-center justify-end gap-2">
                      {market.status === "qualified" && (
                        <Button
                          onClick={() => handleApproveTrading(market.id)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-[2px] text-xs cursor-pointer shadow-xs transition-colors"
                        >
                          Approve Trading
                        </Button>
                      )}
                      {(market.status === "tradable" || market.status === "resolving") && (
                        <Button
                          onClick={() => handleOpenArbitrateResolve(market)}
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-[2px] text-xs cursor-pointer shadow-xs transition-colors"
                        >
                          Settle Market
                        </Button>
                      )}
                      {![
                        "qualified",
                        "tradable",
                        "resolving",
                      ].includes(market.status) && (
                        <span className="text-[10px] text-stone-400 font-mono uppercase pr-2">
                          {market.status === "resolved"
                            ? `Resolved (${formatResolvedOutcome(market)})`
                            : "No Actions"}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            of <strong>{filteredAndSortedMarkets.length}</strong> markets
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
