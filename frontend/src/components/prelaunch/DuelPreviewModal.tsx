"use client"

import { Check, Trophy, X } from "lucide-react"
import styles from "./prelaunch.module.css"

const DUEL_ROWS = [
  {
    market: "MATCH WINNER",
    left: "Arsenal",
    leftCorrect: true,
    right: "Draw",
    rightCorrect: false,
  },
  {
    market: "TOTAL GOALS",
    left: "Over 2.5",
    leftCorrect: true,
    right: "Under 2.5",
    rightCorrect: false,
  },
  {
    market: "BOTH TEAMS SCORE",
    left: "No",
    leftCorrect: false,
    right: "Yes",
    rightCorrect: true,
  },
]

function ResultMark({ correct }: { correct: boolean }) {
  return correct ? (
    <Check aria-label="Correct pick" className={styles.correctMark} />
  ) : (
    <X aria-label="Incorrect pick" className={styles.incorrectMark} />
  )
}

export default function DuelPreviewModal({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section
        aria-labelledby="duel-preview-title"
        aria-modal="true"
        className={`${styles.modalSheet} ${styles.duelModal}`}
        role="dialog"
      >
        <div className={styles.modalHandle} />
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.eyebrow}>ILLUSTRATIVE RESULT</span>
            <h2 id="duel-preview-title">A VERITY DUEL</h2>
          </div>
          <button
            aria-label="Close duel preview"
            className={styles.iconButton}
            data-feedback="none"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className={styles.duelScoreboard}>
          <div className={styles.duelPlayer}>
            <span className={styles.playerAvatar}>AJ</span>
            <strong>@awaydays</strong>
            <small>ARS</small>
          </div>
          <div className={styles.scoreBlock}>
            <Trophy aria-hidden="true" />
            <strong>2 — 1</strong>
            <span>FINAL</span>
          </div>
          <div className={`${styles.duelPlayer} ${styles.duelPlayerRight}`}>
            <span className={styles.playerAvatar}>SK</span>
            <strong>@southstand</strong>
            <small>CHE</small>
          </div>
        </div>

        <div className={styles.duelPicks}>
          {DUEL_ROWS.map((row) => (
            <article key={row.market}>
              <span className={styles.duelMarket}>{row.market}</span>
              <div className={styles.duelPickRow}>
                <div>
                  <ResultMark correct={row.leftCorrect} />
                  <strong>{row.left}</strong>
                </div>
                <div>
                  <strong>{row.right}</strong>
                  <ResultMark correct={row.rightCorrect} />
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.winnerStrip}>
          <Trophy aria-hidden="true" />
          <span>
            WINNER
            <strong>@awaydays</strong>
          </span>
          <b>+100 XP</b>
        </div>

        <p className={styles.modalFootnote}>
          Preview data only. The live game opens at launch.
        </p>
      </section>
    </div>
  )
}
