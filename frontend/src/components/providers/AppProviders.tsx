"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

const StandardAppProviders = dynamic(() => import("./StandardAppProviders"))

export default function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith("/tg-miniapp")) return <>{children}</>
  return <StandardAppProviders>{children}</StandardAppProviders>
}
