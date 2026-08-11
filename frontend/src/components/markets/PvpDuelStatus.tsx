import { Loader2, Swords, Trophy } from "lucide-react"

interface DuelPick {
  arenaCorrect?: boolean | null
  isCorrect?: boolean | null
}

interface DuelStatusData {
  event?: { question?: string }
  match?: { divergenceScore?: number }
  ticket?: { picks?: DuelPick[] }
  opponent?: {
    username?: string
    avatar_url?: string | null
    avatarUrl?: string | null
    picks?: DuelPick[]
  }
}

interface DuelProfile {
  username?: string | null
  displayName?: string | null
  avatar_url?: string | null
  avatarUrl?: string | null
}

interface PvpDuelStatusProps {
  status: "queued" | "matched" | "resolved"
  pvpStatus: DuelStatusData
  runningScoreUser: number
  runningScoreOpponent: number
  profile?: DuelProfile | null
}

export default function PvpDuelStatus({
  status,
  pvpStatus,
  runningScoreUser,
  runningScoreOpponent,
  profile,
}: PvpDuelStatusProps) {
  if (status === "queued") {
    return (
      <section className="border border-border bg-surface">
        <div className="flex min-h-9 items-center justify-between border-b border-border font-mono text-[9px] font-bold uppercase tracking-[0.16em]">
          <span className="flex h-9 items-center gap-2 bg-accent px-3 text-black">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Matchmaking live
          </span>
          <span className="px-3 text-ash">Ticket active</span>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
          <div className="flex h-14 w-14 items-center justify-center border border-accent bg-black text-accent">
            <Swords className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-heading text-[30px] font-black uppercase leading-none tracking-[0.02em] text-charcoal-primary">
              Finding your rival
            </h3>
            <p className="mt-2 max-w-xl text-xs leading-5 text-graphite">
              Verity is searching for a predictor whose card creates a strong,
              fair head-to-head matchup.
            </p>
          </div>
          <div className="border border-border bg-black px-4 py-3 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-white">
            <span className="block text-ash">Matchup</span>
            <strong className="mt-1 block text-accent">
              {pvpStatus.event?.question || "Arena card"}
            </strong>
          </div>
        </div>
      </section>
    )
  }

  const isResolved = status === "resolved"
  const result =
    runningScoreUser > runningScoreOpponent
      ? "won"
      : runningScoreUser < runningScoreOpponent
        ? "lost"
        : "draw"
  const resultLabel =
    result === "won" ? "You won" : result === "lost" ? "You lost" : "Draw"

  return (
    <section className="border border-border bg-surface">
      <div className="flex min-h-9 items-center justify-between border-b border-border font-mono text-[9px] font-bold uppercase tracking-[0.16em]">
        <span className="flex h-9 items-center gap-2 bg-accent px-3 text-black">
          {isResolved ? (
            <Trophy className="h-3.5 w-3.5" />
          ) : (
            <Swords className="h-3.5 w-3.5" />
          )}
          {isResolved ? "Final result" : "Opponent matched"}
        </span>
        <span className="px-3 text-ash">
          Divergence {pvpStatus.match?.divergenceScore ?? 0}
        </span>
      </div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)]">
        <PlayerPanel
          avatarUrl={profile?.avatar_url || profile?.avatarUrl}
          label="Your card"
          name={profile?.displayName || profile?.username || "You"}
          score={runningScoreUser}
        />

        <div className="flex min-h-36 flex-col items-center justify-center border-y border-border bg-black px-4 text-center md:border-x md:border-y-0">
          {isResolved ? (
            <>
              <span
                className={`font-heading text-[32px] font-black uppercase leading-none ${
                  result === "lost" ? "text-white" : "text-accent"
                }`}
              >
                {resultLabel}
              </span>
              <span className="mt-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-ash">
                Duel settled
              </span>
            </>
          ) : (
            <>
              <Swords className="h-7 w-7 text-accent" />
              <span className="mt-2 font-heading text-2xl font-black uppercase text-white">
                Head to head
              </span>
              <span className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-ash">
                Results pending
              </span>
            </>
          )}
        </div>

        <PlayerPanel
          align="right"
          avatarUrl={
            pvpStatus.opponent?.avatar_url || pvpStatus.opponent?.avatarUrl
          }
          label="Opponent card"
          name={`@${pvpStatus.opponent?.username || "Opponent"}`}
          score={runningScoreOpponent}
        />
      </div>

      {isResolved && (
        <div className="border-t border-border px-4 py-3 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-ash">
          Duel resolved · Arena XP and eligible boosts have been applied
        </div>
      )}
    </section>
  )
}

function PlayerPanel({
  align = "left",
  avatarUrl,
  label,
  name,
  score,
}: {
  align?: "left" | "right"
  avatarUrl?: string | null
  label: string
  name: string
  score: number
}) {
  return (
    <div
      className={`flex min-h-36 items-center gap-4 p-5 ${
        align === "right" ? "md:flex-row-reverse md:text-right" : ""
      }`}
    >
      <DuelAvatar avatarUrl={avatarUrl} name={name} />
      <div className="min-w-0 flex-1">
        <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-ash">
          {label}
        </span>
        <h4 className="mt-1 truncate font-heading text-[26px] font-black uppercase leading-none text-charcoal-primary">
          {name}
        </h4>
        <p className="mt-3 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ash">
          Score
          <strong className="ml-2 font-heading text-2xl font-black text-accent">
            {score}
          </strong>
        </p>
      </div>
    </div>
  )
}

function DuelAvatar({
  avatarUrl,
  name,
}: {
  avatarUrl?: string | null
  name: string
}) {
  if (avatarUrl) {
    return (
      <div
        aria-label={`${name} avatar`}
        className="h-16 w-16 shrink-0 border border-border bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url(${avatarUrl})` }}
      />
    )
  }

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-accent bg-accent font-heading text-2xl font-black uppercase text-black">
      {name.replace("@", "").slice(0, 2)}
    </div>
  )
}
