"use client"

import { useState, useMemo, Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import {
  useActivePvpEventsQuery,
  useMyActivePvpTicketsQuery,
  usePvpStatusQuery,
  useReferralsQuery,
} from "@/store/verity/verityQueries"

// Extracted subcomponents
import PvpArenaTab from "@/components/markets/PvpArenaTab"
import PvpSidebarStats from "@/components/markets/PvpSidebarStats"
import DuelHistory from "@/components/markets/DuelHistory"
import LiveArenaPreview from "@/components/preview/LiveArenaPreview"
import PolymarketSportsCatalogue from "@/features/polymarket/PolymarketSportsCatalogue"

type MarketsTab = "general" | "pvp-arena"
type MobilePvpTab = "markets" | "history" | "stats"
type LegacyPvpEvent = {
  id: string
  createdAt?: string | null
  [key: string]: unknown
}

function MarketsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabQuery = searchParams.get("tab") as MarketsTab | null
  const activeTab: MarketsTab =
    tabQuery === "general" || tabQuery === "pvp-arena" ? tabQuery : "general"
  const [mobilePvpTab, setMobilePvpTab] = useState<MobilePvpTab>("markets")
  const { profile } = useWalletProfile()

  // PvP API queries
  const { data: pvpEventsRaw = [], isLoading: pvpEventsLoading } =
    useActivePvpEventsQuery()
  const { data: myActiveTicketEvents = [], isLoading: myTicketsLoading } =
    useMyActivePvpTicketsQuery()

  // Merge active events + events where user has active tickets (dedup by id)
  const pvpEvents = useMemo(() => {
    const seen = new Set<string>()
    const merged: LegacyPvpEvent[] = []
    for (const evt of pvpEventsRaw as LegacyPvpEvent[]) {
      if (!seen.has(evt.id)) {
        seen.add(evt.id)
        merged.push(evt)
      }
    }
    for (const evt of myActiveTicketEvents as LegacyPvpEvent[]) {
      if (!seen.has(evt.id)) {
        seen.add(evt.id)
        merged.push(evt)
      }
    }
    // Sort by createdAt descending (newest first)
    return merged.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })
  }, [pvpEventsRaw, myActiveTicketEvents])

  const [manualPvpEventId, setManualPvpEventId] = useState<string | null>(null)
  const [claimedMarketIds, setClaimedMarketIds] = useState<Set<string>>(
    new Set(),
  )

  const handleClaimSuccess = useCallback((marketIds: string[]) => {
    setClaimedMarketIds((prev) => {
      const next = new Set(prev)
      marketIds.forEach((id) => next.add(id))
      return next
    })
  }, [])

  const queryPvpEventId = searchParams.get("id")
  const selectedPvpEventId =
    pvpEvents.find((event) => event.id === queryPvpEventId)?.id ||
    pvpEvents.find((event) => event.id === manualPvpEventId)?.id ||
    pvpEvents[0]?.id ||
    null

  const handleSelectPvpEvent = (id: string | null) => {
    setManualPvpEventId(id)
    const params = new URLSearchParams(window.location.search)
    params.set("tab", "pvp-arena")
    router.push(`/markets?${params.toString()}`)
  }

  const handleTabChange = (tab: MarketsTab) => {
    const params = new URLSearchParams(window.location.search)
    params.set("tab", tab)
    router.push(`/markets?${params.toString()}`)
  }

  const {
    data: pvpStatus,
    refetch: refetchPvpStatus,
    isLoading: pvpStatusLoading,
  } = usePvpStatusQuery(selectedPvpEventId)
  const { data: referralsData } = useReferralsQuery()
  return (
    <div className="w-full py-10 font-sans sm:py-14">
      <header className="mb-9 border-b border-border pb-8">
        <div>
          <h1 className="font-heading text-[52px] font-extrabold leading-[0.82] tracking-[0.01em] text-charcoal-primary min-[360px]:text-[58px] sm:text-[78px]">
            PREDICTION <span className="text-accent">MARKETS</span>
          </h1>
          <p className="mt-5 max-w-[670px] text-sm leading-6 text-graphite sm:text-[15px]">
            Browse current sports markets, inspect prices, and choose an
            outcome. Polymarket supplies liquidity and resolution; Verity keeps
            the experience social and competitive.
          </p>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="mb-7 grid grid-cols-2 border-b border-border">
        <button
          onClick={() => {
            setManualPvpEventId(null)
            handleTabChange("general")
          }}
          className={`relative min-w-0 border-x border-t border-border px-3 py-3 text-left font-heading text-[15px] font-extrabold uppercase tracking-[0.05em] transition-colors cursor-pointer sm:px-5 sm:text-lg ${
            activeTab === "general"
              ? "bg-accent text-black"
              : "bg-surface text-ash hover:bg-surface-muted hover:text-charcoal-primary"
          }`}
        >
          Sports markets
        </button>
        <button
          onClick={() => {
            setManualPvpEventId(null)
            handleTabChange("pvp-arena")
          }}
          className={`relative min-w-0 border-r border-t border-border px-3 py-3 text-left font-heading text-[15px] font-extrabold uppercase tracking-[0.05em] transition-colors cursor-pointer sm:px-5 sm:text-lg ${
            activeTab === "pvp-arena"
              ? "bg-accent text-black"
              : "bg-surface text-ash hover:bg-surface-muted hover:text-charcoal-primary"
          }`}
        >
          PVP arena
        </button>
      </div>

      {/* Prediction Markets Tab */}
      {activeTab === "general" && <PolymarketSportsCatalogue />}

      {/* PvP Arena Tab */}
      {activeTab === "pvp-arena" && <LiveArenaPreview />}
      {activeTab === "pvp-arena" && false && (
        <div className="flex flex-col gap-4">
          {/* Mobile Sub-tabs Menu (Only visible on mobile) */}
          <div className="mb-2 grid grid-cols-3 border border-border bg-surface lg:hidden">
            <button
              onClick={() => setMobilePvpTab("markets")}
              className={`border-r border-border px-2 py-3 text-center font-heading text-sm font-extrabold uppercase tracking-[0.05em] transition-colors cursor-pointer ${
                mobilePvpTab === "markets"
                  ? "bg-accent text-black"
                  : "text-ash hover:text-charcoal-primary"
              }`}
            >
              Markets
            </button>
            <button
              onClick={() => setMobilePvpTab("history")}
              className={`border-r border-border px-2 py-3 text-center font-heading text-sm font-extrabold uppercase tracking-[0.05em] transition-colors cursor-pointer ${
                mobilePvpTab === "history"
                  ? "bg-accent text-black"
                  : "text-ash hover:text-charcoal-primary"
              }`}
            >
              Duel History
            </button>
            <button
              onClick={() => setMobilePvpTab("stats")}
              className={`px-2 py-3 text-center font-heading text-sm font-extrabold uppercase tracking-[0.05em] transition-colors cursor-pointer ${
                mobilePvpTab === "stats"
                  ? "bg-accent text-black"
                  : "text-ash hover:text-charcoal-primary"
              }`}
            >
              PvP Stats
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* Main Duelling Area */}
            <div
              className={`lg:col-span-2 ${mobilePvpTab === "markets" ? "block" : "hidden"} lg:block`}
            >
              <PvpArenaTab
                pvpEvents={pvpEvents}
                pvpEventsLoading={pvpEventsLoading || myTicketsLoading}
                pvpStatus={pvpStatus}
                pvpStatusLoading={pvpStatusLoading}
                refetchPvpStatus={refetchPvpStatus}
                profile={profile}
                referralsData={referralsData}
                selectedPvpEventId={selectedPvpEventId}
                setSelectedPvpEventId={handleSelectPvpEvent}
                claimedMarketIds={claimedMarketIds}
                setClaimedMarketIds={setClaimedMarketIds}
              />
            </div>

            {/* Right Sidebar: Profile stats & Duel History */}
            <div
              className={`flex flex-col gap-4 ${mobilePvpTab !== "markets" ? "block" : "hidden"} lg:flex`}
            >
              <div
                className={`${mobilePvpTab === "stats" ? "block" : "hidden"} lg:block`}
              >
                <PvpSidebarStats
                  profile={profile}
                  referralsData={referralsData}
                  claimedMarketIds={claimedMarketIds}
                  onClaimSuccess={handleClaimSuccess}
                />
              </div>
              <div
                className={`${mobilePvpTab === "history" ? "block" : "hidden"} lg:block`}
              >
                <DuelHistory />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MarketsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full text-center py-12 text-ash">Loading...</div>
      }
    >
      <MarketsContent />
    </Suspense>
  )
}
