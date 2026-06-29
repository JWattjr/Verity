"use client"

import Link from "next/link"
import { Sparkles, Home, User, Wallet, TrendingUp } from "lucide-react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/providers/AuthModals"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { useMissionsQuery } from "@/store/verity/verityQueries"

const MOBILE_NAV_ITEMS = [
  { icon: Home, label: "Home", href: "/" },
  { icon: TrendingUp, label: "Markets", href: "/markets" },
  { icon: Sparkles, label: "Missions", href: "/missions" },
  { icon: Wallet, label: "Portfolio", href: "/portfolio" },
  { icon: User, label: "Profile", href: "/profile" },
]

export default function MobileNav() {
  const pathname = usePathname()
  const { authenticated, login } = useAuth()
  const { profile } = useWalletProfile()
  const { data: missions = [] } = useMissionsQuery(profile?.id)
  const incompleteMissionsCount = missions.filter((m: any) => !m.completed).length

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur sm:hidden">
      <div className="mx-auto grid max-w-[672px] grid-cols-5 gap-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href.split("?")[0]
          const isAuthRequired =
            item.href === "/profile" || item.href === "/portfolio"
          return (
            <Link
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[10px] px-1 py-2 text-[10px] font-medium tracking-[-0.12px] ${
                isActive
                  ? "bg-surface-muted text-foreground shadow-subtle"
                  : "clickable-surface text-muted"
              }`}
              href={item.href}
              onClick={(e) => {
                if (isAuthRequired && !authenticated) {
                  e.preventDefault()
                  login()
                }
              }}
              key={item.label}
            >
              <div className="relative flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5" />
                {item.href === "/missions" && incompleteMissionsCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-coral-red text-[8px] font-bold text-white shadow-sm ring-1.5 ring-surface-solid">
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
  )
}
