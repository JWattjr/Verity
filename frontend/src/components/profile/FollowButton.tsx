'use client'

import Link from 'next/link'
import { Check, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useWalletProfile } from '@/hooks/useWalletProfile'
import type { Profile } from '@/lib/verity'

interface FollowButtonProps {
  profile: Profile
  initialFollowing?: boolean
  followerCount?: number
  compact?: boolean
}

export default function FollowButton({
  profile,
  initialFollowing = false,
  followerCount,
  compact = false,
}: FollowButtonProps) {
  const { profile: viewerProfile } = useWalletProfile()
  const isOwnProfile = Boolean(viewerProfile?.id && viewerProfile.id === profile.id)
  const [following, setFollowing] = useState(initialFollowing)
  const [localDelta, setLocalDelta] = useState(0)
  const count = Math.max(0, (followerCount ?? profile.followersCount ?? 0) + localDelta)

  if (isOwnProfile) {
    return (
      <Link
        className="verity-pill inline-flex h-10 items-center justify-center bg-parchment-card px-4 text-sm font-semibold tracking-[-0.18px] text-charcoal-primary shadow-[var(--shadow-subtle)] transition-colors hover:bg-stone-surface"
        href="/profile"
      >
        Edit Profile
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        aria-pressed={following}
        className={`verity-pill inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-semibold tracking-[-0.18px] transition-all active:scale-[0.98] ${
          following
            ? 'bg-parchment-card text-charcoal-primary shadow-[var(--shadow-subtle)] hover:bg-stone-surface'
            : 'bg-inverse text-inverse-text hover:opacity-90'
        }`}
        onClick={() => {
          setFollowing((current) => {
            setLocalDelta(current ? -1 : 1)
            return !current
          })
        }}
        type="button"
      >
        {following ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        {following ? 'Following' : 'Follow'}
      </button>
      {!compact && (
        <span className="font-mono text-[11px] text-ash">
          {count.toLocaleString()} followers
        </span>
      )}
    </div>
  )
}
