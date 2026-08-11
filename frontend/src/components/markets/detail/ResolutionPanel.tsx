"use client"

import { useState, useEffect } from "react"
import { ShieldCheck } from "lucide-react"
import { useMarketResolution } from "@/hooks/useMarketResolution"
import { MarketPost } from "@/lib/verity"

interface ResolutionPanelProps {
  market: MarketPost
  onDispute: () => Promise<void>
  actionLoading: string | null
  profileId: string | undefined
}

export default function ResolutionPanel({
  market,
  onDispute,
  actionLoading,
  profileId,
}: ResolutionPanelProps) {
  const { readProposal, readResolutionBond } = useMarketResolution()
  const [proposal, setProposal] = useState<any>(null)
  const [bond, setBond] = useState<number>(5.0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      const p = await readProposal(market.id)
      const b = await readResolutionBond()
      if (!active) return
      setProposal(p)
      setBond(b)
    }
    load()
    const interval = setInterval(load, 15000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [market.id, readProposal, readResolutionBond])

  useEffect(() => {
    if (
      !proposal ||
      proposal.finalized ||
      proposal.disputed ||
      proposal.proposer === "0x0000000000000000000000000000000000000000"
    ) {
      setTimeLeft(null)
      return
    }
    const windowSecs = Number(
      process.env.NEXT_PUBLIC_DISPUTE_WINDOW_SECONDS || 120,
    )
    const endTime = proposal.proposalTime + windowSecs

    const interval = setInterval(() => {
      const remaining = endTime - Math.floor(Date.now() / 1000)
      if (remaining <= 0) {
        setTimeLeft(0)
        clearInterval(interval)
      } else {
        setTimeLeft(remaining)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [proposal])

  const now = new Date()
  const isPastDeadline = now >= new Date(market.deadline)
  const isResolving = market.status === "resolving"
  const isResolved = market.status === "resolved"

  if (!isPastDeadline && !isResolving && !isResolved) return null

  // Quantitative price feed market resolves directly via Pyth update
  const isPyth = Boolean(market.priceFeedId || market.price_feed_id)

  return (
    <section className="verity-card p-4 sm:p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center bg-meadow-green/10">
          <ShieldCheck className="h-5 w-5 text-meadow-green" />
        </span>
        <h2 className="text-[19px] font-semibold leading-[1.28] tracking-[-0.25px] text-charcoal-primary">
          Market Resolution
        </h2>
      </div>

      {isPyth ? (
        <div className="bg-parchment-card p-4 shadow-subtle">
          <p className="text-sm leading-relaxed tracking-[-0.18px] text-ash">
            <strong>Pyth Quantitative Market:</strong> This prediction resolves
            automatically on-chain using real-time price oracle updates. No
            manual resolution proposal or disputes are needed.
          </p>
        </div>
      ) : (
        <>
          {isPastDeadline && !proposal && !isResolved && (
            <div className="bg-parchment-card p-4 shadow-subtle">
              <p className="text-sm leading-relaxed tracking-[-0.18px] text-ash">
                The market trading period has expired. Awaiting AI Agent
                resolution proposal on-chain...
              </p>
            </div>
          )}

          {proposal &&
            !proposal.finalized &&
            !proposal.disputed &&
            proposal.proposer !==
              "0x0000000000000000000000000000000000000000" && (
              <div className="flex flex-col gap-3 bg-parchment-card p-4 shadow-subtle">
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase text-ash">
                    Active Proposal
                  </span>
                  <p className="mt-1 text-sm font-semibold text-charcoal-primary">
                    Proposed Outcome:{" "}
                    <span
                      className={
                        proposal.proposedWinningOutcome
                          ? "text-meadow-green"
                          : "text-ember-orange"
                      }
                    >
                      {proposal.proposedWinningOutcome ? "YES" : "NO"}
                    </span>
                  </p>
                  <p className="mt-1 font-mono text-xs text-ash">
                    Proposer: {proposal.proposer.slice(0, 6)}...
                    {proposal.proposer.slice(-4)}
                  </p>
                </div>

                {timeLeft !== null && timeLeft > 0 ? (
                  <div className="bg-white-surface p-3 shadow-subtle">
                    <span className="font-mono text-[10px] font-semibold uppercase text-ash">
                      Dispute Window Closes In
                    </span>
                    <p className="mt-1 font-mono text-lg font-semibold text-meadow-green">
                      {Math.floor(timeLeft / 60)}m {timeLeft % 60}s
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-ash">
                      If you disagree with this outcome, you can dispute it by
                      placing a <strong>{bond} USDC</strong> dispute bond.
                    </p>
                    <button
                      className="verity-pill mt-3 flex h-10 w-full items-center justify-center bg-ember-orange font-mono text-xs font-semibold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={Boolean(actionLoading) || !profileId}
                      onClick={onDispute}
                      type="button"
                    >
                      {actionLoading === "dispute"
                        ? "Disputing..."
                        : `Dispute Proposal (${bond} USDC)`}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white-surface p-3 shadow-subtle">
                    <span className="font-mono text-[10px] font-semibold uppercase text-ash">
                      Dispute Window Has Closed
                    </span>
                    <p className="mt-1 text-sm font-medium tracking-[-0.18px] text-charcoal-primary">
                      Awaiting administrative finalization of the proposed
                      outcome on-chain.
                    </p>
                  </div>
                )}
              </div>
            )}

          {proposal && proposal.disputed && !isResolved && (
            <div className="bg-ember-orange/10 p-4 shadow-subtle">
              <span className="font-mono text-[10px] font-semibold uppercase text-ember-orange">
                Disputed
              </span>
              <p className="mt-1 text-sm font-semibold text-charcoal-primary">
                Outcome proposal has been officially disputed!
              </p>
              <p className="mt-2 font-mono text-xs text-ash">
                Disputer: {proposal.disputer.slice(0, 6)}...
                {proposal.disputer.slice(-4)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ash">
                This market is currently escalated to Admin Arbitration. The
                resolution will be determined shortly.
              </p>
            </div>
          )}
        </>
      )}

      {isResolved && (
        <div className="flex flex-col gap-3 bg-meadow-green/10 p-4 shadow-subtle">
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase text-meadow-green">
              Resolved Outcome
            </span>
            <p className="mt-1 text-lg font-semibold tracking-[-0.25px] text-charcoal-primary">
              Resolved to:{" "}
              <span
                className={
                  market.resolvedOutcome === "YES"
                    ? "text-meadow-green"
                    : "text-ember-orange"
                }
              >
                {market.resolvedOutcome}
              </span>
            </p>
            {market.resolvedByAdmin && (
              <p className="mt-1 font-mono text-xs text-ash">
                Finalized by: {market.resolvedByAdmin}
              </p>
            )}
          </div>

          {market.proposalReasoning && (
            <div className="bg-white-surface p-3 text-xs leading-relaxed text-charcoal-primary shadow-subtle">
              <p className="mb-1 font-semibold">AI Agent Reasoning:</p>
              <p className="italic text-ash">{market.proposalReasoning}</p>
              {market.proposalCitations &&
                market.proposalCitations.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 font-semibold">Sources & Citations:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {market.proposalCitations.map((c, i) => (
                        <li key={i} className="max-w-full truncate text-ash">
                          <a
                            href={c}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[10px] text-ember-orange hover:underline"
                          >
                            {c}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
