"use client"

import { useState, useEffect } from "react"
import { apiRequest } from "@/store/apiClient"
import { io } from "socket.io-client"
import { toast } from "react-hot-toast"
import AdminShell from "@/components/AdminShell"
import BalancesCard from "@/components/BalancesCard"
import MarketsTable from "@/components/MarketsTable"
import CreateMarketDrawer from "@/components/CreateMarketDrawer"
import ResolveMarketDrawer from "@/components/ResolveMarketDrawer"

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
  proposedOutcomeIndex?: number | null
  proposedAt?: string | null
  disputeWindowSeconds?: number
  resolvedOutcome?: string | null
}

interface AdminMetrics {
  users: {
    total: number
    real: number
    bots: number
  }
}

export default function AdminHomePage() {
  // Markets state
  const [markets, setMarkets] = useState<Market[]>([])
  const [marketsLoading, setMarketsLoading] = useState(false)

  // Filter & Search & Sort states
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Drawers open/close states
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)
  const [isResolveDrawerOpen, setIsResolveDrawerOpen] = useState(false)

  // Metrics Data State
  const [metricsData, setMetricsData] = useState<AdminMetrics | null>(null)

  // Arbitration / Settle State
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null)
  const [winningOutcome, setWinningOutcome] = useState<string>("YES")

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!selectedMarketId) return
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [selectedMarketId])

  // Fetch metrics for header counts
  async function fetchMetricsData() {
    try {
      const data = await apiRequest<AdminMetrics>("/pvp/admin-metrics?timeframe=7d")
      setMetricsData(data)
    } catch (err: any) {
      console.error("Failed to load header stats:", err)
    }
  }

  // Fetch standard & PvP child markets for moderation
  async function fetchMarkets() {
    setMarketsLoading(true)
    try {
      const data = await apiRequest<any[]>("/markets?admin=true")
      const parsed: Market[] = data.map((item: any) => ({
        id: item.id || item._id,
        question: item.question,
        category: item.category,
        deadline: item.deadline,
        status: item.status,
        resolutionSource: item.resolutionSource || item.resolution_source,
        yesCondition: item.yesCondition || item.yes_condition,
        noCondition: item.noCondition || item.no_condition,
        outcomes: item.outcomes || [],
        outcomeCount: item.outcomeCount ?? 2,
        proposalReasoning: item.proposalReasoning || item.proposal_reasoning,
        proposalCitations: item.proposalCitations || item.proposal_citations,
        proposalProposer: item.proposalProposer || item.proposal_proposer,
        proposalDisputer: item.proposalDisputer || item.proposal_disputer,
        disputed: item.disputed ?? false,
        proposedOutcome: item.proposedOutcome ?? null,
        proposedAt: item.proposedAt || item.proposed_at || null,
        disputeWindowSeconds: item.disputeWindowSeconds ?? 120,
        resolvedOutcome: item.resolvedOutcome || item.resolved_outcome || null,
      }))
      setMarkets(parsed)
    } catch (err: any) {
      toast.error(err.message || "Failed to load markets.")
    } finally {
      setMarketsLoading(false)
    }
  }

  // Real-time socket updates listener
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("verity_admin_auth_token") : null
    if (!token) return

    void fetchMarkets()
    void fetchMetricsData()

    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5080"
    const socket = io(`${socketUrl}/socket`, {
      transports: ["websocket"],
    })

    socket.on("connect", () => {
      socket.emit("join-room", "feed")
    })

    socket.on("feed-updated", () => {
      void fetchMetricsData()
      void fetchMarkets()
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // Approve Qualified prediction market
  async function handleApproveTrading(marketId: string) {
    try {
      await apiRequest(`/markets/${marketId}/approve-trading`, {
        method: "POST",
      })
      toast.success("Market approved for trading!")
      void fetchMarkets()
      void fetchMetricsData()
    } catch (err: any) {
      toast.error(err.message || "Failed to approve market.")
    }
  }

  const handleOpenArbitrateResolve = (market: Market) => {
    setSelectedMarketId(market.id)
    const outcomes =
      market.outcomes && market.outcomes.length > 0
        ? market.outcomes
        : ["YES", "NO"]
    setWinningOutcome(outcomes[0])
    setIsResolveDrawerOpen(true)
  }

  return (
    <AdminShell>
      {/* Quick Stats Top Row */}
      <BalancesCard
        totalUsers={metricsData?.users?.real || 0}
        totalMarkets={markets.length}
        activeTab="moderation"
        onOpenCreateDrawer={() => setIsCreateDrawerOpen(true)}
      />

      {/* Moderation Table */}
      <MarketsTable
        marketsLoading={marketsLoading}
        markets={markets}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        itemsPerPage={itemsPerPage}
        fetchMarkets={fetchMarkets}
        handleApproveTrading={handleApproveTrading}
        handleOpenArbitrateResolve={handleOpenArbitrateResolve}
      />

      {/* Create PvP Match Drawer with Live Premier League Schedule Integration */}
      <CreateMarketDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        fetchMarkets={fetchMarkets}
        fetchAdminStatus={() => {}}
        fetchMetricsData={fetchMetricsData}
      />

      {/* Arbitrate Resolve Drawer */}
      <ResolveMarketDrawer
        isOpen={isResolveDrawerOpen}
        onClose={() => setIsResolveDrawerOpen(false)}
        selectedMarketId={selectedMarketId}
        markets={markets}
        fetchMarkets={fetchMarkets}
        fetchAdminStatus={() => {}}
        fetchMetricsData={fetchMetricsData}
        winningOutcome={winningOutcome}
        setWinningOutcome={setWinningOutcome}
        now={now}
      />
    </AdminShell>
  )
}
