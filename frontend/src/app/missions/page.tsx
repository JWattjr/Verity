"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/components/providers/AuthModals"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import {
  useMissionsQuery,
  useCompleteMissionMutation,
  Mission,
} from "@/store/verity/verityQueries"
import {
  MessageSquare,
  Mail,
  Send,
  Sparkles,
  CheckCircle,
  Loader2,
  ExternalLink,
  Trophy,
} from "lucide-react"
import { toast } from "react-hot-toast"

export default function MissionsPage() {
  const { authenticated, login } = useAuth()
  const { profile } = useWalletProfile()
  const { data: missions = [], isLoading } = useMissionsQuery()
  const { mutateAsync: completeMission } = useCompleteMissionMutation()

  // Track claiming loading states per mission ID
  const [claiming, setClaiming] = useState<Record<string, boolean>>({})

  const handleStartMission = useCallback((mission: Mission) => {
    // Open URL in new tab
    window.open(mission.actionUrl, "_blank", "noopener,noreferrer")
  }, [])

  const handleClaimXp = useCallback(
    async (missionId: string) => {
      setClaiming((prev) => ({ ...prev, [missionId]: true }))
      try {
        const res = await completeMission(missionId)
        toast.success(`Claimed +${res.xpEarned} XP!`)
      } catch (err: any) {
        toast.error(err?.message || "Failed to claim reward.")
      } finally {
        setClaiming((prev) => ({ ...prev, [missionId]: false }))
      }
    },
    [completeMission],
  )

  const getMissionIcon = (url: string, title: string) => {
    const lowerUrl = url.toLowerCase()
    const lowerTitle = title.toLowerCase()
    if (
      lowerUrl.includes("twitter") ||
      lowerUrl.includes("x.com") ||
      lowerTitle.includes("twitter") ||
      lowerTitle.includes("x")
    ) {
      return Send
    }
    if (lowerUrl.includes("discord") || lowerTitle.includes("discord")) {
      return MessageSquare
    }
    if (lowerUrl.includes("telegram") || lowerTitle.includes("telegram")) {
      return Send
    }
    if (
      lowerUrl.includes("newsletter") ||
      lowerUrl.includes("email") ||
      lowerTitle.includes("email") ||
      lowerTitle.includes("newsletter")
    ) {
      return Mail
    }
    return Sparkles
  }

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary mb-6 ring-8 ring-brand-primary/5">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black font-sans leading-tight text-charcoal-primary dark:text-white mb-3">
          Join Arena Missions
        </h2>
        <p className="text-sm text-ash mb-6 font-sans">
          Connect your wallet to access special social missions, subscribe to
          updates, and accumulate XP for the global leaderboard!
        </p>
        <button
          onClick={login}
          className="px-6 py-3 rounded-xl bg-charcoal-primary dark:bg-white text-white dark:text-zinc-950 font-bold hover:opacity-90 active:opacity-100 transition-all shadow-md font-sans cursor-pointer text-sm"
        >
          Connect Wallet to Begin
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1240px] mx-auto py-6 font-sans flex flex-col gap-6">
      {/* Top Header Card */}
      <div className="verity-card p-6 md:p-8 bg-linear-to-b from-indigo-50/20 to-stone-100/10 dark:from-indigo-950/10 dark:to-zinc-900/10 border border-border dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="flex-1 space-y-3 text-center sm:text-left pr-0 sm:pr-4">
          <span className="text-[10px] font-bold font-mono tracking-widest text-[#FF4D00] uppercase block">
            Missions
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-3xl font-black text-charcoal-primary dark:text-white leading-[1.1] tracking-tight">
            Complete tasks
            <br />
            Earn XP
          </h1>
          <p className="text-xs sm:text-sm text-ash leading-relaxed font-sans max-w-xl mx-auto sm:mx-0">
            Complete quick social tasks to earn extra XP.
          </p>
        </div>

        {/* Current XP */}
        <div className="relative flex flex-col items-center sm:items-end gap-4 shrink-0 w-full sm:w-auto">
          {/* Current XP Stat Box */}
          <div className="rounded-2xl bg-[#FAF9F6] dark:bg-zinc-900/40 px-6 py-4 border border-stone-200/20 dark:border-zinc-850/10 shadow-inner flex flex-col items-center shrink-0 w-full sm:w-auto min-w-[180px]">
            <span className="text-[10px] font-mono text-ash uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Trophy className="h-3 w-3" />
              Your Total XP
            </span>
            <strong className="text-4xl font-bold font-mono text-[#FF4D00] block mt-1">
              {profile?.arenaXp ?? 0}
            </strong>
          </div>
        </div>
      </div>

      {/* List of Missions (Rows) */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="verity-card p-5 h-20 animate-pulse bg-white/50 dark:bg-zinc-900/10 border border-border dark:border-zinc-800"
            />
          ))}
        </div>
      ) : missions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border dark:border-zinc-800 rounded-2xl bg-white/30 dark:bg-zinc-900/10">
          <Sparkles className="h-8 w-8 text-ash mx-auto mb-3" />
          <p className="text-sm font-bold text-charcoal-primary dark:text-white font-sans">
            No active missions right now.
          </p>
          <p className="text-xs text-ash mt-1 font-sans">
            Check back soon for new tasks and rewards!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {missions.map((mission) => {
            const Icon = getMissionIcon(mission.actionUrl, mission.title)
            return (
              <MissionCard
                key={mission.id}
                mission={mission}
                icon={Icon}
                isClaiming={claiming[mission.id] ?? false}
                onStart={handleStartMission}
                onClaim={handleClaimXp}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

interface MissionCardProps {
  mission: Mission
  icon: any
  isClaiming: boolean
  onStart: (mission: Mission) => void
  onClaim: (missionId: string) => void
}

function MissionCard({
  mission,
  icon: Icon,
  isClaiming,
  onStart,
  onClaim,
}: MissionCardProps) {
  const [step, setStep] = useState<
    "start" | "verify_prompt" | "verifying" | "claim" | "completed"
  >(mission.completed ? "completed" : "start")
  const [seconds, setSeconds] = useState(3)

  // Sync with prop just in case query updates it
  useEffect(() => {
    if (mission.completed) {
      setStep("completed")
    }
  }, [mission.completed])

  const handleClickStart = () => {
    onStart(mission)
    setStep("verify_prompt")
  }

  const handleClickVerify = () => {
    setStep("verifying")
    setSeconds(3)
  }

  useEffect(() => {
    if (step === "verifying") {
      const interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            setStep("claim")
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [step])

  return (
    <div
      className={`verity-card p-5 bg-white dark:bg-zinc-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 border ${
        step === "completed"
          ? "border-emerald-500/10 bg-emerald-500/5 dark:bg-emerald-950/5"
          : "border-border dark:border-zinc-800 hover:border-indigo-500"
      }`}
    >
      {/* Left section: Icon and text details */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Rounded Icon Container */}
        <div
          className={`flex items-center justify-center w-11 h-11 rounded-2xl shrink-0 border ${
            step === "completed"
              ? "bg-emerald-100 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400"
              : "bg-[#FAF9F6] dark:bg-zinc-900/40 border-stone-200/20 dark:border-zinc-850/10 text-charcoal-primary dark:text-white"
          }`}
        >
          {step === "completed" ? (
            <CheckCircle className="h-5 w-5 fill-currentColor dark:fill-none" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>

        {/* Text */}
        <div className="space-y-1 min-w-0 flex-1">
          <h3
            className={`text-sm font-bold truncate leading-snug font-sans ${
              step === "completed"
                ? "text-emerald-900 dark:text-emerald-300"
                : "text-charcoal-primary dark:text-white"
            }`}
          >
            {mission.title}
          </h3>
          {mission.description && (
            <p className="text-xs text-ash leading-relaxed font-sans line-clamp-2 md:line-clamp-1">
              {mission.description}
            </p>
          )}
        </div>
      </div>

      {/* Right section: Reward & Action Buttons */}
      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 border-dashed border-zinc-200/45 dark:border-zinc-850/50 pt-3 md:pt-0">
        {/* XP Reward Badge */}
        <div
          className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider shrink-0 ${
            step === "completed"
              ? "bg-emerald-100/60 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-100/60 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
          }`}
        >
          +{mission.xpReward} XP
        </div>

        {/* Action Button Container */}
        <div className="shrink-0">
          {step === "start" && (
            <button
              onClick={handleClickStart}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-charcoal-primary dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 active:opacity-100 transition-all font-bold text-xs cursor-pointer font-sans"
            >
              Start
              <ExternalLink className="h-3 w-3" />
            </button>
          )}

          {step === "verify_prompt" && (
            <button
              onClick={handleClickVerify}
              className="flex items-center gap-1 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white transition-all font-bold text-xs cursor-pointer font-sans"
            >
              Verify
            </button>
          )}

          {step === "verifying" && (
            <button
              disabled
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-muted text-muted font-bold text-xs cursor-not-allowed font-sans select-none"
            >
              <Loader2 className="h-3 w-3 animate-spin text-ash" />
              Verify ({seconds}s)
            </button>
          )}

          {step === "claim" && (
            <button
              onClick={() => onClaim(mission.id)}
              disabled={isClaiming}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs transition-all shadow-xs cursor-pointer font-sans"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Claiming...
                </>
              ) : (
                "Claim XP"
              )}
            </button>
          )}

          {step === "completed" && (
            <div className="text-emerald-600 dark:text-emerald-400 text-xs font-bold font-sans flex items-center gap-1 select-none py-2 px-1">
              Completed
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
