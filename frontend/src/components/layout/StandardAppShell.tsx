"use client"

import VerityHeader from "@/components/layout/VerityHeader"
import MobileNav from "@/components/layout/MobileNav"
import { useSocket } from "@/hooks/useSocket"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { Suspense, useEffect } from "react"

export default function StandardAppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = useWalletProfile()
  const { joinRoom, leaveRoom } = useSocket()

  useEffect(() => {
    if (profile?.id) {
      joinRoom(`user:${profile.id}`)
      return () => {
        leaveRoom(`user:${profile.id}`)
      }
    }
  }, [profile?.id, joinRoom, leaveRoom])

  return (
    <>
      <Suspense
        fallback={
          <div className="h-[70px] border-b border-border bg-background" />
        }
      >
        <VerityHeader />
      </Suspense>
      <div className="verity-app-frame is-wide">
        <main className="verity-app-main">{children}</main>
      </div>
      <MobileNav />
    </>
  )
}
