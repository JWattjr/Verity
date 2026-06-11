"use client"

import Link from "next/link"
import { CircleHelp } from "lucide-react"
import FeedShell from "@/components/feed/FeedShell"
import ThemeToggle from "@/components/layout/ThemeToggle"

export default function HomeExperience() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="verity-card sticky top-0 z-20 mt-3 lg:mt-2 flex items-center justify-between p-3 sm:hidden">
        <div className="flex items-center">
          <div className="verity-blob flex h-8 w-8 items-center justify-center bg-sunburst-yellow text-sm font-semibold text-midnight">
            V
            <span className="verity-blob-smile scale-75" />
          </div>
          <span className="ml-3 text-lg font-semibold tracking-[-0.25px] text-charcoal-primary">
            Verity
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            aria-label="Open Verity guide"
            className="clickable-icon flex h-8 w-8 md:h-10 md:w-10 items-center justify-center bg-parchment-card text-graphite shadow-subtle hover:text-charcoal-primary"
            href="/how-it-works"
          >
            <CircleHelp className="h-4 w-4 md:h-5 md:w-5" />
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <FeedShell />
    </div>
  )
}
