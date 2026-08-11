"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Check, Loader2, LockKeyhole, Send, Sparkles, X } from "lucide-react"
import { useAuth } from "@/components/providers/AuthModals"
import LiveMissionsPreview from "@/components/preview/LiveMissionsPreview"
import { useShowcaseMode } from "@/hooks/useShowcaseMode"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import toast from "@/lib/toast"
import {
  type Mission,
  useCompleteMissionMutation,
  useLinkTwitterMutation,
  useMissionsQuery,
} from "@/store/verity/verityQueries"

type MissionFilter = "active" | "completed"
type MissionWithContext = Mission & { marketQuestion?: string | null }

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function getMissionDescription(mission: MissionWithContext) {
  const question = mission.marketQuestion

  switch (mission.verificationKey) {
    case "has_voted":
      return question
        ? `Place a vote on “${question}”.`
        : "Place a vote on any active prediction market."
    case "has_commented":
      return question
        ? `Post a comment on “${question}”.`
        : "Post a comment on any market feed."
    case "has_liked":
      return question ? `Like “${question}”.` : "Like any market in the feed."
    case "has_traded":
      return question
        ? `Buy shares on “${question}”.`
        : "Trade on any open market today."
    case "has_added_liquidity":
      return question
        ? `Provide liquidity to “${question}”.`
        : "Provide liquidity to any market pool."
    case "has_created_market":
      return "Propose and create a new prediction market."
    case "has_set_profile":
      return "Complete your Verity predictor profile."
    case "twitter_follow":
      return "Follow the target Verity account on X."
    case "twitter_retweet":
      return "Repost the specified Verity post on X."
    case "twitter_comment":
      return "Reply to the specified Verity post on X."
    case "twitter_retweet_and_comment":
      return "Repost and reply to the specified post on X."
    default:
      return mission.title
  }
}

export default function MissionsPage() {
  const { authenticated, login } = useAuth()
  const showcaseMode = useShowcaseMode()
  const { profile } = useWalletProfile()
  const { data, isLoading } = useMissionsQuery(profile?.id)
  const { mutateAsync: linkTwitter, isPending: isLinking } =
    useLinkTwitterMutation()
  const { mutateAsync: completeMission } = useCompleteMissionMutation()
  const missions = useMemo(() => (data ?? []) as MissionWithContext[], [data])

  const [filter, setFilter] = useState<MissionFilter>("active")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [twitterInput, setTwitterInput] = useState("")
  const [verifyingMissionId, setVerifyingMissionId] = useState<string | null>(
    null,
  )
  const [startedMissions, setStartedMissions] = useState<string[]>(() => {
    if (typeof window === "undefined") return []

    try {
      const parsed: unknown = JSON.parse(
        localStorage.getItem("verity_started_missions") ?? "[]",
      )
      return Array.isArray(parsed) &&
        parsed.every((id) => typeof id === "string")
        ? parsed
        : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(
      "verity_started_missions",
      JSON.stringify(startedMissions),
    )
  }, [startedMissions])

  const missionStats = useMemo(() => {
    const completed = missions.filter((mission) => mission.completed).length
    const availableXp = missions.reduce(
      (total, mission) =>
        total + (mission.completed ? 0 : (mission.xpReward ?? 0)),
      0,
    )

    return {
      completed,
      active: missions.length - completed,
      availableXp,
    }
  }, [missions])

  const visibleMissions = missions.filter((mission) =>
    filter === "completed" ? mission.completed : !mission.completed,
  )

  async function handleLinkTwitter() {
    const trimmed = twitterInput.trim().replace(/^@/, "")
    if (!trimmed) {
      toast.error("Enter a valid X username.")
      return
    }

    try {
      await linkTwitter({ twitterUsername: trimmed })
      toast.success("X account linked.")
      setIsModalOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to link your X account."))
    }
  }

  function handleStart(mission: MissionWithContext) {
    if (mission.missionType !== "activity" && mission.actionUrl) {
      if (/^https?:\/\//.test(mission.actionUrl)) {
        window.open(mission.actionUrl, "_blank", "noopener,noreferrer")
      } else {
        window.location.assign(mission.actionUrl)
      }
    }

    setStartedMissions((current) =>
      current.includes(mission.id) ? current : [...current, mission.id],
    )
  }

  async function handleClaim(mission: MissionWithContext) {
    if (
      mission.verificationKey?.startsWith("twitter_") &&
      !profile?.twitterUsername
    ) {
      setStartedMissions((current) => current.filter((id) => id !== mission.id))
      setTwitterInput("")
      setIsModalOpen(true)
      toast.error("Link your X account before claiming this mission.")
      return
    }

    setVerifyingMissionId(mission.id)
    try {
      await completeMission(mission.id)
      setStartedMissions((current) => current.filter((id) => id !== mission.id))
      toast.success("Mission completed. Arena XP added.")
    } catch (error) {
      setStartedMissions((current) => current.filter((id) => id !== mission.id))
      toast.error(getErrorMessage(error, "Mission verification failed."))
    } finally {
      setVerifyingMissionId(null)
    }
  }

  // Temporarily force preview for testing
  return <LiveMissionsPreview />

  if (!authenticated) {
    return (
      <section className="verity-access-gate">
        <span className="verity-access-gate__icon" aria-hidden="true">
          <LockKeyhole />
        </span>
        <p>Verity rewards</p>
        <h1>MISSIONS</h1>
        <span>Sign in to track tasks, claim Arena XP, and unlock boosts.</span>
        <button onClick={login} type="button">
          SIGN IN TO CONTINUE
        </button>
      </section>
    )
  }

  return (
    <div className="verity-product-page verity-missions-page">
      <header className="verity-product-hero">
        <div>
          <p className="verity-product-eyebrow">
            <i aria-hidden="true" /> Verity rewards · Live progression
          </p>
          <h1>
            MISSIONS<span>.</span>
          </h1>
          <p className="verity-product-copy">
            Complete market, community, and social objectives. Every verified
            action strengthens your Arena rank.
          </p>
        </div>

        <div className="verity-xp-panel">
          <span>Total Arena XP</span>
          <strong>{(profile?.arenaXp ?? 0).toLocaleString()}</strong>
          {profile?.twitterUsername ? (
            <Link
              className="verity-linked-x"
              href={`https://x.com/${profile?.twitterUsername}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Send aria-hidden="true" /> X: @{profile?.twitterUsername}
            </Link>
          ) : (
            <button
              onClick={() => {
                setTwitterInput("")
                setIsModalOpen(true)
              }}
              type="button"
            >
              <Send aria-hidden="true" /> LINK X ACCOUNT
            </button>
          )}
        </div>
      </header>

      <section className="verity-mission-stats" aria-label="Mission summary">
        <MissionStat label="Active" value={missionStats.active} accent />
        <MissionStat label="Completed" value={missionStats.completed} />
        <MissionStat label="XP available" value={missionStats.availableXp} />
      </section>

      <div className="verity-section-heading">
        <div>
          <span>Objective board</span>
          <h2>BUILD YOUR RECORD</h2>
        </div>
        <div
          className="verity-segmented-tabs"
          role="tablist"
          aria-label="Mission filters"
        >
          {(["active", "completed"] as const).map((item) => (
            <button
              aria-selected={filter === item}
              className={filter === item ? "is-active" : ""}
              key={item}
              onClick={() => setFilter(item)}
              role="tab"
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <section className="verity-mission-list" aria-live="polite">
        {isLoading ? (
          [1, 2, 3].map((item) => (
            <div className="verity-product-skeleton" key={item} />
          ))
        ) : visibleMissions.length === 0 ? (
          <div className="verity-product-empty">
            <Sparkles aria-hidden="true" />
            <h3>
              {filter === "active" ? "ALL CLEAR" : "NO COMPLETED MISSIONS"}
            </h3>
            <p>
              {filter === "active"
                ? "You have completed every currently available objective."
                : "Complete your first objective to build a permanent record."}
            </p>
          </div>
        ) : (
          visibleMissions.map((mission, index) => {
            const started = startedMissions.includes(mission.id)
            const reward = mission.xpReward
              ? `+${mission.xpReward} XP`
              : mission.rewardMultiplier
                ? `+${mission.rewardMultiplier}× BOOST`
                : "REWARD"

            return (
              <article
                className={`verity-mission-card ${mission.completed ? "is-complete" : ""}`}
                key={mission.id}
              >
                <span className="verity-mission-card__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="verity-mission-card__copy">
                  <div className="verity-mission-card__meta">
                    <span>{mission.missionType}</span>
                    <strong>{reward}</strong>
                  </div>
                  <h3>{mission.title}</h3>
                  <p>{getMissionDescription(mission)}</p>
                </div>
                <div className="verity-mission-card__action">
                  {mission.completed ? (
                    <span className="verity-mission-complete">
                      <Check aria-hidden="true" /> COMPLETE
                    </span>
                  ) : started ? (
                    <button
                      className="is-primary"
                      disabled={verifyingMissionId === mission.id}
                      onClick={() => void handleClaim(mission)}
                      type="button"
                    >
                      {verifyingMissionId === mission.id ? (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                      ) : null}
                      CLAIM
                    </button>
                  ) : (
                    <button onClick={() => handleStart(mission)} type="button">
                      START
                    </button>
                  )}
                </div>
              </article>
            )
          })
        )}
      </section>

      {isModalOpen && (
        <div className="verity-modal-backdrop" role="presentation">
          <button
            aria-label="Close X account dialog"
            className="verity-modal-dismiss"
            disabled={isLinking}
            onClick={() => setIsModalOpen(false)}
            type="button"
          />
          <section
            aria-labelledby="link-x-title"
            aria-modal="true"
            className="verity-link-modal"
            role="dialog"
          >
            <header>
              <div>
                <span>Social verification</span>
                <h2 id="link-x-title">LINK X ACCOUNT</h2>
              </div>
              <button
                aria-label="Close"
                disabled={isLinking}
                onClick={() => setIsModalOpen(false)}
                type="button"
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <p>
              Your username is used to verify social missions and cannot be
              edited after it is linked.
            </p>
            <label htmlFor="twitter-username">X username</label>
            <div className="verity-link-input">
              <span>@</span>
              <input
                autoFocus
                id="twitter-username"
                onChange={(event) => setTwitterInput(event.target.value)}
                placeholder="username"
                value={twitterInput}
              />
            </div>
            <button
              className="verity-link-submit"
              disabled={isLinking || !twitterInput.trim()}
              onClick={() => void handleLinkTwitter()}
              type="button"
            >
              {isLinking ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              CONFIRM USERNAME
            </button>
          </section>
        </div>
      )}
    </div>
  )
}

function MissionStat({
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
