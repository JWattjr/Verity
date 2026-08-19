import { Suspense } from "react"
import ArenaExperience from "@/components/home/ArenaExperience"

export const metadata = {
  title: "PvP Duel Arena | Verity",
  description:
    "Head-to-head sports prediction duels, matchup propositions, and Arena XP battles.",
}

export default function ArenaPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-12 text-center text-xs text-ash animate-pulse">
          Loading Arena...
        </div>
      }
    >
      <ArenaExperience />
    </Suspense>
  )
}
