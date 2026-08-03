"use client"

import dynamic from "next/dynamic"


const StandardAppShell = dynamic(() => import("./StandardAppShell"))

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <StandardAppShell>{children}</StandardAppShell>
}

