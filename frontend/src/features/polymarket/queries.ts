"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { apiRequest } from "@/store/apiClient"
import type {
  PolymarketAccount,
  PolymarketFunding,
  PolymarketPage,
  PolymarketSport,
  PolymarketSportsEvent,
} from "./types"

export const polymarketKeys = {
  account: (userId: string) => ["polymarket", "account", userId] as const,
  funding: (userId: string) => ["polymarket", "funding", userId] as const,
  sports: ["polymarket", "sports"] as const,
  events: (sport: string) => ["polymarket", "events", sport] as const,
}

export function usePolymarketSportsQuery() {
  return useQuery({
    queryKey: polymarketKeys.sports,
    queryFn: () => apiRequest<PolymarketSport[]>("/polymarket/sports"),
    staleTime: 5 * 60_000,
  })
}

export function usePolymarketSportsEventsQuery(sport: string) {
  return useInfiniteQuery({
    queryKey: polymarketKeys.events(sport),
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams({ sport, limit: "20" })
      if (pageParam) query.set("cursor", pageParam)
      return apiRequest<PolymarketPage<PolymarketSportsEvent>>(
        `/polymarket/events?${query.toString()}`,
      )
    },
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor || undefined,
    enabled: Boolean(sport),
    staleTime: 15_000,
  })
}

export function usePolymarketAccountQuery(userId: string) {
  return useQuery({
    queryKey: polymarketKeys.account(userId),
    queryFn: () => apiRequest<PolymarketAccount>("/polymarket/account"),
    enabled: Boolean(userId),
    refetchInterval: (query) =>
      query.state.data?.provisioning ? 5_000 : false,
  })
}

export function usePolymarketFundingQuery(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: polymarketKeys.funding(userId),
    queryFn: () => apiRequest<PolymarketFunding>("/polymarket/account/funding"),
    enabled,
    refetchInterval: (query) =>
      query.state.data?.transactions.some((transaction) =>
        [
          "DEPOSIT_DETECTED",
          "PROCESSING",
          "ORIGIN_TX_CONFIRMED",
          "SUBMITTED",
        ].includes(transaction.status),
      )
        ? 15_000
        : false,
  })
}

export function useProvisionPolymarketAccountMutation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<PolymarketAccount>("/polymarket/account/provision", {
        method: "POST",
      }),
    onSuccess: (account) => {
      queryClient.setQueryData(polymarketKeys.account(userId), account)
      if (account.status === "ready") {
        void queryClient.invalidateQueries({
          queryKey: polymarketKeys.funding(userId),
        })
      }
    },
  })
}

export function useCreatePolymarketDepositAddressesMutation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<PolymarketFunding>("/polymarket/account/funding/address", {
        method: "POST",
      }),
    onSuccess: (funding) => {
      queryClient.setQueryData(polymarketKeys.funding(userId), funding)
    },
  })
}
