"use client"

import RightPanel from "@/components/layout/RightPanel"
import VerityHeader from "@/components/layout/VerityHeader"
import { useSocket } from "@/hooks/useSocket"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { useEffect } from "react"
import { Suspense } from "react"
import { usePathname } from "next/navigation"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile } = useWalletProfile()
  const { joinRoom, leaveRoom } = useSocket()
  const pathname = usePathname()
  const isFullWidthPage =
    pathname === "/" ||
    pathname === "/markets" ||
    pathname === "/portfolio" ||
    pathname === "/missions" ||
    pathname === "/portfolio-preview" ||
    pathname === "/missions-preview" ||
    pathname === "/notifications-preview"

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
      <div
        className={`verity-app-frame ${isFullWidthPage ? "is-wide" : "has-rail"}`}
      >
        <main className="verity-app-main">{children}</main>

        {!isFullWidthPage && (
          <aside className="verity-app-rail">
            <RightPanel />
          </aside>
        )}
      </div>
    </>
  )
}
