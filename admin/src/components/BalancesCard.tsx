"use client"

import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Wallet, Copy, Plus } from "lucide-react"

interface BalancesCardProps {
  adminBalances: {
    adminAddress: string
    arcBalance: number
    usdcBalance: number
    preDepositUsdcPerOption: number
    creationFeeUsdc: number
  } | null
  activeTab: string
  onOpenCreateDrawer: () => void
}

export default function BalancesCard({
  adminBalances,
  activeTab,
  onOpenCreateDrawer,
}: BalancesCardProps) {
  if (!adminBalances) return null

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text)
    toast.success("Address copied to clipboard!")
  }

  return (
    <div className="verity-card p-5 bg-linear-to-r from-indigo-50 to-indigo-100/30 border border-indigo-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
            Admin Wallet
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-sm font-semibold text-stone-800 break-all md:break-normal">
              {adminBalances.adminAddress}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(adminBalances.adminAddress)}
              className="text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-indigo-100/50 transition-colors cursor-pointer shrink-0"
              title="Copy Address"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-indigo-200/50">
        <div className="flex gap-6">
          <div>
            <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              USDC Balance
            </span>
            <span className="font-mono text-lg font-bold text-indigo-900">
              {adminBalances.usdcBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              USDC
            </span>
          </div>
        </div>

        {activeTab === "moderation" && (
          <Button
            onClick={onOpenCreateDrawer}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-4 h-11 text-xs tracking-wide shadow-sm flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            Create PvP Event
          </Button>
        )}
      </div>
    </div>
  )
}
