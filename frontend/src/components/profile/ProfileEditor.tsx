"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Edit3, Share, MoreHorizontal, LogOut, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { useAuth } from "@/components/providers/AuthModals"
import ProfileActivityTabs, {
  type ProfileActivityTab,
} from "@/components/social/ProfileActivityTabs"
import ProfileOverview from "@/components/profile/ProfileOverview"
import SocialUserListModal from "@/components/social/SocialUserListModal"
import { useFeed } from "@/hooks/useFeed"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { type Profile } from "@/lib/verity"
import {
  useProfileActivityQuery,
  useUserPortfolioQuery,
  useReferralsQuery,
} from "@/store/verity/verityQueries"
import { toast } from "@/lib/toast"

export default function ProfileEditor() {
  const router = useRouter()
  const { profile } = useWalletProfile()
  const { items } = useFeed()
  const { data: referralsData } = useReferralsQuery()
  const [activeTab, setActiveTab] = useState<ProfileActivityTab>("markets")
  const [peopleModal, setPeopleModal] = useState<
    "followers" | "following" | null
  >(null)
  const isConnected = Boolean(profile)

  const { login, logout } = useAuth()
  const { setTheme, resolvedTheme } = useTheme()
  const [optionsOpen, setOptionsOpen] = useState(false)
  const isDark = resolvedTheme === "dark"

  const { data: tabItems = [], isLoading: isActivityLoading } =
    useProfileActivityQuery(
      profile?.id || "",
      activeTab === "markets"
        ? "markets"
        : activeTab === "activity"
          ? "comments"
          : "posts",
      profile?.id,
    )

  const { data: positions = [], isLoading: isPositionsLoading } =
    useUserPortfolioQuery(profile?.id || "")

  const resolvedPositions = positions.filter(
    (pos) => pos.status === "resolved" && pos.resolved_outcome !== null,
  )
  const wonPositions = resolvedPositions.filter(
    (pos) => pos.resolved_outcome === pos.side,
  )

  const accuracy =
    resolvedPositions.length > 0
      ? Math.round((wonPositions.length / resolvedPositions.length) * 100)
      : 0

  const isTabLoading =
    activeTab === "markets"
      ? isActivityLoading
      : activeTab === "predictions"
        ? isPositionsLoading
        : activeTab === "activity"
          ? isActivityLoading
          : false

  const localProfileItems = useMemo(
    () =>
      profile ? items.filter((item) => item.author.id === profile.id) : [],
    [items, profile],
  )
  const marketItems = localProfileItems.filter((item) => item.market)
  const knownUsers = useMemo(() => {
    const users = new Map<string, Profile>()
    items.forEach((item) => users.set(item.author.id, item.author))
    if (profile) users.set(profile.id, profile)
    return Array.from(users.values())
  }, [items, profile])

  if (!isConnected) {
    return (
      <div className="verity-card p-8 mt-6 text-center flex flex-col items-center justify-center border border-border bg-surface-solid py-12">
        <h3 className="text-lg font-semibold text-charcoal-primary">
          Access Your Profile
        </h3>
        <p className="mt-2 text-sm text-ash max-w-sm">
          Log in or sign up to view and customize your profile, copy referral
          links, and track your stats.
        </p>
        <div className="mt-6 w-full max-w-[240px]">
          <button
            onClick={login}
            className="verity-pill flex h-11 w-full items-center justify-center gap-2 bg-inverse px-4 text-sm font-semibold tracking-[-0.18px] text-inverse-text transition-opacity hover:opacity-90 cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 py-3 sm:py-4">
      {profile && (
        <ProfileOverview
          accuracy={accuracy}
          actions={
            <>
              <button
                className="hidden min-h-10 items-center justify-center gap-2 border border-border bg-black px-4 font-sans text-[10px] font-extrabold uppercase tracking-[0.1em] text-white transition-colors hover:bg-accent hover:text-black sm:inline-flex"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    void navigator.clipboard?.writeText(window.location.href)
                  }
                }}
                type="button"
              >
                Share profile <Share className="h-4 w-4" />
              </button>
              <button
                className="flex min-h-10 items-center justify-center gap-2 bg-accent px-4 font-sans text-[10px] font-extrabold uppercase tracking-[0.1em] text-black transition-colors hover:bg-white"
                onClick={() => router.push("/profile/edit")}
                type="button"
              >
                Edit profile <Edit3 className="hidden sm:block h-4 w-4" />
              </button>

              <div className="relative">
                <button
                  className="flex h-10 w-10 items-center justify-center border border-border bg-black text-white transition-colors hover:bg-accent hover:text-black"
                  onClick={() => setOptionsOpen(!optionsOpen)}
                  type="button"
                  aria-label="Options"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                {optionsOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 border border-border bg-surface p-1.5 shadow-sm">
                    <button
                      className="flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-xs font-semibold text-charcoal-primary hover:bg-stone-surface transition-colors cursor-pointer"
                      onClick={() => {
                        setTheme(isDark ? "light" : "dark")
                        setOptionsOpen(false)
                      }}
                      type="button"
                    >
                      <span className="flex items-center gap-2">
                        {isDark ? (
                          <>
                            <Sun className="h-4 w-4 text-ash" /> Light Mode
                          </>
                        ) : (
                          <>
                            <Moon className="h-4 w-4 text-ash" /> Dark Mode
                          </>
                        )}
                      </span>
                    </button>

                    {isConnected && (
                      <>
                        <div className="my-1 h-px bg-border/60" />
                        {referralsData?.referralLink && (
                          <button
                            className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-xs font-semibold text-charcoal-primary hover:bg-stone-surface transition-colors cursor-pointer"
                            onClick={() => {
                              const link = `${window.location.origin}/?ref=${referralsData.referralLink}`
                              void navigator.clipboard.writeText(link)
                              toast.success("Referral link copied!")
                              setOptionsOpen(false)
                            }}
                            type="button"
                          >
                            <Share className="h-4 w-4 text-ash" />
                            Copy Referral Link
                          </button>
                        )}
                        <button
                          className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-xs font-semibold text-coral-red hover:bg-red-500/10 transition-colors cursor-pointer"
                          onClick={() => {
                            logout()
                            setOptionsOpen(false)
                            router.push("/")
                          }}
                          type="button"
                        >
                          <LogOut className="h-4 w-4" />
                          Log Out
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          }
          activeTab={activeTab}
          marketCount={marketItems.length}
          onShowFollowers={() => setPeopleModal("followers")}
          onShowFollowing={() => setPeopleModal("following")}
          onTabChange={setActiveTab}
          predictionCount={positions.length}
          profile={profile}
        />
      )}

      {profile && (
        <ProfileActivityTabs
          activeTab={activeTab}
          items={tabItems}
          positions={positions}
          loading={isTabLoading}
          onOpenMarket={(market) => router.push(`/markets/${market.id}`)}
          onOpenPvp={(market) => {
            const parentId =
              market.parentMarketId || market.parent_market_id || market.id
            router.push(`/markets?tab=pvp-arena&id=${parentId}`)
          }}
          onOpenPost={(post) => router.push(`/posts/${post.id}`)}
          profile={profile}
          viewerProfile={profile}
        />
      )}

      <SocialUserListModal
        open={peopleModal !== null}
        onClose={() => setPeopleModal(null)}
        subtitle="People already active on Verity."
        title={peopleModal === "followers" ? "Followers" : "Following"}
        users={knownUsers}
      />
    </div>
  )
}
