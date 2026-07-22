"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Bell,
  CheckCircle2,
  MessageCircle,
  Swords,
  Trophy,
  Zap,
} from "lucide-react"
import {
  useFeedQuery,
  usePvpLeaderboardQuery,
} from "@/store/verity/verityQueries"

type PreviewNotification = {
  body: string
  href: string
  Icon: typeof Bell
  label: string
  time: string
  title: string
}

export default function LiveNotificationsPreview() {
  const [allRead, setAllRead] = useState(false)
  const { data: feed = [] } = useFeedQuery(undefined, true)
  const { data: leaderboard } = usePvpLeaderboardQuery()
  const marketPosts = feed.filter((item) => item.market)
  const people = leaderboard?.xp ?? []
  const notifications = buildPreviewNotifications(people, marketPosts)

  return (
    <div className="verity-product-page verity-notifications-preview">
      <header className="verity-product-hero verity-product-hero--single">
        <div>
          <p className="verity-product-eyebrow">
            <i aria-hidden="true" /> Your Verity activity
          </p>
          <h1>
            NOTIFICATIONS<span>.</span>
          </h1>
        </div>
      </header>

      <div className="verity-section-heading">
        <div>
          <span>Personal signals</span>
          <h2>RECENT ACTIVITY</h2>
        </div>
        <button
          className="verity-inbox-mark-all"
          disabled={allRead}
          onClick={() => setAllRead(true)}
          type="button"
        >
          {allRead ? "ALL READ" : "MARK ALL AS READ"}
        </button>
      </div>

      <section className="verity-preview-notification-list" aria-live="polite">
        {notifications.map((notification, index) => {
          const Icon = notification.Icon
          return (
            <Link
              className={`verity-preview-notification ${index < 3 && !allRead ? "is-unread" : ""}`}
              href={notification.href}
              key={`${notification.title}-${index}`}
            >
              <span className="verity-preview-notification__icon">
                <Icon aria-hidden="true" />
              </span>
              <div>
                <span>{notification.label}</span>
                <h3>{notification.title}</h3>
                <p>{notification.body}</p>
              </div>
              <time>{notification.time}</time>
              {index < 3 && !allRead ? (
                <i aria-label="Unread preview item" />
              ) : null}
            </Link>
          )
        })}
      </section>
    </div>
  )
}

function buildPreviewNotifications(
  people: Array<{ username?: string; displayName?: string }>,
  marketPosts: Array<{
    id: string
    market: {
      id: string
      question: string
      resolvedOutcome?: string | null
    } | null
  }>,
): PreviewNotification[] {
  const username = (index: number, fallback: string) =>
    people[index]?.username || people[index]?.displayName || fallback
  const market = (index: number, fallback: string) =>
    marketPosts[index]?.market?.question || fallback
  const marketHref = (index: number) =>
    marketPosts[index]?.market?.id
      ? `/markets/${marketPosts[index].market!.id}`
      : "/markets"

  const gaddafi = username(9, "gaddafi862")
  const henrex = username(0, "Henrex11")
  const shotgun = username(8, "shotgun")
  const apex = username(13, "Apex")

  return [
    {
      Icon: Swords,
      label: "Arena match",
      title: "PvP Arena Opponent Found!",
      body: `You've been matched against @${gaddafi} for the event with a selection divergence of 3 picks.`,
      href: "/markets?tab=pvp-arena",
      time: "12 days ago",
    },
    {
      Icon: Swords,
      label: "Duel result",
      title: "PvP Duel Resolved: You LOST ❌",
      body: `Your battle against @${gaddafi} resolved. Score: 4/9 vs 6/9. Arena XP earned: +30.`,
      href: "/markets?tab=pvp-arena",
      time: "12 days ago",
    },
    {
      Icon: Trophy,
      label: "Duel result",
      title: "PvP Duel Resolved: You WON 🏆",
      body: `Your battle against @${henrex} resolved. Score: 7/9 vs 6/9. Arena XP earned: +100.`,
      href: "/markets?tab=pvp-arena",
      time: "12 days ago",
    },
    {
      Icon: MessageCircle,
      label: "Discussion",
      title: "New reply",
      body: `${apex} commented on your post: “${market(0, "World Cup: Unbeaten Champion?")}”`,
      href: marketHref(0),
      time: "13 days ago",
    },
    {
      Icon: Swords,
      label: "Arena match",
      title: "PvP Arena Opponent Found!",
      body: `You've been matched against @${shotgun} for the event with a selection divergence of 2 picks.`,
      href: "/markets?tab=pvp-arena",
      time: "13 days ago",
    },
    {
      Icon: CheckCircle2,
      label: "Prediction result",
      title: "You won a prediction!",
      body: `Your prediction on “${market(1, "France vs Spain - Extra Time / Penalties Winner")}" was correct. Claim your winnings now.`,
      href: marketHref(1),
      time: "13 days ago",
    },
    {
      Icon: CheckCircle2,
      label: "Market settlement",
      title: "Market resolved",
      body: `The market “${market(2, "France vs Spain - Offsides")}" has been resolved and the official outcome is available.`,
      href: marketHref(2),
      time: "14 days ago",
    },
    {
      Icon: Trophy,
      label: "Duel result",
      title: "PvP Duel Resolved: You WON 🏆",
      body: `Your battle against @${shotgun} resolved. Score: 7/9 vs 6/9. Arena XP earned: +100.`,
      href: "/markets?tab=pvp-arena",
      time: "14 days ago",
    },
    {
      Icon: Zap,
      label: "Arena reward",
      title: "Referral XP Boosts Awarded!",
      body: `Your referred friend @${henrex} won their first duel. You received 2 Arena XP boosts.`,
      href: "/markets?tab=pvp-arena",
      time: "14 days ago",
    },
  ]
}
