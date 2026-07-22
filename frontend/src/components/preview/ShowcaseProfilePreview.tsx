"use client"

import { useState } from "react"
import ProfileOverview from "@/components/profile/ProfileOverview"
import ProfileActivityTabs, {
  type ProfileActivityTab,
} from "@/components/social/ProfileActivityTabs"
import type { MarketPosition, Profile } from "@/lib/verity"

const showcaseProfile: Profile = {
  id: "showcase-vector919",
  wallet_address: null,
  username: "Veckojunior",
  display_name: "VECTOR919",
  avatar_url: null,
  bio: "Life goes on 🐑 🐍",
  followersCount: 18,
  followingCount: 7,
  signalPoints: 634,
  freeVotesCorrect: 127,
  freeVotesWrong: 31,
  freeVotesTotal: 158,
  arenaXp: 8422,
  pvpMatchesWonCount: 42,
  pvpMatchesLostCount: 13,
  pvpMatchesDrawnCount: 2,
  created_at: "2026-01-08T12:00:00.000Z",
}

const showcasePositions: MarketPosition[] = [
  previewPosition(
    "eng-arg-btts",
    "England vs Argentina - BTTS",
    "NO",
    1.42,
    1,
    "resolved",
    "YES",
  ),
  previewPosition(
    "eng-arg-goals",
    "England vs Argentina - Goals",
    "YES",
    2.18,
    1,
    "resolved",
    "YES",
  ),
  previewPosition(
    "eng-arg-first",
    "England vs Argentina - First Goal",
    "Argentina scores first",
    1.79,
    1,
    "resolved",
    "Argentina scores first",
  ),
  previewPosition(
    "arg-swiss-btts",
    "Argentina vs Switzerland - BTTS",
    "NO",
    1.31,
    1,
    "open",
    null,
  ),
  previewPosition(
    "arg-swiss-card",
    "Argentina vs Switzerland - Red Card",
    "NO",
    1.19,
    1,
    "open",
    null,
  ),
  previewPosition(
    "france-spain-extra",
    "France vs Spain - Extra Time / Penalties",
    "No penalties",
    41.23,
    28,
    "resolved",
    "No penalties",
  ),
  previewPosition(
    "world-cup-goat",
    "Will Ronaldo cry at the World Cup?",
    "NO",
    12.5,
    8,
    "resolved",
    "YES",
  ),
]

export default function ShowcaseProfilePreview() {
  const [activeTab, setActiveTab] = useState<ProfileActivityTab>("predictions")

  return (
    <div className="verity-showcase-profile">
      <div className="flex flex-col gap-3 py-3 sm:py-4">
        <ProfileOverview
          accuracy={80}
          activeTab={activeTab}
          marketCount={1}
          onShowFollowers={() => undefined}
          onShowFollowing={() => undefined}
          onTabChange={setActiveTab}
          predictionCount={showcasePositions.length}
          profile={showcaseProfile}
        />
        <ProfileActivityTabs
          activeTab={activeTab}
          items={[]}
          onOpenMarket={() => undefined}
          positions={showcasePositions}
          profile={showcaseProfile}
          viewerProfile={null}
        />
      </div>
    </div>
  )
}

function previewPosition(
  id: string,
  question: string,
  side: string,
  shares: number,
  invested: number,
  status: string,
  outcome: string | null,
): MarketPosition {
  return {
    id,
    market_id: id,
    user_id: showcaseProfile.id,
    side,
    shares,
    avg_price: invested / shares,
    invested_usdc: invested,
    realized_pnl: outcome === side ? shares - invested : -invested,
    created_at: "2026-07-10T12:00:00.000Z",
    updated_at: "2026-07-17T12:00:00.000Z",
    market_question: question,
    usdc_yes_amount: 62,
    usdc_no_amount: 38,
    status,
    resolved_outcome: outcome,
    category: "sports",
  }
}
