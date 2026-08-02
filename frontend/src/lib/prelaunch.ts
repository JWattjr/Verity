export type PrelaunchClub = {
  name: string
  shortName: string
}

export type PrelaunchSession = {
  config: {
    launchAt: string
    seasonAt: string
    maxTicketsPerUser: number
    clubs: PrelaunchClub[]
  }
  user: {
    telegramId: string
    username: string | null
    club: string | null
    joinedAt: string
    referredBy: string | null
  }
  referrals: {
    rawReferrals: number
    activatedReferrals: number
    ticketsEarned: number
    ticketsPending: number
    capProgress: number
    capPercent: number
  }
  referralLink: string
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api"

const DEV_MODE = process.env.NEXT_PUBLIC_TELEGRAM_DEV_MODE === "true"
const DEV_USER = JSON.stringify({
  id: process.env.NEXT_PUBLIC_TELEGRAM_DEV_USER_ID || "900000001",
  username: process.env.NEXT_PUBLIC_TELEGRAM_DEV_USERNAME || "local_player",
})

async function prelaunchRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/prelaunch${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(DEV_MODE ? { "x-telegram-dev-user": DEV_USER } : {}),
      ...(init.headers || {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.message || "The pre-launch service is unavailable.")
  }
  return (body?.data ?? body) as T
}

export function openPrelaunchSession(initData: string, referralCode?: string) {
  return prelaunchRequest<PrelaunchSession>("/session", {
    method: "POST",
    body: JSON.stringify({ initData, referralCode }),
  })
}

export function savePrelaunchClub(initData: string, club: string) {
  return prelaunchRequest<PrelaunchSession>("/club", {
    method: "PATCH",
    body: JSON.stringify({ initData, club }),
  })
}

export function trackPrelaunchShare(
  initData: string,
  method: "copy" | "share",
) {
  return prelaunchRequest<{ tracked: true; method: "copy" | "share" }>(
    "/share-click",
    {
      method: "POST",
      body: JSON.stringify({ initData, method }),
    },
  )
}

export function isTelegramDevMode() {
  return DEV_MODE
}
