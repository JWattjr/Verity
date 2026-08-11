"use client"

import { useState, useEffect, useMemo, Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFeed } from "@/hooks/useFeed"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import {
  useActivePvpEventsQuery,
  useMyActivePvpTicketsQuery,
  usePvpStatusQuery,
  useReferralsQuery,
} from "@/store/verity/verityQueries"

// Extracted subcomponents
import StandardMarketsFeed from "@/components/markets/StandardMarketsFeed"
import PvpArenaTab from "@/components/markets/PvpArenaTab"
import PvpSidebarStats from "@/components/markets/PvpSidebarStats"
import DuelHistory from "@/components/markets/DuelHistory"
import LiveArenaPreview from "@/components/preview/LiveArenaPreview"
import { useShowcaseMode } from "@/hooks/useShowcaseMode"

type MarketsTab = "general" | "pvp-arena"
type MobilePvpTab = "markets" | "history" | "stats"

function MarketsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabQuery = searchParams.get("tab") as MarketsTab | null
  const [activeTab, setActiveTab] = useState<MarketsTab>(
    tabQuery === "general" || tabQuery === "pvp-arena" ? tabQuery : "general",
  )
  const [mobilePvpTab, setMobilePvpTab] = useState<MobilePvpTab>("markets")
  const { profile } = useWalletProfile()
  const showcaseMode = useShowcaseMode()

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
  const { data: pvpEventsRaw = [], isLoading: pvpEventsLoading } =
    useActivePvpEventsQuery()
  const { data: myActiveTicketEvents = [], isLoading: myTicketsLoading } =
    useMyActivePvpTicketsQuery()

  // Merge active events + events where user has active tickets (dedup by id)
  const pvpEvents = useMemo(() => {
    const seen = new Set<string>()
    const merged: any[] = []
    for (const evt of pvpEventsRaw) {
      if (!seen.has(evt.id)) {
        seen.add(evt.id)
        merged.push(evt)
      }
    }
    for (const evt of myActiveTicketEvents) {
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

  const [selectedPvpEventId, setSelectedPvpEventId] = useState<string | null>(
    null,
  )
  const [hasManuallySelected, setHasManuallySelected] = useState<boolean>(false)
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

  // Sync selected event to query param or the most recent one
  useEffect(() => {
    const queryId = searchParams.get("id")
    if (queryId && pvpEvents.some((e: any) => e.id === queryId)) {
      setSelectedPvpEventId(queryId)
      setHasManuallySelected(true)

      // Clear id from URL
      const params = new URLSearchParams(window.location.search)
      params.delete("id")
      router.replace(`/markets?${params.toString()}`)
      return
    }

    if (pvpEvents && pvpEvents.length > 0) {
      if (!hasManuallySelected) {
        setSelectedPvpEventId(pvpEvents[0].id)
      }
    } else {
      setSelectedPvpEventId(null)
    }
  }, [pvpEvents, hasManuallySelected, searchParams, router])

  const handleSelectPvpEvent = (id: string | null) => {
    setHasManuallySelected(true)
    setSelectedPvpEventId(id)
    const params = new URLSearchParams(window.location.search)
    params.set("tab", "pvp-arena")
    router.push(`/markets?${params.toString()}`)
  }

  const handleTabChange = (tab: MarketsTab) => {
    setActiveTab(tab)
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
  const liveMarketCount = feedItems.filter((item) => item.market).length

  return (
    <div className="w-full py-10 font-sans sm:py-14">
      <header className="mb-9 border-b border-border pb-8">
        <p className="mb-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ash">
          <span className="h-2 w-2 bg-accent" aria-hidden="true" />
          Verity · live markets
        </p>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
          <div>
            <h1 className="font-heading text-[52px] font-extrabold leading-[0.82] tracking-[0.01em] text-charcoal-primary min-[360px]:text-[58px] sm:text-[78px]">
              PREDICTION <span className="text-accent">MARKETS</span>
            </h1>
            <p className="mt-5 max-w-[670px] text-sm leading-6 text-graphite sm:text-[15px]">
              Read the signal, choose a side, and build a public prediction
              record. Every market is transparent, USDC-backed, and resolved
              against a stated source.
            </p>
          </div>
          <dl className="grid grid-cols-3 border border-border bg-surface lg:grid-cols-1">
            <div className="border-r border-border p-3 lg:border-b lg:border-r-0">
              <dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-ash">
                Live
              </dt>
              <dd className="mt-1 font-heading text-2xl font-extrabold text-charcoal-primary">
                {liveMarketCount}
              </dd>
            </div>
            <div className="border-r border-border p-3 lg:border-b lg:border-r-0">
              <dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-ash">
                Arena cards
              </dt>
              <dd className="mt-1 font-heading text-2xl font-extrabold text-charcoal-primary">
                {pvpEvents.length}
              </dd>
            </div>
            <div className="p-3">
              <dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-ash">
                Settlement
              </dt>
              <dd className="mt-1 font-heading text-2xl font-extrabold text-accent">
                USDC
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="mb-7 grid grid-cols-2 border-b border-border">
        <button
          onClick={() => {
            setHasManuallySelected(false)
            handleTabChange("general")
          }}
          className={`relative min-w-0 border-x border-t border-border px-3 py-3 text-left font-heading text-[15px] font-extrabold uppercase tracking-[0.05em] transition-colors cursor-pointer sm:px-5 sm:text-lg ${
            activeTab === "general"
              ? "bg-accent text-black"
              : "bg-surface text-ash hover:bg-surface-muted hover:text-charcoal-primary"
          }`}
        >
          Market feed
        </button>
        <button
          onClick={() => {
            setHasManuallySelected(false)
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
      {activeTab === "general" && (
        <StandardMarketsFeed
          feedItems={feedItems}
          feedLoading={feedLoading}
          reloadFeed={reloadFeed}
          profile={profile}
          setActiveTab={handleTabChange}
          pvpEvents={pvpEvents}
          pvpEventsLoading={pvpEventsLoading}
          setSelectedPvpEventId={handleSelectPvpEvent}
        />
      )}

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
