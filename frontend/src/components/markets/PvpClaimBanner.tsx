import { Trophy } from "lucide-react"
import { useMemo } from "react"

interface PvpClaimBannerProps {
  picks: any[] | undefined
  claimedMarketIds: Set<string>
  onClaim: (marketIds: string[], totalWinnings: number) => Promise<void>
  className?: string
  showEmoji?: boolean
  showEmptyState?: boolean
}

export default function PvpClaimBanner({
  picks,
  claimedMarketIds,
  onClaim,
  className = "",
  showEmptyState = false,
}: PvpClaimBannerProps) {
  const claimablePicks = useMemo(
    () =>
      picks?.filter(
        (p: any) =>
          p.isCorrect === true &&
          (p.shares ?? 0) > 0 &&
          !claimedMarketIds.has(p.marketId),
      ) || [],
    [picks, claimedMarketIds],
  )

  const totalWinnings = useMemo(
    () =>
      claimablePicks.reduce((acc: number, p: any) => acc + (p.shares ?? 0), 0),
    [claimablePicks],
  )

  const handleClaimAll = async () => {
    const marketIds = claimablePicks.map((p: any) => p.marketId)
    await onClaim(marketIds, totalWinnings)
  }

  if (claimablePicks.length === 0) {
    if (showEmptyState) {
      return (
        <div className="p-8 text-center text-xs text-[#8e8a85] font-mono border border-dashed border-[#222226] bg-[#101012]">
          No active PvP events right now. Check back soon for new matchups!
        </div>
      )
    }
    return null
  }

  return (
    <div
      className={`p-4 border border-[#222226] bg-[#101012] flex flex-col md:flex-row items-center justify-between gap-3 text-left ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center border border-[#ff3b30] bg-[#1e1212] text-[#ff3b30] shrink-0">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[#f4f1ea] font-heading uppercase">
            Duel Victory Rewards Available
          </h4>
          <p className="text-xs text-[#8e8a85] mt-0.5 font-mono">
            {claimablePicks.length} correct propositions settled.
          </p>
        </div>
      </div>
      <button
        onClick={handleClaimAll}
        className="px-4 py-2 bg-[#ff3b30] hover:bg-[#ff3b30]/90 text-black text-xs font-black uppercase tracking-wider transition-all shadow-sm shrink-0 cursor-pointer"
      >
        Claim Rewards
      </button>
    </div>
  )
}
