"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Share } from "lucide-react"
import FollowButton from "@/components/profile/FollowButton"
import ProfileOverview from "@/components/profile/ProfileOverview"
import ProfileActivityTabs, {
  type ProfileActivityTab,
} from "@/components/social/ProfileActivityTabs"
import SocialUserListModal from "@/components/social/SocialUserListModal"
import { useFeed } from "@/hooks/useFeed"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { type Profile } from "@/lib/verity"
import {
  useProfileActivityQuery,
  useUserProfileQuery,
  useUserPortfolioQuery,
} from "@/store/verity/verityQueries"
import { FeedSkeleton } from "@/components/feed/FeedShell"

interface PublicProfileViewProps {
  userId: string
}

export default function PublicProfileView({ userId }: PublicProfileViewProps) {
  const router = useRouter()
  const { profile: viewerProfile } = useWalletProfile()
  const { items } = useFeed()
  const [activeTab, setActiveTab] = useState<ProfileActivityTab>("markets")
  const [peopleModal, setPeopleModal] = useState<
    "followers" | "following" | null
  >(null)

  const decodedUserId = decodeURIComponent(userId)
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useUserProfileQuery(decodedUserId)

  const { data: tabItems = [], isLoading: isActivityLoading } =
    useProfileActivityQuery(
      profile?.id || "",
      activeTab === "markets"
        ? "markets"
        : activeTab === "activity"
          ? "comments"
          : "posts",
      viewerProfile?.id,
    )

  const { data: positions = [], isLoading: isPositionsLoading } =
    useUserPortfolioQuery(profile?.id || "")

  const isTabLoading =
    activeTab === "markets"
      ? isActivityLoading
      : activeTab === "predictions"
        ? isPositionsLoading
        : activeTab === "activity"
          ? isActivityLoading
          : false

  const localProfileItems = useMemo(() => {
    if (!profile) return []
    return items.filter((item) => item.author.id === profile.id)
  }, [items, profile])

  const marketItems = localProfileItems.filter((item) => item.market)
  const knownUsers = useMemo(() => {
    const users = new Map<string, Profile>()
    items.forEach((item) => users.set(item.author.id, item.author))
    if (viewerProfile) users.set(viewerProfile.id, viewerProfile)
    if (profile) users.set(profile.id, profile)
    return Array.from(users.values())
  }, [items, profile, viewerProfile])

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

  if (isProfileLoading) {
    return (
      <div className="flex flex-col gap-3 py-3 sm:py-4 animate-pulse">
        <section className="verity-card overflow-hidden">
          <div className="h-24 bg-stone-surface sm:h-28" />
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="-mt-10 flex items-end justify-between gap-3">
              <div className="h-20 w-20 shrink-0 rounded-[24px] bg-stone-surface ring-4 ring-white sm:h-24 sm:w-24 sm:rounded-[28px]" />
              <div className="mb-2 h-10 w-28 rounded-full bg-stone-surface" />
            </div>
            <div className="mt-3">
              <div className="h-6 w-48 rounded bg-stone-surface" />
              <div className="mt-2 h-4 w-32 rounded bg-stone-surface" />
              <div className="mt-4 h-4 w-full max-w-[480px] rounded bg-stone-surface" />
              <div className="mt-2 h-4 w-full max-w-[360px] rounded bg-stone-surface" />
              <div className="mt-5 flex gap-4">
                <div className="h-4 w-20 rounded bg-stone-surface" />
                <div className="h-4 w-20 rounded bg-stone-surface" />
              </div>
            </div>
          </div>
          <div className="h-12 border-t border-dashed border-stone-surface bg-stone-surface/10" />
        </section>
        <FeedSkeleton />
      </div>
    )
  }

  if (profileError) {
    return (
      <ProfileState
        message={
          profileError instanceof Error
            ? profileError.message
            : "Failed to load profile."
        }
        tone="error"
      />
    )
  }

  if (!profile) {
    return <ProfileState message="Profile not found." tone="error" />
  }

  return (
    <div className="flex flex-col gap-3 py-3 sm:py-4">
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
            <FollowButton compact profile={profile} />
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
        viewerProfile={viewerProfile}
      />

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

function ProfileState({
  message,
  tone = "neutral",
}: {
  message: string
  tone?: "neutral" | "error"
}) {
  return (
    <div className="py-4">
      <section
        className={`rounded-[12px] p-8 text-center text-sm font-medium tracking-[-0.18px] shadow-subtle ${
          tone === "error"
            ? "bg-ember-orange/10 text-charcoal-primary"
            : "bg-white text-ash"
        }`}
      >
        {message}
      </section>
    </div>
  )
}
