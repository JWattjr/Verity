"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"

const StandardAppProviders = dynamic(() => import("./StandardAppProviders"))

export default function AppProviders({ children }: { children: ReactNode }) {
  return <StandardAppProviders>{children}</StandardAppProviders>
}

