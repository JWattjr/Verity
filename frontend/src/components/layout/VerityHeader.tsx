"use client"

import { useState, useRef, useEffect, useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Bell,
  Sparkles,
  User,
  Settings,
  Sun,
  Moon,
  LogOut,
  Trophy,
  ShieldCheck,
  ChevronDown,
} from "lucide-react"
import { useAuth } from "@/components/providers/AuthModals"
import VerityMark from "@/components/brand/VerityMark"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { useNotificationsQuery } from "@/store/verity/verityQueries"
import { displayHandle, displayName as getDisplayName } from "@/lib/verity"

const NAV_ITEMS = [
  { label: "Markets", href: "/" },
  { label: "Arena", href: "/arena" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Missions", href: "/missions" },
]

function getRankTier(xp = 0): { name: string; color: string } {
  if (xp >= 3000)
    return {
      name: "Platinum",
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    }
  if (xp >= 1500)
    return {
      name: "Gold",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    }
  if (xp >= 500)
    return {
      name: "Silver",
      color: "text-slate-300 bg-slate-400/10 border-slate-400/30",
    }
  return {
    name: "Bronze",
    color: "text-amber-600 bg-amber-700/10 border-amber-700/30",
  }
}

const subscribeToHydration = () => () => undefined

export default function VerityHeader() {
  const pathname = usePathname()
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  )
  const { theme, setTheme } = useTheme()
  const { user, authenticated, loading, login, logout } = useAuth()
  const { profile } = useWalletProfile()
  const { data: notifications = [] } = useNotificationsQuery(profile?.id || "")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(
    (notification) => !(notification as { read?: boolean }).read,
  ).length

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [dropdownOpen])

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname?.startsWith(href + "/")
  }

  const displayName = user ? getDisplayName(user) : ""
  const handle = user ? displayHandle(user) : ""
  const userXp = profile?.arenaXp || user?.arenaXp || 0
  const rankTier = getRankTier(userXp)

  return (
    <header className="verity-site-header">
      <div className="verity-site-header__row">
        <Link className="verity-wordmark" href="/" aria-label="Verity home">
          <VerityMark className="verity-wordmark__mark" priority size={36} />
          <span className="verity-wordmark__copy">
            <strong>VERITY</strong>
            <small>PREDICTION ARENA</small>
          </span>
        </Link>

        <nav aria-label="Main" className="verity-desktop-nav">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)

            return (
              <Link
                className={active ? "is-active" : ""}
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="verity-header-actions">
          {mounted && (
            <Link
              aria-label="Notifications"
              className="verity-header-icon relative"
              href="/notifications"
            >
              <Bell aria-hidden="true" />
              {authenticated && unreadCount > 0 && (
                <span className="verity-notification-dot">{unreadCount}</span>
              )}
            </Link>
          )}
          <Link
            aria-label="Missions"
            className={`verity-header-icon verity-mobile-missions-shortcut ${
              pathname?.startsWith("/missions") ? "is-active" : ""
            }`}
            href="/missions"
          >
            <Sparkles aria-hidden="true" />
          </Link>

          {!mounted || loading ? (
            <div className="h-9 w-24 rounded-lg bg-stone-surface animate-pulse" />
          ) : authenticated && user ? (
            /* Interactive Profile Avatar with Dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                type="button"
                className={`flex items-center gap-2 rounded-full p-1 pl-1.5 pr-2.5 transition-all border cursor-pointer ${
                  dropdownOpen
                    ? "border-ember-orange/50 bg-stone-surface"
                    : "border-border bg-surface hover:border-stone-surface hover:bg-stone-surface"
                }`}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-ember-orange to-amber-500 text-white font-bold text-xs shadow-sm">
                  {displayName ? displayName.charAt(0).toUpperCase() : "U"}
                  {user.role === "admin" && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
                      <ShieldCheck className="h-2 w-2" />
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline-block max-w-[100px] truncate text-xs font-bold text-charcoal-primary">
                  {displayName}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-ash transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180 text-ember-orange" : ""
                  }`}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-[6px] border border-border bg-surface p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Summary Header */}
                  <div className="px-3 py-2.5 border-b border-border/80 mb-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-charcoal-primary truncate">
                        {displayName}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold font-mono border ${rankTier.color}`}
                      >
                        <Trophy className="h-2.5 w-2.5" />
                        {rankTier.name}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-ash font-mono">
                      <span>{handle}</span>
                      <span className="font-bold text-charcoal-primary">
                        {userXp.toLocaleString()} XP
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-0.5">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-[4px] px-3 py-2 text-xs font-semibold text-charcoal-primary hover:bg-stone-surface transition-colors"
                    >
                      <User className="h-4 w-4 text-ash" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      href="/profile/edit"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-[4px] px-3 py-2 text-xs font-semibold text-charcoal-primary hover:bg-stone-surface transition-colors"
                    >
                      <Settings className="h-4 w-4 text-ash" />
                      <span>Edit Profile</span>
                    </Link>

                    <button
                      onClick={() =>
                        setTheme(theme === "dark" ? "light" : "dark")
                      }
                      type="button"
                      className="flex w-full items-center justify-between rounded-[4px] px-3 py-2 text-xs font-semibold text-charcoal-primary hover:bg-stone-surface transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        {theme === "dark" ? (
                          <Moon className="h-4 w-4 text-indigo-400" />
                        ) : (
                          <Sun className="h-4 w-4 text-amber-500" />
                        )}
                        <span>Theme</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-ash">
                        {theme === "dark" ? "Dark" : "Light"}
                      </span>
                    </button>
                  </div>

                  <div className="my-1.5 h-px bg-border/80" />

                  {/* Log Out */}
                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      logout()
                    }}
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-[4px] px-3 py-2 text-xs font-semibold text-coral-red hover:bg-coral-red/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="verity-header-cta cursor-pointer"
              onClick={login}
              type="button"
            >
              GET STARTED
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
