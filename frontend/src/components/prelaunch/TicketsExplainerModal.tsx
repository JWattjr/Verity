"use client"

import { X } from "lucide-react"
import styles from "./prelaunch.module.css"

export default function TicketsExplainerModal({
  maxTickets,
  seasonAt,
  onClose,
}: {
  maxTickets: number
  seasonAt: string
  onClose: () => void
}) {
  const seasonDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(seasonAt))

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section
        aria-labelledby="ticket-rules-title"
        aria-modal="true"
        className={styles.modalSheet}
        role="dialog"
      >
        <div className={styles.modalHandle} />
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.eyebrow}>TICKET RULES</span>
            <h2 id="ticket-rules-title">HOW TICKETS WORK</h2>
          </div>
          <button
            aria-label="Close ticket rules"
            className={styles.iconButton}
            data-feedback="none"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className={styles.ruleSteps}>
          <article>
            <strong>01</strong>
            <div>
              <h3>INVITE A FRIEND</h3>
              <p>
                Your referral appears immediately as a raw referral and one
                pending ticket.
              </p>
            </div>
          </article>
          <article>
            <strong>02</strong>
            <div>
              <h3>THEY PLAY TWO DUELS</h3>
              <p>
                After launch, the pending ticket activates only when that friend
                completes two PvP duels.
              </p>
            </div>
          </article>
          <article>
            <strong>03</strong>
            <div>
              <h3>XP MULTIPLIER</h3>
              <p>
                Activated tickets convert to XP multipliers when the season
                starts on {seasonDate}.
              </p>
            </div>
          </article>
        </div>

        <div className={styles.plainWarning}>
          <strong>PLAIN AND SIMPLE</strong>
          <p>
            Tickets are for XP status only. They have no cash value, cannot be
            withdrawn, and are not a token.
          </p>
        </div>

        <p className={styles.modalFootnote}>
          Maximum {maxTickets} activated tickets per Telegram account.
        </p>
      </section>
    </div>
  )
}
