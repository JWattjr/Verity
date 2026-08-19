"use client"

import { useRouter } from "next/navigation"
import {
  Bell,
  CheckCircle2,
  Heart,
  Loader2,
  Swords,
  TrendingUp,
  Trophy,
  UserPlus,
  Zap,
} from "lucide-react"
import { useAuth } from "@/components/providers/AuthModals"
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
  like: Heart,
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
        // Navigation still works if read receipt fails
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
      // Keep inbox usable
    }
  }

  if (profileLoading) {
    return (
      <div className="w-full py-8 font-sans sm:py-12 flex flex-col gap-6">
        <div className="h-36 rounded-[2px] border border-border bg-surface animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 rounded-[2px] border border-border bg-surface animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="w-full py-8 font-sans sm:py-12 flex flex-col items-center justify-center">
        <section className="w-full max-w-lg rounded-[2px] border border-border bg-surface p-8 sm:p-12 text-center flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[2px] border border-border bg-black text-white">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ash">
              Private inbox · Live signals
            </span>
            <h1 className="mt-1 font-heading text-3xl font-black uppercase text-charcoal-primary sm:text-4xl">
              NOTIFICATIONS
            </h1>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-graphite sm:text-sm">
            Sign in with your wallet to view real-time Arena match invites, duel results,
            market settlements, winnings, and XP rewards.
          </p>
          <button
            onClick={login}
            type="button"
            className="mt-2 flex h-11 items-center justify-center rounded-[2px] bg-accent px-6 font-sans text-xs font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-white cursor-pointer"
          >
            SIGN IN TO CONTINUE
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="w-full py-8 font-sans sm:py-12 flex flex-col gap-6">
      {/* Editorial Header */}
      <header className="border-b border-border pb-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ash">
              <span className="h-1.5 w-1.5 bg-accent" />
              Personal inbox · Live signals
            </div>
            <h1 className="mt-2 font-heading text-4xl sm:text-6xl font-extrabold leading-[0.88] tracking-[-0.02em] text-charcoal-primary">
              NOTIFICATIONS
            </h1>
            <p className="mt-3 max-w-[650px] text-sm leading-relaxed text-graphite sm:text-base">
              Real-time records for Arena matchings, duel scores, prediction market settlements,
              and XP tier rewards.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col border border-border bg-surface px-5 py-3 rounded-[2px] min-w-[140px]">
              <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-ash">
                Unread signals
              </span>
              <strong className="font-heading text-2xl font-black text-accent">
                {unreadCount}
              </strong>
            </div>
            <div className="flex flex-col border border-border bg-surface px-5 py-3 rounded-[2px] min-w-[140px]">
              <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-ash">
                Total record
              </span>
              <strong className="font-heading text-2xl font-black text-charcoal-primary">
                {notifications.length}
              </strong>
            </div>
          </div>
        </div>
      </header>

      {/* Summary Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
          <span className="border border-border bg-surface px-3 py-1.5 rounded-[2px] text-charcoal-primary">
            All ({notifications.length})
          </span>
          <span className="border border-border bg-surface px-3 py-1.5 rounded-[2px] text-ash">
            Arena ({arenaCount})
          </span>
          <span className="border border-border bg-surface px-3 py-1.5 rounded-[2px] text-ash">
            Settlements ({settlementCount})
          </span>
        </div>

        {unreadCount > 0 && (
          <button
            className="flex h-9 items-center gap-1.5 border border-border bg-surface px-4 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ash transition-colors hover:bg-black hover:text-white rounded-[2px] cursor-pointer"
            disabled={markAllReadPending}
            onClick={() => void handleMarkAllRead()}
            type="button"
          >
            {markAllReadPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            MARK ALL AS READ
          </button>
        )}
      </div>

      {/* Notification List */}
      <section className="flex flex-col gap-2.5" aria-live="polite">
        {notificationsLoading ? (
          [1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-20 rounded-[2px] border border-border bg-surface animate-pulse"
            />
          ))
        ) : notifications.length > 0 ? (
          notifications.map((notification) => {
            const type = notification.type.toLowerCase()
            const Icon = ICON_MAP[type as keyof typeof ICON_MAP] || Bell
            const isUnread = !notification.read

            return (
              <button
                className={`group relative flex items-start gap-4 rounded-[2px] border p-4 sm:p-5 text-left transition-colors cursor-pointer ${
                  isUnread
                    ? "border-accent/40 bg-surface hover:bg-surface-muted"
                    : "border-border bg-surface hover:bg-surface-muted opacity-80 hover:opacity-100"
                }`}
                key={notification.id}
                onClick={() => void handleOpen(notification)}
                type="button"
              >
                {isUnread && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-l-[2px]" />
                )}

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border transition-colors ${
                    isUnread
                      ? "border-accent bg-accent text-black"
                      : "border-border bg-surface-muted text-ash group-hover:text-charcoal-primary"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>

                <div className="flex flex-1 flex-col min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-ash">
                      {getNotificationLabel(type)}
                    </span>
                    {isUnread && (
                      <span className="font-mono text-[7px] font-black uppercase tracking-[0.14em] text-accent">
                        NEW
                      </span>
                    )}
                  </div>
                  <h3 className="mt-0.5 font-heading text-base font-bold text-charcoal-primary leading-snug">
                    {notification.title}
                  </h3>
                  <p className="mt-1 text-xs text-graphite leading-relaxed">
                    {notification.body}
                  </p>
                </div>

                <time
                  dateTime={notification.createdAt}
                  className="shrink-0 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-ash pt-0.5"
                >
                  {relativeTime(notification.createdAt)}
                </time>
              </button>
            )
          })
        ) : (
          <div className="rounded-[2px] border border-border bg-surface p-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-ash mb-3" aria-hidden="true" />
            <h3 className="font-heading text-lg font-bold uppercase text-charcoal-primary">
              NO NOTIFICATIONS YET
            </h3>
            <p className="mt-1 text-xs text-graphite">
              Your matchings, duel results, and market settlements will appear here.
            </p>
          </div>
        )}
      </section>
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
    return "/arena"
  }
  return `/markets/${notification.targetId}`
}

function getNotificationLabel(type: string) {
  if (type === "pvp_matched") return "Arena match"
  if (type === "pvp_resolved") return "Duel result"
  if (type === "pvp_boost") return "Arena reward"
  if (type === "settlement") return "Market settlement"
  if (type === "like") return "Market like"
  if (type === "follow") return "New follower"
  return "Market signal"
}
