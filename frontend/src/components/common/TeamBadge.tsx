"use client"

import { useState } from "react"
import { Shield } from "lucide-react"

export const EPL_TEAM_BADGES: Record<string, string> = {
  arsenal: "https://resources.premierleague.com/premierleague/badges/70/t3.png",
  "aston villa": "https://resources.premierleague.com/premierleague/badges/70/t7.png",
  bournemouth: "https://resources.premierleague.com/premierleague/badges/70/t91.png",
  "afc bournemouth": "https://resources.premierleague.com/premierleague/badges/70/t91.png",
  brentford: "https://resources.premierleague.com/premierleague/badges/70/t94.png",
  "brighton & hove albion": "https://resources.premierleague.com/premierleague/badges/70/t36.png",
  "brighton and hove albion": "https://resources.premierleague.com/premierleague/badges/70/t36.png",
  brighton: "https://resources.premierleague.com/premierleague/badges/70/t36.png",
  chelsea: "https://resources.premierleague.com/premierleague/badges/70/t8.png",
  "crystal palace": "https://resources.premierleague.com/premierleague/badges/70/t31.png",
  everton: "https://resources.premierleague.com/premierleague/badges/70/t11.png",
  fulham: "https://resources.premierleague.com/premierleague/badges/70/t54.png",
  "ipswich town": "https://resources.premierleague.com/premierleague/badges/70/t40.png",
  ipswich: "https://resources.premierleague.com/premierleague/badges/70/t40.png",
  "leicester city": "https://resources.premierleague.com/premierleague/badges/70/t13.png",
  leicester: "https://resources.premierleague.com/premierleague/badges/70/t13.png",
  liverpool: "https://resources.premierleague.com/premierleague/badges/70/t14.png",
  "manchester city": "https://resources.premierleague.com/premierleague/badges/70/t43.png",
  "man city": "https://resources.premierleague.com/premierleague/badges/70/t43.png",
  "man. city": "https://resources.premierleague.com/premierleague/badges/70/t43.png",
  "manchester united": "https://resources.premierleague.com/premierleague/badges/70/t1.png",
  "man united": "https://resources.premierleague.com/premierleague/badges/70/t1.png",
  "man utd": "https://resources.premierleague.com/premierleague/badges/70/t1.png",
  "man. united": "https://resources.premierleague.com/premierleague/badges/70/t1.png",
  "newcastle united": "https://resources.premierleague.com/premierleague/badges/70/t4.png",
  newcastle: "https://resources.premierleague.com/premierleague/badges/70/t4.png",
  "nottingham forest": "https://resources.premierleague.com/premierleague/badges/70/t17.png",
  forest: "https://resources.premierleague.com/premierleague/badges/70/t17.png",
  southampton: "https://resources.premierleague.com/premierleague/badges/70/t20.png",
  "tottenham hotspur": "https://resources.premierleague.com/premierleague/badges/70/t6.png",
  tottenham: "https://resources.premierleague.com/premierleague/badges/70/t6.png",
  spurs: "https://resources.premierleague.com/premierleague/badges/70/t6.png",
  "west ham united": "https://resources.premierleague.com/premierleague/badges/70/t21.png",
  "west ham": "https://resources.premierleague.com/premierleague/badges/70/t21.png",
  "wolverhampton wanderers": "https://resources.premierleague.com/premierleague/badges/70/t39.png",
  wolverhampton: "https://resources.premierleague.com/premierleague/badges/70/t39.png",
  wolves: "https://resources.premierleague.com/premierleague/badges/70/t39.png",
}

export function getTeamBadgeUrl(name: string): string | null {
  if (!name) return null
  const clean = name.toLowerCase().trim()
  return EPL_TEAM_BADGES[clean] || null
}

export function getTeamCode(name: string): string {
  if (!name) return "—"
  const clean = name.trim()
  if (clean.toLowerCase().includes("manchester united") || clean.toLowerCase() === "man united") return "MUN"
  if (clean.toLowerCase().includes("manchester city") || clean.toLowerCase() === "man city") return "MCI"
  if (clean.toLowerCase().includes("tottenham") || clean.toLowerCase() === "spurs") return "TOT"
  if (clean.toLowerCase().includes("arsenal")) return "ARS"
  if (clean.toLowerCase().includes("chelsea")) return "CHE"
  if (clean.toLowerCase().includes("liverpool")) return "LIV"
  if (clean.toLowerCase().includes("aston villa")) return "AVL"
  if (clean.toLowerCase().includes("newcastle")) return "NEW"
  if (clean.toLowerCase().includes("brighton")) return "BHA"
  if (clean.toLowerCase().includes("west ham")) return "WHU"
  if (clean.toLowerCase().includes("wolves") || clean.toLowerCase().includes("wolverhampton")) return "WOL"
  if (clean.toLowerCase().includes("bournemouth")) return "BOU"
  if (clean.toLowerCase().includes("brentford")) return "BRE"
  if (clean.toLowerCase().includes("crystal palace")) return "CRY"
  if (clean.toLowerCase().includes("everton")) return "EVE"
  if (clean.toLowerCase().includes("fulham")) return "FUL"
  if (clean.toLowerCase().includes("ipswich")) return "IPS"
  if (clean.toLowerCase().includes("leicester")) return "LEI"
  if (clean.toLowerCase().includes("nottingham") || clean.toLowerCase().includes("forest")) return "NFO"
  if (clean.toLowerCase().includes("southampton")) return "SOU"

  return clean.slice(0, 3).toUpperCase()
}

interface TeamBadgeProps {
  team: string
  className?: string
  alt?: string
}

export default function TeamBadge({ team, className = "h-8 w-8", alt }: TeamBadgeProps) {
  const [hasError, setHasError] = useState(false)
  const badgeUrl = getTeamBadgeUrl(team)

  if (!badgeUrl || hasError) {
    const code = getTeamCode(team)
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-zinc-800/80 border border-zinc-700 text-[10px] font-mono font-black text-zinc-300 uppercase select-none shrink-0 shadow-xs ${className}`}
        title={team}
      >
        <span>{code}</span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={badgeUrl}
      alt={alt || `${team} badge`}
      className={`object-contain select-none shrink-0 drop-shadow-sm ${className}`}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  )
}
