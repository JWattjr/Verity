"use client"

import { useEffect, useMemo, useState } from "react"
import PvpMatchupCarousel from "@/components/markets/PvpMatchupCarousel"
import PvpTicketBuilder from "@/components/markets/PvpTicketBuilder"
import PvpDuelStatus from "@/components/markets/PvpDuelStatus"
import PvpDuelPicks from "@/components/markets/PvpDuelPicks"

type PreviewState = "builder" | "queued" | "matched" | "won" | "lost"

const previewEvents = [
  {
    id: "nga-arg",
    question: "Nigeria vs Argentina",
    lockTime: "2026-07-19T19:00:00.000Z",
    status: "open",
    options: [
      {
        id: "winner",
        optionGroup: "match_winner",
        optionName: "Match winner",
        outcomeCount: 3,
        outcomes: ["Nigeria wins", "Draw", "Argentina wins"],
        outcomePrices: [0.31, 0.27, 0.42],
        liquidity: 8200,
      },
      {
        id: "goals",
        optionGroup: "total_goals",
        optionName: "Total goals",
        yesCondition: "Over 2.5",
        noCondition: "Under 2.5",
        usdcYesAmount: 4100,
        usdcNoAmount: 3300,
        liquidity: 7400,
      },
      {
        id: "corners",
        optionGroup: "total_corners",
        optionName: "Total corners",
        yesCondition: "Over 9.5",
        noCondition: "Under 9.5",
        usdcYesAmount: 2700,
        usdcNoAmount: 2100,
        liquidity: 4800,
      },
      {
        id: "cards",
        optionGroup: "yellow_cards",
        optionName: "Yellow cards",
        yesCondition: "Over 4.5",
        noCondition: "Under 4.5",
        usdcYesAmount: 1900,
        usdcNoAmount: 2400,
        liquidity: 4300,
      },
      {
        id: "red-card",
        optionGroup: "red_card",
        optionName: "Red card",
        yesCondition: "Red card shown",
        noCondition: "No red card",
        usdcYesAmount: 800,
        usdcNoAmount: 3500,
        liquidity: 4300,
      },
    ],
  },
  {
    id: "bra-fra",
    question: "Brazil vs France",
    lockTime: "2026-07-20T16:00:00.000Z",
    status: "open",
    options: [],
  },
  {
    id: "eng-esp",
    question: "England vs Spain",
    lockTime: "2026-07-15T19:00:00.000Z",
    status: "resolved",
    options: [],
  },
]

export default function LiveArenaPreview() {
  const [selectedEventId, setSelectedEventId] = useState(previewEvents[0].id)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [amount, setAmount] = useState(5)
  const [previewState, setPreviewState] = useState<PreviewState>("builder")

  useEffect(() => {
    const requestedState = new URLSearchParams(window.location.search).get(
      "state",
    )
    if (
      requestedState === "builder" ||
      requestedState === "queued" ||
      requestedState === "matched" ||
      requestedState === "won" ||
      requestedState === "lost"
    ) {
      const updateState = window.setTimeout(
        () => setPreviewState(requestedState),
        0,
      )
      return () => window.clearTimeout(updateState)
    }
  }, [])

  const selectedEvent = useMemo(
    () =>
      previewEvents.find((event) => event.id === selectedEventId) ||
      previewEvents[0],
    [selectedEventId],
  )

  const groupedOptions = useMemo(() => {
    const groups: Record<string, (typeof selectedEvent.options)[number][]> = {}
    selectedEvent.options.forEach((option) => {
      if (!groups[option.optionGroup]) groups[option.optionGroup] = []
      groups[option.optionGroup].push(option)
    })
    return groups
  }, [selectedEvent])

  const parsedTeams = useMemo(() => {
    const [teamA = "Side A", teamB = "Side B"] =
      selectedEvent.question.split(/\s+vs\.?\s+/i)
    return { teamA, teamB }
  }, [selectedEvent])

  const previewDuel = useMemo(
    () => buildPreviewDuel(selectedEvent, previewState),
    [previewState, selectedEvent],
  )

  function selectPreviewState(state: PreviewState) {
    setPreviewState(state)
    const url = new URL(window.location.href)
    url.searchParams.set("state", state)
    window.history.replaceState({}, "", url)
  }

  return (
    <div className="py-10 sm:py-14">
      <header className="mb-6 border-b border-border pb-6 sm:mb-8 sm:pb-8">
        <p className="mb-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ash">
          <span className="h-2 w-2 bg-accent" aria-hidden="true" />
          Verity · PVP Arena
        </p>
        <h1 className="text-[58px] font-extrabold leading-[0.82] tracking-[0.01em] text-charcoal-primary sm:text-[82px]">
          PVP <span className="text-accent">ARENA</span>
        </h1>
        <div className="mt-5 flex">
          <div className="flex border border-border bg-surface">
            <div className="border-r border-border px-4 py-3">
              <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-ash">
                Open cards
              </span>
              <strong className="mt-1 block font-heading text-2xl text-charcoal-primary">
                {String(
                  previewEvents.filter((event) => event.status === "open")
                    .length,
                ).padStart(2, "0")}
              </strong>
            </div>
            <div className="px-4 py-3">
              <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-ash">
                Min picks
              </span>
              <strong className="mt-1 block font-heading text-2xl text-accent">
                03
              </strong>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <PvpMatchupCarousel
          pvpEvents={previewEvents}
          selectedPvpEventId={selectedEventId}
          setSelectedPvpEventId={(id) => id && setSelectedEventId(id)}
        />

        <div className="grid grid-cols-2 border-l border-t border-border font-sans text-[10px] font-extrabold uppercase tracking-[0.1em] sm:grid-cols-5">
          {(["builder", "queued", "matched", "won", "lost"] as const).map(
            (state) => (
              <button
                className={`min-h-11 border-b border-r border-border px-3 transition-colors ${
                  previewState === state
                    ? "bg-accent text-black"
                    : "bg-black text-white hover:bg-surface-muted hover:text-charcoal-primary"
                }`}
                key={state}
                onClick={() => selectPreviewState(state)}
                type="button"
              >
                {state === "builder"
                  ? "Build card"
                  : state === "queued"
                    ? "Finding rival"
                    : state === "matched"
                      ? "Matched"
                      : `Result · ${state}`}
              </button>
            ),
          )}
        </div>

        {previewState === "builder" ? (
          <PvpTicketBuilder
            selectedPvpEvent={selectedEvent}
            pvpEvents={previewEvents}
            pvpStatus={null}
            pvpSelections={selections}
            betAmountPerSelection={amount}
            isSubmitting={false}
            showTooltip={false}
            referralsData={null}
            parsedTeams={parsedTeams}
            groupedOptions={groupedOptions}
            onToggleSelection={(optionId, selection) =>
              setSelections((current) => {
                const next = { ...current }
                if (next[optionId] === selection) delete next[optionId]
                else next[optionId] = selection
                return next
              })
            }
            onSetBetAmount={setAmount}
            onSetShowTooltip={() => undefined}
            onSubmitTicket={() => undefined}
            onProvideLiquidity={async () => undefined}
            onAddLiquidity={() => undefined}
          />
        ) : (
          <>
            <PvpDuelStatus
              profile={{ displayName: "You", username: "verity_player" }}
              pvpStatus={previewDuel}
              runningScoreOpponent={previewDuel.runningScoreOpponent}
              runningScoreUser={previewDuel.runningScoreUser}
              status={previewDuel.status}
            />
            {previewState !== "queued" && (
              <PvpDuelPicks pvpStatus={previewDuel} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function buildPreviewDuel(
  selectedEvent: (typeof previewEvents)[number],
  previewState: PreviewState,
) {
  const isResolved = previewState === "won" || previewState === "lost"
  const userCorrect =
    previewState === "lost" ? [true, false, false] : [true, true, true]
  const opponentCorrect =
    previewState === "lost" ? [true, true, true] : [true, false, false]

  const options = selectedEvent.options.slice(0, 3).map((option, index) => ({
    ...option,
    status: isResolved ? "resolved" : "tradable",
    resolvedOutcome: isResolved
      ? index === 1
        ? "NO"
        : index === 0
          ? "Nigeria wins"
          : "YES"
      : null,
  }))

  const userSelections = ["Nigeria wins", "NO", "YES"]
  const opponentSelections = ["Argentina wins", "YES", "NO"]

  return {
    status:
      previewState === "queued"
        ? ("queued" as const)
        : isResolved
          ? ("resolved" as const)
          : ("matched" as const),
    event: { ...selectedEvent, options },
    match: { divergenceScore: 67 },
    ticket: {
      picks: options.map((option, index) => ({
        marketId: option.id,
        optionName: option.optionName,
        selection: userSelections[index],
        investedUsdc: 5,
        status: isResolved ? "resolved" : "tradable",
        resolvedOutcome: option.resolvedOutcome,
        arenaCorrect: isResolved ? userCorrect[index] : null,
      })),
    },
    opponent: {
      username: "SignalRival",
      picks: options.map((option, index) => ({
        marketId: option.id,
        optionName: option.optionName,
        selection: opponentSelections[index],
        status: isResolved ? "resolved" : "tradable",
        resolvedOutcome: option.resolvedOutcome,
        arenaCorrect: isResolved ? opponentCorrect[index] : null,
      })),
    },
    runningScoreUser: isResolved ? userCorrect.filter(Boolean).length : 0,
    runningScoreOpponent: isResolved
      ? opponentCorrect.filter(Boolean).length
      : 0,
  }
}
