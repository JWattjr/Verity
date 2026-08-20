"use client"

import { useState, useEffect, useMemo } from "react"
import { apiRequest } from "@/store/apiClient"
import { io } from "socket.io-client"
import {
  RefreshCw,
  Trophy,
  Swords,
  Users,
  Layers,
  Coins,
  BarChart4,
  TrendingUp,
  Activity,
  Send,
} from "lucide-react"
import AdminShell from "@/components/AdminShell"
import VolumeLineChart from "@/components/VolumeLineChart"
import UserActivityBarChart from "@/components/UserActivityBarChart"

interface AdminMetrics {
  users: {
    total: number
    real: number
    bots: number
  }
  pvpUsers: {
    submitted: {
      total: number
      real: number
      bots: number
    }
    played: {
      total: number
      real: number
      bots: number
    }
  }
  pvpMatchesCount: number
  volumeAndFees: {
    overallVolume: number
    overallFees: number
    standardVolume: number
    standardFees: number
    pvpVolume: number
    pvpFees: number
    creationFeesCollected: number
    combinedFees: number
  }
  nanopaymentsProcessed: number
  totalMarketCreators: number
  recentTrades: {
    marketId: string
    marketQuestion: string
    amountUsdc: number
    createdAt: string
  }[]
  activityTimeline: {
    label: string
    signups: number
    trades: number
    tickets: number
    marketCreators: number
  }[]
}

export default function AdminMetricsPage() {
  const [metricsData, setMetricsData] = useState<AdminMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeframe, setTimeframe] = useState<string>("7d")

  // Fetch metrics data
  async function fetchMetricsData(isRefresh = false, selectedTimeframe?: string) {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const tf = selectedTimeframe || timeframe
      const data = await apiRequest<AdminMetrics>(`/pvp/admin-metrics?timeframe=${tf}`)
      setMetricsData(data)
    } catch (err: any) {
      console.error("Failed to load platform metrics:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial fetch and timeframe selection trigger
  useEffect(() => {
    void fetchMetricsData(false, timeframe)
  }, [timeframe])

  // Real-time socket updates listener
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5080"
    const socket = io(`${socketUrl}/socket`, {
      transports: ["websocket"],
    })

    socket.on("connect", () => {
      socket.emit("join-room", "feed")
    })

    socket.on("feed-updated", () => {
      void fetchMetricsData(true)
    })

    return () => {
      socket.disconnect()
    }
  }, [timeframe])

  // Calculate unique active markets count
  const activeMarketsCount = useMemo(() => {
    if (!metricsData?.recentTrades) return 0
    const ids = new Set(metricsData.recentTrades.map((t) => t.marketId))
    return ids.size
  }, [metricsData])

  // Format bets count
  const totalBetsCount = useMemo(() => {
    if (!metricsData) return 0
    return metricsData.pvpMatchesCount + (metricsData.recentTrades?.length || 0)
  }, [metricsData])

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        {/* Metrics Header & Timeframe Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
              <BarChart4 className="h-5 w-5 text-indigo-600" />
              Platform Analytics & Activity
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Real-time platform activity, player engagement, matchup volume, and retention funnel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Timeframe selector pills */}
            <div className="bg-stone-100 p-0.5 rounded-[2px] border border-stone-200 flex items-center">
              {["1h", "1d", "7d", "30d"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-[2px] transition-all cursor-pointer ${
                    timeframe === tf
                      ? "bg-white text-stone-900 shadow-xs border border-stone-200/50"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchMetricsData(true)}
              disabled={refreshing}
              className="h-8.5 w-8.5 rounded-[2px] hover:bg-stone-100 bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-950 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Refresh metrics"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {loading && !metricsData ? (
          <div className="verity-card p-16 text-center text-xs text-stone-500 animate-pulse font-medium bg-white border border-stone-200 rounded-[2px]">
            Loading platform analytics...
          </div>
        ) : !metricsData ? (
          <div className="verity-card p-12 text-center text-xs text-stone-400 font-medium bg-white border border-stone-200 rounded-[2px]">
            Failed to load metrics. Click refresh to retry.
          </div>
        ) : (
          <>
            {/* Summary KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Volume */}
              <div className="bg-white border border-stone-200 p-4 rounded-[2px] shadow-xs flex flex-col gap-1">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                    Total Volume
                  </span>
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-2xl font-black text-stone-950 font-mono tracking-tight">
                  {metricsData.volumeAndFees.overallVolume.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                </span>
                <span className="text-[10px] font-semibold text-stone-400 mt-0.5">
                  {activeMarketsCount} active matches
                </span>
              </div>

              {/* Total Users */}
              <div className="bg-white border border-stone-200 p-4 rounded-[2px] shadow-xs flex flex-col gap-1">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                    Total Users
                  </span>
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-2xl font-black text-stone-950 font-mono tracking-tight">
                  {metricsData.users.real.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold text-stone-400 mt-0.5">
                  Registered predictor accounts
                </span>
              </div>

              {/* Total Bets */}
              <div className="bg-white border border-stone-200 p-4 rounded-[2px] shadow-xs flex flex-col gap-1">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                    Total Predictions
                  </span>
                  <Trophy className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-2xl font-black text-stone-950 font-mono tracking-tight">
                  {totalBetsCount.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold text-stone-400 mt-0.5">
                  Submitted tickets & entries
                </span>
              </div>

              {/* Platform Fees */}
              <div className="bg-white border border-stone-200 p-4 rounded-[2px] shadow-xs flex flex-col gap-1">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                    Platform Fees
                  </span>
                  <Coins className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-2xl font-black text-stone-950 font-mono tracking-tight">
                  {metricsData.volumeAndFees.combinedFees.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                </span>
                <span className="text-[10px] font-semibold text-stone-400 mt-0.5">
                  Platform entry fees
                </span>
              </div>

              {/* PvP Matchups */}
              <div className="bg-white border border-stone-200 p-4 rounded-[2px] shadow-xs flex flex-col gap-1">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                    Duel Matches
                  </span>
                  <Swords className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-2xl font-black text-stone-950 font-mono tracking-tight">
                  {metricsData.pvpMatchesCount.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold text-stone-400 mt-0.5">
                  Head-to-head match cards
                </span>
              </div>

              {/* Market Creators */}
              <div className="bg-white border border-stone-200 p-4 rounded-[2px] shadow-xs flex flex-col gap-1">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                    Market Creators
                  </span>
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-2xl font-black text-stone-950 font-mono tracking-tight">
                  {metricsData.totalMarketCreators.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold text-stone-400 mt-0.5">
                  Unique creators
                </span>
              </div>

              {/* Platform Transactions */}
              <div className="bg-white border border-stone-200 p-4 rounded-[2px] shadow-xs flex flex-col gap-1">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                    Settlements
                  </span>
                  <Activity className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-2xl font-black text-stone-950 font-mono tracking-tight">
                  {metricsData.nanopaymentsProcessed.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold text-stone-400 mt-0.5">
                  Processed outcomes
                </span>
              </div>
            </div>

            {/* Volume Chart */}
            <VolumeLineChart
              trades={metricsData.recentTrades}
              timeframe={timeframe}
            />

            {/* User Activity & Retention Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <UserActivityBarChart
                  activityTimeline={metricsData.activityTimeline}
                />
              </div>

              <div className="verity-card p-5 bg-white lg:col-span-5 flex flex-col gap-4 border border-stone-200 shadow-xs rounded-[2px]">
                <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-100 pb-3">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  Duel Player Funnel
                </h3>

                <div className="flex flex-col gap-4 py-2">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-stone-500">Registered Predictors</span>
                      <span className="text-stone-950 font-mono font-bold">
                        {metricsData.users.real.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 h-2 rounded-[2px] overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-[2px] w-full" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-stone-500">Submitted Tickets</span>
                      <span className="text-stone-950 font-mono font-bold">
                        {metricsData.pvpUsers.submitted.real.toLocaleString()} (
                        {(
                          (metricsData.pvpUsers.submitted.real /
                            (metricsData.users.real || 1)) *
                          100
                        ).toFixed(0)}
                        %)
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 h-2 rounded-[2px] overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-[2px]"
                        style={{
                          width: `${
                            (metricsData.pvpUsers.submitted.real /
                              (metricsData.users.real || 1)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-stone-500">Matched Duels</span>
                      <span className="text-stone-950 font-mono font-bold">
                        {metricsData.pvpUsers.played.real.toLocaleString()} (
                        {(
                          (metricsData.pvpUsers.played.real /
                            (metricsData.users.real || 1)) *
                          100
                        ).toFixed(0)}
                        %)
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 h-2 rounded-[2px] overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-[2px]"
                        style={{
                          width: `${
                            (metricsData.pvpUsers.played.real /
                              (metricsData.users.real || 1)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  )
}
