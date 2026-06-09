"use client"

import { useState } from "react"
import { Award, Check, Copy } from "lucide-react"
import { toast } from "@/lib/toast"

interface PvpSidebarStatsProps {
  profile: any
  referralsData: any
}

export default function PvpSidebarStats({
  profile,
  referralsData,
}: PvpSidebarStatsProps) {
  const [copiedCode, setCopiedCode] = useState(false)

  function handleCopyReferral() {
    if (!referralsData?.referralLink) return
    const link = `${window.location.origin}/?ref=${referralsData.referralLink}`
    navigator.clipboard.writeText(link)
    setCopiedCode(true)
    toast.success("Referral link copied!")
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className="verity-card p-5 bg-indigo-50/10 dark:from-indigo-950/5">
      <div className="flex items-center gap-2.5 border-b border-border dark:border-zinc-800 pb-3 mb-4">
        <Award className="h-5 w-5 text-indigo-500" />
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-charcoal-primary dark:text-white">
          PvP Stats
        </h3>
      </div>

      <div>
        <div className="rounded-[10px] bg-white-surface dark:bg-zinc-900/50 p-3 shadow-subtle text-center">
          <span className="text-[10px] font-mono text-ash uppercase block">
            Arena XP
          </span>
          <strong className="text-xl font-mono text-indigo-600 dark:text-indigo-400 block mt-1">
            {profile?.arenaXp ?? 0}
          </strong>
        </div>
      </div>

      <div className="mt-4 border-t border-border dark:border-zinc-800 pt-3 flex items-center justify-between text-xs font-mono text-ash">
        <span>Record:</span>
        <span className="font-semibold text-charcoal-primary dark:text-white">
          {profile?.pvpMatchesWonCount ?? 0}W -{" "}
          {profile?.pvpMatchesLostCount ?? 0}L -{" "}
          {profile?.pvpMatchesDrawnCount ?? 0}D
        </span>
      </div>

      {/* Referral Link Copy inside Stats Box */}
      <div className="mt-4 border-t border-border dark:border-zinc-800 pt-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
            Referral Link
          </label>
          <span className="text-[9px] font-mono text-ash/70">
            (Earn XP boosts)
          </span>
        </div>
        <div className="flex h-9 items-center rounded-[8px] border border-border dark:border-zinc-800 bg-white-surface dark:bg-zinc-900 px-2.5 transition-colors">
          <input
            type="text"
            readOnly
            value={
              referralsData?.referralLink
                ? `${window.location.origin}/?ref=${referralsData.referralLink}`
                : "Loading link..."
            }
            className="w-full bg-transparent text-[11px] text-ash truncate outline-none select-all font-mono"
          />
          <button
            onClick={handleCopyReferral}
            disabled={!referralsData?.referralLink}
            className="ml-2 h-6.5 w-6.5 shrink-0 rounded-[6px] bg-parchment-card hover:bg-stone-surface border border-border dark:border-zinc-800 dark:bg-zinc-800 flex items-center justify-center text-charcoal-primary dark:text-white transition-colors"
          >
            {copiedCode ? (
              <Check className="h-3 w-3 text-meadow-green" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
