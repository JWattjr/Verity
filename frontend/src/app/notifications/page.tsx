"use client"

import { useRouter } from "next/navigation"
import {
  Bell,
  CheckCircle2,
  Heart,
  Loader2,
  MessageCircle,
  Repeat2,
  Swords,
  TrendingUp,
  Trophy,
  UserPlus,
  Zap,
} from "lucide-react"
import { useAuth } from "@/components/providers/AuthModals"
import LiveNotificationsPreview from "@/components/preview/LiveNotificationsPreview"
import { useShowcaseMode } from "@/hooks/useShowcaseMode"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { relativeTime } from "@/lib/verity"
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "@/store/verity/verityQueries"

type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  targetId?: string | null
  createdAt: string
}

const ICON_MAP = {
  reply: MessageCircle,
  comment: MessageCircle,
  like: Heart,
  reshare: Repeat2,
  follow: UserPlus,
  settlement: CheckCircle2,
  market_move: TrendingUp,
  market_funded: TrendingUp,
  market_registered: TrendingUp,
  pvp_matched: Swords,
  pvp_resolved: Trophy,
  pvp_boost: Zap,
} as const

export default function NotificationsPage() {
  const router = useRouter()
  const { login } = useAuth()
  const showcaseMode = useShowcaseMode()
  const { profile, isLoading: profileLoading } = useWalletProfile()
  const {
    data: rawNotifications = [],
    isLoading: notificationsLoading,
    refetch,
  } = useNotificationsQuery(profile?.id || "")
  const notifications = rawNotifications as NotificationItem[]
  const { mutateAsync: markRead } = useMarkNotificationReadMutation()
  const { mutateAsync: markAllRead, isPending: markAllReadPending } =
    useMarkAllNotificationsReadMutation()

  const unreadCount = notifications.filter((item) => !item.read).length
  const arenaCount = notifications.filter((item) =>
    item.type.toLowerCase().startsWith("pvp_"),
  ).length
  const settlementCount = notifications.filter(
    (item) => item.type.toLowerCase() === "settlement",
  ).length

  async function handleOpen(notification: NotificationItem) {
    if (!notification.read) {
      try {
        await markRead({
          notificationId: notification.id,
          userId: profile?.id || "",
        })
        await refetch()
      } catch {
        // Navigation should still work if the read receipt fails.
      }
    }

    const href = getNotificationHref(notification)
    if (href) router.push(href)
  }

  async function handleMarkAllRead() {
    if (!profile?.id) return
    try {
      await markAllRead(profile.id)
      await refetch()
    } catch {
      // Keep the inbox usable if the read receipt fails.
    }
  }

  // Temporarily force preview for testing
  return <LiveNotificationsPreview />

  if (profileLoading) {
    return (
      <div className="verity-product-page">
        <div className="verity-product-skeleton is-hero" />
        <div className="verity-product-skeleton" />
      </div>
    )
  }

  if (!profile) {
    return (
      <section className="verity-access-gate">
        <span className="verity-access-gate__icon" aria-hidden="true">
          <Bell />
        </span>
        <p>Your Verity inbox</p>
        <h1>NOTIFICATIONS</h1>
        <span>
          Sign in to see Arena matches, duel results, settlements, winnings,
          replies, likes, reshares, and rewards.
        </span>
        <button onClick={login} type="button">
          SIGN IN TO CONTINUE
        </button>
      </section>
    )
  }

  return (
    <div className="verity-product-page verity-notifications-page">
      <header className="verity-product-hero">
        <div>
          <p className="verity-product-eyebrow">
            <i aria-hidden="true" /> Personal inbox · Live signals
          </p>
          <h1>
            NOTIFICATIONS<span>.</span>
          </h1>
          <p className="verity-product-copy">
            Arena opponents, duel results, prediction wins, market
            settlements, replies, likes, reshares, and XP rewards—all in one
            private record.
          </p>
        </div>
        <div className="verity-xp-panel">
          <span>Unread signals</span>
          <strong>{unreadCount}</strong>
          <small>{notifications.length} notifications in your recent record</small>
        </div>
      </header>

      <section className="verity-mission-stats" aria-label="Inbox summary">
        <NotificationStat label="Unread" value={unreadCount} accent />
        <NotificationStat label="Arena" value={arenaCount} />
        <NotificationStat label="Settlements" value={settlementCount} />
      </section>

      <div className="verity-section-heading">
        <div>
          <span>Private account signals</span>
          <h2>RECENT ACTIVITY</h2>
        </div>
        {unreadCount > 0 ? (
          <button
            className="verity-inbox-mark-all"
            disabled={markAllReadPending}
            onClick={() => void handleMarkAllRead()}
            type="button"
          >
            {markAllReadPending ? <Loader2 className="animate-spin" /> : null}
            MARK ALL READ
          </button>
        ) : null}
      </div>

      <section className="verity-notification-list" aria-live="polite">
        {notificationsLoading ? (
          [1, 2, 3].map((item) => (
            <div className="verity-product-skeleton" key={item} />
          ))
        ) : notifications.length > 0 ? (
          notifications.map((notification) => {
            const type = notification.type.toLowerCase()
            const Icon = ICON_MAP[type as keyof typeof ICON_MAP] || Bell

            return (
              <button
                className={`verity-notification-row ${notification.read ? "is-read" : "is-unread"}`}
                key={notification.id}
                onClick={() => void handleOpen(notification)}
                type="button"
              >
                <span className="verity-notification-row__icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="verity-notification-row__copy">
                  <small>{getNotificationLabel(type)}</small>
                  <strong>{notification.title}</strong>
                  <span>{notification.body}</span>
                </span>
                <time dateTime={notification.createdAt}>
                  {relativeTime(notification.createdAt)}
                </time>
                {!notification.read ? <i aria-label="Unread" /> : null}
              </button>
            )
          })
        ) : (
          <div className="verity-product-empty">
            <Bell aria-hidden="true" />
            <h3>NO NOTIFICATIONS YET</h3>
            <p>Your personal Verity signals will appear here as they happen.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function NotificationStat({
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
      <strong>{value}</strong>
    </div>
  )
}

function getNotificationHref(notification: NotificationItem) {
  if (!notification.targetId) return null
  const type = notification.type.toLowerCase()

  if (["settlement", "market_move", "market_funded", "market_registered"].includes(type)) {
    return `/markets/${notification.targetId}`
  }
  if (["pvp_matched", "pvp_resolved", "pvp_boost"].includes(type)) {
    return "/markets?tab=pvp-arena"
  }
  return `/posts/${notification.targetId}`
}

function getNotificationLabel(type: string) {
  if (type === "pvp_matched") return "Arena match"
  if (type === "pvp_resolved") return "Duel result"
  if (type === "pvp_boost") return "Arena reward"
  if (type === "settlement") return "Market settlement"
  if (type === "reply" || type === "comment") return "Discussion"
  if (type === "like" || type === "reshare") return "Social signal"
  if (type === "follow") return "New follower"
  return "Market signal"
}
