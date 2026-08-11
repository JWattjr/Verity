"use client"

import { useState } from "react"
import { usePvpLeaderboardQuery } from "@/store/verity/verityQueries"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { Medal } from "lucide-react"
import Link from "next/link"

type LeaderboardTab = "xp" | "referrers" | "points-system"

type LeaderboardUser = {
  id: string
  username?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  pvpMatchesLostCount?: number | null
  arenaXp?: number | null
  referralCount?: number | null
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("xp")
  const { profile: loggedInProfile } = useWalletProfile()
  const {
    data: leaderboardData,
    isLoading,
    error,
  } = usePvpLeaderboardQuery(loggedInProfile?.id)

  const pvpRules = [
    {
      role: "Match ticket",
      logic:
        "Choose at least 3 propositions before the event locks. A ticket can include up to every available proposition, with one selection per category.",
    },
    {
      role: "Match scoring",
      logic:
        "Each correct prediction is worth 1 duel point. Incorrect predictions are worth 0; the maximum score depends on that event's available propositions.",
    },
    {
      role: "Match result",
      logic:
        "The player with the higher score wins. If both players finish with the same score, the duel is a draw.",
    },
    {
      role: "Result XP",
      logic:
        "Winner: 100 Arena XP. Loser: 30 Arena XP. Draw: 50 Arena XP for each player.",
    },
    {
      role: "Perfect score",
      logic:
        "A player who selects and correctly predicts every proposition in the event earns an additional 20 Arena XP.",
    },
    {
      role: "XP boost",
      logic:
        "An eligible boost multiplies total Result XP, including a perfect-score bonus. The multiplier is recorded when the ticket is submitted and may vary by reward or coupon.",
    },
    {
      role: "Referral reward",
      logic:
        "When a referred player wins their first PvP duel, their referrer receives 2 XP boosts. The referred player receives no boost and there is no referral XP kickback.",
    },
    {
      role: "Leaderboard total",
      logic:
        "The leaderboard ranks cumulative Arena XP. That total can include resolved-duel XP and direct Arena XP earned from completed missions.",
    },
    {
      role: "Leaderboard grade",
      logic:
        "Arena grades: Unranked 0–29 XP, Bronze 30–499, Silver 500–1,499, Gold 1,500–2,999, Platinum 3,000–4,999, Diamond 5,000–6,999, Legend 7,000–9,000, and Mythic from 9,001 XP.",
    },
  ]

  return (
    <div className="flex w-full max-w-[1000px] flex-col gap-5 py-10 sm:py-14 mx-auto">
      {/* Header Banner */}
      <section className="border-b border-border pb-8">
        <div className="max-w-[720px]">
          <p className="mb-4 flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ash">
            <span className="h-2 w-2 bg-accent" aria-hidden="true" />
            Verity · PvP Arena · All players
          </p>
          <h1 className="font-heading text-[58px] font-black uppercase leading-[0.82] tracking-[0.01em] text-charcoal-primary sm:text-[78px]">
            ARENA <span className="text-accent">LEADERBOARD</span>
          </h1>
          <p className="mt-5 max-w-[620px] text-[14px] leading-6 text-graphite">
            Correct calls decide each duel; resolved results and eligible
            missions build Arena XP. Track the cumulative leaders, referral
            table, and rules behind each rank.
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-7 overflow-x-auto border-b border-border">
        <button
          onClick={() => setActiveTab("xp")}
          className={`relative border-b-2 px-0 py-4 text-left font-sans text-[13px] font-bold uppercase tracking-[0.5px] whitespace-nowrap transition-colors ${
            activeTab === "xp"
              ? "border-accent text-charcoal-primary"
              : "border-transparent text-ash hover:text-charcoal-primary"
          }`}
        >
          Arena XP
        </button>
        <button
          onClick={() => setActiveTab("referrers")}
          className={`relative border-b-2 px-0 py-4 text-left font-sans text-[13px] font-bold uppercase tracking-[0.5px] whitespace-nowrap transition-colors ${
            activeTab === "referrers"
              ? "border-accent text-charcoal-primary"
              : "border-transparent text-ash hover:text-charcoal-primary"
          }`}
        >
          Top Referrers
        </button>
        <button
          onClick={() => setActiveTab("points-system")}
          className={`relative border-b-2 px-0 py-4 text-left font-sans text-[13px] font-bold uppercase tracking-[0.5px] whitespace-nowrap transition-colors ${
            activeTab === "points-system"
              ? "border-accent text-charcoal-primary"
              : "border-transparent text-ash hover:text-charcoal-primary"
          }`}
        >
          PvP Rules
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 min-h-[350px]">
        {isLoading && (
          <div className="verity-card overflow-hidden">
            <div className="p-4 border-b border-border dark:border-zinc-800 bg-white-surface/40 dark:bg-zinc-900/40">
              <div className="h-4 w-32 rounded bg-stone-surface dark:bg-zinc-800 animate-pulse" />
              <div className="h-3 w-48 rounded bg-stone-surface dark:bg-zinc-800 animate-pulse mt-1.5" />
            </div>
            <div className="divide-y divide-border dark:divide-zinc-800">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 animate-pulse"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Rank Number Skeleton */}
                    <div className="h-6 w-6 shrink-0 rounded-full bg-stone-surface dark:bg-zinc-800/80" />

                    {/* User Details Skeleton */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Avatar Skeleton */}
                      <div className="h-9 w-9 shrink-0 rounded-full bg-stone-surface dark:bg-zinc-800/80" />
                      {/* Text Skeleton */}
                      <div className="min-w-0 space-y-1.5 flex-1 max-w-[150px]">
                        <div className="h-4 w-3/4 rounded bg-stone-surface dark:bg-zinc-800/80" />
                        <div className="h-3 w-1/2 rounded bg-stone-surface dark:bg-zinc-800/80" />
                      </div>
                    </div>
                  </div>

                  {/* Score / Grade Skeleton */}
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div className="h-5 w-16 rounded bg-stone-surface/60 dark:bg-zinc-800/60 hidden sm:block" />
                    <div className="space-y-1">
                      <div className="h-4 w-10 rounded bg-stone-surface dark:bg-zinc-800/80 ml-auto" />
                      <div className="h-3 w-14 rounded bg-stone-surface dark:bg-zinc-800/80 ml-auto" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="verity-card p-8 text-center text-sm text-coral-red">
            Failed to load leaderboard data: {error.message}
          </div>
        )}

        {!isLoading && !error && (
          <>
            {activeTab === "xp" && (
              <div className="verity-card overflow-hidden">
                <div className="flex items-end justify-between gap-4 border-b border-border bg-black px-4 py-5 text-white sm:px-6">
                  <div>
                    <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white/55">
                      Verity community rankings
                    </p>
                    <h3 className="font-heading text-[25px] font-black uppercase leading-none tracking-[0.04em]">
                      Total Arena XP
                    </h3>
                  </div>
                  <p className="hidden max-w-[300px] text-right text-[11px] leading-4 text-white/55 sm:block">
                    XP from resolved duels and eligible mission rewards.
                  </p>
                </div>
                {!leaderboardData?.xp?.length ? (
                  <div className="p-8 text-center text-sm text-ash">
                    No rankings available yet.
                  </div>
                ) : (
                  <>
                    <LeaderboardPodium
                      users={leaderboardData?.xp ?? []}
                      scoreLabel="XP"
                      getScore={(user) => Number(user.arenaXp ?? 0)}
                      currentUserId={loggedInProfile?.id}
                    />
                    {leaderboardData.xp.length > 3 && (
                      <div className="border-t border-border">
                        <LeaderboardTableHeader scoreLabel="Arena XP" />
                        <div className="divide-y divide-border dark:divide-zinc-800">
                          {leaderboardData?.xp
                            ?.slice(3)
                            .map((user, index: number) => (
                              <UserLeaderboardRow
                                key={user.id}
                                user={user}
                                rank={index + 4}
                                scoreLabel="XP"
                                scoreValue={Number(user.arenaXp ?? 0)}
                                isCurrentUser={user.id === loggedInProfile?.id}
                              />
                            ))}
                          {(() => {
                            const isUserInXpList = leaderboardData?.xp?.some(
                              (u) => u.id === loggedInProfile?.id,
                            )
                            if (
                              !isUserInXpList &&
                              loggedInProfile &&
                              leaderboardData?.currentUserXpRank != null &&
                              leaderboardData.currentUserXpRank > 50
                            ) {
                              return (
                                <>
                                  <div className="flex items-center justify-center py-2 bg-stone-50/50 dark:bg-zinc-950/20 border-t border-dashed border-border dark:border-zinc-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-ash font-mono">
                                      ••• You are ranked{" "}
                                      {leaderboardData.currentUserXpRank} •••
                                    </span>
                                  </div>
                                  <UserLeaderboardRow
                                    user={{
                                      id: loggedInProfile.id,
                                      username: loggedInProfile.username,
                                      displayName: loggedInProfile.displayName,
                                      avatarUrl: loggedInProfile.avatarUrl,
                                      pvpMatchesLostCount:
                                        loggedInProfile.pvpMatchesLostCount ??
                                        0,
                                    }}
                                    rank={leaderboardData.currentUserXpRank}
                                    scoreLabel="XP"
                                    scoreValue={
                                      leaderboardData.currentUserXp ?? 0
                                    }
                                    isCurrentUser={true}
                                  />
                                </>
                              )
                            }
                            return null
                          })()}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "referrers" && (
              <div className="verity-card overflow-hidden">
                <div className="flex items-end justify-between gap-4 border-b border-border bg-black px-4 py-5 text-white sm:px-6">
                  <div>
                    <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white/55">
                      Community rankings
                    </p>
                    <h3 className="font-heading text-[25px] font-black uppercase leading-none tracking-[0.04em]">
                      Top Referrers
                    </h3>
                  </div>
                  <p className="hidden max-w-[300px] text-right text-[11px] leading-4 text-white/55 sm:block">
                    Ranked by successfully onboarded players.
                  </p>
                </div>
                {!leaderboardData?.referrers?.length ? (
                  <div className="p-8 text-center text-sm text-ash">
                    No referrals recorded yet.
                  </div>
                ) : (
                  <>
                    <LeaderboardPodium
                      users={leaderboardData?.referrers ?? []}
                      scoreLabel="Referrals"
                      getScore={(user) => Number(user.referralCount ?? 0)}
                      getExtraInfo={(user) => `${Number(user.arenaXp ?? 0)} XP`}
                      currentUserId={loggedInProfile?.id}
                    />
                    {leaderboardData.referrers.length > 3 && (
                      <div className="border-t border-border">
                        <LeaderboardTableHeader scoreLabel="Referrals" />
                        <div className="divide-y divide-border dark:divide-zinc-800">
                          {leaderboardData?.referrers
                            ?.slice(3)
                            .map((user, index: number) => (
                              <UserLeaderboardRow
                                key={user.id}
                                user={user}
                                rank={index + 4}
                                scoreLabel="Referrals"
                                scoreValue={Number(user.referralCount ?? 0)}
                                extraInfo={`${Number(user.arenaXp ?? 0)} XP`}
                                isCurrentUser={user.id === loggedInProfile?.id}
                              />
                            ))}
                          {(() => {
                            const isUserInReferrersList =
                              leaderboardData?.referrers?.some(
                                (u) => u.id === loggedInProfile?.id,
                              )
                            if (
                              !isUserInReferrersList &&
                              loggedInProfile &&
                              leaderboardData?.currentUserReferralRank !=
                                null &&
                              leaderboardData.currentUserReferralRank > 50
                            ) {
                              return (
                                <>
                                  <div className="flex items-center justify-center py-2 bg-stone-50/50 dark:bg-zinc-950/20 border-t border-dashed border-border dark:border-zinc-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-ash font-mono">
                                      ••• You are ranked{" "}
                                      {leaderboardData.currentUserReferralRank}{" "}
                                      •••
                                    </span>
                                  </div>
                                  <UserLeaderboardRow
                                    user={{
                                      id: loggedInProfile.id,
                                      username: loggedInProfile.username,
                                      displayName: loggedInProfile.displayName,
                                      avatarUrl: loggedInProfile.avatarUrl,
                                    }}
                                    rank={
                                      leaderboardData.currentUserReferralRank
                                    }
                                    scoreLabel="Referrals"
                                    scoreValue={
                                      leaderboardData.currentUserReferral ?? 0
                                    }
                                    extraInfo={`${loggedInProfile.arenaXp ?? 0} XP`}
                                    isCurrentUser={true}
                                  />
                                </>
                              )
                            }
                            return null
                          })()}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "points-system" && (
              <div className="flex flex-col gap-3">
                <div className="verity-card p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-accent bg-accent/10 text-accent">
                      <Medal className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-heading text-xl font-black uppercase tracking-[0.05em] text-charcoal-primary">
                        Verity PvP Scoring
                      </h3>
                      <p className="text-sm text-graphite dark:text-zinc-400 mt-1">
                        These rules mirror the scoring and Arena XP logic used
                        when Verity settles a duel.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="verity-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-border dark:border-zinc-800 bg-white-surface/40 dark:bg-zinc-900/40 text-xs font-mono font-bold uppercase tracking-wider text-ash">
                          <th className="p-4 w-[160px]">PvP Rule</th>
                          <th className="p-4">How It Works</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border dark:divide-zinc-800">
                        {pvpRules.map((item) => (
                          <tr
                            key={item.role}
                            className="hover:bg-white-surface/20 dark:hover:bg-zinc-900/20"
                          >
                            <td className="p-4 font-semibold text-charcoal-primary dark:text-white align-top">
                              {item.role}
                            </td>
                            <td className="p-4 text-graphite dark:text-zinc-300 leading-relaxed">
                              {item.logic}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function LeaderboardPodium({
  users,
  scoreLabel,
  getScore,
  getExtraInfo,
  currentUserId,
}: {
  users: LeaderboardUser[]
  scoreLabel: string
  getScore: (user: LeaderboardUser) => number
  getExtraInfo?: (user: LeaderboardUser) => string
  currentUserId?: string
}) {
  const topThree = users.slice(0, 3)
  const displayOrder =
    topThree.length === 1
      ? [{ user: topThree[0], rank: 1 }]
      : topThree.length === 2
        ? [
            { user: topThree[1], rank: 2 },
            { user: topThree[0], rank: 1 },
          ]
        : [
            { user: topThree[1], rank: 2 },
            { user: topThree[0], rank: 1 },
            { user: topThree[2], rank: 3 },
          ]

  if (displayOrder.length === 0) return null

  return (
    <section className="bg-white-surface/20 px-2 pt-8 sm:px-8 sm:pt-11">
      <div
        className={`mx-auto grid items-end gap-px ${
          displayOrder.length === 1 ? "max-w-[360px]" : "max-w-[760px]"
        }`}
        style={{
          gridTemplateColumns: `repeat(${displayOrder.length}, minmax(0, 1fr))`,
        }}
      >
        {displayOrder.map(({ user, rank }) => {
          const score = getScore(user) ?? 0
          const grade = getArenaGrade(scoreLabel, score)
          const isWinner = rank === 1
          const isCurrentUser = user.id === currentUserId

          return (
            <article
              key={user.id}
              className={`flex min-w-0 flex-col border-x border-t border-border bg-surface ${
                isWinner
                  ? "border-t-[5px] border-t-accent"
                  : "border-t-[5px] border-t-charcoal-primary"
              }`}
            >
              <div
                className={`flex min-w-0 flex-col items-center px-2 text-center sm:px-4 ${
                  isWinner
                    ? "pb-6 pt-6 sm:pb-7 sm:pt-8"
                    : "pb-4 pt-4 sm:pb-5 sm:pt-5"
                }`}
              >
                <span className="mb-3 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-ash sm:text-[9px]">
                  {isWinner
                    ? "Champion"
                    : rank === 2
                      ? "Runner up"
                      : "Third place"}
                </span>
                <div
                  className={`relative flex shrink-0 items-center justify-center overflow-hidden border bg-black font-heading font-black uppercase text-white ${
                    isWinner
                      ? "h-16 w-16 border-accent text-[28px] sm:h-20 sm:w-20 sm:text-[34px]"
                      : "h-12 w-12 border-border text-[22px] sm:h-16 sm:w-16 sm:text-[28px]"
                  }`}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName || user.username || "Player"}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none"
                      }}
                    />
                  ) : (
                    (user.displayName || user.username || "?")
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>
                <Link
                  href={`/profile/${encodeURIComponent(user.id)}`}
                  className="mt-3 block max-w-full truncate font-heading text-[15px] font-black uppercase leading-none tracking-[0.03em] text-charcoal-primary hover:text-accent sm:text-[18px]"
                >
                  {user.displayName || user.username}
                </Link>
                <span className="mt-1 block max-w-full truncate font-mono text-[8px] text-ash sm:text-[9px]">
                  @{user.username}
                </span>
                <div className="mt-2 flex min-h-5 items-center justify-center gap-1">
                  {grade && (
                    <span
                      className={`border border-border px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.12em] sm:text-[8px] ${grade.color}`}
                    >
                      {grade.name}
                    </span>
                  )}
                  {isCurrentUser && (
                    <span className="border border-accent bg-accent px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.12em] text-black sm:text-[8px]">
                      You
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`flex flex-col items-center justify-center px-2 ${
                  isWinner
                    ? "min-h-[78px] bg-accent text-black sm:min-h-[94px]"
                    : rank === 2
                      ? "min-h-[62px] bg-black text-white sm:min-h-[76px]"
                      : "min-h-[52px] bg-black text-white sm:min-h-[64px]"
                }`}
              >
                <span className="font-heading text-[27px] font-black leading-none tabular-nums sm:text-[36px]">
                  {score}
                </span>
                <span
                  className={`mt-1 font-mono text-[7px] font-bold uppercase tracking-[0.15em] sm:text-[8px] ${
                    isWinner ? "text-black/60" : "text-white/55"
                  }`}
                >
                  {scoreLabel}
                  {getExtraInfo ? ` · ${getExtraInfo(user)}` : ""}
                </span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function LeaderboardTableHeader({ scoreLabel }: { scoreLabel: string }) {
  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center bg-black px-3 py-2 text-white sm:grid-cols-[56px_minmax(0,1fr)_210px] sm:px-4">
      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-white/45">
        Rank
      </span>
      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-white/45">
        Player
      </span>
      <span className="text-right font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-white/45">
        {scoreLabel}
      </span>
    </div>
  )
}

function UserLeaderboardRow({
  user,
  rank,
  scoreLabel,
  scoreValue,
  extraInfo,
  isCurrentUser,
}: {
  user: LeaderboardUser
  rank: number
  scoreLabel: string
  scoreValue: number
  extraInfo?: string
  isCurrentUser?: boolean
}) {
  const grade = getArenaGrade(scoreLabel, scoreValue)
  return (
    <div
      className={`grid min-h-[64px] grid-cols-[40px_minmax(0,1fr)_auto] items-center border-l-4 px-3 py-2.5 transition-colors sm:grid-cols-[56px_minmax(0,1fr)_210px] sm:px-4 ${
        isCurrentUser
          ? "border-l-accent bg-accent/[0.07]"
          : "border-l-transparent hover:bg-white-surface/35 dark:hover:bg-zinc-900/20"
      }`}
    >
      <span className="font-mono text-[11px] font-bold tabular-nums text-ash sm:text-[12px]">
        {String(rank).padStart(2, "0")}
      </span>

      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden border border-border bg-black font-heading text-base font-black text-white sm:h-9 sm:w-9 sm:text-lg">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName || user.username || "Player"}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
          ) : (
            (user.displayName || user.username || "?").charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <Link
            href={`/profile/${encodeURIComponent(user.id)}`}
            className="block truncate text-[13px] font-bold leading-tight text-charcoal-primary hover:text-accent dark:text-white sm:text-sm"
          >
            {user.displayName || user.username}
          </Link>
          <span className="mt-0.5 block truncate font-mono text-[8px] text-ash sm:text-[9px]">
            @{user.username}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
        <div className="hidden items-center gap-1.5 md:flex">
          {grade && (
            <span
              className={`border border-border px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] ${grade.color}`}
            >
              {grade.name}
            </span>
          )}
        </div>
        <div className="min-w-[54px] text-right sm:min-w-[72px]">
          <span className="block font-heading text-[22px] font-black leading-none tabular-nums text-charcoal-primary dark:text-white sm:text-[25px]">
            {scoreValue}
          </span>
          <span className="mt-1 block whitespace-nowrap font-mono text-[7px] font-bold uppercase leading-none tracking-[0.12em] text-ash sm:text-[8px]">
            {scoreLabel}
            {extraInfo && (
              <span className="hidden sm:inline"> · {extraInfo}</span>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

function getArenaGrade(scoreLabel: string, arenaXp: number) {
  if (scoreLabel !== "XP") return null

  if (arenaXp < 30) {
    return {
      name: "Unranked",
      color: "bg-slate-500/10 text-slate-500 dark:text-slate-300",
    }
  }
  if (arenaXp < 500) {
    return {
      name: "Bronze",
      color: "bg-amber-700/10 text-amber-700 dark:text-amber-500",
    }
  }
  if (arenaXp < 1500) {
    return {
      name: "Silver",
      color: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-300",
    }
  }
  if (arenaXp < 3000) {
    return {
      name: "Gold",
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    }
  }
  if (arenaXp < 5000) {
    return {
      name: "Platinum",
      color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    }
  }
  if (arenaXp < 7000) {
    return {
      name: "Diamond",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    }
  }
  if (arenaXp <= 9000) {
    return {
      name: "Legend",
      color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    }
  }
  return {
    name: "Mythic",
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
  }
}
