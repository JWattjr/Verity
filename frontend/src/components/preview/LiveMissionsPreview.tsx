"use client"

import Link from "next/link"
import { Send } from "lucide-react"
import {
  type Mission,
  usePublicMissionsQuery,
  useUserProfileQuery,
} from "@/store/verity/verityQueries"

const PREVIEW_PROFILE_ID = "6a2bdccdadc3689375bf51ba"
const FALLBACK_MISSIONS: Mission[] = [
  {
    id: "preview-vote",
    title: "Make your first market prediction",
    xpReward: 30,
    actionUrl: "/markets",
    completed: false,
    missionType: "activity",
    verificationKey: "has_voted",
  },
  {
    id: "preview-comment",
    title: "Join a market discussion",
    xpReward: 20,
    actionUrl: "/markets",
    completed: false,
    missionType: "activity",
    verificationKey: "has_commented",
  },
  {
    id: "preview-profile",
    title: "Complete your predictor profile",
    xpReward: 50,
    actionUrl: "/profile",
    completed: false,
    missionType: "activity",
    verificationKey: "has_set_profile",
  },
  {
    id: "preview-x",
    title: "Follow Verity on X",
    xpReward: 25,
    actionUrl: "https://x.com",
    completed: false,
    missionType: "social",
    verificationKey: "twitter_follow",
  },
]

export default function LiveMissionsPreview() {
  const { data: missions = [] } = usePublicMissionsQuery()
  const { data: profile } = useUserProfileQuery(PREVIEW_PROFILE_ID)
  const visibleMissions = missions.length > 0 ? missions : FALLBACK_MISSIONS
  const availableXp = visibleMissions.reduce(
    (total, mission) => total + (mission.xpReward ?? 0),
    0,
  )
  return (
    <div className="verity-product-page verity-missions-page">
      <header className="verity-product-hero">
        <div>
          <p className="verity-product-eyebrow">
            <i aria-hidden="true" /> Earn Arena XP · Active missions
          </p>
          <h1>
            MISSIONS<span>.</span>
          </h1>
        </div>
        <div className="verity-xp-panel">
          <span>XP currently available</span>
          <strong>{availableXp.toLocaleString()}</strong>
          {profile?.twitterUsername ? (
            <Link
              className="verity-linked-x"
              href={`https://x.com/${profile.twitterUsername}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Send aria-hidden="true" /> X: @{profile.twitterUsername}
            </Link>
          ) : (
            <small>{visibleMissions.length} active missions available</small>
          )}
        </div>
      </header>

      <section
        className="verity-mission-stats verity-preview-two-stats"
        aria-label="Live mission summary"
      >
        <MissionPreviewStat
          label="Active"
          value={visibleMissions.length}
          accent
        />
        <MissionPreviewStat label="XP available" value={availableXp} />
      </section>

      <div className="verity-section-heading">
        <div>
          <span>Live objective board</span>
          <h2>AVAILABLE MISSIONS</h2>
        </div>
      </div>

      <section className="verity-mission-list" aria-live="polite">
        {visibleMissions.map((mission, index) => (
          <article className="verity-mission-card" key={mission.id}>
            <span className="verity-mission-card__index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="verity-mission-card__copy">
              <div className="verity-mission-card__meta">
                <span>{mission.missionType}</span>
                <strong>{getReward(mission)}</strong>
              </div>
              <h3>{mission.title}</h3>
              <p>{getMissionDescription(mission)}</p>
            </div>
            <div className="verity-mission-card__action">
              <span className="verity-preview-disabled-action">PREVIEW</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

function MissionPreviewStat({
  accent = false,
  label,
  value,
}: {
  accent?: boolean
  label: string
  value: number
}) {
  return (
    <div className={accent ? "is-accent" : ""}>
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  )
}

function getReward(mission: Mission) {
  if (mission.xpReward) return `+${mission.xpReward} XP`
  if (mission.rewardMultiplier) return `+${mission.rewardMultiplier}× BOOST`
  return "REWARD"
}

function getMissionDescription(mission: Mission) {
  if (mission.marketQuestion) {
    return `${mission.title} on “${mission.marketQuestion}”.`
  }

  switch (mission.verificationKey) {
    case "has_voted":
      return "Place a vote on any active prediction market."
    case "has_commented":
      return "Add a useful comment to an active market discussion."
    case "has_liked":
      return "Like a market or community post in the Verity feed."
    case "has_traded":
      return "Trade on an open USDC-backed market."
    case "has_added_liquidity":
      return "Provide liquidity to an active market pool."
    case "has_created_market":
      return "Create a new prediction market for the community."
    case "has_set_profile":
      return "Complete your public predictor profile."
    default:
      return mission.missionType === "social"
        ? "Complete the linked community objective and verify it on Verity."
        : "Complete this activity inside Verity to unlock the reward."
  }
}
