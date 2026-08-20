"use client"

import { useState, useEffect } from "react"
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
import {
  Trophy,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ShieldAlert,
  Flame,
} from "lucide-react"

interface MatchStatistics {
  homeTeam: string
  awayTeam: string
  status: string
  homeGoals: number
  awayGoals: number
  homeCorners: number
  awayCorners: number
  homeYellowCards: number
  awayYellowCards: number
  homeRedCards: number
  awayRedCards: number
  homeOffsides: number
  awayOffsides: number
  homeFouls: number
  awayFouls: number
  sourceUrl?: string
}

interface PropositionEvaluation {
  marketId: string
  question: string
  optionName: string
  outcomes: string[]
  evaluation: {
    outcome: string
    reasoning: string
    citations: string[]
    isConfident: boolean
  }
}

interface FixturePreviewResponse {
  parentMarketId: string
  fixtureQuestion: string
  matchStats: MatchStatistics
  evaluations: PropositionEvaluation[]
  resolutionReady: boolean
}

interface BatchResolveDrawerProps {
  isOpen: boolean
  onClose: () => void
  selectedFixtureId: string | null
  onSuccess: () => void
}

export default function BatchResolveDrawer({
  isOpen,
  onClose,
  selectedFixtureId,
  onSuccess,
}: BatchResolveDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewData, setPreviewData] = useState<FixturePreviewResponse | null>(
    null,
  )
  const [customOutcomes, setCustomOutcomes] = useState<Record<string, string>>(
    {},
  )
  const isTerminalFixture = Boolean(
    previewData &&
      ["FT", "AET", "PEN", "FINISHED"].includes(previewData.matchStats.status),
  )
  const hasValidOutcomes = Boolean(
    previewData?.evaluations.every((item) =>
      item.outcomes.includes(customOutcomes[item.marketId]),
    ),
  )
  const canSettle = isTerminalFixture && hasValidOutcomes

  useEffect(() => {
    if (isOpen && selectedFixtureId) {
      void fetchPreview()
    } else {
      setPreviewData(null)
      setCustomOutcomes({})
    }
  }, [isOpen, selectedFixtureId])

  async function fetchPreview() {
    if (!selectedFixtureId) return
    setLoading(true)
    try {
      const data = await apiRequest<FixturePreviewResponse>(
        `/markets/fixture/${selectedFixtureId}/preview-resolution`,
      )
      setPreviewData(data)
      // Pre-fill outcomes map with auto-evaluated values
      const initial: Record<string, string> = {}
      for (const item of data.evaluations) {
        initial[item.marketId] = item.evaluation.outcome
      }
      setCustomOutcomes(initial)
    } catch (err: any) {
      toast.error(err.message || "Failed to load fixture preview statistics.")
    } finally {
      setLoading(false)
    }
  }

  function handleOutcomeChange(marketId: string, value: string) {
    setCustomOutcomes((prev) => ({
      ...prev,
      [marketId]: value,
    }))
  }

  async function handleBatchSettle(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFixtureId || !previewData) return
    if (!canSettle) {
      toast.error(
        "Choose a valid stored outcome for every proposition after the fixture is final.",
      )
      return
    }

    setSubmitting(true)
    try {
      await apiRequest("/markets/resolve-fixture", {
        method: "POST",
        body: JSON.stringify({
          parentMarketId: selectedFixtureId,
          outcomes: customOutcomes,
          adminAddress: "0x0000000000000000000000000000000000000000",
        }),
      })

      toast.success(
        `Successfully settled ${previewData.evaluations.length} propositions for ${previewData.fixtureQuestion}!`,
      )
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to execute batch resolution.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90dvh] overflow-hidden bg-background border-t border-border p-0 outline-none font-sans rounded-t-[2px] after:hidden">
        <div className="mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6 sm:pt-6">
          <div className="space-y-6">
            <DrawerHeader className="px-0 pb-4 border-b border-border">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <DrawerTitle className="font-heading text-2xl font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-amber-500" />
                    Match Resolution Hub
                  </DrawerTitle>
                  <DrawerDescription className="text-sm text-muted-foreground mt-1">
                    Deterministic Sports Oracle evaluation & 1-click batch
                    settlement across all match propositions.
                  </DrawerDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPreview}
                  disabled={loading}
                  className="w-full gap-1.5 font-mono text-xs rounded-[2px] sm:w-auto"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh Oracle
                </Button>
              </div>
            </DrawerHeader>

            {loading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-500" />
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  Querying Official Match Boxscore & Evaluating Propositions...
                </p>
              </div>
            ) : previewData ? (
              <form onSubmit={handleBatchSettle} className="space-y-6">
                {/* Match Header & Boxscore Stats Banner */}
                <div className="rounded-[2px] border border-border bg-card p-5 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        Fixture Event
                      </span>
                      <h3 className="font-heading text-xl font-black text-foreground">
                        {previewData.fixtureQuestion}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[10px] font-bold uppercase px-2.5 py-1 rounded-[2px] border ${
                          isTerminalFixture
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                        }`}
                      >
                        STATUS: {previewData.matchStats.status}
                      </span>
                    </div>
                  </div>

                  {/* Grid of Key Match Statistics */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="rounded-[2px] bg-muted/40 p-3 border border-border text-center">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                        Score
                      </span>
                      <strong className="font-mono text-lg font-bold text-foreground mt-0.5 block">
                        {previewData.matchStats.homeGoals} -{" "}
                        {previewData.matchStats.awayGoals}
                      </strong>
                    </div>

                    <div className="rounded-[2px] bg-muted/40 p-3 border border-border text-center">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                        Corners
                      </span>
                      <strong className="font-mono text-lg font-bold text-foreground mt-0.5 block">
                        {previewData.matchStats.homeCorners +
                          previewData.matchStats.awayCorners}{" "}
                        <span className="text-xs text-muted-foreground font-normal">
                          ({previewData.matchStats.homeCorners}-
                          {previewData.matchStats.awayCorners})
                        </span>
                      </strong>
                    </div>

                    <div className="rounded-[2px] bg-muted/40 p-3 border border-border text-center">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                        Yellow Cards
                      </span>
                      <strong className="font-mono text-lg font-bold text-foreground mt-0.5 block">
                        {previewData.matchStats.homeYellowCards +
                          previewData.matchStats.awayYellowCards}
                      </strong>
                    </div>

                    <div className="rounded-[2px] bg-muted/40 p-3 border border-border text-center">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                        Red Cards
                      </span>
                      <strong
                        className={`font-mono text-lg font-bold mt-0.5 block ${
                          previewData.matchStats.homeRedCards +
                            previewData.matchStats.awayRedCards >
                          0
                            ? "text-red-500"
                            : "text-foreground"
                        }`}
                      >
                        {previewData.matchStats.homeRedCards +
                          previewData.matchStats.awayRedCards}
                      </strong>
                    </div>

                    <div className="rounded-[2px] bg-muted/40 p-3 border border-border text-center">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                        Offsides
                      </span>
                      <strong className="font-mono text-lg font-bold text-foreground mt-0.5 block">
                        {previewData.matchStats.homeOffsides +
                          previewData.matchStats.awayOffsides}
                      </strong>
                    </div>
                  </div>
                </div>

                {!previewData.resolutionReady && (
                  <div
                    role="status"
                    className="flex items-start gap-3 border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold">
                        Manual review required
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-amber-900">
                        The oracle could not settle every proposition
                        automatically. Select an exact market outcome for each
                        flagged row. A live or postponed fixture cannot be
                        settled here.
                      </p>
                    </div>
                  </div>
                )}

                {/* Propositions Evaluation Ledger */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-emerald-500" />
                      Sub-Propositions Evaluation Matrix (
                      {previewData.evaluations.length})
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      All values pre-calculated from verified stats. Overrides
                      supported.
                    </span>
                  </div>

                  <div className="rounded-[2px] border border-border divide-y divide-border bg-card overflow-hidden">
                    {previewData.evaluations.map((item) => {
                      const currentOutcome =
                        customOutcomes[item.marketId] || item.evaluation.outcome

                      return (
                        <div
                          key={item.marketId}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                        >
                          <div className="space-y-1 flex-1 pr-2 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-[2px]">
                                {item.optionName}
                              </span>
                              <h5 className="text-sm font-bold text-foreground truncate">
                                {item.question}
                              </h5>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {item.evaluation.reasoning}
                            </p>
                          </div>

                          {/* Outcome Badge & Editor */}
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              aria-label={`Winning outcome for ${item.optionName}`}
                              value={currentOutcome}
                              onChange={(e) =>
                                handleOutcomeChange(
                                  item.marketId,
                                  e.target.value,
                                )
                              }
                              className="h-10 min-w-56 max-w-full px-3 text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50"
                            >
                              {!item.outcomes.includes(currentOutcome) && (
                                <option value={currentOutcome} disabled>
                                  Select a valid outcome
                                </option>
                              )}
                              {item.outcomes.map((outcome) => (
                                <option key={outcome} value={outcome}>
                                  {outcome}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={submitting}
                    className="w-full rounded-[2px] sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !canSettle}
                    title={
                      canSettle
                        ? "Settle all propositions"
                        : "The fixture must be final and every outcome must be selected"
                    }
                    className="h-10 w-full gap-2 rounded-[2px] bg-emerald-600 px-6 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-emerald-700 sm:w-auto cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Settling Match...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm & Settle All Propositions (
                        {previewData.evaluations.length})
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No preview data available.
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
