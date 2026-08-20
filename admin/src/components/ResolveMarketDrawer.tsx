"use client"

import { useState } from "react"
import { apiRequest } from "@/store/apiClient"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Trophy, Clock, AlertTriangle, Info, ExternalLink, CheckCircle } from "lucide-react"

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

interface ResolveMarketDrawerProps {
  isOpen: boolean
  onClose: () => void
  selectedMarketId: string | null
  markets: Market[]
  fetchMarkets: () => void
  fetchAdminStatus: () => void
  fetchMetricsData: () => void
  winningOutcome: string
  setWinningOutcome: (val: string) => void
  now: number
}

export default function ResolveMarketDrawer({
  isOpen,
  onClose,
  selectedMarketId,
  markets,
  fetchMarkets,
  fetchAdminStatus,
  fetchMetricsData,
  winningOutcome,
  setWinningOutcome,
  now,
}: ResolveMarketDrawerProps) {
  const [loading, setLoading] = useState(false)

  const selectedMarket = markets.find((m) => m.id === selectedMarketId)

  async function handleResolveMarket(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMarketId) return
    setLoading(true)
    try {
      await apiRequest(`/markets/${selectedMarketId}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          winningOutcome,
        }),
      })
      toast.success("Market resolved and outcomes settled successfully!")
      onClose()
      void fetchMarkets()
      void fetchAdminStatus()
      void fetchMetricsData()
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve market.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDisputeMarket(marketId: string) {
    setLoading(true)
    try {
      await apiRequest(`/markets/${marketId}/dispute`, {
        method: "POST",
      })
      toast.success("Market disputed successfully!")
      onClose()
      void fetchMarkets()
    } catch (err: any) {
      toast.error(err.message || "Failed to dispute market.")
    } finally {
      setLoading(false)
    }
  }

  if (!selectedMarket) return null

  const outcomes =
    selectedMarket.outcomes && selectedMarket.outcomes.length > 0
      ? selectedMarket.outcomes
      : ["YES", "NO"]

  // Calculate dispute window remaining seconds
  const disputeWindowSecs = selectedMarket.disputeWindowSeconds ?? 120
  const proposedTime = selectedMarket.proposedAt
    ? new Date(selectedMarket.proposedAt).getTime()
    : null
  const elapsedSecs = proposedTime ? (now - proposedTime) / 1000 : 0
  const remainingSecs = Math.max(0, Math.ceil(disputeWindowSecs - elapsedSecs))
  const isWindowActive =
    proposedTime !== null &&
    remainingSecs > 0 &&
    !selectedMarket.disputed &&
    selectedMarket.status === "resolving"

  function formatCountdown(sec: number) {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-w-2xl mx-auto p-6 bg-white border border-stone-200 rounded-[2px] shadow-2xl max-h-[90vh] overflow-y-auto">
        <DrawerHeader className="px-0 pt-0 pb-4 border-b border-stone-150">
          <DrawerTitle className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Resolve & Settle Prediction Market
          </DrawerTitle>
          <DrawerDescription className="text-xs text-stone-500 mt-1">
            Off-chain settlement for duel propositions and user prediction tickets.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-5 py-4">
          {/* Market Summary Card */}
          <div className="rounded-[2px] bg-stone-50 border border-stone-200 p-4 space-y-2">
            <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-stone-500 block">
              Market ID: {selectedMarket.id}
            </span>
            <h3 className="font-bold text-stone-900 text-sm leading-snug">
              {selectedMarket.question}
            </h3>
            <div className="flex items-center gap-4 text-xs text-stone-500 font-medium pt-1">
              <span>
                Status:{" "}
                <strong className="text-stone-800 uppercase font-mono">
                  {selectedMarket.status}
                </strong>
              </span>
              <span>
                Oracle:{" "}
                <strong className="text-stone-800">
                  {selectedMarket.resolutionSource || "Standard Oracle"}
                </strong>
              </span>
              <span>
                Deadline:{" "}
                <strong className="text-stone-800">
                  {new Date(selectedMarket.deadline).toLocaleDateString()}
                </strong>
              </span>
            </div>
          </div>

          {/* AI Proposal Card */}
          {selectedMarket.proposalReasoning && (
            <div className="rounded-[2px] bg-indigo-50/50 border border-indigo-150 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  AI Oracle Recommendation
                </span>
                <span className="text-[10px] font-mono text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded-[2px]">
                  Proposer: {selectedMarket.proposalProposer || "AI Agent"}
                </span>
              </div>

              <p className="text-xs text-stone-700 leading-relaxed font-sans">
                {selectedMarket.proposalReasoning}
              </p>

              {selectedMarket.proposalCitations &&
                selectedMarket.proposalCitations.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-stone-500">
                      Sources & Evidence:
                    </span>
                    <ul className="text-xs space-y-0.5 pl-4 list-disc text-stone-600">
                      {selectedMarket.proposalCitations.map((citation, i) => {
                        const isUrl =
                          citation.startsWith("http://") ||
                          citation.startsWith("https://")
                        return (
                          <li key={i} className="truncate max-w-full">
                            {isUrl ? (
                              <a
                                href={citation}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-0.5"
                              >
                                {citation}{" "}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ) : (
                              citation
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

              {/* Dispute Window Countdown and Action */}
              <div className="border-t border-indigo-100 pt-3 mt-1 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 flex items-center gap-1 font-semibold">
                    <Clock className="h-3.5 w-3.5" /> Dispute Window:
                  </span>
                  {selectedMarket.disputed ? (
                    <span className="text-red-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> DISPUTED
                    </span>
                  ) : isWindowActive ? (
                    <span className="text-amber-600 font-bold bg-amber-100/50 px-2 py-0.5 rounded-[2px]">
                      ACTIVE ({formatCountdown(remainingSecs)})
                    </span>
                  ) : (
                    <span className="text-stone-400 font-bold">CLOSED</span>
                  )}
                </div>

                {selectedMarket.disputed ? (
                  <div className="bg-red-50 text-red-700 p-3 rounded-[2px] text-xs font-semibold flex items-center gap-1.5 border border-red-200">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      This proposal is disputed (Disputer:{" "}
                      {selectedMarket.proposalDisputer}). Settle manually below.
                    </span>
                  </div>
                ) : isWindowActive ? (
                  <Button
                    type="button"
                    onClick={() => handleDisputeMarket(selectedMarket.id)}
                    disabled={loading}
                    className="w-full h-9 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider text-[10px] shadow-sm flex items-center justify-center gap-1 cursor-pointer transition-colors rounded-[2px]"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> Dispute Proposal
                  </Button>
                ) : (
                  <div className="bg-stone-50 text-stone-500 p-2.5 rounded-[2px] text-[11px] border border-stone-200/50">
                    Dispute window has closed. You can now finalize resolution
                    below using the proposed outcome or publish your own manual
                    arbitrated outcome.
                  </div>
                )}
              </div>
            </div>
          )}

          <form
            onSubmit={handleResolveMarket}
            className="flex flex-col gap-4 border-t border-stone-150 pt-4 mt-1"
          >
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Select Winning Outcome
              </label>
              <div className="flex flex-wrap gap-2">
                {outcomes.map((outcome) => {
                  const isSelected = winningOutcome === outcome
                  return (
                    <button
                      key={outcome}
                      type="button"
                      onClick={() => setWinningOutcome(outcome)}
                      className={`px-4 py-2.5 rounded-[2px] text-xs font-bold transition-all border ${
                        isSelected
                          ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                          : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50 cursor-pointer"
                      }`}
                    >
                      Settle as "{outcome}"
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-stone-100">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-11 border border-stone-200 text-stone-700 text-xs font-semibold uppercase tracking-wider rounded-[2px] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-2 h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-wider text-xs shadow-md disabled:opacity-50 cursor-pointer transition-colors rounded-[2px]"
              >
                {loading ? "Settling..." : `Confirm Settlement (${winningOutcome})`}
              </Button>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
