"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import {
  useActivePvpEventsQuery,
  usePvpStatusQuery,
} from "@/store/verity/verityQueries"
import PvpArenaTab from "@/components/markets/PvpArenaTab"

export default function ArenaExperience() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawSelectedEventId = searchParams.get("id")

  const { profile } = useWalletProfile()
  const {
    data: rawEvents = [],
    isLoading: eventsLoading,
  } = useActivePvpEventsQuery()

  const effectiveSelectedEventId = useMemo(() => {
    if (rawSelectedEventId) return rawSelectedEventId
    if (!rawEvents || rawEvents.length === 0) return null

    const nowTime = Date.now()
    const firstOpen = (rawEvents as any[]).find((evt) => {
      const lockTime = new Date(evt.lockTime || evt.deadline).getTime()
      const isResolved = evt.status === "resolved" || evt.status === "closed"
      return !isResolved && (!lockTime || lockTime > nowTime)
    })

    return firstOpen ? firstOpen.id : (rawEvents as any[])[0]?.id || null
  }, [rawSelectedEventId, rawEvents])

  const {
    data: pvpStatus,
    isLoading: pvpStatusLoading,
    refetch: refetchPvpStatus,
  } = usePvpStatusQuery(effectiveSelectedEventId)

  const [claimedMarketIds, setClaimedMarketIds] = useState<Set<string>>(
    new Set(),
  )

  return (
    <div className="w-full py-4 font-sans sm:py-6">
      <PvpArenaTab
        pvpEvents={rawEvents as any[]}
        pvpEventsLoading={eventsLoading}
        pvpStatus={pvpStatus}
        pvpStatusLoading={pvpStatusLoading}
        refetchPvpStatus={refetchPvpStatus}
        profile={profile}
        referralsData={null}
        selectedPvpEventId={effectiveSelectedEventId}
        setSelectedPvpEventId={(id) => {
          if (id) {
            router.replace(`/arena?id=${encodeURIComponent(id)}`, {
              scroll: false,
            })
          } else {
            router.replace("/arena", { scroll: false })
          }
        }}
        claimedMarketIds={claimedMarketIds}
        setClaimedMarketIds={setClaimedMarketIds}
      />
    </div>
  )
}
