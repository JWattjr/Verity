"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/AuthModals"
import {
  useSubmitPvpTicketMutation,
} from "@/store/verity/verityQueries"
import { toast } from "@/lib/toast"
import { parseEventTeams } from "./PvpMatchupCarousel"
import ArenaPlayerStatsHeader from "./ArenaPlayerStatsHeader"
import TeamBadge from "@/components/common/TeamBadge"
import PvpClaimBanner from "./PvpClaimBanner"
import { useDrawerStore } from "@/store/drawerStore"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"
import Link from "next/link"
import MarketDetail from "@/components/markets/MarketDetail"
import { X, Lock, ArrowRight, Loader2, Swords, History } from "lucide-react"

// Sub-components
import PvpArenaSkeleton from "./PvpArenaSkeleton"
import PvpDuelStatus from "./PvpDuelStatus"
import PvpDuelPicks from "./PvpDuelPicks"
import PvpTicketBuilder from "./PvpTicketBuilder"

interface PvpArenaTabProps {
  pvpEvents: any[]
  pvpEventsLoading: boolean
  pvpStatus: any
  pvpStatusLoading: boolean
  refetchPvpStatus: () => void
  profile: any
  referralsData: any
  selectedPvpEventId: string | null
  setSelectedPvpEventId: (id: string | null) => void
  claimedMarketIds: Set<string>
  setClaimedMarketIds: React.Dispatch<React.SetStateAction<Set<string>>>
}

export default function PvpArenaTab({
  pvpEvents,
  pvpEventsLoading,
  pvpStatus,
  pvpStatusLoading,
  refetchPvpStatus,
  profile,
  referralsData,
  selectedPvpEventId,
  setSelectedPvpEventId,
  claimedMarketIds,
  setClaimedMarketIds,
}: PvpArenaTabProps) {
  const queryClient = useQueryClient()
  const {
    tradeMarketId,
    isTradeDrawerOpen,
    openTradeDrawer,
    closeTradeDrawer,
  } = useDrawerStore()
  const submitTicketMutation = useSubmitPvpTicketMutation()

  // ─── Local state ────────────────────────────────────────────
  const [mounted, setMounted] = useState<boolean>(false)
  const [showBuilderOverride, setShowBuilderOverride] = useState<boolean>(false)
  const [allPvpSelections, setAllPvpSelections] = useState<
    Record<string, Record<string, string>>
  >({})
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isRegisteringQueue, setIsRegisteringQueue] = useState<boolean>(false)
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ─── Derived data ───────────────────────────────────────────
  const sortedPvpEvents = useMemo(() => {
    if (!pvpEvents) return []
    return [...pvpEvents].sort((a, b) => {
      const timeA = new Date(a.lockTime || a.deadline || 0).getTime()
      const timeB = new Date(b.lockTime || b.deadline || 0).getTime()
      return timeA - timeB
    })
  }, [pvpEvents])

  const selectedPvpEvent = useMemo(() => {
    if (!sortedPvpEvents || sortedPvpEvents.length === 0) return null
    if (selectedPvpEventId) {
      return (
        sortedPvpEvents.find((e: any) => e.id === selectedPvpEventId) ||
        sortedPvpEvents[0]
      )
    }
    // Find the first open event, or default to the last closed one
    const firstOpen = sortedPvpEvents.find((e) => {
      const timeStr = e.lockTime || e.deadline
      if (!timeStr) return false
      const isClosed =
        new Date(timeStr).getTime() <= Date.now() ||
        e.status === "resolved" ||
        e.status === "closed"
      return !isClosed
    })
    return (
      firstOpen ||
      sortedPvpEvents[sortedPvpEvents.length - 1] ||
      sortedPvpEvents[0]
    )
  }, [sortedPvpEvents, selectedPvpEventId])

  useEffect(() => {
    if (selectedPvpEvent && selectedPvpEvent.id !== selectedPvpEventId) {
      setSelectedPvpEventId(selectedPvpEvent.id)
    }
  }, [selectedPvpEvent, selectedPvpEventId, setSelectedPvpEventId])

  const runningScoreUser = useMemo(() => {
    if (!pvpStatus?.ticket?.picks) return 0
    return pvpStatus.ticket.picks.filter(
      (p: any) => (p.arenaCorrect ?? p.isCorrect) === true,
    ).length
  }, [pvpStatus])

  const runningScoreOpponent = useMemo(() => {
    if (!pvpStatus?.opponent?.picks) return 0
    return pvpStatus.opponent.picks.filter(
      (p: any) => (p.arenaCorrect ?? p.isCorrect) === true,
    ).length
  }, [pvpStatus])


  const totalVolume = useMemo(() => {
    if (!selectedPvpEvent?.options) return 0
    return selectedPvpEvent.options.reduce(
      (sum: number, opt: any) => sum + Number(opt.liquidity ?? 0),
      0,
    )
  }, [selectedPvpEvent])

  const formattedDeadline = useMemo(() => {
    if (!selectedPvpEvent?.deadline) return ""
    const date = new Date(selectedPvpEvent.deadline)
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }, [selectedPvpEvent])

  const parsedTeams = useMemo(() => {
    if (!selectedPvpEvent?.question) return { teamA: "Team A", teamB: "Team B" }
    const vsMatch = selectedPvpEvent.question.match(/(.+?)\s+vs\.?\s+(.+)/i)
    if (vsMatch) return { teamA: vsMatch[1].trim(), teamB: vsMatch[2].trim() }
    const dashMatch = selectedPvpEvent.question.match(/(.+?)\s+-\s+(.+)/)
    if (dashMatch)
      return { teamA: dashMatch[1].trim(), teamB: dashMatch[2].trim() }
    return { teamA: "Team A", teamB: "Team B" }
  }, [selectedPvpEvent])

  const groupedOptions = useMemo(() => {
    if (!selectedPvpEvent?.options) return {}
    const groups: Record<string, any[]> = {}
    for (const opt of selectedPvpEvent.options) {
      const group = opt.optionGroup || "other"
      if (!groups[group]) groups[group] = []
      groups[group].push(opt)
    }
    return groups
  }, [selectedPvpEvent])

  const hasActiveDuel =
    pvpStatus?.status === "queued" ||
    pvpStatus?.status === "matched" ||
    pvpStatus?.status === "resolved"

  const isEventEnded =
    selectedPvpEvent &&
    (new Date() >=
      new Date(selectedPvpEvent.lockTime || selectedPvpEvent.deadline) ||
      selectedPvpEvent.status === "resolved" ||
      selectedPvpEvent.status === "closed")

  const pvpSelections = selectedPvpEvent
    ? allPvpSelections[selectedPvpEvent.id] || {}
    : {}

  // ─── Effects ────────────────────────────────────────────────

  // Reset override when event changes
  useEffect(() => {
    if (selectedPvpEvent) {
      setShowBuilderOverride(false)
    }
  }, [selectedPvpEvent])

  // ─── Handlers ───────────────────────────────────────────────

  const handleToggleSelection = useCallback(
    (optId: string, selection: string) => {
      if (!selectedPvpEvent) return

      setAllPvpSelections((prevAll) => {
        const eventId = selectedPvpEvent.id
        const prevEventSelections = prevAll[eventId] || {}
        const nextEventSelections = { ...prevEventSelections }

        if (nextEventSelections[optId] === selection) {
          delete nextEventSelections[optId]
          return { ...prevAll, [eventId]: nextEventSelections }
        }

        const currentOpt = selectedPvpEvent?.options?.find(
          (o: any) => o.id === optId,
        )
        const group = currentOpt?.optionGroup

        if (group) {
          selectedPvpEvent.options.forEach((otherOpt: any) => {
            if (otherOpt.id !== optId && otherOpt.optionGroup === group) {
              delete nextEventSelections[otherOpt.id]
            }
          })
        }

        nextEventSelections[optId] = selection
        return { ...prevAll, [eventId]: nextEventSelections }
      })
    },
    [selectedPvpEvent],
  )

  const handleClaim = useCallback(
    async (marketIds: string[]) => {
      try {
        setClaimedMarketIds((prev) => {
          const next = new Set(prev)
          marketIds.forEach((id) => next.add(id))
          return next
        })

        // Invalidate all relevant queries to keep UI in sync
        void queryClient.invalidateQueries({
          queryKey: ["pvp-claimable-winnings"],
        })
        void queryClient.invalidateQueries({ queryKey: ["pvp-status"] })
        void queryClient.invalidateQueries({
          queryKey: ["pvp-my-active-tickets"],
        })
        void queryClient.invalidateQueries({ queryKey: ["positions"] })
        void queryClient.invalidateQueries({ queryKey: ["wallet-profile"] })
        toast.success("Winnings and Arena XP claimed!")
      } catch (err) {
        console.error("Failed to claim winnings", err)
      }
    },
    [queryClient, setClaimedMarketIds],
  )

  async function handleSubmitPvpTicket(couponCode?: string) {
    if (!profile) {
      toast.error("Please click Get Started to queue for the Arena.")
      return
    }
    if (!selectedPvpEvent) return

    const lockTimeLimit = new Date(
      selectedPvpEvent.lockTime || selectedPvpEvent.deadline,
    )
    if (new Date().getTime() >= lockTimeLimit.getTime()) {
      toast.error("This matchup is too close to kickoff or has already started")
      return
    }

    const picks = Object.keys(pvpSelections).map((marketId) => ({
      marketId,
      selection: pvpSelections[marketId],
    }))

    if (picks.length < 3) {
      toast.error(
        "Please make a selection for at least 3 options from different categories.",
      )
      return
    }

    setIsSubmitting(true)
    setIsRegisteringQueue(true)
    try {
      await submitTicketMutation.mutateAsync({
        parentMarketId: selectedPvpEvent.id,
        picks,
        couponCode,
      })

      setIsSubmitting(false)
      setShowBuilderOverride(false)
      setAllPvpSelections((prev) => {
        const next = { ...prev }
        delete next[selectedPvpEvent.id]
        return next
      })

      await refetchPvpStatus()
      toast.success("Duel card submitted! Matching you with an opponent...")
    } catch (err: any) {
      toast.error(err.message || "Failed to submit ticket.")
    } finally {
      setIsSubmitting(false)
      setIsRegisteringQueue(false)
    }
  }

  // ─── Loading state ──────────────────────────────────────────
  const isPvpStatusPending =
    !!profile &&
    !!selectedPvpEventId &&
    (!pvpStatus || pvpStatus?.event?.id !== selectedPvpEventId) &&
    pvpStatusLoading

  if (!mounted || pvpEventsLoading) {
    return <PvpArenaSkeleton optionCount={5} />
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="lg:col-span-2 flex flex-col gap-4">
      {/* Player Stats Header with Match Switcher */}
      <ArenaPlayerStatsHeader
        profile={profile}
        pvpEvents={sortedPvpEvents}
        selectedPvpEventId={selectedPvpEventId}
        setSelectedPvpEventId={setSelectedPvpEventId}
      />

      {isPvpStatusPending ? (
        <PvpArenaSkeleton
          optionCount={selectedPvpEvent?.options?.length || 5}
          hideCarouselHeader={true}
        />
      ) : isRegisteringQueue ? (
        <div className="border border-[#222226] bg-[#101012] p-8 md:p-10 flex flex-col items-center justify-center text-center gap-6 min-h-[300px]">
          <div className="flex items-center justify-center w-14 h-14 border border-[#ff3b30] bg-[#1e1212] text-[#ff3b30]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>

          <div className="space-y-2 max-w-sm">
            <h3 className="text-xl font-black uppercase text-[#f4f1ea] font-heading">
              Entering the Arena...
            </h3>
            <p className="text-xs text-[#8e8a85] leading-relaxed">
              We are finalising your ticket registration and queueing you for an
              opponent.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Active Duel View */}
          {hasActiveDuel && !showBuilderOverride && (
            <div className="flex flex-col gap-4">
              <PvpDuelStatus
                status={pvpStatus.status}
                pvpStatus={pvpStatus}
                runningScoreUser={runningScoreUser}
                runningScoreOpponent={runningScoreOpponent}
                profile={profile}
              />
              <PvpClaimBanner
                picks={pvpStatus.ticket?.picks}
                claimedMarketIds={claimedMarketIds}
                onClaim={handleClaim}
                showEmoji={true}
              />
              <PvpDuelPicks
                pvpStatus={pvpStatus}
              />
            </div>
          )}

          {/* Ticket Builder Form */}
          {(!hasActiveDuel || showBuilderOverride) &&
            (isEventEnded ? (
              <div className="border border-[#222226] bg-[#101012] p-6 md:p-8 flex flex-col gap-6 text-[#f4f1ea]">
                {/* Locked Content */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 border border-[#28282e] bg-[#161619] text-[#8e8a85] shrink-0">
                    <Lock className="h-5 w-5" />
                  </div>

                  {/* Text Area */}
                  <div className="flex-1 text-center md:text-left space-y-2">
                    <span className="inline-flex items-center gap-1.5 border border-[#28282e] bg-[#161619] px-2.5 py-0.5 text-[9px] font-bold text-[#8e8a85] uppercase tracking-wider font-mono">
                      Predictions Closed
                    </span>
                    <h3 className="text-2xl font-black font-heading uppercase leading-tight text-[#f4f1ea]">
                      Whistle's blown on {parsedTeams.teamA} vs{" "}
                      {parsedTeams.teamB}
                    </h3>
                    <p className="text-xs text-[#8e8a85] leading-relaxed max-w-xl">
                      Kickoff has passed for this fixture. Switch to an open match
                      above or below to build your duel card and earn Arena XP.
                    </p>
                  </div>
                </div>

                {/* Recommended Matches Area */}
                {(() => {
                  const recommended = sortedPvpEvents
                    .filter((e) => {
                      if (e.id === selectedPvpEvent.id) return false
                      const isClosed =
                        new Date() >= new Date(e.lockTime || e.deadline) ||
                        e.status === "resolved" ||
                        e.status === "closed"
                      return !isClosed
                    })
                    .slice(0, 3)

                  if (recommended.length === 0) return null

                  return (
                    <div className="border-t border-amber-200/20 dark:border-zinc-800/60 pt-6 mt-2">
                      <span className="block text-[10px] font-bold uppercase text-ash tracking-wider mb-4 font-mono">
                        Open now — pick one to play
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {recommended.map((evt) => {
                          const { teamA: recTeamA, teamB: recTeamB } =
                            parseEventTeams(evt.question)
                          const vol =
                            evt.options?.reduce(
                              (sum: number, opt: any) =>
                                sum + Number(opt.liquidity ?? 0),
                              0,
                            ) ?? 0

                          // Calculate remaining time label
                          let timeLabel = ""
                          const lockTimeStr = evt.lockTime || evt.deadline
                          if (lockTimeStr) {
                            const target = new Date(lockTimeStr)
                            const diff = target.getTime() - Date.now()
                            if (diff > 0) {
                              const diffHrs = Math.floor(
                                diff / (1000 * 60 * 60),
                              )
                              const diffMins = Math.floor(
                                (diff % (1000 * 60 * 60)) / (1000 * 60),
                              )
                              const diffDays = Math.floor(diffHrs / 24)
                              if (diffDays > 0) {
                                timeLabel = `In ${diffDays}d ${diffHrs % 24}h`
                              } else {
                                timeLabel = `In ${diffHrs}h ${diffMins}m`
                              }
                            }
                          }

                          return (
                            <div
                              key={evt.id}
                              onClick={() => setSelectedPvpEventId(evt.id)}
                              className="flex items-center justify-between p-3.5 rounded-[2px] border border-border bg-surface hover:border-accent transition-all cursor-pointer group"
                            >
                              <div className="text-left space-y-1 min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-charcoal-primary dark:text-zinc-200 truncate">
                                  <div className="flex items-center -space-x-1">
                                    <TeamBadge team={recTeamA} className="h-4.5 w-4.5" />
                                    <TeamBadge team={recTeamB} className="h-4.5 w-4.5" />
                                  </div>
                                  <span className="truncate">
                                    {recTeamA} vs {recTeamB}
                                  </span>
                                </div>
                                <span className="block text-[9px] font-mono text-ash font-medium uppercase tracking-wider">
                                  {timeLabel ? timeLabel : "Open now"}
                                </span>
                              </div>
                              <div className="h-7 w-7 rounded-full bg-stone-100 dark:bg-zinc-850 flex items-center justify-center shrink-0 text-charcoal-primary dark:text-zinc-300 group-hover:bg-brand-accent group-hover:text-black transition-all">
                                <ArrowRight className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <PvpTicketBuilder
                selectedPvpEvent={selectedPvpEvent}
                pvpEvents={sortedPvpEvents}
                pvpStatus={pvpStatus}
                pvpSelections={pvpSelections}
                isSubmitting={isSubmitting}
                showTooltip={showTooltip}
                referralsData={referralsData}
                parsedTeams={parsedTeams}
                groupedOptions={groupedOptions}
                onToggleSelection={handleToggleSelection}
                onSetShowTooltip={setShowTooltip}
                onSubmitTicket={handleSubmitPvpTicket}
              />
            ))}
        </>
      )}

      {/* Dedicated Duel History Link Card */}
      <div className="flex items-center justify-between p-4 border border-[#222226] bg-[#101012] hover:bg-[#161619] transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 border border-[#ff3b30]/30 bg-[#ff3b30]/10 text-[#ff3b30]">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-heading text-xs sm:text-sm font-black uppercase text-[#f4f1ea] tracking-tight">
              Looking for duel records?
            </h4>
            <p className="text-[11px] font-mono text-[#8e8a85]">
              View your lifetime head-to-head combat archive and settled match scorelines.
            </p>
          </div>
        </div>

        <Link
          href="/arena/history"
          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#ff3b30]/40 bg-[#ff3b30]/10 hover:bg-[#ff3b30]/20 font-mono text-[10px] font-bold uppercase tracking-wider text-[#ff3b30] transition-colors shrink-0"
        >
          <span>Duel History</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Sticky Mobile Duel Submission Bar */}
      {(!hasActiveDuel || showBuilderOverride) && !isEventEnded && (
        <div className="fixed bottom-[58px] inset-x-0 z-30 border-t border-[#202023] bg-[#0e0e10]/95 backdrop-blur-md px-4 py-2.5 md:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-black text-[#f4f1ea]">
                  {Object.keys(pvpSelections).length}/3
                </span>
                <span className="text-[11px] font-medium text-[#8e8a85]">
                  {Object.keys(pvpSelections).length >= 3
                    ? "Card complete"
                    : "Picks chosen"}
                </span>
              </div>
              <span className="text-[9px] font-mono text-[#8e8a85] truncate">
                {Object.keys(pvpSelections).length >= 3
                  ? "Ready to queue match"
                  : `Need ${3 - Object.keys(pvpSelections).length} more pick${3 - Object.keys(pvpSelections).length === 1 ? "" : "s"}`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => void handleSubmitPvpTicket()}
              disabled={Object.keys(pvpSelections).length < 3 || isSubmitting}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-[2px] font-heading uppercase text-xs font-black tracking-wider transition-all select-none cursor-pointer ${
                Object.keys(pvpSelections).length >= 3 && !isSubmitting
                  ? "bg-[#ff3b30] text-white hover:bg-[#e0342a] active:scale-95 shadow-[0_0_12px_rgba(255,59,48,0.3)]"
                  : "bg-[#1c1c1f] text-[#5a5651] cursor-not-allowed border border-[#28282e]"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Queueing...
                </>
              ) : (
                <>
                  <Swords className="h-3.5 w-3.5" />
                  Submit Duel
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Trade Drawer for PvP Picks */}
      <Drawer
        open={isTradeDrawerOpen}
        onOpenChange={(open) => !open && closeTradeDrawer()}
      >
        <DrawerContent className="max-h-[92vh] rounded-t-[2px] border-t border-border bg-background pb-6 px-4 outline-none overflow-y-auto">
          <DrawerHeader className="relative flex items-center justify-between border-b border-stone-surface pb-3 pt-2 mb-4">
            <DrawerTitle className="font-heading text-lg font-bold text-charcoal-primary">
              Trade Outcome Shares
            </DrawerTitle>
            <DrawerClose className="rounded-full p-1.5 hover:bg-stone-surface text-ash hover:text-charcoal-primary transition-colors">
              <X className="h-4.5 w-4.5" />
            </DrawerClose>
          </DrawerHeader>
          <div className="px-2">
            {tradeMarketId && (
              <MarketDetail marketId={tradeMarketId} hideOutcomesList={true} />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
