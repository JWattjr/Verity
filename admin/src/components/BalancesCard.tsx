"use client"

import { Button } from "@/components/ui/button"
import { Users, Swords, Plus, ShieldCheck, Activity } from "lucide-react"

interface BalancesCardProps {
  totalUsers?: number
  totalMarkets?: number
  activeTab: string
  onOpenCreateDrawer: () => void
}

export default function BalancesCard({
  totalUsers = 0,
  totalMarkets = 0,
  activeTab,
  onOpenCreateDrawer,
}: BalancesCardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* Users Count Card */}
      <div className="p-4 bg-white border border-stone-200 rounded-[2px] flex items-center gap-3.5 shadow-sm">
        <div className="h-10 w-10 rounded-[2px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 shrink-0">
          <Users className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
            Registered Users
          </h3>
          <p className="font-heading text-2xl font-extrabold text-stone-900">
            {totalUsers.toLocaleString()}
          </p>
          <span className="text-[10px] text-stone-400 font-medium">
            Active predictor accounts
          </span>
        </div>
      </div>

      {/* Markets & Events Card */}
      <div className="p-4 bg-white border border-stone-200 rounded-[2px] flex items-center gap-3.5 shadow-sm">
        <div className="h-10 w-10 rounded-[2px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
          <Swords className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
            PvP Events & Markets
          </h3>
          <p className="font-heading text-2xl font-extrabold text-stone-900">
            {totalMarkets.toLocaleString()}
          </p>
          <span className="text-[10px] text-stone-400 font-medium">
            Active propositions
          </span>
        </div>
      </div>

      {/* Quick Action */}
      <div className="p-4 bg-stone-50 border border-stone-200 rounded-[2px] flex flex-col justify-center gap-2">
        <Button
          onClick={onOpenCreateDrawer}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-[2px] h-10 text-xs tracking-wider uppercase shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Deploy PvP Match Card
        </Button>
      </div>
    </div>
  )
}
