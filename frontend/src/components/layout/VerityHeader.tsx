"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useSyncExternalStore } from "react"
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  House,
  Search,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react"
import { useAuth } from "@/components/providers/AuthModals"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { useNotificationsQuery } from "@/store/verity/verityQueries"

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Markets", href: "/markets" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Missions", href: "/missions" },
  { label: "Leaderboard", href: "/leaderboard" },
]

const MOBILE_NAV_ITEMS = [
  { label: "Home", href: "/", Icon: House },
  { label: "Markets", href: "/markets", Icon: BarChart3, includesArena: true },
  { label: "Portfolio", href: "/portfolio", Icon: BriefcaseBusiness },
  { label: "Leaders", href: "/leaderboard", Icon: Trophy },
  { label: "Profile", href: "/profile", Icon: UserRound },
]

const subscribeToHydration = () => () => undefined

export default function VerityHeader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  )
  const { authenticated, loading, login } = useAuth()
  const { profile } = useWalletProfile()
  const { data: notifications = [] } = useNotificationsQuery(profile?.id || "")
  const unreadCount = notifications.filter(
    (notification) => !(notification as { read?: boolean }).read,
  ).length

  function isActive(label: string, href: string, includesArena = false) {
    const arenaActive =
      pathname === "/arena-preview" ||
      (pathname === "/markets" && searchParams.get("tab") === "pvp-arena")

    return label === "Arena"
      ? arenaActive
      : href === "/"
        ? pathname === "/"
        : href === "/markets"
          ? includesArena
            ? pathname?.startsWith("/markets") || pathname === "/arena-preview"
            : pathname?.startsWith("/markets") && !arenaActive
          : pathname?.startsWith(href)
  }

  return (
    <header className="verity-site-header">
      <div className="verity-site-header__row">
        <Link className="verity-wordmark" href="/" aria-label="Verity home">
          <span className="verity-wordmark__mark" aria-hidden="true">
            V
          </span>
          <span className="verity-wordmark__copy">
            <strong>VERITY</strong>
            <small>PREDICTION MARKETS</small>
          </span>
        </Link>

        <nav aria-label="Main" className="verity-desktop-nav">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.label, item.href)

            return (
              <Link
                className={active ? "is-active" : ""}
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="verity-header-actions">
          <Link
            aria-label="Search markets"
            className="verity-header-icon"
            href="/explore"
          >
            <Search aria-hidden="true" />
          </Link>
          {mounted && (
            <Link
              aria-label="Notifications"
              className="verity-header-icon relative"
              href="/notifications"
            >
              <Bell aria-hidden="true" />
              {authenticated && unreadCount > 0 && (
                <span className="verity-notification-dot">{unreadCount}</span>
              )}
            </Link>
          )}
          <Link
            aria-label="Missions"
            className={`verity-header-icon verity-mobile-missions-shortcut ${pathname?.startsWith("/missions") ? "is-active" : ""
              }`}
            href="/missions"
          >
            <Sparkles aria-hidden="true" />
          </Link>
          {!mounted || loading ? (
            <span className="verity-header-login is-loading">LOADING</span>
          ) : authenticated ? (
            <Link className="verity-header-login" href="/profile">
              PROFILE
            </Link>
          ) : (
            <button
              className="verity-header-login"
              onClick={login}
              type="button"
            >
              SIGN IN
            </button>
          )}
          {mounted && !authenticated && !loading && (
            <button className="verity-header-cta" onClick={login} type="button">
              GET STARTED
            </button>
          )}
        </div>
      </div>

      <nav aria-label="Mobile" className="verity-mobile-nav">
        {MOBILE_NAV_ITEMS.map(({ label, href, Icon, includesArena }) => {
          const active = isActive(label, href, includesArena)

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={active ? "is-active" : ""}
              href={href}
              key={label}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
