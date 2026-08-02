"use client"

import dynamic from "next/dynamic"
import {
  Check,
  ChevronRight,
  Copy,
  Info,
  Share2,
  Shield,
  Ticket,
  Trophy,
  Users,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import Countdown from "./Countdown"
import {
  isTelegramDevMode,
  openPrelaunchSession,
  savePrelaunchClub,
  trackPrelaunchShare,
  type PrelaunchSession,
} from "@/lib/prelaunch"
import {
  getTelegramStartParam,
  getTelegramWebApp,
  initializeTelegramMiniApp,
  openTelegramShare,
  telegramImpactHaptic,
  telegramNotificationHaptic,
  telegramSelectionHaptic,
} from "@/lib/telegramMiniApp"
import styles from "./prelaunch.module.css"

const TicketsExplainerModal = dynamic(() => import("./TicketsExplainerModal"), {
  ssr: false,
})
const DuelPreviewModal = dynamic(() => import("./DuelPreviewModal"), {
  ssr: false,
})

type ActiveModal = "tickets" | "duel" | null

const INVITE_MESSAGE =
  "Join me on Verity before the football season. Pick your club now—when the arena opens, play two PvP duels and help unlock an XP ticket."

export default function PrelaunchApp() {
  const [session, setSession] = useState<PrelaunchSession | null>(null)
  const [error, setError] = useState("")
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [savingClub, setSavingClub] = useState("")
  const [copied, setCopied] = useState(false)
  const initDataRef = useRef("")
  const clubSectionRef = useRef<HTMLElement>(null)
  const referralSectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let cancelled = false
    let retryTimer: number | undefined
    let attempts = 0

    async function boot() {
      const webApp = initializeTelegramMiniApp()
      if (!webApp && !isTelegramDevMode() && attempts < 20) {
        attempts += 1
        retryTimer = window.setTimeout(boot, 100)
        return
      }

      if (!webApp && !isTelegramDevMode()) {
        setError("Open this page from the Verity Telegram bot.")
        return
      }

      try {
        const initData = webApp?.initData ?? ""
        initDataRef.current = initData
        const nextSession = await openPrelaunchSession(
          initData,
          getTelegramStartParam(),
        )
        if (!cancelled) setSession(nextSession)
      } catch (bootError) {
        if (!cancelled) {
          setError(
            bootError instanceof Error
              ? bootError.message
              : "Could not open the Verity pre-launch page.",
          )
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
      if (retryTimer) window.clearTimeout(retryTimer)
    }
  }, [])

  const closeModal = useCallback(() => setActiveModal(null), [])

  useEffect(() => {
    const backButton = getTelegramWebApp()?.BackButton
    if (!backButton) return

    if (activeModal) {
      backButton.show()
      backButton.onClick(closeModal)
    } else {
      backButton.hide()
    }

    return () => {
      backButton.offClick(closeModal)
      backButton.hide()
    }
  }, [activeModal, closeModal])

  function claimSpot() {
    telegramImpactHaptic("heavy")
    const target = session?.user.club
      ? referralSectionRef.current
      : clubSectionRef.current
    target?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  async function selectClub(club: string) {
    if (!session || savingClub) return
    telegramSelectionHaptic()
    setSavingClub(club)
    setError("")
    try {
      const nextSession = await savePrelaunchClub(initDataRef.current, club)
      setSession(nextSession)
      telegramNotificationHaptic("success")
    } catch (clubError) {
      telegramNotificationHaptic("error")
      setError(
        clubError instanceof Error
          ? clubError.message
          : "Could not save your club.",
      )
    } finally {
      setSavingClub("")
    }
  }

  async function copyReferralLink() {
    if (!session) return
    telegramImpactHaptic("medium")
    try {
      await navigator.clipboard.writeText(session.referralLink)
      setCopied(true)
      telegramNotificationHaptic("success")
      window.setTimeout(() => setCopied(false), 1_800)
      void trackPrelaunchShare(initDataRef.current, "copy")
    } catch {
      telegramNotificationHaptic("error")
      setError("Could not copy the link. Use Share instead.")
    }
  }

  function shareReferralLink() {
    if (!session) return
    telegramImpactHaptic("medium")
    void trackPrelaunchShare(initDataRef.current, "share")
    openTelegramShare(session.referralLink, INVITE_MESSAGE)
  }

  function openModal(modal: Exclude<ActiveModal, null>) {
    telegramImpactHaptic("light")
    setActiveModal(modal)
  }

  if (!session) {
    return (
      <main className={styles.viewport}>
        <div className={styles.loadingMark}>
          <span>V</span>
          <strong>VERITY</strong>
        </div>
        {error ? (
          <section className={styles.launchError}>
            <Shield aria-hidden="true" />
            <h1>TELEGRAM ACCESS ONLY</h1>
            <p>{error}</p>
          </section>
        ) : (
          <div className={styles.loadingState} aria-label="Loading Verity">
            <span />
            <span />
            <span />
          </div>
        )}
      </main>
    )
  }

  const selectedClub = session.config.clubs.find(
    (club) => club.name === session.user.club,
  )
  const username = session.user.username
    ? `@${session.user.username}`
    : `Player ${session.user.telegramId.slice(-4)}`
  const initial = (session.user.username?.[0] ?? "V").toUpperCase()

  return (
    <main className={styles.viewport}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <span>V</span>
          <div>
            <strong>VERITY</strong>
            <small>PRE-SEASON 26/27</small>
          </div>
        </div>
        <div className={styles.profileRow}>
          <span className={styles.profileInitial}>{initial}</span>
          <div>
            <strong>{username}</strong>
            <small>{selectedClub ? selectedClub.name : "NO CLUB YET"}</small>
          </div>
          {selectedClub ? (
            <b className={styles.clubBadge}>{selectedClub.shortName}</b>
          ) : null}
        </div>
      </header>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>COMMUNITY SHIELD KICKOFF</span>
        <Countdown launchAt={session.config.launchAt} />
        <h1>
          FOOTBALL CALLS.
          <br />
          HEAD TO HEAD.
        </h1>
        <p>Verity turns Premier League predictions into six-pick PvP duels.</p>
        <p className={styles.heroLaunchLine}>
          At launch, your place opens and referred friends can start qualifying
          your XP tickets.
        </p>
        <button
          className={styles.primaryButton}
          data-feedback="none"
          onClick={claimSpot}
          type="button"
        >
          CLAIM YOUR SPOT
          <ChevronRight aria-hidden="true" />
        </button>
      </section>

      <section className={styles.section} ref={clubSectionRef}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionNumber}>01</span>
            <h2>PICK YOUR CLUB</h2>
          </div>
          {selectedClub ? <Check aria-label="Club selected" /> : null}
        </div>
        <p className={styles.sectionIntro}>
          This badge sits beside your name before the first duel is played.
        </p>

        <div className={styles.clubGrid}>
          {session.config.clubs.map((club) => {
            const selected = club.name === session.user.club
            return (
              <button
                aria-pressed={selected}
                className={selected ? styles.clubSelected : undefined}
                data-feedback="none"
                disabled={Boolean(savingClub)}
                key={club.name}
                onClick={() => void selectClub(club.name)}
                type="button"
              >
                <b>{club.shortName}</b>
                <span>{club.name}</span>
                {savingClub === club.name ? <i>...</i> : null}
              </button>
            )
          })}
        </div>
      </section>

      <section className={styles.section} ref={referralSectionRef}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionNumber}>02</span>
            <h2>BRING YOUR RIVALS</h2>
          </div>
          <Users aria-hidden="true" />
        </div>
        <p className={styles.sectionIntro}>
          Share your personal Telegram link. Pending and activated referrals
          always stay separate.
        </p>

        <div className={styles.referralLink}>
          <span>{session.referralLink}</span>
          <button
            aria-label="Copy referral link"
            data-feedback="none"
            onClick={() => void copyReferralLink()}
            type="button"
          >
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
          </button>
        </div>

        <div className={styles.shareActions}>
          <button
            className={styles.secondaryButton}
            data-feedback="none"
            onClick={() => void copyReferralLink()}
            type="button"
          >
            <Copy aria-hidden="true" />
            {copied ? "COPIED" : "COPY LINK"}
          </button>
          <button
            className={styles.primaryButton}
            data-feedback="none"
            onClick={shareReferralLink}
            type="button"
          >
            <Share2 aria-hidden="true" />
            SHARE
          </button>
        </div>

        <div className={styles.referralCounts}>
          <div>
            <span>RAW REFERRALS</span>
            <strong>{session.referrals.rawReferrals}</strong>
          </div>
          <div>
            <span>ACTIVATED REFERRALS</span>
            <strong>{session.referrals.activatedReferrals}</strong>
          </div>
        </div>

        <div className={styles.ticketPanel}>
          <div className={styles.ticketHeadline}>
            <Ticket aria-hidden="true" />
            <div>
              <span>YOUR TICKETS</span>
              <strong>
                {session.referrals.capProgress}/
                {session.config.maxTicketsPerUser}
              </strong>
            </div>
            <button
              aria-label="How tickets work"
              data-feedback="none"
              onClick={() => openModal("tickets")}
              type="button"
            >
              <Info aria-hidden="true" />
            </button>
          </div>
          <div className={styles.ticketBreakdown}>
            <div>
              <span>EARNED</span>
              <strong>{session.referrals.ticketsEarned}</strong>
              <small>ACTIVE</small>
            </div>
            <div>
              <span>PENDING</span>
              <strong>{session.referrals.ticketsPending}</strong>
              <small>NEEDS 2 DUELS</small>
            </div>
          </div>
          <div
            aria-label={`${session.referrals.capProgress} of ${session.config.maxTicketsPerUser} ticket places used`}
            className={styles.progressTrack}
            role="progressbar"
            aria-valuemax={session.config.maxTicketsPerUser}
            aria-valuemin={0}
            aria-valuenow={session.referrals.capProgress}
          >
            <span
              style={
                {
                  "--progress": `${session.referrals.capPercent}%`,
                } as CSSProperties
              }
            />
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.duelTeaser}`}>
        <div>
          <span className={styles.eyebrow}>WHAT YOU ARE WAITING FOR</span>
          <h2>SEE A FINISHED DUEL</h2>
          <p>Two players. Six calls. One matchday winner.</p>
        </div>
        <button
          className={styles.duelButton}
          data-feedback="none"
          onClick={() => openModal("duel")}
          type="button"
        >
          <Trophy aria-hidden="true" />
          OPEN DUEL PREVIEW
          <ChevronRight aria-hidden="true" />
        </button>
      </section>

      {error ? <p className={styles.inlineError}>{error}</p> : null}

      <footer className={styles.footer}>
        <Shield aria-hidden="true" />
        <p>
          Fan-made football experience. Not affiliated with the Premier League
          or any listed club.
        </p>
      </footer>

      {activeModal === "tickets" ? (
        <TicketsExplainerModal
          maxTickets={session.config.maxTicketsPerUser}
          onClose={closeModal}
          seasonAt={session.config.seasonAt}
        />
      ) : null}
      {activeModal === "duel" ? (
        <DuelPreviewModal onClose={closeModal} />
      ) : null}
    </main>
  )
}
