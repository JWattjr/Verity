'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Share } from 'lucide-react'
import FollowButton from '@/components/profile/FollowButton'
import MarketCard from '@/components/post/MarketCard'
import PostCard from '@/components/post/PostCard'
import { useFeed } from '@/hooks/useFeed'
import { useWalletProfile } from '@/hooks/useWalletProfile'
import {
  displayHandle,
  displayName,
  relativeTime,
  type FeedPost,
  type MarketPost,
  type Profile,
} from '@/lib/verity'

interface PublicProfileViewProps {
  userId: string
}

type ProfileTab = 'posts' | 'markets' | 'comments' | 'likes'

export default function PublicProfileView({ userId }: PublicProfileViewProps) {
  const router = useRouter()
  const { profile: viewerProfile } = useWalletProfile()
  const { items, loading, error } = useFeed(viewerProfile?.id)
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts')

  const decodedUserId = decodeURIComponent(userId)
  const profile = useMemo(() => {
    const authors = new Map<string, Profile>()
    items.forEach((item) => {
      authors.set(item.author.id, item.author)
      if (item.author.username) authors.set(item.author.username, item.author)
      if (displayHandle(item.author) !== '@unknown') {
        authors.set(displayHandle(item.author).slice(1), item.author)
      }
    })
    if (viewerProfile) {
      authors.set(viewerProfile.id, viewerProfile)
      if (viewerProfile.username) authors.set(viewerProfile.username, viewerProfile)
    }
    return authors.get(decodedUserId) || null
  }, [decodedUserId, items, viewerProfile])

  const profileItems = useMemo(() => {
    if (!profile) return []
    return items.filter((item) => item.author.id === profile.id)
  }, [items, profile])

  const marketItems = profileItems.filter((item) => item.market)
  const visibleItems =
    activeTab === 'markets'
      ? marketItems
      : activeTab === 'posts'
        ? profileItems
        : []
  const totalVolume = marketItems.reduce((sum, item) => {
    const market = item.market
    if (!market) return sum
    return sum + Number(market.usdc_yes_amount) + Number(market.usdc_no_amount)
  }, 0)
  const accuracy =
    profile?.freeVotesTotal && profile.freeVotesTotal > 0
      ? Math.round(((profile.freeVotesCorrect || 0) / profile.freeVotesTotal) * 100)
      : 0

  if (loading && !profile) {
    return <ProfileState message="Loading profile..." />
  }

  if (error && !profile) {
    return <ProfileState message={error} tone="error" />
  }

  if (!profile) {
    return <ProfileState message="Profile not found in the current feed." />
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      <section className="verity-card overflow-hidden">
        <div className="h-28 bg-midnight" />

        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between gap-3">
            <ProfileAvatar profile={profile} />
            <div className="mb-2 flex gap-2">
              <button
                className="verity-pill hidden h-10 items-center justify-center gap-2 bg-parchment-card px-4 text-sm font-semibold tracking-[-0.18px] text-charcoal-primary shadow-[var(--shadow-subtle)] transition-colors hover:bg-stone-surface sm:inline-flex"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    void navigator.clipboard?.writeText(window.location.href)
                  }
                }}
                type="button"
              >
                Share profile <Share className="h-4 w-4" />
              </button>
              <FollowButton profile={profile} />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[28px] font-semibold leading-[1.1] tracking-[-0.7px] text-midnight">
                {displayName(profile)}
              </h1>
              <BadgeCheck className="h-5 w-5 text-sky-blue" />
            </div>
            <p className="mt-1 font-mono text-sm text-ash">{displayHandle(profile)}</p>
            {profile.bio && (
              <p className="mt-3 max-w-[560px] text-[15px] leading-[1.47] tracking-[-0.2px] text-graphite">
                {profile.bio}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm tracking-[-0.18px] text-graphite">
              <span>
                <strong className="font-semibold text-midnight">
                  {(profile.followingCount || 0).toLocaleString()}
                </strong>{' '}
                Following
              </span>
              <span>
                <strong className="font-semibold text-midnight">
                  {(profile.followersCount || 0).toLocaleString()}
                </strong>{' '}
                Followers
              </span>
              <span className="font-mono text-xs text-ash">
                {profileItems.length} posts
              </span>
              <span className="font-mono text-xs text-ash">
                {marketItems.length} markets
              </span>
              <span className="font-mono text-xs text-ash">
                {accuracy}% accuracy
              </span>
            </div>
          </div>
        </div>

        <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />
      </section>

      <section className="flex flex-col gap-3">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <ProfileFeedItem
              item={item}
              key={item.id}
              onOpenMarket={(market) => router.push(`/markets/${market.id}`)}
            />
          ))
        ) : (
          <div className="verity-card p-8 text-center text-sm tracking-[-0.18px] text-ash">
            {activeTab === 'posts'
              ? 'No posts yet.'
              : activeTab === 'markets'
                ? 'No markets yet.'
                : 'Coming soon.'}
          </div>
        )}
      </section>
    </div>
  )
}

function ProfileFeedItem({
  item,
  onOpenMarket,
}: {
  item: FeedPost
  onOpenMarket: (market: MarketPost) => void
}) {
  if (item.market) {
    const market = item.market
    const totalUsdc = Number(market.usdc_yes_amount) + Number(market.usdc_no_amount)
    const yesPercent =
      totalUsdc > 0 ? (Number(market.usdc_yes_amount) / totalUsdc) * 100 : 50

    return (
      <MarketCard
        category={market.category}
        comments={item.commentsCount}
        dailyVotesRemaining={10}
        deadline={new Date(market.deadline).toLocaleString()}
        freeNoVotes={market.free_no_votes}
        freeYesVotes={market.free_yes_votes}
        handle={displayHandle(item.author)}
        liquidity={market.liquidity}
        marketCreationFeeUsdc={market.market_creation_fee_usdc}
        name={displayName(item.author)}
        noCondition={market.no_condition}
        onOpenDetails={() => onOpenMarket(market)}
        postContent={item.content}
        profileHref={`/profile/${encodeURIComponent(item.author.id)}`}
        question={market.question}
        resolutionSource={market.resolution_source}
        reshares={item.resharesCount}
        status={market.status}
        time={relativeTime(item.created_at)}
        totalFreeVotes={market.totalFreeVotes}
        usdcNo={Number(market.usdc_no_amount)}
        usdcYes={Number(market.usdc_yes_amount)}
        viewerVote={item.viewerVote}
        yesCondition={market.yes_condition}
        yesPercent={yesPercent}
      />
    )
  }

  return (
    <PostCard
      comments={item.commentsCount}
      content={item.content}
      handle={displayHandle(item.author)}
      liked={item.viewerLiked}
      likes={item.likesCount}
      name={displayName(item.author)}
      profileHref={`/profile/${encodeURIComponent(item.author.id)}`}
      reshares={item.resharesCount}
      reshared={item.viewerReshared}
      time={relativeTime(item.created_at)}
    />
  )
}

function ProfileAvatar({ profile }: { profile: Profile }) {
  const avatarUrl = profile.avatar_url || profile.avatarUrl

  if (avatarUrl) {
    return (
      <div
        className="h-24 w-24 shrink-0 rounded-[28px] bg-cover bg-center ring-4 ring-white shadow-[var(--shadow-subtle)]"
        style={{ backgroundImage: `url(${avatarUrl})` }}
      />
    )
  }

  return (
    <div className="verity-blob h-24 w-24 shrink-0 bg-sky-blue ring-4 ring-white">
      <span className="verity-blob-smile" />
    </div>
  )
}

function ProfileTabs({
  activeTab,
  onChange,
}: {
  activeTab: ProfileTab
  onChange: (tab: ProfileTab) => void
}) {
  const tabs: Array<{ id: ProfileTab; label: string }> = [
    { id: 'posts', label: 'Posts' },
    { id: 'markets', label: 'Markets' },
    { id: 'comments', label: 'Comments' },
    { id: 'likes', label: 'Likes' },
  ]

  return (
    <div className="grid grid-cols-4 border-t border-dashed border-stone-surface px-2">
      {tabs.map((tab) => (
        <button
          className={`relative h-12 text-sm font-semibold tracking-[-0.18px] transition-colors ${
            activeTab === tab.id ? 'text-charcoal-primary' : 'text-ash hover:text-charcoal-primary'
          }`}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-ember-orange" />
          )}
        </button>
      ))}
    </div>
  )
}

function ProfileState({
  message,
  tone = 'neutral',
}: {
  message: string
  tone?: 'neutral' | 'error'
}) {
  return (
    <div className="py-4">
      <section
        className={`rounded-[12px] p-8 text-center text-sm font-medium tracking-[-0.18px] shadow-[var(--shadow-subtle)] ${
          tone === 'error'
            ? 'bg-ember-orange/10 text-charcoal-primary'
            : 'bg-white text-ash'
        }`}
      >
        {message}
      </section>
    </div>
  )
}
