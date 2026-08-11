"use client"

import type { ReactNode } from "react"
import { Activity, Crosshair, Trophy } from "lucide-react"
import type { Profile } from "@/lib/verity"
import { displayHandle, displayName } from "@/lib/verity"
import type { ProfileActivityTab } from "@/components/social/ProfileActivityTabs"

interface ProfileOverviewProps {
  profile: Profile
  activeTab: ProfileActivityTab
  marketCount: number
  predictionCount: number
  accuracy: number
  actions?: ReactNode
  onTabChange: (tab: ProfileActivityTab) => void
  onShowFollowers: () => void
  onShowFollowing: () => void
}

const tabs: Array<{ id: ProfileActivityTab; label: string }> = [
  { id: "markets", label: "Markets" },
  { id: "predictions", label: "Predictions" },
  { id: "activity", label: "Activity" },
]

export default function ProfileOverview({
  profile,
  activeTab,
  marketCount,
  predictionCount,
  accuracy,
  actions,
  onTabChange,
  onShowFollowers,
  onShowFollowing,
}: ProfileOverviewProps) {
  const avatarUrl = profile.avatar_url || profile.avatarUrl
  const initials = displayName(profile).slice(0, 2).toUpperCase()

  return (
    <section className="overflow-hidden border border-border bg-surface">
      <div className="flex min-h-9 items-stretch justify-between border-b border-border font-mono text-[9px] font-bold uppercase tracking-[0.16em]">
        <span className="flex items-center gap-2 bg-accent px-3 text-black">
          <Crosshair className="h-3.5 w-3.5" />
          Predictor profile
        </span>
        <span className="flex items-center gap-2 px-3 text-ash">
          <span className="h-1.5 w-1.5 bg-accent" />
          Arena active
        </span>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative h-20 w-20 shrink-0 border border-border bg-black sm:h-24 sm:w-24">
            {avatarUrl ? (
              <div
                aria-label={`${displayName(profile)} avatar`}
                className="h-full w-full bg-cover bg-center"
                role="img"
                style={{ backgroundImage: `url(${avatarUrl})` }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-accent font-heading text-3xl font-black uppercase text-black">
                {initials}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 h-3 w-3 border-2 border-surface bg-accent" />
          </div>

          <div className="min-w-0">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-ash">
              Public prediction record
            </p>
            <h1 className="mt-1 truncate font-heading text-[38px] font-black uppercase leading-[0.9] tracking-[0.02em] text-charcoal-primary sm:text-[48px]">
              {displayName(profile)}
            </h1>
            <p className="mt-2 font-mono text-[11px] font-semibold tracking-[0.04em] text-accent">
              {displayHandle(profile)}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-5 text-graphite">
              {profile.bio || "Building a public record, one market at a time."}
            </p>
          </div>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-3 lg:grid-cols-6">
        <StatButton
          label="Following"
          onClick={onShowFollowing}
          value={(profile.followingCount || 0).toLocaleString()}
        />
        <StatButton
          label="Followers"
          onClick={onShowFollowers}
          value={(profile.followersCount || 0).toLocaleString()}
        />
        <Stat label="Markets" value={marketCount.toLocaleString()} />
        <Stat label="Predictions" value={predictionCount.toLocaleString()} />
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat
          accent
          icon={<Trophy className="h-3.5 w-3.5" />}
          label="Arena XP"
          value={(profile.arenaXp ?? 0).toLocaleString()}
        />
      </dl>

      <div className="grid grid-cols-3 border-t border-border">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              className={`flex min-h-12 items-center justify-center gap-2 border-r border-border font-sans text-[11px] font-extrabold uppercase tracking-[0.1em] transition-colors last:border-r-0 ${
                isActive
                  ? "bg-accent text-black"
                  : "bg-black text-white hover:bg-surface-muted hover:text-charcoal-primary"
              }`}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              type="button"
            >
              {tab.id === "activity" && <Activity className="h-3.5 w-3.5" />}
              {tab.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function Stat({
  accent = false,
  icon,
  label,
  value,
}: {
  accent?: boolean
  icon?: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="border-b border-r border-border px-3 py-3 last:border-r-0 sm:border-b-0">
      <dt className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-ash">
        {label}
      </dt>
      <dd
        className={`mt-1 flex items-center gap-1.5 font-heading text-xl font-extrabold uppercase ${
          accent ? "text-accent" : "text-charcoal-primary"
        }`}
      >
        {icon}
        {value}
      </dd>
    </div>
  )
}

function StatButton({
  label,
  onClick,
  value,
}: {
  label: string
  onClick: () => void
  value: string
}) {
  return (
    <button
      className="border-b border-r border-border px-3 py-3 text-left transition-colors hover:bg-accent hover:text-black sm:border-b-0"
      onClick={onClick}
      type="button"
    >
      <span className="block font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-ash">
        {label}
      </span>
      <strong className="mt-1 block font-heading text-xl font-extrabold uppercase text-charcoal-primary">
        {value}
      </strong>
    </button>
  )
}
