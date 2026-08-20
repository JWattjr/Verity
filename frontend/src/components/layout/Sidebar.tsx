"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  TrendingUp,
  Trophy,
  Sparkles,
  Swords,
} from "lucide-react"
import ThemeToggle from "@/components/layout/ThemeToggle"
import SidebarProfile from "@/components/layout/SidebarProfile"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { useNotificationsQuery, useMissionsQuery } from "@/store/verity/verityQueries"
import { useAuth } from "@/components/providers/AuthModals"
import VerityMark from "@/components/brand/VerityMark"

const NAV_ITEMS = [
  { icon: TrendingUp, label: "Markets", href: "/" },
  { icon: Swords, label: "Arena", href: "/arena" },
  { icon: Trophy, label: "Leaderboard", href: "/leaderboard" },
  { icon: Sparkles, label: "Missions", href: "/missions" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
]

export default function Sidebar() {
  const pathname = usePathname()

  const { authenticated, login } = useAuth()
  const { profile } = useWalletProfile()
  const { data: notifications = [] } = useNotificationsQuery(profile?.id || "")
  const unreadCount = notifications.filter((n: any) => !n.read).length
  const { data: missions = [] } = useMissionsQuery(profile?.id)
  const incompleteMissionsCount = missions.filter((m: any) => !m.completed).length

  return (
    <div className="verity-card flex h-full flex-col p-4">
      {/* Logo */}
      <div className="mb-3 flex items-center justify-between">
        <Link
          href="/"
          className="clickable-surface group flex w-fit items-center gap-3 rounded-[12px] py-4 xl:px-4"
        >
          <VerityMark
            className="h-10 w-10 transition-transform group-hover:-translate-y-0.5"
            priority
            size={40}
          />
          <span className="hidden text-[23px] font-semibold leading-none tracking-[-0.44px] text-charcoal-primary xl:block">
            Verity
          </span>
        </Link>
        <div className="hidden xl:block">
          <ThemeToggle />
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href + "/"))
          const href = item.href === "/profile" ? `/profile` : item.href
          const isAuthRequired =
            item.href === "/profile" || item.href === "/portfolio"
          return (
            <Link
              key={item.label}
              href={href}
              onClick={(e) => {
                // if (isAuthRequired && !authenticated) {
                //   e.preventDefault()
                //   login()
                // }
              }}
              className="group flex w-fit items-center xl:w-full"
            >
              <div
                className={`flex items-center gap-3 rounded-[10px] p-3 text-[15px] transition-all duration-200 xl:w-full xl:px-4 xl:py-3 ${isActive
                    ? "bg-inverse text-inverse-text font-semibold"
                    : "clickable-surface text-graphite"
                  }`}
              >
                <div className="relative flex items-center justify-center shrink-0">
                  <item.icon className="h-6 w-6 xl:h-5 xl:w-5" />
                  {item.href === "/notifications" && unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-coral-red text-[8px] font-bold text-white shadow-sm ring-1.5 ring-surface-solid">
                      {unreadCount}
                    </span>
                  )}
                  {item.href === "/missions" && incompleteMissionsCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-coral-red text-[8px] font-bold text-white shadow-sm ring-1.5 ring-surface-solid">
                      {incompleteMissionsCount}
                    </span>
                  )}
                </div>
                <span className="hidden font-medium tracking-[-0.18px] xl:block">
                  {item.label}
                </span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Sidebar Profile & Wallet info */}
      <div className="mt-2">
        <SidebarProfile />
      </div>
    </div>
  )
}
