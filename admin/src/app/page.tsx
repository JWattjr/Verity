"use client"

import { useState, useEffect } from "react"
import { apiRequest } from "@/store/apiClient"
import { io } from "socket.io-client"
import { toast } from "react-hot-toast"
import AdminShell from "@/components/AdminShell"
import BalancesCard from "@/components/BalancesCard"
import MarketsTable, { FixtureMarket } from "@/components/MarketsTable"
import CreateMarketDrawer from "@/components/CreateMarketDrawer"
import ResolveMarketDrawer from "@/components/ResolveMarketDrawer"
import BatchResolveDrawer from "@/components/BatchResolveDrawer"

interface AdminMetrics {
  users: {
    total: number
    real: number
    bots: number
  }
}
export default function AdminHomePage() {
  // Grouped Fixtures state
  const [markets, setMarkets] = useState<FixtureMarket[]>([])
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
  const [isBatchResolveDrawerOpen, setIsBatchResolveDrawerOpen] = useState(false)

  // Metrics Data State
  const [metricsData, setMetricsData] = useState<AdminMetrics | null>(null)

  // Single Arbitration / Settle State (Legacy fallback)
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null)
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null)
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

  // Fetch grouped game fixtures with all child propositions
  async function fetchMarkets() {
    setMarketsLoading(true)
    try {
      const data = await apiRequest<FixtureMarket[]>("/markets/fixtures/grouped")
      setMarkets(data)
    } catch (err: any) {
      toast.error(err.message || "Failed to load fixtures.")
    } finally {
      setMarketsLoading(false)
    }
  }

  // Real-time socket updates listener
  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("verity_admin_auth_token")
        : null
    if (!token) return

    void fetchMarkets()
    void fetchMetricsData()

    const socketUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
      "http://localhost:5080"
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

  const handleOpenBatchResolve = (fixtureId: string) => {
    setSelectedFixtureId(fixtureId)
    setIsBatchResolveDrawerOpen(true)
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
        handleOpenBatchResolve={handleOpenBatchResolve}
      />

      {/* Create PvP Match Drawer with Live Premier League Schedule Integration */}
      <CreateMarketDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        fetchMarkets={fetchMarkets}
        fetchAdminStatus={() => {}}
        fetchMetricsData={fetchMetricsData}
      />

      {/* Batch Match Resolution Drawer */}
      <BatchResolveDrawer
        isOpen={isBatchResolveDrawerOpen}
        onClose={() => setIsBatchResolveDrawerOpen(false)}
        selectedFixtureId={selectedFixtureId}
        onSuccess={fetchMarkets}
      />
    </AdminShell>
  )
}
