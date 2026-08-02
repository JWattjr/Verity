"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"

const StandardAppShell = dynamic(() => import("./StandardAppShell"))

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith("/tg-miniapp")) return <>{children}</>
  return <StandardAppShell>{children}</StandardAppShell>
}
