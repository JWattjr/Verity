"use client"

import { memo, useEffect, useState } from "react"
import styles from "./prelaunch.module.css"

type RemainingTime = {
  days: number
  hours: number
  minutes: number
  seconds: number
  complete: boolean
}

function getRemaining(target: string): RemainingTime {
  const milliseconds = Math.max(0, new Date(target).getTime() - Date.now())
  const totalSeconds = Math.floor(milliseconds / 1000)
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    complete: milliseconds === 0,
  }
}

function Countdown({ launchAt }: { launchAt: string }) {
  const [remaining, setRemaining] = useState(() => getRemaining(launchAt))

  useEffect(() => {
    setRemaining(getRemaining(launchAt))
    const interval = window.setInterval(
      () => setRemaining(getRemaining(launchAt)),
      1_000,
    )
    return () => window.clearInterval(interval)
  }, [launchAt])

  if (remaining.complete) {
    return <div className={styles.countdownLive}>THE ARENA IS OPEN</div>
  }

  const units = [
    [remaining.days, "DAYS"],
    [remaining.hours, "HRS"],
    [remaining.minutes, "MINS"],
    [remaining.seconds, "SECS"],
  ] as const

  return (
    <div className={styles.countdown} aria-label="Countdown to Verity launch">
      {units.map(([value, label]) => (
        <div className={styles.countdownUnit} key={label}>
          <strong>{String(value).padStart(2, "0")}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

export default memo(Countdown)
