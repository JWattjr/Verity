"use client"

import { Button } from "@/components/ui/button"
import {
  RefreshCw,
  Trophy,
  Swords,
  Users,
  Layers,
  Coins,
  DollarSign,
  BarChart4
} from "lucide-react"

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
}

interface MetricsTabProps {
  metricsLoading: boolean
  metricsData: AdminMetrics | null
  fetchMetricsData: () => void
}

export default function MetricsTab({
  metricsLoading,
  metricsData,
  fetchMetricsData
}: MetricsTabProps) {
  if (metricsLoading && !metricsData) {
    return (
      <div className="verity-card p-16 text-center text-sm text-stone-500 animate-pulse font-medium bg-white border border-stone-200">
        Loading database metrics...
      </div>
    )
  }

  if (!metricsData) {
    return (
      <div className="verity-card p-16 text-center text-sm text-stone-400 font-medium bg-white border border-stone-200">
        Failed to load platform metrics. Click refresh to retry.
        <Button onClick={fetchMetricsData} className="mt-4 bg-indigo-600 text-white cursor-pointer mx-auto block">
          Refresh Metrics
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Metrics top section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
            <BarChart4 className="h-5 w-5 text-indigo-600" />
            Verity Analytics & Revenue Overview
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Platform statistics, real-time user breakdown, total volume, and administrative fee metrics.
          </p>
        </div>

        <button
          onClick={fetchMetricsData}
          disabled={metricsLoading}
          className="h-9 w-9 rounded-lg hover:bg-stone-100 bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-950 transition-colors shadow-2xs cursor-pointer"
        >
          <RefreshCw
            className={`h-4 w-4 ${metricsLoading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Metrics Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Users */}
        <div className="verity-card p-5 bg-white flex flex-col gap-2 shadow-xs border border-stone-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Total Registered Users</span>
            <Users className="h-4.5 w-4.5 text-indigo-600" />
          </div>
          <span className="text-2xl font-extrabold text-stone-900 font-mono">
            {metricsData.users.total}
          </span>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1 border-t border-stone-100 pt-2">
            <span>Real: <strong className="text-stone-800 font-semibold">{metricsData.users.real}</strong></span>
            <span>Bots: <strong className="text-stone-800 font-semibold">{metricsData.users.bots}</strong></span>
          </div>
        </div>

        {/* PvP Active Players */}
        <div className="verity-card p-5 bg-white flex flex-col gap-2 shadow-xs border border-stone-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">PvP Arena Players</span>
            <Swords className="h-4.5 w-4.5 text-indigo-600" />
          </div>
          <span className="text-2xl font-extrabold text-stone-900 font-mono">
            {metricsData.pvpUsers.played.total}
          </span>
          <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1 border-t border-stone-100 pt-2">
            <span>Real Played: <strong className="text-indigo-600 font-semibold">{metricsData.pvpUsers.played.real}</strong></span>
            <span>Bots: <strong className="text-stone-800 font-semibold">{metricsData.pvpUsers.played.bots}</strong></span>
          </div>
        </div>

        {/* Total PvP Duels */}
        <div className="verity-card p-5 bg-white flex flex-col gap-2 shadow-xs border border-stone-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">PvP Matches Count</span>
            <Trophy className="h-4.5 w-4.5 text-indigo-600" />
          </div>
          <span className="text-2xl font-extrabold text-stone-900 font-mono">
            {metricsData.pvpMatchesCount}
          </span>
          <div className="text-[11px] text-stone-500 mt-1 border-t border-stone-100 pt-2">
            Total unique PvP ticket submissions: <strong className="text-stone-800 font-semibold">{metricsData.pvpUsers.submitted.total}</strong>
          </div>
        </div>

        {/* Combined revenue */}
        <div className="verity-card p-5 bg-emerald-50/50 border border-emerald-100 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Platform Revenue</span>
            <Coins className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <span className="text-2xl font-extrabold text-emerald-950 font-mono">
            {metricsData.volumeAndFees.combinedFees.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} USDC
          </span>
          <div className="flex items-center justify-between text-[11px] text-emerald-800 mt-1 border-t border-emerald-100 pt-2">
            <span>Trades: {metricsData.volumeAndFees.overallFees.toFixed(2)} USDC</span>
            <span>Creation: {metricsData.volumeAndFees.creationFeesCollected.toFixed(2)} USDC</span>
          </div>
        </div>
      </div>

      {/* Sub row detail cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Financial performance detail card */}
        <div className="verity-card p-6 bg-white lg:col-span-7 flex flex-col gap-5 border border-stone-200 shadow-xs">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-100 pb-3">
            <DollarSign className="h-4.5 w-4.5 text-indigo-600" />
            Detailed USDC Trading Volume & Fee Breakdowns
          </h3>

          <div className="grid grid-cols-2 gap-8">
            {/* Volume breakdown */}
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">USDC Trading Volume</h4>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center bg-stone-50 p-3 rounded-lg">
                  <span className="text-xs text-stone-600 font-semibold">Standard Markets</span>
                  <span className="text-xs font-bold font-mono text-stone-900">{metricsData.volumeAndFees.standardVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC</span>
                </div>
                <div className="flex justify-between items-center bg-stone-50 p-3 rounded-lg">
                  <span className="text-xs text-stone-600 font-semibold">PvP Child Markets</span>
                  <span className="text-xs font-bold font-mono text-stone-900">{metricsData.volumeAndFees.pvpVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC</span>
                </div>
                <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 p-3 rounded-lg mt-1">
                  <span className="text-xs text-indigo-800 font-bold">Total Volume</span>
                  <span className="text-xs font-extrabold font-mono text-indigo-955">{metricsData.volumeAndFees.overallVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC</span>
                </div>
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Fees Collected</h4>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center bg-stone-50 p-3 rounded-lg">
                  <span className="text-xs text-stone-600 font-semibold">Standard Trading Fees</span>
                  <span className="text-xs font-bold font-mono text-stone-900">{metricsData.volumeAndFees.standardFees.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC</span>
                </div>
                <div className="flex justify-between items-center bg-stone-50 p-3 rounded-lg">
                  <span className="text-xs text-stone-600 font-semibold">PvP Trading Fees</span>
                  <span className="text-xs font-bold font-mono text-stone-900">{metricsData.volumeAndFees.pvpFees.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC</span>
                </div>
                <div className="flex justify-between items-center bg-stone-50 p-3 rounded-lg">
                  <span className="text-xs text-stone-600 font-semibold">Market Creation Fees</span>
                  <span className="text-xs font-bold font-mono text-stone-900">{metricsData.volumeAndFees.creationFeesCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PvP ticket submission stats card */}
        <div className="verity-card p-6 bg-white lg:col-span-5 flex flex-col gap-4 border border-stone-200 shadow-xs">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-100 pb-3">
            <Layers className="h-4.5 w-4.5 text-indigo-600" />
            PvP Arena Player Funnel
          </h3>

          <div className="flex flex-col gap-4 py-2">
            {/* Ticket submission funnel bars */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-600">Total Users Registered</span>
                <span className="text-stone-950 font-mono">{metricsData.users.total}</span>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full w-full" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-600">Submitted at Least One Ticket</span>
                <span className="text-stone-950 font-mono">
                  {metricsData.pvpUsers.submitted.total} ({((metricsData.pvpUsers.submitted.total / (metricsData.users.total || 1)) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full"
                  style={{ width: `${(metricsData.pvpUsers.submitted.total / (metricsData.users.total || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-600">Matched/Played PvP Match</span>
                <span className="text-stone-950 font-mono">
                  {metricsData.pvpUsers.played.total} ({((metricsData.pvpUsers.played.total / (metricsData.users.total || 1)) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${(metricsData.pvpUsers.played.total / (metricsData.users.total || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
