import { Trophy, Target, Flag, Swords, RectangleVertical } from "lucide-react"

/* ──────────────────────────────────────────────
   Category metadata helper
   ────────────────────────────────────────────── */
export interface CatMeta {
  title: string
  subtitle: string
  icon: React.ReactNode
}

export function getCategoryMeta(groupKey: string): CatMeta {
  const map: Record<string, CatMeta> = {
    major: {
      title: "Match Winner",
      subtitle: "3-way: Win / Draw / Win",
      icon: <Trophy className="h-4 w-4" />,
    },
    match_winner: {
      title: "Match Winner",
      subtitle: "3-way: Win / Draw / Win",
      icon: <Trophy className="h-4 w-4" />,
    },
    first_goal: {
      title: "First Team to Score",
      subtitle: "First to Score",
      icon: <Target className="h-4 w-4" />,
    },
    red_card: {
      title: "Red Card",
      subtitle: "Red card shown in match",
      icon: <RectangleVertical className="h-4 w-4 fill-current rotate-12" />,
    },
    red_cards: {
      title: "Red Card",
      subtitle: "Red card shown in match",
      icon: <RectangleVertical className="h-4 w-4 fill-current rotate-12" />,
    },
    corners: {
      title: "Corners",
      subtitle: "Over / Under",
      icon: <Flag className="h-4 w-4" />,
    },
    total_corners: {
      title: "Corners",
      subtitle: "Over / Under",
      icon: <Flag className="h-4 w-4" />,
    },
    goals: {
      title: "Goals",
      subtitle: "Over / Under",
      icon: <Target className="h-4 w-4" />,
    },
    total_goals: {
      title: "Goals",
      subtitle: "Over / Under",
      icon: <Target className="h-4 w-4" />,
    },
    cards: {
      title: "Yellow Cards",
      subtitle: "Over / Under",
      icon: <RectangleVertical className="h-4 w-4 fill-current rotate-12" />,
    },
    yellow_cards: {
      title: "Yellow Cards",
      subtitle: "Over / Under",
      icon: <RectangleVertical className="h-4 w-4 fill-current rotate-12" />,
    },
    total_yellow_cards: {
      title: "Yellow Cards",
      subtitle: "Over / Under",
      icon: <RectangleVertical className="h-4 w-4 fill-current rotate-12" />,
    },
    btts: {
      title: "Both Teams to Score",
      subtitle: "Yes / No",
      icon: <Swords className="h-4 w-4" />,
    },
    both_teams_to_score: {
      title: "Both Teams to Score",
      subtitle: "Yes / No",
      icon: <Swords className="h-4 w-4" />,
    },
    offsides: {
      title: "Offsides",
      subtitle: "Over / Under",
      icon: <Flag className="h-4 w-4" />,
    },
    total_offsides: {
      title: "Offsides",
      subtitle: "Over / Under",
      icon: <Flag className="h-4 w-4" />,
    },
    fouls: {
      title: "Fouls",
      subtitle: "Over / Under",
      icon: <Swords className="h-4 w-4" />,
    },
    penalties: {
      title: "Penalties",
      subtitle: "Penalty Awarded in Match",
      icon: <Target className="h-4 w-4" />,
    },
  }

  const fallback: CatMeta = {
    title: groupKey
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    subtitle: "Proposition",
    icon: <Swords className="h-4 w-4" />,
  }

  return map[groupKey] || fallback
}

/* ──────────────────────────────────────────────
   ArenaCategory — visual card for each group
   ────────────────────────────────────────────── */
interface ArenaCategoryProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  hasSelection: boolean
  children: React.ReactNode
}

export default function ArenaCategory({
  title,
  subtitle,
  icon,
  hasSelection,
  children,
}: ArenaCategoryProps) {
  return (
    <div
      className={`border transition-colors ${
        hasSelection
          ? "border-[#3e2323] bg-[#101012]"
          : "border-[#222226] bg-[#101012]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-[#222226] bg-[#141417] px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center border transition-colors ${
              hasSelection
                ? "border-[#ff3b30] bg-[#1e1212] text-[#ff3b30]"
                : "border-[#28282e] bg-[#18181b] text-[#aaa6a1]"
            }`}
          >
            {icon}
          </div>
          <div className="text-left min-w-0">
            <span className="block font-heading text-sm font-black uppercase leading-tight text-[#f4f1ea]">
              {title}
            </span>
            <span className="block truncate font-mono text-[9px] uppercase tracking-wider text-[#8e8a85]">
              {subtitle}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasSelection ? (
            <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#ff3b30] bg-[#ff3b30]/10 border border-[#ff3b30]/30 px-2 py-0.5">
              Selected
            </span>
          ) : (
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#8e8a85]">
              Pick 1
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5">{children}</div>
    </div>
  )
}
