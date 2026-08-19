"use client"

import Link from "next/link"
import {
  Sparkles,
  TrendingUp,
  Plus,
  Swords,
  Trophy,
  User,
  Settings,
  X,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/AuthModals"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { useMissionsQuery } from "@/store/verity/verityQueries"
import { useDrawerStore } from "@/store/drawerStore"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer"

export default function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { authenticated, login } = useAuth()
  const { profile } = useWalletProfile()
  const { data: missions = [] } = useMissionsQuery(profile?.id)

  const { isQuickActionsOpen, openQuickActions, closeQuickActions } = useDrawerStore()

  const incompleteMissionsCount = missions.filter((m: any) => !m.completed).length

  const navigateTo = (href: string) => {
    closeQuickActions()
    router.push(href)
  }

  const MOBILE_NAV_ITEMS = [
    { icon: TrendingUp, label: "Markets", href: "/" },
    { icon: Swords, label: "Arena", href: "/arena" },
    { icon: null, label: "More", href: "#actions" }, // Center placeholder
    { icon: Trophy, label: "Leaderboard", href: "/leaderboard" },
    { icon: Sparkles, label: "Missions", href: "/missions" },
  ]

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur-lg sm:hidden">
        <div className="mx-auto grid max-w-[672px] grid-cols-5 gap-1 relative">
          {MOBILE_NAV_ITEMS.map((item, idx) => {
            // Render the central "+" button
            if (idx === 2) {
              return (
                <button
                  key="center-actions"
                  onClick={() => openQuickActions()}
                  className="flex flex-col items-center justify-center shrink-0 -mt-4 cursor-pointer"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ember-orange text-white shadow-lg hover:bg-ember-orange/95 active:scale-95 transition-all">
                    <Plus className="h-6 w-6 stroke-[3px]" />
                  </div>
                  <span className="text-[10px] font-bold text-charcoal-primary tracking-[-0.12px] mt-1.5">
                    Menu
                  </span>
                </button>
              )
            }

            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname?.startsWith(item.href + "/")

            return (
              <Link
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold tracking-[-0.12px] transition-colors ${
                  isActive
                    ? "bg-stone-surface text-charcoal-primary"
                    : "hover:bg-stone-surface/40 text-ash hover:text-charcoal-primary"
                }`}
                href={item.href || "/"}
                key={item.label}
              >
                <div className="relative flex items-center justify-center shrink-0">
                  {item.icon && <item.icon className="h-5 w-5" />}
                  {item.href === "/missions" && incompleteMissionsCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-coral-red text-[8px] font-bold text-white shadow-sm ring-1.5 ring-surface">
                      {incompleteMissionsCount}
                    </span>
                  )}
                </div>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Quick Actions Drawer */}
      <Drawer
        open={isQuickActionsOpen}
        onOpenChange={(open) => !open && closeQuickActions()}
      >
        <DrawerContent className="max-h-[85vh] rounded-t-3xl border-t border-border bg-surface pb-8 px-4 outline-none">
          <div className="relative flex flex-row items-center justify-between border-b border-border pb-4 pt-2 mb-4 px-2 flex-shrink-0">
            <DrawerTitle className="font-heading text-lg font-bold text-charcoal-primary flex items-center gap-2 m-0">
              <span className="inline-block h-3 w-3 rounded-full bg-ember-orange" />
              Verity Quick Hub
            </DrawerTitle>
            <DrawerClose className="rounded-full p-1.5 hover:bg-stone-surface text-ash hover:text-charcoal-primary transition-colors">
              <X className="h-4 w-4" />
            </DrawerClose>
          </div>

          <div className="grid grid-cols-2 gap-3 px-2">
            <button
              onClick={() => navigateTo("/arena")}
              className="flex flex-col items-center justify-center p-4 rounded-[2px] bg-stone-surface hover:bg-stone-surface/70 border border-border text-center transition-all group active:scale-98 cursor-pointer"
            >
              <div className="h-10 w-10 rounded-full bg-ember-orange/10 text-ember-orange flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Swords className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-charcoal-primary">
                PvP Arena
              </span>
              <span className="text-[10px] text-ash mt-0.5">
                Head-to-head duels
              </span>
            </button>

            <button
              onClick={() => navigateTo("/leaderboard")}
              className="flex flex-col items-center justify-center p-4 rounded-[2px] bg-stone-surface hover:bg-stone-surface/70 border border-border text-center transition-all group active:scale-98 cursor-pointer"
            >
              <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Trophy className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-charcoal-primary">
                Leaderboard
              </span>
              <span className="text-[10px] text-ash mt-0.5">
                XP rank standings
              </span>
            </button>

            <button
              onClick={() => navigateTo("/missions")}
              className="flex flex-col items-center justify-center p-4 rounded-[2px] bg-stone-surface hover:bg-stone-surface/70 border border-border text-center transition-all group active:scale-98 cursor-pointer"
            >
              <div className="h-10 w-10 rounded-full bg-sunburst-yellow/10 text-sunburst-yellow flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-charcoal-primary">
                Missions & Tasks
              </span>
              <span className="text-[10px] text-ash mt-0.5">
                {incompleteMissionsCount > 0
                  ? `${incompleteMissionsCount} pending tasks`
                  : "All completed!"}
              </span>
            </button>

            <button
              onClick={() => navigateTo("/profile")}
              className="flex flex-col items-center justify-center p-4 rounded-[2px] bg-stone-surface hover:bg-stone-surface/70 border border-border text-center transition-all group active:scale-98 cursor-pointer"
            >
              <div className="h-10 w-10 rounded-full bg-meadow-green/10 text-meadow-green flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <User className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-charcoal-primary">
                My Profile
              </span>
              <span className="text-[10px] text-ash mt-0.5">
                Stats & duel history
              </span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
