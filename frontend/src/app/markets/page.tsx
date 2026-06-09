"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useFeed } from "@/hooks/useFeed"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import {
  useActivePvpEventsQuery,
  usePvpStatusQuery,
  useReferralsQuery,
  usePvpMatchHistoryQuery,
} from "@/store/verity/verityQueries"
import { Swords, TrendingUp } from "lucide-react"

// Extracted subcomponents
import StandardMarketsFeed from "@/components/markets/StandardMarketsFeed"
import PvpArenaTab from "@/components/markets/PvpArenaTab"
import PvpSidebarStats from "@/components/markets/PvpSidebarStats"
import DuelHistory from "@/components/markets/DuelHistory"

type MarketsTab = "general" | "pvp-arena"

function MarketsContent() {
  const searchParams = useSearchParams()
  const tabQuery = searchParams.get("tab") as MarketsTab | null
  const [activeTab, setActiveTab] = useState<MarketsTab>(
    (tabQuery === "general" || tabQuery === "pvp-arena") ? tabQuery : "general"
  )
  const { profile } = useWalletProfile()

  useEffect(() => {
    if (tabQuery === "general" || tabQuery === "pvp-arena") {
      setActiveTab(tabQuery)
    }
  }, [tabQuery])

  // Standard feed markets (excludes pvp)
  const {
    items: feedItems,
    loading: feedLoading,
    reload: reloadFeed,
  } = useFeed(profile?.id, true)

  // PvP API queries
  const { data: pvpEvents = [], isLoading: pvpEventsLoading } =
    useActivePvpEventsQuery()
  const {
    data: pvpStatus,
    refetch: refetchPvpStatus,
    isLoading: pvpStatusLoading,
  } = usePvpStatusQuery()
  const { data: referralsData } = useReferralsQuery()
  const { data: matchHistory = [] } = usePvpMatchHistoryQuery()

  return (
    <div className="w-full max-w-[1240px] mx-auto py-6 font-sans">
      {/* Tabs Menu */}
      <div className="flex border-b border-border dark:border-zinc-800 gap-2 pb-px mb-4">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold tracking-tight whitespace-nowrap transition-colors ${
            activeTab === "general"
              ? "border-charcoal-primary text-charcoal-primary dark:border-white dark:text-white"
              : "border-transparent text-ash hover:text-charcoal-primary dark:hover:text-white"
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("pvp-arena")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold tracking-tight whitespace-nowrap transition-colors ${
            activeTab === "pvp-arena"
              ? "border-charcoal-primary text-charcoal-primary dark:border-white dark:text-white"
              : "border-transparent text-ash hover:text-charcoal-primary dark:hover:text-white"
          }`}
        >
          PvP Arena
        </button>
      </div>

      {/* Prediction Markets Tab */}
      {activeTab === "general" && (
        <StandardMarketsFeed
          feedItems={feedItems}
          feedLoading={feedLoading}
          reloadFeed={reloadFeed}
          profile={profile}
          setActiveTab={setActiveTab}
          pvpEvents={pvpEvents}
          pvpEventsLoading={pvpEventsLoading}
        />
      )}

      {/* PvP Arena Tab */}
      {activeTab === "pvp-arena" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Main Duelling Area */}
          <PvpArenaTab
            pvpEvents={pvpEvents}
            pvpEventsLoading={pvpEventsLoading}
            pvpStatus={pvpStatus}
            pvpStatusLoading={pvpStatusLoading}
            refetchPvpStatus={refetchPvpStatus}
            profile={profile}
            referralsData={referralsData}
          />

          {/* Right Sidebar: Profile stats & Duel History */}
          <div className="flex flex-col gap-4">
            <PvpSidebarStats profile={profile} referralsData={referralsData} />
            <DuelHistory matchHistory={matchHistory} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function MarketsPage() {
  return (
    <Suspense fallback={<div className="w-full text-center py-12 text-ash">Loading...</div>}>
      <MarketsContent />
    </Suspense>
  )
}
