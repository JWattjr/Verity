"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { TrendingUp, Swords, Trophy, Sparkles } from "lucide-react"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { useMissionsQuery } from "@/store/verity/verityQueries"

interface NavItem {
  label: string
  href: string
  icon: typeof TrendingUp
  badge?: number
}

export default function MobileNav() {
  const pathname = usePathname()
  const { profile } = useWalletProfile()
  const { data: missions = [] } = useMissionsQuery(profile?.id)

  const incompleteMissionsCount = missions.filter((m: any) => !m.completed).length

  const NAV_ITEMS: NavItem[] = [
    { label: "Markets", href: "/", icon: TrendingUp },
    { label: "Arena", href: "/arena", icon: Swords },
    { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
    {
      label: "Missions",
      href: "/missions",
      icon: Sparkles,
      badge: incompleteMissionsCount > 0 ? incompleteMissionsCount : undefined,
    },
  ]

  function isTabActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname === href || Boolean(pathname?.startsWith(href + "/"))
  }

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#202023] bg-[#0b0b0c]/95 backdrop-blur-md px-2 pt-1 pb-[calc(env(safe-area-inset-bottom)+6px)] md:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.6)]"
    >
      <div className="mx-auto grid grid-cols-4 gap-1 max-w-md">
        {NAV_ITEMS.map((item) => {
          const active = isTabActive(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-[2px] transition-all select-none active:scale-95 ${
                active
                  ? "bg-[#161619] text-[#f4f1ea]"
                  : "text-[#8e8a85] hover:text-[#f4f1ea] hover:bg-[#111113]"
              }`}
            >
              {/* Active top signal rule */}
              {active && (
                <div
                  className="absolute -top-1 left-2 right-2 h-[2px] bg-[#ff3b30]"
                  aria-hidden="true"
                />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    active ? "text-[#ff3b30]" : "text-[#8e8a85]"
                  }`}
                  strokeWidth={active ? 2.3 : 1.8}
                />
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[#ff3b30] px-1 font-mono text-[8px] font-black text-white ring-2 ring-[#0b0b0c]">
                    {item.badge}
                  </span>
                )}
              </div>

              <span
                className={`mt-1 text-[10px] tracking-tight truncate max-w-full ${
                  active
                    ? "font-bold text-[#f4f1ea]"
                    : "font-medium text-[#8e8a85]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

