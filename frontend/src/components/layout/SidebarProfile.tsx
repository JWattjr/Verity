"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useAuth } from "@/components/providers/AuthModals"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { displayHandle, displayName as getDisplayName } from "@/lib/verity"
import {
  User,
  Settings,
  Sun,
  Moon,
  LogOut,
  ChevronUp,
  ShieldCheck,
  Trophy,
} from "lucide-react"

function getRankTier(xp = 0): { name: string; color: string } {
  if (xp >= 3000) return { name: "Platinum", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" }
  if (xp >= 1500) return { name: "Gold", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" }
  if (xp >= 500) return { name: "Silver", color: "text-slate-300 bg-slate-400/10 border-slate-400/30" }
  return { name: "Bronze", color: "text-amber-600 bg-amber-700/10 border-amber-700/30" }
}

export default function SidebarProfile() {
  const { user, authenticated, loading, login, logout } = useAuth()
  const { profile } = useWalletProfile()
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  if (loading) {
    return (
      <div className="verity-card animate-pulse p-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-stone-surface" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 rounded bg-stone-surface" />
            <div className="h-3 w-5/6 rounded bg-stone-surface" />
          </div>
        </div>
      </div>
    )
  }

  if (!authenticated || !user) {
    return (
      <button
        className="flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-ember-orange px-4 text-sm font-bold text-white shadow-md transition-all hover:bg-ember-orange/90 active:scale-[0.98] cursor-pointer"
        onClick={login}
        type="button"
      >
        <span>Get Started</span>
      </button>
    )
  }

  const rankTier = getRankTier(profile?.arenaXp || user.arenaXp || 0)
  const displayName = getDisplayName(user)
  const handle = displayHandle(user)
  const userXp = profile?.arenaXp || user.arenaXp || 0

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Interactive Profile Pill / Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className={`group flex w-full items-center justify-between gap-2.5 rounded-[6px] border p-2.5 text-left transition-all duration-200 cursor-pointer ${
          isOpen
            ? "border-ember-orange/50 bg-stone-surface shadow-sm"
            : "border-border bg-surface hover:border-stone-surface hover:bg-stone-surface/60"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* User Avatar */}
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-ember-orange/80 to-amber-500 text-white font-bold text-sm shadow-sm ring-1 ring-border">
              {displayName.charAt(0).toUpperCase()}
            </div>
            {user.role === "admin" && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm ring-1 ring-surface">
                <ShieldCheck className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          {/* User Name & Handle */}
          <div className="hidden xl:flex flex-col min-w-0">
            <span className="text-sm font-bold text-charcoal-primary truncate">
              {displayName}
            </span>
            <span className="font-mono text-[11px] text-ash truncate">
              {handle}
            </span>
          </div>
        </div>

        {/* Dropdown Indicator */}
        <div className="hidden xl:flex items-center text-ash group-hover:text-charcoal-primary transition-colors">
          <ChevronUp
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-ember-orange" : ""
            }`}
          />
        </div>
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 rounded-[6px] border border-border bg-surface p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Summary */}
          <div className="px-3 py-2.5 border-b border-border/80 mb-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-charcoal-primary truncate">
                {displayName}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold font-mono border ${rankTier.color}`}>
                <Trophy className="h-2.5 w-2.5" />
                {rankTier.name}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-ash font-mono">
              <span>{handle}</span>
              <span className="font-bold text-charcoal-primary">{userXp.toLocaleString()} XP</span>
            </div>
          </div>

          {/* Actions List */}
          <div className="space-y-0.5">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-[4px] px-3 py-2 text-xs font-semibold text-charcoal-primary hover:bg-stone-surface transition-colors"
            >
              <User className="h-4 w-4 text-ash" />
              <span>My Profile</span>
            </Link>

            <Link
              href="/profile/edit"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-[4px] px-3 py-2 text-xs font-semibold text-charcoal-primary hover:bg-stone-surface transition-colors"
            >
              <Settings className="h-4 w-4 text-ash" />
              <span>Edit Profile</span>
            </Link>

            {/* Theme Toggle option */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
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

          {/* Sign Out Button */}
          <button
            onClick={() => {
              setIsOpen(false)
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
  )
}
